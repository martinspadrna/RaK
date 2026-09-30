import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.8.7 live auth runtime milestone remains present in successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.8.7');
  assert.equal(JSON.parse(read('tools/performance-parity-17069.json')).current.version,metadata.displayVersion);
  assert(read('app-menu.js').includes('getSignedAdminAccessToken'));
  assert(read('app-admin-unlock.js').includes('getSignedAdminAccessToken'));
  assert(read('CHANGELOG.md').includes('## RaK 1.8.7 (development)'));
});

test('1.8.7 runtime diagnostic gates are mandatory locally and in CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const file of ['tools/live-auth-runtime-187.test.mjs','tools/release-gate-187.test.mjs']){
    assert(pkg.scripts.check.includes(file));
    assert(workflow.includes(file));
  }
  assert(workflow.includes('rak-187-isolated-build-${{ github.sha }}'));
});

test('1.8.7 preserves secure role boundaries and TEST isolation',()=>{
  const bridge=read('supabase-bridge.js');
  assert(bridge.includes("return !!(hasSignedAdminRoleContext() && (context.role === 'owner' || context.role === 'admin'));"));
  const config=read('supabase-config.js');
  assert(config.includes('cgshssdjgzzuprlwnabl'));
  assert(!config.includes('bkqamcbkiwumsvelahxr'));
});
