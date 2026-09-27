import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const core = read('core.js');
const wizard = read('admin-rotation-generator-wizard.js');
const report = read('rak-vacation-report.js');

assert.doesNotMatch(core, /getRakActiveShiftCalendarPublicSources/, 'calendar import helpers must stay out of startup core');
assert.match(wizard, /function adminRotationGeneratorActiveShiftCalendarSources\(\)/, 'generator must resolve sources lazily');
assert.match(report, /function vacationReportActiveShiftCalendarSources\(\)/, 'report must resolve sources lazily');
assert.match(core, /if \(account\) return \{team:account\.shiftTeam \|\| profileTeam \|\| 'D',outside:true,accountId:id\};/, 'outside app account must use its assigned A\/B\/C\/D shift');
assert.match(core, /return \{team:'D',outside:false,accountId:id\};/, 'worker without outside assignment must remain shift D');
assert.match(core, /url\.searchParams\.getAll\('src'\)/, 'configured embed calendars must resolve to public Google source IDs');

for (const [name, source] of [['generator', wizard], ['vacation report', report]]) {
  assert.match(source, /\/api\/public-calendar\?src=/, name + ' must use the same public calendar proxy as the dashboard');
  assert.match(source, /getRakActiveShiftCalendarContext/, name + ' must select sources from the active account shift');
  assert.doesNotMatch(source, /functions\/v1\/rak-absence-calendar/, name + ' must not depend on the legacy Supabase absence-calendar secret');
}
assert.match(report, /context\.team === 'D' \? vacationRows\(monthKey\) : \[\]/, 'only shift D may merge saved D-roster absences into the report');
assert.match(report, /calendarCacheKey\(monthKey, context\)/, 'calendar cache must be isolated by active shift');
console.log('shift-calendar-absence-17128: PASS');
