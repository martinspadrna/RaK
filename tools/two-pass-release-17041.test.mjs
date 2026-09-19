import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const version = '1.7.41';
const build = 'v1.7.41-twopass1';
test('final 1.7.41 markers match after repeated build', () => {
  for (const [path, marker] of [
    ['index.html', `var build='${build}';`],
    ['app.js', `const RAK_DEV_UPDATE_BUILD = "${build}";`],
    ['app.js', `window.RAK_RELEASE_VERSION = "${version}";`],
    ['supabase-config.js', `window.RAK_RELEASE_VERSION = "${version}";`],
    ['supabase-config.js', `window.RAK_TEST_DISPLAY_VERSION = "${version}";`],
    ['supabase-config.js', `window.RAK_PWA_BUILD = "${build}";`],
    ['sw.js', `const CACHE_VERSION = 'v${version}';`],
    ['sw.js', `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${version}';`],
    ['sw.js', `const DEVELOPMENT_BUILD_ID = '${build}';`],
    ['sw.js', "const SW_APP_VERSION = '1.7.0';"]]) assert(read(path).includes(marker), path + ': ' + marker);
  assert.equal(JSON.parse(read('package.json')).version, '1.7.0');
});
test('older and newer guards all survive build replay', () => {
  const stage = read('tools/shift-report-mo-hotfix-170-smoke.mjs');
  for (const id of ['17039','17040','17041'])
    assert(stage.includes(`// RAK_${id}_TWO_PASS_GUARD`), id + ' guard missing');
  assert(stage.includes('const already17040=already17041||indexSource.includes('));
  assert(stage.includes(`already17041?"var build='${build}';":already17040?`));
});
test('test-only database and minimal rotation projection remain', () => {
  const config = read('supabase-config.js');
  assert(config.includes('cgshssdjgzzuprlwnabl') && !config.includes('bkqamcbkiwumsvelahxr'));
  assert(read('supabase-bridge.js').includes(".select('id,key,payload,meta,revision,updated_at').eq('key', 'main').maybeSingle()"));
});
test('pipeline itself requires second pass', () => {
  const workflow = read('.github/workflows/rak-development-validation.yml');
  assert(workflow.includes('npm run vercel-build\n          npm run vercel-build'));
});
