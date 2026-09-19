#!/usr/bin/env node
// RaK 1.7.52: one coherent mobile/offline reliability bundle, after inherited gates.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.52',BUILD='v1.7.52-mobileoffline1',PREVIOUS='v1.7.51-archiveguard1';
const read=p=>fs.readFileSync(p,'utf8');
function change(file,before,after){
 const old=read(file);
 if(old.includes(before)){
  assert.equal(old.split(before).length,2,'[17052] ambiguous '+file);
  fs.writeFileSync(file,old.replace(before,after),'utf8');
 }else assert(old.includes(after),'[17052] missing '+file+': '+after.slice(0,100));
}
const conn=read('app-pwa-connectivity.js');
// The historical 1.7.01 stage already fixed release-based version matching;
// assert the effective built result instead of reapplying its source-only patch.
assert(conn.includes("const getAppVersionTag = () => String(window.RAK_TEST_DISPLAY_VERSION || window.RAK_RELEASE_VERSION || window.APP_VERSION || '').trim() || 'unknown';"),
 '[17052] legacy-version mismatch fix was lost');
assert(conn.includes("const testVersion = String(window.RAK_TEST_DISPLAY_VERSION || '').trim();")
 &&conn.includes("if (/^\\d+\\.\\d+\\.\\d+$/.test(testVersion)) return 'v' + testVersion;"),
 '[17052] development cache version must match actual worker');
// Do not retrieve fallback JS/CSS from a stale worker's differently versioned cache.
change('sw.js',
 "    const hit = await caches.match(request, { ignoreSearch: false });\n    if (hit || opts.exactOnly) return hit || null;\n    return await caches.match(request, { ignoreSearch: true });",
 "    const current = [await caches.open(STATIC_CACHE), await caches.open(RUNTIME_CACHE)];\n    for (const cache of current) {\n      const hit = await cache.match(request, { ignoreSearch: false });\n      if (hit) return hit;\n    }\n    if (opts.exactOnly) return null;\n    for (const cache of current) {\n      const hit = await cache.match(request, { ignoreSearch: true });\n      if (hit) return hit;\n    }\n    return null;");
// Don't replace a working installed SW with one that failed to precache BOTH entrypoints.
change('sw.js',
 "  }));\n  await Promise.allSettled(WARM_START.map(async url => {",
 "  }));\n  const offlineShell = await Promise.all([staticCache.match('./index.html'), staticCache.match('./')]);\n  if (!offlineShell.some(Boolean)) throw new Error('[RaK] missing offline shell; abort service-worker install');\n  await Promise.allSettled(WARM_START.map(async url => {");
const guard='tools/shift-report-mo-hotfix-170-smoke.mjs';
let stage=read(guard);
const oldGuard=`const already17051=indexSource.includes("var build='${PREVIOUS}';");`;
const newGuard=`// RAK_17052_TWO_PASS_GUARD\nconst already17052=indexSource.includes("var build='${BUILD}';");\nconst already17051=already17052||indexSource.includes("var build='${PREVIOUS}';");`;
const oldTail=`already17051?"var build='${PREVIOUS}';":already17050?`;
const newTail=`already17052?"var build='${BUILD}';":already17051?"var build='${PREVIOUS}';":already17050?`;
if(!stage.includes('// RAK_17052_TWO_PASS_GUARD')){
 assert(stage.includes(oldGuard)&&stage.includes(oldTail),'[17052] inherited replay anchors missing');
 stage=stage.replace(oldGuard,newGuard).replace(oldTail,newTail);
 fs.writeFileSync(guard,stage,'utf8');
}
assert(stage.includes(newTail)&&stage.includes('const old=already17021?'),'[17052] historical replay lost');
change('supabase-config.js','window.RAK_RELEASE_VERSION = "1.7.51";',`window.RAK_RELEASE_VERSION = "${VERSION}";`);
change('supabase-config.js','window.RAK_TEST_DISPLAY_VERSION = "1.7.51";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`);
change('supabase-config.js',`window.RAK_PWA_BUILD = "${PREVIOUS}";`,`window.RAK_PWA_BUILD = "${BUILD}";`);
change('app.js',`const RAK_DEV_UPDATE_BUILD = "${PREVIOUS}";`,`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`);
change('app.js','window.RAK_RELEASE_VERSION = "1.7.51";',`window.RAK_RELEASE_VERSION = "${VERSION}";`);
change('sw.js',"const CACHE_VERSION = 'v1.7.51';",`const CACHE_VERSION = 'v${VERSION}';`);
change('sw.js',"const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.51';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`);
change('sw.js',`const DEVELOPMENT_BUILD_ID = '${PREVIOUS}';`,`const DEVELOPMENT_BUILD_ID = '${BUILD}';`);
change('index.html',`var build='${PREVIOUS}';`,`var build='${BUILD}';`);
assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'),'[17052] TEST only');
assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"),'[17052] OS-only login changed');
for(const file of ['app-pwa-connectivity.js','sw.js','app.js','supabase-config.js',guard,'tools/development-version-17052.mjs','tools/pwa-offline-17052.test.mjs','tools/browser-offline-17052.mjs'])execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
execFileSync(process.execPath,['--test','tools/pwa-offline-17052.test.mjs'],{stdio:'inherit'});
console.log('[development-version-17052] PASS version mismatch guard, scoped caches, offline shell and TEST PWA '+VERSION);
