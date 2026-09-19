#!/usr/bin/env node
// RaK 1.7.55: truthful, dependency-safe recovery order and tested shadow restore.
// TEST development only. No DB changes, employee Auth enrollment or production rollout.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.55', BUILD='v1.7.55-restoreshadow1', PREVIOUS='v1.7.54-restorepreflight1';
const read=path=>fs.readFileSync(path,'utf8');
function change(path,before,after,label){
  const text=read(path);
  if(text.includes(after)) return;
  assert(text.includes(before),'[17055] missing '+label+' in '+path);
  assert.equal(text.split(before).length,2,'[17055] ambiguous '+label+' in '+path);
  fs.writeFileSync(path,text.replace(before,after),'utf8');
}
const backup='rak-complete-backup.js';
const recovery=[
  '      // RAK_17055_RESTORE_ORDER_GUARD: FK dependencies and revoked sessions require manual sequencing.',
  "      '4. NEJDŘÍV v novém projektu znovu vytvoř administrátorské Auth účty s novými hesly a vytvoř soukromé mapování staré Auth UUID → nové Auth UUID. Sanitizovaný seznam NENÍ záloha hesel ani relací.',",
  "      '5. Před importem přemapuj rak_admin_profiles.user_id a created_by, rak_admin_audit_log.user_id, rak_admin_settings_backups.created_by a rak_rotation_backups_v2.created_by. Ověř všechny cizí klíče na auth.users a chybějící účty řeš ručně.',",
  "      '6. Importuj závislá aplikační data v pořadí: game_accounts před bug_reports/game_invites/game_sessions/game_stats; rotation_months před rotation_entries; rak_admin_settings_backups nejdřív bez restored_backup_id a pak doplň vazby. Až po nových Auth účtech obnov rak_admin_profiles a admin zálohy.',",
  "      '7. rak_admin_devices z historického JSON NEIMPORTUJ jako aktivní zařízení. Staré záznamy zařízení/relací nepovažuj za platné přihlášení; novou Auth session a nové zařízení musí každý admin zaregistrovat znovu.',",
  "      '8. Obnov soukromá metadata importů ze supabase/data/private/rak_rotation_import_metadata_v1.json a ověř rotation_key/month_key. Soukromé lookup budgety a jejich salt obnov přes migrace/nové výchozí hodnoty, ne přes stará provozní tajemství.',",
  "      '9. Tabulka rak_admin_secrets ani Auth hesla nejsou v ZIP: bezpečně znovu nastav potřebná administrátorská tajemství. private.rak_employee_auth_links není součástí exportu; případné nenulové odkazy vyžadují zvláštní kontrolu (zaměstnanci RaK zůstávají pouze u OS čísla).',",
  "      '10. Pokud existují soubory ve supabase/storage-files/, vytvoř odpovídající buckety a nahraj odpovídající fyzické soubory. Samotná metadata nestačí.',",
  "      '11. Znovu nastav Supabase/Vercel tajné klíče, konfiguraci a environment proměnné mimo ZIP.',",
  "      '12. Ověř počet a obsah všech 19 exportovaných tabulek, počty soukromých importů podle manifestu, cizí klíče, role owner/admin/deputy a přihlášení z nových zařízení. Teprve pak nasaď aplikaci a proveď critical runtime + security smoke.',",
  "      '13. SQL shadow test v původní databázi není nezávislá obnova; až úspěšné obnovení do odděleného projektu s Auth/Storage, migracemi a role testy uzavírá disaster recovery.'"
].join('\n');
// Older 1.7.53 and 1.7.54 transforms may insert extra instructions between steps.
// Replace the bounded numbered subsection, not a brittle exact multiline block.
let backupSource=read(backup);
if(!backupSource.includes('RAK_17055_RESTORE_ORDER_GUARD')){
  const begin="      '4. Nahraj aplikační data ze supabase/data/public/.',";
  const after="      'ZÁMĚRNĚ NEZAHRNUTO',";
  const start=backupSource.indexOf(begin);
  const stop=start<0?-1:backupSource.indexOf(after,start);
  assert(start>=0&&stop>start&&stop-start<2500,'[17055] unsafe or missing restore section boundaries');
  const old=backupSource.slice(start,stop);
  assert(old.includes('Auth účty znovu vytvoř')&&old.includes('Nasaď aplikaci')&&old.includes('soukromá metadata importů'),
    '[17055] inherited restore subsection changed; refusing blind rewrite');
  assert(backupSource.indexOf(begin,start+begin.length)<0&&backupSource.indexOf(after,stop+after.length)<0,
    '[17055] ambiguous recovery boundaries');
  backupSource=backupSource.slice(0,start)+recovery+"\n      '',\n"+backupSource.slice(stop);
  fs.writeFileSync(backup,backupSource,'utf8');
}
change(backup,
  "      'Tento balík je úplná obnovovací záloha RaK se záměrnou redakcí aktivních tajemství.',",
  "      'Tento balík je obnovovací snapshot RaK se záměrnou redakcí aktivních tajemství. NENÍ to automaticky spustitelná obnova: Auth účty, vazby a privilegia je nutné bezpečně znovu vytvořit a ověřit.',",
  'honest recovery scope');
