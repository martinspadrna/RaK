-- RaK 1.7.50, TEST Supabase only. Additional RESTRICTIVE SELECT policies
-- close mixed-case private-category/key leaks without changing existing policies.
-- A verified owner/admin session retains the existing private-data read path.
CREATE POLICY rak_machine_settings_anon_casefold_private_v10
ON public.machine_settings AS RESTRICTIVE FOR SELECT TO anon
USING (NOT (
  pg_catalog.lower(pg_catalog.btrim(COALESCE(category,''))) = ANY (ARRAY['admin_accounts_settings','admin_full_settings_backup','admin_change_log','rotation_save_backup','worker_roster_settings'])
  OR pg_catalog.upper(pg_catalog.btrim(COALESCE(machine_key,''))) = ANY (ARRAY['ADMIN_ACCOUNTS_SETTINGS','ADMIN_CHANGE_LOG','WORKER_ROSTER_SETTINGS'])
  OR pg_catalog.upper(pg_catalog.btrim(COALESCE(machine_key,''))) LIKE 'ADMIN_FULL_SETTINGS_BACKUP_%'
  OR pg_catalog.upper(pg_catalog.btrim(COALESCE(machine_key,''))) LIKE 'ROTATION_SAVE_BACKUP_%'
  OR pg_catalog.lower(pg_catalog.btrim(COALESCE(settings_json->>'stored_category',''))) = ANY (ARRAY['admin_accounts_settings','admin_full_settings_backup','admin_change_log','rotation_save_backup','worker_roster_settings'])
  OR pg_catalog.lower(pg_catalog.btrim(COALESCE(settings_json->>'type',''))) = ANY (ARRAY['admin_accounts_settings','admin_full_settings_backup','admin_change_log','rotation_save_backup','worker_roster_settings'])
  OR pg_catalog.upper(pg_catalog.btrim(COALESCE(settings_json->>'admin_settings_key',''))) = ANY (ARRAY['ADMIN_ACCOUNTS_SETTINGS','ADMIN_CHANGE_LOG','WORKER_ROSTER_SETTINGS'])
  OR pg_catalog.upper(pg_catalog.btrim(COALESCE(settings_json->>'admin_settings_key',''))) LIKE 'ADMIN_FULL_SETTINGS_BACKUP_%'
  OR pg_catalog.upper(pg_catalog.btrim(COALESCE(settings_json->>'admin_settings_key',''))) LIKE 'ROTATION_SAVE_BACKUP_%'
));
CREATE POLICY rak_machine_settings_authenticated_casefold_private_v10
ON public.machine_settings AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  (SELECT private.rak_is_admin())
  OR NOT (
    pg_catalog.lower(pg_catalog.btrim(COALESCE(category,''))) = ANY (ARRAY['admin_accounts_settings','admin_full_settings_backup','admin_change_log','rotation_save_backup','worker_roster_settings'])
    OR pg_catalog.upper(pg_catalog.btrim(COALESCE(machine_key,''))) = ANY (ARRAY['ADMIN_ACCOUNTS_SETTINGS','ADMIN_CHANGE_LOG','WORKER_ROSTER_SETTINGS'])
    OR pg_catalog.upper(pg_catalog.btrim(COALESCE(machine_key,''))) LIKE 'ADMIN_FULL_SETTINGS_BACKUP_%'
    OR pg_catalog.upper(pg_catalog.btrim(COALESCE(machine_key,''))) LIKE 'ROTATION_SAVE_BACKUP_%'
    OR pg_catalog.lower(pg_catalog.btrim(COALESCE(settings_json->>'stored_category',''))) = ANY (ARRAY['admin_accounts_settings','admin_full_settings_backup','admin_change_log','rotation_save_backup','worker_roster_settings'])
    OR pg_catalog.lower(pg_catalog.btrim(COALESCE(settings_json->>'type',''))) = ANY (ARRAY['admin_accounts_settings','admin_full_settings_backup','admin_change_log','rotation_save_backup','worker_roster_settings'])
    OR pg_catalog.upper(pg_catalog.btrim(COALESCE(settings_json->>'admin_settings_key',''))) = ANY (ARRAY['ADMIN_ACCOUNTS_SETTINGS','ADMIN_CHANGE_LOG','WORKER_ROSTER_SETTINGS'])
    OR pg_catalog.upper(pg_catalog.btrim(COALESCE(settings_json->>'admin_settings_key',''))) LIKE 'ADMIN_FULL_SETTINGS_BACKUP_%'
    OR pg_catalog.upper(pg_catalog.btrim(COALESCE(settings_json->>'admin_settings_key',''))) LIKE 'ROTATION_SAVE_BACKUP_%'
  )
);
COMMENT ON POLICY rak_machine_settings_anon_casefold_private_v10 ON public.machine_settings IS 'RaK 1.7.50: deny case-insensitive private settings to anonymous clients, including legacy mixed-case categories and keys.';
COMMENT ON POLICY rak_machine_settings_authenticated_casefold_private_v10 ON public.machine_settings IS 'RaK 1.7.50: non-admin sessions cannot read mixed-case private settings; verified administrators remain authorized.';
