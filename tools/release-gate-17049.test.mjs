import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const VERSION='1.7.49',BUILD='v1.7.49-reportguard1';
test('exact preview version, TEST Supabase, PWA cache and unchanged technical version',()=>{
 for(const [path,marker] of [
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
  assert(read(path).includes(marker),`${path}: ${marker}`);
 const config=read('supabase-config.js');
 assert(config.includes('cgshssdjgzzuprlwnabl')&&!config.includes('bkqamcbkiwumsvelahxr'));
 assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
});
test('public report metadata is allowlisted in DB trigger, not only filtered in client',()=>{
 const sql=read('supabase/migrations/20260919165000_rak_17049_bug_report_device_info_allowlist.sql');
 for(const marker of ['private.rak_bug_report_device_info_allowlist_v1','private.rak_bug_report_device_info_guard_v1',
  'NEW.device_info := private.rak_bug_report_device_info_allowlist_v1(NEW.device_info)',
  'BEFORE INSERT OR UPDATE ON public.bug_reports','REVOKE ALL ON FUNCTION',
  'sourceId','appearanceId','appearanceLabel','createdAtLocal','online','viewport',
  "'width'","'height'","'dpr'",'device_info_too_large'])
  assert(sql.includes(marker),`missing privacy guard: ${marker}`);
 assert(!/\b(?:update|delete|truncate)\s+public\.rotation_state\b/i.test(sql));
 const matrix=read('tools/bug-report-rls-matrix-17049.sql');
 for(const marker of ['BEGIN;','ROLLBACK;','SET LOCAL ROLE anon;',
  'public table without RLS','private table granted to frontend',
  'unexpected anonymous privileged API','private helper executable by anonymous role',
  'anonymous machine settings privacy leak','sensitive nested device metadata persisted',
  'duplicate report was accepted','quota not enforced','report_rate_limited'])
  assert(matrix.includes(marker),`missing security matrix: ${marker}`);
 assert(!/\b(?:delete|truncate|update)\s+public\.rotation_state\b/i.test(matrix));
});
test('OS-only employee access and accepted public-rotation risk are not reinterpreted as authentication',()=>{
 assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"));
 assert(read('rak-account-access.js').includes('Zadej 4 číslice.'));
 assert(read('rak-complete-backup.js').includes('RAK_PRIVATE_IMPORT_BACKUP_17042'));
 const plan=read('RAK_PLAN_13.md');
 for(const marker of ['1/13 uzavřen rozhodnutím','0/13 plně technicky','OS číslo',
  'UZAVŘENO ROZHODNUTÍM','riziko přijato','24 měsíců','anonymně čitelné','importMeta'])
  assert(plan.includes(marker),`missing risk disposition: ${marker}`);
});
test('all inherited historical security gates and double-build workflow survive release 1.7.49',()=>{
 const stage=read('tools/shift-report-mo-hotfix-170-smoke.mjs');
 for(const id of ['17039','17040','17041','17042','17043','17044','17045','17046','17047','17048','17049'])
  assert(stage.includes(`// RAK_${id}_TWO_PASS_GUARD`),`missing guard ${id}`);
 assert(stage.includes(`const already17048=already17049||indexSource.includes(`));
 assert(stage.includes(`already17049?"var build='${BUILD}';":already17048?`));
 for(const [id,range] of [
  ['17043','(43|44|45|46|47|48|49)'],['17045','(45|46|47|48|49)'],
  ['17046','(46|47|48|49)'],['17047','(47|48|49)'],['17048','(48|49)']])
  assert(read(`tools/release-gate-${id}.test.mjs`).includes(range),`old gate ${id} not version-aware`);
 const workflow=read('.github/workflows/rak-development-validation.yml');
 assert(workflow.includes('npm run vercel-build\n          npm run vercel-build'));
 for(const id of ['17039','17040','17041','17043','17044','17045','17046','17047','17048','17049'])
  assert(workflow.includes(`${id}.test.mjs`),`missing CI gate ${id}`);
 assert(read('tools/development-version-17048.mjs').includes("await import('./development-version-17049.mjs');"));
});
