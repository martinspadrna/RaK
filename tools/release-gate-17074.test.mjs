import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity,RELEASE_METADATA} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const {buildId:BUILD,displayVersion:VERSION}=RELEASE_METADATA;
test('1.7.74 offline cache and verified successors use canonical release metadata and TEST Supabase',()=>{assertCurrentReleaseIdentity(read,'1.7.74');});
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
 assert(workflow.includes('rak-170'+VERSION.split('.').at(-1)+'-isolated-build-'));
});

