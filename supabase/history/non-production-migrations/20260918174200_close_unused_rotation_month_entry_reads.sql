-- RaK test-only P0.2 incremental cutover: retired month/entry tables are empty.
-- Do not deploy this migration to production without a separate review and authorization.
-- The active rotation snapshot (rotation_state) and game_accounts are deliberately unchanged.
DO $guard$
BEGIN
  IF EXISTS (SELECT 1 FROM public.rotation_months LIMIT 1)
     OR EXISTS (SELECT 1 FROM public.rotation_entries LIMIT 1) THEN
    RAISE EXCEPTION 'Rotation month/entry privacy cutover aborted: nonempty table';
  END IF;
END
$guard$;
REVOKE SELECT ON TABLE public.rotation_months, public.rotation_entries FROM anon, authenticated;
DROP POLICY IF EXISTS rak_rotation_months_public_read_v2 ON public.rotation_months;
DROP POLICY IF EXISTS rak_rotation_entries_public_read_v2 ON public.rotation_entries;
