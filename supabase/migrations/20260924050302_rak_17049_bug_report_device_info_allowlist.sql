-- RaK 1.7.49. TEST Supabase only. Employee login remains OS-number only.
-- Public bug reports continue to accept legitimate messages, with bounded/deduplicated submission.
CREATE OR REPLACE FUNCTION private.rak_bug_report_device_info_allowlist_v1(p_info jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = ''
AS $function$
DECLARE
  v_info jsonb := COALESCE(p_info, '{}'::jsonb);
  v_viewport jsonb;
  v_safe_viewport jsonb;
  v_safe jsonb;
BEGIN
  IF pg_catalog.jsonb_typeof(v_info) IS DISTINCT FROM 'object'
     OR pg_catalog.octet_length(v_info::text) > 12000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_device_info';
  END IF;
  v_viewport := CASE WHEN pg_catalog.jsonb_typeof(v_info->'viewport') = 'object'
    THEN v_info->'viewport' ELSE '{}'::jsonb END;
  v_safe_viewport := pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
    'width', CASE WHEN pg_catalog.jsonb_typeof(v_viewport->'width') = 'number' THEN v_viewport->'width' END,
    'height', CASE WHEN pg_catalog.jsonb_typeof(v_viewport->'height') = 'number' THEN v_viewport->'height' END,
    'dpr', CASE WHEN pg_catalog.jsonb_typeof(v_viewport->'dpr') = 'number' THEN v_viewport->'dpr' END
  ));
  v_safe := pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
    'sourceId', CASE WHEN pg_catalog.jsonb_typeof(v_info->'sourceId') = 'string'
      THEN pg_catalog.left(v_info->>'sourceId',120) END,
    'appearanceId', CASE WHEN pg_catalog.jsonb_typeof(v_info->'appearanceId') = 'string'
      THEN pg_catalog.left(v_info->>'appearanceId',80) END,
    'appearance', CASE WHEN pg_catalog.jsonb_typeof(v_info->'appearance') = 'string'
      THEN pg_catalog.left(v_info->>'appearance',80) END,
    'appearanceLabel', CASE WHEN pg_catalog.jsonb_typeof(v_info->'appearanceLabel') = 'string'
      THEN pg_catalog.left(v_info->>'appearanceLabel',120) END,
    'createdAtLocal', CASE WHEN pg_catalog.jsonb_typeof(v_info->'createdAtLocal') = 'string'
      THEN pg_catalog.left(v_info->>'createdAtLocal',64) END,
    'online', CASE WHEN pg_catalog.jsonb_typeof(v_info->'online') = 'boolean'
      THEN v_info->'online' END
  ));
  IF v_safe_viewport <> '{}'::jsonb THEN
    v_safe := v_safe || pg_catalog.jsonb_build_object('viewport',v_safe_viewport);
  END IF;
  IF pg_catalog.octet_length(v_safe::text) > 2048 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'device_info_too_large';
  END IF;
  RETURN v_safe;
END;
$function$;
REVOKE ALL ON FUNCTION private.rak_bug_report_device_info_allowlist_v1(jsonb) FROM PUBLIC,anon,authenticated;
COMMENT ON FUNCTION private.rak_bug_report_device_info_allowlist_v1(jsonb) IS
 'RaK 1.7.49: device presentation/source/viewport allowlist; unknown identifiers and nested keys never persist.';

CREATE OR REPLACE FUNCTION private.rak_bug_report_device_info_guard_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $function$
BEGIN
  NEW.device_info := private.rak_bug_report_device_info_allowlist_v1(NEW.device_info);
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.rak_bug_report_device_info_guard_v1() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS rak_bug_report_device_info_guard_v1 ON public.bug_reports;
CREATE TRIGGER rak_bug_report_device_info_guard_v1
BEFORE INSERT OR UPDATE ON public.bug_reports
FOR EACH ROW EXECUTE FUNCTION private.rak_bug_report_device_info_guard_v1();
;
