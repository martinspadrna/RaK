-- RaK 1.7.54: rollback-only snapshot coverage and in-memory cross-reference audit.
-- Run manually ONLY in TEST Supabase cgshssdjgzzuprlwnabl; never run against production.
-- Uses a legitimate existing owner Auth session row with locally simulated claims:
-- DB authorization check, NOT a signed-JWT/real-login test and NOT an independent restore.
-- Existing public table row-count, Auth references, private import rows and Storage counts.
BEGIN;
DO $audit$
DECLARE
  uid uuid; sid uuid; snapshot jsonb; tab record; live_rows bigint; table_count integer:=0; item jsonb;
BEGIN
  SELECT p.user_id,s.id INTO uid,sid
  FROM public.rak_admin_profiles p JOIN auth.sessions s ON s.user_id=p.user_id
  WHERE p.enabled AND p.role='owner' ORDER BY s.created_at DESC LIMIT 1;
  IF sid IS NULL THEN RAISE EXCEPTION 'Owner Auth session missing'; END IF;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',uid,'session_id',sid,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  snapshot:=public.rak_owner_complete_backup_v1();
  EXECUTE 'RESET ROLE';
  IF snapshot->>'format'<>'rak-complete-backup-v1' THEN RAISE EXCEPTION 'Unexpected snapshot format'; END IF;
  FOR tab IN SELECT c.relname AS name FROM pg_class c
    JOIN pg_namespace ns ON ns.oid=c.relnamespace
    WHERE ns.nspname='public' AND c.relkind='r' AND c.relname<>'rak_admin_secrets'
  LOOP
    IF NOT (snapshot#>'{data,public}' ? tab.name) THEN RAISE EXCEPTION 'Missing snapshot table %',tab.name; END IF;
    EXECUTE format('SELECT count(*) FROM public.%I',tab.name) INTO live_rows;
    IF jsonb_array_length(snapshot#>'{data,public}'->tab.name)<>live_rows THEN
      RAISE EXCEPTION 'row-count mismatch for %',tab.name;
    END IF;
    table_count:=table_count+1;
  END LOOP;
  IF table_count<>19 OR (SELECT count(*) FROM jsonb_object_keys(snapshot#>'{data,public}'))<>table_count THEN
    RAISE EXCEPTION 'Public table inventory mismatch';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(snapshot#>'{schema,tables}') e
    WHERE e->>'schema'='private' AND e->>'name'='rak_rotation_import_metadata_v1') THEN
    RAISE EXCEPTION 'Private import schema missing';
  END IF;
  IF jsonb_array_length(snapshot#>'{data,private,rak_rotation_import_metadata_v1}')<>
        (SELECT count(*) FROM private.rak_rotation_import_metadata_v1)
    OR jsonb_array_length(snapshot#>'{data,auth,users_sanitized}')<>(SELECT count(*) FROM auth.users)
    OR jsonb_array_length(snapshot#>'{data,auth,identities_sanitized}')<>(SELECT count(*) FROM auth.identities)
    OR jsonb_array_length(snapshot#>'{data,storage,objects}')<>(SELECT count(*) FROM storage.objects)
  THEN RAISE EXCEPTION 'Private, Auth or Storage row-count mismatch'; END IF;
  FOR item IN
    SELECT value FROM jsonb_array_elements(snapshot#>'{data,public,rak_admin_profiles}')
    UNION ALL SELECT value FROM jsonb_array_elements(snapshot#>'{data,public,rak_admin_devices}')
    UNION ALL SELECT value FROM jsonb_array_elements(snapshot#>'{data,auth,identities_sanitized}')
  LOOP
    IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(snapshot#>'{data,auth,users_sanitized}') x
                  WHERE x->>'id'=item->>'user_id') THEN
      RAISE EXCEPTION 'Orphaned admin/identity Auth reference';
    END IF;
  END LOOP;
  RAISE NOTICE 'PASS: 19 public tables, Auth, import and Storage counts and references; rolling back';
END $audit$;
ROLLBACK;
-- A successful empty result indicates completed assertions; no account, session, rotation or backup is changed.
