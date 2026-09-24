create or replace function public.rak_admin_cleanup_expired_game_invites()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_sessions integer := 0;
  deleted_old_sessions integer := 0;
  deleted_invites integer := 0;
begin
  with removed as (
    delete from public.game_sessions gs
    using public.game_invites gi
    where gs.invite_id = gi.id
      and gi.expires_at is not null
      and gi.expires_at < now()
      and coalesce(gs.status, '') <> 'finished'
    returning 1
  )
  select count(*) into deleted_sessions from removed;

  with removed as (
    delete from public.game_sessions
    where coalesce(status, '') in ('active', 'waiting', 'placing')
      and created_at < now() - interval '24 hours'
    returning 1
  )
  select count(*) into deleted_old_sessions from removed;

  with removed as (
    delete from public.game_invites gi
    where gi.expires_at is not null
      and gi.expires_at < now()
      and not exists (
        select 1
        from public.game_sessions gs
        where gs.invite_id = gi.id
      )
    returning 1
  )
  select count(*) into deleted_invites from removed;

  return jsonb_build_object(
    'ok', true,
    'deleted_sessions_from_expired_invites', deleted_sessions,
    'deleted_old_open_sessions', deleted_old_sessions,
    'deleted_expired_invites', deleted_invites,
    'cleaned_at', now()
  );
end;
$$;

grant execute on function public.rak_admin_cleanup_expired_game_invites() to anon, authenticated;;
