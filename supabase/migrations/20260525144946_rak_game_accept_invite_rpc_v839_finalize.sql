grant execute on function public.rak_accept_game_invite(text, text, jsonb) to anon, authenticated;

comment on function public.rak_accept_game_invite(text, text, jsonb) is 'RaK v839 finalize: accept invite/session RPC is available to anon/auth clients. This migration does not tighten game_invites/game_sessions policies.';;
