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
    rotationSync:{
      lastReadAt:options.lastReadAt===undefined?new Date().toISOString():options.lastReadAt,
      lastSource:options.lastSource===undefined?'remote':options.lastSource,
      lastError:options.lastError||null
    },
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
    state,LOCAL_QUEUE_KEY:'queue',localStorage,JSON,Date,Math,Object,Array,String,Number,Boolean,
    navigator:{onLine:options.online!==false},
    getClient:()=>{network+=0;return options.client===false?null:{};},
    summarizeQueuedSyncTask:task=>({failure:String(task&&task.failureForTest||'nepotvrzené uložení')})
  };
  const {api}=runNamedDeclarations({
    modules:[{source:read('supabase-bridge.js'),names:['getRakConflictDiagnosticSnapshot']}],
    globals:ctx,exports:{snapshot:'getRakConflictDiagnosticSnapshot'}
  });
  return {snapshot:()=>api.snapshot(),writes:()=>writes,network:()=>network};
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

test('sanitized snapshot preserves concrete conflict cause without private values or writes',()=>{
  const raw=JSON.stringify([
    {id:'PRIVATE-ID-991',type:'rotation_state',conflict:'newer-online-state',payload:{name:'PRIVATE-NAME',token:'PRIVATE-JWT'}},
    {id:'PRIVATE-ID-992',type:'bug_report',entry:{message:'PRIVATE-REPORT'}}
  ]);
  const f=fixture(raw),out=f.snapshot(),serialized=JSON.stringify(out);
  assert.equal(out.schema,'rak-conflict-diagnostic-v1');
  assert.equal(out.hasIssue,true);
  assert.equal(out.appState,'remote-verified');
  assert.equal(out.queue.total,2);
  assert.equal(out.queue.held,1);
  assert.equal(out.queue.retryable,1);
  assert.equal(out.queue.itemLabel,'starší rozpis');
  assert.equal(out.storage.queue,'ok');
  assert.equal(out.cause,'held-newer-online-state');
  assert.equal(out.causeLabel,'server má novější ověřený stav');
  assert.equal(out.serverContentCompared,false);
  assert.equal(f.writes(),0);
  assert.equal(f.network(),0);
  for(const secret of ['PRIVATE-ID-991','PRIVATE-ID-992','PRIVATE-NAME','PRIVATE-JWT','PRIVATE-REPORT']) assert(!serialized.includes(secret));
});

test('corrupt or unavailable queue is distinguished from app/network state without exposing storage errors',()=>{
  for(const [raw,options,expected] of [
    ['{PRIVATE-BROKEN',{},'queue-storage-corrupt'],
    ['[]',{storageError:'ambiguous'},'queue-storage-ambiguous'],
    ['[]',{storageError:'write-failed'},'queue-storage-write-failed'],
    ['[]',{throwRead:true},'queue-storage-unavailable']
  ]){
    const out=fixture(raw,options).snapshot(),serialized=JSON.stringify(out);
    assert.equal(out.cause,expected);
    assert.equal(out.hasIssue,true);
    assert(!serialized.includes('PRIVATE-BROKEN'));
    assert(!serialized.includes('PRIVATE-STORAGE-ERROR'));
  }
});

test('fixed conflict categories cover every runtime-held reason and unknown values stay generic',()=>{
  const cases={
    'admin-review-required':'starší administrátorská změna vyžaduje nové ověření',
    'newer-online-state':'server má novější ověřený stav',
    'oversize-task':'položka překročila bezpečný limit',
    'unknown-task':'fronta obsahuje neznámý typ položky',
    'unsupported-task':'stará položka už není podporovaná',
    'unverified-local-version':'lokální verzi nelze bezpečně ověřit',
    'write-rejected':'server zápis odmítl'
  };
  for(const [reason,label] of Object.entries(cases)){
    const out=fixture(JSON.stringify([{id:'PRIVATE',type:'machine_settings',conflict:reason}])).snapshot();
    assert.equal(out.cause,'held-'+reason);
    assert.equal(out.causeLabel,label);
  }
  const unknown=fixture(JSON.stringify([{id:'PRIVATE',type:'machine_settings',conflict:'SECRET-SERVER-DETAIL'}])).snapshot();
  assert.equal(unknown.cause,'held-other');
  assert.equal(unknown.causeLabel,'zadržený konflikt bez bezpečně rozpoznané příčiny');
  assert(!JSON.stringify(unknown).includes('SECRET-SERVER-DETAIL'));
});

test('dashboard captures diagnosis before flush and renders only fixed sanitized fields',()=>{
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
  for(const forbidden of ['payload','token','lastErrorMessage','.id','JSON.stringify']) assert(!block.includes(forbidden),'dialog exposes unsafe field '+forbidden);
  const bridge=read('supabase-bridge.js');
  const fn=extractNamedDeclaration(bridge,'getRakConflictDiagnosticSnapshot');
  assert(!/\.rpc\s*\(|fetch\s*\(|setItem\s*\(|removeItem\s*\(/.test(fn),'snapshot must stay read-only and network-free');
  assert(bridge.includes('window.getRakConflictDiagnosticSnapshot = getRakConflictDiagnosticSnapshot;'));
});
