-- RaK v1.5(825) / Faze 2E-I: non-breaking RPC scaffold for game_invites and game_sessions.
-- Existing INSERT/UPDATE policies stay unchanged in this migration for compatibility.
-- Existing data is not modified.

create or replace function public.rak_create_game_invite_session(
  p_invite_row jsonb,
  p_session_row jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.game_invites;
  v_session public.game_sessions;
  v_code text;
  v_game_type text;
  v_inviter text;
  v_expires_at timestamptz;
  v_payload jsonb;
  v_board jsonb;
  v_move_history jsonb;
begin
  if p_invite_row is null or jsonb_typeof(p_invite_row) <> 'object' then
    raise exception 'invalid invite payload';
  end if;
  if p_session_row is null or jsonb_typeof(p_session_row) <> 'object' then
    raise exception 'invalid session payload';
  end if;

  v_code := upper(trim(coalesce(p_invite_row->>'invite_code', '')));
  v_game_type := trim(coalesce(p_invite_row->>'game_type', p_session_row->>'game_type', 'gomoku'));
  v_inviter := nullif(trim(coalesce(p_invite_row->>'inviter_account_number', p_session_row->>'player_x_account_number', '')), '');
  v_payload := coalesce(p_invite_row->'payload', '{}'::jsonb);
  v_board := coalesce(p_session_row->'board_state', '{}'::jsonb);
  v_move_history := coalesce(p_session_row->'move_history', '[]'::jsonb);

  if length(v_code) < 4 or length(v_code) > 32 then
    raise exception 'invalid invite_code';
  end if;
  if length(v_game_type) < 2 or length(v_game_type) > 32 then
    raise exception 'invalid game_type';
  end if;
  if v_inviter is not null and length(v_inviter) > 32 then
    raise exception 'invalid inviter_account_number';
  end if;
  if jsonb_typeof(v_payload) <> 'object' then
    raise exception 'invalid invite payload object';
  end if;
  if jsonb_typeof(v_board) <> 'object' then
    raise exception 'invalid board_state';
  end if;
  if jsonb_typeof(v_move_history) <> 'array' then
    raise exception 'invalid move_history';
  end if;
  if pg_column_size(v_payload) > 120000 or pg_column_size(v_board) > 240000 then
    raise exception 'game invite/session payload too large';
  end if;

  v_expires_at := coalesce(nullif(p_invite_row->>'expires_at', '')::timestamptz, now() + interval '2 hours');

  insert into public.game_invites(
    game_type, inviter_account_number, invitee_account_number, invite_code, status, created_at, accepted_at, expires_at, payload
  ) values (
    v_game_type, v_inviter, null, v_code, 'pending', now(), null, v_expires_at, v_payload
  )
  returning * into v_invite;

  insert into public.game_sessions(
    game_type, invite_id, player_x_account_number, player_o_account_number, winner_account_number,
    status, board_state, move_history, created_at, updated_at, finished_at
  ) values (
    v_game_type, v_invite.id, v_inviter, null, null,
    coalesce(nullif(p_session_row->>'status', ''), 'waiting'),
    v_board, v_move_history, now(), now(), null
  )
  returning * into v_session;

  return jsonb_build_object('ok', true, 'invite', to_jsonb(v_invite), 'session', to_jsonb(v_session));
end;
$$;

grant execute on function public.rak_create_game_invite_session(jsonb, jsonb) to anon, authenticated;

create or replace function public.rak_save_game_session_by_invite_code(
  p_invite_code text,
  p_session_row jsonb,
  p_start_new_round boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.game_invites;
  v_existing public.game_sessions;
  v_session public.game_sessions;
  v_code text;
  v_board jsonb;
  v_history jsonb;
  v_status text;
  v_winner text;
  v_x text;
  v_o text;
begin
  v_code := upper(trim(coalesce(p_invite_code, '')));
  if length(v_code) < 4 or length(v_code) > 32 then
    raise exception 'invalid invite_code';
  end if;
  if p_session_row is null or jsonb_typeof(p_session_row) <> 'object' then
    raise exception 'invalid session payload';
  end if;

  select * into v_invite
  from public.game_invites
  where invite_code = v_code
  order by created_at desc
  limit 1;

  if v_invite.id is null then
    raise exception 'invite not found';
  end if;

  select * into v_existing
  from public.game_sessions
  where invite_id = v_invite.id
  order by updated_at desc
  limit 1;

  v_board := coalesce(p_session_row->'board_state', '{}'::jsonb);
  v_history := coalesce(p_session_row->'move_history', case when v_existing.id is null then '[]'::jsonb else v_existing.move_history end);
  v_status := coalesce(nullif(p_session_row->>'status', ''), case when coalesce((v_board->>'gameOver')::boolean, false) then 'finished' else 'active' end);
  v_winner := nullif(trim(coalesce(p_session_row->>'winner_account_number', '')), '');
  v_x := nullif(trim(coalesce(p_session_row->>'player_x_account_number', v_existing.player_x_account_number, v_invite.inviter_account_number, '')), '');
  v_o := nullif(trim(coalesce(p_session_row->>'player_o_account_number', v_existing.player_o_account_number, v_invite.invitee_account_number, '')), '');

  if jsonb_typeof(v_board) <> 'object' then
    raise exception 'invalid board_state';
  end if;
  if jsonb_typeof(v_history) <> 'array' then
    raise exception 'invalid move_history';
  end if;
  if pg_column_size(v_board) > 240000 or pg_column_size(v_history) > 240000 then
    raise exception 'session payload too large';
  end if;

  if v_existing.id is not null and not coalesce(p_start_new_round, false) then
    update public.game_sessions
    set
      game_type = coalesce(nullif(p_session_row->>'game_type', ''), v_existing.game_type, v_invite.game_type),
      player_x_account_number = v_x,
      player_o_account_number = v_o,
      winner_account_number = v_winner,
      status = v_status,
      board_state = v_board,
      move_history = v_history,
      updated_at = now(),
      finished_at = case when v_status = 'finished' then coalesce(v_existing.finished_at, now()) else null end
    where id = v_existing.id
    returning * into v_session;
  else
    insert into public.game_sessions(
      game_type, invite_id, player_x_account_number, player_o_account_number, winner_account_number,
      status, board_state, move_history, created_at, updated_at, finished_at
    ) values (
      coalesce(nullif(p_session_row->>'game_type', ''), v_invite.game_type), v_invite.id, v_x, v_o, v_winner,
      v_status, v_board, v_history, now(), now(), case when v_status = 'finished' then now() else null end
    )
    returning * into v_session;
  end if;

  return jsonb_build_object('ok', true, 'invite', to_jsonb(v_invite), 'session', to_jsonb(v_session));
end;
$$;

grant execute on function public.rak_save_game_session_by_invite_code(text, jsonb, boolean) to anon, authenticated;

comment on function public.rak_create_game_invite_session(jsonb, jsonb) is 'RaK v825: constrained RPC scaffold for creating game invite + initial session. Direct INSERT/UPDATE stays temporarily for compatibility.';
comment on function public.rak_save_game_session_by_invite_code(text, jsonb, boolean) is 'RaK v825: constrained RPC scaffold for saving game session by invite code. Direct INSERT/UPDATE stays temporarily for compatibility.';
comment on table public.game_sessions is 'RaK v825: session RPC scaffold available; direct INSERT/UPDATE temporarily kept until mobile online-game smoke is confirmed.';
comment on table public.game_invites is 'RaK v825: invite RPC scaffold available; direct INSERT/UPDATE temporarily kept until mobile invite smoke is confirmed.';;
