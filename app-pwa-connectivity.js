// RaK 1.2 (1.155) – PWA, service worker a konektivita oddělené z app.js.
try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('app-pwa-connectivity.js', 'loaded', { source: 'dynamic-loader' }); } catch (err) {}

function installRakPortraitOnlyPwaMode() {
  if (window.__rakPortraitOnlyPwaInstalled) return;
  let standalone = false;
  try { standalone = !!(window.navigator && window.navigator.standalone === true) || !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches); } catch (err) {}
  if (!standalone) return;
  window.__rakPortraitOnlyPwaInstalled = true;
  const overlayId = 'rakPortraitOnlyOverlay';
  const ensureOverlay = () => {
    if (!document.body) return;
    document.documentElement.classList.add('rakPortraitOnly');
    let overlay = document.getElementById(overlayId);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = overlayId;
      overlay.setAttribute('role', 'status');
      overlay.setAttribute('aria-live', 'polite');
      overlay.innerHTML = '<div class="rakPortraitOnlyIcon" aria-hidden="true">↻</div><strong>Otoč telefon na výšku</strong><span>RaK je na mobilu uzamčený na výšku.</span>';
      document.body.appendChild(overlay);
    }
    if (!document.getElementById('rakPortraitOnlyPwaStyle')) {
      const style = document.createElement('style');
      style.id = 'rakPortraitOnlyPwaStyle';
      style.textContent = '#' + overlayId + '{display:none;}@media (orientation:landscape) and (max-height:700px){html.rakPortraitOnly #' + overlayId + '{display:flex!important;position:fixed;inset:0;z-index:2147483647;align-items:center;justify-content:center;flex-direction:column;gap:10px;padding:calc(20px + env(safe-area-inset-top)) calc(24px + env(safe-area-inset-right)) calc(20px + env(safe-area-inset-bottom)) calc(24px + env(safe-area-inset-left));box-sizing:border-box;text-align:center;background:radial-gradient(circle at 50% 35%,rgba(18,56,79,.98),rgba(5,8,22,.995) 68%);color:#f4fbff;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}html.rakPortraitOnly #' + overlayId + ' .rakPortraitOnlyIcon{font-size:54px;line-height:1;font-weight:800;}html.rakPortraitOnly #' + overlayId + ' strong{font-size:24px;line-height:1.15;}html.rakPortraitOnly #' + overlayId + ' span{font-size:15px;line-height:1.35;opacity:.78;max-width:360px;}}';
      document.head.appendChild(style);
    }
  };
  const tryLock = () => {
    try { const orientation = window.screen && window.screen.orientation; if (!orientation || typeof orientation.lock !== 'function') return; const result = orientation.lock('portrait-primary'); if (result && typeof result.catch === 'function') result.catch(() => {}); } catch (err) {}
  };
  ensureOverlay();
  tryLock();
  window.addEventListener('pageshow', tryLock);
  window.addEventListener('orientationchange', ensureOverlay);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'hidden') { ensureOverlay(); tryLock(); } });
  document.addEventListener('pointerdown', tryLock, { once: true, passive: true });
}

