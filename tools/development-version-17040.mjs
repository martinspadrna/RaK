#!/usr/bin/env node
// RaK 1.7.40: private Excel provenance, reduced public rotation read, tested release markers.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { assertRotationRelease, RELEASE } from './rotation-release-gate-17040.mjs';
const { version: VERSION, build: BUILD } = RELEASE;
const read = path => fs.readFileSync(path, 'utf8');
function change(path, transform) {
  const before = read(path);
  const after = transform(before);
  if (after !== before) fs.writeFileSync(path, after, 'utf8');
  return after;
}
function swap(source, before, after, label) {
  if (source.includes(before)) {
    assert.equal(source.split(before).length, 2, '[17040] duplicated ' + label);
    return source.replace(before, after);
  }
  assert(source.includes(after), '[17040] missing ' + label);
  return source;
}
const migration = read('supabase/history/non-production-migrations/20260919111542_rak_rotation_archive_import_provenance.sql');
const matrix = read('tools/security-rotation-minimization-17040.sql');
const document = read('PUBLIC_ROTATION_MINIMIZATION_17040.md');
assert(migration.includes('private.rak_rotation_import_metadata_v1')
  && migration.includes('ENABLE ROW LEVEL SECURITY')
  && migration.includes('rak_rotation_no_public_import_metadata_v1')
  && migration.includes('rak_rotation_no_public_current_employee_name_v1'), '[17040] migration incomplete');
assert(matrix.includes('ROLLBACK;') && matrix.includes('SET LOCAL ROLE anon;')
  && matrix.includes('Future import metadata was not archived'), '[17040] SQL regression missing');
// The living roadmap is independently validated by the shared structural CI contract.
assert(document.includes('OS číslo') && document.includes('offline')
  && document.includes('historie'), '[17040] privacy limitations omitted');
change('tools/shift-report-mo-hotfix-170-smoke.mjs', source => {
  if (source.includes('// RAK_17040_TWO_PASS_GUARD')) return source;
  source = swap(source,
    `// RAK_17039_TWO_PASS_GUARD
const already17039=indexSource.includes("var build='v1.7.39-releasegate1';");`,
    `// RAK_17039_TWO_PASS_GUARD
// RAK_17040_TWO_PASS_GUARD
const already17040=indexSource.includes("var build='${BUILD}';");
const already17039=already17040||indexSource.includes("var build='v1.7.39-releasegate1';");`,
    'second-pass build guard');
  return swap(source,
    `already17039?"var build='v1.7.39-releasegate1';":already17038?`,
    `already17040?"var build='${BUILD}';":already17039?"var build='v1.7.39-releasegate1';":already17038?`,
    'second-pass marker');
});
change('supabase-bridge.js', source => swap(source,
  ".select('*').eq('key', 'main').maybeSingle()",
  ".select('id,key,payload,meta,revision,updated_at').eq('key', 'main').maybeSingle()",
  'explicit public rotation columns'));
change('supabase-config.js', source => {
  assert(source.includes('https://cgshssdjgzzuprlwnabl.supabase.co')
    && !source.includes('bkqamcbkiwumsvelahxr'), '[17040] wrong Supabase');
  source = swap(source, 'window.RAK_RELEASE_VERSION = "1.7.39";', `window.RAK_RELEASE_VERSION = "${VERSION}";`, 'release');
  source = swap(source, 'window.RAK_TEST_DISPLAY_VERSION = "1.7.39";', `window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`, 'display');
  return swap(source, 'window.RAK_PWA_BUILD = "v1.7.39-releasegate1";', `window.RAK_PWA_BUILD = "${BUILD}";`, 'PWA build');
});
change('app.js', source => {
  source = swap(source, 'const RAK_DEV_UPDATE_BUILD = "v1.7.39-releasegate1";', `const RAK_DEV_UPDATE_BUILD = "${BUILD}";`, 'app build');
  return swap(source, 'window.RAK_RELEASE_VERSION = "1.7.39";', `window.RAK_RELEASE_VERSION = "${VERSION}";`, 'app release');
});
change('sw.js', source => {
  assert(source.includes("const SW_APP_VERSION = '1.7.0';"), '[17040] technical version changed');
  source = swap(source, "const CACHE_VERSION = 'v1.7.39';", `const CACHE_VERSION = 'v${VERSION}';`, 'cache');
  source = swap(source, "const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.39';", `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`, 'SW display');
  return swap(source, "const DEVELOPMENT_BUILD_ID = 'v1.7.39-releasegate1';", `const DEVELOPMENT_BUILD_ID = '${BUILD}';`, 'SW build');
});
change('index.html', source => swap(source,
  "var build='v1.7.39-releasegate1';", `var build='${BUILD}';`, 'HTML build'));
const paths = ['index.html', 'supabase-config.js', 'app.js', 'sw.js',
  'supabase-bridge.js', 'package.json', 'RAK_HANDOFF.md',
  'PUBLIC_ROTATION_MINIMIZATION_17040.md',
  'supabase/history/non-production-migrations/20260919111542_rak_rotation_archive_import_provenance.sql',
  'tools/security-rotation-minimization-17040.sql',
  'tools/shift-report-mo-hotfix-170-smoke.mjs'];
const result = assertRotationRelease(Object.fromEntries(paths.map(path => [path, read(path)])));
for (const path of ['tools/development-version-17040.mjs', 'tools/rotation-release-gate-17040.mjs',
  'tools/rotation-release-gate-17040.test.mjs', 'tools/shift-report-mo-hotfix-170-smoke.mjs',
  'supabase-bridge.js', 'supabase-config.js', 'app.js', 'sw.js']) {
  execFileSync(process.execPath, ['--check', path], { stdio: 'pipe' });
}
execFileSync(process.execPath, ['--test', 'tools/rotation-release-gate-17040.test.mjs'], { stdio: 'inherit' });
console.log(`[development-version-17040] OK: ${result.version}; source-only provenance archived on TEST DB; existing rotation/OS login unchanged`);
await import('./development-version-17041.mjs');
