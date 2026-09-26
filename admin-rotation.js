// RaK 1.2 (1.155) – Administrace Rozpisy a Nastavení strojů oddělené z hlavního UI modulu.
try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('admin-rotation.js', 'loading', { source: 'dynamic-loader' }); } catch (err) {}


function getAdminRotationMonthKeys() {
  return Object.keys(app.rotation && app.rotation.months ? app.rotation.months : {}).sort((a, b) => {
    const diff = adminRotationMonthSortValue(a) - adminRotationMonthSortValue(b);
    return diff || a.localeCompare(b, 'cs');
  });
}

function getAdminSelectedMonthKey() {
  const months = getAdminRotationMonthKeys();
  if (!months.length) return '';
  if (app.selectedMonth && months.includes(app.selectedMonth)) return app.selectedMonth;
  const currentMonthKey = typeof monthKeyFromYearMonth === 'function'
    ? monthKeyFromYearMonth(new Date().getFullYear(), new Date().getMonth() + 1)
    : '';
  if (currentMonthKey && months.includes(currentMonthKey)) return currentMonthKey;
  return months[0];
}

function getAdminRotationYears() {
  const years = new Set();
  getAdminRotationMonthKeys().forEach((monthKey) => {
    const parsed = typeof parseMonthKey === 'function' ? parseMonthKey(monthKey) : null;
    if (parsed && Number.isFinite(parsed.year)) years.add(parsed.year);
  });
  return [...years].sort((a, b) => a - b);
}

function renderAdminMonthPickerHtml(selectedMonthKey) {
  const years = getAdminRotationYears();
  const selectedParsed = typeof parseMonthKey === 'function' ? parseMonthKey(selectedMonthKey || '') : null;
  const fallbackYear = selectedParsed && Number.isFinite(selectedParsed.year)
    ? selectedParsed.year
    : (app.selectedYear && years.includes(Number(app.selectedYear)) ? Number(app.selectedYear) : (years[0] || null));
  const selectedYear = Number.isFinite(fallbackYear) ? fallbackYear : (years[0] || null);
  const yearMonths = selectedYear ? getMonthsForYear(app.rotation, selectedYear) : [];
  const selectedMonth = (selectedMonthKey && yearMonths.includes(selectedMonthKey))
    ? selectedMonthKey
    : (yearMonths.includes(getAdminSelectedMonthKey()) ? getAdminSelectedMonthKey() : (yearMonths[0] || selectedMonthKey || ''));

  if (!years.length) {
    return '<div class="smallText">Žádné měsíce zatím nejsou k dispozici.</div>';
  }

  const yearButtons = years.map((year) => {
    const active = Number(year) === Number(selectedYear);
    return '<button type="button" class="appMenuMonthChip' + (active ? ' isActive' : '') + '" data-admin-year-key="' + escapeHtml(String(year)) + '">' + escapeHtml(String(year)) + '</button>';
  }).join('');

  const monthButtons = yearMonths.map((monthKey) => {
    const active = monthKey === selectedMonth;
    return '<button type="button" class="appMenuMonthChip' + (active ? ' isActive' : '') + '" data-admin-month-key="' + escapeHtml(monthKey) + '">' + escapeHtml(monthKey) + '</button>';
  }).join('') || '<div class="smallText">Pro tenhle rok zatím nejsou žádné měsíce.</div>';

  return [
    '<div class="appMenuMonthYearPicker">',
    '  <details class="appMenuMonthYearGroup">',
    '    <summary><span>Rok</span><span>' + escapeHtml(String(selectedYear || '—')) + '</span></summary>',
    '    <div class="appMenuMonthYearButtons">' + yearButtons + '</div>',
    '  </details>',
    '  <details class="appMenuMonthYearGroup">',
    '    <summary><span>Měsíc</span><span>' + escapeHtml(String(selectedMonth || '—')) + '</span></summary>',
    '    <div class="appMenuMonthYearButtons">' + monthButtons + '</div>',
    '  </details>',
    '</div>'
  ].join('');
}

async function loadAdminRotationFromSupabase() {
  if (typeof syncRotationFromSupabase === 'function') {
    // RAK_17067_RESTORE_DIRTY_ON_FAILURE: guard clears the flag only after user consent.
    const hadDirty = typeof app !== 'undefined' && app && app.adminRotationDirty === true && !!document.getElementById('adminRotationEditor');
    if (hadDirty) {
      // RAK_17066_RELOAD_GUARD: confirm alone lost edits; preserve BEFORE discarding.
      if(typeof rakGuardAdminRotationDiscard!=='function' || !rakGuardAdminRotationDiscard()) return null;
      app.adminRotationDirty = false;
    }
    let result = null;
    try { result = await syncRotationFromSupabase('discard-draft'); } catch (_) { result = null; }
    // RAK_17068_LATE_EDIT_NOTICE: also retain edits created while online loading was in flight.
    if (!result && (hadDirty || (typeof app!=='undefined' && app && app.adminRotationDirty===true))) {
      app.adminRotationDirty = true;
      const status = document.getElementById('adminRotationDraftStatus');
      if (status) status.textContent = hadDirty
        ? 'Online načtení nebylo použito. Původní změny zůstávají v editoru a místní záloze.'
        : 'Online načtení nebylo použito. Nové úpravy zůstávají v editoru. Uložte si místní návrh.';
    }
    return result;
  }
  return null;
}

function adminRotationSettingsJson(row) {
  if (row && row.settings_json && typeof row.settings_json === 'object') return row.settings_json;
  try { return row && row.settings_json ? JSON.parse(String(row.settings_json)) : {}; }
  catch (err) { return {}; }
}

function adminRotationFilterMachineList(list, headers) {
  const allowed = new Set((Array.isArray(headers) ? headers : []).map((item) => String(item || '').trim().toUpperCase()).filter(Boolean));
  return adminRotationSplitGeneratorList(list).filter((item) => allowed.has(String(item || '').toUpperCase()));
}

function adminRotationNormalizeSoftBaseLathe(value, softCore) {
  const raw = value && typeof value === 'object' ? value : {};
  const allowed = new Set((Array.isArray(SOFT_MACHINE_HEADERS) ? SOFT_MACHINE_HEADERS : []).map((item) => String(item || '').trim().toUpperCase()).filter(Boolean));
  const names = adminRotationSplitGeneratorList(softCore);
  const map = {};
  names.forEach((name) => {
    const machine = String(raw[name] || '').trim().toUpperCase();
    if (machine && allowed.has(machine)) map[name] = machine;
  });
  return map;
}

function adminRotationRowTemplate(section, row, rowIndex, machineCount, allowBlankTail) {
  const cells = Array.from({ length: machineCount }, (_, i) => String(row && row.cells && row.cells[i] ? row.cells[i] : ''));
  const date = String(row && row.date ? row.date : '').trim();
  const hasAny = !!(date || cells.some(Boolean) || (row && row.shift) || (row && row.person) || (row && row.code) || (row && row.text));
  if (!hasAny && !allowBlankTail) return '';
  return [
    '<tr data-rotation-section="' + escapeHtml(section) + '" data-rotation-row-index="' + String(rowIndex) + '">',
    '  <td>' + renderAdminInlineFieldHtml('data-rot-field', 'date', date, 'datum', false) + '</td>',
    cells.map((value, idx) => {
      const filled = String(value || '').trim();
      let mod = null;
      try { if (typeof rakDayModForAdminCell === 'function') mod = rakDayModForAdminCell(section, date, idx); } catch (e) { mod = null; }
      const tdClasses = [];
      if (!filled) tdClasses.push('adminRotationEditorEmptyCell');
      if (mod) tdClasses.push('rakDayModCell');
      const badge = mod && typeof rakDayModBadge === 'function' ? rakDayModBadge(mod) : '';
      const tip = mod && typeof rakDayModTooltip === 'function' ? rakDayModTooltip(mod) : '';
      const mark = badge ? '<span class="rakDayModMark" aria-hidden="true">' + escapeHtml(badge) + '</span>' : '';
      return '<td class="' + tdClasses.join(' ') + '"' + (tip ? ' title="' + escapeHtml(tip) + '"' : '') + '>' + renderAdminInlineFieldHtml('data-rot-field', 'cell-' + String(idx), value, String(idx + 1), true) + mark + '</td>';
    }).join(''),
    '</tr>'
  ].join('');
}

function adminNotesRowTemplate(row, rowIndex, allowBlankTail) {
  const note = row || {};
  const date = String(note.date || '').trim();
  const person = String(note.person || '').trim();
  const code = String(note.code || '').trim();
  const hasAny = !!(date || person || code);
  if (!hasAny && !allowBlankTail) return '';
  return [
    '<tr data-note-row-index="' + String(rowIndex) + '">',
    '  <td>' + renderAdminInlineFieldHtml('data-note-field', 'date', date, 'datum', false) + '</td>',
    '  <td>' + renderAdminInlineFieldHtml('data-note-field', 'person', person, 'jméno', false) + '</td>',
    '  <td>' + renderAdminInlineFieldHtml('data-note-field', 'code', code, 'kód', false) + '</td>',
    '</tr>'
  ].join('');
}


function adminRotationDateKey(rawDate) {
  const parsed = typeof parseDateToken === 'function' ? parseDateToken(rawDate) : null;
  if (parsed && Number.isFinite(parsed.day) && Number.isFinite(parsed.month)) return String(parsed.day) + '.' + String(parsed.month);
  return String(rawDate || '').trim().toLowerCase();
}

function adminRotationDateLabel(rawDate) {
  const raw = String(rawDate || '').trim().replace(/\s+/g, ' ');
  if (!raw) return '';
  const parsed = typeof parseDateToken === 'function' ? parseDateToken(raw) : null;
  if (parsed && Number.isFinite(parsed.day) && Number.isFinite(parsed.month)) {
    return String(parsed.day) + '.' + String(parsed.month) + '.' + (parsed.shift ? ' ' + parsed.shift : '');
  }
  return raw;
}

function adminRotationPreSaveItemHtml(item) {
  const state = String(item && item.state || 'info').trim() || 'info';
  return [
    '<div class="adminRotationPreSaveItem is' + escapeHtml(state.charAt(0).toUpperCase() + state.slice(1)) + '">',
    '  <span>' + escapeHtml(item && item.title || '') + '</span>',
    '  <b>' + escapeHtml(item && item.value || '') + '</b>',
    item && item.detail ? '  <small>' + escapeHtml(item.detail) + '</small>' : '',
    '</div>'
  ].join('');
}

function adminRotationBuildPreSaveStatus(monthKey, month) {
  const safeMonth = month || (app.rotation && app.rotation.months ? app.rotation.months[monthKey] : null);
  const hardRows = Array.isArray(safeMonth && safeMonth.hard && safeMonth.hard.rows) ? safeMonth.hard.rows : [];
  const softRows = Array.isArray(safeMonth && safeMonth.soft && safeMonth.soft.rows) ? safeMonth.soft.rows : [];
  const notesRows = Array.isArray(safeMonth && safeMonth.notes) ? safeMonth.notes : [];
  const dateKeys = new Set();
  let filledCells = 0;
  let totalCells = 0;
  const countRows = (rows) => {
    rows.forEach((row) => {
      const date = adminRotationDateLabel(row && row.date ? row.date : '');
      const cells = Array.isArray(row && row.cells) ? row.cells : [];
      if (date) dateKeys.add(date);
      cells.forEach((cell) => {
        totalCells += 1;
        if (String(cell || '').trim()) filledCells += 1;
      });
    });
  };
  countRows(hardRows);
  countRows(softRows);
  const backupsSnapshot = app && app.adminRotationBackupsSnapshot && typeof app.adminRotationBackupsSnapshot === 'object' ? app.adminRotationBackupsSnapshot : null;
  const backups = backupsSnapshot && Array.isArray(backupsSnapshot.backups) ? backupsSnapshot.backups : [];
  const hasBackupsLoaded = !!(backupsSnapshot && backupsSnapshot.loading !== true && (backupsSnapshot.ok !== false || backups.length));
  const emptyCells = Math.max(0, totalCells - filledCells);
  const occupancy = totalCells ? Math.round((filledCells / totalCells) * 100) : 0;
  return {
    monthKey: String(monthKey || '').trim(),
    hasMonth: !!safeMonth,
    dayCount: dateKeys.size,
    hardRowCount: hardRows.length,
    softRowCount: softRows.length,
    notesCount: notesRows.length,
    filledCells,
    totalCells,
    emptyCells,
    occupancy,
    backupsCount: backups.length,
    hasBackupsLoaded
  };
}

