-- RaK 1.7.55: repeatable rollback-only physical JSON round trip inside TEST PostgreSQL.
-- Execute ONLY against cgshssdjgzzuprlwnabl. Never production. No external Auth JWT,
-- no independent Supabase project, no persistent writes. Do not return PII or snapshot.
BEGIN;
DO $restore$
DECLARE
  v_owner uuid; v_session uuid:=gen_random_uuid(); v_snapshot jsonb;
  v_table text; v_rows jsonb; v_shadow text;
  v_original jsonb; v_restored jsonb;
  v_tables int:=0; v_total bigint:=0; v_deleted bigint;
BEGIN
  SELECT user_id INTO STRICT v_owner FROM public.rak_admin_profiles WHERE role='owner' AND enabled;
  INSERT INTO auth.sessions(id,user_id,created_at,updated_at)
    VALUES(v_session,v_owner,now()-interval '1 hour',now()-interval '1 hour');
  INSERT INTO public.rak_admin_devices(user_id,session_id,device_id,label)
    VALUES(v_owner,v_session,'rak-17055-rollback-'||v_session::text,'Rollback-only restore test');
  PERFORM set_config('request.jwt.claims',jsonb_build_object(
    'sub',v_owner,'session_id',v_session,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT public.rak_owner_complete_backup_v1() INTO v_snapshot;
  EXECUTE 'RESET ROLE';
  IF v_snapshot->>'format' IS DISTINCT FROM 'rak-complete-backup-v1'
    OR jsonb_typeof(v_snapshot #> '{data,private,rak_rotation_import_metadata_v1}') IS DISTINCT FROM 'array'
    OR (v_snapshot #> '{data,public,rak_admin_secrets}') IS NOT NULL
    THEN RAISE EXCEPTION 'RESTORE: invalid or unsafe owner snapshot'; END IF;
  FOR v_table IN SELECT jsonb_object_keys(v_snapshot #> '{data,public}') LOOP
    IF to_regclass(format('public.%I',v_table)) IS NULL
      THEN RAISE EXCEPTION 'RESTORE: unknown table %',v_table; END IF;
    v_shadow:='rak_17055_shadow_'||v_table;
    EXECUTE format('CREATE TEMP TABLE %I AS SELECT * FROM public.%I WITH NO DATA',v_shadow,v_table);
    v_rows:=v_snapshot #> ARRAY['data','public',v_table];
    IF jsonb_typeof(v_rows) IS DISTINCT FROM 'array'
      THEN RAISE EXCEPTION 'RESTORE: invalid table rows %',v_table; END IF;
    EXECUTE format('INSERT INTO pg_temp.%I SELECT * FROM jsonb_populate_recordset(NULL::public.%I,$1)',
      v_shadow,v_table) USING v_rows;
    EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),''[]''::jsonb) FROM pg_temp.%I t',
      v_shadow) INTO v_restored;
    SELECT coalesce(jsonb_agg(x ORDER BY x::text),'[]'::jsonb)
      INTO v_original FROM jsonb_array_elements(v_rows) x;
    IF v_original IS DISTINCT FROM v_restored
      THEN RAISE EXCEPTION 'RESTORE: content mismatch %',v_table; END IF;
    v_tables:=v_tables+1; v_total:=v_total+jsonb_array_length(v_rows);
  END LOOP;
  IF v_tables<>19 OR v_total<1 THEN
    RAISE EXCEPTION 'RESTORE: expected 19 tables, got %',v_tables; END IF;
  IF jsonb_array_length(v_snapshot #> '{data,auth,users_sanitized}')<1
    THEN RAISE EXCEPTION 'RESTORE: missing sanitized Auth users'; END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_snapshot #> '{data,public,rak_admin_profiles}') x
    WHERE NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_snapshot #> '{data,auth,users_sanitized}') u
      WHERE u->>'id'=x->>'user_id'))
    THEN RAISE EXCEPTION 'RESTORE: orphan Auth profile'; END IF;
  SELECT coalesce(jsonb_agg(x ORDER BY x::text),'[]'::jsonb)
    INTO v_original FROM jsonb_array_elements(v_snapshot #> '{data,public,rotation_state}') x;
  DELETE FROM pg_temp.rak_17055_shadow_rotation_state
    WHERE ctid=(SELECT ctid FROM pg_temp.rak_17055_shadow_rotation_state LIMIT 1);
  GET DIAGNOSTICS v_deleted=ROW_COUNT;
  IF v_deleted<>1 THEN RAISE EXCEPTION 'RESTORE: missing-row probe could not run'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb)
    INTO v_restored FROM pg_temp.rak_17055_shadow_rotation_state t;
  IF v_original IS NOT DISTINCT FROM v_restored
    THEN RAISE EXCEPTION 'RESTORE: missing row went unnoticed'; END IF;
  RAISE NOTICE 'PASS TEST ONLY: % public tables / % rows restored to disposable TEMP tables; exact JSON comparison and missing-row rejection; rollback follows',v_tables,v_total;
END $restore$;
ROLLBACK;
SELECT count(*) AS temporary_test_devices_remaining
FROM public.rak_admin_devices WHERE device_id LIKE 'rak-17055-rollback-%';
-- Expected: 0. This does not restore Auth credentials, RLS/triggers, Storage, or a new project.
