#!/usr/bin/env node
// RaK 1.7.67 – identical TO/MO editing grids and failure-safe online reload.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.67',BUILD='v1.7.67-equalgrid-reload1',PREVIOUS='v1.7.66-softgrid-draftguard1';
const read=p=>fs.readFileSync(p,'utf8'),write=(p,s)=>fs.writeFileSync(p,s,'utf8');
function once(s,b,a,label){if(s.includes(a))return s;assert(s.includes(b),'[17067] missing '+label);assert.equal(s.split(b).length,2,'[17067] ambiguous '+label);return s.replace(b,a);}
let editor=read('admin-rotation-editor.js');
assert(editor.includes('RAK_17066_DIRTY_NAVIGATION_GUARD'),'previous save guard missing');
if(!editor.includes('RAK_17067_EQUAL_GRID_MARKUP')){
 editor=once(editor,
 `    '      <table class="appMenuTable appMenuAdminTable appMenuAdminTableDense appMenuAdminRotationTable" data-daymod-section="hard">',`,
 `    // RAK_17067_EQUAL_GRID_MARKUP: identical 84px dates / 52px names for BOTH sections.\n    '      <table class="appMenuTable appMenuAdminTable appMenuAdminTableDense appMenuAdminRotationTable" data-daymod-section="hard" style="--rak-grid-width:' + String(84 + hardMachines.length * 52) + 'px;">',`,
 'TO table layout');
 editor=once(editor,
 `    '      <table class="appMenuTable appMenuAdminTable appMenuAdminTableDense appMenuAdminRotationTable" data-daymod-section="soft" style="--rak-soft-grid-width:' + String(84 + softMachines.length * 48) + 'px;">',`,
 `    '      <table class="appMenuTable appMenuAdminTable appMenuAdminTableDense appMenuAdminRotationTable" data-daymod-section="soft" style="--rak-grid-width:' + String(84 + softMachines.length * 52) + 'px;">',`,
 'MO table layout');
 write('admin-rotation-editor.js',editor);
}
let css=read('styles-inline-legacy.css');
assert(css.includes('RAK_17066_COMPACT_MO_GRID'),'prior MO layout missing');
if(!css.includes('RAK_17067_EQUAL_MO_TO_GRID')){
 css+=`
/* RAK_17067_EQUAL_MO_TO_GRID – identical effective box sizes in both admin tables.
   84+5*52=344px: inside 350px phone wrapper. No changes to Absence. */
html body #appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminRotationTable[data-daymod-section] {
  box-sizing:border-box !important;width:var(--rak-grid-width) !important;
  min-width:var(--rak-grid-width) !important;max-width:var(--rak-grid-width) !important;
  table-layout:fixed !important;border-collapse:separate !important;border-spacing:0 !important;
}
html body #appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminRotationTable[data-daymod-section] col:first-child {width:84px !important;}
html body #appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminRotationTable[data-daymod-section] col:not(:first-child) {width:52px !important;}
html body #appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminRotationTable[data-daymod-section] th,
html body #appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminRotationTable[data-daymod-section] td {
  box-sizing:border-box !important;width:auto !important;min-width:0 !important;max-width:none !important;padding:0 !important;
}
html body #appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminRotationTable[data-daymod-section] td .appMenuInlineFieldWrap {
  box-sizing:border-box !important;min-width:0 !important;max-width:100% !important;width:100% !important;
  gap:0 !important;padding:0 !important;margin:0 !important;
}
html body #appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminRotationTable[data-daymod-section] input[data-rot-field^="cell-"] {
  box-sizing:border-box !important;flex:0 0 50px !important;width:50px !important;min-width:50px !important;
  max-width:50px !important;margin:0 !important;padding-left:1px !important;padding-right:1px !important;
}
/* END_RAK_17067_EQUAL_MO_TO_GRID */
`;
 write('styles-inline-legacy.css',css);
}
let sync=read('app-rotation-sync.js');
if(!sync.includes('RAK_17067_SKIP_CACHE_ON_FORCE')){
 sync=once(sync,
 `    if (typeof bridge.loadCachedRotationState === 'function') {\n      const cached = bridge.loadCachedRotationState();`,
 `    // RAK_17067_SKIP_CACHE_ON_FORCE: manual online reload MUST NOT replace a draft with stale offline cache.\n    if (force !== 'discard-draft' && typeof bridge.loadCachedRotationState === 'function') {\n      const cached = bridge.loadCachedRotationState();`,
 'do not apply cache on forced online reload');
 write('app-rotation-sync.js',sync);
}
let rotation=read('admin-rotation.js');
if(!rotation.includes('RAK_17067_RESTORE_DIRTY_ON_FAILURE')){
 rotation=once(rotation,
 `  if (typeof syncRotationFromSupabase === 'function') {\n    if (typeof app !== 'undefined' && app && app.adminRotationDirty === true && document.getElementById('adminRotationEditor')) {`,
 `  if (typeof syncRotationFromSupabase === 'function') {\n    // RAK_17067_RESTORE_DIRTY_ON_FAILURE: guard clears the flag only after user consent.\n    const hadDirty = typeof app !== 'undefined' && app && app.adminRotationDirty === true && !!document.getElementById('adminRotationEditor');\n    if (hadDirty) {`,
 'remember dirty status');
 rotation=once(rotation,
 `    return syncRotationFromSupabase('discard-draft');\n  }\n  return null;`,
 `    let result = null;\n    try { result = await syncRotationFromSupabase('discard-draft'); } catch (_) { result = null; }\n    if (!result && hadDirty) {\n      app.adminRotationDirty = true;\n      const status = document.getElementById('adminRotationDraftStatus');\n      if (status) status.textContent = 'Online načtení selhalo. Rozepsané změny zůstávají v editoru a záloha je uchována.';\n    }\n    return result;\n  }\n  return null;`,
 'restore dirty on unsuccessful reload');
 write('admin-rotation.js',rotation);
}
let menu=read('app-menu.js');
if(!menu.includes('RAK_17067_ONLINE_RELOAD_RERENDER_GUARD')){
 menu=once(menu,
 `      if (adminAction === 'load-online') {\n        await loadAdminRotationFromSupabase();\n        renderAdminMenuBody(body, currentView);`,
 `      if (adminAction === 'load-online') {\n        // RAK_17067_ONLINE_RELOAD_RERENDER_GUARD: canceled or failed read never destroys the DOM draft.\n        const loaded = await loadAdminRotationFromSupabase();\n        if (!loaded) return;\n        renderAdminMenuBody(body, currentView);`,
 'protect actual Reload online button');
 menu=once(menu,
 `function openAppMenu(view) {\n  const page = ensureAppMenuOverlay();`,
 `function openAppMenu(view) {\n  // RAK_17067_CENTRAL_MENU_DRAFT_GUARD: protect other navigation paths, too.\n  const currentBody = typeof document !== 'undefined' ? document.getElementById('appMenuBody') : null;\n  if (currentBody && currentBody.dataset.adminView === 'rotation' && typeof app !== 'undefined' && app && app.adminRotationDirty === true) {\n    if (typeof rakGuardAdminRotationDiscard !== 'function' || !rakGuardAdminRotationDiscard()) return false;\n  }\n  const page = ensureAppMenuOverlay();`,
 'central menu navigation');
 write('app-menu.js',menu);
}
let replay=read('tools/shift-report-mo-hotfix-170-smoke.mjs');
if(!replay.includes('RAK_17067_TWO_PASS_GUARD')){
 replay=once(replay,
 `// RAK_17066_TWO_PASS_GUARD\nconst already17066=indexSource.includes("var build='${PREVIOUS}';");`,
 `// RAK_17066_TWO_PASS_GUARD\n// RAK_17067_TWO_PASS_GUARD\nconst already17067=indexSource.includes("var build='${BUILD}';");\nconst already17066=already17067||indexSource.includes("var build='${PREVIOUS}';");`,
 'second build detection');
 replay=once(replay,
 `already17066?"var build='${PREVIOUS}';":already17065?`,
 `already17067?"var build='${BUILD}';":already17066?"var build='${PREVIOUS}';":already17065?`,
 'second build marker');
 write('tools/shift-report-mo-hotfix-170-smoke.mjs',replay);
}
let absence=read('tools/browser-absence-layout-17061.mjs');
if(!absence.includes('RAK_17067_BROWSER_DATE_COMPAT')){
 absence=once(absence,
 `  const narrow=fs.readFileSync(path.join(ROOT,'index.html'),'utf8').includes('v1.7.65-admin-draft-recovery1') || fs.readFileSync(path.join(ROOT,'index.html'),'utf8').includes('${PREVIOUS}');`,
 `  // RAK_17067_BROWSER_DATE_COMPAT\n  const narrow=fs.readFileSync(path.join(ROOT,'index.html'),'utf8').includes('v1.7.65-admin-draft-recovery1') || fs.readFileSync(path.join(ROOT,'index.html'),'utf8').includes('${PREVIOUS}') || fs.readFileSync(path.join(ROOT,'index.html'),'utf8').includes('${BUILD}');`,
 'historical date browser compatibility');
 write('tools/browser-absence-layout-17061.mjs',absence);
}
let oldBrowser=read('tools/browser-soft-grid-17066.mjs');
if(!oldBrowser.includes('RAK_17067_OLD_BROWSER_COMPAT')){
 oldBrowser=once(oldBrowser,
 `assert(fs.readFileSync('index.html','utf8').includes('${PREVIOUS}'),'built version required');`,
 `// RAK_17067_OLD_BROWSER_COMPAT: historical physical probe remains mandatory.\nconst is67=fs.readFileSync('index.html','utf8').includes('${BUILD}');\nassert(is67||fs.readFileSync('index.html','utf8').includes('${PREVIOUS}'),'built version required');`,
 'old Chromium version check');
 oldBrowser=once(oldBrowser,
 `style="--rak-soft-grid-width:'+String(84+machines.length*48)+'px;">'`,
 `style="--rak-'+(is67?'grid':'soft-grid')+'-width:'+String(84+machines.length*(is67?52:48))+'px;">'`,
 'old Chromium synthetic MO markup');
 oldBrowser=once(oldBrowser,`Math.abs(data.table-324)<=2`,`Math.abs(data.table-(is67?344:324))<=2`,'old browser table width');
 oldBrowser=once(oldBrowser,`n>=46&&n<=50`,`n>=(is67?50:46)&&n<=(is67?54:50)`,'old browser cells');
 oldBrowser=once(oldBrowser,`n>=45&&n<=47`,`n>=(is67?49:45)&&n<=(is67?51:47)`,'old browser inputs');
 oldBrowser=once(oldBrowser,`324px table, <=4px gaps`,`'+String(data.table)+'px table, <=4px gaps`,'old browser report');
 write('tools/browser-soft-grid-17066.mjs',oldBrowser);
}
for(const [p,b,a] of [
 ['supabase-config.js','window.RAK_RELEASE_VERSION = "1.7.66";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['supabase-config.js','window.RAK_TEST_DISPLAY_VERSION = "1.7.66";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`],
 ['supabase-config.js',`window.RAK_PWA_BUILD = "${PREVIOUS}";`,`window.RAK_PWA_BUILD = "${BUILD}";`],
 ['app.js',`const RAK_DEV_UPDATE_BUILD = "${PREVIOUS}";`,`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],
 ['app.js','window.RAK_RELEASE_VERSION = "1.7.66";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['sw.js',"const CACHE_VERSION = 'v1.7.66';",`const CACHE_VERSION = 'v${VERSION}';`],
 ['sw.js',"const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.66';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],
 ['sw.js',`const DEVELOPMENT_BUILD_ID = '${PREVIOUS}';`,`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],
 ['index.html',`var build='${PREVIOUS}';`,`var build='${BUILD}';`]
])write(p,once(read(p),b,a,'release '+p));
assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'),'TEST only');
for(const p of ['admin-rotation-editor.js','admin-rotation.js','app-rotation-sync.js','app-menu.js','tools/shift-report-mo-hotfix-170-smoke.mjs','tools/browser-absence-layout-17061.mjs','tools/browser-soft-grid-17066.mjs','app.js','sw.js'])execFileSync(process.execPath,['--check',p],{stdio:'pipe'});
execFileSync(process.execPath,['--test','tools/release-gate-17067.test.mjs'],{stdio:'inherit'});
console.log('[development-version-17067] PASS MO/TO equal grids, fail-closed online loading, verified revision preserved');