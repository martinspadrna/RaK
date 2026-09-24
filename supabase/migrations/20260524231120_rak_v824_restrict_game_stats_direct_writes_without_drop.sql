-- RaK v1.5(824) / Faze 2E-H: restrict direct game_stats writes without DROP POLICY.
-- Existing broad permissive policies remain in place, but these restrictive policies make direct public writes fail.
-- SECURITY DEFINER RPC functions remain the intended write path:
--   public.rak_record_game_stat_delta(...)
--   public.rak_save_game_ui_settings(...)
-- Existing data is not modified.

create policy game_stats_insert_rpc_only_v824
on public.game_stats
as restrictive
for insert
to public
with check (false);

create policy game_stats_update_rpc_only_v824
on public.game_stats
as restrictive
for update
to public
using (false)
with check (false);

comment on table public.game_stats is 'RaK v824: direct public INSERT/UPDATE restricted by restrictive policies. Writes must use rak_record_game_stat_delta and rak_save_game_ui_settings RPC. Public SELECT remains for app read compatibility.';;
