import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const boot=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const start=boot.indexOf('  // Returning owner starts sync shortly after Home paint;');
const end=boot.indexOf('  const runIdleAudits = () =>',start);
assert(start>boot.indexOf('window.__rakBootV2StartupReady = true;')&&end>start);
const source=boot.slice(start,end);

function schedule(account,online=true) {
 const calls=[];
 vm.runInNewContext(source,{
   window:{rakUserProfileGet:()=>account?{accountNumber:account}:null},
   navigator:{onLine:online},
   requestIdleCallback:(fn,options)=>calls.push({kind:'idle',fn,timeout:options.timeout}),
   setTimeout:(fn,ms)=>calls.push({kind:'timer',fn,ms}),
   startSync:()=>calls.push({kind:'started'})
 });
 return calls;
}

test('only signed-owner candidate starts early after local Home, ordinary shift roles keep idle',()=>{
 const owner=schedule('9811');
 assert.equal(owner.length,1);
 assert.equal(owner[0].kind,'timer');
 assert.equal(owner[0].ms,90);
 const ordinary=schedule('1234'),loggedOut=schedule(null),offline=schedule('9811',false);
 for(const value of [ordinary,loggedOut,offline]) {
   assert.equal(value.length,1);
   assert.equal(value[0].kind,'idle');
   assert.equal(value[0].timeout,1200);
 }
});

test('early owner branch never performs authorization; only verified Supabase restore grants role',()=>{
 const idx=boot.indexOf('RAK_2040:');
 const before=boot.slice(idx,boot.indexOf('await syncRotationFromSupabase(false)',idx));
 assert(before.includes("loadScript('app-admin-unlock.js')"));
 assert(!before.includes("ensureFeature('menu')"));
 assert(before.includes("window.rakAdminRestoreSecureSessionForActiveAccount?.('owner-home-startup')"));
 assert(before.includes("window.rakUserProfileGet?.()?.accountNumber==='9811'"));
 assert(!before.includes("app.adminUnlocked = true"));
 assert(!source.includes("app.adminUnlocked = true"));
 const access=fs.readFileSync(new URL('../rak-account-access.js',import.meta.url),'utf8');
 assert(access.includes('waitForSecureSignIn(12000)'),'fresh-device secure login intact');
 assert(access.includes("void window.rakEnsureFeature('menu')"));
 assert(access.includes("void window.rakEnsureFeature('sync')"));
 const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert(sw.includes("'./app-admin-unlock.js?v=2.0.40'"));
});

test('non-owner idle schedule preserves Home-first behavior and sync is still remote-only',()=>{
 assert(boot.indexOf('window.__rakBootV2StartupReady = true;')<boot.indexOf("const startSync = () => ensureFeature('sync')"));
 assert(boot.includes(".then(() => activateRemoteSync())"));
 assert(boot.includes("else if (typeof requestIdleCallback === 'function') requestIdleCallback(startSync, { timeout: 1200 })"));
});
