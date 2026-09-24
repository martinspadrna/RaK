create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  account_number text references public.game_accounts(account_number) on update cascade on delete set null,
  player_name text,
  report_type text not null default 'chyba',
  message text not null,
  app_version text,
  route text,
  user_agent text,
  device_info jsonb not null default '{}'::jsonb,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  handled_at timestamptz,
  handled_note text
);

alter table public.bug_reports enable row level security;
create index if not exists bug_reports_created_at_idx on public.bug_reports (created_at desc);
create index if not exists bug_reports_status_idx on public.bug_reports (status, created_at desc);
create index if not exists bug_reports_account_number_idx on public.bug_reports (account_number, created_at desc);

drop policy if exists "Bug reports can be inserted from app" on public.bug_reports;
create policy "Bug reports can be inserted from app"
on public.bug_reports
for insert
to anon, authenticated
with check (char_length(trim(message)) between 3 and 4000);

drop policy if exists "Bug reports can be updated from app" on public.bug_reports;
create policy "Bug reports can be updated from app"
on public.bug_reports
for update
to anon, authenticated
using (status in ('new','seen','done','ignored'))
with check (status in ('new','seen','done','ignored'));

drop policy if exists "Bug reports can be read from app" on public.bug_reports;
create policy "Bug reports can be read from app"
on public.bug_reports
for select
to anon, authenticated
using (true);
;
