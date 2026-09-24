-- RaK v1.5(828) / Faze 2E-K-B: non-breaking bug_reports RPC scaffold.
-- Existing SELECT/UPDATE/INSERT policies stay unchanged for compatibility in this migration.
-- Existing data is not modified.

create or replace function public.rak_submit_bug_report(
  p_message text,
  p_context jsonb default '{}'::jsonb
)
returns public.bug_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.bug_reports;
  v_message text;
  v_context jsonb;
begin
  v_message := trim(coalesce(p_message, ''));
  v_context := coalesce(p_context, '{}'::jsonb);

  if length(v_message) < 3 or length(v_message) > 4000 then
    raise exception 'invalid bug report message';
  end if;
  if jsonb_typeof(v_context) <> 'object' then
    raise exception 'invalid bug report context';
  end if;
  if pg_column_size(v_context) > 120000 then
    raise exception 'bug report context too large';
  end if;

  insert into public.bug_reports(message, status, context, created_at, updated_at)
  values (v_message, 'new', v_context, now(), now())
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.rak_submit_bug_report(text, jsonb) to anon, authenticated;

comment on function public.rak_submit_bug_report(text, jsonb) is 'RaK v828: constrained RPC scaffold for bug report submission. Direct bug_reports policies stay temporarily for compatibility until admin review path is validated.';
comment on table public.bug_reports is 'RaK v828: submit RPC available; public SELECT/UPDATE still kept until a non-client-trusted admin review path exists.';;
