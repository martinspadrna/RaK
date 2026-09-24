create table if not exists public.rak_admin_secrets (
  key text primary key,
  secret_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.rak_admin_secrets enable row level security;
revoke all on table public.rak_admin_secrets from anon, authenticated, public;

insert into public.rak_admin_secrets(key, secret_hash, updated_at)
values ('admin_pin', encode(extensions.digest('772326', 'sha256'), 'hex'), now())
on conflict (key) do update
set secret_hash = excluded.secret_hash,
    updated_at = now();

create table if not exists public.rotation_state_backups (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  payload jsonb,
  meta jsonb,
  previous_updated_at timestamptz,
  replaced_at timestamptz not null default now(),
  replaced_by_meta jsonb not null default '{}'::jsonb
);

alter table public.rotation_state_backups enable row level security;
revoke all on table public.rotation_state_backups from anon, authenticated, public;
create index if not exists rotation_state_backups_replaced_at_idx on public.rotation_state_backups(replaced_at desc);
create index if not exists rotation_state_backups_key_replaced_at_idx on public.rotation_state_backups(key, replaced_at desc);

create table if not exists public.machine_settings_backups (
  id uuid primary key default gen_random_uuid(),
  rows jsonb not null default '[]'::jsonb,
  saved_count integer not null default 0,
  previous_updated_at timestamptz,
  replaced_at timestamptz not null default now(),
  replaced_by_meta jsonb not null default '{}'::jsonb
);

alter table public.machine_settings_backups enable row level security;
revoke all on table public.machine_settings_backups from anon, authenticated, public;
create index if not exists machine_settings_backups_replaced_at_idx on public.machine_settings_backups(replaced_at desc);

create or replace function public.rak_verify_admin_pin(p_admin_pin text)
returns boolean
language sql
security definer
set search_path to public, extensions
as $$
  select exists (
    select 1
    from public.rak_admin_secrets s
    where s.key = 'admin_pin'
      and s.secret_hash = encode(extensions.digest(coalesce(p_admin_pin, ''), 'sha256'), 'hex')
  );
$$;

revoke all on function public.rak_verify_admin_pin(text) from anon, authenticated, public;

create or replace function public.rak_admin_save_rotation_state(
  p_key text,
  p_payload jsonb,
  p_meta jsonb default '{}'::jsonb,
  p_admin_pin text default null
)
returns public.rotation_state
language plpgsql
security definer
set search_path to public, extensions
as $$
declare
  v_row public.rotation_state;
  v_existing public.rotation_state;
begin
  if not public.rak_verify_admin_pin(p_admin_pin) then
    raise exception 'RAK_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if p_key is null or trim(p_key) <> 'main' then
    raise exception 'invalid rotation_state key';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invalid rotation_state payload';
  end if;

  if pg_column_size(p_payload) > 2500000 then
    raise exception 'rotation_state payload too large';
  end if;

  select * into v_existing
  from public.rotation_state
  where key = 'main'
  limit 1;

  if found and (v_existing.payload is distinct from p_payload or v_existing.meta is distinct from coalesce(p_meta, '{}'::jsonb)) then
    insert into public.rotation_state_backups(key, payload, meta, previous_updated_at, replaced_by_meta)
    values ('main', v_existing.payload, v_existing.meta, v_existing.updated_at, coalesce(p_meta, '{}'::jsonb));
  end if;

  delete from public.rotation_state_backups
  where replaced_at < now() - interval '180 days';

  insert into public.rotation_state(key, payload, meta, updated_at)
  values ('main', p_payload, coalesce(p_meta, '{}'::jsonb), now())
  on conflict (key)
  do update set
    payload = excluded.payload,
    meta = excluded.meta,
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.rak_admin_save_rotation_state(text, jsonb, jsonb, text) from public;
grant execute on function public.rak_admin_save_rotation_state(text, jsonb, jsonb, text) to anon, authenticated;

create or replace function public.rak_admin_save_machine_settings(
  p_rows jsonb,
  p_admin_pin text default null
)
returns jsonb
language plpgsql
security definer
set search_path to public, extensions
as $$
declare
  item jsonb;
  saved_count integer := 0;
  v_machine_key text;
  v_category text;
  v_label text;
  v_previous_rows jsonb := '[]'::jsonb;
  v_previous_updated_at timestamptz;
begin
  if not public.rak_verify_admin_pin(p_admin_pin) then
    raise exception 'RAK_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'machine_settings payload must be an array';
  end if;

  if jsonb_array_length(p_rows) > 120 then
    raise exception 'too many machine_settings rows';
  end if;

  select coalesce(jsonb_agg(to_jsonb(ms) order by ms.machine_key), '[]'::jsonb), max(ms.updated_at)
  into v_previous_rows, v_previous_updated_at
  from public.machine_settings ms;

  if jsonb_array_length(v_previous_rows) > 0 then
    insert into public.machine_settings_backups(rows, saved_count, previous_updated_at, replaced_by_meta)
    values (v_previous_rows, jsonb_array_length(v_previous_rows), v_previous_updated_at, jsonb_build_object('source', 'admin-machine-settings'));
  end if;

  delete from public.machine_settings_backups
  where replaced_at < now() - interval '180 days';

  for item in select value from jsonb_array_elements(p_rows)
  loop
    if jsonb_typeof(item) <> 'object' then
      raise exception 'invalid machine_settings row';
    end if;

    v_machine_key := trim(coalesce(item->>'machine_key', ''));
    v_category := trim(coalesce(item->>'category', ''));
    v_label := trim(coalesce(item->>'label', ''));

    if v_machine_key = '' or length(v_machine_key) > 120 then
      raise exception 'invalid machine_key';
    end if;
    if v_category not in ('brus', 'frezka', 'pracka', 'fhb_target', 'food_schedule') then
      raise exception 'invalid category';
    end if;
    if v_label = '' or length(v_label) > 160 then
      raise exception 'invalid label';
    end if;
    if pg_column_size(coalesce(item->'settings_json', '{}'::jsonb)) > 24000 then
      raise exception 'settings_json too large';
    end if;

    insert into public.machine_settings(
      machine_key,
      machine_code,
      machine_index,
      label,
      category,
      speed,
      cycle_time,
      dress_time,
      dress_count,
      settings_json,
      updated_at
    )
    values (
      v_machine_key,
      nullif(trim(coalesce(item->>'machine_code', '')), ''),
      nullif(trim(coalesce(item->>'machine_index', '')), ''),
      v_label,
      v_category,
      nullif(item->>'speed', '')::numeric,
      nullif(item->>'cycle_time', '')::numeric,
      nullif(item->>'dress_time', '')::numeric,
      nullif(item->>'dress_count', '')::integer,
      coalesce(item->'settings_json', '{}'::jsonb),
      now()
    )
    on conflict (machine_key)
    do update set
      machine_code = excluded.machine_code,
      machine_index = excluded.machine_index,
      label = excluded.label,
      category = excluded.category,
      speed = excluded.speed,
      cycle_time = excluded.cycle_time,
      dress_time = excluded.dress_time,
      dress_count = excluded.dress_count,
      settings_json = excluded.settings_json,
      updated_at = now();

    saved_count := saved_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'saved_count', saved_count);