function adminStatsWorkDayCounts(year) {
  if (typeof buildStatsForYear !== 'function') return [];
  const stats = buildStatsForYear(year);
  const names = Array.isArray(stats && stats.names) ? stats.names : [];
  return names.map((name) => {
    const person = stats.people[name];
    return { name, workDays: person && person.workDays ? person.workDays.size : 0 };
  });
}

function adminStatsAnomalyItemHtml(item) {
  const state = item && item.state === 'ok' ? 'isOk' : 'isWarn';
  return [
    '<div class="adminStatsAnomalyItem ' + state + '">',
    '  <span>' + escapeHtml(item && item.name || '') + '</span>',
    '  <b>' + escapeHtml(item && item.value || '') + '</b>',
    '  <small>' + escapeHtml(item && item.detail || '') + '</small>',
    '</div>'
  ].join('');
}

function buildAdminStatsAnomalyHtml(year) {
  const safeYear = Number(year) || new Date().getFullYear();
  const counts = adminStatsWorkDayCounts(safeYear);
  if (counts.length < 3) {
    return [
      '<div class="adminStatsAnomaly" id="adminStatsAnomaly">',
      '  <div class="appMenuSubTitle">Statistické odchylky ' + String(safeYear) + '</div>',
      '  <div class="smallText">Zatím málo dat pro porovnání (potřeba aspoň 3 lidé s odpracovanými směnami v tomhle roce).</div>',
      '</div>'
    ].join('');
  }
  const values = counts.map((c) => c.workDays).sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  const median = values.length % 2 ? values[mid] : Math.round((values[mid - 1] + values[mid]) / 2);
  const threshold = Math.max(5, Math.round(median * 0.25));
  const outliers = counts
    .filter((c) => Math.abs(c.workDays - median) > threshold)
    .sort((a, b) => Math.abs(b.workDays - median) - Math.abs(a.workDays - median));
  const items = outliers.length
    ? outliers.map((c) => {
        const diff = c.workDays - median;
        return adminStatsAnomalyItemHtml({
          name: c.name,
          value: String(c.workDays) + '× směn',
          detail: (diff > 0 ? ('o ' + String(diff) + ' víc') : ('o ' + String(-diff) + ' míň')) + ' než medián (' + String(median) + '×).'
        });
      }).join('')
    : adminStatsAnomalyItemHtml({ state: 'ok', name: 'Bez odchylek', value: 'OK', detail: 'Nikdo se výrazně neliší od mediánu ' + String(median) + '× směn.' });
  return [
    '<div class="adminStatsAnomaly" id="adminStatsAnomaly">',
    '  <div class="appMenuSubTitle">Statistické odchylky ' + String(safeYear) + '</div>',
    '  <div class="smallText uMb10">Porovnání počtu odpracovaných dní za rok proti mediánu (' + String(median) + '×). Odchylka nad ' + String(threshold) + ' dní je označená.</div>',
    '  <div class="adminStatsAnomalyGrid">' + items + '</div>',
    '</div>'
  ].join('');
}

function adminRotationSuggestionContext(root) {
  const knownNames = adminGetKnownNames();
  const scheduleByDate = new Map();
  const absenceByDate = new Map();
  const labelByDate = new Map();
  const dateOrder = [];
  const keyFor = (value) => adminRotationDateBaseKey(value) || adminRotationDateLabel(value);
  const register = (value) => {
    const label = adminRotationDateLabel(value);
    const key = keyFor(value);
    if (!key) return '';
    if (!labelByDate.has(key)) {
      labelByDate.set(key, label || String(value || '').trim());
      dateOrder.push(key);
    }
    return key;
  };
  const add = (map, date, name) => {
    const key = register(date);
    const person = String(name || '').trim();
    if (!key || !person) return;
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(person);
  };
  root.querySelectorAll('tr[data-rotation-section]').forEach((tr) => {
    const date = tr.querySelector('[data-rot-field="date"]')?.value || '';
    register(date);
    tr.querySelectorAll('[data-rot-field^="cell-"]').forEach((field) => {
      const name = String(field && field.value || '').trim();
      if (name && !adminRotationIsRemoveValue(name)) add(scheduleByDate, date, name);
    });
  });
  root.querySelectorAll('tr[data-note-row-index]').forEach((tr) => {
    const date = tr.querySelector('[data-note-field="date"]')?.value || '';
    adminSplitPeopleList(tr.querySelector('[data-note-field="person"]')?.value || '')
      .forEach((name) => add(absenceByDate, date, name));
  });
  return { knownNames, scheduleByDate, absenceByDate, labelByDate, dateOrder, keyFor };
}

function adminRotationChoiceOptions(input, root) {
  const ctx = adminRotationSuggestionContext(root);
  if (input.matches('[data-rot-field^="cell-"]')) {
    const row = input.closest('tr[data-rotation-section]');
    const date = row && row.querySelector('[data-rot-field="date"]')?.value || '';
    const key = ctx.keyFor(date);
    const scheduled = ctx.scheduleByDate.get(key) || new Set();
    const absent = ctx.absenceByDate.get(key) || new Set();
    return {
      title: 'Volní pro tento den',
      values: ctx.knownNames.filter((name) => !scheduled.has(name) && !absent.has(name))
    };
  }
  if (input.matches('[data-note-field="date"]')) {
    const values = ctx.dateOrder.filter((key) => {
      const scheduled = ctx.scheduleByDate.get(key) || new Set();
      const absent = ctx.absenceByDate.get(key) || new Set();
      return ctx.knownNames.some((name) => !scheduled.has(name) && !absent.has(name));
    }).map((key) => ctx.labelByDate.get(key) || key);
    return { title: 'Dny s chybějícím člověkem', values };
  }
  if (input.matches('[data-note-field="person"]')) {
    const row = input.closest('tr[data-note-row-index]');
    const date = row && row.querySelector('[data-note-field="date"]')?.value || '';
    const key = ctx.keyFor(date);
    if (!key) return { title: 'Chybějící lidé', values: [] };
    const scheduled = ctx.scheduleByDate.get(key) || new Set();
    const absent = ctx.absenceByDate.get(key) || new Set();
    return {
      title: 'Chybějící lidé pro ' + (ctx.labelByDate.get(key) || adminRotationDateLabel(date) || date),
      values: ctx.knownNames.filter((name) => !scheduled.has(name) && !absent.has(name))
    };
  }
  return { title: '', values: [] };
}

function adminCloseRotationChoicePicker() {
  const box = document.getElementById('adminRotationChoicePicker');
  if (box) box.remove();
  window.__rakAdminRotationChoiceInput = null;
}

function adminRotationFloatingViewport() {
  const vv = window.visualViewport;
  const width = Math.max(240, Number(vv && vv.width || window.innerWidth || document.documentElement.clientWidth || 320));
  const height = Math.max(180, Number(vv && vv.height || window.innerHeight || document.documentElement.clientHeight || 480));
  const scrollX = Number(window.scrollX || window.pageXOffset || 0);
  const scrollY = Number(window.scrollY || window.pageYOffset || 0);
  const vvPageLeft = vv ? Number(vv.pageLeft) : NaN;
  const vvPageTop = vv ? Number(vv.pageTop) : NaN;
  const left = Number.isFinite(vvPageLeft) ? vvPageLeft : scrollX + Math.max(0, Number(vv && vv.offsetLeft || 0));
  const top = Number.isFinite(vvPageTop) ? vvPageTop : scrollY + Math.max(0, Number(vv && vv.offsetTop || 0));
  return { left: Math.max(0, left), top: Math.max(0, top), width, height };
}

function adminPositionRotationChoicePicker() {
  const box = document.getElementById('adminRotationChoicePicker');
  const input = window.__rakAdminRotationChoiceInput;
  if (!box || !input || !input.isConnected) {
    if (box) adminCloseRotationChoicePicker();
    return;
  }
  const body = document.getElementById('appMenuBody');
  if (!body || !body.contains(input)) {
    adminCloseRotationChoicePicker();
    return;
  }
  const rect = input.getBoundingClientRect();
  const scrollX = Number(window.scrollX || window.pageXOffset || 0);
  const scrollY = Number(window.scrollY || window.pageYOffset || 0);
  const inputPage = {
    left: rect.left + scrollX,
    right: rect.right + scrollX,
    top: rect.top + scrollY,
    bottom: rect.bottom + scrollY,
    width: rect.width,
    height: rect.height
  };
  const vp = adminRotationFloatingViewport();
  const margin = 8;
  if (inputPage.bottom < vp.top - 2 || inputPage.top > vp.top + vp.height + 2 || inputPage.right < vp.left - 2 || inputPage.left > vp.left + vp.width + 2) {
    adminCloseRotationChoicePicker();
    return;
  }
  const pickerWidth = Math.min(292, Math.max(200, vp.width - margin * 2));
  box.style.position = 'absolute';
  box.style.width = pickerWidth + 'px';
  box.classList.add('isVisible');
  const measuredHeight = Math.min(264, Math.max(96, Math.ceil(box.getBoundingClientRect().height || 0)));
  const below = inputPage.bottom + 6;
  const above = inputPage.top - measuredHeight - 6;
  const minTop = vp.top + margin;
  const maxTop = Math.max(minTop, vp.top + vp.height - measuredHeight - margin);
  let top = below;
  if (below + measuredHeight > vp.top + vp.height - margin) top = above;
  top = Math.max(minTop, Math.min(maxTop, top));
  const centered = inputPage.left + inputPage.width / 2 - pickerWidth / 2;
  const minLeft = vp.left + margin;
  const maxLeft = Math.max(minLeft, vp.left + vp.width - pickerWidth - margin);
  const left = Math.max(minLeft, Math.min(maxLeft, centered));
  box.style.top = Math.round(top) + 'px';
  box.style.left = Math.round(left) + 'px';
}

function adminQueueRotationChoicePickerPosition() {
  if (window.__rakAdminRotationChoicePositionFrame) cancelAnimationFrame(window.__rakAdminRotationChoicePositionFrame);
  window.__rakAdminRotationChoicePositionFrame = requestAnimationFrame(() => {
    window.__rakAdminRotationChoicePositionFrame = 0;
    adminPositionRotationChoicePicker();
  });
}

function adminShowRotationChoicePicker(input) {
  try {
    const body = document.getElementById('appMenuBody');
    if (!body || body.dataset.adminView !== 'rotation' || !input || !body.contains(input)) {
      adminCloseRotationChoicePicker();
      return;
    }
    if (!input.matches('[data-rot-field^="cell-"], [data-note-field="date"], [data-note-field="person"]')) {
      adminCloseRotationChoicePicker();
      return;
    }
    if (String(input.value || '').trim()) {
      adminCloseRotationChoicePicker();
      return;
    }
    const suggestion = adminRotationChoiceOptions(input, body);
    const values = Array.from(new Set((suggestion.values || []).map((value) => String(value || '').trim()).filter(Boolean)));
    if (!values.length) {
      adminCloseRotationChoicePicker();
      return;
    }
    adminCloseRotationChoicePicker();
    const box = document.createElement('div');
    box.id = 'adminRotationChoicePicker';
    box.className = 'adminRotationChoicePicker';
    box.innerHTML = '<div class="adminRotationChoicePickerTitle">' + escapeHtml(suggestion.title || 'Nabídka') + '</div>'
      + '<div class="adminRotationChoicePickerGrid">'
      + values.map((value) => '<button type="button" class="adminRotationChoiceChip" data-rotation-choice="' + escapeHtml(value) + '">' + escapeHtml(value) + '</button>').join('')
      + '</div>';
    document.body.appendChild(box);
    window.__rakAdminRotationChoiceInput = input;
    box.addEventListener('pointerdown', (event) => {
      const button = event.target && event.target.closest ? event.target.closest('[data-rotation-choice]') : null;
      if (!button) return;
      event.preventDefault();
      const target = window.__rakAdminRotationChoiceInput;
      const value = String(button.getAttribute('data-rotation-choice') || '').trim();
      if (target && target.isConnected && value) {
        target.value = value;
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
        try { target.focus({ preventScroll: true }); } catch (_) { try { target.focus(); } catch (_) {} }
      }
      adminCloseRotationChoicePicker();
    });
    adminPositionRotationChoicePicker();
    setTimeout(adminQueueRotationChoicePickerPosition, 0);
    setTimeout(adminQueueRotationChoicePickerPosition, 180);
    setTimeout(adminQueueRotationChoicePickerPosition, 420);
    if (!window.__rakAdminRotationChoiceOutsideBound) {
      window.__rakAdminRotationChoiceOutsideBound = true;
      document.addEventListener('pointerdown', (event) => {
        const current = document.getElementById('adminRotationChoicePicker');
        const target = window.__rakAdminRotationChoiceInput;
        if (!current) return;
        if (event.target === target || current.contains(event.target)) return;
        adminCloseRotationChoicePicker();
      }, true);
      window.addEventListener('scroll', adminQueueRotationChoicePickerPosition, true);
      window.addEventListener('resize', adminQueueRotationChoicePickerPosition, true);
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', adminQueueRotationChoicePickerPosition);
        window.visualViewport.addEventListener('scroll', adminQueueRotationChoicePickerPosition);
      }
    }
  } catch (err) {
    console.warn('Admin rotation choice picker failed', err);
  }
}

