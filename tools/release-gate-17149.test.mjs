import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity,assertSupabaseTarget} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.149 calendar selection milestone remains in verified successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.149');
  assert.equal(metadata.technicalVersion,metadata.displayVersion);
  assert.equal(metadata.moduleCacheVersion,metadata.displayVersion);
  assert.equal(metadata.cacheVersion,'v'+metadata.displayVersion);
  assert(read('index.html').includes('app.js?v='+metadata.displayVersion));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v"+metadata.displayVersion+"'"));
  assert(read('CHANGELOG.md').includes('## RaK 1.7.149 (development)'));
});

test('1.7.149 gates are mandatory locally and in CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const file of ['tools/calendar-selection-17149.test.mjs','tools/release-gate-17149.test.mjs']){
    assert(pkg.scripts.check.includes(file));
    assert(workflow.includes(file));
  }
  assert(workflow.includes('rak-170149-isolated-build-${{ github.sha }}'));
});

test('1.7.149 remains isolated to TEST Supabase',()=>{
  const config=read('supabase-config.js');
  assertSupabaseTarget(config,'release milestone');
});
