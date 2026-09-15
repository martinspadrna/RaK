// RaK 1.6.03 Home startup hotfix – souběžně přednačte skripty, které app.js
// stejně použije při startu. Pořadí jejich spuštění dál řídí app.js beze změny.
(function installRak1603HomeBootPreload() {
  'use strict';

  if (window.__rak1603HomeBootPreloadInstalled) return;
  window.__rak1603HomeBootPreloadInstalled = true;

  const version = '1.6.0';
  const files = [
    'rak-user-profile.js',
    'rak-auth-gate.js',
    'rak-account-access.js',
    'rak-login-splash.js',
    'rak-login-fix.js',
    'rak-login-life.js',
    'core.js',
    'lifecycle.js',
    'app-runtime-guards.js',
    'qr.js',
    'payroll.js',
    'dashboard.js',
    'appearance-theme.js',
    'ui.js',
    'app-navigation.js',
    'app-bottom-nav.js',
    'app-actions.js',
    'app-pwa-connectivity.js',
    'app-home-boot.js',
    'rak-runtime-stability.js',
    'rak-mobile-layout-guard.js',
    'rak-feature-routing.js'
  ];
  let queued = 0;

  files.forEach((file) => {
    try {
      if (document.querySelector('link[data-rak-home-boot-preload="' + file + '"]')) return;
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'script';
      link.href = file + '?v=' + encodeURIComponent(version);
      link.dataset.rakHomeBootPreload = file;
      (document.head || document.documentElement).appendChild(link);
      queued += 1;
    } catch (err) {}
  });

  window.__rak1603HomeBootPreload = Object.freeze({
    mode: 'parallel-fetch-preserve-app-execution-order',
    queued,
    total: files.length,
    at: Date.now()
  });
})();

