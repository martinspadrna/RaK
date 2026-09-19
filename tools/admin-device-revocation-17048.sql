-- RaK 1.7.48 TEST-only SQL regression. Entire fixture, audit and revoke run ROLLBACK.
-- Test with two real owner Auth session IDs from the test project, never hardcode IDs.
BEGIN;
CREATE TEMP TABLE rak_17048_fixture ON COMMIT DROP AS
SELECT d.user_id,d.session_id FROM public.rak_admin_devices d
JOIN public.rak_admin_profiles p ON p.user_id=d.user_id AND p.enabled AND p.role='owner'
JOIN auth.sessions s ON s.id=d.session_id AND s.user_id=d.user_id
WHERE d.revoked_at IS NULL ORDER BY d.session_id LIMIT 2;
DO $test$ BEGIN
 IF (SELECT count(*) FROM rak_17048_fixture) <> 2 THEN RAISE EXCEPTION 'Need two registered owner sessions'; END IF;
 IF (SELECT count(DISTINCT user_id) FROM rak_17048_fixture) <> 1 THEN RAISE EXCEPTION 'Fixture owners differ'; END IF;
 IF pg_catalog.has_function_privilege('anon','public.rak_admin_touch_device(text,text,text)','EXECUTE')
 OR pg_catalog.has_function_privilege('anon','public.rak_owner_revoke_admin_device(text)','EXECUTE') THEN
 RAISE EXCEPTION 'Anonymous admin privilege regression'; END IF;
END $test$;
INSERT INTO public.rak_admin_devices(user_id,session_id,device_id,label,app_version)
SELECT user_id,session_id,'rakadm-regression-device-17048','SQL TEST', 'rollback' FROM rak_17048_fixture;
DO $test$ BEGIN
 IF (SELECT count(*) FROM public.rak_admin_devices WHERE device_id='rakadm-regression-device-17048') <> 2 THEN
 RAISE EXCEPTION 'Per-session uniqueness rejected same-device multiple sessions'; END IF;
END $test$;
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',(SELECT user_id FROM rak_17048_fixture LIMIT 1),
 'session_id',(SELECT session_id FROM rak_17048_fixture LIMIT 1),'role','authenticated')::text,true),
 set_config('request.jwt.claim.sub',(SELECT user_id::text FROM rak_17048_fixture LIMIT 1),true),
 set_config('request.jwt.claim.role','authenticated',true);
SET LOCAL ROLE authenticated;
SELECT public.rak_owner_revoke_admin_device('rakadm-regression-device-17048');
RESET ROLE;
DO $test$ BEGIN
 IF (SELECT count(*) FROM public.rak_admin_devices WHERE device_id='rakadm-regression-device-17048' AND revoked_at IS NOT NULL) <> 2 THEN
 RAISE EXCEPTION 'Device revocation did not cover both sessions'; END IF;
 IF private.rak_current_admin_role() IS NOT NULL THEN
 RAISE EXCEPTION 'Revoked session retained admin role'; END IF;
 IF EXISTS (SELECT 1 FROM public.rak_admin_devices WHERE device_id='rakadm-regression-device-17048' AND revoked_by IS NULL) THEN
 RAISE EXCEPTION 'Revocation missing actor'; END IF;
END $test$;
SET LOCAL ROLE authenticated;
DO $test$ DECLARE blocked boolean:=false; BEGIN
 BEGIN PERFORM public.rak_admin_touch_device('rakadm-regression-device-17048','replay','rollback');
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Revoked device session successfully re-registered'; END IF;
END $test$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS: device rows immutable per Auth session; full device revoke and no revive; fixtures rolled back' AS result;
