-- RaK 1.7.102 post-green TEST cutover.
-- After the v3 client is deployed, legacy v2 mutation endpoints must no longer
-- bypass expected-revision CAS. They remain present only as an explicit upgrade-required failure.

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
BEGIN
  PERFORM private.rak_require_admin(false);
  RAISE EXCEPTION 'Revision-aware RaK client required'
    USING ERRCODE='40001',DETAIL='legacy machine settings writer disabled by RaK 1.7.102';
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
BEGIN
  PERFORM private.rak_require_admin(false);
  RAISE EXCEPTION 'Revision-aware RaK client required'
    USING ERRCODE='40001',DETAIL='legacy rotation month writer disabled by RaK 1.7.102';
END;
$function$;

REVOKE ALL ON FUNCTION public.rak_admin_save_machine_settings_v2(jsonb,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.rak_admin_save_rotation_month_entries_v2(date,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rak_admin_save_machine_settings_v2(jsonb,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rak_admin_save_rotation_month_entries_v2(date,text,jsonb) TO authenticated;

NOTIFY pgrst,'reload schema';
