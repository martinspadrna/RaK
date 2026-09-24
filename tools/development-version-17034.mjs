#!/usr/bin/env node
// RaK 1.7.34: verified, recoverable employee identity staging; NO Auth provisioning or rotation cutover.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.34';
const BUILD='v1.7.34-workeremail1';
const read=path=>fs.readFileSync(path,'utf8');
function change(path,transform){const before=read(path);const after=transform(before);if(after!==before)fs.writeFileSync(path,after,'utf8');return after;}
function swap(source,before,after,label){
 if(source.includes(before)){
  assert.equal(source.split(before).length,2,'[17034] duplicate anchor '+label);
  return source.replace(before,after);
 }
 assert(source.includes(after),'[17034] missing anchor '+label);
 return source;
}
const migration=read('supabase/history/non-production-migrations/20260919062619_rak_worker_verified_email_recovery_staging.sql');
const matrix=read('tools/security-worker-email-recovery-matrix.sql');
const runbook=read('EMPLOYEE_AUTH_CUTOVER.md');
assert(migration.includes('private.rak_worker_email_ready')&&migration.includes('worker.email_confirmed_at,worker.is_anonymous')&&migration.includes('u.email,u.email_confirmed_at,u.is_anonymous')&&migration.includes("<> 'worker.rak.local'")&&migration.includes('requires_recovery_delivery_smoke')&&migration.includes('legacy rotation regression'),'[17034] verified-email migration incomplete');
assert(!migration.includes("worker.email=link.account_number||'@worker.rak.local'")&&!migration.includes("u.email=l.account_number||'@worker.rak.local'"),'[17034] fake email dependency reintroduced');
assert(matrix.includes('8 email fixtures')&&matrix.includes('SET LOCAL ROLE anon;')&&matrix.includes('SET LOCAL ROLE authenticated;')&&matrix.includes('Unsigned read accepted')&&matrix.includes('ROLLBACK;'),'[17034] verified-email regression missing');
assert(runbook.includes('requires_recovery_delivery_smoke=true')&&runbook.includes('database_ready=true')&&runbook.includes('iPhonu')&&runbook.includes('main')&&runbook.includes('0/9'),'[17034] cutover runbook incomplete');
change('tools/shift-report-mo-hotfix-170-smoke.mjs',source=>{
 if(source.includes('// RAK_17034_TWO_PASS_GUARD'))return source;
 source=swap(source,
  "const already17033=indexSource.includes(\"var build='v1.7.33-employeeprivacy1';\");",
  "// RAK_17034_TWO_PASS_GUARD\nconst already17034=indexSource.includes(\"var build='v1.7.34-workeremail1';\");\nconst already17033=already17034||indexSource.includes(\"var build='v1.7.33-employeeprivacy1';\");",
  'two-pass detection');
 return swap(source,
  "already17033?\"var build='v1.7.33-employeeprivacy1';\":already17032?",
  "already17034?\"var build='v1.7.34-workeremail1';\":already17033?\"var build='v1.7.33-employeeprivacy1';\":already17032?",
  'two-pass marker reset');
});
change('supabase-config.js',source=>{
 assert(source.includes('https://cgshssdjgzzuprlwnabl.supabase.co')&&!source.includes('bkqamcbkiwumsvelahxr'),'[17034] TEST Supabase isolation');
 source=swap(source,'window.RAK_RELEASE_VERSION = "1.7.33";',`window.RAK_RELEASE_VERSION = "${VERSION}";`,'release');
 source=swap(source,'window.RAK_TEST_DISPLAY_VERSION = "1.7.33";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`,'display');
 return swap(source,'window.RAK_PWA_BUILD = "v1.7.33-employeeprivacy1";',`window.RAK_PWA_BUILD = "${BUILD}";`,'PWA build');
});
change('app.js',source=>{
 source=swap(source,'const RAK_DEV_UPDATE_BUILD = "v1.7.33-employeeprivacy1";',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`,'app build');
 return swap(source,'window.RAK_RELEASE_VERSION = "1.7.33";',`window.RAK_RELEASE_VERSION = "${VERSION}";`,'app release');
});
change('sw.js',source=>{
 assert(source.includes("const SW_APP_VERSION = '1.7.0';"),'[17034] technical version changed');
 source=swap(source,"const CACHE_VERSION = 'v1.7.33';",`const CACHE_VERSION = 'v${VERSION}';`,'cache');
 source=swap(source,"const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.33';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`,'worker display');
 return swap(source,"const DEVELOPMENT_BUILD_ID = 'v1.7.33-employeeprivacy1';",`const DEVELOPMENT_BUILD_ID = '${BUILD}';`,'worker build');
});
change('index.html',source=>swap(source,"var build='v1.7.33-employeeprivacy1';",`var build='${BUILD}';`,'HTML build'));
assert.equal(JSON.parse(read('package.json')).version,'1.7.0','[17034] technical package version changed');
for(const path of ['tools/development-version-17034.mjs','tools/shift-report-mo-hotfix-170-smoke.mjs','supabase-config.js','app.js','sw.js'])execFileSync(process.execPath,['--check',path],{stdio:'pipe'});
assert(read('index.html').includes(`var build='${BUILD}';`)&&read('sw.js').includes(`const CACHE_VERSION = 'v${VERSION}';`),'[17034] build/cache mismatch');
console.log('[development-version-17034] OK verified worker identity, recovery guard, read-only rollout, test Supabase and PWA 1.7.34');
await import('./development-version-17035.mjs');
