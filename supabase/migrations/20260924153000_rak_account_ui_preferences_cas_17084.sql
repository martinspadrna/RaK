-- RaK 1.7.84: account-scoped appearance preferences with bounded CAS writes.
-- The table is intentionally not directly exposed to anon/authenticated clients.
CREATE TABLE IF NOT EXISTS public.rak_account_ui_preferences (
  account_number text PRIMARY KEY REFERENCES public.game_accounts(account_number) ON DELETE CASCADE,
  appearance_id text NOT NULL,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT rak_account_ui_preferences_account_format CHECK (account_number ~ '^[0-9]{4}$'),
  CONSTRAINT rak_account_ui_preferences_appearance_format CHECK (appearance_id ~ '^[a-z0-9][a-z0-9-]{0,47}$')
);

ALTER TABLE public.rak_account_ui_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rak_account_ui_preferences FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rak_account_ui_preferences TO service_role;

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
    'revision', v_row.revision,
    'updated_at', v_row.updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rak_save_account_ui_preferences(
  p_account_number text,
  p_appearance_id text,
  p_expected_revision bigint DEFAULT 0
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
  v_row public.rak_account_ui_preferences%ROWTYPE;
BEGIN
  IF v_account !~ '^[0-9]{4}$'
     OR v_appearance !~ '^[a-z0-9][a-z0-9-]{0,47}$'
     OR coalesce(p_expected_revision, 0) < 0 THEN
    RETURN jsonb_build_object('ok', false, 'conflict', false, 'reason', 'invalid-input');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.game_accounts ga WHERE ga.account_number = v_account) THEN
    RETURN jsonb_build_object('ok', false, 'conflict', false, 'reason', 'account-not-found');
  END IF;

  IF v_expected = 0 THEN
    INSERT INTO public.rak_account_ui_preferences(account_number, appearance_id, revision, updated_at)
    VALUES (v_account, v_appearance, 1, clock_timestamp())
    ON CONFLICT (account_number) DO NOTHING
    RETURNING * INTO v_row;
  ELSE
    UPDATE public.rak_account_ui_preferences
    SET appearance_id = v_appearance,
        revision = revision + 1,
        updated_at = clock_timestamp()
    WHERE account_number = v_account
      AND revision = v_expected
    RETURNING * INTO v_row;
  END IF;

  IF v_row.account_number IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true, 'conflict', false,
      'account_number', v_row.account_number,
      'appearance_id', v_row.appearance_id,
      'revision', v_row.revision,
      'updated_at', v_row.updated_at
    );
  END IF;

  SELECT * INTO v_row FROM public.rak_account_ui_preferences WHERE account_number = v_account;
  IF v_row.account_number IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false, 'conflict', true, 'reason', 'revision-conflict',
      'account_number', v_account, 'appearance_id', v_appearance,
      'revision', 0, 'updated_at', NULL
    );
  END IF;
  RETURN jsonb_build_object(
    'ok', false, 'conflict', true, 'reason', 'revision-conflict',
    'account_number', v_row.account_number,
    'appearance_id', v_row.appearance_id,
    'revision', v_row.revision,
    'updated_at', v_row.updated_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rak_load_account_ui_preferences(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rak_save_account_ui_preferences(text, text, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rak_load_account_ui_preferences(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rak_save_account_ui_preferences(text, text, bigint) TO anon, authenticated, service_role;

DO $$
DECLARE
  v_relrowsecurity boolean;
  v_load regprocedure := to_regprocedure('public.rak_load_account_ui_preferences(text)');
  v_save regprocedure := to_regprocedure('public.rak_save_account_ui_preferences(text,text,bigint)');
BEGIN
  SELECT relrowsecurity INTO v_relrowsecurity FROM pg_class WHERE oid = 'public.rak_account_ui_preferences'::regclass;
  IF v_relrowsecurity IS DISTINCT FROM true THEN RAISE EXCEPTION 'rak_account_ui_preferences must have RLS enabled'; END IF;
  IF has_table_privilege('anon', 'public.rak_account_ui_preferences', 'SELECT')
     OR has_table_privilege('anon', 'public.rak_account_ui_preferences', 'INSERT')
     OR has_table_privilege('anon', 'public.rak_account_ui_preferences', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.rak_account_ui_preferences', 'SELECT')
     OR has_table_privilege('authenticated', 'public.rak_account_ui_preferences', 'UPDATE') THEN
    RAISE EXCEPTION 'direct client access to account UI preferences must stay revoked';
  END IF;
  IF v_load IS NULL OR v_save IS NULL
     OR NOT has_function_privilege('anon', v_load, 'EXECUTE')
     OR NOT has_function_privilege('authenticated', v_save, 'EXECUTE') THEN
    RAISE EXCEPTION 'bounded account UI RPC grants are incomplete';
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
