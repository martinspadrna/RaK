// RaK 1.2 (1.155) – Rotace render a volba jmen.
function renderRotace() {
  const namesGrid = document.getElementById('namesGrid');
  const personView = document.getElementById('personView');
  const monthView = document.getElementById('monthView');

  // v.1.1 (740): respektuj ručně vybraný rok. Dřív se při každém renderu
  // Rozpisů/Statistik přepsal zpět na aktuální rok, takže importy 2025 nebyly vidět.
  const requestedYear = parseInt(app.selectedYear, 10);
  const availableYears = getAvailableYears(app.rotation);
  if (!availableYears.includes(requestedYear)) {
    app.selectedYear = getInitialSelectedYear(app.rotation);
  }

  syncYearControls();
  renderMonthGrid();

  const nameIndex = buildNameIndex(app.rotation);
  const names = Object.keys(nameIndex);

  const buildRotaceNameTiles = () => names.map(name => {
    const el = document.createElement('div');
    const isActive = app.selectedName === name;
    el.className = 'listItem rotaceNameTile' + (isActive ? ' activeChoice' : '');
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');

    const title = document.createElement('div');
    title.className = 'rotaceTileTitle';
    title.textContent = name;
    el.appendChild(title);

    el.onclick = () => handlePersonTap(name);
    el.onkeydown = (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handlePersonTap(name);
      }
    };
    return el;
  });

  const namesFingerprint = JSON.stringify({ names, selectedName: app.selectedName || '' });
  if (typeof setElementChildrenIfChanged === 'function') {
    setElementChildrenIfChanged(namesGrid, namesFingerprint, buildRotaceNameTiles, 'rotaceNamesGrid');
  } else {
    namesGrid.replaceChildren(...buildRotaceNameTiles());
  }

  if (app.selectedName && nameIndex[app.selectedName]) {
    renderPerson(app.selectedName);
  } else {
    renderUpcomingShiftsPreview(10);
  }
  bindRotaceOverviewTap();

  if (app.selectedMonth && app.rotation.months[app.selectedMonth]) {
    renderMonth(app.selectedMonth);
  } else if (monthView) {
    setRotaceHtmlIfChanged(monthView, "<div class='smallText'>Vyber měsíc.</div>", 'rotaceMonth-empty');
  }

  renderStatsPanel();
  const adminBox = document.getElementById('adminBox');
  if (adminBox) adminBox.style.display = 'none';
}


function setRotaceHtmlIfChanged(element, html, key) {
  if (!element) return false;
  if (typeof setElementHtmlIfChanged === 'function') {
    return setElementHtmlIfChanged(element, html, key || 'rotace');
  }
  element.innerHTML = String(html ?? '');
  return true;
}

function bindRotaceOverviewTap() {
  const personView = document.getElementById('personView');
  if (!personView || personView.dataset.rotaceBlankTapBound === '1') return;
  personView.dataset.rotaceBlankTapBound = '1';
  personView.addEventListener('click', (event) => {
    if (!app.selectedName) return;
    const target = event.target;
    if (target && typeof target.closest === 'function') {
      if (target.closest('.rotaceMiniCard') || target.closest('button, a, input, select, textarea, label')) return;
    }
    app.selectedName = null;
    app.nameTapState = { name: '', count: 0, lastTap: 0, qrShownAt: 0 };
    renderRotace();
  });
}

function getSoftMachineDisplayLabel(entry, rotation) {
  const machine = String(entry && entry.machine ? entry.machine : "").trim();
  if (!machine) return "";
  if (String(entry && entry.section ? entry.section : "") !== "soft" || machine !== "MFKF10") return machine;

  const month = rotation && rotation.months ? rotation.months[entry.monthKey] : null;
  const soft = month && month.soft ? month.soft : null;
  if (!soft || !Array.isArray(soft.rows) || !Array.isArray(soft.machines)) return machine;

  const row = soft.rows.find(r => String(r && r.date ? r.date : "").trim() === String(entry.date || "").trim());
  if (!row) return machine;

  const idx06 = soft.machines.indexOf("MFKF06");
  const idx10 = soft.machines.indexOf("MFKF10");
  if (idx10 < 0) return machine;

  const has10 = String((row.cells || [])[idx10] || "").trim();
  const has06 = idx06 >= 0 ? String((row.cells || [])[idx06] || "").trim() : "";
  if (has10 && !has06) return "MFKF10 (+ MFKF06)";
  return machine;
}


function handlePersonTap(name) {
  const now = Date.now();
  const sameName = app.selectedName === name;
  const state = app.nameTapState && app.nameTapState.name === name ? app.nameTapState : { name: '', count: 0, lastTap: 0, qrShownAt: 0 };
  const freshTap = state.name !== name || now - (state.lastTap || 0) > 750;

  if (freshTap) {
    app.nameTapState = { name, count: 1, lastTap: now, qrShownAt: 0 };
    app.selectedName = name;
    renderRotace();
    return;
  }

  state.count = (state.count || 0) + 1;
  state.lastTap = now;
  app.nameTapState = state;

  if (!sameName) {
    app.selectedName = name;
    renderRotace();
    return;
  }

  if (state.qrShownAt) {
    if (now - state.qrShownAt >= 450) {
      app.selectedName = null;
      app.nameTapState = { name: '', count: 0, lastTap: 0, qrShownAt: 0 };
      renderRotace();
      return;
    }
    renderRotace();
    return;
  }

  if (state.count >= 3) {
    state.qrShownAt = now;
    app.nameTapState = state;
    app.selectedName = name;
    renderRotace();
    showPersonQrModal(name);
    return;
  }

  app.selectedName = name;
  renderRotace();
}


