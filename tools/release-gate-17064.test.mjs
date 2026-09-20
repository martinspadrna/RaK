import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const BUILD='v1.7.64-conflict-draft1';
function excerpt(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert(a>=0&&b>a,start);return source.slice(a,b);}
function fixture(result,denyStorage=false){
 let saved=new Map(),clicked=0,exported=0,networkStorageAt=null,confirmCount=0;
 const children=[];
 const parent={appendChild(el){children.push(el);el.parentNode=this;},removeChild(){}};
 const status={textContent:'',parentNode:parent};
 const app={rotation:{months:{'10/26':{original:true}}},adminUnlocked:true,adminRotationDirty:false};
 const context={app,JSON,Date,Math,Blob,
  localStorage:{setItem(key,value){if(denyStorage)throw new Error('quota');saved.set(key,value);},getItem:key=>saved.get(key)||null,removeItem:key=>saved.delete(key)},
  normalizeMonthForImport:raw=>raw,adminRotationValidateMonthRules:()=>({ok:true,issues:[]}),adminRotationFormatRuleIssues:()=>'',
  normalizeRotationData:rotation=>rotation,saveRotationData:()=>{},renderRotace:()=>{},renderMonth:()=>{},renderPerson:()=>{},
  saveRotationToSupabase:async()=>{networkStorageAt=saved.size;return result;},
  document:{getElementById:id=>id==='adminOnlineSaveStatus'?status:null,createElement(tag){
    const el={tag,type:'',className:'',textContent:'',href:'',download:'',parentNode:null,
      setAttribute(key,val){this[key]=val;},addEventListener(event,fn){this[event]=fn;},
      click(){clicked++;if(tag==='a')exported++;},remove(){}};return el;
  }},
  window:{confirm:()=>{confirmCount++;return true;},alert:()=>{}},
  URL:{createObjectURL:()=> 'blob:private-test',revokeObjectURL:()=>{}},setTimeout:()=>{}};
 const source=read('admin-rotation-editor.js');
 const methods=excerpt(source,'// RAK_17064_CONFLICT_DRAFT_GUARD:', '\nfunction adminRotationFindShiftForAbsenceDate(');
 vm.runInNewContext(methods+'\nglobalThis.__save=saveAdminRotationToSupabase;',context);
 return {save:()=>context.__save('10/26',JSON.stringify({notes:[{person:'SECRET-NAME',date:'19.10. N',code:'NV'}]})),
  saved,status,children,app,clicks:()=>clicked,exports:()=>exported,networkStorageAt:()=>networkStorageAt,confirmCount:()=>confirmCount};
}
test('release 1.7.64, TEST Supabase only, technical package unchanged',()=>{
 for(const [file,marker] of [['index.html',`var build='${BUILD}';`],['supabase-config.js',`window.RAK_RELEASE_VERSION = "1.7.64";`],['app.js',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],['sw.js',"const CACHE_VERSION = 'v1.7.64';"],['sw.js',`const DEVELOPMENT_BUILD_ID = '${BUILD}';`]])assert(read(file).includes(marker),file);
 assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
 assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
});
test('admin edit saves exact month draft and verifies storage BEFORE remote save, failure keeps it',async()=>{
 const f=fixture({ok:false,error:{code:'40001'}});const response=await f.save();
 assert.equal(response.saveResult.ok,false);assert.equal(f.networkStorageAt(),1);assert.equal(f.saved.size,1);
 const content=JSON.parse([...f.saved.values()][0]);assert.equal(content.monthKey,'10/26');
 assert.equal(content.month.notes[0].person,'SECRET-NAME');
 assert(!JSON.stringify(content).includes('token')&&!JSON.stringify(content).includes('password'));
 assert.match(f.status.textContent,/Online neuloženo/);assert.equal(f.app.adminRotationDirty,true);
 assert.equal(f.exports(),0);assert.equal(f.children.filter(x=>x['data-rak-unsynced-draft']==='manual-export').length,1);
});
test('no silent success when network helper returns null; no quota success if storage unavailable',async()=>{
 for(const value of [null,{ok:false,reason:'unknown'}]){
  const f=fixture(value,true),response=await f.save();
  assert.equal(response.saveResult.ok,false);assert.equal(f.saved.size,0);
  assert.match(f.status.textContent,/nebylo možné potvrdit/);
  assert.equal(f.exports(),0);
  assert.equal(f.children.filter(x=>x['data-rak-unsynced-draft']==='manual-export').length,1);
 }
});
test('download needs explicit user click and consent, never auto-uploads draft',async()=>{
 const f=fixture({ok:false,reason:'conflict'});await f.save();
 const button=f.children.find(x=>x['data-rak-unsynced-draft']==='manual-export');assert(button);
 assert.equal(f.exports(),0);assert.equal(f.confirmCount(),0);
 button.click();assert.equal(f.confirmCount(),1);assert.equal(f.exports(),1);
 assert.equal(f.saved.size,1);
});
test('successful save clears only draft bytes verified as unchanged',async()=>{
 const f=fixture({ok:true,months:1,entries:0}),r=await f.save();
 assert.equal(r.saveResult.ok,true);assert.equal(f.networkStorageAt(),1);
 assert.equal(f.saved.size,0);assert.equal(f.exports(),0);
 assert.match(f.status.textContent,/Uloženo online/);
});
test('historical releases, private CRC and iOS browser gates remain mandatory',()=>{
 const stage=read('tools/development-version-17048.mjs');
 assert(stage.includes("execFileSync(process.execPath,['--test','tools/release-gate-17063.test.mjs']"));
 assert(stage.includes("await import('./development-version-17064.mjs');"));
 const replay=read('tools/shift-report-mo-hotfix-170-smoke.mjs');
 assert(replay.includes('RAK_17064_TWO_PASS_GUARD'));
 const ci=read('.github/workflows/rak-development-validation.yml');
 for(const line of ['npm run vercel-build\n          npm run vercel-build','node --test tools/release-gate-17064.test.mjs','node tools/backup-source-integrity-17051.mjs','node tools/browser-offline-17052.mjs','node tools/browser-absence-layout-17061.mjs','node tools/http-anon-audit-17050.mjs'])assert(ci.includes(line),line);
 const plan=read('RAK_PLAN_17064_STATUS.md');
 for(const id of ['P0.1','P0.2','P0.3','P0.4','P1.1','P1.2','P1.3','P1.4','P1.5','P2.1','P2.2','P2.3','P2.4','2/13','11/13'])assert(plan.includes(id),id);
 assert(!plan.includes('game-session CAS')&&!plan.includes('herní účty'));
});
