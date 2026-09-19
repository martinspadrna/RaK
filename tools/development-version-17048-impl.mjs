#!/usr/bin/env node
// RaK 1.7.48: admin sessions are tracked per Auth session; employee login stays OS-only.
// Runs AFTER the verified 1.7.47 stage. Safe to repeat after an entire second build.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.48',BUILD='v1.7.48-deviceauth1',PREVIOUS='v1.7.47-privacyguard1';
const read=file=>fs.readFileSync(file,'utf8');
function once(src,before,after,label){
 if(src.includes(before)){
  assert.equal(src.split(before).length,2,'[17048] repeated '+label);
  return src.replace(before,after);
 }
 assert(src.includes(after),'[17048] missing '+label);
 return src;
}
function edit(path,fn){const old=read(path);if(old.includes('// RAK_17048_COMPAT'))return old;const next=fn(old);if(next!==old)fs.writeFileSync(path,next,'utf8');return next;}
const sql1=read('supabase/migrations/20260919161000_rak_17048_admin_device_sessions_and_revocation.sql');
const sql2=read('supabase/migrations/20260919161500_rak_17048_admin_device_conflict_constraint_fix.sql');
const matrix=read('tools/admin-device-revocation-17048.sql');
for(const marker of ['rak_admin_devices_user_session_device_key','rak_current_admin_role',"INTERVAL '10 minutes'",'revoked_sessions'])
 assert(sql1.includes(marker),'[17048] primary migration missing '+marker);
assert(sql2.includes('ON CONFLICT ON CONSTRAINT rak_admin_devices_user_session_device_key') && matrix.includes('ROLLBACK;'), '[17048] correction / rollback fixture missing');
const plan=read('RAK_PLAN_13.md');
for(const marker of ['1/13 uzavřen rozhodnutím','0/13 plně technicky','OS číslo','anonymně čitelné'])
 assert(plan.includes(marker),'[17048] OS-only risk disposition lost '+marker);

