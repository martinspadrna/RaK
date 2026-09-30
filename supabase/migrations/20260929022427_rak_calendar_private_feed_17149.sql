create or replace function public.rak_calendar_private_feed(p_source_id text)
returns text
language plpgsql
security definer
set search_path = ''
as $rak$
declare
  v_source text := btrim(coalesce(p_source_id,''));
  v_secret_name text;
  v_url text;
  v_response extensions.http_response;
  v_content text;
begin
  v_secret_name := case v_source
    when 'd5be95a22ab9eaad50fbe177a127966aa6cf9542c8d7060f109f8b007d1e22ee@group.calendar.google.com' then 'rak_calendar_kalirna_a_ics'
    when '510fa715a70e00fa40b555ae624f3da8d61dccda4fd9450e73a0798927bcb7bb@group.calendar.google.com' then 'rak_calendar_kalirna_b_ics'
    when 'dadcfb3ad2302f9f7819b4a668c0bb72d001b8bf5bcd71f98ef7b85e39a55ae3@group.calendar.google.com' then 'rak_calendar_kalirna_c_ics'
    when '28220cf74cf3681b41feb5c0efa76ef348e52e9a90a9b5300e1dfffbcc96cd62@group.calendar.google.com' then 'rak_calendar_kalirna_d_ics'
    else null
  end;
  if v_secret_name is null then return null; end if;

  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name=v_secret_name
  limit 1;

  if coalesce(v_url,'') !~ '^https://calendar[.]google[.]com/calendar/ical/[A-Za-z0-9%._+@=-]+/private-[A-Za-z0-9_-]+/basic[.]ics$' then
    return null;
  end if;

  select * into v_response from extensions.http_get(v_url::varchar);
  if v_response.status < 200 or v_response.status >= 300 then return null; end if;

  v_content := v_response.content::text;
  if length(v_content) > 2097152
     or position('BEGIN:VCALENDAR' in v_content)=0
     or position('END:VCALENDAR' in v_content)=0 then
    return null;
  end if;

  return v_content;
end
$rak$;

revoke all on function public.rak_calendar_private_feed(text) from public;
revoke all on function public.rak_calendar_private_feed(text) from anon;
revoke all on function public.rak_calendar_private_feed(text) from authenticated;
grant execute on function public.rak_calendar_private_feed(text) to anon, authenticated, service_role;

comment on function public.rak_calendar_private_feed(text) is
  'RaK 1.7.149: allowlisted calendar feed. Private Google ICS URLs stay only in Supabase Vault; this function never returns the secret URL.';
