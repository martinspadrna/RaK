// RaK 1.2 (1.155) – QR helpery.
// RAK_17127_QR_PAYLOAD_LAZY: food/brus helpers stay in startup, only the large
// person QR SVG payload is parsed on first actual QR request.
let __rakPersonQrDataPromise = null;
function ensurePersonQrDataLoaded() {
  if (window.PERSON_QR_CODES && Object.keys(window.PERSON_QR_CODES).length) return Promise.resolve(window.PERSON_QR_CODES);
  if (__rakPersonQrDataPromise) return __rakPersonQrDataPromise;
  __rakPersonQrDataPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-rak-person-qr-data="1"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.PERSON_QR_CODES || {}), { once: true });
      existing.addEventListener('error', () => reject(new Error('rak-qr-data.js load failed')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'rak-qr-data.js';
    script.async = true;
    script.dataset.rakPersonQrData = '1';
    script.onload = () => resolve(window.PERSON_QR_CODES || {});
    script.onerror = () => {
      __rakPersonQrDataPromise = null;
      reject(new Error('rak-qr-data.js load failed'));
    };
    document.head.appendChild(script);
  });
  return __rakPersonQrDataPromise;
}
if (typeof window !== 'undefined') window.ensurePersonQrDataLoaded = ensurePersonQrDataLoaded;


const BRUS_CONFIG = {
  TBKR01: {
    AD:   { pieceSec: 58.2, dressEvery: 59, dressSec: 323, label: "AD" },
    ADV:  { pieceSec: 62.7, dressEvery: 45, dressSec: 240, label: "AD volné" },
    AE:   { pieceSec: 57.0, dressEvery: 58, dressSec: 240, label: "AE" },
    AEV:  { pieceSec: 60.0, dressEvery: 45, dressSec: 240, label: "AE volné" },
    AH:   { pieceSec: 66.0, dressEvery: 87, dressSec: 400, label: "AH" }
  },
  TBKR07: {
    AD:   { pieceSec: 58.2, dressEvery: 59, dressSec: 298, label: "AD" },
    ADV:  { pieceSec: 60.3, dressEvery: 45, dressSec: 240, label: "AD volné" },
    AE:   { pieceSec: 56.4, dressEvery: 59, dressSec: 325, label: "AE" },
    AEV:  { pieceSec: 60.0, dressEvery: 45, dressSec: 240, label: "AE volné" },
    AH:   { pieceSec: 63.0, dressEvery: 88, dressSec: 400, label: "AH" }
  }
};


const FOOD_LOCATIONS = [
  {
    key: "kantyna",
    label: "Kantýna",
    place: "Kiosek M2",
    days: {
      0: [["05:30", "09:00"], ["10:00", "12:00"], ["21:30", "00:00"], ["01:00", "03:00"]],
      1: [["01:00", "04:00"], ["05:30", "09:00"], ["10:00", "12:00"], ["13:00", "16:00"], ["17:30", "21:00"], ["22:00", "00:00"]],
      2: [["01:00", "04:00"], ["05:30", "09:00"], ["10:00", "12:00"], ["13:00", "16:00"], ["17:30", "21:00"], ["22:00", "00:00"]],
      3: [["01:00", "04:00"], ["05:30", "09:00"], ["10:00", "12:00"], ["13:00", "16:00"], ["17:30", "21:00"], ["22:00", "00:00"]],
      4: [["01:00", "04:00"], ["05:30", "09:00"], ["10:00", "12:00"], ["13:00", "16:00"], ["17:30", "21:00"], ["22:00", "00:00"]],
      5: [["01:00", "04:00"], ["05:30", "09:00"], ["10:00", "12:00"], ["13:00", "16:00"], ["17:30", "21:00"], ["22:00", "00:00"]],
      6: [["01:00", "04:00"], ["05:30", "09:00"], ["10:00", "12:00"], ["13:00", "16:00"], ["17:30", "21:00"], ["22:00", "00:00"]]
    }
  },
  {
    key: "jidelna",
    label: "Jídelna",
    place: "Restaurace Vrchlabí",
    days: {
      0: [["10:00", "12:00"]],
      1: [["01:30", "03:00"], ["07:00", "09:00"], ["10:30", "12:30"], ["15:00", "16:30"], ["22:30", "00:00"]],
      2: [["07:00", "09:00"], ["10:30", "12:30"], ["15:00", "16:30"], ["22:30", "00:00"]],
      3: [["07:00", "09:00"], ["10:30", "12:30"], ["15:00", "16:30"], ["22:30", "00:00"]],
      4: [["07:00", "09:00"], ["10:30", "12:30"], ["15:00", "16:30"], ["22:30", "00:00"]],
      5: [["07:00", "09:00"], ["10:30", "12:30"], ["15:00", "16:30"], ["22:30", "00:00"]],
      6: [["10:30", "12:30"], ["15:00", "16:30"], ["22:30", "00:00"]]
    }
  }
];

