import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity,assertSupabaseTarget} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.165 Frezky-parity milestone remains present in successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.165');
  assert(read('CHANGELOG.md').includes('## RaK 1.7.165 (development)'));
  assert.equal(JSON.parse(read('tools/performance-parity-17069.json')).current.version,metadata.displayVersion);
});

test('1.7.165 gates remain mandatory locally and in CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const file of ['tools/sign-toggle-frezky-parity-17165.test.mjs','tools/release-gate-17165.test.mjs']){
    assert(pkg.scripts.check.includes(file));
    assert(workflow.includes(file));
  }
  assert(workflow.includes('rak-170165-isolated-build-${{ github.sha }}'));
});

test('1.7.165 successors remain TEST-only',()=>{
  const config=read('supabase-config.js');
  assertSupabaseTarget(config,'release milestone');
});
