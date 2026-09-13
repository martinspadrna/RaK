// RaK v1.5.93 – Boot v2 routing + stabilní korekční folds + iOS PWA update reload guard.
(function installRakFeatureRouting() {
  'use strict';
  if (window.__rakFeatureRoutingInstalled) return;
  window.__rakFeatureRoutingInstalled = true;

  // iOS standalone PWA někdy ignoruje location.reload() po převzetí nového service workeru.
  // Po potvrzené aktualizaci proto provedeme ještě verzovanou navigaci na skutečně novou URL.
  // Guard se nespouští jen při zobrazení toastu – vyžaduje pending + suppress, které vzniknou až po klepnutí na Aktualizovat.
  (function installRakConfirmedUpdateReloadGuard() {
    if (window.__rakConfirmedUpdateReloadGuardInstalled) return;
    window.__rakConfirmedUpdateReloadGuardInstalled = true;
    const PENDING_KEY = 'rotace_sw_update_pending_v1';
    const SUPPRESS_KEY = 'rotace_sw_update_suppress_v1';
    let navigationStarted = false;
    let clickFallbackTimer = 0;

    const readStorage = (storage, key) => {
      try { return String(storage.getItem(key) || '').trim(); } catch (_) { return ''; }
    };
    const updateWasApproved = () => !!(readStorage(sessionStorage, PENDING_KEY) && readStorage(localStorage, SUPPRESS_KEY));
    const freshUrl = (reason) => {
      const url = new URL(window.location.href);
      const build = String(window.RAK_PWA_BUILD || window.RAK_DEV_BUILD || 'v1.5.93').replace(/\s+/g, '');
      url.searchParams.set('_rak_update', build + '-' + Date.now().toString(36));
      url.searchParams.set('_rak_update_reason', String(reason || 'confirmed').slice(0, 32));
      return url.href;
    };
    const forceFreshNavigation = (reason) => {
      if (navigationStarted || !updateWasApproved()) return false;
      navigationStarted = true;
      const target = freshUrl(reason);
      const replaceNow = () => {
        try { window.location.replace(target); }
        catch (_) { try { window.location.href = target; } catch (_) {} }
      };
      // Nativní timer záměrně není registrovaný v lifecycle cleanupu; musí přežít i rozběhnutý starý reload.
      window.setTimeout(replaceNow, 140);
      window.setTimeout(() => {
        try {
          if (document.visibilityState !== 'hidden') window.location.href = target;
        } catch (_) { replaceNow(); }
      }, 1400);
      return true;
    };
    const scheduleClickFallback = () => {
      if (clickFallbackTimer) window.clearTimeout(clickFallbackTimer);
      clickFallbackTimer = window.setTimeout(() => {
        clickFallbackTimer = 0;
        forceFreshNavigation('update-click-fallback');
      }, 3600);
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        forceFreshNavigation('controllerchange');
      });
      navigator.serviceWorker.addEventListener('message', (event) => {
        const data = event && event.data ? event.data : null;
        if (data && data.type === 'sw-activated') forceFreshNavigation('sw-activated');
      });
    }
    document.addEventListener('click', (event) => {
      const target = event && event.target && typeof event.target.closest === 'function'
        ? event.target.closest('.rakUpdateToastAction')
        : null;
      if (target) scheduleClickFallback();
    }, false);

    window.__rakForceConfirmedUpdateReload = forceFreshNavigation;
  })();

  if (typeof window.adminBindRotationZoomGuard !== 'function') {
    const adminZoomStub = function adminBindRotationZoomGuardBootV2Stub() {};
    adminZoomStub.__rakBootV2Stub = true;
    window.adminBindRotationZoomGuard = adminZoomStub;
  }

  const ACTION_FEATURE = Object.freeze({
    rotace: 'rotation',
    rozpisy: 'rotation',
    statistiky: 'rotation',
    kalkulacky: 'calculators',
    menu: 'menu'
  });

  function resolveTarget(event) {
    const source = event && event.target && typeof event.target.closest === 'function' ? event.target : null;
    if (!source) return null;
    const nav = source.closest('nav.bottomNav button[data-action]');
    if (nav && document.documentElement.contains(nav)) {
      const feature = String(ACTION_FEATURE[String(nav.dataset.action || '').trim()] || '');
      return feature ? { element: nav, feature } : null;
    }
    const admin = source.closest('#appMenuBody [data-menu-action="admin"]');
    if (admin && document.documentElement.contains(admin)) return { element: admin, feature: 'admin' };
    return null;
  }

  function ensureFeatureWithAuthOrder(feature) {
    if (typeof window.rakEnsureFeature !== 'function') return Promise.resolve(feature || '');
    const key = String(feature || '').trim();
    if (key === 'menu' || key === 'admin') {
      return window.rakEnsureFeature('sync').then(() => window.rakEnsureFeature(key));
    }
    return window.rakEnsureFeature(key);
  }

  function startFeature(target) {
    if (!target || !target.element || !target.feature || typeof window.rakEnsureFeature !== 'function') return null;
    if (typeof window.rakIsFeatureReady === 'function' && window.rakIsFeatureReady(target.feature)) return null;
    try {
      target.element.classList.add('rakFeatureLoading');
      target.element.setAttribute('aria-busy', 'true');
    } catch (_) {}
    return ensureFeatureWithAuthOrder(target.feature);
  }

  function clearVacationReportStateWhenLeaving(event) {
    const source = event && event.target && typeof event.target.closest === 'function' ? event.target : null;
    const nav = source && source.closest('nav.bottomNav button[data-action]');
    if (!nav || String(nav.dataset.action || '') === 'menu') return;
    const body = document.getElementById('appMenuBody');
    if (body) body.dataset.rakVacationReportOpen = '0';
  }

  function openVacationReportFromAnyEntry(event) {
    const source = event && event.target && typeof event.target.closest === 'function' ? event.target : null;
    const button = source && source.closest('#appMenuBody [data-admin-action="vacation-report"]');
    if (!button) return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    const open = () => {
      if (window.RakVacationReport && typeof window.RakVacationReport.open === 'function') {
        window.RakVacationReport.open();
        return true;
      }
      return false;
    };
    if (!open()) {
      ensureFeatureWithAuthOrder('menu').then(open).catch((err) => {
        if (typeof window.rakHandleFeatureLoadError === 'function') window.rakHandleFeatureLoadError(err, 'menu');
      });
    }
    return true;
  }

  const SAFE_MANUAL_SYNC_STATE = window.__rakDashboardManualSyncStateV1588 || {
    running: false,
    lastAt: 0,
    lastText: ''
  };
  window.__rakDashboardManualSyncStateV1588 = SAFE_MANUAL_SYNC_STATE;

  function setSafeManualSyncUi(text, state) {
    const safeText = String(text || '').trim();
    try {
      const badge = document.getElementById('dashboardSyncBadge');
      if (badge && safeText) {
        badge.textContent = safeText;
        badge.dataset.syncState = String(state || '');
      }
    } catch (_) {}
    try {
      const status = document.getElementById('adminOnlineSaveStatus');
      if (status && safeText) status.textContent = safeText;
    } catch (_) {}
  }

  async function runSafeManualSync(source) {
    if (SAFE_MANUAL_SYNC_STATE.running) return { ok: false, reason: 'already-running' };
    SAFE_MANUAL_SYNC_STATE.running = true;
    const started = Date.now();
    const result = { ok: true, source: source || 'manual-sync', steps: [] };
    const step = async (name, fn) => {
      if (typeof fn !== 'function') return null;
      try {
        const value = await fn();
        result.steps.push({ name, ok: true });
        return value;
      } catch (err) {
        result.ok = false;
        result.steps.push({ name, ok: false, error: String(err && err.message ? err.message : err || '') });
        return null;
      }
    };

    setSafeManualSyncUi('⟳ Synchronizuji…', 'pending');
    try {
      await step('sync-moduly', () => ensureFeatureWithAuthOrder('sync'));
      await step('flush-fronty', () => window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.flushPendingWrites === 'function'
        ? window.RotationSupabaseBridge.flushPendingWrites()
        : null);
      await step('rozpis', () => typeof window.syncRotationFromSupabase === 'function'
        ? window.syncRotationFromSupabase(true)
        : (typeof syncRotationFromSupabase === 'function' ? syncRotationFromSupabase(true) : null));
      await step('nastaveni', async () => {
        const bridge = window.RotationSupabaseBridge;
        if (!bridge || typeof bridge.loadMachineSettings !== 'function') return null;
        const rows = await bridge.loadMachineSettings();
        if (typeof app !== 'undefined' && app && Array.isArray(rows)) app.machineSettingsRows = rows;
        return rows;
      });
      await step('live-refresh', () => typeof window.__rotaceTriggerLiveRefresh === 'function'
        ? window.__rotaceTriggerLiveRefresh('v1589-manual-sync', { force: true })
        : null);
      await step('kontrola-aktualizace', () => typeof window.__rotaceForcePwaUpdateCheck === 'function'
        ? window.__rotaceForcePwaUpdateCheck('v1589-manual-sync')
        : null);
      await step('pwa-cache', () => typeof window.__rotaceRequestPwaCacheStatus === 'function'
        ? window.__rotaceRequestPwaCacheStatus('v1589-manual-sync')
        : null);
      try { if (typeof window.forceHomeRefresh === 'function') window.forceHomeRefresh(); else if (typeof forceHomeRefresh === 'function') forceHomeRefresh(); } catch (_) {}
      try { if (typeof window.updateDashboard === 'function') window.updateDashboard(); else if (typeof updateDashboard === 'function') updateDashboard(); } catch (_) {}
      SAFE_MANUAL_SYNC_STATE.lastAt = Date.now();
      SAFE_MANUAL_SYNC_STATE.lastText = result.ok ? 'Synchronizace hotová.' : 'Synchronizace doběhla s chybou.';
      setSafeManualSyncUi(result.ok ? '🟢 Synchronizováno teď' : '🔴 Sync s chybou', result.ok ? 'online' : 'error');
      return Object.assign(result, { elapsedMs: Date.now() - started });
    } finally {
      SAFE_MANUAL_SYNC_STATE.running = false;
    }
  }

  window.runRakSafeManualSyncV1588 = runSafeManualSync;
  window.runDashboardManualSync = runSafeManualSync;

  function handleManualSyncClick(event) {
    const source = event && event.target && typeof event.target.closest === 'function' ? event.target : null;
    if (!source) return false;
    const button = source.closest('#dashboardSyncBadge, #appMenuBody [data-admin-action="service-sync-now"]');
    if (!button) return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    void runSafeManualSync(button.id === 'dashboardSyncBadge' ? 'dashboard-click' : 'admin-service-sync').then((result) => {
      if (button.id !== 'dashboardSyncBadge') {
        const status = document.getElementById('adminOnlineSaveStatus');
        if (status) status.textContent = result && result.ok ? 'Synchronizace hotová.' : 'Synchronizace doběhla s chybou.';
      }
    });
    return true;
  }

  function handleManualSyncKeyboard(event) {
    if (!event || (event.key !== 'Enter' && event.key !== ' ')) return;
    const source = event.target && typeof event.target.closest === 'function' ? event.target : null;
    const badge = source && source.closest('#dashboardSyncBadge');
    if (!badge) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void runSafeManualSync('dashboard-keyboard');
  }

  function makeCorrectionFold(group, label, detail, nodes) {
    const liveNodes = (Array.isArray(nodes) ? nodes : []).filter((node) => node && node.parentNode);
    if (!liveNodes.length) return null;
    const parent = liveNodes[0].parentNode;
    const existing = parent.querySelector(':scope > details.rakCorrectionMachineFold[data-rak-correction-group="' + group + '"]');
    if (existing) return existing;
    const details = document.createElement('details');
    details.className = 'rakCorrectionMachineFold';
    details.dataset.rakCorrectionGroup = group;
    details.open = false;
    const summary = document.createElement('summary');
    summary.innerHTML = '<span>' + String(label || '') + '</span>' + (detail ? '<small>' + String(detail) + '</small>' : '');
    const content = document.createElement('div');
    content.className = 'rakCorrectionMachineFoldBody';
    parent.insertBefore(details, liveNodes[0]);
    details.appendChild(summary);
    details.appendChild(content);
    liveNodes.forEach((node) => content.appendChild(node));
    return details;
  }

  function enhanceCorrectionSettings() {
    const body = document.getElementById('appMenuBody');
    if (!body || String(body.dataset.adminView || '') !== 'correction-settings') return false;
    const root = body.querySelector('.adminFhbCalibration');
    if (!root) return false;

    let frezkyFold = root.querySelector(':scope > details.rakCorrectionMachineFold[data-rak-correction-group="frezky"]');
    if (!frezkyFold) {
      const form = root.querySelector(':scope > .adminFhbCalibrationForm');
      const model = root.querySelector(':scope > .adminFhbCalibrationModel');
      const history = root.querySelector(':scope > .adminFhbCalibrationHistory');
      frezkyFold = makeCorrectionFold('frezky', 'Frézky FHB · MFKF06 + MFKF10', 'měření, nastavení výpočtu a záznamy', [form, model, history]);
    }

    let brusyFold = root.querySelector(':scope > details.rakCorrectionMachineFold[data-rak-correction-group="brusy"]');
    if (!brusyFold) {
      const soon = root.querySelector(':scope > .adminFhbCalibrationSoon');
      brusyFold = makeCorrectionFold('brusy', 'Brusy FHB · TBKR01 + TBKR07', 'připravujeme', [soon]);
    }

    const complete = !!(frezkyFold && brusyFold);
    root.dataset.rakV1589CorrectionFolded = complete ? '1' : '0';
    return complete;
  }

  function scheduleCorrectionSettingsEnhance() {
    let attempt = 0;
    const run = () => {
      if (enhanceCorrectionSettings()) return;
      attempt += 1;
      if (attempt < 32) setTimeout(run, 125);
    };
    setTimeout(run, 0);
  }

  function scheduleIdle(fn, timeout, fallbackDelay) {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(fn, { timeout });
    else setTimeout(fn, fallbackDelay);
  }

  document.addEventListener('pointerdown', (event) => {
    const target = resolveTarget(event);
    if (!target) return;
    const pending = startFeature(target);
    if (pending && typeof pending.catch === 'function') pending.catch(() => {});
  }, { capture: true, passive: true });

  document.addEventListener('keydown', handleManualSyncKeyboard, true);

  document.addEventListener('click', (event) => {
    clearVacationReportStateWhenLeaving(event);
    if (openVacationReportFromAnyEntry(event)) return;
    if (handleManualSyncClick(event)) return;

    const source = event && event.target && typeof event.target.closest === 'function' ? event.target : null;
    const menuBody = source && source.closest('#appMenuBody');
    if (source && source.closest('#appMenuBody [data-admin-action="open-correction-settings"]')) {
      scheduleCorrectionSettingsEnhance();
    } else if (menuBody && String(menuBody.dataset.adminView || '') === 'correction-settings') {
      scheduleCorrectionSettingsEnhance();
    }

    const target = resolveTarget(event);
    if (!target || typeof window.rakEnsureFeature !== 'function') return;
    const el = target.element;
    const feature = target.feature;
    if (typeof window.rakIsFeatureReady === 'function' && window.rakIsFeatureReady(feature)) {
      try { el.classList.remove('rakFeatureLoading'); el.removeAttribute('aria-busy'); } catch (_) {}
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    if (el.dataset.rakFeatureReplay === '1') return;
    el.dataset.rakFeatureReplay = '1';
    startFeature(target).then(() => {
      try {
        el.classList.remove('rakFeatureLoading');
        el.removeAttribute('aria-busy');
        delete el.dataset.rakFeatureReplay;
        el.click();
      } catch (err) {
        delete el.dataset.rakFeatureReplay;
        throw err;
      }
    }).catch((err) => {
      try {
        el.classList.remove('rakFeatureLoading');
        el.removeAttribute('aria-busy');
        delete el.dataset.rakFeatureReplay;
      } catch (_) {}
      if (typeof window.rakHandleFeatureLoadError === 'function') window.rakHandleFeatureLoadError(err, feature);
      else console.error('RaK feature route load failed', feature, err);
    });
  }, true);

  let warmupQueued = false;
  let warmupStarted = false;
  function startBackgroundWarmup() {
    if (warmupStarted || typeof window.rakEnsureFeature !== 'function') return;
    warmupStarted = true;
    Promise.allSettled(['rotation', 'calculators'].map((feature) => window.rakEnsureFeature(feature))).catch(() => {});
    scheduleIdle(() => {
      window.rakEnsureFeature('sync').then(() => window.rakEnsureFeature('menu')).catch((err) => {
        console.warn('Boot v2 sync/menu warmup failed', err);
      });
    }, 1500, 650);
    scheduleIdle(() => {
      ensureFeatureWithAuthOrder('admin').catch((err) => console.warn('Boot v2 admin warmup failed', err));
    }, 3600, 2400);
  }

  function queueBackgroundWarmup() {
    if (warmupQueued) return;
    if (!window.__rakBootV2StartupReady) {
      setTimeout(queueBackgroundWarmup, 40);
      return;
    }
    warmupQueued = true;
    scheduleIdle(startBackgroundWarmup, 900, 350);
  }
  setTimeout(queueBackgroundWarmup, 0);

  window.addEventListener('rak:feature-ready', (event) => {
    const feature = String(event && event.detail && event.detail.feature || '');
    if (feature !== 'admin') return;
    try {
      if (typeof window.adminBindRotationZoomGuard === 'function' && !window.adminBindRotationZoomGuard.__rakBootV2Stub) {
        window.adminBindRotationZoomGuard();
      }
    } catch (err) {
      console.warn('Admin zoom guard after lazy load failed', err);
    }
    scheduleCorrectionSettingsEnhance();
  });

  try {
    const style = document.createElement('style');
    style.id = 'rakFeatureRoutingStyle';
    style.textContent = [
      '.rakFeatureLoading{opacity:.62!important;}',
      '#appMenuBody[data-admin-view="correction-settings"] .rakCorrectionMachineFold{border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(0,0,0,.14);overflow:hidden;}',
      '#appMenuBody[data-admin-view="correction-settings"] .rakCorrectionMachineFold+ .rakCorrectionMachineFold{margin-top:10px;}',
      '#appMenuBody[data-admin-view="correction-settings"] .rakCorrectionMachineFold>summary{display:flex;flex-direction:column;gap:2px;padding:12px 13px;cursor:pointer;font-weight:800;list-style:none;}',
      '#appMenuBody[data-admin-view="correction-settings"] .rakCorrectionMachineFold>summary::-webkit-details-marker{display:none;}',
      '#appMenuBody[data-admin-view="correction-settings"] .rakCorrectionMachineFold>summary:after{content:"Rozbalit";align-self:flex-end;margin-top:-18px;font-size:11px;font-weight:700;opacity:.65;}',
      '#appMenuBody[data-admin-view="correction-settings"] .rakCorrectionMachineFold[open]>summary:after{content:"Sbalit";}',
      '#appMenuBody[data-admin-view="correction-settings"] .rakCorrectionMachineFold>summary small{font-size:11px;font-weight:600;opacity:.72;padding-right:54px;}',
      '#appMenuBody[data-admin-view="correction-settings"] .rakCorrectionMachineFoldBody{display:grid;gap:12px;padding:0 10px 10px;}'
    ].join('');
    document.head.appendChild(style);
  } catch (_) {}

  try {
    if (typeof window.rakMarkModuleReady === 'function') {
      window.rakMarkModuleReady('rak-feature-routing.js', 'loaded', { source: 'boot-v2-loader', build: '1.5.93' });
    }
  } catch (_) {}
})();