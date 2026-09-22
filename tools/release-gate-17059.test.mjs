import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {extractConditionalBlock,evaluateExpression,runNamedDeclarations} from './runtime-vm-fixture.mjs';
import {verifyRoadmapProgress} from './roadmap-contract.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const VERSION='1.7.59',BUILD='v1.7.59-queueintegrity1';
function queueFixture(initial){
 let stored=initial.map(item=>({...item}));
 const state={queueGuard:{rejected:0,oversized:0,deduped:0,trimmed:0}};
 const localStorage={getItem:()=>JSON.stringify(stored),setItem:(_key,payload)=>{stored=JSON.parse(payload).map(item=>({...item}));}};
 const ctx={state,SUPABASE_QUEUE_MAX_BYTES:650000,SUPABASE_QUEUE_MAX_ITEMS:120,
  SUPPORTED_QUEUE_TYPES:new Set(['rotation_state','machine_settings','rotation_month_entries','gomoku_win','game_stat','game_ui_settings','game_session','bug_report']),
  GAME_PROGRESS_RESET_CUTOFF_MS:Date.now(),
  estimateJsonBytes:value=>JSON.stringify(value).length,
  localStorage,safeReadJson:()=>stored.map(item=>({...item})),safeWriteJson:(_key,value)=>{stored=value.map(item=>({...item}));},LOCAL_QUEUE_KEY:'test',
  queueTaskKey:task=>task.type+':'+String(task.entry&&task.entry.account_number||task.code||''),
  Date,Math,JSON};
 const {api}=runNamedDeclarations({modules:[{source:read('supabase-bridge.js'),names:['normalizeQueueTask','isGameProgressQueueTaskBeforeReset','compactQueue','readQueue','writeQueue','enqueueTask']}],globals:ctx,exports:{compactQueue:'compactQueue',readQueue:'readQueue',writeQueue:'writeQueue',enqueueTask:'enqueueTask'}});
 return {api,state,stored:()=>stored};
}
test('1.7.59 release, PWA, TEST Supabase and technical version align',()=>{
 for(const [p,s] of [['index.html',`var build='${BUILD}';`],['sw.js',`const CACHE_VERSION = 'v${VERSION}';`],['sw.js',`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],['sw.js',`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],['app.js',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],['app.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],['supabase-config.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],['supabase-config.js',`window.RAK_PWA_BUILD = "${BUILD}";`]])assert(read(p).includes(s),p+' release mismatch');
 assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
 assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
 assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"));
});
test('unknown persisted task is quarantined; new unsupported task is rejected, no deletion',()=>{
 const t=queueFixture([{id:'old',type:'retired_task',entry:{private:'do not export'},queuedAt:new Date().toISOString()}]);
 const loaded=t.api.readQueue();assert.equal(loaded.length,1);assert.equal(loaded[0].conflict,'unsupported-task');
 t.api.writeQueue(loaded);assert.equal(t.stored().length,1);assert.equal(t.stored()[0].entry.private,'do not export');
 assert.equal(t.api.enqueueTask({type:'not_allowed',entry:{}}),null);assert.equal(t.stored().length,1);
});
test('held same-key writes never deduplicate each other or replace newer local writes',()=>{
 const t=queueFixture([{id:'held1',type:'game_ui_settings',entry:{account_number:'10'},conflict:'newer-online-state',queuedAt:new Date().toISOString()},
 {id:'held2',type:'game_ui_settings',entry:{account_number:'10'},conflict:'admin-review-required',queuedAt:new Date().toISOString()},
 {id:'new',type:'game_ui_settings',entry:{account_number:'10'},queuedAt:new Date().toISOString()}]);
 t.api.writeQueue(t.api.readQueue());assert.equal(t.stored().length,3);
 assert.equal(t.stored().filter(q=>q.conflict).length,2);
});
test('over-limit existing queue is retained, and new enqueue is explicitly rejected',()=>{
 const initial=Array.from({length:121},(_,i)=>({id:'held'+i,type:'bug_report',conflict:'admin-review-required',entry:{text:'private'+i},queuedAt:new Date().toISOString()}));
 const t=queueFixture(initial);assert.equal(t.api.readQueue().length,121);assert.equal(t.state.queueGuard.overCapacity,121);
 assert.equal(t.api.enqueueTask({type:'bug_report',entry:{text:'new'}}),null);assert.equal(t.stored().length,121);assert.equal(t.state.queueGuard.trimmed,0);
});
test('oversized historical write stays quarantined without leaking payload',()=>{
 const item={id:'large',type:'bug_report',entry:{message:'secret'+ 'x'.repeat(650100)},queuedAt:new Date().toISOString()};
 const t=queueFixture([item]),q=t.api.readQueue();assert.equal(q.length,1);assert.equal(q[0].conflict,'oversize-task');
 t.api.writeQueue(q);assert.equal(t.stored().length,1);assert.equal(t.stored()[0].entry.message,item.entry.message);
});
test('held game item bypasses historic game reset deletion',()=>{
 const t=queueFixture([{id:'held-game',type:'game_session',code:'X',queuedAt:'2020-01-01T00:00:00Z',conflict:'newer-online-state'}]);
 const q=t.api.readQueue();assert.equal(q.length,1);assert.equal(q[0].conflict,'newer-online-state');assert.equal(t.state.queueGuard.trimmed,0);
});
test('only sanitized task type and error class reach tap-only diagnostic',()=>{
 const bridge=read('supabase-bridge.js');assert(bridge.includes('RAK_17059_QUEUE_PRESERVE_GUARD'));
 const secret='PRIVATE-NAME-DO-NOT-DISCLOSE';
 const queue=[{id:'x',type:secret,entry:{text:secret},queuedAt:new Date().toISOString(),conflict:'unsupported-task'}];
 const ctx={readLocalSnapshot:()=>null,readQueue:()=>queue,getClient:()=>({}),getSupabaseHardeningStatus:()=>({}),state:{rotationSync:{lastReadAt:new Date().toISOString(),lastSource:'remote',lastError:null},syncGuard:{queueDroppedInvalid:0}},navigator:{onLine:true},app:{adminRotationDirty:false}};
 const {api}=runNamedDeclarations({modules:[{source:bridge,names:['summarizeQueuedSyncTask','getSyncUiStatus']}],globals:ctx,exports:{status:'getSyncUiStatus'}});
 const s=api.status();assert.equal(s.queueIssue.type,'unknown');assert.equal(s.queueIssue.label,'neznámá položka');assert(!JSON.stringify(s).includes(secret));
 const dashboard=read('dashboard.js');assert(dashboard.includes('RAK_17059_DIAGNOSTIC_DIALOG_GUARD'));
 const alertBlock=extractConditionalBlock(dashboard,'if (actual && actual.queued > 0');
 let displayed='';evaluateExpression(alertBlock,{actual:{...s,queued:1},source:'dashboard-click',window:{alert:t=>{displayed=t;}}});
 assert(displayed.includes('Čeká: 1'));assert(displayed.includes('Typ: neznámá položka'));assert(!displayed.includes(secret));
 displayed='';evaluateExpression(alertBlock,{actual:{...s,queued:1},source:'automatic',window:{alert:t=>{displayed=t;}}});assert.equal(displayed,'');
});
test('two builds keep historical 1.7.58 tests and final gates, offline Chromium, HTTP, CRC',()=>{
 const chain=read('tools/development-version-17048.mjs');assert(chain.includes("await import('./development-version-17058.mjs');"));assert(chain.includes("await import('./development-version-17059.mjs');"));
 assert(chain.indexOf('17058.mjs')<chain.indexOf('17059.mjs'));
 const replay=read('tools/shift-report-mo-hotfix-170-smoke.mjs');assert(replay.includes('RAK_17059_TWO_PASS_GUARD'));
 assert(replay.includes(`already17059?"var build='${BUILD}';":already17058?`));
 const ci=read('.github/workflows/rak-development-validation.yml');for(const phrase of ['npm run vercel-build\n          npm run vercel-build','node --test tools/release-gate-17059.test.mjs','node tools/browser-offline-17052.mjs','node tools/http-anon-audit-17050.mjs','node tools/backup-source-integrity-17051.mjs'])assert(ci.includes(phrase));
 assert.equal(verifyRoadmapProgress(read('RAK_PLAN_13.md')).length,13);
});
