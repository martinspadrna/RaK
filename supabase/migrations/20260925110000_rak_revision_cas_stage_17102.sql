-- RaK 1.7.102 / TEST first.
-- Revision registry + atomic read/write CAS for machine settings and rotation month entries.
-- Legacy v2 writers remain temporarily usable during staged rollout, but every v2 write
-- increments the same revision so a v3 client can still detect that its baseline became stale.

CREATE TABLE IF NOT EXISTS public.rak_write_revisions (
  resource_key text PRIMARY KEY,
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

ALTER TABLE public.rak_write_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rak_write_revisions FROM PUBLIC,anon,authenticated;

INSERT INTO public.rak_write_revisions(resource_key,revision,updated_at)
SELECT 'machine_settings',
       CASE WHEN EXISTS (SELECT 1 FROM public.machine_settings) THEN 1 ELSE 0 END,
       pg_catalog.now()
ON CONFLICT (resource_key) DO NOTHING;

INSERT INTO public.rak_write_revisions(resource_key,revision,updated_at)
SELECT 'rotation_month:' || month_start::text, 1, pg_catalog.now()
FROM public.rotation_months
ON CONFLICT (resource_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.rak_admin_load_machine_settings_v3()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_revision bigint;
  v_rows jsonb;
BEGIN
  PERFORM private.rak_require_admin(false);
  INSERT INTO public.rak_write_revisions(resource_key,revision,updated_at)
  VALUES(
    'machine_settings',
    CASE WHEN EXISTS (SELECT 1 FROM public.machine_settings) THEN 1 ELSE 0 END,
    pg_catalog.now()
  )
  ON CONFLICT (resource_key) DO NOTHING;

  SELECT revision INTO v_revision
  FROM public.rak_write_revisions
  WHERE resource_key='machine_settings'
  FOR SHARE;

  SELECT COALESCE(jsonb_agg(to_jsonb(ms) ORDER BY ms.category,ms.machine_key),'[]'::jsonb)
    INTO v_rows
  FROM public.machine_settings ms;

  RETURN jsonb_build_object('ok',true,'revision',v_revision,'rows',v_rows);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rak_admin_save_machine_settings_v3(
  p_rows jsonb,
  p_reason text DEFAULT 'admin-save',
  p_expected_revision bigint DEFAULT NULL
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
  IF p_expected_revision IS NULL OR p_expected_revision < 0 THEN
    RAISE EXCEPTION 'Machine settings revision is required'
      USING ERRCODE='40001',DETAIL='expected revision missing';
  END IF;

  INSERT INTO public.rak_write_revisions(resource_key,revision,updated_at)
  VALUES(
    'machine_settings',
    CASE WHEN EXISTS (SELECT 1 FROM public.machine_settings) THEN 1 ELSE 0 END,
    pg_catalog.now()
  )
  ON CONFLICT (resource_key) DO NOTHING;

  SELECT revision INTO v_current
  FROM public.rak_write_revisions
  WHERE resource_key='machine_settings'
  FOR UPDATE;

  IF p_expected_revision <> v_current THEN
    RAISE EXCEPTION 'Machine settings were changed on another device'
      USING ERRCODE='40001',
            DETAIL=jsonb_build_object('expected',p_expected_revision,'actual',v_current,'resource','machine_settings')::text;
  END IF;

  v_saved := private.rak_upsert_machine_settings(p_rows);
  v_next := v_current + 1;
  UPDATE public.rak_write_revisions
     SET revision=v_next,updated_at=pg_catalog.now()
   WHERE resource_key='machine_settings';

  PERFORM private.rak_write_admin_audit(
    'settings.save.cas','machine_settings','',
    jsonb_build_object('saved_count',v_saved,'reason',left(coalesce(p_reason,''),120),'revision',v_next)
  );
  RETURN jsonb_build_object('ok',true,'saved_count',v_saved,'revision',v_next,'saved_at',pg_catalog.now());
END;
$function$;

CREATE OR REPLACE FUNCTION public.rak_admin_load_rotation_month_entries_v3(p_month_start date)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_key text;
  v_revision bigint;
  v_label text;
  v_rows jsonb;
  v_initial bigint;
BEGIN
  PERFORM private.rak_require_admin(false);
  IF p_month_start IS NULL THEN
    RAISE EXCEPTION 'Invalid rotation month' USING ERRCODE='22023';
  END IF;
  v_key := 'rotation_month:' || p_month_start::text;
  v_initial := CASE WHEN EXISTS(SELECT 1 FROM public.rotation_months WHERE month_start=p_month_start) THEN 1 ELSE 0 END;

  INSERT INTO public.rak_write_revisions(resource_key,revision,updated_at)
  VALUES(v_key,v_initial,pg_catalog.now())
  ON CONFLICT (resource_key) DO NOTHING;

  SELECT revision INTO v_revision
  FROM public.rak_write_revisions
  WHERE resource_key=v_key
  FOR SHARE;

  SELECT month.label INTO v_label
  FROM public.rotation_months month
  WHERE month.month_start=p_month_start;

  SELECT COALESCE(jsonb_agg(to_jsonb(entry) ORDER BY entry.row_order,entry.employee_name),'[]'::jsonb)
    INTO v_rows
  FROM public.rotation_entries entry
  WHERE entry.month_start=p_month_start;

  RETURN jsonb_build_object(
    'ok',true,'month_start',p_month_start,'label',v_label,'revision',v_revision,'rows',v_rows
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.rak_admin_save_rotation_month_entries_v3(
  p_month_start date,
  p_label text,
  p_rows jsonb,
  p_expected_revision bigint DEFAULT NULL
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
  v_initial bigint;
BEGIN
  PERFORM private.rak_require_admin(false);
  IF p_month_start IS NULL OR jsonb_typeof(p_rows)<>'array'
     OR jsonb_array_length(p_rows)>1000 OR octet_length(p_rows::text)>2000000 THEN
    RAISE EXCEPTION 'Invalid rotation month entries' USING ERRCODE='22023';
  END IF;
  IF p_expected_revision IS NULL OR p_expected_revision < 0 THEN
    RAISE EXCEPTION 'Rotation month revision is required'
      USING ERRCODE='40001',DETAIL='expected revision missing';
  END IF;

  v_key := 'rotation_month:' || p_month_start::text;
  v_initial := CASE WHEN EXISTS(SELECT 1 FROM public.rotation_months WHERE month_start=p_month_start) THEN 1 ELSE 0 END;
  INSERT INTO public.rak_write_revisions(resource_key,revision,updated_at)
  VALUES(v_key,v_initial,pg_catalog.now())
  ON CONFLICT (resource_key) DO NOTHING;

  SELECT revision INTO v_current
  FROM public.rak_write_revisions
  WHERE resource_key=v_key
  FOR UPDATE;

  IF p_expected_revision <> v_current THEN
    RAISE EXCEPTION 'Rotation month was changed on another device'
      USING ERRCODE='40001',
            DETAIL=jsonb_build_object('expected',p_expected_revision,'actual',v_current,'resource',v_key)::text;
  END IF;

  INSERT INTO public.rotation_months(month_start,label,updated_at)
  VALUES(p_month_start,nullif(left(trim(coalesce(p_label,'')),160),''),pg_catalog.now())
  ON CONFLICT(month_start) DO UPDATE
    SET label=excluded.label,updated_at=excluded.updated_at;

  DELETE FROM public.rotation_entries WHERE month_start=p_month_start;
  FOR item IN SELECT value FROM jsonb_array_elements(p_rows)
  LOOP
    IF jsonb_typeof(item)<>'object' THEN
      RAISE EXCEPTION 'Invalid rotation month row' USING ERRCODE='22023';
    END IF;
    INSERT INTO public.rotation_entries(
      month_start,employee_name,target_machine,assignment_type,shift_code,note,row_order,updated_at
    )
    VALUES(
      p_month_start,
      left(trim(coalesce(item->>'employee_name','')),160),
      nullif(left(trim(coalesce(item->>'target_machine','')),160),''),
      left(coalesce(nullif(trim(item->>'assignment_type'),''),'work'),80),
      nullif(left(trim(coalesce(item->>'shift_code','')),40),''),
      nullif(left(trim(coalesce(item->>'note','')),1000),''),
      CASE WHEN coalesce(item->>'row_order','') ~ '^-?[0-9]{1,6}$'
        THEN (item->>'row_order')::integer ELSE inserted END,
      pg_catalog.now()
    );
    inserted := inserted + 1;
  END LOOP;

  v_next := v_current + 1;
  UPDATE public.rak_write_revisions
     SET revision=v_next,updated_at=pg_catalog.now()
   WHERE resource_key=v_key;

  PERFORM private.rak_write_admin_audit(
    'rotation.month_entries.save.cas','rotation_month',p_month_start::text,
    jsonb_build_object('inserted',inserted,'revision',v_next)
  );
  RETURN jsonb_build_object(
    'ok',true,'inserted',inserted,'month_start',p_month_start,'revision',v_next
  );
END;
$function$;

-- Staged compatibility: old v2 writers do not get CAS, but they MUST increment
-- the same revision so a simultaneously open v3 client becomes stale and fails closed.
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

REVOKE ALL ON FUNCTION public.rak_admin_load_machine_settings_v3() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.rak_admin_save_machine_settings_v3(jsonb,text,bigint) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.rak_admin_load_rotation_month_entries_v3(date) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.rak_admin_save_rotation_month_entries_v3(date,text,jsonb,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rak_admin_load_machine_settings_v3() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rak_admin_save_machine_settings_v3(jsonb,text,bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rak_admin_load_rotation_month_entries_v3(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rak_admin_save_rotation_month_entries_v3(date,text,jsonb,bigint) TO authenticated;

NOTIFY pgrst,'reload schema';
