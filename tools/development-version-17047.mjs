#!/usr/bin/env node
// RaK 1.7.47 / TEST-only: public JSON identifier guard + private settings isolation + deep backup validation.
// Employee sign-in remains OS-number only. Existing rotation, statistics, generator and offline payload unchanged.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const VERSION = '1.7.47';
const BUILD = 'v1.7.47-privacyguard1';
const PREVIOUS = 'v1.7.46-hardening1';
const read = path => fs.readFileSync(path, 'utf8');
function swap(source, oldText, newText, label) {
  if (source.includes(oldText)) {
    assert.equal(source.split(oldText).length, 2, '[17047] duplicate ' + label);
    return source.replace(oldText, newText);
  }
  assert(source.includes(newText), '[17047] missing ' + label);
  return source;
}
function change(path, transform) {
  const old = read(path);
  // Historical gates need ALL edits on the first pass and NONE on the second.
  // Never skip individual swaps inside the first transform: that loses allowlist entries.
  if ((path === 'tools/release-gate-17043.test.mjs' && old.includes("'1.7.47': 'v1.7.47-privacyguard1'")) ||
      (path === 'tools/release-gate-17045.test.mjs' && old.includes('(45|46|47)')) ||
      (path === 'tools/release-gate-17046.test.mjs' && old.includes('(46|47)'))) return old;
  const next = transform(old);
  if (old !== next) fs.writeFileSync(path, next, 'utf8');
  return next;
}
const migrationPath = 'supabase/migrations/20260919153000_rak_17047_privacy_keys_machine_guard_backup_months.sql';
const migration = read(migrationPath);
const matrix = read('tools/privacy-backup-matrix-17047.sql');
for (const marker of ['private.rak_rotation_has_restricted_public_key', "'accountnumber'", "'osnumber'",
  "'workers'", 'rak_machine_settings_no_public_leak_v1', 'v_type = ANY(v_private_categories)',
  'rak_rotation_backup_months_shape_v1', 'REVOKE ALL ON FUNCTION'])
  assert(migration.includes(marker), '[17047] migration missing ' + marker);
for (const marker of ['BEGIN;', 'ROLLBACK;', 'SET LOCAL ROLE anon;',
  'public machine identifier was not blocked', 'corrupted backup insert did not fail closed',
  'private roster update blocked', 'private helper privilege regression'])
  assert(matrix.includes(marker), '[17047] matrix missing ' + marker);
