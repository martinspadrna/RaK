#!/usr/bin/env node
// RaK 1.7.23 – hide only three requested rotation editor controls; save validation stays mandatory.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.23', BUILD='v1.7.23-rotationslim1', MARK='// RAK_ROTATION_TOOLBAR_SLIM_17023';
const read=p=>fs.readFileSync(p,'utf8');
function update(path,fn){const old=read(path),next=fn(old);if(next!==old)fs.writeFileSync(path,next,'utf8');return next;}
function change(s,old,next,label){assert(s.includes(old),'[17023] missing '+label);return s.replace(old,next);}
const editor=update('admin-rotation-editor.js',s=>{
  if(s.includes(MARK))return s;
  s=change(s,'function buildAdminRotationTableHtml(monthKey) {',MARK+'\nfunction buildAdminRotationTableHtml(monthKey) {','rotation renderer');
  s=change(s,'    \'      <button type="button" class="appMenuAction rakOtOverviewBtn" data-daymod-overtime-overview>Přehled přesčasů</button>\',\n','','overtime overview button');
  s=change(s,'    \'      <button type="button" class="appMenuAction" data-admin-action="copy-rotation-vacations">Kopírovat dovolené</button>\',\n','','copy vacations button');
  s=change(s,'    buildAdminRotationPreSaveChecklistHtml(monthKey),\n','','pre-save accordion');
  return s;
});
const begin=editor.indexOf('function buildAdminRotationTableHtml(monthKey) {');
const end=editor.indexOf('function readAdminRotationFromDom(monthKey) {',begin);
assert(begin>=0&&end>begin,'rotation renderer boundaries');
const renderer=editor.slice(begin,end);
assert(!/Přehled přesčasů|Kopírovat dovolené|buildAdminRotationPreSaveChecklistHtml\(monthKey\)/.test(renderer),'obsolete controls still shown in rotation');
for(const retained of ['data-admin-selected-remove hidden','adminRotationDraftStatus','buildAdminRotationCompactOverviewHtml','buildAdminPressRotationOverridesHtml','adminRotationFold','adminRotationAbsenceAddBtn'])
  assert(renderer.includes(retained),'necessary editor UI removed: '+retained);
