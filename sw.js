// RaK 1.7 PWA service worker – v1.7.0 cache + confirmed-update navigation.
const CACHE_VERSION = 'v1.7.72';
const SW_APP_VERSION = '1.7.0';
const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.72';
// Legacy smoke compatibility: const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.6.03';
const DEVELOPMENT_BUILD_ID = 'v1.7.72-shift-report1';
const DEVELOPMENT_STARTUP_DIAGNOSTIC_POLICY = 'idle-foundation-2;feature-css-10';
const DEVELOPMENT_ASSET_OPTIMIZATION_POLICY = 'lossless-png-sharp-0.34.4;pixel-identity-guard';
const DEVELOPMENT_LOGIN_ASSET_POLICY = 'login-png-1024;retina-safe;sharp-lanczos3';
const DEVELOPMENT_CACHE_TUNING_POLICY = 'normalize-update-navigation-cache;waituntil-runtime-write;cleanup-transient-nav';
// Previous canonical warm-start budget before offline Rotace: const DEVELOPMENT_PERFORMANCE_GUARD_POLICY = 'core8;warm58;startup-js-1536k;startup-file-300k;login-each-1000k;login-total-2900k;eager-diagnostics-0;qr-full';
const DEVELOPMENT_PERFORMANCE_GUARD_POLICY = 'core8;warm65;startup-js-2304k;startup-file-300k;login-each-1000k;login-total-2900k;eager-diagnostics-0;qr-full';
const DEVELOPMENT_OFFLINE_ROTATION_POLICY = 'prewarm-rotation5;prewarm-sync2;cached-state-first;semantic-ui-conflict';
const DEVELOPMENT_STARTUP_EXECUTION_POLICY = 'mobile-layout-guard-idle;warm-cache-preserved;startup-files-15';
const DEVELOPMENT_MUTATION_OBSERVER_POLICY = 'scoped-8;raf-coalesced-7;runtime-stability-targeted';
const DEVELOPMENT_FULL_APP_AUDIT_POLICY = 'export-manifest-current;diagnostics-no-games;keepalive-rpc-only;security-smoke-executed';
const DEVELOPMENT_EXPORT_PREFLIGHT_POLICY = 'stale-usage-css-sql-removed;runtime-cleanup;same-version-cache-refresh';
const DEVELOPMENT_COMPLETE_BACKUP_POLICY = 'owner-only-rpc;repo-sha-snapshot;deployed-runtime;sanitized-auth;schema-rls-rpc;storage-bytes';
const DEVELOPMENT_COMPLETE_BACKUP_IOS_POLICY = 'single-same-origin-source-archive;no-raw-github-fetch;expanded-repository-folder';
const RAK_RELEASE_170_POLICY = 'display-1.7;technical-1.7.0;cache-v1.7.0;startup-auth-restore-only;about-production-stability-backup;complete-backup-preserved';
const RAK_170_STARTUP_AUTH_HOTFIX_ASSETS = ['./core.js?v=1.7.0', './app-admin-unlock.js?v=1.7.0', './app-menu-pages.js?v=1.7.0'];
const RAK_170_SHIFT_REPORT_HOTFIX_ASSETS = ['./rak-shift-report.js?v=1.7.0'];
const RAK_170_REPORT_APPEARANCE_ASSETS = ['./app.js?v=1.7.0', './appearance-theme.js?v=1.7.0', './rak-shift-report.js?v=1.7.0'];
const RAK_170_GENERATOR_STAFFING_ASSETS = ['./admin-rotation-generator.js?v=1.7.0', './admin-rotation.js?v=1.7.0', './rotation-tasks.js?v=1.7.0'];
const RAK_SHIFT_REPORT_MO_POLICY = 'separate-normal-free-lines;restore-free-draft';
const DEVELOPMENT_COMPLETE_BACKUP_INVENTORY_POLICY = 'git-tracked-only;archive-inventory-aligned';
// Previous Home marker kept for diagnostics: const DEVELOPMENT_BUILD_ID = '1.6.03-home2';
// Previous internal markers kept only for smoke compatibility: const DEVELOPMENT_BUILD_ID = '1.6.03-stats2';
// Previous internal marker kept only for smoke compatibility: const DEVELOPMENT_BUILD_ID = '1.6.03-stats1';
const STATIC_CACHE = `rotace-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `rotace-runtime-${CACHE_VERSION}`;
const PREWARM_CACHE = `rotace-prewarm-${CACHE_VERSION}`;
const SAME_VERSION_HOTFIX_ASSETS = ['./app-menu-pages.js?v=1.7.0'];
const DEVELOPMENT_EXPORT_HOTFIX_ASSETS = ['./export.js?v=1.7.0', './rak-lazy-external-libs.js?v=1.7.0'];
const DEVELOPMENT_COMPLETE_BACKUP_HOTFIX_ASSETS = ['./app.js?v=1.7.0', './app-menu-admin-renderer.js?v=1.7.0', './rak-complete-backup.js?v=1.7.0'];
// Development-only invalidace starých admin/Supabase assetů po oddělení test DB.
const DEVELOPMENT_ADMIN_HOTFIX_ASSETS = [
  './app.js?v=1.7.0',
  './supabase-config.js?v=1.7.0',
  './supabase-bridge.js?v=1.7.0',
  './app-rotation-sync.js?v=1.7.0',
  './app-admin-unlock.js?v=1.7.0',
  './app-menu.js?v=1.7.0',
  './app-menu-shift-report.js?v=1.7.0',
  './app-home-boot.js?v=1.7.0',
  './kalirna-daymod-override.js?v=20260912-1',
  './kalirna-stats-override.js?v=20260913-1',
  './rotation-tasks.js?v=1.7.0'
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
  './manifest.webmanifest',
  './assets/app-icons/icon-180.png?v=1.5.1',
  './assets/app-icons/icon-32.png?v=1.5.1',
  './assets/app-icons/icon-192.png?v=1.5.1',
  './assets/app-icons/icon-512.png?v=1.5.1',
  './assets/rak-login-crab.png'
];

const WARM_START = [
  './app.js?v=1.7.0',
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
  './supabase-config.js?v=1.7.0',
  './rak-user-profile.js?v=1.7.0',
  './rak-auth-gate.js?v=1.7.0',
  './rak-account-access.js?v=1.7.0',
  './rak-login-splash.js?v=1.7.0',
  './rak-login-fix.js?v=1.7.0',
  './rak-login-life.js?v=1.7.0',
  './core.js?v=1.7.0',
  './lifecycle.js?v=1.7.0',
  './app-runtime-guards.js?v=1.7.0',
  './qr.js?v=1.7.0',
  './payroll.js?v=1.7.0',
  './dashboard.js?v=1.7.0',
  './appearance-theme.js?v=1.7.0',
  './ui.js?v=1.7.0',
  './app-navigation.js?v=1.7.0',
  './app-bottom-nav.js?v=1.7.0',
  './app-actions.js?v=1.7.0',
  './app-pwa-connectivity.js?v=1.7.0',
  './app-home-boot.js?v=1.7.0',
  './rak-runtime-stability.js?v=1.7.0',
  './rak-mobile-layout-guard.js?v=1.7.0',
  './rak-feature-routing.js?v=1.7.0',
  './stats.js?v=1.7.0',
  './rotace.js?v=1.7.0',
  './rotation-tasks.js?v=1.7.0',
  './admin-daymods.js?v=1.7.0',
  './app-rotation-controls.js?v=1.7.0',
  './supabase-bridge.js?v=1.7.0',
  './app-rotation-sync.js?v=1.7.0'
];

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

async function cached(request, options) {
  const opts = options && typeof options === 'object' ? options : {};
  try {
    const current = [await caches.open(STATIC_CACHE), await caches.open(RUNTIME_CACHE)];
    for (const cache of current) {
      const hit = await cache.match(request, { ignoreSearch: false });
      if (hit) return hit;
    }
    if (opts.exactOnly) return null;
    for (const cache of current) {
      const hit = await cache.match(request, { ignoreSearch: true });
      if (hit) return hit;
    }
    return null;
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
}

async function promotePrewarm() {
  const staticCache = await caches.open(STATIC_CACHE);
  const prewarmCache = await caches.open(PREWARM_CACHE);
  await Promise.allSettled(WARM_START.map(async url => {
    let response = null;
    try { response = await prewarmCache.match(prewarmKey(url)); } catch (_) {}
    if (!response) {
      try { response = await fetchBuildAsset(url); } catch (_) { response = null; }
    }
    if (cacheable(response)) await staticCache.put(url, response.clone());
  }));
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
    )).map(k => caches.delete(k)));
    try { await caches.delete(PREWARM_CACHE); } catch (_) {}
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
    event.source.postMessage({
      type: 'sw-cache-status',
      cacheVersion: CACHE_VERSION,
      appVersion: SW_APP_VERSION,
      testDisplayVersion: DEVELOPMENT_TEST_DISPLAY_VERSION,
      buildId: DEVELOPMENT_BUILD_ID,
      strategy: 'navigation-network-first;build-static-cache-first;isolated-prewarm',
      warmStartCount: WARM_START.length,
      normalizedNavigationCache: true,
      transientNavigationParams: DEVELOPMENT_TRANSIENT_NAV_PARAMS.join(','),
      performanceGuardEnabled: true,
      performanceStartupJsBytes: 823531,
      performanceLargestStartupJsBytes: 116561,
      performanceLoginPngBytes: 2771660,
      performanceCoreImageBytes: 1429650,
      coreCount: CORE.length,
      startupDiagnosticPolicy: DEVELOPMENT_STARTUP_DIAGNOSTIC_POLICY,
      deferredStyleCount: 10,
      deferredStartupDiagnosticCount: 2,
      optimizedPngTargetCount: 26,
      optimizedPngChangedCount: 26,
      optimizedPngBytesBefore: 14645094,
      optimizedPngBytesAfter: 12458882,
      optimizedPngBytesSaved: 2186212,
      loginPngTargetSize: 1024,
      loginPngChangedCount: 3,
      loginPngBytesBefore: 5283711,
      loginPngBytesAfter: 2771660,
      loginPngBytesSaved: 2512051,
      checkedAt: Date.now()
    });
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