// Přesčasové neděle: v tyto konkrétní dny se nedělní rozpis přepne na mimořádný přesčasový režim.
const FOOD_SPECIAL_SUNDAY_DATES = new Set([
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
  "2025-12-14",
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

const FOOD_SPECIAL_OVERRIDES = {
  kantyna: [["01:00", "04:00"], ["05:30", "09:00"], ["10:00", "12:00"], ["17:30", "21:00"], ["21:30", "00:00"]],
  jidelna: [["10:00", "12:00"], ["21:30", "23:30"]]
};

const FOOD_SETTINGS_MACHINE_KEY = 'FOOD_SCHEDULE_SETTINGS';
const FOOD_ADMIN_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function parseFoodSettingsJson(value) {
  if (value && typeof value === 'object') return value;
  if (!value) return {};
  try { return JSON.parse(String(value)); } catch (err) { return {}; }
}

function getFoodMachineSettingsRow() {
  const rows = (typeof app !== 'undefined' && app && Array.isArray(app.machineSettingsRows)) ? app.machineSettingsRows : [];
  return rows.find((row) => String(row && row.category || '').trim() === 'food_schedule')
    || rows.find((row) => String(row && row.machine_key || '').trim() === FOOD_SETTINGS_MACHINE_KEY)
    || null;
}

function getFoodMachineSettings() {
  const row = getFoodMachineSettingsRow();
  const settings = parseFoodSettingsJson(row && row.settings_json);
  return settings && typeof settings === 'object' ? settings : {};
}

function normalizeFoodTimeText(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{1,2})[:.](\d{2})$/);
  if (!match) return '';
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return '';
  return pad2(hour) + ':' + pad2(minute);
}

function normalizeFoodWindows(value) {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (Array.isArray(item)) return [normalizeFoodTimeText(item[0]), normalizeFoodTimeText(item[1])];
      if (item && typeof item === 'object') return [normalizeFoodTimeText(item.start || item.from || item[0]), normalizeFoodTimeText(item.end || item.to || item[1])];
      return null;
    }).filter((item) => item && item[0] && item[1]);
  }
  const raw = String(value || '').trim();
  if (!raw) return [];
  return raw.split(/[\n;,]+/).map((part) => part.trim()).filter(Boolean).map((part) => {
    const pieces = part.split(/\s*(?:–|—|-)\s*/);
    if (pieces.length < 2) return null;
    const start = normalizeFoodTimeText(pieces[0]);
    const end = normalizeFoodTimeText(pieces[1]);
    return start && end ? [start, end] : null;
  }).filter(Boolean);
}

function foodWindowSignature(window) {
  return String(window && window[0] || '') + '–' + String(window && window[1] || '');
}

function foodWindowStartMinutes(window) {
  const start = String(window && window[0] || '00:00').split(':');
  return (Number(start[0]) || 0) * 60 + (Number(start[1]) || 0);
}

function cloneFoodWindow(window, specialOvertime) {
  const copy = [String(window && window[0] || ''), String(window && window[1] || '')];
  if (specialOvertime) copy.specialOvertime = true;
  return copy;
}

function getFoodSpecialDateSet() {
  const settings = getFoodMachineSettings();
  const hasCustom = Object.prototype.hasOwnProperty.call(settings, 'overtimeDates') || Object.prototype.hasOwnProperty.call(settings, 'overtime_dates');
  const result = hasCustom ? new Set() : new Set(FOOD_SPECIAL_SUNDAY_DATES);
  if (hasCustom) {
    const raw = settings.overtimeDates ?? settings.overtime_dates;
    const list = Array.isArray(raw) ? raw : String(raw || '').split(/[\n,;\s]+/);
    list.map((item) => String(item || '').trim()).filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item)).forEach((date) => result.add(date));
  }
  // Od verze 1.294 je Provoz / Prescasy (ROTATION_OVERTIME_SETTINGS) jediny editovatelny
  // zdroj prescasovych terminu - kantyna uz vlastni seznam needituje, jen se sem
  // pripoji, aby home karty Kantyna/Jidelna ukazaly spravne hodiny i pro nove pridane terminy.
  // POZOR: cist jen surova ulozena data (getRotationOvertimeSettingsRow), NIKDY
  // getRotationOvertimeDateSet()/getRotationOvertimeSettings() - ty bez vlastniho
  // radku spousti default-seed vetev, ktera se zpatky ptá teto funkce a zpusobi
  // nekonecnou rekurzi (zamrznuti cele appky pro kazdeho uzivatele).
  try {
    if (typeof getRotationOvertimeSettingsRow === 'function' && typeof parseRotationOvertimeSettingsJson === 'function') {
      const row = getRotationOvertimeSettingsRow();
      if (row) {
        const settings = parseRotationOvertimeSettingsJson(row.settings_json);
        const rawEntries = Array.isArray(settings.entries)
          ? settings.entries
          : (Array.isArray(settings.overtimes) ? settings.overtimes : (Array.isArray(settings.dates) ? settings.dates : []));
        rawEntries.forEach((item) => {
          const date = String((item && typeof item === 'object' ? (item.date || item.iso || item.day) : item) || '').trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(date)) result.add(date);
        });
      }
    }
  } catch (err) {}
  return result;
}

