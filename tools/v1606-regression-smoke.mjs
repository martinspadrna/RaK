import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const hotfix = read('kalirna-daymod-override.js');
const sw = read('sw.js');
const config = read('supabase-config.js');
const pkg = JSON.parse(read('package.json'));

assert(hotfix.includes("const TEST_BUILD = '1.6.07';"), 'RaK 1.6.07 regression recovery build marker missing');
assert(hotfix.includes("lockBuildMarker('RAK_RELEASE_VERSION', TEST_BUILD);"), 'effective 1.6.07 release marker lock missing');
assert(hotfix.includes("lockBuildMarker('RAK_TEST_DISPLAY_VERSION', TEST_BUILD);"), 'effective 1.6.07 display marker lock missing');
assert(hotfix.includes("lockBuildMarker('RAK_PWA_BUILD', 'v' + TEST_BUILD);"), 'effective 1.6.07 PWA marker lock missing');
assert(hotfix.includes("window.__rak1607BuildMarkerMode = 'locked-test-runtime';"), '1.6.07 test build marker lock mode missing');

assert(hotfix.includes("window.__rak1607StartupRotationMode = 'startup-minimum';"), 'startup Rotation recovery marker missing');
assert(hotfix.includes("window.rakEnsureFeature('rotation')"), 'Rotation must remain in effective startup minimum for Home correctness');
assert(hotfix.includes("if (action !== 'rotace' && action !== 'menu') return;"), 'deterministic bottom-nav scope must be limited to Rotace and Více');
assert(hotfix.includes('event.stopImmediatePropagation();'), 'first-tap recovery must stop the later lazy/nav race');
assert(hotfix.includes('await window.rakEnsureFeature(feature);'), 'first-tap recovery must await feature readiness before opening');
assert(hotfix.includes("if (action === 'rotace') openRotationNow();"), 'Rotace must open only after its feature is ready');
assert(hotfix.includes("else openMenuNow();"), 'Více must open only after its feature is ready');
assert(hotfix.includes("if (typeof openAppMenu === 'function') openAppMenu('menu');"), 'Více fix must actually render/open menu content');
assert(hotfix.includes("window.__rak1607MoreMode = 'deterministic-show+open+active';"), 'Více deterministic recovery marker missing');

assert(hotfix.includes("stats && stats.mfkSoloCounts"), 'person stats must reuse MFK solo counters');
assert(hotfix.includes("stats && stats.mskPairCounts"), 'person stats must reuse MSK pair counters');
assert(hotfix.includes("'Sám na 2 frézkách'"), 'person MFK solo summary tile missing');
assert(hotfix.includes("'Ve 2 lidech na soustruzích'"), 'person two-lathe-workers summary tile missing');
assert(hotfix.includes("window.__rak1607StatsPersonExtras = 'mfk-solo+msk-pair';"), 'person stats diagnostic marker missing');

assert(sw.includes("const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.6.07';"), 'service worker must itself change for the 1.6.06 → 1.6.07 update');
assert(sw.includes("type: 'sw-version', version: CACHE_VERSION, appVersion: DEVELOPMENT_TEST_DISPLAY_VERSION"), 'waiting worker must report visible 1.6.07 to the old client');
assert(sw.includes("type: 'sw-activated', version: CACHE_VERSION, appVersion: DEVELOPMENT_TEST_DISPLAY_VERSION"), 'activated worker must report visible 1.6.07');
assert(sw.includes('technicalAppVersion: SW_APP_VERSION'), 'technical 1.6.0 worker version must remain separately available');
assert(config.includes('kalirna-daymod-override.js?v=20260913-1607'), 'development override must use a fresh 1.6.07 URL');
assert(sw.includes("'./kalirna-daymod-override.js?v=20260913-1607'"), 'service worker hotfix inventory must match the 1.6.07 override URL');

assert(String(pkg.scripts.check || '').includes('tools/v1606-regression-smoke.mjs'), 'regression smoke must run in npm check');
assert.equal(pkg.version, '1.6.0', 'technical package version must stay 1.6.0');

console.log('[v1606-regression-smoke] OK RaK 1.6.07 deterministic Rotace/Více first tap + person MFK/MSK counters + visible update label');
