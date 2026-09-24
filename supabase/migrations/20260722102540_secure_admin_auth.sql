-- Phase 1 of the RaK security migration.
-- This is intentionally additive: the legacy admin path remains available until
-- the owner Auth user is provisioned and the new client has been verified.

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
create table if not exists public.rak_admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  account_id text not null unique,
  display_name text not null default '',
  role text not null check (role in ('owner', 'admin')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint rak_admin_profiles_account_id_format
    check (account_id ~ '^[0-9]{4,12}$')
);
create table if not exists public.rak_admin_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  device_id text not null,
  label text not null default 'Zařízení',
  app_version text not null default '',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  unique (user_id, device_id)
);
create index if not exists rak_admin_devices_user_last_seen_idx
  on public.rak_admin_devices (user_id, last_seen_at desc);
create index if not exists rak_admin_devices_session_idx
  on public.rak_admin_devices (session_id);
create table if not exists public.rak_admin_audit_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  account_id text not null default '',
  session_id uuid,
  action text not null,
  target_type text not null default '',
  target_id text not null default '',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists rak_admin_audit_log_created_idx
  on public.rak_admin_audit_log (created_at desc);
create table if not exists public.rak_admin_settings_backups (
  id uuid primary key default gen_random_uuid(),
  legacy_key text unique,
  snapshot jsonb not null,
  source text not null default 'manual',
  app_version text not null default '',
  row_count integer not null default 0,
  restored_backup_id uuid references public.rak_admin_settings_backups(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_by_account_id text not null,
  created_at timestamptz not null default now(),
  constraint rak_admin_settings_backups_snapshot_object
    check (jsonb_typeof(snapshot) = 'object'),
  constraint rak_admin_settings_backups_row_count_nonnegative
    check (row_count >= 0)
);
create index if not exists rak_admin_settings_backups_created_idx
  on public.rak_admin_settings_backups (created_at desc);
create table if not exists public.rak_rotation_backups_v2 (
  id uuid primary key default gen_random_uuid(),
  rotation_key text not null default 'main',
  payload jsonb not null,
  meta jsonb not null default '{}'::jsonb,
  revision bigint not null default 0,
  source text not null default 'save',
  month_key text not null default '',
  month_count integer not null default 0,
  daymod_count integer not null default 0,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_by_account_id text not null,
  replaced_at timestamptz not null default now(),
  constraint rak_rotation_backups_payload_object
    check (jsonb_typeof(payload) = 'object')
);
create index if not exists rak_rotation_backups_v2_replaced_idx
  on public.rak_rotation_backups_v2 (replaced_at desc);
alter table public.rak_admin_profiles enable row level security;
alter table public.rak_admin_devices enable row level security;
alter table public.rak_admin_audit_log enable row level security;
alter table public.rak_admin_settings_backups enable row level security;
alter table public.rak_rotation_backups_v2 enable row level security;
revoke all on table public.rak_admin_profiles from public, anon, authenticated;
revoke all on table public.rak_admin_devices from public, anon, authenticated;
revoke all on table public.rak_admin_audit_log from public, anon, authenticated;
revoke all on table public.rak_admin_settings_backups from public, anon, authenticated;
revoke all on table public.rak_rotation_backups_v2 from public, anon, authenticated;
grant select on table public.rak_admin_profiles to authenticated;
grant select on table public.rak_admin_devices to authenticated;
create or replace function private.rak_current_session_id()
returns uuid
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  value text := nullif(auth.jwt() ->> 'session_id', '');
begin
  if value is null or value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return null;
  end if;
  return value::uuid;
end;
$$;
create or replace function private.rak_current_admin_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select profile.role
  from public.rak_admin_profiles as profile
  where profile.user_id = (select auth.uid())
    and profile.enabled
    and exists (
      select 1
      from auth.sessions as session
      where session.id = private.rak_current_session_id()
        and session.user_id = profile.user_id
    )
    and not exists (
      select 1
      from public.rak_admin_devices as device
      where device.user_id = profile.user_id
        and device.session_id = private.rak_current_session_id()
        and device.revoked_at is not null
    )
  limit 1
$$;
create or replace function private.rak_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.rak_current_admin_role() in ('owner', 'admin'), false)
$$;
create or replace function private.rak_is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.rak_current_admin_role() = 'owner', false)
$$;
create or replace function private.rak_require_admin(p_owner_only boolean default false)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_owner_only and not private.rak_is_owner() then
    raise exception 'Owner permission required' using errcode = '42501';
  end if;
  if not p_owner_only and not private.rak_is_admin() then
    raise exception 'Administrator permission required' using errcode = '42501';
  end if;
