#!/usr/bin/env node
// RaK 1.7.49: one thematic bundle (public-report privacy, RLS/RPC regression, OS-only policy).
// Runs after the 1.7.48 checks; idempotent on a complete second Vercel build.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.49', BUILD='v1.7.49-reportguard1', PREVIOUS='v1.7.48-deviceauth1';
const read=path=>fs.readFileSync(path,'utf8');
function once(src,before,after,label){
 if(src.includes(before)){
  assert.equal(src.split(before).length,2,'[17049] duplicate '+label);
  return src.replace(before,after);
 }
 assert(src.includes(after),'[17049] missing '+label);
 return src;
}
function edit(path,fn){
 const source=read(path);
 if(source.includes('// RAK_17049_COMPAT'))return source;
 const output=fn(source);
 if(output!==source)fs.writeFileSync(path,output,'utf8');
 return output;
}
function swapVersion(path,pairs){
 let src=read(path);
 for(const [oldValue,newValue] of pairs)src=once(src,oldValue,newValue,path);
 if(src!==read(path))fs.writeFileSync(path,src,'utf8');
}
const migration=read('supabase/migrations/20260919165000_rak_17049_bug_report_device_info_allowlist.sql');
const matrix=read('tools/bug-report-rls-matrix-17049.sql');
for(const marker of ['rak_bug_report_device_info_allowlist_v1','rak_bug_report_device_info_guard_v1',
 'REVOKE ALL','NEW.device_info','appearanceId','appearanceLabel','createdAtLocal','sourceId','viewport','online'])
 assert(migration.includes(marker),'[17049] missing migration '+marker);
for(const marker of ['BEGIN;','ROLLBACK;','SET LOCAL ROLE anon;', 'private table granted to frontend',
 'private helper executable by anonymous role','anonymous machine settings privacy leak',
 'sensitive nested device metadata persisted','duplicate report was accepted','quota not enforced'])
 assert(matrix.includes(marker),'[17049] missing SQL matrix '+marker);
assert(!/\b(?:update|delete|truncate)\s+public\.rotation_state\b/i.test(migration+matrix),'[17049] cannot mutate rotation');

