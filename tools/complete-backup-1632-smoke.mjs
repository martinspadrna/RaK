#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const moduleJs = read('rak-complete-backup.js');
const app = read('app.js');
const renderer = read('app-menu-admin-renderer.js');
const exportJs = read('export.js');
const sw = read('sw.js');
const config = read('supabase-config.js');
const keepaliveMigration = read('supabase/migrations/20260915124422_audit_keepalive_rpc_only.sql');
const backupMigration = read('supabase/migrations/20260915133113_rak_owner_complete_backup_v1.sql');

assert.match(moduleJs, /const RAK_COMPLETE_BACKUP_BUILD_SHA = '[0-9a-f]{40}';/i, 'exact build SHA missing');
assert(!moduleJs.includes('__RAK_COMPLETE_BACKUP_BUILD_SHA__'), 'SHA placeholder remains');
assert(!moduleJs.includes('RAK_COMPLETE_BACKUP_REPO_FILES */'), 'repository inventory placeholder remains');
const repoEntries = (moduleJs.match(/^    "[^"]+",?$/gm) || []).length;
assert(repoEntries > 80, 'repository inventory unexpectedly small');
assert(moduleJs.includes("const RPC_NAME = 'rak_owner_complete_backup_v1';"), 'owner backup RPC missing');
assert(moduleJs.includes("'repository/' + path"), 'repository snapshot folder missing');
assert(moduleJs.includes("'deployed-app/' + path"), 'deployed runtime snapshot folder missing');
assert(moduleJs.includes("'supabase/complete-snapshot.json'"), 'Supabase complete snapshot missing');
assert(moduleJs.includes("'supabase/auth/users-sanitized.json'"), 'sanitized Auth users snapshot missing');
assert(moduleJs.includes("'/storage/v1/object/authenticated/'"), 'authenticated Storage byte download missing');
assert(moduleJs.includes("'README-OBNOVA.txt'"), 'restore README missing');
assert(moduleJs.includes("'backup-manifest.json'"), 'backup manifest missing');
assert(moduleJs.includes('getAdminAccessToken'), 'admin JWT acquisition missing');
assert(moduleJs.includes('rakAdminCanManageAdmins'), 'owner UI gate missing');
assert(moduleJs.includes('raw.githubusercontent.com') || moduleJs.includes("const RAK_COMPLETE_BACKUP_SOURCE_ARCHIVE = 'rak-complete-backup-source.zip';"), 'exact source snapshot transport missing');
assert(!moduleJs.includes('service_role'), 'frontend module must not contain service-role credential logic');

assert.equal((app.match(/"rak-complete-backup\.js"/g) || []).length, 2, 'module must be admin-lazy and deferred-listed exactly twice');
assert(renderer.includes('data-admin-action="create-complete-rak-backup"'), 'complete backup button missing');
assert(renderer.includes('id="adminCompleteBackupStatus"'), 'complete backup status missing');
assert(exportJs.includes('"rak-complete-backup.js": "src-rak-complete-backup-js"'), 'complete backup source ID missing from export');
assert(exportJs.includes('"rak-complete-backup.js"'), 'complete backup module missing from export JS list');

assert(/const DEVELOPMENT_TEST_DISPLAY_VERSION = '1\.6\.(?:32|33)';/.test(sw), 'SW visible backup version mismatch');
assert(/const DEVELOPMENT_BUILD_ID = '1\.6\.(?:32-backup1|33-backup2)';/.test(sw), 'SW backup build ID mismatch');
assert(sw.includes("const CACHE_VERSION = 'v1.6.0';"), 'stable PWA cache version changed');
assert(sw.includes('DEVELOPMENT_COMPLETE_BACKUP_HOTFIX_ASSETS'), 'complete-backup hotfix assets missing');
assert(/const hotfixAssets = SAME_VERSION_HOTFIX_ASSETS\.concat\([^;]*DEVELOPMENT_COMPLETE_BACKUP_HOTFIX_ASSETS[^;]*\);/.test(sw), 'complete-backup hotfix assets not wired into cache deletion');
assert(/window\.RAK_RELEASE_VERSION = "1\.6\.(?:32|33)";/.test(config), 'runtime release backup version mismatch');
assert(/window\.RAK_TEST_DISPLAY_VERSION = "1\.6\.(?:32|33)";/.test(config), 'runtime display backup version mismatch');
assert(/window\.RAK_PWA_BUILD = "v1\.6\.(?:32-backup1|33-backup2)";/.test(config), 'runtime PWA backup build mismatch');

assert(keepaliveMigration.includes('revoke all on table public.app_keepalive from anon'), 'keepalive anon table revoke missing');
assert(keepaliveMigration.includes('grant execute on function public.rak_app_keepalive'), 'keepalive RPC grant missing');
assert(backupMigration.includes('perform private.rak_require_admin(true);'), 'complete backup RPC is not owner-gated');
assert(backupMigration.includes("and c.relname <> 'rak_admin_secrets'"), 'secret table exclusion missing');
assert(backupMigration.includes("'encrypted_password'"), 'Auth password redaction missing');
assert(backupMigration.includes('revoke all on function public.rak_owner_complete_backup_v1() from anon'), 'anon RPC revoke missing');
assert(backupMigration.includes('grant execute on function public.rak_owner_complete_backup_v1() to authenticated, service_role'), 'authenticated/service-role RPC grant missing');

console.log('[complete-backup-1632-smoke] OK owner-only complete backup base contract; source transport raw-GitHub or same-origin archive; secrets redacted');