change(backup,
  "    if (!confirm('Vytvořit jednu úplnou zálohu RaK? ZIP bude obsahovat zdroj aplikace, nasazenou PWA, aktuální data Supabase, DB strukturu/RLS/RPC a Storage. Tajné klíče a aktivní relace se z bezpečnostních důvodů nezahrnou.')) return;",
  "    if (!confirm('Vytvořit obnovovací ZIP RaK? Obsahuje zdroj, PWA, aplikační data a strukturu DB/Storage. Hesla, relace a klíče chybí záměrně: obnova vyžaduje nová Auth přihlášení, přemapování účtů a samostatné ověření.')) return;",
  'backup consent warning');
const sql=read('tools/restore-shadow-17055.sql');
for(const anchor of ['BEGIN;','CREATE TEMP TABLE','jsonb_populate_recordset','missing row went unnoticed','ROLLBACK;','temporary_test_devices_remaining']) assert(sql.includes(anchor),'[17055] SQL restore probe missing '+anchor);
assert(!sql.includes('bkqamcbkiwumsvelahxr')&&!/\bCOMMIT\s*;/i.test(sql),'[17055] test SQL must never commit or mention production');
const smoke='tools/shift-report-mo-hotfix-170-smoke.mjs';
let stage=read(smoke);
const oldGuard=`const already17054=indexSource.includes("var build='${PREVIOUS}';");`;
const nextGuard=`// RAK_17055_TWO_PASS_GUARD\nconst already17055=indexSource.includes("var build='${BUILD}';");\nconst already17054=already17055||indexSource.includes("var build='${PREVIOUS}';");`;
const oldTail=`already17054?"var build='${PREVIOUS}';":already17053?`;
const nextTail=`already17055?"var build='${BUILD}';":already17054?"var build='${PREVIOUS}';":already17053?`;
if(!stage.includes('// RAK_17055_TWO_PASS_GUARD')){
  assert(stage.includes(oldGuard)&&stage.includes(oldTail),'[17055] inherited second-pass anchors missing');
  stage=stage.replace(oldGuard,nextGuard).replace(oldTail,nextTail);
  fs.writeFileSync(smoke,stage,'utf8');
}
assert(stage.includes(nextTail),'[17055] latest marker replay missing');
for(const [file,before,after] of [
 ['supabase-config.js','window.RAK_RELEASE_VERSION = "1.7.54";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['supabase-config.js','window.RAK_TEST_DISPLAY_VERSION = "1.7.54";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`],
 ['supabase-config.js',`window.RAK_PWA_BUILD = "${PREVIOUS}";`,`window.RAK_PWA_BUILD = "${BUILD}";`],
 ['app.js',`const RAK_DEV_UPDATE_BUILD = "${PREVIOUS}";`,`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],
 ['app.js','window.RAK_RELEASE_VERSION = "1.7.54";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['sw.js',"const CACHE_VERSION = 'v1.7.54';",`const CACHE_VERSION = 'v${VERSION}';`],
 ['sw.js',"const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.54';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],
 ['sw.js',`const DEVELOPMENT_BUILD_ID = '${PREVIOUS}';`,`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],
 ['index.html',`var build='${PREVIOUS}';`,`var build='${BUILD}';`]
])change(file,before,after,'release '+file);
assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'),'[17055] production target forbidden');
assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"),'[17055] OS-only login changed');
for(const file of [backup,smoke,'tools/development-version-17055.mjs','app.js','sw.js','supabase-config.js']) execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
execFileSync(process.execPath,['--test','tools/release-gate-17055.test.mjs'],{stdio:'inherit'});
console.log('[development-version-17055] PASS corrected Auth-first restore, stale device exclusion, rollback shadow matrix and test PWA '+VERSION);
