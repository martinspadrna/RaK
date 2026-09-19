-- RaK 1.7.37, TEST SUPABASE ONLY. Temporary clone; BEGIN/ROLLBACK, no production data updates.
BEGIN;
CREATE TEMP TABLE rak_rotation_guard_matrix (LIKE public.rotation_state INCLUDING DEFAULTS INCLUDING CONSTRAINTS) ON COMMIT DROP;
DO $test$
DECLARE
 v_secret text; v_case text; v_rejected integer := 0; v_baseline public.rotation_state%rowtype;
 v_pattern text[] := ARRAY[
   'kontakt@example.cz','JANA.NOVAKOVA+1@EXAMPLE.COM',
   '+420 123 456 789','00420123456789',
   'sb_secret_testabcdefghijklmnopqrstuvwxyz','Bearer abcdefghijklmnopqrstuvwxyz012345',
   'eyJabcdefghijklmnopqrstuvwxy.eyJabcdefghijklmnopqrstuvwxy',
   'https://example.cz/?token=abcdefghijklmnopqrstuvwxyz012345'];
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.rotation_state'::regclass AND conname='rak_rotation_no_public_secret_fields_v2' AND convalidated) THEN RAISE EXCEPTION 'Validated V2 constraint missing'; END IF;
 IF (SELECT count(*) FROM public.rotation_state) <> 1 THEN RAISE EXCEPTION 'Baseline rotation count changed'; END IF;
 SELECT * INTO v_baseline FROM public.rotation_state LIMIT 1;
 INSERT INTO rak_rotation_guard_matrix(key,payload,meta,revision) VALUES ('baseline',v_baseline.payload,v_baseline.meta,v_baseline.revision);
 INSERT INTO rak_rotation_guard_matrix(key,payload,meta) VALUES ('normal','{"months":{"2026-09":{"notes":[{"text":"Novák D"},{"text":"Špadrna NV"}],"hard":{"MFKF06":"06:00-18:00"}}}}'::jsonb,'{}'::jsonb);
 FOREACH v_secret IN ARRAY v_pattern LOOP
  FOR v_case IN SELECT unnest(ARRAY['payload','meta']) LOOP
   BEGIN
    IF v_case='payload' THEN
     INSERT INTO rak_rotation_guard_matrix(key,payload,meta) VALUES ('reject',jsonb_build_object('months',jsonb_build_object('2026-09',jsonb_build_object('notes',jsonb_build_array(jsonb_build_object('text',v_secret))))),'{}'::jsonb);
    ELSE
     INSERT INTO rak_rotation_guard_matrix(key,payload,meta) VALUES ('reject','{}'::jsonb,jsonb_build_object('label',jsonb_build_object('nested',v_secret)));
    END IF;
    RAISE EXCEPTION 'Sensitive text accepted in %',v_case;
   EXCEPTION WHEN check_violation THEN v_rejected:=v_rejected+1;
   END;
  END LOOP;
 END LOOP;
 IF v_rejected<>16 OR (SELECT count(*) FROM rak_rotation_guard_matrix)<>2 THEN RAISE EXCEPTION 'Rejection count or valid schedule regression'; END IF;
 IF NOT has_table_privilege('anon','public.rotation_state','SELECT') OR NOT has_function_privilege('anon','public.rak_lookup_account_for_login_v1(text)','EXECUTE') OR has_table_privilege('anon','public.game_accounts','SELECT') THEN RAISE EXCEPTION 'OS-only public surface changed'; END IF;
 IF (SELECT count(*) FROM private.rak_employee_auth_links WHERE enabled)<>0 THEN RAISE EXCEPTION 'Unexpected employee Auth enrollment'; END IF;
END $test$;
SET LOCAL ROLE anon;
DO $anon$ BEGIN
 IF has_schema_privilege(current_user,'private','USAGE') THEN RAISE EXCEPTION 'Anonymous access to private schema'; END IF;
 IF (SELECT count(*) FROM public.rotation_state)<>1 THEN RAISE EXCEPTION 'Anonymous rotation blocked'; END IF;
END $anon$;
ROLLBACK;
SELECT 'PASS: 16 forbidden text writes blocked, existing+synthetic schedule accepted, OS login and public rotation unchanged; rollback' AS result;
