import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
import {runNamedDeclarations} from './runtime-vm-fixture.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const require=createRequire(import.meta.url);

function mockResponse(){
  return {
    headers:{},
    statusCode:0,
    body:null,
    setHeader(name,value){this.headers[String(name).toLowerCase()]=String(value);},
    status(code){this.statusCode=Number(code);return this;},
    send(value){this.body=value;return this;},
    json(value){this.body=value;return this;}
  };
}

test('1.7.90 uses one unified release identity',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.90');
  assert.equal(metadata.displayVersion,'1.7.90');
  assert.equal(metadata.technicalVersion,'1.7.90');
  assert.equal(metadata.moduleCacheVersion,'1.7.90');
  assert.equal(metadata.cacheVersion,'v1.7.90');
  assert.equal(metadata.buildId,'v1.7.90-native-public-calendar1');
  assert.equal(JSON.parse(read('package.json')).version,'1.7.90');
  assert(read('index.html').includes('app.js?v=1.7.90'));
  const sw=read('sw.js');
  assert(sw.includes("importScripts('./rak-release-metadata.js?sw=1.7.90');"));
  assert(sw.includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.90';"));
});

test('public calendar endpoint is a bounded Google public-ICS fetcher, not an arbitrary proxy',()=>{
  const api=read('api/public-calendar.js');
  assert(api.includes("const GOOGLE_CALENDAR_HOST = 'calendar.google.com'"));
  assert(api.includes("'/public/basic.ics'"));
  assert(api.includes('MAX_ICS_BYTES = 2 * 1024 * 1024'));
  assert(api.includes("req.method !== 'GET' && req.method !== 'HEAD'"));
  assert(api.includes("invalid_calendar_source"));
  assert(!api.includes('req.query.url'));
  assert(!api.includes('/private/'));
});

test('public calendar endpoint constructs the Google URL and rejects arbitrary URLs',async()=>{
  const handler=require('../api/public-calendar.js');
  const previousFetch=global.fetch;
  let fetched='';
  let fetchCalls=0;
  global.fetch=async(url)=>{
    fetchCalls+=1;
    fetched=String(url);
    return new Response('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n',{status:200,headers:{'content-type':'text/calendar'}});
  };
  try{
    const source='849eb5bcbcfdba0ce4171f4a530c530e6fe096c4f9848bede490cd4e129c7b02@group.calendar.google.com';
    const ok=mockResponse();
    await handler({method:'GET',query:{src:source}},ok);
    assert.equal(ok.statusCode,200);
    assert.equal(fetchCalls,1);
    assert.equal(fetched,'https://calendar.google.com/calendar/ical/'+encodeURIComponent(source)+'/public/basic.ics');
    assert(String(ok.body).includes('BEGIN:VCALENDAR'));

    const bad=mockResponse();
    await handler({method:'GET',query:{src:'https://evil.example/calendar.ics'}},bad);
    assert.equal(bad.statusCode,400);
    assert.equal(fetchCalls,1);
  }finally{
    global.fetch=previousFetch;
  }
});

test('base64 Google embed source is normalized server-side to its public calendar id',()=>{
  const handler=require('../api/public-calendar.js');
  const plain='31ee99edff1771be15ba877f7c2f5b1371e0a742ad9d54fca526d41eafa5995@group.calendar.google.com';
  const encoded=Buffer.from(plain,'utf8').toString('base64');
  assert.equal(handler._test.normalizeCalendarSourceId(encoded),plain);
  assert.equal(handler._test.calendarUrl(plain),'https://calendar.google.com/calendar/ical/'+encodeURIComponent(plain)+'/public/basic.ics');
});

test('native calendar replaces the Google iframe and includes recurrence/exception handling',()=>{
  const nav=read('app-navigation.js');
  assert(nav.includes('function rakNativeCalendarLoad('));
  assert(nav.includes("fetch('/api/public-calendar?src='"));
  assert(nav.includes("rakNativeCalendarProperties(block, 'RRULE')"));
  assert(nav.includes("rakNativeCalendarProperties(block, 'RECURRENCE-ID')"));
  assert(nav.includes("rakNativeCalendarProperties(block, 'EXDATE')"));
  assert(nav.includes('data-calendar-nav'));
  assert(nav.includes('data-calendar-today'));
  assert(nav.includes('data-calendar-day'));
  const renderStart=nav.indexOf('function renderCalendarModalContent');
  const renderEnd=nav.indexOf('function ensureCalendarModal',renderStart);
  const renderer=nav.slice(renderStart,renderEnd);
  assert(renderer.includes('calendarNativeHost'));
  assert(!renderer.includes('<iframe'));
});

test('calendar source extraction supports public ICS and Google embed URLs',()=>{
  const nav=read('app-navigation.js');
  const {api}=runNamedDeclarations({
    modules:[{source:nav,names:['rakNativeCalendarSourceIds']}],
    globals:{URL,decodeURIComponent,Set,normalizeRakGoogleCalendarUrl:(value)=>String(value||'')},
    exports:{ids:'rakNativeCalendarSourceIds'}
  });
  const id='849eb5bcbcfdba0ce4171f4a530c530e6fe096c4f9848bede490cd4e129c7b02@group.calendar.google.com';
  assert.deepEqual(Array.from(api.ids('https://calendar.google.com/calendar/embed?src='+encodeURIComponent(id))),[id]);
  assert.deepEqual(Array.from(api.ids('https://calendar.google.com/calendar/ical/'+encodeURIComponent(id)+'/public/basic.ics')),[id]);
});

test('native calendar UI is mobile-safe and the new endpoint is part of complete backup',()=>{
  const css=read('styles-modal.css');
  const backup=read('rak-complete-backup.js');
  assert(css.includes('.calendarNativeGrid'));
  assert(css.includes('grid-template-columns:repeat(7,minmax(0,1fr))'));
  assert(css.includes('.calendarNativeAgenda'));
  assert(css.includes('@media(prefers-reduced-motion:reduce)'));
  assert(backup.includes('"api/public-calendar.js"'));
});

test('mandatory CI and npm check execute the 1.7.90 gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(workflow.includes('node --test tools/release-gate-17090.test.mjs'));
  assert(pkg.scripts.check.includes('node --check api/public-calendar.js'));
  assert(pkg.scripts.check.includes('tools/release-gate-17090.test.mjs'));
  assert(workflow.includes('rak-17090-isolated-build-'+'$'+'{{ github.sha }}'));
});
