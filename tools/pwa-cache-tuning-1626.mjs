#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const swPath = path.join(root, 'sw.js');
const configPath = path.join(root, 'supabase-config.js');

const DISPLAY_VERSION = '1.6.26';
const BUILD_ID = '1.6.26-cache1';
const POLICY_MARKER = "const DEVELOPMENT_CACHE_TUNING_POLICY = 'normalize-update-navigation-cache;waituntil-runtime-write;cleanup-transient-nav';";
const LOGIN_POLICY_MARKER = "const DEVELOPMENT_LOGIN_ASSET_POLICY = 'login-png-1024;retina-safe;sharp-lanczos3';";
const ASSET_POLICY_MARKER = "const DEVELOPMENT_ASSET_OPTIMIZATION_POLICY = 'lossless-png-sharp-0.34.4;pixel-identity-guard';";
const STARTUP_POLICY_MARKER = "const DEVELOPMENT_STARTUP_DIAGNOSTIC_POLICY = 'idle-foundation-2;feature-css-10';";
const STRATEGY_MARKER = "strategy: 'navigation-network-first;build-static-cache-first;isolated-prewarm'";
const TRANSIENT_CONST = "const DEVELOPMENT_TRANSIENT_NAV_PARAMS = ['_rak_update', '_rak_update_reason'];";

function assert(condition, message) {
  if (!condition) throw new Error('[pwa-cache-tuning-1626] ' + message);
}

let sw = fs.readFileSync(swPath, 'utf8');
let config = fs.readFileSync(configPath, 'utf8');

assert(sw.includes(LOGIN_POLICY_MARKER), 'RaK 1.6.25 login asset policy missing.');
assert(sw.includes(ASSET_POLICY_MARKER), 'RaK 1.6.24 asset policy missing.');
assert(sw.includes(STARTUP_POLICY_MARKER), 'RaK 1.6.22 startup policy missing.');
assert(sw.includes(STRATEGY_MARKER), 'Stable navigation/static/prewarm strategy marker missing.');
assert(sw.includes("'./assets/rak-login-crab.png'"), 'CORE login crab must remain precached.');
assert(sw.includes("'./qr.js?v=1.6.0'"), 'Full QR runtime must remain in warm start.');
assert(!sw.includes('qr-data.generated.js'), 'Failed split QR asset must not return.');

