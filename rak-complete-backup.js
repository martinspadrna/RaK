// RaK 1.6.32 – one-click complete disaster-recovery backup for the owner account.
(function installRakCompleteBackup() {
  'use strict';

  const RAK_COMPLETE_BACKUP_REPO = 'martinspadrna/RaK';
  const RAK_COMPLETE_BACKUP_BUILD_SHA = '5d14e396c4d0ff2dc249e4fff2dbb9418e182898';
  const RAK_COMPLETE_BACKUP_SOURCE_ARCHIVE = 'rak-complete-backup-source.zip';
  const RAK_COMPLETE_BACKUP_REPO_FILES = Object.freeze([
    ".github/workflows/rak-development-validation.yml",
    ".gitignore",
    "BUILD_GATE_17043.md",
    "CHANGELOG.md",
    "DEV_BASELINE.md",
    "EMPLOYEE_AUTH_CUTOVER.md",
    "PRIVATE_IMPORT_BACKUP_17042.md",
    "PUBLIC_ROTATION_ACTOR_PRIVACY.md",
    "PUBLIC_ROTATION_MINIMIZATION_17040.md",
    "PUBLIC_ROTATION_PRIVACY.md",
    "RAK_HANDOFF_CURRENT.md",
    "RAK_PLAN_13.md",
    "RAK_PLAN_17060_STATUS.md",
    "RAK_PLAN_17061_STATUS.md",
    "RAK_PLAN_17062_STATUS.md",
    "RAK_PLAN_17063_STATUS.md",
    "RAK_PLAN_17064_STATUS.md",
    "RAK_PLAN_17065_STATUS.md",
    "RAK_PLAN_17066_STATUS.md",
    "RAK_PLAN_17067_INFRA_STATUS.md",
    "RAK_PLAN_17067_STATUS.md",
    "RAK_PLAN_17068_STATUS.md",
    "RAK_STABILIZATION_PLAN.md",
    "SECURITY_DEPLOYMENT.md",
    "SECURITY_DEPLOYMENT_17068_ADDENDUM.md",
    "SECURITY_ROTATION_17047.md",
    "SECURITY_ROTATION_CAS_17063.md",
    "admin-daymods.js",
    "admin-fhb-calibration.js",
    "admin-food.js",
    "admin-machine-settings.js",
    "admin-machine-tasks.js",
    "admin-reports.js",
    "admin-rotation-editor.js",
    "admin-rotation-generator-wizard.js",
    "admin-rotation-generator.js",
    "admin-rotation-overtime.js",
    "admin-rotation.js",
    "admin-security-fixes-smoke-v1338.js",
    "admin-service-usage.js",
    "api/_admin-auth.js",
    "api/admin-users.js",
    "api/public-calendar.js",
    "api/rotation-absence-calendar.js",
    "app-actions.js",
    "app-admin-unlock.js",
    "app-boot-selftest.js",
    "app-bottom-nav.js",
    "app-excel-import.js",
    "app-health-audits.js",
    "app-home-boot.js",
    "app-init.js",
    "app-menu-admin-export.js",
    "app-menu-admin-renderer.js",
    "app-menu-admin-service.js",
    "app-menu-admin-storage.js",
    "app-menu-bug-report.js",
    "app-menu-pages.js",
    "app-menu-profile.js",
    "app-menu-shift-report.js",
    "app-menu.js",
    "app-navigation.js",
    "app-postload-audits.js",
    "app-pwa-connectivity.js",
    "app-rotation-controls.js",
    "app-rotation-sync.js",
    "app-runtime-guards.js",
    "app.js",
    "appearance-theme.js",
    "assets/app-icons/icon-1024.png",
    "assets/app-icons/icon-16.png",
    "assets/app-icons/icon-180.png",
    "assets/app-icons/icon-192.png",
    "assets/app-icons/icon-32.png",
    "assets/app-icons/icon-512.png",
    "assets/dashboard-icons/calendar.png",
    "assets/dashboard-icons/dovolena.png",
    "assets/dashboard-icons/eportal.png",
    "assets/dashboard-icons/hourglass.png",
    "assets/dashboard-icons/jidelna.png",
    "assets/dashboard-icons/jidelnilistek.png",
    "assets/dashboard-icons/kantyna.png",
    "assets/dashboard-icons/vyplata.png",
    "assets/help/frezky-fhb-help.png",
    "assets/help/frezky-konicita-help.png",
    "assets/help/soustruhy-vrtaky-x-help.png",
    "assets/nav-icons/home-gray.png",
    "assets/nav-icons/home-green.png",
    "assets/nav-icons/kalkulacky-gray.png",
    "assets/nav-icons/kalkulacky-green.png",
    "assets/nav-icons/rotace-gray.png",
    "assets/nav-icons/rotace-green.png",
    "assets/rak-login-crab-step.png",
    "assets/rak-login-crab-tap.png",
    "assets/rak-login-crab.png",
    "browser-smoke-v1103.js",
    "brusy-fhb-correction.js",
    "brusy-fhb-v157.js",
    "brusy-fhb-v158.js",
    "brusy.js",
    "changelog.js",
    "core.js",
    "dashboard.js",
    "data.js",
    "docs/PROJECT_STATE.md",
    "export.js",
    "index.html",
    "kalirna-daymod-override.js",
    "kalirna-stats-override.js",
    "lifecycle.js",
    "manifest.webmanifest",
    "module-readiness.js",
    "package.json",
    "payroll.js",
    "qr.js",
    "rak-account-access.js",
    "rak-appsec-privacy-audit.js",
    "rak-audit-baseline.js",
    "rak-auth-gate.js",
    "rak-boot-sequence-audit.js",
    "rak-complete-backup.js",
    "rak-dom-action-audit.js",
    "rak-dom-security-hardening.js",
    "rak-due-diligence-progress.js",
    "rak-export-release-audit.js",
    "rak-feature-routing.js",
    "rak-generator-monthkey-runtime-fix.js",
    "rak-lazy-external-libs.js",
    "rak-login-fix.js",
    "rak-login-life.js",
    "rak-login-splash.js",
    "rak-mobile-layout-guard.js",
    "rak-mobile-smoke-audit.js",
    "rak-namespace.js",
    "rak-performance-ci-audit.js",
    "rak-release-gates.js",
    "rak-release-ops-audit.js",
    "rak-runtime-health.js",
    "rak-runtime-stability.js",
    "rak-shift-report-image.js",
    "rak-shift-report-share.js",
    "rak-shift-report.js",
    "rak-storage-sync-audit.js",
    "rak-supabase-client-audit.js",
    "rak-user-profile.js",
    "rak-vacation-report.js",
    "rotace.js",
    "rotation-tasks.js",
    "security-smoke-v1337.js",
    "soustruhy.js",
    "stats.js",
    "styles-admin-polish.css",
    "styles-admin-reports.css",
    "styles-admin-rotation-editor.css",
    "styles-admin-rotation-fold.css",
    "styles-admin-service.css",
    "styles-base.css",
    "styles-bottom-nav-runtime.css",
    "styles-calc-panels.css",
    "styles-calculators-mid.css",
    "styles-dashboard-fit.css",
    "styles-dashboard-polish.css",
    "styles-dashboard-sync.css",
    "styles-daymods.css",
    "styles-inline-legacy.css",
    "styles-interaction-guard.css",
    "styles-layout.css",
    "styles-low-end-performance.css",
    "styles-menu-polish.css",
    "styles-modal.css",
    "styles-overrides-legacy-early.css",
    "styles-overrides-legacy-late.css",
    "styles-release-polish.css",
    "styles-responsive.css",
    "styles-rotation-month.css",
    "styles-rotation-summary-compact.css",
    "styles-rotation-tasks.css",
    "styles-settings-runtime.css",
    "styles-shift-report.css",
    "styles-stats-polish.css",
    "styles-theme-polish.css",
    "styles-theme-propagation.css",
    "styles-theme.css",
    "styles-viewport-polish.css",
    "styles.css",
    "supabase-bridge.js",
    "supabase-config.js",
    "supabase/config.toml",
    "supabase/functions/rak-absence-calendar/index.ts",
    "supabase/functions/rak-admin-users/index.ts",
    "supabase/migrations/20260722102540_secure_admin_auth.sql",
    "supabase/migrations/20260722105539_secure_admin_writes.sql",
    "supabase/migrations/20260722113000_secure_reports_audit_service.sql",
    "supabase/migrations/20260722120000_secure_operational_writes.sql",
    "supabase/migrations/20260722123000_enforce_secure_admin_writes.sql",
    "supabase/migrations/20260722151920_complete_security_cutover.sql",
    "supabase/history/non-production-migrations/20260722174225_fix_admin_settings_and_backup_delete.sql",
    "supabase/history/non-production-migrations/20260722180123_fix_rotation_backup_month_count.sql",
    "supabase/history/non-production-migrations/20260904184557_secure_application_accounts.sql",
    "supabase/migrations/20260910115407_remove_legacy_usage_presence_tracking.sql",
    "supabase/history/non-production-migrations/20260912025913_rak_test_match_realtime_publication.sql",
    "supabase/history/non-production-migrations/20260912045938_rak_test_owner_requires_auth_before_bootstrap.sql",
    "supabase/history/non-production-migrations/20260912145005_rak_test_fix_authenticated_machine_settings_rls_helper.sql",
    "supabase/history/non-production-migrations/20260915124422_audit_keepalive_rpc_only.sql",
    "supabase/history/non-production-migrations/20260915133113_rak_owner_complete_backup_v1.sql",
    "supabase/history/non-production-migrations/20260915144000_audit_keepalive_rpc_only.sql",
    "supabase/history/non-production-migrations/20260918162343_rak_security_remove_bootstrap_and_bound_keepalive.sql",
    "supabase/history/non-production-migrations/20260918163543_rak_limit_anonymous_reports_and_keepalive_devices.sql",
    "supabase/history/non-production-migrations/20260918164116_rak_admin_context_require_verified_session.sql",
    "supabase/history/non-production-migrations/20260918171858_rak_login_and_admin_directory_rpcs_stage.sql",
    "supabase/history/non-production-migrations/20260918174200_close_unused_rotation_month_entry_reads.sql",
    "supabase/history/non-production-migrations/20260918180344_rak_cut_over_account_privacy_and_limit_public_lookup.sql",
    "supabase/history/non-production-migrations/20260918193324_rak_close_retired_gomoku_public_read.sql",
    "supabase/history/non-production-migrations/20260918195107_rak_stage_verified_employee_rotation_reader.sql",
    "supabase/history/non-production-migrations/20260918200612_rak_hide_legacy_rotation_backups_from_public_reads.sql",
    "supabase/history/non-production-migrations/20260918203159_rak_hide_legacy_admin_change_log_from_public_reads.sql",
    "supabase/history/non-production-migrations/20260918204000_rak_whitelist_owner_backup_auth_metadata.sql",
    "supabase/history/non-production-migrations/20260918211310_rak_machine_settings_protect_admin_json_types.sql",
    "supabase/history/non-production-migrations/20260918214441_rak_hide_worker_roster_from_public_reads.sql",
    "supabase/history/non-production-migrations/20260918220431_rak_announcements_hide_inactive_from_public_reads.sql",
    "supabase/history/non-production-migrations/20260918220817_rak_machine_settings_hide_disguised_roster_payloads.sql",
    "supabase/history/non-production-migrations/20260919054241_rak_recursive_worker_privacy_and_profile_based_admin_lookup.sql",
    "supabase/history/non-production-migrations/20260919055938_rak_employee_rotation_cutover_readiness_and_disabled_worker_guard.sql",
    "supabase/history/non-production-migrations/20260919060210_rak_announcements_only_live_public_read.sql",
    "supabase/history/non-production-migrations/20260919062619_rak_worker_verified_email_recovery_staging.sql",
    "supabase/history/non-production-migrations/20260919071456_rak_public_rotation_reject_nested_secret_fields_os_only.sql",
    "supabase/history/non-production-migrations/20260919081521_rak_public_rotation_reject_secret_text_values.sql",
    "supabase/history/non-production-migrations/20260919085101_rak_public_rotation_remove_admin_actor_metadata.sql",
    "supabase/history/non-production-migrations/20260919111542_rak_rotation_archive_import_provenance.sql",
    "supabase/history/non-production-migrations/20260919132743_rak_owner_complete_backup_include_private_rotation_import_provenance.sql",
    "supabase/history/non-production-migrations/20260919140220_rak_public_rotation_contact_os_guard_v3.sql",
    "supabase/history/non-production-migrations/20260919141936_rak_bounded_admin_gate_and_login_v2.sql",
    "supabase/history/non-production-migrations/20260919145342_rak_17046_telemetry_admission_and_backup_integrity.sql",
    "supabase/history/non-production-migrations/20260919153000_rak_17047_privacy_keys_machine_guard_backup_months.sql",
    "supabase/history/non-production-migrations/20260919161000_rak_17048_admin_device_sessions_and_revocation.sql",
    "supabase/history/non-production-migrations/20260919161500_rak_17048_admin_device_conflict_constraint_fix.sql",
    "supabase/history/non-production-migrations/20260919165000_rak_17049_bug_report_device_info_allowlist.sql",
    "supabase/history/non-production-migrations/20260919185000_rak_17050_case_insensitive_private_settings_rls.sql",
    "supabase/verify/security_verification.sql",
    "sw.js",
    "tools/README-17067-NOTES.md",
    "tools/admin-compact-17022.mjs",
    "tools/admin-device-revocation-17048.sql",
    "tools/auth-role-diagnostic-17056.js",
    "tools/backup-coverage-17054.sql",
    "tools/backup-source-integrity-17051.mjs",
    "tools/browser-absence-layout-17061.mjs",
    "tools/browser-equal-grid-17067.mjs",
    "tools/browser-offline-17052.mjs",
    "tools/browser-soft-grid-17066.mjs",
    "tools/bug-report-rls-matrix-17049.sql",
    "tools/build-architecture-contract.test.mjs",
    "tools/canonical-baseline-smoke.mjs",
    "tools/canonical-build-contract.test.mjs",
    "tools/canonical-build.mjs",
    "tools/canonical-source-snapshot.mjs",
    "tools/canonical-source-snapshot.test.mjs",
    "tools/complete-backup-1632-smoke.mjs",
    "tools/complete-backup-1632.mjs",
    "tools/complete-backup-ios-fix-1633-smoke.mjs",
    "tools/complete-backup-ios-fix-1633.mjs",
    "tools/create-supabase-safety-backup.mjs",
    "tools/critical-runtime-smoke.mjs",
    "tools/cross-shift-fixes-17024.mjs",
    "tools/css-cleanup-calculators-1615.mjs",
    "tools/css-cleanup-menu-admin-1617.mjs",
    "tools/css-cleanup-rotation-1616.mjs",
    "tools/css-cleanup-theme-1618.mjs",
    "tools/dashboard-css-overlap-audit.mjs",
    "tools/defer-heavy-libs.mjs",
    "tools/deputy-report-role-17019-smoke.mjs",
    "tools/development-deploy-gate.test.mjs",
    "tools/development-supabase-isolation-smoke.mjs",
    "tools/development-version-17001.mjs",
    "tools/development-version-17002.mjs",
    "tools/development-version-17003.mjs",
    "tools/development-version-17004.mjs",
    "tools/development-version-17005.mjs",
    "tools/development-version-17006-bootstrap.mjs",
    "tools/development-version-17006.mjs",
    "tools/development-version-17007.mjs",
    "tools/development-version-17008.mjs",
    "tools/development-version-17009.mjs",
    "tools/development-version-17010.mjs",
    "tools/development-version-17011.mjs",
    "tools/development-version-17012.mjs",
    "tools/development-version-17013-sync.mjs",
    "tools/development-version-17013.mjs",
    "tools/development-version-17014.mjs",
    "tools/development-version-17015.mjs",
    "tools/development-version-17016.mjs",
    "tools/development-version-17017.mjs",
    "tools/development-version-17018.mjs",
    "tools/development-version-17019.mjs",
    "tools/development-version-17020.mjs",
    "tools/development-version-17021.mjs",
    "tools/development-version-17025.mjs",
    "tools/development-version-17026.mjs",
    "tools/development-version-17027.mjs",
    "tools/development-version-17028.mjs",
    "tools/development-version-17029.mjs",
    "tools/development-version-17030.mjs",
    "tools/development-version-17031.mjs",
    "tools/development-version-17032.mjs",
    "tools/development-version-17033.mjs",
    "tools/development-version-17034.mjs",
    "tools/development-version-17035.mjs",
    "tools/development-version-17036.mjs",
    "tools/development-version-17037.mjs",
    "tools/development-version-17038.mjs",
    "tools/development-version-17039.mjs",
    "tools/development-version-17040.mjs",
    "tools/development-version-17041.mjs",
    "tools/development-version-17042.mjs",
    "tools/development-version-17043.mjs",
    "tools/development-version-17044.mjs",
    "tools/development-version-17045.mjs",
    "tools/development-version-17046.mjs",
    "tools/development-version-17047.mjs",
    "tools/development-version-17048-impl.mjs",
    "tools/development-version-17048.mjs",
    "tools/development-version-17049.mjs",
    "tools/development-version-17050.mjs",
    "tools/development-version-17051.mjs",
    "tools/development-version-17052.mjs",
    "tools/development-version-17053.mjs",
    "tools/development-version-17054.mjs",
    "tools/development-version-17055.mjs",
    "tools/development-version-17056.mjs",
    "tools/development-version-17057.mjs",
    "tools/development-version-17058.mjs",
    "tools/development-version-17059.mjs",
    "tools/development-version-17060.mjs",
    "tools/development-version-17061.mjs",
    "tools/development-version-17062.mjs",
    "tools/development-version-17063.mjs",
    "tools/development-version-17064.mjs",
    "tools/development-version-17065.mjs",
    "tools/development-version-17066.mjs",
    "tools/development-version-17067.mjs",
    "tools/development-version-17068.mjs",
    "tools/development-version-17069.mjs",
    "tools/export-preflight-hotfix-1631-smoke.mjs",
    "tools/export-preflight-hotfix-1631.mjs",
    "tools/full-app-audit-finalize-1630.mjs",
    "tools/full-app-audit-fixes-1630-runner.mjs",
    "tools/full-app-audit-fixes-1630.mjs",
    "tools/games-cleanup-17021-health.mjs",
    "tools/games-cleanup-17021-smoke.mjs",
    "tools/games-residue-audit-17021.mjs",
    "tools/generator-finalize-170.mjs",
    "tools/generator-grinder-tasks-170.mjs",
    "tools/generator-monthkey-hotfix-smoke.mjs",
    "tools/generator-solo-mill-final-17008-smoke.mjs",
    "tools/generator-staffing-170-smoke.mjs",
    "tools/generator-staffing-170.mjs",
    "tools/http-anon-audit-17050.mjs",
    "tools/login-admin-gate-17045.sql",
    "tools/machine-private-casefold-17050.sql",
    "tools/machine-settings-backup-filter-170.mjs",
    "tools/manual-entry-normalization-17006-smoke.mjs",
    "tools/mutation-observer-cleanup-1629.mjs",
    "tools/performance-guards-1627.mjs",
    "tools/press-half-balance-17012-smoke.mjs",
    "tools/preview-rollback-preflight-17068.mjs",
    "tools/preview-rollback-preflight-17068.test.mjs",
    "tools/privacy-backup-matrix-17047.sql",
    "tools/private-import-backup-17042.sql",
    "tools/private-import-backup-17042.test.mjs",
    "tools/promote-canonical-source.mjs",
    "tools/pwa-assets-lossless-1624.mjs",
    "tools/pwa-cache-tuning-1626.mjs",
    "tools/pwa-login-assets-1625.mjs",
    "tools/pwa-offline-17052.test.mjs",
    "tools/pwa-start-bench-17068.mjs",
    "tools/pwa-start-bench-17068.test.mjs",
    "tools/pwa-startup-diagnostics-1622.mjs",
    "tools/pwa-warm-cache-batch-1621.mjs",
    "tools/pwa-warm-cache-micro-1620.mjs",
    "tools/queue-held-reset-17059.mjs",
    "tools/rak-170-brusy-order.mjs",
    "tools/rak-170-profile-appearance-sync.mjs",
    "tools/rak-v170-three-absence-regression.mjs",
    "tools/release-170-smoke.mjs",
    "tools/release-170.mjs",
    "tools/release-gate-17039.mjs",
    "tools/release-gate-17039.test.mjs",
    "tools/release-gate-17043.test.mjs",
    "tools/release-gate-17044.test.mjs",
    "tools/release-gate-17045.test.mjs",
    "tools/release-gate-17046.test.mjs",
    "tools/release-gate-17047.test.mjs",
    "tools/release-gate-17048.test.mjs",
    "tools/release-gate-17049.test.mjs",
    "tools/release-gate-17050.test.mjs",
    "tools/release-gate-17051.test.mjs",
    "tools/release-gate-17052.test.mjs",
    "tools/release-gate-17053.test.mjs",
    "tools/release-gate-17054.test.mjs",
    "tools/release-gate-17055.test.mjs",
    "tools/release-gate-17056.test.mjs",
    "tools/release-gate-17057.test.mjs",
    "tools/release-gate-17058.test.mjs",
    "tools/release-gate-17059.test.mjs",
    "tools/release-gate-17060.test.mjs",
    "tools/release-gate-17061.test.mjs",
    "tools/release-gate-17062.test.mjs",
    "tools/release-gate-17063.test.mjs",
    "tools/release-gate-17064.test.mjs",
    "tools/release-gate-17065.test.mjs",
    "tools/release-gate-17066.test.mjs",
    "tools/release-gate-17067.test.mjs",
    "tools/release-gate-17068.test.mjs",
    "tools/release-gate-17069.test.mjs",
    "tools/repeat-build-idempotence.test.mjs",
    "tools/report-index-grid-17015-compat-final.mjs",
    "tools/report-index-grid-17015-compat.mjs",
    "tools/report-index-grid-17015-smoke.mjs",
    "tools/report-smart-totals-17017-smoke.mjs",
    "tools/report-totals-nok-17014-smoke.mjs",
    "tools/restore-shadow-17055.sql",
    "tools/roadmap-contract.mjs",
    "tools/roadmap-contract.test.mjs",
    "tools/role-backup-regression-17053.sql",
    "tools/rotation-public-guard-17044.sql",
    "tools/rotation-release-gate-17040.mjs",
    "tools/rotation-release-gate-17040.test.mjs",
    "tools/rotation-roster-report-17007-smoke.mjs",
    "tools/rotation-toolbar-slim-17023.mjs",
    "tools/secure-rpc-only-1614.mjs",
    "tools/security-admin-rpc-matrix.sql",
    "tools/security-announcement-live-matrix.sql",
    "tools/security-current-smoke-1630.mjs",
    "tools/security-employee-os-only-matrix.sql",
    "tools/security-employee-rotation-matrix.sql",
    "tools/security-privacy-bundle-matrix.sql",
    "tools/security-public-data-matrix.sql",
    "tools/security-public-surface-matrix.sql",
    "tools/security-recursive-worker-matrix.sql",
    "tools/security-rotation-minimization-17040.sql",
    "tools/security-rotation-public-actor-matrix.sql",
    "tools/security-rotation-public-field-matrix.sql",
    "tools/security-rotation-public-release-17036.mjs",
    "tools/security-rotation-public-text-matrix.sql",
    "tools/security-rotation-release-17039.sql",
    "tools/security-worker-email-recovery-matrix.sql",
    "tools/security-worker-roster-matrix.sql",
    "tools/shift-report-free-only-17010-smoke.mjs",
    "tools/shift-report-image-170-smoke.mjs",
    "tools/shift-report-image-170.mjs",
    "tools/shift-report-mo-hotfix-170-smoke.mjs",
    "tools/shift-report-mo-hotfix-170.mjs",
    "tools/shift-team-17020-impl.mjs",
    "tools/shift-team-17020-pre.mjs",
    "tools/shift-team-17020-smoke.mjs",
    "tools/solo-mill-spread-17009-smoke.mjs",
    "tools/source-restore-rehearsal-17069.mjs",
    "tools/split-qr-runtime.mjs",
    "tools/startup-idle-layout-1628.mjs",
    "tools/sunday-cleanup-fairness-17011-smoke.mjs",
    "tools/supabase-secure-write-paths-smoke.mjs",
    "tools/telemetry-backup-matrix-17046.sql",
    "tools/tpkw02-mobile-report-17013-smoke.mjs",
    "tools/two-pass-release-17041.test.mjs",
    "tools/v1587-smoke.mjs",
    "tools/v1588-smoke.mjs",
    "tools/v1589-smoke.mjs",
    "tools/v1591-smoke.mjs",
    "tools/v1592-smoke.mjs",
    "tools/v1593-smoke.mjs",
    "tools/v1594-smoke.mjs",
    "tools/v1595-smoke.mjs",
    "tools/v1596-smoke.mjs",
    "tools/v1597-smoke.mjs",
    "tools/v1598-smoke.mjs",
    "tools/v1599-smoke.mjs",
    "tools/v160-smoke.mjs",
    "tools/vacation-absence-union-17016-smoke.mjs",
    "tools/vacation-reason-group-17018-smoke.mjs",
    "tools/vercel-build-policy.mjs",
    "tools/vercel-build-policy.test.mjs",
    "tools/vercel-ignore-build.mjs",
    "tools/worker-provisioning-17065.mjs",
    "ui.js",
    "vercel.json"
  ]);
  const MANIFEST_RPC_NAME = 'rak_owner_complete_backup_manifest_v2';
  const TABLE_RPC_NAME = 'rak_owner_complete_backup_table_v2';
  const LEGACY_RPC_NAME = 'rak_owner_complete_backup_v1';
  const STATUS_ID = 'adminCompleteBackupStatus';
  const MAX_PARALLEL_FETCHES = 5;
  const MAX_PARALLEL_DB_FETCHES = 2;

  function status(text) {
    try {
      const el = document.getElementById(STATUS_ID);
      if (el) el.textContent = String(text || '');
    } catch (_) {}
  }

  function safePart(value) {
    return String(value || '').replace(/[<>:"\\|?*\x00-\x1F]/g, '_').replace(/^\/+|\/+$/g, '');
  }

  function encodePath(value) {
    return String(value || '').split('/').filter(Boolean).map(encodeURIComponent).join('/');
  }

  function timestampForFile(date) {
    const d = date instanceof Date ? date : new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join('-') + '_' + pad(d.getHours()) + '-' + pad(d.getMinutes());
  }

  function bytesLabel(value) {
    const bytes = Number(value) || 0;
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' kB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function isOwnerUi() {
    try {
      return typeof window.rakAdminCanManageAdmins === 'function' && window.rakAdminCanManageAdmins();
    } catch (_) {
      return false;
    }
  }

  async function ensureZip() {
    if (window.JSZip) return window.JSZip;
    if (typeof window.rakEnsureExternalLibrary === 'function') await window.rakEnsureExternalLibrary('jszip');
    if (!window.JSZip) throw new Error('ZIP knihovna není dostupná.');
    return window.JSZip;
  }

  async function ownerAccessToken() {
    const bridge = window.RotationSupabaseBridge;
    if (!bridge || typeof bridge.getAdminAccessToken !== 'function') throw new Error('Supabase administrace není připravená.');
    const token = await bridge.getAdminAccessToken();
    if (!token) throw new Error('Chybí platná relace hlavního admina. Odemkni znovu Administraci.');
    return token;
  }

  async function postBackupRpc(base, key, token, rpcName, body) {
    const response = await fetch(base + '/rest/v1/rpc/' + rpcName, {
      method: 'POST',
      cache: 'no-store',
      headers: { apikey: key, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
    let payload = null;
    try { payload = await response.json(); } catch (_) {}
    if (!response.ok) {
      const message = payload && (payload.message || payload.error_description || payload.hint);
      throw new Error('Databázová záloha selhala' + (message ? ': ' + message : ' (HTTP ' + response.status + ')'));
    }
    return payload;
  }

  async function fetchCompleteSnapshot(token) {
    const cfg = window.SUPABASE_CONFIG || {};
    const base = String(cfg.url || '').replace(/\/$/, '');
    const key = String(cfg.publishableKey || '');
    if (!base || !key) throw new Error('Chybí veřejná Supabase konfigurace.');

    const manifest = await postBackupRpc(base, key, token, MANIFEST_RPC_NAME, {});
    if (!manifest || manifest.format !== 'rak-complete-backup-manifest-v2') {
      throw new Error('Supabase vrátila nečekaný manifest úplné zálohy.');
    }
    const tableNames = Array.isArray(manifest.public_tables) ? manifest.public_tables.map((name) => String(name || '').trim()) : [];
    if (!tableNames.length
      || new Set(tableNames).size !== tableNames.length
      || tableNames.some((name) => !/^[a-z_][a-z0-9_]*$/i.test(name) || name === 'rak_admin_secrets')) {
      throw new Error('Manifest úplné zálohy obsahuje neplatný seznam tabulek.');
    }

    const tableParts = new Array(tableNames.length);
    let completed = 0;
    await mapConcurrent(tableNames, MAX_PARALLEL_DB_FETCHES, async (tableName, index) => {
      const part = await postBackupRpc(base, key, token, TABLE_RPC_NAME, { p_table: tableName });
      if (!part || part.format !== 'rak-complete-backup-table-v2'
        || part.table !== tableName || !Array.isArray(part.rows)) {
        throw new Error('Supabase vrátila neplatnou část tabulky ' + tableName + '.');
      }
      tableParts[index] = part.rows;
      completed += 1;
      status('Supabase tabulky: ' + completed + '/' + tableNames.length);
    });

    const publicData = {};
    tableNames.forEach((tableName, index) => { publicData[tableName] = tableParts[index]; });
    const manifestData = manifest.data && typeof manifest.data === 'object' ? manifest.data : {};
    return {
      format: 'rak-complete-backup-v1',
      generated_at: manifest.generated_at,
      database: manifest.database,
      data: {
        public: publicData,
        private: manifestData.private,
        auth: manifestData.auth,
        storage: manifestData.storage,
        redacted: manifestData.redacted
      },
      schema: manifest.schema,
      sensitive_exclusions: manifest.sensitive_exclusions
    };
  }

  async function fetchArrayBuffer(url, label) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('Nepodařilo se stáhnout ' + label + ' (HTTP ' + response.status + ').');
    return await response.arrayBuffer();
  }

  async function mapConcurrent(items, limit, worker) {
    const list = Array.from(items || []);
    let cursor = 0;
    const runners = Array.from({ length: Math.min(Math.max(1, limit || 1), Math.max(1, list.length)) }, async () => {
      while (true) {
        const index = cursor++;
        if (index >= list.length) return;
        await worker(list[index], index);
      }
    });
    await Promise.all(runners);
  }

  function validateExactSourceArchive(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer || new ArrayBuffer(0));
    if (bytes.byteLength < 100000 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
      throw new Error('Zdrojový Git archiv se nestáhl celý. Záloha byla bezpečně zastavena.');
    }
    const min = Math.max(0, bytes.length - 65557);
    let eocd = -1;
    for (let index = Math.max(0, bytes.length - 22); index >= min; index -= 1) {
      if (bytes[index] === 0x50 && bytes[index + 1] === 0x4b && bytes[index + 2] === 0x05 && bytes[index + 3] === 0x06) {
        eocd = index;
        break;
      }
    }
    if (eocd < 0) {
      throw new Error('Zdrojový Git archiv je neúplný (chybí konec ZIPu). Záloha byla bezpečně zastavena.');
    }
    const commentLength = bytes[eocd + 20] | (bytes[eocd + 21] << 8);
    if (eocd + 22 + commentLength !== bytes.length) {
      throw new Error('Zdrojový Git archiv má neplatnou délku. Záloha byla bezpečně zastavena.');
    }
    return bytes;
  }

  async function addRepositorySnapshot(zip, progress) {
    if (!/^[0-9a-f]{40}$/i.test(RAK_COMPLETE_BACKUP_BUILD_SHA)) throw new Error('Chybí přesný Git SHA tohoto buildu.');
    const expected = Array.from(RAK_COMPLETE_BACKUP_REPO_FILES || []);
    if (!expected.length) throw new Error('Build neobsahuje seznam souborů repozitáře.');
    progress('Načítám přesný zdrojový archiv…');
    const archiveUrl = new URL('/' + RAK_COMPLETE_BACKUP_SOURCE_ARCHIVE + '?v=' + encodeURIComponent(RAK_COMPLETE_BACKUP_BUILD_SHA), window.location.origin).toString();
    const archiveData = await fetchArrayBuffer(archiveUrl, 'lokálního zdrojového archivu');
    const exactBytes = validateExactSourceArchive(archiveData);
    // Safari/iOS už tento ZIP znovu nerozbaluje přes JSZip. Build před deploymentem
    // nezávisle ověřuje CRC a přesnou shodu inventory s Git indexem; vnější záloha
    // proto bezpečně nese původní ověřené bajty jako jeden STORE záznam.
    zip.file('repository/source-exact.zip', exactBytes, { binary: true, compression: 'STORE' });
    zip.file('repository/README-ZDROJ.txt', [
      'RaK – přesný zdrojový snapshot',
      'Git SHA: ' + RAK_COMPLETE_BACKUP_BUILD_SHA,
      'Očekávaných Git souborů: ' + expected.length,
      '',
      'Rozbal source-exact.zip. Jde o buildem ověřený git archive pro přesný SHA výše.',
      'Na iPhonu se archiv při vytváření zálohy záměrně znovu nerozbaluje, aby nevznikala paměťová špička v JSZip.'
    ].join('\n'));
    progress('Zdrojový snapshot připraven: ' + expected.length + ' souborů');
    return expected.length;
  }

  function deployedFileInventory() {
    const js = Array.isArray(window.EXPORT_JS_FILES) ? window.EXPORT_JS_FILES : [];
    const text = Array.isArray(window.EXPORT_TEXT_FILES) ? window.EXPORT_TEXT_FILES : [];
    const binary = window.EXPORT_BINARY_FILES && typeof window.EXPORT_BINARY_FILES[Symbol.iterator] === 'function' ? Array.from(window.EXPORT_BINARY_FILES) : [];
    const textSet = new Set(['index.html'].concat(js, text, ['rak-complete-backup.js']));
    binary.forEach((item) => textSet.delete(item));
    return { text: Array.from(textSet).filter(Boolean), binary: Array.from(new Set(binary)).filter(Boolean) };
  }

  async function addDeployedSnapshot(zip, progress) {
    if (typeof window.readExportText !== 'function' || typeof window.readExportBinary !== 'function') throw new Error('Exportní čtečky aplikace nejsou připravené.');
    const inventory = deployedFileInventory();
    let done = 0;
    const total = inventory.text.length + inventory.binary.length;
    for (const path of inventory.text) {
      zip.file('deployed-app/' + path, await window.readExportText(path));
      done += 1;
      if (done === total || done % 15 === 0) progress('Nasazená PWA: ' + done + '/' + total);
    }
    for (const path of inventory.binary) {
      zip.file('deployed-app/' + path, await window.readExportBinary(path), { binary: true });
      done += 1;
      if (done === total || done % 15 === 0) progress('Nasazená PWA: ' + done + '/' + total);
    }
    return total;
  }

  function addJson(zip, path, value) {
    zip.file(path, JSON.stringify(value == null ? null : value, null, 2));
  }

  function sqlFromDefinitions(items, key) {
    return (Array.isArray(items) ? items : []).map((item) => String(item && item[key] || '').trim()).filter(Boolean).join('\n\n') + '\n';
  }

  // RAK_PRIVATE_IMPORT_BACKUP_17042
  // RAK_17053_BACKUP_STRUCTURE_GUARD: never download an apparently complete but partial ZIP.
  function validateCompleteSnapshot(snapshot) {
    const data = snapshot && snapshot.data;
    const schema = snapshot && snapshot.schema;
    const fail = (part) => { throw new Error('Úplná záloha je neúplná: ' + part + '. Soubor nebyl vytvořen.'); };
    if (!snapshot || snapshot.format !== 'rak-complete-backup-v1' || !data || typeof data !== 'object') fail('formát databáze');
    if (!data.public || typeof data.public !== 'object' || Array.isArray(data.public)) fail('veřejné tabulky');
    if (!Array.isArray(data.public.rotation_state)) fail('rotace');
    if (Object.prototype.hasOwnProperty.call(data.public, 'rak_admin_secrets')) fail('v záloze se objevil zakázaný seznam tajemství');
    if (!Object.values(data.public).every(Array.isArray)) fail('řádky aplikačních tabulek');
    if (!data.private || !Array.isArray(data.private.rak_rotation_import_metadata_v1)) fail('soukromé importy');
    if (!data.auth || !Array.isArray(data.auth.users_sanitized) || !Array.isArray(data.auth.identities_sanitized)) fail('anonymizovaný Auth přehled');
    if (data.auth.users_sanitized.some((user) => !user || typeof user !== 'object' || ['encrypted_password','confirmation_token','recovery_token','access_token','refresh_token'].some((key) => Object.prototype.hasOwnProperty.call(user,key)))) fail('zakázané přihlašovací údaje');
    if (!data.storage || !Array.isArray(data.storage.buckets) || !Array.isArray(data.storage.objects)) fail('Storage metadata');
    if (!schema || !Array.isArray(schema.tables) || !schema.tables.length || !Array.isArray(schema.functions) || !schema.functions.length || !Array.isArray(schema.policies)) fail('struktura databáze');
    if (!Array.isArray(snapshot.sensitive_exclusions) || !snapshot.sensitive_exclusions.length) fail('seznam úmyslně vynechaných tajemství');
    // RAK_17054_BACKUP_COVERAGE_GUARD: the previous validator accepted a partial table inventory.
    const schemaPublic = schema.tables.filter((table) => table && table.schema === 'public' && typeof table.name === 'string').map((table) => table.name);
    if (schemaPublic.length < 20 || !schemaPublic.includes('rak_admin_secrets') || new Set(schemaPublic).size !== schemaPublic.length) fail('registr veřejných tabulek');
    if (!schema.tables.some((table) => table && table.schema === 'private' && table.name === 'rak_rotation_import_metadata_v1')) fail('struktura soukromých importů');
    const expectedPublic = schemaPublic.filter((name) => name !== 'rak_admin_secrets').sort();
    const actualPublic = Object.keys(data.public).sort();
    if (expectedPublic.length !== actualPublic.length || expectedPublic.some((name, index) => name !== actualPublic[index])) fail('chybějící nebo nadbytečné databázové tabulky');
    if (!Object.values(data.public).every((rows) => rows.every((row) => row && typeof row === 'object' && !Array.isArray(row)))) fail('neplatné řádky databáze');
    const authUserKeys = new Set(['id','aud','role','email','phone','email_confirmed_at','phone_confirmed_at','confirmed_at','last_sign_in_at','created_at','updated_at','is_anonymous','is_sso_user','banned_until','deleted_at','raw_app_meta_data']);
    const appMetaKeys = new Set(['provider','providers','rak_role','rak_account_id']);
    const authIds = new Set();
    for (const user of data.auth.users_sanitized) {
      if (!user || typeof user !== 'object' || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(user.id || '') || authIds.has(user.id) || Object.keys(user).some((key) => !authUserKeys.has(key))) fail('neplatný nebo rozšířený seznam Auth účtů');
      const meta = user.raw_app_meta_data || {};
      if (typeof meta !== 'object' || Array.isArray(meta) || Object.keys(meta).some((key) => !appMetaKeys.has(key))) fail('nečekaná soukromá Auth metadata');
      authIds.add(user.id);
    }
    const identities = data.auth.identities_sanitized;
    const identityKeys = new Set(['id','user_id','provider_id','provider','email','last_sign_in_at','created_at','updated_at']);
    if (identities.some((item) => !item || typeof item !== 'object' || !authIds.has(item.user_id) || Object.keys(item).some((key) => !identityKeys.has(key)))) fail('Auth identity a vazby na účty');
    for (const table of ['rak_admin_profiles','rak_admin_devices']) {
      if (!Array.isArray(data.public[table]) || data.public[table].some((row) => !authIds.has(row.user_id))) fail('vazba ' + table + ' na Auth účet');
    }
    const bucketIds = new Set();
    for (const bucket of data.storage.buckets) {
      if (!bucket || typeof bucket.id !== 'string' || !bucket.id || bucketIds.has(bucket.id)) fail('Storage bucket');
      bucketIds.add(bucket.id);
    }
    if (data.storage.objects.some((object) => !object || !bucketIds.has(object.bucket_id) || typeof object.name !== 'string' || !object.name)) fail('Storage soubory bez bucketu');
    const publicRows = Object.values(data.public).reduce((sum, rows) => sum + rows.length, 0);
    return { privateImports: data.private.rak_rotation_import_metadata_v1.length, sanitizedAuthAccounts: data.auth.users_sanitized.length, schemaTables: schema.tables.length, completePublicTables: expectedPublic.length, publicRows };
  }

  function addSupabaseSnapshotFiles(zip, snapshot) {
    const data = snapshot && snapshot.data || {};
    const publicData = data.public && typeof data.public === 'object' ? data.public : {};
    const privateData = data.private;
    const privateKeys = privateData && typeof privateData === 'object' && !Array.isArray(privateData) ? Object.keys(privateData) : [];
    if (privateKeys.length !== 1 || privateKeys[0] !== 'rak_rotation_import_metadata_v1') {
      throw new Error('Úplná záloha neobsahuje očekávaný omezený soukromý archiv. Ověř migraci 1.7.42.');
    }
    const imported = privateData.rak_rotation_import_metadata_v1;
    if (!Array.isArray(imported) || imported.some(row => !row || typeof row !== 'object'
      || typeof row.rotation_key !== 'string' || typeof row.month_key !== 'string'
      || !Object.prototype.hasOwnProperty.call(row, 'import_metadata'))) {
      throw new Error('Úplná záloha obsahuje neplatná soukromá metadata importu. Export zastaven.');
    }
    addJson(zip, 'supabase/complete-snapshot.json', snapshot);
    addJson(zip, 'supabase/data/private/rak_rotation_import_metadata_v1.json', data.private.rak_rotation_import_metadata_v1);
    Object.keys(publicData).sort().forEach((table) => addJson(zip, 'supabase/data/public/' + safePart(table) + '.json', publicData[table]));
    addJson(zip, 'supabase/data/private/rak_rotation_import_metadata_v1.json', imported);
    addJson(zip, 'supabase/auth/users-sanitized.json', data.auth && data.auth.users_sanitized || []);
    addJson(zip, 'supabase/auth/identities-sanitized.json', data.auth && data.auth.identities_sanitized || []);
    addJson(zip, 'supabase/storage/metadata.json', data.storage || { buckets: [], objects: [] });
    addJson(zip, 'supabase/schema/schema-metadata.json', snapshot.schema || {});
    const schema = snapshot.schema || {};
    zip.file('supabase/schema/functions.sql', sqlFromDefinitions(schema.functions, 'definition'));
    zip.file('supabase/schema/triggers.sql', sqlFromDefinitions(schema.triggers, 'definition'));
    return Object.keys(publicData).length;
  }

  async function addStorageObjectBytes(zip, snapshot, token, progress) {
    const cfg = window.SUPABASE_CONFIG || {};
    const base = String(cfg.url || '').replace(/\/$/, '');
    const key = String(cfg.publishableKey || '');
    const objects = snapshot && snapshot.data && snapshot.data.storage && Array.isArray(snapshot.data.storage.objects) ? snapshot.data.storage.objects : [];
    let done = 0;
    for (const object of objects) {
      const bucket = String(object && object.bucket_id || '');
      const name = String(object && object.name || '');
      if (!bucket || !name) throw new Error('Storage metadata obsahují neúplný objekt.');
      const url = base + '/storage/v1/object/authenticated/' + encodeURIComponent(bucket) + '/' + encodePath(name);
      const response = await fetch(url, { cache: 'no-store', headers: { apikey: key, Authorization: 'Bearer ' + token } });
      if (!response.ok) throw new Error('Úplná záloha se zastavila: Storage objekt ' + bucket + '/' + name + ' nelze stáhnout (HTTP ' + response.status + ').');
      zip.file('supabase/storage-files/' + safePart(bucket) + '/' + name.split('/').map(safePart).join('/'), await response.arrayBuffer(), { binary: true });
      done += 1;
      progress('Supabase Storage: ' + done + '/' + objects.length);
    }
    return objects.length;
  }

  function buildRestoreReadme(snapshot, metrics) {
    const exclusions = Array.isArray(snapshot && snapshot.sensitive_exclusions) ? snapshot.sensitive_exclusions : [];
    return [
      'RaK – ÚPLNÁ ZÁLOHA / DISASTER RECOVERY',
      '========================================',
      '',
      'Vytvořeno: ' + String(snapshot && snapshot.generated_at || new Date().toISOString()),
      'RaK verze: ' + String(window.RAK_RELEASE_VERSION || window.RAK_TEST_DISPLAY_VERSION || '—'),
      'Git SHA: ' + RAK_COMPLETE_BACKUP_BUILD_SHA,
      'Supabase projekt: ' + String((window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url) || '').replace(/^https?:\/\//, '').split('.')[0],
      '',
      'OBSAH',
      '-----',
      'repository/source-exact.zip  přesný buildem ověřený Git archiv pro uvedený SHA',
      'deployed-app/          skutečně nasazená/transformovaná PWA verze',
      'supabase/data/         veřejná aplikační data a oddělená soukromá metadata importů',
      'supabase/data/private/  soukromá metadata importů rotace pro obnovu',
      'supabase/auth/         sanitizovaný přehled Auth uživatelů/identit',
      'supabase/schema/       struktura DB, RLS policies, RPC, grants, triggery, indexy...',
      'supabase/storage/      metadata Storage',
      'supabase/storage-files/ fyzické Storage soubory, pokud existovaly',
      'backup-manifest.json   souhrn a kontrolní počty',
      '',
      'OBNOVA – DOPORUČENÉ POŘADÍ',
      '---------------------------',
      '1. Rozbal repository/source-exact.zip a jeho obsah obnov do Git repozitáře na uvedeném SHA.',
      '2. V novém Supabase projektu aplikuj SQL migrace z repository/supabase/migrations/ v pořadí.',
      '3. Zkontroluj supabase/schema/schema-metadata.json proti nové DB (RLS, RPC, grants, triggery, extensions, realtime publikace).',
      // RAK_17055_RESTORE_ORDER_GUARD: FK dependencies and revoked sessions require manual sequencing.
      '4. NEJDŘÍV v novém projektu znovu vytvoř administrátorské Auth účty s novými hesly a vytvoř soukromé mapování staré Auth UUID → nové Auth UUID. Sanitizovaný seznam NENÍ záloha hesel ani relací.',
      '5. Před importem přemapuj rak_admin_profiles.user_id a created_by, rak_admin_audit_log.user_id, rak_admin_settings_backups.created_by a rak_rotation_backups_v2.created_by. Ověř všechny cizí klíče na auth.users a chybějící účty řeš ručně.',
      '6. Importuj závislá aplikační data v pořadí: game_accounts před bug_reports/game_invites/game_sessions/game_stats; rotation_months před rotation_entries; rak_admin_settings_backups nejdřív bez restored_backup_id a pak doplň vazby. Až po nových Auth účtech obnov rak_admin_profiles a admin zálohy.',
      '7. rak_admin_devices z historického JSON NEIMPORTUJ jako aktivní zařízení. Staré záznamy zařízení/relací nepovažuj za platné přihlášení; novou Auth session a nové zařízení musí každý admin zaregistrovat znovu.',
      '8. Obnov soukromá metadata importů ze supabase/data/private/rak_rotation_import_metadata_v1.json a ověř rotation_key/month_key. Soukromé lookup budgety a jejich salt obnov přes migrace/nové výchozí hodnoty, ne přes stará provozní tajemství.',
      '9. Tabulka rak_admin_secrets ani Auth hesla nejsou v ZIP: bezpečně znovu nastav potřebná administrátorská tajemství. private.rak_employee_auth_links není součástí exportu; případné nenulové odkazy vyžadují zvláštní kontrolu (zaměstnanci RaK zůstávají pouze u OS čísla).',
      '10. Pokud existují soubory ve supabase/storage-files/, vytvoř odpovídající buckety a nahraj odpovídající fyzické soubory. Samotná metadata nestačí.',
      '11. Znovu nastav Supabase/Vercel tajné klíče, konfiguraci a environment proměnné mimo ZIP.',
      '12. Ověř počet a obsah všech 19 exportovaných tabulek, počty soukromých importů podle manifestu, cizí klíče, role owner/admin/deputy a přihlášení z nových zařízení. Teprve pak nasaď aplikaci a proveď critical runtime + security smoke.',
      '13. SQL shadow test v původní databázi není nezávislá obnova; až úspěšné obnovení do odděleného projektu s Auth/Storage, migracemi a role testy uzavírá disaster recovery.',
      '',
      'ZÁMĚRNĚ NEZAHRNUTO',
      '------------------',
      ...(exclusions.length ? exclusions.map((x) => '- ' + x) : ['- aktivní tajné klíče a relace']),
      '',
      'POZNÁMKA',
      '--------',
      'Tento balík je obnovovací snapshot RaK se záměrnou redakcí aktivních tajemství. NENÍ to automaticky spustitelná obnova: Auth účty, vazby a privilegia je nutné bezpečně znovu vytvořit a ověřit.',
      'Pro maximálně věrnou platformní kopii interních Supabase Auth/system tabulek lze navíc použít oficiální Supabase db dump (roles + schema + data).',
      '',
      'KONTROLNÍ POČTY',
      '---------------',
      'Repo souborů: ' + String(metrics.repositoryFiles || 0),
      'Nasazených PWA souborů: ' + String(metrics.deployedFiles || 0),
      'Aplikačních tabulek: ' + String(metrics.publicTables || 0),
      'Soukromých importů: ' + String(metrics.privateImports || 0),
      'Sanitizovaných Auth účtů: ' + String(metrics.sanitizedAuthAccounts || 0),
      'Řádků aplikačních tabulek: ' + String(metrics.publicRows || 0),
      'Soukromých záznamů importu: ' + String(metrics.privateImportRows || 0),
      'Storage objektů: ' + String(metrics.storageObjects || 0),
      ''
    ].join('\n');
  }

  function triggerDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
  }

  async function createCompleteBackup() {
    if (!isOwnerUi()) throw new Error('Úplnou zálohu může vytvořit jen hlavní admin.');
    if (!navigator.onLine) throw new Error('Úplná záloha vyžaduje připojení k internetu.');
    const JSZip = await ensureZip();
    status('Připravuji úplnou zálohu…');
    const token = await ownerAccessToken();
    status('Načítám aktuální Supabase data a strukturu…');
    const snapshot = await fetchCompleteSnapshot(token);
    const zip = new JSZip();
    const metrics = { repositoryFiles: 0, deployedFiles: 0, publicTables: 0, storageObjects: 0, privateImportRows: 0 };
    { const validated = validateCompleteSnapshot(snapshot); Object.assign(metrics, { privateImports: validated.privateImports, sanitizedAuthAccounts: validated.sanitizedAuthAccounts, schemaTables: validated.schemaTables, completePublicTables: validated.completePublicTables, publicRows: validated.publicRows }); }
    const progress = (text) => status(text);
    metrics.publicTables = addSupabaseSnapshotFiles(zip, snapshot);
    metrics.privateImportRows = snapshot.data.private.rak_rotation_import_metadata_v1.length;
    metrics.storageObjects = await addStorageObjectBytes(zip, snapshot, token, progress);
    status('Stahuji přesný zdrojový snapshot GitHubu…');
    metrics.repositoryFiles = await addRepositorySnapshot(zip, progress);
    status('Přidávám skutečně nasazenou PWA…');
    metrics.deployedFiles = await addDeployedSnapshot(zip, progress);
    const manifest = {
      format: 'rak-one-click-complete-backup-v1',
      createdAt: new Date().toISOString(),
      appVersion: String(window.RAK_RELEASE_VERSION || window.RAK_TEST_DISPLAY_VERSION || ''),
      pwaBuild: String(window.RAK_PWA_BUILD || ''),
      git: { repository: RAK_COMPLETE_BACKUP_REPO, sha: RAK_COMPLETE_BACKUP_BUILD_SHA },
      supabaseProjectRef: String((window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url) || '').replace(/^https?:\/\//, '').split('.')[0],
      metrics,
      sensitiveExclusions: snapshot.sensitive_exclusions || [],
      restoreReadme: 'README-OBNOVA.txt'
    };
    addJson(zip, 'backup-manifest.json', manifest);
    zip.file('README-OBNOVA.txt', buildRestoreReadme(snapshot, metrics));
    status('Komprimuji úplnou zálohu…');
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }, (meta) => {
      if (meta && Number.isFinite(meta.percent)) status('Komprimuji úplnou zálohu… ' + Math.round(meta.percent) + ' %');
    });
    const fileName = 'RaK_uplna_zaloha_' + timestampForFile(new Date()) + '.zip';
    triggerDownload(blob, fileName);
    status('Úplná záloha připravena ✓ · ' + bytesLabel(blob.size) + ' · ' + metrics.repositoryFiles + ' repo souborů · ' + metrics.publicTables + ' DB tabulek · ' + metrics.storageObjects + ' Storage souborů');
    return { ok: true, blobSize: blob.size, fileName, metrics, manifest };
  }

  window.rakCreateCompleteBackup = createCompleteBackup;
  window.getRakCompleteBackupHealth = function getRakCompleteBackupHealth() {
    return { ready: typeof window.rakCreateCompleteBackup === 'function', repositoryFileCount: RAK_COMPLETE_BACKUP_REPO_FILES.length, buildSha: RAK_COMPLETE_BACKUP_BUILD_SHA, rpc: MANIFEST_RPC_NAME, tableRpc: TABLE_RPC_NAME, legacyRpc: LEGACY_RPC_NAME, dbParallelism: MAX_PARALLEL_DB_FETCHES, secretRedaction: true, storageBytesRequired: true, mode: 'one-click-disaster-recovery-v1-chunked-v2' };
  };

  document.addEventListener('click', (event) => {
    const target = event.target && event.target.closest ? event.target.closest('[data-admin-action="create-complete-rak-backup"]') : null;
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (target.dataset.rakCompleteBackupRunning === '1') return;
    if (!isOwnerUi()) {
      status('Úplnou zálohu může vytvořit jen hlavní admin.');
      return;
    }
    if (!confirm('Vytvořit obnovovací ZIP RaK? Obsahuje zdroj, PWA, aplikační data a strukturu DB/Storage. Hesla, relace a klíče chybí záměrně: obnova vyžaduje nová Auth přihlášení, přemapování účtů a samostatné ověření.')) return;
    target.dataset.rakCompleteBackupRunning = '1';
    target.disabled = true;
    createCompleteBackup().catch((err) => {
      const message = err && err.message ? err.message : String(err || 'Neznámá chyba');
      status('Úplná záloha selhala: ' + message);
      try { alert('Úplná záloha RaK se nepovedla: ' + message); } catch (_) {}
    }).finally(() => {
      delete target.dataset.rakCompleteBackupRunning;
      target.disabled = false;
    });
  }, true);
})();
