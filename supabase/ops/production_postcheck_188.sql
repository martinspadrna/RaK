-- RaK 1.8.8 production postcheck (READ ONLY).
-- Run after all approved database migrations and prerequisites are applied.
-- Edge Function deployment is checked separately; this file never exposes secret values.

SELECT
  'migration_head' AS check_name,
  COALESCE(MAX(version),'') AS observed,
  '20260930112049' AS required_minimum,
  COALESCE(MAX(version),'') >= '20260930112049' AS ok
FROM supabase_migrations.schema_migrations;

WITH required(name) AS (
  VALUES
    ('public.rak_account_ui_preferences'),
    ('public.rak_write_revisions'),
    ('private.rak_unplanned_absence_ops_v1'),
    ('public.bug_report_attachments')
)
SELECT
  'relation' AS check_type,
  name,
  to_regclass(name) IS NOT NULL AS ok
FROM required
ORDER BY name;

WITH required(signature) AS (
  VALUES
    ('public.rak_lookup_account_for_login_v4(text)'),
    ('public.rak_load_account_ui_preferences(text)'),
    ('public.rak_save_account_ui_preferences_v3(text,text,jsonb,jsonb,bigint)'),
    ('public.rak_admin_load_machine_settings_v3()'),
    ('public.rak_admin_save_machine_settings_v3(jsonb,text,bigint)'),
    ('public.rak_admin_load_rotation_month_entries_v3(date)'),
    ('public.rak_admin_save_rotation_month_entries_v3(date,text,jsonb,bigint)'),
    ('public.rak_admin_apply_unplanned_absence_v1(text,jsonb,jsonb,bigint,uuid,text,text,text,jsonb)'),
    ('public.rak_admin_apply_unplanned_change_v2(text,jsonb,jsonb,bigint,uuid,text,text,text,text,jsonb)'),
    ('public.rak_calendar_private_feed(text)'),
    ('public.rak_submit_bug_report_v3(text,text,text,text,text,text,text,jsonb,text,text,integer,integer)'),
    ('public.rak_admin_get_bug_report_screenshot_v3(uuid)'),
    ('public.rak_owner_complete_backup_table_v2(text)'),
    ('public.rak_owner_complete_backup_manifest_v2()')
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
  installed_version,
  installed_version IS NOT NULL AS ok
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
  ) AS ok
FROM required_secret r
ORDER BY r.name;

WITH cas_functions(name) AS (
  VALUES
    ('rak_admin_save_rotation_v2'),
    ('rak_admin_apply_unplanned_absence_v1'),
    ('rak_admin_apply_unplanned_change_v2'),
    ('rak_admin_save_machine_settings_v2'),
    ('rak_admin_save_machine_settings_v3'),
    ('rak_admin_save_rotation_month_entries_v2'),
    ('rak_admin_save_rotation_month_entries_v3')
)
SELECT
  'cas_sqlstate' AS check_type,
  p.proname,
  pg_get_function_identity_arguments(p.oid) AS args,
  position('40001' in pg_get_functiondef(p.oid)) = 0 AS no_retryable_40001,
  position('P0001' in pg_get_functiondef(p.oid)) > 0 AS has_nonretryable_p0001
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
JOIN cas_functions c ON c.name=p.proname
WHERE n.nspname='public'
ORDER BY p.proname,pg_get_function_identity_arguments(p.oid);

SELECT
  'legacy_v2_cutover' AS check_type,
  p.proname,
  position('Revision-aware RaK client required' in pg_get_functiondef(p.oid)) > 0 AS disabled_for_new_release
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN ('rak_admin_save_machine_settings_v2','rak_admin_save_rotation_month_entries_v2')
ORDER BY p.proname;

SELECT
  'account_ui_rls' AS check_type,
  c.relrowsecurity AS rls_enabled,
  NOT has_table_privilege('anon','public.rak_account_ui_preferences','SELECT') AS anon_select_revoked,
  NOT has_table_privilege('authenticated','public.rak_account_ui_preferences','SELECT') AS authenticated_select_revoked,
  NOT has_table_privilege('anon','public.rak_account_ui_preferences','UPDATE') AS anon_update_revoked,
  NOT has_table_privilege('authenticated','public.rak_account_ui_preferences','UPDATE') AS authenticated_update_revoked
FROM pg_class c
WHERE c.oid='public.rak_account_ui_preferences'::regclass;
