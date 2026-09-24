
-- ===== RaK production phase B 1/25: supabase/migrations/20260918174200_close_unused_rotation_month_entry_reads.sql =====
-- RaK test-only P0.2 incremental cutover: retired month/entry tables are empty.
-- Do not deploy this migration to production without a separate review and authorization.
-- The active rotation snapshot (rotation_state) and game_accounts are deliberately unchanged.
DO $guard$
BEGIN
  IF EXISTS (SELECT 1 FROM public.rotation_months LIMIT 1)
     OR EXISTS (SELECT 1 FROM public.rotation_entries LIMIT 1) THEN
    RAISE EXCEPTION 'Rotation month/entry privacy cutover aborted: nonempty table';
  END IF;
END
$guard$;
REVOKE SELECT ON TABLE public.rotation_months, public.rotation_entries FROM anon, authenticated;
DROP POLICY IF EXISTS rak_rotation_months_public_read_v2 ON public.rotation_months;
DROP POLICY IF EXISTS rak_rotation_entries_public_read_v2 ON public.rotation_entries;


-- ===== RaK production phase B 2/25: supabase/migrations/20260918180344_rak_cut_over_account_privacy_and_limit_public_lookup.sql =====
-- RaK TEST ONLY: do not apply to production without explicit release approval.
-- Existing PWA >=1.7.27 uses a single-account RPC; older cached builds must update.
DO $guard$
BEGIN
  IF to_regprocedure('public.rak_lookup_account_for_login_v1(text)') IS NULL
     OR to_regprocedure('public.rak_admin_list_application_accounts_v1()') IS NULL
     OR NOT has_function_privilege('anon','public.rak_lookup_account_for_login_v1(text)','EXECUTE')
     OR has_function_privilege('anon','public.rak_admin_list_application_accounts_v1()','EXECUTE')
     OR NOT has_function_privilege('authenticated','public.rak_admin_list_application_accounts_v1()','EXECUTE')
  THEN RAISE EXCEPTION 'Secure login/admin directory prerequisites not met'; END IF;
END $guard$;

CREATE TABLE IF NOT EXISTS private.rak_login_lookup_salt (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  salt uuid NOT NULL DEFAULT pg_catalog.gen_random_uuid()
);
INSERT INTO private.rak_login_lookup_salt(singleton) VALUES (true) ON CONFLICT (singleton) DO NOTHING;
CREATE TABLE IF NOT EXISTS private.rak_login_lookup_budget (
  hour_start timestamptz NOT NULL,
  caller_key text NOT NULL,
  hits integer NOT NULL DEFAULT 0 CHECK (hits >= 0),
  PRIMARY KEY (hour_start, caller_key)
);
REVOKE ALL ON TABLE private.rak_login_lookup_salt, private.rak_login_lookup_budget FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.rak_lookup_account_for_login_v1(p_last4 text)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_suffix text := pg_catalog.btrim(coalesce(p_last4,''));
  v_hour timestamptz := pg_catalog.date_trunc('hour',pg_catalog.clock_timestamp());
  v_headers jsonb;
  v_ip text;
  v_salt uuid;
  v_caller_key text;
  v_global integer;
  v_per_caller integer;
  v_count integer;
  v_account text;
  v_name text;
BEGIN
  IF v_suffix !~ '^[0-9]{4}$' THEN
    RETURN pg_catalog.jsonb_build_object('ok',false,'reason','not-found');
  END IF;
  -- Budget is global as well as per caller; forwarded IP is not trusted as identity.
  INSERT INTO private.rak_login_lookup_budget AS budget (hour_start,caller_key,hits)
  VALUES (v_hour,'global',1)
  ON CONFLICT(hour_start,caller_key) DO UPDATE SET hits=LEAST(budget.hits+1,301)
  RETURNING hits INTO v_global;
  IF v_global = 1 THEN
    DELETE FROM private.rak_login_lookup_budget WHERE hour_start < v_hour - interval '3 hours';
  END IF;
  IF v_global > 300 THEN
    RETURN pg_catalog.jsonb_build_object('ok',false,'reason','rate-limited');
  END IF;
  BEGIN
    v_headers := coalesce(nullif(pg_catalog.current_setting('request.headers',true),'')::jsonb,'{}'::jsonb);
  EXCEPTION WHEN invalid_text_representation THEN
    v_headers := '{}'::jsonb;
  END;
  v_ip := pg_catalog.left(pg_catalog.btrim(pg_catalog.split_part(coalesce(v_headers->>'x-forwarded-for',v_headers->>'x-real-ip','unattributed'),',',1)),128);
  IF v_ip='' THEN v_ip := 'unattributed'; END IF;
  SELECT salt INTO v_salt FROM private.rak_login_lookup_salt WHERE singleton;
  IF v_salt IS NULL THEN RAISE EXCEPTION 'Lookup rate limit not initialized' USING ERRCODE='55000'; END IF;
  v_caller_key := 'ip:' || pg_catalog.md5(v_salt::text || ':' || v_ip);
  INSERT INTO private.rak_login_lookup_budget AS budget (hour_start,caller_key,hits)
  VALUES(v_hour,v_caller_key,1)
  ON CONFLICT(hour_start,caller_key) DO UPDATE SET hits=LEAST(budget.hits+1,61)
  RETURNING hits INTO v_per_caller;
  IF v_per_caller > 60 THEN
    RETURN pg_catalog.jsonb_build_object('ok',false,'reason','rate-limited');
  END IF;
  SELECT count(*)::integer,min(account_number),min(full_name)
    INTO v_count,v_account,v_name
    FROM public.game_accounts
    WHERE pg_catalog.right(account_number,4)=v_suffix
      AND pg_catalog.btrim(account_number)<>'' AND pg_catalog.btrim(full_name)<>'';
  IF v_count=0 THEN RETURN pg_catalog.jsonb_build_object('ok',false,'reason','not-found'); END IF;
  IF v_count>1 THEN RETURN pg_catalog.jsonb_build_object('ok',false,'reason','ambiguous'); END IF;
  RETURN pg_catalog.jsonb_build_object('ok',true,'accountNumber',v_account,'fullName',v_name);
END;
$function$;
REVOKE ALL ON FUNCTION public.rak_lookup_account_for_login_v1(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rak_lookup_account_for_login_v1(text) TO anon, authenticated, service_role;

-- Eliminate unrestricted REST/GraphQL bulk reads; admin RPC remains role+session checked.
REVOKE SELECT ON TABLE public.game_accounts FROM anon, authenticated;
DROP POLICY IF EXISTS rak_game_accounts_public_read_v2 ON public.game_accounts;


-- ===== RaK production phase B 3/25: supabase/migrations/20260918193324_rak_close_retired_gomoku_public_read.sql =====
-- Phase B: close the retired Gomoku leaderboard read path without deleting history.
-- The games UI has been absent since RaK 1.7.21. Historical rows remain available
-- to service_role/owner backup; this migration changes grants/policy only.
DO $guard$
DECLARE
  v_submit regprocedure := to_regprocedure(
    'public.rak_submit_gomoku_win_v2(text,text,integer,text,timestamp with time zone,integer,text,integer,integer,text)'
  );
BEGIN
  IF to_regclass('public.gomoku_wins') IS NULL THEN
    RAISE EXCEPTION 'Legacy game table not present';
  END IF;
  IF has_table_privilege('anon', 'public.gomoku_wins', 'INSERT')
     OR has_table_privilege('anon', 'public.gomoku_wins', 'UPDATE')
     OR has_table_privilege('anon', 'public.gomoku_wins', 'DELETE')
     OR has_table_privilege('authenticated', 'public.gomoku_wins', 'INSERT')
     OR has_table_privilege('authenticated', 'public.gomoku_wins', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.gomoku_wins', 'DELETE')
     OR (
       v_submit IS NOT NULL
       AND (
         has_function_privilege('anon', v_submit, 'EXECUTE')
         OR has_function_privilege('authenticated', v_submit, 'EXECUTE')
       )
     ) THEN
    RAISE EXCEPTION 'Legacy Gomoku write path is still client-accessible';
  END IF;
  IF has_table_privilege('anon', 'public.game_accounts', 'SELECT')
     OR has_table_privilege('authenticated', 'public.game_accounts', 'SELECT') THEN
    RAISE EXCEPTION 'Account-directory privacy cutover is not in place';
  END IF;
END $guard$;

REVOKE SELECT ON TABLE public.gomoku_wins FROM anon, authenticated;
DROP POLICY IF EXISTS rak_gomoku_wins_public_read_v2 ON public.gomoku_wins;

DO $postcondition$
BEGIN
  IF has_table_privilege('anon', 'public.gomoku_wins', 'SELECT')
     OR has_table_privilege('authenticated', 'public.gomoku_wins', 'SELECT')
     OR EXISTS (
       SELECT 1
       FROM pg_catalog.pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'gomoku_wins'
         AND policyname = 'rak_gomoku_wins_public_read_v2'
     ) THEN
    RAISE EXCEPTION 'Legacy Gomoku public read closure did not complete';
  END IF;
END $postcondition$;


-- ===== RaK production phase B 4/25: supabase/migrations/20260918195107_rak_stage_verified_employee_rotation_reader.sql =====
-- RaK TEST ONLY. This stages an authenticated rotation reader; it does NOT close the
-- existing anonymous rotation SELECT or change the current employee login flow.
-- Employee Auth identities must be provisioned by an owner in a later cutover.
CREATE TABLE IF NOT EXISTS private.rak_employee_auth_links (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_number text NOT NULL UNIQUE REFERENCES public.game_accounts(account_number)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT rak_employee_auth_links_account_format CHECK (account_number ~ '^[0-9]{4,12}$')
);
ALTER TABLE private.rak_employee_auth_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.rak_employee_auth_links FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.rak_can_read_rotations()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND private.rak_current_session_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM auth.sessions AS s
      WHERE s.id = private.rak_current_session_id()
        AND s.user_id = (SELECT auth.uid())
    )
    AND (
      COALESCE(private.rak_current_admin_role() IN ('owner','admin','deputy'), false)
      OR EXISTS (
        SELECT 1
        FROM private.rak_employee_auth_links AS link
        JOIN auth.users AS worker ON worker.id = link.user_id
        WHERE link.user_id = (SELECT auth.uid())
          AND link.enabled
          AND worker.raw_app_meta_data ->> 'rak_role' = 'employee'
          AND worker.raw_app_meta_data ->> 'rak_account_id' = link.account_number
          AND worker.email = link.account_number || '@worker.rak.local'
          AND NOT EXISTS (
            SELECT 1 FROM public.rak_admin_profiles AS profile
            WHERE profile.user_id = link.user_id
          )
      )
    )
$function$;
REVOKE ALL ON FUNCTION private.rak_can_read_rotations() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.rak_read_rotation_v1()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  v_row public.rotation_state%ROWTYPE;
BEGIN
  IF NOT COALESCE(private.rak_can_read_rotations(), false) THEN
    RAISE EXCEPTION 'Verified RaK session required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_row FROM public.rotation_state WHERE key = 'main' LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN pg_catalog.to_jsonb(v_row);
END;
$function$;
REVOKE ALL ON FUNCTION public.rak_read_rotation_v1() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rak_read_rotation_v1() TO authenticated;

DO $guard$
BEGIN
  IF has_function_privilege('anon', 'public.rak_read_rotation_v1()', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.rak_read_rotation_v1()', 'EXECUTE')
     OR has_table_privilege('anon', 'private.rak_employee_auth_links', 'SELECT')
     OR has_table_privilege('authenticated', 'private.rak_employee_auth_links', 'INSERT')
  THEN RAISE EXCEPTION 'Employee rotation read privilege gate failed'; END IF;
END $guard$;


-- ===== RaK production phase B 5/25: supabase/migrations/20260918200612_rak_hide_legacy_rotation_backups_from_public_reads.sql =====
-- RaK TEST ONLY. Keep worker login, live rotations, machine parameters and all rows unchanged.
-- Legacy automatic rotation backups belong to administration, even when stored
-- in machine_settings with a compatibility category of 'frezka'.
DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'machine_settings'
      AND policyname = 'rak_machine_settings_anon_safe_read_v3'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'machine_settings'
      AND policyname = 'rak_machine_settings_authenticated_read_v3'
  ) THEN
    RAISE EXCEPTION 'Expected machine-settings policies changed; review before applying';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.machine_settings
    WHERE settings_json->>'stored_category' = 'rotation_save_backup'
  ) THEN
    RAISE EXCEPTION 'No legacy rotation backup rows; review before applying';
  END IF;
