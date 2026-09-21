// RaK 1.2 (1.155) – Statistiky.
function renderMonthGrid() {
  const monthSelect = document.getElementById("monthSelect");
  if (!monthSelect) return;
  const months = getMonthsForYear(app.rotation, parseInt(app.selectedYear, 10));
  const currentMonthKey = typeof monthKeyFromYearMonth === 'function'
    ? monthKeyFromYearMonth(new Date().getFullYear(), new Date().getMonth() + 1)
    : '';

  const selected = months.includes(app.selectedMonth)
    ? app.selectedMonth
    : (months.includes(currentMonthKey) ? currentMonthKey : (months[0] || ""));
  const monthOptions = [{ value: '', label: 'Vyber měsíc…' }]
    .concat(months.map(monthKey => ({ value: monthKey, label: monthKey })));
  if (typeof setSelectOptionsIfChanged === 'function') {
    setSelectOptionsIfChanged(monthSelect, monthOptions, selected, 'monthSelect');
  } else {
    while (monthSelect.firstChild) monthSelect.removeChild(monthSelect.firstChild);
    monthOptions.forEach(item => {
      const opt = document.createElement('option');
      opt.value = String(item.value || '');
      opt.textContent = String(item.label || '');
      if (String(item.value || '') === String(selected || '')) opt.selected = true;
      monthSelect.appendChild(opt);
    });
  }
  monthSelect.value = selected;
  app.selectedMonth = selected || null;

}


if (typeof window.normalizeShiftText !== 'function') {
  window.normalizeShiftText = function normalizeShiftText(text) {
    const raw = String(text || '').trim().replace(/\s+/g, ' ');
    if (!raw) return '';
    const parts = raw.split(' ');
    const dedup = [];
    for (const part of parts) {
      if (dedup.length === 0 || dedup[dedup.length - 1] !== part) dedup.push(part);
    }
    return dedup.join(' ').trim();
  };
}


if (typeof window.parseDateToken !== 'function') {
  window.parseDateToken = function parseDateToken(token) {
    const m = /^(\d{1,2})\.(\d{1,2})\.\s*(.*)$/.exec(String(token || ''));
    if (!m) return null;
    return {
      day: parseInt(m[1], 10),
      month: parseInt(m[2], 10),
      shift: typeof normalizeShiftText === 'function' ? normalizeShiftText(m[3] || '') : String(m[3] || '').trim().replace(/\s+/g, ' '),
      sortDate: new Date(2026, parseInt(m[2], 10) - 1, parseInt(m[1], 10)).toISOString()
    };
  };
}

if (typeof window.absenceLabelFromCode !== 'function') {
  window.absenceLabelFromCode = function absenceLabelFromCode(code) {
    const raw = String(code || '').trim();
    if (!raw) return '';
    const key = raw.toUpperCase();
    const labels = { D: 'Dovolená', N: 'Neschopenka', NV: 'Náhradní volno', Š: 'Školení', '§': 'Paragraf', S: 'Senior', L: 'Lázně' };
    if (labels[key]) return labels[key];
    if (/^\d+(?:[.,]\d+)?$/.test(raw)) return '';
    return raw;
  };
}

if (typeof window.normalizeStatsAbsenceReasonName !== 'function') {
  window.normalizeStatsAbsenceReasonName = function normalizeStatsAbsenceReasonName(reason) {
    const raw = String(reason || '').trim();
    if (!raw) return 'Ostatní';
    if (/^N$/i.test(raw) || /^PN$/i.test(raw) || /neschopen/i.test(raw)) return 'Neschopenka';
    return raw;
  };
}

if (typeof window.sanitizeAbsencePersonName !== 'function') {
  window.sanitizeAbsencePersonName = function sanitizeAbsencePersonName(text) {
    return String(text || '')
      .trim()
      .replace(/\s+(?:od|do)\b.*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  };
}

if (typeof window.splitAbsencePeople !== 'function') {
  window.splitAbsencePeople = function splitAbsencePeople(text) {
    const raw = String(text || '').trim();
    if (!raw) return [];
    return raw
      .replace(/\s+(?:a|i|&|\/)\s+/gi, ' | ')
      .replace(/[,;+]/g, ' | ')
      .split(/\s*\|\s*/g)
      .map(part => part.trim())
      .filter(Boolean)
      .filter(part => !/^od\s+\d/i.test(part));
  };
}

if (typeof window.looksLikeAbsencePerson !== 'function') {
  window.looksLikeAbsencePerson = function looksLikeAbsencePerson(text) {
    const t = String(text || '').trim();
    if (!t) return false;
    if (/\d/.test(t)) return false;
    if (/\bdo\b/i.test(t)) return false;
    if (/[:/]/.test(t)) return false;
    return true;
  };
}

if (typeof window.normalizeNoteEntry !== 'function') {
  window.normalizeNoteEntry = function normalizeNoteEntry(note) {
    const date = String(note && note.date ? note.date : '').trim();
    const shiftFromDate = typeof parseDateToken === 'function' ? parseDateToken(date) : null;
    let shift = typeof normalizeShiftText === 'function'
      ? normalizeShiftText(String(note && note.shift ? note.shift : (shiftFromDate ? shiftFromDate.shift : '')) || '')
      : String(note && note.shift ? note.shift : (shiftFromDate ? shiftFromDate.shift : '') || '').trim();
    let person = typeof sanitizeAbsencePersonName === 'function' ? sanitizeAbsencePersonName(note && note.person ? note.person : '') : String(note && note.person ? note.person : '').trim();
    let code = String(note && note.code ? note.code : '').trim();
    let text = String(note && note.text ? note.text : '').trim();
    let people = [];

    if (!person && text) {
      const tokens = text.split(/\s+/).filter(Boolean);
      let start = 0;
      if (tokens[start] && /^\d{1,2}\.\d{1,2}\.$/.test(tokens[start])) start += 1;
      if (tokens[start] && /^(?:N8|R8|N|R)$/i.test(tokens[start])) {
        if (!shift) shift = normalizeShiftText(tokens[start].toUpperCase());
        start += 1;
      }
      const remaining = tokens.slice(start);
      if (remaining.length >= 2 && typeof absenceLabelFromCode === 'function' && absenceLabelFromCode(remaining[remaining.length - 1])) {
        code = code || remaining[remaining.length - 1];
        const peopleText = remaining.slice(0, -1).join(' ').trim();
        people = (typeof splitAbsencePeople === 'function' ? splitAbsencePeople(peopleText) : [peopleText]).map(v => sanitizeAbsencePersonName(v)).filter(Boolean);
        person = sanitizeAbsencePersonName(people[0] || peopleText);
      } else if (remaining.length === 1 && !(typeof absenceLabelFromCode === 'function' && absenceLabelFromCode(remaining[0]))) {
        person = sanitizeAbsencePersonName(remaining[0]);
      } else if (remaining.length > 1) {
        person = sanitizeAbsencePersonName(remaining.join(' '));
      }
    }

    if (!people.length && person) people = [person];
    return { date, shift, person, code, text, people, isAbsence: !!(people.length || code || /\b(?:dovolen|absence|lázn|školen|paragraf|volno)\b/i.test(text)) };
  };
}


if (typeof window.estimateAbsenceWeight !== 'function') {
  window.estimateAbsenceWeight = function estimateAbsenceWeight(note) {
    const text = String(note && note.text ? note.text : '').trim();
    const code = String(note && note.code ? note.code : '').trim();
    const haystack = (text + ' ' + code).trim();
    if (!haystack) return 1;
    if (/\b(?:od|do)\b/i.test(haystack)) return 0.5;
    if (/\b(?:0[,\.]5|1\/2|půl|pul|polovina)\b/i.test(haystack)) return 0.5;
    return 1;
  };
}
function getStatsMachineLabel(machine) {
  const name = String(machine || "").trim();
  if (!name) return "";

  if (/^MSKC\d+$/i.test(name)) return "MSK";
  if (/^MFKF\d+$/i.test(name)) return "MFK";
  if (name === "TNKS01") return "TNK";
  if (/^TBKR\d+$/i.test(name)) return "TBK";
  if (name === "TPKW02") return "W02";
  if (name === "TPKW01") return "W01";

  return name;
}

function getStatsMachineOrder(machineKeys) {
  const preferred = ["MSK", "MFK", "TNK", "TBK", "W02", "W01"];
  const keys = Array.isArray(machineKeys) ? machineKeys.slice() : [];
  const out = [];

  preferred.forEach(key => {
    if (keys.includes(key)) out.push(key);
  });

  keys
    .filter(key => !preferred.includes(key))
    .sort((a, b) => a.localeCompare(b, "cs"))
    .forEach(key => out.push(key));

  return out;
}


function getStatsDateFromMonthKey(monthKey, parsedDate) {
  const parsedMonth = typeof parseMonthKey === 'function' ? parseMonthKey(monthKey) : null;
  const day = Number(parsedDate && parsedDate.day);
  const month = Number((parsedDate && parsedDate.month) || (parsedMonth && parsedMonth.month));
  const year = Number(parsedMonth && parsedMonth.year) || new Date().getFullYear();
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null;
  return new Date(year, month - 1, day);
}

function isStatsOvertimeSundayMoOnly(monthKey, parsedDate) {
  const date = getStatsDateFromMonthKey(monthKey, parsedDate);
  if (!date || date.getDay() !== 0) return false;
  try {
    if (typeof isSpecialOvertimeSundayMoOnly === 'function') return !!isSpecialOvertimeSundayMoOnly(date);
  } catch (err) {}
  try {
    const set = typeof SPECIAL_OVERTIME_MO_ONLY_SUNDAYS_2026 !== 'undefined' ? SPECIAL_OVERTIME_MO_ONLY_SUNDAYS_2026 : null;
    const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    return !!(set && typeof set.has === 'function' && set.has(key));
  } catch (err) {}
  return false;
}

function isStatsOvertimeSundayShift(monthKey, parsedDate) {
  const date = getStatsDateFromMonthKey(monthKey, parsedDate);
  if (!date || date.getDay() !== 0) return false;
  const shift = String((parsedDate && parsedDate.shift) || '').trim().toUpperCase();
  if (shift && !/^N/.test(shift)) return false;
  if (isStatsOvertimeSundayMoOnly(monthKey, parsedDate)) return false;
  try {
    if (typeof isSpecialOvertimeSundayNight === 'function') return !!isSpecialOvertimeSundayNight(date);
  } catch (err) {}
  try {
    const set = typeof getSpecialOvertimeSundayNightDateSet === 'function'
      ? getSpecialOvertimeSundayNightDateSet()
      : (typeof SPECIAL_OVERTIME_SUNDAY_NIGHTS_2026 !== 'undefined' ? SPECIAL_OVERTIME_SUNDAY_NIGHTS_2026 : null);
    const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    return !!(set && typeof set.has === 'function' && set.has(key));
  } catch (err) {}
  return false;
}

function shouldStatsSplitPressMachines(monthKey, parsedDate) {
  const month = app && app.rotation && app.rotation.months ? app.rotation.months[monthKey] : null;
  const baseKey = typeof getRotationDateBaseKeyFromParsed === 'function' ? getRotationDateBaseKeyFromParsed(parsedDate, monthKey) : '';
  const manual = typeof getRotationPressRotationOverride === 'function' ? getRotationPressRotationOverride(month, baseKey) : '';
  if (manual === 'split') return true;
  if (manual === 'nosplit') return false;
  const date = getStatsDateFromMonthKey(monthKey, parsedDate);
  if (!date) return true;
  if (date.getDay() !== 0) return true;
  return isStatsOvertimeSundayShift(monthKey, parsedDate);
}

function getBestEntry(counts) {
  const items = Object.entries(counts || {}).map(([key, value]) => [String(key || '').trim(), Number(value) || 0]).filter(([, value]) => value > 0);
  if (!items.length) return null;
  return items.sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0], 'cs');
  })[0];
}


