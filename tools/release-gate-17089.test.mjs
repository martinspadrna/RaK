import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
import {runNamedDeclarations} from './runtime-vm-fixture.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.89 calendar-account milestone remains active in verified successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.89');
  assert.equal(metadata.technicalVersion,metadata.displayVersion);
  assert.equal(metadata.moduleCacheVersion,metadata.displayVersion);
  assert.equal(metadata.cacheVersion,'v'+metadata.displayVersion);
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
  assert(read('index.html').includes('app.js?v='+metadata.displayVersion));
  const sw=read('sw.js');
  assert(sw.includes("importScripts('./rak-release-metadata.js?sw="+metadata.displayVersion+"');"));
  assert(sw.includes("const SW_RELEASE_CACHE_MARKER = 'v"+metadata.displayVersion+"';"));
});

test('single-account login v3 still supplies only the resolved account shift context',()=>{
  const profile=read('rak-user-profile.js');
  const migration=read('supabase/migrations/20260924164526_rak_login_shift_team_v3_17089.sql');
  assert(profile.includes("client.rpc('rak_lookup_account_for_login_v3'"));
  assert(profile.includes('shiftTeam'));
  assert(migration.includes('public.rak_lookup_account_for_login_v2(p_last4)'));
  assert(migration.includes("jsonb_build_object('shiftTeam', v_shift)"));
  assert(migration.includes('REVOKE ALL ON FUNCTION public.rak_lookup_account_for_login_v3(text) FROM PUBLIC, anon, authenticated'));
  assert(!migration.includes('jsonb_agg'));
});

test('profile shift still drives calendar team without private roster data',()=>{
  const core=read('core.js');
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

test('calendar modal keeps full-height flex content and centered close glyph',()=>{
  const css=read('styles-modal.css');
  assert(css.includes('#calendarModalContent{'));
  assert(css.includes('display:flex;'));
  assert(css.includes('flex-direction:column;'));
  const close=css.slice(css.indexOf('.calendarModalClose{'),css.indexOf('.calendarModalTitle{'));
  assert(close.includes('display:flex;'));
  assert(close.includes('align-items:center;'));
  assert(close.includes('justify-content:center;'));
  assert(css.includes('height:min(90dvh, 860px)'));
});

test('npm check retains 1.7.89 while CI runs the current release gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(pkg.scripts.check.includes('tools/release-gate-17089.test.mjs'));
  assert(/node --test tools\/release-gate-1709\d\.test\.mjs/.test(workflow));
});
