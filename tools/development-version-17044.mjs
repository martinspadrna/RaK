#!/usr/bin/env node
// RaK 1.7.44: guard public rotation against labelled OS numbers and national phones.
// No changes to employee login, generator, rotation payload, or production DB.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const VERSION = '1.7.44';
const BUILD = 'v1.7.44-publicguard1';
const PREVIOUS = 'v1.7.43-cigate1';
const read = path => fs.readFileSync(path, 'utf8');
function swap(source, before, after, label) {
  if (source.includes(before)) {
    assert.equal(source.split(before).length, 2, '[17044] duplicate ' + label);
    return source.replace(before, after);
  }
  assert(source.includes(after), '[17044] missing ' + label);
  return source;
}
function change(file, transform) {
  const original = read(file), next = transform(original);
  if (next !== original) fs.writeFileSync(file, next, 'utf8');
  return next;
}
const migration = read('supabase/history/non-production-migrations/20260919140220_rak_public_rotation_contact_os_guard_v3.sql');
const regression = read('tools/rotation-public-guard-17044.sql');
assert(migration.includes('rak_rotation_has_restricted_public_value') && migration.includes('osobn[íi]')
  && migration.includes('Existing rotation violates 1.7.44 guard'), '[17044] protective migration incomplete');
assert(regression.includes('ROLLBACK;') && regression.includes("has_function_privilege('anon'"),
  '[17044] SQL regression incomplete');
change('tools/shift-report-mo-hotfix-170-smoke.mjs', source => {
  if (source.includes('// RAK_17044_TWO_PASS_GUARD')) return source;
  source = swap(source,
    `// RAK_17043_TWO_PASS_GUARD\nconst already17043=indexSource.includes("var build='${PREVIOUS}';");`,
    `// RAK_17043_TWO_PASS_GUARD\n// RAK_17044_TWO_PASS_GUARD\nconst already17044=indexSource.includes("var build='${BUILD}';");\nconst already17043=already17044||indexSource.includes("var build='${PREVIOUS}';");`,
    'build replay detector');
  return swap(source,
    `already17043?"var build='${PREVIOUS}';":already17042?`,
    `already17044?"var build='${BUILD}';":already17043?"var build='${PREVIOUS}';":already17042?`,
    'build replay marker');
});
change('supabase-config.js', source => {
  assert(source.includes('https://cgshssdjgzzuprlwnabl.supabase.co')
    && !source.includes('bkqamcbkiwumsvelahxr'), '[17044] TEST Supabase mismatch');
  source = swap(source, 'window.RAK_RELEASE_VERSION = "1.7.43";', `window.RAK_RELEASE_VERSION = "${VERSION}";`, 'release');
  source = swap(source, 'window.RAK_TEST_DISPLAY_VERSION = "1.7.43";', `window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`, 'display');
  return swap(source, `window.RAK_PWA_BUILD = "${PREVIOUS}";`, `window.RAK_PWA_BUILD = "${BUILD}";`, 'PWA build');
});
change('app.js', source => {
  source = swap(source, `const RAK_DEV_UPDATE_BUILD = "${PREVIOUS}";`, `const RAK_DEV_UPDATE_BUILD = "${BUILD}";`, 'app build');
  return swap(source, 'window.RAK_RELEASE_VERSION = "1.7.43";', `window.RAK_RELEASE_VERSION = "${VERSION}";`, 'app release');
});
change('sw.js', source => {
  assert(source.includes("const SW_APP_VERSION = '1.7.0';"), '[17044] technical version changed');
  source = swap(source, "const CACHE_VERSION = 'v1.7.43';", `const CACHE_VERSION = 'v${VERSION}';`, 'SW cache');
  source = swap(source, "const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.43';", `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`, 'SW display');
  return swap(source, `const DEVELOPMENT_BUILD_ID = '${PREVIOUS}';`, `const DEVELOPMENT_BUILD_ID = '${BUILD}';`, 'SW build');
});
change('index.html', source => swap(source, `var build='${PREVIOUS}';`, `var build='${BUILD}';`, 'index build'));
const stage = read('tools/shift-report-mo-hotfix-170-smoke.mjs');
for (const id of ['17039','17040','17041','17042','17043','17044'])
  assert(stage.includes(`// RAK_${id}_TWO_PASS_GUARD`), '[17044] lost replay guard ' + id);
assert(stage.includes(`const already17043=already17044||indexSource.includes("var build='${PREVIOUS}';");`)
  && stage.includes(`already17044?"var build='${BUILD}';":already17043?`), '[17044] replay detector mismatch');
assert.equal(JSON.parse(read('package.json')).version, '1.7.0');
assert(read('rak-complete-backup.js').includes('RAK_PRIVATE_IMPORT_BACKUP_17042'), '[17044] owner backup lost');
for (const file of ['tools/development-version-17043.mjs','tools/development-version-17044.mjs',
  'tools/shift-report-mo-hotfix-170-smoke.mjs','supabase-config.js','app.js','sw.js'])
  execFileSync(process.execPath, ['--check', file], {stdio:'pipe'});
execFileSync(process.execPath, ['--test','tools/release-gate-17044.test.mjs'], {stdio:'inherit'});
console.log('[development-version-17044] OK: 13 privacy cases, public guarded values, historical replay, owner backup, TEST DB, OS-only login, PWA 1.7.44');
await import('./development-version-17045.mjs');
