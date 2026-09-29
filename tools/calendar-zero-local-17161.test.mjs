import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('zero active calendars use an in-app blank month grid and never a source-less Google embed',()=>{
  const nav=read('app-navigation.js');
  assert(nav.includes('function rakRenderBlankCalendar(container, year, month)'));
  assert(nav.includes("frame.removeAttribute('src')"));
  assert(nav.includes('rakEnsureBlankCalendar(empty)'));
  assert(!nav.includes('function rakShiftCalendarBlankEmbedUrl'));
  assert(!nav.includes("calendar.google.com/calendar/embed');\n  embed.searchParams.set('height', '900');\n  embed.searchParams.set('wkst', '2');\n  embed.searchParams.set('ctz', 'Europe/Prague');\n  embed.searchParams.set('showPrint', '0');\n  embed.searchParams.set('showTitle', '0');\n  embed.searchParams.set('showTabs', '0');\n  embed.searchParams.set('showCalendars', '0');\n  embed.searchParams.set('showTz', '0');\n  return embed.toString();"));
});

test('blank month has Google-like month navigation, weekdays and 42 day cells without events',()=>{
  const nav=read('app-navigation.js');
  const start=nav.indexOf('function rakRenderBlankCalendar');
  const end=nav.indexOf('function rakEnsureBlankCalendar',start);
  const fn=nav.slice(start,end);
  assert(fn.includes("const weekdays = ['PO','ÚT','ST','ČT','PÁ','SO','NE']"));
  assert(fn.includes('for (let i = 0; i < 42; i += 1)'));
  assert(fn.includes('data-calendar-blank-nav'));
  assert(!fn.includes('calendar.google.com'));
});

test('turning a source back on restores the real Google iframe',()=>{
  const nav=read('app-navigation.js');
  const start=nav.indexOf('function rakCalendarApplyLegendVisibility');
  const end=nav.indexOf('function rakShiftCalendarEmbedUrl',start);
  const fn=nav.slice(start,end);
  assert(fn.includes('rakShiftCalendarEmbedUrl(visibleCalendars)'));
  assert(fn.includes("frame.setAttribute('src', nextUrl)"));
  assert(fn.includes("empty.style.display = 'none'"));
});

test('account legend persistence and protected D vacation calendar remain intact',()=>{
  const core=read('core.js');
  const bridge=read('supabase-bridge.js');
  assert(core.includes('queueRakAccountCalendarHiddenSync(nextHidden)'));
  assert(bridge.includes("rpc('rak_save_account_ui_preferences_v3'"));
  assert(core.includes("obrabeni: '31eea99edff1771be15ba877f7c2f5b1371e0a742ad9d54fca526d41eafa5995@group.calendar.google.com'"));
});
