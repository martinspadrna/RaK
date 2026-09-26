-- RaK 1.7.111 TEST: server-validated, idempotent partial schedule update for an unplanned absence.
-- Production remains unchanged. The private operation table is ephemeral (30-day dedupe), not application data.

create table if not exists private.rak_unplanned_absence_ops_v1 (
  user_id uuid not null,
  operation_id uuid not null,
  request_hash text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, operation_id)
);
revoke all on table private.rak_unplanned_absence_ops_v1 from public, anon, authenticated;

create or replace function public.rak_admin_apply_unplanned_absence_v1(
  p_key text,
  p_payload jsonb,
  p_meta jsonb,
  p_expected_revision bigint,
  p_operation_id uuid,
  p_month_key text,
  p_person text,
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
  v_current public.rotation_state%rowtype;
  v_existing private.rak_unplanned_absence_ops_v1%rowtype;
  v_hash text;
  v_old_month jsonb;
  v_new_month jsonb;
  v_old_section jsonb;
  v_new_section jsonb;
  v_old_rows jsonb;
  v_new_rows jsonb;
  v_old_row jsonb;
  v_new_row jsonb;
  v_old_notes jsonb;
  v_new_notes jsonb;
  v_old_other_notes jsonb;
  v_new_other_notes jsonb;
  v_date text;
  v_allowed boolean;
  v_len integer;
  v_idx integer;
  v_count integer;
  v_result jsonb;
  v_safe_key text := coalesce(nullif(trim(p_key), ''), 'main');
  v_month_key text := trim(coalesce(p_month_key, ''));
  v_person text := trim(coalesce(p_person, ''));
  v_reason text := trim(coalesce(p_reason, ''));
begin
  perform private.rak_require_admin(false);
  if v_user_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_operation_id is null then raise exception 'Missing operation id' using errcode='22023'; end if;
  if v_month_key='' or length(v_month_key)>20 then raise exception 'Invalid month key' using errcode='22023'; end if;
  if v_person='' or length(v_person)>120 then raise exception 'Invalid person' using errcode='22023'; end if;
  if v_reason='' or length(v_reason)>80 then raise exception 'Invalid absence reason' using errcode='22023'; end if;
  if jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>8000000 then raise exception 'Invalid rotation payload' using errcode='22023'; end if;
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
  select count(*),count(distinct value) into v_len,v_count
  from jsonb_array_elements_text(p_allowed_date_labels) item(value);
  if v_len<>v_count then raise exception 'Duplicate allowed date label' using errcode='22023'; end if;

  v_hash:=md5(jsonb_build_object(
    'key',v_safe_key,'payload',p_payload,'meta',coalesce(p_meta,'{}'::jsonb),
    'expected_revision',p_expected_revision,'month_key',v_month_key,
    'person',v_person,'reason',v_reason,'allowed_dates',p_allowed_date_labels
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

  if jsonb_typeof(v_current.payload->'months')<>'object' or jsonb_typeof(p_payload->'months')<>'object' then
    raise exception 'Rotation months are invalid' using errcode='22023';
  end if;
  if (p_payload-'months') is distinct from (v_current.payload-'months') then
    raise exception 'Unplanned change may not modify rotation outside months' using errcode='22023';
  end if;
  if ((p_payload->'months')-v_month_key) is distinct from ((v_current.payload->'months')-v_month_key) then
    raise exception 'Unplanned change may modify only the selected month' using errcode='22023';
  end if;

  v_old_month:=v_current.payload->'months'->v_month_key;
  v_new_month:=p_payload->'months'->v_month_key;
  if jsonb_typeof(v_old_month)<>'object' or jsonb_typeof(v_new_month)<>'object' then
    raise exception 'Selected month is missing' using errcode='22023';
  end if;
  if (v_new_month-array['hard','soft','notes']::text[]) is distinct from (v_old_month-array['hard','soft','notes']::text[]) then
    raise exception 'Unplanned change may modify only rows and absences' using errcode='22023';
  end if;

  foreach v_date in array array['hard','soft'] loop
    v_old_section:=v_old_month->v_date;
    v_new_section:=v_new_month->v_date;
    if jsonb_typeof(v_old_section)<>'object' or jsonb_typeof(v_new_section)<>'object' then
      raise exception 'Rotation section is missing' using errcode='22023';
    end if;
    if (v_new_section-'rows') is distinct from (v_old_section-'rows') then
      raise exception 'Unplanned change may not modify section metadata' using errcode='22023';
    end if;
    v_old_rows:=v_old_section->'rows';
    v_new_rows:=v_new_section->'rows';
    if jsonb_typeof(v_old_rows)<>'array' or jsonb_typeof(v_new_rows)<>'array'
       or jsonb_array_length(v_old_rows)<>jsonb_array_length(v_new_rows) then
      raise exception 'Rotation rows changed shape' using errcode='22023';
    end if;
    v_len:=jsonb_array_length(v_old_rows);
    if v_len>0 then
      for v_idx in 0..v_len-1 loop
        v_old_row:=v_old_rows->v_idx;
        v_new_row:=v_new_rows->v_idx;
        if coalesce(v_new_row->>'date','')<>coalesce(v_old_row->>'date','') then
          raise exception 'Rotation row date changed' using errcode='22023';
        end if;
        select exists(
          select 1 from jsonb_array_elements_text(p_allowed_date_labels) d(value)
          where d.value=coalesce(v_old_row->>'date','')
        ) into v_allowed;
        if not v_allowed then
          if v_new_row is distinct from v_old_row then
            raise exception 'Unplanned change touched a non-selected day' using errcode='22023';
          end if;
        elsif (v_new_row-'cells') is distinct from (v_old_row-'cells') then
          raise exception 'Unplanned change may modify only assignments on selected days' using errcode='22023';
        end if;
      end loop;
    end if;
    select count(distinct row_item.value->>'date') into v_count
    from jsonb_array_elements(v_old_rows) row_item(value)
    where (row_item.value->>'date') in (select value from jsonb_array_elements_text(p_allowed_date_labels));
    if v_count<>jsonb_array_length(p_allowed_date_labels) then
      raise exception 'Selected day is not present in both rotation sections' using errcode='22023';
    end if;
  end loop;

  v_old_notes:=coalesce(v_old_month->'notes','[]'::jsonb);
  v_new_notes:=coalesce(v_new_month->'notes','[]'::jsonb);
  if jsonb_typeof(v_old_notes)<>'array' or jsonb_typeof(v_new_notes)<>'array' then
    raise exception 'Absence notes are invalid' using errcode='22023';
  end if;

  select coalesce(jsonb_agg(t.value order by t.ord),'[]'::jsonb) into v_old_other_notes
  from jsonb_array_elements(v_old_notes) with ordinality t(value,ord)
  where not (
    coalesce(t.value->>'person','')=v_person
    and coalesce(t.value->>'date','') in (select value from jsonb_array_elements_text(p_allowed_date_labels))
  );
  select coalesce(jsonb_agg(t.value order by t.ord),'[]'::jsonb) into v_new_other_notes
  from jsonb_array_elements(v_new_notes) with ordinality t(value,ord)
  where not (
    coalesce(t.value->>'person','')=v_person
    and coalesce(t.value->>'date','') in (select value from jsonb_array_elements_text(p_allowed_date_labels))
  );
  if v_new_other_notes is distinct from v_old_other_notes then
    raise exception 'Unplanned change touched unrelated absences' using errcode='22023';
  end if;

  for v_date in select value from jsonb_array_elements_text(p_allowed_date_labels) loop
    select count(*) into v_count
    from jsonb_array_elements(v_new_notes) n(value)
    where coalesce(n.value->>'date','')=v_date and coalesce(n.value->>'person','')=v_person;
    if v_count<>1 then
      raise exception 'Each selected day must contain exactly one absence for the selected person' using errcode='22023';
    end if;
    select count(*) into v_count
    from jsonb_array_elements(v_new_notes) n(value)
    where coalesce(n.value->>'date','')=v_date
      and coalesce(n.value->>'person','')=v_person
      and coalesce(n.value->>'code','')=v_reason;
    if v_count<>1 then raise exception 'Selected absence reason does not match the request' using errcode='22023'; end if;
  end loop;

  v_result:=public.rak_admin_save_rotation_v2(
    v_safe_key,p_payload,
    coalesce(p_meta,'{}'::jsonb)||jsonb_build_object(
      'source','unplanned-absence-generator','monthKey',v_month_key,
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

revoke all on function public.rak_admin_apply_unplanned_absence_v1(
  text,jsonb,jsonb,bigint,uuid,text,text,text,jsonb
) from public,anon;
grant execute on function public.rak_admin_apply_unplanned_absence_v1(
  text,jsonb,jsonb,bigint,uuid,text,text,text,jsonb
) to authenticated;

notify pgrst,'reload schema';
