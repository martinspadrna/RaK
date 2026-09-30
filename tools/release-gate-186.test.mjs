import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity,assertSupabaseTarget} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.8.6 signed deputy session milestone remains present in successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.8.6');
  assert.equal(JSON.parse(read('tools/performance-parity-17069.json')).current.version,metadata.displayVersion);
  const bridge=read('supabase-bridge.js');
  const unlock=read('app-admin-unlock.js');
  assert(bridge.includes('getSignedAdminAccessToken'));
  assert(unlock.includes('getSignedAdminAccessToken'));
  assert(read('CHANGELOG.md').includes('## RaK 1.8.6 (development)'));
});

test('1.8.6 signed-session and release gates are mandatory locally and in CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const file of ['tools/deputy-signed-session-186.test.mjs','tools/release-gate-186.test.mjs']){
    assert(pkg.scripts.check.includes(file));
    assert(workflow.includes(file));
  }
  assert(workflow.includes('rak-186-isolated-build-${{ github.sha }}'));
});

test('1.8.6 remains TEST-only',()=>{
  const config=read('supabase-config.js');
  assertSupabaseTarget(config,'1.8.6 gate');
});
