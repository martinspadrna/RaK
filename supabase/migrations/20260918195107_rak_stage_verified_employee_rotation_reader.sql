-- RaK TEST ONLY. This stages an authenticated rotation reader; it does NOT close the
-- existing anonymous rotation SELECT or change the current employee login flow.
-- Employee Auth identities must be provisioned by an owner in a later cutover.
CREATE TABLE IF NOT EXISTS private.rak_employee_auth_links (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_number text NOT NULL UNIQUE REFERENCES public.game_accounts(account_number)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT rak_employee_auth_links_account_format CHECK (account_number ~ '^[0-9]{4,12}$')
);
ALTER TABLE private.rak_employee_auth_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.rak_employee_auth_links FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.rak_can_read_rotations()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND private.rak_current_session_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM auth.sessions AS s
      WHERE s.id = private.rak_current_session_id()
        AND s.user_id = (SELECT auth.uid())
    )
    AND (
      COALESCE(private.rak_current_admin_role() IN ('owner','admin','deputy'), false)
      OR EXISTS (
        SELECT 1
        FROM private.rak_employee_auth_links AS link
        JOIN auth.users AS worker ON worker.id = link.user_id
        WHERE link.user_id = (SELECT auth.uid())
          AND link.enabled
          AND worker.raw_app_meta_data ->> 'rak_role' = 'employee'
          AND worker.raw_app_meta_data ->> 'rak_account_id' = link.account_number
          AND worker.email = link.account_number || '@worker.rak.local'
          AND NOT EXISTS (
            SELECT 1 FROM public.rak_admin_profiles AS profile
            WHERE profile.user_id = link.user_id
          )
      )
    )
$function$;
REVOKE ALL ON FUNCTION private.rak_can_read_rotations() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.rak_read_rotation_v1()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  v_row public.rotation_state%ROWTYPE;
BEGIN
  IF NOT COALESCE(private.rak_can_read_rotations(), false) THEN
    RAISE EXCEPTION 'Verified RaK session required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_row FROM public.rotation_state WHERE key = 'main' LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN pg_catalog.to_jsonb(v_row);
END;
$function$;
REVOKE ALL ON FUNCTION public.rak_read_rotation_v1() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rak_read_rotation_v1() TO authenticated;

DO $guard$
BEGIN
  IF has_function_privilege('anon', 'public.rak_read_rotation_v1()', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.rak_read_rotation_v1()', 'EXECUTE')
     OR has_table_privilege('anon', 'private.rak_employee_auth_links', 'SELECT')
     OR has_table_privilege('authenticated', 'private.rak_employee_auth_links', 'INSERT')
  THEN RAISE EXCEPTION 'Employee rotation read privilege gate failed'; END IF;
END $guard$;
