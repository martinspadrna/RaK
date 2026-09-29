import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const core = read('core.js');
const wizard = read('admin-rotation-generator-wizard.js');
const report = read('rak-vacation-report.js');

assert.doesNotMatch(core, /getRakActiveShiftCalendarPublicSources/, 'calendar import helpers must stay out of startup core');
assert.match(wizard, /function adminRotationGeneratorActiveShiftCalendarSources\(\)/, 'generator must resolve sources lazily');
assert.match(report, /function vacationReportActiveShiftCalendarSources\(\)/, 'report must resolve sources lazily');
assert.match(core, /const calendarAssignment = normalizeRakCalendarAssignmentKey\(account\.calendarAssignment \|\| profileAssignment \|\| '', account\.shiftTeam \|\| profileTeam \|\| 'D'\);/, 'outside app account must keep its assigned Obrábění/Kalírna A-D calendar');
assert.match(core, /return \{team:'D',outside:false,accountId:id,calendarAssignment:'obrabeni-D'\};/, 'worker without outside assignment must remain Obrábění D');
assert.match(core, /url\.searchParams\.getAll\('src'\)/, 'configured embed calendars must resolve to Google source IDs');
assert.match(core, /function getRakActiveShiftCalendarDisplayContext\(\)/, 'dashboard display context must be separate from operational calendar context');
assert.match(core, /const calendars = getRakAllShiftCalendars\(\)\.filter\(\(entry\) => entry\.key === assignmentKey\)\.slice\(0, 1\);/, 'generator/report operational context must stay on exactly one assigned calendar');
assert.match(core, /const selectedKeys = getRakSelectedCalendarKeys\(\);/, 'dashboard display context may use the user multi-selection');

for (const [name, source] of [['generator', wizard], ['vacation report', report]]) {
  assert.match(source, /\/api\/public-calendar\?src=/, name + ' must use the same public calendar proxy as the dashboard');
  assert.match(source, /getRakActiveShiftCalendarContext/, name + ' must select sources from the active account shift');
  assert.doesNotMatch(source, /functions\/v1\/rak-absence-calendar/, name + ' must not depend on the legacy Supabase absence-calendar secret');
}
assert.match(report, /context\.team === 'D' \? vacationRows\(monthKey\) : \[\]/, 'only shift D may merge saved D-roster absences into the report');
assert.match(report, /calendarCacheKey\(monthKey, context\)/, 'calendar cache must be isolated by active shift');
console.log('shift-calendar-absence-17128: PASS');
