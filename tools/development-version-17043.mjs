#!/usr/bin/env node
// RaK 1.7.43: keep inherited two-pass guards and ensure forward-compatible release checks.
// No employee login, rotation data, or production database modifications.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const VERSION = '1.7.43';
const BUILD = 'v1.7.43-cigate1';
const PREVIOUS = 'v1.7.42-privatebackup1';
const read = file => fs.readFileSync(file, 'utf8');
function swap(text, oldValue, newValue, label) {
  if (text.includes(oldValue)) {
    assert.equal(text.split(oldValue).length, 2, '[17043] duplicate ' + label);
    return text.replace(oldValue, newValue);
  }
  assert(text.includes(newValue), '[17043] missing ' + label);
  return text;
}
function change(file, apply) {
  const before = read(file), after = apply(before);
  if (before !== after) fs.writeFileSync(file, after, 'utf8');
  return after;
}
change('tools/shift-report-mo-hotfix-170-smoke.mjs', text => {
  if (text.includes('// RAK_17043_TWO_PASS_GUARD')) return text;
  text = swap(text,
    `// RAK_17042_TWO_PASS_GUARD\nconst already17042=indexSource.includes("var build='${PREVIOUS}';");`,
    `// RAK_17042_TWO_PASS_GUARD\n// RAK_17043_TWO_PASS_GUARD\nconst already17043=indexSource.includes("var build='${BUILD}';");\nconst already17042=already17043||indexSource.includes("var build='${PREVIOUS}';");`,
    'second-pass detector');
  return swap(text,
    `already17042?"var build='${PREVIOUS}';":already17041?`,
    `already17043?"var build='${BUILD}';":already17042?"var build='${PREVIOUS}';":already17041?`,
    'second-pass marker');
});
change('supabase-config.js', text => {
  assert(text.includes('https://cgshssdjgzzuprlwnabl.supabase.co')
    && !text.includes('bkqamcbkiwumsvelahxr'), '[17043] TEST Supabase mismatch');
  text = swap(text, 'window.RAK_RELEASE_VERSION = "1.7.42";', `window.RAK_RELEASE_VERSION = "${VERSION}";`, 'release');
  text = swap(text, 'window.RAK_TEST_DISPLAY_VERSION = "1.7.42";', `window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`, 'display');
  return swap(text, `window.RAK_PWA_BUILD = "${PREVIOUS}";`, `window.RAK_PWA_BUILD = "${BUILD}";`, 'PWA build');
});
change('app.js', text => {
  text = swap(text, `const RAK_DEV_UPDATE_BUILD = "${PREVIOUS}";`, `const RAK_DEV_UPDATE_BUILD = "${BUILD}";`, 'app build');
  return swap(text, 'window.RAK_RELEASE_VERSION = "1.7.42";', `window.RAK_RELEASE_VERSION = "${VERSION}";`, 'app release');
});
change('sw.js', text => {
  assert(text.includes("const SW_APP_VERSION = '1.7.0';"), '[17043] technical version changed');
  text = swap(text, "const CACHE_VERSION = 'v1.7.42';", `const CACHE_VERSION = 'v${VERSION}';`, 'cache');
  text = swap(text, "const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.42';", `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`, 'SW display');
  return swap(text, `const DEVELOPMENT_BUILD_ID = '${PREVIOUS}';`, `const DEVELOPMENT_BUILD_ID = '${BUILD}';`, 'SW build');
});
change('index.html', text => swap(text, `var build='${PREVIOUS}';`, `var build='${BUILD}';`, 'index build'));
const stage = read('tools/shift-report-mo-hotfix-170-smoke.mjs');
for (const id of ['17039','17040','17041','17042','17043'])
  assert(stage.includes(`// RAK_${id}_TWO_PASS_GUARD`), '[17043] lost two-pass guard ' + id);
assert(stage.includes(`const already17042=already17043||indexSource.includes("var build='${PREVIOUS}';");`)
  && stage.includes(`already17043?"var build='${BUILD}';":already17042?`), '[17043] replay detection mismatch');
assert.equal(JSON.parse(read('package.json')).version, '1.7.0', '[17043] technical version changed');
assert(read('rak-complete-backup.js').includes('RAK_PRIVATE_IMPORT_BACKUP_17042'), '[17043] private backup lost');
for (const file of ['tools/development-version-17043.mjs','tools/shift-report-mo-hotfix-170-smoke.mjs',
  'rak-complete-backup.js','supabase-config.js','app.js','sw.js'])
  execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
execFileSync(process.execPath, ['--test', 'tools/release-gate-17043.test.mjs'], {stdio:'inherit'});
console.log('[development-version-17043] OK: forward-compatible final gates, private backup preserved, test DB, PWA 1.7.43, OS-number login unchanged');
await import('./development-version-17044.mjs');
