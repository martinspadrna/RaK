-- RaK development/test DB only. Synthetic identities; the whole fixture is rolled back.
-- One owner with a real session is required; no real user or settings values are modified permanently.
BEGIN;
DO $setup$ DECLARE v_owner text; v_spoof text; v_owner_account text; kind text; BEGIN
 SELECT jsonb_build_object('sub',p.user_id,'session_id',s.id,'role','authenticated')::text,p.account_id INTO v_owner,v_owner_account FROM public.rak_admin_profiles p JOIN auth.sessions s ON s.user_id=p.user_id WHERE p.role='owner' AND p.enabled ORDER BY s.created_at DESC LIMIT 1;
 IF v_owner IS NULL THEN RAISE EXCEPTION 'Owner session missing'; END IF;
 SELECT jsonb_build_object('sub',p.user_id,'session_id',v_owner::jsonb->>'session_id','role','authenticated')::text INTO v_spoof FROM public.rak_admin_profiles p WHERE p.role='admin' AND p.enabled LIMIT 1;
 IF v_spoof IS NULL THEN RAISE EXCEPTION 'Admin profile missing'; END IF;
 PERFORM set_config('rak.v9_owner',v_owner,true); PERFORM set_config('rak.v9_spoof',v_spoof,true); PERFORM set_config('rak.v9_owner_account',v_owner_account,true);
 IF (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='machine_settings' AND policyname IN ('rak_machine_settings_anon_no_recursive_identity_v9','rak_machine_settings_authenticated_recursive_identity_admin_only_v9'))<>2 THEN RAISE EXCEPTION 'Privacy v9 not installed'; END IF;
 FOR kind IN SELECT * FROM unnest(ARRAY['appAccounts','applicationAccounts','workers','loginNumber','accountNumber','roster','employees','staff']) LOOP
  BEGIN
   INSERT INTO public.machine_settings(machine_key,label,category,settings_json)
   VALUES('RAK_RECURSIVE_TEST_'||kind,'synthetic fixture','frezka',
          jsonb_build_object('wrapper',jsonb_build_object('deep',jsonb_build_object(kind,jsonb_build_array(jsonb_build_object('name','synthetic'))))));
   RAISE EXCEPTION 'Restricted recursive worker payload unexpectedly accepted: %',kind;
  EXCEPTION WHEN check_violation THEN NULL;
  END;
 END LOOP;
 IF EXISTS(SELECT 1 FROM public.machine_settings WHERE machine_key LIKE 'RAK_RECURSIVE_TEST_%') THEN RAISE EXCEPTION 'Rejected recursive fixture survived'; END IF;
 INSERT INTO public.machine_settings(machine_key,label,category,settings_json) VALUES('RAK_RECURSIVE_TEST_SAFE','synthetic ordinary fixture','frezka','{"wrapper":{"data":{"cycle_time":58.2}}}'::jsonb);
END $setup$;
SET LOCAL ROLE anon;
DO $anon$ BEGIN
 IF EXISTS(SELECT 1 FROM public.machine_settings WHERE machine_key LIKE 'RAK_RECURSIVE_TEST_%' AND machine_key<>'RAK_RECURSIVE_TEST_SAFE') THEN RAISE EXCEPTION 'Anonymous nested worker payload visible'; END IF;
 IF (SELECT count(*) FROM public.machine_settings WHERE machine_key='RAK_RECURSIVE_TEST_SAFE')<>1 THEN RAISE EXCEPTION 'Ordinary nested machine setting unavailable'; END IF;
 IF EXISTS(SELECT 1 FROM public.machine_settings WHERE machine_key='WORKER_ROSTER_SETTINGS') THEN RAISE EXCEPTION 'Original worker roster exposed'; END IF;
 IF NOT public.rak_admin_account_requires_auth(current_setting('rak.v9_owner_account')) OR public.rak_admin_account_requires_auth('not-an-admin') THEN RAISE EXCEPTION 'Admin auth lookup changed'; END IF;
 IF NOT has_function_privilege('anon','public.rak_lookup_account_for_login_v1(text)','EXECUTE') OR (SELECT count(*) FROM public.rotation_state)<>1 THEN RAISE EXCEPTION 'Legacy login/rotation unavailable'; END IF;
END $anon$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{}',true);
DO $unsigned$ BEGIN
 IF EXISTS(SELECT 1 FROM public.machine_settings WHERE machine_key LIKE 'RAK_RECURSIVE_TEST_%' AND machine_key<>'RAK_RECURSIVE_TEST_SAFE') THEN RAISE EXCEPTION 'Unsigned authenticated nested payload exposed'; END IF;
END $unsigned$;
SELECT set_config('request.jwt.claims',current_setting('rak.v9_spoof'),true);
DO $spoof$ BEGIN
 IF private.rak_is_admin() OR EXISTS(SELECT 1 FROM public.machine_settings WHERE machine_key LIKE 'RAK_RECURSIVE_TEST_%' AND machine_key<>'RAK_RECURSIVE_TEST_SAFE') THEN RAISE EXCEPTION 'Spoofed administrator accepted'; END IF;
END $spoof$;
SELECT set_config('request.jwt.claims',current_setting('rak.v9_owner'),true);
DO $owner$ BEGIN
 IF NOT private.rak_is_admin() OR (SELECT count(*) FROM public.machine_settings WHERE machine_key LIKE 'RAK_RECURSIVE_TEST_%')<>1 OR (SELECT count(*) FROM public.machine_settings WHERE machine_key='WORKER_ROSTER_SETTINGS')<>1 THEN RAISE EXCEPTION 'Verified owner visibility failed'; END IF;
END $owner$;
RESET ROLE;
UPDATE public.rak_admin_profiles SET enabled=false WHERE account_id=current_setting('rak.v9_owner_account');
SET LOCAL ROLE anon;
DO $disabled$ BEGIN IF public.rak_admin_account_requires_auth(current_setting('rak.v9_owner_account')) THEN RAISE EXCEPTION 'Disabled owner still passes public Auth lookup'; END IF; END $disabled$;
ROLLBACK;
SELECT 'PASS: eight restricted recursive writes rejected, ordinary settings/owner/login/rotation retained, disabled account honored, no persistent writes or hard-coded owner account' AS result;
