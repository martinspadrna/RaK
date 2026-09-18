#!/usr/bin/env node
// Exercise the real vacation reportText with the user's October 2026 example.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read = file => fs.readFileSync(file, 'utf8');
const source = read('rak-vacation-report.js');
assert(source.includes('// RAK_VACATION_COMPLETE_ABSENCES_17016'), 'Google+roster union lost');
assert(source.includes('// RAK_VACATION_GROUP_REASON_17018'), 'reason grouping marker missing');
const begin = source.indexOf('  function reportText(monthKey) {');
const end = source.indexOf('  function setStatus(root, text) {', begin);
assert(begin >= 0 && end > begin, 'real vacation formatter bounds missing');

const holidays = [
  ['Novotný','23.10.','R'], ['Novotný','29.10.','N'],
  ['Starý','29.10.','N'], ['Synek','10.10.','N']
].map(([name,date,shift]) => ({name,date,shift,code:'D'}));
const dates = [
  ['1.10.','N'], ['5.10.','R'], ['6.10.','R'], ['9.10.','N'],
  ['10.10.','N'], ['11.10.','N8'], ['14.10.','R'], ['15.10.','R'],
  ['19.10.','N'], ['20.10.','N'], ['23.10.','R'], ['24.10.','R'],
  ['25.10.','R8'], ['28.10.',''], ['29.10.','N']
];
const days = dates.map(([date,shift]) => ({name:'Špadrna',date,shift,code:'NV'}));
let current = holidays.concat(days);
const ctx = vm.createContext({
  Map, Set,
  rowsForMonth: () => current,
  monthLabel: () => 'říjen 2026',
  reportSource: () => 'Google kalendář + Absence v rozpisu',
  normalizeLookup: value => String(value || '').toLowerCase()
});
vm.runInContext(source.slice(begin,end),ctx);
const render = vm.runInContext('reportText',ctx);
const original = render('10/26');
const expected = '- Špadrna (NV – náhradní volno): ' + dates.map(([date,shift]) => [date,shift].filter(Boolean).join(' ')).join(', ');
assert(original.includes(expected), 'all 15 NV days must follow the one reason: ' + original);
assert.equal(original.split('NV – náhradní volno').length - 1, 1, 'NV reason must appear exactly once');
assert(original.includes('- Novotný: 23.10. R, 29.10. N'), 'vacation formatting changed');
assert(original.includes('Celkem: 19 záznamů · 4 osob (dovolené 4, ostatní 15)'), 'counts changed by presentation grouping');
assert(!original.includes('1.10. N (NV') && !original.includes('5.10. R (NV'), 'reason still repeated after dates');

// Mixed reasons must not be merged under the wrong label; one-off absences
// retain the previous familiar presentation for backward compatibility.
current = current.concat([
  {name:'Špadrna',date:'30.10.',shift:'R',code:'Š'},
  {name:'Pech',date:'31.10.',shift:'N',code:'N'},
  {name:'Starý',date:'30.10.',shift:'R',code:'?',reason:'jiný důvod'}
]);
const mixed = render('10/26');
assert(mixed.includes('- Špadrna:\n  NV – náhradní volno: ' + dates.map(([date,shift]) => [date,shift].filter(Boolean).join(' ')).join(', ')
  + '\n  Š – školení: 30.10. R'), 'mixed reasons must form separate date groups');
assert.equal(mixed.split('NV – náhradní volno').length - 1, 1, 'NV still repeated in mixed reasons');
assert(mixed.includes('- Pech: 31.10. N (N – nemoc)'), 'single-date reason should stay on same line');
assert(mixed.includes('- Starý: 30.10. R (jiný důvod)'), 'unknown reason preserved');
assert(mixed.includes('Celkem: 22 záznamů · 5 osob (dovolené 4, ostatní 18)'), 'mixed reason counts changed');
assert(source.includes('return reportText(select && select.value);'), 'copy/share no longer uses reportText');

const config = read('supabase-config.js'), index = read('index.html'), sw = read('sw.js');
assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co') && !config.includes('bkqamcbkiwumsvelahxr'), 'test Supabase only');
assert(config.includes('window.RAK_RELEASE_VERSION = "1.7.18";') && config.includes('window.RAK_PWA_BUILD = "v1.7.18-absencegroups1";'), 'release markers');
assert(index.includes("var build='v1.7.18-absencegroups1';"), 'index build marker');
assert(sw.includes("const CACHE_VERSION = 'v1.7.18';"), 'SW cache');
assert.equal(JSON.parse(read('package.json')).version,'1.7.0','technical package version changed');
console.log('[vacation-reason-group-17018-smoke] OK October 19 rows/4 people: 15 NV dates with one reason; mixed and single reasons; D untouched; counts, copy, test DB, version');