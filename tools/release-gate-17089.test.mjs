import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
import {runNamedDeclarations} from './runtime-vm-fixture.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.89 uses one unified release identity',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.89');
  assert.equal(metadata.displayVersion,'1.7.89');
  assert.equal(metadata.technicalVersion,'1.7.89');
  assert.equal(metadata.moduleCacheVersion,'1.7.89');
  assert.equal(metadata.cacheVersion,'v1.7.89');
  assert.equal(metadata.buildId,'v1.7.89-calendar-account-modal1');
  assert.equal(JSON.parse(read('package.json')).version,'1.7.89');
  assert(read('index.html').includes('app.js?v=1.7.89'));
  const sw=read('sw.js');
  assert(sw.includes("importScripts('./rak-release-metadata.js?sw=1.7.89');"));
  assert(sw.includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.89';"));
});

test('single-account login v3 supplies only the resolved account shift context',()=>{
  const profile=read('rak-user-profile.js');
  const migration=read('supabase/migrations/20260924164526_rak_login_shift_team_v3_17089.sql');
  assert(profile.includes("client.rpc('rak_lookup_account_for_login_v3'"));
  assert(profile.includes('shiftTeam'));
  assert(migration.includes('public.rak_lookup_account_for_login_v2(p_last4)'));
  assert(migration.includes("jsonb_build_object('shiftTeam', v_shift)"));
  assert(migration.includes('REVOKE ALL ON FUNCTION public.rak_lookup_account_for_login_v3(text) FROM PUBLIC, anon, authenticated'));
  assert(migration.includes('GRANT EXECUTE ON FUNCTION public.rak_lookup_account_for_login_v3(text) TO anon, authenticated, service_role'));
  assert(!migration.includes('jsonb_agg'));
});

test('profile shift survives local cache and drives calendar team without private roster data',()=>{
  const readiness=read('module-readiness.js');
  const profile=read('rak-user-profile.js');
  const core=read('core.js');
  assert(readiness.includes("const shiftTeam = ['A','B','C','D'].includes(requestedTeam) ? requestedTeam : ''"));
  assert(profile.includes('refreshMissingShiftTeam'));
  assert(profile.includes("if (!['A','B','C','D'].includes(String(profile.shiftTeam || '').trim().toUpperCase())) void refreshMissingShiftTeam(profile)"));
  const start=core.indexOf('function getRakActiveAccountShiftInfo()');
  const end=core.indexOf('function getRakActiveAccountShiftTeam()',start);
  const helper=core.slice(start,end);
  const runtime={
    window:{rakUserProfileGet:()=>({accountNumber:'test',shiftTeam:'A'})},
    app:{activeAccountId:'test'},
    getRakWorkerRosterSettings:()=>({workers:[],appAccounts:[]})
  };
  const {api}=runNamedDeclarations({
    modules:[{source:helper,names:['getRakActiveAccountShiftInfo']}],
    globals:runtime,
    exports:{info:'getRakActiveAccountShiftInfo'}
  });
  assert.equal(api.info().team,'A');
});

test('calendar modal content owns the remaining height and close glyph is centered',()=>{
  const css=read('styles-modal.css');
  assert(css.includes('#calendarModalContent{'));
  assert(css.includes('display:flex;'));
  assert(css.includes('flex-direction:column;'));
  assert(css.includes('.calendarModalFrameWrap{flex:1;'));
  const close=css.slice(css.indexOf('.calendarModalClose{'),css.indexOf('.calendarModalTitle{'));
  assert(close.includes('display:flex;'));
  assert(close.includes('align-items:center;'));
  assert(close.includes('justify-content:center;'));
  assert(css.includes('height:min(90dvh, 860px)'));
});

test('mandatory CI and npm check execute the 1.7.89 gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(workflow.includes('node --test tools/release-gate-17089.test.mjs'));
  assert(pkg.scripts.check.includes('tools/release-gate-17089.test.mjs'));
  assert(workflow.includes('rak-17089-isolated-build-'+'$'+'{{ github.sha }}'));
});
