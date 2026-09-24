import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {extractNamedDeclaration,evaluateExpression} from './runtime-vm-fixture.mjs';
import {assertCurrentReleaseIdentity,RELEASE_METADATA} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const {buildId:BUILD,displayVersion:VERSION}=RELEASE_METADATA;
function flushFixture(task,remoteRow){
 let queue=[structuredClone(task)],saves=0,cacheWrites=0;
 const query={
  select(){return this;},eq(){return this;},order(){return this;},
  async limit(){return {data:remoteRow?[structuredClone(remoteRow)]:[],error:null};},
  async maybeSingle(){return {data:remoteRow?structuredClone(remoteRow):null,error:null};}
 };
 const context={
  flushPromise:null,navigator:{onLine:true},document:{visibilityState:'visible'},
  state:{queueGuard:{storageError:''},syncGuard:{queueFlushRuns:0,queueFlushErrors:0,queueFlushEmptyRuns:0,queueFlushSuccesses:0,queueConflictHolds:0,uiSettingsRemoteWins:0}},
  getClient:()=>({from:()=>query}),readQueue:()=>queue.map(item=>structuredClone(item)),
  writeQueue:value=>{queue=value.map(item=>structuredClone(item));return true;},
  rememberQueueHealth:value=>({length:value.length}),shouldDeferQueueFlushForHiddenPage:()=>false,
  SUPABASE_QUEUE_FLUSH_BATCH_SIZE:8,SUPABASE_QUEUE_FLUSH_IDLE_DELAY_MS:1200,SUPABASE_QUEUE_HIDDEN_RETRY_DELAY_MS:1800,
  getNextQueueRetryAt:()=>null,shouldSkipQueuedTaskForBackoff:()=>false,
  markQueuedTaskAttempt:value=>({...value,lastTriedAt:Date.now()}),
  markQueuedTaskFailure:(value,error)=>({...value,retryCount:(value.retryCount||0)+1,lastErrorMessage:error.message}),
  isLikelyPermanentQueueError:()=>false,isLikelyOfflineError:()=>false,scheduleSupabaseQueueFlush:()=>true,
  normalizeGameUiSettings:entry=>({
    account_number:String(entry.account_number||''),
    appearance_id:String(entry.appearance_id||entry.theme_id||entry.background_id||''),
    expected_revision:Math.max(0,Number(entry.expected_revision||0)||0),
    updated_at:entry.updated_at||null
  }),
  loadGameAccountUiSettingsDirect:async()=>remoteRow?structuredClone(remoteRow):null,
  gameUiSettingsCacheKey:account=>'ui:'+account,writeTimedCache:()=>{cacheWrites+=1;return true;},
  saveGameAccountUiSettingsDirect:async(_client,entry)=>{saves+=1;return {ok:true,account_number:entry.account_number,appearance_id:entry.appearance_id,revision:(entry.expected_revision||0)+1,updated_at:new Date().toISOString()};},
  window:{__rakRefreshSyncBadgeTruth:()=>{}},console:{warn:()=>{}},Date,JSON,Promise,Map,Set,structuredClone
 };
 const fn=extractNamedDeclaration(read('supabase-bridge.js'),'flushPendingWrites');
 return {run:evaluateExpression('('+fn+')',context),queue:()=>queue,saves:()=>saves,cacheWrites:()=>cacheWrites};
}

test('1.7.71 and verified successors use canonical release metadata and TEST Supabase',()=>{assertCurrentReleaseIdentity(read,'1.7.71');});
test('service worker prewarms complete Rotation and sync runtime before offline start',()=>{
 const sw=read('sw.js');
 for(const asset of [
  './stats.js?v=1.7.0','./rotace.js?v=1.7.0','./rotation-tasks.js?v=1.7.0',
  './admin-daymods.js?v=1.7.0','./app-rotation-controls.js?v=1.7.0',
  './supabase-bridge.js?v=1.7.0','./app-rotation-sync.js?v=1.7.0'
 ]) assert(sw.includes(asset),asset+' missing from offline package');
 assert(sw.includes("DEVELOPMENT_OFFLINE_ROTATION_POLICY = 'prewarm-retained-on-quota;repair-protocol;dashboard-icons-required;cached-state-first;semantic-ui-conflict'"));
});

