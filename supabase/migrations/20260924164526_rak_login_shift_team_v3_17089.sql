-- Applied to isolated RaK TEST Supabase as migration 20260924164526.
-- Extends the already bounded V2 lookup with the resolved account's shift only.
-- No roster or account-directory bulk read is exposed.
CREATE OR REPLACE FUNCTION public.rak_lookup_account_for_login_v3(p_last4 text)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_result jsonb;
  v_settings jsonb;
  v_shift text := 'D';
BEGIN
  v_result := public.rak_lookup_account_for_login_v2(p_last4);
  IF COALESCE(v_result->>'ok', 'false') <> 'true' THEN
    RETURN v_result;
  END IF;

  SELECT ms.settings_json
    INTO v_settings
    FROM public.machine_settings AS ms
   WHERE COALESCE(ms.machine_key, '') = 'WORKER_ROSTER_SETTINGS'
      OR COALESCE(ms.settings_json->>'admin_settings_key', '') = 'WORKER_ROSTER_SETTINGS'
      OR COALESCE(ms.settings_json->>'stored_category', '') = 'worker_roster_settings'
   ORDER BY CASE WHEN COALESCE(ms.machine_key, '') = 'WORKER_ROSTER_SETTINGS' THEN 0 ELSE 1 END
   LIMIT 1;

  IF v_settings IS NOT NULL THEN
    SELECT upper(COALESCE(entry->>'shiftTeam', entry->>'shift_team', 'D'))
      INTO v_shift
      FROM pg_catalog.jsonb_array_elements(COALESCE(v_settings->'appAccounts', v_settings->'applicationAccounts', '[]'::jsonb)) AS entry
     WHERE pg_catalog.btrim(COALESCE(entry->>'loginNumber', entry->>'login_number', '')) = COALESCE(v_result->>'accountNumber', '')
     LIMIT 1;
  END IF;

  IF v_shift NOT IN ('A','B','C','D') OR v_shift IS NULL THEN
    v_shift := 'D';
  END IF;

  RETURN v_result || pg_catalog.jsonb_build_object('shiftTeam', v_shift);
END;
$function$;

REVOKE ALL ON FUNCTION public.rak_lookup_account_for_login_v3(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rak_lookup_account_for_login_v3(text) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.rak_lookup_account_for_login_v3(text) IS
  'Bounded OS-only single-account lookup. Extends V2 only with the resolved account shift A/B/C/D; does not expose worker roster or account directory.';
