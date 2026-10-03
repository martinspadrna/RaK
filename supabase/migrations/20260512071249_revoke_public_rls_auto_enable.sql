-- The production project opted into this helper before migrations were captured,
-- while fresh Supabase Preview databases do not contain it. Keep the historical
-- revoke effective where the helper exists and make clean migration replay safe.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end
$$;
