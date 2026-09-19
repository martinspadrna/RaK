#!/usr/bin/env node
// RaK 1.7.28: staged privacy closure of empty legacy rotation tables in TEST Supabase.
// The separate test-only SQL migration revokes direct reads; this stage tracks the visible PWA version.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION = '1.7.28';
const BUILD = 'v1.7.28-rotationprivacy1';
const read = path => fs.readFileSync(path, 'utf8');
const change = (path, transform) => {
  const original = read(path);
  const updated = transform(original);
  if (updated !== original) fs.writeFileSync(path, updated, 'utf8');
  return updated;
};
function swap(source, before, after, label) {
  if (source.includes(before)) {
    assert.equal(source.split(before).length, 2, '[17028] duplicate anchor: ' + label);
    return source.replace(before, after);
  }
  assert(source.includes(after), '[17028] missing anchor: ' + label);
  return source;
}
change('tools/shift-report-mo-hotfix-170-smoke.mjs', source => {
  if (source.includes('// RAK_17028_TWO_PASS_GUARD')) return source;
  source = swap(source,
    'const already17027=indexSource.includes("var build=\'v1.7.27-directoryrpc1\';");',
    '// RAK_17028_TWO_PASS_GUARD\nconst already17028=indexSource.includes("var build=\'v1.7.28-rotationprivacy1\';");\nconst already17027=already17028||indexSource.includes("var build=\'v1.7.27-directoryrpc1\';");',
    'second-pass release detection');
  return swap(source,
    'already17027?"var build=\'v1.7.27-directoryrpc1\';":already17026?',
    'already17028?"var build=\'v1.7.28-rotationprivacy1\';":already17027?"var build=\'v1.7.27-directoryrpc1\';":already17026?',
    'second-pass latest reset');
});
change('supabase-config.js', source => {
  assert(source.includes('https://cgshssdjgzzuprlwnabl.supabase.co') && !source.includes('bkqamcbkiwumsvelahxr'), '[17028] development must use test Supabase only');
  source = swap(source, 'window.RAK_RELEASE_VERSION = "1.7.27";', `window.RAK_RELEASE_VERSION = "${VERSION}";`, 'release');
  source = swap(source, 'window.RAK_TEST_DISPLAY_VERSION = "1.7.27";', `window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`, 'display');
  return swap(source, 'window.RAK_PWA_BUILD = "v1.7.27-directoryrpc1";', `window.RAK_PWA_BUILD = "${BUILD}";`, 'PWA build');
});
change('app.js', source => {
  source = swap(source, 'const RAK_DEV_UPDATE_BUILD = "v1.7.27-directoryrpc1";', `const RAK_DEV_UPDATE_BUILD = "${BUILD}";`, 'update build');
  return swap(source, 'window.RAK_RELEASE_VERSION = "1.7.27";', `window.RAK_RELEASE_VERSION = "${VERSION}";`, 'app release');
});
change('sw.js', source => {
  assert(source.includes("const SW_APP_VERSION = '1.7.0';"), '[17028] technical version changed');
  source = swap(source, "const CACHE_VERSION = 'v1.7.27';", `const CACHE_VERSION = 'v${VERSION}';`, 'cache');
  source = swap(source, "const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.27';", `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`, 'worker display');
  return swap(source, "const DEVELOPMENT_BUILD_ID = 'v1.7.27-directoryrpc1';", `const DEVELOPMENT_BUILD_ID = '${BUILD}';`, 'worker build');
});
change('index.html', source => swap(source, "var build='v1.7.27-directoryrpc1';", `var build='${BUILD}';`, 'index build'));
assert.equal(JSON.parse(read('package.json')).version, '1.7.0', '[17028] technical package version');
for (const path of ['tools/shift-report-mo-hotfix-170-smoke.mjs', 'supabase-config.js', 'app.js', 'sw.js']) {
  execFileSync(process.execPath, ['--check', path], {stdio:'pipe'});
}
assert(read('index.html').includes(`var build='${BUILD}';`) && read('sw.js').includes(`const CACHE_VERSION = 'v${VERSION}';`), '[17028] release/cache mismatch');
const login = read('rak-user-profile.js');
const v1 = login.includes("client.rpc('rak_lookup_account_for_login_v1'");
const v2 = login.includes("client.rpc('rak_lookup_account_for_login_v2'");
assert((v1 || v2) && !(v1 && v2) && !login.includes(".from('game_accounts')"), '[17028] login must use a single bounded RPC');
if (v2) assert(login.includes("typeof data.requiresAdminAuth !== 'boolean'") && login.includes('requiresAdminAuth: data.requiresAdminAuth'), '[17028] v2 admin flag must fail closed');
assert(read('rak-account-access.js').includes('listApplicationAccountsSecure') && !read('rak-account-access.js').includes(".from('game_accounts')"), '[17028] admin directory must be gated');
console.log('[development-version-17028] OK 1.7.28: scoped login/directory preserved; test-only empty legacy rotation tables closed via independent migration; PWA version/cache aligned');
await import('./development-version-17029.mjs');
