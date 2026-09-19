-- RaK 1.7.53: manually execute ONLY in isolated TEST Supabase cgshssdjgzzuprlwnabl.
-- Profiles are real; Auth sessions and device rows are temporary, not signed JWTs.
-- This is NOT a live token / iPhone test. Entire transaction must ROLLBACK.
BEGIN;
DO $rak$
DECLARE rec record; sid uuid; owner_ok boolean; ctx jsonb; snap jsonb; checked integer:=0; fake_denied boolean; last_user uuid; imports_count integer;
BEGIN
  FOR rec IN SELECT user_id, role FROM public.rak_admin_profiles WHERE enabled AND role IN ('owner','admin','deputy') ORDER BY role LOOP
    sid:=gen_random_uuid(); last_user:=rec.user_id;
    INSERT INTO auth.sessions(id,user_id,created_at,updated_at) VALUES(sid,rec.user_id,now()-interval '1 hour',now()-interval '1 hour');
    INSERT INTO public.rak_admin_devices(user_id,session_id,device_id,label) VALUES(rec.user_id,sid,'rak-17053-'||sid::text,'Rollback-only synthetic role test');
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',rec.user_id,'session_id',sid,'role','authenticated','rak_role','owner')::text,true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    SELECT public.rak_admin_context() INTO ctx;
    IF ctx->>'role' IS DISTINCT FROM rec.role OR ctx->>'session_id' IS DISTINCT FROM sid::text THEN RAISE EXCEPTION 'FAIL real profile role/session mismatch: %',rec.role; END IF;
    owner_ok:=true;
    BEGIN PERFORM public.rak_owner_list_admin_profiles(); EXCEPTION WHEN insufficient_privilege THEN owner_ok:=false; END;
    IF owner_ok IS DISTINCT FROM (rec.role='owner') THEN RAISE EXCEPTION 'FAIL owner RPC authorization for %',rec.role; END IF;
    IF rec.role='owner' THEN
      SELECT public.rak_owner_complete_backup_v1() INTO snap;
    ELSE
      BEGIN
        PERFORM public.rak_owner_complete_backup_v1();
        RAISE EXCEPTION 'FAIL backup accessible to %',rec.role;
      EXCEPTION WHEN insufficient_privilege THEN NULL;
      END;
    END IF;
    EXECUTE 'RESET ROLE';
    checked:=checked+1;
  END LOOP;
  IF checked<>3 THEN RAISE EXCEPTION 'FAIL expected owner/admin/deputy profiles, found %',checked; END IF;
  IF snap->>'format' IS DISTINCT FROM 'rak-complete-backup-v1' THEN RAISE EXCEPTION 'FAIL backup format'; END IF;
  IF jsonb_typeof(snap #> '{data,public,rotation_state}') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'FAIL rotation missing'; END IF;
  IF jsonb_typeof(snap #> '{data,private,rak_rotation_import_metadata_v1}') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'FAIL private imports missing'; END IF;
  IF snap #> '{data,public,rak_admin_secrets}' IS NOT NULL THEN RAISE EXCEPTION 'FAIL secret table leaked'; END IF;
  IF jsonb_typeof(snap #> '{schema,functions}') IS DISTINCT FROM 'array' OR jsonb_typeof(snap #> '{schema,policies}') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'FAIL schema metadata'; END IF;
  IF jsonb_typeof(snap #> '{data,auth,users_sanitized}') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'FAIL sanitized Auth'; END IF;
  SELECT count(*) INTO imports_count FROM private.rak_rotation_import_metadata_v1;
  IF jsonb_array_length(snap #> '{data,private,rak_rotation_import_metadata_v1}') <> imports_count THEN RAISE EXCEPTION 'FAIL private import count'; END IF;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',last_user,'session_id',gen_random_uuid(),'role','authenticated','rak_role','owner')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  fake_denied:=false;
  BEGIN PERFORM public.rak_admin_context(); EXCEPTION WHEN insufficient_privilege THEN fake_denied:=true; END;
  EXECUTE 'RESET ROLE';
  IF NOT fake_denied THEN RAISE EXCEPTION 'FAIL nonexistent Auth session accepted'; END IF;
  RAISE NOTICE 'PASS: owner/admin/deputy profile gates, owner-only snapshot, private imports, redaction and forged-session denial; rolling back';
END
$rak$;
ROLLBACK;
-- Verify separately: SELECT count(*) FROM public.rak_admin_devices WHERE device_id LIKE 'rak-17053-%'; -- must be 0.
