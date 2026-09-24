-- Samostatné účty RaK: přístup do aplikace bez zařazení do pracovního rozpisu.
-- Zápis je dostupný pouze ověřenému administrátorovi přes chráněnou RPC funkci.

create or replace function public.rak_admin_upsert_application_account(
  p_account_number text,
  p_full_name text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  safe_account_number text := trim(coalesce(p_account_number, ''));
  safe_full_name text := trim(coalesce(p_full_name, ''));
  saved public.game_accounts%rowtype;
begin
  perform private.rak_require_admin(false);

  if safe_account_number !~ '^[0-9]{4}$' then
    raise exception 'Osobní číslo musí obsahovat právě 4 číslice.' using errcode = '22023';
  end if;

  if char_length(safe_full_name) < 2 or char_length(safe_full_name) > 160 then
    raise exception 'Jméno musí mít 2 až 160 znaků.' using errcode = '22023';
  end if;

  select * into saved
  from public.game_accounts
  where account_number = safe_account_number
  limit 1;

  if found and saved.full_name <> safe_full_name then
    raise exception 'Přihlašovací číslo už patří jinému účtu.' using errcode = '23505';
  end if;

  if not found then
    insert into public.game_accounts (account_number, full_name, updated_at)
    values (safe_account_number, safe_full_name, now())
    returning * into saved;
  end if;

  perform private.rak_write_admin_audit(
    'application_account.upsert',
    'game_accounts',
    safe_account_number,
    jsonb_build_object('full_name', saved.full_name)
  );

  return jsonb_build_object(
    'ok', true,
    'account_number', saved.account_number,
    'full_name', saved.full_name,
    'updated_at', saved.updated_at
  );
end;
$$;

revoke all on function public.rak_admin_upsert_application_account(text, text) from public, anon, authenticated;
grant execute on function public.rak_admin_upsert_application_account(text, text) to authenticated;