assert(editor.includes('const ruleCheck = adminRotationValidateMonthRules(normalized, monthKey, { source: \'save\' });')&&editor.includes('if (!ruleCheck.ok)'),'mandatory validation on save preserved');
assert(editor.includes('function copyAdminRotationVacationsToClipboard('),'underlying export compatibility preserved');
// Test the real renderer rather than merely checking the source for removed strings.
const month={hard:{rows:[{date:'1.10. R',cells:['Novotný']}],machines:['MSKC01']},soft:{rows:[{date:'1.10. R',cells:['Synek']}],machines:['MFKF10']},notes:[]};
// The fixture evaluates ONLY the renderer, not preceding declarations in its file.
// Optional later-version draft recovery and local cleanup helpers are harmless stubs here.
const ctx={app:{rotation:{months:{'10/26':month}}},HARD_MACHINE_HEADERS:['MSKC01'],SOFT_MACHINE_HEADERS:['MFKF10'],escapeHtml:value=>String(value),adminRotationGeneratorGetPendingDraft:()=>null,adminRotationRowTemplate:()=>'<tr></tr>',adminRotationSortNotes:rows=>rows,adminNotesRowTemplate:()=>'<tr></tr>',buildAdminRotationColgroupHtml:()=>'<colgroup></colgroup>',buildAdminAbsenceColgroupHtml:()=>'<colgroup></colgroup>',buildAdminRotationCompactOverviewHtml:()=>'<details>Mini přehled</details>',buildAdminPressRotationOverridesHtml:()=>'',buildAdminAbsenceCodeDatalistHtml:()=>'<datalist></datalist>',buildAdminAbsenceSummaryHtml:()=>'',rakAdminMonthDraftRecoveryHtml:()=>'',rakAdminLocalDraftCleanupHtml:()=>''};
vm.runInNewContext(renderer+'\nthis.render=buildAdminRotationTableHtml;',ctx);
const actual=ctx.render('10/26');
for(const banned of ['Přehled přesčasů','Kopírovat dovolené','Kontrola před uložením','data-daymod-overtime-overview','copy-rotation-vacations','adminRotationPreSaveCheck'])assert(!actual.includes(banned),'removed control rendered: '+banned);
for(const good of ['Odebrat vybrané','adminRotationDraftStatus','Mini přehled','Tvrdota','Měkota','Absence','Přidat další absenci'])assert(actual.includes(good),'needed rotation control missing: '+good);
// The existing 1.7.22 stage is intentionally replayed before this stage on both build passes.
update('tools/shift-report-mo-hotfix-170-smoke.mjs',s=>{
  if(s.includes('// RAK_17023_TWO_PASS_GUARD'))return s;
  const old=`const already17022=indexSource.includes("var build='v1.7.22-admincompact1';")`;
  const replacement=`// RAK_17023_TWO_PASS_GUARD\nconst already17023=indexSource.includes("var build='${BUILD}';");\nconst already17022=(already17023||indexSource.includes("var build='v1.7.22-admincompact1';"))`;
  s=change(s,old,replacement,'second build already17022 guard');
  s=change(s,`const old=already17022?"var build='v1.7.22-admincompact1';":already17021?`,
    `const old=already17022?(already17023?"var build='${BUILD}';":"var build='v1.7.22-admincompact1';"):already17021?`,'second build prior release restore');
  return s;
});
// The 1.7.21 compatibility smoke runs before 1.7.22/1.7.23 on the second build pass.
update('tools/games-cleanup-17021-smoke.mjs',s=>{
  const old="driver.includes('const old=already17022?')";
  const next="driver.includes('const old=already17022?')"; // Preserve the original accepted prefix of the driver.
  assert(s.includes(old),'games smoke compatibility guard missing');
  return s;
});
update('supabase-config.js',s=>{
  assert(s.includes('https://cgshssdjgzzuprlwnabl.supabase.co')&&!s.includes('bkqamcbkiwumsvelahxr'),'test Supabase isolation');
  return change(change(change(s,'window.RAK_RELEASE_VERSION = "1.7.22";',`window.RAK_RELEASE_VERSION = "${VERSION}";`,'release'),
    'window.RAK_TEST_DISPLAY_VERSION = "1.7.22";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`,'display'),
    'window.RAK_PWA_BUILD = "v1.7.22-admincompact1";',`window.RAK_PWA_BUILD = "${BUILD}";`,'build');
});
update('app.js',s=>change(change(s,'const RAK_DEV_UPDATE_BUILD = "v1.7.22-admincompact1";',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`,'app build'),
  'window.RAK_RELEASE_VERSION = "1.7.22";',`window.RAK_RELEASE_VERSION = "${VERSION}";`,'app display'));
update('sw.js',s=>{
  assert(s.includes("const SW_APP_VERSION = '1.7.0';"),'technical SW version');
  return change(change(change(s,"const CACHE_VERSION = 'v1.7.22';",`const CACHE_VERSION = 'v${VERSION}';`,'cache'),
    "const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.22';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`,'SW display'),
    "const DEVELOPMENT_BUILD_ID = 'v1.7.22-admincompact1';",`const DEVELOPMENT_BUILD_ID = '${BUILD}';`,'SW build');
});
update('index.html',s=>change(s,"var build='v1.7.22-admincompact1';",`var build='${BUILD}';`,'index build'));
assert.equal(JSON.parse(read('package.json')).version,'1.7.0','technical version unchanged');
assert(read('index.html').includes(`var build='${BUILD}';`)&&read('supabase-config.js').includes(`window.RAK_RELEASE_VERSION = "${VERSION}";`),'release versions synced');
assert(read('tools/shift-report-mo-hotfix-170-smoke.mjs').includes('const already17023='),'two-pass release recognized');
for(const path of ['admin-rotation-editor.js','tools/shift-report-mo-hotfix-170-smoke.mjs','tools/games-cleanup-17021-smoke.mjs','supabase-config.js','app.js','sw.js'])execFileSync(process.execPath,['--check',path],{stdio:'pipe'});
console.log('[rotation-toolbar-slim-17023] OK three controls removed from rendered rotation, automatic save validation preserved, other editor actions preserved, two-pass, test DB, release');