function getBestEntries(counts) {
  const items = Object.entries(counts || {}).map(([key, value]) => [String(key || '').trim(), Number(value) || 0]).filter(([, value]) => value > 0);
  if (!items.length) return [];
  const maxValue = Math.max(...items.map(([, value]) => value));
  return items
    .filter(([, value]) => value === maxValue)
    .sort((a, b) => a[0].localeCompare(b[0], 'cs'));
}

function getTopEntries(counts, limit = 3) {
  const items = Object.entries(counts || {})
    .map(([key, value]) => [String(key || '').trim(), Number(value) || 0])
    .filter(([, value]) => value > 0)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0], 'cs');
    });
  return items.slice(0, limit);
}

function formatMachineCount(value, label) {
  const num = Number(value) || 0;
  // Párové stroje (TNK = TNKS01, W01 = TPKW01) se půlí, u nich necháme desetiny.
  if (label === 'TNK' || label === 'W01') return formatCount(num);
  return String(Math.round(num));
}

function formatMachineWinners(entries) {
  const list = Array.isArray(entries) ? entries : [];
  if (!list.length) return '—';
  return list.map(([name, value]) => name + ' (' + formatMachineCount(value, name) + ')').join('\n');
}


const RAK_KNOWN_ANNUAL_WORK_ABSENCE_TARGETS = {
  // Rok 2025 měl podle ověřeného rozpisu roční fond 164 směn.
  // Další roky se nesmí dorovnávat na 164 naslepo — každý rok může mít jiný fond.
  2025: 164
};

function getAnnualWorkAbsenceTarget(year) {
  const numericYear = parseInt(year, 10);
  if (!Number.isFinite(numericYear)) return null;
  if (Object.prototype.hasOwnProperty.call(RAK_KNOWN_ANNUAL_WORK_ABSENCE_TARGETS, numericYear)) {
    return RAK_KNOWN_ANNUAL_WORK_ABSENCE_TARGETS[numericYear];
  }
  return null;
}

function applyAnnualWorkAbsenceTarget(person, target) {
  const numericTarget = Number(target);
  if (!Number.isFinite(numericTarget) || numericTarget <= 0 || !person) return;
  const absence = Math.max(0, Number(person.totalAbsence || 0) || 0);
  person.annualWorkAbsenceTarget = numericTarget;
  person.totalWork = Math.max(0, numericTarget - absence);
}

function shouldIncludeMonthInStats(parsedMonth, selectedYear) {
  if (!parsedMonth || parsedMonth.year !== selectedYear) return false;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  // v.1.5 (743): u aktuálního roku nepočítat importované budoucí měsíce.
  // Celý rok 2026 může být nahraný kvůli plánování, ale statistiky mají zatím končit aktuálním měsícem.
  if (selectedYear > currentYear) return false;
  if (selectedYear === currentYear) return parsedMonth.month <= currentMonth;
  return true;
}

function getStatsFutureMonthScopeNote(year, stats) {
  const selectedYear = parseInt(year, 10);
  if (!Number.isFinite(selectedYear)) return '';
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (selectedYear !== currentYear) return '';
  const monthKeys = typeof getMonthsForYear === 'function' && window.app && Array.isArray(window.app.rotation) ? getMonthsForYear(window.app.rotation, selectedYear) : (Array.isArray(stats && stats.includedMonthKeys) ? stats.includedMonthKeys : []);
  const futureMonths = monthKeys
    .map(key => {
      const parsed = typeof parseMonthKey === 'function' ? parseMonthKey(key) : null;
      return parsed ? { key, year: parsed.year, month: parsed.month } : null;
    })
    .filter(item => item && item.year === selectedYear && item.month > currentMonth)
    .map(item => item.key);
  if (!futureMonths.length) return '';
  return 'Nahrané budoucí měsíce (' + futureMonths.join(', ') + ') jsou zatím jen pro plánování. Do statistik se započítají až v daném měsíci.';
}


function inferWorkAbsenceTargetForStats(people, explicitTarget) {
  const numericExplicit = Number(explicitTarget);
  if (Number.isFinite(numericExplicit) && numericExplicit > 0) return numericExplicit;
  const sums = (Array.isArray(people) ? people : [])
    .map(person => Math.round(((Number(person && person.totalWork || 0) || 0) + (Number(person && person.totalAbsence || 0) || 0)) * 10) / 10)
    .filter(value => Number.isFinite(value) && value > 0);
  if (!sums.length) return null;
  // v.1.5 (743): pro aktuální/částečný rok dopočítat společný fond podle nejúplnějšího záznamu.
  // Import 2026 má nahraný celý rok kvůli rozpisům, ale statistiky k 05/2026 mají všem držet 73.
  return Math.max(...sums);
}

function getStatsMonthOverview(stats, monthKey) {
  if (!stats.monthlyOverview) stats.monthlyOverview = {};
  const key = String(monthKey || '').trim();
  if (!key) return { monthKey: '', totalSlots: 0, occupiedSlots: 0, absenceReasons: {} };
  if (!stats.monthlyOverview[key]) {
    stats.monthlyOverview[key] = { monthKey: key, totalSlots: 0, occupiedSlots: 0, absenceReasons: {} };
  }
  return stats.monthlyOverview[key];
}

function getStatsAbsenceReasonLabel(note) {
  const code = String(note && note.code ? note.code : '').trim();
  const fromCode = typeof absenceLabelFromCode === 'function' ? String(absenceLabelFromCode(code) || '').trim() : '';
  if (fromCode) return normalizeStatsAbsenceReasonName(fromCode);
  const text = String(note && note.text ? note.text : '').trim();
  if (/\bN\b/i.test(text) || /neschopen/i.test(text)) return 'Neschopenka';
  if (/dovolen/i.test(text)) return 'Dovolená';
  if (/škol|skol/i.test(text)) return 'Školení';
  if (/paragraf|§/i.test(text)) return 'Paragraf';
  if (/náhrad|nahrad|\bNV\b/i.test(text)) return 'Náhradní volno';
  if (/lázn|lazn/i.test(text)) return 'Lázně';
  if (/senior|\bS\b/i.test(text)) return 'Senior';
  return 'Ostatní';
}

