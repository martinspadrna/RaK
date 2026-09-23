-- RaK test-only regression. Run in test Supabase SQL editor.
-- Every fixture and simulated request claim is rolled back.
-- Login V2 is intentionally anonymous: it inherits V1 rate limits and only adds the admin-auth prompt flag.
BEGIN;
DO $setup$
DECLARE v_uid uuid; v_sid uuid; v_claims text; v_public text[];
BEGIN
  SELECT array_agg(p.proname ORDER BY p.proname) INTO v_public
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname LIKE 'rak_%'
    AND has_function_privilege('anon', p.oid, 'EXECUTE');
  IF v_public IS DISTINCT FROM ARRAY[
    'rak_admin_account_requires_auth', 'rak_admin_auth_capabilities',
    'rak_app_keepalive', 'rak_lookup_account_for_login_v1',
    'rak_lookup_account_for_login_v2', 'rak_submit_bug_report_v2'
  ]::text[] THEN
    RAISE EXCEPTION 'Anonymous RPC allowlist changed; review before release';
  END IF;
  IF EXISTS (SELECT 1 FROM public.machine_settings
             WHERE machine_key = 'RAK_RLS_ADMIN_TYPE_TEST_FIXTURE') THEN
    RAISE EXCEPTION 'RLS fixture key already exists';
  END IF;
  SELECT p.user_id, s.id INTO v_uid, v_sid
  FROM public.rak_admin_profiles p
  JOIN auth.sessions s ON s.user_id = p.user_id
  WHERE p.enabled AND p.role = 'owner'
  ORDER BY s.created_at DESC LIMIT 1;
  IF v_uid IS NULL OR v_sid IS NULL THEN
    RAISE EXCEPTION 'Verified owner session fixture unavailable';
  END IF;
  v_claims := pg_catalog.jsonb_build_object(
    'sub', v_uid, 'session_id', v_sid, 'role', 'authenticated'
  )::text;
  PERFORM set_config('rak.public_surface_test_claims', v_claims, true);
  INSERT INTO public.machine_settings(machine_key,label,category,settings_json)
  VALUES ('RAK_RLS_ADMIN_TYPE_TEST_FIXTURE', 'Rollback-only security test',
          'frezka', '{"type":"admin_full_settings_backup"}'::jsonb);
END
$setup$;

SET LOCAL ROLE anon;
DO $anonymous$
BEGIN
  IF (SELECT count(*) FROM public.machine_settings
      WHERE machine_key = 'RAK_RLS_ADMIN_TYPE_TEST_FIXTURE') <> 0 THEN
    RAISE EXCEPTION 'Anonymous account can read disguised admin JSON';
  END IF;
  IF EXISTS (SELECT 1 FROM public.machine_settings
      WHERE COALESCE(settings_json->>'type','') IN
        ('admin_accounts_settings','admin_full_settings_backup')) THEN
    RAISE EXCEPTION 'Anonymous account can read admin JSON types';
  END IF;
END
$anonymous$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{}', true);
DO $without_session$
BEGIN
  IF (SELECT count(*) FROM public.machine_settings
      WHERE machine_key = 'RAK_RLS_ADMIN_TYPE_TEST_FIXTURE') <> 0 THEN
    RAISE EXCEPTION 'Unsigned authenticated role can read disguised admin JSON';
  END IF;
END
$without_session$;

SELECT set_config('request.jwt.claims',
                  current_setting('rak.public_surface_test_claims'), true);
DO $verified_owner$
BEGIN
  IF public.rak_admin_context()->>'role' <> 'owner' THEN
    RAISE EXCEPTION 'Verified owner session not accepted';
  END IF;
  IF (SELECT count(*) FROM public.machine_settings
      WHERE machine_key = 'RAK_RLS_ADMIN_TYPE_TEST_FIXTURE') <> 1 THEN
    RAISE EXCEPTION 'Verified owner cannot read admin JSON';
  END IF;
END
$verified_owner$;
ROLLBACK;
SELECT 'OK: anonymous RPC allowlist verified; disguised admin JSON blocked for anon/unsigned and visible to owner; rollback complete' AS result;
