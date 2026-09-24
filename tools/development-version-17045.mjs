#!/usr/bin/env node
// RaK 1.7.45: bounded OS-only login returns the admin gate in one lookup.
// Older PWAs retain a separately rate-limited fallback; never touch main or production DB.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const VERSION = '1.7.45';
const BUILD = 'v1.7.45-logingate1';
const PREVIOUS = 'v1.7.44-publicguard1';
const read = file => fs.readFileSync(file, 'utf8');
function swap(source, before, after, label) {
  if (source.includes(before)) {
    assert.equal(source.split(before).length, 2, '[17045] duplicate ' + label);
    return source.replace(before, after);
  }
  assert(source.includes(after), '[17045] missing ' + label);
  return source;
}
function change(file, fn) {
  const before = read(file), after = fn(before);
  if (before !== after) fs.writeFileSync(file, after, 'utf8');
  return after;
}
const migration = read('supabase/history/non-production-migrations/20260919141936_rak_bounded_admin_gate_and_login_v2.sql');
const sqlTest = read('tools/login-admin-gate-17045.sql');
assert(migration.includes('rak_lookup_account_for_login_v2')
  && migration.includes('rak_lookup_account_for_login_v1(p_last4)')
  && migration.includes("'requiresAdminAuth'")
  && migration.includes('legacy-admin-check-global')
  && migration.includes('legacy-admin-check-ip:')
  && migration.includes('v_hits > 300') && migration.includes('v_hits > 60')
  && migration.includes("RAISE EXCEPTION 'Admin gate rate limited'")
  && migration.includes('SECURITY DEFINER') && migration.includes("SET search_path = ''"),
  '[17045] test migration must combine the lookup and bound the legacy oracle');
assert(sqlTest.includes('SET LOCAL ROLE anon;') && sqlTest.includes('ROLLBACK;')
  && sqlTest.includes('legacy oracle did not fail closed'), '[17045] rollback-only SQL regression missing');
change('rak-user-profile.js', source => {
  if (source.includes('// RAK_LOGIN_ADMIN_GATE_17045')) return source;
  source = swap(source,
    "client.rpc('rak_lookup_account_for_login_v1', { p_last4: suffix })",
    "client.rpc('rak_lookup_account_for_login_v2', { p_last4: suffix })",
    'versioned login RPC');
  return swap(source,
    "      return { ok: true, accountNumber: String(data.accountNumber || '').trim(), fullName: String(data.fullName || '').trim() };",
    "      // RAK_LOGIN_ADMIN_GATE_17045: fail closed if the admin-password flag is absent.\n      if (typeof data.requiresAdminAuth !== 'boolean') return { ok: false, reason: 'admin-gate-unavailable' };\n      return { ok: true, accountNumber: String(data.accountNumber || '').trim(), fullName: String(data.fullName || '').trim(), requiresAdminAuth: data.requiresAdminAuth };",
    'boolean admin prompt flag');
});
change('rak-account-access.js', source => {
  if (source.includes('// RAK_LOGIN_GATE_SINGLE_LOOKUP_17045')) return source;
  return swap(source,
    '      const needsPassword = await accountNeedsAdminPassword(profile.accountNumber);',
    "      // RAK_LOGIN_GATE_SINGLE_LOOKUP_17045: old test clients retain the bounded fallback.\n      const needsPassword = typeof result.requiresAdminAuth === 'boolean'\n        ? result.requiresAdminAuth : await accountNeedsAdminPassword(profile.accountNumber);",
    'single bounded login');
});
change('tools/shift-report-mo-hotfix-170-smoke.mjs', source => {
  if (source.includes('// RAK_17045_TWO_PASS_GUARD')) return source;
  source = swap(source,
    `// RAK_17044_TWO_PASS_GUARD\nconst already17044=indexSource.includes("var build='${PREVIOUS}';");`,
    `// RAK_17044_TWO_PASS_GUARD\n// RAK_17045_TWO_PASS_GUARD\nconst already17045=indexSource.includes("var build='${BUILD}';");\nconst already17044=already17045||indexSource.includes("var build='${PREVIOUS}';");`,
    'replay detection');
  return swap(source,
    `already17044?"var build='${PREVIOUS}';":already17043?`,
    `already17045?"var build='${BUILD}';":already17044?"var build='${PREVIOUS}';":already17043?`,
    'replay marker');
});
change('supabase-config.js', source => {
  assert(source.includes('https://cgshssdjgzzuprlwnabl.supabase.co')
    && !source.includes('bkqamcbkiwumsvelahxr'), '[17045] TEST Supabase mismatch');
  source = swap(source, 'window.RAK_RELEASE_VERSION = "1.7.44";', `window.RAK_RELEASE_VERSION = "${VERSION}";`, 'release');
  source = swap(source, 'window.RAK_TEST_DISPLAY_VERSION = "1.7.44";', `window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`, 'display');
  return swap(source, `window.RAK_PWA_BUILD = "${PREVIOUS}";`, `window.RAK_PWA_BUILD = "${BUILD}";`, 'PWA build');
});
change('app.js', source => {
  source = swap(source, `const RAK_DEV_UPDATE_BUILD = "${PREVIOUS}";`, `const RAK_DEV_UPDATE_BUILD = "${BUILD}";`, 'app build');
  return swap(source, 'window.RAK_RELEASE_VERSION = "1.7.44";', `window.RAK_RELEASE_VERSION = "${VERSION}";`, 'app release');
});
change('sw.js', source => {
  assert(source.includes("const SW_APP_VERSION = '1.7.0';"), '[17045] technical version changed');
  source = swap(source, "const CACHE_VERSION = 'v1.7.44';", `const CACHE_VERSION = 'v${VERSION}';`, 'cache');
  source = swap(source, "const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.44';", `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`, 'SW display');
  return swap(source, `const DEVELOPMENT_BUILD_ID = '${PREVIOUS}';`, `const DEVELOPMENT_BUILD_ID = '${BUILD}';`, 'SW build');
});
change('index.html', source => swap(source, `var build='${PREVIOUS}';`, `var build='${BUILD}';`, 'index build'));
const stage = read('tools/shift-report-mo-hotfix-170-smoke.mjs');
for (const id of ['17039','17040','17041','17042','17043','17044','17045'])
  assert(stage.includes(`// RAK_${id}_TWO_PASS_GUARD`), '[17045] missing replay guard ' + id);
assert(stage.includes(`const already17044=already17045||indexSource.includes("var build='${PREVIOUS}';");`)
  && stage.includes(`already17045?"var build='${BUILD}';":already17044?`), '[17045] replay detector mismatch');
assert.equal(JSON.parse(read('package.json')).version, '1.7.0');
assert(read('rak-complete-backup.js').includes('RAK_PRIVATE_IMPORT_BACKUP_17042'), '[17045] private owner backup missing');
for (const file of ['tools/development-version-17045.mjs', 'rak-user-profile.js', 'rak-account-access.js',
  'tools/shift-report-mo-hotfix-170-smoke.mjs', 'supabase-config.js', 'app.js', 'sw.js'])
  execFileSync(process.execPath, ['--check', file], {stdio:'pipe'});
execFileSync(process.execPath, ['--test', 'tools/release-gate-17045.test.mjs'], {stdio:'inherit'});
console.log('[development-version-17045] OK: one bounded OS lookup, admin password preserved, old PWA oracle limited, 2-pass gate, isolated DB and PWA 1.7.45');
await import('./development-version-17046.mjs');