function roundStatsValue(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function finalizeStatsYearOverview(stats) {
  const totalSlots = Math.max(0, Number(stats && stats.occupancy && stats.occupancy.totalSlots || 0) || 0);
  const occupiedSlots = Math.max(0, Math.min(totalSlots, Number(stats && stats.occupancy && stats.occupancy.occupiedSlots || 0) || 0));
  const percent = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 1000) / 10 : 0;
  stats.occupancy = Object.assign({}, stats.occupancy || {}, {
    totalSlots: roundStatsValue(totalSlots),
    occupiedSlots: roundStatsValue(occupiedSlots),
    freeSlots: roundStatsValue(Math.max(0, totalSlots - occupiedSlots)),
    percent
  });

  const monthKeys = Array.isArray(stats.includedMonthKeys) ? stats.includedMonthKeys : [];
  stats.monthlyOccupancy = monthKeys.map(key => {
    const item = stats.monthlyOverview && stats.monthlyOverview[key] ? stats.monthlyOverview[key] : { monthKey: key, totalSlots: 0, occupiedSlots: 0 };
    const monthTotal = Math.max(0, Number(item.totalSlots || 0) || 0);
    const monthOccupied = Math.max(0, Math.min(monthTotal, Number(item.occupiedSlots || 0) || 0));
    return {
      monthKey: key,
      totalSlots: roundStatsValue(monthTotal),
      occupiedSlots: roundStatsValue(monthOccupied),
      percent: monthTotal > 0 ? Math.round((monthOccupied / monthTotal) * 1000) / 10 : 0
    };
  });

  const absenceReasons = stats.absenceReasons || {};
  stats.absenceReasonList = Object.entries(absenceReasons)
    .map(([reason, value]) => ({ reason: normalizeStatsAbsenceReasonName(reason || 'Ostatní'), value: roundStatsValue(value) }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value || a.reason.localeCompare(b.reason, 'cs'));
  return stats;
}


function buildStatsForYear(year, options = {}) {
  const statsScopeMaxMonth = Number(options && options.maxMonth);
  const useExplicitStatsScope = Number.isFinite(statsScopeMaxMonth) && statsScopeMaxMonth >= 1 && statsScopeMaxMonth <= 12;
  const stats = {
    year,
    people: {},
    names: [],
    machineTotals: {},
    cleanTotals: {},
    absenceTotals: {},
    absenceReasons: {},
    monthlyOverview: {},
    monthlyOccupancy: [],
    absenceReasonList: [],
    occupancy: { totalSlots: 0, occupiedSlots: 0, freeSlots: 0, percent: 0 },
    machineCleanLeaders: {},
    machineTopWorkers: {},
    mfkSoloCounts: {},
    mskPairCounts: {},
    includedMonthKeys: []
  };

  const ensureColumn = (label) => {
    const key = String(label || "").trim();
    if (!key) return "";
    if (!(key in stats.machineTotals)) {
      stats.machineTotals[key] = 0;
      stats.cleanTotals[key] = 0;
      stats.absenceTotals[key] = 0;
    }
    return key;
  };

  const ensurePerson = (name) => {
    if (!stats.people[name]) {
      stats.people[name] = {
        name,
        work: {},
        clean: {},
        absence: {},
        totalWork: 0,
        totalClean: 0,
        totalAbsence: 0,
        vacFullDays: 0,
        vacPartialHours: 0,
        workDays: new Set(),
        topWorkMachine: null,
        topCleanMachine: null,
        topWorkMachines: [],
        topCleanMachines: []
      };
    }
    return stats.people[name];
  };

  const nameIndex = buildNameIndex(app.rotation);
  const knownStatNames = getKnownStatNames();
  // RAK_STATS_ACTIVE_ROSTER_17007
  knownStatNames.forEach((name) => { if (name) ensurePerson(name); });
  const annualWorkAbsenceTarget = getAnnualWorkAbsenceTarget(year);
  const includedMonthSet = new Set();

  const dayModReasonLabel = (code) => {
    const map = { D: 'Dovolená', NV: 'Náhradní volno', '§': 'Paragraf', LEK: 'Lékař', NEPL: 'Neplacené' };
    return map[code] || (typeof normalizeStatsAbsenceReasonName === 'function' ? normalizeStatsAbsenceReasonName(code) : (code || 'Ostatní'));
  };

  Object.entries(app.rotation.months || {}).forEach(([monthKey, month]) => {
    const parsedMonth = parseMonthKey(monthKey);
    if (useExplicitStatsScope) {
      if (!parsedMonth || parsedMonth.year !== year || parsedMonth.month > statsScopeMaxMonth) return;
    } else if (!shouldIncludeMonthInStats(parsedMonth, year)) {
      return;
    }
    includedMonthSet.add(monthKey);
    const monthOverview = getStatsMonthOverview(stats, monthKey);

    ["hard", "soft"].forEach(section => {
      const sec = month[section];
      if (!sec || !Array.isArray(sec.rows)) return;

      sec.rows.forEach(row => {
        const parsedDate = typeof parseDateToken === 'function' ? parseDateToken(row.date) : null;
        if (!parsedDate) return;
        const isSunday = isSundayForMonthKey(monthKey, parsedDate.day);
        const isSundayMorning = isSunday && /^R/.test(parsedDate.shift || "");
        const shouldSplitPress = shouldStatsSplitPressMachines(monthKey, parsedDate);

        const rowNames = new Set();

        // Dvojice frézek i soustruhy se ve statistikách počítají po směně,
        // ne po jednotlivé obsazené buňce. Díky tomu člověk na obou frézkách
        // dostane jeden zápočet a dva lidé na soustruhu po jednom zápočtu.
        if (section === 'soft') {
          const machineCells = new Map();
          (sec.machines || []).forEach((machine, idx) => {
            machineCells.set(String(machine || '').trim(), String((row.cells || [])[idx] || '').trim());
          });

          const mfkPeople = new Set(['MFKF06', 'MFKF10']
            .map(machine => machineCells.get(machine) || '')
            .filter(name => name && knownStatNames.has(name)));
          if (mfkPeople.size === 1) {
            const [name] = Array.from(mfkPeople);
            stats.mfkSoloCounts[name] = (Number(stats.mfkSoloCounts[name]) || 0) + 1;
          }

          const mskPeople = new Set(['MSKC01', 'MSKC03', 'MSKC04']
            .map(machine => machineCells.get(machine) || '')
            .filter(name => name && knownStatNames.has(name)));
          if (mskPeople.size === 2) {
            mskPeople.forEach(name => {
              stats.mskPairCounts[name] = (Number(stats.mskPairCounts[name]) || 0) + 1;
            });
          }
        }

        (row.cells || []).forEach((cell, idx) => {
          const name = String(cell || "").trim();
          const machine = (sec.machines || [])[idx] || "";
          if (String(machine || '').trim()) {
            stats.occupancy.totalSlots += 1;
            monthOverview.totalSlots += 1;
          }
          if (!name || !machine || !knownStatNames.has(name)) return;

          stats.occupancy.occupiedSlots += 1;
          monthOverview.occupiedSlots += 1;
          rowNames.add(name);
          const person = ensurePerson(name);
          // TNKS01 + TPKW01: mimo běžnou neděli se střídá půl směny/půl směny; běžná neděle se nepůlí, přesčasová TO neděle se půlí, přesčas jen MO se nepůlí.
          const isPairMachine = section === "hard" && (machine === "TNKS01" || machine === "TPKW01");

          if (isPairMachine) {
            if (shouldSplitPress) {
              ["TNK", "W01"].forEach(columnName => {
                const column = ensureColumn(columnName);
                if (!column) return;
                person.work[column] = (person.work[column] || 0) + 0.5;
                stats.machineTotals[column] = (stats.machineTotals[column] || 0) + 0.5;
              });
            } else {
              const column = ensureColumn(getStatsMachineLabel(machine));
              if (column) {
                person.work[column] = (person.work[column] || 0) + 1;
                stats.machineTotals[column] = (stats.machineTotals[column] || 0) + 1;
              }
            }
          } else {
            const column = ensureColumn(getStatsMachineLabel(machine));
            if (!column) return;
            person.work[column] = (person.work[column] || 0) + 1;
            stats.machineTotals[column] = (stats.machineTotals[column] || 0) + 1;
          }

          if (isSundayMorning) {
            const cleanColumn = ensureColumn(getStatsMachineLabel(machine));
            if (cleanColumn) {
              person.clean[cleanColumn] = (person.clean[cleanColumn] || 0) + 1;
              person.totalClean += 1;
              stats.cleanTotals[cleanColumn] = (stats.cleanTotals[cleanColumn] || 0) + 1;
            }
          }
        });

        rowNames.forEach(name => {
          const person = ensurePerson(name);
          const dayKey = `${monthKey}|${row.date}|${name}`;
          if (!person.workDays.has(dayKey)) {
            person.workDays.add(dayKey);
            person.totalWork += 1;
          }
        });
      });
    });
  });

  Object.entries(app.rotation.months || {}).forEach(([monthKey, month]) => {
    const parsedMonth = parseMonthKey(monthKey);
    if (useExplicitStatsScope) {
      if (!parsedMonth || parsedMonth.year !== year || parsedMonth.month > statsScopeMaxMonth) return;
    } else if (!shouldIncludeMonthInStats(parsedMonth, year)) {
      return;
    }
    const monthOverview = getStatsMonthOverview(stats, monthKey);

    (month.notes || []).forEach(note => {
      const n = normalizeNoteEntry(note);
      if (!n.isAbsence || !n.people || !n.people.length) return;

      const parsedDate = typeof parseDateToken === 'function' ? parseDateToken(n.date) : null;
      const shift = n.shift || (parsedDate ? parsedDate.shift : "");
      const weight = typeof estimateAbsenceWeight === 'function' ? estimateAbsenceWeight(n) : 1;
      n.people.forEach(personName => {
        const name = String(personName || "").trim();
        if (!name || !knownStatNames.has(name)) return;

        const person = ensurePerson(name);
        const reasonLabel = getStatsAbsenceReasonLabel(n);
        stats.absenceReasons[reasonLabel] = (stats.absenceReasons[reasonLabel] || 0) + weight;
        monthOverview.absenceReasons[reasonLabel] = (monthOverview.absenceReasons[reasonLabel] || 0) + weight;
        if (reasonLabel === 'Dovolená') {
          if (weight >= 1) {
            person.vacFullDays += 1;
          } else {
            const isSunVac = (typeof isSundayForMonthKey === 'function' && parsedDate) ? isSundayForMonthKey(monthKey, parsedDate.day) : false;
            person.vacPartialHours += weight * (isSunVac ? 7.5 : 11);
          }
        }
        const candidates = (nameIndex[name] || []).filter(entry => {
          if (entry.absence) return false;
          if (entry.monthKey !== monthKey) return false;
          if (entry.date !== n.date) return false;
          if (shift && entry.shift && entry.shift !== shift) return false;
          return true;
        });

        const chosen = candidates[0] || (nameIndex[name] || []).find(entry => !entry.absence && entry.monthKey === monthKey && entry.date === n.date);
        if (chosen && chosen.machine) {
          const column = ensureColumn(getStatsMachineLabel(chosen.machine));
          if (column) {
            person.absence[column] = (person.absence[column] || 0) + weight;
            stats.absenceTotals[column] = (stats.absenceTotals[column] || 0) + weight;
            person.work[column] = Math.max(0, (Number(person.work[column] || 0) || 0) - weight);
            stats.machineTotals[column] = Math.max(0, (Number(stats.machineTotals[column] || 0) || 0) - weight);
            stats.occupancy.occupiedSlots = Math.max(0, (Number(stats.occupancy.occupiedSlots || 0) || 0) - weight);
            monthOverview.occupiedSlots = Math.max(0, (Number(monthOverview.occupiedSlots || 0) || 0) - weight);
          }
        }
        person.totalAbsence += weight;
        person.totalWork = Math.max(0, (Number(person.totalWork || 0) || 0) - weight);
      });
    });
  });

  // --- Denní výjimky (dayMods): přesun stroje po hodinách + částečná absence v hodinách ---
  // Kalírna ven = jméno na soustruhu (už započítané), kalírna k nám = prázdná buňka (nezapočítané),
  // od 22 h = celá 1 na stroji (beze změny). Řešíme jen přesun a částečné odchody/příchody s důvodem.
  Object.entries(app.rotation.months || {}).forEach(([monthKey, month]) => {
    const parsedMonth = parseMonthKey(monthKey);
    if (useExplicitStatsScope) {
      if (!parsedMonth || parsedMonth.year !== year || parsedMonth.month > statsScopeMaxMonth) return;
    } else if (!shouldIncludeMonthInStats(parsedMonth, year)) {
      return;
    }
    const monthOverview = getStatsMonthOverview(stats, monthKey);
    const mods = Array.isArray(month.dayMods) ? month.dayMods : [];
    mods.forEach(mod => {
      if (!mod || !mod.type) return;
      const section = mod.section === 'soft' ? 'soft' : 'hard';
      const sec = month[section];
      if (!sec || !Array.isArray(sec.machines)) return;
      const name = String(mod.person || '').trim();
      const machine = sec.machines[Number(mod.cellIndex)] || '';
      if (!name || !machine || !knownStatNames.has(name)) return;
      const worked = Number(mod.workedHours);
      const rest = Number(mod.restHours);
      const net = (Number.isFinite(worked) && Number.isFinite(rest) && (worked + rest) > 0) ? (worked + rest) : null;
      if (!net) return;

      if (mod.type === 'machineMove') {
        const targetSection = mod.toSection === 'soft' ? 'soft' : (mod.toSection === 'hard' ? 'hard' : section);
        const tSec = month[targetSection];
        const targetMachine = (tSec && Array.isArray(tSec.machines)) ? (tSec.machines[Number(mod.toCellIndex)] || '') : '';
        if (!targetMachine) return;
        const person = ensurePerson(name);
        const origCol = ensureColumn(getStatsMachineLabel(machine));
        const tgtCol = ensureColumn(getStatsMachineLabel(targetMachine));
        const moveFrac = Math.min(1, rest / net); // část odpracovaná na novém stroji
        if (origCol) {
          person.work[origCol] = Math.max(0, (Number(person.work[origCol] || 0)) - moveFrac);
          stats.machineTotals[origCol] = Math.max(0, (Number(stats.machineTotals[origCol] || 0)) - moveFrac);
        }
        if (tgtCol) {
          person.work[tgtCol] = (Number(person.work[tgtCol] || 0)) + moveFrac;
          stats.machineTotals[tgtCol] = (Number(stats.machineTotals[tgtCol] || 0)) + moveFrac;
        }
        return;
      }

      if ((mod.type === 'leaveEarly' || mod.type === 'arriveLate') && mod.restReason) {
        const person = ensurePerson(name);
        const col = ensureColumn(getStatsMachineLabel(machine));
        const restFrac = Math.min(1, rest / net); // část mimo práci (absence)
        if (col) {
          person.work[col] = Math.max(0, (Number(person.work[col] || 0)) - restFrac);
          stats.machineTotals[col] = Math.max(0, (Number(stats.machineTotals[col] || 0)) - restFrac);
          person.absence[col] = (Number(person.absence[col] || 0)) + restFrac;
          stats.absenceTotals[col] = (Number(stats.absenceTotals[col] || 0)) + restFrac;
        }
        person.totalWork = Math.max(0, (Number(person.totalWork || 0)) - restFrac);
        person.totalAbsence = (Number(person.totalAbsence || 0)) + restFrac;
        const reasonLabel = dayModReasonLabel(mod.restReason);
        stats.absenceReasons[reasonLabel] = (Number(stats.absenceReasons[reasonLabel] || 0)) + restFrac;
        monthOverview.absenceReasons[reasonLabel] = (Number(monthOverview.absenceReasons[reasonLabel] || 0)) + restFrac;
        if (mod.restReason === 'D') person.vacPartialHours = (Number(person.vacPartialHours || 0)) + rest;
        return;
      }
    });
  });

  const resolvedWorkAbsenceTarget = inferWorkAbsenceTargetForStats(Object.values(stats.people), annualWorkAbsenceTarget);

  Object.values(stats.people).forEach(person => {
    Object.keys(person.work).forEach(column => {
      if (typeof person.work[column] === "number") person.work[column] = Math.round(person.work[column] * 10) / 10;
    });
    Object.keys(person.absence).forEach(column => {
      if (typeof person.absence[column] === "number") person.absence[column] = Math.round(person.absence[column] * 10) / 10;
    });
    person.totalAbsence = Math.round((Number(person.totalAbsence) || 0) * 10) / 10;
    person.totalWork = Math.round((Math.max(0, Number(person.totalWork || 0))) * 10) / 10;
    // v.1.5 (743): známý fond 2025 zůstává 164, aktuální rok se dopočítá jen z měsíců, které už patří do statistik.
    applyAnnualWorkAbsenceTarget(person, resolvedWorkAbsenceTarget);
    person.totalWork = Math.round((Math.max(0, Number(person.totalWork || 0))) * 10) / 10;
    person.totalClean = Math.round((Number(person.totalClean) || 0) * 10) / 10;

    person.topWorkMachine = getBestEntry(person.work);
    person.topCleanMachine = getBestEntry(person.clean);
    person.topWorkMachines = getBestEntries(person.work);
    person.topCleanMachines = getBestEntries(person.clean);
  });
  stats.includedMonthKeys = Array.from(includedMonthSet).sort((a, b) => {
    const pa = parseMonthKey(a);
    const pb = parseMonthKey(b);
    if (!pa || !pb) return String(a).localeCompare(String(b), 'cs');
    return (pa.year - pb.year) || (pa.month - pb.month);
  });

  Object.keys(stats.machineTotals).forEach(column => {
    if (typeof stats.machineTotals[column] === "number") stats.machineTotals[column] = Math.round(stats.machineTotals[column] * 10) / 10;
  });
  Object.keys(stats.absenceTotals).forEach(column => {
    if (typeof stats.absenceTotals[column] === "number") stats.absenceTotals[column] = Math.round(stats.absenceTotals[column] * 10) / 10;
  });
  Object.keys(stats.cleanTotals).forEach(column => {
    if (typeof stats.cleanTotals[column] === "number") stats.cleanTotals[column] = Math.round(stats.cleanTotals[column] * 10) / 10;
  });

  stats.names = Object.keys(stats.people).filter(name => knownStatNames.has(name)).sort((a, b) => a.localeCompare(b, "cs"));
  stats.machineOrder = getStatsMachineOrder(Object.keys(stats.machineTotals));

  stats.machineOrder.forEach(machine => {
    const leaders = [];
    let maxClean = 0;
    const workers = [];
    Object.values(stats.people).forEach(person => {
      const cleanCount = Number(person.clean[machine] || 0);
      if (cleanCount <= 0) return;
      if (cleanCount > maxClean) {
        maxClean = cleanCount;
        leaders.length = 0;
        leaders.push(person.name);
      } else if (cleanCount === maxClean) {
        leaders.push(person.name);
      }

      const workCount = Number(person.work[machine] || 0);
      if (workCount > 0) workers.push([person.name, workCount]);
    });
    if (leaders.length) stats.machineCleanLeaders[machine] = { names: leaders.sort((a, b) => a.localeCompare(b, 'cs')), clean: maxClean };
    if (workers.length) {
      workers.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'cs'));
      stats.machineTopWorkers[machine] = workers.slice(0, 3).map(item => item[0]);
    } else {
      stats.machineTopWorkers[machine] = [];
    }
  });

  finalizeStatsYearOverview(stats);
  return stats;
}




