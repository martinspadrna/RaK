#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {evaluateExpression,extractConditionalBlock,extractNamedDeclaration,runNamedDeclarations} from './runtime-vm-fixture.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const releaseIdentities=new Map([
 ['v1.7.67-equalgrid-reload1','1.7.67'],
 ['v1.7.68-async-draft-guard1','1.7.68'],
 ['v1.7.69-local-drafts1','1.7.69'],
 ['v1.7.70-canonical-source1','1.7.70'],
 ['v1.7.71-offline-rotation1','1.7.71'],
  ['v1.7.72-shift-report1','1.7.72'],
  ['v1.7.73-offline-persistence1','1.7.73'],['v1.7.74-offline-cache1','1.7.74'],['v1.7.75-report-columns1','1.7.75']
]);
const buildMatch=read('index.html').match(/var build='(v1\.7\.\d+-[a-z0-9-]+)';/);
assert(buildMatch&&releaseIdentities.has(buildMatch[1]),'unsupported equal-grid successor');
const BUILD=buildMatch[1],DISPLAY=releaseIdentities.get(BUILD);
test('1.7.67 and verified successors keep aligned identifiers on TEST Supabase',()=>{
 for(const [p,s] of [['index.html',`var build='${BUILD}';`],['supabase-config.js',`window.RAK_RELEASE_VERSION = "${DISPLAY}";`],['supabase-config.js',`window.RAK_PWA_BUILD = "${BUILD}";`],['app.js',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],['sw.js',`const CACHE_VERSION = 'v${DISPLAY}';`],['sw.js',`const DEVELOPMENT_BUILD_ID = '${BUILD}';`]])assert(read(p).includes(s),p);
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
   const rendered=evaluateExpression(expr,context);
   assert(rendered.includes(`--rak-grid-width:${84+n*52}px`),section+' bad width for '+n);
  }
 }
 const css=read('styles-inline-legacy.css');
 for(const value of ['[data-daymod-section]','width:var(--rak-grid-width) !important','col:first-child {width:84px !important;}','col:not(:first-child) {width:52px !important;}','width:50px !important;min-width:50px !important;'])assert(css.includes(value),value);
 assert(read('styles-inline-legacy.css').includes('RAK_17066_COMPACT_MO_GRID'));
});
function reloadFixture(result,{dirty=true,allow=true,throwNetwork=false}={}){
 let guard=0,network=0;const status={textContent:''};
 const app={adminRotationDirty:dirty};
 const context={rakRotationSyncEpoch:0,app,document:{getElementById:id=>id==='adminRotationEditor'?{}:id==='adminRotationDraftStatus'?status:null},
  rakGuardAdminRotationDiscard:()=>{guard++;if(!allow)return false;app.adminRotationDirty=false;return true;},
  syncRotationFromSupabase:async()=>{network++;if(throwNetwork)throw Error('offline');return result;}};
 const runtime=runNamedDeclarations({modules:[{source:read('admin-rotation.js'),names:['loadAdminRotationFromSupabase']}],globals:context,exports:{reload:'loadAdminRotationFromSupabase'}});
 return {app,status,run:()=>runtime.api.reload(),counts:()=>({guard,network})};
}
test('cancel online reload preserves editor and does not call network',async()=>{
 const f=reloadFixture({months:{}},{allow:false}),res=await f.run();assert.equal(res,null);
 assert.equal(f.app.adminRotationDirty,true);assert.deepEqual(f.counts(),{guard:1,network:0});
});
test('no result and thrown reload restore dirty status; valid response does not',async()=>{
 for(const options of [{},{throwNetwork:true}]){
  const f=reloadFixture(null,options),out=await f.run();assert.equal(out,null);
  assert.equal(f.app.adminRotationDirty,true);
  const expected=read('admin-rotation.js').includes('RAK_17068_LATE_EDIT_NOTICE')?'nebylo použito':'selhalo';
  assert(f.status.textContent.includes(expected),'reload must display its version-specific failure notice');
  assert.deepEqual(f.counts(),{guard:1,network:1});
 }
 const f=reloadFixture({months:{}},{});assert(await f.run());assert.equal(f.app.adminRotationDirty,false);
 assert.deepEqual(f.counts(),{guard:1,network:1});
});
test('manual reload never applies stale local cache before remote confirmation',async()=>{
 const source=read('app-rotation-sync.js');
 for(const payload of [null,{fresh:true}]){
  let cacheReads=0,applied=0;
  const bridge={loadCachedRotationState:()=>{cacheReads++;return {payload:{stale:true}};},loadRotationState:async()=>payload?{payload}:null};
  const context={window:{RotationSupabaseBridge:bridge},app:{adminRotationDirty:false},document:{getElementById:()=>null},
   applyRakRotationState:(value)=>{applied++;return value;},refreshRakMachineSettingsInBackground:()=>{},rakRefreshSyncBadgeTruth:()=>{},console:{warn:()=>{}}};
  const runtime=runNamedDeclarations({modules:[{source,names:['rakRotationSyncEpoch','rakRotationEditorFingerprint','syncRotationFromSupabase']}],globals:context,exports:{sync:'syncRotationFromSupabase'}});
  const actual=await runtime.api.sync('discard-draft');
  assert.equal(cacheReads,0,'stale cache was read before remote');
  assert.equal(applied,payload?1:0,'unconfirmed reload applied data');
  assert.equal(Boolean(actual),Boolean(payload));
 }
});
test('actual online button never re-renders on canceled, failed or offline read',()=>{
 const menu=read('app-menu.js');
 const handlers=extractNamedDeclaration(menu,'bindAppMenuHandlers');
 const block=extractConditionalBlock(handlers,"if (adminAction === 'load-online')");
 assert(block.includes('RAK_17067_ONLINE_RELOAD_RERENDER_GUARD'));
 assert(block.includes('if (!loaded) return;'));
 assert(block.indexOf('if (!loaded) return;')<block.indexOf('renderAdminMenuBody('));
 const central=extractNamedDeclaration(menu,'openAppMenu');
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
 const pkg=JSON.parse(read('package.json'));
 if(pkg.scripts['vercel-build']==='node tools/canonical-build.mjs build'){
  assert(read('tools/development-version-17067.mjs').includes('RAK_17067_TWO_PASS_GUARD'));
  assert(pkg.scripts['legacy:vercel-build'].includes('node tools/shift-report-mo-hotfix-170-smoke.mjs'));
 }else assert(read('tools/shift-report-mo-hotfix-170-smoke.mjs').includes('RAK_17067_TWO_PASS_GUARD'));
 const ci=read('.github/workflows/rak-development-validation.yml');
 for(const s of ['npm run vercel-build\n          npm run vercel-build','node --test tools/release-gate-17067.test.mjs','node tools/browser-equal-grid-17067.mjs','node tools/browser-soft-grid-17066.mjs','node tools/browser-offline-17052.mjs','node tools/browser-absence-layout-17061.mjs','node tools/backup-source-integrity-17051.mjs','node tools/http-anon-audit-17050.mjs'])assert(ci.includes(s),s);
 const plan=read('RAK_PLAN_17067_STATUS.md');
 for(const id of ['P0.1','P0.2','P0.3','P0.4','P1.1','P1.2','P1.3','P1.4','P1.5','P2.1','P2.2','P2.3','P2.4','2/13','11/13'])assert(plan.includes(id),id);
});