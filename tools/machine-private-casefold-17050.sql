-- RaK 1.7.50: destructive-free test for mixed-case PRIVATE settings. TEST DB ONLY.
-- No employee information; every synthetic row disappears at ROLLBACK.
BEGIN;
DO $verify_policies$
BEGIN
  IF (SELECT count(*) FROM pg_catalog.pg_policies
      WHERE schemaname='public' AND tablename='machine_settings'
        AND policyname IN ('rak_machine_settings_anon_casefold_private_v10',
          'rak_machine_settings_authenticated_casefold_private_v10')
        AND permissive='RESTRICTIVE') <> 2 THEN
    RAISE EXCEPTION 'Case-insensitive restrictive SELECT policies missing';
  END IF;
END;
$verify_policies$;
INSERT INTO public.machine_settings(machine_key,label,category,settings_json) VALUES
 ('RAK_17050_CASE_PROBE_1','RAK_17050_CASE_PROBE','ADMIN_ACCOUNTS_SETTINGS','{"probe":"synthetic"}'::jsonb),
 ('RAK_17050_CASE_PROBE_2','RAK_17050_CASE_PROBE','general','{"type":"AdMiN_ChAnGe_LoG","probe":"synthetic"}'::jsonb),
 ('rak_17050_case_probe_3','RAK_17050_CASE_PROBE','general','{"admin_settings_key":"admin_full_settings_backup_probe"}'::jsonb),
 ('rotation_save_backup_case_probe_4','RAK_17050_CASE_PROBE','general','{}'::jsonb),
 ('RAK_17050_CASE_PROBE_5','RAK_17050_CASE_PROBE','general','{"stored_category":"Worker_Roster_Settings"}'::jsonb);
SET LOCAL ROLE anon;
DO $anon$
BEGIN
  IF EXISTS (SELECT 1 FROM public.machine_settings WHERE label='RAK_17050_CASE_PROBE') THEN
    RAISE EXCEPTION 'Mixed-case PRIVATE settings leaked anonymously';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.machine_settings WHERE category='brus') THEN
    RAISE EXCEPTION 'Public brush settings became invisible';
  END IF;
  IF pg_catalog.has_table_privilege('anon','public.rak_admin_settings_backups','SELECT') THEN
    RAISE EXCEPTION 'Anonymous owner backup grant found';
  END IF;
END;
$anon$;
SET LOCAL ROLE authenticated;
DO $authenticated$
BEGIN
  IF EXISTS (SELECT 1 FROM public.machine_settings WHERE label='RAK_17050_CASE_PROBE') THEN
    RAISE EXCEPTION 'Unauthorised authenticated session can read PRIVATE settings';
  END IF;
END;
$authenticated$;
RESET ROLE;
SELECT 'PASS: 5 synthetic mixed-case variants inaccessible to anon and unauthorised authenticated; public settings intact; rollback' AS result;
ROLLBACK;
