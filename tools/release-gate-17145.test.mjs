import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity,assertSupabaseTarget} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.145 compact food milestone remains protected by successor releases',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.145');
  assert(read('index.html').includes('app.js?v='+metadata.displayVersion));
  assert(read('sw.js').includes("importScripts('./rak-release-metadata.js?sw="+metadata.displayVersion+"')"));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v"+metadata.displayVersion+"'"));
  assert(read('CHANGELOG.md').includes('## RaK 1.7.145 (development)'));
});

test('1.7.145 food compact gates remain mandatory locally and in CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const file of ['tools/admin-food-compact-17145.test.mjs','tools/release-gate-17145.test.mjs']){
    assert(pkg.scripts.check.includes(file));
    assert(workflow.includes(file));
  }
  assert(workflow.includes('rak-170145-isolated-build-${{ github.sha }}'));
});

test('successor releases remain isolated to TEST Supabase',()=>{
  const config=read('supabase-config.js');
  assertSupabaseTarget(config,'release milestone');
});
