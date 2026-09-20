#!/usr/bin/env node
// RaK 1.7.48: first pass full security release; second pass restores final markers.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const read=path=>fs.readFileSync(path,'utf8');
const stage=read('tools/shift-report-mo-hotfix-170-smoke.mjs');
if(!stage.includes('// RAK_17048_TWO_PASS_GUARD')) {
 await import('./development-version-17048-impl.mjs');
} else {
 const OLD_VERSION='1.7.47',VERSION='1.7.48';
 const OLD_BUILD='v1.7.47-privacyguard1',BUILD='v1.7.48-deviceauth1';
 function preserve(path,replacements){
  let source=read(path);
  for(const [before,after] of replacements){
   if(source.includes(before)){
    assert.equal(source.split(before).length,2,'[17048] repeated marker '+path);
    source=source.replace(before,after);
   }else assert(source.includes(after),'[17048] lost final marker '+path+': '+after);
  }
  fs.writeFileSync(path,source,'utf8');
 }
 preserve('supabase-config.js',[
  [`window.RAK_RELEASE_VERSION = "${OLD_VERSION}";`,`window.RAK_RELEASE_VERSION = "${VERSION}";`],
  [`window.RAK_TEST_DISPLAY_VERSION = "${OLD_VERSION}";`,`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`],
  [`window.RAK_PWA_BUILD = "${OLD_BUILD}";`,`window.RAK_PWA_BUILD = "${BUILD}";`]]);
 preserve('app.js',[
  [`const RAK_DEV_UPDATE_BUILD = "${OLD_BUILD}";`,`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],
  [`window.RAK_RELEASE_VERSION = "${OLD_VERSION}";`,`window.RAK_RELEASE_VERSION = "${VERSION}";`]]);
 preserve('sw.js',[
  [`const CACHE_VERSION = 'v${OLD_VERSION}';`,`const CACHE_VERSION = 'v${VERSION}';`],
  [`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${OLD_VERSION}';`,`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],
  [`const DEVELOPMENT_BUILD_ID = '${OLD_BUILD}';`,`const DEVELOPMENT_BUILD_ID = '${BUILD}';`]]);
 preserve('index.html',[[`var build='${OLD_BUILD}';`,`var build='${BUILD}';`]]);
 assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
 assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
 for(const file of ['app.js','sw.js','supabase-config.js','app-admin-unlock.js'])execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
 for(const id of ['17043','17044','17045','17046','17047','17048'])execFileSync(process.execPath,['--test',`tools/release-gate-${id}.test.mjs`],{stdio:'inherit'});
 console.log('[development-version-17048] OK idempotent second build; final release and OS-only employee login intact');
}
await import('./development-version-17049.mjs');
await import('./development-version-17050.mjs');
await import('./development-version-17051.mjs');
await import('./development-version-17052.mjs');
// Historical gates run before the next version bump on BOTH full builds.
execFileSync(process.execPath,['--test','tools/release-gate-17052.test.mjs'],{stdio:'inherit'});
await import('./development-version-17053.mjs');
execFileSync(process.execPath,['--test','tools/release-gate-17053.test.mjs'],{stdio:'inherit'});
await import('./development-version-17054.mjs');
execFileSync(process.execPath,['--test','tools/release-gate-17054.test.mjs'],{stdio:'inherit'});
await import('./development-version-17055.mjs');
execFileSync(process.execPath,['--test','tools/release-gate-17055.test.mjs'],{stdio:'inherit'});
await import('./development-version-17056.mjs');
execFileSync(process.execPath,['--test','tools/release-gate-17056.test.mjs'],{stdio:'inherit'});
await import('./development-version-17057.mjs');
execFileSync(process.execPath,['--test','tools/release-gate-17057.test.mjs'],{stdio:'inherit'});
await import('./development-version-17058.mjs');
execFileSync(process.execPath,['--test','tools/release-gate-17058.test.mjs'],{stdio:'inherit'});
await import('./queue-held-reset-17059.mjs');
await import('./development-version-17059.mjs');
