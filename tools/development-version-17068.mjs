#!/usr/bin/env node
// RaK 1.7.68: never apply stale online responses over a newly edited administrator draft.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const OLD='1.7.67', VERSION='1.7.68';
const PREVIOUS='v1.7.67-equalgrid-reload1', BUILD='v1.7.68-async-draft-guard1';
const read=p=>fs.readFileSync(p,'utf8'), write=(p,s)=>fs.writeFileSync(p,s,'utf8');
function once(s,b,a,label){if(s.includes(a))return s;assert(s.includes(b),'[17068] missing '+label);assert.equal(s.split(b).length,2,'[17068] ambiguous '+label);return s.replace(b,a);}
let sync=read('app-rotation-sync.js');
assert(sync.includes('RAK_17067_SKIP_CACHE_ON_FORCE'),'previous cache guard missing');
if(!sync.includes('RAK_17068_SYNC_EPOCH')){
 sync=once(sync,'async function syncRotationFromSupabase(force) {',`// RAK_17068_SYNC_EPOCH: a newer request invalidates every older response.
let rakRotationSyncEpoch=0;
// Ephemeral fingerprint: never saved, transmitted, logged or exported.
function rakRotationEditorFingerprint(editor){
  if(!editor || typeof editor.querySelectorAll!=='function') return null;
  try {
    return JSON.stringify(Array.from(editor.querySelectorAll('input,textarea,select'),field=>
      [field.tagName,field.name,field.value,!!field.checked]));
  } catch(_){return null;}
}
async function syncRotationFromSupabase(force) {`,'insert race helper');
 sync=once(sync,
 `  if (force !== 'discard-draft' && typeof app !== 'undefined' && app && app.adminRotationDirty === true && document.getElementById('adminRotationEditor')) return null;
  try {`,
 `  if (force !== 'discard-draft' && typeof app !== 'undefined' && app && app.adminRotationDirty === true && document.getElementById('adminRotationEditor')) return null;
  // RAK_17068_REQUEST_SNAPSHOT: capture the editor AFTER explicit discard consent and BEFORE network awaits.
  const requestId=++rakRotationSyncEpoch;
  const editor=typeof document==='undefined'?null:document.getElementById('adminRotationEditor');
  const fingerprint=editor?rakRotationEditorFingerprint(editor):null;
  if(editor && fingerprint===null) return null;
  try {`,
 'snapshot before network');
 sync=once(sync,
 `    if (!remote || !remote.payload) return null;
    return applyRakRotationState(remote.payload, { force: !!force });`,
 `    if (!remote || !remote.payload) return null;
    // RAK_17068_FINAL_DRAFT_BARRIER: never overwrite edits made during the request.
    if (requestId!==rakRotationSyncEpoch) return null;
    const currentEditor=typeof document==='undefined'?null:document.getElementById('adminRotationEditor');
    if (editor) {
      if (currentEditor!==editor) return null;
      const latest=rakRotationEditorFingerprint(editor);
      if (latest===null || latest!==fingerprint || (typeof app!=='undefined' && app && app.adminRotationDirty===true)) {
        if (typeof app!=='undefined' && app && latest!==fingerprint) app.adminRotationDirty=true;
        return null;
      }
    } else if (currentEditor && typeof app!=='undefined' && app && app.adminRotationDirty===true) return null;
    return applyRakRotationState(remote.payload, { force: !!force });`,
 'barrier before application');
 write('app-rotation-sync.js',sync);
}
let rotation=read('admin-rotation.js');
if(!rotation.includes('RAK_17068_LATE_EDIT_NOTICE')){
 rotation=once(rotation,
 `    if (!result && hadDirty) {
      app.adminRotationDirty = true;
      const status = document.getElementById('adminRotationDraftStatus');
      if (status) status.textContent = 'Online načtení selhalo. Rozepsané změny zůstávají v editoru a záloha je uchována.';`,
 `    // RAK_17068_LATE_EDIT_NOTICE: also retain edits created while online loading was in flight.
    if (!result && (hadDirty || (typeof app!=='undefined' && app && app.adminRotationDirty===true))) {
      app.adminRotationDirty = true;
      const status = document.getElementById('adminRotationDraftStatus');
      if (status) status.textContent = hadDirty
        ? 'Online načtení nebylo použito. Původní změny zůstávají v editoru a místní záloze.'
        : 'Online načtení nebylo použito. Nové úpravy zůstávají v editoru. Uložte si místní návrh.';`,
 'notice for late edits');
 write('admin-rotation.js',rotation);
}
let replay=read('tools/shift-report-mo-hotfix-170-smoke.mjs');
if(!replay.includes('RAK_17068_TWO_PASS_GUARD')){
 replay=once(replay,
 `// RAK_17067_TWO_PASS_GUARD
const already17067=indexSource.includes("var build='${PREVIOUS}';");`,
 `// RAK_17067_TWO_PASS_GUARD
// RAK_17068_TWO_PASS_GUARD
const already17068=indexSource.includes("var build='${BUILD}';");
const already17067=already17068||indexSource.includes("var build='${PREVIOUS}';");`,
 'second build detection');
 replay=once(replay,
 `already17067?"var build='${PREVIOUS}';":already17066?`,
 `already17068?"var build='${BUILD}';":already17067?"var build='${PREVIOUS}';":already17066?`,
 'second build restoration');
 write('tools/shift-report-mo-hotfix-170-smoke.mjs',replay);
}
let gate=read('tools/release-gate-17067.test.mjs');
if(!gate.includes('RAK_17068_HISTORICAL_GATE_COMPAT')){
 gate=once(gate,
 `const BUILD='${PREVIOUS}';`,
 `// RAK_17068_HISTORICAL_GATE_COMPAT: test 1.7.67 before bump, same assertions for 1.7.68 afterwards.
const upgraded=read('index.html').includes("var build='${BUILD}';");
const BUILD=upgraded?'${BUILD}':'${PREVIOUS}';
const DISPLAY=upgraded?'${VERSION}':'${OLD}';`,
 'historical gate build');
 gate=once(gate,`'window.RAK_RELEASE_VERSION = "${OLD}";'`,`\`window.RAK_RELEASE_VERSION = "\${DISPLAY}";\``,'historical config version');
 gate=once(gate,`"const CACHE_VERSION = 'v${OLD}';"`,`\`const CACHE_VERSION = 'v\${DISPLAY}';\``,'historical cache version');
 write('tools/release-gate-17067.test.mjs',gate);
}
let browser=read('tools/browser-equal-grid-17067.mjs');
if(!browser.includes('RAK_17068_EQUALGRID_COMPAT')){
 browser=once(browser,
 `assert(fs.readFileSync('index.html','utf8').includes('${PREVIOUS}'),'built 1.7.67 required');`,
 `// RAK_17068_EQUALGRID_COMPAT: same physical geometry required for the successor.
assert(['${PREVIOUS}','${BUILD}'].some(id=>fs.readFileSync('index.html','utf8').includes(id)),'built equal-grid release required');`,
 'real Chromium geometry');
 write('tools/browser-equal-grid-17067.mjs',browser);
}
let soft=read('tools/browser-soft-grid-17066.mjs');
if(!soft.includes('RAK_17068_SOFTGRID_COMPAT')){
 soft=once(soft,
 `const is67=fs.readFileSync('index.html','utf8').includes('${PREVIOUS}');`,
 `// RAK_17068_SOFTGRID_COMPAT: successor keeps the same 344px grid.
const is67=['${PREVIOUS}','${BUILD}'].some(id=>fs.readFileSync('index.html','utf8').includes(id));`,
 'historical MO geometry');
 write('tools/browser-soft-grid-17066.mjs',soft);
}
let absence=read('tools/browser-absence-layout-17061.mjs');
if(!absence.includes('RAK_17068_ABSENCE_COMPAT')){
 absence=once(absence,
 ` || fs.readFileSync(path.join(ROOT,'index.html'),'utf8').includes('${PREVIOUS}');`,
 ` || fs.readFileSync(path.join(ROOT,'index.html'),'utf8').includes('${PREVIOUS}') /* RAK_17068_ABSENCE_COMPAT */ || fs.readFileSync(path.join(ROOT,'index.html'),'utf8').includes('${BUILD}');`,
 'historical unchanged absence width');
 write('tools/browser-absence-layout-17061.mjs',absence);
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
]) write(p,once(read(p),b,a,'release '+p));
assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'),'TEST only');
for(const p of ['app-rotation-sync.js','admin-rotation.js','tools/shift-report-mo-hotfix-170-smoke.mjs','tools/release-gate-17067.test.mjs','tools/browser-equal-grid-17067.mjs','tools/browser-soft-grid-17066.mjs','tools/browser-absence-layout-17061.mjs','app.js','sw.js'])execFileSync(process.execPath,['--check',p],{stdio:'pipe'});
execFileSync(process.execPath,['--test','tools/release-gate-17068.test.mjs'],{stdio:'inherit'});
console.log('[development-version-17068] PASS race-safe online reload; older network responses cannot overwrite new draft');
