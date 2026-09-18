-- RaK test Supabase only. Run as a single SQL batch; all simulated claims roll back.
-- Covers public roster privacy without changing employee login or machine parameters.
BEGIN;
DO $setup$
DECLARE v_claims text;
BEGIN
 IF (SELECT count(*) FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='machine_settings' AND policyname IN ('rak_machine_settings_anon_no_worker_roster_v7','rak_machine_settings_authenticated_worker_roster_admin_only_v7'))<>2 THEN
  RAISE EXCEPTION 'Roster privacy policies missing';
 END IF;
 SELECT pg_catalog.jsonb_build_object('sub',p.user_id,'session_id',s.id,'role','authenticated')::text INTO v_claims
 FROM public.rak_admin_profiles p JOIN auth.sessions s ON s.user_id=p.user_id
 WHERE p.enabled AND p.role='owner' ORDER BY s.created_at DESC LIMIT 1;
 IF v_claims IS NULL THEN RAISE EXCEPTION 'Owner session fixture unavailable'; END IF;
 PERFORM set_config('rak.roster_test_claims',v_claims,true);
END $setup$;
SET LOCAL ROLE anon;
DO $anonymous$
BEGIN
 IF (SELECT count(*) FROM public.machine_settings WHERE machine_key='WORKER_ROSTER_SETTINGS' OR settings_json->>'stored_category'='worker_roster_settings' OR settings_json->>'type'='worker_roster_settings')<>0 THEN
  RAISE EXCEPTION 'Anonymous roster disclosure';
 END IF;
 IF (SELECT count(*) FROM public.machine_settings WHERE category IN ('frezka','brus','fhb_target') AND machine_key<>'WORKER_ROSTER_SETTINGS')<10 THEN
  RAISE EXCEPTION 'Ordinary machine settings missing';
 END IF;
 IF (SELECT count(*) FROM public.machine_settings WHERE settings_json->>'type'='rotation_save_backup')<>0 THEN
  RAISE EXCEPTION 'Legacy backups visible to anonymous role';
 END IF;
 IF NOT has_function_privilege('anon','public.rak_lookup_account_for_login_v1(text)','EXECUTE') THEN
  RAISE EXCEPTION 'Existing employee login RPC unexpectedly unavailable';
 END IF;
END $anonymous$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{}',true);
DO $unsigned$
BEGIN
 IF (SELECT count(*) FROM public.machine_settings WHERE machine_key='WORKER_ROSTER_SETTINGS')<>0 THEN
  RAISE EXCEPTION 'Unsigned authenticated role can read roster';
 END IF;
END $unsigned$;
SELECT set_config('request.jwt.claims',current_setting('rak.roster_test_claims'),true);
DO $owner$
BEGIN
 IF NOT private.rak_is_admin() THEN RAISE EXCEPTION 'Verified owner rejected'; END IF;
 IF (SELECT count(*) FROM public.machine_settings WHERE machine_key='WORKER_ROSTER_SETTINGS')<>1 THEN
  RAISE EXCEPTION 'Verified owner cannot access roster';
 END IF;
 IF (SELECT count(*) FROM public.machine_settings)<>50 THEN
  RAISE EXCEPTION 'Unexpected machine settings visibility; review before release';
 END IF;
END $owner$;
ROLLBACK;
SELECT 'PASS: anonymous/unsigned roster hidden, employee lookup RPC available, owner sees roster and all machine rows; no persistent writes' AS result;
