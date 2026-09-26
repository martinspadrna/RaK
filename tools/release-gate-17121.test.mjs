import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity,RELEASE_METADATA} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('1.7.121 has one unified runtime identity',()=>{
  assert.equal(RELEASE_METADATA.displayVersion,'1.7.121');
  const metadata=assertCurrentReleaseIdentity(read,'1.7.121');
  assert.equal(metadata.buildId,'v1.7.121-unplanned-options1');
  assert.equal(JSON.parse(read('package.json')).version,'1.7.121');
  assert(read('index.html').includes('rak-runtime-diagnostics.js?v=1.7.121'));
  assert(read('index.html').includes('app.js?v=1.7.121'));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.121'"));
});

test('1.7.121 fixes the runtime wrapper that dropped scoped generator options',()=>{
  const readiness=read('module-readiness.js');
  const wizard=read('admin-rotation-generator-wizard.js');
  assert(readiness.includes('adminGenerateRotationMonthDraftWithMonthKeyContext(monthKey, preparedMonth, generationOptions)'));
  assert(readiness.includes('return original(monthKey, preparedMonth, generationOptions);'));
  assert(!readiness.includes('return original(monthKey, preparedMonth);'));
  assert.equal((wizard.match(/scopedDateLabels: allowedDateLabels/g)||[]).length,2);
});

test('1.7.121 regression and evidence gates are wired into CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const name of ['tools/unplanned-generator-options-17121.test.mjs','tools/release-gate-17121.test.mjs']){
    assert(pkg.scripts.check.includes(name),name);
    assert(workflow.includes(name),name);
  }
  assert(workflow.includes('rak-170121-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(workflow.includes('rak-170120-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(read('CHANGELOG.md').startsWith('## RaK 1.7.121 (development)'));
});
