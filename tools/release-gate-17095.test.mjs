import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
import {runNamedDeclarations} from './runtime-vm-fixture.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.95 uses one unified release identity',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.95');
  assert.equal(metadata.displayVersion,'1.7.95');
  assert.equal(metadata.technicalVersion,'1.7.95');
  assert.equal(metadata.moduleCacheVersion,'1.7.95');
  assert.equal(metadata.cacheVersion,'v1.7.95');
  assert.equal(metadata.buildId,'v1.7.95-google-shift-iframe1');
  assert.equal(JSON.parse(read('package.json')).version,'1.7.95');
  assert(read('index.html').includes('app.js?v=1.7.95'));
  const sw=read('sw.js');
  assert(sw.includes("importScripts('./rak-release-metadata.js?sw=1.7.95');"));
  assert(sw.includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.95';"));
});

test('shift calendars combine into one Google embed with main-style controls',()=>{
  const nav=read('app-navigation.js');
  const {api}=runNamedDeclarations({
    modules:[{source:nav,names:['rakShiftCalendarEmbedUrl']}],
    globals:{URL,Set,normalizeRakGoogleCalendarUrl:(value)=>String(value||'')},
    exports:{embed:'rakShiftCalendarEmbedUrl'}
  });
  const a='a@group.calendar.google.com';
  const b='b@group.calendar.google.com';
  const url=new URL(api.embed([
    {url:'https://calendar.google.com/calendar/embed?src='+encodeURIComponent(a)},
    {url:'https://calendar.google.com/calendar/embed?src='+encodeURIComponent(b)}
  ]));
  assert.equal(url.hostname,'calendar.google.com');
  assert.equal(url.pathname,'/calendar/embed');
  assert.deepEqual(url.searchParams.getAll('src'),[a,b]);
  assert.equal(url.searchParams.get('ctz'),'Europe/Prague');
  assert.equal(url.searchParams.get('wkst'),'2');
  assert.equal(url.searchParams.get('showTitle'),'0');
  assert.equal(url.searchParams.get('showCalendars'),'0');
});

test('calendar modal uses and reuses the real Google iframe instead of waiting for ICS',()=>{
  const nav=read('app-navigation.js');
  const start=nav.indexOf('function renderCalendarModalContent');
  const end=nav.indexOf('function ensureCalendarModal',start);
  const renderer=nav.slice(start,end);
  assert(renderer.includes('calendarModalFrame'));
  assert(renderer.includes('<iframe'));
  assert(renderer.includes('loading="eager"'));
  assert(renderer.includes("content.dataset.calendarSignature === signature && existingFrame"));
  assert(!renderer.includes('rakNativeCalendarLoad(content, 0)'));
});

test('calendar iframe is prewarmed in idle time and keeps account-shift routing',()=>{
  const nav=read('app-navigation.js');
  const core=read('core.js');
  assert(nav.includes('window.requestIdleCallback(prewarm, { timeout: 1200 })'));
  assert(nav.includes('ensureCalendarModal()'));
  assert(core.includes('function getRakActiveShiftCalendarContext()'));
  assert(core.includes('calendars: getRakShiftCalendarsForTeam(team)'));
});

test('mandatory CI and npm check execute the 1.7.95 gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(workflow.includes('node --test tools/release-gate-17095.test.mjs'));
  assert(pkg.scripts.check.includes('tools/release-gate-17095.test.mjs'));
  assert(workflow.includes('rak-17095-isolated-build-'+'$'+'{{ github.sha }}'));
});
