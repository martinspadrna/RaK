-- RaK development/test only: bound anonymous RPC volume without changing client signatures.
-- The corresponding migration was verified against the isolated RaK-test Supabase.
CREATE OR REPLACE FUNCTION public.rak_app_keepalive(
  p_device_key text,
  p_app_version text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $rak$
DECLARE
  v_device_key text := trim(coalesce(p_device_key, ''));
  v_app_version text := left(coalesce(p_app_version, ''), 40);
  v_user_agent text := left(coalesce(p_user_agent, ''), 300);
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_heartbeat_at timestamptz := now();
BEGIN
  IF char_length(v_device_key) NOT BETWEEN 8 AND 80 OR octet_length(v_device_key) > 160 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_device_key';
  END IF;
  IF jsonb_typeof(v_payload) IS DISTINCT FROM 'object' THEN
    v_payload := '{}'::jsonb;
  END IF;
  IF octet_length(v_payload::text) > 4096 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'keepalive_payload_too_large';
  END IF;

  -- Serialize new-device admission. Existing devices remain usable even when
  -- the bounded anonymous device pool is full.
  PERFORM pg_catalog.pg_advisory_xact_lock(17025, 1);
  IF NOT EXISTS (SELECT 1 FROM public.app_keepalive WHERE device_key = v_device_key)
     AND (SELECT count(*) FROM public.app_keepalive) >= 256 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'keepalive_device_capacity_reached';
  END IF;

  INSERT INTO public.app_keepalive(device_key, app_version, heartbeat_at, user_agent, payload)
  VALUES (v_device_key, nullif(v_app_version, ''), v_heartbeat_at, nullif(v_user_agent, ''), v_payload)
  ON CONFLICT(device_key) DO UPDATE SET
    app_version = excluded.app_version,
    heartbeat_at = excluded.heartbeat_at,
    user_agent = excluded.user_agent,
    payload = excluded.payload;
  RETURN jsonb_build_object('ok', true, 'heartbeat_at', v_heartbeat_at, 'device_key', v_device_key);
END;
$rak$;

CREATE OR REPLACE FUNCTION public.rak_submit_bug_report_v2(
  p_account_number text,
  p_player_name text,
  p_report_type text,
  p_message text,
  p_app_version text DEFAULT NULL,
  p_route text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_device_info jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $rak$
DECLARE
  saved_id uuid;
  safe_account text := nullif(left(trim(coalesce(p_account_number, '')), 80), '');
  safe_source text := nullif(left(trim(coalesce(p_device_info->>'sourceId', '')), 120), '');
  v_device_info jsonb := coalesce(p_device_info, '{}'::jsonb);
BEGIN
  IF coalesce(length(trim(p_message)), 0) < 3 OR length(p_message) > 4000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_report_message';
  END IF;
  IF coalesce(p_report_type, '') NOT IN ('chyba', 'napad', 'nelibi', 'vykon', 'hra', 'ostatni') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_report_type';
  END IF;
  IF jsonb_typeof(v_device_info) IS DISTINCT FROM 'object'
     OR octet_length(v_device_info::text) > 12000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_device_info';
  END IF;

  -- Account number and sourceId are both client-supplied and can be rotated.
  -- A global cap bounds abuse even when the caller changes those fields.
  -- Advisory lock serializes admission so parallel requests cannot bypass cap.
  PERFORM pg_catalog.pg_advisory_xact_lock(17025, 2);
  IF safe_source IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.bug_reports
    WHERE created_at >= now() - interval '10 minutes'
      AND device_info->>'sourceId' = safe_source
  ) THEN
    RETURN jsonb_build_object('ok', true, 'duplicate', true);
  END IF;
  IF (SELECT count(*) FROM public.bug_reports WHERE created_at >= now() - interval '1 hour') >= 24
     OR (SELECT count(*) FROM public.bug_reports WHERE created_at >= now() - interval '24 hours') >= 100 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'report_rate_limited';
  END IF;
  IF safe_account IS NOT NULL AND (
    SELECT count(*) FROM public.bug_reports
    WHERE created_at >= now() - interval '1 hour' AND account_number = safe_account
  ) >= 8 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'report_rate_limited';
  END IF;

  INSERT INTO public.bug_reports(
    account_number, player_name, report_type, message,
    app_version, route, user_agent, device_info, status
  ) VALUES (
    safe_account,
    nullif(left(trim(coalesce(p_player_name, '')), 160), ''),
    p_report_type,
    trim(p_message),
    nullif(left(trim(coalesce(p_app_version, '')), 80), ''),
    nullif(left(trim(coalesce(p_route, '')), 300), ''),
    nullif(left(coalesce(p_user_agent, ''), 1000), ''),
    v_device_info,
    'new'
  ) RETURNING id INTO saved_id;
  RETURN jsonb_build_object('ok', true, 'id', saved_id);
END;
$rak$;

-- Direct public table access stays revoked; current clients use these RPCs.
REVOKE ALL ON FUNCTION public.rak_app_keepalive(text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rak_submit_bug_report_v2(text, text, text, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rak_app_keepalive(text, text, text, jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rak_submit_bug_report_v2(text, text, text, text, text, text, text, jsonb) TO anon, authenticated, service_role;
;
