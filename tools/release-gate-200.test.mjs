import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {extractNamedDeclaration} from './runtime-vm-fixture.mjs';
const read = file => fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

function readinessFixture(menuAt, bridgeAt, sdkAt) {
  let now=0; const timers=[]; const loads=[];
  const signIn=()=>{};
  const window={rakEnsureFeature:async name=>{loads.push(name);}};
  const context=vm.createContext({window,Date:{now:()=>now},Promise,setTimeout:fn=>timers.push(fn)});
  vm.runInContext(extractNamedDeclaration(read('rak-account-access.js'),'waitForSecureSignIn'),context);
  return {loads,signIn,context,step(){now+=80;if(now>=menuAt)window.rakAdminSecureSignIn=signIn;
    if(now>=bridgeAt)window.RotationSupabaseBridge={signInAdminAccount:()=>{}};
    if(now>=sdkAt)window.supabase={createClient:()=>{}};
    timers.splice(0).forEach(fn=>fn());},get now(){return now;}};
}
for(const [menu,bridge,sdk] of [[80,640,960],[640,80,320],[320,640,80]]) {
  test(`fresh-device sign-in waits for all modules (${menu}/${bridge}/${sdk})`,async()=>{
    const f=readinessFixture(menu,bridge,sdk); let resolved=false;
    const pending=f.context.waitForSecureSignIn(12000).then(value=>{resolved=true;return value;});
    assert.deepEqual(f.loads,['menu','sync']);
    while(f.now<Math.max(menu,bridge,sdk)-80){f.step();await Promise.resolve();assert.equal(resolved,false);}
    f.step();assert.equal(await pending,f.signIn);
  });
}
test('missing authentication module times out closed and can be retried',async()=>{
  const f=readinessFixture(80,Infinity,80);
  const pending=f.context.waitForSecureSignIn(12000);
  for(let i=0;i<150;i++)f.step();
  assert.equal(await pending,null);
  f.context.window.RotationSupabaseBridge={signInAdminAccount:()=>{}};
  assert.equal(await f.context.waitForSecureSignIn(12000),f.signIn);
});
test('v2 identities agree and About has a compact new section above history',()=>{
  const pkg=JSON.parse(read('package.json'));assert.equal(pkg.version,'2.0.18');
  assert.equal(JSON.parse(read('package-lock.json')).version,pkg.version);
  assert.match(read('core.js'),/const APP_VERSION = "2\.0\.18"/);
  const about=read('app-menu-pages.js');
  assert(about.indexOf("range: 'RaK 2'")<about.indexOf("range: 'RaK 1.9'"));
  assert.match(read('rak-release-metadata.js'),/moduleCacheVersion: '2\.0\.18'/);
  assert.match(read('index.html'),/var e='v218'/);
});
test('N is offered by UI and accepted by client; migration preserves legacy/CAS/security',()=>{
  const wizard=read('admin-rotation-generator-wizard.js');
  assert.match(wizard,/value: 'N', label: 'Neschopenka'/);
  assert.doesNotMatch(wizard,/value: 'LEK', label: 'Lékař'/);
  assert.match(read('supabase-bridge.js'),/\['D','NV','§','N'\]\.includes\(reason\)/);
  const sql=read('supabase/migrations/20261011164201_rak_unplanned_sick_leave_v200.sql');
  assert(sql.includes("(''D'',''NV'',''§'',''LEK'',''N'')"));
  assert(sql.includes("position('40001' in v_definition) > 0"));
  assert(sql.includes("position('P0001' in v_definition) = 0"));
  assert.doesNotMatch(sql,/DROP |GRANT |UPDATE public\./i);
});
