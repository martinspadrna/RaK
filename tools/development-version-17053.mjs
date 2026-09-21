#!/usr/bin/env node
// RaK 1.7.53: fail closed on incomplete owner backups; retain all earlier gates.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const VERSION='1.7.53',BUILD='v1.7.53-backupverify1',PREVIOUS='v1.7.52-mobileoffline1';
const read=path=>fs.readFileSync(path,'utf8');
function change(file,before,after){
 const src=read(file);
 if(src.includes(after)) return;
 // The later 1.7.55 stage rewrites the complete recovery sequence. During a
 // second build, its Auth-first guide takes precedence over this historical
 // 1.7.53 wording. Keep testing all other 1.7.53 transformations normally.
 if(file==='rak-complete-backup.js' && src.includes('RAK_17055_RESTORE_ORDER_GUARD') &&
    (after.includes("'5. Obnov soukromá metadata importů") || after.includes("'7. Pokud existují soubory"))) return;
 if(src.includes(before)){
  assert.equal(src.split(before).length,2,'[17053] ambiguous '+file);
  fs.writeFileSync(file,src.replace(before,after),'utf8');
 } else assert.fail('[17053] missing '+file+': '+after.slice(0,100));
}

const BACKUP_REPORT_METRICS = Object.freeze([
  "      'Aplikačních tabulek: ' + String(metrics.publicTables || 0),",
  "      'Soukromých importů: ' + String(metrics.privateImports || 0),",
  "      'Sanitizovaných Auth účtů: ' + String(metrics.sanitizedAuthAccounts || 0),"
]);
function ensureBackupReportMetrics() {
 const file='rak-complete-backup.js';
 let source=read(file);
 const anchorLine=BACKUP_REPORT_METRICS[0];
 const anchorIndex=source.indexOf(anchorLine);
 assert(anchorIndex>=0,'[17053] backup report metric anchor missing');
 // Remove complete generated lines so replay cannot accumulate blank separators.
 const removeLine=(value,line)=>value.split(line+'\n').join('').split(line).join('');
 for(const line of BACKUP_REPORT_METRICS.slice(1)) source=removeLine(source,line);
 const firstAnchor=source.indexOf(anchorLine);
 source=source.slice(0,firstAnchor+anchorLine.length)+source.slice(firstAnchor+anchorLine.length).split(anchorLine).join('');
 source=source.replace(anchorLine,BACKUP_REPORT_METRICS.join('\n'));
 fs.writeFileSync(file,source,'utf8');
}
const anchor='  function addSupabaseSnapshotFiles(zip, snapshot) {';
const validator=`  // RAK_17053_BACKUP_STRUCTURE_GUARD: never download an apparently complete but partial ZIP.
  function validateCompleteSnapshot(snapshot) {
    const data = snapshot && snapshot.data;
    const schema = snapshot && snapshot.schema;
    const fail = (part) => { throw new Error('Úplná záloha je neúplná: ' + part + '. Soubor nebyl vytvořen.'); };
    if (!snapshot || snapshot.format !== 'rak-complete-backup-v1' || !data || typeof data !== 'object') fail('formát databáze');
    if (!data.public || typeof data.public !== 'object' || Array.isArray(data.public)) fail('veřejné tabulky');
    if (!Array.isArray(data.public.rotation_state)) fail('rotace');
    if (Object.prototype.hasOwnProperty.call(data.public, 'rak_admin_secrets')) fail('v záloze se objevil zakázaný seznam tajemství');
    if (!Object.values(data.public).every(Array.isArray)) fail('řádky aplikačních tabulek');
    if (!data.private || !Array.isArray(data.private.rak_rotation_import_metadata_v1)) fail('soukromé importy');
    if (!data.auth || !Array.isArray(data.auth.users_sanitized) || !Array.isArray(data.auth.identities_sanitized)) fail('anonymizovaný Auth přehled');
    if (data.auth.users_sanitized.some((user) => !user || typeof user !== 'object' || ['encrypted_password','confirmation_token','recovery_token','access_token','refresh_token'].some((key) => Object.prototype.hasOwnProperty.call(user,key)))) fail('zakázané přihlašovací údaje');
    if (!data.storage || !Array.isArray(data.storage.buckets) || !Array.isArray(data.storage.objects)) fail('Storage metadata');
    if (!schema || !Array.isArray(schema.tables) || !schema.tables.length || !Array.isArray(schema.functions) || !schema.functions.length || !Array.isArray(schema.policies)) fail('struktura databáze');
    if (!Array.isArray(snapshot.sensitive_exclusions) || !snapshot.sensitive_exclusions.length) fail('seznam úmyslně vynechaných tajemství');
    return { privateImports: data.private.rak_rotation_import_metadata_v1.length, sanitizedAuthAccounts: data.auth.users_sanitized.length, schemaTables: schema.tables.length };
  }

`;
const backup=read('rak-complete-backup.js');
if(!backup.includes('// RAK_17053_BACKUP_STRUCTURE_GUARD'))change('rak-complete-backup.js',anchor,validator+anchor);
change('rak-complete-backup.js',
 "    addJson(zip, 'supabase/complete-snapshot.json', snapshot);",
 "    addJson(zip, 'supabase/complete-snapshot.json', snapshot);\n    addJson(zip, 'supabase/data/private/rak_rotation_import_metadata_v1.json', data.private.rak_rotation_import_metadata_v1);");
