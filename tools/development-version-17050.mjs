#!/usr/bin/env node
// RaK 1.7.50: 1.7.49 validates historical gates first; this stage finalizes
// privacy RLS and PWA markers. Repeated complete builds remain deterministic.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.50',BUILD='v1.7.50-privatecase1',PREVIOUS='v1.7.49-reportguard1';
const read=file=>fs.readFileSync(file,'utf8');
function replaceOnce(source,before,after,label){
 if(source.includes(before)){
  assert.equal(source.split(before).length,2,`[17050] ambiguous ${label}`);
  return source.replace(before,after);
 }
 assert(source.includes(after),`[17050] lost ${label}`);
 return source;
}
function edit(file,pairs){
 let source=read(file);
 for(const [before,after,label] of pairs)source=replaceOnce(source,before,after,label||file);
 fs.writeFileSync(file,source,'utf8');
}
const migration=read('supabase/history/non-production-migrations/20260919185000_rak_17050_case_insensitive_private_settings_rls.sql');
const matrix=read('tools/machine-private-casefold-17050.sql');
const http=read('tools/http-anon-audit-17050.mjs');
for(const marker of ['AS RESTRICTIVE FOR SELECT TO anon','AS RESTRICTIVE FOR SELECT TO authenticated',
 'rak_machine_settings_anon_casefold_private_v10','rak_machine_settings_authenticated_casefold_private_v10',
 'pg_catalog.lower','pg_catalog.upper','worker_roster_settings','ADMIN_FULL_SETTINGS_BACKUP_','ROTATION_SAVE_BACKUP_',
 '(SELECT private.rak_is_admin())'])assert(migration.includes(marker),'[17050] migration missing '+marker);
for(const marker of ['BEGIN;','ROLLBACK;','SET LOCAL ROLE anon;','SET LOCAL ROLE authenticated;',
 'Mixed-case PRIVATE settings leaked anonymously','Unauthorised authenticated session',
 'Public brush settings became invisible'])assert(matrix.includes(marker),'[17050] SQL fixture missing '+marker);
assert(!/\b(?:update|delete|truncate)\s+public\.rotation_state\b/i.test(migration+matrix),'[17050] rotation mutation forbidden');
for(const marker of ['deliberately-invalid-jwt','rak_owner_complete_backup_v1','rak_lookup_account_for_login_v2',
 'rak_submit_bug_report_v2','rak_app_keepalive','rak_admin_account_requires_auth','TEST DB only'])
 assert(http.includes(marker),'[17050] live HTTP test missing '+marker);
let stage=read('tools/shift-report-mo-hotfix-170-smoke.mjs');
if(!stage.includes('// RAK_17050_TWO_PASS_GUARD')){
 stage=replaceOnce(stage,
  `// RAK_17049_TWO_PASS_GUARD\nconst already17049=indexSource.includes("var build='${PREVIOUS}';");`,
  `// RAK_17049_TWO_PASS_GUARD\n// RAK_17050_TWO_PASS_GUARD\nconst already17050=indexSource.includes("var build='${BUILD}';");\nconst already17049=already17050||indexSource.includes("var build='${PREVIOUS}';");`,'second-pass detector');
 stage=replaceOnce(stage,
  `already17049?"var build='${PREVIOUS}';":already17048?`,
  `already17050?"var build='${BUILD}';":already17049?"var build='${PREVIOUS}';":already17048?`,'second-pass replay chain');
 fs.writeFileSync('tools/shift-report-mo-hotfix-170-smoke.mjs',stage,'utf8');
}
edit('supabase-config.js',[
 ['window.RAK_RELEASE_VERSION = "1.7.49";',`window.RAK_RELEASE_VERSION = "${VERSION}";`,'config version'],
 ['window.RAK_TEST_DISPLAY_VERSION = "1.7.49";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`,'config display'],
 [`window.RAK_PWA_BUILD = "${PREVIOUS}";`,`window.RAK_PWA_BUILD = "${BUILD}";`,'config build']]);
edit('app.js',[
 [`const RAK_DEV_UPDATE_BUILD = "${PREVIOUS}";`,`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`,'app build'],
 ['window.RAK_RELEASE_VERSION = "1.7.49";',`window.RAK_RELEASE_VERSION = "${VERSION}";`,'app version']]);
edit('sw.js',[
 ["const CACHE_VERSION = 'v1.7.49';",`const CACHE_VERSION = 'v${VERSION}';`,'SW cache'],
 ["const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.49';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`,'SW display'],
 [`const DEVELOPMENT_BUILD_ID = '${PREVIOUS}';`,`const DEVELOPMENT_BUILD_ID = '${BUILD}';`,'SW build']]);
edit('index.html',[[`var build='${PREVIOUS}';`,`var build='${BUILD}';`,'HTML marker']]);
assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'),'[17050] production DB forbidden');
assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"),'[17050] employee login changed');
assert(read('tools/development-version-17048.mjs').includes("await import('./development-version-17050.mjs');"),'[17050] final stage not chained');
for(const file of ['tools/development-version-17050.mjs','tools/http-anon-audit-17050.mjs',
 'tools/shift-report-mo-hotfix-170-smoke.mjs','app.js','sw.js','supabase-config.js'])
 execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
execFileSync(process.execPath,['--test','tools/release-gate-17050.test.mjs'],{stdio:'inherit'});
console.log('[development-version-17050] OK casefold RLS; historical gates verified at 1.7.49 stage; final TEST PWA 1.7.50');
