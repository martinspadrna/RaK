#!/usr/bin/env node
// Full behavior fixture for the actual deployed vacation report functions.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read = path => fs.readFileSync(path, 'utf8');
const report = read('rak-vacation-report.js');
const begin = report.indexOf('  function isVacation(entry) {');
const end = report.indexOf('  function setStatus(root, text) {', begin);
assert(begin >= 0 && end > begin && report.slice(begin,end).includes('// RAK_VACATION_COMPLETE_ABSENCES_17016'), 'patched report behavior not installed');
const ctx = {console, Date, Map, Set, Intl, MONTHS:['leden','únor','březen','duben','květen','červen','červenec','srpen','září','říjen','listopad','prosinec']};
ctx.window = ctx;
ctx.parseMonthKey = key => {
  const match = String(key).match(/^(\d{1,2})\/(\d{2})$/);
  return match ? {year:2000+Number(match[2]),month:Number(match[1])} : null;
};
ctx.parseDateToken = label => {
  const match = String(label).match(/^(\d{1,2})\.(\d{1,2})\.\s*(.*)$/);
  return match ? {day:Number(match[1]),month:Number(match[2]),shift:match[3]} : null;
};
ctx.getKnownStatNames = () => new Set(['Synek','Novotný','Kříž','Starý','Pech']);
ctx.normalizeNoteEntry = note => ({ ...note, isAbsence: true, people: [note.person] });
ctx.app = {rotation:{months:{'9/26':{notes:[
  {person:'Synek',code:'D',date:'2.9. R',shift:'R'},
  {person:'Novotný',code:'D',date:'3.9. N',shift:'N'},
  {person:'Pech',code:'NV',date:'5.9. R',shift:'R'}
]}}}};
ctx.calendarRowsByMonth = new Map();
ctx.monthLabel = () => 'září 2026';
vm.createContext(ctx);
vm.runInContext(report.slice(begin,end),ctx);
const evalFn = name => vm.runInContext(name,ctx);
const event = (summary, start, endDate, additional='') => [
  'BEGIN:VEVENT',`SUMMARY:${summary}`,`DTSTART;VALUE=DATE:${start}`,`DTEND;VALUE=DATE:${endDate}`,additional,'END:VEVENT'
].filter(Boolean).join('\r\n');
const ics = ['BEGIN:VCALENDAR',
  event('Synek D','20260902','20260904'),
  event('Novotný NV','20260902','20260904'),
  event('Kříž','20260904','20260905'),
  event('Starý školení','20260904','20260905'),
  event('Pech D','20260905','20260906','STATUS:CANCELLED'),
  event('Neznámá schůzka','20260905','20260906'),
  event('Synek D','20261001','20261002'),
  event('Synek D','20260902','20260903'),
'END:VCALENDAR'].join('\r\n');
const fromGoogle = evalFn('calendarVacationRows')(ics,'9/26');
assert.equal(fromGoogle.length,6,'six unique September absence dates from ICS, no cancelled/non-absence/October/duplicates');
assert.equal(fromGoogle.filter(row=>row.code==='NV').length,2,'NV must not be removed by D-only filter');
assert.equal(fromGoogle.find(row=>row.name==='Kříž').code,'?','bare known name must be labelled unspecified, never assumed to be vacation');
assert.equal(fromGoogle.find(row=>row.name==='Starý').code,'Š','full school reason must normalize');
const local = evalFn('vacationRows')('9/26');
assert.equal(local.length,3,'saved D and NV must be read, not D only');
assert.equal(local.find(row=>row.name==='Synek').shift,'R','saved shift preserved');
ctx.calendarRowsByMonth.set('9/26',fromGoogle);
const merged = evalFn('rowsForMonth')('9/26');
assert.equal(merged.length,7,'union must add calendar-only days and roster-only NV, without double counting');
assert.equal(merged.filter(row=>row.name==='Synek').length,2,'same person/date calendar+roster deduplicated');
assert.equal(merged.find(row=>row.name==='Novotný'&&row.day===3).code,'D','saved code takes precedence on a conflict');
assert.equal(merged.find(row=>row.name==='Novotný'&&row.day===3).shift,'N','saved shift retained on merge');
const text = evalFn('reportText')('9/26');
for (const expected of ['Google kalendář + Absence v rozpisu','Dovolené:', 'Ostatní absence:',
  'Synek: 2.9. R, 3.9.', 'Novotný: 3.9. N', 'Novotný: 2.9. (NV – náhradní volno)',
  'Kříž: 4.9. (důvod neuveden)', 'Starý: 4.9. (Š – školení)', 'Pech: 5.9. R (NV – náhradní volno)',
  'Celkem: 7 záznamů · 5 osob (dovolené 3, ostatní 4)']) {
  assert(text.includes(expected),'missing in text report: '+expected);
}
assert(!text.includes('1.10.') && !text.includes('Pech: 5.9. (D'), 'out-of-month or cancelled event leaked');
ctx.calendarRowsByMonth.set('9/26',[]);
const emptyCalendar = evalFn('rowsForMonth')('9/26');
assert.equal(emptyCalendar.length,3,'empty valid calendar must never erase saved absences');
ctx.calendarRowsByMonth.delete('9/26');
assert.equal(evalFn('rowsForMonth')('9/26').length,3,'offline fallback must retain saved absences');
assert(report.includes('return reportText(select && select.value);'), 'copy/share must use unified report');
assert(report.includes('String(rowsForMonth(monthKey).length)'), 'load status must reflect merged count');
const config=read('supabase-config.js'), index=read('index.html'), sw=read('sw.js');
assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co') && !config.includes('bkqamcbkiwumsvelahxr'), 'development must use test DB only');
assert(config.includes('window.RAK_RELEASE_VERSION = "1.7.16";') && config.includes('window.RAK_PWA_BUILD = "v1.7.16-absenceunion1";'), 'release config mismatch');
assert(index.includes("var build='v1.7.16-absenceunion1';"), 'index build mismatch');
assert(sw.includes("const CACHE_VERSION = 'v1.7.16';"), 'service worker update marker missing');
assert.equal(JSON.parse(read('package.json')).version,'1.7.0','technical version unexpectedly changed');
console.log('[vacation-absence-union-17016-smoke] OK calendar D/NV/Š/unspecified + roster union 7 distinct rows (D 3, other 4), duplicate/month/cancel guards, copy parity, empty/offline fallback, test Supabase, version');
