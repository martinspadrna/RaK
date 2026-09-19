#!/usr/bin/env node
// RaK 1.7.31: preserve complete privacy migrations and bump the test PWA in one release.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

const VERSION = '1.7.31';
const BUILD = 'v1.7.31-privacybundle1';
const read = path => fs.readFileSync(path, 'utf8');
function change(path, transform) {
  const before = read(path);
  const after = transform(before);
  if (before !== after) fs.writeFileSync(path, after, 'utf8');
  return after;
}
function swap(source, before, after, label) {
  if (source.includes(before)) {
    assert.equal(source.split(before).length, 2, '[17031] duplicate anchor: ' + label);
    return source.replace(before, after);
  }
  assert(source.includes(after), '[17031] missing anchor: ' + label);
  return source;
}
const announcementMigration = read('supabase/migrations/20260918220431_rak_announcements_hide_inactive_from_public_reads.sql');
const rosterMigration = read('supabase/migrations/20260918220817_rak_machine_settings_hide_disguised_roster_payloads.sql');
const roleMatrix = read('tools/security-privacy-bundle-matrix.sql');
assert(announcementMigration.includes('rak_announcements_active_public_read_v3') && announcementMigration.includes('rak_announcements_active_or_admin_read_v3') && announcementMigration.includes('is_active IS TRUE'), '[17031] archived-announcement privacy migration missing');
assert(rosterMigration.includes('rak_machine_settings_anon_no_roster_payload_v8') && rosterMigration.includes('rak_machine_settings_authenticated_roster_payload_admin_only_v8') && rosterMigration.includes("ARRAY['appAccounts','applicationAccounts','workers']"), '[17031] disguised-roster privacy migration missing');
assert(roleMatrix.includes('SET LOCAL ROLE anon;') && roleMatrix.includes('SET LOCAL ROLE authenticated;') && roleMatrix.includes('rak.privacy_spoof_claims') && roleMatrix.includes('ROLLBACK;'), '[17031] role/regression SQL missing');

change('tools/shift-report-mo-hotfix-170-smoke.mjs', source => {
  if (source.includes('// RAK_17031_TWO_PASS_GUARD')) return source;
  source = swap(source,
    'const already17030=indexSource.includes("var build=\'v1.7.30-archiveprivacy1\';");',
    '// RAK_17031_TWO_PASS_GUARD\nconst already17031=indexSource.includes("var build=\'v1.7.31-privacybundle1\';");\nconst already17030=already17031||indexSource.includes("var build=\'v1.7.30-archiveprivacy1\';");',
    'two-pass marker');
  return swap(source,
    'already17030?"var build=\'v1.7.30-archiveprivacy1\';":already17029?',
    'already17031?"var build=\'v1.7.31-privacybundle1\';":already17030?"var build=\'v1.7.30-archiveprivacy1\';":already17029?',
    'two-pass reset');
});
change('supabase-config.js', source => {
  assert(source.includes('https://cgshssdjgzzuprlwnabl.supabase.co') && !source.includes('bkqamcbkiwumsvelahxr'), '[17031] test Supabase isolation');
  source = swap(source, 'window.RAK_RELEASE_VERSION = "1.7.30";', `window.RAK_RELEASE_VERSION = "${VERSION}";`, 'release');
  source = swap(source, 'window.RAK_TEST_DISPLAY_VERSION = "1.7.30";', `window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`, 'display');
  return swap(source, 'window.RAK_PWA_BUILD = "v1.7.30-archiveprivacy1";', `window.RAK_PWA_BUILD = "${BUILD}";`, 'PWA build');
});
change('app.js', source => {
  source = swap(source, 'const RAK_DEV_UPDATE_BUILD = "v1.7.30-archiveprivacy1";', `const RAK_DEV_UPDATE_BUILD = "${BUILD}";`, 'app build');
  return swap(source, 'window.RAK_RELEASE_VERSION = "1.7.30";', `window.RAK_RELEASE_VERSION = "${VERSION}";`, 'app release');
});
change('sw.js', source => {
  assert(source.includes("const SW_APP_VERSION = '1.7.0';"), '[17031] technical version changed');
  source = swap(source, "const CACHE_VERSION = 'v1.7.30';", `const CACHE_VERSION = 'v${VERSION}';`, 'cache');
  source = swap(source, "const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.30';", `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`, 'worker display');
  return swap(source, "const DEVELOPMENT_BUILD_ID = 'v1.7.30-archiveprivacy1';", `const DEVELOPMENT_BUILD_ID = '${BUILD}';`, 'worker build');
});
change('index.html', source => swap(source, "var build='v1.7.30-archiveprivacy1';", `var build='${BUILD}';`, 'HTML build'));
assert.equal(JSON.parse(read('package.json')).version, '1.7.0', '[17031] technical package version changed');
for (const path of ['tools/development-version-17031.mjs', 'tools/shift-report-mo-hotfix-170-smoke.mjs', 'supabase-config.js', 'app.js', 'sw.js']) {
  execFileSync(process.execPath, ['--check', path], {stdio:'pipe'});
}
assert(read('index.html').includes(`var build='${BUILD}';`) && read('sw.js').includes(`const CACHE_VERSION = 'v${VERSION}';`), '[17031] release/cache mismatch');
console.log('[development-version-17031] OK 1.7.31: two privacy migrations, forged-session SQL matrix, test Supabase, PWA/cache aligned');
await import('./development-version-17032.mjs');
