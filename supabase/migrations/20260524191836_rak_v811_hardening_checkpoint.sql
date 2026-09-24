-- RaK v1.5(811): checkpoint after game_stats RPC scaffold.
-- No data change. This migration only records the current hardening phase on affected tables.
comment on table public.game_stats is 'RaK v811: DELETE public policy removed; constrained game_stats RPC scaffold is available; direct INSERT/UPDATE temporarily kept for compatibility.';
comment on table public.game_sessions is 'RaK v811: DELETE public policy removed; direct INSERT/UPDATE temporarily kept for compatibility until session RPC is validated.';
comment on table public.game_invites is 'RaK v811: DELETE public policy removed; direct INSERT/UPDATE temporarily kept for compatibility until invite RPC is validated.';;
