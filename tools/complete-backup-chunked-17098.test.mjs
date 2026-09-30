import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runNamedDeclarations} from './runtime-vm-fixture.mjs';

const backup=fs.readFileSync(new URL('../rak-complete-backup.js',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../supabase/migrations/20260924194000_rak_owner_complete_backup_chunked_v2_17098.sql',import.meta.url),'utf8');

function runtime(fetchImpl){
  return runNamedDeclarations({
    modules:[{source:backup,names:[
      'MANIFEST_RPC_NAME','TABLE_RPC_NAME','LEGACY_RPC_NAME','MAX_PARALLEL_DB_FETCHES',
      'status','postBackupRpc','mapConcurrent','fetchCompleteSnapshot'
    ]}],
    globals:{
      fetch:fetchImpl,
      window:{SUPABASE_CONFIG:{url:'https://test.supabase.co',publishableKey:'pk_test'}},
      document:{getElementById:()=>null}
    },
    exports:{fetchSnapshot:'fetchCompleteSnapshot'}
  }).api;
}

test('chunked backup assembles the historical v1 snapshot without calling legacy v1 RPC',async()=>{
  const calls=[];
  const manifest={
    format:'rak-complete-backup-manifest-v2',
    generated_at:'2026-09-24T19:40:00Z',
    database:{database_name:'postgres'},
    public_tables:['machine_settings','rotation_state'],
    data:{
      private:{rak_rotation_import_metadata_v1:[]},
      auth:{users_sanitized:[],identities_sanitized:[]},
      storage:{buckets:[],objects:[]},
      redacted:{rak_admin_secrets_row_count:1}
    },
    schema:{tables:[{schema:'public',name:'machine_settings'},{schema:'public',name:'rotation_state'},{schema:'public',name:'rak_admin_secrets'}],functions:[{}],policies:[]},
    sensitive_exclusions:['secret']
  };
  const rows={
    machine_settings:[{id:1,settings_json:{ok:true}}],
    rotation_state:[{id:1,payload:{month:'2026-09'}}]
  };
  const fetchImpl=async(url,options)=>{
    const name=String(url).split('/').pop();
    const body=JSON.parse(options.body||'{}');
    calls.push({name,body});
    let payload;
    if(name==='rak_owner_complete_backup_manifest_v2') payload=manifest;
    else if(name==='rak_owner_complete_backup_table_v2') payload={format:'rak-complete-backup-table-v2',table:body.p_table,rows:rows[body.p_table]};
    else throw new Error('unexpected RPC '+name);
    return {ok:true,status:200,json:async()=>payload};
  };
  const snapshot=await runtime(fetchImpl).fetchSnapshot('owner-token');
  assert.equal(snapshot.format,'rak-complete-backup-v1');
  assert.deepEqual(JSON.parse(JSON.stringify(snapshot.data.public)),rows);
  assert.equal(snapshot.data.redacted.rak_admin_secrets_row_count,1);
  assert.equal(calls.filter(x=>x.name==='rak_owner_complete_backup_manifest_v2').length,1);
  assert.equal(calls.filter(x=>x.name==='rak_owner_complete_backup_table_v2').length,2);
  assert.equal(calls.some(x=>x.name==='rak_owner_complete_backup_v1'),false);
});

test('chunked backup fails closed before requesting a forbidden secrets table',async()=>{
  const calls=[];
  const fetchImpl=async(url)=>{
    const name=String(url).split('/').pop();
    calls.push(name);
    if(name!=='rak_owner_complete_backup_manifest_v2') throw new Error('table RPC must not run');
    return {ok:true,status:200,json:async()=>({
      format:'rak-complete-backup-manifest-v2',
      public_tables:['rak_admin_secrets'],
      data:{},schema:{},sensitive_exclusions:[]
    })};
  };
  await assert.rejects(()=>runtime(fetchImpl).fetchSnapshot('owner-token'),/neplatný seznam tabulek/);
  assert.deepEqual(calls,['rak_owner_complete_backup_manifest_v2']);
});

test('SQL v2 keeps legacy rollback, enforces owner guard and bounds dynamic table names',()=>{
  assert(migration.includes('CREATE OR REPLACE FUNCTION public.rak_owner_complete_backup_manifest_v2()'));
  assert(migration.includes('CREATE OR REPLACE FUNCTION public.rak_owner_complete_backup_table_v2(p_table text)'));
  assert.equal((migration.match(/PERFORM private\.rak_require_admin\(true\);/g)||[]).length,2);
  assert(migration.includes("c.relname=v_table"));
  assert(migration.includes("v_table = 'rak_admin_secrets'"));
  assert(migration.includes("pg_catalog.format("));
  assert(migration.includes("public.%I"));
  assert(migration.includes('REVOKE ALL ON FUNCTION public.rak_owner_complete_backup_table_v2(text) FROM PUBLIC,anon,authenticated'));
  assert(migration.includes('REVOKE ALL ON FUNCTION public.rak_owner_complete_backup_manifest_v2() FROM PUBLIC,anon,authenticated'));
  assert(!migration.includes('CREATE OR REPLACE FUNCTION public.rak_owner_complete_backup_v1()'));
  assert(!migration.includes('DROP FUNCTION public.rak_owner_complete_backup_v1'));
});
