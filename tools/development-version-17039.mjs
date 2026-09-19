#!/usr/bin/env node
// RaK 1.7.39: one consolidated release-integrity, privacy-regression and 13-task-progress bundle.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import { assertReleaseSnapshot, RELEASE } from './release-gate-17039.mjs';
const {version:VERSION,build:BUILD}=RELEASE;
const read=path=>fs.readFileSync(path,'utf8');
function change(path,transform){const before=read(path);const after=transform(before);if(after!==before)fs.writeFileSync(path,after,'utf8');return after;}
function swap(source,before,after,label){
 if(source.includes(before)){
  assert.equal(source.split(before).length,2,'[17039] duplicate anchor '+label);
  return source.replace(before,after);
 }
 assert(source.includes(after),'[17039] missing anchor '+label);
 return source;
}
const plan=read('RAK_PLAN_13.md');
const regression=read('tools/security-rotation-release-17039.sql');
const gate=read('tools/release-gate-17039.mjs');
const unit=read('tools/release-gate-17039.test.mjs');
assert(plan.includes('0/13')&&plan.includes('P2.4')&&plan.includes('OS číslo')&&plan.includes('main'),'[17039] honest 13-task plan missing');
assert(regression.includes('Public actor exposed')&&regression.includes('Employee directory leaked')&&regression.includes('ROLLBACK;'),'[17039] database privacy regression missing');
assert(gate.includes('assertReleaseSnapshot')&&unit.includes('node:test'),'[17039] quality gate or unit tests absent');
change('tools/shift-report-mo-hotfix-170-smoke.mjs',source=>{
 if(source.includes('// RAK_17039_TWO_PASS_GUARD'))return source;
 source=swap(source,
  "const already17038=indexSource.includes(\"var build='v1.7.38-actorprivacy1';\");",
  "// RAK_17039_TWO_PASS_GUARD\nconst already17039=indexSource.includes(\"var build='v1.7.39-releasegate1';\");\nconst already17038=already17039||indexSource.includes(\"var build='v1.7.38-actorprivacy1';\");",
  'two-pass detection');
 return swap(source,
  "already17038?\"var build='v1.7.38-actorprivacy1';\":already17037?",
  "already17039?\"var build='v1.7.39-releasegate1';\":already17038?\"var build='v1.7.38-actorprivacy1';\":already17037?",
  'two-pass marker reset');
});
change('supabase-config.js',source=>{
 assert(source.includes('https://cgshssdjgzzuprlwnabl.supabase.co')&&!source.includes('bkqamcbkiwumsvelahxr'),'[17039] TEST Supabase isolation');
 source=swap(source,'window.RAK_RELEASE_VERSION = "1.7.38";',`window.RAK_RELEASE_VERSION = "${VERSION}";`,'release');
 source=swap(source,'window.RAK_TEST_DISPLAY_VERSION = "1.7.38";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`,'display');
 return swap(source,'window.RAK_PWA_BUILD = "v1.7.38-actorprivacy1";',`window.RAK_PWA_BUILD = "${BUILD}";`,'PWA build');
});
change('app.js',source=>{
 source=swap(source,'const RAK_DEV_UPDATE_BUILD = "v1.7.38-actorprivacy1";',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`,'app build');
 return swap(source,'window.RAK_RELEASE_VERSION = "1.7.38";',`window.RAK_RELEASE_VERSION = "${VERSION}";`,'app release');
});
change('sw.js',source=>{
 assert(source.includes("const SW_APP_VERSION = '1.7.0';"),'[17039] technical version changed');
 source=swap(source,"const CACHE_VERSION = 'v1.7.38';",`const CACHE_VERSION = 'v${VERSION}';`,'cache');
 source=swap(source,"const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.38';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`,'worker display');
 return swap(source,"const DEVELOPMENT_BUILD_ID = 'v1.7.38-actorprivacy1';",`const DEVELOPMENT_BUILD_ID = '${BUILD}';`,'worker build');
});
change('index.html',source=>swap(source,"var build='v1.7.38-actorprivacy1';",`var build='${BUILD}';`,'HTML build'));
const paths=['index.html','supabase-config.js','app.js','sw.js','package.json','RAK_PLAN_13.md',
 'EMPLOYEE_AUTH_CUTOVER.md','PUBLIC_ROTATION_ACTOR_PRIVACY.md',
 'tools/security-rotation-release-17039.sql','tools/shift-report-mo-hotfix-170-smoke.mjs'];
const files=Object.fromEntries(paths.map(path=>[path,read(path)]));
const result=assertReleaseSnapshot(files);
for(const path of ['tools/development-version-17039.mjs','tools/release-gate-17039.mjs','tools/release-gate-17039.test.mjs',
 'tools/shift-report-mo-hotfix-170-smoke.mjs','supabase-config.js','app.js','sw.js'])execFileSync(process.execPath,['--check',path],{stdio:'pipe'});
execFileSync(process.execPath,['--test','tools/release-gate-17039.test.mjs'],{stdio:'inherit'});
console.log(`[development-version-17039] OK: ${result.version}; ${result.taskCount} audit tasks; private author, public guard and OS-only regression; final PWA assets aligned`);
await import('./development-version-17040.mjs');