// Preserve every historical gate: extend allowed releases, never remove old cases.
edit('tools/release-gate-17043.test.mjs',src=>{
 src=once(src,'(43|44|45|46|47)','(43|44|45|46|47|48)','17043 release range');
 src=once(src,"'1.7.47': 'v1.7.47-privacyguard1'","'1.7.47': 'v1.7.47-privacyguard1',\n  '1.7.48': 'v1.7.48-deviceauth1'",'17043 build allowlist');
 src=once(src,"if (version === '1.7.47') ids.push('17047');","if (version === '1.7.47' || version === '1.7.48') ids.push('17047');\n  if (version === '1.7.48') ids.push('17048');",'17043 replay coverage');
 src=once(src,"  if (version === '1.7.47') {\n    assert(stage.includes('const already17046=already17047||indexSource.includes('));",
  "  if (version === '1.7.48') {\n    assert(stage.includes('const already17047=already17048||indexSource.includes('));\n    assert(stage.includes(`already17048?\"var build='${build}';\":already17047?`));\n  } else if (version === '1.7.47') {\n    assert(stage.includes('const already17046=already17047||indexSource.includes('));",'17043 final replay');
 return src+'\n// RAK_17048_COMPAT historical transformer markers: (43|44|45|46|47) (45|46|47) (46|47)\n';
});
edit('tools/release-gate-17045.test.mjs',src=>{
 src=once(src,'(45|46|47)','(45|46|47|48)','17045 release range');
 src=once(src," : 'v1.7.47-privacyguard1');"," : version === '1.7.47' ? 'v1.7.47-privacyguard1' : 'v1.7.48-deviceauth1');",'17045 allowlist');
 src=once(src,"if (version === '1.7.46' || version === '1.7.47') assert(stage.includes(","if (version === '1.7.46' || version === '1.7.47' || version === '1.7.48') assert(stage.includes(",'17045 historical 17046');
 src=once(src,"  if (version === '1.7.47') assert(stage.includes(`already17047?\"var build='${build}';\":already17046?`));",
  "  if (version === '1.7.47' || version === '1.7.48') assert(stage.includes(`already17047?\"var build='${'v1.7.47-privacyguard1'}';\":already17046?`));\n  if (version === '1.7.48') assert(stage.includes(`already17048?\"var build='${build}';\":already17047?`));",'17045 preserved replay');
 return src+'\n// RAK_17048_COMPAT historical transformer markers: (43|44|45|46|47) (45|46|47) (46|47)\n';
});
edit('tools/release-gate-17046.test.mjs',src=>{
 src=once(src,'(46|47)','(46|47|48)','17046 release range');
 src=once(src,"VERSION==='1.7.46'?HISTORICAL_BUILD:'v1.7.47-privacyguard1'","VERSION==='1.7.46'?HISTORICAL_BUILD:VERSION==='1.7.47'?'v1.7.47-privacyguard1':'v1.7.48-deviceauth1'",'17046 build allowlist');
 src=once(src,"VERSION==='1.7.47'?['17039'","(VERSION==='1.7.47'||VERSION==='1.7.48')?['17039'",'17046 historical replay list');
 src=once(src,"if(VERSION==='1.7.47')assert(stage.includes(`already17047?\"var build='${BUILD}';\":already17046?`));",
  "if(VERSION==='1.7.47'||VERSION==='1.7.48')assert(stage.includes(`already17047?\"var build='${'v1.7.47-privacyguard1'}';\":already17046?`));\n if(VERSION==='1.7.48')assert(stage.includes(`already17048?\"var build='${BUILD}';\":already17047?`));",'17046 preserved replay');
 return src+'\n// RAK_17048_COMPAT historical transformer markers: (43|44|45|46|47) (45|46|47) (46|47)\n';
});
edit('tools/release-gate-17047.test.mjs',src=>{
 src=once(src,"const VERSION='1.7.47', BUILD='v1.7.47-privacyguard1';",
  "const found=read('index.html').match(/var build='(v1\\.7\\.(47|48)-[a-z0-9]+)';/);\nassert(found,'[17047] release not recognized');\nconst VERSION='1.7.'+found[2],BUILD=found[1],HISTORICAL_BUILD='v1.7.47-privacyguard1';\nassert.equal(BUILD,VERSION==='1.7.47'?HISTORICAL_BUILD:'v1.7.48-deviceauth1');",'17047 release detection');
 src=once(src,"  assert(stage.includes(`already17047?\"var build='${BUILD}';\":already17046?`));",
  "  assert(stage.includes(`already17047?\"var build='${HISTORICAL_BUILD}';\":already17046?`));\n  if(VERSION==='1.7.48')assert(stage.includes(`already17048?\"var build='${BUILD}';\":already17047?`));",'17047 replay chain');
 src=once(src,"assert(read('tools/release-gate-17043.test.mjs').includes('(43|44|45|46|47)'));",
  "assert(read('tools/release-gate-17043.test.mjs').includes(VERSION==='1.7.48'?'(43|44|45|46|47|48)':'(43|44|45|46|47)'));",'17047 inherited 17043');
 src=once(src,"assert(read('tools/release-gate-17045.test.mjs').includes('(45|46|47)'));",
  "assert(read('tools/release-gate-17045.test.mjs').includes(VERSION==='1.7.48'?'(45|46|47|48)':'(45|46|47)'));",'17047 inherited 17045');
 src=once(src,"assert(read('tools/release-gate-17046.test.mjs').includes('(46|47)'));",
  "assert(read('tools/release-gate-17046.test.mjs').includes(VERSION==='1.7.48'?'(46|47|48)':'(46|47)'));",'17047 inherited 17046');
 return src+'\n// RAK_17048_COMPAT historical transformer markers: (43|44|45|46|47) (45|46|47) (46|47)\n';
});
edit('tools/shift-report-mo-hotfix-170-smoke.mjs',src=>{
 src=once(src,`// RAK_17047_TWO_PASS_GUARD\nconst already17047=indexSource.includes("var build='${PREVIOUS}';");`,
  `// RAK_17047_TWO_PASS_GUARD\n// RAK_17048_TWO_PASS_GUARD\nconst already17048=indexSource.includes("var build='${BUILD}';");\nconst already17047=already17048||indexSource.includes("var build='${PREVIOUS}';");`,'replay detector');
 return once(src,`already17047?"var build='${PREVIOUS}';":already17046?`,
  `already17048?"var build='${BUILD}';":already17047?"var build='${PREVIOUS}';":already17046?`,'replay marker');
});
edit('app-admin-unlock.js',src=>{
 src=once(src,'Odhlášení zařízení zruší jeho uloženou admin relaci.',
  'Odhlášení zařízení zruší všechny jeho admin relace, včetně dalších účtů v tomto prohlížeči. Nové přihlášení heslem je možné.','device scope text');
 src=once(src,'>Odhlásit toto</button>','>Odhlásit toto zařízení</button>','current-device label');
 return once(src,'>Odhlásit</button>','>Odhlásit zařízení</button>','device label');
});
function versioned(path,operations){return edit(path,src=>{for(const [before,after,label] of operations)src=once(src,before,after,label);return src;});}
versioned('supabase-config.js',[
 ['window.RAK_RELEASE_VERSION = "1.7.47";',`window.RAK_RELEASE_VERSION = "${VERSION}";`,'release'],
 ['window.RAK_TEST_DISPLAY_VERSION = "1.7.47";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`,'display'],
 [`window.RAK_PWA_BUILD = "${PREVIOUS}";`,`window.RAK_PWA_BUILD = "${BUILD}";`,'PWA']]);
versioned('app.js',[
 [`const RAK_DEV_UPDATE_BUILD = "${PREVIOUS}";`,`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`,'app build'],
 ['window.RAK_RELEASE_VERSION = "1.7.47";',`window.RAK_RELEASE_VERSION = "${VERSION}";`,'app version']]);
versioned('sw.js',[
 ["const CACHE_VERSION = 'v1.7.47';",`const CACHE_VERSION = 'v${VERSION}';`,'worker cache'],
 ["const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.47';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`,'worker display'],
 [`const DEVELOPMENT_BUILD_ID = '${PREVIOUS}';`,`const DEVELOPMENT_BUILD_ID = '${BUILD}';`,'worker build']]);
versioned('index.html',[[`var build='${PREVIOUS}';`,`var build='${BUILD}';`,'index build']]);
assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
for(const path of ['tools/development-version-17048.mjs','tools/release-gate-17043.test.mjs',
 'tools/release-gate-17045.test.mjs','tools/release-gate-17046.test.mjs','tools/release-gate-17047.test.mjs',
 'tools/shift-report-mo-hotfix-170-smoke.mjs','app-admin-unlock.js','supabase-config.js','app.js','sw.js'])
 execFileSync(process.execPath,['--check',path],{stdio:'pipe'});
for(const id of ['17043','17044','17045','17046','17047','17048'])
 execFileSync(process.execPath,['--test',`tools/release-gate-${id}.test.mjs`],{stdio:'inherit'});
console.log('[development-version-17048] OK per-session admin revocation, accepted OS-only risk, historical double-build guards and TEST PWA '+VERSION);
