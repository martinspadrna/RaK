create or replace function public.rak_accept_game_invite(
  p_invite_code text,
  p_invitee_account_number text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.game_invites%rowtype;
  v_session public.game_sessions%rowtype;
  v_code text := upper(trim(coalesce(p_invite_code, '')));
  v_invitee text := trim(coalesce(p_invitee_account_number, ''));
  v_now timestamptz := now();
begin
  if v_code = '' or char_length(v_code) > 24 then
    raise exception using errcode = '22023', message = 'invalid_invite_code';
  end if;

  if v_invitee = '' or char_length(v_invitee) > 64 then
    raise exception using errcode = '22023', message = 'invalid_invitee_account_number';
  end if;

  select * into v_invite
  from public.game_invites
  where invite_code = v_code
  order by created_at desc
  limit 1
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'invite_not_found';
  end if;

  if v_invite.status not in ('pending', 'accepted') then
    raise exception using errcode = '22023', message = 'invite_not_available';
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at < v_now then
    update public.game_invites
    set status = 'expired'
    where id = v_invite.id;
    raise exception using errcode = '22023', message = 'invite_expired';
  end if;

  if v_invite.inviter_account_number = v_invitee then
    raise exception using errcode = '22023', message = 'cannot_join_own_invite';
  end if;

  if v_invite.invitee_account_number is not null
     and v_invite.invitee_account_number <> v_invitee then
    raise exception using errcode = '22023', message = 'invite_already_taken';
  end if;

  update public.game_invites
  set invitee_account_number = coalesce(invitee_account_number, v_invitee),
      status = 'accepted',
      accepted_at = coalesce(accepted_at, v_now)
  where id = v_invite.id
  returning * into v_invite;

  select * into v_session
  from public.game_sessions
  where invite_id = v_invite.id
  order by created_at desc
  limit 1
  for update;

  if not found then
    insert into public.game_sessions (
      game_type,
      invite_id,
      player_x_account_number,
      player_o_account_number,
      status,
      board_state,
      move_history
    ) values (
      coalesce(v_invite.game_type, 'gomoku'),
      v_invite.id,
      v_invite.inviter_account_number,
      v_invitee,
      'active',
      '{}'::jsonb,
      '[]'::jsonb
    )
    returning * into v_session;
  else
    update public.game_sessions
    set player_o_account_number = coalesce(player_o_account_number, v_invitee),
        status = case when status = 'pending' then 'active' else status end,
        updated_at = v_now
    where id = v_session.id
    returning * into v_session;
  end if;

  return jsonb_build_object(
    'ok', true,
    'method', 'rpc',
    'invite', to_jsonb(v_invite),
    'session', to_jsonb(v_session),
    'local_role', case
      when v_session.player_x_account_number = v_invitee then 'X'
      when v_session.player_o_account_number = v_invitee then 'O'
      else null
    end
  );
end;
$$;

revoke all on function public.rak_accept_game_invite(text, text) from public;
grant execute on function public.rak_accept_game_invite(text, text) to anon, authenticated;

comment on function public.rak_accept_game_invite(text, text) is 'RaK v839: accepts game invite and joins/creates game session through RPC. Added before any game_invites/game_sessions policy hardening; no policy tightening in this migration.';;
