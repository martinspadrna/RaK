-- TEST Supabase migration applied as 20260923045532. Production remains unchanged.
-- Defense-in-depth: loginNumber was already hidden by recursive RLS; reject it at the public machine-settings write boundary too.
-- Reverse procedure (TEST only): restore the previous function definition from
-- 20260919153000_rak_17047_privacy_keys_machine_guard_backup_months.sql and rerun the security matrices.
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
        'osnumber','osid','loginnumber','nationalid','birthnumber','socialsecuritynumber',
        'userid','useremail','userphone','fullname','firstname','lastname','surname',
        'workers','roster','staff','employees','appaccounts','applicationaccounts']::text[]
    ) OR (nodes.depth = 32 AND pg_catalog.jsonb_typeof(nodes.value) IN ('object','array')
          AND nodes.value NOT IN ('{}'::jsonb,'[]'::jsonb))
  );
$function$;
REVOKE ALL ON FUNCTION private.rak_rotation_has_restricted_public_key(jsonb) FROM PUBLIC, anon, authenticated;
COMMENT ON FUNCTION private.rak_rotation_has_restricted_public_key(jsonb) IS
 'RaK TEST defense-in-depth: block nested contact, login, employee identifiers (including loginNumber) and secrets in public JSON; person/absence data in public rotation remains an accepted OS-only risk.';
