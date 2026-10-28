import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {extractNamedDeclaration} from './runtime-vm-fixture.mjs';

const boot=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');

function fixture(account='9811',online=true) {
  let active=account,finishSync,menuFinish;
  const calls=[];
  const window={
    rakUserProfileGet:()=>({accountNumber:active}),
    RotationSupabaseBridge:{init:async()=>{calls.push('bridge-ready');}},
    rakAdminRestoreSecureSessionForActiveAccount:async()=>{
      calls.push('verified-role');return true;
    }
  };
  const context=vm.createContext({
    window,navigator:{onLine:online},Promise,console:{warn:()=>{}},
    ensureRakSupabaseSdk:async()=>{calls.push('sdk-ready');},
    ensureFeature:async(name)=>{calls.push('feature:'+name);},
    syncRotationFromSupabase:()=>new Promise(resolve=>{
      calls.push('rotation-sync-start');
      finishSync=()=>{calls.push('rotation-sync-finish');resolve();};
    }),
    forceHomeRefresh:()=>calls.push('home-refresh')
  });
  vm.runInContext('let remoteSyncActivationPromise=null;\n'+extractNamedDeclaration(boot,'activateRemoteSync')+'\nthis.activate=activateRemoteSync;',context);
  return {context,calls,run:()=>context.activate(),syncDone:()=>finishSync?.(),switchAccount:id=>{active=id;}};
}
async function settle(){for(let i=0;i<25;i++)await Promise.resolve();}

test('signed owner role begins during remote rotation fetch, without waiting for the fetch',async()=>{
  const f=fixture(),pending=f.run();
  await settle();
  assert(f.calls.includes('rotation-sync-start'),'large rotation download must start');
  assert(f.calls.includes('verified-role'),'owner restore must start while download is pending');
  assert(!f.calls.includes('rotation-sync-finish'),'restore must not wait for download');
  assert(f.calls.indexOf('bridge-ready')<f.calls.indexOf('feature:menu'),'bridge must initialize before secure role restore');
  f.syncDone();
  await pending;
  assert(f.calls.includes('home-refresh'));
});

test('nonowner and offline starts never prewarm owner auth',async()=>{
  for(const [account,online] of [['1234',true],['9811',false]]) {
    const f=fixture(account,online),pending=f.run();
    await settle();
    assert(!f.calls.includes('feature:menu'));
    assert(!f.calls.includes('verified-role'));
    f.syncDone();await pending;
  }
});

test('account switching while Menu loads cannot restore previous owner',async()=>{
  let menuResolve;
  const source=extractNamedDeclaration(boot,'activateRemoteSync');
  const calls=[];
  let active='9811';
  const window={
    rakUserProfileGet:()=>({accountNumber:active}),
    RotationSupabaseBridge:{init:async()=>{}},
    rakAdminRestoreSecureSessionForActiveAccount:async()=>{calls.push('restored');return true;}
  };
  let finishSync;
  const context=vm.createContext({window,navigator:{onLine:true},Promise,console:{warn:()=>{}},
    ensureRakSupabaseSdk:async()=>{},
    ensureFeature:name=>name==='menu'?new Promise(resolve=>{menuResolve=resolve;}):Promise.resolve(),
    syncRotationFromSupabase:()=>new Promise(resolve=>{finishSync=resolve;})
  });
  vm.runInContext('let remoteSyncActivationPromise=null;\n'+source+'\nthis.activate=activateRemoteSync;',context);
  const pending=context.activate();
  await settle();
  assert.equal(typeof menuResolve,'function');
  active='1234';menuResolve();
  await settle();
  assert.equal(calls.length,0,'after switching accounts, no owner restore can run');
  finishSync();await pending;
});

test('fresh-device auth still loads modules on demand and never grants role from account ID alone',()=>{
  const access=fs.readFileSync(new URL('../rak-account-access.js',import.meta.url),'utf8');
  const profile=fs.readFileSync(new URL('../rak-user-profile.js',import.meta.url),'utf8');
  const core=fs.readFileSync(new URL('../core.js',import.meta.url),'utf8');
  assert(access.includes('waitForSecureSignIn(12000)'));
  assert(access.includes("void window.rakEnsureFeature('menu')"));
  assert(access.includes("void window.rakEnsureFeature('sync')"));
  assert(profile.includes('await window.rakEnsureSupabaseSdk({ force: true })'));
  assert(core.includes("window.rakAdminHasVerifiedRole()")&&core.includes("window.rakAdminCanManageAdmins()"));
  const ready=boot.indexOf('window.__rakBootV2StartupReady = true;');
  const restore=boot.indexOf('RAK_2039:');
  assert(ready>0&&restore>ready,'background owner restore never blocks Home');
});