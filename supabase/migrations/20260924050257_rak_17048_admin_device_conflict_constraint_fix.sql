-- RaK 1.7.48 TEST-only corrective migration. The original migration installed
-- the table constraint successfully, but its ON CONFLICT column list was
-- ambiguous with a PL/pgSQL variable. Use the named constraint instead.
CREATE OR REPLACE FUNCTION public.rak_admin_touch_device(
  p_device_id text, p_label text DEFAULT 'Zařízení', p_app_version text DEFAULT ''
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_profile public.rak_admin_profiles%ROWTYPE;
  v_session_id uuid := private.rak_current_session_id();
  v_saved public.rak_admin_devices%ROWTYPE;
BEGIN
  IF private.rak_current_admin_role() NOT IN ('owner','admin','deputy') THEN
    RAISE EXCEPTION 'Authenticated RaK role required' USING ERRCODE='42501';
  END IF;
  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Missing authenticated session' USING ERRCODE='42501';
  END IF;
  IF COALESCE(pg_catalog.length(pg_catalog.btrim(p_device_id)),0)<10
     OR pg_catalog.length(pg_catalog.btrim(p_device_id))>96 THEN
    RAISE EXCEPTION 'Invalid device id' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_profile FROM public.rak_admin_profiles
    WHERE user_id=(SELECT auth.uid()) AND enabled;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Authenticated RaK role required' USING ERRCODE='42501';
  END IF;
  INSERT INTO public.rak_admin_devices
    (user_id,session_id,device_id,label,app_version,last_seen_at,revoked_at,revoked_by)
  VALUES (v_profile.user_id,v_session_id,pg_catalog.btrim(p_device_id),
    pg_catalog.left(COALESCE(NULLIF(pg_catalog.btrim(p_label),''),'Zařízení'),120),
    pg_catalog.left(COALESCE(p_app_version,''),40),pg_catalog.now(),NULL,NULL)
  ON CONFLICT ON CONSTRAINT rak_admin_devices_user_session_device_key
    DO UPDATE SET label=EXCLUDED.label,app_version=EXCLUDED.app_version,
      last_seen_at=EXCLUDED.last_seen_at
    WHERE public.rak_admin_devices.revoked_at IS NULL
  RETURNING * INTO v_saved;
  IF v_saved.id IS NULL THEN
    RAISE EXCEPTION 'Device session has been revoked' USING ERRCODE='42501';
  END IF;
  RETURN pg_catalog.jsonb_build_object('ok',true,'device_id',v_saved.device_id,
    'last_seen_at',v_saved.last_seen_at);
END;
$function$;
REVOKE ALL ON FUNCTION public.rak_admin_touch_device(text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rak_admin_touch_device(text,text,text) TO authenticated;
;