change('tools/release-gate-17043.test.mjs', source => {
  source = swap(source, '(43|44|45|46)', '(43|44|45|46|47)', 'historical 17043 version range');
  source = swap(source, "'1.7.46': 'v1.7.46-hardening1'",
    "'1.7.46': 'v1.7.46-hardening1',\n  '1.7.47': 'v1.7.47-privacyguard1'", 'historical build allowlist');
  source = swap(source, "if (version === '1.7.46') ids.push('17046');",
    "if (version === '1.7.46' || version === '1.7.47') ids.push('17046');\n  if (version === '1.7.47') ids.push('17047');",
    'historical replay list');
  return swap(source, "  if (version === '1.7.46') {\n    assert(stage.includes('const already17045=already17046||indexSource.includes('));",
    "  if (version === '1.7.47') {\n    assert(stage.includes('const already17046=already17047||indexSource.includes('));\n    assert(stage.includes(`already17047?\"var build='${build}';\":already17046?`));\n  } else if (version === '1.7.46') {\n    assert(stage.includes('const already17045=already17046||indexSource.includes('));",
    'historical final replay verification');
});
change('tools/release-gate-17045.test.mjs', source => {
  source = swap(source, '(45|46)', '(45|46|47)', 'historical 17045 version range');
  source = swap(source,
    "assert.equal(build, version === '1.7.45' ? historicalBuild : 'v1.7.46-hardening1');",
    "assert.equal(build, version === '1.7.45' ? historicalBuild : version === '1.7.46' ? 'v1.7.46-hardening1' : 'v1.7.47-privacyguard1');",
    'historical admin gate allowlist');
  return swap(source,
    "  if (version === '1.7.46') assert(stage.includes(`already17046?\"var build='${build}';\":already17045?`));",
    "  if (version === '1.7.46' || version === '1.7.47') assert(stage.includes(`already17046?\"var build='${'v1.7.46-hardening1'}';\":already17045?`));\n  if (version === '1.7.47') assert(stage.includes(`already17047?\"var build='${build}';\":already17046?`));",
    'historical 17045 replay assertion');
});
change('tools/release-gate-17046.test.mjs', source => {
  source = swap(source, "const VERSION='1.7.46',BUILD='v1.7.46-hardening1';",
    "const observed=read('index.html').match(/var build='(v1\\.7\\.(46|47)-[a-z0-9]+)';/);\nassert(observed, '[17046] unrecognized final build');\nconst VERSION='1.7.'+observed[2],BUILD=observed[1];\nconst HISTORICAL_BUILD='v1.7.46-hardening1';\nassert.equal(BUILD,VERSION==='1.7.46'?HISTORICAL_BUILD:'v1.7.47-privacyguard1');",
    'historical 17046 version range');
  source = swap(source,
    " for(const id of ['17039','17040','17041','17042','17043','17044','17045','17046'])",
    " for(const id of (VERSION==='1.7.47'?['17039','17040','17041','17042','17043','17044','17045','17046','17047']:['17039','17040','17041','17042','17043','17044','17045','17046']))",
    'historical replay list');
  return swap(source, " assert(stage.includes(`already17046?\"var build='${BUILD}';\":already17045?`));",
    " assert(stage.includes(`already17046?\"var build='${HISTORICAL_BUILD}';\":already17045?`));\n if(VERSION==='1.7.47')assert(stage.includes(`already17047?\"var build='${BUILD}';\":already17046?`));",
    'historical 17046 marker');
});
change('tools/shift-report-mo-hotfix-170-smoke.mjs', source => {
  if (source.includes('// RAK_17047_TWO_PASS_GUARD')) return source;
  source = swap(source,
    `// RAK_17046_TWO_PASS_GUARD\nconst already17046=indexSource.includes("var build='${PREVIOUS}';");`,
    `// RAK_17046_TWO_PASS_GUARD\n// RAK_17047_TWO_PASS_GUARD\nconst already17047=indexSource.includes("var build='${BUILD}';");\nconst already17046=already17047||indexSource.includes("var build='${PREVIOUS}';");`,
    'two-pass detector');
  return swap(source,
    `already17046?"var build='${PREVIOUS}';":already17045?`,
    `already17047?"var build='${BUILD}';":already17046?"var build='${PREVIOUS}';":already17045?`,
    'two-pass output marker');
});
change('supabase-config.js', source => {
  assert(source.includes('https://cgshssdjgzzuprlwnabl.supabase.co')
    && !source.includes('bkqamcbkiwumsvelahxr'), '[17047] TEST Supabase isolation');
  source = swap(source, 'window.RAK_RELEASE_VERSION = "1.7.46";', `window.RAK_RELEASE_VERSION = "${VERSION}";`, 'config release');
  source = swap(source, 'window.RAK_TEST_DISPLAY_VERSION = "1.7.46";', `window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`, 'config display');
  return swap(source, `window.RAK_PWA_BUILD = "${PREVIOUS}";`, `window.RAK_PWA_BUILD = "${BUILD}";`, 'config build');
});
change('app.js', source => {
  source = swap(source, `const RAK_DEV_UPDATE_BUILD = "${PREVIOUS}";`, `const RAK_DEV_UPDATE_BUILD = "${BUILD}";`, 'app build');
  return swap(source, 'window.RAK_RELEASE_VERSION = "1.7.46";', `window.RAK_RELEASE_VERSION = "${VERSION}";`, 'app release');
});
change('sw.js', source => {
  assert(source.includes("const SW_APP_VERSION = '1.7.0';"), '[17047] technical version drift');
  source = swap(source, "const CACHE_VERSION = 'v1.7.46';", `const CACHE_VERSION = 'v${VERSION}';`, 'cache');
  source = swap(source, "const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.46';", `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`, 'SW display');
  return swap(source, `const DEVELOPMENT_BUILD_ID = '${PREVIOUS}';`, `const DEVELOPMENT_BUILD_ID = '${BUILD}';`, 'SW build');
});
change('index.html', source => swap(source, `var build='${PREVIOUS}';`, `var build='${BUILD}';`, 'HTML build'));
const stage = read('tools/shift-report-mo-hotfix-170-smoke.mjs');
for (const id of ['17039','17040','17041','17042','17043','17044','17045','17046','17047'])
  assert(stage.includes(`// RAK_${id}_TWO_PASS_GUARD`), '[17047] missing two-pass guard '+id);
assert(stage.includes(`const already17046=already17047||indexSource.includes("var build='${PREVIOUS}';");`)
  && stage.includes(`already17047?"var build='${BUILD}';":already17046?`), '[17047] repeated build mismatch');
assert.equal(JSON.parse(read('package.json')).version, '1.7.0');
assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"), '[17047] employee login changed');
assert(read('rak-complete-backup.js').includes('RAK_PRIVATE_IMPORT_BACKUP_17042'), '[17047] private archive missing');
for (const file of ['tools/development-version-17047.mjs','tools/release-gate-17043.test.mjs','tools/release-gate-17045.test.mjs','tools/release-gate-17046.test.mjs','tools/shift-report-mo-hotfix-170-smoke.mjs','supabase-config.js','app.js','sw.js'])
  execFileSync(process.execPath, ['--check', file], {stdio:'pipe'});
execFileSync(process.execPath, ['--test','tools/release-gate-17047.test.mjs'], {stdio:'inherit'});
console.log('[development-version-17047] OK: identifiers & public machine settings protected; backup month structure; TEST DB; OS-only login; PWA 1.7.47');
