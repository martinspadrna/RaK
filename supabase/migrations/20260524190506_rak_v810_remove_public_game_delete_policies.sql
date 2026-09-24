-- RaK v1.5(810) / Faze 2D: remove broad public DELETE policies on game tables.
-- Non-destructive hardening: existing rows are not modified.
-- SELECT/INSERT/UPDATE policies remain unchanged for compatibility.

drop policy if exists game_stats_delete_public on public.game_stats;
drop policy if exists game_sessions_delete_public on public.game_sessions;
drop policy if exists game_invites_delete_public on public.game_invites;

comment on table public.game_stats is 'RaK v810: broad public DELETE policy removed; public SELECT/INSERT/UPDATE temporarily kept for compatibility.';
comment on table public.game_sessions is 'RaK v810: broad public DELETE policy removed; public SELECT/INSERT/UPDATE temporarily kept for compatibility.';
comment on table public.game_invites is 'RaK v810: broad public DELETE policy removed; cleanup should use constrained RPC/functions instead of broad direct DELETE.';;
