// RaK DEV – co nejdriv pred prvnim paintem skryjeme aplikaci, pokud neni ulozeny platny profil.
(function setupRakEarlyAuthPrivacyGate() {
  try {
    const key = 'rotace_kalkulacky:user_profile_v1';
    const readCachedProfile = () => {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || 'null');
        const accountNumber = String(parsed && parsed.accountNumber || '').trim();
        const fullName = String(parsed && parsed.fullName || '').trim();
        if (!accountNumber || !fullName) return null;
        return { accountNumber, fullName, updatedAt: Number(parsed.updatedAt || 0) || 0 };
      } catch (err) {
        return null;
      }
    };
    if (typeof window.rakReadCachedUserProfile !== 'function') window.rakReadCachedUserProfile = readCachedProfile;
    const earlyProfile = window.rakReadCachedUserProfile();
    const loggedIn = !!earlyProfile;
    // Profil je malý lokální údaj a může být k dispozici ještě před načtením
    // aplikačních modulů. Dashboard tak nemusí na jméno čekat až do pozdního refreshu.
    window.__RAK_EARLY_USER_PROFILE__ = earlyProfile;
    document.documentElement.dataset.rakAuthState = loggedIn ? 'unlocked' : 'locked';
    if (!document.getElementById('rak-early-auth-gate-style')) {
      const style = document.createElement('style');
      style.id = 'rak-early-auth-gate-style';
      style.textContent = 'html[data-rak-auth-state="locked"] body{background:#030707!important;overflow:hidden!important}html[data-rak-auth-state="locked"] body>*:not(#rakUserLoginOverlay):not(script){visibility:hidden!important;pointer-events:none!important}html[data-rak-auth-state="locked"] #rakUserLoginOverlay{visibility:visible!important;pointer-events:auto!important}';
      document.head.appendChild(style);
    }
  } catch (err) {}
})();

// RaK 1.2 (1.155) – module readiness registry a boot kontrola.