function getPersonScheduleEntryWindow(entry) {
  const parsed = parseDateToken(String(entry && entry.dateLabel ? entry.dateLabel : ""));
  if (!parsed) return null;

  const sortDate = entry && entry.sortDate ? new Date(entry.sortDate) : null;
  const baseYear = sortDate && !Number.isNaN(sortDate.getTime()) ? sortDate.getFullYear() : (new Date()).getFullYear();
  const baseDate = new Date(baseYear, parsed.month - 1, parsed.day, 0, 0, 0, 0);
  const shift = normalizeShiftText(String(entry && entry.shift ? entry.shift : parsed.shift || "")).toUpperCase();
  const start = new Date(baseDate);
  const end = new Date(baseDate);

  if (!shift) {
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (shift.includes("R8")) {
    start.setHours(6, 0, 0, 0);
    end.setHours(14, 0, 0, 0);
    return { start, end };
  }

  if (shift.includes("N8")) {
    const specialHour = typeof getSpecialSundayNightStartHour === 'function'
      ? getSpecialSundayNightStartHour(baseDate, 22)
      : 22;
    start.setHours(specialHour, 0, 0, 0);
    end.setDate(end.getDate() + 1);
    end.setHours(6, 0, 0, 0);
    return { start, end };
  }

  if (shift.startsWith("N")) {
    start.setHours(18, 0, 0, 0);
    end.setDate(end.getDate() + 1);
    end.setHours(6, 0, 0, 0);
    return { start, end };
  }

  if (shift.startsWith("R")) {
    start.setHours(6, 0, 0, 0);
    end.setHours(18, 0, 0, 0);
    return { start, end };
  }

  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getPersonScheduleEntryEnd(entry) {
  const win = getPersonScheduleEntryWindow(entry);
  return win ? win.end : null;
}

function getPersonScheduleEntries(name) {
  const rawEntries = (buildNameIndex(app.rotation)[name] || []).slice();
  if (!rawEntries.length) {
    return { entries: [], currentIdx: -1 };
  }

  const dayKey = (d) => {
    const date = new Date(d);
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  };

  const now = typeof getPragueNow === 'function' ? getPragueNow(new Date()) : new Date();
  const nowMs = now.getTime();

  const priorityOf = (entry) => {
    if (entry && entry.absence) return 3;
    if ((entry && entry.section) === "soft") return 2;
    if ((entry && entry.section) === "hard") return 1;
    return 0;
  };

  const getSharedSoftSuffix = (entry) => {
    if (!entry || entry.section !== "soft") return "";
    const machine = String(entry.machine || "").trim();
    if (machine !== "MSKC03" && machine !== "MSKC04") return "";

    const month = app.rotation && app.rotation.months ? app.rotation.months[entry.monthKey] : null;
    const soft = month && month.soft ? month.soft : null;
    if (!soft || !Array.isArray(soft.rows) || !Array.isArray(soft.machines)) return "";

    const row = soft.rows.find(r => String(r && r.date ? r.date : "").trim() === String(entry.date || "").trim());
    if (!row) return "";

    const idx01 = soft.machines.indexOf("MSKC01");
    if (idx01 < 0) return "";

    const has01 = String((row.cells || [])[idx01] || "").trim();
    return has01 ? "" : " (+MSKC01)";
  };

  const groups = new Map();
  rawEntries.forEach(entry => {
    const dateObj = new Date(entry.sortDate);
    if (Number.isNaN(dateObj.getTime())) return;
    if (getSpecialWorkInfo(dateObj)) return;

    const key = dayKey(dateObj);
    if (!groups.has(key)) {
      groups.set(key, {
        sortDate: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 12, 0, 0, 0).toISOString(),
        dateLabel: entry.dateLabel || entry.date || "",
        bestEntry: null
      });
    }

    const group = groups.get(key);
    if (!group.dateLabel && entry.dateLabel) group.dateLabel = entry.dateLabel;
    if (!group.bestEntry || priorityOf(entry) > priorityOf(group.bestEntry)) {
      group.bestEntry = entry;
    }
  });

  const entries = [...groups.values()]
    .map(group => {
      const best = group.bestEntry || {};
      return {
        sortDate: group.sortDate,
        dateLabel: group.dateLabel || best.dateLabel || best.date || "",
        shift: best.shift || "",
        absence: !!best.absence,
        target: best.absence
          ? (best.machine || "Dovolená")
          : getSoftMachineDisplayLabel(best, app.rotation) + getSharedSoftSuffix(best)
      };
    })
    .sort((a, b) => a.sortDate.localeCompare(b.sortDate));

  let currentIdx = entries.findIndex(entry => {
    if (entry && entry.absence) return false;
    const win = getPersonScheduleEntryWindow(entry);
    return win && win.start.getTime() <= nowMs && nowMs < win.end.getTime();
  });

  if (currentIdx === -1) {
    currentIdx = entries.findIndex(entry => {
      if (entry && entry.absence) return false;
      const win = getPersonScheduleEntryWindow(entry);
      return win && win.start.getTime() > nowMs;
    });
  }

  if (currentIdx === -1) {
    currentIdx = entries.findIndex(entry => {
      const end = getPersonScheduleEntryEnd(entry);
      return end && end.getTime() > nowMs;
    });
  }

  if (currentIdx === -1 && entries.length) currentIdx = entries.length - 1;

  return { entries, currentIdx };
}
function buildPersonScheduleModalNodes(name) {
  const model = getPersonScheduleEntries(name);
  if (!model.entries.length) {
    const empty = document.createElement('div');
    empty.className = 'smallText';
    empty.textContent = 'Pro tohle jméno zatím nejsou žádné směny.';
    return [empty];
  }

  const innerTitle = document.createElement('div');
  innerTitle.className = 'personScheduleTitle';
  innerTitle.textContent = String(name || '');

  const wrap = document.createElement('div');
  wrap.className = 'tableWrap';

  const table = document.createElement('table');
  table.className = 'personScheduleTable';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Datum', 'Směna', 'Cíl'].forEach((label) => {
    const th = document.createElement('th');
    th.textContent = label;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  const tbody = document.createElement('tbody');
  model.entries.forEach((e, idx) => {
    const row = document.createElement('tr');
    if (idx === model.currentIdx) row.className = 'currentRow';
    [e.dateLabel || '', e.shift || '', e.target || ''].forEach((value) => {
      const td = document.createElement('td');
      td.textContent = String(value || '');
      row.appendChild(td);
    });
    tbody.appendChild(row);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  wrap.appendChild(table);
  return [innerTitle, wrap];
}

function getPersonScheduleModalFingerprint(name) {
  const model = getPersonScheduleEntries(name);
  return JSON.stringify({
    name: String(name || ''),
    currentIdx: model.currentIdx,
    entries: model.entries.map((e) => ({
      dateLabel: String(e.dateLabel || ''),
      shift: String(e.shift || ''),
      target: String(e.target || '')
    }))
  });
}

function renderPersonScheduleModal(name) {
  const overlay = ensurePersonScheduleModal();
  const title = overlay.querySelector('#personScheduleModalTitle');
  const body = overlay.querySelector('#personScheduleModalBody');
  if (title) {
    if (typeof setElementTextIfChanged === 'function') setElementTextIfChanged(title, name, 'rotacePersonScheduleModalTitle');
    else title.textContent = name;
  }
  if (body) {
    const fingerprint = getPersonScheduleModalFingerprint(name);
    if (typeof setElementChildrenIfChanged === 'function') {
      setElementChildrenIfChanged(body, fingerprint, () => buildPersonScheduleModalNodes(name), 'rotacePersonScheduleModalBody');
    } else {
      body.replaceChildren(...buildPersonScheduleModalNodes(name));
    }
  }
}

function showPersonScheduleModal(name) {
  const overlay = ensurePersonScheduleModal();
  renderPersonScheduleModal(name);
  overlay.classList.add('isVisible');
  document.body.classList.add('personModalOpen');
}

function hidePersonScheduleModal() {
  const overlay = document.getElementById('personScheduleModal');
  if (!overlay) return;
  overlay.classList.remove('isVisible');
  document.body.classList.remove('personModalOpen');
}

function ensurePersonScheduleModal() {
  let overlay = document.getElementById('personScheduleModal');
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = 'personScheduleModal';
  overlay.className = 'personScheduleOverlay';

  const modal = document.createElement('div');
  modal.className = 'personScheduleModal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'personScheduleModalTitle');

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'personScheduleClose';
  closeBtn.setAttribute('aria-label', 'Zavřít');
  closeBtn.textContent = '×';

  const title = document.createElement('div');
  title.className = 'personScheduleTitle';
  title.id = 'personScheduleModalTitle';

  const body = document.createElement('div');
  body.className = 'personScheduleBody';
  body.id = 'personScheduleModalBody';

  modal.appendChild(closeBtn);
  modal.appendChild(title);
  modal.appendChild(body);
  overlay.appendChild(modal);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) hidePersonScheduleModal();
  });
  closeBtn.addEventListener('click', hidePersonScheduleModal);

  bindGlobalEscapeOnce('personModalKeydownBound', hidePersonScheduleModal);

  document.body.appendChild(overlay);
  return overlay;
}





const RAK_ROTACE_EMPTY_ABSENCE_TEXT_CONTRACT_V1105 = Object.freeze({
  scope: 'rotace-upcoming-shift-empty-absence-line',
  text: 'Nikdo nebude chybět.'
});

function renderUpcomingShiftsPreview(limit = 10) {
  const personView = document.getElementById("personView");
  if (!personView) return;

  const index = buildNameIndex(app.rotation);
  const names = Object.keys(index || {}).sort((a, b) => String(a).localeCompare(String(b), 'cs'));
  const now = typeof getPragueNow === 'function' ? getPragueNow(new Date()) : new Date();
  const nowMs = now.getTime();

  const shiftKey = (entry) => [
    String(entry && entry.dateLabel ? entry.dateLabel : '').trim(),
    String(entry && entry.shift ? entry.shift : '').trim().toUpperCase()
  ].join('|');

  const previewEntries = names.map(name => {
    const model = getPersonScheduleEntries(name);
    const nextEntry = (model.entries || []).find(entry => {
      const end = getPersonScheduleEntryEnd(entry);
      return end && end.getTime() > nowMs;
    });
    if (!nextEntry) return null;
    const end = getPersonScheduleEntryEnd(nextEntry);
    if (!end) return null;
    return {
      name,
      dateLabel: nextEntry.dateLabel || '',
      shift: nextEntry.shift || '',
      target: nextEntry.target || '',
      absence: !!nextEntry.absence,
      endMs: end.getTime(),
      key: shiftKey(nextEntry)
    };
  }).filter(Boolean);

  if (!previewEntries.length) {
    setRotaceHtmlIfChanged(personView, "<div class='smallText'>Pro teď tu ještě nejsou žádné budoucí směny.</div>", 'rotaceUpcoming-empty');
    return;
  }

  previewEntries.sort((a, b) => a.endMs - b.endMs || String(a.name).localeCompare(String(b.name), 'cs'));

  const nextShift = previewEntries[0];
  const primaryKey = nextShift.key;
  const shiftEntries = previewEntries
    .filter(entry => entry.key === primaryKey)
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'cs'));

  const presentEntries = shiftEntries.filter(entry => !entry.absence).slice(0, Math.max(1, limit));
  const presentNames = new Set(presentEntries.map(entry => entry.name));
  const missingNames = names
    .filter(name => !presentNames.has(name))
    .filter((name, index, arr) => arr.indexOf(name) === index)
    .sort((a, b) => String(a).localeCompare(String(b), 'cs'));

  const title = 'Příští směna';
  const nextShiftText = [nextShift && nextShift.dateLabel ? nextShift.dateLabel : '', nextShift && nextShift.shift ? nextShift.shift : ''].filter(Boolean).join(' - ');
  const headerText = nextShiftText ? (title + ' ' + nextShiftText) : title;
  const totalPeople = names.length || Math.max(presentEntries.length + missingNames.length, 1);
  const presentCount = presentEntries.length;
  const missingText = missingNames.length ? 'Chybí: ' + missingNames.join(', ') : 'Nikdo nebude chybět.';
  setRotaceHtmlIfChanged(personView, [
    '<div class="rotacePersonHeader rotaceOverviewHeader">',
    '  <div class="rotacePersonTitle">' + escapeHtml(headerText) + '</div>',
    '</div>',
    '<div class="rotacePersonMeta rotaceOverviewMeta">Přítomno ' + String(presentCount) + ' z ' + String(totalPeople) + ' lidí · ' + escapeHtml(missingText) + '<br></div>',
    '<div class="rotaceQuickCards rotacePreviewGrid rotaceOverviewGrid">',
    presentEntries.length ? presentEntries.map(entry => [
      '<div class="rotaceMiniCard rotaceOverviewCard rotaceShiftTaskCard" role="button" tabindex="0" data-rotation-task-person="' + escapeHtml(entry.name || '') + '" data-rotation-task-date="' + escapeHtml(entry.dateLabel || '') + '" data-rotation-task-shift="' + escapeHtml(entry.shift || '') + '" data-rotation-task-machine="' + escapeHtml(entry.target || '') + '" aria-label="3× klepni pro úkol: ' + escapeHtml(entry.name || '') + '">',
      '  <div class="rotaceMiniTarget rotaceOverviewName">' + escapeHtml(entry.name || '') + '</div>',
      entry.target ? '  <div class="rotaceMiniDate rotaceOverviewTarget">' + escapeHtml(entry.target || '') + '</div>' : '',
      '</div>'
    ].join('')).join('') : '<div class="rotaceMiniCard rotaceOverviewCard isEmpty"><div class="rotaceMiniTarget rotaceOverviewName">Nikdo není zapsaný jako přítomný.</div></div>',
    '</div>'
  ].join(''), 'rotaceUpcoming-preview');
}

