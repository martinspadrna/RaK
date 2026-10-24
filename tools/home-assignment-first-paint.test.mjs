import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root),'utf8');
const html=read('index.html');
const warm=html.split('<script id="rak-home-warm-snapshot">')[1]?.split('</script>')[0];

function render(snapshot,profile){
  assert(warm,'preboot warm snapshot is required');
  const memory=new Map();
  const KEY='rak_home_warm_snapshot_v1',PROFILE='rotace_kalkulacky:user_profile_v1';
  if(snapshot)memory.set(KEY,JSON.stringify(snapshot));
  if(profile)memory.set(PROFILE,JSON.stringify(profile));
  const line={textContent:'Načítám směnu…'},meta={textContent:'Směna D začne za: --'};
  const hero={dataset:{},querySelector(selector){return selector==='.dashboardHeroLine1Text'?line:selector==='.dashboardHeroLine2'?meta:null}};
  const elements={'#dashCalendar .dashboardValue':{textContent:'24. 10.'},'#dashCountdown .dashboardValue':{textContent:'Za 2 dny'},'#dashKantyna .dashboardValue':{textContent:'Zavřeno'},'#dashJidelna .dashboardValue':{textContent:'Zavřeno'},'#dashHero .dashboardPersonalTitle':{textContent:'Příští směnu jdeš na TBKR07.'}};
  const events={};
  const document={
    getElementById:id=>id==='dashHero'?hero:null,
    querySelector:sel=>elements[sel]||null,
    addEventListener:(name,callback)=>{events[name]=callback;},
    visibilityState:'visible'
  };
  const window={addEventListener:(name,callback)=>{events[name]=callback;}};
  const storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v))};
  vm.runInNewContext(warm,{window,document,localStorage:storage,Date,console});
  return {window,events,memory,line,meta,hero};
}
function cached(account='100101',savedAt=Date.now(),day=null){
  const today=new Date();
  const date=day??[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
  return {at:Date.now(),values:{'#dashCalendar .dashboardValue':'24. 10.'},
    hero:{accountNumber:account,title:'Příští směnu jdeš na TBKR07.',day:date,savedAt}};
}
test('cached HOME assignment appears before lazy modules but is labelled last known',()=>{
  const r=render(cached(),{accountNumber:'100101',fullName:'Colleague'});
  assert.equal(r.line.textContent,'Příští směnu jdeš na TBKR07.');
  assert.match(r.meta.textContent,/Poslední známý rozpis.*ověřuji/);
  assert.equal(r.hero.dataset.rakWarmAssignment,'1');
  assert.equal(r.window.__rakWarmAssignmentRestored.restored,true);
});
test('another or logged-out account cannot see the previous worker machine',()=>{
  for(const profile of [{accountNumber:'200202',fullName:'Other'},null]){
    const r=render(cached(),profile);
    assert.equal(r.line.textContent,'Načítám směnu…');
    assert.equal(r.hero.dataset.rakWarmAssignment,undefined);
  }
});
test('do not present old assignments or last-day shift placements as current',()=>{
  const y=new Date();y.setDate(y.getDate()-1);
  for(const snap of [cached('100101',Date.now()-31*60*1000),cached('100101',Date.now(),[y.getFullYear(),String(y.getMonth()+1).padStart(2,'0'),String(y.getDate()).padStart(2,'0')].join('-'))]){
    const r=render(snap,{accountNumber:'100101'});
    assert.equal(r.line.textContent,'Načítám směnu…');
  }
});
test('warm cache saves only from an actual personalized machine assignment and current account',()=>{
  const r=render(null,{accountNumber:'100101',fullName:'Colleague'});
  r.events.pagehide();
  const saved=JSON.parse(r.memory.get('rak_home_warm_snapshot_v1'));
  assert.equal(saved.hero.accountNumber,'100101');
  assert.equal(saved.hero.title,'Příští směnu jdeš na TBKR07.');
  assert.equal(saved.values['#dashCalendar .dashboardValue'],'24. 10.');
});
test('HOME priority is enforced in feature initialization and local hydration',()=>{
  const app=read('app.js');
  const ready=app.slice(app.indexOf("if (name === 'rotation')"),app.indexOf("} else if (name === 'calculators')"));
  assert(ready.indexOf("updateDashboard()")>=0&&ready.indexOf("updateDashboard()")<ready.indexOf("renderRotace()"));
  const boot=app.slice(app.indexOf('await hydrateRakRotationLocalFirst();'),app.indexOf('window.__rakBootV2LocalReady = true'));
  assert(boot.indexOf("updateDashboard()")>=0&&boot.indexOf("updateDashboard()")<boot.indexOf("renderRotace()"));
  assert(app.includes("await ensureFeature('rotation')"));
  const config=read('supabase-config.js');
  assert(config.includes('cgshssdjgzzuprlwnabl.supabase.co'));
  assert(!config.includes('bkqamcbkiwumsvelahxr'));
});
