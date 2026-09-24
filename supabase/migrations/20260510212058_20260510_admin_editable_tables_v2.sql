create table if not exists public.machine_settings (
  id uuid primary key default gen_random_uuid(),
  machine_key text not null unique,
  label text not null,
  category text not null default 'general',
  speed numeric(10,2),
  settings_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.rotation_months (
  month_start date primary key,
  label text,
  updated_at timestamptz not null default now()
);

create table if not exists public.rotation_entries (
  id uuid primary key default gen_random_uuid(),
  month_start date not null references public.rotation_months(month_start) on delete cascade,
  employee_name text not null,
  target_machine text,
  assignment_type text not null default 'work',
  shift_code text,
  note text,
  row_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_rotation_entries_month_start on public.rotation_entries(month_start);
create index if not exists idx_rotation_entries_employee_name on public.rotation_entries(employee_name);
create index if not exists idx_rotation_entries_target_machine on public.rotation_entries(target_machine);

alter table public.machine_settings enable row level security;
alter table public.rotation_months enable row level security;
alter table public.rotation_entries enable row level security;

DO $$ BEGIN
  CREATE POLICY machine_settings_read_all ON public.machine_settings
    FOR SELECT TO anon, authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY rotation_months_read_all ON public.rotation_months
    FOR SELECT TO anon, authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY rotation_entries_read_all ON public.rotation_entries
    FOR SELECT TO anon, authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
;
