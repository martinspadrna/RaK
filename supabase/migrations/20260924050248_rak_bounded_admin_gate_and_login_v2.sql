-- TEST DATABASE ONLY. OS-number-only employee login is unchanged.
-- The versioned lookup inherits V1's global/per-caller limits before returning a prompt flag.
CREATE OR REPLACE FUNCTION public.rak_lookup_account_for_login_v2(p_last4 text)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_result jsonb;
  v_requires_admin boolean;
BEGIN
  v_result := public.rak_lookup_account_for_login_v1(p_last4);
  IF COALESCE(v_result->>'ok', 'false') <> 'true' THEN RETURN v_result; END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.rak_admin_profiles AS profile
    WHERE profile.account_id = v_result->>'accountNumber' AND profile.enabled
  ) INTO v_requires_admin;
  RETURN v_result || pg_catalog.jsonb_build_object('requiresAdminAuth', v_requires_admin);
END;
$function$;
REVOKE ALL ON FUNCTION public.rak_lookup_account_for_login_v2(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rak_lookup_account_for_login_v2(text) TO anon, authenticated;
COMMENT ON FUNCTION public.rak_lookup_account_for_login_v2(text) IS
  'OS-only lookup; inherits V1 global/per-caller rate limits. Admin prompt flag only after successful lookup; NOT identity verification.';

-- Older PWAs still use this endpoint: keep compatibility, but close unlimited admin enumeration.
CREATE OR REPLACE FUNCTION public.rak_admin_account_requires_auth(p_account_id text)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_account text := pg_catalog.btrim(COALESCE(p_account_id, ''));
  v_hour timestamptz := pg_catalog.date_trunc('hour', pg_catalog.clock_timestamp());
  v_headers jsonb;
  v_ip text;
  v_salt uuid;
  v_hits integer;
  v_caller_key text;
  v_requires_admin boolean;
BEGIN
  IF v_account !~ '^[0-9]{4,12}$' THEN RETURN false; END IF;
  INSERT INTO private.rak_login_lookup_budget AS budget (hour_start, caller_key, hits)
  VALUES (v_hour, 'legacy-admin-check-global', 1)
  ON CONFLICT (hour_start, caller_key) DO UPDATE SET hits = LEAST(budget.hits + 1, 301)
  RETURNING hits INTO v_hits;
  IF v_hits > 300 THEN RAISE EXCEPTION 'Admin gate rate limited' USING ERRCODE = 'P0001'; END IF;
  BEGIN
    v_headers := COALESCE(NULLIF(pg_catalog.current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  EXCEPTION WHEN invalid_text_representation THEN
    v_headers := '{}'::jsonb;
  END;
  v_ip := pg_catalog.left(pg_catalog.btrim(pg_catalog.split_part(
    COALESCE(v_headers->>'x-forwarded-for', v_headers->>'x-real-ip', 'unattributed'), ',', 1)), 128);
  IF v_ip = '' THEN v_ip := 'unattributed'; END IF;
  SELECT salt INTO v_salt FROM private.rak_login_lookup_salt WHERE singleton;
  IF v_salt IS NULL THEN RAISE EXCEPTION 'Lookup rate limit not initialized' USING ERRCODE = '55000'; END IF;
  v_caller_key := 'legacy-admin-check-ip:' || pg_catalog.md5(v_salt::text || ':' || v_ip);
  INSERT INTO private.rak_login_lookup_budget AS budget (hour_start, caller_key, hits)
  VALUES (v_hour, v_caller_key, 1)
  ON CONFLICT (hour_start, caller_key) DO UPDATE SET hits = LEAST(budget.hits + 1, 61)
  RETURNING hits INTO v_hits;
  IF v_hits > 60 THEN RAISE EXCEPTION 'Admin gate rate limited' USING ERRCODE = 'P0001'; END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.rak_admin_profiles AS profile
    WHERE profile.account_id = v_account AND profile.enabled
  ) INTO v_requires_admin;
  RETURN v_requires_admin;
END;
$function$;
REVOKE ALL ON FUNCTION public.rak_admin_account_requires_auth(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rak_admin_account_requires_auth(text) TO anon, authenticated;
COMMENT ON FUNCTION public.rak_admin_account_requires_auth(text) IS
  'Legacy PWA fallback only: 300/hour global and 60/hour best-effort caller budget. Retire only after older clients are gone.';
;
