import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const VERSION='1.7.55', BUILD='v1.7.55-restoreshadow1';
const app=read('rak-complete-backup.js');
function restoreGuide(){
  const match=app.match(/  function buildRestoreReadme\(snapshot, metrics\) \{[\s\S]*?(?=\n  function triggerDownload\()/);
  assert(match,'[17055] runtime restore guide missing');
  const make=vm.runInNewContext(match[0]+'\nbuildRestoreReadme;',{
    window:{RAK_RELEASE_VERSION:VERSION,SUPABASE_CONFIG:{url:'https://example.invalid'}},
    RAK_COMPLETE_BACKUP_BUILD_SHA:'0'.repeat(40),Date
  });
  return make({generated_at:'2026-09-19',sensitive_exclusions:['sessions omitted']},
    {repositoryFiles:1,deployedFiles:1,publicTables:19,publicRows:25,storageObjects:0});
}
test('final TEST release and OS-number-only employees unchanged',()=>{
 for(const [file,text] of [
  ['index.html',`var build='${BUILD}';`],['sw.js',`const CACHE_VERSION = 'v${VERSION}';`],
  ['sw.js',`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],['sw.js',`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],
  ['app.js',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],['app.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
  ['supabase-config.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],['supabase-config.js',`window.RAK_PWA_BUILD = "${BUILD}";`]
 ])assert(read(file).includes(text),'missing '+file+': '+text);
 assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
 assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
 assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"));
});
test('actual ZIP README requires Auth before FK data, revokes old devices and distinguishes recovery from a snapshot',()=>{
 assert(app.includes('// RAK_17055_RESTORE_ORDER_GUARD'));
 const guide=restoreGuide();
 const auth=guide.indexOf('4. NEJDŘÍV');
 const remap=guide.indexOf('5. Před importem přemapuj');
 const data=guide.indexOf('6. Importuj závislá aplikační data');
 const devices=guide.indexOf('7. rak_admin_devices');
 const privateImports=guide.indexOf('8. Obnov soukromá metadata importů');
 assert(auth>=0&&auth<remap&&remap<data&&data<devices&&devices<privateImports,'dependency order invalid');
 for(const token of ['game_accounts před bug_reports','rotation_months před rotation_entries',
   'přemapuj rak_admin_profiles.user_id','rak_admin_settings_backups.created_by',
   'rak_rotation_backups_v2.created_by','staré záznamy zařízení/relací nepovažuj za platné',
   'rak_admin_secrets','private.rak_employee_auth_links','SQL shadow test','NENÍ to automaticky spustitelná obnova'])
   assert(guide.includes(token),'restore guide missing '+token);
 assert(!guide.includes('4. Nahraj aplikační data ze supabase/data/public/.'),'old unsafe order survived');
 assert(app.includes('obnova vyžaduje nová Auth přihlášení, přemapování účtů a samostatné ověření'));
});
test('real rollback-only PostgreSQL probe round-trips all 19 tables and catches deleted row',()=>{
 const sql=read('tools/restore-shadow-17055.sql');
 for(const value of ['BEGIN;','ROLLBACK;','SELECT public.rak_owner_complete_backup_v1()','SET LOCAL ROLE authenticated',
  'CREATE TEMP TABLE','jsonb_populate_recordset','jsonb_agg','v_original IS DISTINCT FROM v_restored',
  'v_tables<>19','DELETE FROM pg_temp.rak_17055_shadow_rotation_state','missing row went unnoticed',
  'temporary_test_devices_remaining'])assert(sql.includes(value),'shadow restore missing '+value);
 assert(!/\bCOMMIT\s*;/i.test(sql)&&!sql.includes('bkqamcbkiwumsvelahxr'));
 assert(sql.includes('no independent Supabase project'));
});
test('historical two-pass build, headless mobile, HTTP privacy and CRC remain CI requirements',()=>{
 const chain=read('tools/development-version-17048.mjs');
 assert(chain.includes("await import('./development-version-17054.mjs');")&&chain.includes("await import('./development-version-17055.mjs');"));
 const stage=read('tools/shift-report-mo-hotfix-170-smoke.mjs');
 assert(stage.includes('// RAK_17055_TWO_PASS_GUARD')&&stage.includes(`already17055?"var build='${BUILD}';":already17054?`));
 const ci=read('.github/workflows/rak-development-validation.yml');
 for(const command of ['npm run vercel-build\n          npm run vercel-build','node --test tools/release-gate-17055.test.mjs',
  'node tools/browser-offline-17052.mjs','node tools/http-anon-audit-17050.mjs',
  'node tools/backup-source-integrity-17051.mjs'])assert(ci.includes(command),'CI missing '+command);
});
test('13-point status does not claim independent recovery or real signed JWT',()=>{
 const plan=read('RAK_PLAN_13.md');
 assert(plan.includes('1.7.55')&&plan.includes('2/13')&&plan.includes('shadow')&&plan.includes('JWT'));
 assert(plan.includes('Izolovaná plná obnova zatím nebyla provedena'));
 assert.equal([...plan.matchAll(/^\| (P[012]\.\d) \|/gm)].length,13);
});
