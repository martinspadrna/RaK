-- RaK TEST Supabase only. Run in the SQL editor of cgshssdjgzzuprlwnabl.
-- This is a rollback-only permission test: no account, rotation or backup is changed.
-- Protected RPCs are discovered dynamically; two intentional public login helpers
-- are excluded. The authenticated-without-session case must deny all 25 RPCs.

BEGIN;
DO $baseline$
BEGIN
  IF (SELECT count(*) FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n
        ON n.oid=p.pronamespace WHERE n.nspname='public'
        AND ((p.proname LIKE 'rak_admin_%' AND p.proname NOT IN
              ('rak_admin_account_requires_auth','rak_admin_auth_capabilities'))
             OR p.proname LIKE 'rak_owner_%' OR p.proname='rak_read_rotation_v1')) < 25
  THEN RAISE EXCEPTION 'Protected RPC inventory unexpectedly reduced'; END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n
               ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'
               AND (has_table_privilege('anon',c.oid,'INSERT')
                    OR has_table_privilege('anon',c.oid,'UPDATE')
                    OR has_table_privilege('anon',c.oid,'DELETE')
                    OR has_table_privilege('authenticated',c.oid,'INSERT')
                    OR has_table_privilege('authenticated',c.oid,'UPDATE')
                    OR has_table_privilege('authenticated',c.oid,'DELETE')))
  THEN RAISE EXCEPTION 'Unexpected direct table write privilege'; END IF;
END $baseline$;

SET LOCAL ROLE anon;
DO $deny_anon$
DECLARE r record; args text; ignored jsonb;
BEGIN
  FOR r IN SELECT n.nspname,f.proname,f.proargtypes
             FROM pg_catalog.pg_proc f JOIN pg_catalog.pg_namespace n
               ON n.oid=f.pronamespace
             WHERE n.nspname='public' AND
               ((f.proname LIKE 'rak_admin_%' AND f.proname NOT IN
                 ('rak_admin_account_requires_auth','rak_admin_auth_capabilities'))
                OR f.proname LIKE 'rak_owner_%' OR f.proname='rak_read_rotation_v1')
  LOOP
    SELECT coalesce(string_agg('NULL::'||pg_catalog.format_type(a.oid,NULL),
                               ', ' ORDER BY a.ord),'') INTO args
      FROM unnest(r.proargtypes::oid[]) WITH ORDINALITY a(oid,ord);
    BEGIN
      EXECUTE format('SELECT to_jsonb(t) FROM %I.%I(%s) AS t',
                     r.nspname,r.proname,args) INTO ignored;
      RAISE EXCEPTION 'Anonymous call unexpectedly succeeded: %',r.proname;
    EXCEPTION WHEN OTHERS THEN
      IF SQLSTATE <> '42501' THEN RAISE; END IF;
    END;
  END LOOP;
  IF (SELECT count(*) FROM public.machine_settings
        WHERE category IN ('rotation_save_backup','admin_change_log',
                           'admin_accounts_settings','admin_full_settings_backup')
           OR machine_key LIKE 'ROTATION_SAVE_BACKUP_%'
           OR machine_key='ADMIN_CHANGE_LOG'
           OR machine_key='ADMIN_ACCOUNTS_SETTINGS'
           OR machine_key LIKE 'ADMIN_FULL_SETTINGS_BACKUP_%') <> 0
  THEN RAISE EXCEPTION 'Anonymous access to protected legacy settings'; END IF;
