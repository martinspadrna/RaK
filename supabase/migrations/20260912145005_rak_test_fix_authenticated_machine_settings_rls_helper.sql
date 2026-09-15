-- Test/staging only: authenticated reads of machine_settings use the
-- private.rak_is_admin() helper inside the RLS policy. The hardening cutover
-- revoked EXECUTE too aggressively, so signed-in admins could hit
-- "permission denied for function rak_is_admin" even though direct writes
-- remained correctly blocked. Restore only the single helper permission
-- needed by the authenticated read policy.
grant execute on function private.rak_is_admin() to authenticated;
