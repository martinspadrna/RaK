import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('zero-source local calendar reuses the exact Google frame sizing class',()=>{
  const nav=read('app-navigation.js');
  const css=read('styles-modal.css');
  assert(nav.includes('class="calendarSourceEmpty calendarModalFrame"'));
  assert(css.includes('.calendarModalFrame{width:100%;'));
  assert(css.includes('height:100%;'));
  const applyStart=nav.indexOf('function rakCalendarApplyLegendVisibility');
  const applyEnd=nav.indexOf('function rakShiftCalendarEmbedUrl',applyStart);
  const apply=nav.slice(applyStart,applyEnd);
  assert(apply.includes("empty.style.display = 'flex'"));
  assert(apply.includes('rakEnsureBlankCalendar(empty)'));
  assert(!apply.includes('empty.style.width'));
  assert(!apply.includes('empty.style.height'));
});

test('blank month remains local, full-height and event-free',()=>{
  const nav=read('app-navigation.js');
  const start=nav.indexOf('function rakRenderBlankCalendar');
  const end=nav.indexOf('function rakEnsureBlankCalendar',start);
  const fn=nav.slice(start,end);
  assert(fn.includes('width:100%;height:100%;min-width:0;min-height:0;flex:1 1 auto;display:flex;flex-direction:column;box-sizing:border-box'));
  assert(fn.includes("const weekdays = ['PO','ÚT','ST','ČT','PÁ','SO','NE']"));
  assert(!fn.includes('calendar.google.com'));
});

test('Google restore, account hidden keys and protected Obrabeni D stay intact',()=>{
  const nav=read('app-navigation.js');
  const core=read('core.js');
  const bridge=read('supabase-bridge.js');
  assert(nav.includes('rakShiftCalendarEmbedUrl(visibleCalendars)'));
  assert(nav.includes("frame.setAttribute('src', nextUrl)"));
  assert(core.includes('queueRakAccountCalendarHiddenSync(nextHidden)'));
  assert(bridge.includes("rpc('rak_save_account_ui_preferences_v3'"));
  assert(core.includes("obrabeni: '31eea99edff1771be15ba877f7c2f5b1371e0a742ad9d54fca526d41eafa5995@group.calendar.google.com'"));
});
