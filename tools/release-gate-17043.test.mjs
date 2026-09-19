import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const version = '1.7.43';
const build = 'v1.7.43-cigate1';
test('exact final release version, cache, package and test database match', () => {
  for (const [path, expected] of [
    ['index.html', `var build='${build}';`],
    ['app.js', `const RAK_DEV_UPDATE_BUILD = "${build}";`],
    ['app.js', `window.RAK_RELEASE_VERSION = "${version}";`],
    ['supabase-config.js', `window.RAK_RELEASE_VERSION = "${version}";`],
    ['supabase-config.js', `window.RAK_TEST_DISPLAY_VERSION = "${version}";`],
    ['supabase-config.js', `window.RAK_PWA_BUILD = "${build}";`],
    ['sw.js', `const CACHE_VERSION = 'v${version}';`],
    ['sw.js', `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${version}';`],
    ['sw.js', `const DEVELOPMENT_BUILD_ID = '${build}';`],
    ['sw.js', "const SW_APP_VERSION = '1.7.0';"]])
    assert(read(path).includes(expected), `Incorrect final ${path}: ${expected}`);
  assert.equal(JSON.parse(read('package.json')).version, '1.7.0');
  assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl'));
  assert(!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
});
test('all historical replay guards and private backup survive', () => {
  const stage = read('tools/shift-report-mo-hotfix-170-smoke.mjs');
  for (const id of ['17039','17040','17041','17042','17043'])
    assert(stage.includes(`// RAK_${id}_TWO_PASS_GUARD`));
  assert(stage.includes('const already17042=already17043||indexSource.includes('));
  assert(stage.includes(`already17043?"var build='${build}';":already17042?`));
  assert(read('rak-complete-backup.js').includes("'supabase/data/private/rak_rotation_import_metadata_v1.json'"));
  assert(read('rak-complete-backup.js').includes('privateKeys.length !== 1'));
});
test('CI tests two builds and previous release checks do not pin stale final version', () => {
  const workflow = read('.github/workflows/rak-development-validation.yml');
  assert(workflow.includes('npm run vercel-build\n          npm run vercel-build'));
  assert(workflow.includes('node --test tools/release-gate-17043.test.mjs'));
  const oldGate = read('tools/two-pass-release-17041.test.mjs');
  assert(oldGate.includes('observedBuild'));
  assert(oldGate.includes('latest release metadata remains consistent'));
});
