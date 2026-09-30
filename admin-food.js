// RaK 1.2 (1.155) – Administrace Kantýna/jídelna oddělená z hlavního UI modulu.
try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('admin-food.js', 'loaded', { source: 'dynamic-loader' }); } catch (err) {}

function adminFoodIsoToCzechDate(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return raw;
  return String(Number(match[3])) + '.' + String(Number(match[2])) + '.' + match[1];
}

function adminFoodIsValidDateParts(day, month, year) {
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return false;
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function adminFoodNormalizeDateInput(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const compact = raw.replace(/[^\d]/g, '');
  let day = null;
  let month = null;
  let year = null;
  if (/^\d{8}$/.test(compact)) {
    day = Number(compact.slice(0, 2));
    month = Number(compact.slice(2, 4));
    year = Number(compact.slice(4, 8));
  } else if (/^\d{6}$/.test(compact)) {
    day = Number(compact.slice(0, 2));
    month = Number(compact.slice(2, 4));
    year = 2000 + Number(compact.slice(4, 6));
  }
  if (adminFoodIsValidDateParts(day, month, year)) {
    return String(day) + '.' + String(month) + '.' + String(year);
  }
  return raw;
}
try { window.adminFoodNormalizeDateInput = adminFoodNormalizeDateInput; } catch (err) {}

function adminFoodCzechDateToIso(value) {
  const raw = adminFoodNormalizeDateInput(value);
  if (!raw) return '';
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    if (adminFoodIsValidDateParts(day, month, year)) return String(year) + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  }
  const cz = raw.match(/^(\d{1,2})\s*[.]\s*(\d{1,2})\s*[.]\s*(\d{4})\s*[.]?$/);
  if (!cz) return '';
  const day = Number(cz[1]);
  const month = Number(cz[2]);
  const year = Number(cz[3]);
  if (!adminFoodIsValidDateParts(day, month, year)) return '';
  return String(year) + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}

function adminFoodTodayIso() {
  const now = new Date();
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
}

function adminFoodWindowTextHasValidRanges(value) {
  const raw = String(value || '').trim();
  if (!raw) return false;
  const normalized = raw.replace(/[–—]/g, '-');
  const ranges = normalized.split(/[,;]+/).map((item) => item.trim()).filter(Boolean);
  if (!ranges.length) return false;
  return ranges.every((range) => /^([01]?\d|2[0-3]):[0-5]\d\s*-\s*([01]?\d|2[0-3]):[0-5]\d$/.test(range));
}

function adminFoodRefreshStatus() {}

function makeAdminFoodScheduleSettingsRow(foodSettings) {
  const settings = foodSettings && typeof foodSettings === 'object' ? foodSettings : { type: 'food_schedule', regular: {}, overtime: {}, overtimeDates: [] };
  return {
    machine_key: 'FOOD_SCHEDULE_SETTINGS',
    machine_code: 'FOOD',
    machine_index: 'schedule',
    label: 'Kantýna / jídelna',
    category: 'food_schedule',
    cycle_time: '',
    speed: '',
    dress_time: '',
    dress_count: '',
    settings_json: Object.assign({ machine: 'FOOD', index: 'schedule' }, settings)
  };
}

function adminIsFoodScheduleRow(row) {
  return String(row && row.category || '').trim() === 'food_schedule' || String(row && row.machine_key || '').trim() === 'FOOD_SCHEDULE_SETTINGS';
}

