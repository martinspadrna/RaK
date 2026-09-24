-- RaK 1.7.47 / TEST Supabase only. Public rotation remains accessible until OS-only-compatible cutover.
-- Defense-in-depth: block additional explicit identifiers in new public rotation JSON.
CREATE OR REPLACE FUNCTION private.rak_rotation_has_restricted_public_key(p_document jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE STRICT SET search_path = ''
AS $function$
  WITH RECURSIVE nodes(value, depth) AS (
    SELECT p_document, 0
    UNION ALL
    SELECT child.value, nodes.depth + 1
    FROM nodes CROSS JOIN LATERAL (
      SELECT item.value FROM pg_catalog.jsonb_each(
        CASE WHEN pg_catalog.jsonb_typeof(nodes.value) = 'object' THEN nodes.value ELSE '{}'::jsonb END) item
      UNION ALL
      SELECT item.value FROM pg_catalog.jsonb_array_elements(
        CASE WHEN pg_catalog.jsonb_typeof(nodes.value) = 'array' THEN nodes.value ELSE '[]'::jsonb END) item
    ) child WHERE nodes.depth < 32
  )
  SELECT EXISTS (
    SELECT 1 FROM nodes
    CROSS JOIN LATERAL pg_catalog.jsonb_object_keys(
      CASE WHEN pg_catalog.jsonb_typeof(nodes.value) = 'object' THEN nodes.value ELSE '{}'::jsonb END
    ) candidate(field_name)
    WHERE pg_catalog.lower(pg_catalog.regexp_replace(candidate.field_name,'[^a-zA-Z0-9]','','g')) = ANY (
      ARRAY['email','emailaddress','mailaddress','phone','phonenumber','telephone','telefon','mobil','mobile',
        'address','adresa','homeaddress','postaladdress','contact','kontakt',
        'password','pwd','passcode','heslo','pin','pincode',
        'token','accesstoken','refreshtoken','jwt','secret','apikey','servicekey','privatekey',
        'session','sessionid','credentials','credential',
        'birthdate','dateofbirth','rodnecislo','medical','health','healthnote','diagnosis','diagnoza',
        'privatenote','privatecomment',
        'accountnumber','accountid','employeeid','employeenumber','personalnumber','personalid',
        'osnumber','osid','nationalid','birthnumber','socialsecuritynumber',
        'userid','useremail','userphone','fullname','firstname','lastname','surname',
        'workers','roster','staff','employees','appaccounts','applicationaccounts']::text[]
    ) OR (nodes.depth = 32 AND pg_catalog.jsonb_typeof(nodes.value) IN ('object','array')
          AND nodes.value NOT IN ('{}'::jsonb,'[]'::jsonb))
  );
$function$;
REVOKE ALL ON FUNCTION private.rak_rotation_has_restricted_public_key(jsonb) FROM PUBLIC,anon,authenticated;
COMMENT ON FUNCTION private.rak_rotation_has_restricted_public_key(jsonb) IS
 'RaK 1.7.47 defense-in-depth: block nested contact, login, employee identifiers and secrets in public JSON; person/absence data still public.';

-- The legacy machine_settings table holds both public calculator settings and private rows.
-- Preserve private data and reject NEW public settings containing restricted identifiers.
CREATE OR REPLACE FUNCTION private.rak_machine_settings_no_public_leak_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_settings jsonb := COALESCE(NEW.settings_json,'{}'::jsonb);
  v_category text := pg_catalog.lower(COALESCE(NEW.category,''));
  v_key text := pg_catalog.upper(COALESCE(NEW.machine_key,''));
  v_stored_category text := pg_catalog.lower(COALESCE(v_settings->>'stored_category',''));
  v_type text := pg_catalog.lower(COALESCE(v_settings->>'type',''));
  v_stored_key text := pg_catalog.upper(COALESCE(v_settings->>'admin_settings_key',''));
  v_private_categories text[] := ARRAY[
    'admin_accounts_settings','admin_full_settings_backup','admin_change_log',
    'rotation_save_backup','worker_roster_settings'];
BEGIN
  IF v_category = ANY(v_private_categories)
    OR v_stored_category = ANY(v_private_categories)
    OR v_type = ANY(v_private_categories)
    OR v_key IN ('ADMIN_ACCOUNTS_SETTINGS','ADMIN_CHANGE_LOG','WORKER_ROSTER_SETTINGS')
    OR v_stored_key IN ('ADMIN_ACCOUNTS_SETTINGS','ADMIN_CHANGE_LOG','WORKER_ROSTER_SETTINGS')
    OR v_key LIKE 'ADMIN_FULL_SETTINGS_BACKUP_%'
    OR v_stored_key LIKE 'ADMIN_FULL_SETTINGS_BACKUP_%'
    OR v_key LIKE 'ROTATION_SAVE_BACKUP_%'
    OR v_stored_key LIKE 'ROTATION_SAVE_BACKUP_%' THEN
    RETURN NEW; -- these categories are excluded from anonymous reads by existing restrictive RLS
  END IF;
  IF pg_catalog.jsonb_typeof(v_settings) IS DISTINCT FROM 'object'
    OR private.rak_rotation_has_restricted_public_key(v_settings)
    OR private.rak_rotation_has_restricted_public_value(v_settings) THEN
    RAISE EXCEPTION 'Public machine settings contain restricted data' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.rak_machine_settings_no_public_leak_v1() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS rak_machine_settings_no_public_leak_v1 ON public.machine_settings;
CREATE TRIGGER rak_machine_settings_no_public_leak_v1
BEFORE INSERT OR UPDATE ON public.machine_settings
FOR EACH ROW EXECUTE FUNCTION private.rak_machine_settings_no_public_leak_v1();

-- Full restore candidates must have valid internal month and note structures.
CREATE OR REPLACE FUNCTION private.rak_rotation_backup_months_shape_v1(p_payload jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE STRICT SET search_path = ''
AS $function$
  SELECT COALESCE(
    pg_catalog.jsonb_typeof(p_payload) = 'object'
    AND pg_catalog.jsonb_typeof(p_payload->'months') = 'object'
    AND p_payload->'months' <> '{}'::jsonb
    AND NOT EXISTS (
      SELECT 1 FROM pg_catalog.jsonb_each(
        CASE WHEN pg_catalog.jsonb_typeof(p_payload->'months')='object'
          THEN p_payload->'months' ELSE '{}'::jsonb END
      ) month(month_key,month_value)
      WHERE pg_catalog.jsonb_typeof(month.month_value) IS DISTINCT FROM 'object'
        OR pg_catalog.jsonb_typeof(month.month_value->'hard') IS DISTINCT FROM 'object'
        OR pg_catalog.jsonb_typeof(month.month_value->'soft') IS DISTINCT FROM 'object'
        OR pg_catalog.jsonb_typeof(month.month_value->'notes') IS DISTINCT FROM 'array'
        OR (month.month_value ? 'dayMods' AND
            pg_catalog.jsonb_typeof(month.month_value->'dayMods') NOT IN ('array','null'))
        OR EXISTS (
          SELECT 1 FROM pg_catalog.jsonb_array_elements(
            CASE WHEN pg_catalog.jsonb_typeof(month.month_value->'notes')='array'
              THEN month.month_value->'notes' ELSE '[]'::jsonb END
          ) note(item)
          WHERE pg_catalog.jsonb_typeof(note.item) IS DISTINCT FROM 'object'
            OR pg_catalog.jsonb_typeof(note.item->'date') IS DISTINCT FROM 'string'
            OR pg_catalog.jsonb_typeof(note.item->'person') IS DISTINCT FROM 'string'
            OR pg_catalog.jsonb_typeof(note.item->'code') IS DISTINCT FROM 'string'
            OR pg_catalog.jsonb_typeof(note.item->'text') IS DISTINCT FROM 'string'
            OR pg_catalog.jsonb_typeof(note.item->'shift') IS DISTINCT FROM 'string'
        )
    ),false
  );
$function$;
REVOKE ALL ON FUNCTION private.rak_rotation_backup_months_shape_v1(jsonb) FROM PUBLIC,anon,authenticated;
ALTER TABLE public.rak_rotation_backups_v2
 ADD CONSTRAINT rak_rotation_backup_months_shape_v1
 CHECK (private.rak_rotation_backup_months_shape_v1(payload) IS TRUE);
COMMENT ON CONSTRAINT rak_rotation_backup_months_shape_v1 ON public.rak_rotation_backups_v2 IS
 'RaK 1.7.47 checks hard/soft/notes/dayMods and typed note fields in each archived month; historical importMeta preserved.';
DO $verify$
BEGIN
  IF EXISTS (SELECT 1 FROM public.rak_rotation_backups_v2
      WHERE NOT private.rak_rotation_backup_months_shape_v1(payload)) THEN
    RAISE EXCEPTION 'Legacy backup failed deep shape validation';
  END IF;
  IF EXISTS (SELECT 1 FROM public.rotation_state
      WHERE private.rak_rotation_has_restricted_public_key(payload)
         OR private.rak_rotation_has_restricted_public_key(COALESCE(meta,'{}'::jsonb))) THEN
    RAISE EXCEPTION 'Existing rotation contains newly blocked keys';
  END IF;
  IF EXISTS (SELECT 1 FROM public.machine_settings m
      WHERE NOT (pg_catalog.lower(COALESCE(m.category,''))=ANY(ARRAY[
        'admin_accounts_settings','admin_full_settings_backup','admin_change_log','rotation_save_backup','worker_roster_settings'])
        OR pg_catalog.lower(COALESCE(m.settings_json->>'stored_category',''))=ANY(ARRAY[
        'admin_accounts_settings','admin_full_settings_backup','admin_change_log','rotation_save_backup','worker_roster_settings'])
        OR pg_catalog.lower(COALESCE(m.settings_json->>'type',''))=ANY(ARRAY[
        'admin_accounts_settings','admin_full_settings_backup','admin_change_log','rotation_save_backup','worker_roster_settings']))
        AND (private.rak_rotation_has_restricted_public_key(m.settings_json)
          OR private.rak_rotation_has_restricted_public_value(m.settings_json))) THEN
    RAISE EXCEPTION 'Existing public machine settings contain restricted data';
  END IF;
END;
$verify$;
