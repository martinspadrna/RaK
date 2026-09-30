import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity,assertSupabaseTarget} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.151 all-Google calendar milestone remains active in successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.151');
  assert(read('CHANGELOG.md').includes('## RaK 1.7.151 (development)'));
  const nav=read('app-navigation.js');
  assert(nav.includes("const signature = 'google|' +"));
  assert(nav.includes("fullCalendarUrl"));
  assert(nav.includes("|visible="));
  assert(nav.includes('calendarModalFrame'));
  assert(nav.includes('<iframe'));
  assert.equal(JSON.parse(read('tools/performance-parity-17069.json')).current.version,metadata.displayVersion);
});

test('1.7.151 gates remain mandatory locally and in CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const file of ['tools/calendar-google-all-17151.test.mjs','tools/release-gate-17151.test.mjs']){
    assert(pkg.scripts.check.includes(file));
    assert(workflow.includes(file));
  }
});

test('1.7.151 successors remain TEST-only',()=>{
  const config=read('supabase-config.js');
  assertSupabaseTarget(config,'release milestone');
});
