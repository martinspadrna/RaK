-- RaK 1.7.46 TEST database regression. The entire test is rolled back.
BEGIN;
DO $preflight$
BEGIN
 IF NOT has_function_privilege('anon','public.rak_app_keepalive(text,text,text,jsonb)','EXECUTE')
    OR has_table_privilege('anon','public.app_keepalive','SELECT')
    OR has_table_privilege('anon','public.rak_rotation_backups_v2','SELECT')
    OR has_table_privilege('anon','public.game_accounts','SELECT') THEN
  RAISE EXCEPTION '[17046] anonymous privileges broadened or telemetry RPC unavailable';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname='rak_rotation_backup_structure_v1'
    AND conrelid='public.rak_rotation_backups_v2'::regclass AND convalidated) THEN
  RAISE EXCEPTION '[17046] validated snapshot constraint missing';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.rak_rotation_backups_v2) OR EXISTS (
  SELECT 1 FROM public.rak_rotation_backups_v2
  WHERE pg_catalog.jsonb_typeof(payload) IS DISTINCT FROM 'object'
     OR pg_catalog.jsonb_typeof(payload->'months') IS DISTINCT FROM 'object'
     OR payload->'months'='{}'::jsonb OR pg_catalog.jsonb_typeof(meta) IS DISTINCT FROM 'object'
     OR revision<0
 ) THEN RAISE EXCEPTION '[17046] invalid or absent backup fixtures'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.rotation_state WHERE key='main' AND revision>=1)
    OR NOT EXISTS (SELECT 1 FROM private.rak_rotation_import_metadata_v1) THEN
  RAISE EXCEPTION '[17046] rotation or private import archive lost';
 END IF;
END;
$preflight$;
SET LOCAL ROLE anon;
DO $test$
DECLARE first_result jsonb; second_result jsonb; denied boolean:=false;
BEGIN
 first_result:=public.rak_app_keepalive('rak-17046-synthetic-device','1.7.46','synthetic-test',
 '{"online":true,"reason":"smoke","accountNumber":"NOT-REAL","fullName":"NOT-REAL"}'::jsonb);
 IF first_result->>'ok' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'synthetic keepalive rejected'; END IF;
 second_result:=public.rak_app_keepalive('rak-17046-synthetic-device','1.7.46','synthetic-test','{"reason":"repeated"}'::jsonb);
 IF second_result->>'throttled' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'duplicate write not throttled'; END IF;
 BEGIN PERFORM public.rak_app_keepalive('x'); EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'bad device key accepted'; END IF;
END;
$test$;
RESET ROLE;
DO $check$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.app_keepalive WHERE device_key='rak-17046-synthetic-device'
 AND payload->>'online'='true' AND payload->>'reason'='smoke'
 AND NOT (payload ? 'accountNumber') AND NOT (payload ? 'fullName')) THEN
 RAISE EXCEPTION '[17046] telemetry identity field leaked or duplicate updated row';
 END IF;
END;
$check$;
INSERT INTO private.rak_login_lookup_budget AS b(hour_start,caller_key,hits)
VALUES(date_trunc('hour',clock_timestamp()),'telemetry-keepalive-global-v1',6000)
ON CONFLICT(hour_start,caller_key) DO UPDATE SET hits=6000;
SET LOCAL ROLE anon;
DO $test$
DECLARE denied boolean:=false;
BEGIN
 BEGIN PERFORM public.rak_app_keepalive('rak-17046-synthetic-device');
 EXCEPTION WHEN raise_exception THEN
 IF SQLERRM='keepalive_rate_limited' THEN denied:=true; ELSE RAISE; END IF;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'global anonymous quota did not fail closed'; END IF;
END;
$test$;
ROLLBACK;
