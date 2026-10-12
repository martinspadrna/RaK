-- TEST only: verified Mistr role; owner authority remains unchanged.
alter table public.rak_admin_profiles drop constraint rak_admin_profiles_role_check;
alter table public.rak_admin_profiles add constraint rak_admin_profiles_role_check check (role in ('owner','admin','deputy','foreman'));
CREATE OR REPLACE FUNCTION public.rak_admin_context()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  IF COALESCE(v_role, '') NOT IN ('owner', 'admin', 'deputy', 'foreman') THEN
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
$function$
;
CREATE OR REPLACE FUNCTION public.rak_admin_touch_device(p_device_id text, p_label text DEFAULT 'Zařízení'::text, p_app_version text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_profile public.rak_admin_profiles%ROWTYPE;
  v_session_id uuid := private.rak_current_session_id();
  v_saved public.rak_admin_devices%ROWTYPE;
BEGIN
  IF private.rak_current_admin_role() NOT IN ('owner','admin','deputy','foreman') THEN
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
$function$
;
CREATE OR REPLACE FUNCTION public.rak_list_shift_overviews()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare ctx jsonb; result jsonb;
begin
  ctx := public.rak_admin_context();
  if coalesce(ctx->>'role','') not in ('owner','foreman') then raise exception 'Shift overview authentication required' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(to_jsonb(r) - 'user_id' order by r.shift_date desc, r.shift_code), '[]'::jsonb)
    into result from public.rak_shift_overviews r where r.user_id = (ctx->>'user_id')::uuid;
  return result;
end $function$
;
CREATE OR REPLACE FUNCTION public.rak_save_shift_overview(p_date date, p_shift text, p_payload jsonb, p_expected_revision bigint, p_mutation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare ctx jsonb; uid uuid; saved public.rak_shift_overviews%rowtype;
begin
  ctx := public.rak_admin_context();
  if coalesce(ctx->>'role','') not in ('owner','foreman') then raise exception 'Shift overview authentication required' using errcode = '42501'; end if;
  uid := (ctx->>'user_id')::uuid;
  if p_date is null or p_shift is null or p_shift !~ '^[ABCD]:(ranni|nocni)(8|12)$'
    or p_payload is null or jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text) > 200000
    or p_payload->>'date' is distinct from p_date::text or p_payload->>'shift' is distinct from p_shift
    or p_expected_revision is null or p_expected_revision < 0 or p_mutation_id is null then
    raise exception 'Invalid shift overview' using errcode = '22023';
  end if;
  -- Serializes each account/date/shift, including inserts and lost-response retries.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text || '|' || p_date::text || '|' || p_shift, 0));
  select * into saved from public.rak_shift_overviews
    where user_id = uid and shift_date = p_date and shift_code = p_shift;
  if found then
    if saved.mutation_id = p_mutation_id and saved.payload = p_payload then
      return jsonb_build_object('ok', true, 'row', to_jsonb(saved) - 'user_id');
    end if;
    if saved.revision <> p_expected_revision then
      return jsonb_build_object('ok', false, 'conflict', true, 'row', to_jsonb(saved) - 'user_id');
    end if;
    update public.rak_shift_overviews set payload = p_payload, revision = revision + 1,
      mutation_id = p_mutation_id, updated_at = clock_timestamp()
      where user_id = uid and shift_date = p_date and shift_code = p_shift returning * into saved;
  else
    if p_expected_revision <> 0 then return jsonb_build_object('ok', false, 'conflict', true); end if;
    insert into public.rak_shift_overviews(user_id, shift_date, shift_code, payload, mutation_id)
      values(uid, p_date, p_shift, p_payload, p_mutation_id) returning * into saved;
  end if;
  return jsonb_build_object('ok', true, 'row', to_jsonb(saved) - 'user_id');
end $function$
;
