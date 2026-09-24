-- TEST ONLY: protect nested employee identities and remove redundant legacy owner-number exception.
DO $guard$
BEGIN
 IF (SELECT count(*) FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='machine_settings' AND policyname IN ('rak_machine_settings_anon_no_worker_roster_v7','rak_machine_settings_authenticated_worker_roster_admin_only_v7','rak_machine_settings_anon_no_roster_payload_v8','rak_machine_settings_authenticated_roster_payload_admin_only_v8')) <> 4 THEN RAISE EXCEPTION 'Expected roster protection v7/v8 missing'; END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='machine_settings' AND policyname IN ('rak_machine_settings_anon_no_recursive_identity_v9','rak_machine_settings_authenticated_recursive_identity_admin_only_v9')) THEN RAISE EXCEPTION 'Recursive protections already installed'; END IF;
 IF (SELECT count(*) FROM public.machine_settings WHERE jsonb_path_exists(settings_json,'$.**.appAccounts') OR jsonb_path_exists(settings_json,'$.**.applicationAccounts') OR jsonb_path_exists(settings_json,'$.**.workers') OR jsonb_path_exists(settings_json,'$.**.loginNumber') OR jsonb_path_exists(settings_json,'$.**.accountNumber') OR jsonb_path_exists(settings_json,'$.**.roster') OR jsonb_path_exists(settings_json,'$.**.employees') OR jsonb_path_exists(settings_json,'$.**.staff')) <> 1 THEN RAISE EXCEPTION 'Unexpected recursive identity baseline; review first'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.machine_settings WHERE machine_key='WORKER_ROSTER_SETTINGS' AND jsonb_path_exists(settings_json,'$.**.appAccounts')) THEN RAISE EXCEPTION 'Baseline worker roster missing'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.rak_admin_profiles WHERE account_id='9811' AND enabled) THEN RAISE EXCEPTION 'Legacy owner account absent; inspect compatibility before removing special case'; END IF;
 IF NOT has_function_privilege('anon','public.rak_admin_account_requires_auth(text)','EXECUTE') OR NOT has_function_privilege('authenticated','public.rak_admin_account_requires_auth(text)','EXECUTE') THEN RAISE EXCEPTION 'Login capability grant unexpectedly changed'; END IF;
END $guard$;
CREATE POLICY rak_machine_settings_anon_no_recursive_identity_v9
 ON public.machine_settings AS RESTRICTIVE FOR SELECT TO anon
 USING (NOT (
    jsonb_path_exists(settings_json,'$.**.appAccounts') OR
    jsonb_path_exists(settings_json,'$.**.applicationAccounts') OR
    jsonb_path_exists(settings_json,'$.**.workers') OR
    jsonb_path_exists(settings_json,'$.**.loginNumber') OR
    jsonb_path_exists(settings_json,'$.**.accountNumber') OR
    jsonb_path_exists(settings_json,'$.**.roster') OR
    jsonb_path_exists(settings_json,'$.**.employees') OR
    jsonb_path_exists(settings_json,'$.**.staff')
  ));
CREATE POLICY rak_machine_settings_authenticated_recursive_identity_admin_only_v9
 ON public.machine_settings AS RESTRICTIVE FOR SELECT TO authenticated
 USING ((SELECT private.rak_is_admin()) OR NOT (
    jsonb_path_exists(settings_json,'$.**.appAccounts') OR
    jsonb_path_exists(settings_json,'$.**.applicationAccounts') OR
    jsonb_path_exists(settings_json,'$.**.workers') OR
    jsonb_path_exists(settings_json,'$.**.loginNumber') OR
    jsonb_path_exists(settings_json,'$.**.accountNumber') OR
    jsonb_path_exists(settings_json,'$.**.roster') OR
    jsonb_path_exists(settings_json,'$.**.employees') OR
    jsonb_path_exists(settings_json,'$.**.staff')
  ));
-- Profile state is authoritative; no special-case account identifier.
CREATE OR REPLACE FUNCTION public.rak_admin_account_requires_auth(p_account_id text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $func$
 SELECT EXISTS (
   SELECT 1 FROM public.rak_admin_profiles AS profile
   WHERE profile.account_id = pg_catalog.btrim(coalesce(p_account_id,''))
     AND profile.enabled
 );
$func$;
DO $verify$
BEGIN
 IF (SELECT count(*) FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='machine_settings' AND permissive='RESTRICTIVE' AND policyname IN ('rak_machine_settings_anon_no_recursive_identity_v9','rak_machine_settings_authenticated_recursive_identity_admin_only_v9'))<>2 THEN RAISE EXCEPTION 'Recursive worker privacy policies not installed'; END IF;
 IF NOT public.rak_admin_account_requires_auth('9811') OR public.rak_admin_account_requires_auth('not-an-admin') THEN RAISE EXCEPTION 'Admin login capability regression'; END IF;
 IF NOT has_function_privilege('anon','public.rak_lookup_account_for_login_v1(text)','EXECUTE') OR NOT has_function_privilege('anon','public.rak_admin_account_requires_auth(text)','EXECUTE') THEN RAISE EXCEPTION 'Employee login availability changed'; END IF;
END $verify$;
NOTIFY pgrst,'reload schema';
