-- RaK 1.7.46 / TEST Supabase only. No employee login or production changes.
-- Keepalive is best-effort telemetry, not proof of identity; bound writes independently of client device keys.
CREATE OR REPLACE FUNCTION public.rak_app_keepalive(
  p_device_key text, p_app_version text DEFAULT NULL, p_user_agent text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE
  v_device_key text := pg_catalog.btrim(COALESCE(p_device_key, ''));
  v_app_version text := pg_catalog.left(COALESCE(p_app_version, ''), 40);
  v_user_agent text := pg_catalog.left(COALESCE(p_user_agent, ''), 300);
  v_raw_payload jsonb := COALESCE(p_payload, '{}'::jsonb);
  v_payload jsonb;
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_hits integer;
  v_previous timestamptz;
BEGIN
  IF pg_catalog.char_length(v_device_key) NOT BETWEEN 8 AND 80 OR pg_catalog.octet_length(v_device_key)>160 THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='invalid_device_key';
  END IF;
  IF pg_catalog.jsonb_typeof(v_raw_payload) IS DISTINCT FROM 'object' THEN v_raw_payload:='{}'::jsonb; END IF;
  IF pg_catalog.octet_length(v_raw_payload::text)>4096 THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='keepalive_payload_too_large';
  END IF;
  -- Unknown fields (notably employee identifiers) are not persisted.
  SELECT COALESCE(pg_catalog.jsonb_object_agg(item.key,item.value),'{}'::jsonb)
  INTO v_payload FROM pg_catalog.jsonb_each(v_raw_payload) AS item
  WHERE item.key IN ('build','online','reason','timezone','transport');
  IF pg_catalog.octet_length(v_payload::text)>1024 OR EXISTS (
    SELECT 1 FROM pg_catalog.jsonb_each(v_payload) AS item
    WHERE pg_catalog.jsonb_typeof(item.value) NOT IN ('string','number','boolean','null')
  ) THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='keepalive_payload_invalid'; END IF;
  -- Same lock as bounded device admission: concurrent requests cannot skip the global quota.
  PERFORM pg_catalog.pg_advisory_xact_lock(17025,1);
  INSERT INTO private.rak_login_lookup_budget AS budget (hour_start,caller_key,hits)
  VALUES (pg_catalog.date_trunc('hour',v_now),'telemetry-keepalive-global-v1',1)
  ON CONFLICT(hour_start,caller_key) DO UPDATE SET hits=LEAST(budget.hits+1,6001)
  RETURNING hits INTO v_hits;
  IF v_hits > 6000 THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='keepalive_rate_limited'; END IF;
  SELECT heartbeat_at INTO v_previous FROM public.app_keepalive WHERE device_key=v_device_key;
  -- Maintain old-client response shape, but do not write the same device again for 15 seconds.
  IF v_previous IS NOT NULL AND v_previous > v_now - interval '15 seconds' THEN
    RETURN pg_catalog.jsonb_build_object('ok',true,'heartbeat_at',v_previous,'device_key',v_device_key,'throttled',true);
  END IF;
  IF v_previous IS NULL AND (SELECT count(*) FROM public.app_keepalive)>=256 THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='keepalive_device_capacity_reached';
  END IF;
  INSERT INTO public.app_keepalive(device_key,app_version,heartbeat_at,user_agent,payload)
  VALUES(v_device_key,NULLIF(v_app_version,''),v_now,NULLIF(v_user_agent,''),v_payload)
  ON CONFLICT(device_key) DO UPDATE SET
    app_version=excluded.app_version,heartbeat_at=excluded.heartbeat_at,
    user_agent=excluded.user_agent,payload=excluded.payload;
  RETURN pg_catalog.jsonb_build_object('ok',true,'heartbeat_at',v_now,'device_key',v_device_key);
END;
$function$;
REVOKE ALL ON FUNCTION public.rak_app_keepalive(text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rak_app_keepalive(text,text,text,jsonb) TO anon,authenticated;
COMMENT ON FUNCTION public.rak_app_keepalive(text,text,text,jsonb) IS
 'RaK 1.7.46: 6000/hour global telemetry quota, 15s write dedup, allowlisted scalar payload; not identity authentication.';
-- Reject malformed future backup snapshots before they can be offered for restoration.
ALTER TABLE public.rak_rotation_backups_v2 ADD CONSTRAINT rak_rotation_backup_structure_v1 CHECK ((
 pg_catalog.jsonb_typeof(payload)='object' AND pg_catalog.jsonb_typeof(payload->'months')='object'
 AND payload->'months'<>'{}'::jsonb AND pg_catalog.jsonb_typeof(meta)='object'
 AND revision>=0 AND pg_catalog.octet_length(payload::text)<=8000000
) IS TRUE);
