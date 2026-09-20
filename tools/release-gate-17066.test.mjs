#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const BUILD='v1.7.66-softgrid-draftguard1';
const NEXT_BUILD='v1.7.67-equalgrid-reload1';
const is67=()=>read('index.html').includes(`var build='${NEXT_BUILD}';`);
function excerpt(s,b,e){const x=s.indexOf(b),y=s.indexOf(e,x+b.length);assert(x>=0&&y>x,'missing '+b);return s.slice(x,y);}
function guardFixture({dirty=true,admin=true,stored=true,confirm=true,throwRead=false}={}){
 let reads=0,preserves=0,confirms=0,exports=0;
 const app={adminUnlocked:admin,adminRotationDirty:dirty,selectedMonth:'09/26'};
 const status={textContent:''};
 const context={app,document:{getElementById:id=>id==='adminRotationEditor'?{}:(id==='adminRotationDraftStatus'?status:null)},
   getAdminSelectedMonthKey:()=> '09/26',readAdminRotationFromDom:()=>{reads++;if(throwRead)throw Error('invalid');return {notes:[{person:'PRIVATE'}]};},
   rakPreserveAdminMonthDraft:(key,month)=>{preserves++;assert.equal(key,'09/26');assert.equal(month.notes[0].person,'PRIVATE');return {stored,content:'PRIVATE JSON'};},
   rakShowAdminDraftExport:()=>{exports++;},window:{confirm:()=>{confirms++;return confirm;}}};
 const source=read('admin-rotation-editor.js');
 vm.runInNewContext(excerpt(source,'// RAK_17066_DIRTY_NAVIGATION_GUARD:','function adminRotationFindShiftForAbsenceDate(')+'\nglobalThis.guard=rakGuardAdminRotationDiscard;',context);
 return {app,status,guard:()=>context.guard(),counts:()=>({reads,preserves,confirms,exports})};
}
test('1.7.66 baseline or explicitly checked 1.7.67 successor, TEST-only Supabase and stable package',()=>{
 const newer=is67();
 const build=newer?NEXT_BUILD:BUILD;
 const version=newer?'1.7.67':'1.7.66';
 for(const [p,part] of [['index.html',`var build='${build}';`],['supabase-config.js',`window.RAK_PWA_BUILD = "${build}";`],['supabase-config.js',`window.RAK_RELEASE_VERSION = "${version}";`],['app.js',`const RAK_DEV_UPDATE_BUILD = "${build}";`],['sw.js',`const CACHE_VERSION = 'v${version}';`],['sw.js',`const DEVELOPMENT_BUILD_ID = '${build}';`]])assert(read(p).includes(part),p);
 assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
 assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
});
test('real 1.7.66 MO grid remains guarded; 1.7.67 successor explicitly verifies equal MO/TO geometry',()=>{
 const source=read('admin-rotation-editor.js');
 const newer=is67();
 if(newer){
  for(const [section,machines] of [['soft','softMachines'],['hard','hardMachines']]){
   const line=source.split('\n').find(l=>l.includes(`data-daymod-section="${section}" style="--rak-grid-width:`));
   assert(line,'real '+section+' table must carry equal-grid width');
   const expression=line.trim().replace(/,$/,'');
   for(const count of [3,4,5,6]){
    const context={[machines]:Array(count).fill('machine')};
    const markup=vm.runInNewContext(expression,context);
    assert(markup.includes(`--rak-grid-width:${84+52*count}px;`),'wrong '+section+' width '+count);
   }
  }
  const css67=excerpt(read('styles-inline-legacy.css'),'/* RAK_17067_EQUAL_MO_TO_GRID','/* END_RAK_17067_EQUAL_MO_TO_GRID */');
  for(const required of ['[data-daymod-section]','width:var(--rak-grid-width) !important','col:not(:first-child) {width:52px !important;}','width:50px !important;min-width:50px !important;'])assert(css67.includes(required),required);
  assert(!css67.includes('appMenuAdminAbsenceTable'),'absence remains untouched');
 }else{
  const soft=source.split('\n').find(line=>line.includes('style="--rak-soft-grid-width:') && line.includes('data-daymod-section="soft"'));
  assert(soft,'real MO table must carry measured width');
  const expression=soft.trim().replace(/,$/,'');
  for(const count of [3,4,5,6]){
   const context={softMachines:Array(count).fill('machine')};
   const markup=vm.runInNewContext(expression,context);
   assert(markup.includes(`--rak-soft-grid-width:${84+48*count}px;`),'wrong MO width '+count);
   assert(markup.includes('data-daymod-section="soft"'));
  }
  assert(source.includes(`data-daymod-section="hard">',`),'TO markup must remain separate');
 }
 const css=excerpt(read('styles-inline-legacy.css'),'/* RAK_17066_COMPACT_MO_GRID:','/* END_RAK_17066_COMPACT_MO_GRID */');
 for(const required of ['[data-daymod-section="soft"]','width:var(--rak-soft-grid-width) !important','col:not(:first-child) {width:48px !important;}','width:46px !important;min-width:46px !important;max-width:46px !important;'])assert(css.includes(required),required);
 assert(!css.includes('[data-daymod-section="hard"]')&&!css.includes('AbsenceTable'),'historic 1.7.66 CSS unchanged');
 assert(read('styles-inline-legacy.css').includes('RAK_17065_NARROW_MO_TO_DATE'));
});
test('dirty editor: draft must be verified before asking consent; cancellation never clears edits',()=>{
 const f=guardFixture({confirm:false});assert.equal(f.guard(),false);assert.equal(f.app.adminRotationDirty,true);
 assert.deepEqual(f.counts(),{reads:1,preserves:1,confirms:1,exports:0});
 const yes=guardFixture();assert.equal(yes.guard(),true);assert.equal(yes.app.adminRotationDirty,false);
 assert.deepEqual(yes.counts(),{reads:1,preserves:1,confirms:1,exports:0});
});
test('localStorage failure, no admin or unreadable DOM fail closed; clean navigation does not save',()=>{
 const denied=guardFixture({stored:false});assert.equal(denied.guard(),false);assert.equal(denied.app.adminRotationDirty,true);
 assert.equal(denied.counts().confirms,0);assert.equal(denied.counts().exports,1);assert(denied.status.textContent.includes('zastaveno'));
 const admin=guardFixture({admin:false});assert.equal(admin.guard(),false);assert.equal(admin.counts().reads,0);
 const broken=guardFixture({throwRead:true});assert.equal(broken.guard(),false);assert.equal(broken.counts().confirms,0);
 const clean=guardFixture({dirty:false});assert.equal(clean.guard(),true);assert.equal(clean.counts().preserves,0);
});
test('actual navigation and online reload use the same verified draft guard BEFORE rerender or sync',()=>{
 const menu=read('app-menu.js');
 for(const marker of ['RAK_17066_MENU_NAVIGATION_GUARD','RAK_17066_YEAR_SWITCH_GUARD','RAK_17066_MONTH_SWITCH_GUARD'])assert(menu.includes(marker));
 for(const [begin,end] of [["if (adminYearKey) {","if (adminMonthKey) {"],["if (adminMonthKey) {","if (target.hasAttribute('data-admin-clear-field'))"]]){
  const block=excerpt(menu,begin,end);
  assert(block.indexOf('rakGuardAdminRotationDiscard()')>=0,'guard missing');
  assert(block.indexOf('rakGuardAdminRotationDiscard()')<block.indexOf('renderAdminMenuBody(body, currentView)'),'guard too late');
 }
 assert(excerpt(menu,"if (adminAction === 'back-admin') {","if (adminAction === 'open-machines')").includes('rakGuardAdminRotationDiscard'));
 const reload=excerpt(read('admin-rotation.js'),'async function loadAdminRotationFromSupabase() {','function adminRotationSettingsJson(');
 assert(reload.includes('RAK_17066_RELOAD_GUARD'));
 assert(reload.indexOf('rakGuardAdminRotationDiscard()')<reload.indexOf("syncRotationFromSupabase('discard-draft')"));
 assert(!reload.includes('Opravdu je zahodit a načíst online stav?'),'no unbacked discard prompt');
 assert(menu.includes('RAK_17065_NO_GAME_PROVISIONING_GUARD'));
});
test('historical 1.7.65 still runs on BOTH builds; final browser and archive/HTTP gates mandatory',()=>{
 const stage=read('tools/development-version-17048.mjs');
 assert(stage.includes("execFileSync(process.execPath,['--test','tools/release-gate-17065.test.mjs']"));
 assert(stage.includes("await import('./development-version-17066.mjs');"));
 assert(read('tools/shift-report-mo-hotfix-170-smoke.mjs').includes('RAK_17066_TWO_PASS_GUARD'));
 const browser=read('tools/browser-absence-layout-17061.mjs');assert(browser.includes('RAK_17066_BROWSER_DATE_COMPAT'));
 const ci=read('.github/workflows/rak-development-validation.yml');
 for(const item of ['npm run vercel-build\n          npm run vercel-build','node --test tools/release-gate-17066.test.mjs','node tools/browser-soft-grid-17066.mjs','node tools/browser-offline-17052.mjs','node tools/backup-source-integrity-17051.mjs','node tools/http-anon-audit-17050.mjs'])assert(ci.includes(item),item);
 const plan=read('RAK_PLAN_17066_STATUS.md');
 for(const id of ['P0.1','P0.2','P0.3','P0.4','P1.1','P1.2','P1.3','P1.4','P1.5','P2.1','P2.2','P2.3','P2.4','2/13','11/13'])assert(plan.includes(id),id);
});