begin;

revoke insert, update, delete on table public.game_accounts from anon, authenticated;
grant select on table public.game_accounts to anon, authenticated;

drop policy if exists game_accounts_insert_public on public.game_accounts;
drop policy if exists game_accounts_update_public on public.game_accounts;

create policy game_accounts_read_public_v411
on public.game_accounts
for select
using (true);

revoke delete on table public.game_invites from anon, authenticated;
revoke delete on table public.game_sessions from anon, authenticated;
revoke delete on table public.game_stats from anon, authenticated;

revoke all on table public.machine_settings from anon;
revoke all on table public.rotation_entries from anon;
revoke all on table public.rotation_months from anon;
revoke all on table public.rotation_state from anon;

drop policy if exists machine_settings_write_all on public.machine_settings;
drop policy if exists rotation_entries_write_all on public.rotation_entries;
drop policy if exists rotation_months_write_all on public.rotation_months;
drop policy if exists rotation_state_write_all on public.rotation_state;

create policy machine_settings_authenticated_write_v411
on public.machine_settings
for all
to authenticated
using (true)
with check (true);

create policy rotation_entries_authenticated_write_v411
on public.rotation_entries
for all
to authenticated
using (true)
with check (true);

create policy rotation_months_authenticated_write_v411
on public.rotation_months
for all
to authenticated
using (true)
with check (true);

create policy rotation_state_authenticated_write_v411
on public.rotation_state
for all
to authenticated
using (true)
with check (true);

commit;;
