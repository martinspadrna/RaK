-- Admin audit, reports and service data. Public users keep the ability to send
-- a report, but only authenticated administrators may read or modify reports.

create or replace function public.rak_admin_write_audit_v2(
  p_area text,
  p_summary text,
  p_target_type text default '',
  p_target_id text default ''
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform private.rak_require_admin(false);
  if coalesce(length(trim(p_area)), 0) = 0 or coalesce(length(trim(p_summary)), 0) = 0 then
    raise exception 'Audit area and summary are required' using errcode = '22023';
  end if;
  perform private.rak_write_admin_audit(
    'admin.change',
    left(coalesce(nullif(trim(p_target_type), ''), 'admin_setting'), 80),
    left(coalesce(p_target_id, ''), 160),
    jsonb_build_object(
      'area', left(trim(p_area), 160),
      'summary', left(trim(p_summary), 1000)
    )
  );
  return jsonb_build_object('ok', true, 'created_at', now());
end;
$$;
create or replace function public.rak_admin_list_audit_v2(p_limit integer default 100)
returns table (
  id bigint,
  account_id text,
  action text,
  target_type text,
  target_id text,
  details jsonb,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.rak_require_admin(false);
  return query
  select log.id, log.account_id, log.action, log.target_type, log.target_id, log.details, log.created_at
  from public.rak_admin_audit_log as log
  order by log.created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 300));
end;
$$;
create or replace function public.rak_submit_bug_report_v2(
  p_account_number text,
  p_player_name text,
  p_report_type text,
  p_message text,
  p_app_version text default null,
  p_route text default null,
  p_user_agent text default null,
  p_device_info jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
  safe_account text := nullif(left(trim(coalesce(p_account_number, '')), 80), '');
  safe_source text := nullif(left(trim(coalesce(p_device_info ->> 'sourceId', '')), 120), '');
begin
  if coalesce(length(trim(p_message)), 0) < 3 or length(p_message) > 4000 then
    raise exception 'Invalid report message' using errcode = '22023';
  end if;
  if coalesce(p_report_type, '') not in ('chyba', 'napad', 'nelibi', 'vykon', 'hra', 'ostatni') then
    raise exception 'Invalid report type' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_device_info, '{}'::jsonb)) <> 'object'
     or octet_length(coalesce(p_device_info, '{}'::jsonb)::text) > 12000 then
    raise exception 'Invalid device info' using errcode = '22023';
  end if;
  if safe_source is not null and exists (
    select 1 from public.bug_reports
    where created_at >= now() - interval '10 minutes'
      and device_info ->> 'sourceId' = safe_source
  ) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;
  if safe_account is not null and (
    select count(*) from public.bug_reports
    where created_at >= now() - interval '1 hour'
      and account_number = safe_account
  ) >= 8 then
    raise exception 'Too many reports' using errcode = 'P0001';
  end if;
  insert into public.bug_reports (
    account_number, player_name, report_type, message, app_version, route,
    user_agent, device_info, status
  ) values (
    safe_account,
    nullif(left(trim(coalesce(p_player_name, '')), 160), ''),
    p_report_type,
    trim(p_message),
    nullif(left(trim(coalesce(p_app_version, '')), 80), ''),
    nullif(left(trim(coalesce(p_route, '')), 300), ''),
    nullif(left(coalesce(p_user_agent, ''), 1000), ''),
    coalesce(p_device_info, '{}'::jsonb),
    'new'
  ) returning id into saved_id;
  return jsonb_build_object('ok', true, 'id', saved_id);
end;
$$;
create or replace function public.rak_admin_list_bug_reports_v2(
  p_status text default 'all',
  p_limit integer default 40
)
returns setof public.bug_reports
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.rak_require_admin(false);
  return query
  select report.*
  from public.bug_reports as report
  where coalesce(report.handled_note, '') <> '__rak_deleted__'
    and (coalesce(nullif(trim(p_status), ''), 'all') = 'all' or report.status = p_status)
  order by report.created_at desc
  limit greatest(1, least(coalesce(p_limit, 40), 80));
