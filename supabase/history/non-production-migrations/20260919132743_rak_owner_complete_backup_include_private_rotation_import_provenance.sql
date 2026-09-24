-- RaK 1.7.42. TEST DATABASE ONLY.
-- Preserve the existing owner-only snapshot format and all existing grants.
-- The private Excel import archive must be recoverable from a complete owner backup.
DO $patch$
DECLARE
  original text;
  anchor text := E'      ''public'', v_public_data,\n      ''auth'', jsonb_build_object(';
  replacement text := E'      ''public'', v_public_data,\n      ''private'', jsonb_build_object(\n        ''rak_rotation_import_metadata_v1'', (select coalesce(jsonb_agg(to_jsonb(t) order by t.rotation_key, t.month_key), ''[]''::jsonb) from private.rak_rotation_import_metadata_v1 t)\n      ),\n      ''auth'', jsonb_build_object(';
BEGIN
  original := pg_get_functiondef('public.rak_owner_complete_backup_v1()'::regprocedure);
  IF original IS NULL OR position('perform private.rak_require_admin(true);' IN original) = 0 THEN
    RAISE EXCEPTION 'Owner guard missing: refusing backup patch';
  END IF;
  IF position(replacement IN original) > 0 THEN RETURN; END IF;
  IF position(anchor IN original) = 0 OR position(anchor IN substring(original FROM position(anchor IN original) + length(anchor))) > 0 THEN
    RAISE EXCEPTION 'Unexpected backup layout: refusing patch';
  END IF;
  EXECUTE replace(original, anchor, replacement);
END;
$patch$;
COMMENT ON FUNCTION public.rak_owner_complete_backup_v1() IS
  'Owner-only redacted complete snapshot; includes private Excel import provenance (not login salts, sessions or passwords).';
