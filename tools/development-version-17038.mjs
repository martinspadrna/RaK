#!/usr/bin/env node
// RaK 1.7.38: remove publicly readable admin author ID; preserve OS-only login and private audit.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.38';
const BUILD='v1.7.38-actorprivacy1';
const read=path=>fs.readFileSync(path,'utf8');
function change(path,transform){const before=read(path);const after=transform(before);if(after!==before)fs.writeFileSync(path,after,'utf8');return after;}
function swap(source,before,after,label){
 if(source.includes(before)){
  assert.equal(source.split(before).length,2,'[17038] duplicate anchor '+label);
  return source.replace(before,after);
 }
 assert(source.includes(after),'[17038] missing anchor '+label);
 return source;
}
const migration=read('supabase/history/non-production-migrations/20260919085101_rak_public_rotation_remove_admin_actor_metadata.sql');
const matrix=read('tools/security-rotation-public-actor-matrix.sql');
const policy=read('EMPLOYEE_AUTH_CUTOVER.md');
const doc=read('PUBLIC_ROTATION_ACTOR_PRIVACY.md');
assert(migration.includes('rak_rotation_strip_public_actor_meta_v1')&&migration.includes('rak_rotation_no_public_actor_meta_v1')&&migration.includes("meta = meta - 'savedBy'")&&migration.includes('SECURITY INVOKER')&&migration.includes('REVOKE ALL'),'[17038] actor removal migration missing');
assert(matrix.includes('rak_admin_save_rotation_v2')&&matrix.includes('Private authorship audit lost')&&matrix.includes('SET LOCAL ROLE anon;')&&matrix.includes('ROLLBACK;'),'[17038] owner/anon regression missing');
assert(policy.includes('OS_ONLY_POLICY_20260919')&&doc.includes('24 měsíců')&&doc.includes('offline')&&doc.includes('main'),'[17038] OS-only privacy limits missing');
change('tools/shift-report-mo-hotfix-170-smoke.mjs',source=>{
 if(source.includes('// RAK_17038_TWO_PASS_GUARD'))return source;
 source=swap(source,
  "const already17037=indexSource.includes(\"var build='v1.7.37-rotationtext1';\");",
  "// RAK_17038_TWO_PASS_GUARD\nconst already17038=indexSource.includes(\"var build='v1.7.38-actorprivacy1';\");\nconst already17037=already17038||indexSource.includes(\"var build='v1.7.37-rotationtext1';\");",
  'two-pass detection');
 return swap(source,
  "already17037?\"var build='v1.7.37-rotationtext1';\":already17036?",
  "already17038?\"var build='v1.7.38-actorprivacy1';\":already17037?\"var build='v1.7.37-rotationtext1';\":already17036?",
  'two-pass reset');
});
change('supabase-config.js',source=>{
 assert(source.includes('https://cgshssdjgzzuprlwnabl.supabase.co')&&!source.includes('bkqamcbkiwumsvelahxr'),'[17038] TEST Supabase isolation');
 source=swap(source,'window.RAK_RELEASE_VERSION = "1.7.37";',`window.RAK_RELEASE_VERSION = "${VERSION}";`,'release');
 source=swap(source,'window.RAK_TEST_DISPLAY_VERSION = "1.7.37";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`,'display');
 return swap(source,'window.RAK_PWA_BUILD = "v1.7.37-rotationtext1";',`window.RAK_PWA_BUILD = "${BUILD}";`,'PWA build');
});
change('app.js',source=>{
 source=swap(source,'const RAK_DEV_UPDATE_BUILD = "v1.7.37-rotationtext1";',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`,'app build');
 return swap(source,'window.RAK_RELEASE_VERSION = "1.7.37";',`window.RAK_RELEASE_VERSION = "${VERSION}";`,'app release');
});
change('sw.js',source=>{
 assert(source.includes("const SW_APP_VERSION = '1.7.0';"),'[17038] technical version changed');
 source=swap(source,"const CACHE_VERSION = 'v1.7.37';",`const CACHE_VERSION = 'v${VERSION}';`,'cache');
 source=swap(source,"const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.37';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`,'worker display');
 return swap(source,"const DEVELOPMENT_BUILD_ID = 'v1.7.37-rotationtext1';",`const DEVELOPMENT_BUILD_ID = '${BUILD}';`,'worker build');
});
change('index.html',source=>swap(source,"var build='v1.7.37-rotationtext1';",`var build='${BUILD}';`,'HTML build'));
assert.equal(JSON.parse(read('package.json')).version,'1.7.0','[17038] technical package version changed');
for(const path of ['tools/development-version-17038.mjs','tools/shift-report-mo-hotfix-170-smoke.mjs','supabase-config.js','app.js','sw.js'])execFileSync(process.execPath,['--check',path],{stdio:'pipe'});
assert(read('index.html').includes(`var build='${BUILD}';`)&&read('sw.js').includes(`const CACHE_VERSION = 'v${VERSION}';`),'[17038] build/cache mismatch');
console.log('[development-version-17038] OK: private authorship audit, public actor stripped, OS-only login, test PWA 1.7.38');
await import('./development-version-17039.mjs');
