import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.160 account-persisted calendar legend release has unified identity',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.160');
  assert.equal(metadata.displayVersion,'1.7.160');
  assert.equal(metadata.buildId,'v1.7.160-calendar-legend-account1');
  assert(read('index.html').includes('app.js?v=1.7.160'));
  assert(read('sw.js').includes("importScripts('./rak-release-metadata.js?sw=1.7.160')"));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.160'"));
  assert.equal(JSON.parse(read('tools/performance-parity-17069.json')).current.version,'1.7.160');
});

test('1.7.160 gates are mandatory locally and in CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const file of ['tools/calendar-legend-account-17160.test.mjs','tools/release-gate-17160.test.mjs']){
    assert(pkg.scripts.check.includes(file));
    assert(workflow.includes(file));
  }
  assert(workflow.includes('rak-170160-isolated-build-${{ github.sha }}'));
});

test('1.7.160 remains TEST-only',()=>{
  const config=read('supabase-config.js');
  assert(config.includes('cgshssdjgzzuprlwnabl'));
  assert(!config.includes('bkqamcbkiwumsvelahxr'));
});
