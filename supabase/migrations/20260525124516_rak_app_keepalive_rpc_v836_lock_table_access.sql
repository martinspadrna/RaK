revoke all on table public.app_keepalive from anon, authenticated;

grant execute on function public.rak_app_keepalive(text, text, text, jsonb) to anon, authenticated;

comment on table public.app_keepalive is 'RaK v836: lightweight app startup heartbeat storage. Client writes through RPC rak_app_keepalive only; no direct anon/auth table access. Separate from game data and does not touch game_invites/game_sessions policies.';;
