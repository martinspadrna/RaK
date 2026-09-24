-- RaK 1.7.98 / TEST first. Chunk the owner-only complete backup so large JSON documents
-- are never repeatedly copied with jsonb || inside one statement.
-- The legacy v1 RPC remains untouched as a rollback path.

CREATE OR REPLACE FUNCTION public.rak_owner_complete_backup_table_v2(p_table text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_table text := pg_catalog.btrim(COALESCE(p_table,''));
  v_rows jsonb;
BEGIN
  PERFORM private.rak_require_admin(true);

  IF v_table = ''
     OR v_table = 'rak_admin_secrets'
     OR NOT EXISTS (
       SELECT 1
       FROM pg_catalog.pg_class c
       JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public'
         AND c.relkind='r'
         AND c.relname=v_table
     )
  THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='invalid_backup_table';
  END IF;

  EXECUTE pg_catalog.format(
    'select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from public.%I t',
    v_table
  ) INTO v_rows;

  RETURN pg_catalog.jsonb_build_object(
    'format','rak-complete-backup-table-v2',
    'table',v_table,
    'rows',COALESCE(v_rows,'[]'::jsonb)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.rak_owner_complete_backup_manifest_v2()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_auth_users jsonb := '[]'::jsonb;
  v_auth_identities jsonb := '[]'::jsonb;
  v_storage_buckets jsonb := '[]'::jsonb;
  v_storage_objects jsonb := '[]'::jsonb;
  v_private_imports jsonb := '[]'::jsonb;
  v_public_tables jsonb := '[]'::jsonb;
  v_secret_count bigint := 0;
BEGIN
  PERFORM private.rak_require_admin(true);

  SELECT COALESCE(jsonb_agg(c.relname ORDER BY c.relname),'[]'::jsonb)
    INTO v_public_tables
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public'
    AND c.relkind='r'
    AND c.relname<>'rak_admin_secrets';

  SELECT count(*) INTO v_secret_count FROM public.rak_admin_secrets;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',u.id,
      'aud',u.aud,
      'role',u.role,
      'email',u.email,
      'phone',u.phone,
      'email_confirmed_at',u.email_confirmed_at,
      'phone_confirmed_at',u.phone_confirmed_at,
      'confirmed_at',u.confirmed_at,
      'last_sign_in_at',u.last_sign_in_at,
      'created_at',u.created_at,
      'updated_at',u.updated_at,
      'is_anonymous',u.is_anonymous,
      'is_sso_user',u.is_sso_user,
      'banned_until',u.banned_until,
      'deleted_at',u.deleted_at,
      'raw_app_meta_data',jsonb_strip_nulls(jsonb_build_object(
        'provider',u.raw_app_meta_data->'provider',
        'providers',u.raw_app_meta_data->'providers',
        'rak_role',u.raw_app_meta_data->'rak_role',
        'rak_account_id',u.raw_app_meta_data->'rak_account_id'
      ))
    ) ORDER BY u.created_at
  ),'[]'::jsonb)
  INTO v_auth_users
  FROM auth.users u;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id',i.id,
    'user_id',i.user_id,
    'provider_id',i.provider_id,
    'provider',i.provider,
    'email',i.email,
    'last_sign_in_at',i.last_sign_in_at,
    'created_at',i.created_at,
    'updated_at',i.updated_at
  ) ORDER BY i.created_at),'[]'::jsonb)
  INTO v_auth_identities
  FROM auth.identities i;

  SELECT COALESCE(jsonb_agg(to_jsonb(b) ORDER BY b.id),'[]'::jsonb)
    INTO v_storage_buckets FROM storage.buckets b;

  SELECT COALESCE(jsonb_agg(to_jsonb(o) ORDER BY o.bucket_id,o.name),'[]'::jsonb)
    INTO v_storage_objects FROM storage.objects o;

  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.rotation_key,t.month_key),'[]'::jsonb)
    INTO v_private_imports
  FROM private.rak_rotation_import_metadata_v1 t;

  RETURN jsonb_build_object(
    'format','rak-complete-backup-manifest-v2',
    'generated_at',pg_catalog.clock_timestamp(),
    'database',jsonb_build_object(
      'database_name',current_database(),
      'server_version',current_setting('server_version'),
      'server_version_num',current_setting('server_version_num')
    ),
    'public_tables',v_public_tables,
    'data',jsonb_build_object(
      'private',jsonb_build_object(
        'rak_rotation_import_metadata_v1',v_private_imports
      ),
      'auth',jsonb_build_object(
        'users_sanitized',v_auth_users,
        'identities_sanitized',v_auth_identities
      ),
      'storage',jsonb_build_object(
        'buckets',v_storage_buckets,
        'objects',v_storage_objects
      ),
      'redacted',jsonb_build_object(
        'rak_admin_secrets_row_count',v_secret_count
      )
    ),
    'schema',jsonb_build_object(
      'tables',(
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'schema',n.nspname,'name',c.relname,
          'rls_enabled',c.relrowsecurity,'rls_forced',c.relforcerowsecurity,
          'owner',pg_catalog.pg_get_userbyid(c.relowner)
        ) ORDER BY n.nspname,c.relname),'[]'::jsonb)
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname IN ('public','private') AND c.relkind='r'
      ),
      'columns',(
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'schema',c.table_schema,'table',c.table_name,'column',c.column_name,
          'ordinal',c.ordinal_position,'data_type',c.data_type,'udt_name',c.udt_name,
          'nullable',c.is_nullable,'default',c.column_default,
          'identity',c.is_identity,'generated',c.is_generated
        ) ORDER BY c.table_schema,c.table_name,c.ordinal_position),'[]'::jsonb)
        FROM information_schema.columns c
        WHERE c.table_schema IN ('public','private')
      ),
      'constraints',(
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'schema',n.nspname,'table',cl.relname,'name',con.conname,
          'type',con.contype,'definition',pg_catalog.pg_get_constraintdef(con.oid,true)
        ) ORDER BY n.nspname,cl.relname,con.conname),'[]'::jsonb)
        FROM pg_catalog.pg_constraint con
        JOIN pg_catalog.pg_class cl ON cl.oid=con.conrelid
        JOIN pg_catalog.pg_namespace n ON n.oid=cl.relnamespace
        WHERE n.nspname IN ('public','private')
      ),
      'indexes',(
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'schema',schemaname,'table',tablename,'name',indexname,'definition',indexdef
        ) ORDER BY schemaname,tablename,indexname),'[]'::jsonb)
        FROM pg_catalog.pg_indexes
        WHERE schemaname IN ('public','private')
      ),
      'views',(
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'schema',schemaname,'name',viewname,'owner',viewowner,'definition',definition
        ) ORDER BY schemaname,viewname),'[]'::jsonb)
        FROM pg_catalog.pg_views
        WHERE schemaname IN ('public','private')
      ),
      'sequences',(
        SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.schemaname,s.sequencename),'[]'::jsonb)
        FROM pg_catalog.pg_sequences s
        WHERE s.schemaname IN ('public','private')
      ),
      'policies',(
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'schema',p.schemaname,'table',p.tablename,'name',p.policyname,
          'permissive',p.permissive,'roles',p.roles,'command',p.cmd,
          'using',p.qual,'with_check',p.with_check
        ) ORDER BY p.schemaname,p.tablename,p.policyname),'[]'::jsonb)
        FROM pg_catalog.pg_policies p
        WHERE p.schemaname IN ('public','storage')
      ),
      'functions',(
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'schema',n.nspname,'name',p.proname,
          'identity_arguments',pg_catalog.pg_get_function_identity_arguments(p.oid),
          'security_definer',p.prosecdef,
          'definition',pg_catalog.pg_get_functiondef(p.oid)
        ) ORDER BY n.nspname,p.proname,pg_catalog.pg_get_function_identity_arguments(p.oid)),'[]'::jsonb)
        FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname IN ('public','private')
          AND (p.proname LIKE 'rak_%' OR n.nspname='private')
      ),
      'triggers',(
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'schema',n.nspname,'table',c.relname,'name',t.tgname,
          'definition',pg_catalog.pg_get_triggerdef(t.oid,true)
        ) ORDER BY n.nspname,c.relname,t.tgname),'[]'::jsonb)
        FROM pg_catalog.pg_trigger t
        JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
        JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
        WHERE NOT t.tgisinternal
          AND n.nspname IN ('public','auth','storage')
      ),
      'table_grants',(
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'schema',g.table_schema,'table',g.table_name,'grantor',g.grantor,
          'grantee',g.grantee,'privilege',g.privilege_type,'grantable',g.is_grantable
        ) ORDER BY g.table_schema,g.table_name,g.grantee,g.privilege_type),'[]'::jsonb)
        FROM information_schema.table_privileges g
        WHERE g.table_schema IN ('public','private')
      ),
      'routine_grants',(
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'schema',g.routine_schema,'routine',g.routine_name,'grantor',g.grantor,
          'grantee',g.grantee,'privilege',g.privilege_type,'grantable',g.is_grantable
        ) ORDER BY g.routine_schema,g.routine_name,g.grantee),'[]'::jsonb)
        FROM information_schema.routine_privileges g
        WHERE g.routine_schema IN ('public','private')
          AND (g.routine_name LIKE 'rak_%' OR g.routine_schema='private')
      ),
      'extensions',(
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'name',e.extname,'version',e.extversion,'schema',n.nspname
        ) ORDER BY e.extname),'[]'::jsonb)
        FROM pg_catalog.pg_extension e
        JOIN pg_catalog.pg_namespace n ON n.oid=e.extnamespace
      ),
      'publications',(
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'publication',p.pubname,'all_tables',p.puballtables,
          'insert',p.pubinsert,'update',p.pubupdate,'delete',p.pubdelete,'truncate',p.pubtruncate
        ) ORDER BY p.pubname),'[]'::jsonb)
        FROM pg_catalog.pg_publication p
      ),
      'publication_tables',(
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'publication',p.pubname,'schema',p.schemaname,'table',p.tablename
        ) ORDER BY p.pubname,p.schemaname,p.tablename),'[]'::jsonb)
        FROM pg_catalog.pg_publication_tables p
      )
    ),
    'sensitive_exclusions',jsonb_build_array(
      'public.rak_admin_secrets.secret_hash (only row count is included)',
      'auth.users password, verification/recovery/change tokens, arbitrary user metadata and non-allowlisted app metadata',
      'auth.sessions and auth.refresh_tokens',
      'Supabase secret/service-role keys, JWT signing secrets and database passwords',
      'Vercel environment secrets'
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.rak_owner_complete_backup_table_v2(text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.rak_owner_complete_backup_manifest_v2() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rak_owner_complete_backup_table_v2(text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.rak_owner_complete_backup_manifest_v2() TO authenticated,service_role;

COMMENT ON FUNCTION public.rak_owner_complete_backup_table_v2(text) IS
 'RaK 1.7.98 owner-only bounded table chunk for complete backup; secrets table is never selectable.';
COMMENT ON FUNCTION public.rak_owner_complete_backup_manifest_v2() IS
 'RaK 1.7.98 owner-only backup manifest/schema/auth/storage metadata; public table rows are fetched separately to avoid quadratic jsonb copies.';

-- Verification is intentionally performed by the release/test tooling after this
-- transactional migration succeeds. A failed migration must leave no partial RPCs.
NOTIFY pgrst,'reload schema';
