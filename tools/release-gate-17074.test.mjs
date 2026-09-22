import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const VERSION='1.7.74',BUILD='v1.7.74-offline-cache1';
test('1.7.74 keeps technical 1.7.0 and isolated TEST Supabase',()=>{
 for(const [file,anchor] of [
  ['index.html',`var build='${BUILD}';`],['sw.js',`const CACHE_VERSION = 'v${VERSION}';`],
  ['sw.js',`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],['sw.js',`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],
  ['app.js',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],['app.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
  ['supabase-config.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],['supabase-config.js',`window.RAK_PWA_BUILD = "${BUILD}";`]
 ])assert(read(file).includes(anchor),file+' release mismatch');
 assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
 const config=read('supabase-config.js');
 assert(config.includes('cgshssdjgzzuprlwnabl')&&!config.includes('bkqamcbkiwumsvelahxr'));
});
test('activation never discards verified prewarm fallback after an iOS quota failure',()=>{
 const sw=read('sw.js');
 for(const marker of ['async function cachedPrewarm(request, ignoreSearch)','static-runtime-retained-prewarm','if (cameFromPrewarm) result.retained += 1','&& k !== PREWARM_CACHE'])
  assert(sw.includes(marker),'missing '+marker);
 assert(!sw.includes('await caches.delete(PREWARM_CACHE)'),'active prewarm cache must not be deleted');
});
test('dashboard and navigation images are required offline assets',()=>{
 const sw=read('sw.js');
 for(const icon of ['calendar.png','dovolena.png','eportal.png','hourglass.png','jidelna.png','jidelnilistek.png','kantyna.png','vyplata.png','home-gray.png','home-green.png','rotace-gray.png','rotace-green.png','kalkulacky-gray.png','kalkulacky-green.png'])
  assert(sw.includes(icon),'missing offline icon '+icon);
 const browser=read('tools/browser-offline-17052.mjs');
 assert(browser.includes("document.querySelectorAll('img.dashboardIconImg,img.bottomNavIconImg')"));
 assert(browser.includes('offline dashboard/navigation icons missing'));
});
test('service worker implements the cache status and repair protocol used by the app',()=>{
 const sw=read('sw.js'),app=read('app-pwa-connectivity.js');
 for(const marker of ["data.type === 'REPAIR_PRECACHE'","data.type === 'GET_CACHE_STATUS'",'repairOfflinePrecache','precacheMissingCount','repairSuccessCount'])
  assert(sw.includes(marker),'missing '+marker);
 assert(app.includes("postMessage({ type: 'REPAIR_PRECACHE'"));
 assert(app.includes("postMessage({ type: 'GET_CACHE_STATUS'"));
});
test('strict CI runs the new regression after two clean canonical builds',()=>{
 const pkg=JSON.parse(read('package.json')),workflow=read('.github/workflows/rak-development-validation.yml');
 assert(pkg.scripts.check.includes('tools/release-gate-17074.test.mjs'));
 assert(workflow.includes('node --test tools/release-gate-17074.test.mjs'));
 assert(workflow.includes('rak-17074-isolated-build-'));
});
