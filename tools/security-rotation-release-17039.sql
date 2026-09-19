-- RaK 1.7.39. TEST Supabase ONLY. Read-only privacy/release audit; transaction is rolled back.
-- Never print worker names, account numbers, absence descriptions or rotation payload.
BEGIN;
DO $test$
BEGIN
 IF (SELECT count(*) FROM public.rotation_state WHERE key='main')<>1 THEN RAISE EXCEPTION 'Main rotation missing or duplicated'; END IF;
 IF (SELECT revision FROM public.rotation_state WHERE key='main')<1 THEN RAISE EXCEPTION 'Invalid rotation revision'; END IF;
 IF EXISTS (SELECT 1 FROM public.rotation_state WHERE meta ? 'savedBy' OR meta ? 'saved_by' OR meta ? 'authorAccountId') THEN RAISE EXCEPTION 'Public actor exposed'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.rotation_state'::regclass AND conname='rak_rotation_no_public_secret_fields_v2' AND convalidated) THEN RAISE EXCEPTION 'Text guard missing'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.rotation_state'::regclass AND conname='rak_rotation_no_public_actor_meta_v1' AND convalidated) THEN RAISE EXCEPTION 'Actor guard missing'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.rotation_state'::regclass AND tgname='rak_rotation_strip_public_actor_meta_v1' AND tgenabled='O') THEN RAISE EXCEPTION 'Redaction trigger missing'; END IF;
 IF (SELECT count(*) FROM public.rak_rotation_backups_v2)<1 OR (SELECT count(*) FROM public.rak_admin_audit_log WHERE action ILIKE '%rotation%')<1 THEN RAISE EXCEPTION 'Private audit or backups absent'; END IF;
 IF (SELECT count(*) FROM private.rak_employee_auth_links)<>0 THEN RAISE EXCEPTION 'OS-only onboarding violated'; END IF;
END $test$;
SET LOCAL ROLE anon;
DO $anon$
BEGIN
 IF NOT has_table_privilege('anon','public.rotation_state','SELECT') THEN RAISE EXCEPTION 'OS-only rotation read broken'; END IF;
 IF has_table_privilege('anon','public.game_accounts','SELECT') THEN RAISE EXCEPTION 'Employee directory leaked'; END IF;
 IF NOT has_function_privilege('anon','public.rak_lookup_account_for_login_v1(text)','EXECUTE') THEN RAISE EXCEPTION 'OS-only lookup missing'; END IF;
END $anon$;
ROLLBACK;
SELECT 'PASS: public rotation privacy and OS-only login; private backups/audits; no write persisted' AS result;
