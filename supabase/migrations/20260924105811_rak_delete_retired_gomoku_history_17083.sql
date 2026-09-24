-- RaK 1.7.83. Production cleanup explicitly authorized by the owner on 2026-09-24.
-- Games are retired. Delete only the 101 historical Gomoku score rows; retain the
-- locked table and every account used by the current OS-only login flow.
DO $cleanup$
DECLARE
  v_rows_before bigint;
  v_rows_deleted bigint;
  v_accounts_before bigint;
  v_submit regprocedure := to_regprocedure(
    'public.rak_submit_gomoku_win_v2(text,text,integer,text,timestamp with time zone,integer,text,integer,integer,text)'
  );
BEGIN
  IF to_regclass('public.gomoku_wins') IS NULL
     OR to_regclass('public.game_accounts') IS NULL THEN
    RAISE EXCEPTION 'Retired Gomoku cleanup baseline is missing';
  END IF;

  SELECT count(*) INTO v_rows_before FROM public.gomoku_wins;
  SELECT count(*) INTO v_accounts_before FROM public.game_accounts;
  IF v_rows_before <> 101 THEN
    RAISE EXCEPTION 'Retired Gomoku cleanup expected exactly 101 historical rows, found %', v_rows_before;
  END IF;
  IF v_accounts_before < 1 THEN
    RAISE EXCEPTION 'Application account directory is unexpectedly empty';
  END IF;

  IF has_table_privilege('anon', 'public.gomoku_wins', 'SELECT')
     OR has_table_privilege('authenticated', 'public.gomoku_wins', 'SELECT')
     OR has_table_privilege('anon', 'public.gomoku_wins', 'INSERT')
     OR has_table_privilege('anon', 'public.gomoku_wins', 'UPDATE')
     OR has_table_privilege('anon', 'public.gomoku_wins', 'DELETE')
     OR has_table_privilege('authenticated', 'public.gomoku_wins', 'INSERT')
     OR has_table_privilege('authenticated', 'public.gomoku_wins', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.gomoku_wins', 'DELETE')
     OR (
       v_submit IS NOT NULL
       AND (
         has_function_privilege('anon', v_submit, 'EXECUTE')
         OR has_function_privilege('authenticated', v_submit, 'EXECUTE')
       )
     )
     OR EXISTS (
       SELECT 1 FROM pg_catalog.pg_policies
       WHERE schemaname = 'public' AND tablename = 'gomoku_wins'
     ) THEN
    RAISE EXCEPTION 'Retired Gomoku data is not fully closed to application clients';
  END IF;

  DELETE FROM public.gomoku_wins;
  GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;

  IF v_rows_deleted <> v_rows_before
     OR EXISTS (SELECT 1 FROM public.gomoku_wins)
     OR (SELECT count(*) FROM public.game_accounts) <> v_accounts_before THEN
    RAISE EXCEPTION 'Retired Gomoku cleanup postcondition failed';
  END IF;
END
$cleanup$;

COMMENT ON TABLE public.gomoku_wins IS
  'Retired game table retained without client grants or rows after owner-authorized cleanup on 2026-09-24.';
;
