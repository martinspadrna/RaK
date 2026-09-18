-- TEST ONLY. Games UI was retired in RaK 1.7.21; protect the empty legacy score table.
-- Preserve rows and service_role/admin backup access. Production remains unchanged.
DO $guard$
BEGIN
  IF to_regclass('public.gomoku_wins') IS NULL THEN
    RAISE EXCEPTION 'Legacy game table not present';
  END IF;
  IF EXISTS (SELECT 1 FROM public.gomoku_wins LIMIT 1) THEN
    RAISE EXCEPTION 'Legacy game table is not empty; review dependent clients before closing';
  END IF;
  IF has_table_privilege('anon', 'public.game_accounts', 'SELECT')
     OR has_table_privilege('authenticated', 'public.game_accounts', 'SELECT') THEN
    RAISE EXCEPTION 'Account-directory privacy cutover is not in place';
  END IF;
END $guard$;

REVOKE SELECT ON TABLE public.gomoku_wins FROM anon, authenticated;
DROP POLICY IF EXISTS rak_gomoku_wins_public_read_v2 ON public.gomoku_wins;
