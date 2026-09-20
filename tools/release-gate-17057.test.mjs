import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const VERSION='1.7.57',BUILD='v1.7.57-synctruth1';
function extracted(source,start,end){
 const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
 assert(a>=0&&b>a,'missing function '+start);
 return source.slice(a,b).trim();
}
const bridge=()=>read('supabase-bridge.js');
function status(overrides={}){
 const now=new Date().toISOString();
 const state={rotationSync:{lastReadAt:now,lastSource:'remote',lastError:null},syncGuard:{queueDroppedInvalid:0},...overrides.state};
 const queue=overrides.queue||[];
 const context={readLocalSnapshot:()=>overrides.cache===false?null:{rotation:{months:{}},updatedAt:Date.now()},readQueue:()=>queue,
  getClient:()=>overrides.client===false?null:{},getSupabaseHardeningStatus:()=>({}),
  navigator:{onLine:overrides.online!==false},state,app:{adminRotationDirty:!!overrides.dirty}};
 const fn=vm.runInNewContext('('+extracted(bridge(),'  function getSyncUiStatus() {','\n  window.refreshPublicData = refreshPublicData;')+')',context);
 return fn();
}
test('1.7.57 visible markers, TEST-only database, original employee OS-only and 1.7.0 technical version',()=>{
 for(const [file,anchor] of [['index.html',`var build='${BUILD}';`],['sw.js',`const CACHE_VERSION = 'v${VERSION}';`],
 ['sw.js',`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],['sw.js',`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],
 ['app.js',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],['app.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['supabase-config.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],['supabase-config.js',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`],
 ['supabase-config.js',`window.RAK_PWA_BUILD = "${BUILD}";`]]) assert(read(file).includes(anchor),'version mismatch '+file);
 assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
 assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
 assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"));
});
test('actual sync getter distinguishes offline, no client, pending queue, cached fallback, failure, stale and confirmed online',()=>{
 assert.equal(status({online:false}).kind,'offline');
 assert.equal(status({client:false}).kind,'error');
 const queued=status({queue:[{type:'bug_report'}]});
 assert.equal(queued.kind,'pending');assert(!queued.label.includes('Offline cache'));
 assert.equal(status({state:{rotationSync:{lastSource:'cache',lastReadAt:null,lastError:null}}}).kind,'pending');
 assert.equal(status({state:{rotationSync:{lastSource:'cache',lastError:{code:'network'}}}}).kind,'error');
 assert.equal(status({state:{rotationSync:{lastSource:'remote',lastReadAt:new Date(Date.now()-11*60*1000).toISOString()}}}).kind,'pending');
 assert.equal(status({queue:[{conflict:'newer-online-state'}]}).kind,'error');
 assert.equal(status({state:{syncGuard:{queueDroppedInvalid:1}}}).kind,'error');
 const good=status();assert.equal(good.kind,'online');assert.equal(good.verified,true);assert.equal(good.queued,0);
 assert.equal(status({dirty:true}).kind,'pending');
});
test('real rotation read marks success only after read, preserves network error with cached fallback and handles empty online rows',async()=>{
 const source=extracted(bridge(),'  async function loadRotationState() {','\n  async function saveRotationState(');
 const make=({row=null,online=true,error=null}={})=>{
  const snapshots=[];
  const state={rotationSync:{lastReadAt:null,lastError:null,lastSource:'unverified'},rotationRevision:null,lastError:null};
  const client={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>{if(error)throw error;return {data:row,error:null};}})})})};
  const context={state,navigator:{onLine:online},getClient:()=>client,
   runSharedSupabaseRead:(_key,work)=>work(),runSupabaseOperation:(_key,work)=>work(),
   readLocalSnapshot:()=>({rotation:{months:{cached:1}},updatedAt:123}),saveLocalSnapshot:(...args)=>snapshots.push(args),
   console:{warn:()=>{}}};
  const fn=vm.runInNewContext('('+source+')',context);
  return {run:()=>fn(),state,snapshots};
 };
 const ok=make({row:{key:'main',payload:{months:{remote:1}},revision:50,updated_at:new Date().toISOString()}});
 const data=await ok.run();assert.equal(data.revision,50);assert.equal(ok.state.rotationSync.lastSource,'remote');assert(ok.state.rotationSync.lastReadAt);assert.equal(ok.state.rotationSync.lastError,null);assert.equal(ok.snapshots.length,1);
 const fail=make({error:Object.assign(new Error('network failure'),{code:'NETWORK'})});
 const fallback=await fail.run();assert.equal(fallback.meta.source,'local-cache');assert.equal(fail.state.rotationSync.lastSource,'cache');assert.equal(fail.state.rotationSync.lastError.code,'NETWORK');assert.equal(fail.snapshots.length,0);
 const empty=make({row:null});assert.equal((await empty.run()).meta.source,'local-cache');assert.equal(empty.state.rotationSync.lastError.code,'RAK_ROTATION_EMPTY');
});
test('queued writes use online version checks and preserve conflicts without blind overwrites or legacy drops',()=>{
 const source=bridge();
 assert(source.includes("conflict: 'admin-review-required'"));
 assert(source.includes("conflict: 'newer-online-state'"));
 assert(source.includes("profile.data && profile.data[0] && profile.data[0].updated_at"));
 assert(source.includes('loadGameSessionByInviteCodeDirect(client, code)'));
 assert(source.includes('remoteAt > queuedAt'));
 assert(source.includes('remaining.push(Object.assign({}, task'));
 assert(!source.includes("if (task.type === 'rotation_state') {\n            dropped += 1;"));
});
test('manual success indicator never green without verified status, async recovery refreshes badge',()=>{
 const dashboard=read('dashboard.js'),rotation=read('app-rotation-sync.js');
 assert(dashboard.includes('RAK_17057_MANUAL_TRUTH_GUARD'));
 assert(dashboard.includes("actual.kind !== 'online' || actual.queued !== 0 || actual.verified !== true"));
 assert(dashboard.includes("value.ok === false"));
 assert(rotation.includes('RAK_17057_BADGE_GUARD'));
 assert(rotation.includes('} finally {\n    rakRefreshSyncBadgeTruth();'));
 assert(rotation.includes("window.addEventListener('online', rakRefreshSyncBadgeTruth)"));
 assert(rotation.includes("window.addEventListener('offline', rakRefreshSyncBadgeTruth)"));
 assert(rotation.includes("window.addEventListener('pageshow', rakRefreshSyncBadgeTruth)"));
});
test('two builds preserve prior authenticated diagnostic and inherited gates; roadmap stays truthful',()=>{
 const chain=read('tools/development-version-17048.mjs');
 assert(chain.includes("await import('./development-version-17056.mjs');"));
 assert(chain.includes("await import('./development-version-17057.mjs');"));
 assert(chain.indexOf('17056.mjs')<chain.indexOf('17057.mjs'));
 const replay=read('tools/shift-report-mo-hotfix-170-smoke.mjs');
 assert(replay.includes('RAK_17057_TWO_PASS_GUARD'));
 assert(replay.includes(`already17057?"var build='${BUILD}';":already17056?`));
 const ci=read('.github/workflows/rak-development-validation.yml');
 for(const command of ['npm run vercel-build\n          npm run vercel-build','node --test tools/release-gate-17057.test.mjs','node tools/browser-offline-17052.mjs','node tools/http-anon-audit-17050.mjs'])assert(ci.includes(command));
 const plan=read('RAK_PLAN_13.md');assert(plan.includes('2/13')&&plan.includes('JWT')&&plan.includes('Izolovaná plná obnova zatím nebyla provedena'));
 assert.equal([...plan.matchAll(/^\| (P[012]\.\d) \|/gm)].length,13);
});
