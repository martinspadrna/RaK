create index if not exists game_invites_invitee_account_number_idx on public.game_invites (invitee_account_number);
create index if not exists game_invites_inviter_account_number_idx on public.game_invites (inviter_account_number);
create index if not exists game_sessions_invite_id_idx on public.game_sessions (invite_id);
create index if not exists game_sessions_player_o_account_number_idx on public.game_sessions (player_o_account_number);
create index if not exists game_sessions_player_x_account_number_idx on public.game_sessions (player_x_account_number);
create index if not exists game_sessions_winner_account_number_idx on public.game_sessions (winner_account_number);;
