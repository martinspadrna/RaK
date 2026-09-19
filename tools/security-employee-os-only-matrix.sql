-- RaK 1.7.35: employees use OS number only; never require employee email, password or Supabase Auth.
-- Read-only checks, all session changes rolled back; run ONLY on development/test Supabase.
BEGIN;
DO $baseline$ BEGIN
 IF (SELECT count(*) FROM private.rak_employee_auth_links) <> 0 THEN RAISE EXCEPTION 'Unexpected employee Auth links'; END IF;
 IF (SELECT count(*) FROM auth.users WHERE raw_app_meta_data->>'rak_role'='employee') <> 0 THEN RAISE EXCEPTION 'Unexpected employee Auth user'; END IF;
 IF (private.rak_employee_rotation_cutover_readiness()->>'database_ready')::boolean THEN RAISE EXCEPTION 'Retired employee Auth cutover appears ready'; END IF;
 IF NOT has_table_privilege('anon','public.rotation_state','SELECT') THEN RAISE EXCEPTION 'Employee OS-only rotation grant removed'; END IF;
 IF NOT has_function_privilege('anon','public.rak_lookup_account_for_login_v1(text)','EXECUTE') THEN RAISE EXCEPTION 'OS login lookup unavailable'; END IF;
 IF has_function_privilege('anon','public.rak_read_rotation_v1()','EXECUTE') THEN RAISE EXCEPTION 'Old verified reader unexpectedly public'; END IF;
END $baseline$;
SET LOCAL ROLE anon;
DO $anon$ BEGIN
 IF (SELECT count(*) FROM public.rotation_state)<>1 THEN RAISE EXCEPTION 'OS-only user cannot read published rotation'; END IF;
 IF EXISTS(SELECT 1 FROM public.machine_settings WHERE machine_key='WORKER_ROSTER_SETTINGS') THEN RAISE EXCEPTION 'Worker roster exposed anonymously'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.machine_settings WHERE machine_key <> 'WORKER_ROSTER_SETTINGS') THEN RAISE EXCEPTION 'Normal machine settings unavailable'; END IF;
END $anon$;
SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config('request.jwt.claims','{}',true);
DO $unsigned$ BEGIN
 IF EXISTS(SELECT 1 FROM public.machine_settings WHERE machine_key='WORKER_ROSTER_SETTINGS') THEN RAISE EXCEPTION 'Unsigned profile sees roster'; END IF;
END $unsigned$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS: OS-only login preserved, rotation available, employee Auth unprovisioned, private roster denied to anon/unsigned, rollback' AS result;
