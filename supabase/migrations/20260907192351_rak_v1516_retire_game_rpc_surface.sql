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
    execute format('revoke execute on function %s from public, anon, authenticated', fn.signature);
  end loop;
end
$$;;
