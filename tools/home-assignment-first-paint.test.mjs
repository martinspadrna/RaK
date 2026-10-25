import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const read=file=>fs.readFileSync(new URL(file,root),'utf8');
const html=read('index.html');
const preboot=html.split('<script id="rak-home-warm-snapshot">')[1]?.split('</script>')[0];

function boot({account='100101',fast=null,warm=null}={}){
  assert(preboot,'preboot snapshot script missing');
  const map=new Map();
  if(account)map.set('rotace_kalkulacky:user_profile_v1',JSON.stringify({accountNumber:account,fullName:'Worker'}));
  if(fast)map.set('rak_home_fast_assignments_v1',JSON.stringify(fast));
  if(warm)map.set('rak_home_warm_snapshot_v1',JSON.stringify(warm));
  const line={textContent:'Načítám směnu…'},meta={textContent:'Směna D začne za: --'};
  const hero={dataset:{},querySelector:s=>s==='.dashboardHeroLine1Text'?line:s==='.dashboardHeroLine2'?meta:null};
  const tile={
    '#dashCalendar .dashboardValue':{textContent:'24. 10.'},
    '#dashCountdown .dashboardValue':{textContent:'Za 2 dny'},
    '#dashKantyna .dashboardValue':{textContent:'Zavřeno'},
    '#dashJidelna .dashboardValue':{textContent:'Zavřeno'},
    '#dashVyplata .dashboardValue':{textContent:'28. 10.'},
    '#dashCzd .dashboardValue':{textContent:'52 dní'}
  };
  const events={};
  const document={
    querySelector:s=>tile[s]||null,
    getElementById:id=>id==='dashHero'?hero:null,
    visibilityState:'visible',
    addEventListener:(name,fn)=>events[name]=fn
  };
  const window={addEventListener:(name,fn)=>events[name]=fn};
  const localStorage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v))};
  vm.runInNewContext(preboot,{window,document,localStorage,performance:{now:()=>42},Date,console});
  return {map,events,window,hero,line,meta};
}
function fast(rows,accountNumber='100101',ageMs=60000){
  return {accountNumber,savedAt:Date.now()-ageMs,entries:rows};
}
const now=Date.now();
test('assignment is visible at preboot without any prior warm dashboard cache',()=>{
  const r=boot({fast:fast([{start:now+3600000,end:now+13*3600000,target:'TNKS01'}])});
  assert.equal(r.line.textContent,'Příští směnu jdeš na TNKS01.');
  assert.match(r.meta.textContent,/Poslední uložený rozpis/);
  assert.equal(r.hero.dataset.rakWarmAssignment,'1');
  assert.equal(r.window.__rakAssignmentFirstShownMs,42);
});
test('preboot automatically transitions from next shift to currently active shift',()=>{
  const r=boot({fast:fast([{start:now-3600000,end:now+3600000,target:'TBKR07'},{start:now+12*3600000,end:now+24*3600000,target:'MSKC03'}])});
  assert.equal(r.line.textContent,'Dnes jsi na TBKR07.');
});
test('account isolation and expiry never show another worker or a stale shift',()=>{
  const rows=[{start:now-2000,end:now+2000000,target:'W01'}];
  for(const options of [
    {account:'111222',fast:fast(rows)},
    {account:null,fast:fast(rows)},
    {fast:fast(rows,'100101',8*86400000)},
    {fast:fast([{start:now-100000,end:now-50000,target:'TBKR01'}])}
  ]) {
    const r=boot(options);
    assert.equal(r.line.textContent,'Načítám směnu…');
  }
});
test('preboot cache remains local and manual UI save does not invent a machine',()=>{
  const r=boot({});
  r.events.pagehide();
  const snap=JSON.parse(r.map.get('rak_home_warm_snapshot_v1'));
  assert.equal(snap.account,'100101');
  assert(!snap.hero,'unverified HTML machine title must not become authoritative cache');
});
test('runtime persists real Rotation assignments on render and avoids repetitive writes',()=>{
  const src=read('rotace.js');
  const a=src.indexOf('function cacheDashboardNextAssignments(');
  const b=src.indexOf('function getPersonScheduleEntries(',a);
  assert(a>=0 && b>a);
  const store=new Map();
  const localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v))};
  const start=Date.now()+3600000;
  const context={
    getDashboardActiveProfile:()=>({accountNumber:'100101'}),
    getRakActiveAccountShiftInfo:()=>({outside:false}),
    getPersonScheduleEntryWindow:entry=>({start:new Date(entry.start),end:new Date(entry.end)}),
    localStorage, Date, JSON, String, Number
  };
  vm.runInNewContext(src.slice(a,b)+';this.saveFast=cacheDashboardNextAssignments;',context);
  context.saveFast({name:'Worker',upcoming:[{start,end:start+43200000,target:'TNKS01'}]},new Date());
  const snap=JSON.parse(store.get('rak_home_fast_assignments_v1'));
  assert.equal(snap.accountNumber,'100101');
  assert.equal(snap.entries[0].target,'TNKS01');
  assert(snap.savedAt>0);
  const first=store.get('rak_home_fast_assignments_v1');
  context.saveFast({name:'Worker',upcoming:[{start,end:start+43200000,target:'TNKS01'}]},new Date());
  assert.equal(store.get('rak_home_fast_assignments_v1'),first);
  context.getRakActiveAccountShiftInfo=()=>({outside:true});
  context.saveFast({name:'Worker',upcoming:[{start,end:start+43200000,target:'MSKC01'}]},new Date());
  assert.equal(store.get('rak_home_fast_assignments_v1'),first);
});
test('cached machine remains visible until authoritative Rotation is loaded',()=>{
 const src=read('dashboard.js');
 assert(src.includes("hero.dataset.rakWarmAssignment !== '1' || typeof getPersonScheduleEntries === 'function'"));
 assert(src.includes("window.__rakAssignmentConfirmedMs = paintedAt"));
 const app=read('app.js');
 assert(app.includes("await ensureFeature('rotation')"));
 const config=read('supabase-config.js');
 const target=process.env.RAK_BUILD_TARGET==='production'?'production':'test';
 if(target==='production') {
   assert(config.includes('bkqamcbkiwumsvelahxr.supabase.co'));
   assert(!config.includes('cgshssdjgzzuprlwnabl'));
 } else {
   assert(config.includes('cgshssdjgzzuprlwnabl.supabase.co'));
   assert(!config.includes('bkqamcbkiwumsvelahxr'));
 }
});