function renderPerson(name) {
  const personView = document.getElementById("personView");
  const schedule = getPersonScheduleEntries(name);
  const entries = Array.isArray(schedule.entries) ? schedule.entries : [];
  const currentIdx = Number.isFinite(schedule.currentIdx) ? schedule.currentIdx : -1;

  if (!entries.length) {
    setRotaceHtmlIfChanged(personView, "<div class='smallText'>Pro tohle jméno zatím nejsou žádné směny.</div>", 'rotacePerson-empty');
    return;
  }

  const startIdx = Math.max(0, currentIdx >= 0 ? currentIdx - 1 : 0);
  const forwardStartIdx = currentIdx >= 0 ? currentIdx : startIdx;
  const previousEntry = currentIdx > 0 ? entries[currentIdx - 1] : null;
  const forwardLimit = previousEntry ? 6 : 7;
  const forwardEntries = entries.slice(forwardStartIdx, Math.min(entries.length, forwardStartIdx + forwardLimit));
  const visibleEntries = previousEntry ? [previousEntry, ...forwardEntries] : forwardEntries;

  const formatEntry = (entry, isCurrent) => [
    '<div class="rotaceMiniCard rotaceShiftCard rotaceShiftTaskCard' + (isCurrent ? ' current' : '') + '" role="button" tabindex="0" data-rotation-task-person="' + escapeHtml(name || '') + '" data-rotation-task-date="' + escapeHtml(entry.dateLabel || '') + '" data-rotation-task-shift="' + escapeHtml(entry.shift || '') + '" data-rotation-task-machine="' + escapeHtml(entry.target || '') + '" aria-label="3× klepni pro úkol: ' + escapeHtml(entry.target || '') + '">',
    '  <div class="rotaceShiftLine">',
    '    <span class="rotaceShiftDate">' + escapeHtml(entry.dateLabel || "") + '</span>',
    '    <span class="rotaceShiftName">' + escapeHtml(entry.shift || "") + '</span>',
    '    <span class="rotaceShiftTarget">' + escapeHtml(entry.target || "") + '</span>',
    '  </div>',
    '</div>'
  ].join('');

  setRotaceHtmlIfChanged(personView, [
    '<div class="rotacePersonHeader">',
    '  <div class="rotacePersonTitle">' + escapeHtml(name) + '</div>',
    '  <div class="rotacePersonMeta">3× rychle klepni na jméno pro QR kód. 3× na směnu pro úkol.</div>',
    '</div>',
    '<div class="rotaceQuickCards rotaceQuickStack">',
    visibleEntries.map((entry) => formatEntry(entry, entry === entries[currentIdx])).join(''),
    '</div>'
  ].join(''), 'rotacePerson-detail-' + String(name || ''));
}

function getRotationRowShiftWindow(monthKey, dateLabel) {
  const parsed = typeof parseDateToken === 'function' ? parseDateToken(String(dateLabel || '')) : null;
  const parsedMonth = typeof parseMonthKey === 'function' ? parseMonthKey(monthKey) : null;
  if (!parsed || !parsedMonth) return null;

  const shift = (typeof normalizeShiftText === 'function'
    ? normalizeShiftText(parsed.shift || '')
    : String(parsed.shift || '').trim()).toUpperCase();
  if (!shift) return null;

  const baseDate = new Date(parsedMonth.year, parsed.month - 1, parsed.day, 0, 0, 0, 0);
  const start = new Date(baseDate);
  const end = new Date(baseDate);

  if (shift.includes('R8')) {
    start.setHours(6, 0, 0, 0);
    end.setHours(14, 0, 0, 0);
  } else if (shift.startsWith('R')) {
    start.setHours(6, 0, 0, 0);
    end.setHours(18, 0, 0, 0);
  } else if (shift.includes('N8')) {
    const specialHour = typeof getSpecialSundayNightStartHour === 'function'
      ? getSpecialSundayNightStartHour(baseDate, 22)
      : 22;
    start.setHours(specialHour, 0, 0, 0);
    end.setDate(end.getDate() + 1);
    end.setHours(6, 0, 0, 0);
  } else if (shift.startsWith('N')) {
    start.setHours(18, 0, 0, 0);
    end.setDate(end.getDate() + 1);
    end.setHours(6, 0, 0, 0);
  } else {
    return null;
  }

  return {
    key: String(parsed.day) + '.' + String(parsed.month) + '.' + '|' + shift,
    start,
    end
  };
}

function getRotationMonthShiftHighlight(monthKey, month) {
  const now = typeof getPragueNow === 'function' ? getPragueNow(new Date()) : new Date();
  const nowMs = now.getTime();
  const windows = [];
  ['hard', 'soft'].forEach(section => {
    const sec = month && month[section] ? month[section] : null;
    (sec && Array.isArray(sec.rows) ? sec.rows : []).forEach(row => {
      const win = getRotationRowShiftWindow(monthKey, row && row.date);
      if (win && !windows.some(item => item.key === win.key)) windows.push(win);
    });
  });

  const current = windows.find(win => win.start.getTime() <= nowMs && nowMs < win.end.getTime()) || null;
  const next = windows
    .filter(win => win.start.getTime() > nowMs)
    .sort((a, b) => a.start - b.start)[0] || null;

  return {
    currentKey: current ? current.key : '',
    // Zvýrazňuje se vždy jen jeden řádek: aktuální směna, a když právě žádná neběží, nejbližší další.
    nextKey: current ? '' : (next ? next.key : '')
  };
}

function renderMonth(monthKey) {

  const month = app.rotation.months[monthKey];
  const monthView = document.getElementById("monthView");
  if (!month || !monthView) return;

  const shiftHighlight = getRotationMonthShiftHighlight(monthKey, month);
  let html = "<div class='sectionTitle'>" + escapeHtml(monthKey) + "</div>";

  const renderTable = (section, label) => {
    const sec = month[section];
    if (!sec) return "";
    let out = "<div class='tableWrap'><table class='rotTable'><thead><tr><th>Datum</th>";
    (sec.machines || []).forEach(m => {
      out += "<th>" + escapeHtml(m) + "</th>";
    });
    out += "</tr></thead><tbody>";

    (sec.rows || []).forEach(row => {
      const rowWindow = getRotationRowShiftWindow(monthKey, row && row.date);
      const rowKey = rowWindow ? rowWindow.key : '';
      const rowClass = rowKey && rowKey === shiftHighlight.currentKey
        ? 'currentShiftRow'
        : (rowKey && rowKey === shiftHighlight.nextKey ? 'nextShiftRow' : '');
      out += "<tr" + (rowClass ? " class='" + rowClass + "'" : "") + "><td class='dateCell'>" + escapeHtml(row.date) + "</td>";
      (row.cells || []).forEach((cell, cellIdx) => {
        const val = (cell || "").trim();
        let mod = null;
        try { if (typeof rakDayModForCell === 'function') mod = rakDayModForCell(month, section, row.date, cellIdx); } catch (e) { mod = null; }
        const tip = mod && typeof rakDayModTooltip === 'function' ? rakDayModTooltip(mod) : "";
        const badge = mod && typeof rakDayModBadge === 'function' ? rakDayModBadge(mod) : "";
        const titleAttr = tip ? " title='" + escapeHtml(tip) + "'" : "";
        const infoAttr = tip ? " data-daymod-info='" + escapeHtml(tip) + "'" : "";
        const markHtml = badge ? " <span class='rakDayModMark'>" + escapeHtml(badge) + "</span>" : "";
        if (val) {
          out += "<td" + (mod ? " class='rakDayModCell'" : "") + titleAttr + infoAttr + ">" + escapeHtml(val) + markHtml + "</td>";
        } else {
          out += "<td class='missingCell" + (mod ? " rakDayModCell" : "") + "'" + titleAttr + infoAttr + ">" + (badge ? escapeHtml(badge) : "—") + "</td>";
        }
      });
      out += "</tr>";
    });

    out += "</tbody></table></div>";
    return out;
  };

  const wrapRotationViewSection = (label, content) => {
    return "<details class='rotationFoldSection rotationViewFold' open><summary>" + escapeHtml(label) + "</summary>" + (content || "<div class='smallText'>Bez dat.</div>") + "</details>";
  };

  html += wrapRotationViewSection("Tvrdota", renderTable("hard", "Tvrdota"));
  html += wrapRotationViewSection("Měkota", renderTable("soft", "Měkota"));

  const absenceGroups = getRotationMonthShiftAbsenceGroups(month);
  let absenceHtml = "";

  if (absenceGroups.length) {
    const maxPairs = Math.max(1, ...absenceGroups.map(group => Math.max(1, group.items.length)));
    // RAK_17061_PUBLIC_ABSENCE_LAYOUT: fixed columns, reclaimed name space goes to date.
    const absenceColgroup = "<colgroup><col style='width:58px'><col style='width:34px'>" +
      Array.from({length:maxPairs}, (_, idx) => (idx ? "<col style='width:7px'>" : '') +
        "<col style='width:68px'><col style='width:38px'>").join('') + "</colgroup>";
    const absenceWidth = 58 + 34 + maxPairs * (68 + 38) + Math.max(0, maxPairs - 1) * 7;
    absenceHtml += "<div class='tableWrap'><table class='noteTable rakAbsenceTable' style='width:" + String(absenceWidth) + "px;min-width:100%'>" + absenceColgroup + "<thead><tr>";
    for (let i = 0; i < maxPairs; i += 1) {
      if (i > 0) absenceHtml += "<th class='noteSpacer'></th>";
      if (i === 0) absenceHtml += "<th class='noteDateCell'>Datum</th><th class='noteShiftCell'>Směna</th>";
      absenceHtml += "<th class='notePersonCell'>Jméno</th><th class='noteReasonCell'>Důvod</th>";
    }
    absenceHtml += "</tr></thead><tbody>";

    absenceGroups.forEach(group => {
      const items = group.items && group.items.length ? group.items.slice() : [];
      absenceHtml += "<tr" + (!items.length ? " class='noteEmptyAbsenceDay'" : "") + ">";
      for (let i = 0; i < maxPairs; i += 1) {
        if (i > 0) absenceHtml += "<td class='noteSpacer'></td>";
        const item = items[i];
        if (i === 0) {
          absenceHtml += "<td class='noteDateCell'>" + escapeHtml(group.date || '—') + "</td><td class='noteShiftCell'>" + escapeHtml(group.shift || '') + "</td>";
        }
        if (item) {
          absenceHtml += "<td class='notePersonCell'>" + escapeHtml(item.person || '') + "</td><td class='noteReasonCell'>" + escapeHtml(item.reason || '') + "</td>";
        } else {
          absenceHtml += "<td class='emptyCell notePersonCell'>—</td><td class='emptyCell noteReasonCell'>—</td>";
        }
      }
      absenceHtml += "</tr>";
    });

    absenceHtml += "</tbody></table></div>";
  } else {
    absenceHtml += "<div class='smallText'>Bez pracovních dnů.</div>";
  }

  html += wrapRotationViewSection("Absence", absenceHtml);

  setRotaceHtmlIfChanged(monthView, html, 'rotaceMonth-' + String(monthKey || ''));
}