(function setupRakModuleReadinessRegistry() {
  if (window.__rakModuleReadinessRegistry && typeof window.rakMarkModuleReady === 'function') {
    try { window.rakMarkModuleReady('module-readiness.js', 'loaded', { source: 'index', duplicateSetup: true }); } catch (err) {}
    return;
  }

  const nowIso = () => {
    try { return new Date().toISOString(); } catch (err) { return ''; }
  };
  const nowMs = () => {
    try { return Math.round(performance.now()); } catch (err) { return Date.now(); }
  };
  const registry = window.__rakModuleReadinessRegistry = {
    version: window.APP_VERSION || 'pre-core',
    mode: 'module-readiness-registry-v897',
    startedAt: nowIso(),
    startedMs: nowMs(),
    expected: [],
    modules: {},
    events: [],
    bootOrder: []
  };

  function normalizeName(name) {
    return String(name || '').trim().replace(/^\.\//, '') || 'unknown-module';
  }

  function markModule(name, status, meta) {
    const moduleName = normalizeName(name);
    const nextStatus = String(status || 'loaded').trim() || 'loaded';
    const ts = nowIso();
    const ms = nowMs();
    const current = registry.modules[moduleName] || { name: moduleName, firstSeenAt: ts, firstSeenMs: ms, events: 0 };
    current.status = nextStatus;
    current.updatedAt = ts;
    current.updatedMs = ms;
    current.durationMs = Number.isFinite(Number(meta && meta.durationMs)) ? Math.max(0, Math.round(Number(meta.durationMs))) : current.durationMs;
    current.source = String((meta && meta.source) || current.source || '').slice(0, 80);
    current.error = String((meta && meta.error) || '').slice(0, 180);
    current.events = Number(current.events || 0) + 1;
    registry.modules[moduleName] = current;
    if ((nextStatus === 'loaded' || nextStatus === 'ready') && !registry.bootOrder.includes(moduleName)) registry.bootOrder.push(moduleName);
    registry.events.push({ name: moduleName, status: nextStatus, at: ts, ms, source: current.source, error: current.error });
    if (registry.events.length > 96) registry.events = registry.events.slice(-96);
    registry.version = window.APP_VERSION || registry.version || 'pre-core';
    return current;
  }

  window.rakMarkModuleReady = markModule;
  window.getRakModuleReadinessHealth = function getRakModuleReadinessHealth(expectedOverride) {
    const expected = Array.isArray(expectedOverride) && expectedOverride.length
      ? expectedOverride.map(normalizeName)
      : (Array.isArray(registry.expected) ? registry.expected.map(normalizeName) : []);
    const modules = registry.modules || {};
    const loadedStatuses = new Set(['loaded', 'ready']);
    const loadedExpected = expected.filter((name) => modules[name] && loadedStatuses.has(String(modules[name].status || '')));
    const missing = expected.filter((name) => !modules[name] || !loadedStatuses.has(String(modules[name].status || '')));
    const errored = Object.keys(modules).filter((name) => String(modules[name] && modules[name].status || '') === 'error');
    const loadedOrder = registry.bootOrder.slice();
    const expectedLoadedOrder = expected.filter((name) => loadedOrder.includes(name));
    const orderMismatch = expectedLoadedOrder.some((name, index) => loadedOrder[index] !== name);
    const bootDurationMs = Math.max(0, nowMs() - Number(registry.startedMs || nowMs()));
    return {
      ok: missing.length === 0 && errored.length === 0,
      mode: registry.mode || 'module-readiness-registry-v897',
      version: window.APP_VERSION || registry.version || 'unknown',
      checkedAt: nowIso(),
      expectedCount: expected.length,
      loadedCount: loadedExpected.length,
      missingCount: missing.length,
      errorCount: errored.length,
      orderMismatch,
      bootDurationMs,
      expected: expected.slice(0, 32),
      loadedOrder: loadedOrder.slice(0, 32),
      missing: missing.slice(0, 16),
      errors: errored.slice(0, 16),
      modules: Object.keys(modules).sort().map((name) => ({
        name,
        status: modules[name].status || 'unknown',
        durationMs: modules[name].durationMs || 0,
        source: modules[name].source || '',
        error: modules[name].error || ''
      })).slice(0, 48),
      eventCount: registry.events.length,
      recentEvents: registry.events.slice(-12)
    };
  };

  markModule('module-readiness.js', 'loaded', { source: 'index' });
  try {
    if (typeof initialRotationData !== 'undefined') markModule('data.js', 'loaded', { source: 'index-preload' });
  } catch (err) {}
})();

// RaK 1.6 – srozumitelna validace hesla pri pridani noveho spravce.
(function setupRakAdminPasswordGuard() {
  const MIN_PASSWORD_LENGTH = 6;

  function patchSaveHandler() {
    const original = window.rakAdminSaveSecureAccounts;
    if (typeof original !== 'function' || original.__rakPasswordGuardWrapped) return false;
    const wrapped = async function rakAdminSaveSecureAccountsWithPasswordGuard(root) {
      const reader = window.readAdminAccountsSecureDraftRowsFromDom;
      const rows = typeof reader === 'function' ? reader(root) : [];
      const invalid = rows.find((entry) => entry && entry.password && String(entry.password).length < MIN_PASSWORD_LENGTH);
      if (invalid) {
        return { ok: false, error: new Error('Heslo nového správce musí mít alespoň 6 znaků.') };
      }
      return original(root);
    };
    wrapped.__rakPasswordGuardWrapped = true;
    window.rakAdminSaveSecureAccounts = wrapped;
    return true;
  }

  function hintPasswordInput(target) {
    if (!target || !target.matches || !target.matches('[data-admin-account-password]')) return;
    target.minLength = MIN_PASSWORD_LENGTH;
    target.title = 'Heslo nového správce musí mít alespoň 6 znaků.';
    if (!target.value && String(target.placeholder || '').toLowerCase() === 'heslo') {
      target.placeholder = 'heslo min. 6 znaků';
    }
  }

  document.addEventListener('focusin', (event) => {
    hintPasswordInput(event.target);
    patchSaveHandler();
  }, true);
  document.addEventListener('click', () => { patchSaveHandler(); }, true);
  if (document.readyState !== 'loading') patchSaveHandler();
  else document.addEventListener('DOMContentLoaded', () => { patchSaveHandler(); }, { once: true });
})();

// RaK 1.6 – generátor: chrání konkrétní runtime chybu `monthKey is not defined` v solo-mill balance.
// Obalí celý běh generátoru přes přesný monthKey z jeho argumentu a po návratu globální kontext zase odstraní.
(function setupRakGeneratorMonthKeyHotfix() {
  function patchGenerator() {
    const original = window.adminGenerateRotationMonthDraft;
    if (typeof original !== 'function' || original.__rakGeneratorMonthKeyHotfixWrapped) return false;
    const wrapped = function adminGenerateRotationMonthDraftWithMonthKeyContext(monthKey, preparedMonth) {
      const hadOwnMonthKey = Object.prototype.hasOwnProperty.call(window, 'monthKey');
      const previousMonthKey = window.monthKey;
      try {
        window.monthKey = String(monthKey || '').trim();
        return original(monthKey, preparedMonth);
      } finally {
        try {
          if (hadOwnMonthKey) window.monthKey = previousMonthKey;
          else delete window.monthKey;
        } catch (err) {}
      }
    };
    wrapped.__rakGeneratorMonthKeyHotfixWrapped = true;
    wrapped.__rakGeneratorMonthKeyHotfixOriginal = original;
    window.adminGenerateRotationMonthDraft = wrapped;
    return true;
  }

  window.setupRakGeneratorMonthKeyHotfix = patchGenerator;
  window.addEventListener('rak:feature-ready', (event) => {
    const feature = String(event && event.detail && event.detail.feature || '').trim();
    if (feature === 'admin') patchGenerator();
  });
  setTimeout(patchGenerator, 0);
})();
