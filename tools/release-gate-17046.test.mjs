import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const VERSION='1.7.46',BUILD='v1.7.46-hardening1';
test('exact release, test Supabase, and technical version',()=>{
 for(const [file,marker] of [
  ['index.html',`var build='${BUILD}';`],
  ['app.js',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],
  ['app.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
  ['supabase-config.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
  ['supabase-config.js',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`],
  ['supabase-config.js',`window.RAK_PWA_BUILD = "${BUILD}";`],
  ['sw.js',`const CACHE_VERSION = 'v${VERSION}';`],
  ['sw.js',`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],
  ['sw.js',`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],
  ['sw.js',"const SW_APP_VERSION = '1.7.0';"]])
  assert(read(file).includes(marker),`${file}: missing ${marker}`);
 assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
 assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl'));
 assert(!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
});
test('bounded public telemetry and structural backup constraint recorded',()=>{
 const sql=read('supabase/migrations/20260919145342_rak_17046_telemetry_admission_and_backup_integrity.sql');
 for(const marker of ['telemetry-keepalive-global-v1','6000','15 seconds','jsonb_object_agg','rak_rotation_backup_structure_v1','revision>=0',"'build','online','reason','timezone','transport'",'REVOKE ALL ON FUNCTION public.rak_app_keepalive','GRANT EXECUTE ON FUNCTION public.rak_app_keepalive'])
  assert(sql.includes(marker),`missing ${marker}`);
});
test('anonymous SQL matrix contains real rollback, privilege and abuse cases',()=>{
 const sql=read('tools/telemetry-backup-matrix-17046.sql');
 for(const marker of ['BEGIN;','SET LOCAL ROLE anon;','ROLLBACK;','global anonymous quota did not fail closed','duplicate write not throttled','telemetry identity field leaked','rak_rotation_backup_structure_v1',"has_table_privilege('anon','public.game_accounts'",'private.rak_rotation_import_metadata_v1'])
  assert(sql.includes(marker),`missing ${marker}`);
 assert(!/\b(?:delete|truncate|update)\s+public\.rotation_state\b/i.test(sql));
});
test('all inherited guards, OS-only login, backup, CI repeat preserved',()=>{
 const stage=read('tools/shift-report-mo-hotfix-170-smoke.mjs');
 for(const id of ['17039','17040','17041','17042','17043','17044','17045','17046'])
  assert(stage.includes(`// RAK_${id}_TWO_PASS_GUARD`),`lost ${id}`);
 assert(stage.includes('const already17045=already17046||indexSource.includes('));
 assert(stage.includes(`already17046?"var build='${BUILD}';":already17045?`));
 assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"));
 assert(read('rak-complete-backup.js').includes('RAK_PRIVATE_IMPORT_BACKUP_17042'));
 const workflow=read('.github/workflows/rak-development-validation.yml');
 assert(workflow.includes('npm run vercel-build\n          npm run vercel-build'));
 assert(workflow.includes('node --test tools/release-gate-17046.test.mjs'));
});
