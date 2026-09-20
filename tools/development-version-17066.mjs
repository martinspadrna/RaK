#!/usr/bin/env node
// RaK 1.7.66: measured MO grid + verified recovery before any dirty editor navigation.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.66',BUILD='v1.7.66-softgrid-draftguard1',PREVIOUS='v1.7.65-admin-draft-recovery1';
const read=p=>fs.readFileSync(p,'utf8'),write=(p,s)=>fs.writeFileSync(p,s,'utf8');
function once(s,b,a,label){if(s.includes(a))return s;assert(s.includes(b),'[17066] missing '+label);assert.equal(s.split(b).length,2,'[17066] ambiguous '+label);return s.replace(b,a);}
let editor=read('admin-rotation-editor.js');
assert(editor.includes('RAK_17065_REAL_ADMIN_SAVE_GUARD'),'1.7.65 verified save missing');
if(!editor.includes('RAK_17066_SOFT_GRID_MARKUP')){
 editor=once(editor,
  `    '      <table class="appMenuTable appMenuAdminTable appMenuAdminTableDense appMenuAdminRotationTable" data-daymod-section="soft">',`,
  `    // RAK_17066_SOFT_GRID_MARKUP: date + compact machine columns, no wasted space.\n    '      <table class="appMenuTable appMenuAdminTable appMenuAdminTableDense appMenuAdminRotationTable" data-daymod-section="soft" style="--rak-soft-grid-width:' + String(84 + softMachines.length * 48) + 'px;">',`,
  'actual MO table');
 const guard=`// RAK_17066_DIRTY_NAVIGATION_GUARD: verified local draft before rerender or online reload.
// No server replay, no logging of personal content. Cancellation keeps editor intact.
function rakGuardAdminRotationDiscard() {
  if (typeof app==='undefined' || !app || app.adminRotationDirty!==true ||
      typeof document==='undefined' || !document.getElementById('adminRotationEditor')) return true;
  if (app.adminUnlocked!==true || typeof rakPreserveAdminMonthDraft!=='function' ||
      typeof readAdminRotationFromDom!=='function') return false;
  const key=String(app.selectedMonth || (typeof getAdminSelectedMonthKey==='function' ? getAdminSelectedMonthKey() : '') || '').trim();
  if(!key) return false;
  let draft;
  try {draft=rakPreserveAdminMonthDraft(key,readAdminRotationFromDom(key));}
  catch (_) {return false;}
  if(!draft || !draft.stored) {
    const status=document.getElementById('adminRotationDraftStatus');
    if(status) status.textContent='Přepnutí zastaveno: místní zálohu nelze ověřit. Zůstaň v editoru a stáhni návrh.';
    if(draft && draft.content && typeof rakShowAdminDraftExport==='function') rakShowAdminDraftExport(draft,status);
    return false;
  }
  if(typeof window==='undefined' || typeof window.confirm!=='function' ||
     !window.confirm('Rozpis není uložený online. Soukromý místní návrh byl zálohován. Přepnout a ponechat tento návrh k ruční obnově?')) return false;
  app.adminRotationDirty=false;
  return true;
}

`;
 editor=once(editor,'function adminRotationFindShiftForAbsenceDate(month, rawDate) {',guard+'function adminRotationFindShiftForAbsenceDate(month, rawDate) {','shared dirty guard');
 write('admin-rotation-editor.js',editor);
}
let menu=read('app-menu.js');
if(!menu.includes('RAK_17066_MENU_NAVIGATION_GUARD')){
 // In ordinary menus the lazy admin editor may not be loaded: never block navigation just because the helper is absent.
 const check="if(typeof rakGuardAdminRotationDiscard==='function' && !rakGuardAdminRotationDiscard()) return;";
 menu=once(menu,`      if (menuBack) {\n        openAppMenu('menu');`,
 `      if (menuBack) {\n        // RAK_17066_MENU_NAVIGATION_GUARD\n        ${check}\n        openAppMenu('menu');`,'menu back');
 menu=once(menu,`      if (adminYearKey) {\n        const parsedYear = parseInt(adminYearKey, 10);`,
 `      if (adminYearKey) {\n        // RAK_17066_YEAR_SWITCH_GUARD: snapshot before replacing DOM.\n        ${check}\n        const parsedYear = parseInt(adminYearKey, 10);`,'year switch');
 menu=once(menu,`      if (adminMonthKey) {\n        if (select) select.value = adminMonthKey;`,
 `      if (adminMonthKey) {\n        // RAK_17066_MONTH_SWITCH_GUARD: snapshot before mutating selection.\n        ${check}\n        if (select) select.value = adminMonthKey;`,'month switch');
 menu=once(menu,`      if (adminAction === 'back-admin') {\n        openAppMenu('admin');`,
 `      if (adminAction === 'back-admin') {\n        ${check}\n        openAppMenu('admin');`,'admin back');
 write('app-menu.js',menu);
}
let rotation=read('admin-rotation.js');
if(!rotation.includes('RAK_17066_RELOAD_GUARD')){
 rotation=once(rotation,`      if (!confirm('V editoru jsou neuložené změny. Opravdu je zahodit a načíst online stav?')) return null;`,
 `      // RAK_17066_RELOAD_GUARD: confirm alone lost edits; preserve BEFORE discarding.\n      if(typeof rakGuardAdminRotationDiscard!=='function' || !rakGuardAdminRotationDiscard()) return null;`,
 'online reload guard');
 write('admin-rotation.js',rotation);
}
let styles=read('styles-inline-legacy.css');
assert(styles.includes('RAK_17065_NARROW_MO_TO_DATE'),'1.7.65 date baseline missing');
if(!styles.includes('RAK_17066_COMPACT_MO_GRID')){
 styles+=`
/* RAK_17066_COMPACT_MO_GRID: iPhone name-spacing correction; TO and absence untouched. */
html body #appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminRotationTable[data-daymod-section="soft"] {
  box-sizing:border-box !important;width:var(--rak-soft-grid-width) !important;
  min-width:var(--rak-soft-grid-width) !important;max-width:var(--rak-soft-grid-width) !important;
  table-layout:fixed !important;border-collapse:separate !important;border-spacing:0 !important;
}
html body #appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminRotationTable[data-daymod-section="soft"] col:first-child {width:84px !important;}
html body #appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminRotationTable[data-daymod-section="soft"] col:not(:first-child) {width:48px !important;}
html body #appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminRotationTable[data-daymod-section="soft"] th,
html body #appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminRotationTable[data-daymod-section="soft"] td {
  box-sizing:border-box !important;width:auto !important;min-width:0 !important;max-width:none !important;padding:0 !important;
}
html body #appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminRotationTable[data-daymod-section="soft"] td .appMenuInlineFieldWrap {
  box-sizing:border-box !important;min-width:0 !important;max-width:100% !important;width:100% !important;
  gap:0 !important;padding:0 !important;margin:0 !important;
}
html body #appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminRotationTable[data-daymod-section="soft"] input[data-rot-field^="cell-"] {
  box-sizing:border-box !important;flex:0 0 46px !important;width:46px !important;min-width:46px !important;max-width:46px !important;
  margin:0 !important;padding-left:1px !important;padding-right:1px !important;
}
/* END_RAK_17066_COMPACT_MO_GRID */
`;
 write('styles-inline-legacy.css',styles);
}
let browser=read('tools/browser-absence-layout-17061.mjs');
if(!browser.includes('RAK_17066_BROWSER_DATE_COMPAT')){
 browser=once(browser,
 `  const narrow=fs.readFileSync(path.join(ROOT,'index.html'),'utf8').includes('v1.7.65-admin-draft-recovery1');`,
 `  // RAK_17066_BROWSER_DATE_COMPAT: both versions use an 82px MO/TO date.\n  const narrow=fs.readFileSync(path.join(ROOT,'index.html'),'utf8').includes('v1.7.65-admin-draft-recovery1') || fs.readFileSync(path.join(ROOT,'index.html'),'utf8').includes('${BUILD}');`,
 'old Chromium 82px gate');
 write('tools/browser-absence-layout-17061.mjs',browser);
}
let replay=read('tools/shift-report-mo-hotfix-170-smoke.mjs');
if(!replay.includes('RAK_17066_TWO_PASS_GUARD')){
 replay=once(replay,
 `// RAK_17065_TWO_PASS_GUARD\nconst already17065=indexSource.includes("var build='${PREVIOUS}';");`,
 `// RAK_17065_TWO_PASS_GUARD\n// RAK_17066_TWO_PASS_GUARD\nconst already17066=indexSource.includes("var build='${BUILD}';");\nconst already17065=already17066||indexSource.includes("var build='${PREVIOUS}';");`,
 'second build marker');
 replay=once(replay,`already17065?"var build='${PREVIOUS}';":already17064?`,
 `already17066?"var build='${BUILD}';":already17065?"var build='${PREVIOUS}';":already17064?`,
 'second build index restore');
 write('tools/shift-report-mo-hotfix-170-smoke.mjs',replay);
}
for(const [p,b,a] of [
 ['supabase-config.js','window.RAK_RELEASE_VERSION = "1.7.65";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['supabase-config.js','window.RAK_TEST_DISPLAY_VERSION = "1.7.65";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`],
 ['supabase-config.js',`window.RAK_PWA_BUILD = "${PREVIOUS}";`,`window.RAK_PWA_BUILD = "${BUILD}";`],
 ['app.js',`const RAK_DEV_UPDATE_BUILD = "${PREVIOUS}";`,`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],
 ['app.js','window.RAK_RELEASE_VERSION = "1.7.65";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['sw.js',"const CACHE_VERSION = 'v1.7.65';",`const CACHE_VERSION = 'v${VERSION}';`],
 ['sw.js',"const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.65';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],
 ['sw.js',`const DEVELOPMENT_BUILD_ID = '${PREVIOUS}';`,`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],
 ['index.html',`var build='${PREVIOUS}';`,`var build='${BUILD}';`]
])write(p,once(read(p),b,a,'release '+p));
assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'),'TEST only');
for(const p of ['admin-rotation-editor.js','admin-rotation.js','app-menu.js','tools/shift-report-mo-hotfix-170-smoke.mjs','tools/browser-absence-layout-17061.mjs','app.js','sw.js'])execFileSync(process.execPath,['--check',p],{stdio:'pipe'});
execFileSync(process.execPath,['--test','tools/release-gate-17066.test.mjs'],{stdio:'inherit'});
console.log('[development-version-17066] PASS compact MO, protected month/year/menu/online reload, TEST PWA');