function getRotationMonthExportFileName(monthKey) {
  const parsed = typeof parseMonthKey === 'function' ? parseMonthKey(monthKey) : null;
  if (parsed && parsed.year && parsed.month) {
    return 'rozpis_' + String(parsed.year) + '_' + String(parsed.month).padStart(2, '0') + '.png';
  }
  return 'rozpis_' + String(monthKey || 'mesic').replace(/[^0-9a-zA-Z_-]+/g, '_') + '.png';
}

function getRotationMonthShiftAbsenceGroups(month) {
  const groups = [];
  const byKey = new Map();
  const addGroup = (dateText, sourceIndex) => {
    const parsed = typeof parseDateToken === 'function' ? parseDateToken(dateText) : null;
    const shift = String((parsed && parsed.shift) || (String(dateText || '').match(/\b(R8|N8|R|N)\b/i) || [])[1] || '').trim();
    const day = parsed && Number.isFinite(Number(parsed.day)) ? Number(parsed.day) : 999;
    const monthNo = parsed && Number.isFinite(Number(parsed.month)) ? Number(parsed.month) : 999;
    const date = parsed ? String(parsed.day) + '.' + String(parsed.month) + '.' : String(dateText || '').replace(/\b(?:R8|N8|R|N)\b/gi, '').trim();
    const shiftOrder = shift.toUpperCase().startsWith('R') ? 1 : (shift.toUpperCase().startsWith('N') ? 2 : 9);
    const key = [date || String(dateText || '').trim(), shift].join('|');
    if (!String(date || '').trim() && !shift) return null;
    if (!byKey.has(key)) {
      const group = {
        key,
        date,
        shift,
        label: [date || '—', shift].filter(Boolean).join(' '),
        day,
        month: monthNo,
        shiftOrder,
        index: Number.isFinite(Number(sourceIndex)) ? Number(sourceIndex) : groups.length,
        items: []
      };
      byKey.set(key, group);
      groups.push(group);
    }
    return byKey.get(key);
  };

  ['hard', 'soft'].forEach((sectionKey) => {
    const rows = Array.isArray(month && month[sectionKey] && month[sectionKey].rows) ? month[sectionKey].rows : [];
    rows.forEach((row, idx) => addGroup(row && row.date, idx));
  });

  const findFallbackGroupForNote = (normalized, noteIndex) => {
    const parsed = typeof parseDateToken === 'function' ? parseDateToken(normalized && normalized.date) : null;
    const shift = String((normalized && normalized.shift) || (parsed && parsed.shift) || '').trim();
    const date = parsed ? String(parsed.day) + '.' + String(parsed.month) + '.' : String(normalized && normalized.date || '').replace(/\b(?:R8|N8|R|N)\b/gi, '').trim();
    if (date || shift) {
      const exact = byKey.get([date || String(normalized && normalized.date || '').trim(), shift].join('|'));
      if (exact) return exact;
      const sameDay = groups.find(group => String(group.date || '') === String(date || '') && (!shift || String(group.shift || '') === shift));
      if (sameDay) return sameDay;
      return addGroup(String(normalized && normalized.date || ''), noteIndex);
    }
    return null;
  };

  (Array.isArray(month && month.notes) ? month.notes : [])
    .map((note, index) => ({ entry: typeof normalizeNoteEntry === 'function' ? normalizeNoteEntry(note) : note, index }))
    .filter(item => item.entry && item.entry.isAbsence)
    .forEach((item) => {
      const n = item.entry;
      const group = findFallbackGroupForNote(n, item.index);
      if (!group) return;
      const people = (Array.isArray(n.people) && n.people.length)
        ? n.people.map(person => String(person || '').trim()).filter(Boolean)
        : [String(n.person || '').trim()].filter(Boolean);
      const reason = typeof absenceReasonShortCode === 'function'
        ? absenceReasonShortCode(n.code, n.label)
        : String(n.code || n.label || '').trim();
      (people.length ? people : ['']).forEach((person, personIndex) => {
        group.items.push({ person, reason, index: item.index, personIndex });
      });
    });

  groups.sort((a, b) => (a.month - b.month) || (a.day - b.day) || (a.shiftOrder - b.shiftOrder) || (a.index - b.index));
  sortRotationAbsenceGroupItems(groups);
  return groups;
}

function sortRotationAbsenceGroupItems(groups) {
  const safeGroups = Array.isArray(groups) ? groups : [];
  const byPerson = new Map();
  safeGroups.forEach((group, groupIndex) => {
    (Array.isArray(group && group.items) ? group.items : []).forEach((item) => {
      const person = String(item && item.person || '').trim();
      if (!person) return;
      if (!byPerson.has(person)) byPerson.set(person, []);
      byPerson.get(person).push(groupIndex);
    });
  });
  const personBlocks = new Map();
  byPerson.forEach((indexes, person) => {
    const sorted = Array.from(new Set(indexes)).sort((a, b) => a - b);
    const blocks = [];
    let start = null;
    let last = null;
    sorted.forEach((idx) => {
      if (start === null || idx !== last + 1) {
        if (start !== null) blocks.push({ start, end: last, length: last - start + 1 });
        start = idx;
      }
      last = idx;
    });
    if (start !== null) blocks.push({ start, end: last, length: last - start + 1 });
    personBlocks.set(person, blocks);
  });
  const metaFor = (person, groupIndex) => {
    const blocks = personBlocks.get(String(person || '').trim()) || [];
    return blocks.find(block => groupIndex >= block.start && groupIndex <= block.end) || { start: 9999, end: 9999, length: 1 };
  };
  safeGroups.forEach((group, groupIndex) => {
    if (!group || !Array.isArray(group.items)) return;
    group.items.sort((a, b) => {
      const aMeta = metaFor(a && a.person, groupIndex);
      const bMeta = metaFor(b && b.person, groupIndex);
      return (bMeta.length - aMeta.length)
        || (aMeta.start - bMeta.start)
        || String(a.person || '').localeCompare(String(b.person || ''), 'cs')
        || ((Number(a.personIndex) || 0) - (Number(b.personIndex) || 0));
    });
    group.items.forEach((item, slotIndex) => {
      item.slotIndex = slotIndex;
    });
  });
  return safeGroups;
}

function getRotationMonthExportAbsences(month) {
  const activeNames = typeof getKnownStatNames === 'function' ? getKnownStatNames() : null;
  return getRotationMonthShiftAbsenceGroups(month)
    .flatMap((group) => {
      const rawItems = group.items && group.items.length ? group.items : [];
      const items = rawItems.filter((item) => {
        const person = String(item && item.person || '').trim();
        return !person || !activeNames || activeNames.has(person);
      });
      if (!items.length) return [];
      return items.map((item) => ({
        date: group.date,
        shift: group.shift,
        day: group.day,
        month: group.month,
        shiftOrder: group.shiftOrder,
        reason: String(item.reason || '').trim(),
        index: Number.isFinite(Number(item.index)) ? Number(item.index) : group.index,
        people: String(item.person || '').trim(),
        personIndex: Number.isFinite(Number(item.personIndex)) ? Number(item.personIndex) : 0,
        slotIndex: Number.isFinite(Number(item.slotIndex)) ? Number(item.slotIndex) : 0,
        isEmptyAbsenceDay: !!item.empty
      }));
    })
    .sort((a, b) => (a.month - b.month) || (a.day - b.day) || (a.shiftOrder - b.shiftOrder) || (a.slotIndex - b.slotIndex) || (a.index - b.index) || (a.personIndex - b.personIndex));
}

function buildRotationExportAbsenceTable(absences, dateWeight, personWeight) {
  const groups = [];
  const map = new Map();
  (Array.isArray(absences) ? absences : []).forEach(row => {
    const key = [row.date || '', row.shift || ''].join('|');
    let group = map.get(key);
    if (!group) {
      group = {
        label: [String(row.date || '—'), String(row.shift || '').trim()].filter(Boolean).join(' '),
        sort: [Number(row.month) || 999, Number(row.day) || 999, Number(row.shiftOrder) || 9, Number(row.index) || 0],
        items: []
      };
      map.set(key, group);
      groups.push(group);
    }
    group.items.push({ person: String(row.people || '').trim(), reason: String(row.reason || '').trim() });
  });
  groups.sort((a, b) => (a.sort[0] - b.sort[0]) || (a.sort[1] - b.sort[1]) || (a.sort[2] - b.sort[2]) || (a.sort[3] - b.sort[3]));
  const maxItems = Math.max(1, ...groups.map(group => group.items.length));
  const columns = [{ label: 'Datum', width: dateWeight, align: 'center', fontWeight: '900 ' }];
  const reasonWeight = Math.max(0.075, Math.round(personWeight * 0.55 * 10000) / 10000);
  for (let idx = 0; idx < maxItems; idx += 1) {
    columns.push({ label: 'Jméno', width: personWeight, align: 'center', fontWeight: '750 ' });
    columns.push({ label: 'Důvod', width: reasonWeight, align: 'center', fontWeight: '750 ' });
  }
  const rows = groups.length
    ? groups.map(group => {
        const cells = [group.label || '—'];
        for (let idx = 0; idx < maxItems; idx += 1) {
          const item = group.items[idx] || {};
          cells.push(item.person || '');
          cells.push(item.reason || '');
        }
        return cells;
      })
    : [['—', 'Bez absencí', '—'].concat(Array.from({ length: Math.max(0, (maxItems - 1) * 2) }, () => ''))];
  return { columns, rows, maxItems };
}


