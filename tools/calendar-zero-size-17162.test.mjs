import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('zero-source local calendar always fills the same frame wrapper as Google iframe',()=>{
  const nav=read('app-navigation.js');
  const applyStart=nav.indexOf('function rakCalendarApplyLegendVisibility');
  const applyEnd=nav.indexOf('function rakShiftCalendarEmbedUrl',applyStart);
  const apply=nav.slice(applyStart,applyEnd);
  for(const marker of [
    "empty.style.width = '100%'",
    "empty.style.height = '100%'",
    "empty.style.minHeight = '0'",
    "empty.style.flex = '1 1 auto'",
    "empty.style.boxSizing = 'border-box'"
  ]) assert(apply.includes(marker),marker);
  assert(nav.includes('style="display:flex;width:100%;height:100%;min-height:0;flex:1 1 auto;box-sizing:border-box"'));
  assert(nav.includes('style="display:none;width:100%;height:100%;min-height:0;flex:1 1 auto;box-sizing:border-box"'));
});

test('blank month root stretches in both axes without changing calendar behavior',()=>{
  const nav=read('app-navigation.js');
  const start=nav.indexOf('function rakRenderBlankCalendar');
  const end=nav.indexOf('function rakEnsureBlankCalendar',start);
  const fn=nav.slice(start,end);
  assert(fn.includes('width:100%;height:100%;min-height:0;display:flex;flex-direction:column'));
  assert(fn.includes('box-sizing:border-box'));
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
