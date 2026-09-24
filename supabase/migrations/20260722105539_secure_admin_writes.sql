-- Authenticated, revision-aware writes. These functions are deployed alongside
-- the legacy endpoints and are used only by the v2 client during transition.

alter table public.rotation_state
  add column if not exists revision bigint not null default 0;
create or replace function private.rak_json_number(p_value text)
returns numeric
language sql
immutable
security invoker
set search_path = ''
as $$
  select case
    when nullif(trim(coalesce(p_value, '')), '') is null then null
    when trim(p_value) ~ '^-?[0-9]+([.,][0-9]+)?$' then replace(trim(p_value), ',', '.')::numeric
    else null
  end
$$;
create or replace function private.rak_machine_setting_is_protected(p_row jsonb)
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select
    coalesce(p_row ->> 'category', '') in ('admin_accounts_settings', 'admin_full_settings_backup')
    or coalesce(p_row ->> 'machine_key', '') = 'ADMIN_ACCOUNTS_SETTINGS'
    or coalesce(p_row ->> 'machine_key', '') like 'ADMIN_FULL_SETTINGS_BACKUP_%'
    or coalesce(p_row -> 'settings_json' ->> 'stored_category', '') in ('admin_accounts_settings', 'admin_full_settings_backup')
    or coalesce(p_row -> 'settings_json' ->> 'admin_settings_key', '') = 'ADMIN_ACCOUNTS_SETTINGS'
    or coalesce(p_row -> 'settings_json' ->> 'admin_settings_key', '') like 'ADMIN_FULL_SETTINGS_BACKUP_%'
$$;
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
  machine_key text;
  label text;
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
    machine_key := trim(coalesce(item ->> 'machine_key', ''));
    label := trim(coalesce(item ->> 'label', ''));
    if machine_key = '' or length(machine_key) > 160 or label = '' or length(label) > 240 then
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
      machine_key,
      nullif(left(trim(coalesce(item ->> 'machine_code', '')), 120), ''),
      nullif(left(trim(coalesce(item ->> 'machine_index', '')), 120), ''),
      label,
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
create or replace function public.rak_admin_save_machine_settings_v2(
  p_rows jsonb,
  p_reason text default 'admin-save'
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  saved_count integer;
begin
  perform private.rak_require_admin(false);
  saved_count := private.rak_upsert_machine_settings(p_rows);
  perform private.rak_write_admin_audit(
    'settings.save',
    'machine_settings',
    '',
    jsonb_build_object('saved_count', saved_count, 'reason', left(coalesce(p_reason, ''), 120))
  );
  return jsonb_build_object('ok', true, 'saved_count', saved_count, 'saved_at', now());
end;
$$;
create or replace function public.rak_admin_save_rotation_v2(
  p_key text,
  p_payload jsonb,
  p_meta jsonb default '{}'::jsonb,
  p_expected_revision bigint default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_row public.rotation_state%rowtype;
  next_revision bigint;
  profile public.rak_admin_profiles%rowtype;
  safe_key text := coalesce(nullif(trim(p_key), ''), 'main');
begin
  perform private.rak_require_admin(false);
  if jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text) > 8000000 then
    raise exception 'Invalid rotation payload' using errcode = '22023';
  end if;

  select * into profile from public.rak_admin_profiles where user_id = (select auth.uid());
  select * into current_row
  from public.rotation_state
  where key = safe_key
  for update;

  if current_row.key is not null then
    if p_expected_revision is null or p_expected_revision <> current_row.revision then
      raise exception 'Rotation was changed on another device'
        using errcode = '40001', detail = jsonb_build_object('expected', p_expected_revision, 'actual', current_row.revision)::text;
    end if;
    insert into public.rak_rotation_backups_v2 (
      rotation_key,
      payload,
      meta,
      revision,
      source,
      month_key,
      month_count,
      daymod_count,
      created_by,
      created_by_account_id,
      replaced_at
    ) values (
      current_row.key,
      current_row.payload,
      coalesce(current_row.meta, '{}'::jsonb),
      current_row.revision,
      left(coalesce(p_meta ->> 'source', 'save'), 120),
      left(coalesce(p_meta ->> 'monthKey', p_meta ->> 'month_key', ''), 20),
      case when jsonb_typeof(current_row.payload -> 'months') = 'object' then jsonb_object_length(current_row.payload -> 'months') else 0 end,
      case when jsonb_typeof(current_row.payload -> 'dayMods') = 'object' then jsonb_object_length(current_row.payload -> 'dayMods') else 0 end,
      profile.user_id,
      profile.account_id,
      now()
    );
    next_revision := current_row.revision + 1;
    update public.rotation_state
    set payload = p_payload,
        meta = coalesce(p_meta, '{}'::jsonb) || jsonb_build_object('revision', next_revision, 'savedBy', profile.account_id),
        revision = next_revision,
        updated_at = now()
    where key = safe_key
    returning * into current_row;
  else
    if p_expected_revision is not null and p_expected_revision <> 0 then
      raise exception 'Rotation revision does not exist' using errcode = '40001';
    end if;
    next_revision := 1;
    insert into public.rotation_state (key, payload, meta, revision, updated_at)
    values (
      safe_key,
      p_payload,
      coalesce(p_meta, '{}'::jsonb) || jsonb_build_object('revision', next_revision, 'savedBy', profile.account_id),
      next_revision,
      now()
    )
    returning * into current_row;
  end if;

  perform private.rak_write_admin_audit(
    'rotation.save',
    'rotation_state',
    safe_key,
    jsonb_build_object('revision', current_row.revision, 'source', coalesce(p_meta ->> 'source', ''))
  );
  return jsonb_build_object(
    'ok', true,
    'key', current_row.key,
    'payload', current_row.payload,
    'meta', current_row.meta,
    'revision', current_row.revision,
    'updated_at', current_row.updated_at
  );
end;
$$;
create or replace function public.rak_admin_list_rotation_backups_v2(p_limit integer default 30)
returns table (
  id uuid,
  source text,
  month_key text,
  month_count integer,
  daymod_count integer,
  revision bigint,
  created_by_account_id text,
  replaced_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.rak_require_admin(false);
  return query
  select
    backup.id,
    backup.source,
    backup.month_key,
    backup.month_count,
    backup.daymod_count,
    backup.revision,
    backup.created_by_account_id,
    backup.replaced_at
  from public.rak_rotation_backups_v2 as backup
  order by backup.replaced_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 100));
