#!/usr/bin/env node
// RaK 1.7.36: OS-only employees and a database guard against accidental nested secrets in public rotations.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.36';
const BUILD='v1.7.36-rotationprivacy1';
const read=path=>fs.readFileSync(path,'utf8');
function change(path,transform){const before=read(path);const after=transform(before);if(after!==before)fs.writeFileSync(path,after,'utf8');return after;}
function swap(source,before,after,label){
 if(source.includes(before)){assert.equal(source.split(before).length,2,'[17036] duplicate anchor '+label);return source.replace(before,after);}
 assert(source.includes(after),'[17036] missing anchor '+label);return source;
}
const migration=read('supabase/history/non-production-migrations/20260919071456_rak_public_rotation_reject_nested_secret_fields_os_only.sql');
const matrix=read('tools/security-rotation-public-field-matrix.sql');
const policy=read('EMPLOYEE_AUTH_CUTOVER.md');
const privacy=read('PUBLIC_ROTATION_PRIVACY.md');
assert(migration.includes('rak_rotation_no_public_secret_fields_v1')&&migration.includes('private.rak_rotation_has_restricted_public_key')&&migration.includes('nodes.depth < 32')&&migration.includes('REVOKE ALL')&&migration.includes('does NOT make operational schedules'),'[17036] private rotation guard migration missing');
assert(matrix.includes('Nested email allowed')&&matrix.includes('Nested token allowed')&&matrix.includes('Sensitive UPDATE not blocked')&&matrix.includes('SET LOCAL ROLE anon;')&&matrix.includes('ROLLBACK;'),'[17036] rotation regression missing');
assert(policy.includes('OS_ONLY_POLICY_20260919')&&privacy.includes('nepozná citlivou informaci')&&privacy.includes('anonymně čitelná')&&privacy.includes('main'),'[17036] OS-only privacy scope missing');
change('tools/shift-report-mo-hotfix-170-smoke.mjs',source=>{
 if(source.includes('// RAK_17036_TWO_PASS_GUARD'))return source;
 source=swap(source,
  "const already17035=indexSource.includes(\"var build='v1.7.35-os-only1';\");",
  "// RAK_17036_TWO_PASS_GUARD\nconst already17036=indexSource.includes(\"var build='v1.7.36-rotationprivacy1';\");\nconst already17035=already17036||indexSource.includes(\"var build='v1.7.35-os-only1';\");",
  'two-pass detection');
 return swap(source,
  "already17035?\"var build='v1.7.35-os-only1';\":already17034?",
  "already17036?\"var build='v1.7.36-rotationprivacy1';\":already17035?\"var build='v1.7.35-os-only1';\":already17034?",
  'two-pass reset');
});
change('supabase-config.js',source=>{
 assert(source.includes('https://cgshssdjgzzuprlwnabl.supabase.co')&&!source.includes('bkqamcbkiwumsvelahxr'),'[17036] TEST Supabase isolation');
 source=swap(source,'window.RAK_RELEASE_VERSION = "1.7.35";',`window.RAK_RELEASE_VERSION = "${VERSION}";`,'release');
 source=swap(source,'window.RAK_TEST_DISPLAY_VERSION = "1.7.35";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`,'display');
 return swap(source,'window.RAK_PWA_BUILD = "v1.7.35-os-only1";',`window.RAK_PWA_BUILD = "${BUILD}";`,'PWA build');
});
change('app.js',source=>{
 source=swap(source,'const RAK_DEV_UPDATE_BUILD = "v1.7.35-os-only1";',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`,'app build');
 return swap(source,'window.RAK_RELEASE_VERSION = "1.7.35";',`window.RAK_RELEASE_VERSION = "${VERSION}";`,'app release');
});
change('sw.js',source=>{
 assert(source.includes("const SW_APP_VERSION = '1.7.0';"),'[17036] technical version changed');
 source=swap(source,"const CACHE_VERSION = 'v1.7.35';",`const CACHE_VERSION = 'v${VERSION}';`,'cache');
 source=swap(source,"const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.35';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`,'worker display');
 return swap(source,"const DEVELOPMENT_BUILD_ID = 'v1.7.35-os-only1';",`const DEVELOPMENT_BUILD_ID = '${BUILD}';`,'worker build');
});
change('index.html',source=>swap(source,"var build='v1.7.35-os-only1';",`var build='${BUILD}';`,'HTML build'));
assert.equal(JSON.parse(read('package.json')).version,'1.7.0','[17036] technical package version changed');
for(const path of ['tools/development-version-17036.mjs','tools/shift-report-mo-hotfix-170-smoke.mjs','supabase-config.js','app.js','sw.js'])execFileSync(process.execPath,['--check',path],{stdio:'pipe'});
assert(read('index.html').includes(`var build='${BUILD}';`)&&read('sw.js').includes(`const CACHE_VERSION = 'v${VERSION}';`),'[17036] build/cache mismatch');
console.log('[development-version-17036] OK: test DB migration, public-field regression and honest OS-only privacy scope; PWA 1.7.36');
await import('./development-version-17037.mjs');
