import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.101 conflict-rescue milestone remains active in verified successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.101');
  assert.equal(metadata.technicalVersion,metadata.displayVersion);
  assert.equal(metadata.moduleCacheVersion,metadata.displayVersion);
  assert.equal(metadata.cacheVersion,'v'+metadata.displayVersion);
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
  assert(read('index.html').includes('app.js?v='+metadata.displayVersion));
  const sw=read('sw.js');
  assert(sw.includes("importScripts('./rak-release-metadata.js?sw="+metadata.displayVersion+"');"));
  assert(sw.includes("const SW_RELEASE_CACHE_MARKER = 'v"+metadata.displayVersion+"';"));
});
test('single-conflict rescue requires exact private export and read-only server review',()=>{
  const bridge=read('supabase-bridge.js');
  assert(bridge.includes('function rakQueueRawObjectSlices(raw)'));
  assert(bridge.includes('function rakRemoveRawQueueItem(raw, queueIndex)'));
  assert(bridge.includes("return denied('private-export-required')"));
  assert(bridge.includes("return denied('server-review-required')"));
  assert(bridge.includes("review.category === 'ostatní'"));
  assert(bridge.includes('serverContentCompared: false'));
  assert(bridge.includes('atomicWritePerformed: false'));
  assert(bridge.includes('localStorage.setItem(LOCAL_QUEUE_KEY, removed.nextRaw)'));
});

test('dashboard conflict flow states consequence and never silently deletes other queue items',()=>{
  const dashboard=read('dashboard.js');
  assert(dashboard.includes('RAK_17101_EXACT_CONFLICT_DISCARD_GUARD'));
  assert(dashboard.includes('Bez tohoto exportu RaK odstranění nepovolí.'));
  assert(dashboard.includes('Online rozpis se nepřepíše.'));
  assert(dashboard.includes('Online nastavení se nepřepíše.'));
  assert(dashboard.includes('Ostatní fronta zůstane zachovaná.'));
  assert(dashboard.includes('RaK ho automaticky neodstraní'));
});

test('raw-byte regression suite is mandatory',()=>{
  const pkg=JSON.parse(read('package.json'));
  const unit=read('tools/conflict-rescue-17101.test.mjs');
  assert(pkg.scripts.check.includes('tools/conflict-rescue-17101.test.mjs'));
  assert(unit.includes('preserves every untouched task byte-for-byte'));
  assert(unit.includes("api.category('machine_settings'),'stroj'"));
  assert(unit.includes("api.category('bug_report'),'ostatní'"));
});

test('npm check retains 1.7.101 while CI runs the current release gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(pkg.scripts.check.includes('tools/release-gate-17101.test.mjs'));
  assert(/node --test tools\/release-gate-1710\d\.test\.mjs/.test(workflow));
});
