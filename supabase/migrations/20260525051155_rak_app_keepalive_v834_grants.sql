grant insert, update on table public.app_keepalive to anon, authenticated;

comment on column public.app_keepalive.device_key is 'Random local device key for RaK keepalive, stored in localStorage. No account number or player profile.';
comment on column public.app_keepalive.heartbeat_at is 'Last successful RaK heartbeat timestamp.';;
