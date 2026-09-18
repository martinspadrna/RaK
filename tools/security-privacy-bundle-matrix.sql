-- RaK TEST Supabase only. Run as one SQL batch. No fixture survives the ROLLBACK.
-- Public notice history, mislabeled worker rosters, forged JWT/session and legacy login.
BEGIN;
DO $setup$ DECLARE v_owner text; v_spoof text; BEGIN
 SELECT pg_catalog.jsonb_build_object('sub',p.user_id,'session_id',s.id,'role','authenticated')::text INTO v_owner FROM public.rak_admin_profiles p JOIN auth.sessions s ON s.user_id=p.user_id WHERE p.enabled AND p.role='owner' ORDER BY s.created_at DESC LIMIT 1;
 IF v_owner IS NULL THEN RAISE EXCEPTION 'Owner fixture unavailable'; END IF;
 SELECT pg_catalog.jsonb_build_object('sub',p.user_id,'session_id',(v_owner::jsonb->>'session_id'),'role','authenticated')::text INTO v_spoof FROM public.rak_admin_profiles p WHERE p.enabled AND p.role='admin' LIMIT 1;
 IF v_spoof IS NULL THEN RAISE EXCEPTION 'Different admin fixture unavailable'; END IF;
 PERFORM set_config('rak.privacy_owner_claims',v_owner,true);
 PERFORM set_config('rak.privacy_spoof_claims',v_spoof,true);
 PERFORM set_config('rak.privacy_machine_count',(SELECT count(*) FROM public.machine_settings)::text,true);
 PERFORM set_config('rak.privacy_archive_count',(SELECT count(*) FROM public.announcements WHERE NOT is_active)::text,true);
END $setup$;
INSERT INTO public.machine_settings(machine_key,label,category,settings_json)
SELECT 'RAK_PRIVATE_SHAPE_TEST_'||kind,'temporary privacy fixture','frezka',pg_catalog.jsonb_build_object(kind,pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('loginNumber','0000','name','synthetic fixture'))) FROM (VALUES ('appAccounts'),('applicationAccounts'),('workers')) AS types(kind);
SET LOCAL ROLE anon;
DO $anon$ BEGIN
 IF (SELECT count(*) FROM public.machine_settings WHERE machine_key LIKE 'RAK_PRIVATE_SHAPE_TEST_%' OR machine_key='WORKER_ROSTER_SETTINGS')<>0 THEN RAISE EXCEPTION 'Anonymous roster disclosure'; END IF;
 IF (SELECT count(*) FROM public.machine_settings WHERE category IN ('frezka','brus','fhb_target') AND machine_key NOT LIKE 'RAK_PRIVATE_SHAPE_TEST_%')<10 THEN RAISE EXCEPTION 'Ordinary machine settings unavailable'; END IF;
 IF (SELECT count(*) FROM public.announcements WHERE NOT is_active)<>0 THEN RAISE EXCEPTION 'Anonymous archived announcements visible'; END IF;
 IF (SELECT count(*) FROM public.rotation_state)<>1 THEN RAISE EXCEPTION 'Legacy rotation read changed'; END IF;
 IF NOT has_function_privilege('anon','public.rak_lookup_account_for_login_v1(text)','EXECUTE') THEN RAISE EXCEPTION 'Employee login RPC unavailable'; END IF;
END $anon$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{}',true);
DO $unsigned$ BEGIN
 IF (SELECT count(*) FROM public.machine_settings WHERE machine_key LIKE 'RAK_PRIVATE_SHAPE_TEST_%' OR machine_key='WORKER_ROSTER_SETTINGS')<>0 THEN RAISE EXCEPTION 'Unsigned roster disclosure'; END IF;
 IF (SELECT count(*) FROM public.announcements WHERE NOT is_active)<>0 THEN RAISE EXCEPTION 'Unsigned archived announcement disclosure'; END IF;
END $unsigned$;
SELECT set_config('request.jwt.claims',current_setting('rak.privacy_spoof_claims'),true);
DO $spoof$ BEGIN
 IF private.rak_is_admin() THEN RAISE EXCEPTION 'Spoofed admin accepted'; END IF;
 IF (SELECT count(*) FROM public.machine_settings WHERE machine_key LIKE 'RAK_PRIVATE_SHAPE_TEST_%' OR machine_key='WORKER_ROSTER_SETTINGS')<>0 THEN RAISE EXCEPTION 'Spoofed admin roster disclosure'; END IF;
 IF (SELECT count(*) FROM public.announcements WHERE NOT is_active)<>0 THEN RAISE EXCEPTION 'Spoofed admin archive disclosure'; END IF;
END $spoof$;
SELECT set_config('request.jwt.claims',current_setting('rak.privacy_owner_claims'),true);
DO $owner$ BEGIN
 IF NOT private.rak_is_admin() THEN RAISE EXCEPTION 'Owner denied'; END IF;
 IF (SELECT count(*) FROM public.machine_settings WHERE machine_key LIKE 'RAK_PRIVATE_SHAPE_TEST_%')<>3 THEN RAISE EXCEPTION 'Owner fixture visibility'; END IF;
 IF (SELECT count(*) FROM public.machine_settings)<>current_setting('rak.privacy_machine_count')::bigint+3 THEN RAISE EXCEPTION 'Owner settings visibility'; END IF;
 IF (SELECT count(*) FROM public.announcements WHERE NOT is_active)<>current_setting('rak.privacy_archive_count')::bigint THEN RAISE EXCEPTION 'Owner announcement archive visibility'; END IF;
END $owner$;
ROLLBACK;
SELECT 'PASS: role matrix, archived notices, 3 disguised roster payloads, login and legacy rotation; no persistent test data' AS result;
