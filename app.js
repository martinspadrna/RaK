// RaK 1.7 – stabilní release po dokončení 1.6 optimalizací, auditu a úplné zálohy.
try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('app.js', 'loaded', { source: 'index' }); } catch (err) {}

(async () => {
  const releaseMetadata = window.RAK_RELEASE_METADATA;
  if (!releaseMetadata || !releaseMetadata.displayVersion || !releaseMetadata.buildId) {
    throw new Error('Chybí metadata vydání aplikace.');
  }
  const RAK_MODULE_CACHE_VERSION = releaseMetadata.moduleCacheVersion;
  const RAK_DEV_UPDATE_BUILD = releaseMetadata.buildId;
  window.RAK_RELEASE_VERSION = releaseMetadata.displayVersion;
  const RAK_BOOT_V2_ENABLED = true;
  const RAK_SUPABASE_SDK_URL = 'supabase-vendor-2.110.7.js';
  const RAK_SUPABASE_SDK_INTEGRITY = 'sha384-hazsLVND17GNLVdtV19te6qbFT2YuLgl8SamcF+QR5eIOC+W4dGKrUNMxU1jH1zD';
  let supabaseSdkLoadPromise = null;

  function hasRakSupabaseSdk() {
    return !!(window.supabase && typeof window.supabase.createClient === 'function');
  }

  function noteRakSupabaseSdk(status) {
    try {
      if (typeof window.rakNoteExternalDependency === 'function') window.rakNoteExternalDependency('supabase', status, RAK_SUPABASE_SDK_URL);
    } catch (_) {}
  }

  function findRakSupabaseSdkScript() {
    try {
      return Array.from(document.scripts || []).find((script) => String(script.src || '').includes('/supabase-vendor-2.110.7.js')) || null;
    } catch (_) { return null; }
  }

  function ensureRakSupabaseSdk(options = {}) {
    if (hasRakSupabaseSdk()) {
      noteRakSupabaseSdk('loaded');
      return Promise.resolve(window.supabase);
    }
    const force = !!options.force;
    if (!force && typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.resolve(null);
    if (supabaseSdkLoadPromise) return supabaseSdkLoadPromise;

    supabaseSdkLoadPromise = new Promise((resolve, reject) => {
      let script = findRakSupabaseSdkScript();
      if (script) {
        try { script.remove(); } catch (_) {}
      }
      script = document.createElement('script');
      script.src = RAK_SUPABASE_SDK_URL;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.integrity = RAK_SUPABASE_SDK_INTEGRITY;
      script.dataset.rakSupabaseSdkRetry = '1';
      noteRakSupabaseSdk('loading');
      script.onload = () => {
        if (!hasRakSupabaseSdk()) {
          const error = new Error('Supabase SDK se stáhlo, ale klient není dostupný.');
          noteRakSupabaseSdk('failed');
          reject(error);
          return;
        }
        noteRakSupabaseSdk('loaded');
        resolve(window.supabase);
      };
      script.onerror = () => {
        noteRakSupabaseSdk('failed');
        reject(new Error('Supabase SDK se nepodařilo načíst.'));
      };
      document.head.appendChild(script);
    }).finally(() => { supabaseSdkLoadPromise = null; });
    return supabaseSdkLoadPromise;
  }

  window.rakEnsureSupabaseSdk = ensureRakSupabaseSdk;
  window.RAK_PWA_BUILD = RAK_DEV_UPDATE_BUILD;
  window.RAK_BOOT_V2_ENABLED = RAK_BOOT_V2_ENABLED;

  try {
    const correctionsHome = document.querySelector('#kalkulacky > .calcHomeSectionCorrections');
    if (correctionsHome) correctionsHome.open = true;
  } catch (err) {}

  const criticalFiles = [
    "supabase-config.js",
    "rak-user-profile.js",
    "rak-auth-gate.js",
    "rak-account-access.js",
    "rak-login-splash.js",
    "rak-login-fix.js",
    "rak-login-life.js"
  ];

  const startupFiles = [
    "core.js",
    "lifecycle.js",
    "app-runtime-guards.js",
    "qr.js",
    "payroll.js",
    "dashboard.js",
    "appearance-theme.js",
    "ui.js",
    "app-navigation.js",
    "app-bottom-nav.js",
    "app-actions.js",
    "app-pwa-connectivity.js",
    "app-home-boot.js",
    "rak-runtime-stability.js",
    "rak-feature-routing.js"
  ];

  const rotationFeatureFiles = [
    "stats.js",
    "rotation-name-index.js",
    "rotace.js",
    "rotation-tasks.js",
    "admin-daymods.js",
    "app-rotation-controls.js"
  ];

  const calculatorFeatureFiles = [
    "rotation-name-index.js",
    "brusy.js",
    "soustruhy.js",
    "admin-fhb-calibration.js",
    "brusy-fhb-correction.js",
    "brusy-fhb-v157.js",
    "brusy-fhb-v158.js"
  ];

  const syncFeatureFiles = [
    "supabase-bridge.js",
    "app-rotation-sync.js"
  ];

  const menuFeatureFiles = [
    "changelog.js",
    "app-menu.js",
    "app-menu-pages.js",
    "app-menu-bug-report.js",
    "app-menu-profile.js",
    "app-menu-shift-report.js",
    "app-admin-unlock.js",
    "rak-vacation-report.js",
    "rak-shift-report.js",
    "rak-shift-report-share.js"
  ];

  const adminFeatureFiles = [
    "admin-rotation-editor.js",
    "admin-rotation-overtime.js",
    "admin-rotation-generator.js",
    "admin-rotation-generator-wizard.js",
    "admin-machine-settings.js",
    "admin-rotation.js",
    "admin-machine-tasks.js",
    "admin-fhb-calibration.js",
    "brusy-fhb-correction.js",
    "brusy-fhb-v158.js",
    "admin-food.js",
    "admin-reports.js",
    "admin-service-usage.js",
    "admin-daymods.js",
    "app-menu-admin-export.js",
    "app-menu-admin-storage.js",
    "app-menu-admin-service.js",
    "app-menu-admin-renderer.js",
    "export.js",
    "app-excel-import.js",
    "rak-lazy-external-libs.js",
    "rak-complete-backup.js"
  ];

  const deferredFiles = [
    "app-runtime-guards.js",
    "app-pwa-connectivity.js",
    "core.js",
    "lifecycle.js",
    "qr.js",
    "payroll.js",
    "brusy.js",
    "stats.js",
    "rotation-name-index.js",
    "dashboard.js",
    "soustruhy.js",
    "rotace.js",
    "rotation-tasks.js",
    "admin-fhb-calibration.js",
    "brusy-fhb-correction.js",
    "brusy-fhb-v157.js",
    "appearance-theme.js",
    "changelog.js",
    "admin-rotation-editor.js",
    "admin-rotation-overtime.js",
    "admin-rotation-generator.js",
    "admin-rotation-generator-wizard.js",
    "admin-machine-settings.js",
    "admin-rotation.js",
    "admin-machine-tasks.js",
    "admin-food.js",
    "admin-reports.js",
    "admin-service-usage.js",
    "admin-daymods.js",
    "ui.js",
    "app-navigation.js",
    "app-bottom-nav.js",
    "app-menu-admin-export.js",
    "app-menu-admin-storage.js",
    "app-menu-admin-service.js",
    "app-menu-admin-renderer.js",
    "app-menu.js",
    "app-menu-pages.js",
    "app-menu-bug-report.js",
    "app-menu-profile.js",
    "app-menu-shift-report.js",
    "app-actions.js",
    "app-boot-selftest.js",
    "export.js",
    "supabase-bridge.js",
    "app-rotation-sync.js",
    "app-excel-import.js",
    "rak-lazy-external-libs.js",
    "rak-complete-backup.js",
    "app-rotation-controls.js",
    "app-admin-unlock.js",
    "app-home-boot.js",
    "app-init.js",
    "rak-vacation-report.js",
    "rak-shift-report.js",
    "rak-shift-report-share.js",
    "brusy-fhb-v158.js",
    "rak-runtime-stability.js",
    "rak-mobile-layout-guard.js",
    "rak-feature-routing.js"
  ];

  const idleFoundationFiles = [
    "rak-audit-baseline.js",
    "rak-runtime-health.js",
    "rak-mobile-layout-guard.js"
  ];

  const idleAuditFiles = [
    "app-health-audits.js",
    "app-postload-audits.js",
    "rak-storage-sync-audit.js",
    "rak-boot-sequence-audit.js",
    "rak-dom-action-audit.js",
    "rak-supabase-client-audit.js",
    "rak-appsec-privacy-audit.js",
    "rak-release-gates.js",
    "rak-export-release-audit.js",
    "rak-release-ops-audit.js",
    "rak-due-diligence-progress.js",
    "rak-performance-ci-audit.js",
    "rak-mobile-smoke-audit.js",
    "app-boot-selftest.js"
  ];

  // await Promise.all(deferredFiles.map(loadScript))

  const featureSpecs = Object.freeze({
    rotation: Object.freeze({ files: rotationFeatureFiles, dependencies: Object.freeze([]) }),
    calculators: Object.freeze({ files: calculatorFeatureFiles, dependencies: Object.freeze([]) }),
    // RAK_17082_SYNC_REQUIRES_ROTATION_UI: dashboard "kam jdu" and the first
    // Rotace paint use helpers from rotace.js. Sync must never apply a snapshot
    // before those consumers exist, especially on a cold offline iOS start.
    sync: Object.freeze({ files: syncFeatureFiles, dependencies: Object.freeze(["rotation"]) }),
    menu: Object.freeze({ files: menuFeatureFiles, dependencies: Object.freeze([]) }),
    admin: Object.freeze({ files: adminFeatureFiles, dependencies: Object.freeze(["menu", "sync"]) })
  });

  const modulePromises = new Map();
  const featurePromises = new Map();
  const featureState = Object.create(null);
  let remoteSyncActivationPromise = null;
  let rakBootLocalHydrationInProgress = false;
  const bootStartedAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  window.__rakBootV2StartedAt = bootStartedAt;

  // RAK_17084_LOCAL_FIRST_BOOT: read the verified Rotation snapshot without loading
  // Supabase. Returning/offline starts can paint "kam jdu" before any remote work.
  const RAK_BOOT_ROTATION_LOCAL_KEY = 'rotace_kalkulacky_state_v123';
  const RAK_BOOT_ROTATION_META_KEY = 'rotace_supabase_local_state_v1';
  const RAK_BOOT_ROTATION_DURABLE_CACHE = 'rotace-offline-data-v1';
  const RAK_BOOT_ROTATION_DURABLE_REQUEST = './__rak/offline/rotation-state-v1.json';

  function rakBootRotationFingerprint(rotation) {
    let json = '';
    try { json = JSON.stringify(rotation); } catch (_) { return ''; }
    let hash = 2166136261;
    for (let i = 0; i < json.length; i += 1) {
      hash ^= json.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return json.length.toString(36) + ':' + (hash >>> 0).toString(36);
  }

  function rakBootRotationCandidate(payload, meta, source, strictFingerprint) {
    if (!payload || typeof payload !== 'object' || !payload.months) return null;
    const safeMeta = meta && typeof meta === 'object' ? meta : {};
    const actualFingerprint = rakBootRotationFingerprint(payload);
    const storedFingerprint = String(safeMeta.fingerprint || '');
    const verified = !storedFingerprint || storedFingerprint === actualFingerprint;
    if (!verified && strictFingerprint) return null;
    return {
      payload,
      source: verified ? String(source || 'local-cache') : String(source || 'local-cache') + '-unverified',
      revision: verified ? Math.max(0, Number(safeMeta.revision || 0) || 0) : 0,
      savedAt: verified ? Math.max(0, Number(safeMeta.savedAt || safeMeta.updatedAt || 0) || 0) : 0,
      fingerprint: actualFingerprint,
      verified
    };
  }

  function rakReadBootLocalRotationCandidate() {
    try {
      const localMeta = JSON.parse(localStorage.getItem(RAK_BOOT_ROTATION_META_KEY) || 'null');
      const canonical = JSON.parse(localStorage.getItem(RAK_BOOT_ROTATION_LOCAL_KEY) || 'null');
      const legacy = localMeta && localMeta.rotation && typeof localMeta.rotation === 'object' ? localMeta.rotation : null;
      const payload = canonical && canonical.months ? canonical : (legacy && legacy.months ? legacy : null);
      if (!payload) return null;
      const meta = Object.assign({}, localMeta && localMeta.rotationMeta || {});
      if (!meta.savedAt && localMeta) meta.savedAt = Number(localMeta.rotationSavedAt || localMeta.updatedAt || 0) || 0;
      return rakBootRotationCandidate(payload, meta, 'local-cache', false);
    } catch (_) { return null; }
  }

  async function rakReadBootDurableRotationCandidate() {
    if (typeof caches === 'undefined') return null;
    try {
      const cache = await caches.open(RAK_BOOT_ROTATION_DURABLE_CACHE);
      const requestUrl = new URL(RAK_BOOT_ROTATION_DURABLE_REQUEST, window.location.href).href;
      const response = await cache.match(requestUrl);
      if (!response) return null;
      const stored = await response.json();
      return rakBootRotationCandidate(stored && stored.payload, stored, 'durable-cache', true);
    } catch (_) { return null; }
  }

  function rakCompareBootRotationCandidates(a, b) {
    if (!a) return b ? -1 : 0;
    if (!b) return 1;
    if (a.revision !== b.revision) {
      if (a.revision > 0 && b.revision === 0) return 1;
      if (b.revision > 0 && a.revision === 0) return -1;
      if (a.revision > 0 && b.revision > 0) return a.revision - b.revision;
    }
    if (a.savedAt !== b.savedAt) return a.savedAt - b.savedAt;
    if (a.verified !== b.verified) return Number(a.verified) - Number(b.verified);
    return Number(a.source === 'durable-cache') - Number(b.source === 'durable-cache');
  }

  async function hydrateRakRotationLocalFirst() {
    const local = rakReadBootLocalRotationCandidate();
    const durable = await rakReadBootDurableRotationCandidate();
    let selected = local || durable;
    if (local && durable && rakCompareBootRotationCandidates(durable, local) > 0) selected = durable;
    if (!selected || !selected.payload) return null;
    try {
      if (typeof app === 'object' && app) app.rotation = selected.payload;
      window.__rakBootLocalFirstRotation = {source:selected.source,revision:selected.revision,savedAt:selected.savedAt,verified:selected.verified,at:Date.now()};
    } catch (_) {}
    return selected;
  }

  window.rakMarkFirstUsableRender = function rakMarkFirstUsableRender(source) {
    if (Number(window.__rakFirstUsableRenderMs || 0) > 0) return window.__rakFirstUsableRenderMs;
    const hasRotation = !!(typeof app === 'object' && app && app.rotation && app.rotation.months);
    if (!hasRotation) return null;
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const elapsed = Math.max(0, Math.round(now - bootStartedAt));
    window.__rakFirstUsableRenderMs = elapsed;
    window.__rakFirstUsableRenderSource = String(source || 'dashboard');
    window.__rakFirstUsableRenderHasRotation = true;
    return elapsed;
  };

  function normalizeScriptPath(value) {
    return String(value || '').replace(/^\.\//, '').split('?')[0].trim();
  }

  function alreadyInDocument(src) {
    try {
      return Array.from(document.scripts || []).some((script) => {
        const attr = normalizeScriptPath(script.getAttribute('src') || '');
        return attr === src || attr.endsWith('/' + src);
      });
    } catch (err) {
      return false;
    }
  }

  const loadScript = (src) => {
    const key = normalizeScriptPath(src);
    if (!key) return Promise.resolve();
    if (modulePromises.has(key)) return modulePromises.get(key);
    if (alreadyInDocument(key)) {
      const ready = Promise.resolve(key);
      modulePromises.set(key, ready);
      return ready;
    }

    const promise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const started = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady(key, 'loading', { source: 'boot-v2-loader' });
      script.src = key + "?v=" + encodeURIComponent(RAK_MODULE_CACHE_VERSION);
      script.async = false;
      script.dataset.rakBootV2Module = key;
      script.onload = () => {
        const ended = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady(key, 'loaded', { source: 'boot-v2-loader', durationMs: ended - started });
        resolve(key);
      };
      script.onerror = () => {
        const ended = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const error = new Error(`Nepodařilo se načíst ${key}`);
        modulePromises.delete(key);
        if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady(key, 'error', { source: 'boot-v2-loader', durationMs: ended - started, error: error.message });
        reject(error);
      };
      document.head.appendChild(script);
    });
    modulePromises.set(key, promise);
    return promise;
  };

  function loadFiles(files) {
    const list = Array.from(new Set((Array.isArray(files) ? files : []).map(normalizeScriptPath).filter(Boolean)));
    return Promise.all(list.map((file) => loadScript(file)));
  }

  function featureForPage(pageId) {
    const id = String(pageId || '').trim();
    if (id === 'rotace' || id === 'statistiky') return 'rotation';
    if (id === 'kalkulacky' || id === 'soustruhy' || id === 'frezky' || id === 'brusy' || id === 'pracka' || id.startsWith('korekce-')) return 'calculators';
    if (id === 'menu') return 'menu';
    return '';
  }

  function isFeatureReady(name) {
    return featureState[String(name || '').trim()] === 'ready';
  }

  function reapplyMoreSinglePassAfterLazyMenu() {
    try {
      if (typeof window.toggleAppMenu !== 'function' || typeof showPage !== 'function') return;
      if (window.toggleAppMenu.__rakBootV2SinglePass) return;
      const previous = window.toggleAppMenu;
      const singlePass = function toggleAppMenuBootV2SinglePass() {
        showPage('menu');
        try { if (typeof window.__rakApplyBottomNavMoreHardFix === 'function') window.__rakApplyBottomNavMoreHardFix(); } catch (err) {}
        try { if (typeof window.__rakApplyFixedBottomNavMetricsNow === 'function') window.__rakApplyFixedBottomNavMetricsNow(); } catch (err) {}
      };
      singlePass.__rakBootV2SinglePass = true;
      singlePass.__rakBootV2Previous = previous;
      window.toggleAppMenu = singlePass;
    } catch (err) {
      console.warn('Boot v2 More single-pass restore failed', err);
    }
  }

  function activateRemoteSync() {
    if (remoteSyncActivationPromise) return remoteSyncActivationPromise;
    const run = (async () => {
      try {
        if (typeof navigator === 'undefined' || navigator.onLine !== false) {
          await ensureRakSupabaseSdk({ force: true });
        }
      } catch (err) {
        console.warn('Supabase SDK recovery failed', err);
      }
      try {
        if (window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.init === 'function') {
          await window.RotationSupabaseBridge.init();
        }
      } catch (err) {
        console.warn('Supabase bridge init failed', err);
      }
      try {
        if (typeof syncRotationFromSupabase === 'function') await syncRotationFromSupabase(false);
      } catch (err) {
        console.warn('Online synchronizace rozpisů selhala', err);
      }
      try { if (typeof forceHomeRefresh === 'function') forceHomeRefresh(); } catch (err) {}
      return true;
    })();
    remoteSyncActivationPromise = run;
    run.finally(() => {
      if (remoteSyncActivationPromise === run) remoteSyncActivationPromise = null;
    });
    return run;
  }

  window.addEventListener('online', () => {
    void ensureRakSupabaseSdk({ force: true })
      .then(() => ensureFeature('sync'))
      .then(() => activateRemoteSync())
      .catch((err) => console.warn('Supabase reconnect without reload failed', err));
  });

  function afterFeatureReady(name) {
    if (name === 'rotation') {
      try { if (typeof installRakRotationControlBindings === 'function') installRakRotationControlBindings(); } catch (err) { console.warn('Rotace bindings po lazy-loadu selhaly', err); }
      // A snapshot may already be in app.rotation before this lazy group becomes
      // available. Rehydrate all Rotation-driven UI immediately; do not wait for
      // a page reopen or a full application restart.
      try { if (typeof renderRotace === 'function') renderRotace(); } catch (err) { console.warn('Rotace first paint after feature load failed', err); }
      try { if (typeof updateDashboard === 'function') updateDashboard(); } catch (err) { console.warn('Dashboard rotation rehydrate failed', err); }
      try { if (typeof renderRakDashboardAnnouncement === 'function') renderRakDashboardAnnouncement(); } catch (err) {}
    } else if (name === 'calculators') {
      try { if (typeof restoreInputs === 'function') restoreInputs(); } catch (err) {}
    } else if (name === 'sync') {
      // RAK_17082_BOOT_SYNC_ORDER: when startup is loading sync only to hydrate
      // persisted Rotation, do not race that hydration with remote activation.
      if (!rakBootLocalHydrationInProgress) void activateRemoteSync();
    } else if (name === 'menu') {
      reapplyMoreSinglePassAfterLazyMenu();
      try { if (typeof window.rakUserProfileRefreshMenu === 'function') window.rakUserProfileRefreshMenu(); } catch (err) {}
    }
  }

  async function ensureFeature(name) {
    const key = String(name || '').trim();
    const spec = featureSpecs[key];
    if (!spec) throw new Error('Neznámá RaK feature skupina: ' + key);
    if (isFeatureReady(key)) return key;
    if (featurePromises.has(key)) return featurePromises.get(key);

    featureState[key] = 'loading';
    const promise = (async () => {
      try {
        for (const dependency of spec.dependencies) await ensureFeature(dependency);
        await loadFiles(spec.files);
        featureState[key] = 'ready';
        afterFeatureReady(key);
        try { window.dispatchEvent(new CustomEvent('rak:feature-ready', { detail: { feature: key, at: Date.now() } })); } catch (err) {}
        return key;
      } catch (err) {
        featureState[key] = 'error';
        featurePromises.delete(key);
        throw err;
      }
    })();
    featurePromises.set(key, promise);
    return promise;
  }

  function handleFeatureLoadError(error, feature) {
    console.error('RaK feature load failed', feature, error);
    try {
      alert('Nepodařilo se načíst část aplikace' + (feature ? ' (' + feature + ')' : '') + '. Zkontroluj připojení a zkus to znovu.');
    } catch (err) {}
  }

  window.rakEnsureFeature = ensureFeature;
  if (!window.__rakProfileAppearanceSyncListener) {
    window.__rakProfileAppearanceSyncListener = true;
    let appearanceSyncPromise = null;
    let appearanceSyncLastAt = 0;
    const syncActiveAppearance = (source) => {
      const now = Date.now();
      if (appearanceSyncPromise) return appearanceSyncPromise;
      if (source !== 'startup' && source !== 'profile-ready' && now - appearanceSyncLastAt < 1500) return Promise.resolve(false);
      appearanceSyncLastAt = now;
      appearanceSyncPromise = ensureFeature('sync').then(() => {
        try {
          if (typeof applyProfileUiPreferencesForActiveAccount === 'function') {
            return applyProfileUiPreferencesForActiveAccount({ loadRemote: true, source: source || 'active-device-sync' });
          }
        } catch (err) { console.warn('Profile UI active-device sync failed', err); }
        return false;
      }).catch((err) => { console.warn('Profile UI active-device sync load failed', err); return false; })
        .finally(() => { appearanceSyncPromise = null; });
      return appearanceSyncPromise;
    };
    window.__rakSyncActiveAppearance = syncActiveAppearance;
    window.addEventListener('rak:user-profile-ready', () => { void syncActiveAppearance('profile-ready'); });
    window.addEventListener('pageshow', () => { void syncActiveAppearance('pageshow'); });
    window.addEventListener('online', () => { void syncActiveAppearance('online'); });
    window.addEventListener('focus', () => { void syncActiveAppearance('focus'); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) void syncActiveAppearance('visibility'); });
  }
  window.rakIsFeatureReady = isFeatureReady;
  window.rakFeatureForPage = featureForPage;
  window.rakEnsureFeatureForPage = function rakEnsureFeatureForPage(pageId) {
    const feature = featureForPage(pageId);
    return feature ? ensureFeature(feature) : Promise.resolve('startup');
  };
  window.rakHandleFeatureLoadError = handleFeatureLoadError;
  window.getRakBootV2Status = function getRakBootV2Status() {
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    return {
      ok: true,
      enabled: RAK_BOOT_V2_ENABLED,
      version: RAK_MODULE_CACHE_VERSION,
      startupReady: !!window.__rakBootV2StartupReady,
      startupReadyMs: Number(window.__rakBootV2StartupReadyMs || 0),
      firstUsableRenderMs: Number(window.__rakFirstUsableRenderMs || 0) || null,
      firstUsableRenderSource: String(window.__rakFirstUsableRenderSource || ''),
      localFirstRotation: window.__rakBootLocalFirstRotation || null,
      elapsedMs: Math.max(0, Math.round(now - bootStartedAt)),
      loadedModuleCount: modulePromises.size,
      features: Object.keys(featureSpecs).reduce((out, key) => {
        out[key] = featureState[key] || 'deferred';
        return out;
      }, {}),
      startupFiles: startupFiles.slice(),
      featureFileCounts: Object.fromEntries(Object.entries(featureSpecs).map(([key, spec]) => [key, spec.files.length]))
    };
  };

  try {
    if (window.__rakModuleReadinessRegistry) {
      window.__rakModuleReadinessRegistry.expected = ['module-readiness.js', 'rak-namespace.js', 'rak-dom-security-hardening.js', 'app.js', 'data.js']
        .concat(criticalFiles, startupFiles);
      if (typeof initialRotationData !== 'undefined' && typeof window.rakMarkModuleReady === 'function') {
        window.rakMarkModuleReady('data.js', 'loaded', { source: 'index-preload' });
      }
    }
  } catch (err) {}

  for (const file of criticalFiles) await loadScript(file);

  try { if (typeof window.rakUserProfileBootstrap === 'function') window.rakUserProfileBootstrap(); } catch (err) { console.warn('RaK user profile bootstrap failed', err); }

  let hasStoredProfile = false;
  try { hasStoredProfile = !!(typeof window.rakUserProfileGet === 'function' && window.rakUserProfileGet()); } catch (err) {}

  if (!hasStoredProfile) {
    try { if (typeof window.installRakLoginSplash === 'function') window.installRakLoginSplash(); } catch (err) { console.warn('RaK login splash failed', err); }
    try { if (typeof window.rakInstallLoginLife === 'function') window.rakInstallLoginLife(); } catch (err) { console.warn('RaK login mascot failed', err); }
    await new Promise((resolve) => {
      if (typeof requestAnimationFrame !== 'function') { setTimeout(resolve, 0); return; }
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  }

  await loadFiles(startupFiles);

  try { if (typeof restoreInputs === 'function') restoreInputs(); } catch (err) {}
  try {
    const storedProfile = typeof window.rakUserProfileGet === 'function' ? window.rakUserProfileGet() : null;
    if (storedProfile && typeof window.rakUserProfileApplyToRuntime === 'function') window.rakUserProfileApplyToRuntime(storedProfile);
    if (typeof window.rakUserProfileRefreshMenu === 'function') window.rakUserProfileRefreshMenu();
  } catch (err) { console.warn('RaK user profile runtime restore failed', err); }
  try { if (typeof window.__rakSyncActiveAppearance === 'function') void window.__rakSyncActiveAppearance('startup'); } catch (err) {}

  // RAK_17084_LOCAL_FIRST_BOOT: navigator.onLine is only a hint. Returning
  // installations first restore the newest verified local Rotation and load only
  // Rotation UI helpers; Supabase activation remains an idle/post-ready concern.
  const rakReturningServiceWorkerStart = !!(
    typeof navigator !== 'undefined' &&
    navigator.serviceWorker &&
    navigator.serviceWorker.controller
  );
  const rakMustHydrateRotationBeforeReady = !!(
    (typeof navigator !== 'undefined' && navigator.onLine === false) ||
    rakReturningServiceWorkerStart
  );
  if (rakMustHydrateRotationBeforeReady) {
    rakBootLocalHydrationInProgress = true;
    try {
      await hydrateRakRotationLocalFirst();
      await ensureFeature('rotation');
      try { if (typeof updateDashboard === 'function') updateDashboard(); } catch (err) {}
    } catch (err) {
      console.warn('Local-first Rotation restore during boot failed', err);
    } finally {
      rakBootLocalHydrationInProgress = false;
    }
  }

  const startupReadyAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  window.__rakBootV2StartupReady = true;
  window.__rakBootV2StartupReadyMs = Math.max(0, Math.round(startupReadyAt - bootStartedAt));
  if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('boot-loader', 'ready', { source: 'boot-v2', startupReadyMs: window.__rakBootV2StartupReadyMs });

  try {
    const DEV_RESET_KEY = 'rak_dev_pwa_prompt_reset_build';
    if (localStorage.getItem(DEV_RESET_KEY) !== RAK_DEV_UPDATE_BUILD) {
      sessionStorage.removeItem('rotace_sw_update_notice_v1');
      sessionStorage.removeItem('rotace_sw_update_pending_v1');
      localStorage.removeItem('rotace_sw_update_suppress_v1');
      localStorage.setItem(DEV_RESET_KEY, RAK_DEV_UPDATE_BUILD);
    }
  } catch (err) {}

  if (typeof installPwaAndConnectivityHooks === 'function') installPwaAndConnectivityHooks();
  if (typeof installBottomNavBindings === 'function') installBottomNavBindings();
  try { if (typeof applyBottomNavMoreHardFix === 'function') applyBottomNavMoreHardFix(); } catch (err) { console.warn('Bottom nav Více hard-fix failed', err); }
  try { if (typeof applyRakFixedBottomNavMetrics === 'function') applyRakFixedBottomNavMetrics(); } catch (err) { console.warn('Bottom nav fixed metrics failed', err); }
  if (typeof installDelegatedAppActions === 'function') installDelegatedAppActions();

  try {
    if (typeof installRakHomeBootSequence === 'function') installRakHomeBootSequence();
    else if (typeof window.__rotaceBootHomeRefreshLate === 'function') window.__rotaceBootHomeRefreshLate();
    else if (typeof bootHomeRefresh === 'function') bootHomeRefresh();
  } catch (err) { console.warn('Post-load Home boot failed', err); }

  const startSync = () => ensureFeature('sync').catch((err) => console.warn('Boot v2 sync preload failed', err));
  if (typeof requestIdleCallback === 'function') requestIdleCallback(startSync, { timeout: 1200 });
  else setTimeout(startSync, 450);

  const runIdleAudits = () => {
    loadFiles(idleFoundationFiles).then(() => Promise.all(idleAuditFiles.map(loadScript))).then(() => {
      try { window.__rakIdleAuditsReady = true; } catch (err) {}
    }).catch((err) => {
      console.warn('Idle audit moduly se nepodařilo načíst', err);
    });
  };
  if (typeof requestIdleCallback === 'function') requestIdleCallback(runIdleAudits, { timeout: 5000 });
  else setTimeout(runIdleAudits, 3200);
})().catch(err => {
  console.error(err);
  alert("Nepodařilo se načíst aplikační skripty: " + (err && err.message ? err.message : String(err)));
});