// These historical tests are deliberately run again at the final 1.7.49 build.
// Update their exact version/build allowlists, not the underlying security assertions.
edit('tools/release-gate-17043.test.mjs',src=>{
 src=once(src,'(43|44|45|46|47|48)','(43|44|45|46|47|48|49)','17043 release range');
 src=once(src,"'1.7.48': 'v1.7.48-deviceauth1'","'1.7.48': 'v1.7.48-deviceauth1',\n  '1.7.49': 'v1.7.49-reportguard1'",'17043 allowlist');
 src=once(src,"if (version === '1.7.48') ids.push('17048');","if (version === '1.7.48' || version === '1.7.49') ids.push('17048');\n  if (version === '1.7.49') ids.push('17049');",'17043 replay coverage');
 src=once(src,"  if (version === '1.7.48') {\n    assert(stage.includes('const already17047=already17048||indexSource.includes('));",
  "  if (version === '1.7.49') {\n    assert(stage.includes('const already17048=already17049||indexSource.includes('));\n    assert(stage.includes(`already17049?\"var build='${build}';\":already17048?`));\n  } else if (version === '1.7.48') {\n    assert(stage.includes('const already17047=already17048||indexSource.includes('));",'17043 final replay');
 return src+'\n// RAK_17049_COMPAT: inherited checks retained, (43|44|45|46|47|48).\n';
});
edit('tools/release-gate-17045.test.mjs',src=>{
 src=once(src,'(45|46|47|48)','(45|46|47|48|49)','17045 release range');
 src=once(src," : 'v1.7.48-deviceauth1');"," : version === '1.7.48' ? 'v1.7.48-deviceauth1' : 'v1.7.49-reportguard1');",'17045 allowlist');
 src=once(src,"version === '1.7.47' || version === '1.7.48'","version === '1.7.47' || version === '1.7.48' || version === '1.7.49'",'17045 old replay');
 src=once(src,"  if (version === '1.7.48') assert(stage.includes(`already17048?\"var build='${build}';\":already17047?`));",
  "  if (version === '1.7.48' || version === '1.7.49') assert(stage.includes(`already17048?\"var build='${'v1.7.48-deviceauth1'}';\":already17047?`));\n  if (version === '1.7.49') assert(stage.includes(`already17049?\"var build='${build}';\":already17048?`));",'17045 final replay');
 return src+'\n// RAK_17049_COMPAT: inherited login gate, (45|46|47|48).\n';
});
edit('tools/release-gate-17046.test.mjs',src=>{
 src=once(src,'(46|47|48)','(46|47|48|49)','17046 release range');
 src=once(src,":'v1.7.48-deviceauth1'",":VERSION==='1.7.48'?'v1.7.48-deviceauth1':'v1.7.49-reportguard1'",'17046 allowlist');
 src=once(src,"VERSION==='1.7.47'||VERSION==='1.7.48'","VERSION==='1.7.47'||VERSION==='1.7.48'||VERSION==='1.7.49'",'17046 replay range');
 src=once(src,"if(VERSION==='1.7.48')assert(stage.includes(`already17048?\"var build='${BUILD}';\":already17047?`));",
  "if(VERSION==='1.7.48'||VERSION==='1.7.49')assert(stage.includes(`already17048?\"var build='${'v1.7.48-deviceauth1'}';\":already17047?`));\n if(VERSION==='1.7.49')assert(stage.includes(`already17049?\"var build='${BUILD}';\":already17048?`));",'17046 final replay');
 return src+'\n// RAK_17049_COMPAT: historical report constraints, (46|47|48).\n';
});
edit('tools/release-gate-17047.test.mjs',src=>{
 src=once(src,'(47|48)','(47|48|49)','17047 release range');
 src=once(src,"VERSION==='1.7.47'?HISTORICAL_BUILD:'v1.7.48-deviceauth1'",
  "VERSION==='1.7.47'?HISTORICAL_BUILD:VERSION==='1.7.48'?'v1.7.48-deviceauth1':'v1.7.49-reportguard1'",'17047 allowlist');
 src=once(src,"if(VERSION==='1.7.48')assert(stage.includes(`already17048?\"var build='${BUILD}';\":already17047?`));",
  "if(VERSION==='1.7.48'||VERSION==='1.7.49')assert(stage.includes(`already17048?\"var build='${'v1.7.48-deviceauth1'}';\":already17047?`));\n  if(VERSION==='1.7.49')assert(stage.includes(`already17049?\"var build='${BUILD}';\":already17048?`));",'17047 final replay');
 src=once(src,"VERSION==='1.7.48'?'(43|44|45|46|47|48)':'(43|44|45|46|47)'",
  "VERSION==='1.7.49'?'(43|44|45|46|47|48|49)':VERSION==='1.7.48'?'(43|44|45|46|47|48)':'(43|44|45|46|47)'",'17047 inherited 17043');
 src=once(src,"VERSION==='1.7.48'?'(45|46|47|48)':'(45|46|47)'",
  "VERSION==='1.7.49'?'(45|46|47|48|49)':VERSION==='1.7.48'?'(45|46|47|48)':'(45|46|47)'",'17047 inherited 17045');
 src=once(src,"VERSION==='1.7.48'?'(46|47|48)':'(46|47)'",
  "VERSION==='1.7.49'?'(46|47|48|49)':VERSION==='1.7.48'?'(46|47|48)':'(46|47)'",'17047 inherited 17046');
 return src+'\n// RAK_17049_COMPAT: historical privacy and offline tests retained.\n';
});
edit('tools/release-gate-17048.test.mjs',src=>{
 src=once(src,"const VERSION='1.7.48',BUILD='v1.7.48-deviceauth1';",
  "const matched=read('index.html').match(/var build='(v1\\.7\\.(48|49)-[a-z0-9]+)';/);\nassert(matched,'[17048] version must be 1.7.48 or 1.7.49');\nconst VERSION='1.7.'+matched[2],BUILD=matched[1],HISTORICAL_BUILD='v1.7.48-deviceauth1';\nassert.equal(BUILD,VERSION==='1.7.48'?HISTORICAL_BUILD:'v1.7.49-reportguard1');",'17048 release range');
 src=once(src," assert(stage.includes(`already17048?\"var build='${BUILD}';\":already17047?`));",
  " assert(stage.includes(`already17048?\"var build='${HISTORICAL_BUILD}';\":already17047?`));\n if(VERSION==='1.7.49')assert(stage.includes(`already17049?\"var build='${BUILD}';\":already17048?`));",'17048 replay chain');
 return src+'\n// RAK_17049_COMPAT: device revocation assertions unchanged.\n';
});
edit('tools/shift-report-mo-hotfix-170-smoke.mjs',src=>{
 src=once(src,`// RAK_17048_TWO_PASS_GUARD\nconst already17048=indexSource.includes("var build='${PREVIOUS}';");`,
  `// RAK_17048_TWO_PASS_GUARD\n// RAK_17049_TWO_PASS_GUARD\nconst already17049=indexSource.includes("var build='${BUILD}';");\nconst already17048=already17049||indexSource.includes("var build='${PREVIOUS}';");`,'new replay detector');
 return once(src,`already17048?"var build='${PREVIOUS}';":already17047?`,
  `already17049?"var build='${BUILD}';":already17048?"var build='${PREVIOUS}';":already17047?`,'new replay marker');
});
swapVersion('supabase-config.js',[
 ['window.RAK_RELEASE_VERSION = "1.7.48";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['window.RAK_TEST_DISPLAY_VERSION = "1.7.48";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`],
 [`window.RAK_PWA_BUILD = "${PREVIOUS}";`,`window.RAK_PWA_BUILD = "${BUILD}";`]]);
swapVersion('app.js',[
 [`const RAK_DEV_UPDATE_BUILD = "${PREVIOUS}";`,`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],
 ['window.RAK_RELEASE_VERSION = "1.7.48";',`window.RAK_RELEASE_VERSION = "${VERSION}";`]]);
swapVersion('sw.js',[
 ["const CACHE_VERSION = 'v1.7.48';",`const CACHE_VERSION = 'v${VERSION}';`],
 ["const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.48';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],
 [`const DEVELOPMENT_BUILD_ID = '${PREVIOUS}';`,`const DEVELOPMENT_BUILD_ID = '${BUILD}';`]]);
swapVersion('index.html',[[`var build='${PREVIOUS}';`,`var build='${BUILD}';`]]);
assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl') && !read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'),'[17049] production DB forbidden');
assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"),'[17049] employee login must remain OS-only');
for(const file of ['tools/development-version-17049.mjs','tools/shift-report-mo-hotfix-170-smoke.mjs','supabase-config.js','app.js','sw.js',
 'tools/release-gate-17043.test.mjs','tools/release-gate-17045.test.mjs','tools/release-gate-17046.test.mjs',
 'tools/release-gate-17047.test.mjs','tools/release-gate-17048.test.mjs'])
 execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
for(const id of ['17043','17044','17045','17046','17047','17048','17049'])
 execFileSync(process.execPath,['--test',`tools/release-gate-${id}.test.mjs`],{stdio:'inherit'});
console.log('[development-version-17049] OK: public report device allowlist, anon RLS matrix, quota, OS-only login and two-pass PWA '+VERSION);
