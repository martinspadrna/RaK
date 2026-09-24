-- RaK development/test: never report an authenticated admin without a real user,
-- a live session and a matching enabled administrative profile.
CREATE OR REPLACE FUNCTION public.rak_admin_context()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $rak$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_session_id uuid := private.rak_current_session_id();
  v_role text;
  v_profile public.rak_admin_profiles%ROWTYPE;
BEGIN
  IF v_user_id IS NULL OR v_session_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated RaK role required' USING ERRCODE = '42501';
  END IF;
  v_role := private.rak_current_admin_role();
  IF COALESCE(v_role, '') NOT IN ('owner', 'admin', 'deputy') THEN
    RAISE EXCEPTION 'Authenticated RaK role required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_profile
  FROM public.rak_admin_profiles
  WHERE user_id = v_user_id AND enabled AND role = v_role;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Authenticated RaK role required' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'authenticated', true,
    'user_id', v_profile.user_id,
    'account_id', v_profile.account_id,
    'display_name', v_profile.display_name,
    'role', v_profile.role,
    'is_owner', v_profile.role = 'owner',
    'session_id', v_session_id
  );
END;
$rak$;
;
