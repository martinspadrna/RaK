import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.77 keeps technical 1.7.0 and uses one release identity',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.77');
  assert.equal(metadata.technicalVersion,'1.7.0');
  assert.equal(metadata.cacheVersion,'v1.7.77');
  assert.equal(metadata.buildId,'v1.7.77-pwa-durable-rotation1');
});

test('online rotation is mirrored durably and cold offline load restores it',()=>{
  const bridge=read('supabase-bridge.js');
  assert(bridge.includes("const DURABLE_ROTATION_CACHE = 'rotace-offline-data-v1'"));
  assert(bridge.includes('await persistDurableRotationState(payload);'));
  assert(bridge.includes('await persistDurableRotationState(rebuilt);'));
  assert(bridge.includes('const durable = await loadDurableRotationState();'));
  assert(bridge.includes("meta: { source: 'durable-cache' }"));
  const browser=read('tools/browser-offline-17052.mjs');
  assert(browser.includes('persistDurableRotationState(current)'));
  assert(browser.includes("localStorage.removeItem('rotace_kalkulacky_state_v123')"));
  assert(browser.includes('RAK-CI-OFFLINE-17077'));
});

test('offline profile reads are read-only and older appearance tasks cannot create a global conflict',()=>{
  const bridge=read('supabase-bridge.js'),appearance=read('appearance-theme.js');
  assert(bridge.includes("return { __rakUnavailable: true, reason: navigator.onLine ? 'missing-client' : 'offline-cache-miss' };"));
  assert(appearance.includes('remote && remote.__rakUnavailable === true'));
  assert(bridge.includes('state.syncGuard.uiSettingsRemoteWins'));
  const start=bridge.indexOf('if (Number.isFinite(remoteAt) && remoteAt > queuedAt)');
  const remoteWins=bridge.slice(start,bridge.indexOf('await saveGameAccountUiSettingsDirect',start));
  assert(remoteWins.includes('flushed += 1'));
  assert(!remoteWins.includes("conflict: 'newer-online-state'"));
});

test('Vercel skip policy is fail closed for workflow and executable filename changes',()=>{
  const policy=read('tools/vercel-build-policy.mjs');
  assert(!policy.includes('github\\/workflows'));
  assert(!policy.includes('\\.test\\.'));
  assert(!policy.includes('rak-v\\d+'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  assert(workflow.includes('node --test tools/release-gate-17077.test.mjs'));
  assert(workflow.includes('rak-17077-isolated-build-'));
});