function getFoodAdminWindowText(windows) {
  return normalizeFoodWindows(windows).map((window) => window[0] + '–' + window[1]).join(', ');
}

function getFoodOvertimeWindows(location) {
  const settings = getFoodMachineSettings();
  const key = String(location && location.key || '').trim();
  const overtime = settings && settings.overtime && typeof settings.overtime === 'object' ? settings.overtime : {};
  if (Object.prototype.hasOwnProperty.call(overtime, key)) return normalizeFoodWindows(overtime[key]);
  return normalizeFoodWindows(FOOD_SPECIAL_OVERRIDES[key] || []);
}

function isFoodOvertimeWindow(window, regularSet) {
  const signature = foodWindowSignature(window);
  const startMinutes = foodWindowStartMinutes(window);
  if (!regularSet.has(signature)) return true;
  return startMinutes >= 14 * 60;
}

function getFoodAdminSettingsSnapshot() {
  const dates = Array.from(getFoodSpecialDateSet()).sort();
  return {
    dayOrder: FOOD_ADMIN_DAY_ORDER.slice(),
    dayNames: FOOD_DAY_NAMES.slice(),
    dates,
    locations: FOOD_LOCATIONS.map((location) => ({
      key: location.key,
      label: location.label,
      regular: FOOD_ADMIN_DAY_ORDER.map((dayIndex) => ({
        dayIndex,
        dayLabel: FOOD_DAY_NAMES[dayIndex] || String(dayIndex),
        windowsText: getFoodAdminWindowText(getFoodRegularWindows(location, dayIndex))
      })),
      overtimeText: getFoodAdminWindowText(getFoodOvertimeWindows(location))
    }))
  };
}

if (typeof window !== 'undefined') {
  window.getFoodAdminSettingsSnapshot = getFoodAdminSettingsSnapshot;
  window.getFoodSpecialDateSet = getFoodSpecialDateSet;
  window.normalizeFoodWindows = normalizeFoodWindows;
}

const FOOD_DAY_NAMES = [
  "neděle",
  "pondělí",
  "úterý",
  "středa",
  "čtvrtek",
  "pátek",
  "sobota"
];

function foodIsoDate(date) {
  const day = date instanceof Date ? date : null;
  if (!day) return '';
  return day.getFullYear() + "-" + pad2(day.getMonth() + 1) + "-" + pad2(day.getDate());
}

