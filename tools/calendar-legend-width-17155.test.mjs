import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('calendar legend chips size to their labels instead of full row width',()=>{
  const nav=read('app-navigation.js');
  assert(nav.includes('display:inline-flex;width:auto;min-width:0;max-width:max-content;flex:0 0 auto;'));
  assert(nav.includes('calendarSourceLegendChip'));
});

test('legend width fix does not change stored calendar selection or D vacation source',()=>{
  const nav=read('app-navigation.js');
  const core=read('core.js');
  const report=read('rak-vacation-report.js');
  const legendStart=nav.indexOf('function rakCalendarLegendHtml');
  const legendEnd=nav.indexOf('function rakShiftCalendarEmbedUrl',legendStart);
  const legend=nav.slice(legendStart,legendEnd);
  assert(!/setRakSelectedCalendarKeys|saveActiveAccountCalendarSelection|localStorage/.test(legend));
  assert(report.includes('getRakActiveShiftCalendarContext'));
  assert(core.includes("obrabeni: '31eea99edff1771be15ba877f7c2f5b1371e0a742ad9d54fca526d41eafa5995@group.calendar.google.com'"));
});
