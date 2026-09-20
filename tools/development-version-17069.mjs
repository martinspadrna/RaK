#!/usr/bin/env node
// RaK 1.7.69: confirmed, local-only deletion of saved admin drafts and held rotation queue tasks.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const OLD='1.7.68',VERSION='1.7.69';
const PREVIOUS='v1.7.68-async-draft-guard1',BUILD='v1.7.69-local-drafts1';
const read=p=>fs.readFileSync(p,'utf8'),write=(p,s)=>fs.writeFileSync(p,s,'utf8');
function once(s,b,a,label){if(s.includes(a))return s;assert(s.includes(b),'[17069] missing '+label);assert.equal(s.split(b).length,2,'[17069] ambiguous '+label);return s.replace(b,a);}

let bridge=read('supabase-bridge.js');
assert(bridge.includes('RAK_17062_LOSSLESS_AMBIGUITY_GUARD')&&bridge.includes('RAK_17057_STATUS_GUARD'),'verified queue guard required');
if(!bridge.includes('RAK_17069_LOCAL_DRAFT_QUEUE_GUARD')){
 const helpers=`  // RAK_17069_LOCAL_DRAFT_QUEUE_GUARD. Explicit local-only operation; never touches remote tables.
  // Preserve other queued types byte-for-byte as JSON values, including legacy/unknown entries.
  const RAK_UNSYNCED_DRAFT_PREFIX='rak_admin_unsynced_month_v1_';
  function rakInspectLocalRotationDrafts() {
    const denied=reason=>({ok:false,reason,drafts:0,rotationQueued:0,otherQueued:0,otherConflicts:0});
    if(typeof app==='undefined'||!app||app.adminUnlocked!==true||!hasSecureAdminContext())return denied('admin-required');
    if(flushPromise)return denied('queue-busy');
    try{
      const rawQueue=localStorage.getItem(LOCAL_QUEUE_KEY);
      const queue=rawQueue===null?[]:JSON.parse(rawQueue);
      if(!Array.isArray(queue))return denied('queue-invalid');
      const drafts=[];
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i);
        if(typeof key!=='string'||!key.startsWith(RAK_UNSYNCED_DRAFT_PREFIX))continue;
        if(!/^rak_admin_unsynced_month_v1_[A-Za-z0-9_-]{1,140}$/.test(key))return denied('draft-invalid');
        const raw=localStorage.getItem(key);
        if(typeof raw!=='string'||raw.length>2000000)return denied('draft-invalid');
        let value;try{value=JSON.parse(raw);}catch(_){return denied('draft-invalid');}
        if(!value||value.format!=='rak-admin-month-draft-v1'||typeof value.monthKey!=='string'
          ||!value.month||typeof value.month!=='object'||Array.isArray(value.month))return denied('draft-invalid');
        drafts.push({key,raw});
      }
      drafts.sort((a,b)=>a.key.localeCompare(b.key));
      const isRotation=task=>task&&['rotation_state','rotation_month_entries'].includes(task.type);
      const rotationQueued=queue.filter(isRotation).length;
      const others=queue.filter(task=>!isRotation(task));
      // Ephemeral fingerprint only. No payload, account, name, key or token in the UI.
      const fingerprintSource=String(rawQueue)+'\\u0000'+drafts.map(item=>item.key+'\\u0000'+item.raw).join('\\u0000');
      let hash=2166136261;
      for(let i=0;i<fingerprintSource.length;i++)hash=Math.imul(hash^fingerprintSource.charCodeAt(i),16777619);
      return {ok:true,queue,rawQueue,drafts,rotationQueued,otherQueued:others.length,
        otherConflicts:others.filter(task=>task&&task.conflict).length,
        signature:(hash>>>0).toString(16)+':'+fingerprintSource.length+':'+drafts.length};
    }catch(_){return denied('storage-unavailable');}
  }
  function rakLocalRotationDraftCleanupPreview(){
    const state=rakInspectLocalRotationDrafts();
    return {ok:state.ok,reason:state.reason||'',drafts:state.drafts?.length||0,
      rotationQueued:state.rotationQueued||0,otherQueued:state.otherQueued||0,
      otherConflicts:state.otherConflicts||0,signature:state.signature||''};
  }
  function rakDiscardLocalRotationDrafts(expectedSignature){
    const snapshot=rakInspectLocalRotationDrafts();
    if(!snapshot.ok)return {ok:false,reason:snapshot.reason};
    if(!expectedSignature||expectedSignature!==snapshot.signature)return {ok:false,reason:'local-changed'};
    const keep=snapshot.queue.filter(task=>!task||!['rotation_state','rotation_month_entries'].includes(task.type));
    const changed=snapshot.rotationQueued>0;
    const nextQueue=JSON.stringify(keep);
    try{
      // No awaits between final snapshot, delete and verification: avoid partial user-visible success.
      if(changed){localStorage.setItem(LOCAL_QUEUE_KEY,nextQueue);
        if(localStorage.getItem(LOCAL_QUEUE_KEY)!==nextQueue)throw Error('queue-verification');}
      for(const item of snapshot.drafts){localStorage.removeItem(item.key);
        if(localStorage.getItem(item.key)!==null)throw Error('draft-verification');}
      return {ok:true,drafts:snapshot.drafts.length,rotationQueued:snapshot.rotationQueued,
        otherQueued:snapshot.otherQueued,otherConflicts:snapshot.otherConflicts};
    }catch(_){
      // Best-effort rollback is explicit. Never claim that a partly written store was cleared.
      try{
        if(changed){if(snapshot.rawQueue===null)localStorage.removeItem(LOCAL_QUEUE_KEY);
          else localStorage.setItem(LOCAL_QUEUE_KEY,snapshot.rawQueue);}
        for(const item of snapshot.drafts)localStorage.setItem(item.key,item.raw);
      }catch(_){}
      return {ok:false,reason:'storage-write-failed'};
    }
  }
  window.rakLocalRotationDraftCleanupPreview=rakLocalRotationDraftCleanupPreview;
  window.rakDiscardLocalRotationDrafts=rakDiscardLocalRotationDrafts;

`;
 bridge=once(bridge,'  window.getSupabaseSyncStatus = getSyncUiStatus;',helpers+'  window.getSupabaseSyncStatus = getSyncUiStatus;','bridge local-only helpers');
 write('supabase-bridge.js',bridge);
}
let sync=read('app-rotation-sync.js');
if(!sync.includes('RAK_17069_INVALIDATE_DISCARDED_REQUESTS')){
 sync=once(sync,'let rakRotationSyncEpoch=0;',`let rakRotationSyncEpoch=0;
// RAK_17069_INVALIDATE_DISCARDED_REQUESTS: prevent earlier in-flight reads overwriting a user-confirmed cleanup.
function rakInvalidateRotationSyncForDraftCleanup(){rakRotationSyncEpoch+=1;}`, 'invalidate old network reads');
 write('app-rotation-sync.js',sync);
}
let editor=read('admin-rotation-editor.js');
assert(editor.includes('RAK_17065_RECOVER_DRAFTS_GUARD')&&editor.includes('RAK_17066_DIRTY_NAVIGATION_GUARD'),'draft recovery or navigation guard missing');
if(!editor.includes('RAK_17069_DRAFT_CLEANUP_CARD')){
 const helper=`// RAK_17069_DRAFT_CLEANUP_CARD: counts only, deletion always requires explicit confirmation.
function rakAdminLocalDraftCleanupHtml(){
  const info=typeof window.rakLocalRotationDraftCleanupPreview==='function'
    ?window.rakLocalRotationDraftCleanupPreview():null;
  const valid=!!(info&&info.ok);
  const drafts=valid?Number(info.drafts||0):0;
  const pending=valid?Number(info.rotationQueued||0):0;
  const other=valid?Number(info.otherConflicts||0):0;
  return '<div class="appMenuCard" id="rakAdminLocalDraftCleanup">'
    +'<b>Místní neuložené návrhy rozpisů</b>'
    +'<div class="smallText">V tomto zařízení: '+(valid?(drafts+' záloh návrhů · '+pending+' čekajících zápisů rozpisů'):'stav místního úložiště nelze bezpečně ověřit')
    +(other?' · '+other+' jiných konfliktů zůstane zachováno':'')+'.</div>'
    +'<div class="smallText">Smazání je nevratné. Nezasáhne online rozpis, ostatní místní frontu ani jiná nastavení. Předem si můžeš stáhnout návrhy výše.</div>'
    +'<button type="button" class="appMenuAction" data-admin-action="discard-local-rotation-drafts"'
    +(valid?'':' disabled')+'>Smazat neuložené místní návrhy</button>'
    +'<div id="rakAdminLocalDraftCleanupStatus" class="smallText" role="status" aria-live="polite"></div>'
    +'</div>';
}

`;
 editor=once(editor,'async function saveAdminRotationToSupabase(monthKey, rawText) {',helper+'async function saveAdminRotationToSupabase(monthKey, rawText) {','add draft cleanup card');
 editor=once(editor,`    rakAdminMonthDraftRecoveryHtml(monthKey),
    '  <div class="adminRotationSaveDock">',`,`    rakAdminMonthDraftRecoveryHtml(monthKey),
    rakAdminLocalDraftCleanupHtml(),
    '  <div class="adminRotationSaveDock">',`,'show cleanup after private downloads');
 write('admin-rotation-editor.js',editor);
}
let menu=read('app-menu.js');
assert(menu.includes('RAK_17067_ONLINE_RELOAD_RERENDER_GUARD'),'online reload safety missing');
if(!menu.includes('RAK_17069_EXPLICIT_DRAFT_DISCARD')){
 const action=`      // RAK_17069_EXPLICIT_DRAFT_DISCARD: all local, online read-only preflight, never server overwrite.
      if(adminAction==='discard-local-rotation-drafts'){
        if(body.dataset.adminView!=='rotation'||!app||app.adminUnlocked!==true)throw Error('Administrace rozpisů není odemčená.');
        if(window.__rakLocalDraftCleanupRunning)return;
        const bridge=window.RotationSupabaseBridge;
        if(!bridge||typeof bridge.loadRotationState!=='function'||typeof window.rakLocalRotationDraftCleanupPreview!=='function'
          ||typeof window.rakDiscardLocalRotationDrafts!=='function')throw Error('Čištění místních návrhů není připravené.');
        const before=window.rakLocalRotationDraftCleanupPreview();
        if(!before.ok)throw Error('Místní návrhy nebo frontu nelze bezpečně ověřit. Nic nebylo smazáno.');
        const editor=document.getElementById('adminRotationEditor');
        const fingerprint=editor&&typeof rakRotationEditorFingerprint==='function'?rakRotationEditorFingerprint(editor):null;
        if(editor&&fingerprint===null)throw Error('Editor se nepodařilo ověřit. Nic nebylo smazáno.');
        const month=String(app.selectedMonth||'');
        const rotationBefore=JSON.stringify(app.rotation);
        if(!before.drafts&&!before.rotationQueued&&!app.adminRotationDirty){
          const status=document.getElementById('rakAdminLocalDraftCleanupStatus');
          if(status)status.textContent='Žádné neuložené návrhy rozpisů tu nejsou.';
          return;
        }
        if(!confirm('Opravdu nevratně smazat '+before.drafts+' místních záloh a '+before.rotationQueued
          +' čekajících změn rozpisů v tomto zařízení (včetně jiných měsíců a případně jiných administrátorských účtů)?'
          +' Aktuálně rozepsané změny se zahodí a načte se jen ověřený online rozpis. Online data ani jiná fronta se nemažou.'))return;
        window.__rakLocalDraftCleanupRunning=true;
        target.disabled=true;
        try{
          const status=document.getElementById('rakAdminLocalDraftCleanupStatus');
          if(status)status.textContent='Ověřuji aktuální online rozpis; místní návrhy zatím zůstávají…';
          if(typeof navigator!=='undefined'&&navigator.onLine===false)throw Error('Bez internetu nelze ověřit online rozpis. Nic nebylo smazáno.');
          const online=await bridge.loadRotationState();
          const state=typeof bridge.getState==='function'?bridge.getState():null;
          const source=String(state&&state.rotationSync&&state.rotationSync.lastSource||'');
          if(!online||!online.payload||!online.payload.months||online.meta&&online.meta.source==='local-cache'
            ||!['remote','tables'].includes(source)||state.rotationSync.lastError)
            throw Error('Nepodařilo se ověřit skutečný online rozpis. Místní návrhy zůstaly zachovány.');
          if(document.getElementById('adminRotationEditor')!==editor||String(app.selectedMonth||'')!==month
            ||JSON.stringify(app.rotation)!==rotationBefore
            ||editor&&rakRotationEditorFingerprint(editor)!==fingerprint)
            throw Error('Během načítání vznikly nové úpravy. Nic nebylo smazáno.');
          const current=window.rakLocalRotationDraftCleanupPreview();
          if(!current.ok||current.signature!==before.signature)throw Error('Místní návrhy se mezitím změnily. Nic nebylo smazáno.');
          const erased=window.rakDiscardLocalRotationDrafts(before.signature);
          if(!erased||!erased.ok)throw Error('Bezpečné smazání selhalo. Zkontroluj úložiště; změny nepřepisuj.');
          if(typeof rakInvalidateRotationSyncForDraftCleanup==='function')rakInvalidateRotationSyncForDraftCleanup();
          app.adminRotationDirty=false;
          if(typeof applyRakRotationState==='function')applyRakRotationState(online.payload,{force:true});
          renderAdminMenuBody(body,currentView);
          const nextStatus=document.getElementById('rakAdminLocalDraftCleanupStatus');
          if(nextStatus)nextStatus.textContent='Odstraněno místně: '+erased.drafts+' návrhů a '+erased.rotationQueued
            +' čekajících rozpisů. Online rozpis byl znovu načten.'
            +(erased.otherConflicts?' Pozor: '+erased.otherConflicts+' jiných konfliktů zůstává.':'');
          if(typeof window.__rakRefreshSyncBadgeTruth==='function')window.__rakRefreshSyncBadgeTruth();
        }finally{window.__rakLocalDraftCleanupRunning=false;target.disabled=false;}
        return;
      }
`;
 menu=once(menu,"      if (adminAction === 'load-online') {",action+"      if (adminAction === 'load-online') {",'cleanup click handler');
 write('app-menu.js',menu);
}
let replay=read('tools/shift-report-mo-hotfix-170-smoke.mjs');
if(!replay.includes('RAK_17069_TWO_PASS_GUARD')){
 replay=once(replay,`// RAK_17068_TWO_PASS_GUARD
const already17068=indexSource.includes("var build='${PREVIOUS}';");`,
 `// RAK_17068_TWO_PASS_GUARD
// RAK_17069_TWO_PASS_GUARD
const already17069=indexSource.includes("var build='${BUILD}';");
const already17068=already17069||indexSource.includes("var build='${PREVIOUS}';");`,'second build selector');
 replay=once(replay,`already17068?"var build='${PREVIOUS}';":already17067?`,
 `already17069?"var build='${BUILD}';":already17068?"var build='${PREVIOUS}';":already17067?`,'second build marker');
 write('tools/shift-report-mo-hotfix-170-smoke.mjs',replay);
}
let oldGate=read('tools/release-gate-17068.test.mjs');
if(!oldGate.includes('RAK_17069_HISTORICAL_GATE_COMPAT')){
 const before=` const files=[['index.html',"var build='${PREVIOUS}';"],['supabase-config.js','window.RAK_RELEASE_VERSION = "${OLD}";'],['app.js','const RAK_DEV_UPDATE_BUILD = "${PREVIOUS}";'],['sw.js',"const CACHE_VERSION = 'v${OLD}';"]];`;
 const after=` // RAK_17069_HISTORICAL_GATE_COMPAT: preserve 1.7.68 assertions after successor release.
 const newer=read('index.html').includes("var build='${BUILD}';");
 const version=newer?'${VERSION}':'${OLD}', build=newer?'${BUILD}':'${PREVIOUS}';
 const files=[['index.html',\`var build='\${build}';\`],['supabase-config.js',\`window.RAK_RELEASE_VERSION = "\${version}";\`],['app.js',\`const RAK_DEV_UPDATE_BUILD = "\${build}";\`],['sw.js',\`const CACHE_VERSION = 'v\${version}';\`]];`;
 oldGate=once(oldGate,before,after,'compat 17068 gate');
 write('tools/release-gate-17068.test.mjs',oldGate);
}
let old67=read('tools/release-gate-17067.test.mjs');
if(!old67.includes('RAK_17069_OLDER_GATE_COMPAT')){
 old67=once(old67,
 `const upgraded=read('index.html').includes("var build='${PREVIOUS}';");
const BUILD=upgraded?'${PREVIOUS}':'v1.7.67-equalgrid-reload1';
const DISPLAY=upgraded?'${OLD}':'1.7.67';`,
 `// RAK_17069_OLDER_GATE_COMPAT
const latest=read('index.html').includes("var build='${BUILD}';");
const upgraded=latest||read('index.html').includes("var build='${PREVIOUS}';");
const BUILD=latest?'${BUILD}':upgraded?'${PREVIOUS}':'v1.7.67-equalgrid-reload1';
const DISPLAY=latest?'${VERSION}':upgraded?'${OLD}':'1.7.67';`,
 'compat 17067 gate');
 write('tools/release-gate-17067.test.mjs',old67);
}
for(const [p,needle,replacement,marker] of [
 ['tools/browser-equal-grid-17067.mjs',"['v1.7.67-equalgrid-reload1','v1.7.68-async-draft-guard1']", "['v1.7.67-equalgrid-reload1','v1.7.68-async-draft-guard1','v1.7.69-local-drafts1']",'RAK_17069_EQUAL_GRID_COMPAT'],
 ['tools/browser-soft-grid-17066.mjs',"['v1.7.67-equalgrid-reload1','v1.7.68-async-draft-guard1']", "['v1.7.67-equalgrid-reload1','v1.7.68-async-draft-guard1','v1.7.69-local-drafts1']",'RAK_17069_SOFT_GRID_COMPAT'],
 ['tools/browser-absence-layout-17061.mjs',".includes('v1.7.68-async-draft-guard1');", ".includes('v1.7.68-async-draft-guard1') || fs.readFileSync(path.join(ROOT,'index.html'),'utf8').includes('v1.7.69-local-drafts1');",'RAK_17069_ABSENCE_COMPAT']
]){
 let src=read(p);
 if(!src.includes(marker)){src=once(src,needle,replacement,p);src+='\n// '+marker+'\n';write(p,src);}
}
for(const [p,b,a] of [
 ['supabase-config.js',`window.RAK_RELEASE_VERSION = "${OLD}";`,`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['supabase-config.js',`window.RAK_TEST_DISPLAY_VERSION = "${OLD}";`,`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`],
 ['supabase-config.js',`window.RAK_PWA_BUILD = "${PREVIOUS}";`,`window.RAK_PWA_BUILD = "${BUILD}";`],
 ['app.js',`const RAK_DEV_UPDATE_BUILD = "${PREVIOUS}";`,`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],
 ['app.js',`window.RAK_RELEASE_VERSION = "${OLD}";`,`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['sw.js',`const CACHE_VERSION = 'v${OLD}';`,`const CACHE_VERSION = 'v${VERSION}';`],
 ['sw.js',`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${OLD}';`,`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],
 ['sw.js',`const DEVELOPMENT_BUILD_ID = '${PREVIOUS}';`,`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],
 ['index.html',`var build='${PREVIOUS}';`,`var build='${BUILD}';`]
])write(p,once(read(p),b,a,'release '+p));
assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'),'TEST only');
for(const p of ['supabase-bridge.js','app-rotation-sync.js','admin-rotation-editor.js','app-menu.js','tools/release-gate-17068.test.mjs','tools/release-gate-17067.test.mjs','tools/shift-report-mo-hotfix-170-smoke.mjs','sw.js','app.js'])execFileSync(process.execPath,['--check',p],{stdio:'pipe'});
execFileSync(process.execPath,['--test','tools/release-gate-17069.test.mjs'],{stdio:'inherit'});
console.log('[development-version-17069] PASS explicit local-only draft/rotation queue cleanup; no cloud writes, other queues preserved, TEST release');
