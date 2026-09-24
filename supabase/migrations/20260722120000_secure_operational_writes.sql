-- Remaining operational writes and bounded backup retention.

create or replace function public.rak_admin_save_announcement_v2(
  p_title text,
  p_message text,
  p_is_active boolean default true,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_marquee boolean default false,
  p_app_version text default ''
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  saved public.announcements%rowtype;
begin
  perform private.rak_require_admin(false);
  if coalesce(length(trim(p_message)), 0) = 0 or length(p_message) > 4000 then
    raise exception 'Invalid announcement message' using errcode = '22023';
  end if;
  if p_starts_at is not null and p_ends_at is not null and p_ends_at <= p_starts_at then
    raise exception 'Announcement end must be after start' using errcode = '22023';
  end if;
  if coalesce(p_is_active, false) then
    update public.announcements
    set is_active = false, updated_at = now()
    where is_active = true;
  end if;
  insert into public.announcements (
    title, message, is_active, starts_at, ends_at, marquee,
    updated_at, updated_by, app_version, priority
  ) values (
    nullif(left(trim(coalesce(p_title, '')), 240), ''),
    trim(p_message),
    coalesce(p_is_active, true),
    p_starts_at,
    p_ends_at,
    coalesce(p_marquee, false),
    now(),
    (select account_id from public.rak_admin_profiles where user_id = (select auth.uid())),
    left(coalesce(p_app_version, ''), 80),
    0
  ) returning * into saved;
  perform private.rak_write_admin_audit('announcement.save', 'announcement', saved.id::text, jsonb_build_object('active', saved.is_active));
  return to_jsonb(saved);
end;
$$;
create or replace function public.rak_admin_clear_announcement_v2()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  changed integer;
begin
  perform private.rak_require_admin(false);
  update public.announcements set is_active = false, updated_at = now() where is_active = true;
  get diagnostics changed = row_count;
  perform private.rak_write_admin_audit('announcement.clear', 'announcement', '', jsonb_build_object('changed', changed));
  return jsonb_build_object('ok', true, 'count', changed);
end;
$$;
create or replace function public.rak_admin_save_rotation_month_entries_v2(
  p_month_start date,
  p_label text,
  p_rows jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  item jsonb;
  inserted integer := 0;
begin
  perform private.rak_require_admin(false);
  if p_month_start is null or jsonb_typeof(p_rows) <> 'array'
     or jsonb_array_length(p_rows) > 1000 or octet_length(p_rows::text) > 2000000 then
    raise exception 'Invalid rotation month entries' using errcode = '22023';
  end if;
  insert into public.rotation_months (month_start, label, updated_at)
  values (p_month_start, nullif(left(trim(coalesce(p_label, '')), 160), ''), now())
  on conflict (month_start) do update set label = excluded.label, updated_at = excluded.updated_at;
  delete from public.rotation_entries where month_start = p_month_start;
  for item in select value from jsonb_array_elements(p_rows)
  loop
    if jsonb_typeof(item) <> 'object' then
      raise exception 'Invalid rotation month row' using errcode = '22023';
    end if;
    insert into public.rotation_entries (
      month_start, employee_name, target_machine, assignment_type,
      shift_code, note, row_order
    ) values (
      p_month_start,
      left(trim(coalesce(item ->> 'employee_name', '')), 160),
      nullif(left(trim(coalesce(item ->> 'target_machine', '')), 160), ''),
      left(coalesce(nullif(trim(item ->> 'assignment_type'), ''), 'work'), 80),
      nullif(left(trim(coalesce(item ->> 'shift_code', '')), 40), ''),
      nullif(left(trim(coalesce(item ->> 'note', '')), 1000), ''),
      case when coalesce(item ->> 'row_order', '') ~ '^-?[0-9]{1,6}$' then (item ->> 'row_order')::integer else inserted end
    );
    inserted := inserted + 1;
  end loop;
  perform private.rak_write_admin_audit(
    'rotation.month_entries.save', 'rotation_month', p_month_start::text,
    jsonb_build_object('inserted', inserted)
  );
  return jsonb_build_object('ok', true, 'inserted', inserted, 'month_start', p_month_start);
end;
$$;
create or replace function public.rak_admin_cleanup_expired_game_invites_v2()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform private.rak_require_admin(false);
  perform public.rak_admin_cleanup_expired_game_invites();
  perform private.rak_write_admin_audit('games.cleanup_expired_invites', 'game_invites', '', '{}'::jsonb);
  return jsonb_build_object('ok', true, 'at', now());
end;
$$;
create or replace function public.rak_submit_gomoku_win_v2(
  p_player_name text,
  p_difficulty text,
  p_moves integer,
  p_app_version text,
  p_created_at timestamptz,
  p_elapsed_ms integer,
  p_elapsed_text text,
  p_x_moves integer,
  p_o_moves integer,
  p_ruleset_version text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  saved public.gomoku_wins%rowtype;
  safe_name text := left(trim(coalesce(p_player_name, '')), 160);
  safe_ruleset text := left(trim(coalesce(p_ruleset_version, '')), 160);
begin
  if length(safe_name) < 2 or length(safe_ruleset) < 3
     or coalesce(p_moves, 0) < 1 or p_moves > 1000
     or coalesce(p_elapsed_ms, 0) < 0 or p_elapsed_ms > 86400000
     or coalesce(p_x_moves, 0) < 0 or p_x_moves > 1000
     or coalesce(p_o_moves, 0) < 0 or p_o_moves > 1000 then
    raise exception 'Invalid gomoku result' using errcode = '22023';
  end if;
  if (
    select count(*) from public.gomoku_wins
    where player_name = safe_name
      and ruleset_version = safe_ruleset
      and created_at >= now() - interval '1 hour'
  ) >= 20 then
    raise exception 'Too many game results' using errcode = 'P0001';
  end if;
  insert into public.gomoku_wins (
    player_name, difficulty, moves, app_version, created_at, elapsed_ms,
    elapsed_text, x_moves, o_moves, ruleset_version
  ) values (
    safe_name,
    left(trim(coalesce(p_difficulty, '')), 80),
    p_moves,
    left(coalesce(p_app_version, ''), 80),
    coalesce(p_created_at, now()),
    p_elapsed_ms,
    left(coalesce(p_elapsed_text, ''), 80),
    p_x_moves,
    p_o_moves,
    safe_ruleset
  ) returning * into saved;
  return to_jsonb(saved);
end;
$$;
create or replace function private.rak_prune_rotation_backups_v2()
returns trigger
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  delete from public.rak_rotation_backups_v2
  where id in (
    select id from public.rak_rotation_backups_v2
    order by replaced_at desc offset 150
  );
  return new;
end;
$$;
create or replace function private.rak_prune_settings_backups_v2()
returns trigger
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  delete from public.rak_admin_settings_backups
  where id in (
    select id from public.rak_admin_settings_backups
    order by created_at desc offset 100
  );
  return new;
end;
$$;
drop trigger if exists rak_prune_rotation_backups_v2 on public.rak_rotation_backups_v2;
create trigger rak_prune_rotation_backups_v2
after insert on public.rak_rotation_backups_v2
for each statement execute function private.rak_prune_rotation_backups_v2();
drop trigger if exists rak_prune_settings_backups_v2 on public.rak_admin_settings_backups;
create trigger rak_prune_settings_backups_v2
after insert on public.rak_admin_settings_backups
for each statement execute function private.rak_prune_settings_backups_v2();
revoke all on function public.rak_admin_save_announcement_v2(text, text, boolean, timestamptz, timestamptz, boolean, text) from public;
revoke all on function public.rak_admin_clear_announcement_v2() from public;
revoke all on function public.rak_admin_save_rotation_month_entries_v2(date, text, jsonb) from public;
revoke all on function public.rak_admin_cleanup_expired_game_invites_v2() from public;
revoke all on function public.rak_submit_gomoku_win_v2(text, text, integer, text, timestamptz, integer, text, integer, integer, text) from public;
revoke all on function private.rak_prune_rotation_backups_v2() from public, anon, authenticated;
revoke all on function private.rak_prune_settings_backups_v2() from public, anon, authenticated;
grant execute on function public.rak_admin_save_announcement_v2(text, text, boolean, timestamptz, timestamptz, boolean, text) to authenticated;
grant execute on function public.rak_admin_clear_announcement_v2() to authenticated;
grant execute on function public.rak_admin_save_rotation_month_entries_v2(date, text, jsonb) to authenticated;
grant execute on function public.rak_admin_cleanup_expired_game_invites_v2() to authenticated;
grant execute on function public.rak_submit_gomoku_win_v2(text, text, integer, text, timestamptz, integer, text, integer, integer, text) to anon, authenticated;
