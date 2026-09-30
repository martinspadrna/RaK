import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity,assertSupabaseTarget} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.156 zero-visible no-stale-calendar milestone remains active in successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.156');
  assert(read('CHANGELOG.md').includes('## RaK 1.7.156 (development)'));
  const nav=read('app-navigation.js');
  assert(nav.includes('if (!visibleCalendars.length)'));
  assert(nav.includes("frame.removeAttribute('src')"));
  assert(!nav.includes('visibleCalendars[visibleCalendars.length - 1]'));
  assert.equal(JSON.parse(read('tools/performance-parity-17069.json')).current.version,metadata.displayVersion);
});

test('1.7.156 gates remain mandatory locally and in CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const file of ['tools/calendar-legend-empty-17156.test.mjs','tools/release-gate-17156.test.mjs']){
    assert(pkg.scripts.check.includes(file));
    assert(workflow.includes(file));
  }
});

test('1.7.156 successors remain TEST-only',()=>{
  const config=read('supabase-config.js');
  assertSupabaseTarget(config,'release milestone');
});