function adminAttachRotationAvailableDatalist(input) {
  try {
    const body = document.getElementById('appMenuBody');
    if (!body || body.dataset.adminView !== 'rotation' || !input || !body.contains(input)) return;
    input.removeAttribute('list');
    body.querySelectorAll('datalist[data-admin-rotation-suggest]').forEach((list) => list.remove());
    adminShowRotationChoicePicker(input);
  } catch (err) {
    console.warn('Admin rotation picker failed', err);
  }
}

function adminShortRotationName(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (adminRotationIsRemoveValue(raw)) return '';
  const parts = raw.split(/\s+/).filter(Boolean);
  const base = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  const clean = String(base || raw).replace(/[^0-9A-Za-zÁ-Žá-ž]/g, '');
  return clean ? clean.slice(0, 8) : raw.slice(0, 8);
}

function makeRotationRowKey(row) {
  const cells = Array.isArray(row && row.cells) ? row.cells : [];
  return [String(row && row.date ? row.date : '').trim(), cells.map(v => String(v || '').trim()).join('¦')].join('||');
}

function makeNoteRowKey(note) {
  return [
    String(note && note.date ? note.date : '').trim(),
    String(note && note.person ? note.person : '').trim(),
    String(note && note.code ? note.code : '').trim(),
    String(note && note.shift ? note.shift : '').trim(),
    String(note && note.text ? note.text : '').trim()
  ].join('||');
}

window.splitMachineKey = splitMachineKey;
window.makeMachineKey = makeMachineKey;
window.makeRotationRowKey = makeRotationRowKey;
window.makeNoteRowKey = makeNoteRowKey;

const RAK_ROTATION_GENERATOR_CONTRACT_V1106 = Object.freeze({
  version: '1.106',
  action: 'data-admin-action="generate-rotation"',
  scope: 'Administrace dat / Rozpisy',
  source: 'historical-rotation-analysis',
  rule: 'Generátor tvoří první návrh rozpisu pro zvolený měsíc podle předchozích vyplněných rotací. Neodesílá ho online, dokud uživatel neklikne na Uložit rozpis.',
  safety: 'Jedno jméno smí být v jednom dni použité nejvýš jednou; absence v daný den se vynechá; existující obsazený měsíc se přepisuje až po potvrzení.'
});

const RAK_ROTATION_GENERATOR_RULES_V1107 = Object.freeze({
  version: '1.107',
  scope: 'Administrace dat / Rozpisy / Vygenerovat návrh',
  flow: 'Nejdřív doplnit absence a zkontrolovat dny v měsíci, pak teprve generovat návrh.',
  softPreferred: Object.freeze(['Střížek', 'Synek', 'Třasák', 'Špadrna', 'Novotný']),
  hardPreferred: Object.freeze(['Blažek', 'Kmínek', 'Kříž', 'Pech', 'Starý']),
  softHardCycle: Object.freeze(['TNKS01', 'TPKW01', 'TPKW02']),
  softHardBlockLength: 3,
  softCore: Object.freeze(['Synek', 'Třasák', 'Střížek']),
  softBaseLathe: Object.freeze({ Synek: 'MSKC04', 'Střížek': 'MSKC03', 'Třasák': 'MSKC01' }),
  avoidLatheWhenTwoLathesOneMillEnabled: true,
  avoidLatheWhenTwoLathesOneMillNames: Object.freeze(['Starý']),
  soloMillBalanceEnabled: true,
  soloMillMaxSpread: 1,
  softTotalBalanceEnabled: true,
  softTotalBalanceNames: Object.freeze(['Blažek', 'Starý', 'Kříž', 'Pech']),
  softTotalMaxSpread: 1,
  hardPeopleSoftKindBalanceEnabled: true,
  hardPeopleSoftKindBalanceNames: Object.freeze(['Blažek', 'Kmínek', 'Kříž', 'Pech', 'Starý']),
  hardPeopleSoftKindMaxSpread: 1,
  softKindGlobalBalanceEnabled: true,
  softKindMixedMinimumShifts: 3,
  machineCountSplitRule: 'Mimo běžnou neděli se TNKS01 a TPKW01 v kontrolním přehledu počítají jako 0,5 + 0,5 pro oba stroje.',
  softCoreNoTnksBalance: Object.freeze(['Synek', 'Třasák', 'Střížek']),
  softCoreContinuationRule: 'Synek/Třasák/Střížek drží vlastní návazný cyklus TNKS01 → TPKW01 → TPKW02 napříč měsíci; TNKS01 dorovnání jim do toho nesahá.',
  hardCycle: Object.freeze(['TBKR01', 'TNKS01', 'TBKR07', 'TPKW01', 'TPKW02']),
  softMachines: Object.freeze(['MSKC01', 'MSKC03', 'MSKC04', 'MFKF06', 'MFKF10']),
  absenceRules: Object.freeze([
    'Když je na frézkách jen jeden člověk, píše se MFKF06 jako neobsazená, i když reálně hlídá obě frézky.',
    'Při jedné absenci zůstává MFKF06 neobsazená a člověk na MFKF10 bere i MFKF06.',
    'Při dvou absencích je na frézkách jeden člověk, MFKF06 je neobsazená, na soustruhách jsou dva lidé a MSKC01 je neobsazená.'
  ]),
  fairness: Object.freeze(['měsíce na sebe navazují', 'tvrdota drží pořadí TNKS01/TBKR07/TPKW01/TPKW02/TBKR01', 'měkota chodí návazně po TNKS01/TPKW01/TPKW02 i mezi měsíci', 'Špadrna a Novotný spíš měkota, ale pomáhají vyrovnat tvrdotu', 'lidé z tvrdoty na měkotě mají mít rozumně střídané MSKC/MFKF', 'nýtování se dorovnává podle měsíce, ale Synek/Třasák/Střížek z dorovnání TNKS01 vypadávají'])
});

function adminRotationMonthSortValue(monthKey) {
  const parsed = typeof parseMonthKey === 'function' ? parseMonthKey(monthKey) : null;
  if (parsed && Number.isFinite(parsed.year) && Number.isFinite(parsed.month)) return parsed.year * 100 + parsed.month;
  const match = String(monthKey || '').match(/^(\d{1,2})\/(\d{2,4})$/);
  if (!match) return 0;
  const month = Number(match[1]);
  const rawYear = Number(match[2]);
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;
  return year * 100 + month;
}

function adminRotationCanonicalName(name, knownNames) {
  const raw = String(name || '').trim();
  if (!raw) return '';
  const lowered = raw.toLocaleLowerCase('cs-CZ');
  const known = Array.isArray(knownNames) ? knownNames : adminGetKnownNames();
  const match = known.find((item) => String(item || '').trim().toLocaleLowerCase('cs-CZ') === lowered);
  if (match) return match;
  const folded = adminRotationNameLookupKey(raw);
  const foldedMatches = known.filter((item) => adminRotationNameLookupKey(item) === folded);
  return foldedMatches.length === 1 ? foldedMatches[0] : raw;
}

function adminRotationIsRealName(name, knownNames) {
  const value = adminRotationCanonicalName(name, knownNames);
  if (!value) return false;
  const low = value.toLocaleLowerCase('cs-CZ');
  if (['dát pryč', 'odebrat', 'remove', 'pryc', 'pryč', 'volno'].includes(low)) return false;
  const known = Array.isArray(knownNames) ? knownNames : adminGetKnownNames();
  return known.includes(value);
}

function adminRotationRowHasNames(row, knownNames) {
  const cells = Array.isArray(row && row.cells) ? row.cells : [];
  return cells.some((cell) => adminRotationIsRealName(cell, knownNames));
}

function adminRotationMonthHasFilledCells(monthKey) {
  const knownNames = adminGetKnownNames();
  const month = app.rotation && app.rotation.months ? app.rotation.months[monthKey] : null;
  if (!month) return false;
  const hardRows = Array.isArray(month.hard && month.hard.rows) ? month.hard.rows : [];
  const softRows = Array.isArray(month.soft && month.soft.rows) ? month.soft.rows : [];
  return hardRows.concat(softRows).some((row) => adminRotationRowHasNames(row, knownNames));
}

