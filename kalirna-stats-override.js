// RaK 1.6.03 development hotfix – pracovník označený „Odešel na kalírnu“
// se ve statistice nepočítá na původním stroji. Zdrojový rozpis se nemění.
(function installRakKalirnaStatsFilter() {
  'use strict';

  if (window.__rakKalirnaStatsFilterInstalled) return;
  window.__rakKalirnaStatsFilterInstalled = true;

  function normalizeName(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('cs-CZ');
  }

  function normalizeDate(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();
  }

  function collectKalirnaOutPeopleByDate(month) {
    const byDate = new Map();
    const mods = month && Array.isArray(month.dayMods) ? month.dayMods : [];
    mods.forEach((mod) => {
      if (!mod || mod.type !== 'kalirnaOut') return;
      const dateKey = normalizeDate(mod.date);
      const personKey = normalizeName(mod.person);
      if (!dateKey || !personKey) return;
      if (!byDate.has(dateKey)) byDate.set(dateKey, new Set());
      byDate.get(dateKey).add(personKey);
    });
    return byDate;
  }

  function createStatsRotationView(rotation) {
    const months = rotation && rotation.months;
    if (!months || typeof months !== 'object') {
      return { rotation, changed: false, removedCells: 0, affectedShifts: 0, affectedPeople: [] };
    }

    const nextMonths = Object.assign({}, months);
    const affectedPeople = new Set();
    let changed = false;
    let removedCells = 0;
    let affectedShifts = 0;

    Object.entries(months).forEach(([monthKey, month]) => {
      const byDate = collectKalirnaOutPeopleByDate(month);
      if (!byDate.size) return;

      let nextMonth = month;
      let monthChanged = false;
      const touchedDates = new Set();

      ['hard', 'soft'].forEach((sectionName) => {
        const section = month && month[sectionName];
        if (!section || !Array.isArray(section.rows)) return;

        let sectionChanged = false;
        const rows = section.rows.map((row) => {
          const dateKey = normalizeDate(row && row.date);
          const excludedPeople = byDate.get(dateKey);
          if (!excludedPeople || !excludedPeople.size || !Array.isArray(row && row.cells)) return row;

          let rowChanged = false;
          const nextCells = row.cells.map((cell) => {
            const personKey = normalizeName(cell);
            if (!personKey || !excludedPeople.has(personKey)) return cell;
            rowChanged = true;
            removedCells += 1;
            touchedDates.add(dateKey);
            affectedPeople.add(String(cell || '').trim());
            return '';
          });

          if (!rowChanged) return row;
          sectionChanged = true;
          return Object.assign({}, row, { cells: nextCells });
        });

        if (!sectionChanged) return;
        if (nextMonth === month) nextMonth = Object.assign({}, month);
        nextMonth[sectionName] = Object.assign({}, section, { rows });
        monthChanged = true;
      });

      if (!monthChanged) return;
      nextMonths[monthKey] = nextMonth;
      changed = true;
      affectedShifts += touchedDates.size;
    });

    return {
      rotation: changed ? Object.assign({}, rotation, { months: nextMonths }) : rotation,
      changed,
      removedCells,
      affectedShifts,
      affectedPeople: Array.from(affectedPeople).sort((a, b) => a.localeCompare(b, 'cs'))
    };
  }

  window.__rakKalirnaStatsFilterCreateRotation = createStatsRotationView;

  function patchBuildStatsForYear() {
    const original = window.buildStatsForYear;
    if (typeof original !== 'function' || original.__rakKalirnaStatsFiltered) return false;

    function wrappedBuildStatsForYear() {
      const runtimeApp = window.app;
      const originalRotation = runtimeApp && runtimeApp.rotation;
      if (!runtimeApp || !originalRotation) return original.apply(this, arguments);

      const view = createStatsRotationView(originalRotation);
      if (!view.changed) {
        window.__rakKalirnaStatsFilterLast = {
          changed: false,
          removedCells: 0,
          affectedShifts: 0,
          affectedPeople: [],
          at: Date.now()
        };
        return original.apply(this, arguments);
      }

      try {
        runtimeApp.rotation = view.rotation;
        const result = original.apply(this, arguments);
        window.__rakKalirnaStatsFilterLast = {
          changed: true,
          removedCells: view.removedCells,
          affectedShifts: view.affectedShifts,
          affectedPeople: view.affectedPeople.slice(),
          at: Date.now()
        };
        return result;
      } finally {
        runtimeApp.rotation = originalRotation;
      }
    }

    wrappedBuildStatsForYear.__rakKalirnaStatsFiltered = true;
    wrappedBuildStatsForYear.__rakOriginal = original;
    window.buildStatsForYear = wrappedBuildStatsForYear;
    window.__rakKalirnaStatsMode = 'kalirnaOut-excluded-from-machine-cells-before-stats';
    return true;
  }

  function patchDayModTooltip() {
    const original = window.rakDayModTooltip;
    if (typeof original !== 'function' || original.__rakKalirnaStatsLabelPatched) return false;

    function wrappedTooltip(mod) {
      return String(original.apply(this, arguments) || '')
        .replace('Odešel na kalírnu (počítá se jako soustruh)', 'Odešel na kalírnu (ve statistice mimo původní stroj)');
    }

    wrappedTooltip.__rakKalirnaStatsLabelPatched = true;
    wrappedTooltip.__rakOriginal = original;
    window.rakDayModTooltip = wrappedTooltip;
    return true;
  }

  function patchVisibleDayModLabel(root) {
    try {
      const host = root && typeof root.querySelectorAll === 'function' ? root : document;
      host.querySelectorAll('select[data-dm="type"] option[value="kalirnaOut"]').forEach((option) => {
        option.textContent = 'Odešel na kalírnu (ve statistice mimo původní stroj)';
      });
    } catch (err) {}
  }

  function installAvailablePatches() {
    const statsPatched = patchBuildStatsForYear();
    patchDayModTooltip();
    patchVisibleDayModLabel(document);
    if (statsPatched) {
      try {
        const statsRoot = document.getElementById('statsNameGrid') || document.getElementById('statsNameView');
        if (statsRoot && typeof window.renderStatsPanel === 'function') {
          setTimeout(() => {
            try { window.renderStatsPanel(); } catch (err) {}
          }, 0);
        }
      } catch (err) {}
    }
  }

  function schedulePatchBurst() {
    [0, 40, 160, 500, 1200].forEach((delay) => setTimeout(installAvailablePatches, delay));
  }

  installAvailablePatches();
  [100, 350, 1000, 3000, 8000, 15000].forEach((delay) => setTimeout(installAvailablePatches, delay));
  document.addEventListener('click', schedulePatchBurst, true);
  window.addEventListener('pageshow', schedulePatchBurst);
  window.addEventListener('focus', schedulePatchBurst);
  window.addEventListener('rak:feature-ready', schedulePatchBurst);

  window.rakKalirnaStatsFilterRefresh = installAvailablePatches;
})();
