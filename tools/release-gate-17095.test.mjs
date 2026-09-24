import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
import {runNamedDeclarations} from './runtime-vm-fixture.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.95 Google shift iframe milestone remains active in verified successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.95');
  assert.equal(metadata.technicalVersion,metadata.displayVersion);
  assert.equal(metadata.moduleCacheVersion,metadata.displayVersion);
  assert.equal(metadata.cacheVersion,'v'+metadata.displayVersion);
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
  assert(read('index.html').includes('app.js?v='+metadata.displayVersion));
  const sw=read('sw.js');
  assert(sw.includes("importScripts('./rak-release-metadata.js?sw="+metadata.displayVersion+"');"));
  assert(sw.includes("const SW_RELEASE_CACHE_MARKER = 'v"+metadata.displayVersion+"';"));
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

test('npm check retains 1.7.95 while CI runs the current release gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(pkg.scripts.check.includes('tools/release-gate-17095.test.mjs'));
  assert(/node --test tools\/release-gate-1709\d\.test\.mjs/.test(workflow));
});
