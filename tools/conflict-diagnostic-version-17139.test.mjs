import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('conflict diagnostic title follows current release metadata instead of a hardcoded version',()=>{
  const source=read('rak-conflict-diagnostics.js');
  assert(!source.includes('RaK 1.7.136 – bezpečná diagnostika konfliktu'));
  assert(source.includes('RAK_RELEASE_METADATA'));
  const context={RAK_RELEASE_METADATA:{displayVersion:'9.9.9'}};
  vm.runInNewContext(source,context);
  const text=context.RAKConflictDiagnostics.format({
    storageIssue:false,conflict:'admin-review-required',cause:'held-admin-review-required',
    failure:'nepotvrzené uložení',appState:'remote-verified',total:1,held:1,retryable:0,
    type:'nastavení strojů',offline:'ok',remoteVerified:true
  });
  assert(text.startsWith('RaK 9.9.9 – bezpečná diagnostika konfliktu'));
});

test('Dashboard lazy import cache-busts conflict diagnostics from release metadata',()=>{
  const dashboard=read('dashboard.js');
  assert(!dashboard.includes("rak-conflict-diagnostics.js?v=1.7.136"));
  assert(dashboard.includes('RAK_RELEASE_METADATA'));
  assert(dashboard.includes('moduleCacheVersion||window.RAK_RELEASE_METADATA.displayVersion'));
  assert(dashboard.includes("const diagnosticUrl='./rak-conflict-diagnostics.js'+"));
  assert(dashboard.includes('encodeURIComponent(diagnosticVersion)'));
  assert(dashboard.includes('await import(diagnosticUrl)'));
});
