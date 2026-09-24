-- Complete the cutover by removing non-DML table privileges, inherited PUBLIC
-- function access, and by making the 59 legacy schedule backups visible through
-- the protected v2 backup API. The legacy backup table is retained read-only as
-- an additional recovery copy.

do $$
declare
  table_name text;
  policy_row record;
begin
  foreach table_name in array array[
    'announcements',
    'machine_settings',
    'rotation_state',
    'rotation_months',
    'rotation_entries',
    'game_accounts',
    'game_invites',
    'game_sessions',
    'game_stats',
    'game_ui_settings',
    'gomoku_wins',
    'bug_reports'
  ]
  loop
    if to_regclass('public.' || table_name) is not null then
      execute format('revoke all privileges on table public.%I from public, anon, authenticated', table_name);
    end if;
  end loop;

  foreach table_name in array array[
    'rotation_state_backups',
    'rak_rotation_backups_v2',
    'rak_admin_settings_backups',
    'rak_admin_profiles',
    'rak_admin_devices',
    'rak_admin_audit_log'
  ]
  loop
    if to_regclass('public.' || table_name) is null then
      continue;
    end if;
    execute format('alter table public.%I enable row level security', table_name);
    for policy_row in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = table_name
    loop
      execute format('drop policy if exists %I on public.%I', policy_row.policyname, table_name);
    end loop;
    execute format('revoke all privileges on table public.%I from public, anon, authenticated', table_name);
  end loop;
end;
$$;
grant select on table public.announcements to anon, authenticated;
grant select on table public.machine_settings to anon, authenticated;
grant select on table public.rotation_state to anon, authenticated;
grant select on table public.rotation_months to anon, authenticated;
grant select on table public.rotation_entries to anon, authenticated;
grant select on table public.game_accounts to anon, authenticated;
grant select on table public.game_invites to anon, authenticated;
grant select on table public.game_sessions to anon, authenticated;
grant select on table public.game_stats to anon, authenticated;
grant select on table public.gomoku_wins to anon, authenticated;
do $$
begin
  if to_regclass('public.game_ui_settings') is not null then
    execute 'grant select on table public.game_ui_settings to anon, authenticated';
  end if;
end;
$$;
do $$
declare
  function_row record;
begin
  for function_row in
    select namespace.nspname, procedure.proname, pg_get_function_identity_arguments(procedure.oid) as identity_args
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname in (
        'rak_admin_save_machine_settings',
        'rak_admin_save_rotation_state',
        'rak_admin_list_rotation_backups',
        'rak_admin_restore_rotation_backup',
        'rak_save_dashboard_announcement',
        'rak_clear_dashboard_announcement',
        'rak_usage_presence_admin',
        'rak_admin_cleanup_expired_game_invites'
      )
  loop
    execute format(
      'revoke all privileges on function %I.%I(%s) from public, anon, authenticated',
      function_row.nspname,
      function_row.proname,
      function_row.identity_args
    );
  end loop;
end;
$$;
insert into public.rak_rotation_backups_v2 (
  id,
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
)
select
  backup.id,
  coalesce(nullif(trim(backup.key), ''), 'main'),
  backup.payload,
  coalesce(backup.meta, '{}'::jsonb) || jsonb_build_object(
    'legacyPreviousUpdatedAt', backup.previous_updated_at,
    'legacyReplacedByMeta', coalesce(backup.replaced_by_meta, '{}'::jsonb),
    'migratedFrom', 'rotation_state_backups'
  ),
  0,
  left(coalesce(backup.replaced_by_meta ->> 'source', backup.meta ->> 'source', 'legacy'), 80),
  left(coalesce(backup.replaced_by_meta ->> 'monthKey', backup.meta ->> 'monthKey', ''), 20),
  coalesce((
    select count(*)::integer
    from jsonb_each(coalesce(backup.payload -> 'months', '{}'::jsonb)) as month_row(key, value)
  ), 0),
  coalesce((
    select sum(
      case
        when jsonb_typeof(month_row.value -> 'dayMods') = 'array'
          then jsonb_array_length(month_row.value -> 'dayMods')
        else 0
      end
    )::integer
    from jsonb_each(coalesce(backup.payload -> 'months', '{}'::jsonb)) as month_row(key, value)
  ), 0),
  owner_profile.user_id,
  owner_profile.account_id,
  backup.replaced_at
from public.rotation_state_backups as backup
cross join lateral (
  select profile.user_id, profile.account_id
  from public.rak_admin_profiles as profile
  where profile.role = 'owner' and profile.enabled
  order by profile.created_at
  limit 1
) as owner_profile
on conflict (id) do nothing;
