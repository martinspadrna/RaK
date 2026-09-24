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
$$;

do $$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'rak_cleanup_expired_game_invites_hourly'
  ) then
    perform cron.unschedule('rak_cleanup_expired_game_invites_hourly');
  end if;
end;
$$;

select cron.schedule(
  'rak_cleanup_expired_game_invites_hourly',
  '17 * * * *',
  $$select public.rak_cleanup_expired_game_invites();$$
);;
