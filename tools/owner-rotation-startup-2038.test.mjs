import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {extractNamedDeclaration} from './runtime-vm-fixture.mjs';

const read=(file)=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const boot=read('app.js');
const core=read('core.js');

function ownerRestoreFixture(initialAccount, verified) {
  let account=initialAccount;
  const loads=[], refreshes=[];
  const window={
    rakUserProfileGet:()=>account?{accountNumber:account}:null,
    rakAdminRestoreSecureSessionForActiveAccount:async(reason)=>{
      refreshes.push('restore:'+reason);
      return verified;
    },
    rakApplyShiftAccess:()=>refreshes.push('nav')
  };
  const context=vm.createContext({window,Promise,ensureFeature:async(name)=>{loads.push(name);return name;}});
  vm.runInContext(extractNamedDeclaration(boot,'restoreOwnerRotationAccessAfterSync'),context);
  return {load:()=>context.restoreOwnerRotationAccessAfterSync(),loads,refreshes,switchTo:id=>{account=id;}};
}

test('owner restoration runs after startup and Menu is not a critical dependency',()=>{
  assert(boot.indexOf('function restoreOwnerRotationAccessAfterSync()')>boot.indexOf('window.__rakBootV2StartupReady = true;'));
  assert(boot.includes("const startSync = () => ensureFeature('sync')"));
  assert(boot.includes('Promise.all([remoteRun, ownerMenuReady])'));
  assert(boot.includes("const ownerMenuReady = ensureFeature('menu')"));
  assert(boot.includes("window.addEventListener('rak-admin-access-changed'"));
  assert(boot.includes('window.rakApplyShiftAccess()'));
  assert(boot.includes('window.__rakApplyFixedBottomNavMetricsNow()'));
  const critical=boot.slice(boot.indexOf('const criticalFiles = ['),boot.indexOf('const interactionCoreFiles = ['));
  for(const file of ['rak-user-profile.js','rak-account-access.js','rak-login-splash.js'])assert(critical.includes('"'+file+'"'));
  assert(!critical.includes('app-menu.js'));
  assert(read('app-admin-unlock.js').includes("const RAK_OWNER_ADMIN_ACCOUNT_ID = '9811'"));
});

test('returning owner restores verified role and refreshes Rotation without opening More',async()=>{
  const f=ownerRestoreFixture('9811',true);
  assert.equal(await f.load(),true);
  assert.deepEqual(f.loads,['menu']);
  assert.deepEqual(f.refreshes,['restore:owner-home-startup','nav']);
});

test('ordinary worker, wrong account and unavailable role cannot get owner shortcut',async()=>{
  const ordinary=ownerRestoreFixture('1002',true);
  assert.equal(await ordinary.load(),false);
  assert.deepEqual(ordinary.loads,[]);
  const failed=ownerRestoreFixture('9811',false);
  assert.equal(await failed.load(),false);
  assert.deepEqual(failed.refreshes,['restore:owner-home-startup']);
  const switched=ownerRestoreFixture('9811',true);
  switched.switchTo('1002');
  assert.equal(await switched.load(),false);
  assert.deepEqual(switched.loads,[]);
});

test('Rotation tab access obeys actual owner role, revocation and ordinary D team',()=>{
  const start=core.indexOf('function rakCanAccessRotations()');
  const end=core.indexOf('const RAK_SHIFT_CALENDAR_SETTINGS_KEY',start);
  assert(start>0&&end>start);
  let roleVerified=false,owner=true,team='A';
  const attrs={};
  const icon={
    hidden:false,style:{setProperty(){},removeProperty(){}},
    setAttribute:(key,value)=>{attrs[key]=value;},removeAttribute:(key)=>{delete attrs[key];}
  };
  const window={rakAdminHasVerifiedRole:()=>roleVerified,rakAdminCanManageAdmins:()=>owner};
  const document={querySelector:()=>null,querySelectorAll:()=>[icon],getElementById:()=>null};
  const ctx=vm.createContext({
    window,document,getRakActiveAccountShiftTeam:()=>team,
    getRakActiveAccountShiftInfo:()=>({team}),getWorkerNameByLoginNumber:()=>'',console
  });
  vm.runInContext(core.slice(start,end)+'\nthis.apply=rakApplyShiftAccess;this.allowed=rakCanAccessRotations;',ctx);
  ctx.apply();assert.equal(icon.hidden,true,'unverified A must not access Rotace');
  roleVerified=true;ctx.apply();assert.equal(icon.hidden,false,'verified owner A sees Rotace');
  roleVerified=false;ctx.apply();assert.equal(icon.hidden,true,'revoked owner must lose Rotace');
  owner=false;team='D';ctx.apply();assert.equal(icon.hidden,false,'ordinary D sees Rotace');
  team='B';ctx.apply();assert.equal(icon.hidden,true,'ordinary B stays denied');
});

test('new-device password flow and protected role restoration remain intact',()=>{
  const access=read('rak-account-access.js'),profile=read('rak-user-profile.js');
  assert(access.includes('waitForSecureSignIn(12000)'));
  assert(access.includes("void window.rakEnsureFeature('menu')"));
  assert(access.includes("void window.rakEnsureFeature('sync')"));
  assert(profile.includes("await window.rakEnsureSupabaseSdk({ force: true })"));
  assert(boot.includes('await criticalLoadPromise;'));
});