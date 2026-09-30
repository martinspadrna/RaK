create or replace function public.rak_admin_apply_unplanned_change_v2(
  p_key text,
  p_payload jsonb,
  p_meta jsonb,
  p_expected_revision bigint,
  p_operation_id uuid,
  p_month_key text,
  p_person text,
  p_change_kind text,
  p_reason text,
  p_allowed_date_labels jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $rak$
declare
  v_user_id uuid := (select auth.uid());
  v_kind text := trim(coalesce(p_change_kind,''));
  v_reason text := trim(coalesce(p_reason,''));
  v_person text := trim(coalesce(p_person,''));
  v_month_key text := trim(coalesce(p_month_key,''));
  v_safe_key text := coalesce(nullif(trim(p_key),''),'main');
  v_current public.rotation_state%rowtype;
  v_existing private.rak_unplanned_absence_ops_v1%rowtype;
  v_hash text;
  v_old_month jsonb;
  v_new_month jsonb;
  v_old_mods jsonb;
  v_new_mods jsonb;
  v_old_other jsonb;
  v_new_other jsonb;
  v_mod jsonb;
  v_date text;
  v_count integer;
  v_distinct_count integer;
  v_result jsonb;
  v_section text;
  v_cell_index integer;
begin
  perform private.rak_require_admin(false);

  if v_user_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_operation_id is null then raise exception 'Missing operation id' using errcode='22023'; end if;
  if v_month_key='' or length(v_month_key)>20 then raise exception 'Invalid month key' using errcode='22023'; end if;
  if v_person='' or length(v_person)>120 then raise exception 'Invalid person' using errcode='22023'; end if;
  if jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>8000000 then
    raise exception 'Invalid rotation payload' using errcode='22023';
  end if;
  if jsonb_typeof(p_allowed_date_labels)<>'array'
     or jsonb_array_length(p_allowed_date_labels)<1
     or jsonb_array_length(p_allowed_date_labels)>62 then
    raise exception 'Invalid allowed dates' using errcode='22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_allowed_date_labels) item(value)
    where jsonb_typeof(item.value)<>'string'
       or length(trim(item.value #>> '{}'))<1
       or length(trim(item.value #>> '{}'))>80
  ) then raise exception 'Invalid allowed date label' using errcode='22023'; end if;

  select count(*),count(distinct value) into v_count,v_distinct_count
  from jsonb_array_elements_text(p_allowed_date_labels) item(value);
  if v_count<>v_distinct_count then raise exception 'Duplicate allowed date label' using errcode='22023'; end if;

  if v_kind='absence' then
    if v_reason not in ('D','NV','§','LEK') then
      raise exception 'Unsupported absence reason' using errcode='22023';
    end if;
    return public.rak_admin_apply_unplanned_absence_v1(
      v_safe_key,p_payload,coalesce(p_meta,'{}'::jsonb),p_expected_revision,
      p_operation_id,v_month_key,v_person,v_reason,p_allowed_date_labels
    );
  end if;

  if v_kind<>'daymod' or v_reason<>'kalirnaOut' then
    raise exception 'Unsupported day exception type' using errcode='22023';
  end if;

  v_hash:=md5(jsonb_build_object(
    'key',v_safe_key,'payload',p_payload,'meta',coalesce(p_meta,'{}'::jsonb),
    'expected_revision',p_expected_revision,'month_key',v_month_key,
    'person',v_person,'kind',v_kind,'reason',v_reason,'allowed_dates',p_allowed_date_labels
  )::text);

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_operation_id::text,0));

  select * into v_existing
  from private.rak_unplanned_absence_ops_v1
  where user_id=v_user_id and operation_id=p_operation_id;
  if found then
    if v_existing.request_hash<>v_hash then
      raise exception 'Operation id was already used for a different request' using errcode='22023';
    end if;
    return v_existing.result||jsonb_build_object('idempotent_replay',true);
  end if;

  select * into v_current
  from public.rotation_state state
  where state.key=v_safe_key
  for update;
  if not found then raise exception 'Rotation state does not exist' using errcode='40001'; end if;
  if p_expected_revision is null or p_expected_revision<>v_current.revision then
    raise exception 'Rotation was changed on another device'
      using errcode='40001',
            detail=jsonb_build_object('expected',p_expected_revision,'actual',v_current.revision)::text;
  end if;

  if jsonb_typeof(v_current.payload->'months')<>'object'
     or jsonb_typeof(p_payload->'months')<>'object' then
    raise exception 'Rotation months are invalid' using errcode='22023';
  end if;
  if (p_payload-'months') is distinct from (v_current.payload-'months') then
    raise exception 'Day exception may not modify rotation outside months' using errcode='22023';
  end if;
  if ((p_payload->'months')-v_month_key) is distinct from ((v_current.payload->'months')-v_month_key) then
    raise exception 'Day exception may modify only selected month' using errcode='22023';
  end if;

  v_old_month:=v_current.payload->'months'->v_month_key;
  v_new_month:=p_payload->'months'->v_month_key;
  if jsonb_typeof(v_old_month)<>'object' or jsonb_typeof(v_new_month)<>'object' then
    raise exception 'Selected month is missing' using errcode='22023';
  end if;
  if (v_new_month-'dayMods') is distinct from (v_old_month-'dayMods') then
    raise exception 'Day exception may modify only dayMods' using errcode='22023';
  end if;

  v_old_mods:=coalesce(v_old_month->'dayMods','[]'::jsonb);
  v_new_mods:=coalesce(v_new_month->'dayMods','[]'::jsonb);
  if jsonb_typeof(v_old_mods)<>'array' or jsonb_typeof(v_new_mods)<>'array' then
    raise exception 'dayMods must be arrays' using errcode='22023';
  end if;

  select coalesce(jsonb_agg(t.value order by t.ord),'[]'::jsonb) into v_old_other
  from jsonb_array_elements(v_old_mods) with ordinality t(value,ord)
  where not (
    coalesce(t.value->>'person','')=v_person
    and coalesce(t.value->>'date','') in (select value from jsonb_array_elements_text(p_allowed_date_labels))
  );

  select coalesce(jsonb_agg(t.value order by t.ord),'[]'::jsonb) into v_new_other
  from jsonb_array_elements(v_new_mods) with ordinality t(value,ord)
  where not (
    coalesce(t.value->>'person','')=v_person
    and coalesce(t.value->>'date','') in (select value from jsonb_array_elements_text(p_allowed_date_labels))
  );

  if v_new_other is distinct from v_old_other then
    raise exception 'Day exception touched unrelated dayMods' using errcode='22023';
  end if;

  for v_date in select value from jsonb_array_elements_text(p_allowed_date_labels) loop
    select count(*) into v_count
    from jsonb_array_elements(v_new_mods) m(value)
    where coalesce(m.value->>'person','')=v_person
      and coalesce(m.value->>'date','')=v_date
      and coalesce(m.value->>'type','')='kalirnaOut';
    if v_count<>1 then
      raise exception 'Each selected day must contain exactly one Kalirna exception' using errcode='22023';
    end if;
  end loop;

  for v_mod in
    select m.value
    from jsonb_array_elements(v_new_mods) m(value)
    where coalesce(m.value->>'person','')=v_person
      and coalesce(m.value->>'date','') in (select value from jsonb_array_elements_text(p_allowed_date_labels))
  loop
    if coalesce(v_mod->>'type','')<>'kalirnaOut' then
      raise exception 'Mixed day exception types are not allowed' using errcode='22023';
    end if;

    v_section:=coalesce(v_mod->>'section','');
    if v_section not in ('hard','soft') then
      raise exception 'Invalid day exception section' using errcode='22023';
    end if;
    if coalesce(v_mod->>'cellIndex','') !~ '^[0-9]+$' then
      raise exception 'Invalid day exception cell' using errcode='22023';
    end if;
    v_cell_index:=(v_mod->>'cellIndex')::integer;
    if v_cell_index<0 or v_cell_index>20 then
      raise exception 'Invalid day exception cell' using errcode='22023';
    end if;

    if not exists (
      select 1
      from jsonb_array_elements(v_old_month->v_section->'rows') r(value)
      where coalesce(r.value->>'date','')=coalesce(v_mod->>'date','')
        and coalesce(r.value->'cells'->>v_cell_index,'')=v_person
    ) then
      raise exception 'Kalirna person is not assigned in selected source cell' using errcode='22023';
    end if;
  end loop;

  v_result:=public.rak_admin_save_rotation_v2(
    v_safe_key,p_payload,
    coalesce(p_meta,'{}'::jsonb)||jsonb_build_object(
      'source','unplanned-day-exception',
      'monthKey',v_month_key,
      'changeKind','daymod',
      'reason','kalirnaOut',
      'changedDayCount',jsonb_array_length(p_allowed_date_labels)
    ),
    p_expected_revision
  );

  insert into private.rak_unplanned_absence_ops_v1(user_id,operation_id,request_hash,result)
  values(v_user_id,p_operation_id,v_hash,v_result);

  delete from private.rak_unplanned_absence_ops_v1
  where user_id=v_user_id and created_at<now()-interval '30 days';

  return v_result||jsonb_build_object('idempotent_replay',false);
end;
$rak$;

revoke all on function public.rak_admin_apply_unplanned_change_v2(
  text,jsonb,jsonb,bigint,uuid,text,text,text,text,jsonb
) from public,anon;

grant execute on function public.rak_admin_apply_unplanned_change_v2(
  text,jsonb,jsonb,bigint,uuid,text,text,text,text,jsonb
) to authenticated;
