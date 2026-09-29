import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('zero active legend sources show an empty Google calendar instead of an empty panel',()=>{
  const nav=read('app-navigation.js');
  const start=nav.indexOf('function rakCalendarApplyLegendVisibility');
  const end=nav.indexOf('function rakShiftCalendarEmbedUrl',start);
  const fn=nav.slice(start,end);
  assert(fn.includes('const blankUrl = rakShiftCalendarBlankEmbedUrl();'));
  assert(fn.includes("frame.setAttribute('src', blankUrl)"));
  assert(fn.includes("frame.hidden = false;"));
  assert(fn.includes("frame.style.display = 'block';"));
  assert(fn.includes("empty.hidden = true;"));
  assert(fn.includes("empty.style.display = 'none';"));
});

test('blank Google calendar URL contains presentation settings but no source calendar',()=>{
  const nav=read('app-navigation.js');
  const start=nav.indexOf('function rakShiftCalendarBlankEmbedUrl');
  const end=nav.indexOf('function rakShiftCalendarEmbedUrl',start);
  assert(start>=0 && end>start);
  const helper=nav.slice(start,end);
  assert(helper.includes('rakShiftCalendarBaseEmbedUrl().toString()'));
  const baseStart=nav.indexOf('function rakShiftCalendarBaseEmbedUrl');
  const baseEnd=nav.indexOf('function rakShiftCalendarBlankEmbedUrl',baseStart);
  const base=nav.slice(baseStart,baseEnd);
  assert(base.includes("new URL('https://calendar.google.com/calendar/embed')"));
  assert(base.includes("embed.searchParams.set('ctz', 'Europe/Prague')"));
  assert(!base.includes("append('src'"));
});

test('real calendar embed still appends only selected source ids and blank state does not persist account selection',()=>{
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
