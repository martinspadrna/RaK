import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const hotfix = read('kalirna-daymod-override.js');
const sw = read('sw.js');
const pkg = JSON.parse(read('package.json'));

assert(hotfix.includes("const TEST_BUILD = '1.6.06';"), 'RaK 1.6.06 regression recovery build marker missing');
assert(hotfix.includes("lockBuildMarker('RAK_RELEASE_VERSION', TEST_BUILD);"), 'effective 1.6.06 release marker lock missing');
assert(hotfix.includes("lockBuildMarker('RAK_TEST_DISPLAY_VERSION', TEST_BUILD);"), 'effective 1.6.06 display marker lock missing');
assert(hotfix.includes("lockBuildMarker('RAK_PWA_BUILD', 'v' + TEST_BUILD);"), 'effective 1.6.06 PWA marker lock missing');
assert(hotfix.includes("window.__rak1606BuildMarkerMode = 'locked-test-runtime';"), 'test build marker lock mode missing');

assert(hotfix.includes("window.__rak1606StartupRotationMode = 'startup-minimum';"), 'startup Rotation recovery marker missing');
assert(hotfix.includes("window.rakEnsureFeature('rotation')"), 'Rotation must auto-load after startup readiness');
assert(hotfix.includes('refreshRecoveredViews();'), 'Home/Rotace refresh after startup Rotation missing');
assert(hotfix.includes("if (!window.__rakBootV2StartupReady || typeof window.rakEnsureFeature !== 'function')"), 'Rotation recovery must wait for Boot v2 readiness');

assert(hotfix.includes("if (typeof openAppMenu === 'function') openAppMenu('menu');"), 'Více fix must actually render/open menu content');
assert(hotfix.includes("if (typeof setBottomNavActive === 'function') setBottomNavActive('menu');"), 'Více fix must keep bottom navigation state');
assert(hotfix.includes("window.__rak1606MoreMode = 'show+open+active';"), 'Více recovery mode marker missing');
assert(hotfix.includes("if (feature === 'menu') patchMoreToggle();"), 'Více must be fixed immediately after lazy menu feature becomes ready');

assert(sw.includes("const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.6.06';"), 'service worker must itself change for the 1.6.05 → 1.6.06 update');
assert(sw.includes("type: 'sw-version', version: CACHE_VERSION, appVersion: DEVELOPMENT_TEST_DISPLAY_VERSION"), 'waiting worker must report visible 1.6.06 to the old client');
assert(sw.includes("type: 'sw-activated', version: CACHE_VERSION, appVersion: DEVELOPMENT_TEST_DISPLAY_VERSION"), 'activated worker must report visible 1.6.06');
assert(sw.includes('technicalAppVersion: SW_APP_VERSION'), 'technical 1.6.0 worker version must remain separately available');
assert(!hotfix.includes('sw-test-1606.js'), 'runtime must not register a second helper service worker');
assert(!fs.existsSync('sw-test-1606.js'), 'obsolete helper service worker must be removed');

assert(String(pkg.scripts.check || '').includes('tools/v1606-regression-smoke.mjs'), '1.6.06 regression smoke must run in npm check');
assert(!String(pkg.scripts.check || '').includes('node --check sw-test-1606.js'), 'removed helper worker must not stay in npm check');
assert.equal(pkg.version, '1.6.0', 'technical package version must stay 1.6.0');

console.log('[v1606-regression-smoke] OK Home/Rotace auto-recovery + first-tap Více + direct 1.6.06 SW update label locked');
