create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create or replace function public.rak_cleanup_expired_game_invites()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.game_sessions
  where status = 'active'
    and created_at < now() - interval '24 hours';

  delete from public.game_invites
  where expires_at is not null
    and expires_at < now();
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
