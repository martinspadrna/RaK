alter table public.announcements
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists marquee boolean not null default true,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by text,
  add column if not exists app_version text,
  add column if not exists priority integer not null default 0;

create or replace function public.rak_touch_announcements_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rak_announcements_updated_at on public.announcements;
create trigger rak_announcements_updated_at
before update on public.announcements
for each row
execute function public.rak_touch_announcements_updated_at();

create unique index if not exists announcements_singleton_active_idx
on public.announcements ((true))
where is_active = true;

drop policy if exists allow_read_announcements on public.announcements;
create policy allow_read_announcements
on public.announcements
for select
to anon
using (true);

drop policy if exists allow_insert_announcements on public.announcements;
create policy allow_insert_announcements
on public.announcements
for insert
to anon
with check (
  char_length(trim(coalesce(message, ''))) between 1 and 600
  and char_length(trim(coalesce(title, ''))) <= 120
);

drop policy if exists allow_update_announcements on public.announcements;
create policy allow_update_announcements
on public.announcements
for update
to anon
using (true)
with check (
  char_length(trim(coalesce(message, ''))) between 0 and 600
  and char_length(trim(coalesce(title, ''))) <= 120
);

drop policy if exists allow_delete_announcements on public.announcements;
create policy allow_delete_announcements
on public.announcements
for delete
to anon
using (true);

notify pgrst, 'reload schema';;
