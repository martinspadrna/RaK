import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.8.1 has unified release identity for compact About text',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.8.1');
  assert.equal(metadata.displayVersion,'1.8.1');
  assert.equal(metadata.technicalVersion,'1.8.1');
  assert.equal(metadata.moduleCacheVersion,'1.8.1');
  assert.equal(metadata.cacheVersion,'v1.8.1');
  assert.equal(metadata.buildId,'v1.8.1-about-compact1');
  assert.equal(JSON.parse(read('package.json')).version,'1.8.1');
  assert.equal(JSON.parse(read('tools/performance-parity-17069.json')).current.version,'1.8.1');
  assert(read('index.html').includes('app.js?v=1.8.1'));
  assert(read('sw.js').includes("importScripts('./rak-release-metadata.js?sw=1.8.1')"));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v1.8.1'"));
});

test('1.8.1 gates are mandatory locally and in CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const file of ['tools/about-history-180.test.mjs','tools/release-gate-181.test.mjs']){
    assert(pkg.scripts.check.includes(file));
    assert(workflow.includes(file));
  }
  assert(workflow.includes('rak-181-isolated-build-${{ github.sha }}'));
});

test('1.8.1 remains TEST-only',()=>{
  const config=read('supabase-config.js');
  assert(config.includes('cgshssdjgzzuprlwnabl'));
  assert(!config.includes('bkqamcbkiwumsvelahxr'));
});
