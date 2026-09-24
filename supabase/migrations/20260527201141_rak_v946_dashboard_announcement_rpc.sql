alter table public.announcements
  alter column title drop not null;

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

create or replace function public.rak_clear_dashboard_announcement(
  p_updated_by text default null,
  p_app_version text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  update public.announcements
     set is_active = false,
         updated_by = p_updated_by,
         app_version = p_app_version,
         updated_at = now()
   where is_active = true;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.rak_save_dashboard_announcement(text, text, boolean, timestamptz, timestamptz, boolean, text, text, integer) to anon;
grant execute on function public.rak_clear_dashboard_announcement(text, text) to anon;

notify pgrst, 'reload schema';;
