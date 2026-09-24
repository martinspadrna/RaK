alter table public.announcements replica identity full;
alter table public.machine_settings replica identity full;
alter table public.rotation_state replica identity full;
alter table public.rotation_months replica identity full;
alter table public.rotation_entries replica identity full;
alter table public.game_accounts replica identity full;
alter table public.game_invites replica identity full;
alter table public.game_sessions replica identity full;
alter table public.game_stats replica identity full;
alter table public.gomoku_wins replica identity full;

alter publication supabase_realtime add table
  public.announcements,
  public.machine_settings,
  public.rotation_state,
  public.rotation_months,
  public.rotation_entries,
  public.game_accounts,
  public.game_invites,
  public.game_sessions,
  public.game_stats,
  public.gomoku_wins;;