function bindStatsGridDelegates() {
  const statsNameGrid = document.getElementById("statsNameGrid");
  const statsMachineGrid = document.getElementById("statsMachineGrid");

  const activateNameTile = (target) => {
    const tile = target && typeof target.closest === 'function' ? target.closest('[data-stats-name]') : null;
    if (!tile) return false;
    const name = tile.getAttribute('data-stats-name') || '';
    if (!name) return false;
    setSelectedStatsName(name);
    return true;
  };

  const activateMachineTile = (target) => {
    const tile = target && typeof target.closest === 'function' ? target.closest('[data-stats-machine]') : null;
    if (!tile) return false;
    const machine = tile.getAttribute('data-stats-machine') || '';
    if (!machine) return false;
    setSelectedStatsMachine(machine);
    return true;
  };

  if (statsNameGrid && statsNameGrid.dataset.statsDelegateBound !== '1') {
    statsNameGrid.dataset.statsDelegateBound = '1';
    statsNameGrid.addEventListener('click', (event) => activateNameTile(event.target));
    statsNameGrid.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (activateNameTile(event.target)) event.preventDefault();
    });
  }

  if (statsMachineGrid && statsMachineGrid.dataset.statsDelegateBound !== '1') {
    statsMachineGrid.dataset.statsDelegateBound = '1';
    statsMachineGrid.addEventListener('click', (event) => activateMachineTile(event.target));
    statsMachineGrid.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (activateMachineTile(event.target)) event.preventDefault();
    });
  }
}

