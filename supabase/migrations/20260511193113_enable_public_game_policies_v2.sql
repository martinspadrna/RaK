alter table if exists public.game_accounts enable row level security;
alter table if exists public.game_invites enable row level security;
alter table if exists public.game_sessions enable row level security;
alter table if exists public.game_stats enable row level security;

drop policy if exists game_accounts_select_public on public.game_accounts;
drop policy if exists game_accounts_insert_public on public.game_accounts;
drop policy if exists game_accounts_update_public on public.game_accounts;
create policy game_accounts_select_public on public.game_accounts for select using (true);
create policy game_accounts_insert_public on public.game_accounts for insert with check (true);
create policy game_accounts_update_public on public.game_accounts for update using (true) with check (true);

drop policy if exists game_invites_select_public on public.game_invites;
drop policy if exists game_invites_insert_public on public.game_invites;
drop policy if exists game_invites_update_public on public.game_invites;
drop policy if exists game_invites_delete_public on public.game_invites;
create policy game_invites_select_public on public.game_invites for select using (true);
create policy game_invites_insert_public on public.game_invites for insert with check (true);
create policy game_invites_update_public on public.game_invites for update using (true) with check (true);
create policy game_invites_delete_public on public.game_invites for delete using (true);

drop policy if exists game_sessions_select_public on public.game_sessions;
drop policy if exists game_sessions_insert_public on public.game_sessions;
drop policy if exists game_sessions_update_public on public.game_sessions;
drop policy if exists game_sessions_delete_public on public.game_sessions;
create policy game_sessions_select_public on public.game_sessions for select using (true);
create policy game_sessions_insert_public on public.game_sessions for insert with check (true);
create policy game_sessions_update_public on public.game_sessions for update using (true) with check (true);
create policy game_sessions_delete_public on public.game_sessions for delete using (true);

drop policy if exists game_stats_select_public on public.game_stats;
drop policy if exists game_stats_insert_public on public.game_stats;
drop policy if exists game_stats_update_public on public.game_stats;
drop policy if exists game_stats_delete_public on public.game_stats;
create policy game_stats_select_public on public.game_stats for select using (true);
create policy game_stats_insert_public on public.game_stats for insert with check (true);
create policy game_stats_update_public on public.game_stats for update using (true) with check (true);
create policy game_stats_delete_public on public.game_stats for delete using (true);;
