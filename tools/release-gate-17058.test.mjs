import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {verifyRoadmapProgress} from './roadmap-contract.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const VERSION='1.7.58', BUILD='v1.7.58-queuerecovery1';
function section(a,b){const s=read('supabase-bridge.js'),i=s.indexOf(a),j=s.indexOf(b,i+a.length);assert(i>=0&&j>i,'missing '+a);return s.slice(i,j).trim();}
function fixture({failure=false,permanent=false,concurrent=false,held=false}={}){
 let queue=[{id:'first',type:'bug_report',entry:{message:'secret'},queuedAt:new Date().toISOString()}];
 let writes=0;const calls=[],schedules=[];const ctx={};
 Object.assign(ctx,{flushPromise:null,navigator:{onLine:true},document:{visibilityState:'visible'},
 state:{queueGuard:{storageError:''},syncGuard:{queueFlushRuns:0,queueFlushErrors:0,queueFlushEmptyRuns:0,queueFlushSuccesses:0,queueConflictHolds:0}},
 getClient:()=>({}),readQueue:()=>queue.slice(),writeQueue:q=>{queue=q.slice();return true;},rememberQueueHealth:q=>({length:q.length}),
 shouldDeferQueueFlushForHiddenPage:()=>false,SUPABASE_QUEUE_FLUSH_BATCH_SIZE:8,SUPABASE_QUEUE_FLUSH_IDLE_DELAY_MS:1200,
 SUPABASE_QUEUE_HIDDEN_RETRY_DELAY_MS:1800,getNextQueueRetryAt:q=>q.some(t=>t.retryCount)?Date.now()+2000:null,
 shouldSkipQueuedTaskForBackoff:()=>false,markQueuedTaskAttempt:t=>({...t,lastTriedAt:Date.now()}),
 markQueuedTaskFailure:(t,e)=>({...t,lastTriedAt:Date.now(),retryCount:(t.retryCount||0)+1,lastErrorMessage:e.message}),
 isLikelyPermanentQueueError:()=>permanent,isLikelyOfflineError:()=>false,
 scheduleSupabaseQueueFlush:(reason,delay)=>{assert.equal(ctx.flushPromise,null,'retry scheduled inside active promise');schedules.push({reason,delay});return true;},
 runSupabaseOperation:(_name,action)=>action(),saveBugReportDirect:async()=>{
 calls.push('save');writes++;
 if(concurrent&&writes===1)queue.push({id:'new',type:'bug_report',entry:{message:'new'},queuedAt:new Date().toISOString()});
 if(failure&&writes===1)throw new Error('temporary write failed');
 if(permanent)throw new Error('permission denied');
 return {ok:true};},window:{__rakRefreshSyncBadgeTruth:()=>{}},console:{warn:()=>{}}});
 if(held)queue[0].conflict='admin-review-required';
 const run=vm.runInNewContext('('+section('  async function flushPendingWrites() {','\n  async function enqueueAndMaybeFlush(')+')',ctx);
 return {run,ctx,calls,schedules,tasks:()=>queue};
}
test('release markers, TEST database, technical 1.7.0, OS-number login',()=>{
 for(const [p,anchor] of [['index.html',`var build='${BUILD}';`],['sw.js',`const CACHE_VERSION = 'v${VERSION}';`],
 ['sw.js',`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],['sw.js',`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],
 ['app.js',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],['app.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['supabase-config.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],['supabase-config.js',`window.RAK_PWA_BUILD = "${BUILD}";`]])assert(read(p).includes(anchor),'release mismatch '+p);
 assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
 assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
 assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"));
});
test('one failure is preserved and automatically retried after in-flight promise resolves',async()=>{
 const t=fixture({failure:true}),first=await t.run();
 assert.equal(first.ok,false);assert.equal(first.remaining,1);assert.equal(t.tasks()[0].retryCount,1);
 assert.equal(t.schedules.length,1);assert.equal(t.schedules[0].reason,'remaining-queue');
 const second=await t.run();assert.equal(second.ok,true);assert.equal(t.tasks().length,0);assert.equal(t.calls.length,2);
});
test('concurrent enqueue during network await is not overwritten',async()=>{
 const t=fixture({concurrent:true}),first=await t.run();
 assert.equal(first.ok,false);assert.equal(first.remaining,1);assert.equal(t.tasks()[0].id,'new');assert.equal(t.schedules.length,1);
 const second=await t.run();assert.equal(second.ok,true);assert.equal(t.tasks().length,0);
});
test('permanent permission failure is held without silent drop or automatic loop',async()=>{
 const t=fixture({permanent:true}),first=await t.run();
 assert.equal(first.ok,false);assert.equal(first.held,1);assert.equal(t.tasks()[0].conflict,'write-rejected');assert.equal(t.schedules.length,0);
 const second=await t.run();assert.equal(second.held,1);assert.equal(t.calls.length,1);
});
test('legacy conflict retained without replay',async()=>{
 const t=fixture({held:true}),r=await t.run();assert.equal(r.held,1);
 assert.equal(t.calls.length,0);assert.equal(t.tasks()[0].conflict,'admin-review-required');assert.equal(t.schedules.length,0);
});
test('diagnostics identify task and error class without leaking payload or original error',()=>{
 const source=section('  // RAK_17058_QUEUE_DIAGNOSTIC_GUARD:','\n  window.refreshPublicData = refreshPublicData;');
 const secret='sensitive-personal-content',queue=[{id:'one',type:'bug_report',entry:{message:secret},queuedAt:new Date().toISOString()}];
 const ctx={readLocalSnapshot:()=>({rotation:{months:{}}}),readQueue:()=>queue,getClient:()=>({}),getSupabaseHardeningStatus:()=>({}),
 state:{rotationSync:{lastSource:'remote',lastReadAt:new Date().toISOString(),lastError:null},syncGuard:{queueDroppedInvalid:0}},navigator:{onLine:true},app:{adminRotationDirty:false}};
 vm.runInNewContext(source+'\n globalThis.__status=getSyncUiStatus;',ctx);
 const queued=ctx.__status();assert.equal(queued.kind,'pending');assert(queued.detail.includes('hlášení chyby'));
 queue[0].retryCount=1;queue[0].lastErrorMessage='failed to fetch '+secret;
 const failed=ctx.__status();assert.equal(failed.kind,'error');assert(failed.detail.includes('připojení'));
 assert(!JSON.stringify(failed).includes(secret));
});
test('two-pass build, prior gates, real mobile Chromium and anon HTTP remain in CI',()=>{
 const chain=read('tools/development-version-17048.mjs');
 assert(chain.includes("await import('./development-version-17057.mjs');")&&chain.includes("await import('./development-version-17058.mjs');"));
 assert(chain.indexOf('17057.mjs')<chain.indexOf('17058.mjs'));
 const replay=read('tools/shift-report-mo-hotfix-170-smoke.mjs');assert(replay.includes('RAK_17058_TWO_PASS_GUARD'));
 assert(replay.includes(`already17058?"var build='${BUILD}';":already17057?`));
 const ci=read('.github/workflows/rak-development-validation.yml');
 for(const s of ['npm run vercel-build\n          npm run vercel-build','node --test tools/release-gate-17058.test.mjs','node tools/browser-offline-17052.mjs','node tools/http-anon-audit-17050.mjs'])assert(ci.includes(s));
 assert.equal(verifyRoadmapProgress(read('RAK_PLAN_13.md')).length,13);
});
