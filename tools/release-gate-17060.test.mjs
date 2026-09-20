import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const VERSION='1.7.60',BUILD='v1.7.60-queuedurability1';
function section(source,begin,end){const a=source.indexOf(begin),b=source.indexOf(end,a+begin.length);assert(a>=0&&b>a,'missing '+begin);return source.slice(a,b);}
function storageFixture(raw,opts={}){
 let stored=raw, writes=0;
 const guard={storageError:'',rejected:0},state={queueGuard:guard};
 const localStorage={getItem:()=>stored,setItem:(_key,text)=>{writes++;if(opts.deny)throw Error('quota');stored=text;}};
 const ctx={state,localStorage,LOCAL_QUEUE_KEY:'queue',JSON,Date,Math,SUPABASE_QUEUE_MAX_ITEMS:120,
  compactQueue:q=>q,queueTaskKey:q=>q.type+':'+String(q.entry&&q.entry.id||''),
  normalizeQueueTask:q=>q};
 const source=section(read('supabase-bridge.js'),'  // RAK_17060_DURABLE_QUEUE_GUARD:','\n  function isLikelyOfflineError(');
 vm.runInNewContext(source+'\n globalThis.__q={readQueue,writeQueue,enqueueTask};',ctx);
 return {api:ctx.__q,guard,getRaw:()=>stored,getWrites:()=>writes};
}
test('release markers and TEST-only config, technical version unchanged',()=>{
 for(const [p,s] of [['index.html',`var build='${BUILD}';`],['sw.js',`const CACHE_VERSION = 'v${VERSION}';`],['sw.js',`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],['sw.js',`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],['app.js',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],['app.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],['supabase-config.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],['supabase-config.js',`window.RAK_PWA_BUILD = "${BUILD}";`]])assert(read(p).includes(s),'version '+p);
 assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
 assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
 assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"));
});
test('corrupted queue remains bit-for-bit intact and rejects new enqueue',()=>{
 const raw='[{"secret":"PRIVATE",BROKEN';const f=storageFixture(raw);
 assert.equal(f.api.readQueue().length,0);assert.equal(f.guard.storageError,'corrupt');
 assert.equal(f.api.enqueueTask({type:'bug_report',entry:{id:'1'}}),null);
 assert.equal(f.api.writeQueue([]),false);
 assert.equal(f.getRaw(),raw);assert.equal(f.getWrites(),0);
});
test('quota / storage denial does not claim queued success or erase existing task',()=>{
 const raw=JSON.stringify([{id:'old',type:'bug_report',entry:{id:'old'},queuedAt:'2026-09-20'}]);
 const f=storageFixture(raw,{deny:true});assert.equal(f.api.enqueueTask({type:'bug_report',entry:{id:'new'}}),null);
 assert.equal(f.getRaw(),raw);assert.equal(f.guard.storageError,'write-failed');assert.equal(f.getWrites(),1);
});
test('valid append persists and is immediately verified by a fresh storage read',()=>{
 const f=storageFixture('[]');const task=f.api.enqueueTask({type:'bug_report',entry:{id:'fresh'}});
 assert(task&&task.entry.id==='fresh');assert.equal(f.api.readQueue().length,1);
 assert.equal(JSON.parse(f.getRaw()).length,1);assert.equal(f.guard.storageError,'');
});
test('broken local queue never displays a green synced badge or leaks raw JSON',()=>{
 const bridge=read('supabase-bridge.js');
 const source=section(bridge,'  // RAK_17058_QUEUE_DIAGNOSTIC_GUARD:','\n  window.refreshPublicData = refreshPublicData;');
 const guard={storageError:'corrupt'},ctx={state:{queueGuard:guard,rotationSync:{lastSource:'remote',lastReadAt:new Date().toISOString(),lastError:null},syncGuard:{queueDroppedInvalid:0}},
 readQueue:()=>[],readLocalSnapshot:()=>null,getClient:()=>({}),getSupabaseHardeningStatus:()=>({}),navigator:{onLine:true},app:{adminRotationDirty:false}};
 vm.runInNewContext(source+'\n globalThis.__status=getSyncUiStatus;',ctx);
 const status=ctx.__status();assert.equal(status.kind,'error');assert.equal(status.storageIssue,true);
 assert(!JSON.stringify(status).includes('PRIVATE'));assert(status.label.includes('Lokální frontu'));
 guard.storageError='';assert.equal(ctx.__status().kind,'online');
});
function flushFixture({sameId=false,failPersist=false}={}){
 let queue=[{id:'first',type:'bug_report',entry:{message:'OLD'},queuedAt:new Date().toISOString()}];
 let sent=0;const scheduled=[];const ctx={};
 Object.assign(ctx,{flushPromise:null,navigator:{onLine:true},document:{visibilityState:'visible'},window:{__rakRefreshSyncBadgeTruth:()=>{}},
 state:{queueGuard:{storageError:''},syncGuard:{queueFlushRuns:0,queueFlushErrors:0,queueFlushEmptyRuns:0,queueFlushSuccesses:0}},
 getClient:()=>({}),readQueue:()=>queue.map(x=>({...x,entry:{...x.entry}})),writeQueue:q=>{if(failPersist)return false;queue=q.map(x=>({...x,entry:{...x.entry}}));return true;},
 rememberQueueHealth:q=>({length:q.length}),shouldDeferQueueFlushForHiddenPage:()=>false,
 SUPABASE_QUEUE_FLUSH_BATCH_SIZE:8,SUPABASE_QUEUE_FLUSH_IDLE_DELAY_MS:1200,
 getNextQueueRetryAt:()=>null,shouldSkipQueuedTaskForBackoff:()=>false,
 markQueuedTaskAttempt:t=>({...t,lastTriedAt:Date.now()}),markQueuedTaskFailure:(t,e)=>({...t,retryCount:1,lastErrorMessage:e.message}),
 scheduleSupabaseQueueFlush:(reason,delay)=>{assert.equal(ctx.flushPromise,null);scheduled.push({reason,delay});return true;},
 runSupabaseOperation:(_label,work)=>work(),saveBugReportDirect:async()=>{sent++;if(sameId&&sent===1)queue[0]={...queue[0],entry:{message:'NEW'}};return {ok:true};},
 console:{warn:()=>{}},isLikelyOfflineError:()=>false,isLikelyPermanentQueueError:()=>false});
 const src=section(read('supabase-bridge.js'),'  async function flushPendingWrites() {','\n  async function enqueueAndMaybeFlush(');
 const run=vm.runInNewContext('('+src.trim()+')',ctx);
 return {run,ctx,scheduled,tasks:()=>queue,sent:()=>sent};
}
test('new same-ID edit during network await survives even if old write succeeded',async()=>{
 const f=flushFixture({sameId:true}),first=await f.run();assert.equal(first.ok,false);
 assert.equal(f.tasks().length,1);assert.equal(f.tasks()[0].entry.message,'NEW');assert.equal(f.scheduled.length,1);
 const second=await f.run();assert.equal(second.ok,true);assert.equal(f.tasks().length,0);assert.equal(f.sent(),2);
});
test('localStorage failure after online write is reported as failure, not green success',async()=>{
 const f=flushFixture({failPersist:true}),r=await f.run();assert.equal(r.ok,false);assert.equal(r.reason,'queue-storage-failed');
 assert.equal(f.tasks().length,1);assert.equal(f.sent(),1);assert.equal(f.scheduled.length,0);
});
test('local rescue exports exact original bytes only after manual request and never mutates queue',async()=>{
 const raw='{"raw":"PRIVATE-LOCAL-PAYLOAD"}';let written='',clicked=false,download='',objectUrl='';
 const ctx={localStorage:{getItem:()=>raw},Date,Blob,URL:{createObjectURL:blob=>{objectUrl=blob;return 'blob:local';},revokeObjectURL:()=>{}},
 document:{body:{appendChild:()=>{}},createElement:()=>({style:{},click:()=>{clicked=true;},remove:()=>{},set download(x){download=x;},get download(){return download;}})},setTimeout:()=>{}};
 const script=section(read('supabase-bridge.js'),'  // RAK_17060_QUEUE_RESCUE_EXPORT_GUARD:','  window.getSupabaseSyncStatus = getSyncUiStatus;');
 vm.runInNewContext(script+'\n globalThis.__download=downloadPendingSyncBackup;',ctx);
 assert.equal(ctx.__download(),true);assert(clicked);assert(download.startsWith('RaK_fronta_'));
 written=await objectUrl.text();assert.equal(written,raw);
 const alertSection=section(read('dashboard.js'),'    // RAK_17060_MANUAL_RESCUE_GUARD:','\n    const restore = () =>');
 let prompts=0,exports=0;
 const dialog={actual:{storageIssue:false,conflictCount:1,queued:1},source:'automatic',window:{confirm:()=>{prompts++;return true;},downloadRakPendingSyncBackup:()=>{exports++;return true;},alert:()=>{}}};
 vm.runInNewContext(alertSection,dialog);assert.equal(prompts,0);assert.equal(exports,0);
 dialog.source='dashboard-click';vm.runInNewContext(alertSection,dialog);assert.equal(prompts,1);assert.equal(exports,1);
});
test('CI keeps historic gates, both builds, mobile offline, anonymous audit and full plan',()=>{
 const chain=read('tools/development-version-17048.mjs');assert(chain.includes("await import('./development-version-17059.mjs');"));assert(chain.includes("await import('./development-version-17060.mjs');"));assert(chain.indexOf('17059.mjs')<chain.indexOf('17060.mjs'));
 assert(chain.includes("node")||chain.includes('execFileSync'));
 const smoke=read('tools/shift-report-mo-hotfix-170-smoke.mjs');assert(smoke.includes('RAK_17060_TWO_PASS_GUARD'));
 assert(smoke.includes(`already17060?"var build='${BUILD}';":already17059?`));
 const ci=read('.github/workflows/rak-development-validation.yml');for(const item of ['npm run vercel-build\n          npm run vercel-build','node --test tools/release-gate-17060.test.mjs','node tools/browser-offline-17052.mjs','node tools/http-anon-audit-17050.mjs','node tools/backup-source-integrity-17051.mjs'])assert(ci.includes(item));
 const plan=read('RAK_PLAN_13.md');assert(plan.includes('2/13')&&plan.includes('Izolovaná plná obnova zatím nebyla provedena'));
 const progress=read('RAK_PLAN_17060_STATUS.md');for(const item of ['P0.1','P0.2','P0.3','P0.4','P1.1','P1.2','P1.3','P1.4','P1.5','P2.1','P2.2','P2.3','P2.4','2/13'])assert(progress.includes(item));
});
