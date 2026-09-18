#!/usr/bin/env node
// RaK 1.7.16: vacation report must not replace saved absences with D-only Google results.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const VERSION = '1.7.16';
const BUILD = 'v1.7.16-absenceunion1';
const MARKER = '// RAK_VACATION_COMPLETE_ABSENCES_17016';
const read = file => fs.readFileSync(file, 'utf8');
const write = (file, source) => fs.writeFileSync(file, source, 'utf8');
const replaceLine = (source, pattern, text, label) => {
  assert.match(source, pattern, label + ': anchor missing');
  return source.replace(pattern, text);
};
const implementation = String.raw`  // RAK_VACATION_COMPLETE_ABSENCES_17016
  // The calendar is an absence calendar, not a vacation-only D feed. Keep all
  // documented reasons and distinguish the vacation count from other absences.
  function absenceReason17016(raw) {
    const value = String(raw || '').trim();
    const direct = value.toLocaleUpperCase('cs-CZ').match(/^(NV|D|N|L|S|Š|§)(?=$|[\s,;:])/u);
    if (direct) return direct[1];
    const folded = value.toLocaleLowerCase('cs-CZ').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (/dovol/.test(folded)) return 'D';
    if (/nahrad|nahradni volno/.test(folded)) return 'NV';
    if (/nemoc|neschop/.test(folded)) return 'N';
    if (/skolen/.test(folded)) return 'Š';
    if (/senior/.test(folded)) return 'S';
    if (/lazn/.test(folded)) return 'L';
    if (/paragraf|§/.test(folded)) return '§';
    return '';
  }

  function calendarAbsenceSummary17016(summary) {
    const raw = decodeIcsText(summary);
    if (!raw) return null;
    const names = knownNames().sort((a, b) => b.length - a.length);
    const lower = raw.toLocaleLowerCase('cs-CZ');
    const known = names.find(name => {
      const candidate = name.toLocaleLowerCase('cs-CZ');
      return lower === candidate || [ ' ', ',', ';', ':' ].some(separator => lower.startsWith(candidate + separator));
    });
    const name = known || raw.split(/[,:;]/)[0].trim().split(/\s+/)[0];
    const remainder = raw.slice(known ? known.length : name.length).replace(/^[\s,;:\-]+/, '').trim();
    const code = absenceReason17016(remainder);
    // A bare known surname is an absence with unspecified reason, never silently D.
    // Unknown calendar titles are ignored unless they have an explicit absence reason.
    if (!name || name.length >= 80 || (!known && !code)) return null;
    return { name: known || name, code: code || '?', reason: code ? '' : remainder.slice(0, 60) };
  }

  function calendarVacationRows(text, monthKey) {
    const parsedMonth = typeof window.parseMonthKey === 'function' ? window.parseMonthKey(monthKey) : null;
    if (!parsedMonth) return [];
    const prefix = String(parsedMonth.year) + '-' + String(parsedMonth.month).padStart(2, '0') + '-';
    const seen = new Set();
    const rows = [];
    const unfolded = String(text || '').replace(/\r?\n[ \t]/g, '');
    const events = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
    events.forEach((event, index) => {
      if (/^STATUS:CANCELLED\s*$/mi.test(event)) return;
      const absence = calendarAbsenceSummary17016(icsProperty(event, 'SUMMARY').value);
      if (!absence) return;
      icsDates(icsProperty(event, 'DTSTART'), icsProperty(event, 'DTEND')).forEach(iso => {
        if (!iso.startsWith(prefix)) return;
        const key = normalizeLookup(absence.name) + '|' + iso;
        if (seen.has(key)) return;
        seen.add(key);
        rows.push({ ...absence, iso, date: String(Number(iso.slice(8, 10))) + '.' + String(Number(iso.slice(5, 7))) + '.',
          shift: '', day: Number(iso.slice(8, 10)), order: 0, noteIndex: index });
      });
    });
    return rows.sort((a, b) => a.name.localeCompare(b.name, 'cs') || a.day - b.day || a.noteIndex - b.noteIndex);
  }

  function vacationRows(monthKey) {
    const month = window.app && app.rotation && app.rotation.months ? app.rotation.months[monthKey] : null;
    const source = Array.isArray(month && month.notes) ? month.notes : [];
    const parsedMonth = typeof window.parseMonthKey === 'function' ? window.parseMonthKey(monthKey) : null;
    const seen = new Set();
    return source.flatMap((note, noteIndex) => {
      const entry = typeof window.normalizeNoteEntry === 'function' ? window.normalizeNoteEntry(note) : note;
      if (!entry || !entry.isAbsence) return [];
      const parsed = typeof window.parseDateToken === 'function' ? window.parseDateToken(entry.date) : null;
      const fallback = String(entry.date || '').match(/(\d{1,2})\.(\d{1,2})\./);
      const day = Number(parsed && parsed.day || fallback && fallback[1]);
      const monthNumber = Number(parsed && parsed.month || fallback && fallback[2] || (parsedMonth && parsedMonth.month));
      if (!parsedMonth || !(day >= 1 && day <= 31) || monthNumber !== Number(parsedMonth.month)) return [];
      const iso = String(parsedMonth.year) + '-' + String(monthNumber).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      const date = String(day) + '.' + String(monthNumber) + '.';
      const shift = String(entry.shift || (parsed && parsed.shift) || '').trim();
      const code = absenceReason17016(entry.code) || absenceReason17016(entry.label) || '?';
      const people = Array.isArray(entry.people) && entry.people.length ? entry.people : [entry.person];
      return people.map(person => {
        const name = String(person || '').trim();
        const key = normalizeLookup(name) + '|' + iso + '|' + shift.toUpperCase();
        if (!name || seen.has(key)) return null;
        seen.add(key);
        return { name, iso, date, shift, code, reason: code === '?' ? String(entry.code || entry.label || '').slice(0, 60) : '',
          day, order: shift.toUpperCase().startsWith('R') ? 1 : (shift.toUpperCase().startsWith('N') ? 2 : 9), noteIndex };
      }).filter(Boolean);
    }).sort((a,b) => a.name.localeCompare(b.name,'cs') || a.day - b.day || a.order - b.order || a.noteIndex - b.noteIndex);
  }

  function rowsForMonth(monthKey) {
    const rosterRows = vacationRows(monthKey);
    if (!calendarRowsByMonth.has(monthKey)) return rosterRows;
    // A saved shift-specific absence takes priority on the same person/day.
    // Calendar-only days are appended; no person/day is counted twice.
    const rosterDays = new Set(rosterRows.map(row => normalizeLookup(row.name) + '|' + row.iso));
    const calendarOnly = (calendarRowsByMonth.get(monthKey) || []).filter(row =>
      !rosterDays.has(normalizeLookup(row.name) + '|' + row.iso));
    return rosterRows.concat(calendarOnly).sort((a,b) => a.name.localeCompare(b.name,'cs') || a.day - b.day || a.order - b.order || a.noteIndex - b.noteIndex);
  }

  function reportSource(monthKey) {
    if (!calendarRowsByMonth.has(monthKey)) return 'Absence v rozpisu';
    return vacationRows(monthKey).length ? 'Google kalendář + Absence v rozpisu' : 'Google kalendář';
  }

  function reportText(monthKey) {
    const rows = rowsForMonth(monthKey);
    const holidays = rows.filter(row => row.code === 'D');
    const others = rows.filter(row => row.code !== 'D');
    const names = new Set(rows.map(row => normalizeLookup(row.name)));
    const lines = ['RaK – report dovolených a absencí', 'Měsíc: ' + monthLabel(monthKey), 'Zdroj: ' + reportSource(monthKey), ''];
    const reasonLabel = { NV:'náhradní volno', N:'nemoc', L:'lázně', S:'senior', 'Š':'školení', '§':'paragraf' };
    function appendGroup(title, source, withReason) {
      if (!source.length) return;
      lines.push(title);
      const byName = new Map();
      source.forEach(row => {
        if (!byName.has(row.name)) byName.set(row.name, []);
        const suffix = withReason ? ' (' + (row.code === '?' ? (row.reason || 'důvod neuveden')
          : row.code + (reasonLabel[row.code] ? ' – ' + reasonLabel[row.code] : '')) + ')' : '';
        byName.get(row.name).push([row.date, row.shift].filter(Boolean).join(' ') + suffix);
      });
      byName.forEach((dates, name) => lines.push('- ' + name + ': ' + dates.join(', ')));
      lines.push('');
    }
    if (!rows.length) lines.push('Pro vybraný měsíc nejsou zapsané žádné dovolené ani jiné absence.', '');
    appendGroup('Dovolené:', holidays, false);
    appendGroup('Ostatní absence:', others, true);
    lines.push('Celkem: ' + String(rows.length) + ' záznamů · ' + String(names.size) + ' osob'
      + ' (dovolené ' + String(holidays.length) + ', ostatní ' + String(others.length) + ')');
    return lines.join('\n').trim();
  }

`;
let source = read('rak-vacation-report.js');
if (!source.includes(MARKER)) {
  const from = source.indexOf('  function nameFromCalendarSummary(summary) {');
  const to = source.indexOf('  function setStatus(root, text) {', from);
  assert(from >= 0 && to > from, 'vacation parsing/report boundaries changed');
  source = source.slice(0, from) + implementation + source.slice(to);
}
const oldIntro = 'Přehled dovolených z Google kalendáře; při nedostupném připojení bezpečně použije Absence ve zvoleném rozpisu.';
const newIntro = 'Úplný přehled: dovolené (D) i další důvody absencí. Spojí Google kalendář s uloženým rozpisem bez duplicit; dovolené a ostatní absence jsou zvlášť.';
if (source.includes(oldIntro)) source = source.replace(oldIntro, newIntro);
assert(source.includes(newIntro), 'report source explanation missing');
source = source.replace("setStatus(root, 'Dovolené byly načtené z Google kalendáře.');",
  "setStatus(root, 'Načteno z kalendáře a doplněno z rozpisu: ' + String(rowsForMonth(monthKey).length) + ' záznamů bez duplicit.');");
