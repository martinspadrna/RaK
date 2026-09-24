-- RaK TEST ONLY. Keep the existing owner-only backup contract and current employee login.
-- The complete backup previously serialized every auth.users field except a blacklist.
-- Explicitly select recovery metadata so future Auth token columns cannot enter ZIP exports.
DO $migration$
DECLARE
  v_definition text;
  v_legacy text := $legacy$to_jsonb(u) - array[
      'encrypted_password',
      'confirmation_token',
      'recovery_token',
      'email_change_token_new',
      'email_change_token_current',
      'phone_change_token',
      'reauthentication_token'
    ]::text[]$legacy$;
  v_allowlisted text := $allowlisted$jsonb_build_object(
      'id', u.id,
      'aud', u.aud,
      'role', u.role,
      'email', u.email,
      'phone', u.phone,
      'email_confirmed_at', u.email_confirmed_at,
      'phone_confirmed_at', u.phone_confirmed_at,
      'confirmed_at', u.confirmed_at,
      'last_sign_in_at', u.last_sign_in_at,
      'created_at', u.created_at,
      'updated_at', u.updated_at,
      'is_anonymous', u.is_anonymous,
      'is_sso_user', u.is_sso_user,
      'banned_until', u.banned_until,
      'deleted_at', u.deleted_at,
      'raw_app_meta_data', jsonb_strip_nulls(jsonb_build_object(
        'provider', u.raw_app_meta_data -> 'provider',
        'providers', u.raw_app_meta_data -> 'providers',
        'rak_role', u.raw_app_meta_data -> 'rak_role',
        'rak_account_id', u.raw_app_meta_data -> 'rak_account_id'
      ))
    )$allowlisted$;
  v_old_exclusions text := 'auth.users encrypted_password and one-time/recovery/change tokens';
  v_new_exclusions text := 'auth.users password, verification/recovery/change tokens, arbitrary user metadata and non-allowlisted app metadata';
BEGIN
  SELECT pg_get_functiondef('public.rak_owner_complete_backup_v1()'::regprocedure)
    INTO v_definition;
  IF v_definition IS NULL OR length(v_definition) - length(replace(v_definition, v_legacy, '')) <> length(v_legacy)
     OR position(v_old_exclusions IN v_definition) = 0
     OR position('private.rak_require_admin(true)' IN v_definition) = 0
  THEN
    RAISE EXCEPTION 'Owner backup definition does not match the expected safe migration base';
  END IF;
  v_definition := replace(v_definition, v_legacy, v_allowlisted);
  v_definition := replace(v_definition, v_old_exclusions, v_new_exclusions);
  EXECUTE v_definition;
END
$migration$;

-- CREATE OR REPLACE retains existing grants; state them explicitly and verify them.
REVOKE ALL ON FUNCTION public.rak_owner_complete_backup_v1() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rak_owner_complete_backup_v1() TO authenticated, service_role;

DO $verify$
DECLARE
  v_definition text := pg_get_functiondef('public.rak_owner_complete_backup_v1()'::regprocedure);
BEGIN
  IF position('to_jsonb(u) - array' IN v_definition) > 0
     OR position('jsonb_build_object(' IN v_definition) = 0
     OR position('private.rak_require_admin(true)' IN v_definition) = 0
     OR has_function_privilege('anon', 'public.rak_owner_complete_backup_v1()', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.rak_owner_complete_backup_v1()', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'Owner backup Auth allowlist or permissions verification failed';
  END IF;
END
$verify$;

NOTIFY pgrst, 'reload schema';