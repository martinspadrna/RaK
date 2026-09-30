#!/usr/bin/env node
// RaK 1.7.65: actual admin save path, persistent private drafts and narrower date fields.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.65', BUILD='v1.7.65-admin-draft-recovery1', PREVIOUS='v1.7.64-conflict-draft1';
const read=p=>fs.readFileSync(p,'utf8'),write=(p,s)=>fs.writeFileSync(p,s,'utf8');
function once(s,b,a,label){if(s.includes(a))return s;assert(s.includes(b),'[17065] missing '+label);assert.equal(s.split(b).length,2,'[17065] ambiguous '+label);return s.replace(b,a);}
let styles=read('styles-inline-legacy.css');
assert(styles.includes('RAK_17062_DATE_AND_IOS_FONT_GUARD'),'prior date baseline missing');
if(!styles.includes('RAK_17065_NARROW_MO_TO_DATE')){
 styles+=`
/* RAK_17065_NARROW_MO_TO_DATE: MO/TO only, 4px smaller than 1.7.62; absence unchanged. */
html body #appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminRotationTable col:first-child {width:84px !important;}
html body #appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminRotationTable input[data-rot-field="date"] {
  box-sizing:border-box !important;width:82px !important;min-width:82px !important;max-width:82px !important;
  font-size:16px !important;padding-left:1px !important;padding-right:1px !important;
}
/* END_RAK_17065_NARROW_MO_TO_DATE */
`;
 write('styles-inline-legacy.css',styles);
}
let editor=read('admin-rotation-editor.js');
assert(editor.includes('RAK_17064_CONFLICT_DRAFT_GUARD'),'1.7.64 draft helper required');
if(!editor.includes('RAK_17065_REAL_ADMIN_SAVE_GUARD')){
 const helpers=`// RAK_17065_RECOVER_DRAFTS_GUARD: read-only enumeration; no automatic server replay,
// no personal names, payload, account IDs or token in HTML. Exports need a user tap.
function rakListPreservedAdminMonthDrafts(monthKey) {
  const prefix='rak_admin_unsynced_month_v1_';
  const found=[];
  try {
    for(let i=0;i<localStorage.length;i++) {
      const key=localStorage.key(i);
      if(typeof key!=='string'||!key.startsWith(prefix)||key.length>180)continue;
      const raw=localStorage.getItem(key);
      if(typeof raw!=='string'||raw.length>2000000)continue;
      let obj;
      try {obj=JSON.parse(raw);}catch(_){continue;}
      if(!obj||obj.format!=='rak-admin-month-draft-v1'||typeof obj.monthKey!=='string'
        ||!obj.month||typeof obj.month!=='object'||Array.isArray(obj.month))continue;
      if(monthKey&&obj.monthKey!==monthKey)continue;
      const date=Date.parse(String(obj.capturedAt||''));
      found.push({key,monthKey:obj.monthKey,at:Number.isFinite(date)?date:0});
    }
  }catch(_){return [];}
  return found.sort((a,b)=>b.at-a.at).slice(0,20);
}

function rakAdminMonthDraftRecoveryHtml(monthKey) {
  const entries=rakListPreservedAdminMonthDrafts(monthKey);
  if(!entries.length)return '';
  return '<div class="appMenuCard" id="rakAdminPreservedDrafts" role="status">'
    +'<b>Neuložené místní návrhy: '+String(entries.length)+'</b>'
    +'<div class="smallText">Mohou pocházet z dřívějšího neúspěšného uložení. Nepřepisuj je naslepo. Stáhni soukromou kopii a porovnej ručně.</div>'
    +entries.map(item=>'<button type="button" class="appMenuAction" data-admin-action="download-unsynced-draft" data-draft-key="'
      +escapeHtml(item.key)+'">Stáhnout návrh '+escapeHtml(item.monthKey)+' · '
      +escapeHtml(item.at?new Date(item.at).toLocaleString('cs-CZ'):'bez data')+'</button>').join('')
    +'</div>';
}

function rakDownloadPreservedAdminMonthDraft(key) {
  if(!app||app.adminUnlocked!==true||typeof key!=='string'
     ||!/^rak_admin_unsynced_month_v1_[A-Za-z0-9_-]{1,80}$/.test(key))return false;
  const valid=rakListPreservedAdminMonthDrafts().some(entry=>entry.key===key);
  if(!valid)return false;
  let raw,obj;
  try{raw=localStorage.getItem(key);obj=JSON.parse(raw);}catch(_){return false;}
  if(!obj||obj.format!=='rak-admin-month-draft-v1'||typeof raw!=='string'||raw.length>2000000)return false;
  if(typeof window.confirm!=='function'||!window.confirm('JSON obsahuje jména a rozpis. Ulož soubor pouze soukromě. Stáhnout?'))return false;
  let url='';
  try {
    const file=new Blob([raw],{type:'application/json;charset=utf-8'});
    url=URL.createObjectURL(file);
    const link=document.createElement('a');link.href=url;
    link.download='RaK_mistni_navrh_'+String(Date.now())+'.json';
    document.body.appendChild(link);link.click();link.remove();
    return true;
  }catch(_){return false;}
  finally{if(url)setTimeout(()=>URL.revokeObjectURL(url),30000);}
}

`;
 editor=once(editor,'async function saveAdminRotationToSupabase(monthKey, rawText) {',helpers+'async function saveAdminRotationToSupabase(monthKey, rawText) {','draft recovery helpers');
 editor=once(editor,
 "    '  <div class=\"adminRotationSaveDock\">',",
 "    rakAdminMonthDraftRecoveryHtml(monthKey),\n    '  <div class=\"adminRotationSaveDock\">',",
 'real editor draft list placement');
 const before=`  let saveResult = null;
  if (app.adminUnlocked) {
    saveResult = await saveRotationToSupabase(normalizedRotation, { source: 'admin-menu', monthKey });
    if (saveResult && saveResult.ok !== false) {`;
 const after=`  // RAK_17065_REAL_ADMIN_SAVE_GUARD: this is the actual button path used by app-menu.js.
  // Refuse a network attempt if durable draft verification failed. Keep older drafts intact.
  const draft = rakPreserveAdminMonthDraft(monthKey, normalized);
  let saveResult = { ok:false, reason: app.adminUnlocked ? 'draft-storage-failed' : 'admin-required' };
  if (app.adminUnlocked && draft.stored) {
    try { saveResult = await saveRotationToSupabase(normalizedRotation, { source: 'admin-menu', monthKey })
      || {ok:false,reason:'no-result'}; }
    catch(_) { saveResult={ok:false,reason:'network-error'}; }
    if (saveResult && saveResult.ok === true && saveResult.queued !== true) {
      try { if(localStorage.getItem(draft.key)===draft.content)localStorage.removeItem(draft.key); }catch(_){}
`;
 editor=once(editor,before,after,'real save entry and verified success');
 editor=once(editor,
 `  if (!saveResult || saveResult.ok === false) {
    if (typeof app !== 'undefined' && app) app.adminRotationDirty = true;
    return { normalized, saveResult: saveResult || { ok: false, reason: 'admin-required' }, ruleCheck, manualOverrideIssues, preservedDraft: true };
  }`,
 `  if (!saveResult || saveResult.ok !== true || saveResult.queued === true) {
    if (typeof app !== 'undefined' && app) app.adminRotationDirty = true;
    return { normalized, saveResult: saveResult || { ok: false, reason: 'no-result' }, ruleCheck,
      manualOverrideIssues, preservedDraft: draft.stored, draft };
  }`,
 'reject uncertain response with usable export');
 write('admin-rotation-editor.js',editor);
}
let menu=read('app-menu.js');
if(!menu.includes('RAK_17065_NO_GAME_PROVISIONING_GUARD')){
 menu=once(menu,
 `          let newProfilesText = appAccounts.length ? (' · účty aplikace: ' + String(appAccounts.length)) : '';
          if (!result.queued && typeof ensureGameAccountsExistForWorkers === 'function') {
            try {
              const ensured = await ensureGameAccountsExistForWorkers(workerSettings.workers);
              const createdCount = ensured.filter((r) => r && r.created).length;
              if (createdCount) newProfilesText = ' · nových herních profilů: ' + createdCount;
            } catch (err) { console.warn('ensureGameAccountsExistForWorkers failed', err); }
          }`,
 `          // RAK_17065_NO_GAME_PROVISIONING_GUARD: saving workers must not create game profiles.
          const newProfilesText = appAccounts.length ? (' · účty aplikace: ' + String(appAccounts.length)) : '';`,
 'remove obsolete game provisioning');
 menu=once(menu,
 `      if (adminAction === 'save-rotation') {`,
 `      if (adminAction === 'download-unsynced-draft') {
        if (typeof rakDownloadPreservedAdminMonthDraft !== 'function'
          || !rakDownloadPreservedAdminMonthDraft(String(target.getAttribute('data-draft-key')||'')))
          throw new Error('Soukromý návrh se nepodařilo stáhnout. Původní data zůstávají beze změny.');
        return;
      }
      if (adminAction === 'save-rotation') {`,
 'manual export action');
 menu=once(menu,
 `        const baseText = saveResult && saveResult.ok === true`,
 `        const baseText = saveResult && saveResult.ok === true && saveResult.queued !== true`,
 'do not label queued/unknown as success');
 menu=once(menu,
 `        if (saveResult && saveResult.ok === true) renderAdminMenuBody(body, currentView);`,
 `        if (saveResult && saveResult.ok === true && saveResult.queued !== true) renderAdminMenuBody(body, currentView);`,
 'do not rerender and discard pending draft on ambiguous queued response');
 menu=once(menu,
 `        if (statusEl) statusEl.textContent = saveResult && saveResult.ok === true
          ? statusText
          : 'Rozpis se nepodařilo uložit online. Rozepsané změny zůstaly v editoru.';
        return;`,
 `        if (statusEl) statusEl.textContent = saveResult && saveResult.ok === true && saveResult.queued !== true
          ? statusText
          : ((saveResult && saveResult.reason === 'draft-storage-failed')
              ? 'Uložení zastaveno: nelze ověřit místní zálohu. Neobnovuj stránku; stáhni návrh.'
              : 'Rozpis se nepodařilo potvrdit online. Návrh zůstal zachován; neobnovuj bez zálohy.');
        if (!(saveResult && saveResult.ok === true && saveResult.queued !== true)
          && result && result.draft && typeof rakShowAdminDraftExport === 'function') {
          rakShowAdminDraftExport(result.draft,statusEl||document.getElementById('adminRotationDraftStatus'));
        }
        return;`,
 'real user-facing failure status and export');
 write('app-menu.js',menu);
}
let browser=read('tools/browser-absence-layout-17061.mjs');
if(!browser.includes('RAK_17065_COMPAT_WIDTH_GUARD')){
 browser=once(browser,
 `  assert(data.rotDate.width>=85&&data.rotCell>=87,'[17061-browser] editable hard/soft date too narrow');`,
 `  // RAK_17065_COMPAT_WIDTH_GUARD: old build 86px; 1.7.65 narrows only MO/TO to 82px.
  const narrow=fs.readFileSync(path.join(ROOT,'index.html'),'utf8').includes('v1.7.65-admin-draft-recovery1');
  if(narrow) assert(data.rotDate.width>=81&&data.rotDate.width<=83&&data.rotCell>=83,'[17065-browser] MO/TO date width regression');
  else assert(data.rotDate.width>=85&&data.rotCell>=87,'[17061-browser] editable hard/soft date too narrow');`,
 'two build geometry compatibility');
 browser=once(browser,
 `  console.log('[17061-browser] PASS real Chromium CSS: public/admin 58px date + 68px names; editable 86/84px date fits shift, iOS 16px font, no overlap');`,
 `  console.log('[17061-browser] PASS Chromium: public/admin absence 58px date + 68px names; MO/TO '+String(data.rotDate.width)+'px, absence '+String(data.absDate.width)+'px; full date+shift at 16px, no overlap');`,
 'truthful geometry report');
 write('tools/browser-absence-layout-17061.mjs',browser);
}
// Historical contracts are pinned to the historical release record; this stage must not
// inspect or modify the evolving RAK_HANDOFF.md. Current plan validation runs independently in CI.
// RAK_17065_LIVE_PLAN_IMMUTABLE
const historical=read('RAK_PLAN_17065_STATUS.md');
assert.equal([...historical.matchAll(/^\| (P[012]\.\d)(?:\s|\|)/gm)].length,13,'[17065] expected exactly 13 historical plan items');
assert(!historical.includes('game-session CAS'),'[17065] obsolete game requirement in historical release record');
assert(historical.includes('Hry')||historical.includes('herní'),'[17065] historical game scope must remain documented');
let replay=read('tools/shift-report-mo-hotfix-170-smoke.mjs');
if(!replay.includes('RAK_17065_TWO_PASS_GUARD')){
 replay=once(replay,
 `// RAK_17064_TWO_PASS_GUARD\nconst already17064=indexSource.includes("var build='${PREVIOUS}';");`,
 `// RAK_17064_TWO_PASS_GUARD\n// RAK_17065_TWO_PASS_GUARD\nconst already17065=indexSource.includes("var build='${BUILD}';");\nconst already17064=already17065||indexSource.includes("var build='${PREVIOUS}';");`,
 '2-pass detection');
 replay=once(replay,`already17064?"var build='${PREVIOUS}';":already17063?`,
 `already17065?"var build='${BUILD}';":already17064?"var build='${PREVIOUS}';":already17063?`,
 '2-pass marker');
 write('tools/shift-report-mo-hotfix-170-smoke.mjs',replay);
}
for(const [p,b,a] of [
 ['supabase-config.js','window.RAK_RELEASE_VERSION = "1.7.64";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['supabase-config.js','window.RAK_TEST_DISPLAY_VERSION = "1.7.64";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`],
 ['supabase-config.js',`window.RAK_PWA_BUILD = "${PREVIOUS}";`,`window.RAK_PWA_BUILD = "${BUILD}";`],
 ['app.js',`const RAK_DEV_UPDATE_BUILD = "${PREVIOUS}";`,`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],
 ['app.js','window.RAK_RELEASE_VERSION = "1.7.64";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['sw.js',"const CACHE_VERSION = 'v1.7.64';",`const CACHE_VERSION = 'v${VERSION}';`],
 ['sw.js',"const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.64';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],
 ['sw.js',`const DEVELOPMENT_BUILD_ID = '${PREVIOUS}';`,`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],
 ['index.html',`var build='${PREVIOUS}';`,`var build='${BUILD}';`]
])write(p,once(read(p),b,a,'version '+p));
assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
for(const file of ['admin-rotation-editor.js','app-menu.js','app.js','sw.js','tools/shift-report-mo-hotfix-170-smoke.mjs','tools/browser-absence-layout-17061.mjs'])execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
execFileSync(process.execPath,['--test','tools/release-gate-17065.test.mjs'],{stdio:'inherit'});
console.log('[development-version-17065] PASS real admin save, persistent manual drafts, no game provisioning, narrower MO/TO dates');