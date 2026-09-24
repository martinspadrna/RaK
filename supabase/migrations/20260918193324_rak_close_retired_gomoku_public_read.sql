-- Phase B: close the retired Gomoku leaderboard read path without deleting history.
-- The games UI has been absent since RaK 1.7.21. Historical rows remain available
-- to service_role/owner backup; this migration changes grants/policy only.
DO $guard$
DECLARE
  v_submit regprocedure := to_regprocedure(
    'public.rak_submit_gomoku_win_v2(text,text,integer,text,timestamp with time zone,integer,text,integer,integer,text)'
  );
BEGIN
  IF to_regclass('public.gomoku_wins') IS NULL THEN
    RAISE EXCEPTION 'Legacy game table not present';
  END IF;
  IF has_table_privilege('anon', 'public.gomoku_wins', 'INSERT')
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
     ) THEN
    RAISE EXCEPTION 'Legacy Gomoku write path is still client-accessible';
  END IF;
  IF has_table_privilege('anon', 'public.game_accounts', 'SELECT')
     OR has_table_privilege('authenticated', 'public.game_accounts', 'SELECT') THEN
    RAISE EXCEPTION 'Account-directory privacy cutover is not in place';
  END IF;
END $guard$;

REVOKE SELECT ON TABLE public.gomoku_wins FROM anon, authenticated;
DROP POLICY IF EXISTS rak_gomoku_wins_public_read_v2 ON public.gomoku_wins;

DO $postcondition$
BEGIN
  IF has_table_privilege('anon', 'public.gomoku_wins', 'SELECT')
     OR has_table_privilege('authenticated', 'public.gomoku_wins', 'SELECT')
     OR EXISTS (
       SELECT 1
       FROM pg_catalog.pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'gomoku_wins'
         AND policyname = 'rak_gomoku_wins_public_read_v2'
     ) THEN
    RAISE EXCEPTION 'Legacy Gomoku public read closure did not complete';
  END IF;
END $postcondition$;
