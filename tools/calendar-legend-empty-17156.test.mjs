import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('disabling the final visible calendar unloads and hides the stale Google iframe',()=>{
  const nav=read('app-navigation.js');
  const start=nav.indexOf('function rakCalendarApplyLegendVisibility');
  const end=nav.indexOf('function rakShiftCalendarEmbedUrl',start);
  assert(start>=0 && end>start);
  const fn=nav.slice(start,end);
  assert(fn.includes("frame.removeAttribute('src');"));
  assert(fn.includes("frame.style.display = 'none';"));
  assert(fn.includes("empty.style.display = 'grid';"));
  assert(fn.includes('if (!visibleCalendars.length)'));
});

test('reenabling a calendar reconstructs the Google iframe and hides the empty state',()=>{
  const nav=read('app-navigation.js');
  const start=nav.indexOf('function rakCalendarApplyLegendVisibility');
  const end=nav.indexOf('function rakShiftCalendarEmbedUrl',start);
  const fn=nav.slice(start,end);
  assert(fn.includes("frame.setAttribute('src', nextUrl)"));
  assert(fn.includes("frame.style.display = 'block';"));
  assert(fn.includes("empty.style.display = 'none';"));
  assert(nav.includes('Všechny vybrané kalendáře jsou skryté.'));
});

test('zero-visible state stays temporary and never changes account calendar selection',()=>{
  const nav=read('app-navigation.js');
  const start=nav.indexOf('function rakCalendarApplyLegendVisibility');
  const end=nav.indexOf('function rakShiftCalendarEmbedUrl',start);
  const fn=nav.slice(start,end);
  assert(!fn.includes('setRakSelectedCalendarKeys'));
  assert(!fn.includes('saveActiveAccountCalendarSelection'));
  assert(!fn.includes('localStorage'));
});

test('protected D vacation calendar source remains unchanged',()=>{
  const core=read('core.js');
  assert(core.includes("obrabeni: '31eea99edff1771be15ba877f7c2f5b1371e0a742ad9d54fca526d41eafa5995@group.calendar.google.com'"));
});
