#!/usr/bin/env node
// RaK 1.7.26: password-policy consistency, no eager public directory fetch, visible PWA update.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const VERSION = '1.7.26';
const BUILD = 'v1.7.26-security1';
const read = path => fs.readFileSync(path, 'utf8');
const change = (path, fn) => {
  const before = read(path);
  const after = fn(before);
  if (after !== before) fs.writeFileSync(path, after, 'utf8');
  return after;
};
function swap(source, oldValue, newValue, label) {
  if (source.includes(oldValue)) {
    assert.equal(source.split(oldValue).length, 2, '[17026] non-unique anchor: ' + label);
    return source.replace(oldValue, newValue);
  }
  assert(source.includes(newValue), '[17026] missing anchor: ' + label);
  return source;
}

const edge = read('supabase/functions/rak-admin-users/index.ts');
assert(!edge.includes('newPassword.length < 6') && !edge.includes('password.length < 6'), '[17026] Edge still accepts six-character new passwords');
assert.equal((edge.match(/newPassword\.length < 12/g) || []).length, 2, '[17026] owner/admin change endpoints');
assert(edge.includes('password && (password.length < 12 || password.length > 128)'), '[17026] newly created admin password');
change('module-readiness.js', source => {
  source = swap(source, 'const MIN_PASSWORD_LENGTH = 6;', 'const MIN_PASSWORD_LENGTH = 12;', 'admin input minimum');
  return source.replaceAll('alespoň 6 znaků', 'alespoň 12 znaků').replaceAll('min. 6 znaků', 'min. 12 znaků');
});
change('app-admin-unlock.js', source => {
  const old = (source.match(/newPassword\.length < 6/g) || []).length;
  assert(old === 0 || old === 2, '[17026] unexpected local admin password checks');
  source = source.replaceAll('newPassword.length < 6', 'newPassword.length < 12');
  assert.equal((source.match(/newPassword\.length < 12/g) || []).length, 2, '[17026] owner/own-password checks');
  return source;
});
change('app-menu.js', source => source.replaceAll('alespoň 6 znaků', 'alespoň 12 znaků'));
const accountAccess = change('rak-account-access.js', source => swap(source,
  '    void loadDirectory(false).catch(() => []);',
  '    // Admin directory loads only when its admin page is opened, not on anonymous startup.',
  'do not fetch employee directory before login'));
assert(!accountAccess.includes('void loadDirectory(false).catch(() => []);'), '[17026] anonymous preload still active');

change('tools/shift-report-mo-hotfix-170-smoke.mjs', source => {
  if (source.includes('// RAK_17026_TWO_PASS_GUARD')) return source;
  source = swap(source,
    'const already17025=indexSource.includes("var build=\'v1.7.25-greetings1\';");',
    '// RAK_17026_TWO_PASS_GUARD\nconst already17026=indexSource.includes("var build=\'v1.7.26-security1\';");\nconst already17025=already17026||indexSource.includes("var build=\'v1.7.25-greetings1\';");',
    'second-pass release identification');
  return swap(source,
    'already17025?"var build=\'v1.7.25-greetings1\';":already17024?',
    'already17026?"var build=\'v1.7.26-security1\';":already17025?"var build=\'v1.7.25-greetings1\';":already17024?',
    'second-pass index reset');
});
change('supabase-config.js', source => {
  assert(source.includes('https://cgshssdjgzzuprlwnabl.supabase.co') && !source.includes('bkqamcbkiwumsvelahxr'), '[17026] development must use test Supabase only');
  source = swap(source, 'window.RAK_RELEASE_VERSION = "1.7.25";', `window.RAK_RELEASE_VERSION = "${VERSION}";`, 'release');
  source = swap(source, 'window.RAK_TEST_DISPLAY_VERSION = "1.7.25";', `window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`, 'display');
  return swap(source, 'window.RAK_PWA_BUILD = "v1.7.25-greetings1";', `window.RAK_PWA_BUILD = "${BUILD}";`, 'PWA build');
});
change('app.js', source => {
  source = swap(source, 'const RAK_DEV_UPDATE_BUILD = "v1.7.25-greetings1";', `const RAK_DEV_UPDATE_BUILD = "${BUILD}";`, 'app update');
  return swap(source, 'window.RAK_RELEASE_VERSION = "1.7.25";', `window.RAK_RELEASE_VERSION = "${VERSION}";`, 'app release');
});
change('sw.js', source => {
  assert(source.includes("const SW_APP_VERSION = '1.7.0';"), '[17026] SW technical version changed');
  source = swap(source, "const CACHE_VERSION = 'v1.7.25';", `const CACHE_VERSION = 'v${VERSION}';`, 'cache version');
  source = swap(source, "const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.25';", `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`, 'SW display');
  return swap(source, "const DEVELOPMENT_BUILD_ID = 'v1.7.25-greetings1';", `const DEVELOPMENT_BUILD_ID = '${BUILD}';`, 'SW build');
});
change('index.html', source => swap(source, "var build='v1.7.25-greetings1';", `var build='${BUILD}';`, 'HTML boot marker'));
assert.equal(JSON.parse(read('package.json')).version, '1.7.0', '[17026] package technical version');
for (const path of ['module-readiness.js', 'app-admin-unlock.js', 'app-menu.js', 'rak-account-access.js', 'tools/shift-report-mo-hotfix-170-smoke.mjs', 'supabase-config.js', 'app.js', 'sw.js']) {
  execFileSync(process.execPath, ['--check', path], { stdio: 'pipe' });
}
assert(read('index.html').includes(`var build='${BUILD}';`) && read('sw.js').includes(`const CACHE_VERSION = 'v${VERSION}';`), '[17026] visible version and update cache mismatch');
console.log('[development-version-17026] OK 1.7.26: new admin passwords >=12, anonymous directory prefetch removed, test DB, PWA/cache/app display consistent, two-pass guard');
await import('./development-version-17027.mjs');
