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

// RaK 1.6.03 recovery extensions – jen nové funkce požadované nad funkčním základem 1.6.03.
(function installRak1603RequestedExtensions() {
  'use strict';

  if (window.__rak1603RequestedExtensionsInstalled) return;
  window.__rak1603RequestedExtensionsInstalled = true;

  const SHIFT_REPORT_EXTRA_MACHINES = ['TTKW01', 'TTKW02'];

  function makePersonStatsTile(kind, label, value) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.setAttribute('data-rak-person-load-stat', kind);

    const small = document.createElement('div');
    small.className = 'smallText';
    small.textContent = label;

    const number = document.createElement('div');
    number.className = 'statsSummaryValue';
    number.textContent = String(Math.max(0, Number(value) || 0)) + '×';

    tile.appendChild(small);
    tile.appendChild(number);
    return tile;
  }

  function patchStatsNameView() {
    const original = window.renderStatsNameViewNodes;
    if (typeof original !== 'function' || original.__rak1603PersonLoadStatsPatched) return false;

    function wrappedRenderStatsNameViewNodes(person, year, stats) {
      const nodes = original.apply(this, arguments);
      try {
        const list = Array.isArray(nodes) ? nodes : [];
        const summary = list.find((node) => node && node.classList && node.classList.contains('statsSummary'));
        if (summary && person && stats) {
          const name = String(person.name || '');
          summary.appendChild(makePersonStatsTile('mfk-solo', 'Sám na 2 frézkách', stats.mfkSoloCounts && stats.mfkSoloCounts[name]));
          summary.appendChild(makePersonStatsTile('msk-pair', 'Ve 2 lidech na soustruzích', stats.mskPairCounts && stats.mskPairCounts[name]));
        }
      } catch (err) {}
      return nodes;
    }

    wrappedRenderStatsNameViewNodes.__rak1603PersonLoadStatsPatched = true;
    wrappedRenderStatsNameViewNodes.__rakOriginal = original;
    window.renderStatsNameViewNodes = wrappedRenderStatsNameViewNodes;
    window.__rak1603PersonStatsMode = 'existing-year-counters';
    return true;
  }

  function ensureShiftReportMachineOptions(root) {
    const host = root && typeof root.querySelectorAll === 'function' ? root : document;
    const selects = host.querySelectorAll('#rakShiftReport select.rakShiftMachine');
    let changed = false;

    selects.forEach((select) => {
      let insertAfter = Array.from(select.options || []).find((option) => option.value === 'TPKW02') || null;
      SHIFT_REPORT_EXTRA_MACHINES.forEach((code) => {
        let option = Array.from(select.options || []).find((item) => item.value === code) || null;
        if (!option) {
          option = document.createElement('option');
          option.value = code;
          option.textContent = code;
          if (insertAfter && insertAfter.nextSibling) select.insertBefore(option, insertAfter.nextSibling);
          else if (insertAfter) select.appendChild(option);
          else select.appendChild(option);
          changed = true;
        }
        insertAfter = option;
      });
    });

    if (selects.length) window.__rak1603ShiftReportMachineMode = 'TPKW02>TTKW01>TTKW02';
    return changed || selects.length > 0;
  }

  function patchShiftReportOpen() {
    const api = window.RakShiftReport;
    if (!api || typeof api.open !== 'function' || api.open.__rak1603ExtraMachinesPatched) return false;
    const originalOpen = api.open;

    function wrappedShiftReportOpen() {
      const result = originalOpen.apply(this, arguments);
      try { ensureShiftReportMachineOptions(document); } catch (err) {}
      return result;
    }

    wrappedShiftReportOpen.__rak1603ExtraMachinesPatched = true;
    wrappedShiftReportOpen.__rakOriginal = originalOpen;
    api.open = wrappedShiftReportOpen;
    return true;
  }

  function installRequestedPatches() {
    patchStatsNameView();
    patchShiftReportOpen();
    ensureShiftReportMachineOptions(document);
  }

  document.addEventListener('click', (event) => {
    const target = event && event.target && typeof event.target.closest === 'function' ? event.target : null;
    if (!target) return;
    if (target.closest('#rakShiftReport .rakShiftAddProblem')) {
      window.setTimeout(() => ensureShiftReportMachineOptions(document), 0);
    }
  }, false);

  window.addEventListener('rak:feature-ready', installRequestedPatches);
  window.addEventListener('pageshow', installRequestedPatches);

  installRequestedPatches();
  [150, 500, 1200, 3000].forEach((delay) => window.setTimeout(installRequestedPatches, delay));

  window.__rak1603RequestedExtensions = Object.freeze({
    base: '1.6.03',
    personStats: Object.freeze(['mfk-solo', 'msk-pair']),
    shiftReportMachines: Object.freeze(SHIFT_REPORT_EXTRA_MACHINES.slice())
  });
})();
