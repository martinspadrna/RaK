import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('disabling the final visible calendar never leaves the last real Google source loaded',()=>{
  const nav=read('app-navigation.js');
  const start=nav.indexOf('function rakCalendarApplyLegendVisibility');
  const end=nav.indexOf('function rakShiftCalendarEmbedUrl',start);
  assert(start>=0 && end>start);
  const fn=nav.slice(start,end);
  assert(fn.includes('if (!visibleCalendars.length)'));
  assert(fn.includes("frame.removeAttribute('src')"));
  assert(fn.includes("frame.style.display = 'none'"));
  assert(!fn.includes('visibleCalendars[visibleCalendars.length - 1]'));
});

test('reenabling a calendar reconstructs the Google iframe from the active source set',()=>{
  const nav=read('app-navigation.js');
  const start=nav.indexOf('function rakCalendarApplyLegendVisibility');
  const end=nav.indexOf('function rakShiftCalendarEmbedUrl',start);
  const fn=nav.slice(start,end);
  assert(fn.includes('rakShiftCalendarEmbedUrl(visibleCalendars)'));
  assert(fn.includes("frame.setAttribute('src', nextUrl)"));
  assert(fn.includes("frame.style.display = 'block'"));
});

test('zero-visible state does not change which calendars are selected in Settings',()=>{
  const nav=read('app-navigation.js');
  const start=nav.indexOf('function rakCalendarApplyLegendVisibility');
  const end=nav.indexOf('function rakShiftCalendarEmbedUrl',start);
  const fn=nav.slice(start,end);
  assert(!fn.includes('setRakSelectedCalendarKeys'));
  assert(!fn.includes('saveActiveAccountCalendarSelection'));
});

test('protected D vacation calendar source remains unchanged',()=>{
  const core=read('core.js');
  assert(core.includes("obrabeni: '31eea99edff1771be15ba877f7c2f5b1371e0a742ad9d54fca526d41eafa5995@group.calendar.google.com'"));
});
