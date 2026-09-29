import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('bottom navigation closes an open Google Calendar modal before changing route',()=>{
  const source=read('app-bottom-nav.js');
  assert(source.includes('function rakDismissTransientSurfacesForBottomNav()'));
  assert(source.includes("if (typeof hideCalendarModal === 'function') hideCalendarModal();"));
  const bindStart=source.indexOf("nav.addEventListener('click'");
  const bindEnd=source.indexOf("}, { passive: false });",bindStart);
  assert(bindStart>=0 && bindEnd>bindStart);
  const handler=source.slice(bindStart,bindEnd);
  assert(handler.indexOf('rakDismissTransientSurfacesForBottomNav();') < handler.indexOf('handler();'));
});

test('calendar remains the original Google iframe after navigation-dismiss fix',()=>{
  const nav=read('app-navigation.js');
  const start=nav.indexOf('function renderCalendarModalContent');
  const end=nav.indexOf('function ensureCalendarModal',start);
  const renderer=nav.slice(start,end);
  assert(renderer.includes("const signature = 'google|' + calendarUrl;"));
  assert(renderer.includes('<iframe'));
  assert(!renderer.includes('calendarNativeHost'));
});
