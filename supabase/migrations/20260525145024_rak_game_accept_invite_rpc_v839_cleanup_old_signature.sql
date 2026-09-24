drop function if exists public.rak_accept_game_invite(text, text);

comment on function public.rak_accept_game_invite(text, text, jsonb) is 'RaK v839: canonical accept invite/session RPC including board_state role/status. Old two-argument draft signature removed. No game_invites/game_sessions policy tightening.';;