const ROTATION_EXPORT_MONTH_SUMMARY_LABELS_V187 = Object.freeze(['Směn celkem', 'Ranní směny', 'Noční směny', 'Obsazenost']);
// RAK_ROTATION_EXPORT_GLASS_17007
const ROTATION_EXPORT_GLASS_THEME_V193 = Object.freeze({
  titleBg: '#0675ff',
  titleBgAlt: '#102b72',
  panelBgTop: 'rgba(255,255,255,.50)',
  panelBgBottom: 'rgba(238,247,255,.28)',
  border: 'rgba(67,121,196,.44)',
  innerBorder: 'rgba(255,255,255,.42)',
  headerBgTop: 'rgba(255,255,255,.34)',
  headerBgBottom: 'rgba(184,216,255,.48)',
  rowEvenTop: 'rgba(255,255,255,.38)',
  rowEvenBottom: 'rgba(241,248,255,.22)',
  rowOddTop: 'rgba(210,230,255,.44)',
  rowOddBottom: 'rgba(194,220,255,.28)',
  shadow: 'rgba(18, 92, 220, .22)',
  shadowBlur: 34,
  shadowOffsetY: 14,
  glossTop: 'rgba(255,255,255,.28)',
  glossBottom: 'rgba(255,255,255,0)',
  titleGlossTop: 'rgba(255,255,255,.22)',
  titleGlossBottom: 'rgba(255,255,255,0)'
});


function formatRotationExportStatCount(value) {
  const rounded = Math.round((Number(value) || 0) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace('.', ',');
}

function buildRotationYearlyExportStats(monthKey) {
  const parsedMonth = typeof parseMonthKey === 'function' ? parseMonthKey(monthKey) : null;
  const year = parsedMonth && Number.isFinite(Number(parsedMonth.year)) ? Number(parsedMonth.year) : new Date().getFullYear();
  const maxMonth = parsedMonth && Number.isFinite(Number(parsedMonth.month)) ? Number(parsedMonth.month) : 12;
  const stats = typeof buildStatsForYear === 'function' ? buildStatsForYear(year, { maxMonth }) : null;
  const columns = [
    { label: '​', width: 0.16, align: 'left', pad: 12, fontWeight: '850 ' },
    { label: 'Nýtování', width: 0.16 },
    { label: 'Úklid MSK', width: 0.113 },
    { label: 'Úklid MFK', width: 0.113 },
    { label: 'Úklid TNK', width: 0.113 },
    { label: 'Úklid TBK', width: 0.113 },
    { label: 'Úklid W01', width: 0.114 },
    { label: 'Úklid W02', width: 0.114 }
  ];
  const names = stats && Array.isArray(stats.names) ? stats.names.slice() : [];
  const rows = names.map((name) => {
    const person = stats && stats.people ? stats.people[name] : null;
    return [
      name,
      formatRotationExportStatCount(person && person.work ? (person.work.TNK || 0) : 0),
      formatRotationExportStatCount(person && person.clean ? (person.clean.MSK || 0) : 0),
      formatRotationExportStatCount(person && person.clean ? (person.clean.MFK || 0) : 0),
      formatRotationExportStatCount(person && person.clean ? (person.clean.TNK || 0) : 0),
      formatRotationExportStatCount(person && person.clean ? (person.clean.TBK || 0) : 0),
      formatRotationExportStatCount(person && person.clean ? (person.clean.W01 || 0) : 0),
      formatRotationExportStatCount(person && person.clean ? (person.clean.W02 || 0) : 0)
    ];
  });
  return {
    year,
    title: 'Nýtování a úklid ' + year,
    note: 'Od ledna do exportovaného měsíce včetně.',
    columns,
    rows: rows.length ? rows : [['—', '0', '0', '0', '0', '0', '0', '0']]
  };
}

function formatRotationExportFooterDateTime(date) {
  const value = date instanceof Date ? date : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return pad(value.getDate()) + '.' + pad(value.getMonth() + 1) + '.' + value.getFullYear() + ' ' + pad(value.getHours()) + ':' + pad(value.getMinutes());
}

function buildRotationMonthExportSummary(month) {
  const summary = {
    shiftKeys: new Set(),
    workDays: new Set(),
    morningShifts: 0,
    nightShifts: 0,
    totalSlots: 0,
    occupiedSlots: 0,
    absenceWeight: 0,
    absencePeople: 0
  };
  const sections = ['hard', 'soft'];
  const activeNames = typeof getKnownStatNames === 'function' ? getKnownStatNames() : null;
  sections.forEach((sectionKey) => {
    const section = month && month[sectionKey] ? month[sectionKey] : null;
    const machines = Array.isArray(section && section.machines) ? section.machines : [];
    const rows = Array.isArray(section && section.rows) ? section.rows : [];
    rows.forEach((row) => {
      const parsed = typeof parseDateToken === 'function' ? parseDateToken(row && row.date) : null;
      const shiftText = String((parsed && parsed.shift) || '').trim();
      const normalizedShift = typeof normalizeShiftText === 'function' ? normalizeShiftText(shiftText) : shiftText;
      const shiftKey = [String((parsed && parsed.day) || row && row.date || ''), String((parsed && parsed.month) || ''), normalizedShift].join('|');
      if (normalizedShift && !summary.shiftKeys.has(shiftKey)) {
        summary.shiftKeys.add(shiftKey);
        if (/^(?:R|R8)\b|rann/i.test(normalizedShift)) summary.morningShifts += 1;
        else if (/^(?:N|N8)\b|noč|noc/i.test(normalizedShift)) summary.nightShifts += 1;
      }
      if (parsed && Number.isFinite(Number(parsed.day))) {
        summary.workDays.add(String(parsed.day) + '.' + String(parsed.month || ''));
      }
      machines.forEach((machine, idx) => {
        const machineName = String(machine || '').trim();
        if (!machineName) return;
        summary.totalSlots += 1;
        const worker = String(row && row.cells ? row.cells[idx] || '' : '').trim();
        if (worker && (!activeNames || activeNames.has(worker))) summary.occupiedSlots += 1;
      });
    });
  });

  const notes = Array.isArray(month && month.notes) ? month.notes : [];
  notes.forEach((note) => {
    const normalized = typeof normalizeNoteEntry === 'function' ? normalizeNoteEntry(note) : note;
    if (!normalized || !normalized.isAbsence) return;
    const weight = typeof estimateAbsenceWeight === 'function' ? estimateAbsenceWeight(normalized) : 1;
    const people = (Array.isArray(normalized.people) ? normalized.people : [normalized.person])
      .map((name) => String(name || '').trim())
      .filter((name) => name && (!activeNames || activeNames.has(name)));
    if (!people.length) return;
    summary.absenceWeight += weight * people.length;
    summary.absencePeople += people.length;
  });

  const totalShifts = summary.shiftKeys.size;
  const plannedOccupiedSlots = Math.max(0, summary.occupiedSlots);
  const adjustedOccupiedSlots = Math.max(0, plannedOccupiedSlots - summary.absenceWeight);
  const occupancyPercent = summary.totalSlots > 0 ? Math.round((adjustedOccupiedSlots / summary.totalSlots) * 1000) / 10 : 0;
  const formatNumber = (value) => (Math.round((Number(value) || 0) * 10) / 10).toString().replace('.', ',');
  const formatPercent = (value) => formatNumber(value) + ' %';
  const valuesByLabel = {
    'Směn celkem': totalShifts,
    'Ranní směny': summary.morningShifts,
    'Noční směny': summary.nightShifts,
    'Obsazenost': formatPercent(occupancyPercent)
  };
  const rows = ROTATION_EXPORT_MONTH_SUMMARY_LABELS_V187.map(label => ({ label, value: valuesByLabel[label] }));
  return { rows, totalShifts, morningShifts: summary.morningShifts, nightShifts: summary.nightShifts, occupancyPercent, totalSlots: summary.totalSlots, occupiedSlots: adjustedOccupiedSlots, absenceWeight: summary.absenceWeight, absencePeople: summary.absencePeople };
}

function buildRotationYearExportSummary(monthKey) {
  const parsedTarget = typeof parseMonthKey === 'function' ? parseMonthKey(monthKey) : null;
  const year = parsedTarget && Number.isFinite(Number(parsedTarget.year)) ? Number(parsedTarget.year) : new Date().getFullYear();
  const maxMonth = parsedTarget && Number.isFinite(Number(parsedTarget.month)) ? Number(parsedTarget.month) : 12;
  const totals = { totalShifts: 0, morningShifts: 0, nightShifts: 0, totalSlots: 0, occupiedSlots: 0 };
  Object.entries((app && app.rotation && app.rotation.months) || {}).forEach(([key, item]) => {
    const parsed = typeof parseMonthKey === 'function' ? parseMonthKey(key) : null;
    if (!parsed || Number(parsed.year) !== year || Number(parsed.month) > maxMonth) return;
    const summary = buildRotationMonthExportSummary(item);
    totals.totalShifts += Number(summary.totalShifts || 0);
    totals.morningShifts += Number(summary.morningShifts || 0);
    totals.nightShifts += Number(summary.nightShifts || 0);
    totals.totalSlots += Number(summary.totalSlots || 0);
    totals.occupiedSlots += Number(summary.occupiedSlots || 0);
  });
  const formatNumber = (value) => (Math.round((Number(value) || 0) * 10) / 10).toString().replace('.', ',');
  const occupancy = totals.totalSlots > 0 ? Math.round((totals.occupiedSlots / totals.totalSlots) * 1000) / 10 : 0;
  const valuesByLabel = {
    'Směn celkem': totals.totalShifts,
    'Ranní směny': totals.morningShifts,
    'Noční směny': totals.nightShifts,
    'Obsazenost': formatNumber(occupancy) + ' %'
  };
  return {
    year,
    rows: ROTATION_EXPORT_MONTH_SUMMARY_LABELS_V187.map(label => ({ label, value: valuesByLabel[label] }))
  };
}

function getRotationExportSummaryCardHeight(rows, options) {
  const opts = options || {};
  const rowH = Math.max(36, Number(opts.rowH) || 44);
  const titleH = Math.max(72, Number(opts.titleH) || 82);
  const showHeader = opts.showHeader !== false;
  const headerH = showHeader ? Math.max(48, Number(opts.headerH) || 58) : 0;
  const note = String(opts.note || '').trim();
  const noteH = note ? Math.max(48, Number(opts.noteH) || 58) : 0;
  const dataRows = Array.isArray(rows) && rows.length ? rows : [{ label: 'Bez dat', value: '—' }];
  return titleH + headerH + rowH * dataRows.length + noteH;
}

function drawRotationExportSummaryCard(ctx, title, rows, x, y, w, options) {
  const opts = Object.assign({}, ROTATION_EXPORT_GLASS_THEME_V193, options || {});
  const labelWeight = Math.max(0.35, Math.min(0.72, Number(opts.labelWeight) || 0.64));
  const rowH = Math.max(36, Number(opts.rowH) || 44);
  const titleH = Math.max(72, Number(opts.titleH) || 82);
  const showHeader = opts.showHeader !== false;
  const headerH = showHeader ? Math.max(48, Number(opts.headerH) || 58) : 0;
  const note = String(opts.note || '').trim();
  const noteH = note ? Math.max(48, Number(opts.noteH) || 58) : 0;
  const dataRows = Array.isArray(rows) && rows.length ? rows : [{ label: 'Bez dat', value: '—' }];
  const tableH = getRotationExportSummaryCardHeight(dataRows, opts);

  drawRotationExportGlassPanelShell(ctx, x, y, w, tableH, 28, opts);
  drawRotationExportGlassTitleBar(ctx, x, y, w, titleH, 28, opts);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 37px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(title || 'Přehled'), x + 28, y + titleH / 2 + 1);

  const headerY = y + titleH;
  const labelW = Math.round(w * labelWeight);
  const valueW = w - labelW;
  if (showHeader && headerH > 0) {
    fillRotationExportGlassBand(ctx, x, headerY, w, headerH, opts.headerBgTop, opts.headerBgBottom);
    ctx.strokeStyle = 'rgba(28,38,58,.28)';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(x, headerY, w, headerH);
    ctx.strokeRect(x + labelW, headerY, valueW, headerH);
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 21px system-ui, -apple-system, Segoe UI, sans-serif';
    drawRotationExportCellText(ctx, 'Ukazatel', x, headerY, labelW, headerH, { maxLines: 1, lineHeight: 24, align: 'left', pad: 16 });
    drawRotationExportCellText(ctx, 'Hodnota', x + labelW, headerY, valueW, headerH, { maxLines: 1, lineHeight: 24, align: 'center', pad: 12 });
  }

  dataRows.forEach((row, rowIdx) => {
    const rowY = headerY + headerH + rowIdx * rowH;
    fillRotationExportGlassBand(
      ctx,
      x,
      rowY,
      w,
      rowH,
      rowIdx % 2 ? opts.rowOddTop : opts.rowEvenTop,
      rowIdx % 2 ? opts.rowOddBottom : opts.rowEvenBottom
    );
    ctx.strokeStyle = 'rgba(28,38,58,.24)';
    ctx.lineWidth = 1.9;
    ctx.strokeRect(x, rowY, labelW, rowH);
    ctx.strokeRect(x + labelW, rowY, valueW, rowH);
    ctx.fillStyle = '#0f172a';
    ctx.font = '800 ' + (opts.fontSize || 20) + 'px system-ui, -apple-system, Segoe UI, sans-serif';
    drawRotationExportCellText(ctx, String(row && row.label || '—'), x, rowY, labelW, rowH, { maxLines: 2, lineHeight: opts.lineHeight || 21, align: 'left', pad: 16 });
    ctx.font = '900 ' + (opts.fontSize || 20) + 'px system-ui, -apple-system, Segoe UI, sans-serif';
    drawRotationExportCellText(ctx, String(row && row.value || '—'), x + labelW, rowY, valueW, rowH, { maxLines: 2, lineHeight: opts.lineHeight || 21, align: 'center', pad: 12 });
  });
  if (note) {
    const noteY = headerY + headerH + dataRows.length * rowH;
    fillRotationExportGlassBand(ctx, x, noteY, w, noteH, 'rgba(255,255,255,.42)', 'rgba(231,238,250,.56)');
    ctx.strokeStyle = 'rgba(28,38,58,.16)';
    ctx.strokeRect(x, noteY, w, noteH);
    ctx.fillStyle = 'rgba(15,23,42,.78)';
    ctx.font = '800 18px system-ui, -apple-system, Segoe UI, sans-serif';
    drawRotationExportCellText(ctx, note, x, noteY, w, noteH, { maxLines: 2, lineHeight: 20, align: 'left', pad: 18 });
  }
  return tableH;
}

