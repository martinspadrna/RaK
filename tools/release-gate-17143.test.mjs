import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.143 rotation overview refinement has one unified cache-busted identity',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.143');
  assert.equal(metadata.displayVersion,'1.7.143');
  assert.equal(metadata.buildId,'v1.7.143-rotation-overview2');
  assert(read('index.html').includes('app.js?v=1.7.143'));
  assert(read('sw.js').includes("importScripts('./rak-release-metadata.js?sw=1.7.143')"));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.143'"));
  assert.equal(JSON.parse(read('tools/performance-parity-17069.json')).current.version,'1.7.143');
});

test('1.7.143 refinement gates are mandatory locally and in CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const file of ['tools/admin-rotation-overview-refine-17143.test.mjs','tools/release-gate-17143.test.mjs']){
    assert(pkg.scripts.check.includes(file));
    assert(workflow.includes(file));
  }
  assert(workflow.includes('rak-170143-isolated-build-${{ github.sha }}'));
});

test('1.7.143 remains isolated to TEST Supabase',()=>{
  const config=read('supabase-config.js');
  assert(config.includes('cgshssdjgzzuprlwnabl'));
  assert(!config.includes('bkqamcbkiwumsvelahxr'));
});
