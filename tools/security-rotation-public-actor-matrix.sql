-- TEST SUPABASE ONLY: real owner save is exercised inside a rollback-only transaction.
BEGIN;
DO $setup$ DECLARE v_claim text; BEGIN
  SELECT pg_catalog.jsonb_build_object('sub',p.user_id,'session_id',s.id,'role','authenticated')::text INTO v_claim
  FROM public.rak_admin_profiles p JOIN auth.sessions s ON s.user_id=p.user_id
  WHERE p.enabled AND p.role='owner' ORDER BY s.created_at DESC LIMIT 1;
  IF v_claim IS NULL THEN RAISE EXCEPTION 'No owner session for rollback smoke'; END IF;
  PERFORM pg_catalog.set_config('rak.test_owner_claim',v_claim,true);
  PERFORM pg_catalog.set_config('rak.test_audit_before',(SELECT count(*)::text FROM public.rak_admin_audit_log WHERE action='rotation.save'),true);
  PERFORM pg_catalog.set_config('rak.test_backup_before',(SELECT count(*)::text FROM public.rak_rotation_backups_v2),true);
  PERFORM pg_catalog.set_config('rak.test_revision_before',(SELECT revision::text FROM public.rotation_state WHERE key='main'),true);
  IF EXISTS (SELECT 1 FROM public.rotation_state WHERE meta ? 'savedBy') THEN RAISE EXCEPTION 'Public actor present before test'; END IF;
END $setup$;
SET LOCAL ROLE authenticated;
DO $signed$ DECLARE v_input public.rotation_state%rowtype; v_result jsonb; BEGIN
  PERFORM pg_catalog.set_config('request.jwt.claims',pg_catalog.current_setting('rak.test_owner_claim'),true);
  IF NOT private.rak_is_admin() THEN RAISE EXCEPTION 'Signed owner not recognized'; END IF;
  SELECT * INTO v_input FROM public.rotation_state WHERE key='main';
  SELECT public.rak_admin_save_rotation_v2(v_input.key,v_input.payload,v_input.meta,v_input.revision) INTO v_result;
  IF v_result->>'ok' <> 'true' OR (v_result->>'revision')::bigint <> v_input.revision+1 OR (v_result->'meta') ? 'savedBy' THEN RAISE EXCEPTION 'Admin save failed to redact actor'; END IF;
  IF v_result->'payload' IS DISTINCT FROM v_input.payload THEN RAISE EXCEPTION 'Admin save changed rotation content'; END IF;
END $signed$;
RESET ROLE;
DO $verify$ BEGIN
  IF (SELECT count(*) FROM public.rak_admin_audit_log WHERE action='rotation.save') <> pg_catalog.current_setting('rak.test_audit_before')::integer+1 THEN RAISE EXCEPTION 'Private authorship audit lost'; END IF;
  IF (SELECT count(*) FROM public.rak_rotation_backups_v2) <> pg_catalog.current_setting('rak.test_backup_before')::integer+1 THEN RAISE EXCEPTION 'Private backup missing'; END IF;
  IF (SELECT revision FROM public.rotation_state WHERE key='main') <> pg_catalog.current_setting('rak.test_revision_before')::bigint+1 OR EXISTS(SELECT 1 FROM public.rotation_state WHERE meta ? 'savedBy') THEN RAISE EXCEPTION 'Public metadata not sanitized or revision wrong'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.rak_admin_audit_log WHERE action='rotation.save' AND account_id IS NOT NULL ORDER BY id DESC LIMIT 1) THEN RAISE EXCEPTION 'No attribution in private audit'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.rotation_state'::regclass AND conname='rak_rotation_no_public_actor_meta_v1' AND convalidated) THEN RAISE EXCEPTION 'Missing validated public actor constraint'; END IF;
END $verify$;
SET LOCAL ROLE anon;
DO $public$ BEGIN
  IF (SELECT count(*) FROM public.rotation_state)<>1 OR EXISTS(SELECT 1 FROM public.rotation_state WHERE meta ? 'savedBy') THEN RAISE EXCEPTION 'Anonymous schedule unavailable or actor exposed'; END IF;
  IF has_table_privilege('anon','public.rak_admin_audit_log','SELECT') THEN RAISE EXCEPTION 'Audit unexpectedly public'; END IF;
  IF NOT has_function_privilege('anon','public.rak_lookup_account_for_login_v1(text)','EXECUTE') THEN RAISE EXCEPTION 'OS login revoked'; END IF;
END $public$;
ROLLBACK;
SELECT 'PASS: owner save and revision, private authorship audit+backup, public actor stripped, anon rotation + OS lookup; rollback' AS result;