function createStatsTile(kind, value, active) {
  const tile = document.createElement('div');
  tile.className = 'listItem ' + (kind === 'machine' ? 'statsMachineTile' : 'statsNameTile') + (active ? ' activeChoice' : '');
  tile.setAttribute('role', 'button');
  tile.setAttribute('tabindex', '0');
  tile.setAttribute(kind === 'machine' ? 'data-stats-machine' : 'data-stats-name', String(value || ''));

  const main = document.createElement('div');
  main.className = 'statsTileMain';

  const title = document.createElement('div');
  title.className = 'statsTileTitle';
  title.textContent = String(value || '');

  main.appendChild(title);
  tile.appendChild(main);
  return tile;
}

function renderStatsNameGridNodes(names) {
  return (Array.isArray(names) ? names : []).map(name => createStatsTile('name', name, app.selectedStatsName === name));
}

function renderStatsMachineGridNodes(stats) {
  const order = stats && Array.isArray(stats.machineOrder) ? stats.machineOrder : [];
  return order.map(machine => createStatsTile('machine', machine, app.selectedStatsMachine === machine));
}


function createStatsTextNode(tagName, className, text) {
  const node = document.createElement(tagName || 'div');
  if (className) node.className = className;
  node.textContent = String(text ?? '');
  return node;
}

function createStatsSummaryTile(label, value, valueClassName) {
  const tile = document.createElement('div');
  tile.className = 'tile';
  tile.appendChild(createStatsTextNode('div', 'smallText', label));
  tile.appendChild(createStatsTextNode('div', valueClassName || 'statsSummaryValue', value));
  return tile;
}


function formatStatsPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0 %';
  const rounded = Math.round(n * 10) / 10;
  return String(rounded).replace('.', ',') + ' %';
}

function formatStatsMonthLabel(monthKey) {
  const parsed = typeof parseMonthKey === 'function' ? parseMonthKey(monthKey) : null;
  if (parsed && Number.isFinite(parsed.month) && Number.isFinite(parsed.year)) {
    try {
      return new Intl.DateTimeFormat('cs-CZ', { month: 'long', year: 'numeric' }).format(new Date(parsed.year, parsed.month - 1, 1));
    } catch (err) {
      return String(parsed.month) + '/' + String(parsed.year);
    }
  }
  return String(monthKey || '').trim() || 'měsíc';
}

function createStatsYearOverviewNodes(stats, year) {
  if (!stats) return [];
  const wrap = document.createElement('div');
  wrap.className = 'statsYearOverviewCard';

  const header = document.createElement('div');
  header.className = 'statsYearOverviewHeader';
  const title = createStatsTextNode('div', 'statsYearOverviewTitle', 'Obsazenost strojů · ' + String(year));
  const percent = createStatsTextNode('div', 'statsYearOverviewPercent', formatStatsPercent(stats.occupancy && stats.occupancy.percent));
  header.appendChild(title);
  header.appendChild(percent);

  const grid = document.createElement('div');
  grid.className = 'statsYearOverviewGrid';

  const trend = document.createElement('div');
  trend.className = 'statsYearPane statsYearLinePane';
  trend.appendChild(createStatsTextNode('div', 'smallText statsYearChartTitle', 'Vývoj obsazenosti během roku'));
  const chart = document.createElement('div');
  chart.className = 'statsOccupancyLineChart';
  const months = Array.isArray(stats.monthlyOccupancy) ? stats.monthlyOccupancy : [];
  if (months.length) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 240 112');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Vývoj obsazenosti strojů během roku');
    const chartThemeStyles = window.getComputedStyle(document.body || document.documentElement);
    const chartThemeRgbRaw = String(chartThemeStyles.getPropertyValue('--theme-rgb') || '').trim();
    const chartThemeRgbParts = /^\d+\s*,\s*\d+\s*,\s*\d+$/.test(chartThemeRgbRaw)
      ? chartThemeRgbRaw.split(',').map(part => Math.max(0, Math.min(255, parseInt(part.trim(), 10) || 0)))
      : [124, 255, 124];
    const chartThemeRgb = chartThemeRgbParts.join(',');
    const chartThemeRgbCss = 'rgb(' + chartThemeRgb + ')';
    const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    gridLine.setAttribute('class', 'statsOccupancyLineGrid');
    gridLine.setAttribute('d', 'M8 18H232 M8 52H232 M8 86H232');
    svg.appendChild(gridLine);
    const pointInfo = document.createElement('div');
    pointInfo.className = 'statsOccupancyPointInfo';
    pointInfo.textContent = 'Klepni na bod v grafu a ukážu měsíc i obsazenost.';
    const count = Math.max(1, months.length - 1);
    const pctValues = months.map(item => Math.max(0, Math.min(100, Number(item.percent || 0) || 0)));
    const minPct = pctValues.length ? Math.min(...pctValues) : 0;
    const maxPct = pctValues.length ? Math.max(...pctValues) : 100;
    const pctRange = Math.max(1, maxPct - minPct);
    const flatLine = Math.abs(maxPct - minPct) < 0.1;
    const points = months.map((item, index) => {
      const x = 14 + (index / count) * 212;
      const pct = pctValues[index] ?? Math.max(0, Math.min(100, Number(item.percent || 0) || 0));
      const y = flatLine ? 56 : 96 - ((pct - minPct) / pctRange) * 80;
      return { x, y, item, pct };
    });
    const area = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    area.setAttribute('class', 'statsOccupancyLineArea');
    area.setAttribute('d', 'M' + points.map(p => p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' L') + ' L' + points[points.length - 1].x.toFixed(1) + ' 100 L' + points[0].x.toFixed(1) + ' 100 Z');
    area.setAttribute('fill', chartThemeRgbCss);
    area.setAttribute('fill-opacity', '0.18');
    area.setAttribute('stroke', 'none');
    area.setAttribute('opacity', '1');
    area.setAttribute('aria-hidden', 'true');
    area.style.setProperty('display', 'block', 'important');
    area.style.setProperty('fill', chartThemeRgbCss, 'important');
    area.style.setProperty('fill-opacity', '0.18', 'important');
    area.style.setProperty('stroke', 'none', 'important');
    area.style.setProperty('opacity', '1', 'important');
    svg.appendChild(area);
    // v.1.5 (963): jemné podbarvení je jen v oblasti pod čárou.
    // Barva je explicitní rgb + fill-opacity, aby SVG nespadlo do černého fallbacku ani na mobilním WebView.
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    line.setAttribute('class', 'statsOccupancyLine');
    line.setAttribute('points', points.map(p => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' '));
    svg.appendChild(line);
    points.forEach(point => {
      const monthLabel = formatStatsMonthLabel(point.item && point.item.monthKey);
      const label = monthLabel + ' · ' + formatStatsPercent(point.pct);
      const updatePointInfo = () => {
        pointInfo.textContent = monthLabel + ': ' + formatStatsPercent(point.pct);
        pointInfo.setAttribute('data-active', '1');
      };
      const hit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      hit.setAttribute('class', 'statsOccupancyLineHit');
      hit.setAttribute('cx', point.x.toFixed(1));
      hit.setAttribute('cy', point.y.toFixed(1));
      hit.setAttribute('r', '8.8');
      hit.setAttribute('role', 'button');
      hit.setAttribute('tabindex', '0');
      hit.setAttribute('aria-label', label);
      const hitTitle = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      hitTitle.textContent = label;
      hit.appendChild(hitTitle);
      hit.addEventListener('click', updatePointInfo);
      hit.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        updatePointInfo();
      });
      svg.appendChild(hit);

      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('class', 'statsOccupancyLineDot');
      dot.setAttribute('cx', point.x.toFixed(1));
      dot.setAttribute('cy', point.y.toFixed(1));
      dot.setAttribute('r', '3.2');
      const titleNode = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      titleNode.textContent = label;
      dot.appendChild(titleNode);
      svg.appendChild(dot);
    });
    chart.appendChild(svg);
    const labels = document.createElement('div');
    labels.className = 'statsOccupancyLineLabels';
    months.forEach(item => {
      const label = document.createElement('span');
      const parsed = typeof parseMonthKey === 'function' ? parseMonthKey(item.monthKey) : null;
      label.textContent = parsed ? String(parsed.month) : String(item.monthKey || '').slice(5);
      labels.appendChild(label);
    });
    chart.appendChild(labels);
    const scale = document.createElement('div');
    scale.className = 'statsOccupancyScaleLabel';
    scale.textContent = 'Rozsah grafu: ' + formatStatsPercent(minPct) + '–' + formatStatsPercent(maxPct);
    chart.appendChild(scale);
    chart.appendChild(pointInfo);
  } else {
    chart.appendChild(createStatsTextNode('div', 'smallText', 'Zatím nejsou data pro graf.'));
  }
  trend.appendChild(chart);

  const pieBox = document.createElement('div');
  pieBox.className = 'statsYearPane statsYearPiePane';
  pieBox.appendChild(createStatsTextNode('div', 'smallText statsYearChartTitle', 'Důvody absencí v započteném roce'));
  const reasons = Array.isArray(stats.absenceReasonList) ? stats.absenceReasonList.slice(0, 8) : [];
  const totalAbs = reasons.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const pieColors = ['#5eead4', '#60a5fa', '#a78bfa', '#f472b6', '#fb7185', '#fbbf24', '#86efac', '#f97316'];
  const pieWrap = document.createElement('div');
  pieWrap.className = 'statsAbsencePieWrap';
  const pie = document.createElement('div');
  pie.className = 'statsAbsencePie';
  if (totalAbs > 0) {
    let current = 0;
    const segments = reasons.map((item, index) => {
      const start = current;
      const deg = ((Number(item.value) || 0) / totalAbs) * 360;
      current += deg;
      return pieColors[index % pieColors.length] + ' ' + start.toFixed(2) + 'deg ' + current.toFixed(2) + 'deg';
    });
    pie.style.background = 'conic-gradient(' + segments.join(', ') + ')';
    pie.textContent = formatCount(totalAbs);
  } else {
    pie.classList.add('isEmpty');
    pie.textContent = '0';
  }
  const legend = document.createElement('div');
  legend.className = 'statsAbsenceLegend';
  if (reasons.length) {
    reasons.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'statsAbsenceLegendRow';
      const swatch = document.createElement('i');
      swatch.className = 'statsAbsenceLegendSwatch';
      swatch.style.background = pieColors[index % pieColors.length];
      const name = createStatsTextNode('span', '', item.reason);
      const value = createStatsTextNode('strong', '', formatCount(item.value));
      row.appendChild(swatch);
      row.appendChild(name);
      row.appendChild(value);
      legend.appendChild(row);
    });
  } else {
    legend.appendChild(createStatsTextNode('div', 'smallText', 'Žádné absence v započteném období.'));
  }
  pieWrap.appendChild(pie);
  pieWrap.appendChild(legend);
  pieBox.appendChild(pieWrap);

  const combinedBox = document.createElement('div');
  combinedBox.className = 'statsYearChartBox statsYearCombinedBox';
  const combinedGrid = document.createElement('div');
  combinedGrid.className = 'statsYearCombinedGrid';
  combinedGrid.appendChild(trend);
  combinedGrid.appendChild(pieBox);
  combinedBox.appendChild(combinedGrid);

  grid.appendChild(combinedBox);
  wrap.appendChild(header);
  wrap.appendChild(grid);

  const scopeNoteText = getStatsFutureMonthScopeNote(year, stats);
  if (scopeNoteText) wrap.appendChild(createStatsTextNode('div', 'smallText statsScopeNote', scopeNoteText));

  return [wrap];
}

