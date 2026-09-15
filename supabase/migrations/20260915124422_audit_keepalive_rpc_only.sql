-- RaK development: keep app_keepalive reachable only through rak_app_keepalive RPC.
do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'app_keepalive'
  loop
    execute format('drop policy if exists %I on public.app_keepalive', p.policyname);
  end loop;
end $$;

revoke all on table public.app_keepalive from public;
revoke all on table public.app_keepalive from anon;
revoke all on table public.app_keepalive from authenticated;
grant select, insert, update, delete on table public.app_keepalive to service_role;

revoke all on function public.rak_app_keepalive(text, text, text, jsonb) from public;
grant execute on function public.rak_app_keepalive(text, text, text, jsonb) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
