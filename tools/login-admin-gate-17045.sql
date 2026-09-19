-- RaK 1.7.45 TEST DB regression. Synthetic/unreported outputs only; all budget writes ROLLBACK.
BEGIN;
DO $verify$
DECLARE row_ record; lookup jsonb; expected_admin boolean; checked integer := 0;
BEGIN
  FOR row_ IN SELECT account_number, full_name FROM public.game_accounts LOOP
    SELECT EXISTS(SELECT 1 FROM public.rak_admin_profiles p
      WHERE p.account_id = row_.account_number AND p.enabled) INTO expected_admin;
    lookup := public.rak_lookup_account_for_login_v2(row_.account_number);
    IF lookup->>'ok' IS DISTINCT FROM 'true'
       OR lookup->>'accountNumber' IS DISTINCT FROM row_.account_number
       OR lookup->>'fullName' IS DISTINCT FROM row_.full_name
       OR (lookup->>'requiresAdminAuth')::boolean IS DISTINCT FROM expected_admin THEN
      RAISE EXCEPTION '[17045] account or admin flag mismatch';
    END IF;
    checked := checked+1;
  END LOOP;
  IF checked=0 THEN RAISE EXCEPTION '[17045] no account fixtures'; END IF;
  IF public.rak_lookup_account_for_login_v2('bad!')->>'reason' IS DISTINCT FROM 'not-found' THEN
    RAISE EXCEPTION '[17045] invalid lookup must fail';
  END IF;
  IF NOT pg_catalog.has_function_privilege('anon', 'public.rak_lookup_account_for_login_v2(text)', 'EXECUTE') THEN
    RAISE EXCEPTION '[17045] anon login RPC unavailable';
  END IF;
  IF pg_catalog.has_table_privilege('anon','public.game_accounts','SELECT') THEN
    RAISE EXCEPTION '[17045] anonymous full directory exposed';
  END IF;
END;
$verify$;
-- Force the legacy oracle over its global limit without touching persisted budgets.
INSERT INTO private.rak_login_lookup_budget AS b(hour_start,caller_key,hits)
VALUES (pg_catalog.date_trunc('hour',pg_catalog.clock_timestamp()),'legacy-admin-check-global',300)
ON CONFLICT(hour_start,caller_key) DO UPDATE SET hits=300;
SET LOCAL ROLE anon;
DO $verify$
DECLARE limited boolean := false;
BEGIN
  IF public.rak_lookup_account_for_login_v2('bad!')->>'reason' IS DISTINCT FROM 'not-found' THEN
    RAISE EXCEPTION '[17045] anon login invalid response';
  END IF;
  BEGIN
    PERFORM public.rak_admin_account_requires_auth('0000');
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM='Admin gate rate limited' THEN limited := true; ELSE RAISE; END IF;
  END;
  IF NOT limited THEN RAISE EXCEPTION '[17045] legacy oracle did not fail closed'; END IF;
END;
$verify$;
ROLLBACK;
