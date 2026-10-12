-- TEST only. All fixture data, sessions and audit writes are rolled back.
BEGIN;
DO $verify$
DECLARE
  uid uuid;
  sid uuid := gen_random_uuid();
  op uuid;
  base jsonb := '{"months":{"2026-10":{"hard":{"rows":[{"date":"12.10.2026","cells":["Fixture"]},{"date":"13.10.2026","cells":["Fixture"]}]},"soft":{"rows":[{"date":"12.10.2026","cells":[]},{"date":"13.10.2026","cells":[]}]},"notes":[]}}}';
  candidate jsonb;
  result jsonb;
  replay jsonb;
  reason text;
  revision bigint;
  fixture_key text := 'rak-v200-verify-' || gen_random_uuid()::text;
BEGIN
  SELECT user_id INTO uid FROM public.rak_admin_profiles WHERE enabled AND role='owner' LIMIT 1;
  IF uid IS NULL THEN RAISE EXCEPTION 'TEST owner fixture missing'; END IF;
  INSERT INTO auth.sessions(id,user_id,created_at,updated_at) VALUES(sid,uid,now(),now());
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated','session_id',sid)::text,true);
  IF public.rak_admin_context()->>'role' <> 'owner' THEN RAISE EXCEPTION 'Fresh session context failed'; END IF;
  PERFORM public.rak_admin_touch_device('rakadm-v200-' || sid::text,'TEST rollback fixture','2.0.0');
  INSERT INTO public.rotation_state(key,payload,meta,revision) VALUES(fixture_key,base,'{}',1);
  FOREACH reason IN ARRAY ARRAY['N','LEK'] LOOP
    SELECT r.revision INTO revision FROM public.rotation_state r WHERE r.key=fixture_key;
    candidate := jsonb_set(base,'{months,2026-10,notes}',jsonb_build_array(jsonb_build_object('date','12.10.2026','person','Fixture','code',reason,'text','','shift','A')));
    op := gen_random_uuid();
    result := public.rak_admin_apply_unplanned_change_v2(fixture_key,candidate,'{}',revision,op,'2026-10','Fixture','absence',reason,'["12.10.2026"]');
    IF result->>'ok'<>'true' THEN RAISE EXCEPTION 'Absence write failed'; END IF;
    replay := public.rak_admin_apply_unplanned_change_v2(fixture_key,candidate,'{}',revision,op,'2026-10','Fixture','absence',reason,'["12.10.2026"]');
    IF replay->>'idempotent_replay'<>'true' THEN RAISE EXCEPTION 'Idempotence failed'; END IF;
    BEGIN
      PERFORM public.rak_admin_apply_unplanned_change_v2(fixture_key,candidate,'{}',revision,gen_random_uuid(),'2026-10','Fixture','absence',reason,'["12.10.2026"]');
      RAISE EXCEPTION 'Stale revision accepted' USING ERRCODE='ZX001';
    EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL; END;
  END LOOP;
  SELECT r.revision INTO revision FROM public.rotation_state r WHERE r.key=fixture_key;
  candidate := jsonb_set(candidate,'{months,2026-10,hard,rows,1,cells}','["Changed outside scope"]');
  BEGIN
    PERFORM public.rak_admin_apply_unplanned_change_v2(fixture_key,candidate,'{}',revision,gen_random_uuid(),'2026-10','Fixture','absence','LEK','["12.10.2026"]');
    RAISE EXCEPTION 'Out-of-scope day accepted' USING ERRCODE='ZX002';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
  UPDATE public.rak_admin_devices SET revoked_at=now() WHERE user_id=uid AND session_id=sid;
  BEGIN
    PERFORM public.rak_admin_context();
    RAISE EXCEPTION 'Revoked device accepted' USING ERRCODE='ZX003';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
  PERFORM set_config('request.jwt.claims','{}',true);
  BEGIN
    PERFORM public.rak_admin_apply_unplanned_change_v2(fixture_key,base,'{}',revision,gen_random_uuid(),'2026-10','Fixture','absence','N','["12.10.2026"]');
    RAISE EXCEPTION 'Anonymous write accepted' USING ERRCODE='ZX004';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
END
$verify$;
ROLLBACK;
