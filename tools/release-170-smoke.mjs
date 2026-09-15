#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const pkg = JSON.parse(read('package.json'));
const app = read('app.js');
const core = read('core.js');
const sw = read('sw.js');
const config = read('supabase-config.js');
const menu = read('app-menu-pages.js');
const changelog = read('CHANGELOG.md');
const index = read('index.html');
const backup = read('rak-complete-backup.js');
const adminUnlock = read('app-admin-unlock.js');

function arrayEntryCount(source, name) {
  const match = source.match(new RegExp('const ' + name + ' = \\[([\\s\\S]*?)\\n\\];'));
  assert(match, name + ' array missing');
  return (match[1].match(/^\s*['"]/gm) || []).length;
}

assert.equal(pkg.version, '1.7.0', 'package technical version must be 1.7.0');
assert(app.includes('const RAK_MODULE_CACHE_VERSION = "1.7.0";'), 'module cache version mismatch');
assert(app.includes('const RAK_DEV_UPDATE_BUILD = "v1.7.0";'), 'app update build mismatch');
assert(app.includes('window.RAK_RELEASE_VERSION = "1.7";'), 'public release version mismatch');
assert(core.includes('const APP_VERSION = "1.5";'), 'legacy core compatibility marker must stay 1.5');
assert(sw.includes("const CACHE_VERSION = 'v1.7.0';"), 'PWA cache version mismatch');
assert(sw.includes("const SW_APP_VERSION = '1.7.0';"), 'SW technical version mismatch');
assert(sw.includes("const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7';"), 'SW display version mismatch');
assert(sw.includes("const DEVELOPMENT_BUILD_ID = '1.7.0-release2';"), 'SW release build id mismatch');
assert(sw.includes("const RAK_RELEASE_170_POLICY = 'display-1.7;technical-1.7.0;cache-v1.7.0;startup-auth-restore-only;about-production-stability-backup;complete-backup-preserved';"), '1.7 release2 policy marker missing');
assert(sw.includes("const RAK_170_STARTUP_AUTH_HOTFIX_ASSETS = ['./core.js?v=1.7.0', './app-admin-unlock.js?v=1.7.0', './app-menu-pages.js?v=1.7.0'];"), '1.7 startup-auth same-version invalidation assets missing');
assert(sw.includes('RAK_170_STARTUP_AUTH_HOTFIX_ASSETS'), '1.7 startup-auth hotfix assets not wired');
assert(sw.includes("'./core.js?v=1.7.0'"), 'core warm cache not bumped to 1.7.0');
assert(sw.includes("'./qr.js?v=1.7.0'"), 'full QR warm cache not preserved on 1.7.0');
assert(sw.includes("'./app.js?v=1.7.0'"), 'app bootstrap warm cache not bumped to 1.7.0');
assert.equal(arrayEntryCount(sw, 'CORE'), 8, 'CORE count changed during 1.7 release');
assert.equal(arrayEntryCount(sw, 'WARM_START'), 58, 'WARM_START count changed during 1.7 release');

assert(config.includes('window.RAK_RELEASE_VERSION = "1.7";'), 'development runtime display version mismatch');
assert(config.includes('window.RAK_TEST_DISPLAY_VERSION = "1.7";'), 'development test display version mismatch');
assert(config.includes('window.RAK_PWA_BUILD = "v1.7.0-release2";'), 'development PWA build marker mismatch');
assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co'), 'development test Supabase changed');
assert(!config.includes('bkqamcbkiwumsvelahxr'), 'production Supabase leaked into development');
assert(index.includes('<script src="app.js?v=1.7.0"></script>'), 'index bootstrap app.js is not versioned to 1.7.0');

assert(menu.includes("range: 'RaK 1.7'"), 'RaK 1.7 About block missing');
assert(menu.includes("title: 'Výroba, stabilita a zálohování'"), 'RaK 1.7 About title missing');
for (const phrase of [
  'Kalírna se už nepočítá na původní stroj',
  'Úkoly MSKC01',
  'oddělenou Supabase',
  'MutationObserverů',
  'celkový audit aplikace',
  'Úplnou zálohu RaK na jeden klik'
]) assert(menu.includes(phrase), 'About 1.7 summary missing: ' + phrase);
assert(menu.includes("range: 'RaK 1.6'"), 'RaK 1.6 history block must remain');
assert.equal((menu.match(/range:\s*'RaK /g) || []).length, 6, 'About history must contain 1.7 + previous 5 concise groups');
assert(menu.includes("window.RAK_RELEASE_VERSION || versionText || '1.7'"), 'About fallback version must be 1.7');

assert(!adminUnlock.includes("rakAdminLoadSettingsThenCheck('startup')"), 'startup must never trigger admin password flow');
assert(!adminUnlock.includes("rakAdminLoadSettingsThenCheck('settings-loaded')"), 'settings-loaded must never trigger admin password flow');
assert(adminUnlock.includes("rakAdminRestoreSecureSessionForActiveAccount('startup')"), 'silent startup admin restore missing');
assert(adminUnlock.includes("rakAdminRestoreSecureSessionForActiveAccount('settings-loaded')"), 'silent settings-loaded admin restore missing');
assert(adminUnlock.includes('function rakAdminScheduleStartupRestore()'), 'startup restore scheduler missing');
assert(adminUnlock.includes("pass = prompt('Heslo administrace:') || '';"), 'explicit admin password flow must remain available');

assert(changelog.startsWith('## RaK 1.7\n'), 'CHANGELOG must start with RaK 1.7');
assert(changelog.includes('Úplná záloha RaK'), 'CHANGELOG 1.7 backup summary missing');
assert(changelog.includes('nikdy automaticky neotevírá dialog pro heslo administrace'), 'CHANGELOG startup auth fix missing');
assert(changelog.includes('technickou verzi 1.7.0'), 'CHANGELOG 1.7 technical version missing');
assert(backup.includes("const RPC_NAME = 'rak_owner_complete_backup_v1';"), 'complete backup RPC contract missing');
assert(backup.includes("'supabase/complete-snapshot.json'"), 'complete Supabase snapshot contract missing');
assert(backup.includes("'README-OBNOVA.txt'"), 'restore README contract missing');

console.log('[release-170-smoke] OK RaK 1.7 release2: silent startup auth restore, stable legacy core marker, updated About summary, test Supabase and complete backup preserved');
