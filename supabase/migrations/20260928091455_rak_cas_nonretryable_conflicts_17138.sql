-- RaK 1.7.138: application-level CAS conflicts must not use SQLSTATE 40001.
-- Supabase/PostgREST 14 treats 40001 (serialization_failure) as transient and may
-- retry one RPC thousands of times until the HTTP request times out. Use P0001
-- instead so the existing RaK client can fail closed immediately from the message.

DO $migration$
DECLARE
  r record;
  v_def text;
  v_changed integer := 0;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.proname = ANY (ARRAY[
        'rak_admin_save_rotation_v2',
        'rak_admin_apply_unplanned_absence_v1',
        'rak_admin_apply_unplanned_change_v2',
        'rak_admin_save_machine_settings_v2',
        'rak_admin_save_machine_settings_v3',
        'rak_admin_save_rotation_month_entries_v2',
        'rak_admin_save_rotation_month_entries_v3'
      ])
  LOOP
    v_def := pg_get_functiondef(r.oid);
    IF v_def ILIKE '%40001%' THEN
      v_def := regexp_replace(
        v_def,
        'ERRCODE[[:space:]]*=[[:space:]]*''40001''',
        'ERRCODE = ''P0001''',
        'gi'
      );
      IF v_def ILIKE '%40001%' THEN
        RAISE EXCEPTION 'Unreplaced 40001 remains in %.%(%)', 'public', r.proname, r.args;
      END IF;
      EXECUTE v_def;
      v_changed := v_changed + 1;
    END IF;
  END LOOP;

  IF v_changed <> 7 THEN
    RAISE EXCEPTION 'Expected to update 7 RaK CAS functions, updated %', v_changed;
  END IF;
END
$migration$;

NOTIFY pgrst, 'reload schema';
