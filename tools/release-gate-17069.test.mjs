#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const part=(source,begin,end)=>{const a=source.indexOf(begin),b=source.indexOf(end,a+begin.length);assert(a>=0&&b>a,'missing '+begin);return source.slice(a,b);};
const storage=(initial={})=>{
 const map=new Map(Object.entries(initial));
 return {get length(){return map.size;},key:i=>Array.from(map.keys())[i]??null,
  getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),
  snapshot:()=>Object.fromEntries(map)};
};
const key='rak_admin_unsynced_month_v1_9_26_1234567890_abcd12';
const draft=JSON.stringify({format:'rak-admin-month-draft-v1',monthKey:'9/26',month:{hard:{rows:[]},soft:{rows:[]}}});
function bridgeFixture(initial,opts={}){
 const localStorage=storage(initial),window={};
 const context={window,localStorage,LOCAL_QUEUE_KEY:'rotace_supabase_queue_v1',
  flushPromise:opts.busy?Promise.resolve():null,hasSecureAdminContext:()=>opts.authorized!==false,
  app:{adminUnlocked:opts.unlocked!==false}};
 const code=part(read('supabase-bridge.js'),'  // RAK_17069_LOCAL_DRAFT_QUEUE_GUARD','  window.getSupabaseSyncStatus = getSyncUiStatus;');
 vm.runInNewContext(code,context);
 return {window,localStorage,context};
}
test('confirmed cleanup removes only local month drafts and rotation tasks; keeps settings, games, unrelated storage',()=>{
 const queue=[{id:'a',type:'rotation_state',conflict:'admin-review-required'},
  {id:'b',type:'machine_settings',conflict:'admin-review-required',settings:{private:'KEEP'}},
  {id:'c',type:'rotation_month_entries',monthStart:'2026-09-01'},
  {id:'d',type:'game_session',payload:{important:true}}];
 const other={keep:'do-not-touch'};
 const f=bridgeFixture({[key]:draft,rotace_supabase_queue_v1:JSON.stringify(queue),unrelated:JSON.stringify(other)});
 const preview=f.window.rakLocalRotationDraftCleanupPreview();
 assert.equal(preview.ok,true);assert.equal(preview.drafts,1);assert.equal(preview.rotationQueued,2);
 assert.equal(preview.otherQueued,2);assert.equal(preview.otherConflicts,1);
 assert.equal(f.window.rakDiscardLocalRotationDrafts('wrong').ok,false);
 assert.equal(f.localStorage.getItem(key),draft,'without correct confirmation nothing removed');
 const result=f.window.rakDiscardLocalRotationDrafts(preview.signature);
 assert.equal(result.ok,true);assert.equal(result.drafts,1);assert.equal(result.rotationQueued,2);
 assert.equal(f.localStorage.getItem(key),null);
 assert.deepEqual(JSON.parse(f.localStorage.getItem('rotace_supabase_queue_v1')),queue.filter(t=>!['rotation_state','rotation_month_entries'].includes(t.type)));
 assert.equal(f.localStorage.getItem('unrelated'),JSON.stringify(other));
 assert.equal(f.window.rakLocalRotationDraftCleanupPreview().otherConflicts,1);
});
test('changed storage rejects stale confirmation without deleting anything',()=>{
 const f=bridgeFixture({[key]:draft,rotace_supabase_queue_v1:JSON.stringify([{id:'a',type:'rotation_state'}])});
 const preview=f.window.rakLocalRotationDraftCleanupPreview();
 f.localStorage.setItem('rotace_supabase_queue_v1',JSON.stringify([{id:'a',type:'rotation_state'},{id:'b',type:'game_stat'}]));
 assert.equal(f.window.rakDiscardLocalRotationDrafts(preview.signature).ok,false);
 assert.equal(f.localStorage.getItem(key),draft);
});
test('corrupt queue, malformed draft, storage error, busy flush and missing admin fail closed',()=>{
 for(const [initial,options] of [
  [{[key]:draft,rotace_supabase_queue_v1:'{invalid'},{}],
  [{[key]:'{invalid',rotace_supabase_queue_v1:'[]'},{}],
  [{[key]:draft,rotace_supabase_queue_v1:'[]'},{busy:true}],
  [{[key]:draft,rotace_supabase_queue_v1:'[]'},{authorized:false}],
  [{[key]:draft,rotace_supabase_queue_v1:'[]'},{unlocked:true,authorized:false}]
 ]){
  const f=bridgeFixture(initial,options),p=f.window.rakLocalRotationDraftCleanupPreview();
  assert.equal(p.ok,false);
  assert.equal(f.window.rakDiscardLocalRotationDrafts(p.signature).ok,false);
  assert.deepEqual(f.localStorage.snapshot(),initial);
 }
});
test('a locally replaced draft also fails closed, without touching unrelated items',()=>{
 const f=bridgeFixture({[key]:draft,rotace_supabase_queue_v1:'[]'}),p=f.window.rakLocalRotationDraftCleanupPreview();
 f.localStorage.setItem(key,JSON.stringify({format:'rak-admin-month-draft-v1',monthKey:'9/26',month:{new:true}}));
 assert.equal(f.window.rakDiscardLocalRotationDrafts(p.signature).ok,false);
});
test('real admin button confirms before fetching; rejects cache/offline/race and never issues a server write',()=>{
 const menu=read('app-menu.js'),code=part(menu,'// RAK_17069_EXPLICIT_DRAFT_DISCARD:',"      if (adminAction === 'load-online') {");
 const prompt=code.indexOf('if(!confirm('),request=code.indexOf('await bridge.loadRotationState()');
 assert(prompt>=0&&request>prompt);
 for(const required of ['online.meta.source',"['remote','tables'].includes(source)",'fingerprint','before.signature','app.adminRotationDirty=false','rakInvalidateRotationSyncForDraftCleanup','renderAdminMenuBody(body,currentView)'])assert(code.includes(required),required);
 assert(!/\.saveRotationState\(|\.saveRotationMonthEntries\(|\.rpc\(|\.delete\(|\.update\(/.test(code),'cleanup must never write to Supabase');
 assert(menu.includes("if(adminAction==='discard-local-rotation-drafts')"));
});
test('1.7.69 TEST-only release, two builds, older gates and physical mobile checks remain mandatory',()=>{
 for(const [file,marker] of [
  ['index.html',"var build='v1.7.69-local-drafts1';"],
  ['supabase-config.js','window.RAK_RELEASE_VERSION = "1.7.69";'],
  ['app.js','const RAK_DEV_UPDATE_BUILD = "v1.7.69-local-drafts1";'],
  ['sw.js',"const CACHE_VERSION = 'v1.7.69';"]])assert(read(file).includes(marker),file);
 assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
 assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
 const chain=read('tools/development-version-17048.mjs');
 assert(chain.includes("await import('./development-version-17069.mjs');"));
 assert(read('tools/shift-report-mo-hotfix-170-smoke.mjs').includes('RAK_17069_TWO_PASS_GUARD'));
 assert(read('tools/release-gate-17068.test.mjs').includes('RAK_17069_HISTORICAL_GATE_COMPAT'));
 assert(read('tools/release-gate-17067.test.mjs').includes('RAK_17069_OLDER_GATE_COMPAT'));
 for(const p of ['tools/browser-equal-grid-17067.mjs','tools/browser-soft-grid-17066.mjs','tools/browser-absence-layout-17061.mjs'])assert(read(p).includes('17069'),p);
 const ci=read('.github/workflows/rak-development-validation.yml');
 for(const command of ['npm run vercel-build\n          npm run vercel-build','node --test tools/release-gate-17068.test.mjs','node --test tools/release-gate-17069.test.mjs','node tools/browser-equal-grid-17067.mjs','node tools/pwa-start-bench-17068.mjs','node tools/http-anon-audit-17050.mjs'])assert(ci.includes(command),command);
 assert(read('admin-rotation-editor.js').includes('RAK_17069_DRAFT_CLEANUP_CARD'));
 assert(read('app-rotation-sync.js').includes('RAK_17069_INVALIDATE_DISCARDED_REQUESTS'));
});
