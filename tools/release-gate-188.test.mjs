import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity,assertSupabaseTarget} from './release-metadata-test-helper.mjs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.8.8 unplanned-change CAS milestone remains present in successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.8.8');
  assert.equal(JSON.parse(read('tools/performance-parity-17069.json')).current.version,metadata.displayVersion);
  assert(read('CHANGELOG.md').includes('## RaK 1.8.8 (development)'));
});

test('1.8.8 CAS repair gates are mandatory locally and in CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const file of ['tools/unplanned-change-cas-188.test.mjs','tools/release-gate-188.test.mjs']){
    assert(pkg.scripts.check.includes(file));
    assert(workflow.includes(file));
  }
  assert(pkg.scripts.postcheck.includes('tools/startup-network-dedupe-188.test.mjs'));
  assert(pkg.scripts.postcheck.includes('tools/measure-test-startup-network.mjs'));
  assert(workflow.includes('tools/startup-network-dedupe-188.test.mjs'));
  assert(workflow.includes('node --check tools/measure-test-startup-network.mjs'));
  assert(workflow.includes('rak-188-isolated-build-${{ github.sha }}'));
});

test('1.8.8 keeps the repair newer than the production migration lock and TEST-only runtime isolation',()=>{
  const lock=JSON.parse(read('supabase/production-migration-lock.json'));
  assert.equal(lock.lastProductionVersion,'20260924105811');
  assert('20260930112049'>lock.lastProductionVersion);
  const config=read('supabase-config.js');
  assertSupabaseTarget(config,'1.8.8 gate');
});
