create or replace function public.rak_admin_save_machine_settings(p_rows jsonb, p_admin_pin text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  item jsonb;
  saved_count integer := 0;
  v_machine_key text;
  v_category text;
  v_label text;
  v_previous_rows jsonb := '[]'::jsonb;
  v_previous_updated_at timestamptz;
begin
  if not public.rak_verify_admin_pin(p_admin_pin) then
    raise exception 'RAK_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'machine_settings payload must be an array';
  end if;

  if jsonb_array_length(p_rows) > 120 then
    raise exception 'too many machine_settings rows';
  end if;

  select coalesce(jsonb_agg(to_jsonb(ms) order by ms.machine_key), '[]'::jsonb), max(ms.updated_at)
  into v_previous_rows, v_previous_updated_at
  from public.machine_settings ms;

  if jsonb_array_length(v_previous_rows) > 0 then
    insert into public.machine_settings_backups(rows, saved_count, previous_updated_at, replaced_by_meta)
    values (v_previous_rows, jsonb_array_length(v_previous_rows), v_previous_updated_at, jsonb_build_object('source', 'admin-machine-settings'));
  end if;

  delete from public.machine_settings_backups
  where replaced_at < now() - interval '180 days';

  for item in select value from jsonb_array_elements(p_rows)
  loop
    if jsonb_typeof(item) <> 'object' then
      raise exception 'invalid machine_settings row';
    end if;

    v_machine_key := trim(coalesce(item->>'machine_key', ''));
    v_category := trim(coalesce(item->>'category', ''));
    v_label := trim(coalesce(item->>'label', ''));

    if v_machine_key = '' or length(v_machine_key) > 120 then
      raise exception 'invalid machine_key';
    end if;
    if v_category not in ('brus', 'frezka', 'pracka', 'fhb_target', 'food_schedule', 'rotation_overtime_settings') then
      raise exception 'invalid category';
    end if;
    if v_label = '' or length(v_label) > 160 then
      raise exception 'invalid label';
    end if;
    if pg_column_size(coalesce(item->'settings_json', '{}'::jsonb)) > 24000 then
      raise exception 'settings_json too large';
    end if;

    insert into public.machine_settings(
      machine_key,
      machine_code,
      machine_index,
      label,
      category,
      speed,
      cycle_time,
      dress_time,
      dress_count,
      settings_json,
      updated_at
    )
    values (
      v_machine_key,
      nullif(trim(coalesce(item->>'machine_code', '')), ''),
      nullif(trim(coalesce(item->>'machine_index', '')), ''),
      v_label,
      v_category,
      nullif(item->>'speed', '')::numeric,
      nullif(item->>'cycle_time', '')::numeric,
      nullif(item->>'dress_time', '')::numeric,
      nullif(item->>'dress_count', '')::integer,
      coalesce(item->'settings_json', '{}'::jsonb),
      now()
    )
    on conflict (machine_key)
    do update set
      machine_code = excluded.machine_code,
      machine_index = excluded.machine_index,
      label = excluded.label,
      category = excluded.category,
      speed = excluded.speed,
      cycle_time = excluded.cycle_time,
      dress_time = excluded.dress_time,
      dress_count = excluded.dress_count,
      settings_json = excluded.settings_json,
      updated_at = now();

    saved_count := saved_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'saved_count', saved_count);
end;
$$;

create or replace function public.rak_admin_list_rotation_backups(p_admin_pin text default null, p_limit integer default 30)
returns table(
  id uuid,
  key text,
  replaced_at timestamptz,
  previous_updated_at timestamptz,
  meta jsonb,
  replaced_by_meta jsonb,
  month_count integer,
  daymod_count integer,
  source text,
  month_key text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.rak_verify_admin_pin(p_admin_pin) then
    raise exception 'RAK_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  return query
  select
    b.id,
    b.key,
    b.replaced_at,
    b.previous_updated_at,
    coalesce(b.meta, '{}'::jsonb) as meta,
    coalesce(b.replaced_by_meta, '{}'::jsonb) as replaced_by_meta,
    case when jsonb_typeof(b.payload->'months') = 'object' then jsonb_object_length(b.payload->'months') else 0 end as month_count,
    coalesce((
      select sum(case when jsonb_typeof(m.value->'dayMods') = 'array' then jsonb_array_length(m.value->'dayMods') else 0 end)::integer
      from jsonb_each(coalesce(b.payload->'months', '{}'::jsonb)) as m(key, value)
    ), 0) as daymod_count,
    coalesce(b.replaced_by_meta->>'source', b.meta->>'source', '') as source,
    coalesce(b.replaced_by_meta->>'monthKey', b.meta->>'monthKey', '') as month_key
  from public.rotation_state_backups b
  order by b.replaced_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 100));
end;
$$;

create or replace function public.rak_admin_restore_rotation_backup(p_backup_id uuid, p_admin_pin text default null, p_meta jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_backup public.rotation_state_backups%rowtype;
  v_current public.rotation_state%rowtype;
  v_restored public.rotation_state%rowtype;
  v_meta jsonb;
begin
  if not public.rak_verify_admin_pin(p_admin_pin) then
    raise exception 'RAK_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  select * into v_backup
  from public.rotation_state_backups
  where id = p_backup_id;

  if not found then
    raise exception 'backup not found';
  end if;

  select * into v_current
  from public.rotation_state
  where key = coalesce(v_backup.key, 'main')
  limit 1;

  if found and v_current.payload is not null then
    insert into public.rotation_state_backups(key, payload, meta, previous_updated_at, replaced_by_meta)
    values (
      v_current.key,
      v_current.payload,
      coalesce(v_current.meta, '{}'::jsonb),
      v_current.updated_at,
      jsonb_build_object('source', 'admin-restore-before', 'backupId', p_backup_id, 'restoredAt', now()) || coalesce(p_meta, '{}'::jsonb)
    );
  end if;

  v_meta := jsonb_build_object(
    'source', 'admin-backup-restore',
    'backupId', p_backup_id,
    'restoredAt', now()
  ) || coalesce(p_meta, '{}'::jsonb);

  insert into public.rotation_state(key, payload, meta, updated_at)
  values (coalesce(v_backup.key, 'main'), v_backup.payload, v_meta, now())
  on conflict (key)
  do update set
    payload = excluded.payload,
    meta = excluded.meta,
    updated_at = now()
  returning * into v_restored;

  delete from public.rotation_state_backups
  where replaced_at < now() - interval '180 days';

  return jsonb_build_object(
    'ok', true,
    'backup_id', p_backup_id,
    'row', to_jsonb(v_restored)
  );
end;
$$;

revoke execute on function public.rak_admin_list_rotation_backups(text, integer) from public;
revoke execute on function public.rak_admin_restore_rotation_backup(uuid, text, jsonb) from public;
grant execute on function public.rak_admin_list_rotation_backups(text, integer) to anon, authenticated;
grant execute on function public.rak_admin_restore_rotation_backup(uuid, text, jsonb) to anon, authenticated;;
