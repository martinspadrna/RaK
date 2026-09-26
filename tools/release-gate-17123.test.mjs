import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity,RELEASE_METADATA} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('1.7.123 has one unified runtime identity',()=>{
  assert.equal(RELEASE_METADATA.displayVersion,'1.7.123');
  const metadata=assertCurrentReleaseIdentity(read,'1.7.123');
  assert.equal(metadata.buildId,'v1.7.123-kalirna-minimal1');
  assert.equal(JSON.parse(read('package.json')).version,'1.7.123');
  assert(read('index.html').includes('rak-runtime-diagnostics.js?v=1.7.123'));
  assert(read('index.html').includes('app.js?v=1.7.123'));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.123'"));
});

test('1.7.123 Kalírna uses minimum-change MO reflow before generator fallback',()=>{
  const wizard=read('admin-rotation-generator-wizard.js');
  assert(wizard.includes('function adminRotationUnplannedTryMinimalKalirnaSoftReflow('));
  assert(wizard.includes('const fallbackDateLabels = [];'));
  assert(wizard.includes('adminRotationUnplannedTryMinimalKalirnaSoftReflow(sourceMonth, regenerated, date, person, knownNames)'));
  assert(wizard.includes('if (fallbackDateLabels.length)'));
  assert(wizard.includes('scopedDateLabels: fallbackDateLabels'));
  assert(wizard.includes('movedPeople < best.movedPeople'));
});

test('1.7.123 regression and evidence gates are wired into CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const name of ['tools/unplanned-kalirna-minimal-17123.test.mjs','tools/release-gate-17123.test.mjs']){
    assert(pkg.scripts.check.includes(name),name);
    assert(workflow.includes(name),name);
  }
  assert(workflow.includes('rak-170123-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(workflow.includes('rak-170122-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(read('CHANGELOG.md').startsWith('## RaK 1.7.123 (development)'));
});
