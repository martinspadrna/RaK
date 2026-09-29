import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.160 account-persisted legend visibility milestone remains active in successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.160');
  assert(read('CHANGELOG.md').includes('## RaK 1.7.160 (development)'));
  const core=read('core.js');
  const bridge=read('supabase-bridge.js');
  assert(core.includes('function setRakVisibleCalendarKeys'));
  assert(bridge.includes("rpc('rak_save_account_ui_preferences_v3'"));
  assert.equal(JSON.parse(read('tools/performance-parity-17069.json')).current.version,metadata.displayVersion);
});

test('1.7.160 gates remain mandatory locally and in CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const file of ['tools/calendar-legend-account-17160.test.mjs','tools/release-gate-17160.test.mjs']){
    assert(pkg.scripts.check.includes(file));
    assert(workflow.includes(file));
  }
});

test('1.7.160 successors remain TEST-only',()=>{
  const config=read('supabase-config.js');
  assert(config.includes('cgshssdjgzzuprlwnabl'));
  assert(!config.includes('bkqamcbkiwumsvelahxr'));
});
