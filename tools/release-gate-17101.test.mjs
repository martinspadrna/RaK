import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.101 uses one unified release identity',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.101');
  assert.equal(metadata.displayVersion,'1.7.101');
  assert.equal(metadata.technicalVersion,'1.7.101');
  assert.equal(metadata.moduleCacheVersion,'1.7.101');
  assert.equal(metadata.cacheVersion,'v1.7.101');
  assert.equal(metadata.buildId,'v1.7.101-conflict-rescue1');
  assert.equal(JSON.parse(read('package.json')).version,'1.7.101');
  assert(read('index.html').includes('app.js?v=1.7.101'));
  const sw=read('sw.js');
  assert(sw.includes("importScripts('./rak-release-metadata.js?sw=1.7.101');"));
  assert(sw.includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.101';"));
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

test('mandatory CI executes 1.7.101 gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  assert(workflow.includes('node --test tools/release-gate-17101.test.mjs'));
  assert(workflow.includes('rak-170101-isolated-build-'+'$'+'{{ github.sha }}'));
});
