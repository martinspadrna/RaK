-- RaK v1.5(828): verification checkpoint for bug_reports RPC scaffold.
-- No data change. Keeps existing bug_reports policies for compatibility.
comment on function public.rak_submit_bug_report(text, jsonb) is 'RaK v828: constrained RPC scaffold for bug report submission. Existing public bug_reports policies kept until admin review path is validated.';
comment on table public.bug_reports is 'RaK v828: bug_reports submit RPC available; public SELECT/UPDATE still kept until a safe admin review path is validated.';;
