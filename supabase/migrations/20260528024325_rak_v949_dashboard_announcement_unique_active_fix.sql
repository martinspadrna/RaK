drop index if exists announcements_singleton_active_idx;

update public.announcements a
set is_active = false,
    updated_at = now()
where a.is_active = true
  and a.id <> (
    select id
    from public.announcements
    where is_active = true
    order by priority desc, updated_at desc, created_at desc
    limit 1
  );

create unique index if not exists announcements_singleton_active_idx
on public.announcements ((true))
where is_active = true;

create or replace function public.rak_save_dashboard_announcement(
  p_title text,
  p_message text,
  p_is_active boolean default true,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_marquee boolean default true,
  p_updated_by text default null,
  p_app_version text default null,
  p_priority integer default 0
)
returns public.announcements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.announcements;
  v_title text := nullif(trim(coalesce(p_title, '')), '');
  v_message text := trim(coalesce(p_message, ''));
begin
  if char_length(v_message) < 1 or char_length(v_message) > 600 then
    raise exception 'announcement message must be 1..600 characters';
  end if;
  if char_length(coalesce(v_title, '')) > 120 then
    raise exception 'announcement title must be at most 120 characters';
  end if;

  update public.announcements
     set is_active = false,
         updated_at = now()
   where is_active = true;

  insert into public.announcements(title, message, is_active, starts_at, ends_at, marquee, updated_by, app_version, priority)
  values(v_title, v_message, coalesce(p_is_active, true), p_starts_at, p_ends_at, coalesce(p_marquee, true), p_updated_by, p_app_version, coalesce(p_priority, 0))
  returning * into v_row;

  return v_row;
end;
$$;

notify pgrst, 'reload schema';;
