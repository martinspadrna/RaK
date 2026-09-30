import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const budget=JSON.parse(read('tools/network-resilience-17104.json'));
const browser=read('tools/browser-offline-17052.mjs');
const workflow=read('.github/workflows/rak-development-validation.yml');

test('P2.1 network resilience has explicit bounded profiles and fail-closed timings',()=>{
  assert.equal(budget.schema,'rak-network-resilience-budget-v1');
  assert.deepEqual(budget.profile.viewport,{width:390,height:844,deviceScaleFactor:3});
  assert(budget.profile.slowNetwork.latencyMs>=300);
  assert(budget.profile.slowNetwork.downloadBytesPerSec<=256000);
  assert(budget.hardMs.offlineStart<=4000);
  assert(budget.hardMs.reconnectWithoutReload<=3500);
  assert(budget.hardMs.slowCachedReload<=8000);
  assert(budget.hardMs.serviceWorkerWaiting<=15000);
  assert(budget.hardMs.serviceWorkerActivation<=15000);
});

test('real Chromium gate measures offline, reconnect, slow network and confirmed service-worker activation',()=>{
  for(const marker of [
    "ciSwGeneration+=1",
    "registration.update()",
    "r?.waiting",
    ".rakUpdateToast .rakUpdateToastAction",
    "serviceWorkerActivation",
    "slow cached reload",
    "network-resilience.json",
    "rak-pwa-network-resilience-v1",
    "cleanRecoveryConflictCount:recovered.conflictCount"
  ]) assert(browser.includes(marker),'missing browser resilience marker '+marker);
  assert(workflow.includes('node --test tools/pwa-offline-17052.test.mjs tools/network-resilience-17104.test.mjs'));
  assert(workflow.includes('node tools/browser-offline-17052.mjs'));
});
