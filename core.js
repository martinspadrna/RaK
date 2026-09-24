// RaK 1.5 – core stav, verze a sdílené helpery aplikace.

const APP_KEY = "rotace_kalkulacky_state_v123";
const APP_VERSION = "1.5";
window.APP_VERSION = APP_VERSION;
const ROTATION_BUILD = "2026-06-03-" + APP_VERSION;
window.ROTATION_BUILD = ROTATION_BUILD;

const HARD_MACHINE_HEADERS = ["TNKS01", "TBKR07", "TPKW01", "TPKW02", "TBKR01"];
const SOFT_MACHINE_HEADERS = ["MSKC01", "MSKC03", "MSKC04", "MFKF06", "MFKF10"];

const KNOWN_STAT_NAMES = new Set(["Blažek", "Kmínek", "Kříž", "Novotný", "Pech", "Starý", "Střížek", "Synek", "Třasák", "Špadrna"]);


const NO_START_HOLIDAYS = new Set(["1-1", "5-1", "5-8", "7-5", "7-6", "9-28", "10-17", "10-28", "12-24", "12-25", "12-26"]);

function dateKeyMD(date) {
  return (date.getMonth() + 1) + "-" + date.getDate();
}

const SPECIAL_OVERTIME_SUNDAY_NIGHTS_2025 = new Set([
  "2025-01-12",
  "2025-01-26",
  "2025-02-16",
  "2025-03-02",
  "2025-03-16",
  "2025-03-30",
  "2025-10-05",
  "2025-10-19",
  "2025-11-09",
  "2025-11-23",
  "2025-11-30",
  "2025-12-14"
]);
window.SPECIAL_OVERTIME_SUNDAY_NIGHTS_2025 = SPECIAL_OVERTIME_SUNDAY_NIGHTS_2025;

const SPECIAL_OVERTIME_SUNDAY_NIGHTS_2026 = new Set([
  "2026-01-11",
  "2026-01-18",
  "2026-01-25",
  "2026-02-08",
  "2026-02-15",
  "2026-03-01",
  "2026-03-08",
  "2026-03-15",
  "2026-03-22",
  "2026-03-29",
  "2026-04-12",
  "2026-04-19",
  "2026-05-17",
  "2026-05-24",
  "2026-05-31",
  "2026-06-07",
  "2026-06-14",
  "2026-06-21",
  "2026-09-13",
  "2026-09-20",
  "2026-10-04",
  "2026-10-11",
  "2026-10-18",
  "2026-11-22"
]);
window.SPECIAL_OVERTIME_SUNDAY_NIGHTS_2026 = SPECIAL_OVERTIME_SUNDAY_NIGHTS_2026;

// Přesčasové neděle jsou v drtivé většině TO/tvrdota. Výjimky, kdy byl přesčas jen na MO,
// nesmí půlit TNKS01/TPKW01 ve statistikách ani exportu.
const SPECIAL_OVERTIME_MO_ONLY_SUNDAYS_2026 = new Set(["2026-03-01"]);
window.SPECIAL_OVERTIME_MO_ONLY_SUNDAYS_2026 = SPECIAL_OVERTIME_MO_ONLY_SUNDAYS_2026;

const ROTATION_OVERTIME_SETTINGS_MACHINE_KEY = 'ROTATION_OVERTIME_SETTINGS';
const ROTATION_OVERTIME_SETTINGS_CATEGORY = 'rotation_overtime_settings';
window.ROTATION_OVERTIME_SETTINGS_MACHINE_KEY = ROTATION_OVERTIME_SETTINGS_MACHINE_KEY;
window.ROTATION_OVERTIME_SETTINGS_CATEGORY = ROTATION_OVERTIME_SETTINGS_CATEGORY;

const VACATION_COUNTDOWN_SETTINGS_MACHINE_KEY = 'VACATION_COUNTDOWN_SETTINGS';
const VACATION_COUNTDOWN_SETTINGS_CATEGORY = 'vacation_countdown_settings';
window.VACATION_COUNTDOWN_SETTINGS_MACHINE_KEY = VACATION_COUNTDOWN_SETTINGS_MACHINE_KEY;
window.VACATION_COUNTDOWN_SETTINGS_CATEGORY = VACATION_COUNTDOWN_SETTINGS_CATEGORY;

const RAK_SPECIAL_DAYS_SETTINGS_KEY = 'SPECIAL_DAYS_SETTINGS';
const RAK_SPECIAL_DAYS_SETTINGS_CATEGORY = 'special_days_settings';
window.RAK_SPECIAL_DAYS_SETTINGS_KEY = RAK_SPECIAL_DAYS_SETTINGS_KEY;
window.RAK_SPECIAL_DAYS_SETTINGS_CATEGORY = RAK_SPECIAL_DAYS_SETTINGS_CATEGORY;

function dateKeyISO(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function parseRotationOvertimeSettingsJson(value) {
  if (value && typeof value === 'object') return value;
  if (!value) return {};
  try { return JSON.parse(String(value)); } catch (err) { return {}; }
}

function isValidRotationOvertimeIsoDate(value) {
  const raw = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  const date = new Date(raw + 'T00:00:00');
  return !Number.isNaN(date.getTime()) && dateKeyISO(date) === raw;
}

function getRotationOvertimeSettingsRow() {
  const rows = (typeof app !== 'undefined' && app && Array.isArray(app.machineSettingsRows)) ? app.machineSettingsRows : [];
  return rows.find((row) => String(row && row.category || '').trim() === ROTATION_OVERTIME_SETTINGS_CATEGORY)
    || rows.find((row) => String(row && row.machine_key || '').trim() === ROTATION_OVERTIME_SETTINGS_MACHINE_KEY)
    || null;
}

function hasRotationOvertimeCustomSettings() {
  return !!getRotationOvertimeSettingsRow();
}

function normalizeRotationOvertimeEntry(item) {
  const src = item && typeof item === 'object' ? item : { date: item };
  const date = String(src.date || src.iso || src.day || '').trim();
  if (!isValidRotationOvertimeIsoDate(date)) return null;
  const rawTo = src.to ?? src.isTo ?? src.hard ?? src.hardOvertime ?? src.splitPress;
  const to = rawTo === false || rawTo === 0 || rawTo === '0' || /^false|ne|no|mo$/i.test(String(rawTo || '').trim()) ? false : true;
  return {
    date,
    to,
    note: String(src.note || src.label || '').trim()
  };
}

const ROTATION_OVERTIME_DEFAULT_SEED_VERSION = 129;
window.ROTATION_OVERTIME_DEFAULT_SEED_VERSION = ROTATION_OVERTIME_DEFAULT_SEED_VERSION;

function getRotationOvertimeDefaultDateList() {
  const dates = new Set();
  try { SPECIAL_OVERTIME_SUNDAY_NIGHTS_2025.forEach((date) => dates.add(date)); } catch (err) {}
  try { SPECIAL_OVERTIME_SUNDAY_NIGHTS_2026.forEach((date) => dates.add(date)); } catch (err) {}
  try {
    if (typeof window !== 'undefined' && typeof window.getFoodSpecialDateSet === 'function') {
      const foodSet = window.getFoodSpecialDateSet();
      if (foodSet && typeof foodSet.forEach === 'function') foodSet.forEach((date) => {
        const safe = String(date || '').trim();
        if (safe) dates.add(safe);
      });
    }
  } catch (err) {}
  return Array.from(dates).filter(isValidRotationOvertimeIsoDate).sort();
}

function getDefaultRotationOvertimeEntries() {
  return getRotationOvertimeDefaultDateList().map((date) => ({
    date,
    to: !SPECIAL_OVERTIME_MO_ONLY_SUNDAYS_2026.has(date),
    note: SPECIAL_OVERTIME_MO_ONLY_SUNDAYS_2026.has(date) ? 'Jen MO' : ''
  }));
}

function mergeRotationOvertimeDefaultSeedEntries(map, settings) {
  const currentSeed = Number(settings && (settings.defaultSeedVersion || settings.seedVersion || settings.default_seed_version));
  if (Number.isFinite(currentSeed) && currentSeed >= ROTATION_OVERTIME_DEFAULT_SEED_VERSION) return map;
  getDefaultRotationOvertimeEntries().forEach((entry) => {
    if (entry && entry.date && !map.has(entry.date)) map.set(entry.date, entry);
  });
  return map;
}

function getRotationOvertimeSettings() {
  const row = getRotationOvertimeSettingsRow();
  if (!row) return { type: ROTATION_OVERTIME_SETTINGS_CATEGORY, custom: false, entries: getDefaultRotationOvertimeEntries() };
  const settings = parseRotationOvertimeSettingsJson(row.settings_json);
  const rawEntries = Array.isArray(settings.entries)
    ? settings.entries
    : (Array.isArray(settings.overtimes) ? settings.overtimes : (Array.isArray(settings.dates) ? settings.dates : []));
  const map = new Map();
  rawEntries.forEach((item) => {
    const entry = normalizeRotationOvertimeEntry(item);
    if (entry) map.set(entry.date, entry);
  });
  mergeRotationOvertimeDefaultSeedEntries(map, settings);
  return {
    type: ROTATION_OVERTIME_SETTINGS_CATEGORY,
    custom: true,
    defaultSeedVersion: ROTATION_OVERTIME_DEFAULT_SEED_VERSION,
    entries: Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
  };
}

function getRotationOvertimeDateSet() {
  const settings = getRotationOvertimeSettings();
  return new Set((Array.isArray(settings.entries) ? settings.entries : []).map((entry) => entry.date).filter(Boolean));
}

function getRotationOvertimeMoOnlyDateSet() {
  const settings = getRotationOvertimeSettings();
  return new Set((Array.isArray(settings.entries) ? settings.entries : []).filter((entry) => entry && entry.to === false).map((entry) => entry.date).filter(Boolean));
}

function getRotationOvertimeToDateSet() {
  const settings = getRotationOvertimeSettings();
  return new Set((Array.isArray(settings.entries) ? settings.entries : []).filter((entry) => entry && entry.to !== false).map((entry) => entry.date).filter(Boolean));
}

function getSpecialOvertimeSundayNightDateSet() {
  // Od 1.129 se rozpisové přesčasy drží jako samostatný zdroj pravdy.
  // Pokud existuje starší/uživatelské nastavení kantýny, defaulty 2025/2026 se s ním jen sloučí
  // v getDefaultRotationOvertimeEntries(), aby historické roky ze správy přesčasů nevypadly.
  return getRotationOvertimeDateSet();
}

function isSpecialOvertimeSundayNight(date) {
  const d = date instanceof Date ? date : new Date(date);
  const set = getSpecialOvertimeSundayNightDateSet();
  return d.getDay() === 0 && !!(set && typeof set.has === 'function' && set.has(dateKeyISO(d)));
}

function isSpecialOvertimeSundayMoOnly(date) {
  const d = date instanceof Date ? date : new Date(date);
  const allSet = getSpecialOvertimeSundayNightDateSet();
  const moOnlySet = getRotationOvertimeMoOnlyDateSet();
  const key = dateKeyISO(d);
  return d.getDay() === 0
    && !!(allSet && typeof allSet.has === 'function' && allSet.has(key))
    && !!(moOnlySet && typeof moOnlySet.has === 'function' && moOnlySet.has(key));
}

function isSpecialOvertimeSundayTo(date) {
  const d = date instanceof Date ? date : new Date(date);
  const allSet = getSpecialOvertimeSundayNightDateSet();
  const toSet = getRotationOvertimeToDateSet();
  const key = dateKeyISO(d);
  return d.getDay() === 0
    && !!(allSet && typeof allSet.has === 'function' && allSet.has(key))
    && !!(toSet && typeof toSet.has === 'function' && toSet.has(key));
}
window.getRotationOvertimeSettings = getRotationOvertimeSettings;
window.getRotationOvertimeDateSet = getRotationOvertimeDateSet;
window.getRotationOvertimeMoOnlyDateSet = getRotationOvertimeMoOnlyDateSet;
window.getRotationOvertimeToDateSet = getRotationOvertimeToDateSet;
window.isSpecialOvertimeSundayMoOnly = isSpecialOvertimeSundayMoOnly;
window.isSpecialOvertimeSundayTo = isSpecialOvertimeSundayTo;

function getSpecialSundayNightStartHour(date, fallbackHour = 22) {
  return isSpecialOvertimeSundayNight(date) ? 18 : fallbackHour;
}

function isShiftStartBlocked(date) {
  return !!getSpecialWorkInfo(date);
}

function getEasterSundayDate(year) {
  const y = Number(year);
  if (!Number.isFinite(y) || y < 1900 || y > 2200) return null;
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day, 12, 0, 0, 0);
}

function getMovableHolidayInfo(now) {
  const source = now instanceof Date ? now : new Date(now || new Date());
  if (Number.isNaN(source.getTime())) return null;
  const easterSunday = getEasterSundayDate(source.getFullYear());
  if (!easterSunday) return null;
  const goodFriday = new Date(easterSunday);
  goodFriday.setDate(goodFriday.getDate() - 2);
  const easterMonday = new Date(easterSunday);
  easterMonday.setDate(easterMonday.getDate() + 1);
  const key = dateKeyISO(source);
  if (key === dateKeyISO(goodFriday)) return { type: "holiday", label: "Velký pátek" };
  if (key === dateKeyISO(easterMonday)) return { type: "holiday", label: "Velikonoční pondělí" };
  return null;
}

function rakSpecialDaysSettingsJson(row) {
  if (row && row.settings_json && typeof row.settings_json === 'object') return row.settings_json;
  try { return row && row.settings_json ? JSON.parse(String(row.settings_json)) : {}; }
  catch (err) { return {}; }
}

function isRakSpecialDaysSettingsRow(row) {
  const settings = rakSpecialDaysSettingsJson(row);
  return String(row && row.category || '').trim() === RAK_SPECIAL_DAYS_SETTINGS_CATEGORY
    || String(row && row.machine_key || '').trim() === RAK_SPECIAL_DAYS_SETTINGS_KEY
    || String(settings && settings.stored_category || '').trim() === RAK_SPECIAL_DAYS_SETTINGS_CATEGORY
    || String(settings && settings.admin_settings_key || '').trim() === RAK_SPECIAL_DAYS_SETTINGS_KEY;
}

function isRakSpecialDayIsoDate(value) {
  const raw = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  const date = new Date(raw + 'T00:00:00');
  return !Number.isNaN(date.getTime()) && dateKeyISO(date) === raw;
}

function normalizeRakSpecialDayEntry(entry) {
  const source = entry && typeof entry === 'object' ? entry : {};
  const date = String(source.date || source.iso || source.day || '').trim();
  if (!isRakSpecialDayIsoDate(date)) return null;
  const rawType = String(source.type || source.kind || 'shutdown').trim().toLowerCase();
  const type = rawType === 'holiday' || rawType === 'volno' || rawType === 'free' ? 'holiday' : 'shutdown';
  const label = String(source.label || source.name || (type === 'holiday' ? 'Volno' : 'Odstávka')).trim();
  return { date, type, label };
}

