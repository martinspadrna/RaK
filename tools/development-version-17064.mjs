#!/usr/bin/env node
// RaK 1.7.64: durable per-month draft on failed admin CAS + explicit user-only export.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.64',BUILD='v1.7.64-conflict-draft1',PREVIOUS='v1.7.63-casbaseline1';
const read=p=>fs.readFileSync(p,'utf8'),write=(p,s)=>fs.writeFileSync(p,s,'utf8');
function once(source,before,after,label){
 if(source.includes(after)) return source;
 assert(source.includes(before),'[17064] missing '+label);
 assert.equal(source.split(before).length,2,'[17064] ambiguous '+label);
 return source.replace(before,after);
}
let editor=read('admin-rotation-editor.js');
if(!editor.includes('RAK_17064_CONFLICT_DRAFT_GUARD')){
 const helper=`// RAK_17064_CONFLICT_DRAFT_GUARD: snapshot ONLY the edited month, not Auth/tokens.
// Preserve drafts before a network attempt and retain on every failed/uncertain response.
function rakPreserveAdminMonthDraft(monthKey, month) {
  const result={stored:false,key:'',content:'',reason:'unavailable'};
  try {
    const content=JSON.stringify({format:'rak-admin-month-draft-v1',monthKey:String(monthKey),
      capturedAt:new Date().toISOString(),month:JSON.parse(JSON.stringify(month))});
    if(!content || new Blob([content]).size>2000000){result.reason='oversize';return result;}
    result.content=content;
    const key='rak_admin_unsynced_month_v1_'+String(monthKey).replace(/[^0-9A-Za-z_-]/g,'_')+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);
    localStorage.setItem(key,content);
    if(localStorage.getItem(key)!==content){result.reason='verification-failed';return result;}
    result.stored=true;result.key=key;result.reason='';
  }catch(_){result.reason='storage-denied';}
  return result;
}

function rakShowAdminDraftExport(draft,statusEl){
  if(!statusEl||!draft||!draft.content)return;
  const parent=statusEl.parentNode;
  if(!parent||typeof document==='undefined')return;
  const button=document.createElement('button');
  button.type='button';button.className='appMenuBtn';
  button.setAttribute('data-rak-unsynced-draft','manual-export');
  button.textContent='Stáhnout místní návrh JSON';
  button.addEventListener('click',()=>{
    if(typeof window.confirm==='function'&&!window.confirm('Soubor obsahuje jména a rozpis. Ulož jej pouze soukromě. Pokračovat?'))return;
    let url='';
    try {
      const file=new Blob([draft.content],{type:'application/json;charset=utf-8'});
      url=URL.createObjectURL(file);
      const link=document.createElement('a');link.href=url;
      link.download='RaK_neulozeny_rozpis_'+String(Date.now())+'.json';
      parent.appendChild(link);link.click();link.remove();
    }catch(_){if(typeof window.alert==='function')window.alert('Export se nezdařil. Neobnovuj stránku.');}
    finally{if(url) setTimeout(()=>URL.revokeObjectURL(url),30000);}
  });
  parent.appendChild(button);
}

`;
 editor=once(editor,'async function saveAdminRotationToSupabase(monthKey, rawText) {',helper+'async function saveAdminRotationToSupabase(monthKey, rawText) {','draft helper placement');
 editor=once(editor,
 `  let saveResult = { ok: true, months: 0, entries: 0 };
  if (app.adminUnlocked) {
    saveResult = await saveRotationToSupabase(app.rotation, { source: 'admin-menu', monthKey }) || saveResult;
    const statusEl = document.getElementById('adminOnlineSaveStatus');
    if (statusEl) {
      statusEl.textContent = saveResult && saveResult.ok === true
        ? ('Uloženo online ✓ · měsíců: ' + String(saveResult.months || 0) + ' · řádků: ' + String(saveResult.entries || 0))
        : 'Uložení online se nepodařilo.';
    }
  }`,
 `  let saveResult = { ok: false, reason: 'admin-required', months: 0, entries: 0 };
  if (app.adminUnlocked) {
    // Save before network: stale revision, timeout or refresh must never erase this draft.
    const draft = rakPreserveAdminMonthDraft(monthKey, normalized);
    saveResult = await saveRotationToSupabase(app.rotation, { source: 'admin-menu', monthKey })
      || { ok: false, reason: 'no-result' };
    const statusEl = document.getElementById('adminOnlineSaveStatus');
    if (saveResult && saveResult.ok === true) {
      if (draft.stored) {
        try { if (localStorage.getItem(draft.key) === draft.content) localStorage.removeItem(draft.key); } catch (_) {}
      }
      if (statusEl) statusEl.textContent = 'Uloženo online ✓ · měsíců: ' + String(saveResult.months || 0) + ' · řádků: ' + String(saveResult.entries || 0);
    } else {
      // Fail closed. No auto-reload, new server revision, blind retry or silent success.
      if (statusEl) {
        statusEl.textContent = (draft.stored
          ? 'Online neuloženo. Místní návrh je zachován; neobnovuj rozpis bez zálohy.'
          : 'Online neuloženo a místní zálohu nebylo možné potvrdit! Neobnovuj stránku; exportuj návrh.')
          + ' Serverová data nebyla přepsána potvrzeným uložením.';
        rakShowAdminDraftExport(draft,statusEl);
      }
      if (typeof app !== 'undefined') app.adminRotationDirty = true;
    }
  }`,
 'replace misleading optimistic success and preserve draft');
 write('admin-rotation-editor.js',editor);
}
let replay=read('tools/shift-report-mo-hotfix-170-smoke.mjs');
if(!replay.includes('RAK_17064_TWO_PASS_GUARD')){
 replay=once(replay,
 `// RAK_17063_TWO_PASS_GUARD\nconst already17063=indexSource.includes("var build='${PREVIOUS}';");`,
 `// RAK_17063_TWO_PASS_GUARD\n// RAK_17064_TWO_PASS_GUARD\nconst already17064=indexSource.includes("var build='${BUILD}';");\nconst already17063=already17064||indexSource.includes("var build='${PREVIOUS}';");`,
 '2-pass detection');
 replay=once(replay,`already17063?"var build='${PREVIOUS}';":already17062?`,
 `already17064?"var build='${BUILD}';":already17063?"var build='${PREVIOUS}';":already17062?`,
 '2-pass marker');
 write('tools/shift-report-mo-hotfix-170-smoke.mjs',replay);
}
for(const [p,b,a] of [
 ['supabase-config.js','window.RAK_RELEASE_VERSION = "1.7.63";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['supabase-config.js','window.RAK_TEST_DISPLAY_VERSION = "1.7.63";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`],
 ['supabase-config.js',`window.RAK_PWA_BUILD = "${PREVIOUS}";`,`window.RAK_PWA_BUILD = "${BUILD}";`],
 ['app.js',`const RAK_DEV_UPDATE_BUILD = "${PREVIOUS}";`,`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],
 ['app.js','window.RAK_RELEASE_VERSION = "1.7.63";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['sw.js',"const CACHE_VERSION = 'v1.7.63';",`const CACHE_VERSION = 'v${VERSION}';`],
 ['sw.js',"const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.63';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],
 ['sw.js',`const DEVELOPMENT_BUILD_ID = '${PREVIOUS}';`,`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],
 ['index.html',`var build='${PREVIOUS}';`,`var build='${BUILD}';`]
])write(p,once(read(p),b,a,'version '+p));
assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
for(const file of ['admin-rotation-editor.js','app.js','sw.js','tools/shift-report-mo-hotfix-170-smoke.mjs'])execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
execFileSync(process.execPath,['--test','tools/release-gate-17064.test.mjs'],{stdio:'inherit'});
console.log('[development-version-17064] PASS saved month drafts before network and manual export on failure; no games feature');
