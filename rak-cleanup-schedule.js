// RaK TEST – týdenní úklid: jednotný kalendář pro statistiky i generátor.
// Výchozí pravidlo je neděle ranní. Ukládají se jen týdenní výjimky.
// Žádná změna rozpisu ani přímý zápis do databáze mimo stávající secure settings RPC.
const RAK_CLEANUP_SETTINGS_KEY = 'ROTATION_CLEANUP_SETTINGS';
const RAK_CLEANUP_SETTINGS_CATEGORY = 'rotation_cleanup_settings';
const RAK_CLEANUP_WEEK_MS = 7 * 86400000;
const RAK_CLEANUP_WEEKDAYS = ['Neděle','Pondělí','Úterý','Středa','Čtvrtek','Pátek','Sobota'];

function rakCleanupParseISO(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '').trim());
  if (!match) return null;
  const year = +match[1], month = +match[2], day = +match[3];
  if (year < 2000 || year > 2100) return null;
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) return null;
  return utc;
}

function rakCleanupDateISO(date) {
  return date.toISOString().slice(0, 10);
}

function rakCleanupWeekForISO(iso) {
  const date = rakCleanupParseISO(iso);
  if (!date) return null;
  const monday = new Date(date.getTime());
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const thursday = new Date(monday.getTime());
  thursday.setUTCDate(thursday.getUTCDate() + 3);
  const year = thursday.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  jan4.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7));
  const week = 1 + Math.round((monday.getTime() - jan4.getTime()) / RAK_CLEANUP_WEEK_MS);
  const sunday = new Date(monday.getTime());
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  return { year, week, key: year + '-W' + String(week).padStart(2, '0'),
    monday: rakCleanupDateISO(monday), sunday: rakCleanupDateISO(sunday) };
}

function rakCleanupWeekDates(weekInfo) {
  const monday = rakCleanupParseISO(weekInfo && weekInfo.monday);
  if (!monday) return [];
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday.getTime());
    date.setUTCDate(date.getUTCDate() + index);
    return { iso: rakCleanupDateISO(date), weekday: date.getUTCDay() };
  });
}

function rakCleanupWeeksForYear(year) {
  const value = Number(year);
  if (!Number.isInteger(value) || value < 2000 || value > 2100) return [];
  const found = [];
  let date = new Date(Date.UTC(value, 0, 4));
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  for (let index = 0; index < 53; index += 1) {
    const info = rakCleanupWeekForISO(rakCleanupDateISO(date));
    if (!info || info.year !== value) break;
    found.push(info);
    date = new Date(date.getTime() + RAK_CLEANUP_WEEK_MS);
  }
  return found;
}

function rakCleanupIsSettingsRow(row) {
  return !!row && (String(row.machine_key || '') === RAK_CLEANUP_SETTINGS_KEY
    || String(row.category || '') === RAK_CLEANUP_SETTINGS_CATEGORY);
}

function rakCleanupSettings() {
  const rows = (typeof app !== 'undefined' && app && Array.isArray(app.machineSettingsRows)) ? app.machineSettingsRows : [];
  const row = rows.find(rakCleanupIsSettingsRow);
  let json = row && row.settings_json;
  if (typeof json === 'string') {
    try { json = JSON.parse(json); } catch (_) { json = null; }
  }
  const overrides = new Map();
  const entries = json && Array.isArray(json.entries) ? json.entries : [];
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const key = String(entry.week || '');
    if (!/^20\d\d-W(?:0[1-9]|[1-4]\d|5[0-3])$/.test(key)) continue;
    const year = Number(key.slice(0, 4));
    const week = Number(key.slice(-2));
    const info = rakCleanupWeeksForYear(year)[week - 1];
    if (!info || info.key !== key) continue;
    if (entry.disabled === true) { overrides.set(key, { week: key, disabled: true }); continue; }
    const date = String(entry.date || '');
    if (!rakCleanupWeekDates(info).some(day => day.iso === date) || date === info.sunday) continue;
    overrides.set(key, { week: key, date });
  }
  return overrides;
}

function rakCleanupIsMorningOnISO(dateISO, shift, overrides) {
  if (!/^R/.test(String(shift || '').trim().toUpperCase())) return false;
  const info = rakCleanupWeekForISO(dateISO);
  if (!info) return false;
  const entry = (overrides || rakCleanupSettings()).get(info.key);
  if (entry && entry.disabled) return false;
  return dateISO === (entry && entry.date ? entry.date : info.sunday);
}

