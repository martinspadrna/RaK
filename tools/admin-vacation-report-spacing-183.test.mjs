import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('Admin Calendars keeps a modest gap below the vacation report picker',()=>{
  const core=read('core.js');
  const css=read('styles-modal.css');
  assert(core.includes('appMenuCard adminVacationReportCalendarCard'));
  assert(css.includes('.adminVacationReportCalendarCard{margin-bottom:12px;}'));
});
