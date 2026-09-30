-- RaK 1.7.99 / TEST first.
-- Optional bug-report screenshot stored outside the report row in a private-by-RLS public table.
-- No public Storage bucket is created. Existing v2 report submission remains a rollback path.

ALTER TABLE public.bug_reports
  ADD COLUMN IF NOT EXISTS has_screenshot boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.bug_report_attachments (
  report_id uuid PRIMARY KEY REFERENCES public.bug_reports(id) ON DELETE CASCADE,
  mime_type text NOT NULL,
  content_bytes bytea NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  CONSTRAINT bug_report_attachment_mime_v1 CHECK (mime_type IN ('image/jpeg','image/png','image/webp')),
  CONSTRAINT bug_report_attachment_size_v1 CHECK (pg_catalog.octet_length(content_bytes) BETWEEN 1 AND 750000),
  CONSTRAINT bug_report_attachment_width_v1 CHECK (width BETWEEN 1 AND 1600),
  CONSTRAINT bug_report_attachment_height_v1 CHECK (height BETWEEN 1 AND 1600)
);

ALTER TABLE public.bug_report_attachments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.bug_report_attachments FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.rak_submit_bug_report_v3(
  p_account_number text,
  p_player_name text,
  p_report_type text,
  p_message text,
  p_app_version text DEFAULT NULL,
  p_route text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_device_info jsonb DEFAULT '{}'::jsonb,
  p_screenshot_base64 text DEFAULT NULL,
  p_screenshot_mime text DEFAULT NULL,
  p_screenshot_width integer DEFAULT NULL,
  p_screenshot_height integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_base64 text := NULLIF(pg_catalog.btrim(COALESCE(p_screenshot_base64,'')),'');
  v_mime text := NULLIF(pg_catalog.lower(pg_catalog.btrim(COALESCE(p_screenshot_mime,''))),'');
  v_bytes bytea;
  v_result jsonb;
  v_report_id uuid;
  v_has_screenshot boolean := false;
  v_prefix text;
  v_webp_tag text;
BEGIN
  IF v_base64 IS NULL THEN
    IF v_mime IS NOT NULL OR p_screenshot_width IS NOT NULL OR p_screenshot_height IS NOT NULL THEN
      RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='invalid_screenshot_metadata';
    END IF;
  ELSE
    IF v_mime NOT IN ('image/jpeg','image/png','image/webp')
       OR p_screenshot_width IS NULL OR p_screenshot_height IS NULL
       OR p_screenshot_width NOT BETWEEN 1 AND 1600
       OR p_screenshot_height NOT BETWEEN 1 AND 1600
       OR pg_catalog.char_length(v_base64) > 1000000
    THEN
      RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='invalid_screenshot';
    END IF;
    BEGIN
      v_bytes := pg_catalog.decode(v_base64,'base64');
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='invalid_screenshot_base64';
    END;
    IF pg_catalog.octet_length(v_bytes) NOT BETWEEN 1 AND 750000 THEN
      RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='screenshot_too_large';
    END IF;

    v_prefix := pg_catalog.encode(pg_catalog.substring(v_bytes,1,8),'hex');
    v_webp_tag := CASE WHEN pg_catalog.octet_length(v_bytes) >= 12
      THEN pg_catalog.encode(pg_catalog.substring(v_bytes,9,4),'hex')
      ELSE '' END;
    IF (v_mime='image/jpeg' AND pg_catalog.left(v_prefix,6)<>'ffd8ff')
       OR (v_mime='image/png' AND v_prefix<>'89504e470d0a1a0a')
       OR (v_mime='image/webp' AND (pg_catalog.left(v_prefix,8)<>'52494646' OR v_webp_tag<>'57454250'))
    THEN
      RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='screenshot_mime_mismatch';
    END IF;
    v_has_screenshot := true;
  END IF;

  v_result := public.rak_submit_bug_report_v2(
    p_account_number,p_player_name,p_report_type,p_message,p_app_version,p_route,p_user_agent,p_device_info
  );

  IF COALESCE((v_result->>'duplicate')::boolean,false) THEN
    RETURN v_result || pg_catalog.jsonb_build_object('has_screenshot',false);
  END IF;

  v_report_id := NULLIF(v_result->>'id','')::uuid;
  IF v_report_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='bug_report_id_missing';
  END IF;

  IF v_has_screenshot THEN
    INSERT INTO public.bug_report_attachments(report_id,mime_type,content_bytes,width,height)
    VALUES(v_report_id,v_mime,v_bytes,p_screenshot_width,p_screenshot_height);
    UPDATE public.bug_reports SET has_screenshot=true WHERE id=v_report_id;
  END IF;

  RETURN v_result || pg_catalog.jsonb_build_object('has_screenshot',v_has_screenshot);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rak_admin_get_bug_report_screenshot_v3(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_row public.bug_report_attachments%ROWTYPE;
BEGIN
  PERFORM private.rak_require_admin(false);
  SELECT * INTO v_row
  FROM public.bug_report_attachments
  WHERE report_id=p_id;

  IF v_row.report_id IS NULL THEN
    RETURN pg_catalog.jsonb_build_object('ok',true,'found',false,'id',p_id);
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'ok',true,
    'found',true,
    'id',v_row.report_id,
    'mime_type',v_row.mime_type,
    'width',v_row.width,
    'height',v_row.height,
    'byte_size',pg_catalog.octet_length(v_row.content_bytes),
    'base64',pg_catalog.encode(v_row.content_bytes,'base64')
  );
END;
$function$;

-- Old admin clients keep their v2 delete RPC, but deletion now purges screenshot bytes too.
CREATE OR REPLACE FUNCTION public.rak_admin_delete_bug_report_v2(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  saved public.bug_reports%ROWTYPE;
BEGIN
  PERFORM private.rak_require_admin(false);
  UPDATE public.bug_reports
  SET status='ignored',handled_at=pg_catalog.now(),handled_note='__rak_deleted__',has_screenshot=false
  WHERE id=p_id
  RETURNING * INTO saved;
  IF saved.id IS NULL THEN
    RAISE EXCEPTION 'Report not found' USING ERRCODE='P0002';
  END IF;
  DELETE FROM public.bug_report_attachments WHERE report_id=p_id;
  PERFORM private.rak_write_admin_audit('report.delete','bug_report',saved.id::text,'{}'::jsonb);
  RETURN pg_catalog.jsonb_build_object('ok',true,'id',saved.id,'soft_deleted',true);
END;
$function$;

REVOKE ALL ON FUNCTION public.rak_submit_bug_report_v3(
  text,text,text,text,text,text,text,jsonb,text,text,integer,integer
) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.rak_admin_get_bug_report_screenshot_v3(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rak_submit_bug_report_v3(
  text,text,text,text,text,text,text,jsonb,text,text,integer,integer
) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rak_admin_get_bug_report_screenshot_v3(uuid) TO authenticated;

COMMENT ON TABLE public.bug_report_attachments IS
 'RaK 1.7.99 optional screenshots; direct anon/auth access denied, max 750 kB after client-side metadata-stripping re-encode.';
COMMENT ON FUNCTION public.rak_submit_bug_report_v3(
  text,text,text,text,text,text,text,jsonb,text,text,integer,integer
) IS 'RaK 1.7.99 bounded optional screenshot insert; v2 report RPC remains rollback path.';
COMMENT ON FUNCTION public.rak_admin_get_bug_report_screenshot_v3(uuid) IS
 'RaK 1.7.99 admin-only screenshot readback; report list never carries image bytes.';

NOTIFY pgrst,'reload schema';
