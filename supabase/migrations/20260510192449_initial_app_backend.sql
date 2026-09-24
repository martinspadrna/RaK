create extension if not exists pgcrypto;

create table if not exists public.gomoku_wins (
  id uuid primary key default gen_random_uuid(),
  player_name text not null,
  difficulty text not null,
  moves integer not null,
  app_version text,
  created_at timestamp with time zone default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

create table if not exists public.canteen_status (
  id uuid primary key default gen_random_uuid(),
  is_open boolean default true,
  note text,
  updated_at timestamp with time zone default now()
);

alter table public.gomoku_wins enable row level security;
alter table public.announcements enable row level security;
alter table public.canteen_status enable row level security;

create policy "allow_insert_gomoku_wins"
on public.gomoku_wins
for insert
to anon
with check (true);

create policy "allow_read_gomoku_wins"
on public.gomoku_wins
for select
to anon
using (true);

create policy "allow_read_announcements"
on public.announcements
for select
to anon
using (true);

create policy "allow_read_canteen_status"
on public.canteen_status
for select
to anon
using (true);

insert into public.canteen_status (is_open, note)
values (true, 'Kantýna otevřena')
on conflict do nothing;

insert into public.announcements (title, message)
values ('Vítej', 'Supabase backend je aktivní.')
on conflict do nothing;;
