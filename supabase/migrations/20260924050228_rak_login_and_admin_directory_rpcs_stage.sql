-- Applied to isolated RaK test Supabase as migration 20260918171858.
-- Transitional phase: leave legacy public table reads intact until new clients are verified.
CREATE OR REPLACE FUNCTION public.rak_lookup_account_for_login_v1(p_last4 text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_suffix text := btrim(coalesce(p_last4, ''));
  v_count integer;
  v_account text;
  v_name text;
BEGIN
  IF v_suffix !~ '^[0-9]{4}$' THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'reason', 'not-found');
  END IF;
  SELECT count(*)::integer, min(account_number), min(full_name)
  INTO v_count, v_account, v_name
  FROM public.game_accounts
  WHERE pg_catalog.right(account_number, 4) = v_suffix
    AND pg_catalog.btrim(account_number) <> ''
    AND pg_catalog.btrim(full_name) <> '';
  IF v_count = 0 THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'reason', 'not-found');
  ELSIF v_count > 1 THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'reason', 'ambiguous');
  END IF;
  RETURN pg_catalog.jsonb_build_object('ok', true, 'accountNumber', v_account, 'fullName', v_name);
END;
$function$;
REVOKE ALL ON FUNCTION public.rak_lookup_account_for_login_v1(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rak_lookup_account_for_login_v1(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.rak_admin_list_application_accounts_v1()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT coalesce(private.rak_is_admin(), false) THEN
    RAISE EXCEPTION 'Verified administrator session required' USING ERRCODE = '42501';
  END IF;
  RETURN coalesce((
    SELECT pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object('account_number', account_number,
                                    'full_name', full_name, 'updated_at', updated_at)
      ORDER BY full_name, account_number
    )
    FROM public.game_accounts
  ), '[]'::jsonb);
END;
$function$;
REVOKE ALL ON FUNCTION public.rak_admin_list_application_accounts_v1() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rak_admin_list_application_accounts_v1() TO authenticated;
;
