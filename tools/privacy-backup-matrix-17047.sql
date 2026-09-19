-- RaK 1.7.47 TEST DB regression. All attempted mutations are rolled back.
BEGIN;
DO $verify$
DECLARE
  current_payload jsonb;
  backup_payload jsonb;
  bad_payload jsonb;
  blocked boolean := false;
  protected_before jsonb;
  key_name text;
BEGIN
  SELECT payload INTO current_payload FROM public.rotation_state WHERE key='main';
  SELECT payload INTO backup_payload FROM public.rak_rotation_backups_v2 ORDER BY replaced_at DESC LIMIT 1;
  IF current_payload IS NULL OR backup_payload IS NULL THEN
    RAISE EXCEPTION '[17047] missing rotation or backup fixture';
  END IF;
  IF NOT private.rak_rotation_backup_months_shape_v1(backup_payload) THEN
    RAISE EXCEPTION '[17047] valid legacy backup rejected';
  END IF;
  IF private.rak_rotation_has_restricted_public_key(current_payload) THEN
    RAISE EXCEPTION '[17047] existing rotation rejected';
  END IF;
  FOREACH key_name IN ARRAY ARRAY['accountNumber','account_number','personalNumber','userId','roster','fullName','employees'] LOOP
    IF NOT private.rak_rotation_has_restricted_public_key(
       pg_catalog.jsonb_build_object('nested', pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(key_name,'synthetic')))) THEN
      RAISE EXCEPTION '[17047] missing restricted identifier alias';
    END IF;
  END LOOP;
  IF private.rak_rotation_has_restricted_public_key('{"person":"Example","code":"D","text":"Dovolená"}'::jsonb) THEN
    RAISE EXCEPTION '[17047] legitimate absence structure rejected';
  END IF;
  bad_payload := pg_catalog.jsonb_build_object('months',pg_catalog.jsonb_build_object('1/26',
     pg_catalog.jsonb_build_object('hard','{}'::jsonb,'soft','{}'::jsonb,'notes','broken')));
  IF private.rak_rotation_backup_months_shape_v1(bad_payload) THEN
    RAISE EXCEPTION '[17047] malformed notes were accepted';
  END IF;
  bad_payload := pg_catalog.jsonb_build_object('months',pg_catalog.jsonb_build_object('1/26',
     pg_catalog.jsonb_build_object('hard','{}'::jsonb,'soft','{}'::jsonb,'notes','[{"person":"Example","code":"D","date":"2026-01-01","text":"Dovolená"}]'::jsonb)));
  IF private.rak_rotation_backup_months_shape_v1(bad_payload) THEN
    RAISE EXCEPTION '[17047] missing shift in note was accepted';
  END IF;
  blocked:=false;
  BEGIN
    INSERT INTO public.rak_rotation_backups_v2(
      rotation_key,payload,meta,revision,source,month_key,month_count,daymod_count,created_by,created_by_account_id,replaced_at)
    SELECT rotation_key,bad_payload,meta,revision,source,month_key,month_count,daymod_count,
           created_by,created_by_account_id,replaced_at
    FROM public.rak_rotation_backups_v2 ORDER BY replaced_at DESC LIMIT 1;
  EXCEPTION WHEN check_violation THEN blocked:=true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION '[17047] corrupted backup insert did not fail closed'; END IF;
  UPDATE public.machine_settings SET settings_json=settings_json WHERE machine_key='TPKW01';
  IF NOT FOUND THEN RAISE EXCEPTION '[17047] safe calculator fixture unavailable'; END IF;
  blocked:=false;
  BEGIN
    UPDATE public.machine_settings SET settings_json=settings_json || '{"accountNumber":"1234"}'::jsonb
    WHERE machine_key='TPKW01';
  EXCEPTION WHEN check_violation THEN blocked:=true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION '[17047] public machine identifier was not blocked'; END IF;
  blocked:=false;
  BEGIN
    UPDATE public.machine_settings SET settings_json=settings_json || '{"contactEmail":"example@example.com"}'::jsonb
    WHERE machine_key='TPKW01';
  EXCEPTION WHEN check_violation THEN blocked:=true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION '[17047] public machine email was not blocked'; END IF;
  SELECT settings_json INTO protected_before FROM public.machine_settings WHERE machine_key='WORKER_ROSTER_SETTINGS';
  IF protected_before IS NULL THEN RAISE EXCEPTION '[17047] private roster fixture unavailable'; END IF;
  UPDATE public.machine_settings SET settings_json=settings_json WHERE machine_key='WORKER_ROSTER_SETTINGS';
  IF NOT FOUND THEN RAISE EXCEPTION '[17047] private roster update blocked'; END IF;
  IF pg_catalog.has_function_privilege('anon','private.rak_rotation_backup_months_shape_v1(jsonb)','EXECUTE')
    OR pg_catalog.has_function_privilege('anon','private.rak_rotation_has_restricted_public_key(jsonb)','EXECUTE') THEN
    RAISE EXCEPTION '[17047] private helper privilege regression';
  END IF;
  IF (SELECT count(*) FROM public.rak_rotation_backups_v2 WHERE private.rak_rotation_backup_months_shape_v1(payload))
     IS DISTINCT FROM (SELECT count(*) FROM public.rak_rotation_backups_v2) THEN
    RAISE EXCEPTION '[17047] legacy snapshot drift';
  END IF;
END;
$verify$;
SET LOCAL ROLE anon;
DO $anon$
BEGIN
 IF pg_catalog.has_table_privilege('anon','public.game_accounts','SELECT')
   OR pg_catalog.has_table_privilege('anon','public.rak_rotation_backups_v2','SELECT') THEN
   RAISE EXCEPTION '[17047] anonymous privilege regression';
 END IF;
END;
$anon$;
ROLLBACK;