function rakCleanupIsMorningRow(monthKey, dateToken, overrides) {
  const parsed = typeof parseDateToken === 'function' ? parseDateToken(dateToken) : null;
  const month = typeof parseMonthKey === 'function' ? parseMonthKey(monthKey) : null;
  if (!parsed || !month) return false;
  const year = Number(month.year), mo = Number(parsed.month || month.month), day = Number(parsed.day);
  if (!Number.isInteger(year) || !Number.isInteger(mo) || !Number.isInteger(day)) return false;
  const iso = String(year).padStart(4, '0') + '-' + String(mo).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  return rakCleanupIsMorningOnISO(iso, parsed.shift, overrides);
}

function rakCleanupIsMorningMeta(meta, overrides) {
  if (!meta) return false;
  const iso = String(meta.year).padStart(4, '0') + '-' + String(meta.month).padStart(2, '0') + '-' + String(meta.day).padStart(2, '0');
  return rakCleanupIsMorningOnISO(iso, meta.shift, overrides);
}

function rakCleanupSettingsRow(entries) {
  return {
    machine_key: RAK_CLEANUP_SETTINGS_KEY, machine_code: 'ROTATION', machine_index: 'cleanup',
    label: 'Týdenní úklid', category: RAK_CLEANUP_SETTINGS_CATEGORY,
    cycle_time: '', speed: '', dress_time: '', dress_count: '',
    settings_json: { machine: 'ROTATION', index: 'cleanup', type: RAK_CLEANUP_SETTINGS_CATEGORY,
      entries, updatedAt: new Date().toISOString() }
  };
}

function rakCleanupMergeRows(entries) {
  const rows = (typeof app !== 'undefined' && app && Array.isArray(app.machineSettingsRows)) ? app.machineSettingsRows : [];
  return rows.filter(row => !rakCleanupIsSettingsRow(row)).concat([rakCleanupSettingsRow(entries)]);
}

function rakCleanupAdminSelectedYear() {
  const year = Number(window.rakCleanupAdminYear || new Date().getFullYear());
  return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : new Date().getFullYear();
}

function rakCleanupAdminChangeYear(delta, root) {
  // Do not discard the administrator's unsaved changes when paging years.
  const overrides = rakCleanupSettings();
  const scope = root || document;
  const selects = scope.querySelectorAll('[data-cleanup-week]');
  for (const input of selects) {
    const key = String(input.getAttribute('data-cleanup-week') || '');
    const saved = overrides.get(key);
    const expected = !saved ? 'default' : saved.disabled ? 'off' : saved.date;
    if (String(input.value) !== expected) {
      const status = scope.querySelector('#adminOnlineSaveStatus');
      if (status) status.textContent = 'Nejprve ulož změny úklidu, potom přepni rok.';
      return false;
    }
  }
  window.rakCleanupAdminYear = Math.max(2000, Math.min(2100, rakCleanupAdminSelectedYear() + delta));
  return true;
}

// Scroll only the week list. Never use scrollIntoView(): on iOS that would also
// jump the entire Administration page or move the user's active input.
function rakCleanupAdminRememberScroll(root) {
  const list = root && typeof root.querySelector === 'function'
    ? root.querySelector('.rakCleanupWeeks[data-cleanup-year]') : null;
  if (!list) return null;
  const year = Number(list.getAttribute('data-cleanup-year'));
  return { year, top: Number(list.scrollTop) || 0 };
}

function rakCleanupAdminPositionScroll(root, previous) {
  const list = root && typeof root.querySelector === 'function'
    ? root.querySelector('.rakCleanupWeeks[data-cleanup-year]') : null;
  if (!list) return;
  const year = Number(list.getAttribute('data-cleanup-year'));
  const place = () => {
    // A later navigation/render must win over a queued frame from an older view.
    if (!root || root.querySelector('.rakCleanupWeeks[data-cleanup-year]') !== list) return;
    if (previous && previous.year === year) {
      list.scrollTop = previous.top;
      return;
    }
    const row = list.querySelector('.rakCleanupWeek.isCurrent');
    if (!row) {
      list.scrollTop = 0; // a different year has no current week
      return;
    }
    const viewport = list.getBoundingClientRect();
    const item = row.getBoundingClientRect();
    if (!viewport.height || !item.height) return;
    const centered = list.scrollTop + item.top - viewport.top
      - (list.clientHeight - item.height) / 2;
    list.scrollTop = Math.max(0,
      Math.min(Math.max(0, list.scrollHeight - list.clientHeight), centered));
  };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(place);
  else place();
}

