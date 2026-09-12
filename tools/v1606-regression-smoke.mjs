import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const hotfix = read('kalirna-daymod-override.js');
const worker = read('sw-test-1606.js');
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

assert(hotfix.includes("const TEST_WORKER_URL = 'sw-test-1606.js';"), '1.6.06 test worker URL missing');
assert(hotfix.includes("updateVersionSource: 'service-worker-testDisplayVersion'"), 'update version source marker missing');
assert(hotfix.includes("el.textContent = 'Nová verze: ' + safe;"), 'update toast must show test display version');
assert(worker.includes("const RAK_TEST_DISPLAY_VERSION = '1.6.06';"), 'test worker must advertise 1.6.06');
assert(worker.includes("testDisplayVersion: RAK_TEST_DISPLAY_VERSION"), 'GET_VERSION must expose testDisplayVersion');
assert(worker.includes("importScripts('./sw.js?v=1.6.05-base');"), 'test worker must reuse confirmed-update base lifecycle');
assert(worker.includes('event.stopImmediatePropagation()'), 'wrapper must prevent base GET_VERSION from overwriting 1.6.06 with 1.6.0');

assert(String(pkg.scripts.check || '').includes('tools/v1606-regression-smoke.mjs'), '1.6.06 regression smoke must run in npm check');
assert.equal(pkg.version, '1.6.0', 'technical package version must stay 1.6.0');

console.log('[v1606-regression-smoke] OK Home/Rotace auto-recovery + first-tap Více + 1.6.06 update label locked');
