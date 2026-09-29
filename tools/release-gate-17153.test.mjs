import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.153 calendar legend and account-sync milestone remains active in successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.153');
  assert(read('CHANGELOG.md').includes('## RaK 1.7.153 (development)'));
  assert(read('app-navigation.js').includes('RAK_CALENDAR_DISPLAY_COLORS'));
  assert(read('appearance-theme.js').includes('saveActiveAccountCalendarSelection'));
  assert.equal(JSON.parse(read('tools/performance-parity-17069.json')).current.version,metadata.displayVersion);
});

test('1.7.153 gates remain mandatory locally and in CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const file of ['tools/calendar-account-sync-17153.test.mjs','tools/release-gate-17153.test.mjs']){
    assert(pkg.scripts.check.includes(file));
    assert(workflow.includes(file));
  }
});

test('1.7.153 successors remain TEST-only',()=>{
  const config=read('supabase-config.js');
  assert(config.includes('cgshssdjgzzuprlwnabl'));
  assert(!config.includes('bkqamcbkiwumsvelahxr'));
});