function normalizeRakSpecialDaysSettings(settings) {
  const raw = settings && typeof settings === 'object' ? settings : {};
  const source = raw.specialDays && typeof raw.specialDays === 'object' ? raw.specialDays : raw;
  const seen = new Set();
  const days = (Array.isArray(source.days) ? source.days : (Array.isArray(source.entries) ? source.entries : []))
    .map(normalizeRakSpecialDayEntry)
    .filter(Boolean)
    .filter((entry) => {
      if (seen.has(entry.date)) return false;
      seen.add(entry.date);
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  return {
    type: RAK_SPECIAL_DAYS_SETTINGS_CATEGORY,
    days
  };
}

function getRakSpecialDaysSettings() {
  const rows = (typeof app !== 'undefined' && app && Array.isArray(app.machineSettingsRows)) ? app.machineSettingsRows : [];
  const row = rows.find(isRakSpecialDaysSettingsRow);
  return normalizeRakSpecialDaysSettings(row ? rakSpecialDaysSettingsJson(row) : null);
}

function getRakSpecialDayInfo(now) {
  const date = now instanceof Date ? now : new Date(now || new Date());
  if (Number.isNaN(date.getTime())) return null;
  const iso = dateKeyISO(date);
  const settings = getRakSpecialDaysSettings();
  const entry = (settings.days || []).find((day) => day.date === iso) || null;
  if (!entry) return null;
  return { type: entry.type || 'shutdown', label: entry.label || 'Odstávka' };
}

function makeRakSpecialDaysSettingsRow(settings) {
  const safe = normalizeRakSpecialDaysSettings(settings);
  return {
    machine_key: RAK_SPECIAL_DAYS_SETTINGS_KEY,
    machine_code: 'APP',
    machine_index: 'special-days',
    label: 'Mimořádné volné dny',
    category: RAK_SPECIAL_DAYS_SETTINGS_CATEGORY,
    cycle_time: '',
    speed: '',
    dress_time: '',
    dress_count: '',
    settings_json: Object.assign({ machine: 'APP', index: 'special-days' }, safe)
  };
}

function mergeRakSpecialDaysSettingsRows(settings) {
  const base = Array.isArray(app && app.machineSettingsRows) ? app.machineSettingsRows : [];
  const rows = base.filter((row) => !isRakSpecialDaysSettingsRow(row));
  rows.push(makeRakSpecialDaysSettingsRow(settings));
  return rows;
}

const RAK_CALENDAR_NOTES_SETTINGS_KEY = 'CALENDAR_NOTES_SETTINGS';
const RAK_CALENDAR_NOTES_SETTINGS_CATEGORY = 'calendar_notes_settings';
const RAK_CALENDAR_NOTE_DEFS = [
  { id: 'mondayBurn', label: 'Pondělí – Brusy: spálení' },
  { id: 'firstMorningRivet', label: 'První ranní v měsíci – Roznýtování laborka' }
];
window.RAK_CALENDAR_NOTES_SETTINGS_KEY = RAK_CALENDAR_NOTES_SETTINGS_KEY;
window.RAK_CALENDAR_NOTES_SETTINGS_CATEGORY = RAK_CALENDAR_NOTES_SETTINGS_CATEGORY;
window.RAK_CALENDAR_NOTE_DEFS = RAK_CALENDAR_NOTE_DEFS;

function rakCalendarNotesSettingsJson(row) {
  if (row && row.settings_json && typeof row.settings_json === 'object') return row.settings_json;
  try { return row && row.settings_json ? JSON.parse(String(row.settings_json)) : {}; }
  catch (err) { return {}; }
}

function isRakCalendarNotesSettingsRow(row) {
  return String(row && row.category || '').trim() === RAK_CALENDAR_NOTES_SETTINGS_CATEGORY
    || String(row && row.machine_key || '').trim() === RAK_CALENDAR_NOTES_SETTINGS_KEY;
}

function normalizeRakCalendarNotesSettings(settings) {
  const raw = settings && typeof settings === 'object' ? settings : {};
  const prefs = {};
  RAK_CALENDAR_NOTE_DEFS.forEach((def) => { prefs[def.id] = raw[def.id] !== false; });
  return prefs;
}

function getRakCalendarNotesSettings() {
  const rows = (typeof app !== 'undefined' && app && Array.isArray(app.machineSettingsRows)) ? app.machineSettingsRows : [];
  const row = rows.find(isRakCalendarNotesSettingsRow);
  return normalizeRakCalendarNotesSettings(row ? rakCalendarNotesSettingsJson(row) : null);
}

function makeRakCalendarNotesSettingsRow(settings) {
  const safe = normalizeRakCalendarNotesSettings(settings);
  return {
    machine_key: RAK_CALENDAR_NOTES_SETTINGS_KEY,
    machine_code: 'APP',
    machine_index: 'calendar-notes',
    label: 'Upozornění v kalendáři',
    category: RAK_CALENDAR_NOTES_SETTINGS_CATEGORY,
    cycle_time: '',
    speed: '',
    dress_time: '',
    dress_count: '',
    settings_json: Object.assign({ machine: 'APP', index: 'calendar-notes' }, safe)
  };
}

function mergeRakCalendarNotesSettingsRows(settings) {
  const base = Array.isArray(app && app.machineSettingsRows) ? app.machineSettingsRows : [];
  const rows = base.filter((row) => !isRakCalendarNotesSettingsRow(row));
  rows.push(makeRakCalendarNotesSettingsRow(settings));
  return rows;
}
window.getRakCalendarNotesSettings = getRakCalendarNotesSettings;

function rakSpecialDaysTodayIso() {
  return dateKeyISO(new Date());
}

function readRakSpecialDaysEntriesFromRoot(root) {
  const scope = root || document.getElementById('appMenuBody') || document;
  const entries = [];
  const seen = new Set();
  let duplicateCount = 0;
  if (!scope.querySelectorAll) return { days: [], duplicateCount: 0 };
  scope.querySelectorAll('tr[data-special-day-row]').forEach((tr) => {
    const get = (field) => String(tr.querySelector('[data-special-day-field="' + field + '"]')?.value || '').trim();
    const entry = normalizeRakSpecialDayEntry({
      date: get('date'),
      type: get('type'),
      label: get('label')
    });
    if (!entry) return;
    if (seen.has(entry.date)) {
      duplicateCount += 1;
      return;
    }
    seen.add(entry.date);
    entries.push(entry);
  });
  return {
    days: entries.sort((a, b) => a.date.localeCompare(b.date)),
    duplicateCount
  };
}

function rakSpecialDaysIsoToCzechDate(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return raw;
  return String(Number(match[3])) + '.' + String(Number(match[2])) + '.' + match[1];
}

function adminSpecialDaysStatusItemHtml(label, value, detail, state) {
  const safeState = state || 'ok';
  return [
    '<div class="adminSpecialDaysStatusItem is' + escapeHtml(safeState.charAt(0).toUpperCase() + safeState.slice(1)) + '">',
    '  <span>' + escapeHtml(label || '') + '</span>',
    '  <b>' + escapeHtml(value || '') + '</b>',
    detail ? '  <small>' + escapeHtml(detail) + '</small>' : '',
    '</div>'
  ].join('');
}

function buildAdminSpecialDaysStatusHtml(input) {
  const source = input && typeof input === 'object' && Array.isArray(input.days)
    ? input
    : { days: Array.isArray(input) ? input : [], duplicateCount: 0 };
  const todayIso = rakSpecialDaysTodayIso();
  const days = source.days.filter((entry) => entry && isRakSpecialDayIsoDate(entry.date || ''));
  const future = days.filter((entry) => String(entry.date || '') >= todayIso);
  const nearest = future[0] || null;
  const shutdownCount = days.filter((entry) => entry.type !== 'holiday').length;
  const holidayCount = days.length - shutdownCount;
  const duplicateCount = Number(source.duplicateCount || 0) || 0;
  const items = [
    {
      label: 'Zadané dny',
      value: String(days.length) + '×',
      detail: duplicateCount ? ('Duplicitní datumy se při uložení sloučí: ' + String(duplicateCount) + '×.') : 'Prázdné řádky se neukládají.',
      state: days.length && !duplicateCount ? 'ok' : (duplicateCount ? 'warn' : 'info')
    },
    {
      label: 'Budoucí',
      value: String(future.length) + '×',
      detail: future.length ? 'Budoucí volné dny ovlivní směny a generování.' : 'Žádný budoucí mimořádný den není zadaný.',
      state: future.length ? 'ok' : 'info'
    },
    {
      label: 'Nejbližší',
      value: nearest ? rakSpecialDaysIsoToCzechDate(nearest.date) : 'není',
      detail: nearest ? ((nearest.label || (nearest.type === 'holiday' ? 'Volno' : 'Odstávka')) + ' · ' + (nearest.type === 'holiday' ? 'Volno' : 'Odstávka')) : 'Doplň datum jen při mimořádné změně provozu.',
      state: nearest ? 'ok' : 'info'
    },
    {
      label: 'Typy',
      value: String(shutdownCount) + ' / ' + String(holidayCount),
      detail: 'Odstávky / volno. Vestavěné české svátky zůstávají automatické.',
      state: days.length ? 'ok' : 'info'
    }
  ];
  return [
    '<details class="appMenuFoldSection adminSpecialDaysStatus" id="adminSpecialDaysStatus">',
    '  <summary class="appMenuSubTitle">Stav mimořádných dnů</summary>',
    '  <div class="smallText uMb10">Souhrn vychází z řádků níže a pomáhá zkontrolovat jednorázové volno před uložením.</div>',
    '  <div class="adminSpecialDaysStatusGrid">',
    items.map((item) => adminSpecialDaysStatusItemHtml(item.label, item.value, item.detail, item.state)).join(''),
    '  </div>',
    '</details>'
  ].join('');
}

function adminSpecialDaysRefreshStatus(root) {
  const scope = root || document.getElementById('appMenuBody') || document;
  const box = scope.querySelector ? scope.querySelector('#adminSpecialDaysStatus') : null;
  if (!box) return;
  const wasOpen = !!(box.hasAttribute && box.hasAttribute('open'));
  const wrap = document.createElement('div');
  wrap.innerHTML = buildAdminSpecialDaysStatusHtml(readRakSpecialDaysEntriesFromRoot(scope));
  const next = wrap.firstElementChild;
  if (next) {
    if (wasOpen && next.setAttribute) next.setAttribute('open', '');
    box.replaceWith(next);
  }
}

function adminSpecialDayRowHtml(entry) {
  const safe = entry && typeof entry === 'object' ? entry : {};
  const type = String(safe.type || 'shutdown');
  return [
    '<tr data-special-day-row>',
    '  <td><input class="appMenuInlineInput" data-special-day-field="date" type="date" value="' + escapeHtml(safe.date || '') + '"></td>',
    '  <td><select class="appMenuInlineInput" data-special-day-field="type">',
    '    <option value="shutdown"' + (type === 'shutdown' ? ' selected' : '') + '>Odstávka</option>',
    '    <option value="holiday"' + (type === 'holiday' ? ' selected' : '') + '>Volno</option>',
    '  </select></td>',
    '  <td><input class="appMenuInlineInput" data-special-day-field="label" value="' + escapeHtml(safe.label || '') + '" placeholder="např. Odstávka"></td>',
    '</tr>'
  ].join('');
}

function buildAdminSpecialDaysSettingsHtml() {
  const settings = getRakSpecialDaysSettings();
  const days = Array.isArray(settings.days) ? settings.days : [];
  const currentYear = new Date().getFullYear();
  const yearSet = new Set([String(currentYear)]);
  days.forEach((entry) => {
    const match = String(entry && entry.date || '').trim().match(/^(\d{4})-/);
    if (match) yearSet.add(match[1]);
  });
  const years = Array.from(yearSet).sort();
  const groups = years.map((year) => {
    const yearDays = days.filter((entry) => String(entry && entry.date || '').trim().startsWith(year + '-'));
    const rows = yearDays.map(adminSpecialDayRowHtml);
    for (let i = 0; i < 4; i += 1) rows.push(adminSpecialDayRowHtml({}));
    const yearNumber = Number(year);
    const openAttr = Number.isFinite(yearNumber) && yearNumber >= currentYear ? ' open' : '';
    return [
      '<details class="appMenuFoldSection adminSpecialDaysYear"' + openAttr + '>',
      '  <summary>Rok ' + escapeHtml(year) + ' <span class="smallText">' + String(yearDays.length) + '×</span></summary>',
      '  <div class="tableWrap appMenuTableWrap">',
      '    <table class="appMenuTable appMenuAdminTable appMenuAdminTableDense adminSpecialDaysTable">',
      '      <colgroup><col class="adminSpecialDaysDateCol"><col class="adminSpecialDaysTypeCol"><col class="adminSpecialDaysNameCol"></colgroup>',
      '      <thead><tr><th>Datum</th><th>Typ</th><th>Název</th></tr></thead>',
      '      <tbody>' + rows.join('') + '</tbody>',
      '    </table>',
      '  </div>',
      '</details>'
    ].join('');
  }).join('');
  return [
    buildAdminSpecialDaysStatusHtml({ days, duplicateCount: 0 }),
    '<div class="smallText uMb10">Nový rok se objeví sám, jakmile zadáš a uložíš den s jeho datem – nic se pro to v appce nemusí měnit.</div>',
    groups
  ].join('');
}

function readAdminSpecialDaysSettingsFromDom() {
  const days = [];
  document.querySelectorAll('#appMenuBody tr[data-special-day-row]').forEach((tr) => {
    const get = (field) => String(tr.querySelector('[data-special-day-field="' + field + '"]')?.value || '').trim();
    const entry = normalizeRakSpecialDayEntry({
      date: get('date'),
      type: get('type'),
      label: get('label')
    });
    if (entry) days.push(entry);
  });
  return normalizeRakSpecialDaysSettings({ days });
}

const RAK_WORKER_ROSTER_SETTINGS_KEY = 'WORKER_ROSTER_SETTINGS';
const RAK_WORKER_ROSTER_SETTINGS_CATEGORY = 'worker_roster_settings';
window.RAK_WORKER_ROSTER_SETTINGS_KEY = RAK_WORKER_ROSTER_SETTINGS_KEY;
window.RAK_WORKER_ROSTER_SETTINGS_CATEGORY = RAK_WORKER_ROSTER_SETTINGS_CATEGORY;

function rakWorkerRosterSettingsJson(row) {
  if (row && row.settings_json && typeof row.settings_json === 'object') return row.settings_json;
  try { return row && row.settings_json ? JSON.parse(String(row.settings_json)) : {}; }
  catch (err) { return {}; }
}

function isRakWorkerRosterSettingsRow(row) {
  const settings = rakWorkerRosterSettingsJson(row);
  return String(row && row.category || '').trim() === RAK_WORKER_ROSTER_SETTINGS_CATEGORY
    || String(row && row.machine_key || '').trim() === RAK_WORKER_ROSTER_SETTINGS_KEY
    || String(settings && settings.stored_category || '').trim() === RAK_WORKER_ROSTER_SETTINGS_CATEGORY
    || String(settings && settings.admin_settings_key || '').trim() === RAK_WORKER_ROSTER_SETTINGS_KEY;
}

const RAK_WORKER_MACHINE_GROUPS = ['MSK', 'MFK', 'TNK', 'TBK', 'TPKW01', 'TPKW02'];
window.RAK_WORKER_MACHINE_GROUPS = RAK_WORKER_MACHINE_GROUPS;

function normalizeRakWorkerLoginNumber(value) {
  return String(value || '').trim().replace(/\D/g, '').slice(0, 4);
}

// RAK_ACTIVE_ROSTER_SOURCE_17007
function rakWorkerRosterActiveValue17007(entry) {
  if (!entry || typeof entry !== 'object') return true;
  const hasActive = Object.prototype.hasOwnProperty.call(entry, 'active');
  const hasEnabled = Object.prototype.hasOwnProperty.call(entry, 'enabled');
  const hasIsActive = Object.prototype.hasOwnProperty.call(entry, 'isActive');
  if (!hasActive && !hasEnabled && !hasIsActive) return true;
  const raw = hasActive ? entry.active : (hasEnabled ? entry.enabled : entry.isActive);
  if (raw === false || raw === 0 || raw === '0') return false;
  return !/^(?:false|ne|no|off|inactive)$/i.test(String(raw || '').trim());
}

function normalizeRakWorkerEntry(entry) {
  if (entry && typeof entry === 'string') {
    const name = entry.trim();
    return name ? { name, loginNumber: '', machines: [], active: true } : null;
  }
  if (!entry || typeof entry !== 'object') return null;
  const name = String(entry.name || '').trim();
  if (!name) return null;
  const loginNumber = normalizeRakWorkerLoginNumber(entry.loginNumber || entry.login_number || '');
  const machinesRaw = Array.isArray(entry.machines) ? entry.machines.map((m) => String(m || '').trim().toUpperCase()) : [];
  const machines = RAK_WORKER_MACHINE_GROUPS.filter((group) => machinesRaw.includes(group));
  return { name, loginNumber, machines, active: rakWorkerRosterActiveValue17007(entry) };
}

function normalizeRakApplicationAccountEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const name = String(entry.name || '').trim();
  const loginNumber = normalizeRakWorkerLoginNumber(entry.loginNumber || entry.login_number || '');
  if (!name || !loginNumber) return null;
  const requestedTeam = String(entry.shiftTeam || entry.shift_team || 'D').trim().toUpperCase();
  const shiftTeam = ['A','B','C','D'].includes(requestedTeam) ? requestedTeam : 'D';
  return { name, loginNumber, shiftTeam };
}

function normalizeRakWorkerRosterSettings(settings) {
  const raw = settings && typeof settings === 'object' ? settings : {};
  const source = Array.isArray(raw.workers) ? raw.workers : (Array.isArray(raw.names) ? raw.names : []);
  const appAccountSource = Array.isArray(raw.appAccounts) ? raw.appAccounts : (Array.isArray(raw.applicationAccounts) ? raw.applicationAccounts : []);
  const seen = new Set();
  const workers = source
    .map(normalizeRakWorkerEntry)
    .filter((entry) => {
      if (!entry || seen.has(entry.name)) return false;
      seen.add(entry.name);
      return true;
    });
  const seenAppAccounts = new Set();
  const appAccounts = appAccountSource
    .map(normalizeRakApplicationAccountEntry)
    .filter((entry) => {
      if (!entry || seenAppAccounts.has(entry.loginNumber)) return false;
      seenAppAccounts.add(entry.loginNumber);
      return true;
    });
  return {
    type: RAK_WORKER_ROSTER_SETTINGS_CATEGORY,
    custom: true,
    workers,
    appAccounts
  };
}

function getRakWorkerRosterSettingsRow() {
  const rows = (typeof app !== 'undefined' && app && Array.isArray(app.machineSettingsRows)) ? app.machineSettingsRows : [];
  return rows.find(isRakWorkerRosterSettingsRow) || null;
}

function getRakWorkerRosterSettings() {
  const row = getRakWorkerRosterSettingsRow();
  if (!row) return { type: RAK_WORKER_ROSTER_SETTINGS_CATEGORY, custom: false, workers: Array.from(KNOWN_STAT_NAMES).map((name) => ({ name, loginNumber: '', machines: [], active: true })) };
  return normalizeRakWorkerRosterSettings(rakWorkerRosterSettingsJson(row));
}
window.getRakWorkerRosterSettings = getRakWorkerRosterSettings;

function getActiveWorkerNames() {
  const settings = getRakWorkerRosterSettings();
  const workers = Array.isArray(settings.workers) ? settings.workers : [];
  const names = workers.filter((worker) => worker && worker.active !== false).map((worker) => String(worker.name || '').trim()).filter(Boolean);
  if (settings && settings.custom) return new Set(names);
  return new Set(names.length ? names : Array.from(KNOWN_STAT_NAMES));
}
window.getActiveWorkerNames = getActiveWorkerNames;

function getWorkerRosterEntry(name) {
  const wanted = String(name || '').trim();
  if (!wanted) return null;
  const settings = getRakWorkerRosterSettings();
  return (settings.workers || []).find((w) => w.name === wanted) || null;
}

function getWorkerMachineSkills(name) {
  const entry = getWorkerRosterEntry(name);
  return entry && Array.isArray(entry.machines) ? entry.machines : [];
}
window.getWorkerMachineSkills = getWorkerMachineSkills;

function getWorkerLoginNumber(name) {
  const entry = getWorkerRosterEntry(name);
  return entry ? String(entry.loginNumber || '') : '';
}
window.getWorkerLoginNumber = getWorkerLoginNumber;

function getWorkerNameByLoginNumber(loginNumber) {
  const wanted = normalizeRakWorkerLoginNumber(loginNumber);
  if (!wanted) return '';
  const settings = getRakWorkerRosterSettings();
  const entry = (settings.workers || []).find((w) => w.loginNumber === wanted);
  return entry ? entry.name : '';
}
// RAK_EXTERNAL_SHIFT_TEAMS_17020
function getRakActiveAccountShiftInfo() {
  let id = '';
  try { const profile = typeof window.rakUserProfileGet === 'function' ? window.rakUserProfileGet() : null; id = String(profile && profile.accountNumber || '').trim(); } catch(err) {}
  if(!id) { try { id = String(app && app.activeAccountId || '').trim(); } catch(err) {} }
  if(!id) return {team:'D',outside:false,accountId:''};
  const roster = getRakWorkerRosterSettings();
  const account = (roster.appAccounts || []).find(row => String(row.loginNumber || '') === id);
  return account ? {team:account.shiftTeam || 'D',outside:true,accountId:id} : {team:'D',outside:false,accountId:id};
}
function getRakActiveAccountShiftTeam() { return getRakActiveAccountShiftInfo().team; }
function rakCanAccessRotations() { return getRakActiveAccountShiftTeam() === 'D'; }
function rakApplyShiftAccess() {
  if(typeof document==='undefined') return;
  const allowed=rakCanAccessRotations();
  // RAK_CROSS_SHIFT_FIXES_17024
  // Three evenly spaced entries only when Rotace is unavailable. Do not touch D layout.
  const nav=document.querySelector('nav.bottomNav');
  if(nav&&nav.classList) nav.classList.toggle('rakBottomNavWithoutRotace17024',!allowed);
  document.querySelectorAll('.bottomNav button[data-action="rotace"], .bottomNav button[data-action="rozpisy"], .bottomNav button[data-action="statistiky"], .bottomNav .bottomNavBtn[data-page="rotace"]').forEach(button => {
    button.hidden = !allowed;
    button.setAttribute('aria-hidden',allowed?'false':'true');
    if(allowed) button.style.removeProperty('display'); else button.style.setProperty('display','none','important');
    if(allowed) button.removeAttribute('tabindex'); else button.setAttribute('tabindex','-1');
  });
  if(!allowed && document.getElementById('rotace')?.classList.contains('active') && typeof showPage==='function') showPage('home');
}
window.getRakActiveAccountShiftInfo=getRakActiveAccountShiftInfo;
window.getRakActiveAccountShiftTeam=getRakActiveAccountShiftTeam;
window.rakCanAccessRotations=rakCanAccessRotations;
window.rakApplyShiftAccess=rakApplyShiftAccess;
window.getWorkerNameByLoginNumber = getWorkerNameByLoginNumber;

const RAK_SHIFT_CALENDAR_SETTINGS_KEY = 'SHIFT_CALENDAR_SETTINGS';
const RAK_SHIFT_CALENDAR_SETTINGS_CATEGORY = 'shift_calendar_settings';
const RAK_SHIFT_CALENDAR_TEAMS = Object.freeze(['A','B','C','D']);
window.RAK_SHIFT_CALENDAR_SETTINGS_KEY = RAK_SHIFT_CALENDAR_SETTINGS_KEY;
window.RAK_SHIFT_CALENDAR_SETTINGS_CATEGORY = RAK_SHIFT_CALENDAR_SETTINGS_CATEGORY;
window.RAK_SHIFT_CALENDAR_TEAMS = RAK_SHIFT_CALENDAR_TEAMS;

function rakShiftCalendarSettingsJson(row) {
  if (row && row.settings_json && typeof row.settings_json === 'object') return row.settings_json;
  try { return row && row.settings_json ? JSON.parse(String(row.settings_json)) : {}; }
  catch (err) { return {}; }
}

function isRakShiftCalendarSettingsRow(row) {
  const settings = rakShiftCalendarSettingsJson(row);
  return String(row && row.category || '').trim() === RAK_SHIFT_CALENDAR_SETTINGS_CATEGORY
    || String(row && row.machine_key || '').trim() === RAK_SHIFT_CALENDAR_SETTINGS_KEY
    || String(settings && settings.stored_category || '').trim() === RAK_SHIFT_CALENDAR_SETTINGS_CATEGORY
    || String(settings && settings.admin_settings_key || '').trim() === RAK_SHIFT_CALENDAR_SETTINGS_KEY;
}

function normalizeRakGoogleCalendarUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.hostname !== 'calendar.google.com') return '';

    if (/^\/calendar\/embed\/?$/.test(url.pathname)) {
      const sources = url.searchParams.getAll('src').map((src) => String(src || '').trim()).filter(Boolean);
      if (!sources.length) return '';
      return url.toString();
    }

    const publicIcs = url.pathname.match(/^\/calendar\/ical\/([^/]+)\/public\/basic\.ics$/);
    if (!publicIcs) return '';
    let calendarId = '';
    try { calendarId = decodeURIComponent(publicIcs[1] || '').trim(); }
    catch (err) { return ''; }
    if (!calendarId) return '';

    const embed = new URL('https://calendar.google.com/calendar/embed');
    embed.searchParams.set('src', calendarId);
    return embed.toString();
  } catch (err) {
    return '';
  }
}

