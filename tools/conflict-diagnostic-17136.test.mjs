import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {extractNamedDeclaration,runNamedDeclarations} from './runtime-vm-fixture.mjs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

function fixture(raw, options={}) {
  let writes=0, network=0;
  const state={
    queueGuard:{storageError:String(options.storageError||'')},
    cacheGuard:{
      rotationOfflineError:String(options.rotationOfflineError||''),
      rotationStorageError:String(options.rotationStorageError||''),
      durableRotationError:String(options.durableRotationError||'')
    }
  };
  const localStorage={
    getItem:()=>{ if(options.throwRead) throw Error('PRIVATE-STORAGE-ERROR'); return raw; },
    setItem:()=>{writes++;throw Error('must not write');}
  };
  const ctx={
    state,LOCAL_QUEUE_KEY:'queue',localStorage,JSON,Object,Array,String,Set,
    getClient:()=>{network++;return {};}
  };
  const {api}=runNamedDeclarations({
    modules:[{source:read('supabase-bridge.js'),names:['getRakConflictDiagnosticHint']}],
    globals:ctx,exports:{hint:'getRakConflictDiagnosticHint'}
  });
  return {hint:()=>api.hint(),writes:()=>writes,network:()=>network};
}

test('1.7.136 release identity and fail-closed gate wiring',()=>{
  assertCurrentReleaseIdentity(read,'1.7.136');
  assert.equal(JSON.parse(read('package.json')).version,'1.7.136');
  assert(read('CHANGELOG.md').includes('## RaK 1.7.136 (development)'));
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/conflict-diagnostic-17136.test.mjs'));
  assert(workflow.includes('tools/conflict-diagnostic-17136.test.mjs'));
  assert(workflow.includes('rak-170136-isolated-build-'+'$'+'{{ github.sha }}'));
});

test('sanitized hint preserves concrete conflict cause without private values, network or writes',()=>{
  const raw=JSON.stringify([
    {id:'PRIVATE-ID-991',type:'rotation_state',conflict:'newer-online-state',payload:{name:'PRIVATE-NAME',token:'PRIVATE-JWT'}},
    {id:'PRIVATE-ID-992',type:'bug_report',entry:{message:'PRIVATE-REPORT'}}
  ]);
  const f=fixture(raw),out=f.hint(),serialized=JSON.stringify(out);
  assert.deepEqual({...out},{storage:'ok',conflict:'newer-online-state',type:'rotation_state',offline:'ok'});
  assert.equal(f.writes(),0);
  assert.equal(f.network(),0);
  for(const secret of ['PRIVATE-ID-991','PRIVATE-ID-992','PRIVATE-NAME','PRIVATE-JWT','PRIVATE-REPORT']) assert(!serialized.includes(secret));
});

test('corrupt or unavailable queue is distinguished without exposing raw storage content',()=>{
  const cases=[
    ['{PRIVATE-BROKEN',{},'corrupt'],
    ['[]',{storageError:'ambiguous'},'ambiguous'],
    ['[]',{storageError:'write-failed'},'write-failed'],
    ['[]',{throwRead:true},'unavailable']
  ];
  for(const [raw,options,expected] of cases){
    const f=fixture(raw,options),out=f.hint(),serialized=JSON.stringify(out);
    assert.equal(out.storage,expected);
    assert.equal(f.writes(),0);
    assert.equal(f.network(),0);
    assert(!serialized.includes('PRIVATE-BROKEN'));
    assert(!serialized.includes('PRIVATE-STORAGE-ERROR'));
  }
});

test('fixed conflict enums cover every runtime-held reason and unknown values stay generic',()=>{
  const reasons=[
    'admin-review-required',
    'newer-online-state',
    'oversize-task',
    'unknown-task',
    'unsupported-task',
    'unverified-local-version',
    'write-rejected'
  ];
  for(const reason of reasons){
    const out=fixture(JSON.stringify([{id:'PRIVATE',type:'machine_settings',conflict:reason}])).hint();
    assert.equal(out.storage,'ok');
    assert.equal(out.conflict,reason);
    assert.equal(out.type,'machine_settings');
  }
  const unknown=fixture(JSON.stringify([{id:'PRIVATE',type:'machine_settings',conflict:'SECRET-SERVER-DETAIL'}])).hint();
  assert.equal(unknown.conflict,'other');
  assert.equal(unknown.type,'machine_settings');
  assert(!JSON.stringify(unknown).includes('SECRET-SERVER-DETAIL'));
});

test('offline copy status is reduced to fixed safe enums',()=>{
  assert.equal(fixture('[]',{rotationOfflineError:'rotation-offline-single-copy'}).hint().offline,'limited');
  assert.equal(fixture('[]',{rotationOfflineError:'rotation-offline-write-failed'}).hint().offline,'write-failed');
  assert.equal(fixture('[]',{rotationStorageError:'PRIVATE-ERROR'}).hint().offline,'write-failed');
  assert.equal(fixture('[]',{}).hint().offline,'ok');
});

test('dashboard captures sanitized state before flush and renders only fixed fields',()=>{
  const src=read('dashboard.js');
  const capture=src.indexOf('RAK_17136_CONFLICT_CAPTURE_BEFORE_SYNC');
  const flush=src.indexOf("await step('flush-fronty'");
  assert(capture>=0&&flush>capture,'diagnostic must be captured before queue flush');
  for(const marker of [
    'RAK_17136_SANITIZED_CONFLICT_DIALOG',
    'Stav aplikace: ',
    'Úložiště fronty: ',
    'Offline kopie: ',
    'Příčina: ',
    'Obsah serveru a telefonu nebyl porovnán.',
    'Diagnostika nic nemaže ani nezapisuje.'
  ]) assert(src.includes(marker),marker);
  const block=src.slice(src.indexOf('RAK_17136_SANITIZED_CONFLICT_DIALOG'),src.indexOf('RAK_17063_MANUAL_REVISION_DIALOG_GUARD'));
  for(const forbidden of ['payload','token','lastErrorMessage','.id','JSON.stringify']) {
    assert(!block.includes(forbidden),'dialog exposes unsafe field '+forbidden);
  }
  const bridge=read('supabase-bridge.js');
  const fn=extractNamedDeclaration(bridge,'getRakConflictDiagnosticHint');
  assert(fn.length<2600,'startup bridge conflict hint grew too large: '+fn.length);
  assert(!/\.rpc\s*\(|fetch\s*\(|setItem\s*\(|removeItem\s*\(|getClient\s*\(/.test(fn),'hint must stay read-only and network-free');
  assert(bridge.includes('window.getRakConflictDiagnosticHint = getRakConflictDiagnosticHint;'));
});
