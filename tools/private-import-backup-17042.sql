-- RaK 1.7.42: readonly, transactional backup security/roundtrip smoke. TEST only.
BEGIN;
DO $assert$
DECLARE source text := pg_get_functiondef('public.rak_owner_complete_backup_v1()'::regprocedure);
BEGIN
  IF position('perform private.rak_require_admin(true);' IN source) = 0 THEN
    RAISE EXCEPTION 'Owner-only guard lost';
  END IF;
  IF position('''private'', jsonb_build_object(' IN source) = 0 OR
     position('''rak_rotation_import_metadata_v1'', (select coalesce(jsonb_agg(' IN source) = 0 THEN
    RAISE EXCEPTION 'Private archive missing from complete snapshot';
  END IF;
  IF has_function_privilege('anon', 'public.rak_owner_complete_backup_v1()', 'EXECUTE') OR
     has_table_privilege('anon', 'private.rak_rotation_import_metadata_v1', 'SELECT') OR
     has_table_privilege('authenticated', 'private.rak_rotation_import_metadata_v1', 'SELECT') THEN
    RAISE EXCEPTION 'Private import provenance exposed';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.rak_owner_complete_backup_v1()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Owner RPC is unreachable by authenticated owner';
  END IF;
END;
$assert$;
SET LOCAL ROLE anon;
DO $anon$
BEGIN
  BEGIN
    PERFORM public.rak_owner_complete_backup_v1();
    RAISE EXCEPTION 'Anonymous complete backup unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$anon$;
RESET ROLE;
DO $roundtrip$
DECLARE packed jsonb; source_count integer; record_count integer;
BEGIN
  SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.rotation_key,t.month_key),'[]'::jsonb)
    INTO packed FROM private.rak_rotation_import_metadata_v1 t;
  SELECT count(*) INTO source_count FROM private.rak_rotation_import_metadata_v1;
  record_count := jsonb_array_length(packed);
  IF record_count <> source_count THEN RAISE EXCEPTION 'Private archive row loss in JSON snapshot'; END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(packed) AS item(value)
    WHERE NOT (item.value ? 'rotation_key' AND item.value ? 'month_key'
      AND item.value ? 'import_metadata' AND item.value ? 'archived_at')
  ) THEN RAISE EXCEPTION 'Archive JSON lost recovery columns'; END IF;
  IF (SELECT revision FROM public.rotation_state WHERE key='main') IS NULL THEN
    RAISE EXCEPTION 'Main rotation revision missing';
  END IF;
END;
$roundtrip$;
ROLLBACK;
