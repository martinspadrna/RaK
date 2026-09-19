import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const VERSION='1.7.50',BUILD='v1.7.50-privatecase1';

test('final version, PWA, test Supabase and OS-only employee login stay aligned',()=>{
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
  assert(read(file).includes(marker),`[17050] mismatched ${file}: ${marker}`);
 assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
 assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
 assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"));
 assert(read('rak-account-access.js').includes('Zadej 4 číslice.'));
});

test('two RESTRICTIVE RLS policies protect mixed-case private machine settings',()=>{
 const sql=read('supabase/migrations/20260919185000_rak_17050_case_insensitive_private_settings_rls.sql');
 for(const marker of ['CREATE POLICY rak_machine_settings_anon_casefold_private_v10',
  'CREATE POLICY rak_machine_settings_authenticated_casefold_private_v10',
  'AS RESTRICTIVE FOR SELECT TO anon','AS RESTRICTIVE FOR SELECT TO authenticated',
  '(SELECT private.rak_is_admin())','pg_catalog.lower','pg_catalog.upper',
  'stored_category','admin_settings_key','ADMIN_FULL_SETTINGS_BACKUP_%','ROTATION_SAVE_BACKUP_%'])
  assert(sql.includes(marker),`[17050] RLS guard missing ${marker}`);
 assert(!/\b(?:update|delete|truncate)\s+public\.rotation_state\b/i.test(sql));
 const fixture=read('tools/machine-private-casefold-17050.sql');
 for(const marker of ['BEGIN;','ROLLBACK;','SET LOCAL ROLE anon;','SET LOCAL ROLE authenticated;',
  'Mixed-case PRIVATE settings leaked anonymously','Public brush settings became invisible',
  'Unauthorised authenticated session','RAK_17050_CASE_PROBE'])
  assert(fixture.includes(marker),`[17050] SQL rollback fixture missing ${marker}`);
});

test('live HTTP audit uses TEST publishable key and non-mutating anonymous/invalid-token probes',()=>{
 const script=read('tools/http-anon-audit-17050.mjs');
 for(const marker of ['cgshssdjgzzuprlwnabl.supabase.co','production/unknown DB forbidden',
  'rak_admin_context','rak_owner_complete_backup_v1','rak_admin_list_application_accounts_v1',
  'rak_lookup_account_for_login_v2','rak_lookup_account_for_login_v1',
  'rak_admin_account_requires_auth','rak_app_keepalive','rak_submit_bug_report_v2',
  'deliberately-invalid-jwt','real anonymous/invalid-JWT HTTP probes','invalid-report'])
  assert(script.includes(marker),`[17050] missing HTTP probe ${marker}`);
 assert(!/\b(?:DELETE|PUT|PATCH)\b/.test(script),'[17050] HTTP test must not mutate working data');
});

test('all inherited gates execute before bump on BOTH builds; final gate is strict',()=>{
 const stage=read('tools/shift-report-mo-hotfix-170-smoke.mjs');
 for(const id of ['17039','17040','17041','17042','17043','17044','17045','17046','17047','17048','17049','17050'])
  assert(stage.includes(`// RAK_${id}_TWO_PASS_GUARD`),`[17050] missing replay ${id}`);
 assert(stage.includes('const already17049=already17050||indexSource.includes('));
 assert(stage.includes(`already17050?"var build='${BUILD}';":already17049?`));
 const previous=read('tools/development-version-17049.mjs');
 assert(previous.includes("for(const id of ['17043','17044','17045','17046','17047','17048','17049'])"));
 assert(read('tools/development-version-17048.mjs').includes("await import('./development-version-17050.mjs');"));
 const workflow=read('.github/workflows/rak-development-validation.yml');
 assert(workflow.includes('npm run vercel-build\n          npm run vercel-build'));
 for(const id of ['17043','17044','17045','17046','17047','17048','17049'])
  assert(workflow.includes(`node --test tools/release-gate-${id}.test.mjs`),`[17050] historical gate missing ${id}`);
 assert(workflow.includes('node --test tools/release-gate-17050.test.mjs'));
 assert(workflow.includes('node tools/http-anon-audit-17050.mjs'));
});

test('risk acceptance and owner-only backup are preserved, no false security completion',()=>{
 const plan=read('RAK_PLAN_13.md');
 for(const marker of ['1/13 uzavřen rozhodnutím','0/13 plně technicky','OS číslo',
  'UZAVŘENO ROZHODNUTÍM','24 měsíců','anonymně čitelné','importMeta','rollback'])
  assert(plan.includes(marker),`[17050] plan missing ${marker}`);
 assert(read('rak-complete-backup.js').includes('RAK_PRIVATE_IMPORT_BACKUP_17042'));
});
