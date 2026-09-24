-- RaK TEST ONLY: do not apply to production without explicit release approval.
-- Existing PWA >=1.7.27 uses a single-account RPC; older cached builds must update.
DO $guard$
BEGIN
  IF to_regprocedure('public.rak_lookup_account_for_login_v1(text)') IS NULL
     OR to_regprocedure('public.rak_admin_list_application_accounts_v1()') IS NULL
     OR NOT has_function_privilege('anon','public.rak_lookup_account_for_login_v1(text)','EXECUTE')
     OR has_function_privilege('anon','public.rak_admin_list_application_accounts_v1()','EXECUTE')
     OR NOT has_function_privilege('authenticated','public.rak_admin_list_application_accounts_v1()','EXECUTE')
  THEN RAISE EXCEPTION 'Secure login/admin directory prerequisites not met'; END IF;
END $guard$;

CREATE TABLE IF NOT EXISTS private.rak_login_lookup_salt (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  salt uuid NOT NULL DEFAULT pg_catalog.gen_random_uuid()
);
INSERT INTO private.rak_login_lookup_salt(singleton) VALUES (true) ON CONFLICT (singleton) DO NOTHING;
CREATE TABLE IF NOT EXISTS private.rak_login_lookup_budget (
  hour_start timestamptz NOT NULL,
  caller_key text NOT NULL,
  hits integer NOT NULL DEFAULT 0 CHECK (hits >= 0),
  PRIMARY KEY (hour_start, caller_key)
);
REVOKE ALL ON TABLE private.rak_login_lookup_salt, private.rak_login_lookup_budget FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.rak_lookup_account_for_login_v1(p_last4 text)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_suffix text := pg_catalog.btrim(coalesce(p_last4,''));
  v_hour timestamptz := pg_catalog.date_trunc('hour',pg_catalog.clock_timestamp());
  v_headers jsonb;
  v_ip text;
  v_salt uuid;
  v_caller_key text;
  v_global integer;
  v_per_caller integer;
  v_count integer;
  v_account text;
  v_name text;
BEGIN
  IF v_suffix !~ '^[0-9]{4}$' THEN
    RETURN pg_catalog.jsonb_build_object('ok',false,'reason','not-found');
  END IF;
  -- Budget is global as well as per caller; forwarded IP is not trusted as identity.
  INSERT INTO private.rak_login_lookup_budget AS budget (hour_start,caller_key,hits)
  VALUES (v_hour,'global',1)
  ON CONFLICT(hour_start,caller_key) DO UPDATE SET hits=LEAST(budget.hits+1,301)
  RETURNING hits INTO v_global;
  IF v_global = 1 THEN
    DELETE FROM private.rak_login_lookup_budget WHERE hour_start < v_hour - interval '3 hours';
  END IF;
  IF v_global > 300 THEN
    RETURN pg_catalog.jsonb_build_object('ok',false,'reason','rate-limited');
  END IF;
  BEGIN
    v_headers := coalesce(nullif(pg_catalog.current_setting('request.headers',true),'')::jsonb,'{}'::jsonb);
  EXCEPTION WHEN invalid_text_representation THEN
    v_headers := '{}'::jsonb;
  END;
  v_ip := pg_catalog.left(pg_catalog.btrim(pg_catalog.split_part(coalesce(v_headers->>'x-forwarded-for',v_headers->>'x-real-ip','unattributed'),',',1)),128);
  IF v_ip='' THEN v_ip := 'unattributed'; END IF;
  SELECT salt INTO v_salt FROM private.rak_login_lookup_salt WHERE singleton;
  IF v_salt IS NULL THEN RAISE EXCEPTION 'Lookup rate limit not initialized' USING ERRCODE='55000'; END IF;
  v_caller_key := 'ip:' || pg_catalog.md5(v_salt::text || ':' || v_ip);
  INSERT INTO private.rak_login_lookup_budget AS budget (hour_start,caller_key,hits)
  VALUES(v_hour,v_caller_key,1)
  ON CONFLICT(hour_start,caller_key) DO UPDATE SET hits=LEAST(budget.hits+1,61)
  RETURNING hits INTO v_per_caller;
  IF v_per_caller > 60 THEN
    RETURN pg_catalog.jsonb_build_object('ok',false,'reason','rate-limited');
  END IF;
  SELECT count(*)::integer,min(account_number),min(full_name)
    INTO v_count,v_account,v_name
    FROM public.game_accounts
    WHERE pg_catalog.right(account_number,4)=v_suffix
      AND pg_catalog.btrim(account_number)<>'' AND pg_catalog.btrim(full_name)<>'';
  IF v_count=0 THEN RETURN pg_catalog.jsonb_build_object('ok',false,'reason','not-found'); END IF;
  IF v_count>1 THEN RETURN pg_catalog.jsonb_build_object('ok',false,'reason','ambiguous'); END IF;
  RETURN pg_catalog.jsonb_build_object('ok',true,'accountNumber',v_account,'fullName',v_name);
END;
$function$;
REVOKE ALL ON FUNCTION public.rak_lookup_account_for_login_v1(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rak_lookup_account_for_login_v1(text) TO anon, authenticated, service_role;

-- Eliminate unrestricted REST/GraphQL bulk reads; admin RPC remains role+session checked.
REVOKE SELECT ON TABLE public.game_accounts FROM anon, authenticated;
DROP POLICY IF EXISTS rak_game_accounts_public_read_v2 ON public.game_accounts;