change('rak-complete-backup.js',
 "      'supabase/auth/         sanitizovaný přehled Auth uživatelů/identit',",
 "      'supabase/data/private/  soukromá metadata importů rotace pro obnovu',\n      'supabase/auth/         sanitizovaný přehled Auth uživatelů/identit',");
change('rak-complete-backup.js',
 "      '5. Auth účty znovu vytvoř/nastav přístupová hesla. Sanitizovaný Auth snapshot slouží jako seznam a metadata, ne jako kopie aktivních přihlašovacích údajů.',",
 "      '5. Obnov soukromá metadata importů ze supabase/data/private/rak_rotation_import_metadata_v1.json; ověř počty a návaznost na rotation_key/month_key.',\n      '6. Auth účty znovu vytvoř/nastav přístupová hesla. Při nových Auth UUID bezpečně přemapuj rak_admin_profiles.user_id; staré záznamy zařízení/relací nepovažuj za platné přihlášení.',");
change('rak-complete-backup.js',
 "      '6. Pokud existují soubory ve supabase/storage-files/, vytvoř odpovídající bucket(y) a soubory nahraj zpět.',\n      '7. Znovu nastav Supabase/Vercel tajné klíče a environment proměnné. Ty se z bezpečnostních důvodů nezálohují.',\n      '8. Nasaď aplikaci a proveď critical runtime + security smoke.',",
 "      '7. Pokud existují soubory ve supabase/storage-files/, vytvoř odpovídající bucket(y) a soubory nahraj zpět.',\n      '8. Znovu nastav Supabase/Vercel tajné klíče a environment proměnné. Ty se z bezpečnostních důvodů nezálohují.',\n      '9. Nasaď aplikaci a proveď critical runtime + security smoke.',");
ensureBackupReportMetrics();
assert(read('rak-complete-backup.js').includes('    const snapshot = await fetchCompleteSnapshot(token);'),'[17053] snapshot fetch lost');
if (!read('rak-complete-backup.js').includes('completePublicTables: validated.completePublicTables')) change('rak-complete-backup.js',
 "    const progress = (text) => status(text);",
 "    { const validated = validateCompleteSnapshot(snapshot); Object.assign(metrics, { privateImports: validated.privateImports, sanitizedAuthAccounts: validated.sanitizedAuthAccounts, schemaTables: validated.schemaTables }); }\n    const progress = (text) => status(text);");
const guard='tools/shift-report-mo-hotfix-170-smoke.mjs';
let stage=read(guard);
const oldGuard=`const already17052=indexSource.includes("var build='${PREVIOUS}';");`;
const newGuard=`// RAK_17053_TWO_PASS_GUARD\nconst already17053=indexSource.includes("var build='${BUILD}';");\nconst already17052=already17053||indexSource.includes("var build='${PREVIOUS}';");`;
const oldTail=`already17052?"var build='${PREVIOUS}';":already17051?`;
const newTail=`already17053?"var build='${BUILD}';":already17052?"var build='${PREVIOUS}';":already17051?`;
if(!stage.includes('// RAK_17053_TWO_PASS_GUARD')){
 assert(stage.includes(oldGuard)&&stage.includes(oldTail),'[17053] inherited replay anchors missing');
 stage=stage.replace(oldGuard,newGuard).replace(oldTail,newTail);
 fs.writeFileSync(guard,stage,'utf8');
}
assert(stage.includes(newTail)&&stage.includes("if(!current.includes(old))throw Error('[17020] latest index marker missing on second pass');"),'[17053] inherited replay lost');
change('supabase-config.js','window.RAK_RELEASE_VERSION = "1.7.52";',`window.RAK_RELEASE_VERSION = "${VERSION}";`);
change('supabase-config.js','window.RAK_TEST_DISPLAY_VERSION = "1.7.52";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`);
change('supabase-config.js',`window.RAK_PWA_BUILD = "${PREVIOUS}";`,`window.RAK_PWA_BUILD = "${BUILD}";`);
change('app.js',`const RAK_DEV_UPDATE_BUILD = "${PREVIOUS}";`,`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`);
change('app.js','window.RAK_RELEASE_VERSION = "1.7.52";',`window.RAK_RELEASE_VERSION = "${VERSION}";`);
change('sw.js',"const CACHE_VERSION = 'v1.7.52';",`const CACHE_VERSION = 'v${VERSION}';`);
change('sw.js',"const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.52';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`);
change('sw.js',`const DEVELOPMENT_BUILD_ID = '${PREVIOUS}';`,`const DEVELOPMENT_BUILD_ID = '${BUILD}';`);
change('index.html',`var build='${PREVIOUS}';`,`var build='${BUILD}';`);
assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'),'[17053] TEST isolation');
assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"),'[17053] OS-only login changed');
for(const path of ['rak-complete-backup.js','tools/development-version-17053.mjs','app.js','sw.js','supabase-config.js',guard])execFileSync(process.execPath,['--check',path],{stdio:'pipe'});
execFileSync(process.execPath,['--test','tools/release-gate-17053.test.mjs'],{stdio:'inherit'});
console.log('[development-version-17053] PASS owner ZIP completeness/private import and TEST PWA '+VERSION);
