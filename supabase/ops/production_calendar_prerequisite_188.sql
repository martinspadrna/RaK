-- RaK 1.8.8 production calendar prerequisite.
-- MUTATING: run only after explicit production approval and before
-- 20260929022427_rak_calendar_private_feed_17149.sql.
-- Supabase's current extension guidance recommends the separate extensions schema.
-- Do not pin an extension version; the platform installs the current supported default.

CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

DO $verify$
DECLARE
  v_schema text;
BEGIN
  SELECT n.nspname INTO v_schema
  FROM pg_extension e
  JOIN pg_namespace n ON n.oid=e.extnamespace
  WHERE e.extname='http';

  IF v_schema IS DISTINCT FROM 'extensions' THEN
    RAISE EXCEPTION 'http extension is not installed in extensions schema';
  END IF;
END
$verify$;

-- Vault values are intentionally NOT present in source control.
-- After this extension prerequisite, a privileged operator must securely create/update
-- these four named secrets with vault.create_secret()/vault.update_secret():
--   rak_calendar_kalirna_a_ics
--   rak_calendar_kalirna_b_ics
--   rak_calendar_kalirna_c_ics
--   rak_calendar_kalirna_d_ics
-- Never print or log decrypted_secret during the transfer.
-- Re-run production_preflight_188.sql and require all four names to report present=true.
