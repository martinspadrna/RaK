-- RaK 1.7.153: account-scoped calendar selection piggybacks on the existing
-- local-first account UI preference record and its CAS revision.
ALTER TABLE public.rak_account_ui_preferences
  ADD COLUMN IF NOT EXISTS calendar_keys jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'rak_account_ui_preferences_calendar_keys_shape'
      AND conrelid = 'public.rak_account_ui_preferences'::regclass
  ) THEN
    ALTER TABLE public.rak_account_ui_preferences
      ADD CONSTRAINT rak_account_ui_preferences_calendar_keys_shape
      CHECK (jsonb_typeof(calendar_keys) = 'array' AND jsonb_array_length(calendar_keys) <= 8);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.rak_load_account_ui_preferences(p_account_number text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_account text := btrim(coalesce(p_account_number, ''));
  v_row public.rak_account_ui_preferences%ROWTYPE;
BEGIN
  IF v_account !~ '^[0-9]{4}$' THEN RETURN NULL; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.game_accounts ga WHERE ga.account_number = v_account) THEN RETURN NULL; END IF;
  SELECT * INTO v_row FROM public.rak_account_ui_preferences WHERE account_number = v_account;
  IF v_row.account_number IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'account_number', v_row.account_number,
    'appearance_id', v_row.appearance_id,
    'calendar_keys', v_row.calendar_keys,
    'revision', v_row.revision,
    'updated_at', v_row.updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rak_save_account_ui_preferences_v2(
  p_account_number text,
  p_appearance_id text,
  p_calendar_keys jsonb,
  p_expected_revision bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_account text := btrim(coalesce(p_account_number, ''));
  v_appearance text := lower(btrim(coalesce(p_appearance_id, '')));
  v_expected bigint := greatest(0, coalesce(p_expected_revision, 0));
  v_calendar_keys jsonb := p_calendar_keys;
  v_key_count integer := 0;
  v_distinct_count integer := 0;
  v_row public.rak_account_ui_preferences%ROWTYPE;
BEGIN
  IF v_account !~ '^[0-9]{4}$'
     OR v_appearance !~ '^[a-z0-9][a-z0-9-]{0,47}$'
     OR coalesce(p_expected_revision, 0) < 0 THEN
    RETURN jsonb_build_object('ok', false, 'conflict', false, 'reason', 'invalid-input');
  END IF;

  IF v_calendar_keys IS NOT NULL THEN
    IF jsonb_typeof(v_calendar_keys) <> 'array' OR jsonb_array_length(v_calendar_keys) > 8 THEN
      RETURN jsonb_build_object('ok', false, 'conflict', false, 'reason', 'invalid-calendar-selection');
    END IF;
    SELECT count(*), count(DISTINCT value)
      INTO v_key_count, v_distinct_count
      FROM jsonb_array_elements_text(v_calendar_keys) AS item(value);
    IF v_key_count <> v_distinct_count
       OR EXISTS (
         SELECT 1 FROM jsonb_array_elements_text(v_calendar_keys) AS item(value)
         WHERE btrim(value) !~ '^(obrabeni|kalirna)-[ABCD]$'
       ) THEN
      RETURN jsonb_build_object('ok', false, 'conflict', false, 'reason', 'invalid-calendar-selection');
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.game_accounts ga WHERE ga.account_number = v_account) THEN
    RETURN jsonb_build_object('ok', false, 'conflict', false, 'reason', 'account-not-found');
  END IF;

  IF v_expected = 0 THEN
    INSERT INTO public.rak_account_ui_preferences(account_number, appearance_id, calendar_keys, revision, updated_at)
    VALUES (v_account, v_appearance, coalesce(v_calendar_keys, '[]'::jsonb), 1, clock_timestamp())
    ON CONFLICT (account_number) DO NOTHING
    RETURNING * INTO v_row;
  ELSE
    UPDATE public.rak_account_ui_preferences
    SET appearance_id = v_appearance,
        calendar_keys = CASE WHEN v_calendar_keys IS NULL THEN calendar_keys ELSE v_calendar_keys END,
        revision = revision + 1,
        updated_at = clock_timestamp()
    WHERE account_number = v_account AND revision = v_expected
    RETURNING * INTO v_row;
  END IF;

  IF v_row.account_number IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true, 'conflict', false,
      'account_number', v_row.account_number,
      'appearance_id', v_row.appearance_id,
      'calendar_keys', v_row.calendar_keys,
      'revision', v_row.revision,
      'updated_at', v_row.updated_at
    );
  END IF;

  SELECT * INTO v_row FROM public.rak_account_ui_preferences WHERE account_number = v_account;
  IF v_row.account_number IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false, 'conflict', true, 'reason', 'revision-conflict',
      'account_number', v_account,
      'appearance_id', v_appearance,
      'calendar_keys', coalesce(v_calendar_keys, '[]'::jsonb),
      'revision', 0,
      'updated_at', NULL
    );
  END IF;
  RETURN jsonb_build_object(
    'ok', false, 'conflict', true, 'reason', 'revision-conflict',
    'account_number', v_row.account_number,
    'appearance_id', v_row.appearance_id,
    'calendar_keys', v_row.calendar_keys,
    'revision', v_row.revision,
    'updated_at', v_row.updated_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rak_save_account_ui_preferences_v2(text, text, jsonb, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rak_save_account_ui_preferences_v2(text, text, jsonb, bigint)
  TO anon, authenticated, service_role;

DO $$
DECLARE
  v_relrowsecurity boolean;
  v_v2 regprocedure := to_regprocedure('public.rak_save_account_ui_preferences_v2(text,text,jsonb,bigint)');
BEGIN
  SELECT relrowsecurity INTO v_relrowsecurity
  FROM pg_class WHERE oid = 'public.rak_account_ui_preferences'::regclass;
  IF v_relrowsecurity IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'rak_account_ui_preferences must have RLS enabled';
  END IF;
  IF has_table_privilege('anon', 'public.rak_account_ui_preferences', 'SELECT')
     OR has_table_privilege('anon', 'public.rak_account_ui_preferences', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.rak_account_ui_preferences', 'SELECT')
     OR has_table_privilege('authenticated', 'public.rak_account_ui_preferences', 'UPDATE') THEN
    RAISE EXCEPTION 'direct client access to account UI preferences must stay revoked';
  END IF;
  IF v_v2 IS NULL
     OR NOT has_function_privilege('anon', v_v2, 'EXECUTE')
     OR NOT has_function_privilege('authenticated', v_v2, 'EXECUTE') THEN
    RAISE EXCEPTION 'calendar-aware account UI RPC grants are incomplete';
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