END $deny_anon$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{}',true);
SELECT set_config('request.jwt.claim.sub','',true);
DO $deny_unsigned$
DECLARE r record; args text; ignored jsonb;
BEGIN
  FOR r IN SELECT n.nspname,f.proname,f.proargtypes
             FROM pg_catalog.pg_proc f JOIN pg_catalog.pg_namespace n
               ON n.oid=f.pronamespace
             WHERE n.nspname='public' AND
               ((f.proname LIKE 'rak_admin_%' AND f.proname NOT IN
                 ('rak_admin_account_requires_auth','rak_admin_auth_capabilities'))
                OR f.proname LIKE 'rak_owner_%' OR f.proname='rak_read_rotation_v1')
  LOOP
    SELECT coalesce(string_agg('NULL::'||pg_catalog.format_type(a.oid,NULL),
                               ', ' ORDER BY a.ord),'') INTO args
      FROM unnest(r.proargtypes::oid[]) WITH ORDINALITY a(oid,ord);
    BEGIN
      EXECUTE format('SELECT to_jsonb(t) FROM %I.%I(%s) AS t',
                     r.nspname,r.proname,args) INTO ignored;
      RAISE EXCEPTION 'Unsigned call unexpectedly succeeded: %',r.proname;
    EXCEPTION WHEN OTHERS THEN
      IF SQLSTATE <> '42501' THEN RAISE; END IF;
    END;
  END LOOP;
END $deny_unsigned$;
ROLLBACK;

-- Owner positive case uses a live session row but *simulates* request claims in SQL.
-- This validates DB authorization, not external JWT signature verification.
BEGIN;
DO $owner_claims$
DECLARE uid uuid; sid uuid;
BEGIN
  SELECT p.user_id,s.id INTO uid,sid
    FROM public.rak_admin_profiles p JOIN auth.sessions s ON s.user_id=p.user_id
    WHERE p.enabled AND p.role='owner' ORDER BY s.created_at DESC LIMIT 1;
  IF uid IS NULL OR sid IS NULL THEN
    RAISE EXCEPTION 'No active owner session for positive test';
  END IF;
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub',uid,'session_id',sid,'role','authenticated')::text,true);
END $owner_claims$;
SET LOCAL ROLE authenticated;
DO $owner_read$
DECLARE ctx jsonb; directory jsonb; snapshot jsonb; account jsonb; metadata jsonb;
BEGIN
  ctx := public.rak_admin_context();
  IF ctx->>'role'<>'owner' THEN RAISE EXCEPTION 'Owner context failed'; END IF;
  directory := public.rak_admin_list_application_accounts_v1();
  IF jsonb_typeof(directory)<>'array' OR jsonb_array_length(directory)<1 THEN
    RAISE EXCEPTION 'Owner directory failed';
  END IF;
  snapshot := public.rak_owner_complete_backup_v1();
  IF snapshot->>'format'<>'rak-complete-backup-v1'
     OR jsonb_typeof(snapshot#>'{data,auth,users_sanitized}')<>'array'
     OR (snapshot#>'{data,public}') ? 'rak_admin_secrets'
  THEN RAISE EXCEPTION 'Owner backup contract failed'; END IF;
  FOR account IN SELECT value FROM jsonb_array_elements(
      snapshot#>'{data,auth,users_sanitized}')
  LOOP
    IF EXISTS (SELECT 1 FROM jsonb_object_keys(account) AS k
        WHERE k NOT IN ('id','aud','role','email','phone','email_confirmed_at',
          'phone_confirmed_at','confirmed_at','last_sign_in_at','created_at',
          'updated_at','is_anonymous','is_sso_user','banned_until','deleted_at',
          'raw_app_meta_data'))
    THEN RAISE EXCEPTION 'Unexpected Auth property in owner ZIP'; END IF;
    metadata := coalesce(account->'raw_app_meta_data','{}'::jsonb);
    IF EXISTS (SELECT 1 FROM jsonb_object_keys(metadata) AS k
        WHERE k NOT IN ('provider','providers','rak_role','rak_account_id'))
    THEN RAISE EXCEPTION 'Unexpected app metadata in owner ZIP'; END IF;
  END LOOP;
END $owner_read$;
ROLLBACK;
SELECT 'OK: public writes blocked; 25 protected RPCs denied without session; owner backup allowlist intact' AS test_result;
