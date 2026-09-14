#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const swPath = path.join(root, 'sw.js');
const configPath = path.join(root, 'supabase-config.js');
const indexPath = path.join(root, 'index.html');

const DISPLAY_VERSION = '1.6.27';
const BUILD_ID = '1.6.27-perfguard1';
const POLICY_MARKER = "const DEVELOPMENT_PERFORMANCE_GUARD_POLICY = 'core8;warm58;startup-js-1536k;startup-file-300k;login-each-1000k;login-total-2900k;eager-diagnostics-0;qr-full';";
const CACHE_POLICY_MARKER = "const DEVELOPMENT_CACHE_TUNING_POLICY = 'normalize-update-navigation-cache;waituntil-runtime-write;cleanup-transient-nav';";
const LOGIN_POLICY_MARKER = "const DEVELOPMENT_LOGIN_ASSET_POLICY = 'login-png-1024;retina-safe;sharp-lanczos3';";
const ASSET_POLICY_MARKER = "const DEVELOPMENT_ASSET_OPTIMIZATION_POLICY = 'lossless-png-sharp-0.34.4;pixel-identity-guard';";
const STARTUP_POLICY_MARKER = "const DEVELOPMENT_STARTUP_DIAGNOSTIC_POLICY = 'idle-foundation-2;feature-css-10';";

const BUDGETS = Object.freeze({
  coreCount: 8,
  warmCount: 58,
  startupJsBytes: 1536 * 1024,
  startupSingleJsBytes: 300 * 1024,
  loginSingleBytes: 1000 * 1000,
  loginTotalBytes: 2900 * 1000,
  coreImageBytes: 1600 * 1024
});

const LOGIN_ASSETS = Object.freeze([
  'assets/rak-login-crab.png',
  'assets/rak-login-crab-step.png',
  'assets/rak-login-crab-tap.png'
]);
const DEFERRED_DIAGNOSTICS = Object.freeze(['rak-audit-baseline.js', 'rak-runtime-health.js']);
const DEFERRED_CSS = Object.freeze([
  './styles-calc-panels.css',
  './styles-calculators-mid.css',
  './styles-shift-report.css',
  './styles-admin-reports.css',
  './styles-admin-rotation-fold.css',
  './styles-admin-service.css',
  './styles-admin-rotation-editor.css',
  './styles-stats-polish.css',
  './styles-daymods.css',
  './styles-rotation-tasks.css'
]);

function assert(condition, message) {
  if (!condition) throw new Error('[performance-guards-1627] ' + message);
}

function arrayBlock(source, name) {
  const match = source.match(new RegExp(`const ${name} = \\[\\n([\\s\\S]*?)\\n\\];`));
  assert(match, `Missing ${name} array.`);
  return Array.from(match[1].matchAll(/'([^']+)'/g), (item) => item[1]);
}