function isRakAllowedGoogleCalendarUrl(value) {
  return !!normalizeRakGoogleCalendarUrl(value);
}

function normalizeRakShiftCalendarEntry(entry, index) {
  const safe = entry && typeof entry === 'object' ? entry : {};
  const url = normalizeRakGoogleCalendarUrl(safe.url);
  if (!url) return null;
  const fallbackLabel = 'Kalendář ' + String((Number(index) || 0) + 1);
  return {
    label: String(safe.label || fallbackLabel).trim().slice(0, 80) || fallbackLabel,
    url
  };
}

function normalizeRakShiftCalendarSettings(settings) {
  const raw = settings && typeof settings === 'object' ? settings : {};
  const source = raw.teams && typeof raw.teams === 'object' ? raw.teams : {};
  const teams = {};
  RAK_SHIFT_CALENDAR_TEAMS.forEach((team) => {
    const seen = new Set();
    teams[team] = (Array.isArray(source[team]) ? source[team] : [])
      .map((entry, index) => normalizeRakShiftCalendarEntry(entry, index))
      .filter((entry) => {
        if (!entry || seen.has(entry.url)) return false;
        seen.add(entry.url);
        return true;
      })
      .slice(0, 8);
  });
  return { type: RAK_SHIFT_CALENDAR_SETTINGS_CATEGORY, teams };
}

function getRakShiftCalendarSettings() {
  const rows = (typeof app !== 'undefined' && app && Array.isArray(app.machineSettingsRows)) ? app.machineSettingsRows : [];
  const row = rows.find(isRakShiftCalendarSettingsRow);
  if (row) return normalizeRakShiftCalendarSettings(rakShiftCalendarSettingsJson(row));
  const legacyUrl = typeof getRakExternalLinkUrl === 'function'
    ? getRakExternalLinkUrl('calendar')
    : String(window.CALENDAR_EMBED_URL || '');
  const teams = { A: [], B: [], C: [], D: [] };
  if (isRakAllowedGoogleCalendarUrl(legacyUrl)) teams.D.push({ label: 'Kalendář směny D', url: legacyUrl });
  return { type: RAK_SHIFT_CALENDAR_SETTINGS_CATEGORY, teams };
}

function getRakShiftCalendarsForTeam(team) {
  const wanted = String(team || 'D').trim().toUpperCase();
  const safeTeam = RAK_SHIFT_CALENDAR_TEAMS.includes(wanted) ? wanted : 'D';
  const settings = getRakShiftCalendarSettings();
  return Array.isArray(settings.teams[safeTeam])
    ? settings.teams[safeTeam].map((entry) => ({ label: entry.label, url: entry.url }))
    : [];
}

function getRakActiveShiftCalendarContext() {
  const info = getRakActiveAccountShiftInfo();
  const team = RAK_SHIFT_CALENDAR_TEAMS.includes(String(info && info.team || '').toUpperCase())
    ? String(info.team).toUpperCase()
    : 'D';
  return { team, outside: !!(info && info.outside), calendars: getRakShiftCalendarsForTeam(team) };
}

function makeRakShiftCalendarSettingsRow(settings) {
  const safe = normalizeRakShiftCalendarSettings(settings);
  return {
    machine_key: RAK_SHIFT_CALENDAR_SETTINGS_KEY,
    machine_code: 'APP',
    machine_index: 'shift_calendars',
    label: 'Kalendáře podle směny',
    category: RAK_SHIFT_CALENDAR_SETTINGS_CATEGORY,
    cycle_time: '',
    speed: '',
    dress_time: '',
    dress_count: '',
    settings_json: Object.assign({ machine: 'APP', index: 'shift_calendars' }, safe)
  };
}

function mergeRakShiftCalendarSettingsRows(settings) {
  const base = (typeof app !== 'undefined' && app && Array.isArray(app.machineSettingsRows)) ? app.machineSettingsRows : [];
  const rows = base.filter((row) => !isRakShiftCalendarSettingsRow(row));
  rows.push(makeRakShiftCalendarSettingsRow(settings));
  return rows;
}

function buildAdminShiftCalendarRowHtml(team, entry) {
  const safeTeam = RAK_SHIFT_CALENDAR_TEAMS.includes(String(team || '').toUpperCase()) ? String(team).toUpperCase() : 'D';
  const safe = entry && typeof entry === 'object' ? entry : {};
  return [
    '<div class="appMenuInlineField adminShiftCalendarRow" data-shift-calendar-row data-calendar-team="' + escapeHtml(safeTeam) + '">',
    '  <input class="appMenuInlineInput" data-shift-calendar-field="label" value="' + escapeHtml(String(safe.label || '')) + '" placeholder="Název kalendáře">',
    '  <input class="appMenuInlineInput appMenuWideInput" data-shift-calendar-field="url" value="' + escapeHtml(String(safe.url || '')) + '" inputmode="url" placeholder="Google embed nebo public/basic.ics">',
    '  <button type="button" class="appMenuAction" data-admin-action="remove-shift-calendar" aria-label="Odebrat kalendář">×</button>',
    '</div>'
  ].join('');
}

function buildAdminShiftCalendarsSettingsHtml() {
  const settings = getRakShiftCalendarSettings();
  return RAK_SHIFT_CALENDAR_TEAMS.map((team) => {
    const entries = Array.isArray(settings.teams[team]) ? settings.teams[team] : [];
    const rows = entries.map((entry) => buildAdminShiftCalendarRowHtml(team, entry)).join('')
      + buildAdminShiftCalendarRowHtml(team, {});
    return [
      '<div class="appMenuCard adminShiftCalendarTeam" data-shift-calendar-team-block="' + team + '">',
      '  <div class="appMenuSubTitle">Směna ' + team + '</div>',
      '  <div class="adminShiftCalendarRows" data-shift-calendar-rows>' + rows + '</div>',
      '  <button type="button" class="appMenuAction" data-admin-action="add-shift-calendar" data-calendar-team="' + team + '">+ Přidat kalendář</button>',
      '</div>'
    ].join('');
  }).join('');
}

function readAdminShiftCalendarsSettingsFromDom() {
  const teams = { A: [], B: [], C: [], D: [] };
  const seen = { A: new Set(), B: new Set(), C: new Set(), D: new Set() };
  document.querySelectorAll('#appMenuBody [data-shift-calendar-row]').forEach((row) => {
    const team = String(row.getAttribute('data-calendar-team') || '').trim().toUpperCase();
    if (!RAK_SHIFT_CALENDAR_TEAMS.includes(team)) return;
    const label = String(row.querySelector('[data-shift-calendar-field="label"]')?.value || '').trim();
    const url = String(row.querySelector('[data-shift-calendar-field="url"]')?.value || '').trim();
    if (!label && !url) return;
    if (!url) throw new Error('U kalendáře směny ' + team + ' doplň Google Calendar odkaz.');
    const normalizedUrl = normalizeRakGoogleCalendarUrl(url);
    if (!normalizedUrl) {
      throw new Error('Kalendář směny ' + team + ' musí být Google Calendar embed odkaz nebo veřejný public/basic.ics. Soukromé private ICS odkazy se neukládají.');
    }
    if (seen[team].has(normalizedUrl)) throw new Error('Stejný kalendář je u směny ' + team + ' zadaný vícekrát.');
    if (teams[team].length >= 8) throw new Error('Na jednu směnu lze nastavit nejvýše 8 kalendářů.');
    seen[team].add(normalizedUrl);
    teams[team].push({ label: label || ('Kalendář ' + String(teams[team].length + 1)), url: normalizedUrl });
  });
  return normalizeRakShiftCalendarSettings({ teams });
}

window.isRakShiftCalendarSettingsRow = isRakShiftCalendarSettingsRow;
window.normalizeRakGoogleCalendarUrl = normalizeRakGoogleCalendarUrl;
window.isRakAllowedGoogleCalendarUrl = isRakAllowedGoogleCalendarUrl;
window.getRakShiftCalendarSettings = getRakShiftCalendarSettings;
window.getRakShiftCalendarsForTeam = getRakShiftCalendarsForTeam;
window.getRakActiveShiftCalendarContext = getRakActiveShiftCalendarContext;
window.mergeRakShiftCalendarSettingsRows = mergeRakShiftCalendarSettingsRows;
window.buildAdminShiftCalendarRowHtml = buildAdminShiftCalendarRowHtml;
window.buildAdminShiftCalendarsSettingsHtml = buildAdminShiftCalendarsSettingsHtml;
window.readAdminShiftCalendarsSettingsFromDom = readAdminShiftCalendarsSettingsFromDom;


function makeRakWorkerRosterSettingsRow(settings) {
  const safe = normalizeRakWorkerRosterSettings(settings);
  return {
    machine_key: RAK_WORKER_ROSTER_SETTINGS_KEY,
    machine_code: 'APP',
    machine_index: 'workers',
    label: 'Pracovníci',
    category: RAK_WORKER_ROSTER_SETTINGS_CATEGORY,
    cycle_time: '',
    speed: '',
    dress_time: '',
    dress_count: '',
    settings_json: Object.assign({ machine: 'APP', index: 'workers' }, safe)
  };
}

function mergeRakWorkerRosterSettingsRows(settings) {
  const base = Array.isArray(app && app.machineSettingsRows) ? app.machineSettingsRows : [];
  const rows = base.filter((row) => !isRakWorkerRosterSettingsRow(row));
  rows.push(makeRakWorkerRosterSettingsRow(settings));
  return rows;
}
window.mergeRakWorkerRosterSettingsRows = mergeRakWorkerRosterSettingsRows;

function adminWorkerRosterStatusItemHtml(label, value, detail, state) {
  const safeState = state || 'ok';
  return [
    '<div class="adminSpecialDaysStatusItem is' + escapeHtml(safeState.charAt(0).toUpperCase() + safeState.slice(1)) + '">',
    '  <span>' + escapeHtml(label || '') + '</span>',
    '  <b>' + escapeHtml(value || '') + '</b>',
    detail ? '  <small>' + escapeHtml(detail) + '</small>' : '',
    '</div>'
  ].join('');
}

function buildAdminWorkerRosterStatusHtml(workers) {
  const list = Array.isArray(workers) ? workers : [];
  const defaults = Array.from(KNOWN_STAT_NAMES);
  const removedDefaults = defaults.filter((name) => !list.includes(name));
  const addedNames = list.filter((name) => !defaults.includes(name));
  return [
    '<div class="adminSpecialDaysStatus" id="adminWorkerRosterStatus">',
    '  <div class="appMenuSubTitle">Stav pracovníků</div>',
    '  <div class="smallText uMb10">Seznam určuje, kdo se počítá ve statistikách a rozpisu. Prázdné řádky se neukládají.</div>',
    '  <div class="adminSpecialDaysStatusGrid">',
    adminWorkerRosterStatusItemHtml('Aktivní', String(list.length) + '×', list.length ? 'Tolik lidí appka aktuálně zná.' : 'Seznam je prázdný, doplň aspoň jednoho pracovníka.', list.length ? 'ok' : 'warn'),
    adminWorkerRosterStatusItemHtml('Noví oproti výchozím', addedNames.length ? addedNames.join(', ') : 'žádní', addedNames.length ? 'Přibyli oproti vestavěnému seznamu.' : 'Zatím jen vestavěná jména.', addedNames.length ? 'info' : 'ok'),
    adminWorkerRosterStatusItemHtml('Chybí oproti výchozím', removedDefaults.length ? removedDefaults.join(', ') : 'žádní', removedDefaults.length ? 'Byli ve vestavěném seznamu, teď v aktivním seznamu nejsou.' : 'Nikdo z vestavěného seznamu nechybí.', removedDefaults.length ? 'warn' : 'ok'),
    '  </div>',
    '</div>'
  ].join('');
}

function buildAdminApplicationAccountRowHtml(entry) {
  const safe = entry && typeof entry === 'object' ? entry : {};
  return [
    '<tr data-app-account-row>',
    '  <td><input class="appMenuInlineInput adminAppAccountNameInput" data-app-account-field="name" value="' + escapeHtml(String(safe.name || '')) + '" placeholder="Jméno"></td>',
    '  <td><input class="appMenuInlineInput adminAppAccountLoginInput" data-app-account-field="loginNumber" value="' + escapeHtml(String(safe.loginNumber || '')) + '" placeholder="0000" inputmode="numeric" maxlength="4"></td>',
    '  <td><select class="appMenuInlineInput" data-app-account-field="shiftTeam" aria-label="Směna pracovníka">' + ['A','B','C','D'].map(team => '<option value="' + team + '"' + (String(safe.shiftTeam || 'D') === team ? ' selected' : '') + '>Směna ' + team + '</option>').join('') + '</select><small class="adminAppAccountScope">Mimo rozpis</small></td>',
    '</tr>'
  ].join('');
}