END $guard$;

DROP POLICY IF EXISTS rak_machine_settings_anon_no_rotation_backups_v4 ON public.machine_settings;
CREATE POLICY rak_machine_settings_anon_no_rotation_backups_v4
ON public.machine_settings AS RESTRICTIVE FOR SELECT TO anon
USING (
  COALESCE(category, '') <> 'rotation_save_backup'
  AND LEFT(COALESCE(machine_key, ''), 21) <> 'ROTATION_SAVE_BACKUP_'
  AND COALESCE(settings_json->>'stored_category', '') <> 'rotation_save_backup'
  AND COALESCE(settings_json->>'type', '') <> 'rotation_save_backup'
  AND LEFT(COALESCE(settings_json->>'admin_settings_key', ''), 21) <> 'ROTATION_SAVE_BACKUP_'
);

DROP POLICY IF EXISTS rak_machine_settings_authenticated_rotation_backups_admin_only_v4 ON public.machine_settings;
CREATE POLICY rak_machine_settings_authenticated_rotation_backups_admin_only_v4
ON public.machine_settings AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  (SELECT private.rak_is_admin())
  OR (
    COALESCE(category, '') <> 'rotation_save_backup'
    AND LEFT(COALESCE(machine_key, ''), 21) <> 'ROTATION_SAVE_BACKUP_'
    AND COALESCE(settings_json->>'stored_category', '') <> 'rotation_save_backup'
    AND COALESCE(settings_json->>'type', '') <> 'rotation_save_backup'
    AND LEFT(COALESCE(settings_json->>'admin_settings_key', ''), 21) <> 'ROTATION_SAVE_BACKUP_'
  )
);


-- ===== RaK production phase B 6/25: supabase/migrations/20260918203159_rak_hide_legacy_admin_change_log_from_public_reads.sql =====
-- RaK TEST ONLY: retain existing employee login and live rotation reads.
-- Historical ADMIN_CHANGE_LOG is an admin audit record kept in machine_settings
-- with legacy category 'frezka'; it is not a public machine parameter.
DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='machine_settings'
      AND policyname='rak_machine_settings_anon_no_rotation_backups_v4'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='machine_settings'
      AND policyname='rak_machine_settings_authenticated_rotation_backups_admin_only_v4'
  ) THEN
    RAISE EXCEPTION 'Expected backup visibility baseline missing; review before applying';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.machine_settings
    WHERE machine_key='ADMIN_CHANGE_LOG' AND settings_json->>'type'='admin_change_log'
  ) THEN
    RAISE EXCEPTION 'Expected legacy admin change-log row missing; review before applying';
  END IF;
END $guard$;

DROP POLICY IF EXISTS rak_machine_settings_anon_no_legacy_change_log_v5 ON public.machine_settings;
CREATE POLICY rak_machine_settings_anon_no_legacy_change_log_v5
ON public.machine_settings AS RESTRICTIVE FOR SELECT TO anon
USING (
  COALESCE(category,'') <> 'admin_change_log'
  AND COALESCE(machine_key,'') <> 'ADMIN_CHANGE_LOG'
  AND COALESCE(settings_json->>'stored_category','') <> 'admin_change_log'
  AND COALESCE(settings_json->>'type','') <> 'admin_change_log'
  AND COALESCE(settings_json->>'admin_settings_key','') <> 'ADMIN_CHANGE_LOG'
);

DROP POLICY IF EXISTS rak_machine_settings_authenticated_change_log_admin_only_v5 ON public.machine_settings;
CREATE POLICY rak_machine_settings_authenticated_change_log_admin_only_v5
ON public.machine_settings AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  (SELECT private.rak_is_admin())
  OR (
    COALESCE(category,'') <> 'admin_change_log'
    AND COALESCE(machine_key,'') <> 'ADMIN_CHANGE_LOG'
    AND COALESCE(settings_json->>'stored_category','') <> 'admin_change_log'
    AND COALESCE(settings_json->>'type','') <> 'admin_change_log'
    AND COALESCE(settings_json->>'admin_settings_key','') <> 'ADMIN_CHANGE_LOG'
  )
);


-- ===== RaK production phase B 7/25: supabase/migrations/20260918204000_rak_whitelist_owner_backup_auth_metadata.sql =====
-- RaK TEST ONLY. Keep the existing owner-only backup contract and current employee login.
-- The complete backup previously serialized every auth.users field except a blacklist.
-- Explicitly select recovery metadata so future Auth token columns cannot enter ZIP exports.
DO $migration$
DECLARE
  v_definition text;
  v_legacy text := $legacy$to_jsonb(u) - array[
      'encrypted_password',
      'confirmation_token',
      'recovery_token',
      'email_change_token_new',
      'email_change_token_current',
      'phone_change_token',
      'reauthentication_token'
    ]::text[]$legacy$;
  v_allowlisted text := $allowlisted$jsonb_build_object(
      'id', u.id,
      'aud', u.aud,
      'role', u.role,
      'email', u.email,
      'phone', u.phone,
      'email_confirmed_at', u.email_confirmed_at,
      'phone_confirmed_at', u.phone_confirmed_at,
      'confirmed_at', u.confirmed_at,
      'last_sign_in_at', u.last_sign_in_at,
      'created_at', u.created_at,
      'updated_at', u.updated_at,
      'is_anonymous', u.is_anonymous,
      'is_sso_user', u.is_sso_user,
      'banned_until', u.banned_until,
      'deleted_at', u.deleted_at,
      'raw_app_meta_data', jsonb_strip_nulls(jsonb_build_object(
        'provider', u.raw_app_meta_data -> 'provider',
        'providers', u.raw_app_meta_data -> 'providers',
        'rak_role', u.raw_app_meta_data -> 'rak_role',
        'rak_account_id', u.raw_app_meta_data -> 'rak_account_id'
      ))
    )$allowlisted$;
  v_old_exclusions text := 'auth.users encrypted_password and one-time/recovery/change tokens';
  v_new_exclusions text := 'auth.users password, verification/recovery/change tokens, arbitrary user metadata and non-allowlisted app metadata';
BEGIN
  SELECT pg_get_functiondef('public.rak_owner_complete_backup_v1()'::regprocedure)
    INTO v_definition;
  IF v_definition IS NULL OR length(v_definition) - length(replace(v_definition, v_legacy, '')) <> length(v_legacy)
     OR position(v_old_exclusions IN v_definition) = 0
     OR position('private.rak_require_admin(true)' IN v_definition) = 0
  THEN
    RAISE EXCEPTION 'Owner backup definition does not match the expected safe migration base';
  END IF;
  v_definition := replace(v_definition, v_legacy, v_allowlisted);
  v_definition := replace(v_definition, v_old_exclusions, v_new_exclusions);
  EXECUTE v_definition;
