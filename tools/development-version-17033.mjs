#!/usr/bin/env node
// RaK 1.7.33: employee Auth cutover safety and live announcement privacy, test branch only.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.33';
const BUILD='v1.7.33-employeeprivacy1';
const read=path=>fs.readFileSync(path,'utf8');
function change(path,transform){const before=read(path);const after=transform(before);if(after!==before)fs.writeFileSync(path,after,'utf8');return after;}
function swap(source,before,after,label){
 if(source.includes(before)){
  assert.equal(source.split(before).length,2,'[17033] duplicate anchor '+label);
  return source.replace(before,after);
 }
 assert(source.includes(after),'[17033] missing anchor '+label);
 return source;
}
const employee=read('supabase/migrations/20260919055938_rak_employee_rotation_cutover_readiness_and_disabled_worker_guard.sql');
const notices=read('supabase/migrations/20260919060210_rak_announcements_only_live_public_read.sql');
const employeesMatrix=read('tools/security-employee-rotation-matrix.sql');
const noticeMatrix=read('tools/security-announcement-live-matrix.sql');
const publicMatrix=read('tools/security-public-data-matrix.sql');
const runbook=read('EMPLOYEE_AUTH_CUTOVER.md');
assert(employee.includes('private.rak_employee_rotation_cutover_readiness')&&employee.includes('worker.banned_until')&&employee.includes('worker.deleted_at')&&employee.includes('worker.email_confirmed_at')&&employee.includes('legacy rotation gate'),'[17033] employee safety gates missing');
assert(notices.includes('rak_announcements_live_public_read_v4')&&notices.includes('rak_announcements_live_or_admin_read_v4')&&notices.includes('starts_at<=pg_catalog.now()')&&notices.includes('private.rak_is_admin()'),'[17033] active notice privacy missing');
assert(employeesMatrix.includes('SET LOCAL ROLE anon;')&&employeesMatrix.includes('SET LOCAL ROLE authenticated;')&&employeesMatrix.includes('Foreign session accepted')&&employeesMatrix.includes('ROLLBACK;'),'[17033] employee role tests missing');
assert(noticeMatrix.includes('Future notice exposed')&&noticeMatrix.includes('Expired notice exposed')&&noticeMatrix.includes('ROLLBACK;'),'[17033] live notice tests missing');
assert(publicMatrix.includes('rak_announcements_live_public_read_v4')&&publicMatrix.includes('rak_machine_settings_anon_no_recursive_identity_v9')&&publicMatrix.includes('ROLLBACK;'),'[17033] integrated public regression stale');
assert(runbook.includes('database_ready=true')&&runbook.includes('iPhonu')&&runbook.includes('main'),'[17033] employee migration runbook incomplete');
change('tools/shift-report-mo-hotfix-170-smoke.mjs',source=>{
 if(source.includes('// RAK_17033_TWO_PASS_GUARD'))return source;
 source=swap(source,
  "const already17032=indexSource.includes(\"var build='v1.7.32-recursiveprivacy1';\");",
  "// RAK_17033_TWO_PASS_GUARD\nconst already17033=indexSource.includes(\"var build='v1.7.33-employeeprivacy1';\");\nconst already17032=already17033||indexSource.includes(\"var build='v1.7.32-recursiveprivacy1';\");",
  'second-pass detector');
 return swap(source,
  "already17032?\"var build='v1.7.32-recursiveprivacy1';\":already17031?",
  "already17033?\"var build='v1.7.33-employeeprivacy1';\":already17032?\"var build='v1.7.32-recursiveprivacy1';\":already17031?",
  'second-pass reset');
});
change('supabase-config.js',source=>{
 assert(source.includes('https://cgshssdjgzzuprlwnabl.supabase.co')&&!source.includes('bkqamcbkiwumsvelahxr'),'[17033] TEST Supabase isolation');
 source=swap(source,'window.RAK_RELEASE_VERSION = "1.7.32";',`window.RAK_RELEASE_VERSION = "${VERSION}";`,'release');
 source=swap(source,'window.RAK_TEST_DISPLAY_VERSION = "1.7.32";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`,'display');
 return swap(source,'window.RAK_PWA_BUILD = "v1.7.32-recursiveprivacy1";',`window.RAK_PWA_BUILD = "${BUILD}";`,'PWA build');
});
change('app.js',source=>{
 source=swap(source,'const RAK_DEV_UPDATE_BUILD = "v1.7.32-recursiveprivacy1";',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`,'app build');
 return swap(source,'window.RAK_RELEASE_VERSION = "1.7.32";',`window.RAK_RELEASE_VERSION = "${VERSION}";`,'app version');
});
change('sw.js',source=>{
 assert(source.includes("const SW_APP_VERSION = '1.7.0';"),'[17033] technical version changed');
 source=swap(source,"const CACHE_VERSION = 'v1.7.32';",`const CACHE_VERSION = 'v${VERSION}';`,'cache');
 source=swap(source,"const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.32';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`,'worker display');
 return swap(source,"const DEVELOPMENT_BUILD_ID = 'v1.7.32-recursiveprivacy1';",`const DEVELOPMENT_BUILD_ID = '${BUILD}';`,'worker build');
});
change('index.html',source=>swap(source,"var build='v1.7.32-recursiveprivacy1';",`var build='${BUILD}';`,'HTML build'));
assert.equal(JSON.parse(read('package.json')).version,'1.7.0','[17033] technical package version changed');
for(const path of ['tools/development-version-17033.mjs','tools/shift-report-mo-hotfix-170-smoke.mjs','supabase-config.js','app.js','sw.js'])execFileSync(process.execPath,['--check',path],{stdio:'pipe'});
assert(read('index.html').includes(`var build='${BUILD}';`)&&read('sw.js').includes(`const CACHE_VERSION = 'v${VERSION}';`),'[17033] build/cache mismatch');
console.log('[development-version-17033] OK 1.7.33: employee Auth readiness, no early cutover, live notice RLS, rollback SQL tests and isolated test PWA');
await import('./development-version-17034.mjs');
