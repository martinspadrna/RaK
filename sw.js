// RaK 1.7 PWA service worker – metadata-driven cache + confirmed-update navigation.
importScripts('./rak-release-metadata.js?sw=1.7.125');
const RELEASE_METADATA = self.RAK_RELEASE_METADATA;
if (!RELEASE_METADATA || !RELEASE_METADATA.displayVersion || !RELEASE_METADATA.buildId) {
  throw new Error('Missing RaK release metadata');
}
const CACHE_VERSION = RELEASE_METADATA.cacheVersion;
const SW_RELEASE_CACHE_MARKER = 'v1.7.125';
if (CACHE_VERSION !== SW_RELEASE_CACHE_MARKER) {
  throw new Error('Service worker release marker does not match release metadata');
}
const SW_APP_VERSION = RELEASE_METADATA.technicalVersion;
const DEVELOPMENT_TEST_DISPLAY_VERSION = RELEASE_METADATA.displayVersion;
// Legacy smoke compatibility: const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.6.03';
const DEVELOPMENT_BUILD_ID = RELEASE_METADATA.buildId;
const DEVELOPMENT_STARTUP_DIAGNOSTIC_POLICY = 'idle-foundation-2;feature-css-10';
const DEVELOPMENT_ASSET_OPTIMIZATION_POLICY = 'lossless-png-sharp-0.34.4;pixel-identity-guard';
const DEVELOPMENT_LOGIN_ASSET_POLICY = 'login-png-1024;retina-safe;sharp-lanczos3';
const DEVELOPMENT_CACHE_TUNING_POLICY = 'normalize-update-navigation-cache;waituntil-runtime-write;cleanup-transient-nav';
// Previous canonical warm-start budget before offline Rotace: const DEVELOPMENT_PERFORMANCE_GUARD_POLICY = 'core8;warm58;startup-js-1536k;startup-file-300k;login-each-1000k;login-total-2900k;eager-diagnostics-0;qr-full';
const DEVELOPMENT_PERFORMANCE_GUARD_POLICY = 'core8;warm67;startup-js-2304k;startup-file-300k;login-each-1000k;login-total-2900k;eager-diagnostics-0;qr-full';
const DEVELOPMENT_OFFLINE_ROTATION_POLICY = 'prewarm-retained-on-quota;repair-protocol;dashboard-icons-required;cached-state-first;semantic-ui-conflict';
const DEVELOPMENT_STARTUP_EXECUTION_POLICY = 'mobile-layout-guard-idle;warm-cache-preserved;startup-files-15';
const DEVELOPMENT_MUTATION_OBSERVER_POLICY = 'scoped-8;raf-coalesced-7;runtime-stability-targeted';
const DEVELOPMENT_FULL_APP_AUDIT_POLICY = 'export-manifest-current;diagnostics-no-games;keepalive-rpc-only;security-smoke-executed';
const DEVELOPMENT_EXPORT_PREFLIGHT_POLICY = 'stale-usage-css-sql-removed;runtime-cleanup;same-version-cache-refresh';
const DEVELOPMENT_COMPLETE_BACKUP_POLICY = 'owner-only-rpc;repo-sha-snapshot;deployed-runtime;sanitized-auth;schema-rls-rpc;storage-bytes';
const DEVELOPMENT_COMPLETE_BACKUP_IOS_POLICY = 'single-same-origin-source-archive;no-raw-github-fetch;expanded-repository-folder';
const RAK_RELEASE_170_POLICY = 'display-1.7;technical-1.7.125;cache-v1.7.125;startup-auth-restore-only;about-production-stability-backup;complete-backup-preserved';
const RAK_170_STARTUP_AUTH_HOTFIX_ASSETS = ['./core.js?v=1.7.125', './app-admin-unlock.js?v=1.7.125', './app-menu-pages.js?v=1.7.125'];
const RAK_170_SHIFT_REPORT_HOTFIX_ASSETS = ['./rak-shift-report.js?v=1.7.125'];
const RAK_170_REPORT_APPEARANCE_ASSETS = ['./app.js?v=1.7.125', './appearance-theme.js?v=1.7.125', './rak-shift-report.js?v=1.7.125'];
const RAK_170_GENERATOR_STAFFING_ASSETS = ['./admin-rotation-generator.js?v=1.7.125', './admin-rotation.js?v=1.7.125', './rotation-tasks.js?v=1.7.125'];
const RAK_SHIFT_REPORT_MO_POLICY = 'separate-normal-free-lines;restore-free-draft';
const DEVELOPMENT_COMPLETE_BACKUP_INVENTORY_POLICY = 'git-tracked-only;archive-inventory-aligned';
const RAK_17100_BACKUP_SOURCE_POLICY = 'same-origin-build-verified-zip;embedded-exactly;no-client-reparse';
// Previous Home marker kept for diagnostics: const DEVELOPMENT_BUILD_ID = '1.6.03-home2';
// Previous internal markers kept only for smoke compatibility: const DEVELOPMENT_BUILD_ID = '1.6.03-stats2';
// Previous internal marker kept only for smoke compatibility: const DEVELOPMENT_BUILD_ID = '1.6.03-stats1';
const STATIC_CACHE = `rotace-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `rotace-runtime-${CACHE_VERSION}`;
const PREWARM_CACHE = `rotace-prewarm-${CACHE_VERSION}`;
const SAME_VERSION_HOTFIX_ASSETS = ['./app-menu-pages.js?v=1.7.125'];
const DEVELOPMENT_EXPORT_HOTFIX_ASSETS = ['./export.js?v=1.7.125', './rak-lazy-external-libs.js?v=1.7.125'];
const DEVELOPMENT_COMPLETE_BACKUP_HOTFIX_ASSETS = ['./app.js?v=1.7.125', './app-menu-admin-renderer.js?v=1.7.125', './rak-complete-backup.js?v=1.7.125'];
// Development-only invalidace starých admin/Supabase assetů po oddělení test DB.
const DEVELOPMENT_ADMIN_HOTFIX_ASSETS = [
  './app.js?v=1.7.125',
  './supabase-config.js?v=1.7.125',
  './supabase-bridge.js?v=1.7.125',
  './app-rotation-sync.js?v=1.7.125',
  './app-admin-unlock.js?v=1.7.125',
  './app-menu.js?v=1.7.125',
  './app-menu-shift-report.js?v=1.7.125',
  './app-home-boot.js?v=1.7.125',
  './kalirna-daymod-override.js?v=20260912-1',
  './kalirna-stats-override.js?v=20260913-1',
  './rotation-tasks.js?v=1.7.125'
];

const DEVELOPMENT_ASSET_HOTFIX_ASSETS = [
  './assets/rak-login-crab.png',
  './assets/rak-login-crab-step.png',
  './assets/rak-login-crab-tap.png',
  './assets/help/frezky-fhb-help.png',
  './assets/help/frezky-konicita-help.png',
  './assets/help/soustruhy-vrtaky-x-help.png',
  './assets/app-icons/icon-1024.png',
  './assets/app-icons/icon-512.png',
  './assets/app-icons/icon-192.png',
  './assets/app-icons/icon-180.png',
  './assets/app-icons/icon-32.png',
  './assets/app-icons/icon-16.png',
  './assets/dashboard-icons/calendar.png',
  './assets/dashboard-icons/dovolena.png',
  './assets/dashboard-icons/eportal.png',
  './assets/dashboard-icons/hourglass.png',
  './assets/dashboard-icons/jidelna.png',
  './assets/dashboard-icons/jidelnilistek.png',
  './assets/dashboard-icons/kantyna.png',
  './assets/dashboard-icons/vyplata.png',
  './assets/nav-icons/home-gray.png',
  './assets/nav-icons/home-green.png',
  './assets/nav-icons/rotace-gray.png',
  './assets/nav-icons/rotace-green.png',
  './assets/nav-icons/kalkulacky-gray.png',
  './assets/nav-icons/kalkulacky-green.png'
];


const CORE = [
  './',
  './index.html',
  './rak-release-metadata.js',
  './rak-runtime-diagnostics.js?v=1.7.125',
  './manifest.webmanifest',
  './assets/app-icons/icon-180.png?v=1.5.1',
  './assets/app-icons/icon-32.png?v=1.5.1',
  './assets/app-icons/icon-192.png?v=1.5.1',
  './assets/app-icons/icon-512.png?v=1.5.1',
  './assets/rak-login-crab.png'
];

const WARM_START = [
  './supabase-vendor-2.110.7.js',
  './rak-runtime-diagnostics.js?v=1.7.125',
  './app.js?v=1.7.125',
  './data.js',
  './module-readiness.js',
  './rak-namespace.js',
  './rak-dom-security-hardening.js',
  './styles.css',
  './styles-inline-legacy.css',
  './styles-base.css',
  './styles-layout.css',
  './styles-theme.css',
  './styles-responsive.css',
  './styles-modal.css',
  './styles-rotation-summary-compact.css',
  './styles-overrides-legacy-early.css',
  './styles-interaction-guard.css',
  './styles-rotation-month.css',
  './styles-low-end-performance.css',
  './styles-dashboard-sync.css',
  './styles-settings-runtime.css',
  './styles-bottom-nav-runtime.css',
  './styles-overrides-legacy-late.css',
  './styles-dashboard-fit.css',
  './styles-admin-polish.css',
  './styles-menu-polish.css',
  './styles-viewport-polish.css',
  './styles-theme-polish.css',
  './styles-release-polish.css',
  './styles-dashboard-polish.css',
  './styles-theme-propagation.css',
  './assets/nav-icons/home-gray.png',
  './assets/nav-icons/home-green.png',
  './assets/nav-icons/rotace-gray.png',
  './assets/nav-icons/rotace-green.png',
  './assets/nav-icons/kalkulacky-gray.png',
  './assets/nav-icons/kalkulacky-green.png',
  './assets/dashboard-icons/calendar.png',
  './assets/dashboard-icons/dovolena.png',
  './assets/dashboard-icons/eportal.png',
  './assets/dashboard-icons/hourglass.png',
  './assets/dashboard-icons/jidelna.png',
  './assets/dashboard-icons/jidelnilistek.png',
  './assets/dashboard-icons/kantyna.png',
  './assets/dashboard-icons/vyplata.png',
  './supabase-config.js?v=1.7.125',
  './rak-user-profile.js?v=1.7.125',
  './rak-auth-gate.js?v=1.7.125',
  './rak-account-access.js?v=1.7.125',
  './rak-login-splash.js?v=1.7.125',
  './rak-login-fix.js?v=1.7.125',
  './rak-login-life.js?v=1.7.125',
  './core.js?v=1.7.125',
  './lifecycle.js?v=1.7.125',
  './app-runtime-guards.js?v=1.7.125',
  './qr.js?v=1.7.125',
  './payroll.js?v=1.7.125',
  './dashboard.js?v=1.7.125',
  './appearance-theme.js?v=1.7.125',
  './ui.js?v=1.7.125',
  './app-navigation.js?v=1.7.125',
  './app-bottom-nav.js?v=1.7.125',
  './app-actions.js?v=1.7.125',
  './app-pwa-connectivity.js?v=1.7.125',
  './app-home-boot.js?v=1.7.125',
  './rak-runtime-stability.js?v=1.7.125',
  './rak-mobile-layout-guard.js?v=1.7.125',
  './rak-feature-routing.js?v=1.7.125',
  './stats.js?v=1.7.125',
  './rotation-name-index.js?v=1.7.125',
  './rotace.js?v=1.7.125',
  './rotation-tasks.js?v=1.7.125',
  './admin-daymods.js?v=1.7.125',
  './app-rotation-controls.js?v=1.7.125',
  './supabase-bridge.js?v=1.7.125',
  './app-rotation-sync.js?v=1.7.125'
];

const OFFLINE_REQUIRED = Object.freeze([
  './supabase-vendor-2.110.7.js',
  './rak-runtime-diagnostics.js?v=1.7.125','./app.js?v=1.7.125','./data.js','./module-readiness.js','./rak-namespace.js','./rak-dom-security-hardening.js',
  './core.js?v=1.7.125','./lifecycle.js?v=1.7.125','./app-runtime-guards.js?v=1.7.125','./ui.js?v=1.7.125',
  './app-navigation.js?v=1.7.125','./app-bottom-nav.js?v=1.7.125','./app-actions.js?v=1.7.125',
  './app-pwa-connectivity.js?v=1.7.125','./app-home-boot.js?v=1.7.125','./rak-runtime-stability.js?v=1.7.125',
  './rak-mobile-layout-guard.js?v=1.7.125','./rak-feature-routing.js?v=1.7.125','./stats.js?v=1.7.125',
  './rotation-name-index.js?v=1.7.125','./rotace.js?v=1.7.125','./rotation-tasks.js?v=1.7.125','./admin-daymods.js?v=1.7.125',
  './app-rotation-controls.js?v=1.7.125','./supabase-config.js?v=1.7.125','./supabase-bridge.js?v=1.7.125',
  './app-rotation-sync.js?v=1.7.125',
  './assets/nav-icons/home-gray.png','./assets/nav-icons/home-green.png',
  './assets/nav-icons/rotace-gray.png','./assets/nav-icons/rotace-green.png',
  './assets/nav-icons/kalkulacky-gray.png','./assets/nav-icons/kalkulacky-green.png',
  './assets/dashboard-icons/calendar.png','./assets/dashboard-icons/dovolena.png',
  './assets/dashboard-icons/eportal.png','./assets/dashboard-icons/hourglass.png',
  './assets/dashboard-icons/jidelna.png','./assets/dashboard-icons/jidelnilistek.png',
  './assets/dashboard-icons/kantyna.png','./assets/dashboard-icons/vyplata.png'
]);

const STATIC_EXT = /\.(?:js|css|png|jpg|jpeg|webp|svg|ico|json|webmanifest)$/i;
let approvedUpdateClientId = '';
const DEVELOPMENT_TRANSIENT_NAV_PARAMS = ['_rak_update', '_rak_update_reason'];

function cacheable(response) {
  const cacheControl = response && response.headers ? String(response.headers.get('cache-control') || '') : '';
  return !!response && response.ok && response.status !== 206 && !/\bno-store\b|\bprivate\b/i.test(cacheControl);
}

async function put(cacheName, request, response) {
  if (!cacheable(response)) return;
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  } catch (_) {}
}

async function cachedPrewarm(request, ignoreSearch) {
  try {
    const url = new URL(request.url);
    const relative = '.' + url.pathname + (ignoreSearch ? '' : url.search);
    const cache = await caches.open(PREWARM_CACHE);
    return await cache.match(prewarmKey(relative), { ignoreSearch: false });
  } catch (_) {
    return null;
  }
}

async function cached(request, options) {
  const opts = options && typeof options === 'object' ? options : {};
  try {
    const current = [await caches.open(STATIC_CACHE), await caches.open(RUNTIME_CACHE)];
    for (const cache of current) {
      const hit = await cache.match(request, { ignoreSearch: false });
      if (hit) return hit;
    }
    const prewarmExact = await cachedPrewarm(request, false);
    if (prewarmExact) return prewarmExact;
    if (opts.exactOnly) return null;
    for (const cache of current) {
      const hit = await cache.match(request, { ignoreSearch: true });
      if (hit) return hit;
    }
    return (await cachedPrewarm(request, true)) || null;
  } catch (_) {
    return null;
  }
}

function prewarmKey(url) {
  return new Request(new URL('./__rak_prewarm__/' + encodeURIComponent(String(url || '')), self.location.href).href);
}

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

async function fetchBuildAsset(url) {
  const fetchUrl = new URL(url, self.location.href);
  if (!fetchUrl.searchParams.has('v')) fetchUrl.searchParams.set('__rak_build', CACHE_VERSION);
  return fetch(new Request(fetchUrl.href, { cache: 'reload' }));
}

async function clearSameVersionHotfixAssets() {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const hotfixAssets = SAME_VERSION_HOTFIX_ASSETS.concat(DEVELOPMENT_ADMIN_HOTFIX_ASSETS, DEVELOPMENT_ASSET_HOTFIX_ASSETS, DEVELOPMENT_EXPORT_HOTFIX_ASSETS, DEVELOPMENT_COMPLETE_BACKUP_HOTFIX_ASSETS).concat(RAK_170_STARTUP_AUTH_HOTFIX_ASSETS).concat(RAK_170_SHIFT_REPORT_HOTFIX_ASSETS).concat(RAK_170_REPORT_APPEARANCE_ASSETS).concat(RAK_170_GENERATOR_STAFFING_ASSETS);
    await Promise.all(hotfixAssets.map(url => cache.delete(url, { ignoreSearch: false })));
  } catch (_) {}
}

async function installCoreAndPrewarm() {
  const staticCache = await caches.open(STATIC_CACHE);
  const prewarmCache = await caches.open(PREWARM_CACHE);
  await Promise.allSettled(CORE.map(async url => {
    try {
      const response = await fetchBuildAsset(url);
      if (cacheable(response)) await staticCache.put(url, response.clone());
    } catch (_) {}
  }));
  const offlineShell = await Promise.all([staticCache.match('./index.html'), staticCache.match('./')]);
  if (!offlineShell.some(Boolean)) throw new Error('[RaK] missing offline shell; abort service-worker install');
  await Promise.allSettled(WARM_START.map(async url => {
    try {
      const response = await fetchBuildAsset(url);
      if (cacheable(response)) await prewarmCache.put(prewarmKey(url), response.clone());
    } catch (_) {}
  }));
  const missingRequired = [];
  for (const url of OFFLINE_REQUIRED) {
    try {
      if (!(await prewarmCache.match(prewarmKey(url)))) missingRequired.push(url);
    } catch (_) {
      missingRequired.push(url);
    }
  }
  if (missingRequired.length) throw new Error('[RaK] incomplete offline runtime: ' + missingRequired.join(', '));
}

async function promotePrewarm() {
  const staticCache = await caches.open(STATIC_CACHE);
  const prewarmCache = await caches.open(PREWARM_CACHE);
  const result = { promoted: 0, retained: 0, failed: 0 };
  for (const url of WARM_START) {
    let response = null;
    let cameFromPrewarm = false;
    try {
      response = await prewarmCache.match(prewarmKey(url));
      cameFromPrewarm = !!response;
    } catch (_) {}
    if (!response) {
      try { response = await fetchBuildAsset(url); } catch (_) { response = null; }
    }
    if (!cacheable(response)) { result.failed += 1; continue; }
    try {
      await staticCache.put(url, response.clone());
      result.promoted += 1;
      if (cameFromPrewarm) {
        try { await prewarmCache.delete(prewarmKey(url)); } catch (_) {}
      }
    } catch (_) {
      // iOS can reject the temporary duplicate while both caches exist.
      // Keep the verified prewarm entry as a first-class offline fallback.
      if (!cameFromPrewarm) {
        try {
          await prewarmCache.put(prewarmKey(url), response.clone());
          cameFromPrewarm = true;
        } catch (_) {}
      }
      if (cameFromPrewarm) result.retained += 1;
      else result.failed += 1;
    }
  }
  return result;
}

async function staticResponse(request) {
  const hit = await cached(request, { exactOnly: true });
  if (hit) return hit;
  try {
    const response = await fetch(new Request(request, { cache: 'no-cache' }));
    await put(STATIC_CACHE, request, response);
    return response;
  } catch (_) {
    return (await cached(request)) || Response.error();
  }
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    await clearSameVersionHotfixAssets();
    await installCoreAndPrewarm();
    // Záměrně bez skipWaiting(): nový build nejdřív zůstane waiting,
    // aplikace ukáže potvrzení a aktivace proběhne až po klepnutí na Aktualizovat.
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await promotePrewarm();
    await cleanupTransientNavigationCache();
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => (
      /^rotace-(?:static|runtime|prewarm)-/.test(k)
      && k !== STATIC_CACHE
      && k !== RUNTIME_CACHE
      && k !== PREWARM_CACHE
    )).map(k => caches.delete(k)));
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (_) {}
    }
    await self.clients.claim();
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    const navigations = [];
    clients.forEach(client => {
      try { client.postMessage({ type: 'sw-activated', version: CACHE_VERSION, appVersion: DEVELOPMENT_TEST_DISPLAY_VERSION, technicalAppVersion: SW_APP_VERSION, testDisplayVersion: DEVELOPMENT_TEST_DISPLAY_VERSION, buildId: DEVELOPMENT_BUILD_ID }); } catch (_) {}
      if (approvedUpdateClientId && client.id === approvedUpdateClientId && typeof client.navigate === 'function') {
        try {
          const nextUrl = new URL(client.url);
          nextUrl.searchParams.set('_rak_update', CACHE_VERSION + '-' + Date.now().toString(36));
          nextUrl.searchParams.set('_rak_update_reason', 'sw-activate');
          navigations.push(client.navigate(nextUrl.href).catch(() => null));
        } catch (_) {
          navigations.push(client.navigate(client.url).catch(() => null));
        }
      }
    });
    if (navigations.length) await Promise.all(navigations);
  })());
});

async function collectOfflineCacheStatus(source) {
  const staticCache = await caches.open(STATIC_CACHE);
  const runtimeCache = await caches.open(RUNTIME_CACHE);
  const prewarmCache = await caches.open(PREWARM_CACHE);
  const missing = [];
  for (const url of OFFLINE_REQUIRED) {
    let hit = null;
    try { hit = await staticCache.match(url, { ignoreSearch: false }); } catch (_) {}
    if (!hit) {
      try { hit = await prewarmCache.match(prewarmKey(url), { ignoreSearch: false }); } catch (_) {}
    }
    if (!hit) missing.push(url);
  }
  const appShell = [];
  for (const url of CORE) {
    try { if (await staticCache.match(url, { ignoreSearch: false })) appShell.push(url); } catch (_) {}
  }
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).catch(() => []);
  return {
    type: 'sw-cache-status',
    source: String(source || 'cache-status'),
    cacheVersion: CACHE_VERSION,
    appVersion: SW_APP_VERSION,
    testDisplayVersion: DEVELOPMENT_TEST_DISPLAY_VERSION,
    buildId: DEVELOPMENT_BUILD_ID,
    strategy: 'navigation-network-first;static-plus-retained-prewarm;online-repair',
    cacheLookupMode: 'static-runtime-retained-prewarm',
    staticCacheEntries: (await staticCache.keys().catch(() => [])).length,
    runtimeCacheEntries: (await runtimeCache.keys().catch(() => [])).length,
    prewarmCacheEntries: (await prewarmCache.keys().catch(() => [])).length,
    appShellCount: appShell.length,
    precacheSuccessCount: OFFLINE_REQUIRED.length - missing.length,
    precacheFailedCount: missing.length,
    precacheMissingCount: missing.length,
    precacheMissing: missing,
    clientsCount: clients.length,
    navigationPreloadEnabled: !!self.registration.navigationPreload,
    warmStartCount: WARM_START.length,
    normalizedNavigationCache: true,
    transientNavigationParams: DEVELOPMENT_TRANSIENT_NAV_PARAMS.join(','),
    checkedAt: Date.now()
  };
}

async function repairOfflinePrecache(source) {
  const before = await collectOfflineCacheStatus(source || 'precache-repair');
  const staticCache = await caches.open(STATIC_CACHE);
  const prewarmCache = await caches.open(PREWARM_CACHE);
  let repaired = 0;
  for (const url of before.precacheMissing) {
    let response = null;
    try { response = await fetchBuildAsset(url); } catch (_) { response = null; }
    if (!cacheable(response)) continue;
    try {
      await staticCache.put(url, response.clone());
      repaired += 1;
      continue;
    } catch (_) {}
    try {
      await prewarmCache.put(prewarmKey(url), response.clone());
      repaired += 1;
    } catch (_) {}
  }
  const after = await collectOfflineCacheStatus('precache-repair');
  after.repairSource = String(source || 'app');
  after.repairAttemptedCount = before.precacheMissingCount;
  after.repairSuccessCount = repaired;
  return after;
}

self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    approvedUpdateClientId = String(event.source && event.source.id || '');
    self.skipWaiting();
    return;
  }
  if (data.type === 'GET_VERSION' && event.source) {
    event.source.postMessage({ type: 'sw-version', version: CACHE_VERSION, appVersion: DEVELOPMENT_TEST_DISPLAY_VERSION, technicalAppVersion: SW_APP_VERSION, testDisplayVersion: DEVELOPMENT_TEST_DISPLAY_VERSION, buildId: DEVELOPMENT_BUILD_ID });
    return;
  }
  if (data.type === 'GET_CACHE_STATUS' && event.source) {
    const task = collectOfflineCacheStatus(data.source || 'app')
      .then(status => { try { event.source.postMessage(status); } catch (_) {} })
      .catch(error => { try { event.source.postMessage({ type: 'sw-cache-status', source: data.source || 'app', error: String(error && error.message || error || 'cache-status-failed') }); } catch (_) {} });
    if (typeof event.waitUntil === 'function') event.waitUntil(task);
    return;
  }
  if (data.type === 'REPAIR_PRECACHE' && event.source) {
    const task = repairOfflinePrecache(data.source || 'app')
      .then(status => { try { event.source.postMessage(status); } catch (_) {} })
      .catch(error => { try { event.source.postMessage({ type: 'sw-cache-status', source: 'precache-repair', error: String(error && error.message || error || 'precache-repair-failed') }); } catch (_) {} });
    if (typeof event.waitUntil === 'function') event.waitUntil(task);
  }
});

async function networkFirst(request, fallback, event) {
  try {
    const response = await fetch(new Request(request, { cache: 'no-store' }));
    await cacheNavigationResponse(request, response, event);
    return response;
  } catch (_) {
    return (await cached(request)) || fallback;
  }
}

async function navigationResponse(request, event) {
  try {
    if (event && event.preloadResponse) {
      const preload = await event.preloadResponse;
      if (cacheable(preload)) {
        await cacheNavigationResponse(request, preload, event);
        return preload;
      }
    }
  } catch (_) {}
  const fallback = (await cached('./index.html')) || (await cached('./')) || Response.error();
  return networkFirst(request, fallback, event);
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (!request || request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigationResponse(request, event));
    return;
  }

  if (STATIC_EXT.test(url.pathname)) {
    event.respondWith(staticResponse(request));
    return;
  }
});
