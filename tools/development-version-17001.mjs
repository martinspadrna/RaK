#!/usr/bin/env node
// Development-only release stamp. Run AFTER the frozen RaK 1.7 release/smoke stages.
// Keep technical/package version 1.7.0; increment only the public test build and PWA cache.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const DISPLAY = '1.7.01';
const BUILD = 'v1.7.01-png1';
const CACHE = 'v1.7.01';
const ROOT = process.cwd();

function assert(condition, message) {
  if (!condition) throw new Error('[development-version-17001] ' + message);
}
function read(file) { return fs.readFileSync(`${ROOT}/${file}`, 'utf8'); }
function save(file, content) { fs.writeFileSync(`${ROOT}/${file}`, content, 'utf8'); }
function replaceRequired(source, pattern, replacement, label) {
  assert(pattern.test(source), 'missing version marker: ' + label);
  return source.replace(pattern, replacement);
}

let config = read('supabase-config.js');
assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co'), 'not the development Supabase');
config = replaceRequired(config, /^window\.RAK_RELEASE_VERSION = "[^"]+";$/m, `window.RAK_RELEASE_VERSION = "${DISPLAY}";`, 'config release');
config = replaceRequired(config, /^window\.RAK_TEST_DISPLAY_VERSION = "[^"]+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY}";`, 'config test display');
config = replaceRequired(config, /^window\.RAK_PWA_BUILD = "[^"]+";$/m, `window.RAK_PWA_BUILD = "${BUILD}";`, 'config PWA build');
save('supabase-config.js', config);

let app = read('app.js');
app = replaceRequired(app, /^  const RAK_DEV_UPDATE_BUILD = "[^"]+";$/m, `  const RAK_DEV_UPDATE_BUILD = "${BUILD}";`, 'app PWA build');
app = replaceRequired(app, /^  window\.RAK_RELEASE_VERSION = "[^"]+";$/m, `  window.RAK_RELEASE_VERSION = "${DISPLAY}";`, 'app release');
save('app.js', app);

let sw = read('sw.js');
sw = replaceRequired(sw, /^const CACHE_VERSION = '[^']+';$/m, `const CACHE_VERSION = '${CACHE}';`, 'SW cache');
sw = replaceRequired(sw, /^const DEVELOPMENT_TEST_DISPLAY_VERSION = '[^']+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY}';`, 'SW display');
sw = replaceRequired(sw, /^const DEVELOPMENT_BUILD_ID = '[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD}';`, 'SW build');
assert(sw.includes("const SW_APP_VERSION = '1.7.0';"), 'technical service-worker version changed unexpectedly');
assert(sw.includes("'./assets/rak-login-crab.png'"), 'original login crab asset missing');
assert(!sw.includes('self.skipWaiting();') || sw.includes("data.type === 'SKIP_WAITING'"), 'service worker must wait for user confirmation');
save('sw.js', sw);

// The old PWA used APP_VERSION=1.5 to identify every update: all 1.7 test
// releases consequently shared one suppressed-notice key and the expected
// SW cache was repeatedly misidentified. Use the actual visible test version.
let connectivity = read('app-pwa-connectivity.js');
const originalVersionTag = "  const getAppVersionTag = () => String(window.APP_VERSION || '').trim() || 'unknown';";
const actualVersionTag = "  const getAppVersionTag = () => String(window.RAK_TEST_DISPLAY_VERSION || window.RAK_RELEASE_VERSION || window.APP_VERSION || '').trim() || 'unknown';";
if (connectivity.includes(originalVersionTag)) connectivity = connectivity.replace(originalVersionTag, actualVersionTag);
assert(connectivity.includes(actualVersionTag), 'PWA update notice must use release version');
const expectedAnchor = "  const getExpectedServiceWorkerCacheVersion = () => {\n    const raw = getAppVersionTag();";
const expectedReplacement = "  const getExpectedServiceWorkerCacheVersion = () => {\n    const testVersion = String(window.RAK_TEST_DISPLAY_VERSION || '').trim();\n    if (/^\\d+\\.\\d+\\.\\d+$/.test(testVersion)) return 'v' + testVersion;\n    const raw = getAppVersionTag();";
if (connectivity.includes(expectedAnchor)) connectivity = connectivity.replace(expectedAnchor, expectedReplacement);
assert(connectivity.includes(expectedReplacement), 'PWA expected cache must match development SW');
save('app-pwa-connectivity.js', connectivity);

// The HTML shell uses network-first navigation. This one-time entry migration
// releases an old suppressed toast BEFORE cached legacy JS starts on iOS.
// No automatic activation: clicking Aktualizovat remains mandatory.
let index = read('index.html');
const marker = 'RAK_DEV_17001_UPDATE_PROMPT_RESET';
const bootstrap = `\n<!-- ${marker} -->\n<script id="rak-dev-17001-update-unblock">\n(function(){\n  try {\n    var build='${BUILD}';\n    if(localStorage.getItem('rak_dev_update_unblock_build')===build) return;\n    sessionStorage.removeItem('rotace_sw_update_notice_v1');\n    sessionStorage.removeItem('rotace_sw_update_pending_v1');\n    localStorage.removeItem('rotace_sw_update_suppress_v1');\n    localStorage.setItem('rak_dev_update_unblock_build',build);\n  } catch (_) {}\n})();\n</script>`;
if (!index.includes(marker)) {
  const anchor = '<title>Rotace a Kalkulačky</title>';
  assert(index.includes(anchor), 'early HTML entry anchor missing');
  index = index.replace(anchor, anchor + bootstrap);
}
assert(index.includes(marker), 'update prompt unblock missing');
save('index.html', index);

// Release gates ran immediately before this stamp. Check final deployed bytes
// too, including the second Vercel build pass, rather than trusting a log.
assert(read('supabase-config.js').includes(`window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY}";`), 'final test label missing');
assert(read('app.js').includes(`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`), 'app resets test build marker');
assert(read('app.js').includes(`window.RAK_RELEASE_VERSION = "${DISPLAY}";`), 'app resets test release');
assert(read('sw.js').includes(`const CACHE_VERSION = '${CACHE}';`), 'SW cache did not change');
assert(read('sw.js').includes(`const DEVELOPMENT_BUILD_ID = '${BUILD}';`), 'SW build marker did not change');
assert(read('app-pwa-connectivity.js').includes(actualVersionTag), 'PWA notice version regressed');
for (const file of ['app.js', 'sw.js', 'supabase-config.js', 'app-pwa-connectivity.js']) {
  execFileSync(process.execPath, ['--check', file], { cwd: ROOT, stdio: 'pipe' });
}
console.log(`[development-version-17001] OK test ${DISPLAY}; PWA ${CACHE}/${BUILD}; legacy suppression cleared on first entry; confirmation retained; syntax OK`);
