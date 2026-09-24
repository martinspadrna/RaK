create or replace function public.rak_admin_list_rotation_backups(p_admin_pin text default null, p_limit integer default 30)
returns table(
  id uuid,
  key text,
  replaced_at timestamptz,
  previous_updated_at timestamptz,
  meta jsonb,
  replaced_by_meta jsonb,
  month_count integer,
  daymod_count integer,
  source text,
  month_key text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.rak_verify_admin_pin(p_admin_pin) then
    raise exception 'RAK_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  return query
  select
    b.id,
    b.key,
    b.replaced_at,
    b.previous_updated_at,
    coalesce(b.meta, '{}'::jsonb) as meta,
    coalesce(b.replaced_by_meta, '{}'::jsonb) as replaced_by_meta,
    coalesce((
      select count(*)::integer
      from jsonb_each(coalesce(b.payload->'months', '{}'::jsonb)) as m(key, value)
    ), 0) as month_count,
    coalesce((
      select sum(case when jsonb_typeof(m.value->'dayMods') = 'array' then jsonb_array_length(m.value->'dayMods') else 0 end)::integer
      from jsonb_each(coalesce(b.payload->'months', '{}'::jsonb)) as m(key, value)
    ), 0) as daymod_count,
    coalesce(b.replaced_by_meta->>'source', b.meta->>'source', '') as source,
    coalesce(b.replaced_by_meta->>'monthKey', b.meta->>'monthKey', '') as month_key
  from public.rotation_state_backups b
  order by b.replaced_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 100));
end;
$$;

revoke execute on function public.rak_admin_list_rotation_backups(text, integer) from public;
grant execute on function public.rak_admin_list_rotation_backups(text, integer) to anon, authenticated;;
