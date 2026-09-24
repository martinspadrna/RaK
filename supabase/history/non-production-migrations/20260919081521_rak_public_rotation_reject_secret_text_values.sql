-- TEST DATABASE ONLY. OS-number-only login and public rotation reading remain unchanged.
-- Block a narrow set of recognizable contact/credential patterns in JSON string values.
-- Names, absence codes, other free text and unrecognized formats are NOT private.
CREATE OR REPLACE FUNCTION private.rak_rotation_has_restricted_public_value(p_document jsonb)
RETURNS boolean
LANGUAGE sql IMMUTABLE STRICT
SET search_path = ''
AS $function$
  WITH RECURSIVE nodes(value, depth) AS (
    SELECT p_document, 0
    UNION ALL
    SELECT child.value, nodes.depth + 1
    FROM nodes
    CROSS JOIN LATERAL (
      SELECT item.value
        FROM pg_catalog.jsonb_each(CASE WHEN pg_catalog.jsonb_typeof(nodes.value) = 'object' THEN nodes.value ELSE '{}'::jsonb END) AS item
      UNION ALL
      SELECT item.value
        FROM pg_catalog.jsonb_array_elements(CASE WHEN pg_catalog.jsonb_typeof(nodes.value) = 'array' THEN nodes.value ELSE '[]'::jsonb END) AS item
    ) AS child
    WHERE nodes.depth < 32
  )
  SELECT EXISTS (
    SELECT 1 FROM nodes
    WHERE pg_catalog.jsonb_typeof(nodes.value) = 'string'
      AND (
        (nodes.value #>> '{}') ~* '[[:alnum:]._%+\-]+@[[:alnum:].\-]+[.][[:alpha:]]{2,}'
        OR (nodes.value #>> '{}') ~* '([+]420|00420)[[:space:].-]*[0-9]{3}[[:space:].-]*[0-9]{3}[[:space:].-]*[0-9]{3}([^0-9]|$)'
        OR (nodes.value #>> '{}') ~* '(sb_secret_[[:alnum:]_-]{10,}|bearer[[:space:]]+[[:alnum:]_.-]{16,}|eyJ[[:alnum:]_-]{20,}[.]eyJ[[:alnum:]_-]{20,}|[?&]token=[[:alnum:]_.-]{20,})'
      )
  );
$function$;
REVOKE ALL ON FUNCTION private.rak_rotation_has_restricted_public_value(jsonb) FROM PUBLIC, anon, authenticated;
ALTER TABLE public.rotation_state DROP CONSTRAINT rak_rotation_no_public_secret_fields_v1;
ALTER TABLE public.rotation_state ADD CONSTRAINT rak_rotation_no_public_secret_fields_v2
  CHECK (payload IS NOT NULL
    AND NOT private.rak_rotation_has_restricted_public_key(payload)
    AND NOT private.rak_rotation_has_restricted_public_key(COALESCE(meta, '{}'::jsonb))
    AND NOT private.rak_rotation_has_restricted_public_value(payload)
    AND NOT private.rak_rotation_has_restricted_public_value(COALESCE(meta, '{}'::jsonb)));
COMMENT ON CONSTRAINT rak_rotation_no_public_secret_fields_v2 ON public.rotation_state IS
  'OS-only public rotation: block restricted JSON keys plus recognizable email, Czech phone and token text patterns. Names, absence codes, free text and other formats remain public; not an authentication control.';