function buildAdminWorkerRosterRowHtml(entry) {
  const safe = entry && typeof entry === 'object' ? entry : {};
  const name = String(safe.name || '');
  const loginNumber = String(safe.loginNumber || '');
  const machines = Array.isArray(safe.machines) ? safe.machines : [];
  const checks = RAK_WORKER_MACHINE_GROUPS.map((group) => (
    '<label class="adminWorkerMachineCheck"><input type="checkbox" data-worker-machine="' + escapeHtml(group) + '"' + (machines.includes(group) ? ' checked' : '') + '>' + escapeHtml(group) + '</label>'
  )).join('');
  return [
    '<tr data-worker-row>',
    '  <td><input class="appMenuInlineInput adminWorkerNameInput" data-worker-field="name" value="' + escapeHtml(name) + '" placeholder="Jméno"></td>',
    '  <td><input class="appMenuInlineInput adminWorkerLoginInput" data-worker-field="loginNumber" value="' + escapeHtml(loginNumber) + '" placeholder="0000" inputmode="numeric" maxlength="4"></td>',
    '  <td><div class="adminWorkerMachineChecks">' + checks + '</div></td>',
    '</tr>'
  ].join('');
}

function buildAdminWorkerRosterSettingsHtml() {
  const settings = getRakWorkerRosterSettings();
  const workers = Array.isArray(settings.workers) ? settings.workers : [];
  const appAccounts = Array.isArray(settings.appAccounts) ? settings.appAccounts : [];
  const rows = workers.map(buildAdminWorkerRosterRowHtml).join('')
    + Array.from({ length: 3 }, () => buildAdminWorkerRosterRowHtml({ name: '', loginNumber: '', machines: [] })).join('');
  const appAccountRows = appAccounts.map(buildAdminApplicationAccountRowHtml).join('')
    + Array.from({ length: 3 }, () => buildAdminApplicationAccountRowHtml({ name: '', loginNumber: '' })).join('');
  return [
    buildAdminWorkerRosterStatusHtml(workers.map((w) => w.name)),
    '<div class="tableWrap appMenuTableWrap">',
    '  <table class="appMenuTable appMenuAdminTable appMenuAdminTableDense adminWorkerRosterTable">',
    '    <colgroup><col class="adminWorkerNameCol"><col class="adminWorkerLoginCol"><col class="adminWorkerMachinesCol"></colgroup>',
    '    <thead><tr><th>Jméno</th><th>Přihlaš. číslo</th><th>Umí stroje</th></tr></thead>',
    '    <tbody>' + rows + '</tbody>',
    '  </table>',
    '</div>',
    '<div class="smallText uMt8">Pro přidání napiš jméno do prázdného řádku. Pro odebrání jméno smaž a ulož. Jméno musí přesně odpovídat tomu, jak je napsané v rozpisu. Přihlašovací číslo (poslední 4 číslice osobního čísla) použije pracovník k přihlášení do aplikace. Když u pracovníka nezaškrtneš žádný stroj, generátor ho bude nabízet na všechny stroje bez omezení.</div>',
    '<div class="appMenuSubTitle uMt16">Účty aplikace</div>',
    '<div class="smallText uMb10">Pracovníci mimo rozpis: vyber směnu A/B/C/D. Nepřidají se do rozpisu ani statistik týmu D; směny A/B/C neuvidí Rotace, kalkulačky zůstávají.</div>',
    '<div class="tableWrap appMenuTableWrap">',
    '  <table class="appMenuTable appMenuAdminTable appMenuAdminTableDense adminAppAccountsTable">',
    '    <colgroup><col class="adminAppAccountNameCol"><col class="adminAppAccountLoginCol"><col class="adminAppAccountScopeCol"></colgroup>',
    '    <thead><tr><th>Jméno</th><th>Os. číslo</th><th>Směna / zařazení</th></tr></thead>',
    '    <tbody>' + appAccountRows + '</tbody>',
    '  </table>',
    '</div>',
    '<div class="smallText uMt8">Vyplň jméno a poslední 4 číslice osobního čísla. Stejné přihlašovací číslo nemůže být u pracovníka i samostatného účtu.</div>'
  ].join('');
}

function readAdminWorkerRosterSettingsFromDom() {
  const workers = [];
  const appAccounts = [];
  document.querySelectorAll('#appMenuBody tr[data-worker-row]').forEach((tr) => {
    const name = String(tr.querySelector('[data-worker-field="name"]')?.value || '').trim();
    if (!name) return;
    const loginNumber = String(tr.querySelector('[data-worker-field="loginNumber"]')?.value || '');
    const machines = Array.from(tr.querySelectorAll('[data-worker-machine]:checked')).map((cb) => cb.getAttribute('data-worker-machine'));
    workers.push({ name, loginNumber, machines });
  });
  document.querySelectorAll('#appMenuBody tr[data-app-account-row]').forEach((tr) => {
    const name = String(tr.querySelector('[data-app-account-field="name"]')?.value || '').trim();
    const loginNumber = normalizeRakWorkerLoginNumber(tr.querySelector('[data-app-account-field="loginNumber"]')?.value || '');
    if (!name && !loginNumber) return;
    if (!name || !loginNumber) throw new Error('U účtu aplikace vyplň jméno i poslední 4 číslice osobního čísla.');
    const shiftTeam = String(tr.querySelector('[data-app-account-field="shiftTeam"]')?.value || 'D').toUpperCase();
    if (!['A','B','C','D'].includes(shiftTeam)) throw new Error('Vyber směnu A/B/C/D.');
    appAccounts.push({ name, loginNumber, shiftTeam });
  });
  const settings = normalizeRakWorkerRosterSettings({ workers, appAccounts });
  const knownLoginNumbers = new Set();
  settings.workers.concat(settings.appAccounts).forEach((entry) => {
    const loginNumber = String(entry.loginNumber || '');
    if (!loginNumber) return;
    if (knownLoginNumbers.has(loginNumber)) throw new Error('Přihlašovací číslo ' + loginNumber + ' je zadané vícekrát.');
    knownLoginNumbers.add(loginNumber);
  });
  return settings;
}

window.getRakWorkerRosterSettings = getRakWorkerRosterSettings;
window.buildAdminWorkerRosterSettingsHtml = buildAdminWorkerRosterSettingsHtml;
window.readAdminWorkerRosterSettingsFromDom = readAdminWorkerRosterSettingsFromDom;

function getSpecialWorkInfo(now) {
  const customSpecial = typeof getRakSpecialDayInfo === 'function' ? getRakSpecialDayInfo(now) : null;
  if (customSpecial) return customSpecial;
  const movableHoliday = getMovableHolidayInfo(now);
  if (movableHoliday) return movableHoliday;
  const key = dateKeyMD(now);
  const HOLIDAY_LABELS = {
    "1-1": "Nový rok",
    "5-1": "Svátek práce",
    "5-8": "Den vítězství",
    "7-5": "Cyril a Metoděj",
    "7-6": "Jan Hus",
    "9-28": "Den české státnosti",
    "10-17": "Svátek",
    "10-28": "Vznik ČSR",
    "11-17": "Den boje za svobodu a demokracii",
    "12-24": "Štědrý den",
    "12-25": "1. svátek vánoční",
    "12-26": "2. svátek vánoční"
  };
  if (HOLIDAY_LABELS[key]) return { type: "holiday", label: HOLIDAY_LABELS[key] };
  if (key === "10-24" || key === "10-25") return { type: "czd", label: "CZD – celozávodní dovolená" };
  const vacationPeriod = typeof getVacationPeriodForDate === 'function' ? getVacationPeriodForDate(now) : null;
  if (vacationPeriod) return { type: "czd", label: String(vacationPeriod.workLabel || vacationPeriod.label || "CZD") };
  return null;
}

const DEFAULT_VACATION_COUNTDOWN_PERIODS = [
  { key: 'czd-2026', label: 'CZD', workLabel: 'CZD', start: '2026-07-19T14:00', end: '2026-08-02T18:00' },
  { key: 'vanoce-2026', label: 'Vánoce', countdownLabel: 'Vánocům', workLabel: 'Vánoční dovolená', start: '2026-12-23T18:00', end: '2027-01-02T06:00' }
];

const CZD_PERIODS = DEFAULT_VACATION_COUNTDOWN_PERIODS.map((period) => ({
  start: new Date(String(period.start).replace('T', ' ')),
  end: new Date(String(period.end).replace('T', ' '))
}));

function parseVacationCountdownSettingsJson(value) {
  if (value && typeof value === 'object') return value;
  if (!value) return {};
  try { return JSON.parse(String(value)); } catch (err) { return {}; }
}

function parseVacationCountdownDateTime(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2})(?::(\d{2}))?)?$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = match[4] === undefined ? 0 : Number(match[4]);
  const minute = match[5] === undefined ? 0 : Number(match[5]);
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day || date.getHours() !== hour || date.getMinutes() !== minute) return null;
  return date;
}

function formatVacationCountdownDateTime(date) {
  const d = date instanceof Date ? date : parseVacationCountdownDateTime(date);
  if (!d || Number.isNaN(d.getTime())) return '';
  return dateKeyISO(d) + 'T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function getVacationCountdownSettingsRow() {
  const rows = (typeof app !== 'undefined' && app && Array.isArray(app.machineSettingsRows)) ? app.machineSettingsRows : [];
  return rows.find((row) => String(row && row.category || '').trim() === VACATION_COUNTDOWN_SETTINGS_CATEGORY)
    || rows.find((row) => String(row && row.machine_key || '').trim() === VACATION_COUNTDOWN_SETTINGS_MACHINE_KEY)
    || null;
}

function normalizeVacationCountdownPeriod(item, index) {
  const src = item && typeof item === 'object' ? item : {};
  const fallback = DEFAULT_VACATION_COUNTDOWN_PERIODS[index] || {};
  const start = parseVacationCountdownDateTime(src.start || src.start_at || fallback.start);
  const end = parseVacationCountdownDateTime(src.end || src.end_at || fallback.end);
  if (!start || !end || end.getTime() <= start.getTime()) return null;
  const key = String(src.key || fallback.key || ('vacation-' + String(index + 1))).trim();
  const label = String(src.label || src.name || fallback.label || 'Dovolena').trim();
  const countdownLabel = String(src.countdownLabel || src.countdown_label || fallback.countdownLabel || label).trim();
  const workLabel = String(src.workLabel || src.work_label || src.label || src.name || fallback.workLabel || label).trim();
  return {
    key,
    label,
    countdownLabel,
    workLabel,
    start,
    end,
    startText: formatVacationCountdownDateTime(start),
    endText: formatVacationCountdownDateTime(end)
  };
}

function getVacationCountdownSettings() {
  const row = getVacationCountdownSettingsRow();
  const settings = row ? parseVacationCountdownSettingsJson(row.settings_json) : {};
  const sourcePeriods = Array.isArray(settings.periods)
    ? settings.periods
    : (Array.isArray(settings.vacations) ? settings.vacations : DEFAULT_VACATION_COUNTDOWN_PERIODS);
  const periods = sourcePeriods
    .map((item, index) => normalizeVacationCountdownPeriod(item, index))
    .filter(Boolean)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  return {
    type: VACATION_COUNTDOWN_SETTINGS_CATEGORY,
    custom: !!row,
    periods: periods.length ? periods : DEFAULT_VACATION_COUNTDOWN_PERIODS.map(normalizeVacationCountdownPeriod).filter(Boolean)
  };
}

function getVacationCountdownPeriods() {
  return getVacationCountdownSettings().periods || [];
}

function getVacationPeriodForDate(now) {
  const date = now instanceof Date ? now : new Date(now || new Date());
  const time = date.getTime();
  if (Number.isNaN(time)) return null;
  return getVacationCountdownPeriods().find((period) => period && period.start && period.end && time >= period.start.getTime() && time < period.end.getTime()) || null;
}

function getVacationCountdownTargetPeriod(now) {
  const source = now instanceof Date ? new Date(now) : new Date(now || new Date());
  const time = source.getTime();
  if (Number.isNaN(time)) return null;
  const periods = getVacationCountdownPeriods();
  const active = periods.find((period) => period && period.start && period.end && time >= period.start.getTime() && time < period.end.getTime()) || null;
  if (active) return active;
  return periods.find((period) => period && period.end && period.end.getTime() > time) || null;
}

function getVacationCountdownAdminSettingsSnapshot() {
  return getVacationCountdownSettings();
}

function formatVacationCountdownShiftCount(count, team) {
  if (!Number.isFinite(count)) return '';
  const safeCount = Math.max(0, Math.round(count));
  const word = safeCount === 1 ? 'směna' : (safeCount >= 2 && safeCount <= 4 ? 'směny' : 'směn');
  return formatVacationCountdownShiftCountValue(safeCount) + ', ' + formatVacationCountdownShiftTeamLabel(team);
}

function formatVacationCountdownShiftCountValue(count) {
  if (!Number.isFinite(count)) return '';
  const safeCount = Math.max(0, Math.round(count));
  const word = safeCount === 1 ? 'směna' : (safeCount >= 2 && safeCount <= 4 ? 'směny' : 'směn');
  return String(safeCount) + ' ' + word;
}

function formatVacationCountdownShiftTeamLabel(team) {
  return 'směna ' + String(team || 'D').trim().toUpperCase();
}

function getVacationCountdownMonthKey(date) {
  const source = date instanceof Date ? date : new Date(date || new Date());
  if (Number.isNaN(source.getTime())) return '';
  if (typeof monthKeyFromYearMonth === 'function') {
    return monthKeyFromYearMonth(source.getFullYear(), source.getMonth() + 1);
  }
  return String(source.getMonth() + 1) + '/' + String(source.getFullYear()).slice(-2);
}

function getVacationCountdownMonthKeysInWindow(source, target) {
  const start = source instanceof Date ? new Date(source) : new Date(source || new Date());
  const end = target instanceof Date ? new Date(target) : parseVacationCountdownDateTime(target);
  if (Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime()) || end <= start) return [];
  const keys = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1, 0, 0, 0, 0);
  const last = new Date(end.getFullYear(), end.getMonth(), 1, 0, 0, 0, 0);
  for (let guard = 0; guard < 80 && cursor <= last; guard += 1) {
    keys.push(getVacationCountdownMonthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return keys.filter(Boolean);
}

function getVacationCountdownRotationMonth(monthKey) {
  const months = (typeof app !== 'undefined' && app && app.rotation && app.rotation.months) ? app.rotation.months : {};
  return months ? months[monthKey] || null : null;
}

function vacationCountdownMonthHasSchedule(monthKey) {
  const month = getVacationCountdownRotationMonth(monthKey);
  if (!month) return false;
  return ['hard', 'soft'].some((section) => Array.isArray(month[section] && month[section].rows) && month[section].rows.length > 0);
}

function getVacationCountdownRowShiftStart(monthKey, dateText) {
  const parsed = typeof parseDateToken === 'function' ? parseDateToken(String(dateText || '')) : null;
  const monthInfo = typeof parseMonthKey === 'function' ? parseMonthKey(monthKey) : null;
  if (!parsed || !monthInfo || !Number.isFinite(Number(parsed.day)) || !Number.isFinite(Number(parsed.month))) return null;
  const shift = String((typeof normalizeShiftText === 'function' ? normalizeShiftText(parsed.shift || '') : parsed.shift) || '').trim().toUpperCase();
  if (!shift) return null;
  const start = new Date(monthInfo.year, Number(parsed.month) - 1, Number(parsed.day), 0, 0, 0, 0);
  if (shift.includes('R')) {
    start.setHours(6, 0, 0, 0);
  } else if (shift.includes('N8')) {
    const specialHour = typeof getSpecialSundayNightStartHour === 'function'
      ? getSpecialSundayNightStartHour(start, 22)
      : 22;
    start.setHours(specialHour, 0, 0, 0);
  } else if (shift.includes('N')) {
    start.setHours(18, 0, 0, 0);
  } else {
    return null;
  }
  return Number.isNaN(start.getTime()) ? null : start;
}

function isVacationCountdownShiftForTeam(start, team) {
  if (!(start instanceof Date) || Number.isNaN(start.getTime()) || typeof getTeamShiftState !== 'function') return false;
  const targetTeam = String(team || 'D').trim().toUpperCase() || 'D';
  const probe = new Date(start.getTime() + 60000);
  const state = getTeamShiftState(probe, targetTeam);
  return !!(state && state.active && state.start instanceof Date && state.start.getTime() === start.getTime());
}

function getVacationCountdownRotationShiftStartSet(monthKey, team) {
  const month = getVacationCountdownRotationMonth(monthKey);
  const starts = new Set();
  if (!month) return starts;
  ['hard', 'soft'].forEach((section) => {
    const rows = Array.isArray(month[section] && month[section].rows) ? month[section].rows : [];
    rows.forEach((row) => {
      const start = getVacationCountdownRowShiftStart(monthKey, row && row.date);
      if (!isVacationCountdownShiftForTeam(start, team)) return;
      starts.add(String(start.getTime()));
    });
  });
  return starts;
}

function countVacationCountdownRotationScheduledShifts(source, target, team) {
  const start = source instanceof Date ? new Date(source) : new Date(source || new Date());
  const end = target instanceof Date ? new Date(target) : parseVacationCountdownDateTime(target);
  if (Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime()) || end <= start) return 0;
  let count = 0;
  getVacationCountdownMonthKeysInWindow(start, end).forEach((monthKey) => {
    if (!vacationCountdownMonthHasSchedule(monthKey)) return;
    getVacationCountdownRotationShiftStartSet(monthKey, team).forEach((rawTime) => {
      const time = Number(rawTime);
      if (Number.isFinite(time) && time > start.getTime() && time < end.getTime()) count += 1;
    });
  });
  return count;
}

