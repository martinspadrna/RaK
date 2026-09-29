import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.150 hybrid-calendar milestone remains documented under successors',()=>{
  const changelog=read('CHANGELOG.md');
  assert(changelog.includes('## RaK 1.7.150 (development)'));
  assert(changelog.includes('Google Calendar iframe vzhled'));
  assert(changelog.includes('private Kalírnu A–D'));
});

test('successors keep Google Calendar iframe capability',()=>{
  const nav=read('app-navigation.js');
  assert(nav.includes('calendarModalFrame'));
  assert(nav.includes('<iframe'));
  assert(nav.includes('rakShiftCalendarEmbedUrl(calendars)'));
});

test('operational calendar context remains exactly one assigned calendar',()=>{
  const core=read('core.js');
  const wizard=read('admin-rotation-generator-wizard.js');
  const report=read('rak-vacation-report.js');
  assert(core.includes("getRakAllShiftCalendars().filter((entry) => entry.key === assignmentKey).slice(0, 1)"));
  assert(core.includes('function getRakActiveShiftCalendarDisplayContext()'));
  assert(wizard.includes('getRakActiveShiftCalendarContext'));
  assert(report.includes('getRakActiveShiftCalendarContext'));
  assert(!wizard.includes('getRakActiveShiftCalendarDisplayContext'));
  assert(!report.includes('getRakActiveShiftCalendarDisplayContext'));
});