function drawRotationExportRoundRect(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r || 0, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}


function drawRotationExportGlassPanelShell(ctx, x, y, w, h, radius, options) {
  const opts = Object.assign({}, ROTATION_EXPORT_GLASS_THEME_V193, options || {});
  drawRotationExportRoundRect(ctx, x, y, w, h, radius);
  ctx.save();
  ctx.shadowColor = opts.shadow;
  ctx.shadowBlur = Math.max(0, Number(opts.shadowBlur) || 0);
  ctx.shadowOffsetY = Number(opts.shadowOffsetY) || 0;
  const panelBg = ctx.createLinearGradient(x, y, x, y + h);
  panelBg.addColorStop(0, opts.panelBgTop);
  panelBg.addColorStop(1, opts.panelBgBottom);
  ctx.fillStyle = panelBg;
  ctx.fill();
  ctx.restore();

  ctx.save();
  drawRotationExportRoundRect(ctx, x, y, w, h, radius);
  ctx.clip();
  const gloss = ctx.createLinearGradient(x, y, x, y + h * 0.46);
  gloss.addColorStop(0, opts.glossTop);
  gloss.addColorStop(.7, opts.glossBottom);
  ctx.fillStyle = gloss;
  ctx.fillRect(x + 2, y + 2, Math.max(0, w - 4), Math.max(0, h * 0.48));
  ctx.restore();

  drawRotationExportRoundRect(ctx, x, y, w, h, radius);
  ctx.strokeStyle = opts.border;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  if (w > 6 && h > 6) {
    drawRotationExportRoundRect(ctx, x + 1.5, y + 1.5, w - 3, h - 3, Math.max(0, radius - 1.5));
    ctx.strokeStyle = opts.innerBorder;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawRotationExportGlassTitleBar(ctx, x, y, w, titleH, radius, options) {
  const opts = Object.assign({}, ROTATION_EXPORT_GLASS_THEME_V193, options || {});
  const titleBg = ctx.createLinearGradient(x, y, x + w, y + titleH);
  titleBg.addColorStop(0, opts.titleBg);
  titleBg.addColorStop(1, opts.titleBgAlt);
  ctx.save();
  drawRotationExportRoundRect(ctx, x, y, w, titleH, radius);
  ctx.clip();
  ctx.fillStyle = titleBg;
  ctx.fillRect(x, y, w, titleH);
  const gloss = ctx.createLinearGradient(x, y, x, y + titleH);
  gloss.addColorStop(0, opts.titleGlossTop);
  gloss.addColorStop(.72, opts.titleGlossBottom);
  ctx.fillStyle = gloss;
  ctx.fillRect(x, y, w, titleH);
  ctx.restore();
}

function fillRotationExportGlassBand(ctx, x, y, w, h, startColor, endColor) {
  const band = ctx.createLinearGradient(x, y, x, y + h);
  band.addColorStop(0, startColor);
  band.addColorStop(1, endColor);
  ctx.fillStyle = band;
  ctx.fillRect(x, y, w, h);
}

function drawRotationExportCellText(ctx, text, x, y, w, h, options) {
  const opts = options || {};
  const maxWidth = Math.max(10, w - (opts.pad || 18) * 2);
  const raw = String(text || '').trim() || '—';
  const words = raw.split(/\s+/);
  const lines = [];
  let current = '';
  words.forEach(word => {
    const probe = current ? current + ' ' + word : word;
    if (ctx.measureText(probe).width <= maxWidth || !current) {
      current = probe;
    } else {
      lines.push(current);
      current = word;
    }
  });
  if (current) lines.push(current);
  const visible = lines.slice(0, opts.maxLines || 2);
  if (lines.length > visible.length) {
    visible[visible.length - 1] = visible[visible.length - 1].replace(/…?$/, '') + '…';
  }
  const lineHeight = opts.lineHeight || 28;
  const total = visible.length * lineHeight;
  let ty = y + (h - total) / 2 + lineHeight * .78;
  ctx.textAlign = opts.align || 'center';
  ctx.textBaseline = 'alphabetic';
  const tx = ctx.textAlign === 'left' ? x + (opts.pad || 18) : (ctx.textAlign === 'right' ? x + w - (opts.pad || 18) : x + w / 2);
  visible.forEach(line => {
    ctx.fillText(line, tx, ty, maxWidth);
    ty += lineHeight;
  });
}

function drawRotationExportTable(ctx, title, columns, rows, x, y, w, options) {
  const opts = Object.assign({}, ROTATION_EXPORT_GLASS_THEME_V193, options || {});
  const headerH = opts.headerH || 66;
  const rowH = opts.rowH || 52;
  const titleH = opts.titleH || 88;
  const radius = opts.radius || 32;
  const tableH = titleH + headerH + rowH * Math.max(rows.length, 1);
  drawRotationExportGlassPanelShell(ctx, x, y, w, tableH, radius, opts);
  drawRotationExportGlassTitleBar(ctx, x, y, w, titleH, radius, opts);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 46px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, x + 26, y + titleH / 2);

  let cy = y + titleH;
  const totalWeight = Math.max(0.0001, columns.reduce((sum, col) => sum + Math.max(0, Number(col && col.width) || 0), 0));
  const colWidths = columns.map(col => Math.round(w * (Math.max(0, Number(col && col.width) || 0) / totalWeight)));
  colWidths[colWidths.length - 1] += w - colWidths.reduce((a, b) => a + b, 0);

  fillRotationExportGlassBand(ctx, x, cy, w, headerH, opts.headerBgTop, opts.headerBgBottom);
  ctx.strokeStyle = opts.grid || 'rgba(15,23,42,.28)';
  ctx.lineWidth = 1.5;
  let cx = x;
  columns.forEach((col, idx) => {
    const cw = colWidths[idx];
    ctx.strokeRect(cx, cy, cw, headerH);
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 ' + (opts.headerFontSize || 31) + 'px system-ui, -apple-system, Segoe UI, sans-serif';
    drawRotationExportCellText(ctx, col.label, cx, cy, cw, headerH, { maxLines: opts.headerMaxLines || 1, lineHeight: opts.headerLineHeight || 34, pad: 18 });
    cx += cw;
  });

  cy += headerH;
  const safeRows = rows.length ? rows : [columns.map(() => '—')];
  safeRows.forEach((row, rowIdx) => {
    cx = x;
    fillRotationExportGlassBand(
      ctx,
      x,
      cy,
      w,
      rowH,
      rowIdx % 2 ? opts.rowOddTop : opts.rowEvenTop,
      rowIdx % 2 ? opts.rowOddBottom : opts.rowEvenBottom
    );
    row.forEach((cell, idx) => {
      const cw = colWidths[idx];
      const column = Array.isArray(columns) ? (columns[idx] || {}) : {};
      const dayModMeta = opts.cellMeta && opts.cellMeta[rowIdx] && opts.cellMeta[rowIdx][idx] ? opts.cellMeta[rowIdx][idx] : null;
      const rawCell = String(cell || '').trim();
      if (opts.highlightEmptyCells && idx > 0 && !rawCell) {
        const emptyBg = ctx.createLinearGradient(cx, cy, cx, cy + rowH);
        emptyBg.addColorStop(0, 'rgba(255,219,219,.92)');
        emptyBg.addColorStop(1, 'rgba(255,170,170,.72)');
        ctx.fillStyle = emptyBg;
        ctx.fillRect(cx + 1, cy + 1, Math.max(0, cw - 2), Math.max(0, rowH - 2));
      }
      if (dayModMeta) {
        const modBg = ctx.createLinearGradient(cx, cy, cx, cy + rowH);
        modBg.addColorStop(0, 'rgba(254,243,199,.98)');
        modBg.addColorStop(1, 'rgba(252,211,77,.78)');
        ctx.fillStyle = modBg;
        ctx.fillRect(cx + 1, cy + 1, Math.max(0, cw - 2), Math.max(0, rowH - 2));
      }
      ctx.strokeStyle = opts.grid || 'rgba(15,23,42,.24)';
      ctx.strokeRect(cx, cy, cw, rowH);
      if (dayModMeta) {
        ctx.strokeStyle = 'rgba(180,83,9,.92)';
        ctx.lineWidth = 3;
        ctx.strokeRect(cx + 2, cy + 2, Math.max(0, cw - 4), Math.max(0, rowH - 4));
        ctx.lineWidth = 1.5;
      }
      const isDate = idx === 0;
      const align = column.align || (Array.isArray(opts.aligns) ? opts.aligns[idx] : '') || opts.align || 'center';
      const textColor = column.textColor || (isDate ? '#0f172a' : '#1e293b');
      const fontWeight = column.fontWeight || (isDate ? '900 ' : '750 ');
      ctx.fillStyle = textColor;
      ctx.font = fontWeight + (opts.fontSize || 22) + 'px system-ui, -apple-system, Segoe UI, sans-serif';
      const printableCell = rawCell || (dayModMeta && dayModMeta.badge ? dayModMeta.badge : cell);
      drawRotationExportCellText(ctx, printableCell, cx, cy, cw, rowH, {
        maxLines: opts.maxLines || 2,
        lineHeight: opts.lineHeight || 25,
        align,
        pad: typeof column.pad === 'number' ? column.pad : 12
      });
      if (dayModMeta && dayModMeta.badge && rawCell) {
        ctx.fillStyle = '#92400e';
        ctx.font = '900 18px system-ui, -apple-system, Segoe UI, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(String(dayModMeta.badge), cx + cw - 8, cy + 6, Math.max(18, cw - 16));
      }
      cx += cw;
    });
    cy += rowH;
  });
  return tableH;
}

function buildRotationExportRows(section, sectionKey, month) {
  const sec = section || {};
  const machines = Array.isArray(sec.machines) ? sec.machines : [];
  const dateWidth = 0.1215;
  const columns = [{ label: 'Datum', width: dateWidth }];
  const rest = machines.length ? (1 - dateWidth) / machines.length : (1 - dateWidth);
  machines.forEach(machine => columns.push({ label: String(machine || ''), width: rest }));
  const cellMeta = [];
  const activeNames = typeof getKnownStatNames === 'function' ? getKnownStatNames() : null;
  const rows = (Array.isArray(sec.rows) ? sec.rows : []).map(row => {
    const cells = [String(row && row.date ? row.date : '')];
    const metaRow = [null];
    machines.forEach((_, idx) => {
      const rawWorker = String((row && row.cells ? row.cells[idx] : '') || '').trim();
      cells.push(rawWorker && activeNames && !activeNames.has(rawWorker) ? '' : rawWorker);
      let mod = null;
      try { if (typeof rakDayModForCell === 'function') mod = rakDayModForCell(month, sectionKey, row && row.date, idx); } catch (e) { mod = null; }
      metaRow.push(mod ? {
        badge: typeof rakDayModBadge === 'function' ? rakDayModBadge(mod) : '',
        tooltip: typeof rakDayModTooltip === 'function' ? rakDayModTooltip(mod) : ''
      } : null);
    });
    cellMeta.push(metaRow);
    return cells;
  });
  return { columns, rows, cellMeta };
}

const ROTATION_EXPORT_WATERMARK_SRC_17007 = './assets/rak-login-crab.png';
let rotationExportWatermarkPromise17007 = null;

function loadRotationExportWatermark17007() {
  if (rotationExportWatermarkPromise17007) return rotationExportWatermarkPromise17007;
  rotationExportWatermarkPromise17007 = new Promise((resolve) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = ROTATION_EXPORT_WATERMARK_SRC_17007;
  });
  return rotationExportWatermarkPromise17007;
}

