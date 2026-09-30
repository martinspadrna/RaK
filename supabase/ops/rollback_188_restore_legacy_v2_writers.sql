-- RaK 1.8.8 production rollback helper.
-- Use ONLY if the production frontend is rolled back to a pre-CAS client after the 1.7.102 cutover.
-- This intentionally restores the revision-tracking legacy v2 writers from the 1.7.102 stage migration.
-- It does not drop any new tables, functions, migrations, or user data.

DO $preflight$
BEGIN
  IF to_regclass('public.rak_write_revisions') IS NULL THEN
    RAISE EXCEPTION 'Rollback precondition missing: public.rak_write_revisions';
  END IF;
  IF to_regprocedure('private.rak_require_admin(boolean)') IS NULL THEN
    RAISE EXCEPTION 'Rollback precondition missing: private.rak_require_admin(boolean)';
  END IF;
  IF to_regprocedure('private.rak_upsert_machine_settings(jsonb)') IS NULL THEN
    RAISE EXCEPTION 'Rollback precondition missing: private.rak_upsert_machine_settings(jsonb)';
  END IF;
  IF to_regprocedure('private.rak_write_admin_audit(text,text,text,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'Rollback precondition missing: private.rak_write_admin_audit(text,text,text,jsonb)';
  END IF;
END
$preflight$;

CREATE OR REPLACE FUNCTION public.rak_admin_save_machine_settings_v2(
  p_rows jsonb,
  p_reason text DEFAULT 'admin-save'
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_current bigint;
  v_next bigint;
  v_saved integer;
BEGIN
  PERFORM private.rak_require_admin(false);
  INSERT INTO public.rak_write_revisions(resource_key,revision,updated_at)
  VALUES('machine_settings',CASE WHEN EXISTS(SELECT 1 FROM public.machine_settings) THEN 1 ELSE 0 END,pg_catalog.now())
  ON CONFLICT(resource_key) DO NOTHING;
  SELECT revision INTO v_current FROM public.rak_write_revisions WHERE resource_key='machine_settings' FOR UPDATE;
  v_saved := private.rak_upsert_machine_settings(p_rows);
  v_next := v_current + 1;
  UPDATE public.rak_write_revisions SET revision=v_next,updated_at=pg_catalog.now() WHERE resource_key='machine_settings';
  PERFORM private.rak_write_admin_audit(
    'settings.save.legacy_v2','machine_settings','',
    jsonb_build_object('saved_count',v_saved,'reason',left(coalesce(p_reason,''),120),'revision',v_next)
  );
  RETURN jsonb_build_object('ok',true,'saved_count',v_saved,'revision',v_next,'legacy_v2',true,'saved_at',pg_catalog.now());
END;
$function$;

CREATE OR REPLACE FUNCTION public.rak_admin_save_rotation_month_entries_v2(
  p_month_start date,
  p_label text,
  p_rows jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_key text;
  v_current bigint;
  v_next bigint;
  item jsonb;
  inserted integer := 0;
BEGIN
  PERFORM private.rak_require_admin(false);
  IF p_month_start IS NULL OR jsonb_typeof(p_rows)<>'array'
     OR jsonb_array_length(p_rows)>1000 OR octet_length(p_rows::text)>2000000 THEN
    RAISE EXCEPTION 'Invalid rotation month entries' USING ERRCODE='22023';
  END IF;
  v_key := 'rotation_month:' || p_month_start::text;
  INSERT INTO public.rak_write_revisions(resource_key,revision,updated_at)
  VALUES(v_key,CASE WHEN EXISTS(SELECT 1 FROM public.rotation_months WHERE month_start=p_month_start) THEN 1 ELSE 0 END,pg_catalog.now())
  ON CONFLICT(resource_key) DO NOTHING;
  SELECT revision INTO v_current FROM public.rak_write_revisions WHERE resource_key=v_key FOR UPDATE;

  INSERT INTO public.rotation_months(month_start,label,updated_at)
  VALUES(p_month_start,nullif(left(trim(coalesce(p_label,'')),160),''),pg_catalog.now())
  ON CONFLICT(month_start) DO UPDATE SET label=excluded.label,updated_at=excluded.updated_at;
  DELETE FROM public.rotation_entries WHERE month_start=p_month_start;
  FOR item IN SELECT value FROM jsonb_array_elements(p_rows)
  LOOP
    IF jsonb_typeof(item)<>'object' THEN RAISE EXCEPTION 'Invalid rotation month row' USING ERRCODE='22023'; END IF;
    INSERT INTO public.rotation_entries(month_start,employee_name,target_machine,assignment_type,shift_code,note,row_order,updated_at)
    VALUES(
      p_month_start,left(trim(coalesce(item->>'employee_name','')),160),
      nullif(left(trim(coalesce(item->>'target_machine','')),160),''),
      left(coalesce(nullif(trim(item->>'assignment_type'),''),'work'),80),
      nullif(left(trim(coalesce(item->>'shift_code','')),40),''),
      nullif(left(trim(coalesce(item->>'note','')),1000),''),
      CASE WHEN coalesce(item->>'row_order','') ~ '^-?[0-9]{1,6}$' THEN (item->>'row_order')::integer ELSE inserted END,
      pg_catalog.now()
    );
    inserted:=inserted+1;
  END LOOP;
  v_next:=v_current+1;
  UPDATE public.rak_write_revisions SET revision=v_next,updated_at=pg_catalog.now() WHERE resource_key=v_key;
  PERFORM private.rak_write_admin_audit(
    'rotation.month_entries.save.legacy_v2','rotation_month',p_month_start::text,
    jsonb_build_object('inserted',inserted,'revision',v_next)
  );
  RETURN jsonb_build_object('ok',true,'inserted',inserted,'month_start',p_month_start,'revision',v_next,'legacy_v2',true);
END;
$function$;

REVOKE ALL ON FUNCTION public.rak_admin_save_machine_settings_v2(jsonb,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.rak_admin_save_rotation_month_entries_v2(date,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rak_admin_save_machine_settings_v2(jsonb,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rak_admin_save_rotation_month_entries_v2(date,text,jsonb) TO authenticated;

DO $postcheck$
DECLARE
  v_machine text;
  v_month text;
BEGIN
  SELECT pg_get_functiondef('public.rak_admin_save_machine_settings_v2(jsonb,text)'::regprocedure) INTO v_machine;
  SELECT pg_get_functiondef('public.rak_admin_save_rotation_month_entries_v2(date,text,jsonb)'::regprocedure) INTO v_month;
  IF position('legacy_v2' in v_machine)=0 OR position('Revision-aware RaK client required' in v_machine)>0 THEN
    RAISE EXCEPTION 'Machine settings v2 rollback verification failed';
  END IF;
  IF position('legacy_v2' in v_month)=0 OR position('Revision-aware RaK client required' in v_month)>0 THEN
    RAISE EXCEPTION 'Rotation month v2 rollback verification failed';
  END IF;
  IF NOT has_function_privilege('authenticated','public.rak_admin_save_machine_settings_v2(jsonb,text)','EXECUTE')
     OR NOT has_function_privilege('authenticated','public.rak_admin_save_rotation_month_entries_v2(date,text,jsonb)','EXECUTE') THEN
    RAISE EXCEPTION 'Legacy v2 rollback grants are incomplete';
  END IF;
END
$postcheck$;

NOTIFY pgrst,'reload schema';
