-- RaK 1.7.44 / TEST Supabase only: harden accidental contact and OS-number leaks in public rotation JSON.
-- Does NOT secure names/absences/free-form prose already in public rotation; OS-only login unchanged.
CREATE OR REPLACE FUNCTION private.rak_rotation_has_restricted_public_value(p_document jsonb)
RETURNS boolean
LANGUAGE sql IMMUTABLE STRICT
SET search_path TO ''
AS $function$
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
    SELECT 1 FROM nodes
    WHERE pg_catalog.jsonb_typeof(nodes.value) = 'string'
      AND (
        (nodes.value #>> '{}') ~* '[[:alnum:]._%+-]+@[[:alnum:].-]+[.][[:alpha:]]{2,}'
        OR (nodes.value #>> '{}') ~* '(^|[^[:digit:]])([+]420|00420)[[:space:].-]*[0-9]{3}[[:space:].-]*[0-9]{3}[[:space:].-]*[0-9]{3}([^[:digit:]]|$)'
        OR (nodes.value #>> '{}') ~* '(^|[^[:alnum:]])(telefon|tel[.]?|mobil|sms|kontakt)[[:space:]:#.-]*[0-9]{3}[[:space:].-]*[0-9]{3}[[:space:].-]*[0-9]{3}([^[:digit:]]|$)'
        OR (nodes.value #>> '{}') ~* '(^|[^[:alnum:]])(osobn[íi][[:space:]]+[čc][íi]slo|os[.]?[[:space:]]*[čc][íi]slo|os[.]?[[:space:]]*[čc][.]?)[[:space:]:#=.-]*[0-9]{4,10}([^[:digit:]]|$)'
        OR (nodes.value #>> '{}') ~* '(sb_secret_[[:alnum:]_-]{10,}|bearer[[:space:]]+[[:alnum:]_.-]{16,}|eyJ[[:alnum:]_-]{20,}[.]eyJ[[:alnum:]_-]{20,}|[?&]token=[[:alnum:]_.-]{20,})'
      )
  );
$function$;
REVOKE ALL ON FUNCTION private.rak_rotation_has_restricted_public_value(jsonb) FROM PUBLIC, anon, authenticated;
COMMENT ON FUNCTION private.rak_rotation_has_restricted_public_value(jsonb) IS
  'Public rotation defensive input guard: email, correctly prefixed Czech phone, context-labelled national phone/OS number, tokens; does not hide names, absence or free text.';
COMMENT ON CONSTRAINT rak_rotation_no_public_secret_fields_v2 ON public.rotation_state IS
  'Restrict nested keys and recognizable contact, labelled OS-number and credential values. Public names, absence codes and other notes remain visible under OS-only login.';
DO $check$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.rotation_state
    WHERE private.rak_rotation_has_restricted_public_value(payload)
       OR private.rak_rotation_has_restricted_public_value(COALESCE(meta, '{}'::jsonb))
  ) THEN
    RAISE EXCEPTION 'Existing rotation violates 1.7.44 guard; rollback migration';
  END IF;
END;
$check$;