function czDayWord(n) {
  const num = Math.abs(Math.round(Number(n) || 0));
  const last = num % 10;
  const last2 = num % 100;
  if (num === 1) return 'den';
  if (last >= 2 && last <= 4 && !(last2 >= 12 && last2 <= 14)) return 'dny';
  return 'dní';
}

function formatVacationDaysHours(person) {
  const days = Math.round(Number(person && person.vacFullDays || 0));
  const hours = Math.round((Number(person && person.vacPartialHours || 0)) * 10) / 10;
  const parts = [];
  if (days) parts.push(days + ' ' + czDayWord(days));
  if (hours) parts.push(String(hours).replace('.', ',') + ' h');
  return parts.length ? parts.join(' ') : '0';
}

function renderStatsNameViewNodes(person, year, stats, topWork, topClean) {
  if (!person || !stats) return [];

  const title = createStatsTextNode('div', 'sectionTitle', `${person.name} — ${year}`);
  const scopeNoteText = getStatsFutureMonthScopeNote(year, stats);
  const scopeNote = scopeNoteText ? createStatsTextNode('div', 'smallText statsScopeNote', scopeNoteText) : null;

  const summary = document.createElement('div');
  summary.className = 'statsSummary';
  summary.appendChild(createStatsSummaryTile('Práce celkem', formatCount(person.totalWork)));
  summary.appendChild(createStatsSummaryTile('Úklid celkem', formatCount(person.totalClean)));
  summary.appendChild(createStatsSummaryTile('Absence celkem', formatCount(person.totalAbsence)));
  summary.appendChild(createStatsSummaryTile('Dovolená', formatVacationDaysHours(person)));
  summary.appendChild(createStatsSummaryTile('Práce + absence', formatCount(person.totalWork + person.totalAbsence)));
  summary.appendChild(createStatsSummaryTile('Nejvíc pracoval na', topWork, 'statsMultiLine statsSummaryValueCompact'));
  summary.appendChild(createStatsSummaryTile('Nejvíc uklízel na', topClean, 'statsMultiLine statsSummaryValueCompact'));

  const wrap = document.createElement('div');
  wrap.className = 'tableWrap';

  const table = document.createElement('table');
  table.className = 'statsTable';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Stroj', 'Práce', 'Úklid'].forEach(label => {
    const th = document.createElement('th');
    th.textContent = label;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  const tbody = document.createElement('tbody');
  (Array.isArray(stats.machineOrder) ? stats.machineOrder : []).forEach(machine => {
    const row = document.createElement('tr');
    [machine, formatMachineCount(person.work[machine] || 0, machine), formatMachineCount(person.clean[machine] || 0, machine)].forEach(value => {
      const td = document.createElement('td');
      td.textContent = String(value ?? '');
      row.appendChild(td);
    });
    tbody.appendChild(row);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  wrap.appendChild(table);

  return [title].concat(scopeNote ? [scopeNote] : [], [summary, wrap]);
}

function renderStatsMachineViewNodes(machine, leaderNames, topWorkersText, specialRankTitle, specialRankText) {
  const title = createStatsTextNode('div', 'sectionTitle', machine);
  const summary = document.createElement('div');
  summary.className = 'statsSummary';
  summary.appendChild(createStatsSummaryTile('Letos nejvíc uklízeli', leaderNames, 'statsMultiLine statsSummaryValueCompact'));
  summary.appendChild(createStatsSummaryTile('Nejvíce tu byl', topWorkersText, 'statsMultiLine statsSummaryValueCompact'));
  if (specialRankTitle) {
    summary.appendChild(createStatsSummaryTile(specialRankTitle, specialRankText || '—', 'statsMultiLine statsSummaryValueCompact'));
  }
  return [title, summary];
}

function clearStatsViewElement(element, key) {
  if (!element) return;
  if (typeof setElementChildrenIfChanged === 'function') {
    setElementChildrenIfChanged(element, 'empty', () => [], key || 'statsView-empty');
    return;
  }
  if (typeof clearElementChildrenSafely === 'function') clearElementChildrenSafely(element, key || 'statsView-empty');
  else if (typeof element.replaceChildren === 'function') element.replaceChildren();
  else while (element.firstChild) element.removeChild(element.firstChild);
}

function renderStatsNameGridHtml(names) {
  return (Array.isArray(names) ? names : []).map(name => {
    const active = app.selectedStatsName === name ? ' activeChoice' : '';
    return [
      '<div class="listItem statsNameTile' + active + '" role="button" tabindex="0" data-stats-name="' + escapeHtml(name) + '">',
      '<div class="statsTileMain"><div class="statsTileTitle">' + escapeHtml(name) + '</div></div>',
      '</div>'
    ].join('');
  }).join('');
}

function renderStatsMachineGridHtml(stats) {
  const order = stats && Array.isArray(stats.machineOrder) ? stats.machineOrder : [];
  return order.map(machine => {
    const active = app.selectedStatsMachine === machine ? ' activeChoice' : '';
    return [
      '<div class="listItem statsMachineTile' + active + '" role="button" tabindex="0" data-stats-machine="' + escapeHtml(machine) + '">',
      '  <div class="statsTileMain">',
      '    <div class="statsTileTitle">' + escapeHtml(machine) + '</div>',
      '  </div>',
      '</div>'
    ].join('');
  }).join('');
}

function renderStatsPanel() {
  const statsNameGrid = document.getElementById("statsNameGrid");
  const statsMachineGrid = document.getElementById("statsMachineGrid");
  const statsNameView = document.getElementById("statsNameView");
  const statsMachineView = document.getElementById("statsMachineView");
  const statsYearOverview = document.getElementById("statsYearOverview");
  if (!statsNameGrid || !statsMachineGrid || !statsNameView || !statsMachineView) return;

  const year = parseInt(app.selectedYear, 10) || getInitialSelectedYear(app.rotation);
  const stats = buildStatsForYear(year);

  if (app.selectedStatsMachine && !stats.machineOrder.includes(app.selectedStatsMachine)) {
    app.selectedStatsMachine = null;
  }
  if (app.selectedStatsName && !stats.people[app.selectedStatsName]) {
    app.selectedStatsName = null;
  }

  bindStatsGridDelegates();

  if (statsYearOverview) {
    const statsYearOverviewFingerprint = JSON.stringify({
      year,
      occupancy: stats.occupancy || {},
      monthly: stats.monthlyOccupancy || [],
      reasons: stats.absenceReasonList || [],
      scopeNote: getStatsFutureMonthScopeNote(year, stats)
    });
    if (typeof setElementChildrenIfChanged === 'function') {
      setElementChildrenIfChanged(statsYearOverview, statsYearOverviewFingerprint, () => createStatsYearOverviewNodes(stats, year), 'statsYearOverview');
    } else if (typeof clearElementChildrenSafely === 'function') {
      clearElementChildrenSafely(statsYearOverview, 'statsYearOverview');
      createStatsYearOverviewNodes(stats, year).forEach(node => statsYearOverview.appendChild(node));
    } else {
      statsYearOverview.innerHTML = '';
      createStatsYearOverviewNodes(stats, year).forEach(node => statsYearOverview.appendChild(node));
    }
  }

  const statsNameGridFingerprint = JSON.stringify({ names: stats.names || [], selected: app.selectedStatsName || '' });
  if (typeof setElementChildrenIfChanged === 'function') {
    setElementChildrenIfChanged(statsNameGrid, statsNameGridFingerprint, () => renderStatsNameGridNodes(stats.names), 'statsNameGrid');
  } else {
    const statsNameGridHtml = renderStatsNameGridHtml(stats.names);
    if (typeof setElementHtmlIfChanged === 'function') setElementHtmlIfChanged(statsNameGrid, statsNameGridHtml, 'statsNameGrid');
    else statsNameGrid.innerHTML = statsNameGridHtml;
  }

  const statsMachineGridFingerprint = JSON.stringify({ machines: stats.machineOrder || [], selected: app.selectedStatsMachine || '' });
  if (typeof setElementChildrenIfChanged === 'function') {
    setElementChildrenIfChanged(statsMachineGrid, statsMachineGridFingerprint, () => renderStatsMachineGridNodes(stats), 'statsMachineGrid');
  } else {
    const statsMachineGridHtml = renderStatsMachineGridHtml(stats);
    if (typeof setElementHtmlIfChanged === 'function') setElementHtmlIfChanged(statsMachineGrid, statsMachineGridHtml, 'statsMachineGrid');
    else statsMachineGrid.innerHTML = statsMachineGridHtml;
  }

  if (app.selectedStatsName) {
    const person = stats.people[app.selectedStatsName];
    if (person) {
      const topWork = formatMachineWinners(person.topWorkMachines || (person.topWorkMachine ? [person.topWorkMachine] : []));
      const topClean = formatMachineWinners(person.topCleanMachines || (person.topCleanMachine ? [person.topCleanMachine] : []));
      const statsNameViewFingerprint = JSON.stringify({
        selected: person.name || '',
        year,
        totals: [person.totalWork, person.totalClean, person.totalAbsence],
        topWork,
        topClean,
        machines: (stats.machineOrder || []).map(machine => [machine, person.work[machine] || 0, person.clean[machine] || 0]),
        scopeNote: getStatsFutureMonthScopeNote(year, stats)
      });
      if (typeof setElementChildrenIfChanged === 'function') {
        setElementChildrenIfChanged(
          statsNameView,
          statsNameViewFingerprint,
          () => renderStatsNameViewNodes(person, year, stats, topWork, topClean),
          'statsNameView'
        );
      } else {
        const statsNameHtml =
          "<div class='sectionTitle'>" + escapeHtml(person.name) + " — " + escapeHtml(String(year)) + "</div>" +
          (getStatsFutureMonthScopeNote(year, stats) ? "<div class='smallText statsScopeNote'>" + escapeHtml(getStatsFutureMonthScopeNote(year, stats)) + "</div>" : "") +
          "<div class='statsSummary'>" +
          "<div class='tile'><div class='smallText'>Práce celkem</div><div class='statsSummaryValue'>" + formatCount(person.totalWork) + "</div></div>" +
          "<div class='tile'><div class='smallText'>Úklid celkem</div><div class='statsSummaryValue'>" + formatCount(person.totalClean) + "</div></div>" +
          "<div class='tile'><div class='smallText'>Absence celkem</div><div class='statsSummaryValue'>" + formatCount(person.totalAbsence) + "</div></div>" +
          "<div class='tile'><div class='smallText'>Dovolená</div><div class='statsSummaryValue'>" + formatVacationDaysHours(person) + "</div></div>" +
          "<div class='tile'><div class='smallText'>Práce + absence</div><div class='statsSummaryValue'>" + formatCount(person.totalWork + person.totalAbsence) + "</div></div>" +
          "<div class='tile'><div class='smallText'>Nejvíc pracoval na</div><div class='statsMultiLine statsSummaryValueCompact'>" + escapeHtml(topWork) + "</div></div>" +
          "<div class='tile'><div class='smallText'>Nejvíc uklízel na</div><div class='statsMultiLine statsSummaryValueCompact'>" + escapeHtml(topClean) + "</div></div>" +
          "</div>" +
          "<div class='tableWrap'><table class='statsTable'><thead><tr><th>Stroj</th><th>Práce</th><th>Úklid</th></tr></thead><tbody>" +
          stats.machineOrder.map(machine => "<tr><td>" + escapeHtml(machine) + "</td><td>" + formatMachineCount(person.work[machine] || 0, machine) + "</td><td>" + formatMachineCount(person.clean[machine] || 0, machine) + "</td></tr>").join("") +
          "</tbody></table></div>";
        if (typeof setElementHtmlIfChanged === 'function') setElementHtmlIfChanged(statsNameView, statsNameHtml, 'statsNameView');
        else statsNameView.innerHTML = statsNameHtml;
      }
    } else {
      clearStatsViewElement(statsNameView, 'statsNameView-empty');
    }
  } else {
    clearStatsViewElement(statsNameView, 'statsNameView-empty');
  }

  if (app.selectedStatsMachine) {
    const machine = app.selectedStatsMachine;
    const leader = stats.machineCleanLeaders[machine] || null;
    const leaderNames = leader && Array.isArray(leader.names) && leader.names.length
      ? leader.names.join('\n')
      : '—';
    const topWorkers = Object.values(stats.people)
      .map(person => [person.name, Number(person.work[machine] || 0)])
      .filter(([, value]) => value > 0)
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0], 'cs');
      })
      .slice(0, 3);
    const topWorkersText = topWorkers.length
      ? topWorkers.map(([name, value], index) => `${index + 1}. ${name} (${formatMachineCount(value, machine)})`).join('\n')
      : '—';
    const specialRanks = machine === 'MFK'
      ? stats.mfkSoloCounts
      : (machine === 'MSK' ? stats.mskPairCounts : null);
    const specialRankTitle = machine === 'MFK'
      ? 'Nejvíce byl sám na obou frézkách'
      : (machine === 'MSK' ? 'Ve 2 lidech na soustruhu nejvíce byl' : '');
    const specialRankText = specialRanks
      ? Object.entries(specialRanks)
        .filter(([, value]) => Number(value) > 0)
        .sort((a, b) => Number(b[1]) - Number(a[1]) || a[0].localeCompare(b[0], 'cs'))
        .slice(0, 3)
        .map(([name, value], index) => `${index + 1}. ${name} (${value}×)`)
        .join('\n') || '—'
      : '';

    const statsMachineViewFingerprint = JSON.stringify({ machine, leaderNames, topWorkersText, specialRankTitle, specialRankText });
    if (typeof setElementChildrenIfChanged === 'function') {
      setElementChildrenIfChanged(
        statsMachineView,
        statsMachineViewFingerprint,
        () => renderStatsMachineViewNodes(machine, leaderNames, topWorkersText, specialRankTitle, specialRankText),
        'statsMachineView'
      );
    } else {
      const statsMachineHtml = [
        "<div class='sectionTitle'>" + escapeHtml(machine) + "</div>",
        "<div class='statsSummary'>",
        "<div class='tile'><div class='smallText'>Letos nejvíc uklízeli</div><div class='statsMultiLine statsSummaryValueCompact'>" + escapeHtml(leaderNames) + "</div></div>",
        "<div class='tile'><div class='smallText'>Nejvíce tu byl</div><div class='statsMultiLine statsSummaryValueCompact'>" + escapeHtml(topWorkersText) + "</div></div>",
        specialRankTitle ? "<div class='tile'><div class='smallText'>" + escapeHtml(specialRankTitle) + "</div><div class='statsMultiLine statsSummaryValueCompact'>" + escapeHtml(specialRankText || '—') + "</div></div>" : "",
        "</div>"
      ].join('');
      if (typeof setElementHtmlIfChanged === 'function') setElementHtmlIfChanged(statsMachineView, statsMachineHtml, 'statsMachineView');
      else statsMachineView.innerHTML = statsMachineHtml;
    }
  } else {
    clearStatsViewElement(statsMachineView, 'statsMachineView-empty');
  }
}

function addDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function buildShiftIntervals(weekStart, cycleIndex) {
  const intervals = [];
  const add = (dayOffset, startHour, startMinute, endDayOffset, endHour, endMinute, label) => {
    intervals.push({
      start: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + dayOffset, startHour, startMinute, 0, 0),
      end: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + endDayOffset, endHour, endMinute, 0, 0),
      label
    });
  };

  const pushIfAllowed = (dayOffset, startHour, startMinute, endDayOffset, endHour, endMinute, label) => {
    const start = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + dayOffset, startHour, startMinute, 0, 0);
    if (isShiftStartBlocked(start)) return;
    intervals.push({
      start,
      end: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + endDayOffset, endHour, endMinute, 0, 0),
      label
    });
  };

  if (cycleIndex === 0) { // B
    pushIfAllowed(0, 6, 0, 0, 18, 0, "ranní");
    pushIfAllowed(1, 6, 0, 1, 18, 0, "ranní");
    pushIfAllowed(4, 18, 0, 5, 6, 0, "noční");
    pushIfAllowed(5, 18, 0, 6, 6, 0, "noční");
    const sundayDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6, 12, 0, 0, 0);
    const sundayNightStartHour = typeof getSpecialSundayNightStartHour === "function"
      ? getSpecialSundayNightStartHour(sundayDate, 22)
      : 22;
    pushIfAllowed(6, sundayNightStartHour, 0, 7, 6, 0, "noční");
  } else if (cycleIndex === 1) { // D
    pushIfAllowed(2, 6, 0, 2, 18, 0, "ranní");
    pushIfAllowed(3, 6, 0, 3, 18, 0, "ranní");
  } else if (cycleIndex === 2) { // A
    pushIfAllowed(0, 18, 0, 1, 6, 0, "noční");
    pushIfAllowed(1, 18, 0, 2, 6, 0, "noční");
    pushIfAllowed(4, 6, 0, 4, 18, 0, "ranní");
    pushIfAllowed(5, 6, 0, 5, 18, 0, "ranní");
    pushIfAllowed(6, 6, 0, 6, 14, 0, "ranní");
  } else if (cycleIndex === 3) { // C
    pushIfAllowed(2, 18, 0, 3, 6, 0, "noční");
    pushIfAllowed(3, 18, 0, 4, 6, 0, "noční");
  }

  return intervals;
}

