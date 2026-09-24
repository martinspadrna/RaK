import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {RELEASE_METADATA,assertCurrentReleaseIdentity,assertSupabaseTarget} from './release-metadata-test-helper.mjs';
const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const version = '1.7.41';
const build = 'v1.7.41-twopass1';
test('latest release metadata remains consistent after repeated build', () => {
  assertCurrentReleaseIdentity(read,'1.7.41');
});
test('older and newer guards all survive build replay', () => {
  const stage = read('tools/shift-report-mo-hotfix-170-smoke.mjs');
  const pkg = JSON.parse(read('package.json'));
  if (pkg.scripts['vercel-build'] === 'node tools/canonical-build.mjs build') {
    const compilers = ['17039','17040','17041'].map(id =>
      read(`tools/development-version-${id}.mjs`));
    for (const [index, id] of ['17039','17040','17041'].entries())
      assert(compilers[index].includes(`RAK_${id}_TWO_PASS_GUARD`),
        id + ' frozen guard compiler missing');
    assert(compilers[2].includes('const already17040=already17041||indexSource.includes('));
    assert(compilers[2].includes('already17041?') && compilers[2].includes(':already17040?'),
      '1.7.41 frozen replay fallback missing');
    assert(pkg.scripts['legacy:vercel-build'].includes(
      'node tools/shift-report-mo-hotfix-170-smoke.mjs'),
      'frozen compatibility compiler is not reachable');
    return;
  }
  for (const id of ['17039','17040','17041'])
    assert(stage.includes(`// RAK_${id}_TWO_PASS_GUARD`), id + ' guard missing');
  assert(stage.includes('const already17040=already17041||indexSource.includes('));
  assert(stage.includes(`already17041?"var build='${build}';":already17040?`));
});
test('release-target database and minimal rotation projection remain', () => {
  const config = read('supabase-config.js');
  assertSupabaseTarget(config,'two-pass release');
  assert(read('supabase-bridge.js').includes(".select('id,key,payload,meta,revision,updated_at').eq('key', 'main').maybeSingle()"));
});
test('pipeline itself requires second pass', () => {
  const workflow = read('.github/workflows/rak-development-validation.yml');
  assert(workflow.includes('npm run vercel-build\n          npm run vercel-build'));
});

