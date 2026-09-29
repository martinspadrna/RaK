import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.151 dashboard always renders original Google Calendar iframe for selected calendars',()=>{
  const nav=read('app-navigation.js');
  const start=nav.indexOf('function renderCalendarModalContent');
  const end=nav.indexOf('function ensureCalendarModal',start);
  assert(start>=0 && end>start);
  const renderer=nav.slice(start,end);
  assert(renderer.includes("const signature = 'google|' + calendarUrl;"));
  assert(renderer.includes('calendarModalFrame'));
  assert(renderer.includes('<iframe'));
  assert(renderer.includes('loading="eager"'));
  assert(!renderer.includes('containsPrivateKalirna'));
  assert(!renderer.includes('calendarNativeHost'));
  assert(!renderer.includes('rakNativeCalendarLoad'));
});

test('1.7.151 multi-selection builds one Google embed URL with every selected source',()=>{
  const nav=read('app-navigation.js');
  const start=nav.indexOf('function rakShiftCalendarEmbedUrl');
  const end=nav.indexOf('function renderCalendarModalContent',start);
  const builder=nav.slice(start,end);
  assert(builder.includes("embed.searchParams.append('src', source)"));
  assert(builder.includes("embed.searchParams.set('ctz', 'Europe/Prague')"));
  assert(builder.includes("embed.searchParams.set('showTitle', '0')"));
  assert(builder.includes("embed.searchParams.set('showCalendars', '0')"));
});

test('private Google ICS tokens remain server-only even though display uses calendar IDs',()=>{
  const checked=[read('core.js'),read('app-navigation.js'),read('api/public-calendar.js')].join('\n');
  assert(!/private-[0-9a-f]{16,}/i.test(checked));
  assert(read('core.js').includes('RAK_SHIFT_CALENDAR_SOURCE_IDS'));
});
