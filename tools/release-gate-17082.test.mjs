import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.82 identifies Rotation UI rehydration release',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.82');
  assert(metadata.buildId.includes('rotation-ui-rehydrate'));
});

test('sync cannot run before Rotation consumers are loaded',()=>{
  const app=read('app.js');
  assert(app.includes('RAK_17082_SYNC_REQUIRES_ROTATION_UI'));
  assert(app.includes('sync: Object.freeze({ files: syncFeatureFiles, dependencies: Object.freeze(["rotation"]) })'));
});

test('Rotation feature readiness immediately rehydrates Rotace and Dashboard',()=>{
  const app=read('app.js');
  const branch=app.slice(app.indexOf("if (name === 'rotation')"),app.indexOf("} else if (name === 'calculators')"));
  assert(branch.includes("typeof renderRotace === 'function'"));
  assert(branch.includes("typeof updateDashboard === 'function'"));
  assert(branch.includes("typeof renderRakDashboardAnnouncement === 'function'"));
});

test('cold boot has an explicit awaited runtime hydration contract',()=>{
  const app=read('app.js');
  const sync=read('app-rotation-sync.js');
  assert(sync.includes('async function hydrateRakRotationFromOfflineCache(options)'));
  assert(sync.includes('window.hydrateRakRotationFromOfflineCache = hydrateRakRotationFromOfflineCache'));
  assert(sync.includes('await hydrateRakRotationFromOfflineCache({ repair: true, force: false })'));
  const boot=app.slice(app.indexOf('RAK_17080_OFFLINE_BOOT_RESTORE'),app.indexOf('const startupReadyAt'));
  assert(boot.includes('RAK_17082_AWAIT_RUNTIME_HYDRATION'));
  assert(boot.includes("await window.hydrateRakRotationFromOfflineCache({ repair: true, force: true })"));
});

test('returning service-worker startup hydrates before remote sync regardless of navigator.onLine',()=>{
  const app=read('app.js');
  assert(app.includes('RAK_17082_RETURNING_SW_HYDRATION'));
  assert(app.includes('navigator.serviceWorker.controller'));
  assert(app.includes('rakBootLocalHydrationInProgress = true'));
  assert(app.includes("if (!rakBootLocalHydrationInProgress) void activateRemoteSync()"));
  const boot=app.slice(app.indexOf('RAK_17080_OFFLINE_BOOT_RESTORE'),app.indexOf('const startupReadyAt'));
  assert(boot.indexOf("await window.hydrateRakRotationFromOfflineCache") < boot.indexOf('void activateRemoteSync()'));
  assert(!boot.includes('await activateRemoteSync()'));
});

test('every applied Rotation snapshot refreshes Rotation-driven Home UI',()=>{
  const sync=read('app-rotation-sync.js');
  const apply=sync.slice(sync.indexOf('function applyRakRotationState'),sync.indexOf('// RAK_17057_BADGE_GUARD'));
  assert(apply.includes('RAK_17082_ROTATION_UI_REHYDRATE'));
  assert(apply.includes("typeof updateDashboard === 'function'"));
  assert(apply.includes("typeof renderRakDashboardAnnouncement === 'function'"));
});

test('browser cold-offline regression no longer manually loads Rotation before assertions',()=>{
  const browser=read('tools/browser-offline-17052.mjs');
  const start=browser.indexOf('const offlineRotation=await check');
  const end=browser.indexOf('const offlineUi=',start);
  const block=browser.slice(start,end);
  assert(block.includes('RAK_17082'));
  assert(!block.includes("await window.rakEnsureFeature('rotation')"));
  assert(!block.includes('await window.syncRotationFromSupabase(false)'));
  assert(block.includes("scheduleModel:typeof getPersonScheduleEntries==='function'"));
  assert(block.includes("dashboard:typeof updateDashboard==='function'"));
  assert(browser.includes('online recovery did not rehydrate Rotation-driven UI without reload'));
});

test('mandatory CI executes the 1.7.82 gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(workflow.includes('node --test tools/release-gate-17082.test.mjs'));
  assert(pkg.scripts.check.includes('tools/release-gate-17082.test.mjs'));
});