function adminRotationHashString(value) {
  const text = String(value || '');
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function adminRotationShiftFromRow(row) {
  const raw = String(row && row.date ? row.date : '').trim();
  const parsed = typeof parseDateToken === 'function' ? parseDateToken(raw) : null;
  const shift = String((parsed && parsed.shift) || '').trim();
  return shift || (raw.match(/\b(R8|N8|R|N)\b/i) || [])[1] || '';
}

function adminRotationDateBaseKey(rawDate) {
  const parsed = typeof parseDateToken === 'function' ? parseDateToken(rawDate) : null;
  if (parsed && Number.isFinite(Number(parsed.day)) && Number.isFinite(Number(parsed.month))) {
    return String(Number(parsed.day)) + '.' + String(Number(parsed.month)) + '.';
  }
  return String(rawDate || '').replace(/\b(?:R8|N8|R|N)\b/gi, '').trim();
}

function adminRotationNamesForAbsenceDate(notesRows, dateLabel, knownNames) {
  const wanted = adminRotationDateBaseKey(dateLabel);
  const blocked = new Set();
  (Array.isArray(notesRows) ? notesRows : []).forEach((note) => {
    if (adminRotationDateBaseKey(note && note.date) !== wanted) return;
    const people = adminSplitPeopleList(note && note.person ? note.person : '');
    people.forEach((person) => {
      const name = adminRotationCanonicalName(person, knownNames);
      if (name) blocked.add(name);
    });
  });
  return blocked;
}

function adminRotationUnavailableNamesForDate(month, dateLabel, knownNames) {
  const blocked = adminRotationNamesForAbsenceDate(month && month.notes, dateLabel, knownNames);
  const wanted = adminRotationDateBaseKey(dateLabel);
  (Array.isArray(month && month.dayMods) ? month.dayMods : []).forEach((mod) => {
    if (!mod || String(mod.type || '').trim() !== 'kalirnaOut') return;
    if (adminRotationDateBaseKey(mod.date) !== wanted) return;
    const name = adminRotationCanonicalName(mod.person, knownNames);
    if (name) blocked.add(name);
  });
  return blocked;
}

function adminRotationGetPressRotationOverride(month, dateLabel) {
  const baseKey = adminRotationDateBaseKey(dateLabel);
  if (typeof getRotationPressRotationOverride === 'function') return getRotationPressRotationOverride(month, baseKey);
  const value = month && month.pressRotationOverrides && baseKey ? String(month.pressRotationOverrides[baseKey] || '').trim().toLowerCase() : '';
  return value === 'split' || value === 'nosplit' ? value : '';
}

function buildAdminPressRotationOverridesHtml(month, monthKey, hardRows) {
  const rows = Array.isArray(hardRows) ? hardRows : [];
  if (!rows.length) return '';
  const seen = new Set();
  const options = [
    ['auto', 'Automaticky podle pravidel'],
    ['split', 'Rotuje / půlit 0,5 + 0,5'],
    ['nosplit', 'Nerotuje / každý +1']
  ];
  const body = rows.map((row) => {
    const date = String(row && row.date ? row.date : '').trim();
    const baseKey = adminRotationDateBaseKey(date);
    if (!date || !baseKey || seen.has(baseKey)) return '';
    seen.add(baseKey);
    const manual = adminRotationGetPressRotationOverride(month, date);
    const autoSplit = adminRotationGeneratorShouldSplitPressMachines(date, monthKey, Object.assign({}, month || {}, { pressRotationOverrides: {} }));
    const current = manual || 'auto';
    return [
      '<tr data-press-rotation-row data-date-base="' + escapeHtml(baseKey) + '">',
      '  <td>' + escapeHtml(adminRotationDateLabel(date) || date) + '</td>',
      '  <td><select class="appMenuSelect adminRotationPressSelect" data-press-rotation-date="' + escapeHtml(baseKey) + '">' + options.map(([value, label]) => '<option value="' + value + '" ' + (current === value ? 'selected' : '') + '>' + escapeHtml(label) + '</option>').join('') + '</select></td>',
      '  <td class="smallText">' + escapeHtml(autoSplit ? 'Auto: rotuje' : 'Auto: nerotuje') + '</td>',
      '</tr>'
    ].join('');
  }).filter(Boolean).join('');
  if (!body) return '';
  return [
    '<details class="appMenuFoldSection adminRotationFold">',
    '  <summary>TNKS01 / TPKW01 – rotace dne</summary>',
    '  <div class="appMenuText">Výchozí stav je podle pravidel. Když se konkrétní den neplánovaně nerotuje, nastav „Nerotuje / každý +1“. Tahle výjimka má přednost ve statistikách, kontrolní tabulce i exportech.</div>',
    '  <div class="tableWrap appMenuTableWrap">',
    '    <table class="appMenuTable appMenuAdminTable appMenuAdminTableDense">',
    '      <thead><tr><th>Den</th><th>Režim</th><th>Výchozí</th></tr></thead>',
    '      <tbody>' + body + '</tbody>',
    '    </table>',
    '  </div>',
    '</details>'
  ].join('');
}

// Pro tri absence je rezervovana jedna pozice na frezkach. Validujeme cely den,
// ne jen celkovy pocet lidi: prazdne TPKW02, MSKC01 a MFKF06 jsou zamerne.
function adminRotationThreeAbsenceStaffingIssues(hardRow, softRow, knownNames, absent) {
  if (!Array.isArray(knownNames) || knownNames.length !== 10 || !absent || absent.size !== 3) return [];
  const issues = [];
  const inspect = (headers, row, required) => {
    (Array.isArray(headers) ? headers : []).forEach((machine, idx) => {
      const shouldBeOccupied = required.includes(machine);
      const cell = row && Array.isArray(row.cells) ? row.cells[idx] : '';
      const occupied = shouldBeOccupied
        ? adminRotationIsRealName(cell, knownNames)
        : !!String(cell || '').trim();
      if (occupied !== shouldBeOccupied) issues.push({ machine, shouldBeOccupied });
    });
  };
  inspect(HARD_MACHINE_HEADERS, hardRow, ['TNKS01', 'TBKR07', 'TPKW01', 'TBKR01']);
  inspect(SOFT_MACHINE_HEADERS, softRow, ['MSKC03', 'MSKC04', 'MFKF10']);
  return issues;
}

// Obsazení poslední skutečné pracovní směny před cílovým měsícem.
// Tento okraj chrání proti stejnému nýtování nebo samostatným frézkám hned po přelomu.
function adminRotationValidateMonthRules(month, monthKey, options) {
  const opts = options || {};
  const knownNames = adminGetKnownNames();
  const issues = [];
  const hardRows = Array.isArray(month && month.hard && month.hard.rows) ? month.hard.rows : [];
  const softRows = Array.isArray(month && month.soft && month.soft.rows) ? month.soft.rows : [];
  const maxRows = Math.max(hardRows.length, softRows.length);
  const addIssue = (severity, type, message, detail) => {
    issues.push({ severity, type, message, detail: detail || '' });
  };
  const noteNamesForDate = (dateLabel) => {
    const out = [];
    (Array.isArray(month && month.notes) ? month.notes : []).forEach((note) => {
      if (adminRotationDateBaseKey(note && note.date) !== adminRotationDateBaseKey(dateLabel)) return;
      adminSplitPeopleList(note && note.person ? note.person : '').forEach((person) => {
        const canonical = adminRotationCanonicalName(person, knownNames);
        if (canonical) out.push({ raw: person, canonical });
      });
    });
    return out;
  };
  const generatorRules = getAdminRotationGeneratorRules();
  const softCoreHardNames = (Array.isArray(generatorRules.softCore) ? generatorRules.softCore : [])
    .map((name) => adminRotationCanonicalName(name, knownNames))
    .filter((name) => name && knownNames.includes(name));
  const softCoreHardMachines = new Set((Array.isArray(generatorRules.softHardCycle) ? generatorRules.softHardCycle : [])
    .map((machine) => String(machine || '').trim().toUpperCase())
    .filter(Boolean));

  for (let rowIdx = 0; rowIdx < maxRows; rowIdx += 1) {
    const hardRow = hardRows[rowIdx] || null;
    const softRow = softRows[rowIdx] || null;
    const dateLabel = (hardRow && hardRow.date) || (softRow && softRow.date) || '';
    if (!dateLabel) continue;
    const assigned = new Map();
    const register = (sectionKey, machineName, rawName) => {
      const name = adminRotationCanonicalName(rawName, knownNames);
      if (!name) return;
      if (!knownNames.includes(name)) {
        const near = knownNames.find((known) => adminRotationNameLookupKey(known) === adminRotationNameLookupKey(rawName));
        addIssue('warn', 'unknown-name', String(dateLabel) + ': neznámé jméno ' + String(rawName || name) + (near ? ', myslel jsi ' + near + '?' : ''), '');
        return;
      }
      if (!assigned.has(name)) assigned.set(name, []);
      assigned.get(name).push({ sectionKey, machineName });
      if (!adminRotationGeneratorPersonKnowsMachine(name, machineName)) {
        addIssue('error', 'skill', String(dateLabel) + ': ' + name + ' neumí ' + machineName + '.', '');
      }
      if (sectionKey === 'hard' && softCoreHardNames.includes(name) && softCoreHardMachines.size && !softCoreHardMachines.has(String(machineName || '').trim().toUpperCase())) {
        addIssue(opts.source === 'generator' ? 'error' : 'warn', 'soft-core-hard-machine', String(dateLabel) + ': ' + name + ' má být z trojice jen na TNKS01/TPKW01/TPKW02, ne na ' + machineName + '.', '');
      }
    };
    (Array.isArray(hardRow && hardRow.cells) ? hardRow.cells : []).forEach((cell, idx) => register('hard', HARD_MACHINE_HEADERS[idx] || '', cell));
    (Array.isArray(softRow && softRow.cells) ? softRow.cells : []).forEach((cell, idx) => register('soft', SOFT_MACHINE_HEADERS[idx] || '', cell));
    assigned.forEach((places, name) => {
      if (places.length > 1) {
        addIssue('error', 'duplicate-day', String(dateLabel) + ': ' + name + ' je ve stejný den víckrát.', places.map((place) => place.machineName).join(', '));
      }
    });
    noteNamesForDate(dateLabel).forEach((noteName) => {
      if (!knownNames.includes(noteName.canonical)) {
        addIssue('warn', 'unknown-absence-name', String(dateLabel) + ': absence má neznámé jméno ' + noteName.raw + '.', '');
      }
      if (assigned.has(noteName.canonical)) {
        addIssue('error', 'absence-conflict', String(dateLabel) + ': ' + noteName.canonical + ' má absenci a zároveň je v rozpisu.', '');
      }
    });
    if (!adminRotationGeneratorIsDayBlocked(adminRotationGeneratorDateNotes(month, dateLabel))) {
      const absent = adminRotationUnavailableNamesForDate(month, dateLabel, knownNames);
      adminRotationThreeAbsenceStaffingIssues(hardRow, softRow, knownNames, absent).forEach((issue) => {
        addIssue('error', 'three-absence-staffing', String(dateLabel) + ': ' + issue.machine
          + (issue.shouldBeOccupied ? ' musí být obsazená.' : ' musí zůstat neobsazená.'),
          'Při třech absencích: 4 TO (bez TPKW02), 3 MO (MSKC03, MSKC04, MFKF10).');
      });
      const unused = knownNames.filter((name) => !absent.has(name) && !assigned.has(name));
      if (unused.length) {
        addIssue(opts.source === 'generator' ? 'error' : 'warn', 'available-unused', String(dateLabel) + ': dostupný člověk není v rozpisu: ' + unused.join(', ') + '.', '');
      }
    }
  }

  const firstWorkingRowIdx = Array.from({ length: maxRows }, (_, idx) => idx).find((idx) => adminRotationGeneratorIsFirstWorkingRow(month, idx));
  const boundary = adminRotationGeneratorGetPreviousMonthBoundary(monthKey, knownNames);
  if (Number.isFinite(firstWorkingRowIdx) && boundary.monthKey) {
    const currentPress = adminRotationGeneratorPressCellsForRow(month, firstWorkingRowIdx, knownNames, monthKey);
    currentPress.forEach((cell) => {
      if (!(boundary.pressNames || []).includes(cell.name)) return;
      addIssue('error', 'boundary-consecutive-tnks', String(boundary.dateLabel) + ' → ' + String(cell.row && cell.row.date || '') + ': ' + cell.name + ' nesmí nýtovat dvě směny po sobě ani přes přelom měsíce.', 'Předchozí měsíc: ' + boundary.monthKey);
    });

    const softRow = softRows[firstWorkingRowIdx] || null;
    const softCells = Array.isArray(softRow && softRow.cells) ? softRow.cells : [];
    const mfkf06Idx = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF06');
    const mfkf10Idx = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF10');
    const mfkf06 = adminRotationCanonicalName(softCells[mfkf06Idx], knownNames);
    const mfkf10 = adminRotationCanonicalName(softCells[mfkf10Idx], knownNames);
    if (!mfkf06 && mfkf10 && boundary.soloMillName === mfkf10) {
      addIssue('error', 'boundary-consecutive-solo-mill', String(boundary.dateLabel) + ' → ' + String(softRow && softRow.date || '') + ': ' + mfkf10 + ' nesmí být sám na frézkách dvě směny po sobě ani přes přelom měsíce.', 'Předchozí měsíc: ' + boundary.monthKey);
    }
  }

  // v1.5.78: ruční editor hlídá i stejného člověka samotného na frézkách dvě směny po sobě.
  // Generátor tímto krokem neměníme; tohle varování vzniká jen při skutečné ruční změně před uložením.
  if (opts.source === 'manual-save' || opts.source === 'generator') {
    const mfkf06IdxManual = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF06');
    const mfkf10IdxManual = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF10');
    let previousSoloMill = null;
    softRows.forEach((row, rowIdx) => {
      const dateLabel = String(row && row.date || '').trim();
      if (!dateLabel) return;
      if (typeof adminRotationGeneratorIsWorkingRow === 'function' && !adminRotationGeneratorIsWorkingRow(month, rowIdx)) return;
      const cells = Array.isArray(row && row.cells) ? row.cells : [];
      const mfkf06 = adminRotationCanonicalName(cells[mfkf06IdxManual], knownNames);
      const mfkf10 = adminRotationCanonicalName(cells[mfkf10IdxManual], knownNames);
      const soloName = !mfkf06 && mfkf10 ? mfkf10 : '';
      if (previousSoloMill && soloName && previousSoloMill.name === soloName) {
        addIssue(
          'error',
          'consecutive-solo-mill',
          String(previousSoloMill.dateLabel) + ' -> ' + dateLabel + ': ' + soloName + ' nesmí být sám na frézkách dvě směny po sobě.',
          ''
        );
      }
      previousSoloMill = soloName ? { name: soloName, dateLabel, rowIdx } : null;
    });
  }

  adminRotationGeneratorFindConsecutiveTnksIssues(month, monthKey, knownNames).forEach((issue) => {
    const prevDate = hardRows[issue.previousRowIdx] && hardRows[issue.previousRowIdx].date ? hardRows[issue.previousRowIdx].date : '';
    const currentDate = hardRows[issue.rowIdx] && hardRows[issue.rowIdx].date ? hardRows[issue.rowIdx].date : '';
    addIssue('error', 'consecutive-tnks', String(prevDate) + ' -> ' + String(currentDate) + ': ' + issue.current.name + ' je na TNKS01/TPKW01 dvě směny po sobě.', '');
  });

  adminRotationGeneratorFindSoftCoreSequenceIssues(month, monthKey, knownNames).forEach((issue) => {
    const message = issue.type === 'duplicate-in-block'
      ? String(issue.date) + ': ' + issue.name + ' je ve stejném bloku trojice na ' + issue.machine + ' podruhé dřív, než se vystřídali všichni tři.'
      : issue.type === 'new-block-on-skipped-day'
        ? String(issue.date) + ': po přeskočení chybějícího člověka smí nový blok na ' + issue.expectedMachine + ' začít až následující pracovní den.'
        : String(issue.date) + ': trojice má pokračovat na ' + issue.expectedMachine + ', ale ' + issue.name + ' je už na ' + issue.machine + '.';
    addIssue(opts.source === 'generator' ? 'error' : 'warn', 'soft-core-sequence', message, 'Cyklus trojice má přednost před měsíčním dorovnáním TNKS01.');
  });

  const softCorePressNames = new Set(adminRotationGeneratorGetSoftCoreNames(knownNames));
  const eligiblePressNames = knownNames.filter((name) => !softCorePressNames.has(name))
    .filter((name) => adminRotationGeneratorPersonKnowsMachine(name, 'TNKS01'))
    .filter((name) => {
      for (let rowIdx = 0; rowIdx < maxRows; rowIdx += 1) {
        const row = hardRows[rowIdx] || softRows[rowIdx] || null;
        const dateLabel = row && row.date ? row.date : '';
        if (!dateLabel) continue;
        const dayNotes = adminRotationGeneratorDateNotes(month, dateLabel);
        if (adminRotationGeneratorIsDayBlocked(dayNotes)) continue;
        const absences = adminRotationUnavailableNamesForDate(month, dateLabel, knownNames);
        if (!absences.has(name)) return true;
      }
      return false;
    });
  if (eligiblePressNames.length > 1) {
    const pressCounts = adminRotationGeneratorCountHardMachine(month, 'TNKS01', eligiblePressNames, monthKey);
    const values = eligiblePressNames.map((name) => Number(pressCounts[name] || 0));
    const max = Math.max(...values);
    const min = Math.min(...values);
    if (max - min > 1.001) {
      const high = eligiblePressNames.filter((name) => Math.abs(Number(pressCounts[name] || 0) - max) < 0.001).join(', ');
      const low = eligiblePressNames.filter((name) => Math.abs(Number(pressCounts[name] || 0) - min) < 0.001).join(', ');
      addIssue(opts.source === 'generator' ? 'error' : 'warn', 'monthly-tnks-balance', 'TNKS01/TPKW01 není měsíčně vyrovnaná: rozdíl je ' + String((Math.round((max - min) * 10) / 10)).replace('.', ',') + '.', 'Nejvíc: ' + high + '; nejmíň: ' + low);
    }
  }

  const softCore = (Array.isArray(generatorRules.softCore) ? generatorRules.softCore : []).map((name) => adminRotationCanonicalName(name, knownNames)).filter((name) => knownNames.includes(name));
  if (softCore.length) {
    const hardCount = Object.create(null);
    softCore.forEach((name) => { hardCount[name] = 0; });
    hardRows.forEach((row) => {
      (Array.isArray(row && row.cells) ? row.cells : []).forEach((cell) => {
        const name = adminRotationCanonicalName(cell, knownNames);
        if (Object.prototype.hasOwnProperty.call(hardCount, name)) hardCount[name] += 1;
      });
    });
    softCore.forEach((name) => {
      if (hardCount[name] <= 0) {
        addIssue('warn', 'soft-core-hard-missing', name + ' není v tomto měsíci ani jednou na tvrdotě.', '');
      }
    });
  }

  const balanceRules = getAdminRotationGeneratorRules();
  const workingNames = adminRotationGeneratorCollectWorkingNames(month, knownNames).filter((name) => knownNames.includes(name));
  if (balanceRules.soloMillBalanceEnabled !== false && workingNames.length > 1) {
    const soloCounts = adminRotationGeneratorCountSoloMill(month, workingNames);
    const values = workingNames.map((name) => Number(soloCounts[name] || 0));
    const spread = Math.max(...values) - Math.min(...values);
    const allowed = Math.max(0, Number(balanceRules.soloMillMaxSpread ?? 1) || 1);
    if (spread > allowed) addIssue(opts.source === 'generator' ? 'error' : 'warn', 'solo-mill-balance', 'Samostatné frézky nejdou bezpečně dorovnat na výchozí rozdíl ' + String(allowed) + '.', 'Aktuální rozdíl: ' + String(spread) + '.');
  }

  if (balanceRules.softTotalBalanceEnabled !== false) {
    const targetNames = adminRotationGeneratorRawList(balanceRules.softTotalBalanceNames)
      .map((name) => adminRotationCanonicalName(name, knownNames))
      .filter((name) => name && workingNames.includes(name) && !adminRotationGeneratorIsSoftCoreName(name, knownNames));
    if (targetNames.length > 1) {
      const totals = adminRotationGeneratorCountSoftTotals(month, targetNames);
      const values = targetNames.map((name) => Number(totals[name] || 0));
      const spread = Math.max(...values) - Math.min(...values);
      const allowed = Math.max(0, Number(balanceRules.softTotalMaxSpread ?? 1) || 1);
      if (spread > allowed) addIssue('warn', 'soft-total-balance', 'Měkota vybrané skupiny nejde bezpečně dorovnat na výchozí rozdíl ' + String(allowed) + '.', 'Aktuální rozdíl: ' + String(spread) + '.');
    }
  }

  if (balanceRules.hardPeopleSoftKindBalanceEnabled !== false) {
    const configured = adminRotationGeneratorRawList(balanceRules.hardPeopleSoftKindBalanceNames)
      .map((name) => adminRotationCanonicalName(name, knownNames))
      .filter((name) => name && workingNames.includes(name));
    const targetNames = balanceRules.softKindGlobalBalanceEnabled === false ? configured : workingNames;
    const kindCounts = adminRotationGeneratorCountSoftKinds(month, targetNames);
    const allowed = Math.max(0, Number(balanceRules.hardPeopleSoftKindMaxSpread ?? 1) || 1);
    const minimum = Math.max(1, Number(balanceRules.softKindMixedMinimumShifts ?? 3) || 3);
    targetNames.forEach((name) => {
      const mill = Number(kindCounts[name] && kindCounts[name].mill || 0);
      const lathe = Number(kindCounts[name] && kindCounts[name].lathe || 0);
      if (mill + lathe >= minimum && (!mill || !lathe || Math.abs(mill - lathe) > allowed)) {
        addIssue('warn', 'soft-kind-balance', name + ' nemá na měkotě vyrovnané soustruhy a frézky.', 'Soustruhy: ' + String(lathe) + '; frézky: ' + String(mill) + '.');
      }
    });
  }

  const kminek = adminRotationCanonicalName('Kmínek', knownNames);
  const novotny = adminRotationCanonicalName('Novotný', knownNames);
  if (kminek && novotny && workingNames.includes(kminek) && workingNames.includes(novotny)) {
    const totals = adminRotationGeneratorCountSectionTotals(month, [kminek, novotny]);
    const score = adminRotationGeneratorMoToPairScore(totals, kminek, novotny);
    if (score > 1) addIssue('warn', 'kminek-novotny-mo-to', 'Kmínek a Novotný nemají podobný počet směn na MO a TO.', 'Rozdíl: ' + String(score) + '.');
  }

  return { ok: !issues.some((issue) => issue.severity === 'error'), issues };
}

function adminRotationFormatRuleIssues(issues) {
  const list = Array.isArray(issues) ? issues : [];
  if (!list.length) return '';
  return list.slice(0, 4).map((issue) => String(issue && issue.message || '')).filter(Boolean).join(' · ');
}


function adminGenerateRotationMonthDraft(monthKey, preparedMonth, options) {
  const generationOptions = options && typeof options === 'object' ? options : {};
  if (!monthKey) throw new Error('Chybí měsíc.');
  const domMonth = generationOptions.ignoreDom === true
    ? null
    : (adminRotationGeneratorCanReadEditorDraftFromDom() ? readAdminRotationFromDom(monthKey) : null);
  const fallback = domMonth || preparedMonth || (app.rotation && app.rotation.months ? app.rotation.months[monthKey] : null);
  if (!fallback) throw new Error('Pro vybraný měsíc nejsou připravené řádky.');
  const model = adminBuildRotationGenerationModel(monthKey);
  if (!model.dayTemplates.length) throw new Error('Nemám z čeho vycházet. Nejdřív musí existovat aspoň jeden vyplněný předchozí rozpis.');
  const month = JSON.parse(JSON.stringify(fallback));
  month.hard = month.hard || { title: 'Rotace tvrdota', machines: HARD_MACHINE_HEADERS.slice(), rows: [] };
  month.soft = month.soft || { title: 'Rotace měkota', machines: SOFT_MACHINE_HEADERS.slice(), rows: [] };
  month.notes = Array.isArray(month.notes) ? month.notes : [];
  const hardRows = Array.isArray(month.hard.rows) ? month.hard.rows : [];
  const softRows = Array.isArray(month.soft.rows) ? month.soft.rows : [];
  const maxRows = Math.max(hardRows.length, softRows.length);
  const counters = adminRotationGeneratorCreateCounters(model);
  let filledCells = 0;
  let days = 0;
  let blockedByAbsence = 0;
  let skippedDays = 0;
  let protectedEmptyCells = 0;
  const knownNames = model.knownNames;

  for (let rowIdx = 0; rowIdx < maxRows; rowIdx += 1) {
    if (!hardRows[rowIdx] && softRows[rowIdx]) hardRows[rowIdx] = { date: softRows[rowIdx].date || '', cells: Array(HARD_MACHINE_HEADERS.length).fill('') };
    if (!softRows[rowIdx] && hardRows[rowIdx]) softRows[rowIdx] = { date: hardRows[rowIdx].date || '', cells: Array(SOFT_MACHINE_HEADERS.length).fill('') };
    const hardRow = hardRows[rowIdx];
    const softRow = softRows[rowIdx];
    if (!hardRow && !softRow) continue;
    const dateLabel = (hardRow && hardRow.date) || (softRow && softRow.date) || '';
    const dayNotes = adminRotationGeneratorDateNotes(month, dateLabel);
    const absenceNames = adminRotationUnavailableNamesForDate(month, dateLabel, knownNames);
    blockedByAbsence += absenceNames.size;
    if (adminRotationGeneratorIsDayBlocked(dayNotes)) {
      if (hardRow) hardRow.cells = Array(HARD_MACHINE_HEADERS.length).fill('');
      if (softRow) softRow.cells = Array(SOFT_MACHINE_HEADERS.length).fill('');
      skippedDays += 1;
      continue;
    }
    const generated = adminRotationGeneratorBuildDay(month, model, counters, rowIdx, dateLabel, absenceNames, monthKey);
    if (hardRow) hardRow.cells = generated.hardCells;
    if (softRow) softRow.cells = generated.softCells;
    filledCells += generated.filledCells;
    protectedEmptyCells += generated.emptyProtected;
    if (generated.filledCells) days += 1;
  }

  month.hard.rows = hardRows;
  month.hard.machines = HARD_MACHINE_HEADERS.slice();
  month.hard.title = month.hard.title || 'Rotace tvrdota';
  month.soft.rows = softRows;
  month.soft.machines = SOFT_MACHINE_HEADERS.slice();
  month.soft.title = month.soft.title || 'Rotace měkota';
  const scopedDateLabels = Array.isArray(generationOptions.scopedDateLabels)
    ? generationOptions.scopedDateLabels.map((value) => String(value || '').trim()).filter(Boolean)
    : [];
  const scopedGeneration = scopedDateLabels.length > 0;
  const scopedNoop = () => ({ swaps: 0, repairs: 0, spread: 0, tbkSpread: 0, unresolved: [], disabled: false });
  // RaK 1.7.120: Neplánovaná změna potřebuje jen čistý výsledek BuildDay pro vybraný den.
  // Měsíční dorovnávací/repair průchody mohou legitimně prohazovat jiné dny a
  // v minulosti tím vracely absenci/Kalírnu zpět do právě přepočítaného dne.
  const tnksBalance = scopedGeneration ? scopedNoop() : adminRotationGeneratorBalanceHardMachine(month, 'TNKS01', model, monthKey);
  const soloMillBalance = scopedGeneration ? scopedNoop() : adminRotationGeneratorBalanceSoloMill(month, model);
  const softTotalBalance = scopedGeneration ? scopedNoop() : adminRotationGeneratorBalanceSoftTotals(month, model, monthKey);
  const softKindBalance = scopedGeneration ? scopedNoop() : adminRotationGeneratorBalanceSoftKind(month, model);
  const soloMillRebalance = scopedGeneration ? scopedNoop() : adminRotationGeneratorBalanceSoloMill(month, model);
  const kminekNovotnyMoToBalance = scopedGeneration ? scopedNoop() : adminRotationGeneratorBalanceKminekNovotnyMoTo(month, model);
  const emptyHardRepair = scopedGeneration ? scopedNoop() : adminRotationGeneratorRepairEmptyHardCells(month, model, monthKey);
  const tnksPostRepairBalance = !scopedGeneration && emptyHardRepair && Number(emptyHardRepair.repairs || 0)
    ? adminRotationGeneratorBalanceHardMachine(month, 'TNKS01', model, monthKey)
    : scopedNoop();
  const tnksConsecutiveRepair = scopedGeneration ? scopedNoop() : adminRotationGeneratorRepairConsecutiveTnks(month, model, monthKey);
  const finalSoftKindBalance = scopedGeneration ? scopedNoop() : adminRotationGeneratorBalanceSoftKind(month, model);
  const finalTnksBalance = scopedGeneration ? scopedNoop() : adminRotationGeneratorBalanceHardMachine(month, 'TNKS01', model, monthKey);
  const tpkw02Balance = scopedGeneration ? scopedNoop() : adminRotationGeneratorBalanceHardMachine(month, 'TPKW02', model, monthKey);
  const finalSoloMillBalance = scopedGeneration ? scopedNoop() : adminRotationGeneratorBalanceSoloMill(month, model);
  // RAK_GENERATOR_FINAL_SOLO_MILL_CALL_17008
  const finalSoloMillStreakRepair = scopedGeneration ? scopedNoop() : adminRotationGeneratorRepairConsecutiveSoloMill17008(month, model, monthKey);
  // RAK_GENERATOR_SOLO_MILL_SPREAD_CALL_17009
  const finalSoloMillSpreadRepair = scopedGeneration ? scopedNoop() : adminRotationGeneratorRepairSoloMillSpread17009(month, model, monthKey);
  // RAK_GENERATOR_SUNDAY_TBK_FAIRNESS_CALL_17011
  const annualSundayTbkrCleanupBalance = scopedGeneration ? scopedNoop() : adminRotationGeneratorBalanceSundayTbkrCleanup17011(month, model, monthKey);
  // RAK_GENERATOR_PRESS_HALF_STEP_CALL_17012
  const pressHalfStepBalance = scopedGeneration ? scopedNoop() : adminRotationGeneratorBalancePressHalfSteps17012(month, model, monthKey);
  // RAK_TPKW02_FINAL_CALL_17013
  const finalTpkw02Balance = scopedGeneration ? scopedNoop() : adminRotationGeneratorBalanceTpkw02Final17013(month, model, monthKey);
  const ruleCheck = adminRotationValidateMonthRules(month, monthKey, { source: 'generator' });
  if (finalTpkw02Balance.spread > 1 && !finalTpkw02Balance.disabled) {
    ruleCheck.issues.push({ severity: 'warn', code: 'tpkw02-month-spread', message: 'TPKW02 nelze s aktuální kvalifikací bezpečně vyrovnat na rozdíl 1 směny.' });
  }
  const criticalIssues = ruleCheck.issues.filter((issue) => issue && issue.severity === 'error');
  const allowScopedRuleErrors = generationOptions.allowScopedRuleErrors === true;
  if (criticalIssues.length && !allowScopedRuleErrors) {
    throw new Error('Návrh porušuje pravidla: ' + criticalIssues.slice(0, 3).map((issue) => issue.message).join(' · '));
  }
  // Po opravach a prohozech vrat skutecny pocet obsazenych bunek, ne puvodni odhad.
  const finalFilledCells = hardRows.concat(softRows).reduce((count, row) => count +
    (Array.isArray(row && row.cells) ? row.cells : []).filter((name) => adminRotationIsRealName(name, model.knownNames)).length, 0);
  const normalized = normalizeMonthForImport(month, fallback);
  if (generationOptions.persistPending !== false) adminRotationGeneratorSetPendingDraft(monthKey, normalized);
  return {
    normalized,
    days,
    filledCells: finalFilledCells,
    historyTemplates: model.dayTemplates.length,
    previousYearTemplates: model.previousYearTemplates.length,
    previousYearKey: model.previousYearKey,
    blockedByAbsence,
    skippedDays,
    protectedEmptyCells,
    emptyHardCellRepairs: emptyHardRepair && Number(emptyHardRepair.repairs || 0),
    tnksBalanceSwaps: (tnksBalance && Number(tnksBalance.swaps || 0))
      + (tnksPostRepairBalance && Number(tnksPostRepairBalance.swaps || 0))
      + (finalTnksBalance && Number(finalTnksBalance.swaps || 0)),
    tnksConsecutiveRepairs: tnksConsecutiveRepair && Number(tnksConsecutiveRepair.repairs || 0),
    soloMillBalanceSwaps: (soloMillBalance && Number(soloMillBalance.swaps || 0)) + (soloMillRebalance && Number(soloMillRebalance.swaps || 0)) + (finalSoloMillBalance && Number(finalSoloMillBalance.swaps || 0)) + (finalSoloMillStreakRepair && Number(finalSoloMillStreakRepair.repairs || 0)) + (finalSoloMillSpreadRepair && Number(finalSoloMillSpreadRepair.repairs || 0)),
    soloMillMonthlySpreadRepairs: finalSoloMillSpreadRepair && Number(finalSoloMillSpreadRepair.repairs || 0),
    soloMillMonthlySpread: finalSoloMillSpreadRepair && Number(finalSoloMillSpreadRepair.spread || 0),
    annualSundayTbkrCleanupBalanceSwaps: annualSundayTbkrCleanupBalance && Number(annualSundayTbkrCleanupBalance.swaps || 0),
    annualSundayTbkrCleanupSpread: annualSundayTbkrCleanupBalance && Number(annualSundayTbkrCleanupBalance.tbkSpread || 0),
    pressHalfStepBalanceSwaps: pressHalfStepBalance && Number(pressHalfStepBalance.swaps || 0),
    pressHalfStepMonthlySpread: pressHalfStepBalance && Number(pressHalfStepBalance.spread || 0),
    finalTpkw02BalanceSwaps: finalTpkw02Balance && Number(finalTpkw02Balance.swaps || 0),
    finalTpkw02MonthlySpread: finalTpkw02Balance && Number(finalTpkw02Balance.spread || 0),
    soloMillConsecutiveRepairs: finalSoloMillStreakRepair && Number(finalSoloMillStreakRepair.repairs || 0),
    soloMillConsecutiveUnresolved: finalSoloMillStreakRepair && Array.isArray(finalSoloMillStreakRepair.unresolved) ? finalSoloMillStreakRepair.unresolved.length : 0,
    tpkw02BalanceSwaps: tpkw02Balance && Number(tpkw02Balance.swaps || 0),
    softTotalBalanceSwaps: softTotalBalance && Number(softTotalBalance.swaps || 0),
    softKindBalanceSwaps: (softKindBalance && Number(softKindBalance.swaps || 0)) + (finalSoftKindBalance && Number(finalSoftKindBalance.swaps || 0)),
    kminekNovotnyMoToBalanceSwaps: kminekNovotnyMoToBalance && Number(kminekNovotnyMoToBalance.swaps || 0),
    softCoreSkippedSlots: Array.isArray(counters.softCoreSkippedSlots) ? counters.softCoreSkippedSlots.length : 0,
    ruleWarnings: ruleCheck.issues.filter((issue) => issue && issue.severity === 'warn'),
    ruleVersion: '1.149'
  };
}

window.RAK_ROTATION_GENERATOR_CONTRACT_V1106 = RAK_ROTATION_GENERATOR_CONTRACT_V1106;
window.RAK_ROTATION_GENERATOR_RULES_V1107 = RAK_ROTATION_GENERATOR_RULES_V1107;
window.adminGenerateRotationMonthDraft = adminGenerateRotationMonthDraft;
window.adminRotationMonthHasFilledCells = adminRotationMonthHasFilledCells;
window.adminRotationValidateMonthRules = adminRotationValidateMonthRules;
window.adminRotationFormatRuleIssues = adminRotationFormatRuleIssues;


const RAK_ROTATION_GENERATOR_ABSENCE_STATE_CONTRACT_V1109 = Object.freeze({
  version: '1.109',
  rule: 'Při kliknutí na + Přidat jméno v kroku Absence se musí zachovat už vyplněná jména i kódy.',
  guard: 'adminRotationGeneratorCollectAbsencesFromDom používá state.days, když krok Absence nemá v DOMu day inputy, a nevyhazuje prázdné řádky během editace.'
});

const RAK_ROTATION_GENERATOR_WIZARD_RUN_CONTRACT_V1110 = Object.freeze({
  version: '1.110',
  rule: 'Vygenerovat rozpis z průvodce nesmí číst prázdný wizard DOM jako editor rozpisu.',
  guard: 'adminGenerateRotationMonthDraft smí číst readAdminRotationFromDom jen tehdy, když v DOMu existuje #adminRotationEditor s řádky rozpisu; jinak musí použít připravený měsíc z app.rotation.months.'
});

const RAK_ROTATION_GENERATOR_WIZARD_STATE_CONTRACT_V1111 = Object.freeze({
  version: '1.111',
  rule: 'Průvodce generátorem nesmí v kroku Návrh vygenerovat prázdný měsíc jen proto, že se stav dnů ztratil nebo byl předchozí pokus nulový.',
  guard: 'Dny se při generování řeší přes adminRotationGeneratorResolveWizardDays: nejdřív wizard state, potom aktuální rozpis, potom výchozí initialRotationData. Pokud nejsou žádné dny, generátor skončí chybou místo nulového návrhu.'
});

const RAK_ROTATION_GENERATOR_MONTH_BALANCE_CONTRACT_V1112 = Object.freeze({
  version: '1.112',
  rule: 'Výběr měsíce v generátoru musí být řazený podle roku/měsíce a TNKS01/nýtovačka se po vygenerování vyrovnává mezi lidmi v měsíci.',
  guard: 'Měsíce se renderují přes optgroup podle roku a po sestavení měsíce běží adminRotationGeneratorBalanceHardMachine, která může prohodit člověka na TNKS01 s člověkem z tvrdoty dočasně napsaným na měkotě.'
});

const RAK_ROTATION_GENERATOR_RULES_V1113 = Object.freeze({
  version: '1.113',
  scope: 'Administrace dat / Rozpisy / Vygenerovat návrh',
  machineCountRule: 'V kontrolní tabulce stroje × jména se TNKS01 a TPKW01 mimo běžnou neděli počítají jako 0,5 na oba stroje; běžná neděle ranní/noční zůstává celá směna na zapsaném stroji, přesčasová TO neděle se střídá a výjimka jen MO se nepůlí.',
  softCoreRule: 'Synek, Třasák a Střížek chodí z Měkoty na Tvrdotu jen na TNKS01/TPKW01/TPKW02 po blocích 3 pracovních dnů na stejný stroj. Když někdo chybí, pořadí se přeskupí tak, aby se tvrdotě nevyhnul.',
  softLatheBase: Object.freeze({ Synek: 'MSKC04', 'Střížek': 'MSKC03', 'Třasák': 'MSKC01' }),
  previewRule: 'Po vygenerování musí průvodce ukázat celý rozpis v náhledu a umožnit návrat na měsíc/dny/absence bez naklikání od začátku.'
});

const RAK_ROTATION_GENERATOR_RULES_V1114 = Object.freeze({
  version: '1.114',
  scope: 'Administrace dat / Rozpisy / Vygenerovat návrh',
  softCoreAvailabilityRule: 'Když Synek/Třasák/Střížek mají v bloku absenci, generátor nejdřív prohodí jejich pořadí. Pokud chybějící člověk stále brání dokončení bloku, jeho den přeskočí a další pracovní den začne nový stroj.',
  soloMillBalanceRule: 'Samostatné frézky/MFKF10 s prázdnou MFKF06 se po vygenerování vyrovnávají mezi lidmi podobně jako TNKS01, aby někdo nebyl sám na frézkách opakovaně a jiný vůbec.'
});


const RAK_ROTATION_GENERATOR_RULES_V1115 = Object.freeze({
  version: '1.115',
  scope: 'Administrace dat / Rozpisy / Vygenerovat návrh',
  humanFlowRule: 'Generátor postupuje víc jako Martin: nejdřív rozepsat lidi z Tvrdoty podle návaznosti z minulého měsíce, potom základ Měkoty, potom absence/výměny, potom Špadrna a Novotný pro vyrovnání a zbytek na frézky.',
  hardCycle: Object.freeze(['TBKR01', 'TNKS01', 'TBKR07', 'TPKW01', 'TPKW02']),
  previousMonthRule: 'Pro lidi z Tvrdoty se drží cursor podle posledního tvrdotního stroje z předchozích měsíců.',
  displacedHardRule: 'Když člověk z Měkoty jde na tvrdotní stroj, vytlačený člověk z Tvrdoty jde v tom dni na Měkotu, přednostně na frézky.',
  flexPeople: Object.freeze(['Špadrna', 'Novotný'])
});


const RAK_ROTATION_GENERATOR_RULES_V1116 = Object.freeze({
  version: '1.116',
  scope: 'Administrace dat / Rozpisy / Vygenerovat návrh',
  machineSummaryRule: 'Kontrolní přehled musí být otočený jako jména v řádcích a stroje ve sloupcích, se souhrny TO a MO pro rychlou kontrolu.',
  pressBalanceRule: 'Nýtovačka se vyrovnává podle společného počtu TNKS01/TPKW01 s pravidlem 0,5 + 0,5, takže stav 1,5 proti 0 je potřeba dál prohazovat.',
  softKindBalanceRule: 'Měkota se po vygenerování dorovnává i podle typu práce: kdo má moc frézek a žádný soustruh se prohazuje s tím, kdo má moc soustruhů a žádné frézky.',
  softTotalBalanceRule: 'Vybraná skupina lidí z Tvrdoty se po vygenerování dorovnává i podle celkového počtu směn na Měkotě.',
  resultFields: Object.freeze(['tnksBalanceSwaps', 'soloMillBalanceSwaps', 'softTotalBalanceSwaps', 'softKindBalanceSwaps'])
});

const RAK_ROTATION_SAVE_BUTTON_CONTRACT_V1118 = Object.freeze({
  scope: 'administrace-dat-rozpisy-save-button',
  rule: 'Editor rozpisu má mít jen jedno jasné tlačítko Uložit rozpis; duplicitní duplicitní odesílací tlačítko se nepoužívá.',
  generatorResult: 'Náhled generátoru má otevírat rozpis, samotné odeslání/uložení zůstává až přes Uložit rozpis.'
});
const RAK_ROTATION_EMPTY_CELL_HIGHLIGHT_CONTRACT_V1119 = Object.freeze({
  scope: 'rotace-a-rozpisy-prazdne-pozice',
  intent: 'neobsazené pozice zvýraznit světle červenou v Rotaci, editoru Rozpisů i náhledu generátoru',
  protectedClasses: Object.freeze(['missingCell', 'adminRotationEditorEmptyCell', 'adminRotationPreviewEmptyCell', 'adminRotationMiniEmpty'])
});

const RAK_ROTATION_GENERATOR_RULES_V1117 = Object.freeze({
  version: '1.117',
  scope: 'Administrace dat / Rozpisy / Vygenerovat návrh',
  kminekNovotnyMoToRule: 'Kmínek a Novotný se můžou po vygenerování prohazovat mezi sebou, aby měli co nejpodobnější počet směn na MO a TO.',
  guardFunction: 'adminRotationGeneratorBalanceKminekNovotnyMoTo',
  resultFields: Object.freeze(['kminekNovotnyMoToBalanceSwaps'])
});

const RAK_ROTATION_GENERATOR_WIZARD_CONTRACT_V1108 = Object.freeze({
  version: '1.108',
  scope: 'Administrace dat / Rozpisy / Vygenerovat návrh',
  flow: Object.freeze(['volba měsíce', 'kontrola pracovních dnů', 'absence přes +', 'vygenerování návrhu', 'měsíční přehled stroje × jména']),
  rules: 'Generátor se spouští až po kontrole dnů a absencí. Přehled strojů podle jmen je jen pro rychlou kontrolu před ručním uložením.'
});

function adminRotationGetOrderedMonthKeys() {
  return getAdminRotationMonthKeys().slice().sort((a, b) => adminRotationMonthSortValue(a) - adminRotationMonthSortValue(b));
}

function adminRotationGetNextExistingMonthKeyAfter(monthKey) {
  const keys = adminRotationGetOrderedMonthKeys();
  if (!keys.length) return monthKey || '';
  const current = monthKey && keys.includes(monthKey) ? monthKey : (app.selectedMonth && keys.includes(app.selectedMonth) ? app.selectedMonth : keys[keys.length - 1]);
  const idx = keys.indexOf(current);
  if (idx >= 0 && idx < keys.length - 1) return keys[idx + 1];
  const currentSort = adminRotationMonthSortValue(current);
  const later = keys.find((key) => adminRotationMonthSortValue(key) > currentSort);
  return later || '';
}

function adminRotationFindExistingMonthKeyAtOrAfter(monthKey) {
  const keys = adminRotationGetOrderedMonthKeys();
  if (!keys.length) return '';
  if (monthKey && keys.includes(monthKey)) return monthKey;
  const targetSort = adminRotationMonthSortValue(monthKey);
  if (targetSort) {
    const later = keys.find((key) => adminRotationMonthSortValue(key) >= targetSort);
    if (later) return later;
  }
  return keys[0] || '';
}

function adminRotationGetLatestGeneratedMonthKey() {
  const keys = adminRotationGetOrderedMonthKeys();
  let latest = '';
  let started = false;
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (adminRotationMonthHasFilledCells(key)) {
      latest = key;
      started = true;
      continue;
    }
    if (started) break;
  }
  return latest;
}

