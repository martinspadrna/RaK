drop policy if exists app_keepalive_insert_public_v834 on public.app_keepalive;
drop policy if exists app_keepalive_update_public_v834 on public.app_keepalive;
drop policy if exists app_keepalive_select_public_v837 on public.app_keepalive;

create policy app_keepalive_insert_public_v837
on public.app_keepalive
for insert
to anon, authenticated
with check (char_length(coalesce(device_key, '')) between 1 and 120);

create policy app_keepalive_update_public_v837
on public.app_keepalive
for update
to anon, authenticated
using (char_length(coalesce(device_key, '')) between 1 and 120)
with check (char_length(coalesce(device_key, '')) between 1 and 120);

create policy app_keepalive_select_public_v837
on public.app_keepalive
for select
to anon, authenticated
using (char_length(coalesce(device_key, '')) between 1 and 120);

grant select, insert, update on table public.app_keepalive to anon, authenticated;
grant execute on function public.rak_app_keepalive(text, text, text, jsonb) to anon, authenticated;

comment on table public.app_keepalive is 'RaK v837: lightweight app startup heartbeat storage. RLS is scoped to app_keepalive only; game_invites/game_sessions are untouched.';;
