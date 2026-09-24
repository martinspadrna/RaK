create table if not exists public.rak_usage_presence (
  device_id text primary key,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  session_count integer not null default 1,
  app_version text,
  build_number integer,
  user_name text,
  profile_id text,
  user_agent text,
  platform text,
  language text,
  screen text,
  timezone text,
  connection_type text,
  ip_hash text,
  last_path text,
  last_source text,
  updated_at timestamptz not null default now()
);

alter table public.rak_usage_presence enable row level security;

drop policy if exists rak_usage_presence_insert_anon on public.rak_usage_presence;
create policy rak_usage_presence_insert_anon
on public.rak_usage_presence
for insert
to anon, authenticated
with check (device_id is not null and length(device_id) between 12 and 128);

drop policy if exists rak_usage_presence_update_anon on public.rak_usage_presence;
create policy rak_usage_presence_update_anon
on public.rak_usage_presence
for update
to anon, authenticated
using (device_id is not null and length(device_id) between 12 and 128)
with check (device_id is not null and length(device_id) between 12 and 128);

drop policy if exists rak_usage_presence_select_authenticated on public.rak_usage_presence;
create policy rak_usage_presence_select_authenticated
on public.rak_usage_presence
for select
to authenticated
using (true);

create index if not exists rak_usage_presence_last_seen_idx on public.rak_usage_presence (last_seen desc);
create index if not exists rak_usage_presence_build_idx on public.rak_usage_presence (build_number desc);

create or replace function public.rak_usage_presence_touch(payload jsonb)
returns public.rak_usage_presence
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device_id text := nullif(payload->>'device_id', '');
  v_build_number integer := null;
  v_row public.rak_usage_presence;
begin
  if v_device_id is null or length(v_device_id) < 12 or length(v_device_id) > 128 then
    raise exception 'Invalid device_id';
  end if;

  begin
    v_build_number := nullif(payload->>'build_number', '')::integer;
  exception when others then
    v_build_number := null;
  end;

  insert into public.rak_usage_presence as rup (
    device_id,
    first_seen,
    last_seen,
    session_count,
    app_version,
    build_number,
    user_name,
    profile_id,
    user_agent,
    platform,
    language,
    screen,
    timezone,
    connection_type,
    ip_hash,
    last_path,
    last_source,
    updated_at
  ) values (
    v_device_id,
    now(),
    now(),
    1,
    left(payload->>'app_version', 64),
    v_build_number,
    left(payload->>'user_name', 120),
    left(payload->>'profile_id', 120),
    left(payload->>'user_agent', 500),
    left(payload->>'platform', 120),
    left(payload->>'language', 40),
    left(payload->>'screen', 40),
    left(payload->>'timezone', 80),
    left(payload->>'connection_type', 40),
    left(payload->>'ip_hash', 160),
    left(payload->>'last_path', 200),
    left(payload->>'last_source', 80),
    now()
  )
  on conflict (device_id) do update set
    last_seen = now(),
    session_count = rup.session_count + 1,
    app_version = coalesce(excluded.app_version, rup.app_version),
    build_number = coalesce(excluded.build_number, rup.build_number),
    user_name = coalesce(excluded.user_name, rup.user_name),
    profile_id = coalesce(excluded.profile_id, rup.profile_id),
    user_agent = coalesce(excluded.user_agent, rup.user_agent),
    platform = coalesce(excluded.platform, rup.platform),
    language = coalesce(excluded.language, rup.language),
    screen = coalesce(excluded.screen, rup.screen),
    timezone = coalesce(excluded.timezone, rup.timezone),
    connection_type = coalesce(excluded.connection_type, rup.connection_type),
    ip_hash = coalesce(excluded.ip_hash, rup.ip_hash),
    last_path = coalesce(excluded.last_path, rup.last_path),
    last_source = coalesce(excluded.last_source, rup.last_source),
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.rak_usage_presence_touch(jsonb) to anon, authenticated;
grant select on public.rak_usage_presence to authenticated;
grant insert, update on public.rak_usage_presence to anon, authenticated;

create or replace function public.rak_usage_presence_admin(limit_count integer default 100)
returns table (
  device_id text,
  first_seen timestamptz,
  last_seen timestamptz,
  session_count integer,
  app_version text,
  build_number integer,
  user_name text,
  profile_id text,
  user_agent text,
  platform text,
  language text,
  screen text,
  timezone text,
  connection_type text,
  ip_hash text,
  last_path text,
  last_source text,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    device_id,
    first_seen,
    last_seen,
    session_count,
    app_version,
    build_number,
    user_name,
    profile_id,
    user_agent,
    platform,
    language,
    screen,
    timezone,
    connection_type,
    ip_hash,
    last_path,
    last_source,
    updated_at
  from public.rak_usage_presence
  order by last_seen desc
  limit greatest(1, least(coalesce(limit_count, 100), 500));
$$;

grant execute on function public.rak_usage_presence_admin(integer) to authenticated;;