function adminRotationGetDefaultFutureMonthKey() {
  const today = new Date();
  const future = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const key = typeof monthKeyFromYearMonth === 'function'
    ? monthKeyFromYearMonth(future.getFullYear(), future.getMonth() + 1)
    : String(future.getMonth() + 1) + '/' + String(future.getFullYear()).slice(-2);
  return adminRotationFindExistingMonthKeyAtOrAfter(key);
}

function adminRotationGetCurrentExistingMonthKey() {
  const keys = adminRotationGetOrderedMonthKeys();
  if (!keys.length) return '';
  const today = new Date();
  const key = typeof monthKeyFromYearMonth === 'function'
    ? monthKeyFromYearMonth(today.getFullYear(), today.getMonth() + 1)
    : String(today.getMonth() + 1) + '/' + String(today.getFullYear()).slice(-2);
  return keys.includes(key) ? key : '';
}

function adminRotationGetNextMonthKeyFrom(monthKey) {
  return adminRotationGeneratorResolveSelectableMonthKey(monthKey);
}

function adminRotationMonthYearLabel(monthKey) {
  const parsed = typeof parseMonthKey === 'function' ? parseMonthKey(monthKey) : null;
  if (parsed && Number.isFinite(parsed.year)) return String(parsed.year);
  const match = String(monthKey || '').match(/^\d{1,2}\/(\d{2,4})$/);
  if (!match) return 'Bez roku';
  const rawYear = Number(match[1]);
  return String(rawYear < 100 ? 2000 + rawYear : rawYear);
}