function drawRotationExportWatermark17007(ctx, image, width, height) {
  if (!ctx || !image || !image.naturalWidth || !image.naturalHeight) return;
  const maxW = width * 0.48;
  const maxH = height * 0.76;
  const scale = Math.min(maxW / image.naturalWidth, maxH / image.naturalHeight);
  const w = image.naturalWidth * scale;
  const h = image.naturalHeight * scale;
  ctx.save();
  ctx.globalAlpha = 0.17;
  ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
  ctx.restore();
}

function createRotationMonthExportCanvas(monthKey, watermarkImage) {
  const month = app && app.rotation && app.rotation.months ? app.rotation.months[monthKey] : null;
  if (!month) throw new Error('Vybraný měsíc není dostupný.');
  const hard = buildRotationExportRows(month.hard, 'hard', month);
  const soft = buildRotationExportRows(month.soft, 'soft', month);
  const absences = getRotationMonthExportAbsences(month);
  const exportDateColWeight = Number(hard && hard.columns && hard.columns[0] && hard.columns[0].width) || 0.1215;
  const exportMachineColWeight = Number(hard && hard.columns && hard.columns[1] && hard.columns[1].width) || 0.1757;
  const absenceTable = buildRotationExportAbsenceTable(absences, exportDateColWeight, exportMachineColWeight);
  const absenceColumns = absenceTable.columns;
  const absenceRows = absenceTable.rows;
  const monthSummary = buildRotationMonthExportSummary(month);
  const yearSummary = buildRotationYearExportSummary(monthKey);
  const yearlyStats = buildRotationYearlyExportStats(monthKey);

  const margin = 58;
  const topGap = 12;
  const gap = 44;
  const footerH = 34;
  const exportScale = 2;
  const exportStamp = formatRotationExportFooterDateTime(new Date());
  const footerText = 'Vygenerováno aplikací RaK · ' + exportStamp;
  const leftW = 1508;
  const hardTotalWeightForExport = Math.max(0.0001, (hard.columns || []).reduce((sum, col) => sum + Math.max(0, Number(col && col.width) || 0), 0));
  const hardDatePxForExport = Math.round(leftW * ((Number(hard && hard.columns && hard.columns[0] && hard.columns[0].width) || 0) / hardTotalWeightForExport));
  const hardMachinePxForExport = Math.round(leftW * ((Number(hard && hard.columns && hard.columns[1] && hard.columns[1].width) || 0) / hardTotalWeightForExport));
  const absenceTableW = Math.max(hardDatePxForExport + hardMachinePxForExport * Math.max(2, (absenceColumns.length - 1)), 420);
  const contentW = leftW + gap + absenceTableW;
  const width = Math.ceil(margin * 2 + contentW);
  const hardTheme = Object.assign({}, ROTATION_EXPORT_GLASS_THEME_V193, {
    titleBg: '#0679ff',
    titleBgAlt: '#113a93',
    panelBgTop: 'rgba(255,255,255,.48)',
    panelBgBottom: 'rgba(224,240,255,.26)',
    border: 'rgba(26,108,232,.50)',
    headerBgTop: 'rgba(210,232,255,.40)',
    headerBgBottom: 'rgba(171,211,255,.52)',
    rowEvenTop: 'rgba(255,255,255,.38)',
    rowEvenBottom: 'rgba(226,240,255,.22)',
    rowOddTop: 'rgba(196,224,255,.46)',
    rowOddBottom: 'rgba(177,211,255,.30)',
    shadow: 'rgba(24,104,230,.26)',
    shadowBlur: 40,
    shadowOffsetY: 16
  });
  const hardH = 86 + 64 + 52 * Math.max(hard.rows.length, 1);
  const softH = 86 + 64 + 52 * Math.max(soft.rows.length, 1);
  const absenceH = 86 + 64 + 52 * Math.max(absenceRows.length, 1);
  const summaryCardOptions = Object.assign({}, hardTheme, { rowH: 52, titleH: 74, headerH: 0, showHeader: false, fontSize: 27, lineHeight: 30 });
  const summaryH = getRotationExportSummaryCardHeight(monthSummary && monthSummary.rows, summaryCardOptions);
  const yearlyStatsOptions = Object.assign({}, hardTheme, { rowH: 52, headerH: 82, titleH: 74, radius: 28, fontSize: 27, lineHeight: 30, maxLines: 1, headerFontSize: 27, headerLineHeight: 29, headerMaxLines: 2, note: yearlyStats.note });
  const yearlyStatsH = yearlyStatsOptions.titleH + yearlyStatsOptions.headerH + yearlyStatsOptions.rowH * Math.max((yearlyStats.rows || []).length, 1) + 52;
  const leftColumnH = hardH + gap + softH;
  const rightColumnH = absenceH + gap + summaryH + gap + yearlyStatsH;
  const contentH = Math.max(leftColumnH, rightColumnH);
  const exportFooterSafeGap = 36;
  const height = Math.ceil(margin + topGap + contentH + exportFooterSafeGap + footerH + margin);
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * exportScale);
  canvas.height = Math.ceil(height * exportScale);
  canvas.style.width = String(width) + 'px';
  canvas.style.height = String(height) + 'px';
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas není dostupný.');
  ctx.setTransform(exportScale, 0, 0, exportScale, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.fillStyle = '#eef6ff';
  ctx.fillRect(0, 0, width, height);
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#fbfdff');
  bg.addColorStop(.36, '#edf5ff');
  bg.addColorStop(.7, '#ddeaff');
  bg.addColorStop(1, '#d4e4ff');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const glowTopRight = ctx.createRadialGradient(width * 0.84, height * 0.10, 24, width * 0.84, height * 0.10, width * 0.46);
  glowTopRight.addColorStop(0, 'rgba(255,255,255,.96)');
  glowTopRight.addColorStop(.42, 'rgba(190,222,255,.42)');
  glowTopRight.addColorStop(1, 'rgba(190,222,255,0)');
  ctx.fillStyle = glowTopRight;
  ctx.fillRect(0, 0, width, height);

  const glowBottomLeft = ctx.createRadialGradient(width * 0.12, height * 0.84, 24, width * 0.12, height * 0.84, width * 0.42);
  glowBottomLeft.addColorStop(0, 'rgba(255,255,255,.76)');
  glowBottomLeft.addColorStop(.42, 'rgba(150,196,255,.28)');
  glowBottomLeft.addColorStop(1, 'rgba(150,196,255,0)');
  ctx.fillStyle = glowBottomLeft;
  ctx.fillRect(0, 0, width, height);

  drawRotationExportWatermark17007(ctx, watermarkImage, width, height);

  const top = margin + topGap;
  const leftX = margin;
  const rightX = margin + leftW + gap;
  const absenceX = rightX;
  const hardTableH = drawRotationExportTable(ctx, 'Tvrdé obrábění', hard.columns, hard.rows, leftX, top, leftW, Object.assign({}, hardTheme, {
    rowH: 52,
    fontSize: 27,
    lineHeight: 30,
    highlightEmptyCells: true,
    cellMeta: hard.cellMeta,
    radius: 32,
    titleH: 86,
    headerH: 64
  }));
  drawRotationExportTable(ctx, 'Měkké obrábění', soft.columns, soft.rows, leftX, top + hardTableH + gap, leftW, Object.assign({}, hardTheme, {
    rowH: 52,
    fontSize: 27,
    lineHeight: 30,
    highlightEmptyCells: true,
    cellMeta: soft.cellMeta,
    radius: 32,
    titleH: 86,
    headerH: 64
  }));
  const drawnAbsenceH = drawRotationExportTable(ctx, 'Absence', absenceColumns, absenceRows, absenceX, top, absenceTableW, Object.assign({}, hardTheme, {
    rowH: 52,
    fontSize: 27,
    lineHeight: 30,
    maxLines: 2,
    align: 'center',
    radius: 28,
    titleH: 86,
    headerH: 64
  }));
  const summaryY = top + drawnAbsenceH + gap;
  const summaryGap = 22;
  const summaryW = Math.floor((absenceTableW - summaryGap) / 2);
  const drawnSummaryH = Math.max(
    drawRotationExportSummaryCard(ctx, 'Měsíční přehled', monthSummary.rows, absenceX, summaryY, summaryW, Object.assign({}, summaryCardOptions, {
      labelWeight: 0.64
    })),
    drawRotationExportSummaryCard(ctx, 'Roční přehled ' + String(yearSummary.year || ''), yearSummary.rows, absenceX + summaryW + summaryGap, summaryY, absenceTableW - summaryW - summaryGap, Object.assign({}, summaryCardOptions, {
      labelWeight: 0.64
    }))
  );
  drawRotationExportTable(ctx, yearlyStats.title, yearlyStats.columns, yearlyStats.rows, absenceX, summaryY + drawnSummaryH + gap, absenceTableW, Object.assign({}, yearlyStatsOptions, {
    note: yearlyStats.note,
    align: 'center',
    aligns: ['left', 'center', 'center', 'center', 'center', 'center', 'center', 'center']
  }));

  ctx.fillStyle = 'rgba(15,23,42,.76)';
  ctx.font = '800 22px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(footerText, width - margin, height - Math.max(18, Math.round(margin * .28)));

  return canvas;
}

