import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const matched = read('index.html').match(/var build='(v1\.7\.(43|44)-[a-z0-9]+)';/);
assert(matched, 'Expected 1.7.43 or later compatible build marker');
const version = '1.7.' + matched[2];
const build = matched[1];
assert.equal(build, {
  '1.7.43': 'v1.7.43-cigate1',
  '1.7.44': 'v1.7.44-publicguard1'
}[version], 'Unexpected release build marker');

test('final release version, cache, technical package and test database match', () => {
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

test('all inherited replay guards and owner-only backup survive future stage', () => {
  const stage = read('tools/shift-report-mo-hotfix-170-smoke.mjs');
  const ids = ['17039','17040','17041','17042','17043'];
  if (version === '1.7.44') ids.push('17044');
  for (const id of ids) assert(stage.includes(`// RAK_${id}_TWO_PASS_GUARD`));
  if (version === '1.7.44') {
    assert(stage.includes('const already17043=already17044||indexSource.includes('));
    assert(stage.includes(`already17044?"var build='${build}';":already17043?`));
  } else {
    assert(stage.includes('const already17042=already17043||indexSource.includes('));
    assert(stage.includes(`already17043?"var build='${build}';":already17042?`));
  }
  assert(read('rak-complete-backup.js').includes("'supabase/data/private/rak_rotation_import_metadata_v1.json'"));
  assert(read('rak-complete-backup.js').includes('privateKeys.length !== 1'));
});

test('CI verifies two builds and older release check does not freeze final version', () => {
  const workflow = read('.github/workflows/rak-development-validation.yml');
  assert(workflow.includes('npm run vercel-build\n          npm run vercel-build'));
  assert(workflow.includes('node --test tools/release-gate-17043.test.mjs'));
  const oldGate = read('tools/two-pass-release-17041.test.mjs');
  assert(oldGate.includes('observedBuild'));
  assert(oldGate.includes('latest release metadata remains consistent'));
});