function getVacationCountdownActiveTeamShiftStart(now, target, team) {
  if (typeof getTeamShiftState !== 'function') return null;
  const source = now instanceof Date ? new Date(now) : new Date(now || new Date());
  const end = target instanceof Date ? new Date(target) : parseVacationCountdownDateTime(target);
  const targetTeam = String(team || 'D').trim().toUpperCase() || 'D';
  if (Number.isNaN(source.getTime()) || !end || Number.isNaN(end.getTime()) || end <= source) return null;
  const state = getTeamShiftState(source, targetTeam);
  if (!state || !state.active || !(state.start instanceof Date) || !(state.end instanceof Date)) return null;
  if (Number.isNaN(state.start.getTime()) || Number.isNaN(state.end.getTime())) return null;
  if (state.end <= source || state.start >= end) return null;
  return state.start;
}

function getVacationCountdownTeamShiftCount(now, targetStart, team) {
  if (typeof getTeamShiftState !== 'function') return null;
  const source = now instanceof Date ? new Date(now) : new Date(now || new Date());
  const target = targetStart instanceof Date ? new Date(targetStart) : parseVacationCountdownDateTime(targetStart);
  const targetTeam = String(team || 'D').trim().toUpperCase() || 'D';
  if (Number.isNaN(source.getTime()) || !target || Number.isNaN(target.getTime())) return null;
  if (target.getTime() <= source.getTime()) return 0;
  const seen = new Set();
  const activeStart = getVacationCountdownActiveTeamShiftStart(source, target, targetTeam);
  let activeCount = 0;
  if (activeStart) {
    seen.add(String(activeStart.getTime()));
    activeCount = 1;
  }
  let cursor = new Date(source);
  let count = 0;
  for (let guard = 0; guard < 260; guard += 1) {
    const state = getTeamShiftState(cursor, targetTeam);
    const candidate = state && state.active && state.start && state.end && state.end > cursor
      ? { start: state.start, end: state.end }
      : (state && state.next && state.next.start ? state.next : null);
    if (!candidate || !(candidate.start instanceof Date) || Number.isNaN(candidate.start.getTime())) break;
    if (candidate.start.getTime() >= target.getTime()) break;
    const key = String(candidate.start.getTime());
    const monthKey = getVacationCountdownMonthKey(candidate.start);
    // The saved rotation belongs exclusively to D; it must not suppress the A/B/C cycle.
    if ((targetTeam !== 'D' || !vacationCountdownMonthHasSchedule(monthKey)) && !seen.has(key)) {
      seen.add(key);
      count += 1;
    }
    const endTime = candidate.end instanceof Date && !Number.isNaN(candidate.end.getTime())
      ? candidate.end.getTime()
      : candidate.start.getTime() + 12 * 60 * 60 * 1000;
    cursor = new Date(Math.max(endTime, cursor.getTime() + 60000) + 60000);
  }
  return activeCount + count + (targetTeam === 'D' ? countVacationCountdownRotationScheduledShifts(source, target, targetTeam) : 0);
}

function getVacationCountdown(now) {
  const sourceDate = new Date(now || new Date());
  const today = new Date(sourceDate);
  today.setHours(0, 0, 0, 0);
  const active = getVacationPeriodForDate(sourceDate);
  const upcoming = getVacationCountdownTargetPeriod(sourceDate);
  if (!upcoming) return { text: '—', meta: '' };

  const start = new Date(upcoming.start);
  start.setHours(0, 0, 0, 0);
  const diffDays = Math.max(0, Math.round((start.getTime() - today.getTime()) / 86400000));
  const targetLabel = active ? String(upcoming.workLabel || upcoming.label || 'Dovolená') : ('k ' + String(upcoming.countdownLabel || upcoming.label || 'dovolené'));
  const countdownTeam = getRakActiveAccountShiftTeam();
  const shiftCount = active ? 0 : getVacationCountdownTeamShiftCount(sourceDate, upcoming.start, countdownTeam);
  return {
    text: diffDays === 0 ? 'Dnes' : (diffDays + ' ' + (diffDays === 1 ? 'den' : 'dní')),
    meta: targetLabel,
    shiftMeta: formatVacationCountdownShiftCount(shiftCount, countdownTeam),
    shiftText: formatVacationCountdownShiftCountValue(shiftCount),
    shiftTeamMeta: formatVacationCountdownShiftTeamLabel(countdownTeam),
    shiftCount
  };
}

window.getVacationCountdownSettings = getVacationCountdownSettings;
window.getVacationCountdownPeriods = getVacationCountdownPeriods;
window.getVacationCountdownAdminSettingsSnapshot = getVacationCountdownAdminSettingsSnapshot;
window.getVacationPeriodForDate = getVacationPeriodForDate;
window.formatVacationCountdownDateTime = formatVacationCountdownDateTime;
window.getVacationCountdownTeamShiftCount = getVacationCountdownTeamShiftCount;
window.isRakSpecialDaysSettingsRow = isRakSpecialDaysSettingsRow;
window.getRakSpecialDaysSettings = getRakSpecialDaysSettings;
window.getRakSpecialDayInfo = getRakSpecialDayInfo;
window.buildAdminSpecialDaysSettingsHtml = buildAdminSpecialDaysSettingsHtml;
window.readAdminSpecialDaysSettingsFromDom = readAdminSpecialDaysSettingsFromDom;
window.mergeRakSpecialDaysSettingsRows = mergeRakSpecialDaysSettingsRows;
window.adminSpecialDaysRefreshStatus = adminSpecialDaysRefreshStatus;

const appRotation = loadRotationData();
const app = {
  rotationView: "names",
  selectedMonth: null,
  selectedName: null,
  selectedStatsName: null,
  selectedStatsMachine: null,
  soustruhMode: "lis",
  soustruhFirstBatch: "",
  soustruhPlan: "",
  soustruh126Start: 32,
  soustruh126HeatFirst: "",
  soustruh106HeatFirst: "",
  soustruhComboFreeType: "126",
  soustruhComboFirstType: "lis",
  soustruhCombo126Start: 32,
  soustruhComboHeatFirst: "",
  soustruhCombo106Counts: ["", "", "", ""],
  soustruh106Counts: ["", "", "", ""],
  selectedYear: new Date().getFullYear(),
  importYear: new Date().getFullYear(),
  foodScheduleFocus: "kantyna",
  importClicks: 0,
  aboutTapCount: 0,
  aboutTapTimer: null,
  contactTapCount: 0,
  homeBootSuppressed: false,
  tttState: null,
  gamesLeaderboardCache: { "ttt": [], "2048": [], "snake": [], "flap": [] },
  gamesSnakeJoystickEnabled: false,
  pendingMenuImport: false,
  adminUnlocked: false,
  machine: localStorage.getItem("machine") || "TBKR01",
  prog: localStorage.getItem("prog") || "AD",
  version: APP_VERSION,
  rotation: appRotation
};
window.app = app;

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

const RAK_SECURITY_RENDER_DEFAULTS = {
  phase: 'phase-9-security-render-cleanup',
  phasePercent: 100,
  safeDomBuilds: 0,
  safeDomSkippedBuilds: 0,
  safeDomReplacements: 0,
  safeDomFallbackReplacements: 0,
  safeDomClears: 0,
  lastSafeDomKey: '',
  lastSafeDomReplaceKey: '',
  lastSafeDomFingerprint: '',
  delegatedActionChecks: 0,
  delegatedActionBlocked: 0,
  delegatedActionGuardMode: 'allowlist-data-action',
  lastDelegatedAction: '',
  lastBlockedDelegatedAction: '',
  escapedDynamicHtmlWrites: 0,
  guardedHtmlWrites: 0,
  guardedHtmlSkippedWrites: 0,
  riskyHtmlWrites: 0,
  guardedTextWrites: 0,
  guardedTextSkippedWrites: 0,
  safeExternalUrlChecks: 0,
  safeExternalUrlBlocked: 0,
  safeExternalUrlAllowlistChecks: 0,
  safeExternalUrlAllowlistBlocked: 0,
  safeExternalHrefWrites: 0,
  safeExternalHrefSkippedWrites: 0,
  lastEscapedKey: '',
  lastHtmlKey: '',
  lastHtmlRisk: '',
  lastTextKey: '',
  lastExternalUrlKey: '',
  lastAllowedExternalUrlKey: '',
  lastSafeExternalHrefKey: '',
  lastBlockedExternalUrl: '',
  lastRenderAt: 0
};
const RAK_SECURITY_RENDER_STATS = Object.assign(
  {},
  RAK_SECURITY_RENDER_DEFAULTS,
  window.__rakSecurityRenderStats || {},
  { phase: 'phase-9-security-render-cleanup', phasePercent: 100 }
);
window.__rakSecurityRenderStats = RAK_SECURITY_RENDER_STATS;

function escapeDynamicHtml(value, key = '') {
  const statKey = String(key || 'dynamic-html');
  RAK_SECURITY_RENDER_STATS.escapedDynamicHtmlWrites += 1;
  RAK_SECURITY_RENDER_STATS.lastEscapedKey = statKey;
  RAK_SECURITY_RENDER_STATS.lastRenderAt = Date.now();
  return escapeHtml(value);
}
window.escapeDynamicHtml = escapeDynamicHtml;

function getSecurityRenderStatus() {
  return Object.assign({}, RAK_SECURITY_RENDER_STATS);
}
window.getSecurityRenderStatus = getSecurityRenderStatus;

function recordSafeDomBuild(key = '') {
  const statKey = String(key || 'safe-dom-build').trim();
  RAK_SECURITY_RENDER_STATS.safeDomBuilds = Number(RAK_SECURITY_RENDER_STATS.safeDomBuilds || 0) + 1;
  RAK_SECURITY_RENDER_STATS.lastSafeDomKey = statKey;
  RAK_SECURITY_RENDER_STATS.lastRenderAt = Date.now();
  return true;
}
window.recordSafeDomBuild = recordSafeDomBuild;


function appendSafeDomChild(parent, child) {
  if (!parent || child == null || typeof document === 'undefined') return;
  if (child instanceof Node) {
    parent.appendChild(child);
    return;
  }
  parent.appendChild(document.createTextNode(String(child)));
}

function clearElementChildrenSafely(element, key = '') {
  if (!element) return false;
  const statKey = String(key || element.id || element.className || 'safe-dom-clear').trim();
  try {
    if (!element.firstChild) return false;
    if (typeof element.replaceChildren === 'function') {
      element.replaceChildren();
    } else {
      while (element.firstChild) element.removeChild(element.firstChild);
    }
    RAK_SECURITY_RENDER_STATS.safeDomClears = Number(RAK_SECURITY_RENDER_STATS.safeDomClears || 0) + 1;
    RAK_SECURITY_RENDER_STATS.lastSafeDomReplaceKey = statKey;
    RAK_SECURITY_RENDER_STATS.lastRenderAt = Date.now();
    return true;
  } catch (err) {
    try { while (element.firstChild) element.removeChild(element.firstChild); } catch (fallbackErr) {}
    RAK_SECURITY_RENDER_STATS.safeDomFallbackReplacements = Number(RAK_SECURITY_RENDER_STATS.safeDomFallbackReplacements || 0) + 1;
    RAK_SECURITY_RENDER_STATS.lastSafeDomReplaceKey = statKey + ':fallback-clear';
    RAK_SECURITY_RENDER_STATS.lastRenderAt = Date.now();
    return true;
  }
}
window.clearElementChildrenSafely = clearElementChildrenSafely;

function replaceElementChildrenSafely(element, children, key = '') {
  if (!element || typeof document === 'undefined') return false;
  const statKey = String(key || element.id || element.className || 'safe-dom-replace').trim();
  const childList = Array.isArray(children) ? children.filter(child => child != null) : (children == null ? [] : [children]);
  try {
    if (typeof element.replaceChildren === 'function') {
      element.replaceChildren(...childList.map(child => child instanceof Node ? child : document.createTextNode(String(child))));
    } else {
      while (element.firstChild) element.removeChild(element.firstChild);
      childList.forEach(child => appendSafeDomChild(element, child));
    }
    RAK_SECURITY_RENDER_STATS.safeDomReplacements = Number(RAK_SECURITY_RENDER_STATS.safeDomReplacements || 0) + 1;
    RAK_SECURITY_RENDER_STATS.lastSafeDomReplaceKey = statKey;
    RAK_SECURITY_RENDER_STATS.lastRenderAt = Date.now();
    return true;
  } catch (err) {
    try {
      while (element.firstChild) element.removeChild(element.firstChild);
      childList.forEach(child => appendSafeDomChild(element, child));
    } catch (fallbackErr) {}
    RAK_SECURITY_RENDER_STATS.safeDomFallbackReplacements = Number(RAK_SECURITY_RENDER_STATS.safeDomFallbackReplacements || 0) + 1;
    RAK_SECURITY_RENDER_STATS.lastSafeDomReplaceKey = statKey + ':fallback-replace';
    RAK_SECURITY_RENDER_STATS.lastRenderAt = Date.now();
    return true;
  }
}
window.replaceElementChildrenSafely = replaceElementChildrenSafely;


function setElementChildrenIfChanged(element, fingerprint, buildChildren, key = '') {
  if (!element || typeof document === 'undefined') return false;
  const statKey = String(key || element.id || element.className || 'safe-dom').trim();
  const nextFingerprint = String(fingerprint ?? '');
  if (element.__rakSafeDomFingerprint === nextFingerprint) {
    RAK_SECURITY_RENDER_STATS.safeDomSkippedBuilds = Number(RAK_SECURITY_RENDER_STATS.safeDomSkippedBuilds || 0) + 1;
    RAK_SECURITY_RENDER_STATS.lastSafeDomKey = statKey;
    RAK_SECURITY_RENDER_STATS.lastSafeDomFingerprint = nextFingerprint;
    RAK_SECURITY_RENDER_STATS.lastRenderAt = Date.now();
    return false;
  }

  const fragment = document.createDocumentFragment();
  const built = typeof buildChildren === 'function' ? buildChildren() : [];
  const children = Array.isArray(built) ? built : [built];
  children.forEach((child) => {
    if (child == null) return;
    if (child instanceof Node) {
      fragment.appendChild(child);
      return;
    }
    fragment.appendChild(document.createTextNode(String(child)));
  });

  if (typeof replaceElementChildrenSafely === 'function') {
    replaceElementChildrenSafely(element, fragment, statKey);
  } else if (typeof element.replaceChildren === 'function') {
    element.replaceChildren(fragment);
  } else {
    while (element.firstChild) element.removeChild(element.firstChild);
    element.appendChild(fragment);
  }
  element.__rakSafeDomFingerprint = nextFingerprint;
  RAK_SECURITY_RENDER_STATS.lastSafeDomFingerprint = nextFingerprint;
  recordSafeDomBuild(statKey);
  return true;
}
window.setElementChildrenIfChanged = setElementChildrenIfChanged;

function recordDelegatedActionGuard(action, allowed, source = '') {
  const rawAction = String(action || '').trim();
  const statSource = String(source || 'delegated-action').trim();
  const safeFormat = /^[a-z0-9-]{1,80}$/.test(rawAction);
  const ok = !!allowed && safeFormat;
  RAK_SECURITY_RENDER_STATS.delegatedActionChecks = Number(RAK_SECURITY_RENDER_STATS.delegatedActionChecks || 0) + 1;
  RAK_SECURITY_RENDER_STATS.lastDelegatedAction = statSource + ':' + (rawAction || 'empty');
  RAK_SECURITY_RENDER_STATS.lastRenderAt = Date.now();
  if (!ok) {
    RAK_SECURITY_RENDER_STATS.delegatedActionBlocked = Number(RAK_SECURITY_RENDER_STATS.delegatedActionBlocked || 0) + 1;
    RAK_SECURITY_RENDER_STATS.lastBlockedDelegatedAction = statSource + ':' + (rawAction || 'empty') + (safeFormat ? ':unknown' : ':bad-format');
    return false;
  }
  return true;
}
window.recordDelegatedActionGuard = recordDelegatedActionGuard;

function normalizeSafeExternalUrl(rawUrl, key = '') {
  const statKey = String(key || 'external-url').trim();
  RAK_SECURITY_RENDER_STATS.safeExternalUrlChecks += 1;
  RAK_SECURITY_RENDER_STATS.lastExternalUrlKey = statKey;
  RAK_SECURITY_RENDER_STATS.lastRenderAt = Date.now();
  try {
    const url = new URL(String(rawUrl || '').trim(), window.location.href);
    const protocol = String(url.protocol || '').toLowerCase();
    if (protocol !== 'https:' && protocol !== 'http:') {
      RAK_SECURITY_RENDER_STATS.safeExternalUrlBlocked += 1;
      RAK_SECURITY_RENDER_STATS.lastBlockedExternalUrl = statKey + ':' + protocol;
      return '';
    }
    return url.href;
  } catch (err) {
    RAK_SECURITY_RENDER_STATS.safeExternalUrlBlocked += 1;
    RAK_SECURITY_RENDER_STATS.lastBlockedExternalUrl = statKey + ':invalid-url';
    return '';
  }
}
window.normalizeSafeExternalUrl = normalizeSafeExternalUrl;

function isRakExternalHostAllowed(hostname, allowedHosts) {
  const host = String(hostname || '').toLowerCase().trim();
  const rules = Array.isArray(allowedHosts) ? allowedHosts : [];
  return rules.some((rule) => {
    const allowed = String(rule || '').toLowerCase().trim();
    if (!allowed) return false;
    if (allowed.charAt(0) === '.') return host.endsWith(allowed);
    return host === allowed;
  });
}
window.isRakExternalHostAllowed = isRakExternalHostAllowed;

