-- TEST DATABASE ONLY. OS-number-only access leaves rotation_state publicly readable.
-- This guard prevents accidental future storage of explicit contact/authentication fields.
-- It does NOT make operational schedules, names or absence codes private.
CREATE OR REPLACE FUNCTION private.rak_rotation_has_restricted_public_key(p_document jsonb)
RETURNS boolean
LANGUAGE sql IMMUTABLE STRICT
SET search_path = ''
AS $func$
  WITH RECURSIVE nodes(value, depth) AS (
    SELECT p_document, 0
    UNION ALL
    SELECT child.value, nodes.depth + 1
      FROM nodes
      CROSS JOIN LATERAL (
        SELECT item.value FROM pg_catalog.jsonb_each(
          CASE WHEN pg_catalog.jsonb_typeof(nodes.value) = 'object' THEN nodes.value ELSE '{}'::jsonb END
        ) AS item
        UNION ALL
        SELECT item.value FROM pg_catalog.jsonb_array_elements(
          CASE WHEN pg_catalog.jsonb_typeof(nodes.value) = 'array' THEN nodes.value ELSE '[]'::jsonb END
        ) AS item
      ) AS child
     WHERE nodes.depth < 32
  )
  SELECT EXISTS (
    SELECT 1
      FROM nodes
      CROSS JOIN LATERAL pg_catalog.jsonb_object_keys(
        CASE WHEN pg_catalog.jsonb_typeof(nodes.value) = 'object' THEN nodes.value ELSE '{}'::jsonb END
      ) AS candidate(field_name)
     WHERE pg_catalog.lower(pg_catalog.regexp_replace(candidate.field_name, '[^a-zA-Z0-9]', '', 'g')) = ANY (
       ARRAY['email','emailaddress','mailaddress','phone','phonenumber','telephone','telefon','mobil','mobile',
             'address','adresa','homeaddress','postaladdress','contact','kontakt',
             'password','pwd','passcode','heslo','pin','pincode',
             'token','accesstoken','refreshtoken','jwt','secret','apikey','servicekey','privatekey',
             'session','sessionid','credentials','credential',
             'birthdate','dateofbirth','rodnecislo','medical','health','healthnote','diagnosis','diagnoza',
             'privatenote','privatecomment']::text[]
     )
     OR (nodes.depth = 32 AND pg_catalog.jsonb_typeof(nodes.value) IN ('object','array')
         AND nodes.value NOT IN ('{}'::jsonb,'[]'::jsonb))
  );
$func$;
REVOKE ALL ON FUNCTION private.rak_rotation_has_restricted_public_key(jsonb) FROM PUBLIC, anon, authenticated;
ALTER TABLE public.rotation_state ADD CONSTRAINT rak_rotation_no_public_secret_fields_v1
  CHECK (payload IS NOT NULL
    AND NOT private.rak_rotation_has_restricted_public_key(payload)
    AND NOT private.rak_rotation_has_restricted_public_key(COALESCE(meta, '{}'::jsonb)));
COMMENT ON CONSTRAINT rak_rotation_no_public_secret_fields_v1 ON public.rotation_state IS
  'OS-only public rotation: reject nested explicit contact, credential or medical keys; schedule names, absences and free-text still public and require separate minimization.';