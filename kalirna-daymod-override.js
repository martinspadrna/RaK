// RaK 1.6 development hotfix – denní výjimka „Odešel na kalírnu“ se promítne
// do osobního přehledu Rotace, Home karty a úkolu bez změny zdrojového rozpisu.
(function installRakKalirnaDayModOverride() {
  'use strict';

  if (window.__rakKalirnaDayModOverrideInstalled) return;
  window.__rakKalirnaDayModOverrideInstalled = true;

  const KALIRNA_TARGET = 'Kalírna';
  const KALIRNA_TASK = 'Tak tam hlavně nedělej ostudu.';

  function normalizeName(value) {
    return String(value || '').trim().toLocaleLowerCase('cs-CZ');
  }

  function normalizeShift(value) {
    const text = String(value || '').trim();
    try {
      if (typeof window.normalizeShiftText === 'function') return String(window.normalizeShiftText(text) || '').trim().toUpperCase();
    } catch (err) {}
    return text.replace(/\s+/g, ' ').trim().toUpperCase();
  }

  function parseDayModDate(value) {
    const raw = String(value || '').trim();
    try {
      if (typeof window.parseDateToken === 'function') {
        const parsed = window.parseDateToken(raw);
        if (parsed) return parsed;
      }
    } catch (err) {}
    const match = /^(\d{1,2})\.(\d{1,2})\.\s*(.*)$/.exec(raw);
    return match ? { day: Number(match[1]), month: Number(match[2]), shift: String(match[3] || '').trim() } : null;
  }

  function monthKeyYear(monthKey) {
    try {
      if (typeof window.parseMonthKey === 'function') {
        const parsed = window.parseMonthKey(monthKey);
        if (parsed && parsed.year) return Number(parsed.year);
      }
    } catch (err) {}
    const match = /^(\d{1,2})\/(\d{2,4})$/.exec(String(monthKey || '').trim());
    if (!match) return null;
    const rawYear = Number(match[2]);
    return rawYear < 100 ? 2000 + rawYear : rawYear;
  }

  function findKalirnaOutMod(personName, entry) {
    if (!entry || entry.absence) return null;
    const rotation = window.app && window.app.rotation;
    const months = rotation && rotation.months;
    if (!months) return null;

    const entryDate = new Date(entry.sortDate || '');
    if (Number.isNaN(entryDate.getTime())) return null;
    const wantedName = normalizeName(personName);
    const wantedShift = normalizeShift(entry.shift);

    for (const [monthKey, month] of Object.entries(months)) {
      if (monthKeyYear(monthKey) !== entryDate.getFullYear()) continue;
      const mods = month && Array.isArray(month.dayMods) ? month.dayMods : [];
      for (const mod of mods) {
        if (!mod || mod.type !== 'kalirnaOut') continue;
        if (normalizeName(mod.person) !== wantedName) continue;
        const parsed = parseDayModDate(mod.date);
        if (!parsed) continue;
        if (Number(parsed.day) !== entryDate.getDate() || Number(parsed.month) !== entryDate.getMonth() + 1) continue;
        const modShift = normalizeShift(parsed.shift);
        if (wantedShift && modShift && wantedShift !== modShift) continue;
        return mod;
      }
    }
    return null;
  }

  function patchPersonScheduleEntries() {
    const original = window.getPersonScheduleEntries;
    if (typeof original !== 'function' || original.__rakKalirnaDayModPatched) return false;

    function wrappedGetPersonScheduleEntries(name) {
      const model = original.apply(this, arguments);
      if (!model || !Array.isArray(model.entries)) return model;
      const entries = model.entries.map((entry) => {
        if (!findKalirnaOutMod(name, entry)) return entry;
        return Object.assign({}, entry, { target: KALIRNA_TARGET, kalirnaOut: true });
      });
      return Object.assign({}, model, { entries });
    }

    wrappedGetPersonScheduleEntries.__rakKalirnaDayModPatched = true;
    wrappedGetPersonScheduleEntries.__rakOriginal = original;
    window.getPersonScheduleEntries = wrappedGetPersonScheduleEntries;
    return true;
  }

  function patchRotationTasks() {
    const original = window.getRotationMachineTasksForAssignment;
    if (typeof original !== 'function' || original.__rakKalirnaDayModPatched) return false;

    function wrappedGetRotationMachineTasksForAssignment(value, shift) {
      if (/kal[ií]rn/i.test(String(value || ''))) {
        return { machine: KALIRNA_TARGET, tasks: [{ label: KALIRNA_TASK, place: '' }] };
      }
      return original.apply(this, arguments);
    }

    wrappedGetRotationMachineTasksForAssignment.__rakKalirnaDayModPatched = true;
    wrappedGetRotationMachineTasksForAssignment.__rakOriginal = original;
    window.getRotationMachineTasksForAssignment = wrappedGetRotationMachineTasksForAssignment;
    return true;
  }

  function patchDashboardHero() {
    const original = window.buildDashboardPersonalHeroHtml;
    if (typeof original !== 'function' || original.__rakKalirnaDayModPatched) return false;

    function wrappedBuildDashboardPersonalHeroHtml() {
      const html = String(original.apply(this, arguments) || '');
      return html
        .replace('Dnes jsi na Kalírna.', 'Dnes jdeš na kalírnu.')
        .replace('Příští směnu jdeš na Kalírna.', 'Příští směnu jdeš na kalírnu.');
    }

    wrappedBuildDashboardPersonalHeroHtml.__rakKalirnaDayModPatched = true;
    wrappedBuildDashboardPersonalHeroHtml.__rakOriginal = original;
    window.buildDashboardPersonalHeroHtml = wrappedBuildDashboardPersonalHeroHtml;
    return true;
  }

  function installAvailablePatches() {
    patchPersonScheduleEntries();
    patchRotationTasks();
    patchDashboardHero();
  }

  installAvailablePatches();
  [100, 350, 1000, 3000, 8000, 15000].forEach((delay) => setTimeout(installAvailablePatches, delay));
  document.addEventListener('click', installAvailablePatches, true);
  window.addEventListener('pageshow', installAvailablePatches);
  window.addEventListener('focus', installAvailablePatches);

  window.rakKalirnaDayModOverrideRefresh = installAvailablePatches;
})();