end;
$$;
create or replace function public.rak_admin_update_bug_report_v2(
  p_id uuid,
  p_status text,
  p_note text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  saved public.bug_reports%rowtype;
begin
  perform private.rak_require_admin(false);
  if p_status not in ('new', 'seen', 'done', 'ignored') then
    raise exception 'Invalid report status' using errcode = '22023';
  end if;
  update public.bug_reports
  set status = p_status,
      handled_at = case when p_status = 'new' then null else now() end,
      handled_note = nullif(left(coalesce(p_note, ''), 600), '')
  where id = p_id
  returning * into saved;
  if saved.id is null then
    raise exception 'Report not found' using errcode = 'P0002';
  end if;
  perform private.rak_write_admin_audit(
    'report.status', 'bug_report', saved.id::text,
    jsonb_build_object('status', saved.status)
  );
  return jsonb_build_object(
    'ok', true, 'id', saved.id, 'status', saved.status,
    'handled_at', saved.handled_at, 'handled_note', saved.handled_note
  );
end;
$$;
create or replace function public.rak_admin_delete_bug_report_v2(p_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  saved public.bug_reports%rowtype;
begin
  perform private.rak_require_admin(false);
  update public.bug_reports
  set status = 'ignored', handled_at = now(), handled_note = '__rak_deleted__'
  where id = p_id
  returning * into saved;
  if saved.id is null then
    raise exception 'Report not found' using errcode = 'P0002';
  end if;
  perform private.rak_write_admin_audit('report.delete', 'bug_report', saved.id::text, '{}'::jsonb);
  return jsonb_build_object('ok', true, 'id', saved.id, 'soft_deleted', true);
end;
$$;
create or replace function public.rak_admin_service_snapshot_v2()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.rak_require_admin(false);
  return jsonb_build_object(
    'ok', true,
    'at', now(),
    'counts', jsonb_build_object(
      'game_accounts', (select count(*) from public.game_accounts),
      'game_stats', (select count(*) from public.game_stats),
      'game_invites', (select count(*) from public.game_invites),
      'game_invites_pending', (select count(*) from public.game_invites where status = 'pending'),
      'game_sessions', (select count(*) from public.game_sessions),
      'game_sessions_active', (select count(*) from public.game_sessions where status in ('active', 'waiting', 'placing')),
      'bug_reports_new', (select count(*) from public.bug_reports where status = 'new'),
      'app_usage_devices', (select count(*) from public.app_usage_devices),
      'app_usage_events_24h', (select count(*) from public.app_usage_events where seen_at >= now() - interval '24 hours'),
      'profile_ui_settings', (select count(*) from public.game_stats where game_type = '__profile_ui')
    )
  );
end;
$$;
create or replace function public.rak_admin_usage_presence_v2(p_limit integer default 80)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  rows jsonb;
begin
  perform private.rak_require_admin(false);
  select coalesce(jsonb_agg(to_jsonb(item)), '[]'::jsonb)
  into rows
  from public.rak_usage_presence_admin(greatest(1, least(coalesce(p_limit, 80), 200))) as item;
  return rows;
end;
$$;
revoke all on function public.rak_admin_write_audit_v2(text, text, text, text) from public;
revoke all on function public.rak_admin_list_audit_v2(integer) from public;
revoke all on function public.rak_submit_bug_report_v2(text, text, text, text, text, text, text, jsonb) from public;
revoke all on function public.rak_admin_list_bug_reports_v2(text, integer) from public;
revoke all on function public.rak_admin_update_bug_report_v2(uuid, text, text) from public;
revoke all on function public.rak_admin_delete_bug_report_v2(uuid) from public;
revoke all on function public.rak_admin_service_snapshot_v2() from public;
revoke all on function public.rak_admin_usage_presence_v2(integer) from public;
grant execute on function public.rak_submit_bug_report_v2(text, text, text, text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.rak_admin_write_audit_v2(text, text, text, text) to authenticated;
grant execute on function public.rak_admin_list_audit_v2(integer) to authenticated;
grant execute on function public.rak_admin_list_bug_reports_v2(text, integer) to authenticated;
grant execute on function public.rak_admin_update_bug_report_v2(uuid, text, text) to authenticated;
grant execute on function public.rak_admin_delete_bug_report_v2(uuid) to authenticated;
grant execute on function public.rak_admin_service_snapshot_v2() to authenticated;
grant execute on function public.rak_admin_usage_presence_v2(integer) to authenticated;
alter table public.bug_reports enable row level security;
revoke select, insert, update, delete on table public.bug_reports from anon, authenticated;
revoke execute on function public.rak_usage_presence_admin(integer) from anon;
