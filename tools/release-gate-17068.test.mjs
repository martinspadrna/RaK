#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {RELEASE_METADATA,assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
import {runNamedDeclarations} from './runtime-vm-fixture.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
function fixture({dirty=true,allow=true,editorValid=true}={}){
  const field={tagName:'INPUT',name:'MO',value:'Původní návrh',checked:false};
  const editor=editorValid?{querySelectorAll:()=>[field]}:{};
  const status={textContent:''};
  let currentEditor=editor, applied=0, cache=0, guarded=0, requests=0;
  const callbacks=[];
  const bridge={
    loadCachedRotationState:()=>{cache++;return {payload:{stale:true}};},
    loadRotationState:()=>{requests++;return new Promise((resolve,reject)=>callbacks.push({resolve,reject}));}
  };
  const app={adminRotationDirty:dirty};
  const context={app,window:{RotationSupabaseBridge:bridge},
    document:{getElementById:id=>id==='adminRotationEditor'?currentEditor:id==='adminRotationDraftStatus'?status:null},
    console:{warn:()=>{}},refreshRakMachineSettingsInBackground:()=>{},
    // RAK_17057_BADGE_GUARD runs from syncRotationFromSupabase finally; preserve its real call in the VM.
    rakRefreshSyncBadgeTruth:()=>{},
    applyRakRotationState:payload=>{applied++;return payload;},
    rakGuardAdminRotationDiscard:()=>{guarded++;if(!allow)return false;app.adminRotationDirty=false;return true;}};
  const runtime=runNamedDeclarations({modules:[
    {source:read('app-rotation-sync.js'),names:['rakRotationSyncEpoch','rakRotationEditorFingerprint','syncRotationFromSupabase']},
    {source:read('admin-rotation.js'),names:['loadAdminRotationFromSupabase']}
  ],globals:context,exports:{sync:'syncRotationFromSupabase',reload:'loadAdminRotationFromSupabase'}});
  return {app,field,status,callbacks,editor,bridge,
    run:()=>runtime.api.reload(), sync:force=>runtime.api.sync(force),
    counters:()=>({applied,cache,guarded,requests}),replaceEditor:next=>{currentEditor=next;}};
}
test('race: editing after a confirmed discard never gets overwritten by delayed online data',async()=>{
 const f=fixture(),pending=f.run();
 assert.equal(f.callbacks.length,1);
 f.field.value='Nová změna';f.app.adminRotationDirty=true;
 f.callbacks[0].resolve({payload:{remote:true}});
 assert.equal(await pending,null);
 assert.equal(f.app.adminRotationDirty,true);
 assert.deepEqual(f.counters(),{applied:0,cache:0,guarded:1,requests:1});
 assert.match(f.status.textContent,/nebylo použito/);
});
test('race: input event missing dirty flag still detects changed DOM values',async()=>{
 const f=fixture({dirty:false}),pending=f.run();
 f.field.value='Změna bez události';
 f.callbacks[0].resolve({payload:{remote:true}});
 assert.equal(await pending,null);assert.equal(f.app.adminRotationDirty,true);
 assert.deepEqual(f.counters(),{applied:0,cache:0,guarded:0,requests:1});
 assert.match(f.status.textContent,/Uložte si místní návrh/);
});
test('unchanged editor allows an authorized successful online reload',async()=>{
 const f=fixture(),pending=f.run();
 f.callbacks[0].resolve({payload:{remote:true}});
 assert.equal((await pending).remote,true);assert.equal(f.app.adminRotationDirty,false);
 assert.deepEqual(f.counters(),{applied:1,cache:0,guarded:1,requests:1});
});
test('cancel rejects the network request before touching draft',async()=>{
 const f=fixture({allow:false});assert.equal(await f.run(),null);
 assert.equal(f.app.adminRotationDirty,true);
 assert.deepEqual(f.counters(),{applied:0,cache:0,guarded:1,requests:0});
});
test('newest online request wins; late stale response is ignored',async()=>{
 const f=fixture({dirty:false}),first=f.sync('discard-draft'),second=f.sync('discard-draft');
 assert.equal(f.callbacks.length,2);
 f.callbacks[1].resolve({payload:{newest:true}});
 assert.equal((await second).newest,true);
 f.callbacks[0].resolve({payload:{stale:true}});
 assert.equal(await first,null);
 assert.equal(f.counters().applied,1);
});
test('removing or replacing the editor while loading rejects old response',async()=>{
 const f=fixture(),pending=f.run();f.replaceEditor({querySelectorAll:()=>[f.field]});
 f.callbacks[0].resolve({payload:{remote:true}});
 assert.equal(await pending,null);assert.equal(f.counters().applied,0);assert.equal(f.app.adminRotationDirty,true);
});
test('unreadable editor fails closed even if consent was given',async()=>{
 const f=fixture({editorValid:false});assert.equal(await f.run(),null);
 assert.equal(f.counters().requests,0);assert.equal(f.app.adminRotationDirty,true);
});
test('background synchronization also respects edits made while waiting',async()=>{
 const f=fixture({dirty:false}),pending=f.sync();
 const appliedBeforeResponse=f.counters().applied; // normal sync may use cache before the user starts editing
 f.field.value='Nový offline návrh';
 f.callbacks[0].resolve({payload:{remote:true}});
 assert.equal(await pending,null);assert.equal(f.app.adminRotationDirty,true);
 assert.equal(f.counters().applied,appliedBeforeResponse,'remote response must not apply after new edit');
});
test('network error cannot clear a protected draft or apply stale cache',async()=>{
 const f=fixture(),pending=f.run();f.callbacks[0].reject(Error('offline'));
 assert.equal(await pending,null);assert.equal(f.app.adminRotationDirty,true);
 assert.deepEqual(f.counters(),{applied:0,cache:0,guarded:1,requests:1});
});
test('1.7.68 and verified successors keep TEST-only release and historical gates',()=>{
  assertCurrentReleaseIdentity(read,'1.7.68');
  const pkg=JSON.parse(read('package.json'));
  assert.equal(pkg.version,'1.7.0');
  const config=read('supabase-config.js');assert(config.includes('cgshssdjgzzuprlwnabl')&&!config.includes('bkqamcbkiwumsvelahxr'));
  const chain=read('tools/development-version-17048.mjs');assert(chain.includes("await import('./development-version-17067.mjs');"));assert(chain.includes("await import('./development-version-17068.mjs');"));
  if(pkg.scripts['vercel-build']==='node tools/canonical-build.mjs build'){
    const compiler=read('tools/development-version-17068.mjs');
    for(const marker of ['RAK_17068_TWO_PASS_GUARD','RAK_17068_HISTORICAL_GATE_COMPAT','RAK_17068_EQUALGRID_COMPAT','RAK_17068_SOFTGRID_COMPAT','RAK_17068_ABSENCE_COMPAT'])
      assert(compiler.includes(marker),marker+' missing from frozen compiler');
    assert(read('tools/browser-equal-grid-17067.mjs').includes("import RELEASE_METADATA from '../rak-release-metadata.js';"));
    assert(read('tools/browser-equal-grid-17067.mjs').includes('releasePatch>=67'));
    assert(read('tools/browser-soft-grid-17066.mjs').includes("import RELEASE_METADATA from '../rak-release-metadata.js';"));
    assert(read('tools/browser-soft-grid-17066.mjs').includes('releasePatch>=66'));
  }else{
    const replay=read('tools/shift-report-mo-hotfix-170-smoke.mjs');assert(replay.includes('RAK_17068_TWO_PASS_GUARD'));
    const oldGate=read('tools/release-gate-17067.test.mjs');assert(oldGate.includes('RAK_17068_HISTORICAL_GATE_COMPAT'));
    assert(read('tools/browser-equal-grid-17067.mjs').includes('RAK_17068_EQUALGRID_COMPAT'));
    assert(read('tools/browser-soft-grid-17066.mjs').includes('RAK_17068_SOFTGRID_COMPAT'));
    assert(read('tools/browser-absence-layout-17061.mjs').includes('RAK_17068_ABSENCE_COMPAT'));
  }
  const ci=read('.github/workflows/rak-development-validation.yml');
  for(const command of ['npm run vercel-build\n          npm run vercel-build','node --test tools/release-gate-17067.test.mjs','node --test tools/release-gate-17068.test.mjs','node tools/browser-equal-grid-17067.mjs','node tools/pwa-start-bench-17068.mjs','node tools/http-anon-audit-17050.mjs'])assert(ci.includes(command),command);
  assert(read('admin-rotation.js').includes('RAK_17068_LATE_EDIT_NOTICE'));
  assert(read('app-rotation-sync.js').includes('RAK_17068_FINAL_DRAFT_BARRIER'));
});

