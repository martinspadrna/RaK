import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const VERSION='1.7.62',BUILD='v1.7.62-safe-review1';
function section(s,b,e){const a=s.indexOf(b),z=s.indexOf(e,a+b.length);assert(a>=0&&z>a,'missing section '+b);return s.slice(a,z);}
test('1.7.62 release markers, TEST DB, technical version and OS-only login',()=>{
 for(const [p,s] of [['index.html',`var build='${BUILD}';`],['sw.js',`const CACHE_VERSION = 'v${VERSION}';`],['sw.js',`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],['sw.js',`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],['app.js',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],['app.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],['supabase-config.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],['supabase-config.js',`window.RAK_PWA_BUILD = "${BUILD}";`]])assert(read(p).includes(s),p);
 assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
 assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
 assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"));
});
test('MO/TO editable date gets slightly narrower; iOS font 16px and absence inputs unaffected in width',()=>{
 const css=section(read('styles-inline-legacy.css'),'/* RAK_17062_DATE_AND_IOS_FONT_GUARD:', '/* END_RAK_17062_DATE_AND_IOS_FONT_GUARD */');
 assert(css.includes('.appMenuAdminRotationTable col:first-child {width:88px !important;}'));
 assert(css.includes('width:86px !important;min-width:86px !important;max-width:86px !important;'));
 assert.equal((css.match(/font-size:16px !important/g)||[]).length,2);
 assert(css.includes('.appMenuAdminAbsenceTable input[data-note-field="date"]'));
 assert(!css.includes('input[data-note-field="person"]')&&!css.includes('input[data-note-field="code"]'));
 assert(read('styles-inline-legacy.css').indexOf('RAK_17062_DATE_AND_IOS_FONT_GUARD')>read('styles-inline-legacy.css').indexOf('END_RAK_17061_ABSENCE_CSS'));
 const browser=read('tools/browser-absence-layout-17061.mjs');
 assert(browser.includes('data.rotDate.width>=85&&data.rotCell>=87'));
 assert(browser.includes('data.rotDate.font>=16&&data.absDate.font>=16'));
 assert(browser.includes('data.rotDate.content>=data.rotDate.text+1'));
});
function fixture(raw,compact){
 let text=raw,writes=0;const state={queueGuard:{storageError:'',rejected:0}};
 const ctx={state,localStorage:{getItem:()=>text,setItem:(_key,value)=>{text=value;writes++}},LOCAL_QUEUE_KEY:'queue',JSON,Date,Math,SUPABASE_QUEUE_MAX_ITEMS:120,
 compactQueue:compact,queueTaskKey:q=>String(q.id),normalizeQueueTask:q=>q};
 const source=section(read('supabase-bridge.js'),'  // RAK_17060_DURABLE_QUEUE_GUARD:', '\n  function isLikelyOfflineError(');
 vm.runInNewContext(source+'\n globalThis.__storage={readQueue,writeQueue,enqueueTask};',ctx);
 return {api:ctx.__storage,state,getRaw:()=>text,getWrites:()=>writes};
}
test('ambiguous legacy queue is never rewritten, cannot be appended or accidentally flushed',()=>{
 const raw='[{"id":"first","type":"bug_report","entry":{"private":"SECRET"}},{"id":"second","type":"bug_report"}]';
 const f=fixture(raw,items=>items.slice(1));
 assert.equal(f.api.readQueue().length,0);assert.equal(f.state.queueGuard.storageError,'ambiguous');
 assert.equal(f.api.enqueueTask({id:'third',type:'bug_report'}),null);
 assert.equal(f.api.writeQueue([]),false);
 assert.equal(f.getRaw(),raw);assert.equal(f.getWrites(),0);
});
test('candidate write is rejected before changing storage if normalization drops distinct entries',()=>{
 const f=fixture('[]',items=>items.filter(item=>item.id!=='drop'));
 assert.equal(f.api.writeQueue([{id:'drop',type:'bug_report'},{id:'keep',type:'bug_report'}]),false);
 assert.equal(f.getRaw(),'[]');assert.equal(f.getWrites(),0);assert.equal(f.state.queueGuard.storageError,'ambiguous');
});
test('ordinary append stays valid and rereads verified bytes',()=>{
 const f=fixture('[]',q=>q);
 assert(f.api.enqueueTask({type:'bug_report',entry:{id:'safe'}}));
 assert.equal(f.api.readQueue().length,1);assert.equal(f.state.queueGuard.storageError,'');
 assert.equal(JSON.parse(f.getRaw()).length,1);
});
function reviewFixture(raw){
 let writes=0,network=0;
 const ctx={LOCAL_QUEUE_KEY:'queue',localStorage:{getItem:()=>raw,setItem:()=>{writes++;throw Error('no writes');}},
  state:{rotationSync:{lastReadAt:new Date().toISOString(),lastSource:'remote',lastError:null}},Date};
 const source=section(read('supabase-bridge.js'),'  // RAK_17062_READONLY_REVIEW_GUARD:', '  // RAK_17060_QUEUE_RESCUE_EXPORT_GUARD:');
 vm.runInNewContext(source+'\n globalThis.__review=getRakPendingSyncReview;',ctx);
 return {review:()=>ctx.__review(),writes:()=>writes,network:()=>network};
}
test('read-only conflict summary includes fixed labels/counts, never personal data, IDs or raw errors',()=>{
 const raw=JSON.stringify([{id:'123456',type:'rotation_state',conflict:'PRIVATE-ERROR',payload:{name:'PERSON-PRIVATE',token:'TOKEN-PRIVATE'}},
 {id:'abc',type:'bug_report',entry:{person:'PERSON-PRIVATE',message:'SECRET-REPORT'}},
 {id:'bad',type:'private-JWT-TOKEN',conflict:'AUTH-PRIVATE'}]);
 const f=reviewFixture(raw),review=f.review(),serialized=JSON.stringify(review);
 assert.equal(review.total,3);assert.equal(review.held,2);assert.equal(review.retryable,1);
 assert.equal(review.unrecognized,1);assert.equal(review.serverContentCompared,false);
 assert.equal(review.remoteVerified,true);assert.equal(review.storageIssue,true);
 assert(review.labels.some(x=>x.label==='starší rozpis'&&x.count===1));
 for(const secret of ['123456','PERSON-PRIVATE','TOKEN-PRIVATE','SECRET-REPORT','PRIVATE-ERROR','private-JWT-TOKEN','AUTH-PRIVATE'])assert(!serialized.includes(secret));
 assert.equal(f.writes(),0);assert.equal(f.network(),0);
});
test('missing, corrupt and non-array backup metadata fails closed and is never rewritten',()=>{
 for(const raw of [null,'{BAD','{"user":"private"}']){
  const f=reviewFixture(raw),result=f.review();assert.equal(result.storageIssue,raw!==null);
  assert.equal(result.serverContentCompared,false);assert.equal(f.writes(),0);
 }
});
test('badge only reports sanitized counts and explicitly says server content was not compared',()=>{
 const src=read('dashboard.js');assert(src.includes('RAK_17062_READONLY_DIALOG_GUARD'));
 for(const phrase of ['Zadržené: ','Ostatní: ','Online načtení: ','Obsah serveru a telefonu nebyl porovnán.'])assert(src.includes(phrase));
 const bridge=read('supabase-bridge.js');assert(bridge.includes('window.getRakPendingSyncReview = getRakPendingSyncReview;'));
 assert(bridge.includes('downloadPendingSyncBackup')&&bridge.includes('RAK_17060_QUEUE_RESCUE_EXPORT_GUARD'));
 assert(!section(bridge,'  // RAK_17062_READONLY_REVIEW_GUARD:', '  // RAK_17060_QUEUE_RESCUE_EXPORT_GUARD:').includes('.rpc('));
});
test('full historical gates, two builds, SHA/ZIP, Chromium mobile/offline and live TEST HTTP remain mandatory',()=>{
 const chain=read('tools/development-version-17048.mjs');
 assert(chain.includes("await import('./development-version-17061.mjs');"));
 assert(chain.includes("execFileSync(process.execPath,['--test','tools/release-gate-17061.test.mjs']"));
 assert(chain.includes("await import('./development-version-17062.mjs');"));
 const replay=read('tools/shift-report-mo-hotfix-170-smoke.mjs');assert(replay.includes('RAK_17062_TWO_PASS_GUARD'));
 assert(replay.includes(`already17062?"var build='${BUILD}';":already17061?`));
 const ci=read('.github/workflows/rak-development-validation.yml');
 for(const v of ['npm run vercel-build\n          npm run vercel-build','node --test tools/release-gate-17060.test.mjs','node --test tools/release-gate-17061.test.mjs',
 'node --test tools/release-gate-17062.test.mjs','node tools/browser-absence-layout-17061.mjs','node tools/browser-offline-17052.mjs',
 'node tools/http-anon-audit-17050.mjs','node tools/backup-source-integrity-17051.mjs'])assert(ci.includes(v),v);
 const plan=read('RAK_PLAN_17062_STATUS.md');
 for(const v of ['P0.1','P0.2','P0.3','P0.4','P1.1','P1.2','P1.3','P1.4','P1.5','P2.1','P2.2','P2.3','P2.4','2/13','11/13'])assert(plan.includes(v));
});
