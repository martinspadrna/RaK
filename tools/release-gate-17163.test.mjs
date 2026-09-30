import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity,assertSupabaseTarget} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.163 full-width blank-calendar milestone remains active in successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.163');
  const nav=read('app-navigation.js');
  assert(read('CHANGELOG.md').includes('## RaK 1.7.163 (development)'));
  const start=nav.indexOf('function rakRenderBlankCalendar');
  const end=nav.indexOf('function rakEnsureBlankCalendar',start);
  const fn=nav.slice(start,end);
  assert(fn.includes('width:100%;height:100%;min-width:0;min-height:0;flex:1 1 auto;display:flex;flex-direction:column;box-sizing:border-box'));
  assert(nav.includes('class="calendarSourceEmpty calendarModalFrame"'));
  assert(nav.includes("frame.setAttribute('src', nextUrl)"));
  assert.equal(JSON.parse(read('tools/performance-parity-17069.json')).current.version,metadata.displayVersion);
});

test('1.7.163 account-safe TEST milestone remains active',()=>{
  const core=read('core.js');
  const bridge=read('supabase-bridge.js');
  const config=read('supabase-config.js');
  assert(core.includes('queueRakAccountCalendarHiddenSync(nextHidden)'));
  assert(bridge.includes("rpc('rak_save_account_ui_preferences_v3'"));
  assert(core.includes("obrabeni: '31eea99edff1771be15ba877f7c2f5b1371e0a742ad9d54fca526d41eafa5995@group.calendar.google.com'"));
  assertSupabaseTarget(config,'release milestone');
});

test('1.7.163 gate remains mandatory locally and in CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/release-gate-17163.test.mjs'));
  assert(workflow.includes('tools/release-gate-17163.test.mjs'));
  assert(workflow.includes('rak-170163-isolated-build-${{ github.sha }}'));
});
