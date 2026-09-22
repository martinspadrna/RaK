import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {extractNamedDeclaration,evaluateExpression} from './runtime-vm-fixture.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const RELEASE_IDENTITIES=new Map([
 ['v1.7.71-offline-rotation1','1.7.71'],
 ['v1.7.72-shift-report1','1.7.72'],
  ['v1.7.73-offline-persistence1','1.7.73'],['v1.7.74-offline-cache1','1.7.74'],['v1.7.75-report-columns1','1.7.75']
]);
const releaseMatch=read('index.html').match(/var build='(v1\.7\.\d+-[a-z0-9-]+)';/);
assert(releaseMatch&&RELEASE_IDENTITIES.has(releaseMatch[1]),'unsupported offline-rotation successor');
const BUILD=releaseMatch[1],VERSION=RELEASE_IDENTITIES.get(BUILD);

function flushFixture(task,remoteRow){
 let queue=[structuredClone(task)],saves=0;
 const query={
  select(){return this;},eq(){return this;},order(){return this;},
  async limit(){return {data:remoteRow?[structuredClone(remoteRow)]:[],error:null};},
  async maybeSingle(){return {data:remoteRow?structuredClone(remoteRow):null,error:null};}
 };
 const context={
  flushPromise:null,navigator:{onLine:true},document:{visibilityState:'visible'},
  state:{queueGuard:{storageError:''},syncGuard:{queueFlushRuns:0,queueFlushErrors:0,queueFlushEmptyRuns:0,queueFlushSuccesses:0,queueConflictHolds:0}},
  getClient:()=>({from:()=>query}),readQueue:()=>queue.map(item=>structuredClone(item)),
  writeQueue:value=>{queue=value.map(item=>structuredClone(item));return true;},
  rememberQueueHealth:value=>({length:value.length}),shouldDeferQueueFlushForHiddenPage:()=>false,
  SUPABASE_QUEUE_FLUSH_BATCH_SIZE:8,SUPABASE_QUEUE_FLUSH_IDLE_DELAY_MS:1200,SUPABASE_QUEUE_HIDDEN_RETRY_DELAY_MS:1800,
  getNextQueueRetryAt:()=>null,shouldSkipQueuedTaskForBackoff:()=>false,
  markQueuedTaskAttempt:value=>({...value,lastTriedAt:Date.now()}),
  markQueuedTaskFailure:(value,error)=>({...value,retryCount:(value.retryCount||0)+1,lastErrorMessage:error.message}),
  isLikelyPermanentQueueError:()=>false,isLikelyOfflineError:()=>false,scheduleSupabaseQueueFlush:()=>true,
  runSupabaseOperation:async(_name,action)=>await action(),GAME_UI_SETTINGS_TYPE:'__profile_ui',
  normalizeGameUiSettings:entry=>({account_number:String(entry.account_number||''),theme_id:String(entry.theme_id||''),background_id:String(entry.background_id||''),updated_at:entry.updated_at||null}),
  decodeGameUiSettingsRow:row=>row?{account_number:String(row.account_number||''),theme_id:String(row.theme_id||''),background_id:String(row.background_id||''),updated_at:row.updated_at||null}:null,
  saveGameAccountUiSettingsDirect:async()=>{saves+=1;return {ok:true};},
  window:{__rakRefreshSyncBadgeTruth:()=>{}},console:{warn:()=>{}},Date,JSON,Promise,Map,Set,structuredClone
 };
 const fn=extractNamedDeclaration(read('supabase-bridge.js'),'flushPendingWrites');
 return {run:evaluateExpression('('+fn+')',context),queue:()=>queue,saves:()=>saves};
}

test('1.7.71 and verified successors keep technical 1.7.0 and TEST Supabase',()=>{
 for(const [file,anchor] of [
  ['index.html',`var build='${BUILD}';`],['sw.js',`const CACHE_VERSION = 'v${VERSION}';`],
  ['sw.js',`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],['sw.js',`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],
  ['app.js',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],['app.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
  ['supabase-config.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],['supabase-config.js',`window.RAK_PWA_BUILD = "${BUILD}";`]
 ]) assert(read(file).includes(anchor),file+' release mismatch');
 assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
 const config=read('supabase-config.js');
 assert(config.includes('cgshssdjgzzuprlwnabl')&&!config.includes('bkqamcbkiwumsvelahxr'));
});

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
 const fixture=flushFixture({id:'same-ui',type:'game_ui_settings',queuedAt,conflict:'newer-online-state',entry:{account_number:'1234',theme_id:'laser',background_id:'laser',updated_at:queuedAt}},
  {account_number:'1234',theme_id:'laser',background_id:'laser',updated_at:'2026-09-22T09:00:00.000Z'});
 const result=await fixture.run();
 assert.equal(result.ok,true);assert.equal(result.flushed,1);assert.equal(result.held,0);
 assert.equal(fixture.queue().length,0);assert.equal(fixture.saves(),0);
});

test('different newer profile appearance remains held for review',async()=>{
 const queuedAt='2026-09-22T08:00:00.000Z';
 const fixture=flushFixture({id:'different-ui',type:'game_ui_settings',queuedAt,entry:{account_number:'1234',theme_id:'laser',background_id:'laser',updated_at:queuedAt}},
  {account_number:'1234',theme_id:'light',background_id:'light',updated_at:'2026-09-22T09:00:00.000Z'});
 const result=await fixture.run();
 assert.equal(result.ok,false);assert.equal(result.held,1);assert.equal(fixture.saves(),0);
 assert.equal(fixture.queue()[0].conflict,'newer-online-state');
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
 for(const marker of ["RAK-CI-OFFLINE-17073","await window.rakEnsureFeature('rotation')","conflictCount:0"])
  assert(browser.includes(marker),'browser regression missing '+marker);
});

test('strict CI runs the semantic gate, real Chromium and two canonical builds',()=>{
 const workflow=read('.github/workflows/rak-development-validation.yml');
 for(const anchor of ['npm run vercel-build\n          npm run vercel-build','node --test tools/release-gate-17071.test.mjs','node tools/browser-offline-17052.mjs'])
  assert(workflow.includes(anchor),'CI missing '+anchor);
});