function normalizeAllowedExternalUrl(rawUrl, allowedHosts, key = '') {
  const statKey = String(key || 'allowed-external-url').trim();
  RAK_SECURITY_RENDER_STATS.safeExternalUrlAllowlistChecks = Number(RAK_SECURITY_RENDER_STATS.safeExternalUrlAllowlistChecks || 0) + 1;
  RAK_SECURITY_RENDER_STATS.lastAllowedExternalUrlKey = statKey;
  RAK_SECURITY_RENDER_STATS.lastRenderAt = Date.now();

  const normalized = normalizeSafeExternalUrl(rawUrl, statKey);
  if (!normalized) return '';

  try {
    const url = new URL(normalized, window.location.href);
    if (!isRakExternalHostAllowed(url.hostname, allowedHosts)) {
      RAK_SECURITY_RENDER_STATS.safeExternalUrlAllowlistBlocked = Number(RAK_SECURITY_RENDER_STATS.safeExternalUrlAllowlistBlocked || 0) + 1;
      RAK_SECURITY_RENDER_STATS.lastBlockedExternalUrl = statKey + ':host-not-allowed:' + String(url.hostname || 'unknown');
      return '';
    }
    return url.href;
  } catch (err) {
    RAK_SECURITY_RENDER_STATS.safeExternalUrlAllowlistBlocked = Number(RAK_SECURITY_RENDER_STATS.safeExternalUrlAllowlistBlocked || 0) + 1;
    RAK_SECURITY_RENDER_STATS.lastBlockedExternalUrl = statKey + ':allowlist-invalid-url';
    return '';
  }
}
window.normalizeAllowedExternalUrl = normalizeAllowedExternalUrl;

function setSafeExternalAnchor(anchor, rawUrl, allowedHosts, key = '') {
  if (!anchor) return false;
  const statKey = String(key || anchor.id || 'safe-external-anchor').trim();
  const href = normalizeAllowedExternalUrl(rawUrl, allowedHosts, statKey);
  if (!href) {
    try { anchor.removeAttribute('href'); } catch (err) {}
    return false;
  }

  try {
    const current = String(anchor.getAttribute('href') || '');
    const currentTarget = String(anchor.getAttribute('target') || '');
    const currentRel = String(anchor.getAttribute('rel') || '');
    const rel = 'noopener noreferrer';
    const noChange = current === href && currentTarget === '_blank' && currentRel === rel;
    if (noChange) {
      RAK_SECURITY_RENDER_STATS.safeExternalHrefSkippedWrites = Number(RAK_SECURITY_RENDER_STATS.safeExternalHrefSkippedWrites || 0) + 1;
      RAK_SECURITY_RENDER_STATS.lastSafeExternalHrefKey = statKey;
      RAK_SECURITY_RENDER_STATS.lastRenderAt = Date.now();
      return false;
    }
    anchor.setAttribute('href', href);
    anchor.setAttribute('target', '_blank');
    anchor.setAttribute('rel', rel);
    RAK_SECURITY_RENDER_STATS.safeExternalHrefWrites = Number(RAK_SECURITY_RENDER_STATS.safeExternalHrefWrites || 0) + 1;
    RAK_SECURITY_RENDER_STATS.lastSafeExternalHrefKey = statKey;
    RAK_SECURITY_RENDER_STATS.lastRenderAt = Date.now();
    return true;
  } catch (err) {
    return false;
  }
}
window.setSafeExternalAnchor = setSafeExternalAnchor;


function inspectDynamicHtmlForRenderRisk(html, key = '') {
  const raw = String(html ?? '');
  const statKey = String(key || 'html-render').trim();
  const risks = [];
  if (/<\s*script\b/i.test(raw)) risks.push('script-tag');
  if (/\son[a-z]+\s*=/i.test(raw)) risks.push('inline-event');
  if (/javascript\s*:/i.test(raw)) risks.push('javascript-url');
  if (/<\s*(iframe|object|embed)\b/i.test(raw)) risks.push('embedded-frame');
  const riskText = risks.length ? risks.join(',') : 'safe-template';
  RAK_SECURITY_RENDER_STATS.lastHtmlKey = statKey;
  RAK_SECURITY_RENDER_STATS.lastHtmlRisk = riskText;
  RAK_SECURITY_RENDER_STATS.lastRenderAt = Date.now();
  if (risks.length) RAK_SECURITY_RENDER_STATS.riskyHtmlWrites += 1;
  return { ok: !risks.length, risks, riskText };
}
window.inspectDynamicHtmlForRenderRisk = inspectDynamicHtmlForRenderRisk;

// Budoucí rozšíření: statistiky za rok pro jednotlivá jména/stroje/úklid.

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const RAK_DATA_OPTIMIZATION_STATS = window.__rakDataOptimizationStats || {
  phase: 'phase-7-data-optimization',
  localStorageWrites: 0,
  localStorageSkippedWrites: 0,
  localStorageWriteErrors: 0,
  rotationStateWrites: 0,
  rotationStateSkippedWrites: 0,
  approxBytesWritten: 0,
  approxBytesSkipped: 0,
  localStorageReads: 0,
  localStorageReadCacheHits: 0,
  localStorageJsonParseReads: 0,
  localStorageJsonParseCacheHits: 0,
  localStorageJsonParseErrors: 0,
  localReadCachePrunes: 0,
  localJsonCachePrunes: 0,
  localReadCacheTrimmedEntries: 0,
  localJsonCacheTrimmedEntries: 0,
  localReadCacheSize: 0,
  localJsonCacheSize: 0,
  localCacheMaxSize: 0,
  localJsonCacheMaxSize: 0,
  approxBytesRead: 0,
  homeRefreshSchedules: 0,
  homeRefreshCoalescedSchedules: 0,
  homeRefreshRuns: 0,
  homeRefreshModalSkips: 0,
  domHtmlWrites: 0,
  domHtmlSkippedWrites: 0,
  domHtmlWriteErrors: 0,
  domTextWrites: 0,
  domTextSkippedWrites: 0,
  domTextWriteErrors: 0,
  domClassWrites: 0,
  domClassSkippedWrites: 0,
  domClassWriteErrors: 0,
  domSelectWrites: 0,
  domSelectSkippedWrites: 0,
  domSelectWriteErrors: 0,
  domToggleWrites: 0,
  domToggleSkippedWrites: 0,
  domToggleWriteErrors: 0,
  domStyleWrites: 0,
  domStyleSkippedWrites: 0,
  domStyleWriteErrors: 0,
  domStyleLastKey: '',
  domStyleLastAt: null,
  domToggleLastKey: '',
  domToggleLastAt: null,
  domSelectLastKey: '',
  domSelectLastAt: null,
  domHtmlLastKey: '',
  domHtmlLastAt: null,
  domTextLastKey: '',
  domTextLastAt: null,
  domClassLastKey: '',
  domClassLastAt: null,
  homeRefreshLastReason: '',
  homeRefreshLastAt: null,
  lastWriteKey: '',
  lastSkipKey: '',
  lastReadKey: '',
  lastWriteAt: null,
  lastSkipAt: null,
  lastReadAt: null
};
window.__rakDataOptimizationStats = RAK_DATA_OPTIMIZATION_STATS;
[
  'domSelectWrites','domSelectSkippedWrites','domSelectWriteErrors','domToggleWrites','domToggleSkippedWrites','domToggleWriteErrors',
  'domStyleWrites','domStyleSkippedWrites','domStyleWriteErrors','localReadCachePrunes','localJsonCachePrunes',
  'localReadCacheTrimmedEntries','localJsonCacheTrimmedEntries','localReadCacheSize','localJsonCacheSize','localCacheMaxSize','localJsonCacheMaxSize'
].forEach((key) => {
  if (!Number.isFinite(Number(RAK_DATA_OPTIMIZATION_STATS[key]))) RAK_DATA_OPTIMIZATION_STATS[key] = 0;
});
if (typeof RAK_DATA_OPTIMIZATION_STATS.domSelectLastKey !== 'string') RAK_DATA_OPTIMIZATION_STATS.domSelectLastKey = '';
if (!('domSelectLastAt' in RAK_DATA_OPTIMIZATION_STATS)) RAK_DATA_OPTIMIZATION_STATS.domSelectLastAt = null;
if (typeof RAK_DATA_OPTIMIZATION_STATS.domToggleLastKey !== 'string') RAK_DATA_OPTIMIZATION_STATS.domToggleLastKey = '';
if (!('domToggleLastAt' in RAK_DATA_OPTIMIZATION_STATS)) RAK_DATA_OPTIMIZATION_STATS.domToggleLastAt = null;
if (typeof RAK_DATA_OPTIMIZATION_STATS.domStyleLastKey !== 'string') RAK_DATA_OPTIMIZATION_STATS.domStyleLastKey = '';
if (!('domStyleLastAt' in RAK_DATA_OPTIMIZATION_STATS)) RAK_DATA_OPTIMIZATION_STATS.domStyleLastAt = null;

const RAK_LOCAL_STORAGE_READ_CACHE = window.__rakLocalStorageReadCache || new Map();
window.__rakLocalStorageReadCache = RAK_LOCAL_STORAGE_READ_CACHE;
const RAK_LOCAL_STORAGE_JSON_CACHE = window.__rakLocalStorageJsonCache || new Map();
window.__rakLocalStorageJsonCache = RAK_LOCAL_STORAGE_JSON_CACHE;
const RAK_LOCAL_STORAGE_READ_CACHE_LIMIT = 80;
const RAK_LOCAL_STORAGE_JSON_CACHE_LIMIT = 48;
RAK_DATA_OPTIMIZATION_STATS.localCacheMaxSize = RAK_LOCAL_STORAGE_READ_CACHE_LIMIT;
RAK_DATA_OPTIMIZATION_STATS.localJsonCacheMaxSize = RAK_LOCAL_STORAGE_JSON_CACHE_LIMIT;

function pruneRakLocalMapCache(cache, limit, pruneCounterKey, trimmedCounterKey) {
  if (!cache || typeof cache.size !== 'number' || !Number.isFinite(limit) || limit <= 0) return 0;
  let trimmed = 0;
  try {
    while (cache.size > limit) {
      const oldest = cache.keys().next();
      if (!oldest || oldest.done) break;
      cache.delete(oldest.value);
      trimmed += 1;
    }
    if (trimmed > 0) {
      RAK_DATA_OPTIMIZATION_STATS[pruneCounterKey] = Number(RAK_DATA_OPTIMIZATION_STATS[pruneCounterKey] || 0) + 1;
      RAK_DATA_OPTIMIZATION_STATS[trimmedCounterKey] = Number(RAK_DATA_OPTIMIZATION_STATS[trimmedCounterKey] || 0) + trimmed;
    }
  } catch (err) {}
  return trimmed;
}

function refreshRakLocalMapEntry(cache, key, value) {
  if (!cache || !key) return;
  try {
    if (cache.has(key)) cache.delete(key);
    cache.set(key, value);
  } catch (err) {}
}

function updateRakLocalCacheSizes() {
  RAK_DATA_OPTIMIZATION_STATS.localReadCacheSize = RAK_LOCAL_STORAGE_READ_CACHE.size || 0;
  RAK_DATA_OPTIMIZATION_STATS.localJsonCacheSize = RAK_LOCAL_STORAGE_JSON_CACHE.size || 0;
}
try {
  window.addEventListener('storage', (event) => {
    if (!event || !event.key) {
      RAK_LOCAL_STORAGE_READ_CACHE.clear();
      RAK_LOCAL_STORAGE_JSON_CACHE.clear();
      updateRakLocalCacheSizes();
      return;
    }
    RAK_LOCAL_STORAGE_READ_CACHE.delete(event.key);
    RAK_LOCAL_STORAGE_JSON_CACHE.delete(event.key);
    updateRakLocalCacheSizes();
  });
} catch (err) {}

function approxStringBytes(value) {
  const text = String(value ?? '');
  try { return new Blob([text]).size; }
  catch (err) { return text.length; }
}

function getLocalStorageCached(key, fallbackValue = '') {
  const storageKey = String(key || '').trim();
  if (!storageKey) return fallbackValue;
  if (RAK_LOCAL_STORAGE_READ_CACHE.has(storageKey)) {
    RAK_DATA_OPTIMIZATION_STATS.localStorageReadCacheHits += 1;
    const cached = RAK_LOCAL_STORAGE_READ_CACHE.get(storageKey);
    // Fáze 7: jednoduché LRU chování, často používané klíče zůstávají v malé cache.
    refreshRakLocalMapEntry(RAK_LOCAL_STORAGE_READ_CACHE, storageKey, cached);
    updateRakLocalCacheSizes();
    return cached === null || cached === undefined ? fallbackValue : cached;
  }
  try {
    const raw = localStorage.getItem(storageKey);
    refreshRakLocalMapEntry(RAK_LOCAL_STORAGE_READ_CACHE, storageKey, raw);
    pruneRakLocalMapCache(RAK_LOCAL_STORAGE_READ_CACHE, RAK_LOCAL_STORAGE_READ_CACHE_LIMIT, 'localReadCachePrunes', 'localReadCacheTrimmedEntries');
    updateRakLocalCacheSizes();
    RAK_DATA_OPTIMIZATION_STATS.localStorageReads += 1;
    RAK_DATA_OPTIMIZATION_STATS.approxBytesRead += approxStringBytes(raw || '');
    RAK_DATA_OPTIMIZATION_STATS.lastReadKey = storageKey;
    RAK_DATA_OPTIMIZATION_STATS.lastReadAt = Date.now();
    return raw === null || raw === undefined ? fallbackValue : raw;
  } catch (err) {
    return fallbackValue;
  }
}

function cloneCachedJson(value) {
  if (value === null || value === undefined || typeof value !== 'object') return value;
  try { return JSON.parse(JSON.stringify(value)); }
  catch (err) { return Array.isArray(value) ? value.slice() : Object.assign({}, value); }
}

function parseLocalStorageJsonCached(key, fallbackValue) {
  const storageKey = String(key || '').trim();
  const raw = getLocalStorageCached(storageKey, '');
  if (!raw) return cloneCachedJson(fallbackValue);
  const cached = RAK_LOCAL_STORAGE_JSON_CACHE.get(storageKey);
  if (cached && cached.raw === raw) {
    RAK_DATA_OPTIMIZATION_STATS.localStorageJsonParseCacheHits += 1;
    refreshRakLocalMapEntry(RAK_LOCAL_STORAGE_JSON_CACHE, storageKey, cached);
    updateRakLocalCacheSizes();
    return cloneCachedJson(cached.value);
  }
  try {
    const parsed = JSON.parse(raw);
    refreshRakLocalMapEntry(RAK_LOCAL_STORAGE_JSON_CACHE, storageKey, { raw, value: parsed });
    pruneRakLocalMapCache(RAK_LOCAL_STORAGE_JSON_CACHE, RAK_LOCAL_STORAGE_JSON_CACHE_LIMIT, 'localJsonCachePrunes', 'localJsonCacheTrimmedEntries');
    updateRakLocalCacheSizes();
    RAK_DATA_OPTIMIZATION_STATS.localStorageJsonParseReads += 1;
    return cloneCachedJson(parsed);
  } catch (err) {
    RAK_DATA_OPTIMIZATION_STATS.localStorageJsonParseErrors += 1;
    return cloneCachedJson(fallbackValue);
  }
}

function setLocalStorageIfChanged(key, value) {
  const storageKey = String(key || '').trim();
  if (!storageKey) return false;
  const storageValue = String(value ?? '');
  try {
    const current = RAK_LOCAL_STORAGE_READ_CACHE.has(storageKey)
      ? RAK_LOCAL_STORAGE_READ_CACHE.get(storageKey)
      : localStorage.getItem(storageKey);
    if (current === storageValue) {
      RAK_DATA_OPTIMIZATION_STATS.localStorageSkippedWrites += 1;
      RAK_DATA_OPTIMIZATION_STATS.approxBytesSkipped += approxStringBytes(storageValue);
      RAK_DATA_OPTIMIZATION_STATS.lastSkipKey = storageKey;
      RAK_DATA_OPTIMIZATION_STATS.lastSkipAt = Date.now();
      if (storageKey === APP_KEY) RAK_DATA_OPTIMIZATION_STATS.rotationStateSkippedWrites += 1;
      return false;
    }
    localStorage.setItem(storageKey, storageValue);
    refreshRakLocalMapEntry(RAK_LOCAL_STORAGE_READ_CACHE, storageKey, storageValue);
    RAK_LOCAL_STORAGE_JSON_CACHE.delete(storageKey);
    pruneRakLocalMapCache(RAK_LOCAL_STORAGE_READ_CACHE, RAK_LOCAL_STORAGE_READ_CACHE_LIMIT, 'localReadCachePrunes', 'localReadCacheTrimmedEntries');
    updateRakLocalCacheSizes();
    RAK_DATA_OPTIMIZATION_STATS.localStorageWrites += 1;
    RAK_DATA_OPTIMIZATION_STATS.approxBytesWritten += approxStringBytes(storageValue);
    RAK_DATA_OPTIMIZATION_STATS.lastWriteKey = storageKey;
    RAK_DATA_OPTIMIZATION_STATS.lastWriteAt = Date.now();
    if (storageKey === APP_KEY) RAK_DATA_OPTIMIZATION_STATS.rotationStateWrites += 1;
    return true;
  } catch (err) {
    RAK_DATA_OPTIMIZATION_STATS.localStorageWriteErrors += 1;
    throw err;
  }
}

function getDataOptimizationStatus() {
  updateRakLocalCacheSizes();
  return Object.assign({}, RAK_DATA_OPTIMIZATION_STATS);
}
window.getDataOptimizationStatus = getDataOptimizationStatus;


