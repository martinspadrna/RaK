-- TEST Supabase ONLY. All modifications are rolled back.
BEGIN;
DO $check$
DECLARE
  old_payload jsonb;
  old_meta jsonb;
  old_revision bigint;
  new_payload jsonb;
  new_meta jsonb;
  new_revision bigint;
  probe_month_key text;
  fixture jsonb := '{"source":"rak-17040-rollback-probe","hardRows":1}'::jsonb;
  archived jsonb;
BEGIN
  SELECT payload,meta,revision INTO old_payload,old_meta,old_revision
  FROM public.rotation_state WHERE key='main';
  IF old_payload IS NULL THEN RAISE EXCEPTION 'Public rotation missing'; END IF;
  IF jsonb_path_exists(old_payload,'$.months.*.importMeta') THEN
    RAISE EXCEPTION 'Import provenance remains public';
  END IF;
  IF (SELECT count(*) FROM private.rak_rotation_import_metadata_v1 WHERE rotation_key='main') < 1 THEN
    RAISE EXCEPTION 'Private provenance archive is empty';
  END IF;
  IF has_table_privilege('anon','private.rak_rotation_import_metadata_v1','SELECT') THEN
    RAISE EXCEPTION 'Private provenance anonymously readable';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.rotation_state'::regclass
      AND conname='rak_rotation_no_public_current_employee_name_v1' AND convalidated) THEN
    RAISE EXCEPTION 'Public employee-name guard missing';
  END IF;
  SELECT m.key INTO probe_month_key FROM jsonb_each(old_payload->'months') AS m(key,value) ORDER BY m.key LIMIT 1;
  UPDATE public.rotation_state
    SET payload=jsonb_set(payload,ARRAY['months',probe_month_key,'importMeta'],fixture,true)
    WHERE key='main';
  SELECT payload,meta,revision INTO new_payload,new_meta,new_revision
    FROM public.rotation_state WHERE key='main';
  SELECT import_metadata INTO archived FROM private.rak_rotation_import_metadata_v1
    WHERE rotation_key='main' AND private.rak_rotation_import_metadata_v1.month_key=probe_month_key;
  IF archived IS DISTINCT FROM fixture THEN RAISE EXCEPTION 'Future import metadata was not archived'; END IF;
  IF new_payload IS DISTINCT FROM old_payload OR new_meta IS DISTINCT FROM old_meta
     OR new_revision IS DISTINCT FROM old_revision THEN
    RAISE EXCEPTION 'Schedule, absences, administrative metadata or revision changed';
  END IF;
END;
$check$;
SET LOCAL ROLE anon;
SELECT key,revision FROM public.rotation_state WHERE key='main';
ROLLBACK;
