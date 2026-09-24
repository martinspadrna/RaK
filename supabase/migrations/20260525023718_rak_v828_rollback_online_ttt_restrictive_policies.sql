-- RaK v1.5(828) emergency rollback for online Piškvorky.
-- Reason: restrictive policies added in v826 broke online game invite/session writes.
-- Existing data is not modified.
-- Restore direct public INSERT/UPDATE compatibility for game_invites and game_sessions.

drop policy if exists game_invites_insert_rpc_only_v826 on public.game_invites;
drop policy if exists game_invites_update_rpc_only_v826 on public.game_invites;
drop policy if exists game_sessions_insert_rpc_only_v826 on public.game_sessions;
drop policy if exists game_sessions_update_rpc_only_v826 on public.game_sessions;

comment on table public.game_invites is 'RaK v828 rollback: v826 restrictive INSERT/UPDATE policies removed because online Piškvorky stopped working. Direct INSERT/UPDATE temporarily restored until RPC path is verified on two mobiles.';
comment on table public.game_sessions is 'RaK v828 rollback: v826 restrictive INSERT/UPDATE policies removed because online Piškvorky stopped working. Direct INSERT/UPDATE temporarily restored until RPC path is verified on two mobiles.';;