END
$migration$;

-- CREATE OR REPLACE retains existing grants; state them explicitly and verify them.
REVOKE ALL ON FUNCTION public.rak_owner_complete_backup_v1() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rak_owner_complete_backup_v1() TO authenticated, service_role;

DO $verify$
DECLARE
  v_definition text := pg_get_functiondef('public.rak_owner_complete_backup_v1()'::regprocedure);
BEGIN
  IF position('to_jsonb(u) - array' IN v_definition) > 0
     OR position('jsonb_build_object(' IN v_definition) = 0
     OR position('private.rak_require_admin(true)' IN v_definition) = 0
     OR has_function_privilege('anon', 'public.rak_owner_complete_backup_v1()', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.rak_owner_complete_backup_v1()', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'Owner backup Auth allowlist or permissions verification failed';
  END IF;
END
$verify$;

NOTIFY pgrst, 'reload schema';


-- ===== RaK production phase B 8/25: supabase/migrations/20260918211310_rak_machine_settings_protect_admin_json_types.sql =====
-- RaK development/test: prevent disguised admin credentials and owner backups
-- from being exposed through machine_settings read policies. Existing selectors,
-- employee login, writes and owner/admin read access are unchanged.
DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class AS c
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'machine_settings'
      AND c.relrowsecurity
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'machine_settings'
      AND policyname = 'rak_machine_settings_anon_safe_read_v3'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'machine_settings'
      AND policyname = 'rak_machine_settings_authenticated_read_v3'
  ) THEN
    RAISE EXCEPTION 'Missing existing machine_settings security baseline';
  END IF;
END
$guard$;

CREATE POLICY rak_machine_settings_anon_admin_json_type_v6
ON public.machine_settings AS RESTRICTIVE FOR SELECT TO anon
USING (
  COALESCE(settings_json ->> 'type', '') NOT IN
    ('admin_accounts_settings', 'admin_full_settings_backup')
);

CREATE POLICY rak_machine_settings_authenticated_admin_json_type_v6
ON public.machine_settings AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  (SELECT private.rak_is_admin()) OR
  COALESCE(settings_json ->> 'type', '') NOT IN
    ('admin_accounts_settings', 'admin_full_settings_backup')
);

DO $verify$
BEGIN
  IF (SELECT count(*) FROM pg_catalog.pg_policies
      WHERE schemaname = 'public' AND tablename = 'machine_settings'
        AND permissive = 'RESTRICTIVE' AND cmd = 'SELECT'
        AND policyname IN (
          'rak_machine_settings_anon_admin_json_type_v6',
          'rak_machine_settings_authenticated_admin_json_type_v6'
        )) <> 2
  THEN RAISE EXCEPTION 'Admin JSON type policies not installed'; END IF;
END
$verify$;

NOTIFY pgrst, 'reload schema';


-- ===== RaK production phase B 9/25: supabase/migrations/20260918214441_rak_hide_worker_roster_from_public_reads.sql =====
-- RaK TEST ONLY: hide roster names and legacy login numbers from public machine-settings reads.
-- Keep existing employee login RPC, live rotation access and all machine settings writes unchanged.
DO $guard$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='machine_settings' AND c.relrowsecurity)
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='machine_settings' AND policyname='rak_machine_settings_anon_safe_read_v3')
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='machine_settings' AND policyname='rak_machine_settings_authenticated_read_v3')
 THEN RAISE EXCEPTION 'Existing machine-settings RLS baseline missing'; END IF;
 IF (SELECT count(*) FROM public.machine_settings WHERE machine_key='WORKER_ROSTER_SETTINGS' AND settings_json->>'stored_category'='worker_roster_settings')<>1
 THEN RAISE EXCEPTION 'Expected worker roster baseline missing'; END IF;
 IF EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='machine_settings' AND policyname IN ('rak_machine_settings_anon_no_worker_roster_v7','rak_machine_settings_authenticated_worker_roster_admin_only_v7'))
 THEN RAISE EXCEPTION 'Worker roster policies already exist; review migration history'; END IF;
END $guard$;

CREATE POLICY rak_machine_settings_anon_no_worker_roster_v7
ON public.machine_settings AS RESTRICTIVE FOR SELECT TO anon
USING (
 COALESCE(category,'') <> 'worker_roster_settings'
 AND COALESCE(machine_key,'') <> 'WORKER_ROSTER_SETTINGS'
 AND COALESCE(settings_json->>'stored_category','') <> 'worker_roster_settings'
 AND COALESCE(settings_json->>'type','') <> 'worker_roster_settings'
 AND COALESCE(settings_json->>'admin_settings_key','') <> 'WORKER_ROSTER_SETTINGS'
);

CREATE POLICY rak_machine_settings_authenticated_worker_roster_admin_only_v7
ON public.machine_settings AS RESTRICTIVE FOR SELECT TO authenticated
USING (
 (SELECT private.rak_is_admin()) OR (
  COALESCE(category,'') <> 'worker_roster_settings'
  AND COALESCE(machine_key,'') <> 'WORKER_ROSTER_SETTINGS'
  AND COALESCE(settings_json->>'stored_category','') <> 'worker_roster_settings'
  AND COALESCE(settings_json->>'type','') <> 'worker_roster_settings'
  AND COALESCE(settings_json->>'admin_settings_key','') <> 'WORKER_ROSTER_SETTINGS'
 )
);

DO $verify$
BEGIN
 IF (SELECT count(*) FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='machine_settings' AND permissive='RESTRICTIVE' AND cmd='SELECT' AND policyname IN ('rak_machine_settings_anon_no_worker_roster_v7','rak_machine_settings_authenticated_worker_roster_admin_only_v7')) <> 2
 THEN RAISE EXCEPTION 'Expected worker roster read guards not installed'; END IF;
END $verify$;

NOTIFY pgrst,'reload schema';


-- ===== RaK production phase B 10/25: supabase/migrations/20260918220431_rak_announcements_hide_inactive_from_public_reads.sql =====
-- RaK TEST ONLY. Publish active announcements, not archived/inactive drafts.
-- Admin/owner can still read historical rows through their verified Auth session.
DO $guard$
BEGIN
 IF (SELECT count(*) FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='announcements' AND policyname='rak_announcements_public_read_v2' AND cmd='SELECT' AND qual='true') <> 1
 THEN RAISE EXCEPTION 'Unexpected announcement read policy baseline'; END IF;
 IF (SELECT count(*) FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='announcements' AND cmd='SELECT') <> 1
 THEN RAISE EXCEPTION 'Unexpected additional announcement read policy'; END IF;
 IF (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='announcements' AND column_name='is_active' AND data_type='boolean') <> 1
 THEN RAISE EXCEPTION 'Announcement active flag missing'; END IF;
END $guard$;

DROP POLICY rak_announcements_public_read_v2 ON public.announcements;

CREATE POLICY rak_announcements_active_public_read_v3
 ON public.announcements FOR SELECT TO anon
 USING (is_active IS TRUE);

CREATE POLICY rak_announcements_active_or_admin_read_v3
 ON public.announcements FOR SELECT TO authenticated
 USING (is_active IS TRUE OR (SELECT private.rak_is_admin()));

DO $verify$
BEGIN
 IF (SELECT count(*) FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='announcements' AND policyname IN ('rak_announcements_active_public_read_v3','rak_announcements_active_or_admin_read_v3') AND cmd='SELECT') <> 2
 THEN RAISE EXCEPTION 'Announcement read policies missing'; END IF;
END $verify$;
NOTIFY pgrst,'reload schema';


-- ===== RaK production phase B 11/25: supabase/migrations/20260918220817_rak_machine_settings_hide_disguised_roster_payloads.sql =====
-- RaK TEST ONLY. Defense in depth: roster identities must never be exposed by
-- a mislabeled machine_settings row containing worker/account arrays.
-- Verified admin and owner retain their existing access; writers are unchanged.
DO $guard$
BEGIN
 IF (SELECT count(*) FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='machine_settings' AND policyname IN ('rak_machine_settings_anon_no_worker_roster_v7','rak_machine_settings_authenticated_worker_roster_admin_only_v7'))<>2
 THEN RAISE EXCEPTION 'Worker roster privacy v7 must be installed first'; END IF;
 IF (SELECT count(*) FROM public.machine_settings WHERE settings_json ?| ARRAY['appAccounts','applicationAccounts','workers'])<>1
 THEN RAISE EXCEPTION 'Unexpected employee payload baseline; review before migration'; END IF;
 IF EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='machine_settings' AND policyname IN ('rak_machine_settings_anon_no_roster_payload_v8','rak_machine_settings_authenticated_roster_payload_admin_only_v8'))
 THEN RAISE EXCEPTION 'Roster payload guards already exist'; END IF;
END $guard$;

CREATE POLICY rak_machine_settings_anon_no_roster_payload_v8
 ON public.machine_settings AS RESTRICTIVE FOR SELECT TO anon
 USING (NOT (settings_json ?| ARRAY['appAccounts','applicationAccounts','workers']));

CREATE POLICY rak_machine_settings_authenticated_roster_payload_admin_only_v8
 ON public.machine_settings AS RESTRICTIVE FOR SELECT TO authenticated
 USING ((SELECT private.rak_is_admin()) OR NOT (settings_json ?| ARRAY['appAccounts','applicationAccounts','workers']));

