DO $guard$
DECLARE v_definition text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_definition
  FROM pg_constraint
  WHERE conrelid = 'public.rak_admin_profiles'::regclass
    AND conname = 'rak_admin_profiles_role_check';
  IF v_definition IS DISTINCT FROM
     'CHECK ((role = ANY (ARRAY[''owner''::text, ''admin''::text])))' THEN
    RAISE EXCEPTION 'Unexpected production admin role baseline';
  END IF;
  IF EXISTS (SELECT 1 FROM public.rak_admin_profiles
             WHERE role NOT IN ('owner','admin')) THEN
    RAISE EXCEPTION 'Unexpected production admin role data';
  END IF;
END
$guard$;
ALTER TABLE public.rak_admin_profiles
  DROP CONSTRAINT rak_admin_profiles_role_check;
ALTER TABLE public.rak_admin_profiles
  ADD CONSTRAINT rak_admin_profiles_role_check
  CHECK (role IN ('owner','admin','deputy'));;
