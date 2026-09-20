#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const BUILD='v1.7.67-equalgrid-reload1';
function excerpt(s,b,e){const a=s.indexOf(b),z=s.indexOf(e,a+b.length);assert(a>=0&&z>a,'missing '+b);return s.slice(a,z);}
test('1.7.67 identifiers on TEST Supabase, no technical version change',()=>{
 for(const [p,s] of [['index.html',`var build='${BUILD}';`],['supabase-config.js','window.RAK_RELEASE_VERSION = "1.7.67";'],['supabase-config.js',`window.RAK_PWA_BUILD = "${BUILD}";`],['app.js',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],['sw.js',"const CACHE_VERSION = 'v1.7.67';"],['sw.js',`const DEVELOPMENT_BUILD_ID = '${BUILD}';`]])assert(read(p).includes(s),p);
 assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
 assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
});
test('real TO and MO render expressions generate identical widths for equal machine counts',()=>{
 const src=read('admin-rotation-editor.js');
 for(const [section,variable] of [['hard','hardMachines'],['soft','softMachines']]){
  const line=src.split('\n').find(l=>l.includes(`data-daymod-section="${section}" style="--rak-grid-width:`));
  assert(line,section+' real markup not changed');
  const expr=line.trim().replace(/,$/,'');
  for(const n of [3,4,5,6]){
   const context={[variable]:Array(n).fill('X')};
   const rendered=vm.runInNewContext(expr,context);
   assert(rendered.includes(`--rak-grid-width:${84+n*52}px`),section+' bad width for '+n);
  }
 }
 const css=excerpt(read('styles-inline-legacy.css'),'/* RAK_17067_EQUAL_MO_TO_GRID','/* END_RAK_17067_EQUAL_MO_TO_GRID */');
 for(const value of ['[data-daymod-section]','width:var(--rak-grid-width) !important','col:first-child {width:84px !important;}','col:not(:first-child) {width:52px !important;}','width:50px !important;min-width:50px !important;'])assert(css.includes(value),value);
 assert(!css.includes('appMenuAdminAbsenceTable'),'absence geometry must remain untouched');
 assert(read('styles-inline-legacy.css').includes('RAK_17066_COMPACT_MO_GRID'));
});
function reloadFixture(result,{dirty=true,allow=true,throwNetwork=false}={}){
 let guard=0,network=0;const status={textContent:''};
 const app={adminRotationDirty:dirty};
 const context={app,document:{getElementById:id=>id==='adminRotationEditor'?{}:id==='adminRotationDraftStatus'?status:null},
  rakGuardAdminRotationDiscard:()=>{guard++;if(!allow)return false;app.adminRotationDirty=false;return true;},
  syncRotationFromSupabase:async()=>{network++;if(throwNetwork)throw Error('offline');return result;}};
 vm.runInNewContext(excerpt(read('admin-rotation.js'),'async function loadAdminRotationFromSupabase() {','function adminRotationSettingsJson(')+'\nglobalThis.reload=loadAdminRotationFromSupabase;',context);
 return {app,status,run:()=>context.reload(),counts:()=>({guard,network})};
}
test('cancel online reload preserves editor and does not call network',async()=>{
 const f=reloadFixture({months:{}},{allow:false}),res=await f.run();assert.equal(res,null);
 assert.equal(f.app.adminRotationDirty,true);assert.deepEqual(f.counts(),{guard:1,network:0});
});
test('no result and thrown reload restore dirty status; valid response does not',async()=>{
 for(const options of [{},{throwNetwork:true}]){
  const f=reloadFixture(null,options),out=await f.run();assert.equal(out,null);
  assert.equal(f.app.adminRotationDirty,true);assert(f.status.textContent.includes('selhalo'));
  assert.deepEqual(f.counts(),{guard:1,network:1});
 }
 const f=reloadFixture({months:{}},{});assert(await f.run());assert.equal(f.app.adminRotationDirty,false);
 assert.deepEqual(f.counts(),{guard:1,network:1});
});
test('manual reload never applies stale local cache before remote confirmation',async()=>{
 const source=excerpt(read('app-rotation-sync.js'),'async function syncRotationFromSupabase(force) {','function getRakAdminPinForWrite()');
 for(const payload of [null,{fresh:true}]){
  let cacheReads=0,applied=0;
  const bridge={loadCachedRotationState:()=>{cacheReads++;return {payload:{stale:true}};},loadRotationState:async()=>payload?{payload}:null};
  const context={window:{RotationSupabaseBridge:bridge},app:{adminRotationDirty:false},document:{getElementById:()=>null},
   applyRakRotationState:(value)=>{applied++;return value;},refreshRakMachineSettingsInBackground:()=>{},rakRefreshSyncBadgeTruth:()=>{},console:{warn:()=>{}}};
  vm.runInNewContext(source+'\nglobalThis.sync=syncRotationFromSupabase;',context);
  const actual=await context.sync('discard-draft');
  assert.equal(cacheReads,0,'stale cache was read before remote');
  assert.equal(applied,payload?1:0,'unconfirmed reload applied data');
  assert.equal(Boolean(actual),Boolean(payload));
 }
});
test('actual online button never re-renders on canceled, failed or offline read',()=>{
 const menu=read('app-menu.js');
 const block=excerpt(menu,"if (adminAction === 'load-online') {","if (adminAction === 'load-rotation-backups') {");
 assert(block.includes('RAK_17067_ONLINE_RELOAD_RERENDER_GUARD'));
 assert(block.includes('if (!loaded) return;'));
 assert(block.indexOf('if (!loaded) return;')<block.indexOf('renderAdminMenuBody('));
 const central=excerpt(menu,'function openAppMenu(view) {','const versionText = getRakCurrentAppVersion();');
 assert(central.includes('RAK_17067_CENTRAL_MENU_DRAFT_GUARD'));
 assert(central.indexOf('rakGuardAdminRotationDiscard()')<central.indexOf('const page = ensureAppMenuOverlay()'));
 assert(read('admin-rotation.js').includes('RAK_17067_RESTORE_DIRTY_ON_FAILURE'));
 assert(read('app-rotation-sync.js').includes('RAK_17067_SKIP_CACHE_ON_FORCE'));
});
test('two builds, real browser gates, ZIP/CRC, TEST HTTP and 13 point tracking',()=>{
 const stages=read('tools/development-version-17048.mjs');
 assert(stages.includes("await import('./development-version-17066.mjs');"));
 assert(stages.includes("execFileSync(process.execPath,['--test','tools/release-gate-17066.test.mjs']"));
 assert(stages.includes("await import('./development-version-17067.mjs');"));
 assert(read('tools/shift-report-mo-hotfix-170-smoke.mjs').includes('RAK_17067_TWO_PASS_GUARD'));
 const ci=read('.github/workflows/rak-development-validation.yml');
 for(const s of ['npm run vercel-build\n          npm run vercel-build','node --test tools/release-gate-17067.test.mjs','node tools/browser-equal-grid-17067.mjs','node tools/browser-soft-grid-17066.mjs','node tools/browser-offline-17052.mjs','node tools/backup-source-integrity-17051.mjs','node tools/http-anon-audit-17050.mjs'])assert(ci.includes(s),s);
 const plan=read('RAK_PLAN_17067_STATUS.md');
 for(const id of ['P0.1','P0.2','P0.3','P0.4','P1.1','P1.2','P1.3','P1.4','P1.5','P2.1','P2.2','P2.3','P2.4','2/13','11/13'])assert(plan.includes(id),id);
});