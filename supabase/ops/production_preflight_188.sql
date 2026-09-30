-- RaK 1.8.8 production preflight (READ ONLY).
-- Run immediately before an approved production rollout.
-- This file intentionally never selects Vault secret values.

SELECT
  'migration_head' AS check_name,
  COALESCE(MAX(version),'') AS observed,
  '20260924105811' AS expected,
  COALESCE(MAX(version),'') = '20260924105811' AS ok
FROM supabase_migrations.schema_migrations;

WITH required(name) AS (
  VALUES
    ('public.game_accounts'),
    ('public.bug_reports'),
    ('public.machine_settings'),
    ('public.rotation_state'),
    ('public.rotation_months'),
    ('public.rotation_entries'),
    ('public.rak_admin_secrets'),
    ('private.rak_rotation_import_metadata_v1')
)
SELECT
  'relation' AS check_type,
  name,
  to_regclass(name) IS NOT NULL AS ok
FROM required
ORDER BY name;

WITH required(signature) AS (
  VALUES
    ('private.rak_require_admin(boolean)'),
    ('private.rak_upsert_machine_settings(jsonb)'),
    ('private.rak_write_admin_audit(text,text,text,jsonb)'),
    ('public.rak_admin_save_machine_settings_v2(jsonb,text)'),
    ('public.rak_admin_save_rotation_month_entries_v2(date,text,jsonb)'),
    ('public.rak_admin_save_rotation_v2(text,jsonb,jsonb,bigint)'),
    ('public.rak_lookup_account_for_login_v2(text)'),
    ('public.rak_submit_bug_report_v2(text,text,text,text,text,text,text,jsonb)'),
    ('public.rak_owner_complete_backup_v1()')
)
SELECT
  'function' AS check_type,
  signature,
  to_regprocedure(signature) IS NOT NULL AS ok
FROM required
ORDER BY signature;

SELECT
  'http_extension' AS check_type,
  name,
  default_version,
  installed_version,
  installed_version IS NOT NULL AS installed
FROM pg_available_extensions
WHERE name='http';

WITH required_secret(name) AS (
  VALUES
    ('rak_calendar_kalirna_a_ics'),
    ('rak_calendar_kalirna_b_ics'),
    ('rak_calendar_kalirna_c_ics'),
    ('rak_calendar_kalirna_d_ics')
)
SELECT
  'vault_secret_name' AS check_type,
  r.name,
  EXISTS (
    SELECT 1
    FROM vault.decrypted_secrets s
    WHERE s.name=r.name
  ) AS present
FROM required_secret r
ORDER BY r.name;

SELECT
  'legacy_frontend_writer' AS check_type,
  p.proname,
  pg_get_function_identity_arguments(p.oid) AS args,
  position('Revision-aware RaK client required' in pg_get_functiondef(p.oid)) = 0 AS still_compatible_with_1_7_83
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN ('rak_admin_save_machine_settings_v2','rak_admin_save_rotation_month_entries_v2')
ORDER BY p.proname;