test('already-conflicted same profile appearance is rechecked and acknowledged without write',async()=>{
 const queuedAt='2026-09-22T08:00:00.000Z';
 const fixture=flushFixture({id:'same-ui',type:'game_ui_settings',queuedAt,entry:{account_number:'1234',appearance_id:'laser',expected_revision:1,updated_at:queuedAt}},
  {account_number:'1234',appearance_id:'laser',revision:2,updated_at:'2026-09-22T09:00:00.000Z'});
 const result=await fixture.run();
 assert.equal(result.ok,true);assert.equal(result.flushed,1);assert.equal(result.held,0);
 assert.equal(fixture.queue().length,0);assert.equal(fixture.saves(),0);
});

test('different newer profile appearance accepts verified server value without write or global conflict',async()=>{
 const queuedAt='2026-09-22T08:00:00.000Z';
 const fixture=flushFixture({id:'different-ui',type:'game_ui_settings',queuedAt,entry:{account_number:'1234',appearance_id:'laser',expected_revision:1,updated_at:queuedAt}},
  {account_number:'1234',appearance_id:'light',revision:2,updated_at:'2026-09-22T09:00:00.000Z'});
 const result=await fixture.run();
 assert.equal(result.ok,true);assert.equal(result.flushed,1);assert.equal(result.held,0);
 assert.equal(fixture.queue().length,0);assert.equal(fixture.saves(),0);assert.equal(fixture.cacheWrites(),1);
});

test('historic automatic local seed is removed only when an online rotation exists',async()=>{
 const fixture=flushFixture({id:'seed',type:'rotation_state',queuedAt:'2026-09-22T08:00:00.000Z',meta:{source:'local-seed'},rotation:{months:{}}},
  {key:'main',revision:4});
 const result=await fixture.run();
 assert.equal(result.ok,true);assert.equal(result.flushed,1);assert.equal(fixture.queue().length,0);
 const realEdit=flushFixture({id:'edit',type:'rotation_state',queuedAt:'2026-09-22T08:00:00.000Z',meta:{source:'admin-menu'},rotation:{months:{}}},
  {key:'main',revision:4});
 const held=await realEdit.run();assert.equal(held.held,1);assert.equal(realEdit.queue()[0].conflict,'admin-review-required');
});

test('offline startup is read-only and reconnect refreshes appearance from server',()=>{
 const appearance=read('appearance-theme.js'),app=read('app.js'),browser=read('tools/browser-offline-17052.mjs');
 assert(appearance.includes("changed && (typeof navigator === 'undefined' || navigator.onLine !== false)"));
 assert(app.includes("window.addEventListener('online', () => { void syncActiveAppearance('online'); });"));
 assert(/RAK-CI-OFFLINE-170\d+/.test(browser),'browser regression missing current offline marker');
 for(const marker of ["rotationReady:window.rakIsFeatureReady('rotation')","conflictCount:0"])
  assert(browser.includes(marker),'browser regression missing '+marker);
 const offlineBlock=browser.slice(browser.indexOf('const offlineRotation=await check'),browser.indexOf('const offlineUi='));
 assert(!offlineBlock.includes("await window.rakEnsureFeature('rotation')"),'successor cold boot must not need manual Rotation loading');
});

test('strict CI runs the semantic gate, real Chromium and two canonical builds',()=>{
 const workflow=read('.github/workflows/rak-development-validation.yml');
 for(const anchor of ['npm run vercel-build\n          npm run vercel-build','node --test tools/release-gate-17071.test.mjs','node tools/browser-offline-17052.mjs'])
  assert(workflow.includes(anchor),'CI missing '+anchor);
});