// RaK 1.6.07 – deterministické první otevření Rotace/Více na iOS + osobní statistiky vytížení.
(function installRak1607RegressionRecovery() {
  'use strict';

  const TEST_BUILD = '1.6.07';
  const TEST_SUPABASE_REF = 'cgshssdjgzzuprlwnabl';
  if (window.__rak1607RegressionRecoveryInstalled) return;

  const testUrl = String(window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url || '');
  if (!testUrl.includes(TEST_SUPABASE_REF)) return;
  window.__rak1607RegressionRecoveryInstalled = true;

  function lockBuildMarker(name, value) {
    try {
      Object.defineProperty(window, name, {
        configurable: true,
        enumerable: true,
        get: () => value,
        set: () => value
      });
    } catch (_) {
      try { window[name] = value; } catch (_) {}
    }
  }

  lockBuildMarker('RAK_RELEASE_VERSION', TEST_BUILD);
  lockBuildMarker('RAK_TEST_DISPLAY_VERSION', TEST_BUILD);
  lockBuildMarker('RAK_PWA_BUILD', 'v' + TEST_BUILD);
  window.__rak1607BuildMarkerMode = 'locked-test-runtime';

  try {
    const buildMarker = 'v' + TEST_BUILD;
    const resetKey = 'rak_1607_prompt_reset_build';
    if (localStorage.getItem(resetKey) !== buildMarker) {
      sessionStorage.removeItem('rotace_sw_update_notice_v1');
      sessionStorage.removeItem('rotace_sw_update_pending_v1');
      localStorage.removeItem('rotace_sw_update_suppress_v1');
      localStorage.setItem('rak_dev_entry_prompt_reset_build', buildMarker);
      localStorage.setItem('rak_dev_pwa_prompt_reset_build', buildMarker);
      localStorage.setItem(resetKey, buildMarker);
    }
  } catch (_) {}

  function setNavBusy(button, busy) {
    if (!button) return;
    try {
      button.classList.toggle('rakFeatureLoading', !!busy);
      if (busy) button.setAttribute('aria-busy', 'true');
      else button.removeAttribute('aria-busy');
    } catch (_) {}
  }

  function refreshRecoveredViews() {
    try {
      if (typeof window.forceHomeRefresh === 'function') window.forceHomeRefresh();
      else if (typeof forceHomeRefresh === 'function') forceHomeRefresh();
    } catch (_) {}
    try {
      if (typeof window.updateDashboard === 'function') window.updateDashboard();
      else if (typeof updateDashboard === 'function') updateDashboard();
    } catch (_) {}
  }

  function addStatsSummaryTile(summary, key, label, value) {
    if (!summary) return;
    let tile = summary.querySelector('[data-rak-stats-person-extra="' + key + '"]');
    if (tile) {
      const caption = tile.querySelector('.smallText');
      const amount = tile.querySelector('.statsSummaryValue');
      if (caption) caption.textContent = label;
      if (amount) amount.textContent = String(value);
      return;
    }
    tile = document.createElement('div');
    tile.className = 'tile';
    tile.setAttribute('data-rak-stats-person-extra', key);
    const caption = document.createElement('div');
    caption.className = 'smallText';
    caption.textContent = label;
    const amount = document.createElement('div');
    amount.className = 'statsSummaryValue';
    amount.textContent = String(value);
    tile.appendChild(caption);
    tile.appendChild(amount);
    summary.appendChild(tile);
  }

  function personSpecialCounts(person, stats) {
    const name = String(person && person.name || '').trim();
    return {
      mfkSolo: Math.max(0, Math.round(Number(stats && stats.mfkSoloCounts && stats.mfkSoloCounts[name] || 0) || 0)),
      mskPair: Math.max(0, Math.round(Number(stats && stats.mskPairCounts && stats.mskPairCounts[name] || 0) || 0))
    };
  }

  function decorateStatsNameNodes(nodes, person, stats) {
    const list = Array.isArray(nodes) ? nodes : [];
    const summary = list.find(node => node && node.classList && node.classList.contains('statsSummary')) || null;
    if (!summary) return list;
    const counts = personSpecialCounts(person, stats);
    addStatsSummaryTile(summary, 'mfk-solo', 'Sám na 2 frézkách', counts.mfkSolo + '×');
    addStatsSummaryTile(summary, 'msk-pair', 'Ve 2 lidech na soustruzích', counts.mskPair + '×');
    return list;
  }

  function decorateCurrentStatsDom() {
    try {
      const selectedName = String(window.app && window.app.selectedStatsName || '').trim();
      if (!selectedName || typeof window.buildStatsForYear !== 'function') return false;
      const view = document.getElementById('statsNameView');
      const summary = view && view.querySelector('.statsSummary');
      if (!summary) return false;
      const year = parseInt(window.app && window.app.selectedYear, 10) || new Date().getFullYear();
      const stats = window.buildStatsForYear(year);
      const person = stats && stats.people ? stats.people[selectedName] : null;
      if (!person) return false;
      const counts = personSpecialCounts(person, stats);
      addStatsSummaryTile(summary, 'mfk-solo', 'Sám na 2 frézkách', counts.mfkSolo + '×');
      addStatsSummaryTile(summary, 'msk-pair', 'Ve 2 lidech na soustruzích', counts.mskPair + '×');
      return true;
    } catch (_) {
      return false;
    }
  }

  function patchStatsNameView() {
    const original = window.renderStatsNameViewNodes;
    if (typeof original !== 'function') return false;
    if (original.__rak1607PersonExtraPatched) return true;
    const wrapped = function renderStatsNameViewNodes1607(person, year, stats, topWork, topClean) {
      return decorateStatsNameNodes(original.apply(this, arguments), person, stats);
    };
    wrapped.__rak1607PersonExtraPatched = true;
    wrapped.__rakOriginal = original;
    window.renderStatsNameViewNodes = wrapped;
    return true;
  }

  function patchStatsPanel() {
    const original = window.renderStatsPanel;
    if (typeof original !== 'function') return false;
    if (original.__rak1607PersonExtraPatched) return true;
    const wrapped = function renderStatsPanel1607() {
      const result = original.apply(this, arguments);
      decorateCurrentStatsDom();
      return result;
    };
    wrapped.__rak1607PersonExtraPatched = true;
    wrapped.__rakOriginal = original;
    window.renderStatsPanel = wrapped;
    return true;
  }

  function installStatsPersonExtras() {
    const nameViewPatched = patchStatsNameView();
    const panelPatched = patchStatsPanel();
    if (nameViewPatched || panelPatched) {
      window.__rak1607StatsPersonExtras = 'mfk-solo+msk-pair';
      decorateCurrentStatsDom();
      return true;
    }
    return false;
  }

  function patchMoreToggle() {
    if (typeof window.toggleAppMenu !== 'function') return false;
    if (window.toggleAppMenu.__rak1607FixedMore) return true;
    const previous = window.toggleAppMenu;
    const fixed = function toggleAppMenu1607Fixed() {
      try { if (typeof showPage === 'function') showPage('menu'); } catch (_) {}
      try { if (typeof openAppMenu === 'function') openAppMenu('menu'); } catch (_) {}
      try { if (typeof setBottomNavActive === 'function') setBottomNavActive('menu'); } catch (_) {}
      try { if (typeof window.__rakApplyBottomNavMoreHardFix === 'function') window.__rakApplyBottomNavMoreHardFix(); } catch (_) {}
      try { if (typeof window.__rakApplyFixedBottomNavMetricsNow === 'function') window.__rakApplyFixedBottomNavMetricsNow(); } catch (_) {}
    };
    fixed.__rak1607FixedMore = true;
    fixed.__rakPreviousToggleAppMenu = previous;
    window.toggleAppMenu = fixed;
    window.__rak1607MoreMode = 'deterministic-show+open+active';
    return true;
  }

  function openRotationNow() {
    installStatsPersonExtras();
    if (typeof window.openRotaceNames === 'function') window.openRotaceNames();
    else if (typeof openRotaceNames === 'function') openRotaceNames();
    else {
      try { if (typeof showPage === 'function') showPage('rotace'); } catch (_) {}
      try { if (typeof setRotaceView === 'function') setRotaceView('names'); } catch (_) {}
      try { if (typeof renderRotace === 'function') renderRotace(); } catch (_) {}
      try { if (typeof setBottomNavActive === 'function') setBottomNavActive('rotace'); } catch (_) {}
    }
    const repaint = () => {
      try { if (typeof renderRotace === 'function') renderRotace(); } catch (_) {}
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(repaint);
    else window.setTimeout(repaint, 0);
  }

  function openMenuNow() {
    patchMoreToggle();
    try { if (typeof showPage === 'function') showPage('menu'); } catch (_) {}
    try { if (typeof openAppMenu === 'function') openAppMenu('menu'); } catch (_) {}
    try { if (typeof setBottomNavActive === 'function') setBottomNavActive('menu'); } catch (_) {}
  }

  async function openFeatureFromBottomNav(action, button) {
    const feature = action === 'rotace' ? 'rotation' : 'menu';
    setNavBusy(button, true);
    try {
      if (typeof window.rakEnsureFeature !== 'function') throw new Error('RaK feature loader není připravený.');
      await window.rakEnsureFeature(feature);
      if (action === 'rotace') openRotationNow();
      else openMenuNow();
      window.__rak1607LastDeterministicNav = { action, feature, at: Date.now() };
    } catch (err) {
      if (typeof window.rakHandleFeatureLoadError === 'function') window.rakHandleFeatureLoadError(err, feature);
      else console.error('RaK 1.6.07 deterministic nav failed', action, err);
    } finally {
      setNavBusy(button, false);
    }
  }

  document.addEventListener('click', (event) => {
    const source = event && event.target && typeof event.target.closest === 'function' ? event.target : null;
    const nav = source && source.closest('nav.bottomNav button[data-action]');
    if (!nav || !document.documentElement.contains(nav)) return;
    const action = String(nav.dataset.action || '').trim();
    if (action !== 'rotace' && action !== 'menu') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void openFeatureFromBottomNav(action, nav);
  }, true);

  let rotationStartRequested = false;
  function ensureStartupRotation() {
    if (rotationStartRequested) return;
    if (!window.__rakBootV2StartupReady || typeof window.rakEnsureFeature !== 'function') {
      window.setTimeout(ensureStartupRotation, 25);
      return;
    }
    rotationStartRequested = true;
    window.__rak1607StartupRotationMode = 'startup-minimum';
    window.rakEnsureFeature('rotation').then(() => {
      installStatsPersonExtras();
      refreshRecoveredViews();
    }).catch((err) => {
      rotationStartRequested = false;
      console.warn('RaK 1.6.07 startup Rotation recovery failed', err);
    });
  }

  window.addEventListener('rak:feature-ready', (event) => {
    const feature = String(event && event.detail && event.detail.feature || '').trim();
    if (feature === 'rotation') {
      installStatsPersonExtras();
      refreshRecoveredViews();
    }
    if (feature === 'menu') patchMoreToggle();
  });

  ensureStartupRotation();
  patchMoreToggle();
  window.setTimeout(patchMoreToggle, 500);
  window.setTimeout(patchMoreToggle, 1500);

  window.__rak1607RegressionRecovery = Object.freeze({
    version: TEST_BUILD,
    rotation: 'deterministic-first-tap+startup-minimum',
    menu: 'deterministic-first-tap+show+open+active',
    statsPersonExtras: Object.freeze(['mfkSoloCounts', 'mskPairCounts']),
    updateVersionSource: 'service-worker-direct-display-version'
  });
})();
