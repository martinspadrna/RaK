create table if not exists public.app_keepalive (
  device_key text primary key,
  app_version text,
  heartbeat_at timestamptz not null default now(),
  user_agent text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_keepalive enable row level security;

create index if not exists app_keepalive_heartbeat_at_idx
  on public.app_keepalive (heartbeat_at desc);

create or replace function public.rak_touch_app_keepalive_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_app_keepalive_updated_at on public.app_keepalive;
create trigger trg_app_keepalive_updated_at
before update on public.app_keepalive
for each row
execute function public.rak_touch_app_keepalive_updated_at();

drop policy if exists app_keepalive_insert_public_v834 on public.app_keepalive;
create policy app_keepalive_insert_public_v834
on public.app_keepalive
for insert
to anon, authenticated
with check (
  char_length(device_key) between 12 and 80
  and char_length(coalesce(app_version, '')) <= 40
  and char_length(coalesce(user_agent, '')) <= 300
);

drop policy if exists app_keepalive_update_public_v834 on public.app_keepalive;
create policy app_keepalive_update_public_v834
on public.app_keepalive
for update
to anon, authenticated
using (
  char_length(device_key) between 12 and 80
)
with check (
  char_length(device_key) between 12 and 80
  and char_length(coalesce(app_version, '')) <= 40
  and char_length(coalesce(user_agent, '')) <= 300
);

comment on table public.app_keepalive is 'RaK v834: lightweight app startup heartbeat. Separate from game data; does not touch game_invites/game_sessions policies.';;