function setElementHtmlIfChanged(element, html, key = '') {
  if (!element) return false;
  const nextHtml = String(html ?? '');
  const statKey = String(key || element.id || element.className || 'html').trim();
  const htmlRisk = typeof inspectDynamicHtmlForRenderRisk === 'function'
    ? inspectDynamicHtmlForRenderRisk(nextHtml, statKey)
    : { ok: true, riskText: 'unchecked' };
  try {
    if (element.__rakLastHtml === nextHtml || element.innerHTML === nextHtml) {
      element.__rakLastHtml = nextHtml;
      RAK_DATA_OPTIMIZATION_STATS.domHtmlSkippedWrites += 1;
      RAK_DATA_OPTIMIZATION_STATS.domHtmlLastKey = statKey;
      RAK_DATA_OPTIMIZATION_STATS.domHtmlLastAt = Date.now();
      RAK_SECURITY_RENDER_STATS.guardedHtmlSkippedWrites += 1;
      RAK_SECURITY_RENDER_STATS.lastHtmlKey = statKey;
      RAK_SECURITY_RENDER_STATS.lastHtmlRisk = htmlRisk && htmlRisk.riskText ? htmlRisk.riskText : 'safe-template';
      RAK_SECURITY_RENDER_STATS.lastRenderAt = Date.now();
      return false;
    }
    element.innerHTML = nextHtml;
    element.__rakLastHtml = nextHtml;
    RAK_DATA_OPTIMIZATION_STATS.domHtmlWrites += 1;
    RAK_SECURITY_RENDER_STATS.guardedHtmlWrites += 1;
    RAK_SECURITY_RENDER_STATS.lastHtmlKey = statKey;
    RAK_SECURITY_RENDER_STATS.lastHtmlRisk = htmlRisk && htmlRisk.riskText ? htmlRisk.riskText : 'safe-template';
    RAK_SECURITY_RENDER_STATS.lastRenderAt = Date.now();
    RAK_DATA_OPTIMIZATION_STATS.domHtmlLastKey = statKey;
    RAK_DATA_OPTIMIZATION_STATS.domHtmlLastAt = Date.now();
    return true;
  } catch (err) {
    RAK_DATA_OPTIMIZATION_STATS.domHtmlWriteErrors += 1;
    element.innerHTML = nextHtml;
    element.__rakLastHtml = nextHtml;
    RAK_SECURITY_RENDER_STATS.guardedHtmlWrites += 1;
    RAK_SECURITY_RENDER_STATS.lastHtmlKey = statKey;
    RAK_SECURITY_RENDER_STATS.lastHtmlRisk = 'write-error-fallback';
    RAK_SECURITY_RENDER_STATS.lastRenderAt = Date.now();
    return true;
  }
}
window.setElementHtmlIfChanged = setElementHtmlIfChanged;

function setElementTextIfChanged(element, text, key = '') {
  if (!element) return false;
  const nextText = String(text ?? '');
  const statKey = String(key || element.id || element.className || 'text').trim();
  try {
    if (element.textContent === nextText) {
      RAK_DATA_OPTIMIZATION_STATS.domTextSkippedWrites += 1;
      RAK_DATA_OPTIMIZATION_STATS.domTextLastKey = statKey;
      RAK_DATA_OPTIMIZATION_STATS.domTextLastAt = Date.now();
      RAK_SECURITY_RENDER_STATS.guardedTextSkippedWrites += 1;
      RAK_SECURITY_RENDER_STATS.lastTextKey = statKey;
      RAK_SECURITY_RENDER_STATS.lastRenderAt = Date.now();
      return false;
    }
    element.textContent = nextText;
    RAK_DATA_OPTIMIZATION_STATS.domTextWrites += 1;
    RAK_SECURITY_RENDER_STATS.guardedTextWrites += 1;
    RAK_SECURITY_RENDER_STATS.lastTextKey = statKey;
    RAK_SECURITY_RENDER_STATS.lastRenderAt = Date.now();
    RAK_DATA_OPTIMIZATION_STATS.domTextLastKey = statKey;
    RAK_DATA_OPTIMIZATION_STATS.domTextLastAt = Date.now();
    return true;
  } catch (err) {
    RAK_DATA_OPTIMIZATION_STATS.domTextWriteErrors += 1;
    element.textContent = nextText;
    return true;
  }
}
window.setElementTextIfChanged = setElementTextIfChanged;

function setElementClassNameIfChanged(element, className, key = '') {
  if (!element) return false;
  const nextClassName = String(className ?? '');
  const statKey = String(key || element.id || 'class').trim();
  try {
    if (element.className === nextClassName) {
      RAK_DATA_OPTIMIZATION_STATS.domClassSkippedWrites += 1;
      RAK_DATA_OPTIMIZATION_STATS.domClassLastKey = statKey;
      RAK_DATA_OPTIMIZATION_STATS.domClassLastAt = Date.now();
      return false;
    }
    element.className = nextClassName;
    RAK_DATA_OPTIMIZATION_STATS.domClassWrites += 1;
    RAK_DATA_OPTIMIZATION_STATS.domClassLastKey = statKey;
    RAK_DATA_OPTIMIZATION_STATS.domClassLastAt = Date.now();
    return true;
  } catch (err) {
    RAK_DATA_OPTIMIZATION_STATS.domClassWriteErrors += 1;
    element.className = nextClassName;
    return true;
  }
}
window.setElementClassNameIfChanged = setElementClassNameIfChanged;


function toggleElementClassIfChanged(element, className, force, key = '') {
  if (!element || !className) return false;
  const classToken = String(className || '').trim();
  if (!classToken) return false;
  const shouldHave = !!force;
  const statKey = String(key || element.id || classToken || 'toggle').trim();
  try {
    const hasClass = element.classList.contains(classToken);
    if (hasClass === shouldHave) {
      RAK_DATA_OPTIMIZATION_STATS.domToggleSkippedWrites += 1;
      RAK_DATA_OPTIMIZATION_STATS.domToggleLastKey = statKey;
      RAK_DATA_OPTIMIZATION_STATS.domToggleLastAt = Date.now();
      return false;
    }
    element.classList.toggle(classToken, shouldHave);
    RAK_DATA_OPTIMIZATION_STATS.domToggleWrites += 1;
    RAK_DATA_OPTIMIZATION_STATS.domToggleLastKey = statKey;
    RAK_DATA_OPTIMIZATION_STATS.domToggleLastAt = Date.now();
    return true;
  } catch (err) {
    RAK_DATA_OPTIMIZATION_STATS.domToggleWriteErrors += 1;
    try { element.classList.toggle(classToken, shouldHave); } catch (fallbackErr) {}
    return true;
  }
}
window.toggleElementClassIfChanged = toggleElementClassIfChanged;

function setStylePropertyIfChanged(element, propertyName, value, priority = '', key = '') {
  if (!element || !element.style || !propertyName) return false;
  const prop = String(propertyName || '').trim();
  if (!prop) return false;
  const nextValue = String(value ?? '');
  const nextPriority = String(priority || '').trim();
  const statKey = String(key || element.id || prop || 'style').trim();
  try {
    const currentValue = String(element.style.getPropertyValue(prop) || '');
    const currentPriority = String(element.style.getPropertyPriority(prop) || '');
    if (currentValue === nextValue && currentPriority === nextPriority) {
      RAK_DATA_OPTIMIZATION_STATS.domStyleSkippedWrites += 1;
      RAK_DATA_OPTIMIZATION_STATS.domStyleLastKey = statKey;
      RAK_DATA_OPTIMIZATION_STATS.domStyleLastAt = Date.now();
      return false;
    }
    element.style.setProperty(prop, nextValue, nextPriority);
    RAK_DATA_OPTIMIZATION_STATS.domStyleWrites += 1;
    RAK_DATA_OPTIMIZATION_STATS.domStyleLastKey = statKey;
    RAK_DATA_OPTIMIZATION_STATS.domStyleLastAt = Date.now();
    return true;
  } catch (err) {
    RAK_DATA_OPTIMIZATION_STATS.domStyleWriteErrors += 1;
    try { element.style.setProperty(prop, nextValue, nextPriority); } catch (fallbackErr) {}
    return true;
  }
}
window.setStylePropertyIfChanged = setStylePropertyIfChanged;

function setSelectOptionsIfChanged(selectElement, options, selectedValue = '', key = '') {
  if (!selectElement) return false;
  const normalizedOptions = (Array.isArray(options) ? options : []).map((option) => {
    if (option && typeof option === 'object') {
      return {
        value: String(option.value ?? ''),
        label: String(option.label ?? option.text ?? option.value ?? '')
      };
    }
    return { value: String(option ?? ''), label: String(option ?? '') };
  });
  const selected = String(selectedValue ?? '');
  const signature = JSON.stringify({ options: normalizedOptions, selected });
  const statKey = String(key || selectElement.id || selectElement.name || 'select').trim();
  try {
    if (selectElement.__rakLastOptionsSignature === signature) {
      RAK_DATA_OPTIMIZATION_STATS.domSelectSkippedWrites += 1;
      RAK_DATA_OPTIMIZATION_STATS.domSelectLastKey = statKey;
      RAK_DATA_OPTIMIZATION_STATS.domSelectLastAt = Date.now();
      return false;
    }
    const existing = Array.from(selectElement.options || []).map((opt) => ({
      value: String(opt.value ?? ''),
      label: String(opt.textContent ?? '')
    }));
    const existingSignature = JSON.stringify({ options: existing, selected: String(selectElement.value ?? '') });
    if (existingSignature === signature) {
      selectElement.__rakLastOptionsSignature = signature;
      RAK_DATA_OPTIMIZATION_STATS.domSelectSkippedWrites += 1;
      RAK_DATA_OPTIMIZATION_STATS.domSelectLastKey = statKey;
      RAK_DATA_OPTIMIZATION_STATS.domSelectLastAt = Date.now();
      return false;
    }
    const fragment = document.createDocumentFragment();
    normalizedOptions.forEach((item) => {
      const opt = document.createElement('option');
      opt.value = item.value;
      opt.textContent = item.label;
      if (item.value === selected) opt.selected = true;
      fragment.appendChild(opt);
    });
    if (typeof replaceElementChildrenSafely === 'function') {
      replaceElementChildrenSafely(selectElement, fragment, statKey + ':options');
    } else {
      selectElement.replaceChildren(fragment);
    }
    if (selected && selectElement.value !== selected) selectElement.value = selected;
    selectElement.__rakLastOptionsSignature = signature;
    RAK_DATA_OPTIMIZATION_STATS.domSelectWrites += 1;
    RAK_DATA_OPTIMIZATION_STATS.domSelectLastKey = statKey;
    RAK_DATA_OPTIMIZATION_STATS.domSelectLastAt = Date.now();
    return true;
  } catch (err) {
    RAK_DATA_OPTIMIZATION_STATS.domSelectWriteErrors += 1;
    try {
      while (selectElement.firstChild) selectElement.removeChild(selectElement.firstChild);
      normalizedOptions.forEach((item) => {
        const opt = document.createElement('option');
        opt.value = item.value;
        opt.textContent = item.label;
        if (item.value === selected) opt.selected = true;
        selectElement.appendChild(opt);
      });
      selectElement.__rakLastOptionsSignature = signature;
    } catch (fallbackErr) {}
    return true;
  }
}
window.setSelectOptionsIfChanged = setSelectOptionsIfChanged;

function normalizeRows(rows) {
  return (Array.isArray(rows) ? rows : []).map(row => ({
    date: String(row && row.date ? row.date : "").trim(),
    cells: (Array.isArray(row && row.cells) ? row.cells : []).map(v => String(v || "").trim())
  }));
}

function canonicalAbsenceKey(note) {
  const n = normalizeNoteEntry(note);
  const people = (n.people && n.people.length) ? n.people.join(" a ") : (n.person || "");
  if (n.isAbsence) {
    return ["ABS", n.date, n.shift, people, n.code].join("|");
  }
  return ["NOTE", n.date, n.shift, n.text || people || ""].join("|");
}

function mergeNotes(primaryNotes, fallbackNotes) {
  const out = [];
  const seen = new Set();

  const pushNote = (note) => {
    const normalized = normalizeNoteEntry(note);
    const peopleText = (normalized.people && normalized.people.length)
      ? normalized.people.join(" a ")
      : normalized.person;

    const item = {
      date: normalized.date,
      shift: normalized.shift,
      person: peopleText,
      code: normalized.code,
      text: normalized.text || [normalized.date, peopleText, normalized.code].filter(Boolean).join(" ").trim()
    };

    const key = canonicalAbsenceKey(item);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  };

  (Array.isArray(primaryNotes) ? primaryNotes : []).forEach(pushNote);
  (Array.isArray(fallbackNotes) ? fallbackNotes : []).forEach(pushNote);
  return out;
}

function normalizeMonthForImport(monthData, fallbackMonthData) {
  const normalizeSection = (section, fallbackMachines) => {
    const incoming = monthData && monthData[section] ? monthData[section] : null;
    const fallback = fallbackMonthData && fallbackMonthData[section] ? fallbackMonthData[section] : null;
    const incomingRows = Array.isArray(incoming && incoming.rows) ? normalizeRows(incoming.rows) : null;
    const fallbackRows = Array.isArray(fallback && fallback.rows) ? normalizeRows(fallback.rows) : [];
    const rows = incomingRows !== null ? incomingRows : fallbackRows;

    const machines = (incoming && Array.isArray(incoming.machines) && incoming.machines.length)
      ? incoming.machines.slice()
      : ((fallback && Array.isArray(fallback.machines) && fallback.machines.length)
          ? fallback.machines.slice()
          : fallbackMachines.slice());
    const title = (incoming && incoming.title) || (fallback && fallback.title) || (section === "hard" ? "Rotace tvrdota" : "Rotace měkota");
    return { title, machines, rows };
  };

  const normalizeNotesArray = (arr) => (Array.isArray(arr) ? arr : []).map(n => ({
    date: String(n && n.date ? n.date : "").trim(),
    shift: String(n && n.shift ? n.shift : "").trim(),
    person: String(n && n.person ? n.person : "").trim(),
    code: String(n && n.code ? n.code : "").trim(),
    text: String(n && n.text ? n.text : "").trim()
  }));

  const hasNotes = monthData && Object.prototype.hasOwnProperty.call(monthData, "notes");
  const incomingNotes = hasNotes ? normalizeNotesArray(monthData.notes) : null;
  const fallbackNotes = fallbackMonthData && Array.isArray(fallbackMonthData.notes) ? normalizeNotesArray(fallbackMonthData.notes) : [];

  const importMeta = (monthData && monthData.importMeta && typeof monthData.importMeta === 'object')
    ? Object.assign({}, monthData.importMeta)
    : ((fallbackMonthData && fallbackMonthData.importMeta && typeof fallbackMonthData.importMeta === 'object') ? Object.assign({}, fallbackMonthData.importMeta) : null);

  const normalizePressRotationOverrides = (value) => {
    const out = {};
    const source = value && typeof value === 'object' ? value : {};
    Object.entries(source).forEach(([key, raw]) => {
      const cleanKey = String(key || '').trim();
      const mode = String(raw || '').trim().toLowerCase();
      if (!cleanKey) return;
      if (mode === 'split' || mode === 'rotate' || mode === 'rotace' || mode === 'yes' || mode === 'ano') out[cleanKey] = 'split';
      if (mode === 'nosplit' || mode === 'no-split' || mode === 'none' || mode === 'nerotace' || mode === 'ne' || mode === 'no') out[cleanKey] = 'nosplit';
    });
    return out;
  };

  const incomingPressOverrides = monthData && Object.prototype.hasOwnProperty.call(monthData, 'pressRotationOverrides')
    ? normalizePressRotationOverrides(monthData.pressRotationOverrides)
    : null;
  const fallbackPressOverrides = fallbackMonthData && fallbackMonthData.pressRotationOverrides
    ? normalizePressRotationOverrides(fallbackMonthData.pressRotationOverrides)
    : {};

  const normalizeDayMods = (arr) => (Array.isArray(arr) ? arr : []).map(d => ({
    section: (String(d && d.section ? d.section : '').trim().toLowerCase() === 'soft') ? 'soft' : 'hard',
    date: String(d && d.date ? d.date : '').trim(),
    cellIndex: Number.isFinite(Number(d && d.cellIndex)) ? Number(d.cellIndex) : -1,
    person: String(d && d.person ? d.person : '').trim(),
    type: String(d && d.type ? d.type : '').trim(),
    time: String(d && d.time ? d.time : '').trim(),
    restReason: String(d && d.restReason ? d.restReason : '').trim(),
    workedHours: Number.isFinite(Number(d && d.workedHours)) ? Number(d.workedHours) : null,
    restHours: Number.isFinite(Number(d && d.restHours)) ? Number(d.restHours) : null,
    overtime: (d && d.overtime === true) ? true : ((d && d.overtime === false) ? false : null),
    toSection: (String(d && d.toSection ? d.toSection : '').trim().toLowerCase() === 'soft') ? 'soft' : (String(d && d.toSection ? d.toSection : '').trim().toLowerCase() === 'hard' ? 'hard' : ''),
    toCellIndex: Number.isFinite(Number(d && d.toCellIndex)) ? Number(d.toCellIndex) : null,
    note: String(d && d.note ? d.note : '').trim()
  })).filter(d => d.date && d.cellIndex >= 0 && d.type);

  const hasDayMods = monthData && Object.prototype.hasOwnProperty.call(monthData, 'dayMods');
  const incomingDayMods = hasDayMods ? normalizeDayMods(monthData.dayMods) : null;
  const fallbackDayMods = fallbackMonthData && Array.isArray(fallbackMonthData.dayMods) ? normalizeDayMods(fallbackMonthData.dayMods) : [];

  const normalized = {
    hard: normalizeSection("hard", HARD_MACHINE_HEADERS),
    soft: normalizeSection("soft", SOFT_MACHINE_HEADERS),
    notes: incomingNotes !== null ? incomingNotes : fallbackNotes
  };
  const pressRotationOverrides = incomingPressOverrides !== null ? incomingPressOverrides : fallbackPressOverrides;
  if (pressRotationOverrides && Object.keys(pressRotationOverrides).length) normalized.pressRotationOverrides = pressRotationOverrides;
  const dayMods = incomingDayMods !== null ? incomingDayMods : fallbackDayMods;
  if (dayMods && dayMods.length) normalized.dayMods = dayMods;
  if (importMeta) normalized.importMeta = importMeta;
  return normalized;
}