end;
$$;

revoke all on function public.rak_admin_save_machine_settings(jsonb, text) from public;
grant execute on function public.rak_admin_save_machine_settings(jsonb, text) to anon, authenticated;

revoke execute on function public.rak_save_rotation_state(text, jsonb, jsonb) from anon, authenticated, public;
revoke execute on function public.rak_save_machine_settings(jsonb) from anon, authenticated, public;

drop policy if exists "rak_rotation_state_insert_anon" on public.rotation_state;
drop policy if exists "rak_rotation_state_update_anon" on public.rotation_state;
drop policy if exists "rotation_state_authenticated_write_v411" on public.rotation_state;
drop policy if exists "machine_settings_anon_update_v624" on public.machine_settings;
drop policy if exists "machine_settings_anon_write_v622" on public.machine_settings;
drop policy if exists "machine_settings_anon_write_v624" on public.machine_settings;
drop policy if exists "machine_settings_authenticated_write_v411" on public.machine_settings;
drop policy if exists "rotation_months_authenticated_write_v411" on public.rotation_months;
drop policy if exists "rotation_entries_authenticated_write_v411" on public.rotation_entries;

revoke insert, update, delete on table public.rotation_state from anon, authenticated;
revoke insert, update, delete on table public.machine_settings from anon, authenticated;
revoke insert, update, delete on table public.rotation_months from anon, authenticated;
revoke insert, update, delete on table public.rotation_entries from anon, authenticated;
;
