-- RaK 1.7.36 / TEST SUPABASE ONLY. All synthetic writes are rolled back.
BEGIN;
DO $verify$
DECLARE blocked boolean := false; old_revision bigint;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.rotation_state'::regclass AND conname='rak_rotation_no_public_secret_fields_v1' AND convalidated) THEN RAISE EXCEPTION 'Public rotation constraint missing'; END IF;
 IF private.rak_rotation_has_restricted_public_key('{"months":{"2026-09":{"notes":[{"person":"example","nested":{"email":"fake@example.invalid"}}]}}}'::jsonb) IS DISTINCT FROM true THEN RAISE EXCEPTION 'Nested email allowed'; END IF;
 IF private.rak_rotation_has_restricted_public_key('{"months":{"2026-09":{"dayMods":[{"nested":[{"access_token":"fake"}]}]}}}'::jsonb) IS DISTINCT FROM true THEN RAISE EXCEPTION 'Nested token allowed'; END IF;
 IF private.rak_rotation_has_restricted_public_key('{"months":{"2026-09":{"hard":{},"soft":{},"notes":[{"person":"example","code":"D","text":"example D"}],"dayMods":[{"person":"example","restReason":"D"}]}}}'::jsonb) IS DISTINCT FROM false THEN RAISE EXCEPTION 'Normal schedule rejected'; END IF;
 IF EXISTS (SELECT 1 FROM public.rotation_state WHERE private.rak_rotation_has_restricted_public_key(payload) OR private.rak_rotation_has_restricted_public_key(COALESCE(meta,'{}'::jsonb))) THEN RAISE EXCEPTION 'Current rotation rejected'; END IF;
 IF (SELECT count(*) FROM public.rotation_state)<>1 THEN RAISE EXCEPTION 'Unexpected rotation row count'; END IF;
 SELECT revision INTO old_revision FROM public.rotation_state LIMIT 1;
 BEGIN
   UPDATE public.rotation_state SET meta=COALESCE(meta,'{}'::jsonb)||'{"nested":{"phone":"fake"}}'::jsonb;
 EXCEPTION WHEN check_violation THEN blocked:=true;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'Sensitive UPDATE not blocked'; END IF;
 IF (SELECT revision FROM public.rotation_state LIMIT 1) IS DISTINCT FROM old_revision THEN RAISE EXCEPTION 'Revision altered'; END IF;
 IF has_function_privilege('anon','private.rak_rotation_has_restricted_public_key(jsonb)','EXECUTE') OR has_function_privilege('authenticated','private.rak_rotation_has_restricted_public_key(jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Private checker exposed'; END IF;
 IF (SELECT count(*) FROM private.rak_employee_auth_links)<>0 THEN RAISE EXCEPTION 'OS-only employee policy violated'; END IF;
END $verify$;
SET LOCAL ROLE anon;
DO $anon$
BEGIN
 IF (SELECT count(*) FROM public.rotation_state)<>1 THEN RAISE EXCEPTION 'Public schedules unavailable'; END IF;
 IF NOT has_function_privilege('anon','public.rak_lookup_account_for_login_v1(text)','EXECUTE') THEN RAISE EXCEPTION 'OS login unavailable'; END IF;
 IF has_table_privilege('anon','public.game_accounts','SELECT') THEN RAISE EXCEPTION 'Worker directory public'; END IF;
END $anon$;
ROLLBACK;
SELECT 'PASS: nested personal credentials blocked, ordinary schedules allowed, OS login/rotation preserved, no persisted test writes' AS result;
