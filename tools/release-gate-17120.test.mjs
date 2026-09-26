import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity,RELEASE_METADATA} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('1.7.120 has one unified runtime identity',()=>{
  assert.equal(RELEASE_METADATA.displayVersion,'1.7.120');
  const metadata=assertCurrentReleaseIdentity(read,'1.7.120');
  assert.equal(metadata.buildId,'v1.7.120-unplanned-local1');
  assert.equal(JSON.parse(read('package.json')).version,'1.7.120');
  assert(read('index.html').includes('rak-runtime-diagnostics.js?v=1.7.120'));
  assert(read('index.html').includes('app.js?v=1.7.120'));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.120'"));
});

test('1.7.120 locally reflows only selected unplanned days',()=>{
  const rotation=read('admin-rotation.js');
  const wizard=read('admin-rotation-generator-wizard.js');
  assert(rotation.includes('const scopedGeneration = scopedDateLabels.length > 0;'));
  assert(rotation.includes("const tnksBalance = scopedGeneration ? scopedNoop()"));
  assert.equal((wizard.match(/scopedDateLabels: allowedDateLabels/g)||[]).length,2);
  assert.equal((wizard.match(/adminRotationUnplannedIssueTouchesSelectedDate\(issue, allowedDateLabels\)/g)||[]).length,2);
  assert(wizard.includes(': při čtyřech lidech na MO musí být 3 soustruhy a 1 fréza.'));
});

test('1.7.120 regression and evidence gates are wired into CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const name of ['tools/unplanned-local-reflow-17120.test.mjs','tools/release-gate-17120.test.mjs']){
    assert(pkg.scripts.check.includes(name),name);
    assert(workflow.includes(name),name);
  }
  assert(workflow.includes('rak-170120-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(workflow.includes('rak-170119-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(read('CHANGELOG.md').startsWith('## RaK 1.7.120 (development)'));
});