function adminVacationSlugify(value, fallback) {
  const slug = String(value || '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || String(fallback || 'dovolena');
}

function adminVacationFormatInputDateTime(value) {
  if (typeof formatVacationCountdownDateTime === 'function') return formatVacationCountdownDateTime(value);
  const date = value instanceof Date ? value : new Date(String(value || '').replace('T', ' '));
  if (Number.isNaN(date.getTime())) return '';
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0') + 'T' + String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
}

function makeAdminVacationCountdownSettingsRow(vacationSettings) {
  const settings = vacationSettings && typeof vacationSettings === 'object' ? vacationSettings : { type: 'vacation_countdown_settings', periods: [] };
  return {
    machine_key: 'VACATION_COUNTDOWN_SETTINGS',
    machine_code: 'VACATION',
    machine_index: 'countdown',
    label: 'Dovolena / odstavky',
    category: 'vacation_countdown_settings',
    cycle_time: '',
    speed: '',
    dress_time: '',
    dress_count: '',
    settings_json: Object.assign({ machine: 'VACATION', index: 'countdown' }, settings)
  };
}

function adminIsVacationCountdownSettingsRow(row) {
  return String(row && row.category || '').trim() === 'vacation_countdown_settings'
    || String(row && row.machine_key || '').trim() === 'VACATION_COUNTDOWN_SETTINGS';
}

function mergeAdminVacationCountdownSettingsRows(vacationSettings) {
  const base = Array.isArray(app.machineSettingsRows) ? app.machineSettingsRows : [];
  const rows = base.filter((row) => !adminIsVacationCountdownSettingsRow(row));
  rows.push(makeAdminVacationCountdownSettingsRow(vacationSettings));
  return rows;
}

function mergeAdminFoodScheduleSettingsRows(foodSettings) {
  const base = Array.isArray(app.machineSettingsRows) ? app.machineSettingsRows : [];
  const rows = base.filter((row) => !adminIsFoodScheduleRow(row));
  rows.push(makeAdminFoodScheduleSettingsRow(foodSettings));
  return rows;
}

function adminVacationStatusNow() {
  return new Date();
}

function adminVacationNormalizePeriodForStatus(period) {
  const src = period && typeof period === 'object' ? period : {};
  const label = String(src.label || src.name || '').trim();
  const start = src.start instanceof Date ? src.start : (typeof parseVacationCountdownDateTime === 'function' ? parseVacationCountdownDateTime(src.start || src.startText || '') : new Date(String(src.start || '').replace('T', ' ')));
  const end = src.end instanceof Date ? src.end : (typeof parseVacationCountdownDateTime === 'function' ? parseVacationCountdownDateTime(src.end || src.endText || '') : new Date(String(src.end || '').replace('T', ' ')));
  if (!label || !(start instanceof Date) || !(end instanceof Date) || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return {
    label,
    countdownLabel: String(src.countdownLabel || src.countdown_label || label).trim(),
    workLabel: String(src.workLabel || src.work_label || label).trim(),
    start,
    end
  };
}

function adminVacationReadPeriodsFromRoot(root) {
  const scope = root || document.getElementById('appMenuBody') || document;
  const rows = scope.querySelectorAll ? scope.querySelectorAll('tr[data-vacation-period-row]') : [];
  const periods = [];
  rows.forEach((tr) => {
    const label = String(tr.querySelector('[data-vacation-field="label"]')?.value || '').trim();
    const start = String(tr.querySelector('[data-vacation-field="start"]')?.value || '').trim();
    const end = String(tr.querySelector('[data-vacation-field="end"]')?.value || '').trim();
    const normalized = adminVacationNormalizePeriodForStatus({ label, start, end });
    if (normalized) periods.push(normalized);
  });
  return periods.sort((a, b) => a.start.getTime() - b.start.getTime());
}

function adminVacationFormatStatusDateTime(value) {
  const date = value instanceof Date ? value : adminVacationNormalizePeriodForStatus({ label: 'x', start: value, end: value })?.start;
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return String(date.getDate()) + '.' + String(date.getMonth() + 1) + '.' + date.getFullYear() + ' ' + String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
}

function adminVacationFormatDurationDays(start, end) {
  if (!(start instanceof Date) || !(end instanceof Date) || end <= start) return '';
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  return String(days) + ' ' + (days === 1 ? 'den' : (days >= 2 && days <= 4 ? 'dny' : 'dní'));
}

function adminVacationStatusItemHtml(label, value, detail, state) {
  const safeState = state || 'ok';
  return [
    '<div class="adminVacationStatusItem is' + escapeHtml(safeState.charAt(0).toUpperCase() + safeState.slice(1)) + '">',
    '  <span>' + escapeHtml(label || '') + '</span>',
    '  <b>' + escapeHtml(value || '') + '</b>',
    detail ? '  <small>' + escapeHtml(detail) + '</small>' : '',
    '</div>'
  ].join('');
}

function buildAdminVacationCountdownStatusHtml(periods) {
  const now = adminVacationStatusNow();
  const list = (Array.isArray(periods) ? periods : []).map(adminVacationNormalizePeriodForStatus).filter(Boolean);
  const validPeriods = list.filter((period) => period.end > period.start);
  const active = validPeriods.find((period) => now >= period.start && now < period.end) || null;
  const future = validPeriods.filter((period) => period.start > now);
  const nearest = future[0] || null;
  const invalidOrder = list.filter((period) => period.end <= period.start).length;
  const target = active || nearest;
  let shiftText = '';
  if (target && !active && typeof getVacationCountdownTeamShiftCount === 'function') {
    const count = getVacationCountdownTeamShiftCount(now, target.start, 'D');
    shiftText = typeof formatVacationCountdownShiftCountValue === 'function'
      ? formatVacationCountdownShiftCountValue(count)
      : String(Math.max(0, Math.round(count))) + ' směn';
  }
  const items = [
    {
      label: 'Období',
      value: String(list.length) + '×',
      detail: invalidOrder ? ('Zkontroluj pořadí od-do: ' + String(invalidOrder) + '×.') : 'Prázdné řádky se neukládají.',
      state: list.length && !invalidOrder ? 'ok' : 'warn'
    },
    {
      label: active ? 'Aktivní teď' : 'Nejbližší',
      value: target ? target.label : 'není',
      detail: target ? (adminVacationFormatStatusDateTime(target.start) + ' - ' + adminVacationFormatStatusDateTime(target.end)) : 'Doplň nejbližší dovolenou nebo odstávku.',
      state: target ? 'ok' : 'warn'
    },
    {
      label: 'Délka',
      value: target ? adminVacationFormatDurationDays(target.start, target.end) : '—',
      detail: active ? 'Během aktivního období se směna bere jako volno.' : 'Home karta bere nejbližší nadcházející období.',
      state: target ? 'ok' : 'warn'
    },
    {
      label: 'Směna D',
      value: active ? '0 směn' : (shiftText || '—'),
      detail: active ? 'Období právě běží.' : 'Počítá se z rozpisu, pokud je měsíc vytvořený, jinak z rotačního cyklu.',
      state: target ? 'ok' : 'info'
    }
  ];
  return [
    '<details class="appMenuFoldSection adminVacationStatus" id="adminVacationStatus">',
    '  <summary class="appMenuSubTitle">Stav dovolené / odstávek</summary>',
    '  <div class="smallText uMb10">Souhrn vychází z řádků níže a ukazuje, co uvidí home panel Dovolená.</div>',
    '  <div class="adminVacationStatusGrid">',
    items.map((item) => adminVacationStatusItemHtml(item.label, item.value, item.detail, item.state)).join(''),
    '  </div>',
    '</details>'
  ].join('');
}

function adminVacationRefreshStatus(root) {
  const scope = root || document.getElementById('appMenuBody') || document;
  const box = scope.querySelector ? scope.querySelector('#adminVacationStatus') : null;
  if (!box) return;
  const wasOpen = !!(box.hasAttribute && box.hasAttribute('open'));
  const wrap = document.createElement('div');
  wrap.innerHTML = buildAdminVacationCountdownStatusHtml(adminVacationReadPeriodsFromRoot(scope));
  const next = wrap.firstElementChild;
  if (next) {
    if (wasOpen && next.setAttribute) next.setAttribute('open', '');
    box.replaceWith(next);
  }
}

function adminVacationPeriodRowHtml(period) {
  const safe = period && typeof period === 'object' ? period : {};
  const label = String(safe.label || safe.name || '').trim();
  const key = String(safe.key || '').trim();
  const countdownLabel = String(safe.countdownLabel || safe.countdown_label || label || '').trim();
  const workLabel = String(safe.workLabel || safe.work_label || label || '').trim();
  const start = adminVacationFormatInputDateTime(safe.startText || safe.start || '');
  const end = adminVacationFormatInputDateTime(safe.endText || safe.end || '');
  return [
    '<tr data-vacation-period-row data-vacation-key="' + escapeHtml(key) + '" data-vacation-countdown-label="' + escapeHtml(countdownLabel) + '" data-vacation-work-label="' + escapeHtml(workLabel) + '">',
    '  <td><input class="appMenuInlineInput adminVacationNameInput" data-vacation-field="label" value="' + escapeHtml(label) + '" placeholder="CZD"></td>',
    '  <td><input class="appMenuInlineInput adminVacationDateTimeInput" data-vacation-field="start" type="datetime-local" value="' + escapeHtml(start) + '"></td>',
    '  <td><input class="appMenuInlineInput adminVacationDateTimeInput" data-vacation-field="end" type="datetime-local" value="' + escapeHtml(end) + '"></td>',
    '</tr>'
  ].join('');
}

function buildAdminVacationCountdownSettingsHtml() {
  const snapshot = (typeof getVacationCountdownAdminSettingsSnapshot === 'function') ? getVacationCountdownAdminSettingsSnapshot() : { periods: [] };
  const periods = snapshot && Array.isArray(snapshot.periods) ? snapshot.periods : [];
  const currentYear = new Date().getFullYear();
  const yearSet = new Set([String(currentYear)]);
  periods.forEach((period) => {
    const match = String(period && (period.startText || period.start) || '').trim().match(/^(\d{4})-/);
    if (match) yearSet.add(match[1]);
  });
  const years = Array.from(yearSet).sort();
  const groups = years.map((year) => {
    const yearPeriods = periods.filter((period) => String(period && (period.startText || period.start) || '').trim().startsWith(year + '-'));
    const rows = yearPeriods.map(adminVacationPeriodRowHtml);
    for (let i = 0; i < 4; i += 1) rows.push(adminVacationPeriodRowHtml({}));
    const yearNumber = Number(year);
    const openAttr = Number.isFinite(yearNumber) && yearNumber >= currentYear ? ' open' : '';
    return [
      '<details class="appMenuFoldSection adminVacationCountdownYear"' + openAttr + '>',
      '  <summary>Rok ' + escapeHtml(year) + ' <span class="smallText">' + String(yearPeriods.length) + '×</span></summary>',
      '  <div class="tableWrap appMenuTableWrap">',
      '    <table class="appMenuTable appMenuAdminTable appMenuAdminTableDense adminVacationCountdownTable">',
      '      <colgroup><col class="adminVacationNameCol"><col class="adminVacationStartCol"><col class="adminVacationEndCol"></colgroup>',
      '      <thead><tr><th>Název</th><th>Od</th><th>Do</th></tr></thead>',
      '      <tbody>' + rows.join('') + '</tbody>',
      '    </table>',
      '  </div>',
      '</details>'
    ].join('');
  }).join('');
  return [
    buildAdminVacationCountdownStatusHtml(periods),
    '<div class="smallText uMb10">Nový rok se objeví sám, jakmile zadáš a uložíš období s jeho datem – nic se pro to v appce nemusí měnit.</div>',
    groups
  ].join('');
}

function readAdminVacationCountdownSettingsFromDom() {
  const periods = [];
  document.querySelectorAll('#appMenuBody tr[data-vacation-period-row]').forEach((tr, index) => {
    const label = String(tr.querySelector('[data-vacation-field="label"]')?.value || '').trim();
    const start = String(tr.querySelector('[data-vacation-field="start"]')?.value || '').trim();
    const end = String(tr.querySelector('[data-vacation-field="end"]')?.value || '').trim();
    if (!label || !start || !end) return;
    const existingKey = String(tr.getAttribute('data-vacation-key') || '').trim();
    const key = existingKey || (adminVacationSlugify(label, 'dovolena') + '-' + String(index + 1));
    const existingCountdownLabel = String(tr.getAttribute('data-vacation-countdown-label') || '').trim();
    const existingWorkLabel = String(tr.getAttribute('data-vacation-work-label') || '').trim();
    periods.push({
      key,
      label,
      countdownLabel: existingCountdownLabel || label,
      workLabel: existingWorkLabel || label,
      start,
      end
    });
  });
  periods.sort((a, b) => String(a.start || '').localeCompare(String(b.start || '')));
  return { type: 'vacation_countdown_settings', periods };
}

function buildAdminFoodScheduleSettingsHtml() {
  const snapshot = (typeof getFoodAdminSettingsSnapshot === 'function') ? getFoodAdminSettingsSnapshot() : null;
  const locations = snapshot && Array.isArray(snapshot.locations) ? snapshot.locations : [];
  if (!locations.length) return '';
  const dayRows = [];
  locations.forEach((location) => {
    (Array.isArray(location.regular) ? location.regular : []).forEach((day) => {
      dayRows.push([
        '<tr data-food-regular-row data-food-location="' + escapeHtml(location.key) + '" data-food-day="' + escapeHtml(String(day.dayIndex)) + '">',
        '  <td>' + escapeHtml(location.label) + '</td>',
        '  <td>' + escapeHtml(day.dayLabel) + '</td>',
        '  <td><input class="appMenuInlineInput adminFoodWindowsInput" data-food-schedule-field data-food-regular-field="windows" value="' + escapeHtml(day.windowsText || '') + '" placeholder="05:30–09:00, 10:00–12:00"></td>',
        '</tr>'
      ].join(''));
    });
  });
  const overtimeRows = locations.map((location) => [
    '<tr data-food-overtime-row data-food-location="' + escapeHtml(location.key) + '">',
    '  <td>' + escapeHtml(location.label) + '</td>',
    '  <td><input class="appMenuInlineInput adminFoodWindowsInput" data-food-schedule-field data-food-overtime-field="windows" value="' + escapeHtml(location.overtimeText || '') + '" placeholder="17:30–21:00, 21:30–23:30"></td>',
    '</tr>'
  ].join('')).join('');
  return [
    '<div class="adminFoodCompactSections">',
    '  <details class="adminFoodFold">',
    '    <summary>Běžná otevírací doba</summary>',
    '    <div class="adminFoodFoldBody">',
    '      <div class="smallText adminFoodHint">Více intervalů odděl čárkou, např. 05:30–09:00, 10:00–12:00.</div>',
    '      <div class="tableWrap appMenuTableWrap adminFoodTableWrap">',
    '        <table class="appMenuTable appMenuAdminTable appMenuAdminTableDense adminFoodScheduleTable adminFoodRegularTable">',
    '          <colgroup><col class="adminFoodColPlace"><col class="adminFoodColDay"><col class="adminFoodColTime"></colgroup>',
    '          <thead><tr><th>Místo</th><th>Den</th><th>Časy</th></tr></thead>',
    '          <tbody>' + dayRows.join('') + '</tbody>',
    '        </table>',
    '      </div>',
    '    </div>',
    '  </details>',
    '  <details class="adminFoodFold">',
    '    <summary>Přesčasová doba</summary>',
    '    <div class="adminFoodFoldBody">',
    '      <div class="smallText adminFoodHint">Přesčasové neděle se vybírají v Provoz / Přesčasy.</div>',
    '      <div class="tableWrap appMenuTableWrap adminFoodTableWrap">',
    '        <table class="appMenuTable appMenuAdminTable appMenuAdminTableDense adminFoodScheduleTable adminFoodOvertimeTable">',
    '          <colgroup><col class="adminFoodColPlace"><col class="adminFoodColTime"></colgroup>',
    '          <thead><tr><th>Místo</th><th>Časy při přesčasu</th></tr></thead>',
    '          <tbody>' + overtimeRows + '</tbody>',
    '        </table>',
    '      </div>',
    '    </div>',
    '  </details>',
    '</div>'
  ].join('');
}

function readAdminFoodScheduleSettingsFromDom() {
  const regular = {};
  document.querySelectorAll('#appMenuBody tr[data-food-regular-row]').forEach((tr) => {
    const location = String(tr.getAttribute('data-food-location') || '').trim();
    const day = String(tr.getAttribute('data-food-day') || '').trim();
    const value = String(tr.querySelector('[data-food-regular-field="windows"]')?.value || '').trim();
    if (!location || !day) return;
    if (!regular[location]) regular[location] = {};
    regular[location][day] = value;
  });
  const overtime = {};
  document.querySelectorAll('#appMenuBody tr[data-food-overtime-row]').forEach((tr) => {
    const location = String(tr.getAttribute('data-food-location') || '').trim();
    const value = String(tr.querySelector('[data-food-overtime-field="windows"]')?.value || '').trim();
    if (!location) return;
    overtime[location] = value;
  });
  // Seznam prescasovych nedeli uz tahle obrazovka needituje (viz Provoz / Prescasy),
  // takze puvodni ulozeny seznam se pri ukladani jen prenese beze zmeny.
  const existingSnapshot = (typeof getFoodAdminSettingsSnapshot === 'function') ? getFoodAdminSettingsSnapshot() : null;
  const overtimeDates = Array.isArray(existingSnapshot && existingSnapshot.dates) ? existingSnapshot.dates.slice() : [];
  return { type: 'food_schedule', regular, overtime, overtimeDates };
}