function adminRotationMonthFullLabel(monthKey) {
  const parsed = typeof parseMonthKey === 'function' ? parseMonthKey(monthKey) : null;
  if (!parsed || !Number.isFinite(parsed.month) || !Number.isFinite(parsed.year)) return String(monthKey || '');
  const names = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'];
  const name = names[parsed.month - 1] || String(parsed.month);
  return name + ' ' + String(parsed.year) + ' (' + String(monthKey) + ')';
}

function adminRotationCollectMonthWorkDatesFromMonth(month) {
  if (!month) return [];
  const hardRows = Array.isArray(month.hard && month.hard.rows) ? month.hard.rows : [];
  const softRows = Array.isArray(month.soft && month.soft.rows) ? month.soft.rows : [];
  const maxRows = Math.max(hardRows.length, softRows.length);
  const dates = [];
  const seen = new Set();
  for (let i = 0; i < maxRows; i += 1) {
    const raw = String((hardRows[i] && hardRows[i].date) || (softRows[i] && softRows[i].date) || '').trim();
    if (!raw || seen.has(raw)) continue;
    seen.add(raw);
    dates.push(raw);
  }
  return dates;
}

function adminRotationGetDefaultMonthWorkDates(monthKey) {
  const source = (typeof initialRotationData !== 'undefined' && initialRotationData && initialRotationData.months)
    ? initialRotationData.months[monthKey]
    : null;
  return adminRotationCollectMonthWorkDatesFromMonth(source);
}

