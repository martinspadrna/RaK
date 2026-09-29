import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('zero active legend sources keep a calendar surface without loading a source-less Google iframe',()=>{
  const nav=read('app-navigation.js');
  const start=nav.indexOf('function rakCalendarApplyLegendVisibility');
  const end=nav.indexOf('function rakShiftCalendarEmbedUrl',start);
  const fn=nav.slice(start,end);
  assert(fn.includes("frame.removeAttribute('src')"));
  assert(fn.includes("frame.hidden = true"));
  assert(fn.includes("empty.hidden = false"));
  assert(fn.includes('rakEnsureBlankCalendar(empty)'));
  assert(!nav.includes('function rakShiftCalendarBlankEmbedUrl'));
});

test('real Google calendar embed still appends only selected source ids',()=>{
  const nav=read('app-navigation.js');
  assert(nav.includes("embed.searchParams.append('src', source)"));
  const start=nav.indexOf('function rakCalendarApplyLegendVisibility');
  const end=nav.indexOf('function rakShiftCalendarEmbedUrl',start);
  const fn=nav.slice(start,end);
  assert(!fn.includes('setRakSelectedCalendarKeys'));
  assert(!fn.includes('saveActiveAccountCalendarSelection'));
});

test('protected Obrábění D vacation source is untouched',()=>{
  const core=read('core.js');
  assert(core.includes("obrabeni: '31eea99edff1771be15ba877f7c2f5b1371e0a742ad9d54fca526d41eafa5995@group.calendar.google.com'"));
});