end;
$$;
create or replace function private.rak_write_admin_audit(
  p_action text,
  p_target_type text default '',
  p_target_id text default '',
  p_details jsonb default '{}'::jsonb
)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.rak_admin_audit_log (
    user_id,
    account_id,
    session_id,
    action,
    target_type,
    target_id,
    details
  )
  select
    profile.user_id,
    profile.account_id,
    private.rak_current_session_id(),
    left(coalesce(p_action, ''), 120),
    left(coalesce(p_target_type, ''), 80),
    left(coalesce(p_target_id, ''), 160),
    coalesce(p_details, '{}'::jsonb)
  from public.rak_admin_profiles as profile
  where profile.user_id = (select auth.uid())
$$;
revoke all on function private.rak_current_session_id() from public, anon, authenticated;
revoke all on function private.rak_current_admin_role() from public, anon, authenticated;
revoke all on function private.rak_is_admin() from public, anon, authenticated;
revoke all on function private.rak_is_owner() from public, anon, authenticated;
revoke all on function private.rak_require_admin(boolean) from public, anon, authenticated;
revoke all on function private.rak_write_admin_audit(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function private.rak_is_owner() to authenticated;
drop policy if exists rak_admin_profiles_read_v2 on public.rak_admin_profiles;
create policy rak_admin_profiles_read_v2
on public.rak_admin_profiles
for select
to authenticated
using (user_id = (select auth.uid()) or private.rak_is_owner());
drop policy if exists rak_admin_devices_read_v2 on public.rak_admin_devices;
create policy rak_admin_devices_read_v2
on public.rak_admin_devices
for select
to authenticated
using (user_id = (select auth.uid()) or private.rak_is_owner());
create or replace function public.rak_admin_auth_capabilities()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'version', 2,
    'available', true,
    'enforced', false,
    'provider', 'supabase-auth'
  )
$$;
create or replace function public.rak_admin_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  profile public.rak_admin_profiles%rowtype;
begin
  perform private.rak_require_admin(false);
  select * into profile
  from public.rak_admin_profiles
  where user_id = (select auth.uid());
  return jsonb_build_object(
    'authenticated', true,
    'user_id', profile.user_id,
    'account_id', profile.account_id,
    'display_name', profile.display_name,
    'role', profile.role,
    'is_owner', profile.role = 'owner',
    'session_id', private.rak_current_session_id()
  );
end;
$$;
create or replace function public.rak_admin_account_requires_auth(p_account_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.rak_admin_profiles as profile
    where profile.account_id = trim(coalesce(p_account_id, ''))
      and profile.enabled
  )