function adminRotationGetMonthWorkDates(monthKey) {
  const month = app.rotation && app.rotation.months ? app.rotation.months[monthKey] : null;
  const currentDates = adminRotationCollectMonthWorkDatesFromMonth(month);
  if (currentDates.length) return currentDates;
  return adminRotationGetDefaultMonthWorkDates(monthKey);
}

function adminRotationCollectMonthAbsencesFromMonth(month, days) {
  const workingDays = Array.isArray(days) ? days.map((date) => String(date || '').trim()).filter(Boolean) : [];
  const result = workingDays.map((date) => ({ date, rows: [] }));
  if (!month || !result.length) return result;
  const exactMap = new Map();
  const baseMap = new Map();
  result.forEach((day, idx) => {
    const exact = adminRotationDateLabel(day.date);
    const base = adminRotationDateBaseKey(day.date);
    if (exact && !exactMap.has(exact)) exactMap.set(exact, idx);
    if (base) {
      if (!baseMap.has(base)) baseMap.set(base, []);
      baseMap.get(base).push(idx);
    }
  });
  (Array.isArray(month.notes) ? month.notes : []).forEach((note) => {
    const normalized = typeof normalizeNoteEntry === 'function' ? normalizeNoteEntry(note) : null;
    if (!normalized || !normalized.isAbsence) return;
    const person = String(normalized.person || '').trim();
    const code = String(normalized.code || '').trim();
    if (!person && !code) return;
    const exact = adminRotationDateLabel(normalized.date || '');
    const base = adminRotationDateBaseKey(normalized.date || '');
    let idx = exactMap.has(exact) ? exactMap.get(exact) : -1;
    if ((!Number.isFinite(idx) || idx < 0) && baseMap.has(base)) {
      const bucket = baseMap.get(base) || [];
      idx = bucket.length ? bucket[0] : -1;
      const normalizedShift = typeof normalizeShiftText === 'function'
        ? normalizeShiftText(String(normalized.shift || '').trim())
        : String(normalized.shift || '').trim();
      if (normalizedShift && bucket.length > 1) {
        const matched = bucket.find((candidateIdx) => {
          const parsed = typeof parseDateToken === 'function' ? parseDateToken(result[candidateIdx] && result[candidateIdx].date) : null;
          const candidateShift = parsed && parsed.shift && typeof normalizeShiftText === 'function'
            ? normalizeShiftText(parsed.shift)
            : (parsed && parsed.shift ? parsed.shift : '');
          return String(candidateShift || '').trim() === String(normalizedShift || '').trim();
        });
        if (Number.isFinite(matched)) idx = matched;
      }
    }
    if (!Number.isFinite(idx) || idx < 0 || !result[idx]) return;
    result[idx].rows.push({ person, code });
  });
  return result;
}

