import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const BUILD='v1.7.65-admin-draft-recovery1';
function excerpt(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert(a>=0&&b>a,'missing '+start);return source.slice(a,b);}
function fixture(result,options={}){
 const stored=options.stored||new Map(),writes=[],files=[];
 let network=0,confirmed=0,successExports=0;
 const app={rotation:{months:{'10/26':{old:true}}},adminUnlocked:true,adminRotationDirty:true};
 const storage={
  get length(){return stored.size;},key:i=>Array.from(stored.keys())[i]||null,
  setItem:(k,v)=>{if(options.deny)throw Error('quota');writes.push(k);stored.set(k,v);},
  getItem:k=>stored.get(k)||null,removeItem:k=>stored.delete(k)
 };
 const context={app,JSON,Date,Math,Blob,localStorage:storage,
  escapeHtml:v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),
  adminRotationGeneratorGetPendingDraft:()=>null,
  normalizeMonthForImport:o=>o,adminRotationValidateMonthRules:()=>({ok:true,issues:[]}),
  adminRotationFormatRuleIssues:()=>'',normalizeRotationData:r=>r,
  saveRotationData:()=>{},renderRotace:()=>{},renderMonth:()=>{},renderPerson:()=>{},
  saveRotationToSupabase:async()=>{network++;if(options.throwNetwork)throw Error('private error');return result;},
  window:{confirm:()=>{confirmed++;return !options.rejectConsent;},alert:()=>{}},
  document:{body:{appendChild:el=>files.push(el)},createElement:()=>({click(){successExports++;},remove(){}}),getElementById:()=>null},
  URL:{createObjectURL:()=> 'blob:private',revokeObjectURL:()=>{}},setTimeout:()=>{}};
 const editor=read('admin-rotation-editor.js');
 const helpers=excerpt(editor,'// RAK_17064_CONFLICT_DRAFT_GUARD:', '\nfunction adminRotationFindShiftForAbsenceDate(');
 const active=excerpt(editor,'async function saveAdminRotationFromDom(', '\nfunction adminShowRotationSelectedRemove(');
 vm.runInNewContext(helpers+'\n'+active+'\nglobalThis.__rak65={saveAdminRotationFromDom,rakListPreservedAdminMonthDrafts,rakAdminMonthDraftRecoveryHtml,rakDownloadPreservedAdminMonthDraft};',context);
 const month={notes:[{person:'PRIVATE-PERSON',date:'19.10. N',code:'NV'}]};
 return {app,stored,writes,files,month,save:()=>context.__rak65.saveAdminRotationFromDom('10/26',{normalizedMonth:month,ruleCheck:{ok:true,issues:[]}}),
  list:()=>context.__rak65.rakListPreservedAdminMonthDrafts('10/26'),html:()=>context.__rak65.rakAdminMonthDraftRecoveryHtml('10/26'),
  download:key=>context.__rak65.rakDownloadPreservedAdminMonthDraft(key),network:()=>network,confirmed:()=>confirmed,exports:()=>successExports};
}
test('1.7.65 release, TEST DB and technical package',()=>{
 for(const [p,marker] of [['index.html',`var build='${BUILD}';`],['supabase-config.js','window.RAK_RELEASE_VERSION = "1.7.65";'],['supabase-config.js',`window.RAK_PWA_BUILD = "${BUILD}";`],['app.js',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],['sw.js',"const CACHE_VERSION = 'v1.7.65';"],['sw.js',`const DEVELOPMENT_BUILD_ID = '${BUILD}';`]])assert(read(p).includes(marker),p);
 assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
 assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
});
test('real Save Rozpis button creates durable draft BEFORE network and retains conflict',async()=>{
 const f=fixture({ok:false,reason:'revision-conflict'}),out=await f.save();
 assert.equal(f.network(),1);assert.equal(f.writes.length,1);assert.equal(f.stored.size,1);
 assert.equal(out.saveResult.ok,false);assert.equal(out.preservedDraft,true);assert.equal(out.draft.stored,true);
 assert.equal(f.app.adminRotationDirty,true);assert.equal(f.app.rotation.months['10/26'].old,true);
 assert.equal(JSON.parse(f.stored.values().next().value).month.notes[0].person,'PRIVATE-PERSON');
});
test('unavailable localStorage prevents network and provides manual export',async()=>{
 const f=fixture({ok:true},{deny:true}),out=await f.save();
 assert.equal(f.network(),0);assert.equal(out.saveResult.ok,false);
 assert.equal(out.saveResult.reason,'draft-storage-failed');assert.equal(out.draft.stored,false);
 assert(out.draft.content.includes('PRIVATE-PERSON'));
 assert.equal(f.app.adminRotationDirty,true);
});
test('null, thrown and queued responses never erase draft or apply unsaved changes',async()=>{
 for(const [response,opts] of [[null,{}],[{ok:true,queued:true},{}],[{ok:true},{throwNetwork:true}]]){
  const f=fixture(response,opts),out=await f.save();
  assert(out.saveResult.ok!==true||out.saveResult.queued===true);
  assert.equal(f.stored.size,1);assert.equal(f.app.adminRotationDirty,true);
  assert.equal(f.app.rotation.months['10/26'].old,true);
 }
});
test('confirmed online success clears only matching new draft, keeps older ones',async()=>{
 const oldKey='rak_admin_unsynced_month_v1_09_26_1234_abcd';
 const old=JSON.stringify({format:'rak-admin-month-draft-v1',monthKey:'09/26',capturedAt:'2026-09-10T11:00:00Z',month:{notes:[]}});
 const f=fixture({ok:true,months:1,entries:2},{stored:new Map([[oldKey,old]])});const out=await f.save();
 assert.equal(out.saveResult.ok,true);assert.equal(f.network(),1);
 assert.equal(f.stored.size,1);assert.equal(f.stored.get(oldKey),old);
 assert.equal(f.app.adminRotationDirty,false);
 assert.deepEqual(JSON.parse(JSON.stringify(f.app.rotation.months['10/26'])),f.month);
});
test('reopening editor lists private drafts without names; export requires click and consent',async()=>{
 const f=fixture({ok:false});await f.save();const key=f.list()[0].key;
 const next=fixture({ok:false},{stored:f.stored});
 assert.equal(next.list().length,1);
 const html=next.html();assert(html.includes('download-unsynced-draft'));
 for(const secret of ['PRIVATE-PERSON','19.10. N','"notes"'])assert(!html.includes(secret));
 assert.equal(next.exports(),0);assert.equal(next.download(key),true);
 assert.equal(next.confirmed(),1);assert.equal(next.exports(),1);assert.equal(next.stored.size,1);
 const denied=fixture({ok:false},{stored:f.stored,rejectConsent:true});assert.equal(denied.download(key),false);assert.equal(denied.exports(),0);
 assert.equal(next.download('rak_admin_unsynced_month_v1_fake'),false);
});
test('real menu connects draft recovery and game account auto-provisioning is removed',()=>{
 const source=read('app-menu.js');
 assert(source.includes('RAK_17065_NO_GAME_PROVISIONING_GUARD'));
 assert(!source.includes('ensureGameAccountsExistForWorkers(workerSettings.workers)'));
 assert(!source.includes('nových herních profilů:'));
 const save=excerpt(source,"if (adminAction === 'save-rotation') {", "if (adminAction === 'load-food-schedule') {");
 assert(save.includes('const result = await saveAdminRotationFromDom(monthKey, saveOptions);'));
 assert(save.includes('result.draft')&&save.includes('rakShowAdminDraftExport'));
 assert(save.includes("saveResult.reason === 'draft-storage-failed'"));
 assert(save.includes('saveResult.ok === true && saveResult.queued !== true'));
 assert(source.includes("if (adminAction === 'download-unsynced-draft')"));
 const editor=read('admin-rotation-editor.js');
 assert(editor.includes('rakAdminMonthDraftRecoveryHtml(monthKey)'));
 assert(editor.includes('RAK_17065_REAL_ADMIN_SAVE_GUARD'));
});
test('MO and TO narrower, absence untouched, iOS font and browser geometry preserved',()=>{
 const css=excerpt(read('styles-inline-legacy.css'),'/* RAK_17065_NARROW_MO_TO_DATE:', '/* END_RAK_17065_NARROW_MO_TO_DATE */');
 assert(css.includes('.appMenuAdminRotationTable col:first-child {width:84px !important;}'));
 assert(css.includes('width:82px !important;min-width:82px !important;max-width:82px !important;'));
 assert(css.includes('font-size:16px !important;'));
 assert(!css.includes('.appMenuAdminAbsenceTable'));
 const browser=read('tools/browser-absence-layout-17061.mjs');
 assert(browser.includes('RAK_17065_COMPAT_WIDTH_GUARD'));
 assert(browser.includes('data.rotDate.content>=data.rotDate.text+1'));
 assert(browser.includes('data.rotDate.width>=81&&data.rotDate.width<=83&&data.rotCell>=83'));
});
test('historical release gates, double build, CRC and frozen historical scope without coupling to current plan wording',()=>{
 const stage=read('tools/development-version-17048.mjs');
 assert(stage.includes("execFileSync(process.execPath,['--test','tools/release-gate-17064.test.mjs']"));
 assert(stage.includes("await import('./development-version-17065.mjs');"));
 assert(read('tools/shift-report-mo-hotfix-170-smoke.mjs').includes('RAK_17065_TWO_PASS_GUARD'));
 const ci=read('.github/workflows/rak-development-validation.yml');
 for(const s of ['npm run vercel-build\n          npm run vercel-build','node --test tools/release-gate-17065.test.mjs','node tools/browser-absence-layout-17061.mjs','node tools/backup-source-integrity-17051.mjs','node tools/http-anon-audit-17050.mjs'])assert(ci.includes(s),s);
 const plan=read('RAK_PLAN_17065_STATUS.md');
 for(const id of ['P0.1','P0.2','P0.3','P0.4','P1.1','P1.2','P1.3','P1.4','P1.5','P2.1','P2.2','P2.3','P2.4','2/13','11/13'])assert(plan.includes(id),id);
 assert(!plan.includes('game-session CAS'));
 const migration=read('tools/development-version-17065.mjs');
 assert(migration.includes('RAK_17065_LIVE_PLAN_IMMUTABLE'));
 assert(migration.includes("read('RAK_PLAN_17065_STATUS.md')"));
 assert(!migration.includes("read('RAK_PLAN_13.md')"),'historical build must not depend on evolving roadmap wording');
 assert(!migration.includes("write('RAK_PLAN_13.md'"),'historical build must never modify the live roadmap');
});
