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
  handled_note text,
  constraint bug_reports_type_check check (report_type in ('chyba','nelibi','napad','vykon','hra','ostatni')),
  constraint bug_reports_message_len_check check (char_length(trim(message)) between 3 and 4000),
  constraint bug_reports_status_check check (status in ('new','seen','done','ignored'))
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
with check (
  char_length(trim(message)) between 3 and 4000
  and report_type in ('chyba','nelibi','napad','vykon','hra','ostatni')
);

drop policy if exists "Bug reports are readable by service role only" on public.bug_reports;
-- No public SELECT policy on purpose: reports are submitted by users, not browsed by users.
-- Service role bypasses RLS for admin/export/automation.
;
