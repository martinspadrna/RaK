-- RaK development/test only. Keep owner sign-up bootstrap disabled after rebuild.
-- This migration mirrors the already-applied staging hardening; no existing profiles
-- or operational data are modified.
DROP TRIGGER IF EXISTS rak_test_bootstrap_owner_after_signup ON auth.users;
DROP FUNCTION IF EXISTS public.rak_test_bootstrap_owner_profile();

-- Preserve the existing heartbeat contract while rejecting unbounded input.
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
  IF char_length(v_device_key) NOT BETWEEN 8 AND 80 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_device_key';
  END IF;
  IF jsonb_typeof(v_payload) IS DISTINCT FROM 'object' THEN
    v_payload := '{}'::jsonb;
  END IF;
  IF octet_length(v_payload::text) > 4096 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'keepalive_payload_too_large';
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

REVOKE ALL ON FUNCTION public.rak_app_keepalive(text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rak_app_keepalive(text, text, text, jsonb) TO anon, authenticated, service_role;
;
