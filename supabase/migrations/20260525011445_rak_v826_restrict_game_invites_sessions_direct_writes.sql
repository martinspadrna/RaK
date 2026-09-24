-- RaK v1.5(826) / Faze 2E-J: restrict direct public writes for game_invites and game_sessions.
-- Existing data is not modified.
-- RPC functions should be used for online invites/sessions:
--   public.rak_create_game_invite_session(...)
--   public.rak_save_game_session_by_invite_code(...)
-- Public SELECT remains for app read/realtime compatibility.

create policy game_invites_insert_rpc_only_v826
on public.game_invites
as restrictive
for insert
to public
with check (false);

create policy game_invites_update_rpc_only_v826
on public.game_invites
as restrictive
for update
to public
using (false)
with check (false);

create policy game_sessions_insert_rpc_only_v826
on public.game_sessions
as restrictive
for insert
to public
with check (false);

create policy game_sessions_update_rpc_only_v826
on public.game_sessions
as restrictive
for update
to public
using (false)
with check (false);

comment on table public.game_invites is 'RaK v826: direct public INSERT/UPDATE restricted by restrictive policies. Invite writes should use rak_create_game_invite_session RPC. Public SELECT remains for app compatibility.';
comment on table public.game_sessions is 'RaK v826: direct public INSERT/UPDATE restricted by restrictive policies. Session writes should use rak_save_game_session_by_invite_code RPC. Public SELECT remains for app compatibility.';;