function isFoodSpecialSunday(date) {
  const day = date instanceof Date ? date : null;
  return !!(day && day.getDay() === 0 && getFoodSpecialDateSet().has(foodIsoDate(day)));
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function getPragueNow(reference) {
  const source = reference instanceof Date ? reference : new Date(reference || Date.now());
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Prague',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(source).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  return new Date(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
}

function formatFoodTime(date) {
  return pad2(date.getHours()) + ":" + pad2(date.getMinutes());
}

function formatFoodRange(start, end) {
  return formatFoodTime(start) + "–" + formatFoodTime(end);
}

function formatFoodDayName(date) {
  return FOOD_DAY_NAMES[date.getDay()] || "";
}

function formatFoodRelativeLabel(date, referenceDate) {
  const target = new Date(date);
  const reference = new Date(referenceDate);
  target.setHours(0, 0, 0, 0);
  reference.setHours(0, 0, 0, 0);

  const diffDays = Math.round((target.getTime() - reference.getTime()) / 86400000);
  if (diffDays === 0) return "dnes";
  if (diffDays === 1) return "zítra";
  return formatFoodDayName(target);
}

function foodDateAtTime(baseDate, timeText) {
  const [hourText, minuteText] = String(timeText || "").split(":");
  const hour = parseInt(hourText, 10);
  const minute = parseInt(minuteText, 10);
  const date = new Date(baseDate);
  date.setHours(Number.isFinite(hour) ? hour : 0, Number.isFinite(minute) ? minute : 0, 0, 0);
  return date;
}

function foodRangeFromWindow(baseDate, window) {
  const start = foodDateAtTime(baseDate, window[0]);
  const end = foodDateAtTime(baseDate, window[1]);
  if (end <= start) end.setDate(end.getDate() + 1);
  return { start, end };
}

function getFoodScheduleForDay(location, dayIndex, date) {
  const regularWindows = getFoodRegularWindows(location, dayIndex).map((window) => cloneFoodWindow(window, false));
  const day = date instanceof Date ? date : null;
  const isSpecialSunday = isFoodSpecialSunday(day);

  if (dayIndex === 0 && isSpecialSunday && location) {
    const regularSet = new Set(regularWindows.map(foodWindowSignature));
    const merged = new Map();
    regularWindows.forEach((window) => merged.set(foodWindowSignature(window), window));
    getFoodOvertimeWindows(location).forEach((window) => {
      const signature = foodWindowSignature(window);
      const special = isFoodOvertimeWindow(window, regularSet);
      const existing = merged.get(signature);
      if (existing) {
        if (special) existing.specialOvertime = true;
      } else {
        merged.set(signature, cloneFoodWindow(window, special));
      }
    });
    return Array.from(merged.values()).sort((a, b) => foodWindowStartMinutes(a) - foodWindowStartMinutes(b));
  }

  return regularWindows;
}

function findFoodStatus(location, now) {
  const baseNow = getPragueNow(now);
  const today = new Date(baseNow);
  today.setHours(0, 0, 0, 0);
  let active = null;
  let next = null;

  for (let offset = -1; offset <= 8; offset += 1) {
    const baseDate = new Date(today);
    baseDate.setDate(baseDate.getDate() + offset);
    const windows = getFoodScheduleForDay(location, baseDate.getDay(), baseDate);

    for (const window of windows) {
      const range = foodRangeFromWindow(baseDate, window);
      range.specialOvertime = !!(window && window.specialOvertime);
      if (baseNow >= range.start && baseNow < range.end) {
        if (!active || range.start < active.start || (range.start.getTime && active.start && range.start.getTime() === active.start.getTime() && range.end > active.end)) active = range;
      }
      if (range.start > baseNow && (!next || range.start < next.start)) {
        next = range;
      }
    }
  }

  return { active, next, isOpen: !!active };
}

function foodStatusText(status) {
  if (status.isOpen && status.active) {
    return "🟢 otevřeno do " + formatFoodTime(status.active.end);
  }
  if (status.next) {
    return "🔴 zavřeno";
  }
  return "🔴 zavřeno";
}

function foodStatusMeta(status, location) {
  if (status.isOpen && status.active) {
    const openUntil = (status.active.specialOvertime ? "přesčas · " : "") + "do " + formatFoodTime(status.active.end);
    if (!status.next) return openUntil;
    const nextPrefix = status.next.specialOvertime ? "přesčas · " : "";
    return openUntil + "; poté " + nextPrefix + "otevřeno od " + formatFoodTime(status.next.start) + " do " + formatFoodTime(status.next.end);
  }
  if (!status.next) {
    return "Rozpis není dostupný.";
  }

  return "poté " + (status.next.specialOvertime ? "přesčas · " : "") + "otevřeno od " + formatFoodTime(status.next.start) + " do " + formatFoodTime(status.next.end);
}

function isPayrollWorkday(date) {
  const day = date.getDay();
  if (day === 0 || day === 6) return false;
  return !getSpecialWorkInfo(date);
}

function getPayrollDateForMonth(year, monthIndex) {
  const payrollSettings = typeof getRakPayrollSettings === 'function'
    ? getRakPayrollSettings()
    : { workdayOrdinal: 4, overrides: [] };
  const monthKey = String(year) + '-' + String(Number(monthIndex) + 1).padStart(2, '0');
  const override = (Array.isArray(payrollSettings.overrides) ? payrollSettings.overrides : []).find((entry) => entry.month === monthKey);
  if (override && override.date && typeof payrollParseIsoDate === 'function') {
    const overrideDate = payrollParseIsoDate(override.date);
    if (overrideDate) return overrideDate;
  }
  const cursor = getPragueNow(new Date(year, monthIndex, 1));
  cursor.setHours(0, 0, 0, 0);
  let workdayCount = 0;

  while (cursor.getMonth() === monthIndex) {
    if (isPayrollWorkday(cursor)) {
      workdayCount += 1;
      if (workdayCount === Number(payrollSettings.workdayOrdinal || 4)) {
        return new Date(cursor);
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return null;
}

function getNextPayrollDate(now) {
  const today = getPragueNow(now || new Date());
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 24; i += 1) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const payDate = getPayrollDateForMonth(monthDate.getFullYear(), monthDate.getMonth());
    if (payDate && payDate >= today) {
      return payDate;
    }
  }

  return null;
}

function pluralizeDays(count) {
  if (count === 1) return 'den';
  if (count >= 2 && count <= 4) return 'dny';
  return 'dní';
}

function getPayrollTileText(now) {
  const payDate = getNextPayrollDate(now || new Date());
  const today = getPragueNow(now || new Date());
  today.setHours(0, 0, 0, 0);

  if (!payDate) return '💸 Výplata: bez termínu';

  const diffDays = Math.round((payDate.getTime() - today.getTime()) / 86400000);
  if (diffDays <= 0) return '💸 Výplata přijde dnes';
  if (diffDays === 1) return '💸 Výplata přijde zítra';
  return '💸 Výplata přijde za ' + diffDays + ' ' + pluralizeDays(diffDays);
}

function updateFoodTile() {
  const tile = document.getElementById("foodTile");
  if (!tile) return;

  const statuses = FOOD_LOCATIONS.map(location => {
    const status = findFoodStatus(location, getPragueNow(new Date()));
    return {
      location,
      status,
      text: foodStatusText(status),
      meta: foodStatusMeta(status, location)
    };
  });

  const anyOpen = statuses.some(item => item.status.isOpen);
  tile.classList.toggle("foodOpen", anyOpen);
  tile.classList.toggle("foodClosed", !anyOpen);

  const remoteStatus = typeof getSupabaseCanteenStatus === 'function' ? getSupabaseCanteenStatus() : null;
  const html = [
    '<div class="foodTileTitle">Jídelní lístek</div>',
    '<div class="foodTileSub">Aktuální provozní doba' + (remoteStatus && remoteStatus.note ? ' · ' + escapeHtml(remoteStatus.note) : '') + '</div>',
    ...statuses.map(item => {
      return [
        '<div class="foodTileRow">',
        '<div class="foodTileLabel">' + escapeHtml(item.location.label) + '</div>',
        '<div class="foodTileText">' + escapeHtml(item.text) + '</div>',
        '<div class="foodTileMeta">' + escapeHtml(item.meta) + '</div>',
        '</div>'
      ].join('');
    })
  ].join('');

  tile.innerHTML = html;
}

function updateEportalTile() {
  const tile = document.getElementById("eportalTile");
  if (!tile) return;

  const html = [
    '<div class="foodTileTitle">Eportal</div>',
    '<div class="foodTileLive" id="payrollTileLive">' + getPayrollTileText(getPragueNow(new Date())) + '</div>',
  ].join('');

  tile.innerHTML = html;
}


function getFoodScheduleLocation(which) {
  const key = which === 'jidelna' ? 'jidelna' : 'kantyna';
  return FOOD_LOCATIONS.find(item => item.key === key) || FOOD_LOCATIONS[0];
}

function formatFoodWindowsList(windows) {
  if (!Array.isArray(windows) || !windows.length) return 'Zavřeno';
  return windows.map(item => item[0] + '–' + item[1]).join('\n');
}

function formatFoodDayLabel(dayIndex) {
  const raw = FOOD_DAY_NAMES[dayIndex] || '';
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : '';
}

function formatFoodDayRangeLabel(startDayIndex, endDayIndex) {
  const startLabel = formatFoodDayLabel(startDayIndex);
  const endLabel = formatFoodDayLabel(endDayIndex);
  if (!startLabel) return endLabel || '';
  if (!endLabel || startDayIndex === endDayIndex) return startLabel;
  return startLabel + ' – ' + endLabel;
}

function getFoodRegularWindows(location, dayIndex) {
  const settings = getFoodMachineSettings();
  const key = String(location && location.key || '').trim();
  const regular = settings && settings.regular && typeof settings.regular === 'object' ? settings.regular : {};
  const locationRegular = regular && regular[key] && typeof regular[key] === 'object' ? regular[key] : null;
  if (locationRegular && Object.prototype.hasOwnProperty.call(locationRegular, String(dayIndex))) return normalizeFoodWindows(locationRegular[String(dayIndex)]);
  if (locationRegular && Object.prototype.hasOwnProperty.call(locationRegular, dayIndex)) return normalizeFoodWindows(locationRegular[dayIndex]);
  return (location && location.days && Array.isArray(location.days[dayIndex])) ? normalizeFoodWindows(location.days[dayIndex]) : [];
}

function formatFoodSpecialSundayDates() {
  return Array.from(getFoodSpecialDateSet())
    .sort()
    .map((value) => {
      const parts = String(value || '').split('-');
      if (parts.length !== 3) return value;
      return String(Number(parts[2])) + '.' + String(Number(parts[1])) + '.' + parts[0];
    })
    .join(', ');
}

function foodTodayIso() {
  const now = getPragueNow(new Date());
  return foodIsoDate(now);
}

function formatFoodFutureSpecialSundayDates() {
  const todayIso = foodTodayIso();
  return Array.from(getFoodSpecialDateSet())
    .filter((value) => String(value || '').trim() >= todayIso)
    .sort()
    .map((value) => {
      const parts = String(value || '').split('-');
      if (parts.length !== 3) return value;
      return String(Number(parts[2])) + '.' + String(Number(parts[1])) + '.' + parts[0];
    })
    .join(', ');
}

function isFoodDayInsideGroup(dayIndex, group) {
  if (!group) return false;
  if (group.startDay <= group.endDay) {
    return dayIndex >= group.startDay && dayIndex <= group.endDay;
  }
  return dayIndex >= group.startDay || dayIndex <= group.endDay;
}

function getFoodScheduleHighlight(location, now) {
  const reference = getPragueNow(now || new Date());
  const status = findFoodStatus(location, reference);
  const range = status && status.isOpen && status.active ? status.active : (status ? status.next : null);
  if (!range) {
    return { type: 'none', status, reference };
  }

  const dayDate = new Date(range.start);
  const relative = formatFoodRelativeLabel(dayDate, reference);
  const dayName = formatFoodDayName(dayDate);
  const rangeText = formatFoodRange(range.start, range.end);
  const prefix = status.isOpen ? 'Právě otevřeno' : 'Další otevření';

  return {
    type: status.isOpen ? 'open' : 'next',
    status,
    reference,
    dayIndex: dayDate.getDay(),
    startText: formatFoodTime(range.start),
    endText: formatFoodTime(range.end),
    rangeText,
    label: prefix + ' · ' + relative + ' ' + rangeText,
    detail: (range.specialOvertime ? 'Přesčas · ' : '') + (status.isOpen ? ('otevřeno do ' + formatFoodTime(range.end)) : ('otevírá ' + relative + ' v ' + formatFoodTime(range.start))),
    dayLabel: dayName
  };
}

function foodWindowMatchesHighlight(window, highlight) {
  if (!highlight || (highlight.type !== 'open' && highlight.type !== 'next')) return false;
  return String(window && window[0]) === highlight.startText && String(window && window[1]) === highlight.endText;
}

function getFoodScheduleDateForDay(dayIndex, referenceDate) {
  const reference = getPragueNow(referenceDate || new Date());
  const monday = new Date(reference);
  const referenceDay = monday.getDay();
  const diffToMonday = referenceDay === 0 ? -6 : 1 - referenceDay;
  monday.setDate(monday.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const target = new Date(monday);
  const offset = dayIndex === 0 ? 6 : dayIndex - 1;
  target.setDate(monday.getDate() + offset);
  return target;
}

function buildFoodRegularScheduleGroups(location) {
  const dayOrder = [1, 2, 3, 4, 5, 6, 0];
  const groups = [];
  let current = null;

  dayOrder.forEach((dayIndex) => {
    const windows = getFoodRegularWindows(location, dayIndex);
    const signature = JSON.stringify({ windows });
    if (!current || current.signature !== signature) {
      current = {
        startDay: dayIndex,
        endDay: dayIndex,
        signature,
        windows
      };
      groups.push(current);
    } else {
      current.endDay = dayIndex;
    }
  });

  return groups;
}

function buildFoodSpecialSundaySection(location, highlight) {
  const specialWindows = getFoodOvertimeWindows(location);
  if (!Array.isArray(specialWindows) || !specialWindows.length) return '';
  const futureDatesText = formatFoodFutureSpecialSundayDates();
  const regularSundayWindows = getFoodRegularWindows(location, 0);
  const regularSet = new Set((Array.isArray(regularSundayWindows) ? regularSundayWindows : []).map(foodWindowSignature));
  const changedWindows = specialWindows.filter((window) => isFoodOvertimeWindow(window, regularSet));
  const highlightIsSunday = highlight && highlight.dayIndex === 0 && (highlight.type === 'open' || highlight.type === 'next');
  const lines = changedWindows.length ? changedWindows.map((window) => {
    const isHighlighted = highlightIsSunday && foodWindowMatchesHighlight(window, highlight);
    const stateClass = isHighlighted ? (highlight.type === 'open' ? ' foodScheduleWindowLine--currentOpen' : ' foodScheduleWindowLine--nextOpen') : '';
    return '<div class="foodScheduleWindowLine' + stateClass + '">' + escapeHtml(window[0] + '–' + window[1] + ' · jen při přesčasu') + '</div>';
  }).join('') : '<div class="foodScheduleWindowLine foodScheduleWindowEmpty">Žádný čas navíc proti běžné neděli.</div>';
  return [
    '<div class="foodScheduleTitleBlock foodScheduleTitleBlock--compact uMt12">',
    '<div class="sectionTitle">Mimořádná nedělní provozní doba</div>',
    '<div class="smallText uMt0 uMb10">Zobrazuji jen časy, které jsou jiné než běžná neděle.</div>',
    '</div>',
    '<div class="foodScheduleRow' + (highlightIsSunday ? ' foodScheduleRow--hasHighlight' : '') + '">',
    '<div class="foodScheduleDay">Neděle (přesčas)</div>',
    '<div class="foodScheduleWindows">' + lines + '</div>',
    '</div>',
    '<div class="smallText uMt8">Budoucí přesčasové neděle: ' + escapeHtml(futureDatesText || 'žádné') + '</div>'
  ].join('');
}

function getFoodScheduleSundayGuardHealth() {
  const samplePlainSunday = new Date(2026, 6, 5, 10, 30, 0); // 5. 7. 2026 není v seznamu přesčasových nedělí
  const sampleOvertimeSunday = new Date(2026, 4, 24, 10, 30, 0); // 24. 5. 2026 je v seznamu přesčasových nedělí
  const rows = FOOD_LOCATIONS.map((location) => {
    const plainWindows = getFoodScheduleForDay(location, 0, samplePlainSunday);
    const overtimeWindows = getFoodScheduleForDay(location, 0, sampleOvertimeSunday);
    const regularSundayWindows = getFoodRegularWindows(location, 0);
    const regularSignature = JSON.stringify(regularSundayWindows);
    const plainSignature = JSON.stringify(plainWindows);
    const overtimeSignature = JSON.stringify(overtimeWindows);
    return {
      key: location.key,
      label: location.label,
      regularSundayWindows: regularSundayWindows.length,
      plainSundayWindows: plainWindows.length,
      overtimeSundayWindows: overtimeWindows.length,
      overtimeChangedWindows: overtimeWindows.filter((window) => !new Set(regularSundayWindows.map((regularWindow) => String(regularWindow && regularWindow[0]) + '–' + String(regularWindow && regularWindow[1]))).has(String(window && window[0]) + '–' + String(window && window[1]))).length,
      plainMatchesRegular: plainSignature === regularSignature,
      overtimeDiffersFromRegular: overtimeSignature !== regularSignature,
      overtimeSundayMarked: overtimeWindows.length > 0
    };
  });
  const ok = rows.every((row) => row.plainMatchesRegular && row.overtimeDiffersFromRegular && row.overtimeSundayMarked);
  return {
    ok,
    mode: 'food-admin-schedule-v1003',
    version: String(window.APP_VERSION || '1.2 (1.155)'),
    overtimeSundayCount: FOOD_SPECIAL_SUNDAY_DATES.size,
    plainSundaySample: foodIsoDate(samplePlainSunday),
    overtimeSundaySample: foodIsoDate(sampleOvertimeSunday),
    rows,
    issues: ok ? [] : rows.filter((row) => !row.plainMatchesRegular || !row.overtimeDiffersFromRegular).map((row) => row.label + ': nedělní rozpis neodpovídá normální vs. přesčasové variantě'),
    note: 'Běžná neděle používá normální rozpis; detail mimořádné neděle ukazuje jen rozdíly proti normální otevírací době.'
  };
}

if (typeof window !== 'undefined') {
  window.getFoodScheduleSundayGuardHealth = getFoodScheduleSundayGuardHealth;
}

function buildFoodScheduleHtml(location) {
  const reference = new Date();
  const highlight = getFoodScheduleHighlight(location, reference);
  const rows = buildFoodRegularScheduleGroups(location).map((group) => {
    const dayLabel = formatFoodDayRangeLabel(group.startDay, group.endDay);
    const groupHasHighlightDay = isFoodDayInsideGroup(highlight.dayIndex, group);
    const rowClass = groupHasHighlightDay && highlight.type !== 'none' ? ' foodScheduleRow--hasHighlight' : '';
    const windowsHtml = (Array.isArray(group.windows) && group.windows.length ? group.windows.map(window => {
      const isHighlighted = groupHasHighlightDay && foodWindowMatchesHighlight(window, highlight);
      const stateClass = isHighlighted ? (highlight.type === 'open' ? ' foodScheduleWindowLine--currentOpen' : ' foodScheduleWindowLine--nextOpen') : '';
      return '<div class="foodScheduleWindowLine' + stateClass + '">' + escapeHtml(window[0] + '–' + window[1]) + '</div>';
    }).join('') : '<div class="foodScheduleWindowLine foodScheduleWindowEmpty">Zavřeno</div>');
    return '<div class="foodScheduleRow' + rowClass + '">' +
      '<div class="foodScheduleDay">' + escapeHtml(dayLabel) + '</div>' +
      '<div class="foodScheduleWindows">' + windowsHtml + '</div>' +
    '</div>';
  }).join('');

  const highlightSummary = highlight && highlight.type !== 'none'
    ? '<div class="smallText uMt0 uMb10">' + escapeHtml(highlight.label + ' · ' + highlight.detail) + '</div>'
    : '<div class="smallText uMt0 uMb10">Otevřeno podle běžného rozpisu; mimořádná nedělní noční směna má vlastní režim níže.</div>';

  return [
    '<div class="foodScheduleTitleBlock foodScheduleTitleBlock--compact">',
    '<div class="sectionTitle">Běžná otevírací doba</div>',
    highlightSummary,
    '</div>',
    rows,
    buildFoodSpecialSundaySection(location, highlight)
  ].join('');
}

function renderFoodSchedulePage() {
  const location = getFoodScheduleLocation(app && app.foodScheduleFocus ? app.foodScheduleFocus : 'kantyna');
  const title = document.getElementById('foodScheduleTitle');
  const card = document.getElementById('foodScheduleCard');
  if (!card) return;

  const html = buildFoodScheduleHtml(location);
  if (title) {
    if (typeof setElementTextIfChanged === 'function') setElementTextIfChanged(title, location.label, 'foodScheduleTitle');
    else title.textContent = location.label;
  }
  if (typeof setElementHtmlIfChanged === 'function') setElementHtmlIfChanged(card, html, 'foodSchedulePage');
  else card.innerHTML = html;
}

function renderFoodScheduleModal() {
  const location = getFoodScheduleLocation(app && app.foodScheduleFocus ? app.foodScheduleFocus : 'kantyna');
  const overlay = ensureFoodScheduleModal();
  const title = overlay.querySelector('#foodScheduleModalTitle');
  const body = overlay.querySelector('#foodScheduleModalBody');
  const html = buildFoodScheduleHtml(location);
  if (title) {
    if (typeof setElementTextIfChanged === 'function') setElementTextIfChanged(title, location.label, 'foodScheduleModalTitle');
    else title.textContent = location.label;
  }
  if (body) {
    if (typeof setElementHtmlIfChanged === 'function') setElementHtmlIfChanged(body, html, 'foodScheduleModalBody');
    else body.innerHTML = html;
  }
}

function showFoodSchedule(which) {
  app.foodScheduleFocus = which === 'jidelna' ? 'jidelna' : 'kantyna';
  renderFoodScheduleModal();
  const overlay = ensureFoodScheduleModal();
  overlay.classList.add('isVisible');
  document.body.classList.add('foodModalOpen');
}

function hideFoodScheduleModal() {
  const overlay = document.getElementById('foodScheduleModal');
  if (!overlay) return;
  overlay.classList.remove('isVisible');
  document.body.classList.remove('foodModalOpen');
}

function ensureFoodScheduleModal() {
  let overlay = document.getElementById('foodScheduleModal');
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = 'foodScheduleModal';
  overlay.className = 'foodScheduleOverlay';
  overlay.innerHTML = [
    '<div class="foodScheduleModal" role="dialog" aria-modal="true" aria-labelledby="foodScheduleModalTitle">',
    '<button type="button" class="foodScheduleClose" aria-label="Zavřít">×</button>',
    '<div class="foodScheduleModalTitle" id="foodScheduleModalTitle"></div>',
    '<div class="foodScheduleModalBody" id="foodScheduleModalBody"></div>',
    '</div>'
  ].join('');

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) hideFoodScheduleModal();
  });

  overlay.querySelector('.foodScheduleClose')?.addEventListener('click', hideFoodScheduleModal);

  if (!document.body.dataset.foodModalKeydownBound) {
    document.body.dataset.foodModalKeydownBound = '1';
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') hideFoodScheduleModal();
    });
  }

  document.body.appendChild(overlay);
  return overlay;
}