if (!sw.includes(POLICY_MARKER)) {
  sw = sw.replace(LOGIN_POLICY_MARKER, LOGIN_POLICY_MARKER + '\n' + POLICY_MARKER);

  const approvedAnchor = "let approvedUpdateClientId = '';";
  assert(sw.includes(approvedAnchor), 'approvedUpdateClientId anchor missing.');
  sw = sw.replace(approvedAnchor, approvedAnchor + '\n' + TRANSIENT_CONST);

  const prewarmFunction = `function prewarmKey(url) {
  return new Request(new URL('./__rak_prewarm__/' + encodeURIComponent(String(url || '')), self.location.href).href);
}
`;
  assert(sw.includes(prewarmFunction), 'prewarmKey anchor missing.');

  const navigationHelpers = `
function navigationCacheKey(request) {
  try {
    const url = new URL(request.url);
    DEVELOPMENT_TRANSIENT_NAV_PARAMS.forEach(name => url.searchParams.delete(name));
    url.hash = '';
    return new Request(url.href);
  } catch (_) {
    return request;
  }
}

async function cacheNavigationResponse(request, response, event) {
  if (!cacheable(response)) return;
  const write = put(RUNTIME_CACHE, navigationCacheKey(request), response);
  if (event && typeof event.waitUntil === 'function') {
    event.waitUntil(write);
    return;
  }
  await write;
}

async function cleanupTransientNavigationCache() {
  try {
    const cache = await caches.open(RUNTIME_CACHE);
    const keys = await cache.keys();
    await Promise.all(keys.map(request => {
      try {
        const url = new URL(request.url);
        if (DEVELOPMENT_TRANSIENT_NAV_PARAMS.some(name => url.searchParams.has(name))) {
          return cache.delete(request);
        }
      } catch (_) {}
      return false;
    }));
  } catch (_) {}
}
`;
  sw = sw.replace(prewarmFunction, prewarmFunction + navigationHelpers);

  const activateAnchor = '    await promotePrewarm();';
  assert(sw.includes(activateAnchor), 'activate promotePrewarm anchor missing.');
  sw = sw.replace(activateAnchor, activateAnchor + '\n    await cleanupTransientNavigationCache();');

  const networkSignature = 'async function networkFirst(request, fallback) {';
  assert(sw.includes(networkSignature), 'networkFirst signature missing.');
  sw = sw.replace(networkSignature, 'async function networkFirst(request, fallback, event) {');

  const networkPut = '    put(RUNTIME_CACHE, request, response);';
  assert(sw.includes(networkPut), 'networkFirst runtime cache write missing.');
  sw = sw.replace(networkPut, '    await cacheNavigationResponse(request, response, event);');

  const preloadPut = '        put(RUNTIME_CACHE, request, preload);';
  assert(sw.includes(preloadPut), 'navigation preload runtime cache write missing.');
  sw = sw.replace(preloadPut, '        await cacheNavigationResponse(request, preload, event);');

  const networkCall = '  return networkFirst(request, fallback);';
  assert(sw.includes(networkCall), 'navigation networkFirst call missing.');
  sw = sw.replace(networkCall, '  return networkFirst(request, fallback, event);');

  const statusAnchor = '      warmStartCount: WARM_START.length,';
  assert(sw.includes(statusAnchor), 'cache status anchor missing.');
  sw = sw.replace(statusAnchor, [
    statusAnchor,
    '      normalizedNavigationCache: true,',
    "      transientNavigationParams: DEVELOPMENT_TRANSIENT_NAV_PARAMS.join(','),"
  ].join('\n'));

  console.log('[pwa-cache-tuning-1626] Applied navigation runtime-cache normalization + waitUntil writes + transient update-key cleanup.');
} else {
  console.log('[pwa-cache-tuning-1626] second build pass: cache tuning already applied; preserving first-pass transform.');
}

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
assert(sw.includes(POLICY_MARKER), 'Cache tuning policy marker missing.');
assert(sw.includes(TRANSIENT_CONST), 'Transient navigation param list missing.');
assert(sw.includes('function navigationCacheKey(request)'), 'navigationCacheKey helper missing.');
assert(sw.includes('async function cacheNavigationResponse(request, response, event)'), 'cacheNavigationResponse helper missing.');
assert(sw.includes('async function cleanupTransientNavigationCache()'), 'cleanupTransientNavigationCache helper missing.');
assert(sw.includes('await cleanupTransientNavigationCache();'), 'activate cleanup hook missing.');
assert(sw.includes('async function networkFirst(request, fallback, event)'), 'networkFirst event-aware signature missing.');
assert(sw.includes('await cacheNavigationResponse(request, response, event);'), 'network-first cache write is not lifecycle-bound.');
assert(sw.includes('await cacheNavigationResponse(request, preload, event);'), 'preload cache write is not lifecycle-bound.');
assert(sw.includes('return networkFirst(request, fallback, event);'), 'navigationResponse does not pass fetch event.');
assert(sw.includes('normalizedNavigationCache: true'), 'cache diagnostics marker missing.');
assert(sw.includes(STRATEGY_MARKER), 'Stable strategy changed unexpectedly.');
assert(sw.includes("const CACHE_VERSION = 'v1.6.0';"), 'Stable cache version contract changed unexpectedly.');
assert(sw.includes("'./qr.js?v=1.6.0'"), 'QR warm-start contract changed unexpectedly.');
assert(!sw.includes('qr-data.generated.js'), 'Failed split QR asset unexpectedly present.');

fs.writeFileSync(configPath, config, 'utf8');
fs.writeFileSync(swPath, sw, 'utf8');

console.log('[pwa-cache-tuning-1626] OK RaK 1.6.26: navigation remains network-first; transient update URLs normalized in runtime cache; cache writes lifecycle-bound; QR/login/assets/startup/security preserved.');
