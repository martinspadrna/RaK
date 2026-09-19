-- RaK development / test database only. All session overrides are transaction-local.
-- No Auth user is created, no email or login number is printed.
BEGIN;
DO $setup$ DECLARE owner_claims text; mismatches integer; readiness jsonb;
BEGIN
 SELECT count(*) INTO mismatches FROM (VALUES
  ('employee@example.org'::text,pg_catalog.now()::timestamptz,false,true),
  ('employee@worker.rak.local',pg_catalog.now(),false,false),
  ('employee@WORKER.RAK.LOCAL',pg_catalog.now(),false,false),
  ('employee@example.org',NULL::timestamptz,false,false),
  ('employee@example.org',pg_catalog.now(),true,false),
  ('not-an-email',pg_catalog.now(),false,false),
  (NULL::text,pg_catalog.now(),false,false),
  ('employee@example.org',pg_catalog.now(),NULL::boolean,false)
 ) AS cases(email,confirmed_at,is_anonymous,expected)
 WHERE private.rak_worker_email_ready(email,confirmed_at,is_anonymous) IS DISTINCT FROM expected;
 IF mismatches<>0 THEN RAISE EXCEPTION 'Worker email identity predicate cases fail: %',mismatches; END IF;
 IF has_function_privilege('anon','private.rak_worker_email_ready(text,timestamptz,boolean)','EXECUTE')
    OR has_function_privilege('authenticated','private.rak_worker_email_ready(text,timestamptz,boolean)','EXECUTE')
    OR has_function_privilege('anon','private.rak_employee_rotation_cutover_readiness()','EXECUTE')
 THEN RAISE EXCEPTION 'Private helper leaked'; END IF;
 IF pg_get_functiondef('private.rak_can_read_rotations()'::regprocedure) NOT LIKE '%private.rak_worker_email_ready%'
    OR pg_get_functiondef('private.rak_employee_rotation_cutover_readiness()'::regprocedure) NOT LIKE '%private.rak_worker_email_ready%'
 THEN RAISE EXCEPTION 'Reader/readiness identity policy mismatch'; END IF;
 readiness:=private.rak_employee_rotation_cutover_readiness();
 IF readiness->>'database_ready' IS DISTINCT FROM 'false'
    OR readiness->>'valid_employee_links' IS DISTINCT FROM '0'
    OR readiness->>'expected_employee_accounts' IS DISTINCT FROM '9'
    OR readiness->>'requires_recovery_delivery_smoke' IS DISTINCT FROM 'true'
 THEN RAISE EXCEPTION 'Unexpected readiness baseline or recovery requirement'; END IF;
 SELECT jsonb_build_object('sub',p.user_id,'session_id',s.id,'role','authenticated')::text INTO owner_claims
 FROM public.rak_admin_profiles p JOIN auth.sessions s ON s.user_id=p.user_id
 WHERE p.enabled AND p.role='owner' ORDER BY s.created_at DESC LIMIT 1;
 IF owner_claims IS NULL THEN RAISE EXCEPTION 'No owner session'; END IF;
 PERFORM set_config('rak.email_test_owner',owner_claims,true);
END $setup$;
SET LOCAL ROLE anon;
DO $anon$ BEGIN
 IF has_function_privilege('anon','public.rak_read_rotation_v1()','EXECUTE') THEN RAISE EXCEPTION 'Anonymous verified reader exposed'; END IF;
 IF (SELECT count(*) FROM public.rotation_state)<>1 THEN RAISE EXCEPTION 'Legacy rotation unavailable'; END IF;
END $anon$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{}',true);
DO $unsigned$ BEGIN
 BEGIN PERFORM public.rak_read_rotation_v1(); RAISE EXCEPTION 'Unsigned read accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $unsigned$;
SELECT set_config('request.jwt.claims',current_setting('rak.email_test_owner'),true);
DO $owner$ BEGIN
 IF public.rak_read_rotation_v1()->>'key' IS DISTINCT FROM 'main' THEN RAISE EXCEPTION 'Owner read failed'; END IF;
END $owner$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS: 8 email fixtures, private permissions, 0/9 readiness, anon compatibility, unsigned denial, owner read; rollback' AS result;
