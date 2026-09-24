-- RaK TEST ONLY. Staging diagnostics and stricter employee reader; no employee provision,
-- no changes to existing anonymous rotation SELECT or current login.
CREATE OR REPLACE FUNCTION private.rak_can_read_rotations()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
 SELECT (SELECT auth.uid()) IS NOT NULL
   AND private.rak_current_session_id() IS NOT NULL
   AND EXISTS (
     SELECT 1 FROM auth.sessions s
     WHERE s.id = private.rak_current_session_id()
       AND s.user_id = (SELECT auth.uid())
   )
   AND (
     COALESCE(private.rak_current_admin_role() IN ('owner','admin','deputy'),false)
     OR EXISTS (
       SELECT 1 FROM private.rak_employee_auth_links link
       JOIN auth.users worker ON worker.id=link.user_id
       WHERE link.user_id=(SELECT auth.uid())
         AND link.enabled
         AND worker.raw_app_meta_data->>'rak_role'='employee'
         AND worker.raw_app_meta_data->>'rak_account_id'=link.account_number
         AND worker.email=link.account_number||'@worker.rak.local'
         AND worker.email_confirmed_at IS NOT NULL
         AND worker.deleted_at IS NULL
         AND (worker.banned_until IS NULL OR worker.banned_until<=pg_catalog.now())
         AND NOT EXISTS (SELECT 1 FROM public.rak_admin_profiles p WHERE p.user_id=link.user_id)
     )
   )
$function$;
REVOKE ALL ON FUNCTION private.rak_can_read_rotations() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION private.rak_employee_rotation_cutover_readiness()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
 WITH eligible AS (
   SELECT g.account_number FROM public.game_accounts g
   WHERE NOT EXISTS (SELECT 1 FROM public.rak_admin_profiles p WHERE p.account_id=g.account_number)
 ), valid_links AS (
   SELECT l.account_number FROM private.rak_employee_auth_links l
   JOIN eligible e ON e.account_number=l.account_number
   JOIN auth.users u ON u.id=l.user_id
   WHERE l.enabled
     AND u.raw_app_meta_data->>'rak_role'='employee'
     AND u.raw_app_meta_data->>'rak_account_id'=l.account_number
     AND u.email=l.account_number||'@worker.rak.local'
     AND u.email_confirmed_at IS NOT NULL
     AND u.deleted_at IS NULL
     AND (u.banned_until IS NULL OR u.banned_until<=pg_catalog.now())
     AND NOT EXISTS(SELECT 1 FROM public.rak_admin_profiles p WHERE p.user_id=l.user_id)
 ), counts AS (
   SELECT (SELECT count(*) FROM eligible)::integer expected,
          (SELECT count(*) FROM valid_links)::integer valid,
          (SELECT count(*) FROM private.rak_employee_auth_links)::integer links,
          (SELECT count(*) FROM auth.users WHERE raw_app_meta_data->>'rak_role'='employee')::integer auth_workers,
          (SELECT count(*) FROM public.rak_admin_profiles)::integer admin_profiles
 )
 SELECT pg_catalog.jsonb_build_object(
   'database_ready',expected>0 AND valid=expected AND links=expected AND auth_workers=expected
     AND has_function_privilege('authenticated','public.rak_read_rotation_v1()','EXECUTE')
     AND NOT has_function_privilege('anon','public.rak_read_rotation_v1()','EXECUTE'),
   'expected_employee_accounts',expected,
   'valid_employee_links',valid,
   'missing_or_invalid_employee_links',expected-valid,
   'total_link_rows',links,
   'employee_auth_users',auth_workers,
   'admin_profiles',admin_profiles,
   'verified_reader_granted_to_authenticated',has_function_privilege('authenticated','public.rak_read_rotation_v1()','EXECUTE'),
   'verified_reader_denied_to_anon',NOT has_function_privilege('anon','public.rak_read_rotation_v1()','EXECUTE'),
   'legacy_anonymous_rotation_grant',has_table_privilege('anon','public.rotation_state','SELECT'),
   'requires_mobile_login_and_runtime_smoke',true
 ) FROM counts;
$function$;
REVOKE ALL ON FUNCTION private.rak_employee_rotation_cutover_readiness() FROM PUBLIC,anon,authenticated,service_role;
DO $guard$ BEGIN
 IF has_function_privilege('anon','private.rak_employee_rotation_cutover_readiness()','EXECUTE')
    OR has_function_privilege('authenticated','private.rak_employee_rotation_cutover_readiness()','EXECUTE')
    OR NOT has_table_privilege('anon','public.rotation_state','SELECT')
    OR has_function_privilege('anon','public.rak_read_rotation_v1()','EXECUTE')
    OR NOT has_function_privilege('authenticated','public.rak_read_rotation_v1()','EXECUTE')
 THEN RAISE EXCEPTION 'Unsafe employee readiness / legacy rotation gate'; END IF;
 IF (private.rak_employee_rotation_cutover_readiness()->>'database_ready')::boolean THEN
   RAISE EXCEPTION 'Unexpectedly ready without an employee provisioning review';
 END IF;
END $guard$;