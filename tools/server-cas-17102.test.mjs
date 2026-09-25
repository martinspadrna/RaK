import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runNamedDeclarations} from './runtime-vm-fixture.mjs';

const bridge=fs.readFileSync(new URL('../supabase-bridge.js',import.meta.url),'utf8');
const stage=fs.readFileSync(new URL('../supabase/migrations/20260925110000_rak_revision_cas_stage_17102.sql',import.meta.url),'utf8');
const cutover=fs.readFileSync(new URL('../supabase/migrations/20260925123000_rak_revision_cas_cutover_17102.sql',import.meta.url),'utf8');

function conflictError(message,code){
  return Object.assign(new Error(message),{code,conflict:true});
}
function machineFixture(revision,reply){
  const state={machineSettingsRevision:revision};
  const calls=[];
  const client={rpc:async(name,args)=>{
    calls.push({name,args});
    return reply||{data:{ok:true,saved_count:1,revision:revision+1},error:null};
  }};
  const ctx={
    state,
    hasSecureAdminContext:()=>true,
    isCredentialOrBackupMachineSettingsPayload:()=>false,
    isSupabaseRpcUnavailableError:()=>false,
    SUPABASE_RPC_HARDENING_STATUS:{},
    rakRevisionConflictError:conflictError,
    rakIsSqlRevisionConflict:(err)=>String(err&&err.code||'')==='40001'
  };
  const {api}=runNamedDeclarations({
    modules:[{source:bridge,names:['trySaveMachineSettingsViaRpc']}],
    globals:ctx,exports:{save:'trySaveMachineSettingsViaRpc'}
  });
  return {state,calls,run:()=>api.save(client,[{machine_key:'TEST',label:'Test'}],{reason:'unit'})};
}

test('machine settings CAS sends the exact baseline and advances only after success',async()=>{
  const f=machineFixture(7);
  const saved=await f.run();
  assert.equal(f.calls.length,1);
  assert.equal(f.calls[0].name,'rak_admin_save_machine_settings_v3');
  assert.equal(f.calls[0].args.p_expected_revision,7);
  assert.equal(saved.revision,8);
  assert.equal(f.state.machineSettingsRevision,8);
});

test('machine settings unknown baseline refuses before network',async()=>{
  for(const revision of [null,undefined,-1,1.5,'7']){
    const f=machineFixture(revision);
    await assert.rejects(()=>f.run(),e=>e&&e.code==='RAK_MACHINE_SETTINGS_REVISION_UNVERIFIED'&&e.conflict===true);
    assert.equal(f.calls.length,0);
    assert.equal(f.state.machineSettingsRevision,revision);
  }
});

test('machine settings stale server revision is a conflict and never adopts remote revision',async()=>{
  const stale=new Error('Machine settings were changed on another device'); stale.code='40001';
  const f=machineFixture(9,{data:null,error:stale});
  await assert.rejects(()=>f.run(),e=>e&&e.code==='RAK_MACHINE_SETTINGS_REVISION_CONFLICT'&&e.conflict===true);
  assert.equal(f.calls.length,1);
  assert.equal(f.state.machineSettingsRevision,9);
});

function monthFixture(revision,reply){
  const month='2026-10-01';
  const state={rotationMonthRevisions:{[month]:revision}};
  const calls=[];
  const client={rpc:async(name,args)=>{
    calls.push({name,args});
    return reply||{data:{ok:true,inserted:1,revision:revision+1},error:null};
  }};
  const ctx={
    state,
    hasSecureAdminContext:()=>true,
    rakRevisionConflictError:conflictError,
    rakIsSqlRevisionConflict:(err)=>String(err&&err.code||'')==='40001'
  };
  const {api}=runNamedDeclarations({
    modules:[{source:bridge,names:['upsertRotationMonthEntriesDirect']}],
    globals:ctx,exports:{save:'upsertRotationMonthEntriesDirect'}
  });
  return {state,calls,month,run:()=>api.save(client,month,'10/26',[{employee_name:'Test',row_order:0}])};
}

test('rotation month CAS sends exact baseline and advances revision',async()=>{
  const f=monthFixture(3);
  const saved=await f.run();
  assert.equal(f.calls.length,1);
  assert.equal(f.calls[0].name,'rak_admin_save_rotation_month_entries_v3');
  assert.equal(f.calls[0].args.p_expected_revision,3);
  assert.equal(saved.revision,4);
  assert.equal(f.state.rotationMonthRevisions[f.month],4);
});

test('rotation month missing/stale baseline fails closed',async()=>{
  const unknown=monthFixture(undefined);
  await assert.rejects(()=>unknown.run(),e=>e&&e.code==='RAK_ROTATION_MONTH_REVISION_UNVERIFIED');
  assert.equal(unknown.calls.length,0);

  const stale=new Error('Rotation month was changed on another device'); stale.code='40001';
  const conflict=monthFixture(4,{data:null,error:stale});
  await assert.rejects(()=>conflict.run(),e=>e&&e.code==='RAK_ROTATION_MONTH_REVISION_CONFLICT'&&e.conflict===true);
  assert.equal(conflict.calls.length,1);
  assert.equal(conflict.state.rotationMonthRevisions[conflict.month],4);
});

test('current client atomically loads revisions and has no v2 write bypass',()=>{
  assert(bridge.includes("client.rpc('rak_admin_load_machine_settings_v3')"));
  assert(bridge.includes("client.rpc('rak_admin_save_machine_settings_v3'"));
  assert(bridge.includes("client.rpc('rak_admin_load_rotation_month_entries_v3'"));
  assert(bridge.includes("client.rpc('rak_admin_save_rotation_month_entries_v3'"));
  assert(!bridge.includes("client.rpc('rak_admin_save_machine_settings_v2'"));
  assert(!bridge.includes("client.rpc('rak_admin_save_rotation_month_entries_v2'"));
  assert(bridge.includes("remaining.push(Object.assign({}, task, { conflict: 'admin-review-required' }))"));
});

test('server stage uses RLS revision registry, shared read lock and exclusive CAS write lock',()=>{
  assert(stage.includes('CREATE TABLE IF NOT EXISTS public.rak_write_revisions'));
  assert(stage.includes('ALTER TABLE public.rak_write_revisions ENABLE ROW LEVEL SECURITY'));
  assert(stage.includes('REVOKE ALL ON TABLE public.rak_write_revisions FROM PUBLIC,anon,authenticated'));
  assert.equal((stage.match(/FOR SHARE/g)||[]).length,2);
  assert((stage.match(/FOR UPDATE/g)||[]).length>=4);
  assert(stage.includes('p_expected_revision <> v_current'));
  assert(stage.includes("USING ERRCODE='40001'"));
  assert(stage.includes('rak_admin_load_machine_settings_v3'));
  assert(stage.includes('rak_admin_load_rotation_month_entries_v3'));
});

test('post-green cutover leaves v2 function signatures but makes legacy mutation fail closed',()=>{
  assert(cutover.includes('CREATE OR REPLACE FUNCTION public.rak_admin_save_machine_settings_v2'));
  assert(cutover.includes('CREATE OR REPLACE FUNCTION public.rak_admin_save_rotation_month_entries_v2'));
  assert.equal((cutover.match(/Revision-aware RaK client required/g)||[]).length,2);
  assert.equal((cutover.match(/ERRCODE='40001'/g)||[]).length,2);
  assert(!cutover.includes('private.rak_upsert_machine_settings'));
  assert(!cutover.includes('DELETE FROM public.rotation_entries'));
});
