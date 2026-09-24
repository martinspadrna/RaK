import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.79 identifies the verified offline arbitration release',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.79');
  assert.equal(metadata.technicalVersion,metadata.displayVersion);
  assert.equal(metadata.moduleCacheVersion,metadata.displayVersion);
  assert.equal(metadata.cacheVersion,'v'+metadata.displayVersion);
  assert(metadata.buildId.startsWith('v'+metadata.displayVersion+'-'));
});

test('online rotation persistence is verified and offline selection compares both stores',()=>{
  const bridge=read('supabase-bridge.js');
  assert(bridge.includes('async function persistRotationOfflineSnapshot(rotation, metadata)'));
  assert(bridge.includes('async function loadBestOfflineRotationState(options)'));
  assert(bridge.includes('function compareRotationOfflineCandidates(a, b)'));
  assert(bridge.includes('rotationPayloadFingerprint'));
  assert(bridge.includes("source: 'remote'"));
  assert(bridge.includes("source: 'tables'"));
  assert(bridge.includes('state.rotationSync.offlinePersistence = await persistRotationOfflineSnapshot(payload'));
  assert(bridge.includes('state.rotationSync.offlinePersistence = await persistRotationOfflineSnapshot(rebuilt'));
  const fallback=bridge.slice(bridge.indexOf('async function loadRotationState()'),bridge.indexOf('async function saveRotationState'));
  assert(fallback.includes('await loadBestOfflineRotationState({ repair: true })'));
  assert(!fallback.includes('const cached = loadCachedRotationState();'));
});

test('offline persistence stays separate from queued writes and exposes only sanitized diagnostics',()=>{
  const bridge=read('supabase-bridge.js');
  const persist=bridge.slice(bridge.indexOf('async function persistRotationOfflineSnapshot'),bridge.indexOf('async function getRotationOfflineDiagnostics'));
  assert(!persist.includes('enqueueTask('));
  assert(!persist.includes('writeQueue('));
  assert(!persist.includes('flushPendingWrites('));
  const diag=bridge.slice(bridge.indexOf('async function getRotationOfflineDiagnostics'),bridge.indexOf('function queueTaskKey'));
  assert(diag.includes('selectedRevision'));
  assert(diag.includes('storageIssue'));
  assert(diag.includes('labels:'));
  assert(!diag.includes('payload:'));
});

test('browser regression reproduces stale local plus newer durable cache without hand-written durable writes',()=>{
  const browser=read('tools/browser-offline-17052.mjs');
  assert(browser.includes('persistRotationOfflineSnapshot(current'));
  assert(!browser.includes('persistDurableRotationState(current)'));
  assert(browser.includes("localStorage.setItem('rotace_kalkulacky_state_v123',JSON.stringify(stale))"));
  assert(browser.includes('loadBestOfflineRotationState({repair:true})'));
  assert(browser.includes('selectedRevision:17079'));
  assert(browser.includes('RAK-CI-OFFLINE-17079'));
});

test('mandatory CI executes the 1.7.79 gate and physical iPhone remains a separate acceptance step',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(workflow.includes('node --test tools/release-gate-17079.test.mjs'));
  assert(workflow.includes('node tools/browser-offline-17052.mjs'));
  assert(pkg.scripts.check.includes('tools/release-gate-17079.test.mjs'));
});
