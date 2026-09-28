import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

function runDiagnostic({status={},review={},conflicts={ok:true,items:[],total:0}}={}) {
  const context=vm.createContext({
    window:null,globalThis:null,Object,Array,String,Number,Boolean,Math,Set,JSON,
    getSupabaseSyncStatus:()=>status,
    getRakPendingSyncReview:()=>review,
    getRakQueueConflictItems:()=>conflicts
  });
  context.window=context;
  context.globalThis=context;
  vm.runInContext(read('rak-conflict-diagnostics.js'),context,{filename:'rak-conflict-diagnostics.js'});
  return context.RAKConflictDiagnostics;
}

test('1.7.136 diagnostic remains wired under verified successor releases',()=>{
  const pkg=JSON.parse(read('package.json'));
  const current=String(pkg.version||'');
  const patch=Number(current.split('.').at(-1));
  assert(/^1\.7\.\d+$/.test(current)&&Number.isInteger(patch)&&patch>=136);
  assertCurrentReleaseIdentity(read,current);
  const workflow=read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('node --check rak-conflict-diagnostics.js'));
  assert(pkg.scripts.check.includes('tools/conflict-diagnostic-17136.test.mjs'));
  assert(workflow.includes('tools/conflict-diagnostic-17136.test.mjs'));
  assert(workflow.includes('rak-170'+patch+'-isolated-build-'));
});

test('known queue conflict is reduced to fixed safe cause without leaking private fields',()=>{
  const api=runDiagnostic({
    status:{kind:'online',verified:true,queued:1,conflictCount:1,storageIssue:false,queueIssue:null},
    review:{total:1,held:1,retryable:0,remoteVerified:true,storageIssue:false},
    conflicts:{ok:true,total:1,items:[{
      index:9,type:'rotation_state',category:'rozpis',label:'starší rozpis',
      reason:'newer-online-state',signature:'PRIVATE-SIGNATURE',secret:'PRIVATE-PAYLOAD'
    }]}
  });
  const out=api.capture(),serialized=JSON.stringify(out),formatted=api.format(out);
  assert.equal(out.conflict,'newer-online-state');
  assert.equal(out.type,'starší rozpis');
  assert.equal(out.cause,'held-newer-online-state');
  assert.equal(out.serverContentCompared,false);
  assert.match(formatted,/server má novější ověřený stav/);
  for(const secret of ['PRIVATE-SIGNATURE','PRIVATE-PAYLOAD']) {
    assert(!serialized.includes(secret));
    assert(!formatted.includes(secret));
  }
});

test('unknown conflict and queue storage failure fail closed to generic fixed text',()=>{
  let api=runDiagnostic({
    status:{kind:'error',verified:false,queued:1,conflictCount:1,storageIssue:false},
    review:{total:1,held:1,retryable:0,remoteVerified:false,storageIssue:false},
    conflicts:{ok:true,total:1,items:[{label:'nastavení strojů',reason:'PRIVATE-RAW-SERVER-ERROR'}]}
  });
  let out=api.capture();
  assert.equal(out.conflict,'other');
  assert(!JSON.stringify(out).includes('PRIVATE-RAW-SERVER-ERROR'));
  assert.match(api.format(out),/bez bezpečně rozpoznané příčiny/);

  api=runDiagnostic({
    status:{kind:'error',verified:false,queued:0,conflictCount:0,storageIssue:true},
    review:{total:0,held:0,retryable:0,remoteVerified:false,storageIssue:true},
    conflicts:{ok:false,reason:'PRIVATE-STORAGE-DETAIL',items:[]}
  });
  out=api.capture();
  assert.equal(out.storageIssue,true);
  assert.equal(out.cause,'queue-storage');
  assert(!JSON.stringify(out).includes('PRIVATE-STORAGE-DETAIL'));
  assert.match(api.format(out),/chyba nebo neověřitelný stav lokální fronty/);
});

test('retry, offline and offline-copy states use only allowlisted labels',()=>{
  const api=runDiagnostic({
    status:{kind:'offline',verified:false,queued:1,conflictCount:0,storageIssue:false,
      offlineError:'rotation-offline-single-copy',
      queueIssue:{label:'hlášení chyby',failure:'připojení',retries:2}},
    review:{total:1,held:0,retryable:1,remoteVerified:false,storageIssue:false},
    conflicts:{ok:true,total:0,items:[]}
  });
  const out=api.capture();
  assert.equal(out.appState,'offline');
  assert.equal(out.failure,'připojení');
  assert.equal(out.offline,'limited');
  assert.equal(out.cause,'retry-připojení');
  assert.match(api.format(out),/čekající změna dříve selhala: připojení/);
});

test('diagnostic module is not on startup parse path and capture happens before manual flush',()=>{
  const dashboard=read('dashboard.js');
  const index=read('index.html');
  const bridge=read('supabase-bridge.js');
  const captureAt=dashboard.indexOf('await import(diagnosticUrl)');
  const flushAt=dashboard.indexOf("await step('flush-fronty'");
  assert(dashboard.includes("const diagnosticUrl='./rak-conflict-diagnostics.js'+"),'lazy diagnostic URL must remain release-cache-busted');
  assert(captureAt>=0&&flushAt>captureAt,'lazy diagnostic must load/capture before flush');
  assert(!index.includes('rak-conflict-diagnostics.js'),'diagnostic must not be a startup script');
  assert(!bridge.includes('RAK_17136_CONFLICT_DIAGNOSTIC'),'bridge must stay unchanged by P2.4 diagnostic');
  assert(!bridge.includes('getRakConflictDiagnosticHint'),'bridge must not carry diagnostic-only parsing work');
  const module=read('rak-conflict-diagnostics.js');
  for(const forbidden of ['localStorage','sessionStorage','.rpc(','fetch(','setItem(','removeItem(','console.']) {
    assert(!module.includes(forbidden),'lazy diagnostic must stay read-only: '+forbidden);
  }
  for(const marker of ['Stav aplikace: ','Úložiště fronty: ','Offline kopie: ','Příčina: ',
    'Obsah serveru a telefonu nebyl porovnán.','Diagnostika nic nemaže ani nezapisuje.']) {
    assert(module.includes(marker),marker);
  }
});
