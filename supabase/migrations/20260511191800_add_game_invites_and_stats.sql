create table if not exists public.game_accounts (
  account_number text primary key,
  full_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_invites (
  id uuid primary key default gen_random_uuid(),
  game_type text not null default 'gomoku',
  inviter_account_number text not null references public.game_accounts(account_number) on delete restrict,
  invitee_account_number text references public.game_accounts(account_number) on delete set null,
  invite_code text not null unique,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  expires_at timestamptz,
  payload jsonb not null default '{}'::jsonb
);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  game_type text not null default 'gomoku',
  invite_id uuid references public.game_invites(id) on delete set null,
  player_x_account_number text references public.game_accounts(account_number) on delete set null,
  player_o_account_number text references public.game_accounts(account_number) on delete set null,
  winner_account_number text references public.game_accounts(account_number) on delete set null,
  status text not null default 'active',
  board_state jsonb not null default '{}'::jsonb,
  move_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.game_stats (
  id uuid primary key default gen_random_uuid(),
  account_number text not null references public.game_accounts(account_number) on delete cascade,
  game_type text not null,
  games_played integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  draws integer not null default 0,
  points integer not null default 0,
  last_played_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (account_number, game_type)
);

create index if not exists game_invites_code_idx on public.game_invites(invite_code);
create index if not exists game_invites_status_idx on public.game_invites(status);
create index if not exists game_sessions_status_idx on public.game_sessions(status);
create index if not exists game_stats_account_idx on public.game_stats(account_number);

insert into public.game_accounts (account_number, full_name)
values
  ('1883', 'Střížek Jan'),
  ('2652', 'Kmínek Michal'),
  ('2202', 'Novotný Miroslav'),
  ('2602', 'Třasák Marek'),
  ('9811', 'Špadrna Martin'),
  ('1496', 'Kříž Pavel'),
  ('4789', 'Synek Jan'),
  ('3037', 'Pech Lukáš'),
  ('3808', 'Starý Pavel'),
  ('6235', 'Blažek Ladislav')
on conflict (account_number) do update
set full_name = excluded.full_name,
    updated_at = now();;