$$;
create or replace function public.rak_admin_touch_device(
  p_device_id text,
  p_label text default 'Zařízení',
  p_app_version text default ''
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  profile public.rak_admin_profiles%rowtype;
  session_id uuid := private.rak_current_session_id();
  saved public.rak_admin_devices%rowtype;
begin
  perform private.rak_require_admin(false);
  if session_id is null then
    raise exception 'Missing authenticated session' using errcode = '42501';
  end if;
  if coalesce(length(trim(p_device_id)), 0) < 10 or length(trim(p_device_id)) > 96 then
    raise exception 'Invalid device id' using errcode = '22023';
  end if;
  select * into profile
  from public.rak_admin_profiles
  where user_id = (select auth.uid());

  insert into public.rak_admin_devices (
    user_id, session_id, device_id, label, app_version, last_seen_at, revoked_at, revoked_by
  ) values (
    profile.user_id,
    session_id,
    trim(p_device_id),
    left(coalesce(nullif(trim(p_label), ''), 'Zařízení'), 120),
    left(coalesce(p_app_version, ''), 40),
    now(),
    null,
    null
  )
  on conflict (user_id, device_id) do update set
    session_id = excluded.session_id,
    label = excluded.label,
    app_version = excluded.app_version,
    last_seen_at = excluded.last_seen_at,
    revoked_at = null,
    revoked_by = null
  returning * into saved;

  return jsonb_build_object(
    'ok', true,
    'device_id', saved.device_id,
    'last_seen_at', saved.last_seen_at
  );
end;
$$;
create or replace function public.rak_owner_list_admin_devices()
returns table (
  device_id text,
  account_id text,
  display_name text,
  label text,
  app_version text,
  created_at timestamptz,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  is_current boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.rak_require_admin(true);
  return query
  select
    device.device_id,
    profile.account_id,
    profile.display_name,
    device.label,
    device.app_version,
    device.created_at,
    device.last_seen_at,
    device.revoked_at,
    device.session_id = private.rak_current_session_id()
  from public.rak_admin_devices as device
  join public.rak_admin_profiles as profile on profile.user_id = device.user_id
  order by device.last_seen_at desc;
end;
$$;
create or replace function public.rak_owner_revoke_admin_device(p_device_id text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target public.rak_admin_devices%rowtype;
begin
  perform private.rak_require_admin(true);
  select * into target
  from public.rak_admin_devices
  where device_id = trim(p_device_id)
    and revoked_at is null
  order by last_seen_at desc
  limit 1
  for update;

  if target.id is null then
    return jsonb_build_object('ok', false, 'reason', 'missing-device');
  end if;

  update public.rak_admin_devices
  set revoked_at = now(), revoked_by = (select auth.uid())
  where id = target.id;

  perform private.rak_write_admin_audit(
    'admin.device.revoke',
    'admin_device',
    target.device_id,
    jsonb_build_object('target_user_id', target.user_id)
  );
  return jsonb_build_object('ok', true, 'device_id', target.device_id);
end;
$$;
create or replace function public.rak_owner_list_admin_profiles()
returns table (
  user_id uuid,
  account_id text,
  display_name text,
  role text,
  enabled boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.rak_require_admin(true);
  return query
  select
    profile.user_id,
    profile.account_id,
    profile.display_name,
    profile.role,
    profile.enabled,
    profile.created_at,
    profile.updated_at
  from public.rak_admin_profiles as profile
  order by (profile.role = 'owner') desc, profile.account_id;
end;
$$;
revoke all on function public.rak_admin_auth_capabilities() from public;
revoke all on function public.rak_admin_context() from public;
revoke all on function public.rak_admin_account_requires_auth(text) from public;
revoke all on function public.rak_admin_touch_device(text, text, text) from public;
revoke all on function public.rak_owner_list_admin_devices() from public;
revoke all on function public.rak_owner_revoke_admin_device(text) from public;
revoke all on function public.rak_owner_list_admin_profiles() from public;
grant execute on function public.rak_admin_auth_capabilities() to anon, authenticated;
grant execute on function public.rak_admin_context() to authenticated;
grant execute on function public.rak_admin_account_requires_auth(text) to anon, authenticated;
grant execute on function public.rak_admin_touch_device(text, text, text) to authenticated;
grant execute on function public.rak_owner_list_admin_devices() to authenticated;
grant execute on function public.rak_owner_revoke_admin_device(text) to authenticated;
grant execute on function public.rak_owner_list_admin_profiles() to authenticated;
-- Provision the owner profile automatically when the Auth user already exists.
-- The user should be created with email 9811@admin.rak.local or app metadata
-- {"rak_account_id":"9811"} before this migration is applied.
insert into public.rak_admin_profiles (
  user_id,
  account_id,
  display_name,
  role,
  enabled,
  created_by
)
select
  user_row.id,
  '9811',
  'Hlavní administrátor',
  'owner',
  true,
  user_row.id
from auth.users as user_row
where lower(coalesce(user_row.email, '')) = '9811@admin.rak.local'
   or user_row.raw_app_meta_data ->> 'rak_account_id' = '9811'
on conflict (account_id) do update set
  user_id = excluded.user_id,
  role = 'owner',
  enabled = true,
  updated_at = now();
