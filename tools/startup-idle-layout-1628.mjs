#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appPath = path.join(root, 'app.js');
const swPath = path.join(root, 'sw.js');
const configPath = path.join(root, 'supabase-config.js');
const layoutGuardPath = path.join(root, 'rak-mobile-layout-guard.js');

const DISPLAY_VERSION = '1.6.28';
const BUILD_ID = '1.6.28-idlelayout1';
const TARGET = 'rak-mobile-layout-guard.js';
const POLICY_MARKER = "const DEVELOPMENT_STARTUP_EXECUTION_POLICY = 'mobile-layout-guard-idle;warm-cache-preserved;startup-files-15';";
const PREV_PERF_MARKER = "const DEVELOPMENT_PERFORMANCE_GUARD_POLICY = 'core8;warm58;startup-js-1536k;startup-file-300k;login-each-1000k;login-total-2900k;eager-diagnostics-0;qr-full';";
const STARTUP_POLICY_MARKER = "const DEVELOPMENT_STARTUP_DIAGNOSTIC_POLICY = 'idle-foundation-2;feature-css-10';";
const CACHE_POLICY_MARKER = "const DEVELOPMENT_CACHE_TUNING_POLICY = 'normalize-update-navigation-cache;waituntil-runtime-write;cleanup-transient-nav';";

function assert(condition, message) {
  if (!condition) throw new Error('[startup-idle-layout-1628] ' + message);
}

function appArray(source, name) {
  const match = source.match(new RegExp(`  const ${name} = \\[\\n([\\s\\S]*?)\\n  \\];`));
  assert(match, `Missing app array ${name}.`);
  return {
    full: match[0],
    values: Array.from(match[1].matchAll(/"([^"]+)"/g), (item) => item[1])
  };
}

function renderAppArray(name, values) {
  return `  const ${name} = [\n${values.map((value) => `    "${value}"`).join(',\n')}\n  ];`;
}

function swArray(source, name) {
  const match = source.match(new RegExp(`const ${name} = \\[\\n([\\s\\S]*?)\\n\\];`));
  assert(match, `Missing SW array ${name}.`);
  return Array.from(match[1].matchAll(/'([^']+)'/g), (item) => item[1]);
}

let app = fs.readFileSync(appPath, 'utf8');
let sw = fs.readFileSync(swPath, 'utf8');
let config = fs.readFileSync(configPath, 'utf8');

assert(sw.includes(PREV_PERF_MARKER), 'RaK 1.6.27 performance guard marker missing.');
assert(sw.includes(STARTUP_POLICY_MARKER), 'RaK 1.6.22 startup diagnostic policy missing.');
assert(sw.includes(CACHE_POLICY_MARKER), 'RaK 1.6.26 cache policy missing.');
assert(fs.existsSync(layoutGuardPath), 'Mobile layout guard file missing.');

if (!sw.includes(POLICY_MARKER)) {
  const startup = appArray(app, 'startupFiles');
  const idleFoundation = appArray(app, 'idleFoundationFiles');

  assert(startup.values.length === 16, `Expected startupFiles=16 before deferral, found ${startup.values.length}.`);
  assert(startup.values.includes(TARGET), 'Mobile layout guard is not in startupFiles before deferral.');
  assert(idleFoundation.values.includes('rak-audit-baseline.js'), 'Idle baseline diagnostic missing.');
  assert(idleFoundation.values.includes('rak-runtime-health.js'), 'Idle runtime health diagnostic missing.');
  assert(!idleFoundation.values.includes(TARGET), 'Mobile layout guard already duplicated in idleFoundationFiles.');

  const nextStartup = startup.values.filter((file) => file !== TARGET);
  const nextIdleFoundation = idleFoundation.values.concat(TARGET);

  assert(nextStartup.length === 15, `Expected startupFiles=15 after deferral, found ${nextStartup.length}.`);
  assert(nextIdleFoundation.length === 3, `Expected idleFoundationFiles=3 after deferral, found ${nextIdleFoundation.length}.`);

  app = app.replace(startup.full, renderAppArray('startupFiles', nextStartup));
  app = app.replace(idleFoundation.full, renderAppArray('idleFoundationFiles', nextIdleFoundation));
  sw = sw.replace(PREV_PERF_MARKER, PREV_PERF_MARKER + '\n' + POLICY_MARKER);
}

