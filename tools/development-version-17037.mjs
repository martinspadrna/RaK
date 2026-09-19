#!/usr/bin/env node
// RaK 1.7.37: reject recognizable secret text in publicly readable rotation values; no employee Auth.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.37';
const BUILD='v1.7.37-rotationtext1';
const read=path=>fs.readFileSync(path,'utf8');
function change(path,transform){const before=read(path);const after=transform(before);if(after!==before)fs.writeFileSync(path,after,'utf8');return after;}
function swap(source,before,after,label){
 if(source.includes(before)){
  assert.equal(source.split(before).length,2,'[17037] duplicate anchor '+label);
  return source.replace(before,after);
 }
 assert(source.includes(after),'[17037] missing anchor '+label);
 return source;
}
const migration=read('supabase/migrations/20260919081521_rak_public_rotation_reject_secret_text_values.sql');
const matrix=read('tools/security-rotation-public-text-matrix.sql');
const privacy=read('PUBLIC_ROTATION_PRIVACY.md');
const policy=read('EMPLOYEE_AUTH_CUTOVER.md');
assert(migration.includes('rak_rotation_has_restricted_public_value')&&migration.includes('rak_rotation_no_public_secret_fields_v2')&&migration.includes('REVOKE ALL')&&migration.includes('DROP CONSTRAINT rak_rotation_no_public_secret_fields_v1')&&migration.includes('bearer'),'[17037] text value migration incomplete');
assert(matrix.includes('v_rejected<>16')&&matrix.includes('SET LOCAL ROLE anon;')&&matrix.includes('ROLLBACK;')&&matrix.includes('rak_lookup_account_for_login_v1(text)'),'[17037] text value regression missing');
assert(privacy.includes('nepozná citlivou informaci')&&privacy.includes('1.7.37')&&privacy.includes('anonymně čitelná')&&privacy.includes('main')&&policy.includes('OS_ONLY_POLICY_20260919'),'[17037] OS-only privacy guardrails missing');
change('tools/shift-report-mo-hotfix-170-smoke.mjs',source=>{
 if(source.includes('// RAK_17037_TWO_PASS_GUARD'))return source;
 source=swap(source,
  "const already17036=indexSource.includes(\"var build='v1.7.36-rotationprivacy1';\");",
  "// RAK_17037_TWO_PASS_GUARD\nconst already17037=indexSource.includes(\"var build='v1.7.37-rotationtext1';\");\nconst already17036=already17037||indexSource.includes(\"var build='v1.7.36-rotationprivacy1';\");",
  'two-pass detection');
 return swap(source,
  "already17036?\"var build='v1.7.36-rotationprivacy1';\":already17035?",
  "already17037?\"var build='v1.7.37-rotationtext1';\":already17036?\"var build='v1.7.36-rotationprivacy1';\":already17035?",
  'two-pass marker reset');
});
change('supabase-config.js',source=>{
 assert(source.includes('https://cgshssdjgzzuprlwnabl.supabase.co')&&!source.includes('bkqamcbkiwumsvelahxr'),'[17037] TEST Supabase isolation');
 source=swap(source,'window.RAK_RELEASE_VERSION = "1.7.36";',`window.RAK_RELEASE_VERSION = "${VERSION}";`,'release');
 source=swap(source,'window.RAK_TEST_DISPLAY_VERSION = "1.7.36";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`,'display');
 return swap(source,'window.RAK_PWA_BUILD = "v1.7.36-rotationprivacy1";',`window.RAK_PWA_BUILD = "${BUILD}";`,'PWA build');
});
change('app.js',source=>{
 source=swap(source,'const RAK_DEV_UPDATE_BUILD = "v1.7.36-rotationprivacy1";',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`,'app build');
 return swap(source,'window.RAK_RELEASE_VERSION = "1.7.36";',`window.RAK_RELEASE_VERSION = "${VERSION}";`,'app release');
});
change('sw.js',source=>{
 assert(source.includes("const SW_APP_VERSION = '1.7.0';"),'[17037] technical version changed');
 source=swap(source,"const CACHE_VERSION = 'v1.7.36';",`const CACHE_VERSION = 'v${VERSION}';`,'cache');
 source=swap(source,"const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.36';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`,'worker display');
 return swap(source,"const DEVELOPMENT_BUILD_ID = 'v1.7.36-rotationprivacy1';",`const DEVELOPMENT_BUILD_ID = '${BUILD}';`,'worker build');
});
change('index.html',source=>swap(source,"var build='v1.7.36-rotationprivacy1';",`var build='${BUILD}';`,'HTML build'));
assert.equal(JSON.parse(read('package.json')).version,'1.7.0','[17037] technical package version changed');
for(const path of ['tools/development-version-17037.mjs','tools/shift-report-mo-hotfix-170-smoke.mjs','supabase-config.js','app.js','sw.js'])execFileSync(process.execPath,['--check',path],{stdio:'pipe'});
assert(read('index.html').includes(`var build='${BUILD}';`)&&read('sw.js').includes(`const CACHE_VERSION = 'v${VERSION}';`),'[17037] build/cache mismatch');
console.log('[development-version-17037] OK: OS-only login, validated rotation key+value guard, TEST Supabase, build 1.7.37');