DO $verify$
BEGIN
 IF (SELECT count(*) FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='machine_settings' AND permissive='RESTRICTIVE' AND cmd='SELECT' AND policyname IN ('rak_machine_settings_anon_no_roster_payload_v8','rak_machine_settings_authenticated_roster_payload_admin_only_v8'))<>2
 THEN RAISE EXCEPTION 'Expected roster payload guards not installed'; END IF;
END $verify$;
NOTIFY pgrst,'reload schema';


-- ===== RaK production phase B 12/25: supabase/migrations/20260919054241_rak_recursive_worker_privacy_and_profile_based_admin_lookup.sql =====
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


-- ===== RaK production phase B 13/25: supabase/migrations/20260919055938_rak_employee_rotation_cutover_readiness_and_disabled_worker_guard.sql =====
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


-- ===== RaK production phase B 14/25: supabase/migrations/20260919060210_rak_announcements_only_live_public_read.sql =====
-- RaK TEST ONLY: announcement history and scheduled notices are visible only to verified admins.
-- A published notice is public only inside its validity interval; current active notices without dates stay readable.
DO $guard$ BEGIN
 IF (SELECT count(*) FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='announcements' AND policyname IN ('rak_announcements_active_public_read_v3','rak_announcements_active_or_admin_read_v3'))<>2
 THEN RAISE EXCEPTION 'Unexpected announcement policy baseline'; END IF;
 IF EXISTS(SELECT 1 FROM public.announcements WHERE is_active IS TRUE AND starts_at IS NOT NULL AND ends_at IS NOT NULL AND ends_at<=starts_at)
 THEN RAISE EXCEPTION 'Invalid scheduled notice interval, review first'; END IF;
END $guard$;
DROP POLICY rak_announcements_active_public_read_v3 ON public.announcements;
DROP POLICY rak_announcements_active_or_admin_read_v3 ON public.announcements;
CREATE POLICY rak_announcements_live_public_read_v4 ON public.announcements FOR SELECT TO anon
 USING (is_active IS TRUE AND (starts_at IS NULL OR starts_at<=pg_catalog.now()) AND (ends_at IS NULL OR ends_at>pg_catalog.now()));
CREATE POLICY rak_announcements_live_or_admin_read_v4 ON public.announcements FOR SELECT TO authenticated
 USING ((is_active IS TRUE AND (starts_at IS NULL OR starts_at<=pg_catalog.now()) AND (ends_at IS NULL OR ends_at>pg_catalog.now())) OR (SELECT private.rak_is_admin()));
DO $verify$ BEGIN
 IF (SELECT count(*) FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='announcements' AND policyname IN ('rak_announcements_live_public_read_v4','rak_announcements_live_or_admin_read_v4'))<>2 THEN RAISE EXCEPTION 'Live notice RLS missing'; END IF;
 IF has_table_privilege('anon','public.announcements','UPDATE') OR has_table_privilege('anon','public.announcements','DELETE') THEN RAISE EXCEPTION 'Public announcement write grant unexpected'; END IF;
END $verify$;
NOTIFY pgrst,'reload schema';


-- ===== RaK production phase B 15/25: supabase/migrations/20260919062619_rak_worker_verified_email_recovery_staging.sql =====
-- RaK development / TEST Supabase only. No worker users or secrets are created.
-- Real, confirmed email identity is independent of the private OS account link.
-- Keep the existing anonymous rotation read until client-side Auth cutover is proven.
CREATE OR REPLACE FUNCTION private.rak_worker_email_ready(
  p_email text, p_confirmed_at timestamptz, p_is_anonymous boolean
) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO '' AS $function$
  SELECT p_confirmed_at IS NOT NULL
    AND p_is_anonymous IS FALSE
    AND p_email IS NOT NULL
    AND p_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    AND pg_catalog.lower(pg_catalog.split_part(p_email,'@',2)) <> 'worker.rak.local'
$function$;
REVOKE ALL ON FUNCTION private.rak_worker_email_ready(text,timestamptz,boolean)
  FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION private.rak_can_read_rotations()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
 SELECT (SELECT auth.uid()) IS NOT NULL
   AND private.rak_current_session_id() IS NOT NULL
   AND EXISTS (SELECT 1 FROM auth.sessions s WHERE s.id=private.rak_current_session_id() AND s.user_id=(SELECT auth.uid()))
   AND (COALESCE(private.rak_current_admin_role() IN ('owner','admin','deputy'),false)
     OR EXISTS (
       SELECT 1 FROM private.rak_employee_auth_links link
       JOIN auth.users worker ON worker.id=link.user_id
       WHERE link.user_id=(SELECT auth.uid()) AND link.enabled
         AND worker.raw_app_meta_data->>'rak_role'='employee'
         AND worker.raw_app_meta_data->>'rak_account_id'=link.account_number
         AND private.rak_worker_email_ready(worker.email,worker.email_confirmed_at,worker.is_anonymous)
         AND worker.deleted_at IS NULL
         AND (worker.banned_until IS NULL OR worker.banned_until<=pg_catalog.now())
         AND NOT EXISTS (SELECT 1 FROM public.rak_admin_profiles p WHERE p.user_id=link.user_id)
     ))
$function$;
REVOKE ALL ON FUNCTION private.rak_can_read_rotations() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION private.rak_employee_rotation_cutover_readiness()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
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
     AND private.rak_worker_email_ready(u.email,u.email_confirmed_at,u.is_anonymous)
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
   'requires_mobile_login_and_runtime_smoke',true,
   'requires_recovery_delivery_smoke',true
 ) FROM counts;
$function$;
REVOKE ALL ON FUNCTION private.rak_employee_rotation_cutover_readiness()
  FROM PUBLIC,anon,authenticated,service_role;

DO $guard$ BEGIN
 IF has_function_privilege('anon','private.rak_worker_email_ready(text,timestamptz,boolean)','EXECUTE')
    OR has_function_privilege('authenticated','private.rak_worker_email_ready(text,timestamptz,boolean)','EXECUTE')
    OR has_function_privilege('anon','private.rak_employee_rotation_cutover_readiness()','EXECUTE')
    OR has_function_privilege('authenticated','private.rak_employee_rotation_cutover_readiness()','EXECUTE')
    OR has_function_privilege('anon','public.rak_read_rotation_v1()','EXECUTE')
    OR NOT has_function_privilege('authenticated','public.rak_read_rotation_v1()','EXECUTE')
    OR NOT has_table_privilege('anon','public.rotation_state','SELECT')
 THEN RAISE EXCEPTION 'Worker recovery staging privilege or legacy rotation regression'; END IF;
END $guard$;


-- ===== RaK production phase B 16/25: supabase/migrations/20260919071456_rak_public_rotation_reject_nested_secret_fields_os_only.sql =====
-- TEST DATABASE ONLY. OS-number-only access leaves rotation_state publicly readable.
-- This guard prevents accidental future storage of explicit contact/authentication fields.
-- It does NOT make operational schedules, names or absence codes private.
CREATE OR REPLACE FUNCTION private.rak_rotation_has_restricted_public_key(p_document jsonb)
RETURNS boolean
LANGUAGE sql IMMUTABLE STRICT
SET search_path = ''
AS $func$
  WITH RECURSIVE nodes(value, depth) AS (
    SELECT p_document, 0
    UNION ALL
    SELECT child.value, nodes.depth + 1
      FROM nodes
      CROSS JOIN LATERAL (
        SELECT item.value FROM pg_catalog.jsonb_each(
          CASE WHEN pg_catalog.jsonb_typeof(nodes.value) = 'object' THEN nodes.value ELSE '{}'::jsonb END
        ) AS item
        UNION ALL
        SELECT item.value FROM pg_catalog.jsonb_array_elements(
          CASE WHEN pg_catalog.jsonb_typeof(nodes.value) = 'array' THEN nodes.value ELSE '[]'::jsonb END
        ) AS item
      ) AS child
     WHERE nodes.depth < 32
  )
  SELECT EXISTS (
    SELECT 1
      FROM nodes
      CROSS JOIN LATERAL pg_catalog.jsonb_object_keys(
        CASE WHEN pg_catalog.jsonb_typeof(nodes.value) = 'object' THEN nodes.value ELSE '{}'::jsonb END
      ) AS candidate(field_name)
     WHERE pg_catalog.lower(pg_catalog.regexp_replace(candidate.field_name, '[^a-zA-Z0-9]', '', 'g')) = ANY (
       ARRAY['email','emailaddress','mailaddress','phone','phonenumber','telephone','telefon','mobil','mobile',
             'address','adresa','homeaddress','postaladdress','contact','kontakt',
             'password','pwd','passcode','heslo','pin','pincode',
             'token','accesstoken','refreshtoken','jwt','secret','apikey','servicekey','privatekey',
             'session','sessionid','credentials','credential',
             'birthdate','dateofbirth','rodnecislo','medical','health','healthnote','diagnosis','diagnoza',
             'privatenote','privatecomment']::text[]
     )
     OR (nodes.depth = 32 AND pg_catalog.jsonb_typeof(nodes.value) IN ('object','array')
         AND nodes.value NOT IN ('{}'::jsonb,'[]'::jsonb))
  );