function localAssetPath(url) {
  const clean = String(url || '').split('?')[0].replace(/^\.\//, '');
  return clean ? path.join(root, clean) : '';
}

function sizeOf(relativePath) {
  const absolute = path.join(root, relativePath);
  assert(fs.existsSync(absolute), `Missing asset ${relativePath}.`);
  return fs.statSync(absolute).size;
}

let sw = fs.readFileSync(swPath, 'utf8');
let config = fs.readFileSync(configPath, 'utf8');
const html = fs.readFileSync(indexPath, 'utf8');

for (const marker of [CACHE_POLICY_MARKER, LOGIN_POLICY_MARKER, ASSET_POLICY_MARKER, STARTUP_POLICY_MARKER]) {
  assert(sw.includes(marker), `Required previous policy missing: ${marker}`);
}
assert(sw.includes("strategy: 'navigation-network-first;build-static-cache-first;isolated-prewarm'"), 'Stable PWA strategy changed.');
assert(sw.includes("const CACHE_VERSION = 'v1.6.0';"), 'Stable cache version contract changed.');
assert(sw.includes("if (data.type === 'SKIP_WAITING')"), 'Confirmed update flow missing.');
assert(sw.includes("'./qr.js?v=1.6.0'"), 'Full QR runtime is not in WARM_START.');
assert(!sw.includes('qr-data.generated.js'), 'Failed split QR asset returned.');

const core = arrayBlock(sw, 'CORE');
const warm = arrayBlock(sw, 'WARM_START');
assert(core.length === BUDGETS.coreCount, `CORE regression: expected ${BUDGETS.coreCount}, found ${core.length}.`);
assert(warm.length === BUDGETS.warmCount, `WARM_START regression: expected ${BUDGETS.warmCount}, found ${warm.length}.`);
assert(core.includes('./assets/rak-login-crab.png'), 'Login crab left CORE.');
for (const asset of DEFERRED_CSS) assert(!warm.includes(asset), `Deferred CSS returned to WARM_START: ${asset}`);
for (const file of DEFERRED_DIAGNOSTICS) {
  assert(!warm.includes('./' + file), `Deferred diagnostic returned to WARM_START: ${file}`);
  const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert(!new RegExp(`<script\\s+[^>]*src=["']${escaped}(?:[?"'])`, 'i').test(html), `Diagnostic returned to eager parser-blocking index: ${file}`);
}

const startupJsRows = warm
  .filter((url) => /\.js(?:\?|$)/i.test(url))
  .map((url) => {
    const absolute = localAssetPath(url);
    assert(absolute && fs.existsSync(absolute), `WARM_START JS missing on disk: ${url}`);
    return { url, bytes: fs.statSync(absolute).size };
  });
const startupJsBytes = startupJsRows.reduce((sum, row) => sum + row.bytes, 0);
const largestStartupJs = startupJsRows.slice().sort((a, b) => b.bytes - a.bytes)[0] || { url: '', bytes: 0 };
assert(startupJsBytes <= BUDGETS.startupJsBytes, `Startup JS budget exceeded: ${startupJsBytes} > ${BUDGETS.startupJsBytes} bytes.`);
assert(largestStartupJs.bytes <= BUDGETS.startupSingleJsBytes, `Single startup JS budget exceeded: ${largestStartupJs.url} ${largestStartupJs.bytes} > ${BUDGETS.startupSingleJsBytes} bytes.`);

const loginRows = LOGIN_ASSETS.map((asset) => ({ asset, bytes: sizeOf(asset) }));
for (const row of loginRows) assert(row.bytes <= BUDGETS.loginSingleBytes, `Login PNG budget exceeded: ${row.asset} ${row.bytes} > ${BUDGETS.loginSingleBytes} bytes.`);
const loginTotalBytes = loginRows.reduce((sum, row) => sum + row.bytes, 0);
assert(loginTotalBytes <= BUDGETS.loginTotalBytes, `Login PNG total budget exceeded: ${loginTotalBytes} > ${BUDGETS.loginTotalBytes} bytes.`);

const coreImageRows = core
  .filter((url) => /\.(?:png|jpg|jpeg|webp|svg|ico)(?:\?|$)/i.test(url))
  .map((url) => {
    const absolute = localAssetPath(url);
    assert(absolute && fs.existsSync(absolute), `CORE image missing on disk: ${url}`);
    return { url, bytes: fs.statSync(absolute).size };
  });
const coreImageBytes = coreImageRows.reduce((sum, row) => sum + row.bytes, 0);
assert(coreImageBytes <= BUDGETS.coreImageBytes, `CORE image budget exceeded: ${coreImageBytes} > ${BUDGETS.coreImageBytes} bytes.`);

if (!sw.includes(POLICY_MARKER)) {
  sw = sw.replace(CACHE_POLICY_MARKER, CACHE_POLICY_MARKER + '\n' + POLICY_MARKER);
  const statusAnchor = "      transientNavigationParams: DEVELOPMENT_TRANSIENT_NAV_PARAMS.join(','),";
  assert(sw.includes(statusAnchor), 'Cache status anchor missing.');
  sw = sw.replace(statusAnchor, [
    statusAnchor,
    '      performanceGuardEnabled: true,',
    `      performanceStartupJsBytes: ${startupJsBytes},`,
    `      performanceLargestStartupJsBytes: ${largestStartupJs.bytes},`,
    `      performanceLoginPngBytes: ${loginTotalBytes},`,
    `      performanceCoreImageBytes: ${coreImageBytes},`
  ].join('\n'));
}

config = config.replace(/^window\.RAK_RELEASE_VERSION = "1\.6\.\d+";$/m, `window.RAK_RELEASE_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_TEST_DISPLAY_VERSION = "1\.6\.\d+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_PWA_BUILD = "v1\.6\.[^"]+";$/m, `window.RAK_PWA_BUILD = "v${BUILD_ID}";`);
sw = sw.replace(/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '1\.6\.\d+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY_VERSION}';`);
sw = sw.replace(/^const DEVELOPMENT_BUILD_ID = '1\.6\.[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD_ID}';`);

assert(sw.includes(POLICY_MARKER), 'Performance guard policy marker missing.');
assert(config.includes(`window.RAK_RELEASE_VERSION = "${DISPLAY_VERSION}";`), 'Release version marker missing.');
assert(config.includes(`window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY_VERSION}";`), 'Display version marker missing.');
assert(config.includes(`window.RAK_PWA_BUILD = "v${BUILD_ID}";`), 'PWA build marker missing.');
assert(sw.includes(`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY_VERSION}';`), 'SW display version marker missing.');
assert(sw.includes(`const DEVELOPMENT_BUILD_ID = '${BUILD_ID}';`), 'SW build marker missing.');
assert(sw.includes('performanceGuardEnabled: true'), 'Performance guard diagnostics missing.');
assert(sw.includes(`performanceStartupJsBytes: ${startupJsBytes},`), 'Startup JS diagnostics mismatch.');
assert(sw.includes(`performanceLoginPngBytes: ${loginTotalBytes},`), 'Login PNG diagnostics mismatch.');
assert(sw.includes(`performanceCoreImageBytes: ${coreImageBytes},`), 'CORE image diagnostics mismatch.');

fs.writeFileSync(swPath, sw, 'utf8');
fs.writeFileSync(configPath, config, 'utf8');

const topStartup = startupJsRows.slice().sort((a, b) => b.bytes - a.bytes).slice(0, 5)
  .map((row) => `${row.url}=${row.bytes}`).join(', ');
console.log(`[performance-guards-1627] startup JS ${startupJsBytes}/${BUDGETS.startupJsBytes} B; largest ${largestStartupJs.url}=${largestStartupJs.bytes}/${BUDGETS.startupSingleJsBytes} B; top ${topStartup}`);
console.log(`[performance-guards-1627] login PNG ${loginTotalBytes}/${BUDGETS.loginTotalBytes} B; CORE images ${coreImageBytes}/${BUDGETS.coreImageBytes} B; CORE=${core.length}; WARM_START=${warm.length}`);
console.log('[performance-guards-1627] OK RaK 1.6.27: release performance budgets locked; PWA/cache/QR/login/startup/security behavior preserved.');
