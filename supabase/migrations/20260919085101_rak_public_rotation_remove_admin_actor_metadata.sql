-- TEST SUPABASE ONLY. Public rotation must not expose the administrator account identifier.
-- Authenticated administrative save RPC continues to write an audit event and private backups.
CREATE OR REPLACE FUNCTION private.rak_rotation_strip_public_actor_meta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $func$
BEGIN
  IF NEW.meta IS NOT NULL AND NEW.meta ? 'savedBy' THEN
    NEW.meta := NEW.meta - 'savedBy';
  END IF;
  RETURN NEW;
END;
$func$;
REVOKE ALL ON FUNCTION private.rak_rotation_strip_public_actor_meta() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER rak_rotation_strip_public_actor_meta_v1
BEFORE INSERT OR UPDATE ON public.rotation_state
FOR EACH ROW EXECUTE FUNCTION private.rak_rotation_strip_public_actor_meta();
UPDATE public.rotation_state
SET meta = meta - 'savedBy'
WHERE meta ? 'savedBy';
ALTER TABLE public.rotation_state
ADD CONSTRAINT rak_rotation_no_public_actor_meta_v1
CHECK (NOT (coalesce(meta, '{}'::jsonb) ? 'savedBy'));
COMMENT ON CONSTRAINT rak_rotation_no_public_actor_meta_v1 ON public.rotation_state IS
  'Public OS-only schedule does not expose the saving administrator account identifier; private audit and backups retain authorship.';