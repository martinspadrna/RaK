import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.102 uses one unified release identity',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.102');
  assert.equal(metadata.displayVersion,'1.7.102');
  assert.equal(metadata.technicalVersion,'1.7.102');
  assert.equal(metadata.moduleCacheVersion,'1.7.102');
  assert.equal(metadata.cacheVersion,'v1.7.102');
  assert.equal(metadata.buildId,'v1.7.102-server-cas1');
  assert.equal(JSON.parse(read('package.json')).version,'1.7.102');
  assert(read('index.html').includes('app.js?v=1.7.102'));
  const sw=read('sw.js');
  assert(sw.includes("importScripts('./rak-release-metadata.js?sw=1.7.102');"));
  assert(sw.includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.102';"));
});

test('machine settings and rotation month use revision-aware v3 read/write RPC only',()=>{
  const bridge=read('supabase-bridge.js');
  for(const token of [
    "client.rpc('rak_admin_load_machine_settings_v3')",
    "client.rpc('rak_admin_save_machine_settings_v3'",
    'p_expected_revision: state.machineSettingsRevision',
    "client.rpc('rak_admin_load_rotation_month_entries_v3'",
    "client.rpc('rak_admin_save_rotation_month_entries_v3'",
    'p_expected_revision: expectedRevision',
    'RAK_MACHINE_SETTINGS_REVISION_UNVERIFIED',
    'RAK_ROTATION_MONTH_REVISION_UNVERIFIED'
  ]) assert(bridge.includes(token),token);
  assert(!bridge.includes("client.rpc('rak_admin_save_machine_settings_v2'"));
  assert(!bridge.includes("client.rpc('rak_admin_save_rotation_month_entries_v2'"));
});

test('server CAS source is RLS-locked and uses shared-read plus exclusive-write revision locks',()=>{
  const stage=read('supabase/migrations/20260925110000_rak_revision_cas_stage_17102.sql');
  assert(stage.includes('CREATE TABLE IF NOT EXISTS public.rak_write_revisions'));
  assert(stage.includes('ALTER TABLE public.rak_write_revisions ENABLE ROW LEVEL SECURITY'));
  assert(stage.includes('REVOKE ALL ON TABLE public.rak_write_revisions FROM PUBLIC,anon,authenticated'));
  assert.equal((stage.match(/FOR SHARE/g)||[]).length,2);
  assert((stage.match(/FOR UPDATE/g)||[]).length>=4);
  assert(stage.includes("USING ERRCODE='40001'"));
  assert(stage.includes('p_expected_revision <> v_current'));
  assert(stage.includes('PERFORM private.rak_require_admin(false)'));
});

test('post-green cutover disables both legacy v2 mutation bypasses without dropping signatures',()=>{
  const sql=read('supabase/migrations/20260925123000_rak_revision_cas_cutover_17102.sql');
  assert(sql.includes('CREATE OR REPLACE FUNCTION public.rak_admin_save_machine_settings_v2'));
  assert(sql.includes('CREATE OR REPLACE FUNCTION public.rak_admin_save_rotation_month_entries_v2'));
  assert.equal((sql.match(/Revision-aware RaK client required/g)||[]).length,2);
  assert.equal((sql.match(/ERRCODE='40001'/g)||[]).length,2);
  assert(!sql.includes('private.rak_upsert_machine_settings'));
  assert(!sql.includes('DELETE FROM public.rotation_entries'));
});

test('legacy admin queue items still fail closed instead of replaying after upgrade',()=>{
  const bridge=read('supabase-bridge.js');
  assert(bridge.includes("task.type === 'rotation_state' || task.type === 'machine_settings' || task.type === 'rotation_month_entries'"));
  assert(bridge.includes("remaining.push(Object.assign({}, task, { conflict: 'admin-review-required' }))"));
  assert(bridge.includes('queueConflictHolds'));
});

test('mandatory CI and npm check execute the 1.7.102 CAS suite',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(workflow.includes('node --test tools/release-gate-17102.test.mjs'));
  assert(pkg.scripts.check.includes('tools/server-cas-17102.test.mjs'));
  assert(pkg.scripts.check.includes('tools/release-gate-17102.test.mjs'));
  assert(workflow.includes('rak-170102-isolated-build-'+'$'+'{{ github.sha }}'));
});
