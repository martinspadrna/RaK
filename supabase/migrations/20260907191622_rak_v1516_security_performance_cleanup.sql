-- RaK v1.5.16 – bezpečnostní a výkonový cleanup bez změny provozních dat.

alter function public.rak_touch_app_keepalive_updated_at() set search_path = '';
alter function public.rak_touch_announcements_updated_at() set search_path = '';
alter function public.hradnik_touch_updated_at() set search_path = '';

create index if not exists rak_admin_audit_log_user_id_idx on public.rak_admin_audit_log (user_id);
create index if not exists rak_admin_devices_revoked_by_idx on public.rak_admin_devices (revoked_by);
create index if not exists rak_admin_profiles_created_by_idx on public.rak_admin_profiles (created_by);
create index if not exists rak_admin_settings_backups_created_by_idx on public.rak_admin_settings_backups (created_by);
create index if not exists rak_admin_settings_backups_restored_backup_id_idx on public.rak_admin_settings_backups (restored_backup_id);
create index if not exists rak_rotation_backups_v2_created_by_idx on public.rak_rotation_backups_v2 (created_by);

do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and (p.proname like 'rak_admin_%' or p.proname like 'rak_owner_%')
      and p.proname <> 'rak_admin_account_requires_auth'
  loop
    execute format('revoke execute on function %s from anon', fn.signature);
  end loop;
end
$$;

do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and (
        p.proname in (
          'rak_accept_game_invite',
          'rak_cleanup_expired_game_invites',
          'rak_create_game_invite_session',
          'rak_record_game_stat_delta',
          'rak_save_game_session_by_invite_code',
          'rak_save_game_ui_settings',
          'rak_submit_gomoku_win_v2',
          'rak_admin_cleanup_expired_game_invites_v2'
        )
        or p.proname like 'rak_game_%'
      )
  loop
    execute format('revoke execute on function %s from anon, authenticated', fn.signature);
  end loop;
end
$$;

drop policy if exists rak_game_invites_public_read_v2 on public.game_invites;
drop policy if exists rak_game_sessions_public_read_v2 on public.game_sessions;
drop policy if exists rak_game_stats_public_read_v2 on public.game_stats;
revoke select, insert, update, delete on table public.game_invites from anon, authenticated;
revoke select, insert, update, delete on table public.game_sessions from anon, authenticated;
revoke select, insert, update, delete on table public.game_stats from anon, authenticated;

drop policy if exists rak_machine_settings_admin_read_v2 on public.machine_settings;
drop policy if exists rak_machine_settings_safe_read_v2 on public.machine_settings;
drop policy if exists rak_machine_settings_anon_safe_read_v3 on public.machine_settings;
drop policy if exists rak_machine_settings_authenticated_read_v3 on public.machine_settings;

create policy rak_machine_settings_anon_safe_read_v3
on public.machine_settings
for select
to anon
using (
  coalesce(category, '') <> all (array['admin_accounts_settings', 'admin_full_settings_backup'])
  and coalesce(machine_key, '') <> 'ADMIN_ACCOUNTS_SETTINGS'
  and coalesce(machine_key, '') not like 'ADMIN_FULL_SETTINGS_BACKUP_%'
  and coalesce(settings_json ->> 'stored_category', '') <> all (array['admin_accounts_settings', 'admin_full_settings_backup'])
  and coalesce(settings_json ->> 'admin_settings_key', '') <> 'ADMIN_ACCOUNTS_SETTINGS'
  and coalesce(settings_json ->> 'admin_settings_key', '') not like 'ADMIN_FULL_SETTINGS_BACKUP_%'
);

create policy rak_machine_settings_authenticated_read_v3
on public.machine_settings
for select
to authenticated
using (
  private.rak_is_admin()
  or (
    coalesce(category, '') <> all (array['admin_accounts_settings', 'admin_full_settings_backup'])
    and coalesce(machine_key, '') <> 'ADMIN_ACCOUNTS_SETTINGS'
    and coalesce(machine_key, '') not like 'ADMIN_FULL_SETTINGS_BACKUP_%'
    and coalesce(settings_json ->> 'stored_category', '') <> all (array['admin_accounts_settings', 'admin_full_settings_backup'])
    and coalesce(settings_json ->> 'admin_settings_key', '') <> 'ADMIN_ACCOUNTS_SETTINGS'
    and coalesce(settings_json ->> 'admin_settings_key', '') not like 'ADMIN_FULL_SETTINGS_BACKUP_%'
  )
);;
