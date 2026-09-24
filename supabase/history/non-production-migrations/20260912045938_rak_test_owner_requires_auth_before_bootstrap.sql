-- Test/staging bootstrap only: before the first Auth user exists, account 9811
-- still has to go through secure admin login so the development client can
-- create the isolated owner in RaK-test. On production this condition is
-- equivalent to the existing enabled owner profile and changes no data.
create or replace function public.rak_admin_account_requires_auth(p_account_id text)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select trim(coalesce(p_account_id, '')) = '9811'
    or exists (
      select 1
      from public.rak_admin_profiles as profile
      where profile.account_id = trim(coalesce(p_account_id, ''))
        and profile.enabled
    )
$function$;
