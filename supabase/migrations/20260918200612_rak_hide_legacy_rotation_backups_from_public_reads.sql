-- RaK TEST ONLY. Keep worker login, live rotations, machine parameters and all rows unchanged.
-- Legacy automatic rotation backups belong to administration, even when stored
-- in machine_settings with a compatibility category of 'frezka'.
DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'machine_settings'
      AND policyname = 'rak_machine_settings_anon_safe_read_v3'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'machine_settings'
      AND policyname = 'rak_machine_settings_authenticated_read_v3'
  ) THEN
    RAISE EXCEPTION 'Expected machine-settings policies changed; review before applying';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.machine_settings
    WHERE settings_json->>'stored_category' = 'rotation_save_backup'
  ) THEN
    RAISE EXCEPTION 'No legacy rotation backup rows; review before applying';
  END IF;
END $guard$;

DROP POLICY IF EXISTS rak_machine_settings_anon_no_rotation_backups_v4 ON public.machine_settings;
CREATE POLICY rak_machine_settings_anon_no_rotation_backups_v4
ON public.machine_settings AS RESTRICTIVE FOR SELECT TO anon
USING (
  COALESCE(category, '') <> 'rotation_save_backup'
  AND LEFT(COALESCE(machine_key, ''), 21) <> 'ROTATION_SAVE_BACKUP_'
  AND COALESCE(settings_json->>'stored_category', '') <> 'rotation_save_backup'
  AND COALESCE(settings_json->>'type', '') <> 'rotation_save_backup'
  AND LEFT(COALESCE(settings_json->>'admin_settings_key', ''), 21) <> 'ROTATION_SAVE_BACKUP_'
);

DROP POLICY IF EXISTS rak_machine_settings_authenticated_rotation_backups_admin_only_v4 ON public.machine_settings;
CREATE POLICY rak_machine_settings_authenticated_rotation_backups_admin_only_v4
ON public.machine_settings AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  (SELECT private.rak_is_admin())
  OR (
    COALESCE(category, '') <> 'rotation_save_backup'
    AND LEFT(COALESCE(machine_key, ''), 21) <> 'ROTATION_SAVE_BACKUP_'
    AND COALESCE(settings_json->>'stored_category', '') <> 'rotation_save_backup'
    AND COALESCE(settings_json->>'type', '') <> 'rotation_save_backup'
    AND LEFT(COALESCE(settings_json->>'admin_settings_key', ''), 21) <> 'ROTATION_SAVE_BACKUP_'
  )
);
