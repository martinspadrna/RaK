#!/usr/bin/env node
// RaK 1.7.52: correct PWA version, isolate caches, guard offline shell and test mobile browser.
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
const conn='app-pwa-connectivity.js';
change(conn,"  const getAppVersionTag = () => String(window.APP_VERSION || '').trim() || 'unknown';",
 "  // Legacy APP_VERSION stays 1.5; update checks must use the current release.\n  const getAppVersionTag = () => String(window.RAK_TEST_DISPLAY_VERSION || window.RAK_RELEASE_VERSION || window.APP_VERSION || '').trim() || 'unknown';");
change(conn,
 "    if (m) return 'v' + m[1] + '.' + m[2] + '-' + m[3];\n    return String(raw || '').replace(/^v\\./i, 'v').replace(/\\s*\\((\\d+)\\)\\s*$/, '-$1').replace(/\\s+/g, '');",
 "    if (m) return 'v' + m[1] + '.' + m[2] + '-' + m[3];\n    // A release such as 1.7.52 maps to the worker cache v1.7.52.\n    if (/^v?\\d+\\.\\d+\\.\\d+$/i.test(raw)) return 'v' + raw.replace(/^v/i, '');\n    return String(raw || '').replace(/^v\\./i, 'v').replace(/\\s*\\((\\d+)\\)\\s*$/, '-$1').replace(/\\s+/g, '');");
// Never recover an old cached JS/CSS asset from another worker's cache.
change('sw.js',
 "    const hit = await caches.match(request, { ignoreSearch: false });\n    if (hit || opts.exactOnly) return hit || null;\n    return await caches.match(request, { ignoreSearch: true });",
 "    const current = [await caches.open(STATIC_CACHE), await caches.open(RUNTIME_CACHE)];\n    for (const cache of current) {\n      const hit = await cache.match(request, { ignoreSearch: false });\n      if (hit) return hit;\n    }\n    if (opts.exactOnly) return null;\n    for (const cache of current) {\n      const hit = await cache.match(request, { ignoreSearch: true });\n      if (hit) return hit;\n    }\n    return null;");
change('sw.js',
 "  await Promise.allSettled(WARM_START.map(async url => {",
 "  // Abort install if neither offline entrypoint is cached; keep old active SW.\n  const offlineShell = await Promise.all([staticCache.match('./index.html'), staticCache.match('./')]);\n  if (!offlineShell.some(Boolean)) throw new Error('[RaK] missing offline shell; abort service-worker install');\n  await Promise.allSettled(WARM_START.map(async url => {");
const guard='tools/shift-report-mo-hotfix-170-smoke.mjs';
let stage=read(guard);
const oldGuard=`const already17051=indexSource.includes("var build='${PREVIOUS}';");`;
const newGuard=`// RAK_17052_TWO_PASS_GUARD\nconst already17052=indexSource.includes("var build='${BUILD}';");\nconst already17051=already17052||indexSource.includes("var build='${PREVIOUS}';");`;
const oldTail=`already17051?"var build='${PREVIOUS}';":already17050?`;
const newTail=`already17052?"var build='${BUILD}';":already17051?"var build='${PREVIOUS}';":already17050?`;
if(!stage.includes('// RAK_17052_TWO_PASS_GUARD')){
 assert(stage.includes(oldGuard)&&stage.includes(oldTail),'[17052] missing inherited replay anchors');
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
assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'),'[17052] TEST only');
assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"),'[17052] login changed');
for(const file of [conn,'sw.js','app.js','supabase-config.js',guard,'tools/development-version-17052.mjs','tools/pwa-offline-17052.test.mjs','tools/browser-offline-17052.mjs'])execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
execFileSync(process.execPath,['--test','tools/pwa-offline-17052.test.mjs'],{stdio:'inherit'});
console.log('[development-version-17052] PASS current cache isolation, offline shell guard, false-update fix, OS-only login and PWA '+VERSION);