const startup = appArray(app, 'startupFiles').values;
const idleFoundation = appArray(app, 'idleFoundationFiles').values;
const warm = swArray(sw, 'WARM_START');

assert(startup.length === 15, `startupFiles must remain 15, found ${startup.length}.`);
assert(!startup.includes(TARGET), 'Mobile layout guard returned to blocking startup.');
assert(idleFoundation.length === 3, `idleFoundationFiles must remain 3, found ${idleFoundation.length}.`);
assert(idleFoundation.includes('rak-audit-baseline.js'), 'Idle baseline diagnostic disappeared.');
assert(idleFoundation.includes('rak-runtime-health.js'), 'Idle runtime health diagnostic disappeared.');
assert(idleFoundation.includes(TARGET), 'Mobile layout guard is not idle-loaded.');
assert(app.includes('loadFiles(idleFoundationFiles).then(() => Promise.all(idleAuditFiles.map(loadScript)))'), 'Idle foundation load order changed.');

for (const file of [
  'core.js',
  'lifecycle.js',
  'app-runtime-guards.js',
  'qr.js',
  'payroll.js',
  'dashboard.js',
  'appearance-theme.js',
  'ui.js',
  'app-navigation.js',
  'app-bottom-nav.js',
  'app-actions.js',
  'app-pwa-connectivity.js',
  'app-home-boot.js',
  'rak-runtime-stability.js',
  'rak-feature-routing.js'
]) {
  assert(startup.includes(file), `Protected startup dependency missing: ${file}`);
}

assert(warm.length === 58, `WARM_START must stay 58, found ${warm.length}.`);
assert(warm.includes('./rak-mobile-layout-guard.js?v=1.6.0'), 'Mobile layout guard must stay WARM-cached for offline safety.');
assert(warm.includes('./qr.js?v=1.6.0'), 'Full QR runtime must stay WARM-cached.');
assert(!sw.includes('qr-data.generated.js'), 'Failed split QR asset returned.');
assert(sw.includes("strategy: 'navigation-network-first;build-static-cache-first;isolated-prewarm'"), 'Stable PWA strategy changed.');
assert(sw.includes(POLICY_MARKER), 'Startup execution policy marker missing.');

config = config.replace(/^window\.RAK_RELEASE_VERSION = "1\.6\.\d+";$/m, `window.RAK_RELEASE_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_TEST_DISPLAY_VERSION = "1\.6\.\d+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_PWA_BUILD = "v1\.6\.[^"]+";$/m, `window.RAK_PWA_BUILD = "v${BUILD_ID}";`);
sw = sw.replace(/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '1\.6\.\d+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY_VERSION}';`);
sw = sw.replace(/^const DEVELOPMENT_BUILD_ID = '1\.6\.[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD_ID}';`);

assert(config.includes(`window.RAK_RELEASE_VERSION = "${DISPLAY_VERSION}";`), 'Release version marker missing.');
assert(config.includes(`window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY_VERSION}";`), 'Display version marker missing.');
assert(config.includes(`window.RAK_PWA_BUILD = "v${BUILD_ID}";`), 'PWA build marker missing.');
assert(sw.includes(`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY_VERSION}';`), 'SW display version marker missing.');
assert(sw.includes(`const DEVELOPMENT_BUILD_ID = '${BUILD_ID}';`), 'SW build marker missing.');

fs.writeFileSync(appPath, app, 'utf8');
fs.writeFileSync(swPath, sw, 'utf8');
fs.writeFileSync(configPath, config, 'utf8');

const deferredBytes = fs.statSync(layoutGuardPath).size;
console.log(`[startup-idle-layout-1628] ${TARGET} ${deferredBytes} B moved startup execution -> idle; WARM cache preserved; startupFiles=15; WARM_START=58.`);
console.log('[startup-idle-layout-1628] OK RaK 1.6.28: safe startup boundary tightened without changing Home/Rotace/Menu/QR/PWA runtime dependencies.');