source = source.replace("setStatus(root, 'Kalendář teď není dostupný – zobrazuji Absence z rozpisu.');",
  "setStatus(root, calendarRowsByMonth.has(monthKey) ? 'Kalendář není dostupný – zůstává poslední načtení a Absence z rozpisu.' : 'Kalendář teď není dostupný – zobrazuji Absence z rozpisu.');");
assert(source.includes('String(rowsForMonth(monthKey).length)'), 'calendar load status missing');
write('rak-vacation-report.js', source);
let config = read('supabase-config.js');
assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co') && !config.includes('bkqamcbkiwumsvelahxr'), 'test Supabase only');
config = replaceLine(config, /^window\.RAK_RELEASE_VERSION = "[^"]+";$/m, `window.RAK_RELEASE_VERSION = "${VERSION}";`, 'config release');
config = replaceLine(config, /^window\.RAK_TEST_DISPLAY_VERSION = "[^"]+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`, 'config display');
config = replaceLine(config, /^window\.RAK_PWA_BUILD = "[^"]+";$/m, `window.RAK_PWA_BUILD = "${BUILD}";`, 'config build');
write('supabase-config.js', config);
let app = read('app.js');
app = replaceLine(app, /^  const RAK_DEV_UPDATE_BUILD = "[^"]+";$/m, `  const RAK_DEV_UPDATE_BUILD = "${BUILD}";`, 'app build');
app = replaceLine(app, /^  window\.RAK_RELEASE_VERSION = "[^"]+";$/m, `  window.RAK_RELEASE_VERSION = "${VERSION}";`, 'app release');
write('app.js', app);
let sw = read('sw.js');
assert(sw.includes("const SW_APP_VERSION = '1.7.0';"), 'technical SW version changed');
sw = replaceLine(sw, /^const CACHE_VERSION = '[^']+';$/m, `const CACHE_VERSION = 'v${VERSION}';`, 'SW cache');
sw = replaceLine(sw, /^const DEVELOPMENT_TEST_DISPLAY_VERSION = '[^']+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`, 'SW display');
sw = replaceLine(sw, /^const DEVELOPMENT_BUILD_ID = '[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD}';`, 'SW build');
write('sw.js', sw);
let index = read('index.html');
const previous = "var build='v1.7.15-indexgrid1';";
const current = `var build='${BUILD}';`;
if (!index.includes(current)) {
  assert(index.includes(previous), 'previous index build marker missing');
  index = index.replace(previous, current);
}
write('index.html', index);
assert.equal(JSON.parse(read('package.json')).version, '1.7.0', 'technical package version changed');
for (const file of ['rak-vacation-report.js','supabase-config.js','app.js','sw.js']) {
  execFileSync(process.execPath, ['--check', file], { stdio:'pipe' });
}
execFileSync(process.execPath, ['tools/vacation-absence-union-17016-smoke.mjs'], { stdio:'inherit' });
console.log('[development-version-17016] OK all absence codes, Google+roster union, one person/day, separate vacation/other totals, test DB, PWA 1.7.16');