async function downloadSelectedRotationMonthImage() {
  const select = document.getElementById('monthSelect');
  const monthKey = (select && select.value) || (app && app.selectedMonth) || '';
  if (!monthKey || !app.rotation || !app.rotation.months || !app.rotation.months[monthKey]) {
    alert('Nejdřív vyber měsíc v Rozpisech.');
    return;
  }
  try {
    const watermarkImage = await loadRotationExportWatermark17007();
    const canvas = createRotationMonthExportCanvas(monthKey, watermarkImage);
    const fileName = getRotationMonthExportFileName(monthKey);
    const triggerDownload = (url) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    };
    if (canvas.toBlob) {
      canvas.toBlob(blob => {
        if (!blob) {
          triggerDownload(canvas.toDataURL('image/png'));
          return;
        }
        const url = URL.createObjectURL(blob);
        triggerDownload(url);
        setTimeout(() => URL.revokeObjectURL(url), 2500);
      }, 'image/png', 1);
    } else {
      triggerDownload(canvas.toDataURL('image/png'));
    }
  } catch (err) {
    alert('Obrázek rozpisu se nepodařilo vytvořit: ' + (err && err.message ? err.message : err));
  }
}

function showMonthByKey(monthKey) {
  app.selectedMonth = monthKey;
  setRotaceView("months");
  renderRotace();
  renderMonth(monthKey);
}

function initRotaceCurrentMonth() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = monthKeyFromYearMonth(currentYear, now.getMonth() + 1);
  const currentYearMonths = getMonthsForYear(app.rotation, currentYear);
  const availableYears = getAvailableYears(app.rotation);
  app.selectedYear = availableYears.includes(currentYear) ? currentYear : getInitialSelectedYear(app.rotation);
  app.selectedMonth = currentYearMonths.includes(currentMonth) ? currentMonth : (currentYearMonths[0] || null);
  app.importYear = app.selectedYear;
}
function refreshInitialUI() {
  restoreInputs();
  renderBrusy();
  renderSoustruhy();
  const currentYear = new Date().getFullYear();
  const currentMonth = monthKeyFromYearMonth(currentYear, new Date().getMonth() + 1);
  const currentYearMonths = getMonthsForYear(app.rotation, currentYear);
  app.selectedYear = getAvailableYears(app.rotation).includes(currentYear) ? currentYear : getInitialSelectedYear(app.rotation);
  app.importYear = app.selectedYear;
  app.selectedMonth = currentYearMonths.includes(currentMonth) ? currentMonth : (currentYearMonths[0] || null);
  app.selectedName = null;
  app.selectedStatsName = null;
  setRotaceView(app.rotationView || "names");
  renderRotace();
  if (app.selectedMonth) renderMonth(app.selectedMonth);
  updateImportBoxVisibility();
}

// escapeHtml je definovaná centrálně v core.js (escapuje i apostrof, používá ?? "").
// Dřívější slabší kopie zde byla odstraněna, aby globálně platila jediná bezpečná verze.

/* SIGNATURE TYPEWRITER */
(function typeSignature() {
  const target = document.getElementById("signatureTap");
  const text = "Martin Špadrna";
  let i = 0;
  function tick() {
    if (!target) return;
    if (i <= text.length) {
      target.textContent = text.slice(0, i);
      i += 1;
      setTimeout(tick, 65);
    }
  }
  tick();
})();

/* SECRET ADMIN UNLOCK */
function updateImportBoxVisibility() {
  const box = document.getElementById("adminBox");
  if (box) box.style.display = "none";
}