$func$;
REVOKE ALL ON FUNCTION private.rak_rotation_has_restricted_public_key(jsonb) FROM PUBLIC, anon, authenticated;
ALTER TABLE public.rotation_state ADD CONSTRAINT rak_rotation_no_public_secret_fields_v1
  CHECK (payload IS NOT NULL
    AND NOT private.rak_rotation_has_restricted_public_key(payload)
    AND NOT private.rak_rotation_has_restricted_public_key(COALESCE(meta, '{}'::jsonb)));
COMMENT ON CONSTRAINT rak_rotation_no_public_secret_fields_v1 ON public.rotation_state IS
  'OS-only public rotation: reject nested explicit contact, credential or medical keys; schedule names, absences and free-text still public and require separate minimization.';


-- ===== RaK production phase B 17/25: supabase/migrations/20260919081521_rak_public_rotation_reject_secret_text_values.sql =====
-- TEST DATABASE ONLY. OS-number-only login and public rotation reading remain unchanged.
-- Block a narrow set of recognizable contact/credential patterns in JSON string values.
-- Names, absence codes, other free text and unrecognized formats are NOT private.
CREATE OR REPLACE FUNCTION private.rak_rotation_has_restricted_public_value(p_document jsonb)
RETURNS boolean
LANGUAGE sql IMMUTABLE STRICT
SET search_path = ''
AS $function$
  WITH RECURSIVE nodes(value, depth) AS (
    SELECT p_document, 0
    UNION ALL
    SELECT child.value, nodes.depth + 1
    FROM nodes
    CROSS JOIN LATERAL (
      SELECT item.value
        FROM pg_catalog.jsonb_each(CASE WHEN pg_catalog.jsonb_typeof(nodes.value) = 'object' THEN nodes.value ELSE '{}'::jsonb END) AS item
      UNION ALL
      SELECT item.value
        FROM pg_catalog.jsonb_array_elements(CASE WHEN pg_catalog.jsonb_typeof(nodes.value) = 'array' THEN nodes.value ELSE '[]'::jsonb END) AS item
    ) AS child
    WHERE nodes.depth < 32
  )
  SELECT EXISTS (
    SELECT 1 FROM nodes
    WHERE pg_catalog.jsonb_typeof(nodes.value) = 'string'
      AND (
        (nodes.value #>> '{}') ~* '[[:alnum:]._%+\-]+@[[:alnum:].\-]+[.][[:alpha:]]{2,}'
        OR (nodes.value #>> '{}') ~* '([+]420|00420)[[:space:].-]*[0-9]{3}[[:space:].-]*[0-9]{3}[[:space:].-]*[0-9]{3}([^0-9]|$)'
        OR (nodes.value #>> '{}') ~* '(sb_secret_[[:alnum:]_-]{10,}|bearer[[:space:]]+[[:alnum:]_.-]{16,}|eyJ[[:alnum:]_-]{20,}[.]eyJ[[:alnum:]_-]{20,}|[?&]token=[[:alnum:]_.-]{20,})'
      )
  );
$function$;
REVOKE ALL ON FUNCTION private.rak_rotation_has_restricted_public_value(jsonb) FROM PUBLIC, anon, authenticated;
ALTER TABLE public.rotation_state DROP CONSTRAINT rak_rotation_no_public_secret_fields_v1;
ALTER TABLE public.rotation_state ADD CONSTRAINT rak_rotation_no_public_secret_fields_v2
  CHECK (payload IS NOT NULL
    AND NOT private.rak_rotation_has_restricted_public_key(payload)
    AND NOT private.rak_rotation_has_restricted_public_key(COALESCE(meta, '{}'::jsonb))
    AND NOT private.rak_rotation_has_restricted_public_value(payload)
    AND NOT private.rak_rotation_has_restricted_public_value(COALESCE(meta, '{}'::jsonb)));
COMMENT ON CONSTRAINT rak_rotation_no_public_secret_fields_v2 ON public.rotation_state IS
  'OS-only public rotation: block restricted JSON keys plus recognizable email, Czech phone and token text patterns. Names, absence codes, free text and other formats remain public; not an authentication control.';


-- ===== RaK production phase B 18/25: supabase/migrations/20260919085101_rak_public_rotation_remove_admin_actor_metadata.sql =====
-- TEST SUPABASE ONLY. Public rotation must not expose the administrator account identifier.
-- Authenticated administrative save RPC continues to write an audit event and private backups.
CREATE OR REPLACE FUNCTION private.rak_rotation_strip_public_actor_meta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $func$
BEGIN
  IF NEW.meta IS NOT NULL AND NEW.meta ? 'savedBy' THEN
    NEW.meta := NEW.meta - 'savedBy';
  END IF;
  RETURN NEW;
END;
$func$;
REVOKE ALL ON FUNCTION private.rak_rotation_strip_public_actor_meta() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER rak_rotation_strip_public_actor_meta_v1
BEFORE INSERT OR UPDATE ON public.rotation_state
FOR EACH ROW EXECUTE FUNCTION private.rak_rotation_strip_public_actor_meta();
UPDATE public.rotation_state
SET meta = meta - 'savedBy'
WHERE meta ? 'savedBy';
ALTER TABLE public.rotation_state
ADD CONSTRAINT rak_rotation_no_public_actor_meta_v1
CHECK (NOT (coalesce(meta, '{}'::jsonb) ? 'savedBy'));
COMMENT ON CONSTRAINT rak_rotation_no_public_actor_meta_v1 ON public.rotation_state IS
  'Public OS-only schedule does not expose the saving administrator account identifier; private audit and backups retain authorship.';


-- ===== RaK production phase B 19/25: supabase/migrations/20260919111542_rak_rotation_archive_import_provenance.sql =====
-- RaK 1.7.40. TEST Supabase ONLY. Preserve imported source metadata privately;
-- leave all rotation months, assignments, absence codes/notes and day changes intact.
CREATE TABLE private.rak_rotation_import_metadata_v1 (
  rotation_key text NOT NULL,
  month_key text NOT NULL,
  import_metadata jsonb NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (rotation_key, month_key)
);
REVOKE ALL ON TABLE private.rak_rotation_import_metadata_v1 FROM PUBLIC, anon, authenticated;
ALTER TABLE private.rak_rotation_import_metadata_v1 ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION private.rak_rotation_archive_import_metadata_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $fn$
DECLARE
  clean_months jsonb;
BEGIN
  IF jsonb_typeof(NEW.payload->'months') IS DISTINCT FROM 'object' THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_each(NEW.payload->'months') AS month(key, value)
    WHERE jsonb_typeof(month.value) = 'object' AND month.value ? 'importMeta'
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO private.rak_rotation_import_metadata_v1 AS archive (rotation_key, month_key, import_metadata)
  SELECT NEW.key, month.key, month.value->'importMeta'
  FROM jsonb_each(NEW.payload->'months') AS month(key, value)
  WHERE jsonb_typeof(month.value) = 'object' AND month.value ? 'importMeta'
  ON CONFLICT (rotation_key, month_key) DO UPDATE
    SET import_metadata = EXCLUDED.import_metadata,
        archived_at = now()
    WHERE archive.import_metadata IS DISTINCT FROM EXCLUDED.import_metadata;

  SELECT jsonb_object_agg(month.key,
    CASE WHEN jsonb_typeof(month.value) = 'object'
      THEN month.value - 'importMeta' ELSE month.value END)
    INTO clean_months
  FROM jsonb_each(NEW.payload->'months') AS month(key, value);
  NEW.payload := jsonb_set(NEW.payload, '{months}', coalesce(clean_months, '{}'::jsonb), false);
  RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION private.rak_rotation_archive_import_metadata_v1() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER rak_rotation_archive_import_metadata_v1
BEFORE INSERT OR UPDATE ON public.rotation_state
FOR EACH ROW EXECUTE FUNCTION private.rak_rotation_archive_import_metadata_v1();

-- The trigger archives every original importMeta before stripping it. No revision,
-- updated_at, author audit, backups or other month contents are changed.
UPDATE public.rotation_state AS state SET payload = state.payload
WHERE jsonb_typeof(state.payload->'months') = 'object'
  AND EXISTS (
    SELECT 1 FROM jsonb_each(state.payload->'months') AS month(key, value)
    WHERE jsonb_typeof(month.value) = 'object' AND month.value ? 'importMeta'
  );

-- Currently unused top-level identity column must never accidentally expose names.
ALTER TABLE public.rotation_state
  ADD CONSTRAINT rak_rotation_no_public_current_employee_name_v1
  CHECK (current_employee_name IS NULL);
ALTER TABLE public.rotation_state
  ADD CONSTRAINT rak_rotation_no_public_import_metadata_v1
  CHECK (NOT jsonb_path_exists(payload, '$.months.*.importMeta'));
COMMENT ON TABLE private.rak_rotation_import_metadata_v1 IS
  'Private Excel import provenance; never grant employee/anonymous API access.';


-- ===== RaK production phase B 20/25: supabase/migrations/20260919132743_rak_owner_complete_backup_include_private_rotation_import_provenance.sql =====
-- RaK 1.7.42. TEST DATABASE ONLY.
-- Preserve the existing owner-only snapshot format and all existing grants.
-- The private Excel import archive must be recoverable from a complete owner backup.
DO $patch$
DECLARE
  original text;
  anchor text := E'      ''public'', v_public_data,\n      ''auth'', jsonb_build_object(';
  replacement text := E'      ''public'', v_public_data,\n      ''private'', jsonb_build_object(\n        ''rak_rotation_import_metadata_v1'', (select coalesce(jsonb_agg(to_jsonb(t) order by t.rotation_key, t.month_key), ''[]''::jsonb) from private.rak_rotation_import_metadata_v1 t)\n      ),\n      ''auth'', jsonb_build_object(';
BEGIN
  original := pg_get_functiondef('public.rak_owner_complete_backup_v1()'::regprocedure);
  IF original IS NULL OR position('perform private.rak_require_admin(true);' IN original) = 0 THEN
    RAISE EXCEPTION 'Owner guard missing: refusing backup patch';
  END IF;
  IF position(replacement IN original) > 0 THEN RETURN; END IF;
  IF position(anchor IN original) = 0 OR position(anchor IN substring(original FROM position(anchor IN original) + length(anchor))) > 0 THEN
    RAISE EXCEPTION 'Unexpected backup layout: refusing patch';
  END IF;
  EXECUTE replace(original, anchor, replacement);
END;
$patch$;
COMMENT ON FUNCTION public.rak_owner_complete_backup_v1() IS
  'Owner-only redacted complete snapshot; includes private Excel import provenance (not login salts, sessions or passwords).';


-- ===== RaK production phase B 21/25: supabase/migrations/20260919140220_rak_public_rotation_contact_os_guard_v3.sql =====
-- RaK 1.7.44 / TEST Supabase only: harden accidental contact and OS-number leaks in public rotation JSON.
-- Does NOT secure names/absences/free-form prose already in public rotation; OS-only login unchanged.
CREATE OR REPLACE FUNCTION private.rak_rotation_has_restricted_public_value(p_document jsonb)
RETURNS boolean
LANGUAGE sql IMMUTABLE STRICT
SET search_path TO ''
AS $function$
  WITH RECURSIVE nodes(value, depth) AS (
    SELECT p_document, 0
    UNION ALL
    SELECT child.value, nodes.depth + 1
    FROM nodes
    CROSS JOIN LATERAL (
      SELECT item.value FROM pg_catalog.jsonb_each(
        CASE WHEN pg_catalog.jsonb_typeof(nodes.value) = 'object' THEN nodes.value ELSE '{}'::jsonb END
      ) AS item
      UNION ALL
      SELECT item.value FROM pg_catalog.jsonb_array_elements(
        CASE WHEN pg_catalog.jsonb_typeof(nodes.value) = 'array' THEN nodes.value ELSE '[]'::jsonb END
      ) AS item
    ) AS child
    WHERE nodes.depth < 32
  )
  SELECT EXISTS (
    SELECT 1 FROM nodes
    WHERE pg_catalog.jsonb_typeof(nodes.value) = 'string'
      AND (
        (nodes.value #>> '{}') ~* '[[:alnum:]._%+-]+@[[:alnum:].-]+[.][[:alpha:]]{2,}'
        OR (nodes.value #>> '{}') ~* '(^|[^[:digit:]])([+]420|00420)[[:space:].-]*[0-9]{3}[[:space:].-]*[0-9]{3}[[:space:].-]*[0-9]{3}([^[:digit:]]|$)'
        OR (nodes.value #>> '{}') ~* '(^|[^[:alnum:]])(telefon|tel[.]?|mobil|sms|kontakt)[[:space:]:#.-]*[0-9]{3}[[:space:].-]*[0-9]{3}[[:space:].-]*[0-9]{3}([^[:digit:]]|$)'
        OR (nodes.value #>> '{}') ~* '(^|[^[:alnum:]])(osobn[íi][[:space:]]+[čc][íi]slo|os[.]?[[:space:]]*[čc][íi]slo|os[.]?[[:space:]]*[čc][.]?)[[:space:]:#=.-]*[0-9]{4,10}([^[:digit:]]|$)'
        OR (nodes.value #>> '{}') ~* '(sb_secret_[[:alnum:]_-]{10,}|bearer[[:space:]]+[[:alnum:]_.-]{16,}|eyJ[[:alnum:]_-]{20,}[.]eyJ[[:alnum:]_-]{20,}|[?&]token=[[:alnum:]_.-]{20,})'
      )
  );
$function$;
REVOKE ALL ON FUNCTION private.rak_rotation_has_restricted_public_value(jsonb) FROM PUBLIC, anon, authenticated;
COMMENT ON FUNCTION private.rak_rotation_has_restricted_public_value(jsonb) IS
  'Public rotation defensive input guard: email, correctly prefixed Czech phone, context-labelled national phone/OS number, tokens; does not hide names, absence or free text.';
COMMENT ON CONSTRAINT rak_rotation_no_public_secret_fields_v2 ON public.rotation_state IS
  'Restrict nested keys and recognizable contact, labelled OS-number and credential values. Public names, absence codes and other notes remain visible under OS-only login.';
DO $check$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.rotation_state
    WHERE private.rak_rotation_has_restricted_public_value(payload)
       OR private.rak_rotation_has_restricted_public_value(COALESCE(meta, '{}'::jsonb))
  ) THEN
    RAISE EXCEPTION 'Existing rotation violates 1.7.44 guard; rollback migration';
  END IF;
END;
$check$;


-- ===== RaK production phase B 22/25: supabase/migrations/20260919145342_rak_17046_telemetry_admission_and_backup_integrity.sql =====
-- RaK 1.7.46 / TEST Supabase only. No employee login or production changes.
-- Keepalive is best-effort telemetry, not proof of identity; bound writes independently of client device keys.
CREATE OR REPLACE FUNCTION public.rak_app_keepalive(
  p_device_key text, p_app_version text DEFAULT NULL, p_user_agent text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE
  v_device_key text := pg_catalog.btrim(COALESCE(p_device_key, ''));
  v_app_version text := pg_catalog.left(COALESCE(p_app_version, ''), 40);
  v_user_agent text := pg_catalog.left(COALESCE(p_user_agent, ''), 300);
  v_raw_payload jsonb := COALESCE(p_payload, '{}'::jsonb);
  v_payload jsonb;
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_hits integer;
  v_previous timestamptz;
BEGIN
  IF pg_catalog.char_length(v_device_key) NOT BETWEEN 8 AND 80 OR pg_catalog.octet_length(v_device_key)>160 THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='invalid_device_key';
  END IF;
  IF pg_catalog.jsonb_typeof(v_raw_payload) IS DISTINCT FROM 'object' THEN v_raw_payload:='{}'::jsonb; END IF;
  IF pg_catalog.octet_length(v_raw_payload::text)>4096 THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='keepalive_payload_too_large';
  END IF;
  -- Unknown fields (notably employee identifiers) are not persisted.
  SELECT COALESCE(pg_catalog.jsonb_object_agg(item.key,item.value),'{}'::jsonb)
  INTO v_payload FROM pg_catalog.jsonb_each(v_raw_payload) AS item
  WHERE item.key IN ('build','online','reason','timezone','transport');
  IF pg_catalog.octet_length(v_payload::text)>1024 OR EXISTS (
    SELECT 1 FROM pg_catalog.jsonb_each(v_payload) AS item
    WHERE pg_catalog.jsonb_typeof(item.value) NOT IN ('string','number','boolean','null')
  ) THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='keepalive_payload_invalid'; END IF;
  -- Same lock as bounded device admission: concurrent requests cannot skip the global quota.
  PERFORM pg_catalog.pg_advisory_xact_lock(17025,1);
  INSERT INTO private.rak_login_lookup_budget AS budget (hour_start,caller_key,hits)
  VALUES (pg_catalog.date_trunc('hour',v_now),'telemetry-keepalive-global-v1',1)
  ON CONFLICT(hour_start,caller_key) DO UPDATE SET hits=LEAST(budget.hits+1,6001)
  RETURNING hits INTO v_hits;
  IF v_hits > 6000 THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='keepalive_rate_limited'; END IF;
  SELECT heartbeat_at INTO v_previous FROM public.app_keepalive WHERE device_key=v_device_key;
  -- Maintain old-client response shape, but do not write the same device again for 15 seconds.
  IF v_previous IS NOT NULL AND v_previous > v_now - interval '15 seconds' THEN
    RETURN pg_catalog.jsonb_build_object('ok',true,'heartbeat_at',v_previous,'device_key',v_device_key,'throttled',true);
  END IF;
  IF v_previous IS NULL AND (SELECT count(*) FROM public.app_keepalive)>=256 THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='keepalive_device_capacity_reached';
  END IF;
  INSERT INTO public.app_keepalive(device_key,app_version,heartbeat_at,user_agent,payload)
  VALUES(v_device_key,NULLIF(v_app_version,''),v_now,NULLIF(v_user_agent,''),v_payload)
  ON CONFLICT(device_key) DO UPDATE SET
    app_version=excluded.app_version,heartbeat_at=excluded.heartbeat_at,
    user_agent=excluded.user_agent,payload=excluded.payload;
  RETURN pg_catalog.jsonb_build_object('ok',true,'heartbeat_at',v_now,'device_key',v_device_key);
END;
$function$;
REVOKE ALL ON FUNCTION public.rak_app_keepalive(text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rak_app_keepalive(text,text,text,jsonb) TO anon,authenticated;
COMMENT ON FUNCTION public.rak_app_keepalive(text,text,text,jsonb) IS
 'RaK 1.7.46: 6000/hour global telemetry quota, 15s write dedup, allowlisted scalar payload; not identity authentication.';
-- Reject malformed future backup snapshots before they can be offered for restoration.
ALTER TABLE public.rak_rotation_backups_v2 ADD CONSTRAINT rak_rotation_backup_structure_v1 CHECK ((
 pg_catalog.jsonb_typeof(payload)='object' AND pg_catalog.jsonb_typeof(payload->'months')='object'
 AND payload->'months'<>'{}'::jsonb AND pg_catalog.jsonb_typeof(meta)='object'
 AND revision>=0 AND pg_catalog.octet_length(payload::text)<=8000000
) IS TRUE);


-- ===== RaK production phase B 23/25: supabase/migrations/20260919153000_rak_17047_privacy_keys_machine_guard_backup_months.sql =====
-- RaK 1.7.47 / TEST Supabase only. Public rotation remains accessible until OS-only-compatible cutover.
-- Defense-in-depth: block additional explicit identifiers in new public rotation JSON.
CREATE OR REPLACE FUNCTION private.rak_rotation_has_restricted_public_key(p_document jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE STRICT SET search_path = ''
AS $function$
  WITH RECURSIVE nodes(value, depth) AS (
    SELECT p_document, 0
    UNION ALL
    SELECT child.value, nodes.depth + 1
    FROM nodes CROSS JOIN LATERAL (
      SELECT item.value FROM pg_catalog.jsonb_each(
        CASE WHEN pg_catalog.jsonb_typeof(nodes.value) = 'object' THEN nodes.value ELSE '{}'::jsonb END) item
      UNION ALL
      SELECT item.value FROM pg_catalog.jsonb_array_elements(
        CASE WHEN pg_catalog.jsonb_typeof(nodes.value) = 'array' THEN nodes.value ELSE '[]'::jsonb END) item
    ) child WHERE nodes.depth < 32
  )
  SELECT EXISTS (
    SELECT 1 FROM nodes
    CROSS JOIN LATERAL pg_catalog.jsonb_object_keys(
      CASE WHEN pg_catalog.jsonb_typeof(nodes.value) = 'object' THEN nodes.value ELSE '{}'::jsonb END
    ) candidate(field_name)
    WHERE pg_catalog.lower(pg_catalog.regexp_replace(candidate.field_name,'[^a-zA-Z0-9]','','g')) = ANY (
      ARRAY['email','emailaddress','mailaddress','phone','phonenumber','telephone','telefon','mobil','mobile',
        'address','adresa','homeaddress','postaladdress','contact','kontakt',
        'password','pwd','passcode','heslo','pin','pincode',
        'token','accesstoken','refreshtoken','jwt','secret','apikey','servicekey','privatekey',
        'session','sessionid','credentials','credential',
        'birthdate','dateofbirth','rodnecislo','medical','health','healthnote','diagnosis','diagnoza',
        'privatenote','privatecomment',
        'accountnumber','accountid','employeeid','employeenumber','personalnumber','personalid',
        'osnumber','osid','nationalid','birthnumber','socialsecuritynumber',
        'userid','useremail','userphone','fullname','firstname','lastname','surname',
        'workers','roster','staff','employees','appaccounts','applicationaccounts']::text[]
    ) OR (nodes.depth = 32 AND pg_catalog.jsonb_typeof(nodes.value) IN ('object','array')
          AND nodes.value NOT IN ('{}'::jsonb,'[]'::jsonb))
  );
$function$;
REVOKE ALL ON FUNCTION private.rak_rotation_has_restricted_public_key(jsonb) FROM PUBLIC,anon,authenticated;
COMMENT ON FUNCTION private.rak_rotation_has_restricted_public_key(jsonb) IS
 'RaK 1.7.47 defense-in-depth: block nested contact, login, employee identifiers and secrets in public JSON; person/absence data still public.';

-- The legacy machine_settings table holds both public calculator settings and private rows.
-- Preserve private data and reject NEW public settings containing restricted identifiers.
CREATE OR REPLACE FUNCTION private.rak_machine_settings_no_public_leak_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_settings jsonb := COALESCE(NEW.settings_json,'{}'::jsonb);
  v_category text := pg_catalog.lower(COALESCE(NEW.category,''));
  v_key text := pg_catalog.upper(COALESCE(NEW.machine_key,''));
  v_stored_category text := pg_catalog.lower(COALESCE(v_settings->>'stored_category',''));
  v_type text := pg_catalog.lower(COALESCE(v_settings->>'type',''));
  v_stored_key text := pg_catalog.upper(COALESCE(v_settings->>'admin_settings_key',''));
  v_private_categories text[] := ARRAY[
    'admin_accounts_settings','admin_full_settings_backup','admin_change_log',
    'rotation_save_backup','worker_roster_settings'];
BEGIN
  IF v_category = ANY(v_private_categories)
    OR v_stored_category = ANY(v_private_categories)
    OR v_type = ANY(v_private_categories)
    OR v_key IN ('ADMIN_ACCOUNTS_SETTINGS','ADMIN_CHANGE_LOG','WORKER_ROSTER_SETTINGS')
    OR v_stored_key IN ('ADMIN_ACCOUNTS_SETTINGS','ADMIN_CHANGE_LOG','WORKER_ROSTER_SETTINGS')
    OR v_key LIKE 'ADMIN_FULL_SETTINGS_BACKUP_%'
    OR v_stored_key LIKE 'ADMIN_FULL_SETTINGS_BACKUP_%'
    OR v_key LIKE 'ROTATION_SAVE_BACKUP_%'
    OR v_stored_key LIKE 'ROTATION_SAVE_BACKUP_%' THEN
    RETURN NEW; -- these categories are excluded from anonymous reads by existing restrictive RLS
  END IF;
  IF pg_catalog.jsonb_typeof(v_settings) IS DISTINCT FROM 'object'
    OR private.rak_rotation_has_restricted_public_key(v_settings)
    OR private.rak_rotation_has_restricted_public_value(v_settings) THEN
    RAISE EXCEPTION 'Public machine settings contain restricted data' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.rak_machine_settings_no_public_leak_v1() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS rak_machine_settings_no_public_leak_v1 ON public.machine_settings;
CREATE TRIGGER rak_machine_settings_no_public_leak_v1
BEFORE INSERT OR UPDATE ON public.machine_settings
FOR EACH ROW EXECUTE FUNCTION private.rak_machine_settings_no_public_leak_v1();

-- Full restore candidates must have valid internal month and note structures.
CREATE OR REPLACE FUNCTION private.rak_rotation_backup_months_shape_v1(p_payload jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE STRICT SET search_path = ''
AS $function$
  SELECT COALESCE(
    pg_catalog.jsonb_typeof(p_payload) = 'object'
    AND pg_catalog.jsonb_typeof(p_payload->'months') = 'object'
    AND p_payload->'months' <> '{}'::jsonb
    AND NOT EXISTS (
      SELECT 1 FROM pg_catalog.jsonb_each(
        CASE WHEN pg_catalog.jsonb_typeof(p_payload->'months')='object'
          THEN p_payload->'months' ELSE '{}'::jsonb END
      ) month(month_key,month_value)
      WHERE pg_catalog.jsonb_typeof(month.month_value) IS DISTINCT FROM 'object'
        OR pg_catalog.jsonb_typeof(month.month_value->'hard') IS DISTINCT FROM 'object'
        OR pg_catalog.jsonb_typeof(month.month_value->'soft') IS DISTINCT FROM 'object'
        OR pg_catalog.jsonb_typeof(month.month_value->'notes') IS DISTINCT FROM 'array'
        OR (month.month_value ? 'dayMods' AND
            pg_catalog.jsonb_typeof(month.month_value->'dayMods') NOT IN ('array','null'))
        OR EXISTS (
          SELECT 1 FROM pg_catalog.jsonb_array_elements(
            CASE WHEN pg_catalog.jsonb_typeof(month.month_value->'notes')='array'
              THEN month.month_value->'notes' ELSE '[]'::jsonb END
          ) note(item)
          WHERE pg_catalog.jsonb_typeof(note.item) IS DISTINCT FROM 'object'
            OR pg_catalog.jsonb_typeof(note.item->'date') IS DISTINCT FROM 'string'
            OR pg_catalog.jsonb_typeof(note.item->'person') IS DISTINCT FROM 'string'
            OR pg_catalog.jsonb_typeof(note.item->'code') IS DISTINCT FROM 'string'
            OR pg_catalog.jsonb_typeof(note.item->'text') IS DISTINCT FROM 'string'
            OR pg_catalog.jsonb_typeof(note.item->'shift') IS DISTINCT FROM 'string'
        )
    ),false
  );
$function$;
REVOKE ALL ON FUNCTION private.rak_rotation_backup_months_shape_v1(jsonb) FROM PUBLIC,anon,authenticated;
ALTER TABLE public.rak_rotation_backups_v2
 ADD CONSTRAINT rak_rotation_backup_months_shape_v1
 CHECK (private.rak_rotation_backup_months_shape_v1(payload) IS TRUE);
COMMENT ON CONSTRAINT rak_rotation_backup_months_shape_v1 ON public.rak_rotation_backups_v2 IS
 'RaK 1.7.47 checks hard/soft/notes/dayMods and typed note fields in each archived month; historical importMeta preserved.';
DO $verify$
BEGIN
  IF EXISTS (SELECT 1 FROM public.rak_rotation_backups_v2
      WHERE NOT private.rak_rotation_backup_months_shape_v1(payload)) THEN
    RAISE EXCEPTION 'Legacy backup failed deep shape validation';
  END IF;
  IF EXISTS (SELECT 1 FROM public.rotation_state
      WHERE private.rak_rotation_has_restricted_public_key(payload)
         OR private.rak_rotation_has_restricted_public_key(COALESCE(meta,'{}'::jsonb))) THEN
    RAISE EXCEPTION 'Existing rotation contains newly blocked keys';
  END IF;
  IF EXISTS (SELECT 1 FROM public.machine_settings m
      WHERE NOT (pg_catalog.lower(COALESCE(m.category,''))=ANY(ARRAY[
        'admin_accounts_settings','admin_full_settings_backup','admin_change_log','rotation_save_backup','worker_roster_settings'])
        OR pg_catalog.lower(COALESCE(m.settings_json->>'stored_category',''))=ANY(ARRAY[
        'admin_accounts_settings','admin_full_settings_backup','admin_change_log','rotation_save_backup','worker_roster_settings'])
        OR pg_catalog.lower(COALESCE(m.settings_json->>'type',''))=ANY(ARRAY[
        'admin_accounts_settings','admin_full_settings_backup','admin_change_log','rotation_save_backup','worker_roster_settings']))
        AND (private.rak_rotation_has_restricted_public_key(m.settings_json)
          OR private.rak_rotation_has_restricted_public_value(m.settings_json))) THEN
    RAISE EXCEPTION 'Existing public machine settings contain restricted data';
  END IF;
END;
$verify$;


-- ===== RaK production phase B 24/25: supabase/migrations/20260919185000_rak_17050_case_insensitive_private_settings_rls.sql =====
-- RaK 1.7.50, TEST Supabase only. Additional RESTRICTIVE SELECT policies
-- close mixed-case private-category/key leaks without changing existing policies.
-- A verified owner/admin session retains the existing private-data read path.
CREATE POLICY rak_machine_settings_anon_casefold_private_v10
ON public.machine_settings AS RESTRICTIVE FOR SELECT TO anon
USING (NOT (
  pg_catalog.lower(pg_catalog.btrim(COALESCE(category,''))) = ANY (ARRAY['admin_accounts_settings','admin_full_settings_backup','admin_change_log','rotation_save_backup','worker_roster_settings'])
  OR pg_catalog.upper(pg_catalog.btrim(COALESCE(machine_key,''))) = ANY (ARRAY['ADMIN_ACCOUNTS_SETTINGS','ADMIN_CHANGE_LOG','WORKER_ROSTER_SETTINGS'])
  OR pg_catalog.upper(pg_catalog.btrim(COALESCE(machine_key,''))) LIKE 'ADMIN_FULL_SETTINGS_BACKUP_%'
  OR pg_catalog.upper(pg_catalog.btrim(COALESCE(machine_key,''))) LIKE 'ROTATION_SAVE_BACKUP_%'
  OR pg_catalog.lower(pg_catalog.btrim(COALESCE(settings_json->>'stored_category',''))) = ANY (ARRAY['admin_accounts_settings','admin_full_settings_backup','admin_change_log','rotation_save_backup','worker_roster_settings'])
  OR pg_catalog.lower(pg_catalog.btrim(COALESCE(settings_json->>'type',''))) = ANY (ARRAY['admin_accounts_settings','admin_full_settings_backup','admin_change_log','rotation_save_backup','worker_roster_settings'])
  OR pg_catalog.upper(pg_catalog.btrim(COALESCE(settings_json->>'admin_settings_key',''))) = ANY (ARRAY['ADMIN_ACCOUNTS_SETTINGS','ADMIN_CHANGE_LOG','WORKER_ROSTER_SETTINGS'])
  OR pg_catalog.upper(pg_catalog.btrim(COALESCE(settings_json->>'admin_settings_key',''))) LIKE 'ADMIN_FULL_SETTINGS_BACKUP_%'
  OR pg_catalog.upper(pg_catalog.btrim(COALESCE(settings_json->>'admin_settings_key',''))) LIKE 'ROTATION_SAVE_BACKUP_%'
));
CREATE POLICY rak_machine_settings_authenticated_casefold_private_v10
ON public.machine_settings AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  (SELECT private.rak_is_admin())
  OR NOT (
    pg_catalog.lower(pg_catalog.btrim(COALESCE(category,''))) = ANY (ARRAY['admin_accounts_settings','admin_full_settings_backup','admin_change_log','rotation_save_backup','worker_roster_settings'])
    OR pg_catalog.upper(pg_catalog.btrim(COALESCE(machine_key,''))) = ANY (ARRAY['ADMIN_ACCOUNTS_SETTINGS','ADMIN_CHANGE_LOG','WORKER_ROSTER_SETTINGS'])
    OR pg_catalog.upper(pg_catalog.btrim(COALESCE(machine_key,''))) LIKE 'ADMIN_FULL_SETTINGS_BACKUP_%'
    OR pg_catalog.upper(pg_catalog.btrim(COALESCE(machine_key,''))) LIKE 'ROTATION_SAVE_BACKUP_%'
    OR pg_catalog.lower(pg_catalog.btrim(COALESCE(settings_json->>'stored_category',''))) = ANY (ARRAY['admin_accounts_settings','admin_full_settings_backup','admin_change_log','rotation_save_backup','worker_roster_settings'])
    OR pg_catalog.lower(pg_catalog.btrim(COALESCE(settings_json->>'type',''))) = ANY (ARRAY['admin_accounts_settings','admin_full_settings_backup','admin_change_log','rotation_save_backup','worker_roster_settings'])
    OR pg_catalog.upper(pg_catalog.btrim(COALESCE(settings_json->>'admin_settings_key',''))) = ANY (ARRAY['ADMIN_ACCOUNTS_SETTINGS','ADMIN_CHANGE_LOG','WORKER_ROSTER_SETTINGS'])
    OR pg_catalog.upper(pg_catalog.btrim(COALESCE(settings_json->>'admin_settings_key',''))) LIKE 'ADMIN_FULL_SETTINGS_BACKUP_%'
    OR pg_catalog.upper(pg_catalog.btrim(COALESCE(settings_json->>'admin_settings_key',''))) LIKE 'ROTATION_SAVE_BACKUP_%'
  )
);
COMMENT ON POLICY rak_machine_settings_anon_casefold_private_v10 ON public.machine_settings IS 'RaK 1.7.50: deny case-insensitive private settings to anonymous clients, including legacy mixed-case categories and keys.';
COMMENT ON POLICY rak_machine_settings_authenticated_casefold_private_v10 ON public.machine_settings IS 'RaK 1.7.50: non-admin sessions cannot read mixed-case private settings; verified administrators remain authorized.';


-- ===== RaK production phase B 25/25: supabase/migrations/20260923045532_rak_block_login_number_in_public_machine_settings.sql =====
-- TEST Supabase migration applied as 20260923045532. Production remains unchanged.
-- Defense-in-depth: loginNumber was already hidden by recursive RLS; reject it at the public machine-settings write boundary too.
-- Reverse procedure (TEST only): restore the previous function definition from
-- 20260919153000_rak_17047_privacy_keys_machine_guard_backup_months.sql and rerun the security matrices.
CREATE OR REPLACE FUNCTION private.rak_rotation_has_restricted_public_key(p_document jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE STRICT SET search_path = ''
AS $function$
  WITH RECURSIVE nodes(value, depth) AS (
    SELECT p_document, 0
    UNION ALL
    SELECT child.value, nodes.depth + 1
    FROM nodes CROSS JOIN LATERAL (
      SELECT item.value FROM pg_catalog.jsonb_each(
        CASE WHEN pg_catalog.jsonb_typeof(nodes.value) = 'object' THEN nodes.value ELSE '{}'::jsonb END) item
      UNION ALL
      SELECT item.value FROM pg_catalog.jsonb_array_elements(
        CASE WHEN pg_catalog.jsonb_typeof(nodes.value) = 'array' THEN nodes.value ELSE '[]'::jsonb END) item
    ) child WHERE nodes.depth < 32
  )
  SELECT EXISTS (
    SELECT 1 FROM nodes
    CROSS JOIN LATERAL pg_catalog.jsonb_object_keys(
      CASE WHEN pg_catalog.jsonb_typeof(nodes.value) = 'object' THEN nodes.value ELSE '{}'::jsonb END
    ) candidate(field_name)
    WHERE pg_catalog.lower(pg_catalog.regexp_replace(candidate.field_name,'[^a-zA-Z0-9]','','g')) = ANY (
      ARRAY['email','emailaddress','mailaddress','phone','phonenumber','telephone','telefon','mobil','mobile',
        'address','adresa','homeaddress','postaladdress','contact','kontakt',
        'password','pwd','passcode','heslo','pin','pincode',
        'token','accesstoken','refreshtoken','jwt','secret','apikey','servicekey','privatekey',
        'session','sessionid','credentials','credential',
        'birthdate','dateofbirth','rodnecislo','medical','health','healthnote','diagnosis','diagnoza',
        'privatenote','privatecomment',
        'accountnumber','accountid','employeeid','employeenumber','personalnumber','personalid',
        'osnumber','osid','loginnumber','nationalid','birthnumber','socialsecuritynumber',
        'userid','useremail','userphone','fullname','firstname','lastname','surname',
        'workers','roster','staff','employees','appaccounts','applicationaccounts']::text[]
    ) OR (nodes.depth = 32 AND pg_catalog.jsonb_typeof(nodes.value) IN ('object','array')
          AND nodes.value NOT IN ('{}'::jsonb,'[]'::jsonb))
  );
$function$;
REVOKE ALL ON FUNCTION private.rak_rotation_has_restricted_public_key(jsonb) FROM PUBLIC, anon, authenticated;
COMMENT ON FUNCTION private.rak_rotation_has_restricted_public_key(jsonb) IS
 'RaK TEST defense-in-depth: block nested contact, login, employee identifiers (including loginNumber) and secrets in public JSON; person/absence data in public rotation remains an accepted OS-only risk.';
;
