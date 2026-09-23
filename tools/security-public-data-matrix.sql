-- Integrated P0 public surface regression. Test DB only, rollback-only.
BEGIN;
DO $setup$
DECLARE v_tables text[];v_rpc text[];v_owner text;v_live int;v_all int;v_settings int;v_insert_live int:=0;
BEGIN
 SELECT array_agg(c.relname ORDER BY c.relname) INTO v_tables FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m') AND has_table_privilege('anon',c.oid,'SELECT');
 IF v_tables IS DISTINCT FROM ARRAY['announcements','machine_settings','rotation_state']::text[] THEN RAISE EXCEPTION 'Public table surface changed: %',v_tables; END IF;
 SELECT array_agg(p.proname ORDER BY p.proname) INTO v_rpc FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'rak_%' AND has_function_privilege('anon',p.oid,'EXECUTE');
 IF v_rpc IS DISTINCT FROM ARRAY['rak_admin_account_requires_auth','rak_admin_auth_capabilities','rak_app_keepalive','rak_lookup_account_for_login_v1','rak_lookup_account_for_login_v2','rak_submit_bug_report_v2']::text[] THEN RAISE EXCEPTION 'Public RPC surface changed: %',v_rpc; END IF;
 IF has_table_privilege('anon','public.game_accounts','SELECT') OR has_table_privilege('anon','public.rak_admin_profiles','SELECT') OR has_table_privilege('anon','public.rak_rotation_backups_v2','SELECT') OR has_table_privilege('anon','public.rak_admin_settings_backups','SELECT') THEN RAISE EXCEPTION 'Sensitive table grant public'; END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND (has_table_privilege('anon',c.oid,'INSERT') OR has_table_privilege('anon',c.oid,'UPDATE') OR has_table_privilege('anon',c.oid,'DELETE') OR has_table_privilege('authenticated',c.oid,'INSERT') OR has_table_privilege('authenticated',c.oid,'UPDATE') OR has_table_privilege('authenticated',c.oid,'DELETE'))) THEN RAISE EXCEPTION 'Unexpected direct public/authenticated table write privilege'; END IF;
 IF EXISTS(SELECT 1 FROM storage.buckets WHERE public) OR EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND (roles @> ARRAY['anon']::name[] OR roles @> ARRAY['public']::name[])) THEN RAISE EXCEPTION 'Unexpected public storage'; END IF;
 IF (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='announcements' AND policyname IN ('rak_announcements_live_public_read_v4','rak_announcements_live_or_admin_read_v4'))<>2 THEN RAISE EXCEPTION 'Live announcement RLS missing'; END IF;
 IF (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='machine_settings' AND policyname IN ('rak_machine_settings_anon_no_recursive_identity_v9','rak_machine_settings_authenticated_recursive_identity_admin_only_v9'))<>2 THEN RAISE EXCEPTION 'Recursive roster RLS missing'; END IF;
 SELECT pg_catalog.jsonb_build_object('sub',p.user_id,'session_id',s.id,'role','authenticated')::text INTO v_owner FROM public.rak_admin_profiles p JOIN auth.sessions s ON s.user_id=p.user_id WHERE p.enabled AND p.role='owner' ORDER BY s.created_at DESC LIMIT 1;
 IF v_owner IS NULL THEN RAISE EXCEPTION 'Owner session unavailable'; END IF;
 SELECT count(*),count(*) FILTER(WHERE is_active IS TRUE AND (starts_at IS NULL OR starts_at<=now()) AND (ends_at IS NULL OR ends_at>now())) INTO v_all,v_live FROM public.announcements;
 SELECT count(*) INTO v_settings FROM public.machine_settings;
 IF NOT EXISTS(SELECT 1 FROM public.announcements WHERE is_active IS TRUE) THEN
  INSERT INTO public.announcements(title,message,is_active) VALUES ('RAK_PUBLIC_DATA_MATRIX_ACTIVE_ROLLBACK','synthetic notice',true);
  v_insert_live:=1;
 END IF;
 INSERT INTO public.announcements(title,message,is_active) VALUES('RAK_PUBLIC_DATA_MATRIX_INACTIVE_ROLLBACK','synthetic inactive',false);
 PERFORM set_config('rak.data_test_owner',v_owner,true);
 PERFORM set_config('rak.data_test_all',v_all::text,true);
 PERFORM set_config('rak.data_test_live',v_live::text,true);
 PERFORM set_config('rak.data_test_insert_live',v_insert_live::text,true);
 PERFORM set_config('rak.data_test_settings',v_settings::text,true);
END $setup$;
SET LOCAL ROLE anon;
DO $anon$ BEGIN
 IF (SELECT count(*) FROM public.announcements)<>current_setting('rak.data_test_live')::int+current_setting('rak.data_test_insert_live')::int OR EXISTS(SELECT 1 FROM public.announcements WHERE is_active IS DISTINCT FROM TRUE OR (starts_at IS NOT NULL AND starts_at>now()) OR (ends_at IS NOT NULL AND ends_at<=now())) THEN RAISE EXCEPTION 'Anonymous notice live-window failure'; END IF;
 IF EXISTS(SELECT 1 FROM public.machine_settings WHERE machine_key='WORKER_ROSTER_SETTINGS' OR jsonb_path_exists(settings_json,'$.**.appAccounts') OR settings_json->>'type'='rotation_save_backup' OR machine_key='ADMIN_CHANGE_LOG') THEN RAISE EXCEPTION 'Anonymous sensitive machine setting visible'; END IF;
 IF (SELECT count(*) FROM public.machine_settings WHERE category IN ('frezka','brus','fhb_target','pracka'))<10 THEN RAISE EXCEPTION 'Operational settings missing'; END IF;
 IF (SELECT count(*) FROM public.rotation_state)<>1 THEN RAISE EXCEPTION 'Legacy rotation unavailable before employee cutover'; END IF;
END $anon$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{}',true);
DO $unsigned$ BEGIN
 IF (SELECT count(*) FROM public.announcements)<>current_setting('rak.data_test_live')::int+current_setting('rak.data_test_insert_live')::int THEN RAISE EXCEPTION 'Unsigned scheduled/archived notice leak'; END IF;
 IF EXISTS(SELECT 1 FROM public.machine_settings WHERE machine_key='WORKER_ROSTER_SETTINGS') THEN RAISE EXCEPTION 'Unsigned worker roster visible'; END IF;
END $unsigned$;
SELECT set_config('request.jwt.claims',current_setting('rak.data_test_owner'),true);
DO $owner$ BEGIN
 IF NOT private.rak_is_admin() OR (SELECT count(*) FROM public.announcements)<>current_setting('rak.data_test_all')::int+1+current_setting('rak.data_test_insert_live')::int OR (SELECT count(*) FROM public.machine_settings)<>current_setting('rak.data_test_settings')::int OR (SELECT count(*) FROM public.machine_settings WHERE machine_key='WORKER_ROSTER_SETTINGS')<>1 THEN RAISE EXCEPTION 'Owner archives/settings missing'; END IF;
END $owner$;
ROLLBACK;
SELECT 'PASS: 3 public tables, 6 RPCs, zero direct public/authenticated table writes, zero public storage, live notices only, recursive roster hidden, owner archive and legacy rotation preserved; rollback' AS result;
