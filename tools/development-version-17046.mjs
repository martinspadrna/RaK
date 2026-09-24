#!/usr/bin/env node
// RaK 1.7.46: thematic TEST-only telemetry and backup hardening; employee login remains OS-only.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.46', BUILD='v1.7.46-hardening1', PREVIOUS='v1.7.45-logingate1';
const read=file=>fs.readFileSync(file,'utf8');
function swap(source,before,after,label){
  // 1.7.47 second-build compatibility: later historical gate files are already
  // at their checked 1.7.47 target. Do not try to downgrade them to 1.7.46.
  if(source.includes('(43|44|45|46|47)')||source.includes('(45|46|47)')) return source;
  if(source.includes(before)){
    assert.equal(source.split(before).length,2,'[17046] duplicate '+label);
    return source.replace(before,after);
  }
  assert(source.includes(after),'[17046] missing '+label);
  return source;
}
function change(file,fn){const before=read(file),after=fn(before);if(before!==after)fs.writeFileSync(file,after,'utf8');return after;}
const migration=read('supabase/history/non-production-migrations/20260919145342_rak_17046_telemetry_admission_and_backup_integrity.sql');
const matrix=read('tools/telemetry-backup-matrix-17046.sql');
assert(migration.includes('telemetry-keepalive-global-v1') && migration.includes('v_hits > 6000') && migration.includes('rak_rotation_backup_structure_v1'), '[17046] SQL protections absent');
assert(migration.includes("'15 seconds'") && migration.includes("'build','online','reason','timezone','transport'"), '[17046] telemetry allowlist missing');
assert(matrix.includes('SET LOCAL ROLE anon;') && matrix.includes('ROLLBACK;') && matrix.includes('global anonymous quota did not fail closed'), '[17046] rollback test missing');
// Old security gates also run against the final version after CI's second build.
// Expand their recognized versions without disabling any historical assertions.
change('tools/release-gate-17043.test.mjs',source=>{
  source=swap(source,'(43|44|45)','(43|44|45|46)','inherited build range');
  source=swap(source,"'1.7.45': 'v1.7.45-logingate1'","'1.7.45': 'v1.7.45-logingate1',\n  '1.7.46': 'v1.7.46-hardening1'",'inherited build allowlist');
  source=swap(source,"if (version === '1.7.45') ids.push('17045');","if (version === '1.7.45' || version === '1.7.46') ids.push('17045');\n  if (version === '1.7.46') ids.push('17046');",'inherited guard list');
  source=swap(source,"  if (version === '1.7.45') {\n    assert(stage.includes('const already17044=already17045||indexSource.includes('));","  if (version === '1.7.46') {\n    assert(stage.includes('const already17045=already17046||indexSource.includes('));\n    assert(stage.includes(`already17046?\"var build='${build}';\":already17045?`));\n  } else if (version === '1.7.45') {\n    assert(stage.includes('const already17044=already17045||indexSource.includes('));",'inherited final guard');
  return source;
});
change('tools/release-gate-17045.test.mjs',source=>{
  source=swap(source,"const version = '1.7.45';\nconst build = 'v1.7.45-logingate1';","const matched = read('index.html').match(/var build='(v1\\.7\\.(45|46)-[a-z0-9]+)';/);\nassert(matched, 'Expected 1.7.45 or 1.7.46 build');\nconst version = '1.7.' + matched[2];\nconst build = matched[1];\nconst historicalBuild = 'v1.7.45-logingate1';\nassert.equal(build, version === '1.7.45' ? historicalBuild : 'v1.7.46-hardening1');",'historical login gate version');
  return swap(source,"  assert(stage.includes(`already17045?\"var build='${build}';\":already17044?`));","  assert(stage.includes(`already17045?\"var build='${historicalBuild}';\":already17044?`));\n  if (version === '1.7.46') assert(stage.includes(`already17046?\"var build='${build}';\":already17045?`));",'historical replay guard');
});
change('tools/shift-report-mo-hotfix-170-smoke.mjs',source=>{
  if(source.includes('// RAK_17046_TWO_PASS_GUARD'))return source;
  source=swap(source,`// RAK_17045_TWO_PASS_GUARD\nconst already17045=indexSource.includes("var build='${PREVIOUS}';");`,`// RAK_17045_TWO_PASS_GUARD\n// RAK_17046_TWO_PASS_GUARD\nconst already17046=indexSource.includes("var build='${BUILD}';");\nconst already17045=already17046||indexSource.includes("var build='${PREVIOUS}';");`,'replay detector');
  return swap(source,`already17045?"var build='${PREVIOUS}';":already17044?`,`already17046?"var build='${BUILD}';":already17045?"var build='${PREVIOUS}';":already17044?`,'replay marker');
});
change('supabase-config.js',source=>{
  assert(source.includes('https://cgshssdjgzzuprlwnabl.supabase.co')&&!source.includes('bkqamcbkiwumsvelahxr'),'[17046] TEST Supabase only');
  source=swap(source,'window.RAK_RELEASE_VERSION = "1.7.45";',`window.RAK_RELEASE_VERSION = "${VERSION}";`,'release');
  source=swap(source,'window.RAK_TEST_DISPLAY_VERSION = "1.7.45";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`,'display');
  return swap(source,`window.RAK_PWA_BUILD = "${PREVIOUS}";`,`window.RAK_PWA_BUILD = "${BUILD}";`,'PWA');
});
change('app.js',source=>{
  source=swap(source,`const RAK_DEV_UPDATE_BUILD = "${PREVIOUS}";`,`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`,'app build');
  return swap(source,'window.RAK_RELEASE_VERSION = "1.7.45";',`window.RAK_RELEASE_VERSION = "${VERSION}";`,'app release');
});
change('sw.js',source=>{
  assert(source.includes("const SW_APP_VERSION = '1.7.0';"),'[17046] technical version');
  source=swap(source,"const CACHE_VERSION = 'v1.7.45';",`const CACHE_VERSION = 'v${VERSION}';`,'cache');
  source=swap(source,"const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.45';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`,'worker display');
  return swap(source,`const DEVELOPMENT_BUILD_ID = '${PREVIOUS}';`,`const DEVELOPMENT_BUILD_ID = '${BUILD}';`,'worker build');
});
change('index.html',source=>swap(source,`var build='${PREVIOUS}';`,`var build='${BUILD}';`,'HTML build'));
const stage=read('tools/shift-report-mo-hotfix-170-smoke.mjs');
for(const id of ['17039','17040','17041','17042','17043','17044','17045','17046'])
  assert(stage.includes(`// RAK_${id}_TWO_PASS_GUARD`),'[17046] missing replay '+id);
assert(stage.includes(`const already17045=already17046||indexSource.includes("var build='${PREVIOUS}';");`)&&stage.includes(`already17046?"var build='${BUILD}';":already17045?`),'[17046] replay detector');
assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"),'[17046] OS login changed');
assert(read('rak-complete-backup.js').includes('RAK_PRIVATE_IMPORT_BACKUP_17042'),'[17046] owner backup lost');
for(const file of ['tools/development-version-17046.mjs','tools/release-gate-17043.test.mjs','tools/release-gate-17045.test.mjs','tools/shift-report-mo-hotfix-170-smoke.mjs','supabase-config.js','app.js','sw.js'])
  execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
execFileSync(process.execPath,['--test','tools/release-gate-17046.test.mjs'],{stdio:'inherit'});
console.log('[development-version-17046] OK telemetry budget + private payload, rotation backup structural integrity, inherited gates, OS-only login, TEST PWA 1.7.46');
await import('./development-version-17047.mjs');
