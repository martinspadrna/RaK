#!/usr/bin/env node
// RaK 1.7.61 — coordinated public/admin absence layout and readable date+shift inputs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.61', BUILD='v1.7.61-absencelayout1', PREVIOUS='v1.7.60-queuedurability1';
const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>fs.writeFileSync(p,s,'utf8');
function once(source,before,after,label){
  if(source.includes(after))return source;
  assert(source.includes(before),'[17061] missing '+label);
  assert.equal(source.split(before).length,2,'[17061] duplicate '+label);
  return source.replace(before,after);
}
const widthMarkup = `    const absenceColgroup = "<colgroup><col style='width:58px'><col style='width:34px'>" +
      Array.from({length:maxPairs}, (_, idx) => (idx ? "<col style='width:7px'>" : '') +
        "<col style='width:68px'><col style='width:38px'>").join('') + "</colgroup>";
    const absenceWidth = 58 + 34 + maxPairs * (68 + 38) + Math.max(0, maxPairs - 1) * 7;`;
let publicView=read('rotace.js');
if(!publicView.includes('RAK_17061_PUBLIC_ABSENCE_LAYOUT')){
  publicView=once(publicView,
    `    absenceHtml += "<div class='tableWrap'><table class='noteTable'><thead><tr>";`,
    `    // RAK_17061_PUBLIC_ABSENCE_LAYOUT: fixed columns, reclaimed name space goes to date.\n${widthMarkup}\n    absenceHtml += "<div class='tableWrap'><table class='noteTable rakAbsenceTable' style='width:" + String(absenceWidth) + "px;min-width:100%'>" + absenceColgroup + "<thead><tr>";`,
    'public absence table');
  write('rotace.js',publicView);
}
let adminView=read('admin-rotation-editor.js');
if(!adminView.includes('RAK_17061_ADMIN_ABSENCE_LAYOUT')){
  adminView=once(adminView,
    `  html += "<div class='tableWrap'><table class='noteTable noteTableCompact'><thead><tr>";`,
    `  // RAK_17061_ADMIN_ABSENCE_LAYOUT: exactly the same proportional columns as public rotation.\n${widthMarkup.replace(/^    /gm,'  ')}\n  html += "<div class='tableWrap'><table class='noteTable noteTableCompact rakAbsenceTable' style='width:" + String(absenceWidth) + "px;min-width:100%'>" + absenceColgroup + "<thead><tr>";`,
    'admin absence summary');
  write('admin-rotation-editor.js',adminView);
}
const css=`
/* RAK_17061_ABSENCE_CSS: public and admin summary use the same measured columns.
   Old 45% name and 12% date widths were applied to repeated name pairs and squeezed dates. */
html body .noteTable.rakAbsenceTable {table-layout:fixed !important;max-width:none !important;}
html body .noteTable.rakAbsenceTable th,
html body .noteTable.rakAbsenceTable td {
  box-sizing:border-box !important;padding:5px 2px !important;
  white-space:nowrap !important;overflow:hidden !important;text-overflow:ellipsis !important;
}
html body .noteTable.rakAbsenceTable .noteDateCell {
  width:58px !important;min-width:58px !important;max-width:58px !important;
  padding-left:3px !important;text-overflow:clip !important;
}
html body .noteTable.rakAbsenceTable .noteShiftCell {
  width:34px !important;min-width:34px !important;max-width:34px !important;text-align:center !important;
}
html body .noteTable.rakAbsenceTable .notePersonCell {
  width:68px !important;min-width:68px !important;max-width:68px !important;
  text-align:left !important;
}
html body .noteTable.rakAbsenceTable .noteReasonCell {
  width:38px !important;min-width:38px !important;max-width:38px !important;text-align:center !important;
}
html body .noteTable.rakAbsenceTable .noteSpacer {
  width:7px !important;min-width:7px !important;max-width:7px !important;padding:0 !important;
}
@media(max-width:700px){
  html body .noteTable.rakAbsenceTable th {font-size:10px !important;}
  html body .noteTable.rakAbsenceTable td {font-size:11px !important;}
}
/* Admin editable rows: date + shift must fit without shrinking the iOS-safe 16px input font.
   The horizontal table wrapper already scrolls if a narrower device needs it. */
html body #appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminRotationTable col:first-child {
  width:92px !important;
}
html body #appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminRotationTable input[data-rot-field="date"] {
  box-sizing:border-box !important;width:90px !important;min-width:90px !important;max-width:90px !important;
  padding-left:4px !important;padding-right:2px !important;text-align:left !important;
}
html body #appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminAbsenceTable {
  min-width:204px !important;
}
html body #appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminAbsenceTable col:nth-child(1) {
  width:86px !important;
}
html body #appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminAbsenceTable col:nth-child(2) {
  width:86px !important;
}
html body #appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminAbsenceTable col:nth-child(3) {
  width:32px !important;
}
html body #appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminAbsenceTable input[data-note-field="date"] {
  box-sizing:border-box !important;width:84px !important;min-width:84px !important;max-width:84px !important;
  padding-left:3px !important;padding-right:1px !important;text-align:left !important;
}
html body #appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminAbsenceTable input[data-note-field="person"] {
  box-sizing:border-box !important;width:84px !important;min-width:84px !important;max-width:84px !important;
  padding-left:2px !important;padding-right:1px !important;
}
html body #appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminAbsenceTable input[data-note-field="code"] {
  box-sizing:border-box !important;width:28px !important;min-width:28px !important;max-width:28px !important;
  margin-left:0 !important;padding-left:1px !important;padding-right:1px !important;
}
/* END_RAK_17061_ABSENCE_CSS */
`;
let legacy=read('styles-inline-legacy.css');
if(!legacy.includes('RAK_17061_ABSENCE_CSS')){
  assert(legacy.includes('adminRotationEditor'),'1.7.60 CSS baseline not found');
  legacy+='\n'+css;
  write('styles-inline-legacy.css',legacy);
}
let replay=read('tools/shift-report-mo-hotfix-170-smoke.mjs');
if(!replay.includes('RAK_17061_TWO_PASS_GUARD')){
  replay=once(replay,
    `// RAK_17060_TWO_PASS_GUARD\nconst already17060=indexSource.includes("var build='${PREVIOUS}';");`,
    `// RAK_17060_TWO_PASS_GUARD\n// RAK_17061_TWO_PASS_GUARD\nconst already17061=indexSource.includes("var build='${BUILD}';");\nconst already17060=already17061||indexSource.includes("var build='${PREVIOUS}';");`,
    'second-pass source marker');
  replay=once(replay,
    `already17060?"var build='${PREVIOUS}';":already17059?`,
    `already17061?"var build='${BUILD}';":already17060?"var build='${PREVIOUS}';":already17059?`,
    'second-pass restore of index marker');
  write('tools/shift-report-mo-hotfix-170-smoke.mjs',replay);
}
for(const [path,from,to] of [
 ['supabase-config.js','window.RAK_RELEASE_VERSION = "1.7.60";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['supabase-config.js','window.RAK_TEST_DISPLAY_VERSION = "1.7.60";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`],
 ['supabase-config.js',`window.RAK_PWA_BUILD = "${PREVIOUS}";`,`window.RAK_PWA_BUILD = "${BUILD}";`],
 ['app.js',`const RAK_DEV_UPDATE_BUILD = "${PREVIOUS}";`,`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],
 ['app.js','window.RAK_RELEASE_VERSION = "1.7.60";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['sw.js',"const CACHE_VERSION = 'v1.7.60';",`const CACHE_VERSION = 'v${VERSION}';`],
 ['sw.js',"const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.60';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],
 ['sw.js',`const DEVELOPMENT_BUILD_ID = '${PREVIOUS}';`,`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],
 ['index.html',`var build='${PREVIOUS}';`,`var build='${BUILD}';`]
])write(path,once(read(path),from,to,'release '+path));
assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
for(const path of ['rotace.js','admin-rotation-editor.js','tools/shift-report-mo-hotfix-170-smoke.mjs','app.js','sw.js','supabase-config.js','tools/development-version-17061.mjs'])execFileSync(process.execPath,['--check',path],{stdio:'pipe'});
execFileSync(process.execPath,['--test','tools/release-gate-17061.test.mjs'],{stdio:'inherit'});
console.log('[development-version-17061] PASS two absence previews, editable dates and TEST-only 1.7.61');
