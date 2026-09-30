import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('Admin Calendars stores one dedicated vacation-report calendar in the existing settings row',()=>{
  const core=read('core.js');
  assert(core.includes('vacationReportCalendarKey'));
  assert(core.includes('requestedVacationReportCalendarKey'));
  assert(core.includes("'obrabeni-D'"));
  assert(core.includes('data-vacation-report-calendar-key'));
  assert(core.includes('Kalendář pro report dovolených'));
  assert(core.includes('getRakVacationReportCalendarContext'));
  assert(core.includes('window.getRakVacationReportCalendarContext = getRakVacationReportCalendarContext'));
  assert(core.includes('normalizeRakShiftCalendarSettings({ teams, vacationReportCalendarKey })'));
});

test('vacation report uses the dedicated calendar and keeps saved roster absences independent of signed-in shift',()=>{
  const report=read('rak-vacation-report.js');
  assert(report.includes("typeof getRakVacationReportCalendarContext === 'function'"));
  assert(!report.includes('getRakActiveShiftCalendarContext'));
  assert(report.includes('const rosterRows = vacationRows(monthKey);'));
  assert(report.includes("String(current.calendarKey || 'obrabeni-D') + '|' + current.sources.join(',')"));
  assert(report.includes('context.calendarLabel'));
  assert(report.includes('Zobrazuji Absence z rozpisu.'));
});

test('generator routing and protected Obrabeni D source remain unchanged',()=>{
  const core=read('core.js');
  const generator=read('admin-rotation-generator-wizard.js');
  assert(generator.includes('getRakActiveShiftCalendarContext'));
  assert(core.includes("obrabeni: '31eea99edff1771be15ba877f7c2f5b1371e0a742ad9d54fca526d41eafa5995@group.calendar.google.com'"));
});
