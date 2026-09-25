import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {extractConditionalBlock,extractNamedDeclaration,runNamedDeclarations} from './runtime-vm-fixture.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const VERSION='1.7.63',BUILD='v1.7.63-casbaseline1';
test('visible and internal versions aligned; technical 1.7.0 and TEST Supabase unchanged',()=>{
 for(const [p,s] of [['index.html',`var build='${BUILD}';`],['sw.js',`const CACHE_VERSION = 'v${VERSION}';`],['sw.js',`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],['sw.js',`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],['app.js',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],['app.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],['supabase-config.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],['supabase-config.js',`window.RAK_PWA_BUILD = "${BUILD}";`]])assert(read(p).includes(s),p);
 assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
 assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
 assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"));
});
function rotationFixture(revision,reply){
 const state={rotationRevision:revision},calls={lookup:0,save:0};
 const client={from:()=>{calls.lookup++;return {}},rpc:async(name,args)=>{
   calls.save++;assert.equal(name,'rak_admin_save_rotation_v2');assert.equal(args.p_expected_revision,revision);
   return reply||{data:{revision:revision+1},error:null};}};
 const ctx={state,hasSecureAdminContext:()=>true,isSupabaseRpcUnavailableError:()=>false,
   SUPABASE_RPC_HARDENING_STATUS:{},console:{warn:()=>{}}};
 const {api}=runNamedDeclarations({modules:[{source:read('supabase-bridge.js'),names:['trySaveRotationStateViaRpc']}],globals:ctx,exports:{save:'trySaveRotationStateViaRpc'}});
 return {run:()=>api.save(client,{key:'main',payload:{months:{}},meta:{}},{}),state,calls};
}
test('unknown editor revision rejects before ANY online read or write; cannot silently adopt current server revision',async()=>{
 for(const value of [null,undefined,NaN,1.5,-1,'7']){
   const f=rotationFixture(value);
   await assert.rejects(()=>f.run(),e=>e&&e.code==='RAK_ROTATION_REVISION_UNVERIFIED');
   assert.equal(f.calls.lookup,0);assert.equal(f.calls.save,0);assert.equal(f.state.rotationRevision,value);
 }
 const bridge=read('supabase-bridge.js');
 assert(bridge.includes('RAK_17063_UNKNOWN_BASELINE_GUARD'));
 assert(!extractNamedDeclaration(bridge,'trySaveRotationStateViaRpc').includes(".from('rotation_state')"));
});
test('known revision is passed unchanged to atomic server CAS and updated only after successful RPC',async()=>{
 const f=rotationFixture(7);const saved=await f.run();
 assert.equal(f.calls.lookup,0);assert.equal(f.calls.save,1);assert.equal(saved.revision,8);assert.equal(f.state.rotationRevision,8);
});
test('server CAS mismatch is propagated with local revision intact, no client fallback',async()=>{
 const rejected=new Error('Conflict');rejected.code='40001';
 const f=rotationFixture(7,{data:null,error:rejected});
 await assert.rejects(()=>f.run(),e=>e===rejected);
 assert.equal(f.calls.lookup,0);assert.equal(f.calls.save,1);assert.equal(f.state.rotationRevision,7);
});
function monthFixture(authorized,rpcReply,revision=3){
 const calls={rpc:0},state={rotationMonthRevisions:{'2026-10-01':revision}};
 const client={rpc:async(name,args)=>{
   calls.rpc++;
   assert.equal(name,'rak_admin_save_rotation_month_entries_v3');
   assert(Array.isArray(args.p_rows));
   assert.equal(args.p_expected_revision,revision);
   return rpcReply||{data:{inserted:2,revision:revision+1},error:null};
 },from:()=>{throw Error('direct table fallback forbidden')}};
 const ctx={hasSecureAdminContext:()=>authorized,state,
   rakRevisionConflictError:(message,code)=>Object.assign(new Error(message),{code,conflict:true}),
   rakIsSqlRevisionConflict:(err)=>String(err&&err.code||'')==='40001'};
 const {api}=runNamedDeclarations({modules:[{source:read('supabase-bridge.js'),names:['upsertRotationMonthEntriesDirect']}],globals:ctx,exports:{save:'upsertRotationMonthEntriesDirect'}});
 return {run:()=>api.save(client,'2026-10-01','10/26',[{employee_name:'worker'},{employee_name:'worker2'}]),calls,state};
}
test('month-entry write remains admin RPC-only and successors require verified server revision',async()=>{
 const blocked=monthFixture(false);await assert.rejects(()=>blocked.run(),/administrátorem/);
 assert.equal(blocked.calls.rpc,0);
 const ok=monthFixture(true),saved=await ok.run();
 assert.equal(saved.months,1);assert.equal(saved.entries,2);assert.equal(saved.revision,4);assert.equal(ok.calls.rpc,1);
 assert.equal(ok.state.rotationMonthRevisions['2026-10-01'],4);
 const unknown=monthFixture(true,null,-1);
 await assert.rejects(()=>unknown.run(),e=>e&&e.code==='RAK_ROTATION_MONTH_REVISION_UNVERIFIED');
 assert.equal(unknown.calls.rpc,0);
 const body=extractNamedDeclaration(read('supabase-bridge.js'),'upsertRotationMonthEntriesDirect');
 assert(body.includes('RAK_17102_MONTH_CAS'));
 assert(!body.includes(".from('rotation_months')")&&!body.includes(".from('rotation_entries')"));
});

