#!/usr/bin/env node
// RaK 1.7.32: recursive worker privacy, profile-based admin login and test-release marker.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.32';
const BUILD='v1.7.32-recursiveprivacy1';
const read=path=>fs.readFileSync(path,'utf8');
function change(path,transform){const before=read(path);const after=transform(before);if(after!==before)fs.writeFileSync(path,after,'utf8');return after;}
function swap(source,before,after,label){
 if(source.includes(before)){
  assert.equal(source.split(before).length,2,'[17032] duplicate anchor '+label);
  return source.replace(before,after);
 }
 assert(source.includes(after),'[17032] missing anchor '+label);
 return source;
}
const migration=read('supabase/migrations/20260919054241_rak_recursive_worker_privacy_and_profile_based_admin_lookup.sql');
const matrix=read('tools/security-recursive-worker-matrix.sql');
assert(migration.includes('rak_machine_settings_anon_no_recursive_identity_v9')&&migration.includes('rak_machine_settings_authenticated_recursive_identity_admin_only_v9')&&migration.includes("'$.**.loginNumber'")&&migration.includes("'$.**.workers'")&&migration.includes("'$.**.appAccounts'"),'[17032] recursive privacy migration missing');
assert(migration.includes('CREATE OR REPLACE FUNCTION public.rak_admin_account_requires_auth')&&migration.includes('profile.enabled')&&!migration.includes("= '9811'"),'[17032] disabled admin profile must not be bypassed');
assert(matrix.includes('SET LOCAL ROLE anon;')&&matrix.includes('SET LOCAL ROLE authenticated;')&&matrix.includes('rak.v9_spoof')&&matrix.includes('UPDATE public.rak_admin_profiles SET enabled=false')&&matrix.includes('ROLLBACK;'),'[17032] recursive/forged-session SQL regression missing');
change('tools/shift-report-mo-hotfix-170-smoke.mjs',source=>{
 if(source.includes('// RAK_17032_TWO_PASS_GUARD'))return source;
 source=swap(source,
  "const already17031=indexSource.includes(\"var build='v1.7.31-privacybundle1';\");",
  "// RAK_17032_TWO_PASS_GUARD\nconst already17032=indexSource.includes(\"var build='v1.7.32-recursiveprivacy1';\");\nconst already17031=already17032||indexSource.includes(\"var build='v1.7.31-privacybundle1';\");",
  'two-pass detection');
 return swap(source,
  "already17031?\"var build='v1.7.31-privacybundle1';\":already17030?",
  "already17032?\"var build='v1.7.32-recursiveprivacy1';\":already17031?\"var build='v1.7.31-privacybundle1';\":already17030?",
  'two-pass marker reset');
});
change('supabase-config.js',source=>{
 assert(source.includes('https://cgshssdjgzzuprlwnabl.supabase.co')&&!source.includes('bkqamcbkiwumsvelahxr'),'[17032] must use TEST Supabase');
 source=swap(source,'window.RAK_RELEASE_VERSION = "1.7.31";',`window.RAK_RELEASE_VERSION = "${VERSION}";`,'release');
 source=swap(source,'window.RAK_TEST_DISPLAY_VERSION = "1.7.31";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`,'display');
 return swap(source,'window.RAK_PWA_BUILD = "v1.7.31-privacybundle1";',`window.RAK_PWA_BUILD = "${BUILD}";`,'PWA build');
});
change('app.js',source=>{
 source=swap(source,'const RAK_DEV_UPDATE_BUILD = "v1.7.31-privacybundle1";',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`,'app build');
 return swap(source,'window.RAK_RELEASE_VERSION = "1.7.31";',`window.RAK_RELEASE_VERSION = "${VERSION}";`,'app release');
});
change('sw.js',source=>{
 assert(source.includes("const SW_APP_VERSION = '1.7.0';"),'[17032] technical version changed');
 source=swap(source,"const CACHE_VERSION = 'v1.7.31';",`const CACHE_VERSION = 'v${VERSION}';`,'cache');
 source=swap(source,"const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.31';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`,'worker display');
 return swap(source,"const DEVELOPMENT_BUILD_ID = 'v1.7.31-privacybundle1';",`const DEVELOPMENT_BUILD_ID = '${BUILD}';`,'worker build');
});
change('index.html',source=>swap(source,"var build='v1.7.31-privacybundle1';",`var build='${BUILD}';`,'HTML build'));
assert.equal(JSON.parse(read('package.json')).version,'1.7.0','[17032] technical package version changed');
for(const path of ['tools/development-version-17032.mjs','tools/shift-report-mo-hotfix-170-smoke.mjs','supabase-config.js','app.js','sw.js'])execFileSync(process.execPath,['--check',path],{stdio:'pipe'});
assert(read('index.html').includes(`var build='${BUILD}';`)&&read('sw.js').includes(`const CACHE_VERSION = 'v${VERSION}';`),'[17032] HTML and cache version mismatch');
console.log('[development-version-17032] OK recursive identity policies, no hardcoded owner login, 8-fixture SQL matrix, test DB and aligned PWA 1.7.32');
