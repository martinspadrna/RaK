-- RaK development/test: prevent disguised admin credentials and owner backups
-- from being exposed through machine_settings read policies. Existing selectors,
-- employee login, writes and owner/admin read access are unchanged.
DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class AS c
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'machine_settings'
      AND c.relrowsecurity
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'machine_settings'
      AND policyname = 'rak_machine_settings_anon_safe_read_v3'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'machine_settings'
      AND policyname = 'rak_machine_settings_authenticated_read_v3'
  ) THEN
    RAISE EXCEPTION 'Missing existing machine_settings security baseline';
  END IF;
END
$guard$;

CREATE POLICY rak_machine_settings_anon_admin_json_type_v6
ON public.machine_settings AS RESTRICTIVE FOR SELECT TO anon
USING (
  COALESCE(settings_json ->> 'type', '') NOT IN
    ('admin_accounts_settings', 'admin_full_settings_backup')
);

CREATE POLICY rak_machine_settings_authenticated_admin_json_type_v6
ON public.machine_settings AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  (SELECT private.rak_is_admin()) OR
  COALESCE(settings_json ->> 'type', '') NOT IN
    ('admin_accounts_settings', 'admin_full_settings_backup')
);

DO $verify$
BEGIN
  IF (SELECT count(*) FROM pg_catalog.pg_policies
      WHERE schemaname = 'public' AND tablename = 'machine_settings'
        AND permissive = 'RESTRICTIVE' AND cmd = 'SELECT'
        AND policyname IN (
          'rak_machine_settings_anon_admin_json_type_v6',
          'rak_machine_settings_authenticated_admin_json_type_v6'
        )) <> 2
  THEN RAISE EXCEPTION 'Admin JSON type policies not installed'; END IF;
END
$verify$;

NOTIFY pgrst, 'reload schema';
