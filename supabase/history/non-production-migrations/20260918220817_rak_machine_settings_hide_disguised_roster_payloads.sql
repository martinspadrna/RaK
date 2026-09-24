-- RaK TEST ONLY. Defense in depth: roster identities must never be exposed by
-- a mislabeled machine_settings row containing worker/account arrays.
-- Verified admin and owner retain their existing access; writers are unchanged.
DO $guard$
BEGIN
 IF (SELECT count(*) FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='machine_settings' AND policyname IN ('rak_machine_settings_anon_no_worker_roster_v7','rak_machine_settings_authenticated_worker_roster_admin_only_v7'))<>2
 THEN RAISE EXCEPTION 'Worker roster privacy v7 must be installed first'; END IF;
 IF (SELECT count(*) FROM public.machine_settings WHERE settings_json ?| ARRAY['appAccounts','applicationAccounts','workers'])<>1
 THEN RAISE EXCEPTION 'Unexpected employee payload baseline; review before migration'; END IF;
 IF EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='machine_settings' AND policyname IN ('rak_machine_settings_anon_no_roster_payload_v8','rak_machine_settings_authenticated_roster_payload_admin_only_v8'))
 THEN RAISE EXCEPTION 'Roster payload guards already exist'; END IF;
END $guard$;

CREATE POLICY rak_machine_settings_anon_no_roster_payload_v8
 ON public.machine_settings AS RESTRICTIVE FOR SELECT TO anon
 USING (NOT (settings_json ?| ARRAY['appAccounts','applicationAccounts','workers']));

CREATE POLICY rak_machine_settings_authenticated_roster_payload_admin_only_v8
 ON public.machine_settings AS RESTRICTIVE FOR SELECT TO authenticated
 USING ((SELECT private.rak_is_admin()) OR NOT (settings_json ?| ARRAY['appAccounts','applicationAccounts','workers']));

DO $verify$
BEGIN
 IF (SELECT count(*) FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='machine_settings' AND permissive='RESTRICTIVE' AND cmd='SELECT' AND policyname IN ('rak_machine_settings_anon_no_roster_payload_v8','rak_machine_settings_authenticated_roster_payload_admin_only_v8'))<>2
 THEN RAISE EXCEPTION 'Expected roster payload guards not installed'; END IF;
END $verify$;
NOTIFY pgrst,'reload schema';
