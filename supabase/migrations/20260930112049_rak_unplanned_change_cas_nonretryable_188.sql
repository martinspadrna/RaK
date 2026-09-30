-- RaK 1.8.8: keep the final unplanned-change RPC on non-retryable application CAS errors.
-- 1.7.148 replaced the function after 1.7.138 and reintroduced SQLSTATE 40001.
DO $rak$
DECLARE
  v_signature regprocedure :=
    to_regprocedure('public.rak_admin_apply_unplanned_change_v2(text,jsonb,jsonb,bigint,uuid,text,text,text,text,jsonb)');
  v_definition text;
  v_repaired text;
BEGIN
  IF v_signature IS NULL THEN
    RAISE EXCEPTION 'rak_admin_apply_unplanned_change_v2 signature is missing';
  END IF;

  SELECT pg_get_functiondef(v_signature) INTO v_definition;

  IF position('40001' in v_definition) = 0 THEN
    IF position('P0001' in v_definition) = 0 THEN
      RAISE EXCEPTION 'rak_admin_apply_unplanned_change_v2 has neither expected CAS SQLSTATE';
    END IF;
    RETURN;
  END IF;

  v_repaired := replace(v_definition, '''40001''', '''P0001''');
  IF v_repaired = v_definition THEN
    RAISE EXCEPTION 'Failed to rewrite CAS SQLSTATE in rak_admin_apply_unplanned_change_v2';
  END IF;

  EXECUTE v_repaired;

  v_signature :=
    to_regprocedure('public.rak_admin_apply_unplanned_change_v2(text,jsonb,jsonb,bigint,uuid,text,text,text,text,jsonb)');
  SELECT pg_get_functiondef(v_signature) INTO v_definition;

  IF position('40001' in v_definition) > 0 OR position('P0001' in v_definition) = 0 THEN
    RAISE EXCEPTION 'rak_admin_apply_unplanned_change_v2 CAS SQLSTATE repair did not stick';
  END IF;
END
$rak$;

NOTIFY pgrst, 'reload schema';