// RaK 1.6.03 development hotfix – pracovník označený „Odešel na kalírnu“
// se ve statistice nepočítá na původním stroji, ale pořád se počítá do „Práce celkem“.
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
      if (!byDate.has(dateKey)) byDate.set(dateKey, new Map());
      if (!byDate.get(dateKey).has(personKey)) {
        byDate.get(dateKey).set(personKey, String(mod.person || '').trim());
      }
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

  function collectKalirnaCounts(rotation, stats) {
    const counts = {};
    const displayNames = {};
    const months = rotation && rotation.months;
    if (!months || typeof months !== 'object') return { counts, displayNames };

    const included = new Set(Array.isArray(stats && stats.includedMonthKeys) ? stats.includedMonthKeys : []);
    const restrictMonths = included.size > 0;
    const seen = new Set();

    Object.entries(months).forEach(([monthKey, month]) => {
      if (restrictMonths && !included.has(monthKey)) return;
      const byDate = collectKalirnaOutPeopleByDate(month);
      byDate.forEach((people, dateKey) => {
        people.forEach((displayName, personKey) => {
          const unique = `${monthKey}|${dateKey}|${personKey}`;
          if (seen.has(unique)) return;
          seen.add(unique);
          counts[displayName] = (Number(counts[displayName]) || 0) + 1;
          displayNames[personKey] = displayName;
        });
      });
    });

    return { counts, displayNames };
  }

  function preserveWorkTotals(filteredStats, baselineStats, rotation) {
    if (!filteredStats || typeof filteredStats !== 'object') return filteredStats;
    const baselinePeople = baselineStats && baselineStats.people && typeof baselineStats.people === 'object' ? baselineStats.people : {};
    if (!filteredStats.people || typeof filteredStats.people !== 'object') filteredStats.people = {};

    // Kalírna je odpracovaná směna mimo původní stroj. Proto po strojovém filtrování
    // vrátíme přesně původní hodnotu „Práce celkem“ a nijak nezvyšujeme absence.
    Object.entries(baselinePeople).forEach(([name, baselinePerson]) => {
      if (!baselinePerson) return;
      if (filteredStats.people[name]) {
        filteredStats.people[name].totalWork = baselinePerson.totalWork;
        return;
      }

      // Pojistka pro extrémní případ, kdy by člověk měl v rozsahu statistik jen kalírnu.
      filteredStats.people[name] = Object.assign({}, baselinePerson, {
        work: {},
        clean: {},
        totalClean: 0,
        topWorkMachine: null,
        topCleanMachine: null,
        topWorkMachines: [],
        topCleanMachines: []
      });
    });

    const kalirna = collectKalirnaCounts(rotation, filteredStats);
    filteredStats.kalirnaCounts = kalirna.counts;
    Object.entries(filteredStats.people).forEach(([name, person]) => {
      if (!person) return;
      const exact = Number(kalirna.counts[name] || 0);
      if (exact > 0) {
        person.kalirnaCount = exact;
        return;
      }
      const normalized = normalizeName(name);
      const displayName = kalirna.displayNames[normalized];
      person.kalirnaCount = displayName ? Number(kalirna.counts[displayName] || 0) : 0;
      if (person.kalirnaCount > 0 && !filteredStats.kalirnaCounts[name]) {
        filteredStats.kalirnaCounts[name] = person.kalirnaCount;
      }
    });

    if (Array.isArray(filteredStats.names)) {
      Object.keys(baselinePeople).forEach((name) => {
        if (!filteredStats.names.includes(name)) filteredStats.names.push(name);
      });
      filteredStats.names.sort((a, b) => String(a).localeCompare(String(b), 'cs'));
    }

    return filteredStats;
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
        const result = original.apply(this, arguments);
        preserveWorkTotals(result, result, originalRotation);
        window.__rakKalirnaStatsFilterLast = {
          changed: false,
          removedCells: 0,
          affectedShifts: 0,
          affectedPeople: [],
          workTotalsRestored: true,
          at: Date.now()
        };
        return result;
      }

      // První průchod slouží jen jako přesný zdroj „Práce celkem“.
      // Druhý průchod běží nad dočasným rozpisem bez lidí, kteří jsou na kalírně,
      // takže strojové součty i MFK/MSK počty vzniknou už správně z původní logiky.
      const baselineStats = original.apply(this, arguments);
      try {
        runtimeApp.rotation = view.rotation;
        const result = original.apply(this, arguments);
        preserveWorkTotals(result, baselineStats, originalRotation);
        window.__rakKalirnaStatsFilterLast = {
          changed: true,
          removedCells: view.removedCells,
          affectedShifts: view.affectedShifts,
          affectedPeople: view.affectedPeople.slice(),
          workTotalsRestored: true,
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
    // Stále platí: kalirnaOut-excluded-from-machine-cells-before-stats.
    window.__rakKalirnaStatsMode = 'kalirnaOut-excluded-from-machine-cells-before-stats';
    return true;
  }

  function cleanKalirnaLabel(value) {
    return String(value || '')
      .replace('Odešel na kalírnu (počítá se jako soustruh)', 'Odešel na kalírnu')
      .replace('Odešel na kalírnu (ve statistice mimo původní stroj)', 'Odešel na kalírnu');
  }

  function patchDayModTooltip() {
    const original = window.rakDayModTooltip;
    if (typeof original !== 'function' || original.__rakKalirnaStatsLabelPatched) return false;

    function wrappedTooltip() {
      return cleanKalirnaLabel(original.apply(this, arguments));
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
        option.textContent = 'Odešel na kalírnu';
      });
      host.querySelectorAll('[title*="kalírnu"], [data-daymod-info*="kalírnu"]').forEach((node) => {
        if (node.hasAttribute && node.hasAttribute('title')) node.setAttribute('title', cleanKalirnaLabel(node.getAttribute('title')));
        if (node.hasAttribute && node.hasAttribute('data-daymod-info')) node.setAttribute('data-daymod-info', cleanKalirnaLabel(node.getAttribute('data-daymod-info')));
      });
    } catch (err) {}
  }

  function hasFunctionPatch(fn, marker) {
    let current = fn;
    let guard = 0;
    while (typeof current === 'function' && guard < 12) {
      if (current[marker]) return true;
      current = current.__rakOriginal;
      guard += 1;
    }
    return false;
  }

  function makeKalirnaTile(value) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.setAttribute('data-rak-person-load-stat', 'kalirna');

    const small = document.createElement('div');
    small.className = 'smallText';
    small.textContent = 'Kalírna';

    const number = document.createElement('div');
    number.className = 'statsSummaryValue';
    number.textContent = String(Math.max(0, Number(value) || 0)) + '×';

    tile.appendChild(small);
    tile.appendChild(number);
    return tile;
  }

  function patchStatsNameView() {
    const original = window.renderStatsNameViewNodes;
    if (typeof original !== 'function' || hasFunctionPatch(original, '__rakKalirnaCountTilePatched')) return false;
    const inheritedPersonLoadMarker = !!original.__rak1603PersonLoadStatsPatched;

    function wrappedRenderStatsNameViewNodes(person, year, stats) {
      const nodes = original.apply(this, arguments);
      try {
        const list = Array.isArray(nodes) ? nodes : [];
        const summary = list.find((node) => node && node.classList && node.classList.contains('statsSummary'));
        if (summary && person && stats && !summary.querySelector('[data-rak-person-load-stat="kalirna"]')) {
          const name = String(person.name || '');
          const value = stats.kalirnaCounts && stats.kalirnaCounts[name] != null
            ? stats.kalirnaCounts[name]
            : person.kalirnaCount;
          summary.appendChild(makeKalirnaTile(value));
        }
      } catch (err) {}
      return nodes;
    }

    wrappedRenderStatsNameViewNodes.__rakKalirnaCountTilePatched = true;
    if (inheritedPersonLoadMarker) wrappedRenderStatsNameViewNodes.__rak1603PersonLoadStatsPatched = true;
    wrappedRenderStatsNameViewNodes.__rakOriginal = original;
    window.renderStatsNameViewNodes = wrappedRenderStatsNameViewNodes;
    return true;
  }

  function installAvailablePatches() {
    const statsPatched = patchBuildStatsForYear();
    patchStatsNameView();
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