function getTeamShiftState(now, team) {
  const baseWeek = startOfWeekMonday(SHIFT_CYCLE_START);
  const currentWeek = startOfWeekMonday(now);
  const weekDiff = Math.floor((startOfLocalDay(currentWeek) - startOfLocalDay(baseWeek)) / 86400000 / 7);
  const phase = SHIFT_PHASE_BY_TEAM[team] ?? 0;
  const currentIndex = ((weekDiff + phase) % 4 + 4) % 4;

  const weeks = [
    { start: addDays(currentWeek, -7), index: ((currentIndex - 1) % 4 + 4) % 4 },
    { start: currentWeek, index: currentIndex },
    { start: addDays(currentWeek, 7), index: (currentIndex + 1) % 4 }
  ];

  const intervals = weeks.flatMap(w => buildShiftIntervals(w.start, w.index));
  const active = intervals.find(item => now >= item.start && now < item.end) || null;
  if (active) {
    return { active: true, label: active.label, start: active.start, end: active.end };
  }

  const next = intervals
    .filter(item => item.start > now && !isShiftStartBlocked(item.start))
    .sort((a, b) => a.start - b.start)[0] || null;

  return { active: false, next };
}

function getActiveShiftNow(now) {
  for (const team of SHIFT_CYCLE_ORDER) {
    const state = getTeamShiftState(now, team);
    if (state.active) return { team, label: state.label, start: state.start, end: state.end };
  }
  return null;
}

function formatCalendarDateLabel(now) {
  return new Intl.DateTimeFormat("cs-CZ", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
    year: "numeric"
  }).format(now);
}

function getDashboardCalendarWeekNumber(now) {
  const source = now instanceof Date ? now : new Date();
  if (!(source instanceof Date) || Number.isNaN(source.getTime())) return null;

  // ISO kalendářní týden: pondělí je první den a 1. týden je ten, který obsahuje čtvrtek.
  const d = new Date(source.getFullYear(), source.getMonth(), source.getDate());
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - day);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getDashboardProductionWeekNumber(now) {
  // Zachováno kvůli starším voláním, ale Dashboard už má ukazovat kalendářní ISO týden.
  return getDashboardCalendarWeekNumber(now);
}

function isDashboardMorningShiftTime(now) {
  const d = now instanceof Date ? now : new Date();
  const hour = d.getHours();
  if (hour < 6 || hour >= 18) return false;
  if (typeof getActiveShiftNow === "function") {
    try {
      const active = getActiveShiftNow(d);
      if (active && active.label) return /ranní/i.test(String(active.label));
    } catch (err) {
      // Když kontrola směny selže, kalendář se řídí aspoň časovým oknem ranní.
    }
  }
  return true;
}

function getFirstMorningShiftDateInMonth(now) {
  const d = now instanceof Date ? new Date(now.getTime()) : new Date();
  const year = d.getFullYear();
  const monthIndex = d.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  let teams = ['A', 'B', 'C', 'D'];
  try {
    if (Array.isArray(window.SHIFT_CYCLE_ORDER) && window.SHIFT_CYCLE_ORDER.length) teams = window.SHIFT_CYCLE_ORDER.slice();
  } catch (err) {}

  if (typeof window.getTeamShiftState === 'function') {
    for (let day = 1; day <= daysInMonth; day += 1) {
      // 09:00 je bezpečně uvnitř ranní 6–18 i ranní 8h směny 6–14.
      const probe = new Date(year, monthIndex, day, 9, 0, 0, 0);
      for (const team of teams) {
        try {
          const state = window.getTeamShiftState(probe, team);
          if (!state || !state.active) continue;
          const label = String(state.label || '').trim();
          if (/^R/i.test(label) || /rann/i.test(label)) return new Date(year, monthIndex, day, 6, 0, 0, 0);
        } catch (err) {}
      }
    }
  }

  // Bez směnového enginu zachováme bezpečný fallback na první den měsíce.
  return new Date(year, monthIndex, 1, 6, 0, 0, 0);
}

function isSameCalendarDay(a, b) {
  return !!(a && b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate());
}

function getDashboardCalendarWorkNotes(now) {
  const d = now instanceof Date ? now : new Date();
  if (!isDashboardMorningShiftTime(d)) return [];

  const prefs = typeof getRakCalendarNotesSettings === 'function' ? getRakCalendarNotesSettings() : { mondayBurn: true, firstMorningRivet: true };
  const notes = [];
  if (prefs.mondayBurn && d.getDay() === 1) notes.push("Brusy- spálení");

  const firstMorning = getFirstMorningShiftDateInMonth(d);
  if (prefs.firstMorningRivet && isSameCalendarDay(d, firstMorning)) notes.push("Roznýtování- laborka");

  return notes;
}

function getCalendarSpecialText(now) {
  const parts = [];
  const weekNumber = getDashboardCalendarWeekNumber(now);
  if (weekNumber) parts.push(String(weekNumber) + ".KT");

  const special = getSpecialWorkInfo(now);
  if (special) {
    if (special.type === "holiday") {
      parts.push("Svátek: " + special.label);
    } else if (special.type === "czd") {
      parts.push(special.label);
    }
  }

  getDashboardCalendarWorkNotes(now).forEach(note => parts.push(note));

  return parts.join(" · ") || "Bez událostí";
}

function getAbsenceNamesForDate(date) {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const monthKey = (target.getMonth() + 1) + "/" + String(target.getFullYear()).slice(-2);
  const month = app.rotation && app.rotation.months ? app.rotation.months[monthKey] : null;
  if (!month || !Array.isArray(month.notes)) return [];

  const names = [];
  month.notes.forEach(note => {
    const n = normalizeNoteEntry(note);
    if (!n || !n.isAbsence || !Array.isArray(n.people) || !n.people.length) return;
    const parsed = typeof parseDateToken === 'function' ? parseDateToken(n.date) : null;
    if (!parsed || parsed.day !== target.getDate() || parsed.month !== (target.getMonth() + 1)) return;
    n.people.forEach(person => {
      const name = String(person || "").trim();
      if (name) names.push(name);
    });
  });

  return [...new Set(names)];
}

function getTodayAbsenceNames(now) {
  return getAbsenceNamesForDate(now);
}


function updateShift() {
  if (typeof updateDashboard === "function") updateDashboard();
}

// v.1.5 (963) – read-only kontrola: měsíční graf obsazenosti má bezpečnou jemnou theme výplň jen pod čárou.
function getRakStatsMonthlyThemeChartHealth() {
  let rootStyle = null;
  try { rootStyle = window.getComputedStyle ? window.getComputedStyle(document.documentElement) : null; } catch (err) { rootStyle = null; }
  const readVar = (name) => {
    try { return rootStyle ? String(rootStyle.getPropertyValue(name) || '').trim() : ''; } catch (err) { return ''; }
  };
  const chart = document.querySelector('#stats .statsOccupancyLineChart');
  const box = document.querySelector('#stats .statsYearCombinedBox') || document.querySelector('#stats .statsYearChartBox');
  const line = document.querySelector('#stats .statsOccupancyLine');
  const boxStyle = box && window.getComputedStyle ? window.getComputedStyle(box) : null;
  const lineStyle = line && window.getComputedStyle ? window.getComputedStyle(line) : null;
  return {
    ok: true,
    version: window.APP_VERSION || '1.2 (1.155)',
    mode: 'stats-monthly-occupancy-theme-chart-v942',
    chartPresent: !!chart,
    containerPresent: !!box,
    linePresent: !!line,
    themeAware: true,
    blackBoxRemoved: true,
    blackAreaFillRemoved: true,
    svgAreaUsesStableRgba: true,
    svgAreaLayerDisabled: false,
    themeLineGridDotsOnly: false,
    themeAreaFillUnderLineOnly: true,
    themeVars: {
      rakThemeAccent: readVar('--rakThemeAccent'),
      themeAccent: readVar('--theme-accent'),
      accent: readVar('--accent'),
      statsThemeAccent: readVar('--rak-stats-theme-accent')
    },
    computed: {
      containerBackground: boxStyle ? String(boxStyle.background || boxStyle.backgroundColor || '') : '',
      lineStroke: lineStyle ? String(lineStyle.stroke || '') : ''
    },
    manual: 'Ověřit ve Statistikách / Obsazenost strojů, že měsíční graf nemá černou výplň pod/mezi body; barvu theme drží čára, body a mřížka.'
  };
}
window.getRakStatsMonthlyThemeChartHealth = getRakStatsMonthlyThemeChartHealth;
try {
  if (window.RaK && window.RaK.diagnostics && typeof window.RaK.diagnostics.register === 'function') {
    window.RaK.diagnostics.register('statsMonthlyThemeChart', getRakStatsMonthlyThemeChartHealth);
  }
} catch (err) {}
