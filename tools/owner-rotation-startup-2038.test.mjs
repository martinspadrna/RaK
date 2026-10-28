import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {extractNamedDeclaration} from './runtime-vm-fixture.mjs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const boot=read('app.js');
const core=read('core.js');
const unlock=read('app-admin-unlock.js');

test('verified owner session starts alongside remote Rotation sync, never in local-first Home',()=>{
  const ready=boot.indexOf('window.__rakBootV2StartupReady = true;');
  const bridge=boot.indexOf('await window.RotationSupabaseBridge.init()',ready);
  const owner=boot.indexOf('RAK_2039:',bridge);
  const sync=boot.indexOf('await syncRotationFromSupabase(false)',owner);
  assert(ready>=0&&bridge>0&&owner>bridge&&sync>owner);
  assert(boot.includes(".then(() => activateRemoteSync())"));
  assert(boot.includes("ensureFeature('menu').then("));
  assert(boot.includes("window.rakAdminRestoreSecureSessionForActiveAccount?.('owner-home-startup')"));
  assert(boot.includes("window.rakUserProfileGet?.()?.accountNumber==='9811'"));
  assert(!boot.slice(0,ready).includes("ensureFeature('menu')"));
  assert(read('app-admin-unlock.js').includes("const RAK_OWNER_ADMIN_ACCOUNT_ID = '9811'"));
});

test('role change updates navigation on verified owner and on revocation without opening More',()=>{
  const calls=[];
  const window={
    rakApplyShiftAccess:()=>calls.push('nav'),
    dispatchEvent:event=>calls.push(event.type)
  };
  const context=vm.createContext({window,Event:class {constructor(type){this.type=type;}}});
  vm.runInContext(extractNamedDeclaration(unlock,'rakAdminNotifyAccessChanged'),context);
  context.rakAdminNotifyAccessChanged('secure-context');
  context.rakAdminNotifyAccessChanged('locked');
  assert.deepEqual(calls,['nav','rak-admin-access-changed','nav','rak-admin-access-changed']);
  assert(unlock.includes('return rakAdminApplySecureContext(result.context, capabilities)'));
});

test('owner A gets Rotace only with verified role; ordinary A/B stay blocked and D stays enabled',()=>{
  const start=core.indexOf('function rakCanAccessRotations()');
  const end=core.indexOf('const RAK_SHIFT_CALENDAR_SETTINGS_KEY',start);
  assert(start>0&&end>start);
  let verified=false,owner=true,team='A';
  const icon={
    hidden:false,style:{setProperty(){},removeProperty(){}},
    setAttribute(){},removeAttribute(){}
  };
  const window={rakAdminHasVerifiedRole:()=>verified,rakAdminCanManageAdmins:()=>owner};
  const document={querySelector:()=>null,querySelectorAll:()=>[icon],getElementById:()=>null};
  const context=vm.createContext({window,document,
    getRakActiveAccountShiftTeam:()=>team,
    getRakActiveAccountShiftInfo:()=>({team}),
    getWorkerNameByLoginNumber:()=>'',console});
  vm.runInContext(core.slice(start,end)+'\nthis.apply=rakApplyShiftAccess;',context);
  context.apply();assert.equal(icon.hidden,true);
  verified=true;context.apply();assert.equal(icon.hidden,false);
  verified=false;context.apply();assert.equal(icon.hidden,true);
  owner=false;team='D';context.apply();assert.equal(icon.hidden,false);
  team='B';context.apply();assert.equal(icon.hidden,true);
});

test('clean-device password login still self-loads Menu, sync and Supabase SDK',()=>{
  const access=read('rak-account-access.js');
  const profile=read('rak-user-profile.js');
  assert(access.includes('waitForSecureSignIn(12000)'));
  assert(access.includes("void window.rakEnsureFeature('menu')"));
  assert(access.includes("void window.rakEnsureFeature('sync')"));
  assert(profile.includes("await window.rakEnsureSupabaseSdk({ force: true })"));
  assert(boot.includes('await criticalLoadPromise;'));
  assert(read('sw.js').includes("'./app-admin-unlock.js?v=2.0.39'"));
});