function normalizePersonQrKey(name) {
  return String(name || '').trim();
}

function getPersonQrData(name) {
  return (window.PERSON_QR_CODES || {})[normalizePersonQrKey(name)] || null;
}

function hidePersonQrModal() {
  const overlay = document.getElementById('personQrModal');
  if (!overlay) return;
  overlay.classList.remove('isVisible');
  document.body.classList.remove('qrModalOpen');
}

function ensurePersonQrModal() {
  let overlay = document.getElementById('personQrModal');
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = 'personQrModal';
  overlay.className = 'qrModalOverlay';
  overlay.innerHTML = [
    '<div class="qrModal" role="dialog" aria-modal="true" aria-labelledby="qrModalName">',
    '<button type="button" class="qrModalClose" aria-label="Zavřít">×</button>',
    '<div class="qrModalName" id="qrModalName"></div>',
    '<div class="qrModalSvg" id="qrModalSvg"></div>',
    '<div class="qrModalCode" id="qrModalCode"></div>',
    '</div>'
  ].join('');

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) hidePersonQrModal();
  });

  overlay.querySelector('.qrModalClose')?.addEventListener('click', hidePersonQrModal);

  if (!document.body.dataset.qrModalKeydownBound) {
    document.body.dataset.qrModalKeydownBound = '1';
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') hidePersonQrModal();
    });
  }

  document.body.appendChild(overlay);
  return overlay;
}

async function showPersonQrModal(name) {
  try {
    await ensurePersonQrDataLoaded();
  } catch (err) {
    console.warn('QR data se nepodařilo načíst', err);
    alert('QR kódy se nepodařilo načíst. Zkus to prosím znovu.');
    return;
  }
  const data = getPersonQrData(name);
  if (!data) {
    alert('QR kód pro "' + String(name || '') + '" zatím není připravený.');
    return;
  }

  const overlay = ensurePersonQrModal();
  overlay.querySelector('#qrModalName').textContent = data.label || String(name || '');
  overlay.querySelector('#qrModalCode').textContent = data.code || '';
  overlay.querySelector('#qrModalSvg').innerHTML = data.svg || '';
  overlay.classList.add('isVisible');
  document.body.classList.add('qrModalOpen');
}
