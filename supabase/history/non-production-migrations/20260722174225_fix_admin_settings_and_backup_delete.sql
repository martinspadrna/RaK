-- Fix the PL/pgSQL variable/column name collision introduced with the secure
-- settings writer and add an owner-only delete operation for settings backups.

create or replace function private.rak_upsert_machine_settings(p_rows jsonb)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  item jsonb;
  saved_count integer := 0;
  v_machine_key text;
  v_label text;
begin
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Rows must be a JSON array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_rows) > 500 or octet_length(p_rows::text) > 2000000 then
    raise exception 'Settings payload is too large' using errcode = '22023';
  end if;

  for item in select value from jsonb_array_elements(p_rows)
  loop
    if jsonb_typeof(item) <> 'object' then
      raise exception 'Invalid settings row' using errcode = '22023';
    end if;
    if private.rak_machine_setting_is_protected(item) then
      raise exception 'Protected settings must use their dedicated API' using errcode = '42501';
    end if;
    v_machine_key := trim(coalesce(item ->> 'machine_key', ''));
    v_label := trim(coalesce(item ->> 'label', ''));
    if v_machine_key = '' or length(v_machine_key) > 160 or v_label = '' or length(v_label) > 240 then
      raise exception 'Invalid machine setting key or label' using errcode = '22023';
    end if;

    insert into public.machine_settings (
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
    ) values (
      v_machine_key,
      nullif(left(trim(coalesce(item ->> 'machine_code', '')), 120), ''),
      nullif(left(trim(coalesce(item ->> 'machine_index', '')), 120), ''),
      v_label,
      left(trim(coalesce(item ->> 'category', '')), 120),
      private.rak_json_number(item ->> 'speed'),
      private.rak_json_number(item ->> 'cycle_time'),
      private.rak_json_number(item ->> 'dress_time'),
      private.rak_json_number(item ->> 'dress_count'),
      coalesce(item -> 'settings_json', '{}'::jsonb),
      now()
    )
    on conflict (machine_key) do update set
      machine_code = excluded.machine_code,
      machine_index = excluded.machine_index,
      label = excluded.label,
      category = excluded.category,
      speed = excluded.speed,
      cycle_time = excluded.cycle_time,
      dress_time = excluded.dress_time,
      dress_count = excluded.dress_count,
      settings_json = excluded.settings_json,
      updated_at = excluded.updated_at;
    saved_count := saved_count + 1;
  end loop;
  return saved_count;
end;
$$;

create or replace function public.rak_owner_delete_settings_backup_v2(p_backup_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  deleted_backup public.rak_admin_settings_backups%rowtype;
begin
  perform private.rak_require_admin(true);
  delete from public.rak_admin_settings_backups as backup
  where backup.id = p_backup_id
  returning * into deleted_backup;
  if deleted_backup.id is null then
    raise exception 'Settings backup not found' using errcode = 'P0002';
  end if;
  perform private.rak_write_admin_audit(
    'settings.backup.delete',
    'settings_backup',
    deleted_backup.id::text,
    jsonb_build_object(
      'source', deleted_backup.source,
      'row_count', deleted_backup.row_count,
      'created_at', deleted_backup.created_at
    )
  );
  return jsonb_build_object('ok', true, 'id', deleted_backup.id);
end;
$$;

revoke all on function private.rak_upsert_machine_settings(jsonb) from public, anon, authenticated;
revoke all on function public.rak_owner_delete_settings_backup_v2(uuid) from public;
grant execute on function public.rak_owner_delete_settings_backup_v2(uuid) to authenticated;
