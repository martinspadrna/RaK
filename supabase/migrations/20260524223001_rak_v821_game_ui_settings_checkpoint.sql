-- RaK v1.5(821): checkpoint for game UI settings hardening.
-- No schema or data changes. Records that game UI settings are stored in game_stats as __profile_ui
-- and must be preserved before future INSERT/UPDATE policy tightening.
comment on table public.game_stats is 'RaK v821 checkpoint: game_stats contains both game stats and __profile_ui records; keep direct INSERT/UPDATE compatible until profile UI RPC path is validated.';;