function rakCleanupAdminResetToCurrentYear() {
  const now = new Date();
  const iso = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')].join('-');
  const week = rakCleanupWeekForISO(iso);
  window.rakCleanupAdminYear = week ? week.year : now.getFullYear();
}

function rakCleanupAdminHtml() {
  const year = rakCleanupAdminSelectedYear();
  const overrides = rakCleanupSettings();
  const now = new Date();
  const current = rakCleanupWeekForISO(
    String(now.getFullYear()) + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0')
  );
  const weeks = rakCleanupWeeksForYear(year);
  const options = info => {
    const weekDays = rakCleanupWeekDates(info);
    const saved = overrides.get(info.key);
    const selected = saved ? (saved.disabled ? 'off' : saved.date) : 'default';
    return [
      '<option value="default"' + (selected === 'default' ? ' selected' : '') + '>Neděle (výchozí)</option>',
      ...weekDays.filter(d => d.weekday !== 0).map(d =>
        '<option value="' + d.iso + '"' + (selected === d.iso ? ' selected' : '') + '>' + RAK_CLEANUP_WEEKDAYS[d.weekday] + '</option>'),
      '<option value="off"' + (selected === 'off' ? ' selected' : '') + '>Bez úklidu</option>'
    ].join('');
  };
  return [
    '<div class="rakCleanupYearNav">',
    ' <button type="button" class="appMenuAction" data-admin-action="cleanup-prev-year" aria-label="Předchozí rok">‹</button>',
    ' <b>' + String(year) + '</b>',
    ' <button type="button" class="appMenuAction" data-admin-action="cleanup-next-year" aria-label="Další rok">›</button>',
    '</div>',
    '<div class="rakCleanupHeader"><span>Kalendářní týden</span><span>Den úklidu (ranní)</span></div>',
    '<div class="rakCleanupWeeks" data-cleanup-year="' + String(year) + '">',
    ...weeks.map(info => {
      const special = overrides.has(info.key);
      const active = current && info.key === current.key;
      return '<label class="rakCleanupWeek' + (special ? ' isChanged' : '') + (active ? ' isCurrent' : '') + '">'
        + '<span><strong>' + String(info.week) + ' KT</strong>' + (special ? '<small>Výjimka</small>' : '') + '</span>'
        + '<select class="appMenuSelect" data-cleanup-week="' + info.key + '" aria-label="' + info.week + ' KT">'
        + options(info) + '</select></label>';
    }),
    '</div>',
    '<p class="smallText">Bez výjimky se počítá nedělní ranní. Přesun změní statistiku pouze pro vybraný týden. Uložit znamená uložit celý seznam výjimek; rozpisy směn se nemění.</p>'
  ].join('');
}

function rakCleanupAdminReadFromDom(root) {
  const base = rakCleanupSettings();
  const scope = root || document;
  const year = rakCleanupAdminSelectedYear();
  for (const key of [...base.keys()]) if (Number(key.slice(0,4)) === year) base.delete(key);
  const selects = scope.querySelectorAll('[data-cleanup-week]');
  for (const input of selects) {
    const key = String(input.getAttribute('data-cleanup-week') || '');
    if (!/^20\d\d-W\d\d$/.test(key) || Number(key.slice(0,4)) !== year) continue;
    const value = String(input.value || '');
    if (value === 'off') { base.set(key, { week: key, disabled: true }); continue; }
    if (value === 'default') continue;
    const date = rakCleanupParseISO(value);
    if (!date) throw new Error('Neplatné datum úklidu.');
    const info = rakCleanupWeekForISO(value);
    if (!info || info.key !== key) throw new Error('Úklid musí být ve vybraném kalendářním týdnu.');
    if (value !== info.sunday) base.set(key, { week: key, date: value });
  }
  return [...base.values()].sort((a,b)=>a.week.localeCompare(b.week));
}

try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('rak-cleanup-schedule.js', 'loaded', { source: 'dynamic-loader' }); } catch (_) {}
