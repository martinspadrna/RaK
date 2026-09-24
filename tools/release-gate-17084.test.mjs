import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
import {runNamedDeclarations} from './runtime-vm-fixture.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('release does not regress below the 1.7.84 local-first account sync milestone',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.84');
  assert.equal(metadata.technicalVersion,metadata.displayVersion);
  assert.equal(metadata.moduleCacheVersion,metadata.displayVersion);
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
  const inRoster=api.get();
  assert.equal(inRoster.team,'A');assert.equal(inRoster.outside,true);assert.equal(inRoster.accountId,account);
  roster={appAccounts:[]};
  const outOfRoster=api.get();
  assert.equal(outOfRoster.team,'D');assert.equal(outOfRoster.outside,false);assert.equal(outOfRoster.accountId,account);
  assert.equal(profile.accountNumber,account);assert.equal(profile.fullName,'Synthetic Owner');
  assert.equal(app.activeAccountId,account);
});

test('npm check retains the 1.7.84 milestone and CI executes the current release gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(pkg.scripts.check.includes('tools/release-gate-17084.test.mjs'));
  assert(/node --test tools\/release-gate-1708\d\.test\.mjs/.test(workflow));
});
