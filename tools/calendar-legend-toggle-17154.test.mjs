import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('calendar legend chips are accessible visibility toggles',()=>{
  const nav=read('app-navigation.js');
  const css=read('styles-modal.css');
  assert(nav.includes('data-calendar-legend-key'));
  assert(nav.includes("aria-pressed=\"' + (active ? 'true' : 'false')"));
  assert(nav.includes('function rakCalendarApplyLegendVisibility'));
  assert(nav.includes("if (visible.has(key)) visible.delete(key);"));
  assert(nav.includes('else visible.add(key);'));
  assert(nav.includes("button.style.opacity = active ? '1' : '.42'"));
  assert(nav.includes("button.style.filter = active ? '' : 'saturate(.35)'"));
  assert(css.includes('.calendarSourceLegendChip{'));
});

test('legend filtering rebuilds only the Google iframe display subset',()=>{
  const nav=read('app-navigation.js');
  assert(nav.includes('const visibleCalendars = calendars.filter'));
  assert(nav.includes('const nextUrl = rakShiftCalendarEmbedUrl(visibleCalendars);'));
  assert(nav.includes("frame.setAttribute('src', nextUrl)"));
  assert(nav.includes('Všechny vybrané kalendáře jsou skryté.'));
  assert(!nav.includes('setRakSelectedCalendarKeys(visible'));
  assert(!nav.includes('saveActiveAccountCalendarSelection(visible'));
});

test('stored account selection and operational vacation calendar remain separate from temporary visibility',()=>{
  const core=read('core.js');
  const nav=read('app-navigation.js');
  const report=read('rak-vacation-report.js');
  assert(core.includes('function setRakSelectedCalendarKeys(keys)'));
  assert(report.includes('getRakActiveShiftCalendarContext'));
  assert(core.includes("obrabeni: '31eea99edff1771be15ba877f7c2f5b1371e0a742ad9d54fca526d41eafa5995@group.calendar.google.com'"));
  const applyStart=nav.indexOf('function rakCalendarApplyLegendVisibility');
  const applyEnd=nav.indexOf('function rakShiftCalendarEmbedUrl',applyStart);
  const apply=nav.slice(applyStart,applyEnd);
  assert(!/localStorage|saveActiveAccountCalendarSelection|setRakSelectedCalendarKeys/.test(apply));
});
