-- RaK TEST ONLY: hide roster names and legacy login numbers from public machine-settings reads.
-- Keep existing employee login RPC, live rotation access and all machine settings writes unchanged.
DO $guard$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='machine_settings' AND c.relrowsecurity)
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='machine_settings' AND policyname='rak_machine_settings_anon_safe_read_v3')
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='machine_settings' AND policyname='rak_machine_settings_authenticated_read_v3')
 THEN RAISE EXCEPTION 'Existing machine-settings RLS baseline missing'; END IF;
 IF (SELECT count(*) FROM public.machine_settings WHERE machine_key='WORKER_ROSTER_SETTINGS' AND settings_json->>'stored_category'='worker_roster_settings')<>1
 THEN RAISE EXCEPTION 'Expected worker roster baseline missing'; END IF;
 IF EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='machine_settings' AND policyname IN ('rak_machine_settings_anon_no_worker_roster_v7','rak_machine_settings_authenticated_worker_roster_admin_only_v7'))
 THEN RAISE EXCEPTION 'Worker roster policies already exist; review migration history'; END IF;
END $guard$;

CREATE POLICY rak_machine_settings_anon_no_worker_roster_v7
ON public.machine_settings AS RESTRICTIVE FOR SELECT TO anon
USING (
 COALESCE(category,'') <> 'worker_roster_settings'
 AND COALESCE(machine_key,'') <> 'WORKER_ROSTER_SETTINGS'
 AND COALESCE(settings_json->>'stored_category','') <> 'worker_roster_settings'
 AND COALESCE(settings_json->>'type','') <> 'worker_roster_settings'
 AND COALESCE(settings_json->>'admin_settings_key','') <> 'WORKER_ROSTER_SETTINGS'
);

CREATE POLICY rak_machine_settings_authenticated_worker_roster_admin_only_v7
ON public.machine_settings AS RESTRICTIVE FOR SELECT TO authenticated
USING (
 (SELECT private.rak_is_admin()) OR (
  COALESCE(category,'') <> 'worker_roster_settings'
  AND COALESCE(machine_key,'') <> 'WORKER_ROSTER_SETTINGS'
  AND COALESCE(settings_json->>'stored_category','') <> 'worker_roster_settings'
  AND COALESCE(settings_json->>'type','') <> 'worker_roster_settings'
  AND COALESCE(settings_json->>'admin_settings_key','') <> 'WORKER_ROSTER_SETTINGS'
 )
);

DO $verify$
BEGIN
 IF (SELECT count(*) FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='machine_settings' AND permissive='RESTRICTIVE' AND cmd='SELECT' AND policyname IN ('rak_machine_settings_anon_no_worker_roster_v7','rak_machine_settings_authenticated_worker_roster_admin_only_v7')) <> 2
 THEN RAISE EXCEPTION 'Expected worker roster read guards not installed'; END IF;
END $verify$;

NOTIFY pgrst,'reload schema';
