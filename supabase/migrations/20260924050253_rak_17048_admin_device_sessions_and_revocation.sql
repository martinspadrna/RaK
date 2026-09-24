-- RaK 1.7.48: TEST project only. Preserve each authenticated admin session separately.
-- Ordinary employees continue using only their four-digit OS number; this migration never touches their login.
ALTER TABLE public.rak_admin_devices
  DROP CONSTRAINT rak_admin_devices_user_id_device_id_key;
ALTER TABLE public.rak_admin_devices
  ADD CONSTRAINT rak_admin_devices_user_session_device_key UNIQUE (user_id, session_id, device_id);

-- Existing Auth sessions which lost their device row through the old UPSERT must
-- not retain unlimited administrator permissions. Allow a short bootstrap window
-- for new password-authenticated sessions to register a device immediately.
CREATE OR REPLACE FUNCTION private.rak_current_admin_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT profile.role
  FROM public.rak_admin_profiles AS profile
  WHERE profile.user_id = (SELECT auth.uid())
    AND profile.enabled
    AND EXISTS (
      SELECT 1 FROM auth.sessions AS session
      WHERE session.id = private.rak_current_session_id()
        AND session.user_id = profile.user_id
        AND (
          session.created_at >= pg_catalog.now() - INTERVAL '10 minutes'
          OR EXISTS (
            SELECT 1 FROM public.rak_admin_devices AS device
            WHERE device.user_id = profile.user_id
              AND device.session_id = session.id
              AND device.revoked_at IS NULL
          )
        )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.rak_admin_devices AS device
      WHERE device.user_id = profile.user_id
        AND device.session_id = private.rak_current_session_id()
        AND device.revoked_at IS NOT NULL
    )
  LIMIT 1
$function$;
REVOKE ALL ON FUNCTION private.rak_current_admin_role() FROM PUBLIC, anon, authenticated;

-- Never rewrite a prior session's row, and never revive a revoked row.
CREATE OR REPLACE FUNCTION public.rak_admin_touch_device(
  p_device_id text, p_label text DEFAULT 'Zařízení', p_app_version text DEFAULT ''
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  profile public.rak_admin_profiles%ROWTYPE;
  session_id uuid := private.rak_current_session_id();
  saved public.rak_admin_devices%ROWTYPE;
BEGIN
  IF private.rak_current_admin_role() NOT IN ('owner','admin','deputy') THEN
    RAISE EXCEPTION 'Authenticated RaK role required' USING ERRCODE='42501';
  END IF;
  IF session_id IS NULL THEN
    RAISE EXCEPTION 'Missing authenticated session' USING ERRCODE='42501';
  END IF;
  IF COALESCE(pg_catalog.length(pg_catalog.btrim(p_device_id)),0)<10
     OR pg_catalog.length(pg_catalog.btrim(p_device_id))>96 THEN
    RAISE EXCEPTION 'Invalid device id' USING ERRCODE='22023';
  END IF;
  SELECT * INTO profile FROM public.rak_admin_profiles
    WHERE user_id=(SELECT auth.uid()) AND enabled;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Authenticated RaK role required' USING ERRCODE='42501';
  END IF;
  INSERT INTO public.rak_admin_devices
    (user_id,session_id,device_id,label,app_version,last_seen_at,revoked_at,revoked_by)
  VALUES (profile.user_id,session_id,pg_catalog.btrim(p_device_id),
    pg_catalog.left(COALESCE(NULLIF(pg_catalog.btrim(p_label),''),'Zařízení'),120),
    pg_catalog.left(COALESCE(p_app_version,''),40),pg_catalog.now(),NULL,NULL)
  ON CONFLICT (user_id,session_id,device_id)
    DO UPDATE SET label=EXCLUDED.label,app_version=EXCLUDED.app_version,
      last_seen_at=EXCLUDED.last_seen_at
    WHERE public.rak_admin_devices.revoked_at IS NULL
  RETURNING * INTO saved;
  IF saved.id IS NULL THEN
    RAISE EXCEPTION 'Device session has been revoked' USING ERRCODE='42501';
  END IF;
  RETURN pg_catalog.jsonb_build_object('ok',true,'device_id',saved.device_id,
    'last_seen_at',saved.last_seen_at);
END;
$function$;
REVOKE ALL ON FUNCTION public.rak_admin_touch_device(text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rak_admin_touch_device(text,text,text) TO authenticated;

-- The UI identifies a PHYSICAL browser device, not a unique session row.
-- Revoke ALL currently registered sessions with this device key across accounts.
CREATE OR REPLACE FUNCTION public.rak_owner_revoke_admin_device(p_device_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_device_id text := pg_catalog.btrim(COALESCE(p_device_id,''));
  v_revoked integer;
BEGIN
  PERFORM private.rak_require_admin(true);
  IF pg_catalog.length(v_device_id)<10 OR pg_catalog.length(v_device_id)>96 THEN
    RAISE EXCEPTION 'Invalid device id' USING ERRCODE='22023';
  END IF;
  UPDATE public.rak_admin_devices
    SET revoked_at=pg_catalog.now(),revoked_by=(SELECT auth.uid())
    WHERE device_id=v_device_id AND revoked_at IS NULL;
  GET DIAGNOSTICS v_revoked = ROW_COUNT;
  IF v_revoked=0 THEN
    RETURN pg_catalog.jsonb_build_object('ok',false,'reason','missing-device');
  END IF;
  PERFORM private.rak_write_admin_audit('admin.device.revoke','admin_device',v_device_id,
    pg_catalog.jsonb_build_object('revoked_sessions',v_revoked));
  RETURN pg_catalog.jsonb_build_object('ok',true,'device_id',v_device_id,
    'revoked_sessions',v_revoked);
END;
$function$;
REVOKE ALL ON FUNCTION public.rak_owner_revoke_admin_device(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rak_owner_revoke_admin_device(text) TO authenticated;

COMMENT ON CONSTRAINT rak_admin_devices_user_session_device_key ON public.rak_admin_devices IS
 'RaK 1.7.48: separate immutable device row per Auth session; old JWT cannot regain access after subsequent logins.';
COMMENT ON FUNCTION private.rak_current_admin_role() IS
 'RaK 1.7.48: verified Auth session, registered nonrevoked device or 10-minute login bootstrap, reject revoked session; no employee Auth.';
COMMENT ON FUNCTION public.rak_owner_revoke_admin_device(text) IS
 'RaK 1.7.48: owner revokes all sessions for same browser device key, including different admin accounts.';

DO $verify$
BEGIN
  IF EXISTS (SELECT 1 FROM public.rak_admin_devices d
      WHERE d.revoked_at IS NOT NULL AND d.revoked_by IS NULL) THEN
    RAISE EXCEPTION 'Preexisting device revocation missing actor';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid='public.rak_admin_devices'::pg_catalog.regclass
      AND conname='rak_admin_devices_user_session_device_key') THEN
    RAISE EXCEPTION 'Per-session device constraint missing';
  END IF;
END;
$verify$;
;
