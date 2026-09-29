import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.150 restores Google Calendar UI for public-only selections',()=>{
  const nav=read('app-navigation.js');
  const start=nav.indexOf('function renderCalendarModalContent');
  const end=nav.indexOf('function ensureCalendarModal',start);
  const renderer=nav.slice(start,end);
  assert(renderer.includes('const containsPrivateKalirna = calendars.some'));
  assert(renderer.includes('if (!containsPrivateKalirna)'));
  assert(renderer.includes('calendarModalFrame'));
  assert(renderer.includes('<iframe'));
  assert(renderer.includes('loading="eager"'));
});

test('1.7.150 keeps private Kalírna on secure native renderer',()=>{
  const nav=read('app-navigation.js');
  const start=nav.indexOf('function renderCalendarModalContent');
  const end=nav.indexOf('function ensureCalendarModal',start);
  const renderer=nav.slice(start,end);
  assert(renderer.includes('/^kalirna-[ABCD]$/'));
  assert(renderer.includes('calendarNativeHost'));
  assert(renderer.includes('void rakNativeCalendarLoad(content, 0);'));
  assert(renderer.indexOf('if (!containsPrivateKalirna)') < renderer.indexOf('const existingNative'));
});

test('hybrid display leaves operational calendar context on exactly one assigned calendar',()=>{
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