function installPwaAndConnectivityHooks() {
  if (window.__rotacePwaBootstrapped) return;
  window.__rotacePwaBootstrapped = true;
  installRakPortraitOnlyPwaMode();

  const setConnectionFlag = () => {
    try {
      document.documentElement.dataset.connection = navigator.onLine ? 'online' : 'offline';
    } catch (err) {}
  };

  const LIVE_REFRESH_INTERVAL_MS = 4 * 60 * 1000;
  const SW_UPDATE_CHECK_INTERVAL_MS = 10 * 60 * 1000;
  const SW_VERSION_MISMATCH_CHECK_MS = 45 * 1000;
  const SW_PRECACHE_REPAIR_GUARD_MS = 2 * 60 * 1000;
  const SW_CACHE_STATUS_REQUEST_GUARD_MS = 20 * 1000;
  const STALE_REFRESH_GUARD_MS = 15 * 1000;
  const LIVE_CHANNEL_NAME = 'rotace-live-updates';
  const SW_UPDATE_NOTICE_KEY = 'rotace_sw_update_notice_v1';
  const SW_UPDATE_PENDING_KEY = 'rotace_sw_update_pending_v1';
  const SW_UPDATE_SUPPRESS_KEY = 'rotace_sw_update_suppress_v1';
  const DEV_BUILD = String(window.RAK_PWA_BUILD || window.RAK_DEV_BUILD || '').trim();
  if (DEV_BUILD) {
    window.RAK_DEV_BUILD = DEV_BUILD;
    try {
      const key = 'rak_dev_entry_prompt_reset_build';
      if (localStorage.getItem(key) !== DEV_BUILD) {
        sessionStorage.removeItem(SW_UPDATE_NOTICE_KEY);
        sessionStorage.removeItem(SW_UPDATE_PENDING_KEY);
        localStorage.removeItem(SW_UPDATE_SUPPRESS_KEY);
        localStorage.setItem(key, DEV_BUILD);
      }
    } catch (err) {}
  }
  const tabId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let liveRefreshPromise = null;
  let lastLiveRefreshAt = 0;
  let liveRefreshTimer = null;
  let liveChannel = null;
  let swRegistrationPromise = null;
  let swRegistrationInstance = null;
  let swUpdateTimer = null;
  let swUpdateToastEl = null;
  let swUpdateButtonEl = null;
  let swNextUpdateVersion = "";
  let swUpdateReloading = false;
  let swUpdateCheckPromise = null;
  let lastSwUpdateCheckAt = 0;
  let lastSwVersionMismatchCheckAt = 0;
  let lastSwPrecacheRepairAt = 0;
  let lastSwCacheStatusRequestAt = 0;
  let deferredInstallPrompt = null;

  const pwaHardeningStatus = window.__rakPwaHardeningStatus || {
    phase: 'phase-8-pwa-service-worker-hardening',
    phasePercent: 100,
    updateChecks: 0,
    updateCheckSkips: 0,
    updateCheckJoins: 0,
    registrationUpdates: 0,
    registrationUpdateErrors: 0,
    swMessages: 0,
    swVersionMessages: 0,
    swActivatedMessages: 0,
    swCacheStatusMessages: 0,
    swCacheStatusRequests: 0,
    swCacheStatusRequestSkips: 0,
    swCacheStatusRequestMode: 'throttled-cache-status-requests',
    swLastCacheStatusRequestAt: 0,
    swCacheStatusErrors: 0,
    swCacheVersion: '',
    swStaticCacheEntries: 0,
    swRuntimeCacheEntries: 0,
    swAppShellCount: 0,
    swPrecacheSuccessCount: 0,
    swPrecacheFailedCount: 0,
    swPrecacheMissingCount: 0,
    swPrecacheRepairMode: '',
    swPrecacheRepairRequests: 0,
    swPrecacheRepairSkips: 0,
    swStaleCacheCleanupMode: '',
    swManagedRakCacheCount: 0,
    swStaleRakCacheCount: 0,
    swStaleRakCacheDeletedCount: 0,
    swStaleCacheCleanupAt: 0,
    swPrecacheRepairAttemptedCount: 0,
    swPrecacheRepairSuccessCount: 0,
    swPrecacheRepairFailedCount: 0,
    swLastPrecacheRepairAt: 0,
    swLastPrecacheRepairSource: '',
    swClientsCount: 0,
    swNavigationPreloadEnabled: false,
    swCacheLookupMode: '',
    swCacheableResponseMode: '',
    swActivateRuntimeTrimMode: '',
    swNetworkTimeoutFallbackMode: '',
    swStaticCacheFirstTimeoutMode: '',
    swPhase8CompletionMode: '',
    swPhase8Ready: false,
    swAppShellCachedRatio: 0,
    swNetworkFallbackTimeoutMs: 0,
    swNavigationPreloadTimeoutMs: 0,
    pwaAssetAuditMode: 'zip-source-inventory-assets-pwa-sql-release-readiness-architecture-module-readiness-runtime-health-storage-sync-namespace-closed-export-manifest-preflight-appsec-gates-prompt-compliance-validation-v929',
    pwaAssetExpectedIconCount: 6,
    pwaAssetManifestOk: false,
    pwaAssetFaviconOk: false,
    pwaAssetAppleTouchOk: false,
    pwaAssetRootIconRefsBlocked: true,
    pwaReleaseChecklist: 'manifest/favicon/apple-touch/sw-precache/export-zip/assets-only',
    swAssetIconCount: 0,
    swAssetLegacyRootIconCount: 0,
    swExportZipRootMode: 'root-files-assets-folder-only',
    swRuntimeTrimBeforeCount: 0,
    swRuntimeTrimAfterCount: 0,
    swRuntimeTrimDeletedCount: 0,
    swRuntimeTrimAt: 0,
    swPrecacheIntegrityMode: '',
    swExpectedCacheVersion: '',
    swVersionMismatch: false,
    swVersionMismatchCount: 0,
    swVersionMismatchUpdateChecks: 0,
    swVersionMismatchUpdateSkips: 0,
    swLastVersionMismatchSource: '',
    swLastCacheStatusAt: 0,
    swLastCacheStatusSource: '',
    lastUpdateSource: '',
    lastUpdateCheckAt: 0,
    lastUpdateSkipSource: '',
    lastMessageType: '',
    throttleMs: SW_UPDATE_CHECK_INTERVAL_MS
  };
  window.__rakPwaHardeningStatus = pwaHardeningStatus;

  function getRakPwaAssetRuntimeAudit() {
    const expectedIcons = [
      'assets/app-icons/icon-16.png',
      'assets/app-icons/icon-32.png',
      'assets/app-icons/icon-180.png',
      'assets/app-icons/icon-192.png',
      'assets/app-icons/icon-512.png',
      'assets/app-icons/icon-1024.png'
    ];
    const linkHrefs = Array.from(document.querySelectorAll('link[href]')).map(link => String(link.getAttribute('href') || ''));
    const manifestOk = linkHrefs.some(href => /manifest\.webmanifest(?:$|[?#])/.test(href));
    const faviconOk = linkHrefs.some(href => href.indexOf('assets/app-icons/icon-32.png') >= 0 || href.indexOf('assets/app-icons/icon-192.png') >= 0);
    const appleTouchOk = linkHrefs.some(href => href.indexOf('assets/app-icons/icon-180.png') >= 0);
    const legacyRootIconRefs = linkHrefs.filter(href => /(^|\/)icon-(16|32|180|192|512|1024)\.png(?:$|[?#])/.test(href) && href.indexOf('assets/app-icons/') < 0);
    return {
      pwaAssetAuditMode: 'zip-source-inventory-assets-pwa-sql-release-readiness-architecture-module-readiness-runtime-health-storage-sync-namespace-closed-export-manifest-preflight-appsec-gates-prompt-compliance-validation-v929',
      pwaAssetExpectedIconCount: expectedIcons.length,
      pwaAssetManifestOk: manifestOk,
      pwaAssetFaviconOk: faviconOk,
      pwaAssetAppleTouchOk: appleTouchOk,
      pwaAssetRootIconRefsBlocked: legacyRootIconRefs.length === 0,
      pwaAssetLegacyRootIconRefs: legacyRootIconRefs.slice(0, 8),
      pwaReleaseChecklist: 'manifest/favicon/apple-touch/sw-precache/export-zip/assets-only'
    };
  }

  window.getPwaHardeningStatus = function getPwaHardeningStatus() {
    const assetAudit = getRakPwaAssetRuntimeAudit();
    return Object.assign({}, pwaHardeningStatus, assetAudit, {
      hasController: !!(navigator.serviceWorker && navigator.serviceWorker.controller),
      updateToastVisible: !!(swUpdateToastEl && document.body && document.body.contains(swUpdateToastEl)),
      updateReloading: !!swUpdateReloading,
      lastUpdateCheckAgoMs: pwaHardeningStatus.lastUpdateCheckAt ? Math.max(0, Date.now() - pwaHardeningStatus.lastUpdateCheckAt) : null
    });
  };

  const refreshMachineSettingsUi = (source) => {
    try {
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('rak:machine-settings-updated', { detail: { source: source || 'live-refresh', at: Date.now() } }));
      }
    } catch (err) {}
    try {
      if (typeof refreshPrackaFromMachineSettings === 'function') refreshPrackaFromMachineSettings(source || 'live-refresh');
      else if (typeof updatePrackaInfo === 'function') updatePrackaInfo();
    } catch (err) {}
    try {
      if (typeof refreshFhbSettingsUi === 'function') refreshFhbSettingsUi({ source: source || 'live-refresh', recalculate: true });
      else if (typeof updateFhbPresetButtons === 'function') updateFhbPresetButtons();
    } catch (err) {}
  };

  const runLiveRefresh = async (reason, opts = {}) => {
    const force = !!(opts && opts.force);
    if (!navigator.onLine && !force) return 'offline';
    if (liveRefreshPromise && !force) return liveRefreshPromise;
    const now = Date.now();
    if (!force && now - lastLiveRefreshAt < STALE_REFRESH_GUARD_MS && reason !== 'manual') {
      return 'throttled';
    }

    liveRefreshPromise = (async () => {
      try {
        if (navigator.onLine && typeof refreshPublicData === 'function') {
          await refreshPublicData();
        }
        if (navigator.onLine && window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.bindRealtimeSubscriptions === 'function') {
          window.RotationSupabaseBridge.bindRealtimeSubscriptions();
        }
        if (navigator.onLine && typeof flushSupabaseSyncQueue === 'function') {
          await flushSupabaseSyncQueue();
        }
        if (navigator.onLine && typeof syncRotationFromSupabase === 'function') {
          await syncRotationFromSupabase(false);
        }
        if (navigator.onLine && window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.loadMachineSettings === 'function' && typeof app !== 'undefined') {
          const machineRows = await window.RotationSupabaseBridge.loadMachineSettings().catch(() => null);
          if (Array.isArray(machineRows) && machineRows.length) {
            app.machineSettingsRows = machineRows;
            if (typeof renderBrusy === 'function') renderBrusy();
            if (typeof renderSoustruhy === 'function') renderSoustruhy();
            refreshMachineSettingsUi('live-refresh:' + String(reason || 'sync'));
          }
        }
        if (navigator.onLine && typeof gamesRefreshRemoteLeaderboards === 'function') {
          const gamesPage = document.getElementById('games');
          const gamesHubVisible = !!(gamesPage && gamesPage.classList && gamesPage.classList.contains('active'));
          const gameShellActive = !!(window.app && window.app.activeGameShell);
          const gamePerf = window.__rakGamePerfManager || null;
          // Fáze 5 finále: běžný live refresh celé appky už netahá herní leaderboardy,
          // pokud uživatel není přímo na hubu her. Tím se hry neprobouzí na pozadí.
          if (gamesHubVisible && !gameShellActive && document.visibilityState !== 'hidden') {
            if (gamePerf) gamePerf.liveLeaderboardRefreshRuns = Number(gamePerf.liveLeaderboardRefreshRuns || 0) + 1;
            await gamesRefreshRemoteLeaderboards().catch(() => []);
          } else if (gamePerf) {
            gamePerf.liveLeaderboardRefreshSkips = Number(gamePerf.liveLeaderboardRefreshSkips || 0) + 1;
          }
        }
        if (typeof forceHomeRefresh === 'function') forceHomeRefresh();
        // Láďův režim: Rozpisy/Statistiky se plně přestaví při otevření stránky
        // (showPage) i při reálné změně dat (syncRotationFromSupabase), takže když
        // nejsou vidět, slabý telefon je nemusí přestavovat při každém refreshi.
        const ladaLiteRefresh = !!(document.body && document.body.classList && document.body.classList.contains('ladaMode'));
        const rotacePage = document.getElementById('rotace');
        const rotaceVisible = !!(rotacePage && rotacePage.classList && rotacePage.classList.contains('active'));
        if (!ladaLiteRefresh || rotaceVisible) {
          if (typeof renderRotace === 'function') renderRotace();
          if (typeof renderStatsPanel === 'function') renderStatsPanel();
        }
        return reason || 'done';
      } catch (err) {
        console.warn('Live refresh hook failed', err);
        return 'failed';
      } finally {
        lastLiveRefreshAt = Date.now();
        liveRefreshPromise = null;
      }
    })();

    return liveRefreshPromise;
  };

  const broadcastState = (payload) => {
    try {
      localStorage.setItem('rotace_live_signal_v1', JSON.stringify(payload));
    } catch (err) {}
    try {
      if (liveChannel) liveChannel.postMessage(payload);
    } catch (err) {}
  };

  const getAppVersionTag = () => String(window.RAK_TEST_DISPLAY_VERSION || window.RAK_RELEASE_VERSION || window.APP_VERSION || '').trim() || 'unknown';

  const getStoredUpdateNoticeVersion = () => {
    try { return sessionStorage.getItem(SW_UPDATE_NOTICE_KEY) || ''; } catch (err) { return ''; }
  };

  const setStoredUpdateNoticeVersion = (value) => {
    try {
      if (value) sessionStorage.setItem(SW_UPDATE_NOTICE_KEY, value);
      else sessionStorage.removeItem(SW_UPDATE_NOTICE_KEY);
    } catch (err) {}
  };

  const getPendingUpdateVersion = () => {
    try { return sessionStorage.getItem(SW_UPDATE_PENDING_KEY) || ''; } catch (err) { return ''; }
  };

  const setPendingUpdateVersion = (value) => {
    try {
      if (value) sessionStorage.setItem(SW_UPDATE_PENDING_KEY, value);
      else sessionStorage.removeItem(SW_UPDATE_PENDING_KEY);
    } catch (err) {}
  };

  const getSuppressUpdateToast = () => {
    try { return localStorage.getItem(SW_UPDATE_SUPPRESS_KEY) || ''; } catch (err) { return ''; }
  };

  const setSuppressUpdateToast = (value) => {
    try {
      if (value) localStorage.setItem(SW_UPDATE_SUPPRESS_KEY, value);
      else localStorage.removeItem(SW_UPDATE_SUPPRESS_KEY);
    } catch (err) {}
  };

  const removeUpdateToast = () => {
    if (swUpdateToastEl && swUpdateToastEl.parentNode) {
      swUpdateToastEl.parentNode.removeChild(swUpdateToastEl);
    }
    swUpdateToastEl = null;
    swUpdateButtonEl = null;
  };

  const clearUpdatePromptIfStale = () => {
    const version = getAppVersionTag();
    const seen = getStoredUpdateNoticeVersion();
    const pending = getPendingUpdateVersion();
    const suppress = getSuppressUpdateToast();
    if (seen && seen !== version && pending !== version) setStoredUpdateNoticeVersion('');
    if (pending && pending !== version) setPendingUpdateVersion('');
    if (suppress && suppress !== version) setSuppressUpdateToast('');
  };

  const formatServiceWorkerVersionLabel = (version, fallback) => {
    const raw = String(version || fallback || '').trim();
    if (!raw) return '';
    const m = /^v?(\d+)\.(\d+)-(\d+)$/i.exec(raw);
    if (m) return 'v.' + m[1] + '.' + m[2] + ' (' + m[3] + ')';
    return raw;
  };

  const getExpectedServiceWorkerCacheVersion = () => {
    const testVersion = String(window.RAK_TEST_DISPLAY_VERSION || '').trim();
    if (/^\d+\.\d+\.\d+$/.test(testVersion)) return 'v' + testVersion;
    const raw = getAppVersionTag();
    if (/^[0-9]+[.][0-9]+[.][0-9]+$/.test(raw)) return 'v' + raw;
    const m = /v\.(\d+)\.(\d+)\s*\((\d+)\)/i.exec(raw);
    if (m) return 'v' + m[1] + '.' + m[2] + '-' + m[3];
    return String(raw || '').replace(/^v\./i, 'v').replace(/\s*\((\d+)\)\s*$/, '-$1').replace(/\s+/g, '');
  };

  const scheduleVersionMismatchUpdateCheck = (source) => {
    const now = Date.now();
    if (lastSwVersionMismatchCheckAt && now - lastSwVersionMismatchCheckAt < SW_VERSION_MISMATCH_CHECK_MS) {
      pwaHardeningStatus.swVersionMismatchUpdateSkips = Number(pwaHardeningStatus.swVersionMismatchUpdateSkips || 0) + 1;
      return false;
    }
    lastSwVersionMismatchCheckAt = now;
    pwaHardeningStatus.swVersionMismatchUpdateChecks = Number(pwaHardeningStatus.swVersionMismatchUpdateChecks || 0) + 1;
    if (typeof refreshServiceWorkerRegistration === 'function') {
      void refreshServiceWorkerRegistration('version-mismatch:' + String(source || 'cache-status'), { force: true });
      return true;
    }
    return false;
  };

  const updateToastVersionLine = (version) => {
    const label = formatServiceWorkerVersionLabel(version, '');
    if (label) swNextUpdateVersion = label;
    const el = swUpdateToastEl ? swUpdateToastEl.querySelector('.rakUpdateToastVersion') : null;
    if (el) {
      el.textContent = swNextUpdateVersion ? ('Nová verze: ' + swNextUpdateVersion) : 'Nová verze: zjišťuji…';
    }
  };

  const requestWaitingServiceWorkerVersion = (registration) => {
    try {
      const worker = registration && registration.waiting;
      if (!worker || worker.__rotaceVersionRequested) return;
      worker.__rotaceVersionRequested = true;
      worker.postMessage({ type: 'GET_VERSION' });
    } catch (err) {}
  };

  const requestActiveServiceWorkerPrecacheRepair = (source) => {
    try {
      if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return false;
      if (!navigator.onLine) {
        pwaHardeningStatus.swPrecacheRepairSkips = Number(pwaHardeningStatus.swPrecacheRepairSkips || 0) + 1;
        pwaHardeningStatus.swLastPrecacheRepairSource = String(source || 'offline') + ':offline';
        return false;
      }
      const now = Date.now();
      if (lastSwPrecacheRepairAt && now - lastSwPrecacheRepairAt < SW_PRECACHE_REPAIR_GUARD_MS) {
        pwaHardeningStatus.swPrecacheRepairSkips = Number(pwaHardeningStatus.swPrecacheRepairSkips || 0) + 1;
        pwaHardeningStatus.swLastPrecacheRepairSource = String(source || 'repair') + ':throttled';
        return false;
      }
      lastSwPrecacheRepairAt = now;
      pwaHardeningStatus.swPrecacheRepairRequests = Number(pwaHardeningStatus.swPrecacheRepairRequests || 0) + 1;
      pwaHardeningStatus.swLastPrecacheRepairAt = now;
      pwaHardeningStatus.swLastPrecacheRepairSource = String(source || 'cache-status');
      navigator.serviceWorker.controller.postMessage({ type: 'REPAIR_PRECACHE', source: source || 'cache-status' });
      return true;
    } catch (err) {
      pwaHardeningStatus.swCacheStatusErrors = Number(pwaHardeningStatus.swCacheStatusErrors || 0) + 1;
      pwaHardeningStatus.swLastCacheStatusError = err && err.message ? err.message : String(err || 'precache-repair-request-error');
      return false;
    }
  };

  const applyServiceWorkerCacheStatus = (data, source) => {
    if (!data) return;
    pwaHardeningStatus.swCacheStatusMessages = Number(pwaHardeningStatus.swCacheStatusMessages || 0) + 1;
    pwaHardeningStatus.swCacheVersion = String(data.cacheVersion || data.version || '');
    pwaHardeningStatus.swStaticCacheEntries = Number(data.staticCacheEntries || 0);
    pwaHardeningStatus.swRuntimeCacheEntries = Number(data.runtimeCacheEntries || 0);
    pwaHardeningStatus.swAppShellCount = Number(data.appShellCount || 0);
    pwaHardeningStatus.swPrecacheSuccessCount = Number(data.precacheSuccessCount || 0);
    pwaHardeningStatus.swPrecacheFailedCount = Number(data.precacheFailedCount || 0);
    pwaHardeningStatus.swPrecacheMissingCount = Number(data.precacheMissingCount || 0);
    pwaHardeningStatus.swClientsCount = Number(data.clientsCount || 0);
    pwaHardeningStatus.swNavigationPreloadEnabled = !!data.navigationPreloadEnabled;
    pwaHardeningStatus.swCacheLookupMode = String(data.cacheLookupMode || '');
    pwaHardeningStatus.swCacheableResponseMode = String(data.cacheableResponseMode || pwaHardeningStatus.swCacheableResponseMode || '');
    pwaHardeningStatus.swActivateRuntimeTrimMode = String(data.activateRuntimeTrimMode || pwaHardeningStatus.swActivateRuntimeTrimMode || '');
    pwaHardeningStatus.swNetworkTimeoutFallbackMode = String(data.networkTimeoutFallbackMode || pwaHardeningStatus.swNetworkTimeoutFallbackMode || '');
    pwaHardeningStatus.swStaticCacheFirstTimeoutMode = String(data.staticCacheFirstTimeoutMode || pwaHardeningStatus.swStaticCacheFirstTimeoutMode || '');
    pwaHardeningStatus.swPhase8CompletionMode = String(data.phase8CompletionMode || pwaHardeningStatus.swPhase8CompletionMode || '');
    pwaHardeningStatus.swPhase8Ready = !!data.phase8Ready;
    pwaHardeningStatus.swAppShellCachedRatio = Number(data.appShellCachedRatio || pwaHardeningStatus.swAppShellCachedRatio || 0);
    pwaHardeningStatus.swNetworkFallbackTimeoutMs = Number(data.networkFallbackTimeoutMs || pwaHardeningStatus.swNetworkFallbackTimeoutMs || 0);
    pwaHardeningStatus.swNavigationPreloadTimeoutMs = Number(data.navigationPreloadTimeoutMs || pwaHardeningStatus.swNavigationPreloadTimeoutMs || 0);
    pwaHardeningStatus.pwaAssetAuditMode = String(data.assetAuditMode || pwaHardeningStatus.pwaAssetAuditMode || '');
    pwaHardeningStatus.swAssetIconCount = Number(data.assetIconCount || pwaHardeningStatus.swAssetIconCount || 0);
    pwaHardeningStatus.swAssetLegacyRootIconCount = Number(data.assetLegacyRootIconCount || pwaHardeningStatus.swAssetLegacyRootIconCount || 0);
    pwaHardeningStatus.swExportZipRootMode = String(data.exportZipRootMode || pwaHardeningStatus.swExportZipRootMode || '');
    pwaHardeningStatus.swRuntimeTrimBeforeCount = Number(data.runtimeTrimBeforeCount || pwaHardeningStatus.swRuntimeTrimBeforeCount || 0);
    pwaHardeningStatus.swRuntimeTrimAfterCount = Number(data.runtimeTrimAfterCount || pwaHardeningStatus.swRuntimeTrimAfterCount || 0);
    pwaHardeningStatus.swRuntimeTrimDeletedCount = Number(data.runtimeTrimDeletedCount || pwaHardeningStatus.swRuntimeTrimDeletedCount || 0);
    if (data.runtimeTrimAt) pwaHardeningStatus.swRuntimeTrimAt = Number(data.runtimeTrimAt || 0);
    pwaHardeningStatus.swPrecacheFetchMode = String(data.precacheFetchMode || '');
    pwaHardeningStatus.swPrecacheIntegrityMode = String(data.precacheIntegrityMode || '');
    pwaHardeningStatus.swPrecacheRepairMode = String(data.precacheRepairMode || '');
    pwaHardeningStatus.swStaleCacheCleanupMode = String(data.staleCacheCleanupMode || pwaHardeningStatus.swStaleCacheCleanupMode || '');
    pwaHardeningStatus.swManagedRakCacheCount = Number(data.managedRakCacheCount || pwaHardeningStatus.swManagedRakCacheCount || 0);
    pwaHardeningStatus.swStaleRakCacheCount = Number(data.staleRakCacheCount || 0);
    pwaHardeningStatus.swStaleRakCacheDeletedCount = Number(data.staleRakCacheDeletedCount || pwaHardeningStatus.swStaleRakCacheDeletedCount || 0);
    if (data.staleCacheCleanupAt) pwaHardeningStatus.swStaleCacheCleanupAt = Number(data.staleCacheCleanupAt || 0);
    pwaHardeningStatus.swPrecacheRepairAttemptedCount = Number(data.precacheRepairAttemptedCount || pwaHardeningStatus.swPrecacheRepairAttemptedCount || 0);
    pwaHardeningStatus.swPrecacheRepairSuccessCount = Number(data.precacheRepairSuccessCount || pwaHardeningStatus.swPrecacheRepairSuccessCount || 0);
    pwaHardeningStatus.swPrecacheRepairFailedCount = Number(data.precacheRepairFailedCount || pwaHardeningStatus.swPrecacheRepairFailedCount || 0);
    if (data.precacheRepairCompletedAt) pwaHardeningStatus.swLastPrecacheRepairAt = Number(data.precacheRepairCompletedAt || 0);
    if (data.precacheRepairSource) pwaHardeningStatus.swLastPrecacheRepairSource = String(data.precacheRepairSource || '');
    pwaHardeningStatus.swLastCacheStatusAt = Date.now();
    pwaHardeningStatus.swLastCacheStatusSource = String(source || data.type || 'cache-status');
    const expectedCacheVersion = getExpectedServiceWorkerCacheVersion();
    const reportedCacheVersion = String(data.cacheVersion || data.version || '').trim();
    pwaHardeningStatus.swExpectedCacheVersion = expectedCacheVersion;
    const mismatch = !!(expectedCacheVersion && reportedCacheVersion && reportedCacheVersion !== expectedCacheVersion);
    pwaHardeningStatus.swVersionMismatch = mismatch;
    if (mismatch) {
      pwaHardeningStatus.swVersionMismatchCount = Number(pwaHardeningStatus.swVersionMismatchCount || 0) + 1;
      pwaHardeningStatus.swLastVersionMismatchSource = String(source || data.type || 'cache-status');
      scheduleVersionMismatchUpdateCheck(source || data.type || 'cache-status');
    }
    if (data.error) {
      pwaHardeningStatus.swCacheStatusErrors = Number(pwaHardeningStatus.swCacheStatusErrors || 0) + 1;
      pwaHardeningStatus.swLastCacheStatusError = String(data.error || 'cache-status-error');
    }
    if (Number(data.precacheMissingCount || 0) > 0 && data.source !== 'precache-repair') {
      requestActiveServiceWorkerPrecacheRepair(source || data.type || 'cache-status');
    }
  };

  const requestActiveServiceWorkerCacheStatus = (source, opts = {}) => {
    try {
      if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return false;
      const force = !!(opts && opts.force);
      const now = Date.now();
      if (!force && lastSwCacheStatusRequestAt && now - lastSwCacheStatusRequestAt < SW_CACHE_STATUS_REQUEST_GUARD_MS) {
        pwaHardeningStatus.swCacheStatusRequestSkips = Number(pwaHardeningStatus.swCacheStatusRequestSkips || 0) + 1;
        pwaHardeningStatus.swLastCacheStatusSource = String(source || 'request') + ':throttled';
        return false;
      }
      lastSwCacheStatusRequestAt = now;
      pwaHardeningStatus.swCacheStatusRequests = Number(pwaHardeningStatus.swCacheStatusRequests || 0) + 1;
      pwaHardeningStatus.swCacheStatusRequestMode = 'throttled-cache-status-requests';
      pwaHardeningStatus.swLastCacheStatusRequestAt = now;
      pwaHardeningStatus.swLastCacheStatusSource = String(source || 'request');
      navigator.serviceWorker.controller.postMessage({ type: 'GET_CACHE_STATUS', source: source || 'app' });
      return true;
    } catch (err) {
      pwaHardeningStatus.swCacheStatusErrors = Number(pwaHardeningStatus.swCacheStatusErrors || 0) + 1;
      pwaHardeningStatus.swLastCacheStatusError = err && err.message ? err.message : String(err || 'cache-status-request-error');
      return false;
    }
  };

  const scheduleUpdateReload = (reason) => {
    if (swUpdateReloading) return;
    if (!getPendingUpdateVersion()) return;
    swUpdateReloading = true;
    removeUpdateToast();
    try { setPendingUpdateVersion(getAppVersionTag()); } catch (err) {}
    try { setSuppressUpdateToast(getAppVersionTag()); } catch (err) {}
    const reloadFn = () => {
      try { window.location.reload(); } catch (err) {
        window.location.href = window.location.href;
      }
    };
    if (typeof registerTimeout === 'function') registerTimeout(reloadFn, reason === 'sw-activated' ? 80 : 160);
    else window.setTimeout(reloadFn, reason === 'sw-activated' ? 80 : 160);
  };

  const ensureUpdateToast = () => {
    if (swUpdateToastEl && document.body.contains(swUpdateToastEl)) return swUpdateToastEl;
    removeUpdateToast();
    const toast = document.createElement('div');
    toast.className = 'rakUpdateToast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    const main = document.createElement('div');
    main.className = 'rakUpdateToastMain';

    const badge = document.createElement('div');
    badge.className = 'rakUpdateToastBadge';
    badge.setAttribute('aria-hidden', 'true');
    badge.textContent = '⟳';

    const body = document.createElement('div');
    body.className = 'rakUpdateToastBody';

    const title = document.createElement('div');
    title.className = 'rakUpdateToastTitle';
    title.textContent = 'K dispozici je nová verze aplikace';

    const version = document.createElement('div');
    version.className = 'rakUpdateToastVersion';
    version.textContent = swNextUpdateVersion
      ? 'Nová verze: ' + String(swNextUpdateVersion)
      : 'Nová verze: zjišťuji…';

    const text = document.createElement('div');
    text.className = 'rakUpdateToastText';
    text.textContent = 'Klikni na Aktualizovat a appka načte novou cache bez přeinstalace.';

    body.append(title, version, text);
    main.append(badge, body);

    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'rakUpdateToastAction';
    action.textContent = 'Aktualizovat';

    toast.append(main, action);
    if (typeof recordSafeDomBuild === 'function') recordSafeDomBuild('swUpdateToast');
    document.body.appendChild(toast);
    swUpdateToastEl = toast;
    swUpdateButtonEl = action;
    swUpdateButtonEl.addEventListener('click', async () => {
      const registration = swRegistrationInstance;
      const version = getAppVersionTag();
      let waitingForActivation = false;
      setStoredUpdateNoticeVersion(version);
      setPendingUpdateVersion(version);
      setSuppressUpdateToast(getAppVersionTag());
      swUpdateButtonEl.disabled = true;
      swUpdateButtonEl.textContent = 'Aktualizuji…';
      try {
        if (registration && registration.waiting) {
          waitingForActivation = true;
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        } else if (registration && registration.update) {
          await registration.update();
        }
      } catch (err) {
        console.warn('[Rotace] Update confirm failed', err);
      }
      if (waitingForActivation) {
        const fallbackReload = () => {
          if (!swUpdateReloading) scheduleUpdateReload('manual-fallback');
        };
        if (typeof registerTimeout === 'function') registerTimeout(fallbackReload, 4000);
        else window.setTimeout(fallbackReload, 4000);
      } else {
        scheduleUpdateReload('manual');
      }
    });
    requestAnimationFrame(() => toast.classList.add('isVisible'));
    return toast;
  };

  const hideUpdateToast = () => {
    if (swUpdateToastEl) swUpdateToastEl.classList.remove('isVisible');
  };

  const maybeShowUpdateToast = (registration, reason) => {
    const currentVersion = getAppVersionTag();
    const seen = getStoredUpdateNoticeVersion();
    clearUpdatePromptIfStale();
    if (!registration || !registration.waiting) {
      if (!swUpdateReloading && getPendingUpdateVersion() === currentVersion) {
        setPendingUpdateVersion('');
      }
      return false;
    }
    if (!navigator.serviceWorker.controller) return false;
    if (swUpdateReloading) return true;
    const suppress = getSuppressUpdateToast();
    if (suppress) return true;
    if (seen === currentVersion) return true;
    requestWaitingServiceWorkerVersion(registration);
    ensureUpdateToast();
    setStoredUpdateNoticeVersion(currentVersion);
    setPendingUpdateVersion(currentVersion);
    if (reason) {
      try { console.info('[Rotace] Update ready via', reason); } catch (err) {}
    }
    return true;
  };

  const checkForWaitingServiceWorker = async (source) => {
    if (!('serviceWorker' in navigator)) return null;
    try {
      const registration = swRegistrationInstance || await navigator.serviceWorker.getRegistration('./');
      if (registration) {
        swRegistrationInstance = registration;
        maybeShowUpdateToast(registration, source || 'check');
      }
      return registration || null;
    } catch (err) {
      console.warn('[Rotace] SW check failed', err);
      return null;
    }
  };

  const refreshServiceWorkerRegistration = async (source, opts = {}) => {
    if (!('serviceWorker' in navigator)) return null;
    const reason = source || 'refresh';
    const force = !!(opts && opts.force);
    const now = Date.now();
    if (swUpdateCheckPromise) {
      pwaHardeningStatus.updateCheckJoins = Number(pwaHardeningStatus.updateCheckJoins || 0) + 1;
      pwaHardeningStatus.lastUpdateSkipSource = reason + ':join';
      return swUpdateCheckPromise;
    }
    if (!force && lastSwUpdateCheckAt && now - lastSwUpdateCheckAt < SW_UPDATE_CHECK_INTERVAL_MS) {
      pwaHardeningStatus.updateCheckSkips = Number(pwaHardeningStatus.updateCheckSkips || 0) + 1;
      pwaHardeningStatus.lastUpdateSkipSource = reason;
      await checkForWaitingServiceWorker(reason + '-throttled');
      return swRegistrationInstance || null;
    }

    swUpdateCheckPromise = (async () => {
      try {
        pwaHardeningStatus.updateChecks = Number(pwaHardeningStatus.updateChecks || 0) + 1;
        pwaHardeningStatus.lastUpdateSource = reason;
        const registration = await registerServiceWorker();
        if (registration && registration.update) {
          pwaHardeningStatus.registrationUpdates = Number(pwaHardeningStatus.registrationUpdates || 0) + 1;
          await registration.update();
        }
        lastSwUpdateCheckAt = Date.now();
        pwaHardeningStatus.lastUpdateCheckAt = lastSwUpdateCheckAt;
        await checkForWaitingServiceWorker(reason);
        requestActiveServiceWorkerCacheStatus(reason + '-after-update-check', { force: true });
        return registration || null;
      } catch (err) {
        pwaHardeningStatus.registrationUpdateErrors = Number(pwaHardeningStatus.registrationUpdateErrors || 0) + 1;
        console.warn('[Rotace] SW refresh failed', err);
        return null;
      } finally {
        swUpdateCheckPromise = null;
      }
    })();
    return swUpdateCheckPromise;
  };

  const signalStateChange = (reason) => {
    broadcastState({
      type: 'state-change',
      reason: reason || 'state-change',
      tabId,
      ts: Date.now()
    });
  };

  const registerServiceWorker = () => {
    if (!('serviceWorker' in navigator)) return null;
    if (swRegistrationPromise) return swRegistrationPromise;

    swRegistrationPromise = navigator.serviceWorker.register('sw.js', { scope: './' }).then(async (registration) => {
      swRegistrationInstance = registration || null;
      if (registration && !registration.__rotaceUpdateHooked) {
        registration.__rotaceUpdateHooked = true;
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed') {
              void runLiveRefresh('sw-installed', { force: true });
              void checkForWaitingServiceWorker('updatefound');
            }
          });
        });
      }
      if (registration && registration.update) {
        try {
          pwaHardeningStatus.registrationUpdates = Number(pwaHardeningStatus.registrationUpdates || 0) + 1;
          await registration.update();
          lastSwUpdateCheckAt = Date.now();
          pwaHardeningStatus.lastUpdateCheckAt = lastSwUpdateCheckAt;
          pwaHardeningStatus.lastUpdateSource = 'register';
        } catch (err) {
          pwaHardeningStatus.registrationUpdateErrors = Number(pwaHardeningStatus.registrationUpdateErrors || 0) + 1;
        }
      }
      void checkForWaitingServiceWorker('register');
      requestActiveServiceWorkerCacheStatus('register', { force: true });
      return registration;
    }).catch((err) => {
      console.warn('Service worker registration failed', err);
      return null;
    });

    window.__rotaceSwRegistrationPromise = swRegistrationPromise;
    return swRegistrationPromise;
  };

  if ('serviceWorker' in navigator && !window.__rotaceSwControllerChangeBound) {
    window.__rotaceSwControllerChangeBound = true;
    registerListener(navigator.serviceWorker, 'controllerchange', () => {
      const pending = getPendingUpdateVersion();
      requestActiveServiceWorkerCacheStatus('controllerchange', { force: true });
      if (pending && !swUpdateReloading) {
        scheduleUpdateReload('controllerchange');
      }
    });
  }

  setConnectionFlag();

  window.__rotaceTriggerLiveRefresh = runLiveRefresh;
  window.__rotaceRefreshAfterOnline = runLiveRefresh;
  window.__rotaceForcePwaUpdateCheck = async (source) => {
    const reason = source || 'manual-dashboard-sync';
    const registration = await refreshServiceWorkerRegistration(reason, { force: true });
    requestActiveServiceWorkerCacheStatus(reason + '-cache-status', { force: true });
    requestActiveServiceWorkerPrecacheRepair(reason + '-precache-repair');
    return {
      ok: !!registration,
      waiting: !!(registration && registration.waiting),
      installing: !!(registration && registration.installing),
      active: !!(registration && registration.active),
      source: reason
    };
  };
  window.__rotaceRequestPwaCacheStatus = (source) => requestActiveServiceWorkerCacheStatus(source || 'manual-dashboard-sync', { force: true });
  window.__rotaceRepairPwaPrecache = (source) => requestActiveServiceWorkerPrecacheRepair(source || 'manual-dashboard-sync');
  window.__rotaceSignalStateChange = signalStateChange;
  window.__rotacePromptInstall = async () => {
    if (!deferredInstallPrompt) return false;
    try {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      window.__rotaceDeferredInstallPrompt = null;
      delete document.documentElement.dataset.installable;
      return !!choice && choice.outcome === 'accepted';
    } catch (err) {
      console.warn('Install prompt failed', err);
      return false;
    }
  };

  registerListener(window, 'beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    window.__rotaceDeferredInstallPrompt = event;
    document.documentElement.dataset.installable = '1';
  });

  registerListener(window, 'appinstalled', () => {
    deferredInstallPrompt = null;
    window.__rotaceDeferredInstallPrompt = null;
    delete document.documentElement.dataset.installable;
    signalStateChange('appinstalled');
  });

  if ('BroadcastChannel' in window) {
    try {
      liveChannel = new BroadcastChannel(LIVE_CHANNEL_NAME);
      registerSubscription(() => { try { if (liveChannel) liveChannel.close(); } catch (err) {} });
      liveChannel.onmessage = (event) => {
        const data = event && event.data ? event.data : null;
        if (!data || data.tabId === tabId) return;
        if (data.type === 'state-change' || data.type === 'refresh') {
          void runLiveRefresh(data.reason || 'broadcast', { force: true });
        }
      };
    } catch (err) {
      console.warn('BroadcastChannel failed', err);
      liveChannel = null;
    }
  }

  if ('serviceWorker' in navigator) {
    registerServiceWorker();

    registerListener(navigator.serviceWorker, 'message', (event) => {
      const data = event && event.data ? event.data : null;
      if (!data) return;
      pwaHardeningStatus.swMessages = Number(pwaHardeningStatus.swMessages || 0) + 1;
      pwaHardeningStatus.lastMessageType = String(data.type || 'unknown');
      if (data.type === 'sw-version') {
        pwaHardeningStatus.swVersionMessages = Number(pwaHardeningStatus.swVersionMessages || 0) + 1;
        updateToastVersionLine(data.appVersion || data.version || '');
        return;
      }
      if (data.type === 'sw-cache-status') {
        applyServiceWorkerCacheStatus(data, 'message');
        return;
      }
      if (data.type === 'sw-activated') {
        pwaHardeningStatus.swActivatedMessages = Number(pwaHardeningStatus.swActivatedMessages || 0) + 1;
        applyServiceWorkerCacheStatus(data, 'activated');
        if (data.appVersion || data.version) updateToastVersionLine(data.appVersion || data.version);
        hideUpdateToast();
        void runLiveRefresh(data.reason || data.type || 'sw-message', { force: true });
        scheduleUpdateReload('sw-activated');
        return;
      }
      if (data.type === 'refresh-ui' || data.type === 'sw-ready') {
        void runLiveRefresh(data.reason || data.type || 'sw-message', { force: true });
      }
    });

  }

  registerListener(window, 'online', () => {
    setConnectionFlag();
    if (typeof flushSupabaseSyncQueue === 'function') void flushSupabaseSyncQueue();
    void runLiveRefresh('online', { force: true });
    void refreshServiceWorkerRegistration('online', { force: true });
    requestActiveServiceWorkerCacheStatus('online', { force: true });
    signalStateChange('online');
  });
  registerListener(window, 'offline', () => {
    setConnectionFlag();
    if (typeof updateDashboard === 'function') updateDashboard();
    signalStateChange('offline');
  });
  registerListener(window, 'pageshow', () => {
    setConnectionFlag();
    if (navigator.onLine) {
      if (typeof flushSupabaseSyncQueue === 'function') void flushSupabaseSyncQueue();
      void runLiveRefresh('pageshow');
      void refreshServiceWorkerRegistration('pageshow');
      requestActiveServiceWorkerCacheStatus('pageshow');
    }
  });
  registerListener(window, 'focus', () => {
    if (!document.hidden && navigator.onLine) {
      void runLiveRefresh('focus');
      void refreshServiceWorkerRegistration('focus');
      requestActiveServiceWorkerCacheStatus('focus');
    }
  });
  registerListener(window, 'visibilitychange', () => {
    setConnectionFlag();
    if (!document.hidden && navigator.onLine) {
      void runLiveRefresh('visible');
      void refreshServiceWorkerRegistration('visible');
      requestActiveServiceWorkerCacheStatus('visible');
    }
  });
  registerListener(window, 'storage', (event) => {
    if (!event || !event.key) return;
    if (event.key === 'rotationBuild' || event.key === 'rotace_state_v1' || event.key === 'adminUnlocked' || event.key === 'rotace_live_signal_v1') {
      void runLiveRefresh('storage', { force: true });
      if (typeof forceHomeRefresh === 'function') forceHomeRefresh();
      if (typeof renderRotace === 'function') renderRotace();
      if (typeof renderStatsPanel === 'function') renderStatsPanel();
    }
  });

  liveRefreshTimer = registerInterval(() => {
    if (!document.hidden && navigator.onLine) void runLiveRefresh('interval');
  }, LIVE_REFRESH_INTERVAL_MS);

  swUpdateTimer = registerInterval(() => {
    if (!document.hidden && navigator.onLine) void refreshServiceWorkerRegistration('interval');
  }, SW_UPDATE_CHECK_INTERVAL_MS);

  registerListener(window, 'beforeunload', () => {
    cleanupAllLifecycle();
  });
}
