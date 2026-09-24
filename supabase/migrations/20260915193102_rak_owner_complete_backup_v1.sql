create or replace function public.rak_owner_complete_backup_v1()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_public_data jsonb := '{}'::jsonb;
  v_table record;
  v_rows jsonb;
  v_auth_users jsonb := '[]'::jsonb;
  v_auth_identities jsonb := '[]'::jsonb;
  v_storage_buckets jsonb := '[]'::jsonb;
  v_storage_objects jsonb := '[]'::jsonb;
  v_secret_count bigint := 0;
begin
  perform private.rak_require_admin(true);

  for v_table in
    select c.relname as table_name
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname <> 'rak_admin_secrets'
    order by c.relname
  loop
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from public.%I t',
      v_table.table_name
    ) into v_rows;
    v_public_data := v_public_data || jsonb_build_object(v_table.table_name, coalesce(v_rows, '[]'::jsonb));
  end loop;

  select count(*) into v_secret_count from public.rak_admin_secrets;

  select coalesce(jsonb_agg(
    to_jsonb(u) - array[
      'encrypted_password',
      'confirmation_token',
      'recovery_token',
      'email_change_token_new',
      'email_change_token_current',
      'phone_change_token',
      'reauthentication_token'
    ]::text[]
    order by u.created_at
  ), '[]'::jsonb)
  into v_auth_users
  from auth.users u;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id,
    'user_id', i.user_id,
    'provider_id', i.provider_id,
    'provider', i.provider,
    'email', i.email,
    'last_sign_in_at', i.last_sign_in_at,
    'created_at', i.created_at,
    'updated_at', i.updated_at
  ) order by i.created_at), '[]'::jsonb)
  into v_auth_identities
  from auth.identities i;

  select coalesce(jsonb_agg(to_jsonb(b) order by b.id), '[]'::jsonb)
  into v_storage_buckets
  from storage.buckets b;

  select coalesce(jsonb_agg(to_jsonb(o) order by o.bucket_id, o.name), '[]'::jsonb)
  into v_storage_objects
  from storage.objects o;

  return jsonb_build_object(
    'format', 'rak-complete-backup-v1',
    'generated_at', pg_catalog.clock_timestamp(),
    'database', jsonb_build_object(
      'database_name', current_database(),
      'server_version', current_setting('server_version'),
      'server_version_num', current_setting('server_version_num')
    ),
    'data', jsonb_build_object(
      'public', v_public_data,
      'auth', jsonb_build_object(
        'users_sanitized', v_auth_users,
        'identities_sanitized', v_auth_identities
      ),
      'storage', jsonb_build_object(
        'buckets', v_storage_buckets,
        'objects', v_storage_objects
      ),
      'redacted', jsonb_build_object(
        'rak_admin_secrets_row_count', v_secret_count
      )
    ),
    'schema', jsonb_build_object(
      'tables', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'schema', n.nspname,
          'name', c.relname,
          'rls_enabled', c.relrowsecurity,
          'rls_forced', c.relforcerowsecurity,
          'owner', pg_catalog.pg_get_userbyid(c.relowner)
        ) order by n.nspname, c.relname), '[]'::jsonb)
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        where n.nspname in ('public','private') and c.relkind = 'r'
      ),
      'columns', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'schema', c.table_schema,
          'table', c.table_name,
          'column', c.column_name,
          'ordinal', c.ordinal_position,
          'data_type', c.data_type,
          'udt_name', c.udt_name,
          'nullable', c.is_nullable,
          'default', c.column_default,
          'identity', c.is_identity,
          'generated', c.is_generated
        ) order by c.table_schema, c.table_name, c.ordinal_position), '[]'::jsonb)
        from information_schema.columns c
        where c.table_schema in ('public','private')
      ),
      'constraints', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'schema', n.nspname,
          'table', cl.relname,
          'name', con.conname,
          'type', con.contype,
          'definition', pg_catalog.pg_get_constraintdef(con.oid, true)
        ) order by n.nspname, cl.relname, con.conname), '[]'::jsonb)
        from pg_catalog.pg_constraint con
        join pg_catalog.pg_class cl on cl.oid = con.conrelid
        join pg_catalog.pg_namespace n on n.oid = cl.relnamespace
        where n.nspname in ('public','private')
      ),
      'indexes', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'schema', schemaname,
          'table', tablename,
          'name', indexname,
          'definition', indexdef
        ) order by schemaname, tablename, indexname), '[]'::jsonb)
        from pg_catalog.pg_indexes
        where schemaname in ('public','private')
      ),
      'views', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'schema', schemaname,
          'name', viewname,
          'owner', viewowner,
          'definition', definition
        ) order by schemaname, viewname), '[]'::jsonb)
        from pg_catalog.pg_views
        where schemaname in ('public','private')
      ),
      'sequences', (
        select coalesce(jsonb_agg(to_jsonb(s) order by s.schemaname, s.sequencename), '[]'::jsonb)
        from pg_catalog.pg_sequences s
        where s.schemaname in ('public','private')
      ),
      'policies', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'schema', p.schemaname,
          'table', p.tablename,
          'name', p.policyname,
          'permissive', p.permissive,
          'roles', p.roles,
          'command', p.cmd,
          'using', p.qual,
          'with_check', p.with_check
        ) order by p.schemaname, p.tablename, p.policyname), '[]'::jsonb)
        from pg_catalog.pg_policies p
        where p.schemaname in ('public','storage')
      ),
      'functions', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'schema', n.nspname,
          'name', p.proname,
          'identity_arguments', pg_catalog.pg_get_function_identity_arguments(p.oid),
          'security_definer', p.prosecdef,
          'definition', pg_catalog.pg_get_functiondef(p.oid)
        ) order by n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid)), '[]'::jsonb)
        from pg_catalog.pg_proc p
        join pg_catalog.pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('public','private')
          and (p.proname like 'rak_%' or n.nspname = 'private')
      ),
      'triggers', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'schema', n.nspname,
          'table', c.relname,
          'name', t.tgname,
          'definition', pg_catalog.pg_get_triggerdef(t.oid, true)
        ) order by n.nspname, c.relname, t.tgname), '[]'::jsonb)
        from pg_catalog.pg_trigger t
        join pg_catalog.pg_class c on c.oid = t.tgrelid
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        where not t.tgisinternal
          and n.nspname in ('public','auth','storage')
      ),
      'table_grants', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'schema', g.table_schema,
          'table', g.table_name,
          'grantor', g.grantor,
          'grantee', g.grantee,
          'privilege', g.privilege_type,
          'grantable', g.is_grantable
        ) order by g.table_schema, g.table_name, g.grantee, g.privilege_type), '[]'::jsonb)
        from information_schema.table_privileges g
        where g.table_schema in ('public','private')
      ),
      'routine_grants', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'schema', g.routine_schema,
          'routine', g.routine_name,
          'grantor', g.grantor,
          'grantee', g.grantee,
          'privilege', g.privilege_type,
          'grantable', g.is_grantable
        ) order by g.routine_schema, g.routine_name, g.grantee), '[]'::jsonb)
        from information_schema.routine_privileges g
        where g.routine_schema in ('public','private')
          and (g.routine_name like 'rak_%' or g.routine_schema = 'private')
      ),
      'extensions', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'name', e.extname,
          'version', e.extversion,
          'schema', n.nspname
        ) order by e.extname), '[]'::jsonb)
        from pg_catalog.pg_extension e
        join pg_catalog.pg_namespace n on n.oid = e.extnamespace
      ),
      'publications', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'publication', p.pubname,
          'all_tables', p.puballtables,
          'insert', p.pubinsert,
          'update', p.pubupdate,
          'delete', p.pubdelete,
          'truncate', p.pubtruncate
        ) order by p.pubname), '[]'::jsonb)
        from pg_catalog.pg_publication p
      ),
      'publication_tables', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'publication', p.pubname,
          'schema', p.schemaname,
          'table', p.tablename
        ) order by p.pubname, p.schemaname, p.tablename), '[]'::jsonb)
        from pg_catalog.pg_publication_tables p
      )
    ),
    'sensitive_exclusions', jsonb_build_array(
      'public.rak_admin_secrets.secret_hash (only row count is included)',
      'auth.users encrypted_password and one-time/recovery/change tokens',
      'auth.sessions and auth.refresh_tokens',
      'Supabase secret/service-role keys, JWT signing secrets and database passwords',
      'Vercel environment secrets'
    )
  );
end;
$$;

revoke all on function public.rak_owner_complete_backup_v1() from public;
revoke all on function public.rak_owner_complete_backup_v1() from anon;
grant execute on function public.rak_owner_complete_backup_v1() to authenticated, service_role;

notify pgrst, 'reload schema';;
