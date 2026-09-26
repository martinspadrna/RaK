import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity,RELEASE_METADATA} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('1.7.122 has one unified runtime identity',()=>{
  assert.equal(RELEASE_METADATA.displayVersion,'1.7.122');
  const metadata=assertCurrentReleaseIdentity(read,'1.7.122');
  assert.equal(metadata.buildId,'v1.7.122-mo-only-absence1');
  assert.equal(JSON.parse(read('package.json')).version,'1.7.122');
  assert(read('index.html').includes('rak-runtime-diagnostics.js?v=1.7.122'));
  assert(read('index.html').includes('app.js?v=1.7.122'));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.122'"));
});

test('1.7.122 prefers MO-only unplanned absence when TO can remain valid',()=>{
  const wizard=read('admin-rotation-generator-wizard.js');
  const generator=read('admin-rotation-generator.js');
  const rotation=read('admin-rotation.js');
  assert(wizard.includes('adminRotationUnplannedPreserveHardCellsByDate'));
  assert(wizard.includes('adminRotationUnplannedAssertHardPreserved'));
  assert(generator.includes('const preserveHardActive = !!(requestedHardCells'));
  assert(rotation.includes('preserveHardCellsByDate'));
});

test('1.7.122 regression and evidence gates are wired into CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const name of ['tools/unplanned-mo-only-17122.test.mjs','tools/release-gate-17122.test.mjs']){
    assert(pkg.scripts.check.includes(name),name);
    assert(workflow.includes(name),name);
  }
  assert(workflow.includes('rak-170122-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(workflow.includes('rak-170121-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(read('CHANGELOG.md').startsWith('## RaK 1.7.122 (development)'));
});
