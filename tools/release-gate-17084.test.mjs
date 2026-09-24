import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
import {runNamedDeclarations} from './runtime-vm-fixture.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.84 identifies the local-first account sync release',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.84');
  assert.equal(metadata.displayVersion,'1.7.84');
  assert.equal(metadata.buildId,'v1.7.84-local-first-account-sync1');
});

test('returning startup restores Rotation locally before remote sync and measures usable Dashboard paint',()=>{
  const app=read('app.js');
  const dashboard=read('dashboard.js');
  const marker=app.indexOf('// RAK_17084_LOCAL_FIRST_BOOT: navigator.onLine is only a hint.');
  const ready=app.indexOf('const startupReadyAt',marker);
  const section=app.slice(marker,ready);
  assert(section.includes("await hydrateRakRotationLocalFirst();"));
  assert(section.includes("await ensureFeature('rotation');"));
  assert(!section.includes("await ensureFeature('sync')"));
  assert(!section.includes('activateRemoteSync()'));
  assert(app.includes('window.rakMarkFirstUsableRender = function rakMarkFirstUsableRender'));
  assert(app.includes('firstUsableRenderMs: Number(window.__rakFirstUsableRenderMs || 0) || null'));
  assert(dashboard.includes("window.rakMarkFirstUsableRender('dashboard')"));
});

test('account switch clears the previous active runtime identity without destructive storage reset',()=>{
  const profile=read('rak-user-profile.js');
  assert(profile.includes('function resetRuntimeForAccountSwitch(nextAccountNumber)'));
  assert(profile.includes("app.activeAccountId = '';"));
  assert(profile.includes("app.activeAccountName = '';"));
  assert(profile.includes("gamesProfile.activeAccountId = '';"));
  assert(profile.includes('resetRuntimeForAccountSwitch(next.accountNumber);'));
  assert(!profile.includes('localStorage.clear('));
  assert(!profile.includes('caches.delete('));
  assert(!profile.includes('serviceWorker.unregister('));
});

test('appearance persistence uses account-scoped revision CAS instead of retired game statistics',()=>{
  const migration=read('supabase/migrations/20260924153000_rak_account_ui_preferences_cas_17084.sql');
  const bridge=read('supabase-bridge.js');
  const appearance=read('appearance-theme.js');
  const loadStart=bridge.indexOf('async function loadGameAccountUiSettingsDirect');
  const next=bridge.indexOf('async function loadRotationState',loadStart);
  const uiBridge=bridge.slice(loadStart,next);
  assert(migration.includes('CREATE TABLE IF NOT EXISTS public.rak_account_ui_preferences'));
  assert(migration.includes('AND revision = v_expected'));
  assert(migration.includes('REVOKE ALL ON TABLE public.rak_account_ui_preferences FROM PUBLIC, anon, authenticated'));
  assert(migration.includes('GRANT EXECUTE ON FUNCTION public.rak_save_account_ui_preferences(text, text, bigint) TO anon, authenticated, service_role'));
  assert(uiBridge.includes("rpc('rak_load_account_ui_preferences'"));
  assert(uiBridge.includes("rpc('rak_save_account_ui_preferences'"));
  assert(!uiBridge.includes(".from('game_stats')"));
  assert(appearance.includes('serverRevision'));
  assert(appearance.includes('expected_revision'));
  assert(appearance.includes('ui.dirty = true'));
});

test('shift/roster placement cannot mutate owner or authenticated account identity',()=>{
  const core=read('core.js');
  const fnStart=core.indexOf('function getRakActiveAccountShiftInfo()');
  const fnEnd=core.indexOf('function getRakActiveAccountShiftTeam()',fnStart);
  const fn=core.slice(fnStart,fnEnd);
  assert(!/rak_admin_profiles|supabase|rakUserProfileWrite|rakUserProfileClear|auth\./.test(fn));
  const account='9001';
  const profile={accountNumber:account,fullName:'Synthetic Owner'};
  const app={activeAccountId:account,activeAccountName:profile.fullName};
  let roster={appAccounts:[{loginNumber:account,shiftTeam:'A'}]};
  const {api}=runNamedDeclarations({
    modules:[{source:core,names:['getRakActiveAccountShiftInfo']}],
    globals:{window:{rakUserProfileGet:()=>profile},app,getRakWorkerRosterSettings:()=>roster},
    exports:{get:'getRakActiveAccountShiftInfo'}
  });
  assert.deepEqual(api.get(),{team:'A',outside:true,accountId:account});
  roster={appAccounts:[]};
  assert.deepEqual(api.get(),{team:'D',outside:false,accountId:account});
  assert.deepEqual(profile,{accountNumber:account,fullName:'Synthetic Owner'});
  assert.equal(app.activeAccountId,account);
});

test('mandatory CI and npm check execute the 1.7.84 gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(workflow.includes('node --test tools/release-gate-17084.test.mjs'));
  assert(pkg.scripts.check.includes('tools/release-gate-17084.test.mjs'));
});
