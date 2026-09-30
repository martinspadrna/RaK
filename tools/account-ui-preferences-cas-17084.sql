BEGIN;
DO $$
DECLARE
  v_account text;
  v_first jsonb;
  v_conflict jsonb;
  v_second jsonb;
  v_loaded jsonb;
BEGIN
  SELECT account_number INTO v_account FROM public.game_accounts ORDER BY account_number LIMIT 1;
  IF v_account IS NULL THEN RAISE EXCEPTION 'No dynamic account available for CAS probe'; END IF;
  DELETE FROM public.rak_account_ui_preferences WHERE account_number = v_account;

  v_first := public.rak_save_account_ui_preferences(v_account, 'obsidian', 0);
  IF coalesce((v_first->>'ok')::boolean, false) IS DISTINCT FROM true OR (v_first->>'revision')::bigint <> 1 THEN
    RAISE EXCEPTION 'Initial appearance CAS insert failed: %', v_first;
  END IF;

  v_conflict := public.rak_save_account_ui_preferences(v_account, 'petrol', 0);
  IF coalesce((v_conflict->>'conflict')::boolean, false) IS DISTINCT FROM true
     OR v_conflict->>'appearance_id' <> 'obsidian' OR (v_conflict->>'revision')::bigint <> 1 THEN
    RAISE EXCEPTION 'Stale CAS write was not rejected: %', v_conflict;
  END IF;

  v_second := public.rak_save_account_ui_preferences(v_account, 'petrol', 1);
  IF coalesce((v_second->>'ok')::boolean, false) IS DISTINCT FROM true OR (v_second->>'revision')::bigint <> 2 THEN
    RAISE EXCEPTION 'Second CAS write failed: %', v_second;
  END IF;

  v_loaded := public.rak_load_account_ui_preferences(v_account);
  IF v_loaded->>'appearance_id' <> 'petrol' OR (v_loaded->>'revision')::bigint <> 2 THEN
    RAISE EXCEPTION 'CAS readback mismatch: %', v_loaded;
  END IF;

  IF has_table_privilege('anon', 'public.rak_account_ui_preferences', 'SELECT')
     OR has_table_privilege('authenticated', 'public.rak_account_ui_preferences', 'UPDATE') THEN
    RAISE EXCEPTION 'Direct Data API privileges leaked';
  END IF;
END;
$$;
ROLLBACK;