function reviewFixture(opts={}){
 const calls={identity:0,context:0,read:0,write:0};
 const client={auth:{getUser:async()=>{calls.identity++;return opts.userError?{error:new Error('invalid'),data:null}:{data:{user:{id:'u1'}},error:null};}},
 rpc:async()=>{calls.context++;return {data:opts.context||{authenticated:true,role:'admin',account_id:'owner1',user_id:'u1'},error:null};},
 from:()=>{calls.read++;return {select:()=>({eq:()=>({maybeSingle:async()=>({data:{revision:opts.remote??9},error:null})})})};}};
 const ctx={navigator:{onLine:opts.online!==false},state:{rotationRevision:opts.local??8,adminAuth:{context:{account_id:'owner1'}}},
 hasSecureAdminContext:()=>opts.authorized!==false,getRakPendingSyncReview:()=>({storageIssue:!!opts.badQueue}),
 getClient:()=>client,Date};
 // Mirror the browser global: production code accesses window in this extracted fixture.
 ctx.window=ctx;
 const {api}=runNamedDeclarations({modules:[{source:read('supabase-bridge.js'),names:['reviewRakRotationRevisionOnDemand']}],globals:ctx,exports:{review:'reviewRakRotationRevisionOnDemand'}});
 return {review:()=>api.review(),calls};
}
test('remote inspection rejects offline/nonadmin/corrupt local queue BEFORE all remote requests',async()=>{
 for(const options of [{online:false},{authorized:false},{badQueue:true}]){
   const f=reviewFixture(options),result=await f.review();
   assert.equal(result.ok,false);assert.equal(result.eligibleForReplay,false);assert.equal(result.atomicWritePerformed,false);
   assert.equal(f.calls.identity,0);assert.equal(f.calls.context,0);assert.equal(f.calls.read,0);
 }
});
test('server-verified admin review reads ONLY revision; mismatch never authorizes replay or a write',async()=>{
 const f=reviewFixture({local:7,remote:9});const r=await f.review();
 assert.equal(r.ok,true);assert.equal(r.state,'revision-changed');assert.equal(r.remoteRevision,9);assert.equal(r.localRevision,7);
 assert.equal(r.serverContentCompared,false);assert.equal(r.atomicWritePerformed,false);assert.equal(r.eligibleForReplay,false);
 assert.equal(f.calls.identity,1);assert.equal(f.calls.context,1);assert.equal(f.calls.read,1);assert.equal(f.calls.write,0);
 assert(!JSON.stringify(r).includes('owner1')&&!JSON.stringify(r).includes('u1'));
});
test('matching version still DOES NOT imply equal content or authorize manual overwrite',async()=>{
 const equal=await reviewFixture({local:9,remote:9}).review();
 assert.equal(equal.state,'revision-equal');assert.equal(equal.eligibleForReplay,false);
 assert.equal(equal.serverContentCompared,false);
 const noRevision=await reviewFixture({local:-1,remote:9}).review();
 assert.equal(noRevision.state,'local-revision-unknown');assert.equal(noRevision.localRevision,null);
 const revoked=reviewFixture({userError:true}),denied=await revoked.review();
 assert.equal(denied.ok,false);assert.equal(revoked.calls.read,0);
});
test('manual badge confirmation only on user tap with conflict and admin; no payload or auto-write',()=>{
 const dashboard=read('dashboard.js');
 const code=extractConditionalBlock(dashboard,'if (actual && actual.conflictCount > 0');
 for(const piece of ["actual.conflictCount > 0","source === 'dashboard-click'","app.adminUnlocked === true","window.confirm(","reviewRakRotationRevisionOnDemand",'Nebyl proveden žádný zápis'])assert(code.includes(piece));
 assert(!code.includes('localStorage.')&&!code.includes('.delete(')&&!code.includes('.update('));
 const bridge=read('supabase-bridge.js');assert(bridge.includes('window.reviewRakRotationRevisionOnDemand = reviewRakRotationRevisionOnDemand;'));
});
test('historical gates run before release bump; two builds, mobile offline, backup CRC and TEST HTTP remain mandatory',()=>{
 const chain=read('tools/development-version-17048.mjs');
 assert(chain.includes("await import('./development-version-17062.mjs');"));
 assert(chain.includes("execFileSync(process.execPath,['--test','tools/release-gate-17062.test.mjs']"));
 assert(chain.includes("await import('./development-version-17063.mjs');"));
 const replay=read('tools/shift-report-mo-hotfix-170-smoke.mjs');assert(replay.includes('RAK_17063_TWO_PASS_GUARD'));
 assert(replay.includes(`already17063?"var build='${BUILD}';":already17062?`));
 const ci=read('.github/workflows/rak-development-validation.yml');
 for(const token of ['npm run vercel-build\n          npm run vercel-build','node --test tools/release-gate-17060.test.mjs','node --test tools/release-gate-17061.test.mjs',
 'node --test tools/release-gate-17062.test.mjs','node --test tools/release-gate-17063.test.mjs','node tools/browser-absence-layout-17061.mjs',
 'node tools/browser-offline-17052.mjs','node tools/http-anon-audit-17050.mjs','node tools/backup-source-integrity-17051.mjs'])assert(ci.includes(token),token);
 const status=read('RAK_PLAN_17063_STATUS.md');for(const id of ['P0.1','P0.2','P0.3','P0.4','P1.1','P1.2','P1.3','P1.4','P1.5','P2.1','P2.2','P2.3','P2.4','2/13','11/13'])assert(status.includes(id));
});
