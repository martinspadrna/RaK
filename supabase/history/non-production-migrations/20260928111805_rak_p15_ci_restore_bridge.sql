-- RaK P1.5 TEST-only bridge for a zero-cost isolated restore drill.
-- This migration never touches production. Normal authenticated callers still need owner permission.
do $rak_p15$
declare
  v_name text;
  v_def text;
  v_patched text;
begin
  foreach v_name in array array[
    'rak_owner_complete_backup_manifest_v2',
    'rak_owner_complete_backup_table_v2'
  ]
  loop
    select pg_get_functiondef(p.oid)
      into v_def
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=v_name
    order by p.oid
    limit 1;

    if v_def is null then
      raise exception 'P1.5 prerequisite function missing: %', v_name;
    end if;

    v_patched := replace(
      v_def,
      '  PERFORM private.rak_require_admin(true);',
      E'  IF COALESCE(auth.jwt()->>''role'','''') <> ''service_role'' THEN\n    PERFORM private.rak_require_admin(true);\n  END IF;'
    );

    if v_patched = v_def then
      raise exception 'P1.5 backup guard patch point not found: %', v_name;
    end if;

    execute v_patched;
  end loop;
end
$rak_p15$;

create or replace function public.rak_owner_complete_backup_migrations_v1()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then
    perform private.rak_require_admin(true);
  end if;

  return jsonb_build_object(
    'format','rak-complete-backup-migrations-v1',
    'migrations',
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'version',m.version,
            'name',m.name,
            'statements',to_jsonb(m.statements)
          )
          order by m.version
        )
        from supabase_migrations.schema_migrations m
      ),'[]'::jsonb)
  );
end
$function$;

revoke all on function public.rak_owner_complete_backup_migrations_v1() from public, anon;
grant execute on function public.rak_owner_complete_backup_migrations_v1() to authenticated, service_role;

revoke all on function public.rak_owner_complete_backup_manifest_v2() from public, anon;
grant execute on function public.rak_owner_complete_backup_manifest_v2() to authenticated, service_role;
revoke all on function public.rak_owner_complete_backup_table_v2(text) from public, anon;
grant execute on function public.rak_owner_complete_backup_table_v2(text) to authenticated, service_role;
