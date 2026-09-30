import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity,assertSupabaseTarget} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.162 shared-frame sizing milestone remains active in successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.162');
  const nav=read('app-navigation.js');
  const css=read('styles-modal.css');
  assert(read('CHANGELOG.md').includes('## RaK 1.7.162 (development)'));
  assert(nav.includes('class="calendarSourceEmpty calendarModalFrame"'));
  assert(css.includes('.calendarModalFrame{width:100%;'));
  assert.equal(JSON.parse(read('tools/performance-parity-17069.json')).current.version,metadata.displayVersion);
});

test('1.7.162 sizing gates remain mandatory locally and in CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const file of ['tools/calendar-zero-size-17162.test.mjs','tools/release-gate-17162.test.mjs']){
    assert(pkg.scripts.check.includes(file));
    assert(workflow.includes(file));
  }
  assert(workflow.includes('rak-170162-isolated-build-${{ github.sha }}'));
});

test('1.7.162 milestone remains TEST-only',()=>{
  const config=read('supabase-config.js');
  assertSupabaseTarget(config,'release milestone');
});
