-- RaK-test integrated P0 regression. Run as one SQL batch; fixtures are rolled back.
-- Public live rotation and limited login RPC remain available until employee Auth cutover.
BEGIN;
DO $setup$
DECLARE v_visible text[]; v_rpc text[]; v_owner text; v_active int; v_all int; v_settings int;
BEGIN
 SELECT array_agg(c.relname ORDER BY c.relname) INTO v_visible
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m') AND has_table_privilege('anon',c.oid,'SELECT');
 IF v_visible IS DISTINCT FROM ARRAY['announcements','machine_settings','rotation_state']::text[] THEN
  RAISE EXCEPTION 'Public SELECT surface changed: %', v_visible;
 END IF;
 SELECT array_agg(p.proname ORDER BY p.proname) INTO v_rpc
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname LIKE 'rak_%' AND has_function_privilege('anon',p.oid,'EXECUTE');
 IF v_rpc IS DISTINCT FROM ARRAY['rak_admin_account_requires_auth','rak_admin_auth_capabilities','rak_app_keepalive','rak_lookup_account_for_login_v1','rak_submit_bug_report_v2']::text[] THEN
  RAISE EXCEPTION 'Public RPC surface changed: %',v_rpc;
 END IF;
 IF has_table_privilege('anon','public.game_accounts','SELECT') OR has_table_privilege('anon','public.rak_admin_profiles','SELECT') OR has_table_privilege('anon','public.rak_rotation_backups_v2','SELECT') OR has_table_privilege('anon','public.rak_admin_settings_backups','SELECT') THEN
  RAISE EXCEPTION 'Sensitive table SELECT grant unexpectedly public';
 END IF;
 IF EXISTS(SELECT 1 FROM storage.buckets WHERE public) OR EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND (roles @> ARRAY['anon']::name[] OR roles @> ARRAY['public']::name[])) THEN
  RAISE EXCEPTION 'New public storage requires review';
 END IF;
 IF (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='announcements' AND policyname IN ('rak_announcements_active_public_read_v3','rak_announcements_active_or_admin_read_v3'))<>2 THEN
  RAISE EXCEPTION 'Announcement privacy policies missing';
 END IF;
 IF (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='machine_settings' AND policyname IN ('rak_machine_settings_anon_no_worker_roster_v7','rak_machine_settings_authenticated_worker_roster_admin_only_v7'))<>2 THEN
  RAISE EXCEPTION 'Worker roster privacy policies missing';
 END IF;
 SELECT pg_catalog.jsonb_build_object('sub',p.user_id,'session_id',s.id,'role','authenticated')::text INTO v_owner
 FROM public.rak_admin_profiles p JOIN auth.sessions s ON s.user_id=p.user_id
 WHERE p.enabled AND p.role='owner' ORDER BY s.created_at DESC LIMIT 1;
 IF v_owner IS NULL THEN RAISE EXCEPTION 'Owner session unavailable'; END IF;
 SELECT count(*),count(*) FILTER(WHERE is_active IS TRUE) INTO v_all,v_active FROM public.announcements;
 SELECT count(*) INTO v_settings FROM public.machine_settings;
 PERFORM set_config('rak.data_test_owner',v_owner,true);
 PERFORM set_config('rak.data_test_all',v_all::text,true);
 PERFORM set_config('rak.data_test_active',v_active::text,true);
 PERFORM set_config('rak.data_test_settings',v_settings::text,true);
 INSERT INTO public.announcements(title,message,is_active) VALUES
 ('RAK_PUBLIC_DATA_MATRIX_ACTIVE_ROLLBACK','Test-only active notice',true),
 ('RAK_PUBLIC_DATA_MATRIX_INACTIVE_ROLLBACK','Test-only inactive notice',false);
END $setup$;
SET LOCAL ROLE anon;
DO $anon$
BEGIN
 IF (SELECT count(*) FROM public.announcements) <> current_setting('rak.data_test_active')::int+1 OR EXISTS(SELECT 1 FROM public.announcements WHERE is_active IS DISTINCT FROM TRUE) THEN RAISE EXCEPTION 'Anonymous announcement privacy failed'; END IF;
 IF EXISTS(SELECT 1 FROM public.machine_settings WHERE machine_key='WORKER_ROSTER_SETTINGS' OR settings_json->>'type'='worker_roster_settings' OR settings_json->>'type'='rotation_save_backup' OR machine_key='ADMIN_CHANGE_LOG') THEN RAISE EXCEPTION 'Anonymous sensitive machine settings visible'; END IF;
 IF (SELECT count(*) FROM public.machine_settings WHERE category IN ('frezka','brus','fhb_target','pracka')) < 10 THEN RAISE EXCEPTION 'Anonymous operational settings missing'; END IF;
 IF (SELECT count(*) FROM public.rotation_state) <> 1 THEN RAISE EXCEPTION 'Legacy employee rotation read changed without migration'; END IF;
END $anon$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{}',true);
DO $unsigned$
BEGIN
 IF (SELECT count(*) FROM public.announcements) <> current_setting('rak.data_test_active')::int+1 OR EXISTS(SELECT 1 FROM public.announcements WHERE is_active IS DISTINCT FROM TRUE) THEN RAISE EXCEPTION 'Unsigned authenticated announcement access failed'; END IF;
 IF EXISTS(SELECT 1 FROM public.machine_settings WHERE machine_key='WORKER_ROSTER_SETTINGS' OR settings_json->>'type'='rotation_save_backup') THEN RAISE EXCEPTION 'Unsigned authenticated roster/backups visible'; END IF;
END $unsigned$;
SELECT set_config('request.jwt.claims',current_setting('rak.data_test_owner'),true);
DO $owner$
BEGIN
 IF NOT private.rak_is_admin() OR (SELECT count(*) FROM public.announcements) <> current_setting('rak.data_test_all')::int+2 OR (SELECT count(*) FROM public.machine_settings) <> current_setting('rak.data_test_settings')::int OR (SELECT count(*) FROM public.machine_settings WHERE machine_key='WORKER_ROSTER_SETTINGS')<>1 THEN RAISE EXCEPTION 'Owner archive/roster read failed'; END IF;
END $owner$;
ROLLBACK;
SELECT 'PASS: 3 public read tables, 5 public RPCs, no public storage; inactive notices, roster, accounts, backups hidden; owner and employee compatibility retained; rollback' AS result;