const RAK_ROTATION_GENERATOR_EXCEL_COPY_CONTRACT_V1138 = Object.freeze({
  version: '1.145',
  layout: 'kopírovací XLSX návrh rozpisu: Tvrdota A:F, prázdný oddělovač G, Absence od H dál podle pracovních dnů, Měkota znovu A:F pod Tvrdotou',
  absenceRule: 'Absence mají datum v H a dvojice Jméno/Kód od I dál; počet dvojic je dynamický 4 až 8 podle měsíce.',
  copyRule: 'Bez slučovaných buněk a bez stylových triků, aby šly bloky jednoduše označit a kopírovat do Martinovy měsíční tabulky.'
});

function adminBuildRotationMachineCountSummaryHtml(month, monthKey) {
  if (!month) return '<div class="smallText">Souhrn zatím není dostupný.</div>';
  const names = adminGetKnownNames();
  const machineMap = new Map();
  const sectionTotals = { hard: new Map(), soft: new Map() };
  const addTotal = (sectionKey, person, value) => {
    const name = String(person || '').trim();
    if (!name) return;
    const map = sectionKey === 'soft' ? sectionTotals.soft : sectionTotals.hard;
    map.set(name, Number(map.get(name) || 0) + Number(value || 0));
  };
  const addSection = (sectionKey, fallbackMachines) => {
    const section = month[sectionKey] || {};
    const machines = Array.isArray(section.machines) ? section.machines : fallbackMachines;
    const rows = Array.isArray(section.rows) ? section.rows : [];
    rows.forEach((row) => {
      if (sectionKey === 'hard') {
        const tnksIdx = adminRotationGeneratorMachineIndex(machines, 'TNKS01');
        const tpkw01Idx = adminRotationGeneratorMachineIndex(machines, 'TPKW01');
        const splitPress = adminRotationGeneratorShouldSplitPressMachines(row && row.date, monthKey, month);
        if (splitPress && tnksIdx >= 0 && tpkw01Idx >= 0) {
          [tnksIdx, tpkw01Idx].forEach((idx) => {
            const person = adminRotationCanonicalName(row && row.cells ? row.cells[idx] : '', names);
            if (!person || !names.includes(person)) return;
            adminRotationGeneratorAddMachineCount(machineMap, 'TNKS01', person, 0.5);
            adminRotationGeneratorAddMachineCount(machineMap, 'TPKW01', person, 0.5);
            addTotal('hard', person, 1);
          });
          machines.forEach((machine, machineIdx) => {
            const machineName = String(machine || '').trim();
            if (!machineName || machineName === 'TNKS01' || machineName === 'TPKW01') return;
            const person = adminRotationCanonicalName(row && row.cells ? row.cells[machineIdx] : '', names);
            if (person && names.includes(person)) {
              adminRotationGeneratorAddMachineCount(machineMap, machineName, person, 1);
              addTotal('hard', person, 1);
            }
          });
          return;
        }
      }
      machines.forEach((machine, machineIdx) => {
        const machineName = String(machine || '').trim();
        if (!machineName) return;
        const person = adminRotationCanonicalName(row && row.cells ? row.cells[machineIdx] : '', names);
        if (!person || !names.includes(person)) return;
        adminRotationGeneratorAddMachineCount(machineMap, machineName, person, 1);
        addTotal(sectionKey === 'soft' ? 'soft' : 'hard', person, 1);
      });
    });
  };
  addSection('hard', HARD_MACHINE_HEADERS);
  addSection('soft', SOFT_MACHINE_HEADERS);
  const usedNames = names.filter((name) => Array.from(machineMap.values()).some((map) => map.has(name)) || sectionTotals.hard.has(name) || sectionTotals.soft.has(name));
  if (!usedNames.length || !machineMap.size) return '<div class="smallText">Souhrn bude dostupný po vygenerování rozpisu.</div>';
  const orderedMachines = HARD_MACHINE_HEADERS.concat(SOFT_MACHINE_HEADERS).filter((machine, idx, arr) => machine && arr.indexOf(machine) === idx && machineMap.has(machine));
  const head = '<tr><th>Jméno</th><th>TO</th><th>MO</th>' + orderedMachines.map((machine) => '<th>' + escapeHtml(machine) + '</th>').join('') + '</tr>';
  const body = usedNames.map((name) => {
    const hardTotal = Number(sectionTotals.hard.get(name) || 0);
    const softTotal = Number(sectionTotals.soft.get(name) || 0);
    const cells = orderedMachines.map((machine) => {
      const counts = machineMap.get(machine);
      const count = counts ? Number(counts.get(name) || 0) : 0;
      return '<td class="' + (count ? 'adminRotationMachineCountHit' : '') + '">' + adminRotationGeneratorFormatCount(count) + '</td>';
    }).join('');
    return '<tr><td>' + escapeHtml(name) + '</td>'
      + '<td class="' + (hardTotal ? 'adminRotationMachineCountHit' : '') + '">' + adminRotationGeneratorFormatCount(hardTotal) + '</td>'
      + '<td class="' + (softTotal ? 'adminRotationMachineCountHit' : '') + '">' + adminRotationGeneratorFormatCount(softTotal) + '</td>'
      + cells + '</tr>';
  }).join('');
  return [
    '<details class="adminRotationGeneratorMachineSummary" open>',
    '  <summary>Rychlý přehled: jména × stroje</summary>',
    '  <div class="smallText">Jména jsou v řádcích, stroje ve sloupcích. Sloupce TO/MO ukazují součet tvrdého a měkkého obrábění. TNKS01 a TPKW01 se mimo běžnou neděli počítají jako 0,5 + 0,5 na oba stroje. Ruční výjimka „Nerotuje / každý +1“ má přednost.</div>',
    '  <div class="adminRotationGeneratorMachineSummaryScroll">',
    '    <table class="appMenuTable appMenuAdminTable appMenuAdminTableDense adminRotationGeneratorMachineSummaryTable"><thead>' + head + '</thead><tbody>' + body + '</tbody></table>',
    '  </div>',
    '</details>'
  ].join('');
}

function adminAddAbsenceRowToEditor() {
  const body = document.getElementById('appMenuBody');
  const tbody = body ? body.querySelector('#adminRotationEditor .appMenuAdminAbsenceTable tbody') : null;
  if (!tbody) return;
  const index = tbody.querySelectorAll('tr[data-note-row-index]').length;
  tbody.insertAdjacentHTML('beforeend', adminNotesRowTemplate({ date: '', person: '', code: '' }, index, true));
  const status = document.getElementById('adminRotationDraftStatus');
  if (status) status.textContent = 'Přidaný další řádek absence. Rozpis se uloží až tlačítkem.';
}

const RAK_ROTATION_GENERATOR_RULES_V1135 = Object.freeze({
  version: '1.136',
  tnksMonthlyFirstRule: 'TNKS01/nýtovačka se v generátoru vyrovnává primárně v rámci měsíce; roční počty jsou jen jemný tie-break.',
  excludedFromTnksBalance: Object.freeze(['Střížek', 'Synek', 'Třasák']),
  softCoreContinuationRule: 'Synek/Třasák/Střížek drží pevný návazný cyklus TNKS01 → TPKW01 → TPKW02 mezi měsíci a TNKS01 dorovnání jim do něj nesahá.',
  softCoreGapRule: 'Mezera po dokončeném bloku slouží jen k zarovnání konce měsíce. Když rozdělaný blok nemůže dokončit chybějící člověk ani po prohození pořadí, jeho krok se přeskočí a následující pracovní den začne trojice další stroj.',
  consecutiveTnksRule: 'Stejný pracovník nesmí být na TNKS01 dvě pracovní směny po sobě; ve dnech s rotací TNKS01/TPKW01 se jako TNKS práce počítá i TPKW01, krátká / nerotující neděle se nepůlí.',
  singleSaveRule: 'Editor rozpisu má jen jedno hlavní tlačítko Uložit rozpis v horní akční liště.'
});

window.RAK_ROTATION_GENERATOR_RULES_V1135 = RAK_ROTATION_GENERATOR_RULES_V1135;
window.RAK_ROTATION_GENERATOR_RULES_V1117 = RAK_ROTATION_GENERATOR_RULES_V1117;
window.RAK_ROTATION_GENERATOR_RULES_V1116 = RAK_ROTATION_GENERATOR_RULES_V1116;
window.RAK_ROTATION_GENERATOR_RULES_V1115 = RAK_ROTATION_GENERATOR_RULES_V1115;
window.RAK_ROTATION_GENERATOR_RULES_V1114 = RAK_ROTATION_GENERATOR_RULES_V1114;
window.RAK_ROTATION_GENERATOR_RULES_V1113 = RAK_ROTATION_GENERATOR_RULES_V1113;
window.RAK_ROTATION_GENERATOR_MONTH_BALANCE_CONTRACT_V1112 = RAK_ROTATION_GENERATOR_MONTH_BALANCE_CONTRACT_V1112;
window.RAK_ROTATION_GENERATOR_ABSENCE_STATE_CONTRACT_V1109 = RAK_ROTATION_GENERATOR_ABSENCE_STATE_CONTRACT_V1109;
window.RAK_ROTATION_GENERATOR_WIZARD_RUN_CONTRACT_V1110 = RAK_ROTATION_GENERATOR_WIZARD_RUN_CONTRACT_V1110;
window.RAK_ROTATION_GENERATOR_WIZARD_STATE_CONTRACT_V1111 = RAK_ROTATION_GENERATOR_WIZARD_STATE_CONTRACT_V1111;
window.RAK_ROTATION_GENERATOR_WIZARD_CONTRACT_V1108 = RAK_ROTATION_GENERATOR_WIZARD_CONTRACT_V1108;
window.adminOpenRotationGeneratorWizard = adminOpenRotationGeneratorWizard;
window.adminHandleRotationGeneratorWizardAction = adminHandleRotationGeneratorWizardAction;
window.adminAddAbsenceRowToEditor = adminAddAbsenceRowToEditor;
window.adminBuildRotationMachineCountSummaryHtml = adminBuildRotationMachineCountSummaryHtml;
window.adminBuildRotationGeneratorPreviewHtml = adminBuildRotationGeneratorPreviewHtml;
window.adminRotationGeneratorDownloadExcel = adminRotationGeneratorDownloadExcel;
window.adminRotationGetAllowedGeneratorMonthKeys = adminRotationGetAllowedGeneratorMonthKeys;
window.adminRotationGeneratorBuildYearOptions = adminRotationGeneratorBuildYearOptions;
window.adminRotationGeneratorBuildMonthOptions = adminRotationGeneratorBuildMonthOptions;
window.adminRotationGeneratorBalanceHardMachine = adminRotationGeneratorBalanceHardMachine;

try {
  document.addEventListener('change', (event) => {
    adminRotationGeneratorHandleYearSelectChange(event.target);
  });
} catch (err) {}

function adminGetSelectedRemoveButton() {
  const body = document.getElementById('appMenuBody');
  return body ? body.querySelector('[data-admin-selected-remove]') : null;
}

function adminHideRotationSelectedRemove() {
  const btn = adminGetSelectedRemoveButton();
  if (btn) {
    btn.hidden = true;
    btn.dataset.targetReady = '';
  }
  window.__rakAdminRotationSelectedInput = null;
}

function adminRemoveSelectedRotationName() {
  const input = window.__rakAdminRotationSelectedInput;
  if (!input || !input.isConnected) {
    adminHideRotationSelectedRemove();
    return;
  }
  input.value = '';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  try { input.focus({ preventScroll: true }); } catch (err) { try { input.focus(); } catch (err2) {} }
  adminHideRotationSelectedRemove();
  const status = document.getElementById('adminRotationDraftStatus');
  if (status) status.textContent = 'Jméno odebrané z rozepsané tabulky. Nezapomeň dát Uložit rozpis.';
}

function adminRotationIsRemoveValue(value) {
  const v = String(value || '').trim().toLowerCase();
  return v === 'dát pryč' || v === 'dat pryc' || v === 'pryč' || v === 'pryc' || v === 'odebrat' || v === 'remove';
}

try {
  window.adminRotationOvertimeGetShiftInfoForIsoDate = adminRotationOvertimeGetShiftInfoForIsoDate;
  window.adminRotationOvertimeSetShiftFilter = adminRotationOvertimeSetShiftFilter;
  window.adminRotationRefreshOvertimeShiftBadges = adminRotationRefreshOvertimeShiftBadges;
} catch (err) {}

try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('admin-rotation.js', 'loaded', { source: 'dynamic-loader' }); } catch (err) {}
