create or replace function public.rak_lookup_account_for_login_v4(p_last4 text)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $function$
declare
  v_result jsonb;
  v_settings jsonb;
  v_assignment text;
  v_shift text;
begin
  v_result := public.rak_lookup_account_for_login_v3(p_last4);
  if coalesce(v_result->>'ok','false') <> 'true' then return v_result; end if;

  v_shift := upper(coalesce(v_result->>'shiftTeam','D'));
  if v_shift not in ('A','B','C','D') then v_shift := 'D'; end if;

  select ms.settings_json
    into v_settings
    from public.machine_settings as ms
   where coalesce(ms.machine_key,'')='WORKER_ROSTER_SETTINGS'
      or coalesce(ms.settings_json->>'admin_settings_key','')='WORKER_ROSTER_SETTINGS'
      or coalesce(ms.settings_json->>'stored_category','')='worker_roster_settings'
   order by case when coalesce(ms.machine_key,'')='WORKER_ROSTER_SETTINGS' then 0 else 1 end
   limit 1;

  if v_settings is not null then
    select lower(coalesce(entry->>'calendarAssignment', entry->>'calendar_assignment', entry->>'workGroup', entry->>'work_group', ''))
      into v_assignment
      from pg_catalog.jsonb_array_elements(coalesce(v_settings->'appAccounts', v_settings->'applicationAccounts', '[]'::jsonb)) as entry
     where pg_catalog.btrim(coalesce(entry->>'loginNumber', entry->>'login_number', ''))=coalesce(v_result->>'accountNumber','')
     limit 1;
  end if;

  if v_assignment is null or v_assignment !~ '^(obrabeni|kalirna)-[abcd]$' then
    v_assignment := 'obrabeni-' || lower(v_shift);
  end if;
  v_assignment := split_part(v_assignment,'-',1) || '-' || upper(split_part(v_assignment,'-',2));

  return v_result || pg_catalog.jsonb_build_object('calendarAssignment', v_assignment);
end;
$function$;

revoke all on function public.rak_lookup_account_for_login_v4(text) from public, anon, authenticated;
grant execute on function public.rak_lookup_account_for_login_v4(text) to anon, authenticated, service_role;

comment on function public.rak_lookup_account_for_login_v4(text) is
  'RaK 1.7.149 bounded single-account login lookup. Extends V3 with only the resolved account calendar assignment (Obrabeni/Kalirna A-D).';
