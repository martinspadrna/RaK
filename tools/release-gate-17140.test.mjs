import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.140 admin UI release identity is unified and cache-busted',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.140');
  assert.equal(metadata.displayVersion,'1.7.140');
  assert.equal(metadata.buildId,'v1.7.140-admin-ui-compact1');
  assert(read('index.html').includes('app.js?v=1.7.140'));
  assert(read('index.html').includes('rak-runtime-diagnostics.js?v=1.7.140'));
  assert(read('sw.js').includes("importScripts('./rak-release-metadata.js?sw=1.7.140')"));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.140'"));
});

test('1.7.140 UI regression gates are mandatory locally and in CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const file of ['tools/admin-ui-compact-17140.test.mjs','tools/release-gate-17140.test.mjs']){
    assert(pkg.scripts.check.includes(file));
    assert(workflow.includes(file));
  }
  assert(workflow.includes('rak-170140-isolated-build-${{ github.sha }}'));
});

test('1.7.140 remains TEST-only',()=>{
  const config=read('supabase-config.js');
  assert(config.includes('cgshssdjgzzuprlwnabl'));
  assert(!config.includes('bkqamcbkiwumsvelahxr'));
});
