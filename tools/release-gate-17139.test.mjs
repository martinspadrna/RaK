import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.139 release identity is unified and cache-busted',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.139');
  assert.equal(metadata.displayVersion,'1.7.139');
  assert.equal(metadata.buildId,'v1.7.139-diagnostic-version1');
  assert(read('index.html').includes('app.js?v=1.7.139'));
  assert(read('sw.js').includes("importScripts('./rak-release-metadata.js?sw=1.7.139')"));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.139'"));
});

test('1.7.139 regression gates are mandatory in local and CI checks',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const file of ['tools/conflict-diagnostic-version-17139.test.mjs','tools/release-gate-17139.test.mjs']){
    assert(pkg.scripts.check.includes(file));
    assert(workflow.includes(file));
  }
  assert(workflow.includes('rak-170139-isolated-build-${{ github.sha }}'));
});

test('development release contains no temporary P2.4 diagnostic seeder',()=>{
  assert(!read('index.html').includes('p24-conflict-seed.js'));
  assert(read('CHANGELOG.md').includes('## RaK 1.7.139 (development)'));
});
