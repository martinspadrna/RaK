-- Final cutover. Apply only after the v1.337 client and owner Auth account are
-- deployed and verified. Ordinary read-only application data stays public.

grant execute on function private.rak_is_admin() to authenticated;
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
    execute format('revoke insert, update, delete on table public.%I from anon, authenticated', table_name);
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
create policy rak_announcements_public_read_v2 on public.announcements
for select to anon, authenticated using (true);
create policy rak_machine_settings_safe_read_v2 on public.machine_settings
for select to anon, authenticated
using (
  coalesce(category, '') not in ('admin_accounts_settings', 'admin_full_settings_backup')
  and coalesce(machine_key, '') <> 'ADMIN_ACCOUNTS_SETTINGS'
  and coalesce(machine_key, '') not like 'ADMIN_FULL_SETTINGS_BACKUP_%'
  and coalesce(settings_json ->> 'stored_category', '') not in ('admin_accounts_settings', 'admin_full_settings_backup')
  and coalesce(settings_json ->> 'admin_settings_key', '') <> 'ADMIN_ACCOUNTS_SETTINGS'
  and coalesce(settings_json ->> 'admin_settings_key', '') not like 'ADMIN_FULL_SETTINGS_BACKUP_%'
);
create policy rak_machine_settings_admin_read_v2 on public.machine_settings
for select to authenticated using (private.rak_is_admin());
create policy rak_rotation_state_public_read_v2 on public.rotation_state
for select to anon, authenticated using (true);
create policy rak_rotation_months_public_read_v2 on public.rotation_months
for select to anon, authenticated using (true);
create policy rak_rotation_entries_public_read_v2 on public.rotation_entries
for select to anon, authenticated using (true);
create policy rak_game_accounts_public_read_v2 on public.game_accounts
for select to anon, authenticated using (true);
create policy rak_game_invites_public_read_v2 on public.game_invites
for select to anon, authenticated using (true);
create policy rak_game_sessions_public_read_v2 on public.game_sessions
for select to anon, authenticated using (true);
create policy rak_game_stats_public_read_v2 on public.game_stats
for select to anon, authenticated using (true);
create policy rak_gomoku_wins_public_read_v2 on public.gomoku_wins
for select to anon, authenticated using (true);
do $$
begin
  if to_regclass('public.game_ui_settings') is not null then
    execute 'grant select on table public.game_ui_settings to anon, authenticated';
    execute 'create policy rak_game_ui_settings_public_read_v2 on public.game_ui_settings for select to anon, authenticated using (true)';
  end if;
end;
$$;
-- Credential hashes and old full backups have already been migrated into their
-- dedicated protected tables. Do not leave a second public copy behind.
delete from public.machine_settings
where category in ('admin_accounts_settings', 'admin_full_settings_backup')
   or machine_key = 'ADMIN_ACCOUNTS_SETTINGS'
   or machine_key like 'ADMIN_FULL_SETTINGS_BACKUP_%'
   or settings_json ->> 'stored_category' in ('admin_accounts_settings', 'admin_full_settings_backup')
   or settings_json ->> 'admin_settings_key' = 'ADMIN_ACCOUNTS_SETTINGS'
   or settings_json ->> 'admin_settings_key' like 'ADMIN_FULL_SETTINGS_BACKUP_%';
-- Retire PIN-based and otherwise broad legacy admin RPCs. The v2 functions are
-- deliberately not included in this list.
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
      'revoke execute on function %I.%I(%s) from anon, authenticated',
      function_row.nspname,
      function_row.proname,
      function_row.identity_args
    );
  end loop;
end;
$$;
create or replace function public.rak_admin_auth_capabilities()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'version', 2,
    'available', true,
    'enforced', true,
    'provider', 'supabase-auth'
  )
$$;
revoke all on function public.rak_admin_auth_capabilities() from public;
grant execute on function public.rak_admin_auth_capabilities() to anon, authenticated;
