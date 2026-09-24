#!/usr/bin/env node
// RaK 1.7.35: preserve OS-number-only employee access; retire the employee Auth cutover plan.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.35';
const BUILD='v1.7.35-os-only1';
const read=path=>fs.readFileSync(path,'utf8');
function change(path,transform){const before=read(path);const after=transform(before);if(after!==before)fs.writeFileSync(path,after,'utf8');return after;}
function swap(source,before,after,label){
 if(source.includes(before)){
  assert.equal(source.split(before).length,2,'[17035] duplicate anchor '+label);
  return source.replace(before,after);
 }
 assert(source.includes(after),'[17035] missing anchor '+label);
 return source;
}
const policy=read('EMPLOYEE_AUTH_CUTOVER.md');
const matrix=read('tools/security-employee-os-only-matrix.sql');
assert(policy.includes('OS_ONLY_POLICY_20260919')&&policy.includes('pouze OS číslo')&&policy.includes('Nevytvářet jim Supabase Auth účty')&&policy.includes('nikoli autentizační faktor')&&policy.includes('zrušeného zadání')&&policy.includes('9/9')&&policy.includes('main'),'[17035] employee OS-only decision not documented');
assert(matrix.includes('rak_lookup_account_for_login_v1(text)')&&matrix.includes("has_table_privilege('anon','public.rotation_state','SELECT')")&&matrix.includes('Unexpected employee Auth links')&&matrix.includes('Worker roster exposed anonymously')&&matrix.includes('ROLLBACK;'),'[17035] OS-only role and legacy regressions missing');
for(const path of ['supabase/history/non-production-migrations/20260919055938_rak_employee_rotation_cutover_readiness_and_disabled_worker_guard.sql','supabase/history/non-production-migrations/20260919062619_rak_worker_verified_email_recovery_staging.sql'])assert(fs.existsSync(path),'[17035] applied migration history unexpectedly removed: '+path);
change('tools/shift-report-mo-hotfix-170-smoke.mjs',source=>{
 if(source.includes('// RAK_17035_TWO_PASS_GUARD'))return source;
 source=swap(source,
  "const already17034=indexSource.includes(\"var build='v1.7.34-workeremail1';\");",
  "// RAK_17035_TWO_PASS_GUARD\nconst already17035=indexSource.includes(\"var build='v1.7.35-os-only1';\");\nconst already17034=already17035||indexSource.includes(\"var build='v1.7.34-workeremail1';\");",
  'two-pass detection');
 return swap(source,
  "already17034?\"var build='v1.7.34-workeremail1';\":already17033?",
  "already17035?\"var build='v1.7.35-os-only1';\":already17034?\"var build='v1.7.34-workeremail1';\":already17033?",
  'two-pass marker reset');
});
change('supabase-config.js',source=>{
 assert(source.includes('https://cgshssdjgzzuprlwnabl.supabase.co')&&!source.includes('bkqamcbkiwumsvelahxr'),'[17035] TEST Supabase isolation');
 source=swap(source,'window.RAK_RELEASE_VERSION = "1.7.34";',`window.RAK_RELEASE_VERSION = "${VERSION}";`,'release');
 source=swap(source,'window.RAK_TEST_DISPLAY_VERSION = "1.7.34";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`,'display');
 return swap(source,'window.RAK_PWA_BUILD = "v1.7.34-workeremail1";',`window.RAK_PWA_BUILD = "${BUILD}";`,'PWA build');
});
change('app.js',source=>{
 source=swap(source,'const RAK_DEV_UPDATE_BUILD = "v1.7.34-workeremail1";',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`,'app build');
 return swap(source,'window.RAK_RELEASE_VERSION = "1.7.34";',`window.RAK_RELEASE_VERSION = "${VERSION}";`,'app release');
});
change('sw.js',source=>{
 assert(source.includes("const SW_APP_VERSION = '1.7.0';"),'[17035] technical version changed');
 source=swap(source,"const CACHE_VERSION = 'v1.7.34';",`const CACHE_VERSION = 'v${VERSION}';`,'cache');
 source=swap(source,"const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.34';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`,'worker display');
 return swap(source,"const DEVELOPMENT_BUILD_ID = 'v1.7.34-workeremail1';",`const DEVELOPMENT_BUILD_ID = '${BUILD}';`,'worker build');
});
change('index.html',source=>swap(source,"var build='v1.7.34-workeremail1';",`var build='${BUILD}';`,'HTML build'));
assert.equal(JSON.parse(read('package.json')).version,'1.7.0','[17035] technical package version changed');
for(const path of ['tools/development-version-17035.mjs','tools/shift-report-mo-hotfix-170-smoke.mjs','supabase-config.js','app.js','sw.js'])execFileSync(process.execPath,['--check',path],{stdio:'pipe'});
assert(read('index.html').includes(`var build='${BUILD}';`)&&read('sw.js').includes(`const CACHE_VERSION = 'v${VERSION}';`),'[17035] build/cache mismatch');
console.log('[development-version-17035] OK: OS-number-only employees, no employee Auth enrollment or rotation cutover, protected admin data, isolated test PWA 1.7.35');
await import('./development-version-17036.mjs');
