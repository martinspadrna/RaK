-- RaK TEST: employee rotation access and cutover readiness (transaction rolled back).
-- No employee accounts or login credentials are created.
BEGIN;
DO $setup$
DECLARE owner_claims text; spoof_claims text;
BEGIN
 SELECT pg_catalog.jsonb_build_object('sub',p.user_id,'session_id',s.id,'role','authenticated')::text INTO owner_claims FROM public.rak_admin_profiles p JOIN auth.sessions s ON s.user_id=p.user_id WHERE p.enabled AND p.role='owner' ORDER BY s.created_at DESC LIMIT 1;
 IF owner_claims IS NULL THEN RAISE EXCEPTION 'Verified owner session required'; END IF;
 SELECT pg_catalog.jsonb_build_object('sub',p.user_id,'session_id',owner_claims::jsonb->>'session_id','role','authenticated')::text INTO spoof_claims FROM public.rak_admin_profiles p WHERE p.enabled AND p.role='admin' LIMIT 1;
 IF spoof_claims IS NULL THEN RAISE EXCEPTION 'Admin profile missing'; END IF;
 PERFORM pg_catalog.set_config('rak.employee_owner_claims',owner_claims,true);
 PERFORM pg_catalog.set_config('rak.employee_spoof_claims',spoof_claims,true);
 IF pg_catalog.has_function_privilege('anon','private.rak_employee_rotation_cutover_readiness()','EXECUTE') OR pg_catalog.has_function_privilege('authenticated','private.rak_employee_rotation_cutover_readiness()','EXECUTE') OR pg_catalog.has_function_privilege('service_role','private.rak_employee_rotation_cutover_readiness()','EXECUTE') THEN RAISE EXCEPTION 'Private readiness EXECUTE grant leaked'; END IF;
 IF (private.rak_employee_rotation_cutover_readiness()->>'database_ready')::boolean THEN RAISE EXCEPTION 'Premature cutover ready'; END IF;
 IF (private.rak_employee_rotation_cutover_readiness()->>'expected_employee_accounts')::int<>9 OR (private.rak_employee_rotation_cutover_readiness()->>'missing_or_invalid_employee_links')::int<>9 THEN RAISE EXCEPTION 'Readiness baseline changed; review enrollment'; END IF;
 IF pg_catalog.pg_get_functiondef('private.rak_can_read_rotations()'::regprocedure) NOT LIKE '%worker.banned_until%' OR pg_catalog.pg_get_functiondef('private.rak_can_read_rotations()'::regprocedure) NOT LIKE '%worker.deleted_at%' OR pg_catalog.pg_get_functiondef('private.rak_can_read_rotations()'::regprocedure) NOT LIKE '%worker.email_confirmed_at%' THEN RAISE EXCEPTION 'Worker disable checks missing'; END IF;
END $setup$;
SET LOCAL ROLE anon;
DO $anon$ BEGIN
 IF pg_catalog.has_function_privilege('anon','public.rak_read_rotation_v1()','EXECUTE') THEN RAISE EXCEPTION 'Anonymous verified reader grant'; END IF;
 IF (SELECT count(*) FROM public.rotation_state)<>1 THEN RAISE EXCEPTION 'Legacy rotation read unexpectedly closed'; END IF;
END $anon$;
SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config('request.jwt.claims','{}',true);
DO $unsigned$ BEGIN
 BEGIN PERFORM public.rak_read_rotation_v1(); RAISE EXCEPTION 'Unsigned token accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $unsigned$;
SELECT pg_catalog.set_config('request.jwt.claims',pg_catalog.current_setting('rak.employee_spoof_claims'),true);
DO $spoof$ BEGIN
 BEGIN PERFORM public.rak_read_rotation_v1(); RAISE EXCEPTION 'Foreign session accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $spoof$;
SELECT pg_catalog.set_config('request.jwt.claims',pg_catalog.current_setting('rak.employee_owner_claims'),true);
DO $owner$ BEGIN
 IF (public.rak_read_rotation_v1()->>'key') IS DISTINCT FROM 'main' THEN RAISE EXCEPTION 'Owner rotation read regression'; END IF;
END $owner$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS: readiness false (9/9 employees missing); anon legacy rotation preserved, unsigned and forged session denied, owner reader works, disabled/banned safeguards present; rollback' AS result;
