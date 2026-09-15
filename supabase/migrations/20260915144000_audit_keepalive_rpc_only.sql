-- RaK 1.6.30 audit hardening: app_keepalive uses RPC only.
-- Client runtime already calls public.rak_app_keepalive and has no direct table fallback.

drop policy if exists app_keepalive_insert_public_v837 on public.app_keepalive;
drop policy if exists app_keepalive_select_public_v837 on public.app_keepalive;
drop policy if exists app_keepalive_update_public_v837 on public.app_keepalive;

revoke all privileges on table public.app_keepalive from anon, authenticated;
grant execute on function public.rak_app_keepalive(text, text, text, jsonb) to anon, authenticated;
