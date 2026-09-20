import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
const VERSION='1.7.52',BUILD='v1.7.52-mobileoffline1';
test('release, PWA and TEST DB match after both full builds',()=>{
 for(const [file,token] of [['index.html',`var build='${BUILD}';`],['sw.js',`const CACHE_VERSION = 'v${VERSION}';`],['sw.js',`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],['sw.js',`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],['app.js',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],['app.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],['supabase-config.js',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`],['supabase-config.js',`window.RAK_PWA_BUILD = "${BUILD}";`]])assert(read(file).includes(token),file+' missing '+token);
 assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
 assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
 assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"));
});
test('release-based cache getter remains active; runtime values are checked by VM',()=>{
 const app=read('app-pwa-connectivity.js');
 assert(app.includes('window.RAK_TEST_DISPLAY_VERSION || window.RAK_RELEASE_VERSION || window.APP_VERSION'));
 assert(app.includes('const getExpectedServiceWorkerCacheVersion = () => {'));
 assert(read('core.js').includes('const APP_VERSION = "1.5";'));
 const workflow=read('.github/workflows/rak-development-validation.yml');
 assert(workflow.includes('node --test tools/pwa-offline-17052.test.mjs'));
});
test('worker rejects missing shell and ignores stale cross-version assets',()=>{
 const sw=read('sw.js');
 assert(sw.includes("throw new Error('[RaK] missing offline shell; abort service-worker install')"));
 assert(sw.includes('const current = [await caches.open(STATIC_CACHE), await caches.open(RUNTIME_CACHE)];'));
 assert(!sw.includes('return await caches.match(request, { ignoreSearch: true });'));
 assert(sw.includes("if (data.type === 'SKIP_WAITING')")&&sw.includes('self.skipWaiting();'));
});
test('browser, offline, online, VM and inherited privacy audits are mandatory',()=>{
 const workflow=read('.github/workflows/rak-development-validation.yml');
 assert(workflow.includes('npm run vercel-build\n          npm run vercel-build'));
 for(const command of ['node --test tools/pwa-offline-17052.test.mjs','node tools/browser-offline-17052.mjs','node --test tools/release-gate-17052.test.mjs','node tools/http-anon-audit-17050.mjs','node tools/backup-source-integrity-17051.mjs'])assert(workflow.includes(command),'missing '+command);
 const browser=read('tools/browser-offline-17052.mjs');
 for(const marker of ['Emulation.setDeviceMetricsOverride','Network.emulateNetworkConditions','offline reload','online recovery','document.documentElement.scrollWidth','getPwaHardeningStatus','Fetch.failRequest','false update',"'cache-control':'public,max-age=60'"])assert(browser.includes(marker),'missing '+marker);
 const stage=read('tools/shift-report-mo-hotfix-170-smoke.mjs');
 assert(stage.includes('// RAK_17052_TWO_PASS_GUARD')&&stage.includes(`already17052?"var build='${BUILD}';":already17051?`));
 assert(read('tools/development-version-17048.mjs').includes("await import('./development-version-17052.mjs');"));
});
test('historical 1.7.52 milestone and current 13-point plan independently distinguish Chromium from iPhone',()=>{
 const historic=read('tools/development-version-17052.mjs');
 const plan=read('RAK_PLAN_13.md');
 assert(historic.includes(VERSION),'historical milestone must remain in its own release stage');
 assert(plan.includes('2/13')&&plan.includes('Chromium')&&plan.includes('iPhone'));
 assert(plan.includes('0/13 plně technicky'),'current plan must not falsely claim full completion');
 assert.equal([...plan.matchAll(/^\| (P[012]\.\d) \|/gm)].length,13);
});
