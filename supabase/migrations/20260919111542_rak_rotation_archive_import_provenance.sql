-- RaK 1.7.40. TEST Supabase ONLY. Preserve imported source metadata privately;
-- leave all rotation months, assignments, absence codes/notes and day changes intact.
CREATE TABLE private.rak_rotation_import_metadata_v1 (
  rotation_key text NOT NULL,
  month_key text NOT NULL,
  import_metadata jsonb NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (rotation_key, month_key)
);
REVOKE ALL ON TABLE private.rak_rotation_import_metadata_v1 FROM PUBLIC, anon, authenticated;
ALTER TABLE private.rak_rotation_import_metadata_v1 ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION private.rak_rotation_archive_import_metadata_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $fn$
DECLARE
  clean_months jsonb;
BEGIN
  IF jsonb_typeof(NEW.payload->'months') IS DISTINCT FROM 'object' THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_each(NEW.payload->'months') AS month(key, value)
    WHERE jsonb_typeof(month.value) = 'object' AND month.value ? 'importMeta'
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO private.rak_rotation_import_metadata_v1 AS archive (rotation_key, month_key, import_metadata)
  SELECT NEW.key, month.key, month.value->'importMeta'
  FROM jsonb_each(NEW.payload->'months') AS month(key, value)
  WHERE jsonb_typeof(month.value) = 'object' AND month.value ? 'importMeta'
  ON CONFLICT (rotation_key, month_key) DO UPDATE
    SET import_metadata = EXCLUDED.import_metadata,
        archived_at = now()
    WHERE archive.import_metadata IS DISTINCT FROM EXCLUDED.import_metadata;

  SELECT jsonb_object_agg(month.key,
    CASE WHEN jsonb_typeof(month.value) = 'object'
      THEN month.value - 'importMeta' ELSE month.value END)
    INTO clean_months
  FROM jsonb_each(NEW.payload->'months') AS month(key, value);
  NEW.payload := jsonb_set(NEW.payload, '{months}', coalesce(clean_months, '{}'::jsonb), false);
  RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION private.rak_rotation_archive_import_metadata_v1() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER rak_rotation_archive_import_metadata_v1
BEFORE INSERT OR UPDATE ON public.rotation_state
FOR EACH ROW EXECUTE FUNCTION private.rak_rotation_archive_import_metadata_v1();

-- The trigger archives every original importMeta before stripping it. No revision,
-- updated_at, author audit, backups or other month contents are changed.
UPDATE public.rotation_state AS state SET payload = state.payload
WHERE jsonb_typeof(state.payload->'months') = 'object'
  AND EXISTS (
    SELECT 1 FROM jsonb_each(state.payload->'months') AS month(key, value)
    WHERE jsonb_typeof(month.value) = 'object' AND month.value ? 'importMeta'
  );

-- Currently unused top-level identity column must never accidentally expose names.
ALTER TABLE public.rotation_state
  ADD CONSTRAINT rak_rotation_no_public_current_employee_name_v1
  CHECK (current_employee_name IS NULL);
ALTER TABLE public.rotation_state
  ADD CONSTRAINT rak_rotation_no_public_import_metadata_v1
  CHECK (NOT jsonb_path_exists(payload, '$.months.*.importMeta'));
COMMENT ON TABLE private.rak_rotation_import_metadata_v1 IS
  'Private Excel import provenance; never grant employee/anonymous API access.';
