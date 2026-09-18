#!/usr/bin/env node
// RaK 1.7.29: account table privacy cutover and limited anonymous lookup (test only).
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.29';
const BUILD='v1.7.29-accountprivacy1';
const read=path=>fs.readFileSync(path,'utf8');
function change(path,transform){const before=read(path);const after=transform(before);if(after!==before)fs.writeFileSync(path,after,'utf8');return after;}
function swap(source,oldValue,newValue,label){
  if(source.includes(oldValue)){
    assert.equal(source.split(oldValue).length,2,'[17029] non-unique anchor: '+label);
    return source.replace(oldValue,newValue);
  }
  assert(source.includes(newValue),'[17029] missing anchor: '+label);
  return source;
}
const migration=read('supabase/migrations/20260918180344_rak_cut_over_account_privacy_and_limit_public_lookup.sql');
assert(migration.includes('REVOKE SELECT ON TABLE public.game_accounts FROM anon, authenticated;') && migration.includes('DROP POLICY IF EXISTS rak_game_accounts_public_read_v2'), '[17029] public bulk account cutover not tracked');
assert(migration.includes('v_global > 300') && migration.includes('v_per_caller > 60') && migration.includes('private.rak_login_lookup_salt'), '[17029] bounded lookup migration missing');
change('rak-account-access.js',source=>swap(source,
  "result && result.reason === 'ambiguous' ? 'Číslo není jednoznačné. Obrať se na správce.' : 'Ověření se nepodařilo. Zkus to znovu.'",
  "result && result.reason === 'ambiguous' ? 'Číslo není jednoznačné. Obrať se na správce.' : result && result.reason === 'rate-limited' ? 'Příliš mnoho pokusů. Zkus to později.' : 'Ověření se nepodařilo. Zkus to znovu.'",
  'rate-limit login feedback'));
change('tools/shift-report-mo-hotfix-170-smoke.mjs',source=>{
  if(source.includes('// RAK_17029_TWO_PASS_GUARD'))return source;
  source=swap(source,
    'const already17028=indexSource.includes("var build=\'v1.7.28-rotationprivacy1\';");',
    '// RAK_17029_TWO_PASS_GUARD\nconst already17029=indexSource.includes("var build=\'v1.7.29-accountprivacy1\';");\nconst already17028=already17029||indexSource.includes("var build=\'v1.7.28-rotationprivacy1\';");',
    'second-pass detection');
  return swap(source,
    'already17028?"var build=\'v1.7.28-rotationprivacy1\';":already17027?',
    'already17029?"var build=\'v1.7.29-accountprivacy1\';":already17028?"var build=\'v1.7.28-rotationprivacy1\';":already17027?',
    'second-pass reset');
});
change('supabase-config.js',source=>{
  assert(source.includes('https://cgshssdjgzzuprlwnabl.supabase.co')&&!source.includes('bkqamcbkiwumsvelahxr'),'[17029] test Supabase isolation');
  source=swap(source,'window.RAK_RELEASE_VERSION = "1.7.28";',`window.RAK_RELEASE_VERSION = "${VERSION}";`,'release');
  source=swap(source,'window.RAK_TEST_DISPLAY_VERSION = "1.7.28";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`,'display');
  return swap(source,'window.RAK_PWA_BUILD = "v1.7.28-rotationprivacy1";',`window.RAK_PWA_BUILD = "${BUILD}";`,'PWA build');
});
change('app.js',source=>{
  source=swap(source,'const RAK_DEV_UPDATE_BUILD = "v1.7.28-rotationprivacy1";',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`,'update build');
  return swap(source,'window.RAK_RELEASE_VERSION = "1.7.28";',`window.RAK_RELEASE_VERSION = "${VERSION}";`,'app release');
});
change('sw.js',source=>{
  assert(source.includes("const SW_APP_VERSION = '1.7.0';"),'[17029] technical version changed');
  source=swap(source,"const CACHE_VERSION = 'v1.7.28';",`const CACHE_VERSION = 'v${VERSION}';`,'cache');
  source=swap(source,"const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.28';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`,'worker display');
  return swap(source,"const DEVELOPMENT_BUILD_ID = 'v1.7.28-rotationprivacy1';",`const DEVELOPMENT_BUILD_ID = '${BUILD}';`,'worker build');
});
change('index.html',source=>swap(source,"var build='v1.7.28-rotationprivacy1';",`var build='${BUILD}';`,'HTML version'));
assert.equal(JSON.parse(read('package.json')).version,'1.7.0','[17029] technical package version');
for(const path of ['rak-account-access.js','tools/shift-report-mo-hotfix-170-smoke.mjs','supabase-config.js','app.js','sw.js'])execFileSync(process.execPath,['--check',path],{stdio:'pipe'});
assert(read('rak-account-access.js').includes('Příliš mnoho pokusů. Zkus to později.')&&!read('rak-account-access.js').includes(".from('game_accounts')"),'[17029] login feedback or directory cutover missing');
assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v1'")&&!read('rak-user-profile.js').includes(".from('game_accounts')"),'[17029] login direct read regression');
assert(read('index.html').includes(`var build='${BUILD}';`)&&read('sw.js').includes(`const CACHE_VERSION = 'v${VERSION}';`),'[17029] release/cache mismatch');
console.log('[development-version-17029] OK: account bulk SELECT cutover, bounded login RPC, clear retry message, test Supabase only, visible 1.7.29 and new SW cache');
await import('./development-version-17030.mjs');