function getRotationPressRotationOverride(month, dateBaseKey) {
  const key = String(dateBaseKey || '').trim();
  const map = month && month.pressRotationOverrides && typeof month.pressRotationOverrides === 'object' ? month.pressRotationOverrides : null;
  const value = map && key ? String(map[key] || '').trim().toLowerCase() : '';
  return value === 'split' || value === 'nosplit' ? value : '';
}

function getRotationDateBaseKeyFromParsed(parsedDate, monthKey) {
  const parsedMonth = typeof parseMonthKey === 'function' ? parseMonthKey(monthKey) : null;
  const day = Number(parsedDate && parsedDate.day);
  const month = Number((parsedDate && parsedDate.month) || (parsedMonth && parsedMonth.month));
  if (Number.isFinite(day) && Number.isFinite(month)) return String(day) + '.' + String(month) + '.';
  return '';
}

function normalizeRotationData(rotation) {
  const src = clone(initialRotationData);
  const incoming = rotation && rotation.months && typeof rotation.months === "object" ? rotation.months : {};
  Object.entries(incoming).forEach(([monthKey, monthData]) => {
    const fallbackMonthData = initialRotationData.months ? initialRotationData.months[monthKey] : null;
    src.months[monthKey] = normalizeMonthForImport(monthData, fallbackMonthData);
  });
  return src;
}

function defaultRotation() {
  return normalizeRotationData({ months: {} });
}

function loadRotationData() {
  try {
    // v.1.5 (809): lokální rozpis už se nezahazuje jen kvůli jiné build značce.
    // Starší ROTATION_BUILD obsahoval Date.now(), takže se měnil při každém reloadu a mohl
    // vynutit návrat na defaultní rotace i když byl uložený stav v pořádku.
    // Build ponecháváme jen jako diagnostickou značku; kompatibilitu řeší normalizeRotationData().
    const parsed = parseLocalStorageJsonCached(APP_KEY, null);
    if (!parsed || !parsed.months) return defaultRotation();
    return normalizeRotationData(parsed);
  } catch (e) {
    return defaultRotation();
  }
}

function saveRotationData() {
  try {
    let changed = false;
    const write = (key, value) => {
      if (setLocalStorageIfChanged(key, value)) changed = true;
    };

    // Fáze 7: velký stav rotací ukládáme jen tehdy, když se opravdu změnil.
    // Dřív se při některých kliknutích/stringify + localStorage zápis opakoval i bez změny.
    const rotationJson = JSON.stringify(app.rotation);
    write(APP_KEY, rotationJson);
    write("rotationBuild", ROTATION_BUILD);
    write("machine", app.machine);
    write("prog", app.prog);
    write("f_kusy", document.getElementById("f_kusy")?.value || "");
    write("f_finish_kusy", document.getElementById("f_finish_kusy")?.value || "");
    write("f_finish_davky", document.getElementById("f_finish_davky")?.value || "");
    write("p_kusy", document.getElementById("p_kusy")?.value || "");
    write("b_finish_kusy", document.getElementById("b_finish_kusy")?.value || "");
    write("b_finish_davky", document.getElementById("b_finish_davky")?.value || "");
    write("davka", document.getElementById("davka")?.value || "");
    write("orovnani", document.getElementById("orovnani")?.value || "");
    write("celkem", document.getElementById("celkem")?.value || "");
    write("soustruhMode", app.soustruhMode);
    write("soustruhFirstBatch", app.soustruhFirstBatch || "");
    write("soustruhPlan", app.soustruhPlan || "");
    write("soustruh126Start", String(app.soustruh126Start || 32));
    write("soustruh126HeatFirst", app.soustruh126HeatFirst || document.getElementById("v127_heat_first")?.value || "");
    write("soustruh106HeatFirst", app.soustruh106HeatFirst || document.getElementById("v106_heat_first")?.value || "");
    write("soustruhComboFreeType", app.soustruhComboFreeType || "126");
    write("soustruhComboFirstType", app.soustruhComboFirstType || "lis");
    write("soustruhCombo126Start", String(app.soustruhCombo126Start || 32));
    write("soustruhComboHeatFirst", app.soustruhComboHeatFirst || document.getElementById("combo_heat_first")?.value || "");
    write("soustruhCombo106Counts", JSON.stringify(app.soustruhCombo106Counts || ["", "", "", ""]));
    write("combo_first_start", document.getElementById("combo_first_start")?.value || "");
    write("combo_first_end", document.getElementById("combo_first_end")?.value || "");
    write("combo_second_start", document.getElementById("combo_second_start")?.value || "");
    write("combo_second_plan", document.getElementById("combo_second_plan")?.value || "");
    write("soustruh106Counts", JSON.stringify(app.soustruh106Counts || ["", "", "", ""]));
    // v.1.5 (809): admin odemčení je jen pro aktuální relaci a nesmí se ukládat do localStorage.
    if (changed && typeof window.__rotaceSignalStateChange === "function") {
      window.__rotaceSignalStateChange("local-save");
    }
  } catch (e) {}
}

function restoreInputs() {
  const setVal = (id, key) => {
    const el = document.getElementById(id);
    if (el) el.value = getLocalStorageCached(key, "") || "";
  };
  setVal("f_kusy", "f_kusy");
  setVal("f_finish_kusy", "f_finish_kusy");
  setVal("f_finish_davky", "f_finish_davky");
  setVal("p_kusy", "p_kusy");
  setVal("b_finish_kusy", "b_finish_kusy");
  setVal("b_finish_davky", "b_finish_davky");
  setVal("davka", "davka");
  setVal("orovnani", "orovnani");
  setVal("celkem", "celkem");
  setVal("combo_first_start", "combo_first_start");
  setVal("combo_first_end", "combo_first_end");
  setVal("combo_second_start", "combo_second_start");
  setVal("combo_second_plan", "combo_second_plan");
  const lisPlanEl = document.getElementById("lis_plan");
  const soustruhDefaultPlan = String(typeof getSoustruhDefaultPlan === "function" ? getSoustruhDefaultPlan() : 1216);
  if (lisPlanEl) lisPlanEl.value = soustruhDefaultPlan;
  const v127PlanEl = document.getElementById("v127_plan");
  if (v127PlanEl) v127PlanEl.value = soustruhDefaultPlan;
  const v106PlanEl = document.getElementById("v106_plan");
  if (v106PlanEl) v106PlanEl.value = soustruhDefaultPlan;
  const soustruhCounts = parseLocalStorageJsonCached("soustruh106Counts", ["", "", "", ""]);
  const soustruhComboCounts = parseLocalStorageJsonCached("soustruhCombo106Counts", ["", "", "", ""]);
  const v127HeatFirstEl = document.getElementById("v127_heat_first");
  if (v127HeatFirstEl && !v127HeatFirstEl.value) v127HeatFirstEl.value = getLocalStorageCached("soustruh126HeatFirst", "") || "";
  const v106HeatFirstEl = document.getElementById("v106_heat_first");
  if (v106HeatFirstEl && !v106HeatFirstEl.value) v106HeatFirstEl.value = getLocalStorageCached("soustruh106HeatFirst", "") || "";
  const comboHeatFirstEl = document.getElementById("combo_heat_first");
  if (comboHeatFirstEl && !comboHeatFirstEl.value) comboHeatFirstEl.value = getLocalStorageCached("soustruhComboHeatFirst", "") || "";
  ["v106_c1","v106_c2","v106_c3","v106_c4"].forEach((id, idx) => { const el = document.getElementById(id); if (el && !el.value) el.value = soustruhCounts[idx] || ""; });
  ["combo106_c1","combo106_c2","combo106_c3","combo106_c4"].forEach((id, idx) => { const el = document.getElementById(id); if (el && !el.value) el.value = soustruhComboCounts[idx] || ""; });
  app.soustruhMode = getLocalStorageCached("soustruhMode", "") || app.soustruhMode || "lis";
  app.soustruhFirstBatch = getLocalStorageCached("soustruhFirstBatch", "") || "";
  const storedSoustruhPlan = getLocalStorageCached("soustruhPlan", "");
  app.soustruhPlan = storedSoustruhPlan && storedSoustruhPlan !== "1248" ? storedSoustruhPlan : String(typeof getSoustruhDefaultPlan === "function" ? getSoustruhDefaultPlan() : 1216);
  app.soustruh126Start = parseInt(getLocalStorageCached("soustruh126Start", ""), 10) || 32;
  app.soustruh126HeatFirst = getLocalStorageCached("soustruh126HeatFirst", "") || "";
  app.soustruh106HeatFirst = getLocalStorageCached("soustruh106HeatFirst", "") || "";
  app.soustruhComboFreeType = getLocalStorageCached("soustruhComboFreeType", "") === "106" ? "106" : "126";
  app.soustruhComboFirstType = getLocalStorageCached("soustruhComboFirstType", "") === "free" ? "free" : "lis";
  app.soustruhCombo126Start = parseInt(getLocalStorageCached("soustruhCombo126Start", ""), 10) || 32;
  app.soustruhComboHeatFirst = getLocalStorageCached("soustruhComboHeatFirst", "") || "";
  app.soustruhCombo106Counts = Array.isArray(soustruhComboCounts) ? soustruhComboCounts : ["", "", "", ""];
  app.soustruh106Counts = Array.isArray(soustruhCounts) ? soustruhCounts : ["", "", "", ""];
}

function getShiftEnd(now) {
  const d = new Date(now);
  const day = d.getDay();

  if (day === 0 && d.getHours() >= 6 && d.getHours() < 14) {
    const e = new Date(d);
    e.setHours(14, 0, 0, 0);
    return e;
  }

  if (d.getHours() >= 6 && d.getHours() < 18) {
    const e = new Date(d);
    e.setHours(18, 0, 0, 0);
    return e;
  } else {
    const e = new Date(d);
    if (d.getHours() >= 18) e.setDate(e.getDate() + 1);
    e.setHours(6, 0, 0, 0);
    return e;
  }
}

function getSoustruhDefaultPlan(now) {
  const d = new Date(now || new Date());
  const day = d.getDay();
  const hour = d.getHours();

  if (day === 0 && hour >= 6 && hour < 14) return 704;
  if ((day === 0 && hour >= 22) || (day === 1 && hour < 6)) return 832;
  return 1216;
}

const SHIFT_CYCLE_START = new Date(2026, 3, 27, 0, 0, 0, 0); // 27.4.2026 = B / 1. týden
const SHIFT_CYCLE_ORDER = ["B", "D", "A", "C"];
const SHIFT_PHASE_BY_TEAM = { B: 0, D: 1, A: 2, C: 3 };

function startOfLocalDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function startOfWeekMonday(d) {
  const day = d.getDay();
  const diff = (day + 6) % 7; // Monday = 0
  const base = startOfLocalDay(d);
  base.setDate(base.getDate() - diff);
  return base;
}

function formatDuration(ms) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts = [];
  if (days) parts.push(days + " d");
  if (hours || parts.length) parts.push(hours + " h");
  parts.push(minutes + " min");
  return parts.join(" ");
}

function parseMonthKey(monthKey) {
  const m = /^(\d{1,2})\/(\d{2})$/.exec(String(monthKey || "").trim());
  if (!m) return null;
  return {
    month: parseInt(m[1], 10),
    year: 2000 + parseInt(m[2], 10)
  };
}

function makeSortDateFromMonthKey(monthKey, day, month) {
  const parsed = parseMonthKey(monthKey);
  const year = parsed ? parsed.year : 2026;
  const mm = Number.isFinite(month) ? month : (parsed ? parsed.month : 1);
  const dd = Number.isFinite(day) ? day : 1;
  return new Date(year, mm - 1, dd, 12, 0, 0, 0).toISOString();
}

function monthKeyFromYearMonth(year, month) {
  return String(month) + "/" + String(year).slice(-2);
}

function getAvailableYears(rotation) {
  const src = rotation || app.rotation || {};
  const years = new Set();
  Object.keys(src.months || {}).forEach(monthKey => {
    const parsed = parseMonthKey(monthKey);
    if (parsed) years.add(parsed.year);
  });
  if (!years.size) years.add(new Date().getFullYear());
  return [...years].sort((a, b) => a - b);
}

function getImportYears(rotation) {
  const available = getAvailableYears(rotation);
  const currentYear = new Date().getFullYear();
  const minYear = available.length ? Math.min(...available) : currentYear;
  const maxYear = available.length ? Math.max(...available) : currentYear;
  const start = Math.min(minYear - 1, currentYear - 1);
  const end = Math.max(maxYear + 1, currentYear + 2);
  const years = [];
  for (let y = start; y <= end; y += 1) years.push(y);
  return years;
}

function getInitialSelectedYear(rotation) {
  const years = getAvailableYears(rotation);
  const currentYear = new Date().getFullYear();
  return years.includes(currentYear) ? currentYear : years[years.length - 1];
}

function getMonthsForYear(rotation, year) {
  return Object.keys((rotation || app.rotation || {}).months || {})
    .filter(monthKey => {
      const parsed = parseMonthKey(monthKey);
      return parsed && parsed.year === year;
    })
    .sort((a, b) => {
      const pa = parseMonthKey(a);
      const pb = parseMonthKey(b);
      if (pa.year !== pb.year) return pa.year - pb.year;
      return pa.month - pb.month;
    });
}

function formatCount(value) {
  const num = Number(value) || 0;
  return Number.isInteger(num) ? String(num) : String(num).replace(".", ",");
}

function formatDoses(value) {
  const num = Number(value) || 0;
  const rounded = Math.round((num / 32) * 10) / 10;
  return formatCount(rounded);
}

function createDateFromMonthKey(monthKey, day) {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return null;
  return new Date(parsed.year, parsed.month - 1, day, 12, 0, 0, 0);
}

function isSundayForMonthKey(monthKey, day) {
  const d = createDateFromMonthKey(monthKey, day);
  return d ? d.getDay() === 0 : false;
}

function setSelectedYear(year) {
  const numeric = parseInt(year, 10);
  if (!Number.isFinite(numeric)) return;
  app.selectedYear = numeric;

  const yearMonths = getMonthsForYear(app.rotation, numeric);
  if (!app.selectedMonth || !yearMonths.includes(app.selectedMonth)) {
    app.selectedMonth = yearMonths[0] || null;
  }

  // v.1.5 (743): změna roku musí okamžitě překreslit Rozpisy i Statistiky
  // bez návratu na aktuální rok a bez starých detailů z jiného roku.
  if (typeof syncYearControls === 'function') syncYearControls();
  if (typeof renderMonthGrid === 'function') renderMonthGrid();
  if (typeof renderStatsPanel === 'function') renderStatsPanel();
  if (typeof renderRotace === 'function') renderRotace();
  if (app.selectedMonth && typeof renderMonth === 'function') renderMonth(app.selectedMonth);
}

function setSelectedStatsName(name) {
  app.selectedStatsName = app.selectedStatsName === name ? null : (name || null);
  renderStatsPanel();
}

function setSelectedStatsMachine(machine) {
  app.selectedStatsMachine = app.selectedStatsMachine === machine ? null : (machine || null);
  renderStatsPanel();
}


function syncYearControls() {
  const monthYearSelect = document.getElementById("monthYearSelect");
  const statsYearSelect = document.getElementById("statsYearSelect");
  const importYearSelect = document.getElementById("importYearSelect");
  const overwriteMonth = document.getElementById("overwriteMonth");

  const fillSelect = (el, values, selected, key) => {
    if (!el) return;
    const options = (Array.isArray(values) ? values : []).map(year => ({ value: String(year), label: String(year) }));
    if (typeof setSelectOptionsIfChanged === 'function') {
      setSelectOptionsIfChanged(el, options, String(selected || ''), key);
      return;
    }
    const current = String(selected || "");
    while (el.firstChild) el.removeChild(el.firstChild);
    options.forEach(item => {
      const opt = document.createElement("option");
      opt.value = item.value;
      opt.textContent = item.label;
      if (item.value === current) opt.selected = true;
      el.appendChild(opt);
    });
  };

  fillSelect(monthYearSelect, getAvailableYears(app.rotation), app.selectedYear, 'monthYearSelect');
  fillSelect(statsYearSelect, getAvailableYears(app.rotation), app.selectedYear, 'statsYearSelect');
  fillSelect(importYearSelect, getImportYears(app.rotation), app.importYear, 'importYearSelect');

  if (overwriteMonth) {
    const selectedYear = parseInt(app.importYear, 10) || parseInt(app.selectedYear, 10);
    const months = getMonthsForYear(app.rotation, selectedYear);
    const options = [{ value: '', label: '— jen doplnit nové měsíce —' }].concat(months.map(monthKey => ({ value: monthKey, label: monthKey })));
    if (typeof setSelectOptionsIfChanged === 'function') {
      setSelectOptionsIfChanged(overwriteMonth, options, String(overwriteMonth.value || ''), 'overwriteMonth');
    } else {
      const current = String(overwriteMonth.value || '');
      while (overwriteMonth.firstChild) overwriteMonth.removeChild(overwriteMonth.firstChild);
      options.forEach(item => {
        const opt = document.createElement("option");
        opt.value = item.value;
        opt.textContent = item.label;
        if (item.value === current) opt.selected = true;
        overwriteMonth.appendChild(opt);
      });
    }
  }
}
