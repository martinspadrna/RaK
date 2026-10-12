-- Forward-only reason-catalog update. LEK remains valid for already queued old clients.
DO $migration$
DECLARE
  v_definition text;
  v_old_catalog constant text := '(''D'',''NV'',''§'',''LEK'')';
  v_new_catalog constant text := '(''D'',''NV'',''§'',''LEK'',''N'')';
BEGIN
  SELECT pg_get_functiondef('public.rak_admin_apply_unplanned_change_v2(text,jsonb,jsonb,bigint,uuid,text,text,text,text,jsonb)'::regprocedure)
    INTO v_definition;
  IF position(v_new_catalog in v_definition) = 0 THEN
    IF position(v_old_catalog in v_definition) = 0 THEN
      RAISE EXCEPTION 'Unknown unplanned-change reason catalog; stop migration';
    END IF;
    EXECUTE replace(v_definition, v_old_catalog, v_new_catalog);
  END IF;
  SELECT pg_get_functiondef('public.rak_admin_apply_unplanned_change_v2(text,jsonb,jsonb,bigint,uuid,text,text,text,text,jsonb)'::regprocedure)
    INTO v_definition;
  IF position(v_new_catalog in v_definition) = 0
    OR position('40001' in v_definition) > 0
    OR position('P0001' in v_definition) = 0 THEN
    RAISE EXCEPTION 'Reason catalog or nonretryable CAS verification failed';
  END IF;
END
$migration$;
NOTIFY pgrst, 'reload schema';