end;
$$;
create or replace function public.rak_admin_restore_rotation_backup_v2(
  p_backup_id uuid,
  p_expected_revision bigint,
  p_meta jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  backup public.rak_rotation_backups_v2%rowtype;
  result jsonb;
begin
  perform private.rak_require_admin(false);
  select * into backup from public.rak_rotation_backups_v2 where id = p_backup_id;
  if backup.id is null then
    raise exception 'Rotation backup not found' using errcode = 'P0002';
  end if;
  result := public.rak_admin_save_rotation_v2(
    backup.rotation_key,
    backup.payload,
    coalesce(p_meta, '{}'::jsonb) || jsonb_build_object('source', 'backup-restore', 'restoredBackupId', backup.id),
    p_expected_revision
  );
  perform private.rak_write_admin_audit('rotation.restore', 'rotation_backup', backup.id::text, jsonb_build_object('restored_revision', backup.revision));
  return jsonb_build_object('ok', true, 'row', result, 'backup_id', backup.id);
end;
$$;
create or replace function public.rak_owner_create_settings_backup_v2(
  p_snapshot jsonb,
  p_source text default 'manual',
  p_app_version text default '',
  p_restored_backup_id uuid default null,
  p_legacy_key text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  profile public.rak_admin_profiles%rowtype;
  saved public.rak_admin_settings_backups%rowtype;
  row_count integer;
begin
  perform private.rak_require_admin(true);
  if jsonb_typeof(p_snapshot) <> 'object' or jsonb_typeof(p_snapshot -> 'rows') <> 'array' then
    raise exception 'Invalid settings backup' using errcode = '22023';
  end if;
  if jsonb_array_length(p_snapshot -> 'rows') > 500 or octet_length(p_snapshot::text) > 3000000 then
    raise exception 'Settings backup is too large' using errcode = '22023';
  end if;
  row_count := jsonb_array_length(p_snapshot -> 'rows');
  select * into profile from public.rak_admin_profiles where user_id = (select auth.uid());
  insert into public.rak_admin_settings_backups (
    legacy_key,
    snapshot,
    source,
    app_version,
    row_count,
    restored_backup_id,
    created_by,
    created_by_account_id
  ) values (
    nullif(trim(coalesce(p_legacy_key, '')), ''),
    p_snapshot,
    left(coalesce(nullif(trim(p_source), ''), 'manual'), 80),
    left(coalesce(p_app_version, ''), 40),
    row_count,
    p_restored_backup_id,
    profile.user_id,
    profile.account_id
  )
  on conflict (legacy_key) do update set legacy_key = excluded.legacy_key
  returning * into saved;
  perform private.rak_write_admin_audit('settings.backup.create', 'settings_backup', saved.id::text, jsonb_build_object('row_count', row_count, 'source', saved.source));
  return jsonb_build_object(
    'ok', true,
    'id', saved.id,
    'created_at', saved.created_at,
    'created_by_account_id', saved.created_by_account_id,
    'source', saved.source,
    'row_count', saved.row_count,
    'app_version', saved.app_version,
    'restored_backup_id', saved.restored_backup_id
  );
end;
$$;
create or replace function public.rak_owner_list_settings_backups_v2(p_limit integer default 50)
returns table (
  id uuid,
  source text,
  app_version text,
  row_count integer,
  restored_backup_id uuid,
  created_by_account_id text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.rak_require_admin(true);
  return query
  select
    backup.id,
    backup.source,
    backup.app_version,
    backup.row_count,
    backup.restored_backup_id,
    backup.created_by_account_id,
    backup.created_at
  from public.rak_admin_settings_backups as backup
  order by backup.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
end;
$$;
create or replace function public.rak_owner_get_settings_backup_v2(p_backup_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  backup public.rak_admin_settings_backups%rowtype;
begin
  perform private.rak_require_admin(true);
  select * into backup from public.rak_admin_settings_backups where id = p_backup_id;
  if backup.id is null then
    raise exception 'Settings backup not found' using errcode = 'P0002';
  end if;
  return jsonb_build_object(
    'id', backup.id,
    'snapshot', backup.snapshot,
    'source', backup.source,
    'app_version', backup.app_version,
    'row_count', backup.row_count,
    'restored_backup_id', backup.restored_backup_id,
    'created_by_account_id', backup.created_by_account_id,
    'created_at', backup.created_at
  );
end;
$$;
revoke all on function private.rak_json_number(text) from public, anon, authenticated;
revoke all on function private.rak_machine_setting_is_protected(jsonb) from public, anon, authenticated;
revoke all on function private.rak_upsert_machine_settings(jsonb) from public, anon, authenticated;
revoke all on function public.rak_admin_save_machine_settings_v2(jsonb, text) from public;
revoke all on function public.rak_admin_save_rotation_v2(text, jsonb, jsonb, bigint) from public;
revoke all on function public.rak_admin_list_rotation_backups_v2(integer) from public;
revoke all on function public.rak_admin_restore_rotation_backup_v2(uuid, bigint, jsonb) from public;
revoke all on function public.rak_owner_create_settings_backup_v2(jsonb, text, text, uuid, text) from public;
revoke all on function public.rak_owner_list_settings_backups_v2(integer) from public;
revoke all on function public.rak_owner_get_settings_backup_v2(uuid) from public;
grant execute on function public.rak_admin_save_machine_settings_v2(jsonb, text) to authenticated;
grant execute on function public.rak_admin_save_rotation_v2(text, jsonb, jsonb, bigint) to authenticated;
grant execute on function public.rak_admin_list_rotation_backups_v2(integer) to authenticated;
grant execute on function public.rak_admin_restore_rotation_backup_v2(uuid, bigint, jsonb) to authenticated;
grant execute on function public.rak_owner_create_settings_backup_v2(jsonb, text, text, uuid, text) to authenticated;
grant execute on function public.rak_owner_list_settings_backups_v2(integer) to authenticated;
grant execute on function public.rak_owner_get_settings_backup_v2(uuid) to authenticated;
-- Preserve existing full settings backups without leaving them as the long-term
-- storage mechanism. This runs only when the owner profile is already present.
insert into public.rak_admin_settings_backups (
  legacy_key,
  snapshot,
  source,
  app_version,
  row_count,
  created_by,
  created_by_account_id,
  created_at
)
select
  setting.machine_key,
  jsonb_build_object(
    'rows',
    case when jsonb_typeof(setting.settings_json -> 'rows') = 'array'
      then setting.settings_json -> 'rows'
      else '[]'::jsonb
    end
  ),
  coalesce(nullif(setting.settings_json ->> 'source', ''), 'legacy'),
  coalesce(setting.settings_json ->> 'appVersion', ''),
  case
    when coalesce(setting.settings_json ->> 'rowCount', '') ~ '^[0-9]{1,6}$'
      then (setting.settings_json ->> 'rowCount')::integer
    when jsonb_typeof(setting.settings_json -> 'rows') = 'array'
      then jsonb_array_length(setting.settings_json -> 'rows')
    else 0
  end,
  owner_profile.user_id,
  owner_profile.account_id,
  coalesce(setting.updated_at, now())
from public.machine_settings as setting
cross join lateral (
  select profile.user_id, profile.account_id
  from public.rak_admin_profiles as profile
  where profile.role = 'owner' and profile.enabled
  limit 1
) as owner_profile
where setting.machine_key like 'ADMIN_FULL_SETTINGS_BACKUP_%'
   or setting.category = 'admin_full_settings_backup'
   or setting.settings_json ->> 'stored_category' = 'admin_full_settings_backup'
on conflict (legacy_key) do nothing;
