#!/usr/bin/env node
// RaK 1.7.56: user-triggered signed-token role diagnostic, development only.
// No sign-ins, role mutations, database DDL or production changes at build time.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.56', BUILD='v1.7.56-authprobe1', PREVIOUS='v1.7.55-restoreshadow1';
const read=p=>fs.readFileSync(p,'utf8');
function change(file,before,after,label){
 const old=read(file);
 if(old.includes(after))return;
 assert(old.includes(before),'[17056] missing '+label+' in '+file);
 assert.equal(old.split(before).length,2,'[17056] ambiguous '+label+' in '+file);
 fs.writeFileSync(file,old.replace(before,after),'utf8');
}
const renderer='app-menu-admin-renderer.js';
const panel=[
 "  const serviceHtml = buildAdminServiceHtml() + [",
 "    '<div class=\"appMenuCard appMenuAdminCard\" id=\"rakLiveAuthDiagnostic\">',",
 "    '  <div class=\"appMenuCardTitle\">Ověření živé administrátorské relace</div>',",
 "    '  <div class=\"smallText\">Jen v testovací verzi: po kliknutí se ověří skutečný podepsaný token, role a práva ke čtení. Bez ukládání tokenu, změn dat nebo automatického přihlášení.</div>',",
 "    '  <button type=\"button\" class=\"appMenuAction\" data-admin-action=\"run-live-auth-check\">Ověřit moje přihlášení a práva</button>',",
 "    '  <div class=\"smallText\" id=\"rakLiveAuthDiagnosticStatus\" role=\"status\" aria-live=\"polite\">Ještě neověřeno. Kontrola se spustí pouze klepnutím.</div>',",
 "    '</div>'",
 "  ].join('');"
].join('\n');
change(renderer,'  const serviceHtml = buildAdminServiceHtml();',panel,'service diagnostic panel');
const helper=read('tools/auth-role-diagnostic-17056.js');
assert(helper.includes('async function rakRunLiveAuthDiagnostic()'),'[17056] helper missing');
if(!read(renderer).includes('// RaK 1.7.56. Injected into the built admin renderer')){
 fs.appendFileSync(renderer,'\n\n'+helper+'\n','utf8');
}
const menu='app-menu.js';
const clickGuard=[
 "      if (adminAction === 'run-live-auth-check') {",
 "        event.preventDefault();",
 "        if (currentView === 'service' && typeof rakRunLiveAuthDiagnostic === 'function') await rakRunLiveAuthDiagnostic();",
 "        return;",
 "      }",
 "      if (adminAction === 'excel-import') {"
].join('\n');
change(menu,"      if (adminAction === 'excel-import') {",clickGuard,'role diagnostic click route');
const smoke='tools/shift-report-mo-hotfix-170-smoke.mjs';
let stage=read(smoke);
const oldGuard=`// RAK_17055_TWO_PASS_GUARD\nconst already17055=indexSource.includes("var build='${PREVIOUS}';");`;
const nextGuard=`// RAK_17055_TWO_PASS_GUARD\n// RAK_17056_TWO_PASS_GUARD\nconst already17056=indexSource.includes("var build='${BUILD}';");\nconst already17055=already17056||indexSource.includes("var build='${PREVIOUS}';");`;
const oldTail=`already17055?"var build='${PREVIOUS}';":already17054?`;
const nextTail=`already17056?"var build='${BUILD}';":already17055?"var build='${PREVIOUS}';":already17054?`;
if(!stage.includes('// RAK_17056_TWO_PASS_GUARD')){
 assert(stage.includes(oldGuard)&&stage.includes(oldTail),'[17056] old replay assertions missing');
 stage=stage.replace(oldGuard,nextGuard).replace(oldTail,nextTail);
 fs.writeFileSync(smoke,stage,'utf8');
}
assert(stage.includes(oldTail)&&stage.includes(nextTail),'[17056] new and inherited replay guards missing');
for(const [file,before,after] of [
 ['supabase-config.js','window.RAK_RELEASE_VERSION = "1.7.55";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['supabase-config.js','window.RAK_TEST_DISPLAY_VERSION = "1.7.55";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`],
 ['supabase-config.js',`window.RAK_PWA_BUILD = "${PREVIOUS}";`,`window.RAK_PWA_BUILD = "${BUILD}";`],
 ['app.js',`const RAK_DEV_UPDATE_BUILD = "${PREVIOUS}";`,`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],
 ['app.js','window.RAK_RELEASE_VERSION = "1.7.55";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['sw.js',"const CACHE_VERSION = 'v1.7.55';",`const CACHE_VERSION = 'v${VERSION}';`],
 ['sw.js',"const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.55';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],
 ['sw.js',`const DEVELOPMENT_BUILD_ID = '${PREVIOUS}';`,`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],
 ['index.html',`var build='${PREVIOUS}';`,`var build='${BUILD}';`]
])change(file,before,after,'release '+file);
assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'),'[17056] test DB only');
assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"),'[17056] OS-only login changed');
for(const file of [renderer,menu,smoke,'tools/auth-role-diagnostic-17056.js','app.js','sw.js','supabase-config.js'])execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
execFileSync(process.execPath,['--test','tools/release-gate-17056.test.mjs'],{stdio:'inherit'});
console.log('[development-version-17056] PASS signed Auth role diagnostic installed; no automatic session probe, TEST PWA '+VERSION);
