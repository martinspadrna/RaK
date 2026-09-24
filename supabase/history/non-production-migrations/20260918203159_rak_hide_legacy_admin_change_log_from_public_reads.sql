-- RaK TEST ONLY: retain existing employee login and live rotation reads.
-- Historical ADMIN_CHANGE_LOG is an admin audit record kept in machine_settings
-- with legacy category 'frezka'; it is not a public machine parameter.
DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='machine_settings'
      AND policyname='rak_machine_settings_anon_no_rotation_backups_v4'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='machine_settings'
      AND policyname='rak_machine_settings_authenticated_rotation_backups_admin_only_v4'
  ) THEN
    RAISE EXCEPTION 'Expected backup visibility baseline missing; review before applying';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.machine_settings
    WHERE machine_key='ADMIN_CHANGE_LOG' AND settings_json->>'type'='admin_change_log'
  ) THEN
    RAISE EXCEPTION 'Expected legacy admin change-log row missing; review before applying';
  END IF;
END $guard$;

DROP POLICY IF EXISTS rak_machine_settings_anon_no_legacy_change_log_v5 ON public.machine_settings;
CREATE POLICY rak_machine_settings_anon_no_legacy_change_log_v5
ON public.machine_settings AS RESTRICTIVE FOR SELECT TO anon
USING (
  COALESCE(category,'') <> 'admin_change_log'
  AND COALESCE(machine_key,'') <> 'ADMIN_CHANGE_LOG'
  AND COALESCE(settings_json->>'stored_category','') <> 'admin_change_log'
  AND COALESCE(settings_json->>'type','') <> 'admin_change_log'
  AND COALESCE(settings_json->>'admin_settings_key','') <> 'ADMIN_CHANGE_LOG'
);

DROP POLICY IF EXISTS rak_machine_settings_authenticated_change_log_admin_only_v5 ON public.machine_settings;
CREATE POLICY rak_machine_settings_authenticated_change_log_admin_only_v5
ON public.machine_settings AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  (SELECT private.rak_is_admin())
  OR (
    COALESCE(category,'') <> 'admin_change_log'
    AND COALESCE(machine_key,'') <> 'ADMIN_CHANGE_LOG'
    AND COALESCE(settings_json->>'stored_category','') <> 'admin_change_log'
    AND COALESCE(settings_json->>'type','') <> 'admin_change_log'
    AND COALESCE(settings_json->>'admin_settings_key','') <> 'ADMIN_CHANGE_LOG'
  )
);
