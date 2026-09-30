import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity,assertSupabaseTarget} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.8.5 food modal dismissal milestone remains present in successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.8.5');
  assert.equal(JSON.parse(read('tools/performance-parity-17069.json')).current.version,metadata.displayVersion);
  const source=read('app-bottom-nav.js');
  assert(source.includes("if (typeof hideFoodScheduleModal === 'function') hideFoodScheduleModal();"));
  assert(read('CHANGELOG.md').includes('## RaK 1.8.5 (development)'));
});

test('1.8.5 food-dismiss and release gates are mandatory locally and in CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const file of ['tools/bottom-nav-food-dismiss-185.test.mjs','tools/release-gate-185.test.mjs']){
    assert(pkg.scripts.check.includes(file));
    assert(workflow.includes(file));
  }
  assert(workflow.includes('rak-185-isolated-build-${{ github.sha }}'));
});

test('1.8.5 remains TEST-only',()=>{
  const config=read('supabase-config.js');
  assertSupabaseTarget(config,'1.8.5 gate');
});
