import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity,assertSupabaseTarget} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.8.4 admin diagnostic cleanup milestone remains present in successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.8.4');
  assert.equal(JSON.parse(read('tools/performance-parity-17069.json')).current.version,metadata.displayVersion);
  const menu=read('app-menu.js');
  assert(!menu.includes('TEST diagnostika se spustí pouze klepnutím.'));
  assert(menu.includes('id="rakLiveAuthDiagnosticStatus"'));
  assert(read('CHANGELOG.md').includes('## RaK 1.8.4 (development)'));
});

test('1.8.4 feature and release gates are mandatory locally and in CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const file of ['tools/admin-diagnostic-copy-184.test.mjs','tools/release-gate-184.test.mjs']){
    assert(pkg.scripts.check.includes(file));
    assert(workflow.includes(file));
  }
  assert(workflow.includes('rak-184-isolated-build-${{ github.sha }}'));
});

test('1.8.4 remains TEST-only',()=>{
  const config=read('supabase-config.js');
  assertSupabaseTarget(config,'1.8.4 gate');
});
