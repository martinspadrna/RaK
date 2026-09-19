-- RaK 1.7.49 TEST-only security matrix. All synthetic records are rolled back.
-- Confirm private tables are inaccessible, the five deliberate anonymous RPCs are exact,
-- anonymous bug reports survive and arbitrary device metadata cannot be stored.
BEGIN;
DO $audit$
DECLARE v_n integer;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity)
  THEN RAISE EXCEPTION 'public table without RLS'; END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r'
    AND c.relname NOT IN ('announcements','machine_settings','rotation_state')
    AND (pg_catalog.has_any_column_privilege('anon',c.oid,'SELECT')
      OR pg_catalog.has_any_column_privilege('authenticated',c.oid,'SELECT')
      OR pg_catalog.has_table_privilege('anon',c.oid,'INSERT,UPDATE,DELETE')
      OR pg_catalog.has_table_privilege('authenticated',c.oid,'INSERT,UPDATE,DELETE')))
  THEN RAISE EXCEPTION 'private table granted to frontend'; END IF;
  SELECT count(*) INTO v_n FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef AND pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE');
  IF v_n<>5 OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef AND pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
      AND p.proname NOT IN ('rak_admin_account_requires_auth','rak_app_keepalive',
        'rak_lookup_account_for_login_v1','rak_lookup_account_for_login_v2','rak_submit_bug_report_v2'))
  THEN RAISE EXCEPTION 'unexpected anonymous privileged API count %',v_n; END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='private' AND pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE'))
  THEN RAISE EXCEPTION 'private helper executable by anonymous role'; END IF;
  IF EXISTS (SELECT 1 FROM public.bug_reports WHERE message='RAK_17049_TEST_PRIVATE_KEYS')
  THEN RAISE EXCEPTION 'preexisting regression marker'; END IF;
END $audit$;
SET LOCAL ROLE anon;
DO $test$
DECLARE first_result jsonb; duplicate_result jsonb; private_n integer;
BEGIN
  SELECT count(*) INTO private_n FROM public.machine_settings
    WHERE pg_catalog.lower(coalesce(settings_json->>'stored_category',''))=ANY(ARRAY[
      'admin_accounts_settings','admin_full_settings_backup','admin_change_log','rotation_save_backup','worker_roster_settings'])
      OR pg_catalog.lower(coalesce(settings_json->>'type',''))=ANY(ARRAY[
      'admin_accounts_settings','admin_full_settings_backup','admin_change_log','rotation_save_backup','worker_roster_settings'])
      OR pg_catalog.upper(coalesce(settings_json->>'admin_settings_key','')) IN
        ('ADMIN_ACCOUNTS_SETTINGS','ADMIN_CHANGE_LOG','WORKER_ROSTER_SETTINGS')
      OR pg_catalog.upper(coalesce(settings_json->>'admin_settings_key','')) LIKE 'ROTATION_SAVE_BACKUP_%'
      OR pg_catalog.upper(coalesce(settings_json->>'admin_settings_key','')) LIKE 'ADMIN_FULL_SETTINGS_BACKUP_%';
  IF private_n<>0 THEN RAISE EXCEPTION 'anonymous machine settings privacy leak %',private_n; END IF;
  IF pg_catalog.has_table_privilege('anon','public.bug_reports','SELECT')
    OR pg_catalog.has_table_privilege('anon','public.bug_reports','INSERT')
    OR pg_catalog.has_table_privilege('anon','public.game_accounts','SELECT')
    OR pg_catalog.has_function_privilege('anon','private.rak_bug_report_device_info_allowlist_v1(jsonb)','EXECUTE')
  THEN RAISE EXCEPTION 'anonymous private table/helper privilege regression'; END IF;
  first_result:=public.rak_submit_bug_report_v2(NULL,'Test','chyba',
    'RAK_17049_TEST_PRIVATE_KEYS','1.7.49','/test','test-agent',
    '{"sourceId":"rak-17049-source","appearanceId":"glass","appearanceLabel":"Glass", "createdAtLocal":"2026-09-19T12:00:00Z","online":true,"viewport":{"width":390,"height":844,"dpr":3,"secret":"PRIVATE"},"password":"NOT_ALLOWED","userId":"NOT_ALLOWED","nested":{"token":"NOT_ALLOWED"}}'::jsonb);
  IF first_result->>'ok'<>'true' THEN RAISE EXCEPTION 'legitimate anonymous report rejected'; END IF;
  duplicate_result:=public.rak_submit_bug_report_v2(NULL,'Test','chyba',
    'RAK_17049_TEST_PRIVATE_KEYS','1.7.49','/test','test-agent',
    '{"sourceId":"rak-17049-source","nested":{"token":"NOT_ALLOWED"}}'::jsonb);
  IF duplicate_result->>'duplicate'<>'true' THEN RAISE EXCEPTION 'duplicate report was accepted'; END IF;
END $test$;
RESET ROLE;
DO $test$
DECLARE info jsonb; v_n integer;
BEGIN
  SELECT count(*),pg_catalog.max(device_info::text)::jsonb INTO v_n,info
    FROM public.bug_reports WHERE message='RAK_17049_TEST_PRIVATE_KEYS';
  IF v_n<>1 OR info IS NULL THEN RAISE EXCEPTION 'report insert/dedup lost %',v_n; END IF;
  IF info ?| ARRAY['password','userId','nested'] OR info->'viewport' ? 'secret'
  THEN RAISE EXCEPTION 'sensitive nested device metadata persisted'; END IF;
  IF info->>'appearanceId'<>'glass' OR info->>'sourceId'<>'rak-17049-source'
    OR info->'viewport'->>'width'<>'390'
  THEN RAISE EXCEPTION 'legitimate device fields lost'; END IF;
END $test$;
-- Create rate-limit fixtures inside the transaction. Never persist them.
INSERT INTO public.bug_reports(report_type,message,device_info)
 SELECT 'chyba','RAK_17049_CAP_'||g,'{}'::jsonb FROM pg_catalog.generate_series(1,24) AS g;
SET LOCAL ROLE anon;
DO $quota$
BEGIN
  BEGIN
    PERFORM public.rak_submit_bug_report_v2(NULL,'Test','chyba','RAK_17049_QUOTA_BLOCK',
      '1.7.49','/test','test','{}'::jsonb);
    RAISE EXCEPTION 'quota not enforced' USING ERRCODE='XX000';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM<>'report_rate_limited' THEN RAISE; END IF;
  END;
END $quota$;
RESET ROLE;
SELECT 'PASS: RLS and grants, exact 5 anon APIs, device allowlist, duplicate and global rate limits' AS result;
ROLLBACK;
