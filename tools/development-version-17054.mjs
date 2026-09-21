#!/usr/bin/env node
// RaK 1.7.54: compare owner snapshot with its complete schema and Auth references.
// TEST development only; no employee Auth, production or database writes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.54',BUILD='v1.7.54-restorepreflight1',PREVIOUS='v1.7.53-backupverify1';
const read=file=>fs.readFileSync(file,'utf8');
const BACKUP_PUBLIC_ROWS_LINE = "      'Řádků aplikačních tabulek: ' + String(metrics.publicRows || 0),";
function swap(file,before,after,label){
 const source=read(file);
 if(source.includes(after))return;
 if(file==='rak-complete-backup.js' && after.includes(BACKUP_PUBLIC_ROWS_LINE) && source.includes(BACKUP_PUBLIC_ROWS_LINE)) return;
 assert(source.includes(before),'[17054] missing '+label+' in '+file);
 assert.equal(source.split(before).length,2,'[17054] ambiguous '+label);
 fs.writeFileSync(file,source.replace(before,after),'utf8');
}
const backupFile='rak-complete-backup.js';
const oldReturn='    return { privateImports: data.private.rak_rotation_import_metadata_v1.length, sanitizedAuthAccounts: data.auth.users_sanitized.length, schemaTables: schema.tables.length };';
const coverage=`    // RAK_17054_BACKUP_COVERAGE_GUARD: the previous validator accepted a partial table inventory.
    const schemaPublic = schema.tables.filter((table) => table && table.schema === 'public' && typeof table.name === 'string').map((table) => table.name);
    if (schemaPublic.length < 20 || !schemaPublic.includes('rak_admin_secrets') || new Set(schemaPublic).size !== schemaPublic.length) fail('registr veřejných tabulek');
    if (!schema.tables.some((table) => table && table.schema === 'private' && table.name === 'rak_rotation_import_metadata_v1')) fail('struktura soukromých importů');
    const expectedPublic = schemaPublic.filter((name) => name !== 'rak_admin_secrets').sort();
    const actualPublic = Object.keys(data.public).sort();
    if (expectedPublic.length !== actualPublic.length || expectedPublic.some((name, index) => name !== actualPublic[index])) fail('chybějící nebo nadbytečné databázové tabulky');
    if (!Object.values(data.public).every((rows) => rows.every((row) => row && typeof row === 'object' && !Array.isArray(row)))) fail('neplatné řádky databáze');
    const authUserKeys = new Set(['id','aud','role','email','phone','email_confirmed_at','phone_confirmed_at','confirmed_at','last_sign_in_at','created_at','updated_at','is_anonymous','is_sso_user','banned_until','deleted_at','raw_app_meta_data']);
    const appMetaKeys = new Set(['provider','providers','rak_role','rak_account_id']);
    const authIds = new Set();
    for (const user of data.auth.users_sanitized) {
      if (!user || typeof user !== 'object' || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(user.id || '') || authIds.has(user.id) || Object.keys(user).some((key) => !authUserKeys.has(key))) fail('neplatný nebo rozšířený seznam Auth účtů');
      const meta = user.raw_app_meta_data || {};
      if (typeof meta !== 'object' || Array.isArray(meta) || Object.keys(meta).some((key) => !appMetaKeys.has(key))) fail('nečekaná soukromá Auth metadata');
      authIds.add(user.id);
    }
    const identities = data.auth.identities_sanitized;
    const identityKeys = new Set(['id','user_id','provider_id','provider','email','last_sign_in_at','created_at','updated_at']);
    if (identities.some((item) => !item || typeof item !== 'object' || !authIds.has(item.user_id) || Object.keys(item).some((key) => !identityKeys.has(key)))) fail('Auth identity a vazby na účty');
    for (const table of ['rak_admin_profiles','rak_admin_devices']) {
      if (!Array.isArray(data.public[table]) || data.public[table].some((row) => !authIds.has(row.user_id))) fail('vazba ' + table + ' na Auth účet');
    }
    const bucketIds = new Set();
    for (const bucket of data.storage.buckets) {
      if (!bucket || typeof bucket.id !== 'string' || !bucket.id || bucketIds.has(bucket.id)) fail('Storage bucket');
      bucketIds.add(bucket.id);
    }
    if (data.storage.objects.some((object) => !object || !bucketIds.has(object.bucket_id) || typeof object.name !== 'string' || !object.name)) fail('Storage soubory bez bucketu');
    const publicRows = Object.values(data.public).reduce((sum, rows) => sum + rows.length, 0);
`;
const extendedReturn='    return { privateImports: data.private.rak_rotation_import_metadata_v1.length, sanitizedAuthAccounts: data.auth.users_sanitized.length, schemaTables: schema.tables.length, completePublicTables: expectedPublic.length, publicRows };';
if(!read(backupFile).includes('RAK_17054_BACKUP_COVERAGE_GUARD'))swap(backupFile,oldReturn,coverage+extendedReturn,'snapshot completeness and references');
const oldMetrics='    { const validated = validateCompleteSnapshot(snapshot); Object.assign(metrics, { privateImports: validated.privateImports, sanitizedAuthAccounts: validated.sanitizedAuthAccounts, schemaTables: validated.schemaTables }); }';
const newMetrics='    { const validated = validateCompleteSnapshot(snapshot); Object.assign(metrics, { privateImports: validated.privateImports, sanitizedAuthAccounts: validated.sanitizedAuthAccounts, schemaTables: validated.schemaTables, completePublicTables: validated.completePublicTables, publicRows: validated.publicRows }); }';
swap(backupFile,oldMetrics,newMetrics,'manifest coverage counts');
swap(backupFile,"      'Aplikačních tabulek: ' + String(metrics.publicTables || 0),","      'Aplikačních tabulek: ' + String(metrics.publicTables || 0),\n      'Řádků aplikačních tabulek: ' + String(metrics.publicRows || 0),",'restore report row count');
const guard='tools/shift-report-mo-hotfix-170-smoke.mjs';
let stage=read(guard);
const oldGuard=`const already17053=indexSource.includes("var build='${PREVIOUS}';");`;
const newGuard=`// RAK_17054_TWO_PASS_GUARD\nconst already17054=indexSource.includes("var build='${BUILD}';");\nconst already17053=already17054||indexSource.includes("var build='${PREVIOUS}';");`;
const oldTail=`already17053?"var build='${PREVIOUS}';":already17052?`;
const newTail=`already17054?"var build='${BUILD}';":already17053?"var build='${PREVIOUS}';":already17052?`;
if(!stage.includes('// RAK_17054_TWO_PASS_GUARD')){
 assert(stage.includes(oldGuard)&&stage.includes(oldTail),'[17054] inherited replay anchors missing');
 stage=stage.replace(oldGuard,newGuard).replace(oldTail,newTail);
 fs.writeFileSync(guard,stage,'utf8');
}
assert(stage.includes(newTail),'[17054] replay version reset missing');
for(const [file,before,after] of [
 ['supabase-config.js','window.RAK_RELEASE_VERSION = "1.7.53";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['supabase-config.js','window.RAK_TEST_DISPLAY_VERSION = "1.7.53";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`],
 ['supabase-config.js',`window.RAK_PWA_BUILD = "${PREVIOUS}";`,`window.RAK_PWA_BUILD = "${BUILD}";`],
 ['app.js',`const RAK_DEV_UPDATE_BUILD = "${PREVIOUS}";`,`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],
 ['app.js','window.RAK_RELEASE_VERSION = "1.7.53";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['sw.js',"const CACHE_VERSION = 'v1.7.53';",`const CACHE_VERSION = 'v${VERSION}';`],
 ['sw.js',"const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.53';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],
 ['sw.js',`const DEVELOPMENT_BUILD_ID = '${PREVIOUS}';`,`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],
 ['index.html',`var build='${PREVIOUS}';`,`var build='${BUILD}';`]
])swap(file,before,after,'version '+file);
assert.equal(JSON.parse(read('package.json')).version,'1.7.0','[17054] technical package changed');
assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'),'[17054] production database forbidden');
assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"),'[17054] employee OS-only login changed');
for(const file of [backupFile,guard,'tools/development-version-17053.mjs','tools/development-version-17054.mjs','app.js','sw.js','supabase-config.js'])execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
execFileSync(process.execPath,['--test','tools/release-gate-17054.test.mjs'],{stdio:'inherit'});
console.log('[development-version-17054] PASS exhaustive 20/19 table schema, Auth/Storage references, backup fail-closed and TEST PWA '+VERSION);
