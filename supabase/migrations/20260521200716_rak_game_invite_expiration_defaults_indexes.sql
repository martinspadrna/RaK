alter table public.game_invites
  alter column expires_at set default (now() + interval '1 hour');

create index if not exists game_invites_expires_at_idx
  on public.game_invites (expires_at)
  where expires_at is not null;

create index if not exists game_sessions_invite_status_created_idx
  on public.game_sessions (invite_id, status, created_at);

create or replace function public.rak_cleanup_expired_game_invites()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.game_sessions gs
  using public.game_invites gi
  where gs.invite_id = gi.id
    and gi.expires_at is not null
    and gi.expires_at < now()
    and coalesce(gs.status, '') <> 'finished';

  delete from public.game_sessions
  where coalesce(status, '') in ('active', 'waiting', 'placing')
    and created_at < now() - interval '24 hours';

  delete from public.game_invites gi
  where gi.expires_at is not null
    and gi.expires_at < now()
    and not exists (
      select 1
      from public.game_sessions gs
      where gs.invite_id = gi.id
    );
end;
$$;;
