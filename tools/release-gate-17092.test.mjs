import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
import {runNamedDeclarations} from './runtime-vm-fixture.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.92 uses one unified release identity',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.92');
  assert.equal(metadata.displayVersion,'1.7.92');
  assert.equal(metadata.technicalVersion,'1.7.92');
  assert.equal(metadata.moduleCacheVersion,'1.7.92');
  assert.equal(metadata.cacheVersion,'v1.7.92');
  assert.equal(metadata.buildId,'v1.7.92-calendar-time-range1');
  assert.equal(JSON.parse(read('package.json')).version,'1.7.92');
  assert(read('index.html').includes('app.js?v=1.7.92'));
  const sw=read('sw.js');
  assert(sw.includes("importScripts('./rak-release-metadata.js?sw=1.7.92');"));
  assert(sw.includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.92';"));
});

test('calendar agenda formats start and end time while preserving all-day labels',()=>{
  const nav=read('app-navigation.js');
  const {api}=runNamedDeclarations({
    modules:[{source:nav,names:['rakNativeCalendarAgendaTime']}],
    globals:{},
    exports:{time:'rakNativeCalendarAgendaTime'}
  });
  assert.equal(api.time({time:'06:00',endTime:'18:00'}),'06:00–18:00');
  assert.equal(api.time({time:'18:00',endTime:'06:00'}),'18:00–06:00');
  assert.equal(api.time({time:'22:00',endTime:'06:00'}),'22:00–06:00');
  assert.equal(api.time({allDay:true,time:'00:00',endTime:'00:00'}),'celý den');
  assert.equal(api.time({time:'06:00',endTime:''}),'06:00');
});

test('expanded calendar occurrences retain DTEND time and the daily agenda uses the range helper',()=>{
  const nav=read('app-navigation.js');
  assert(nav.includes("endTime: event.end && event.end.time || ''"));
  const start=nav.indexOf('function rakNativeCalendarRender(content)');
  const end=nav.indexOf('async function rakNativeCalendarLoad',start);
  const renderer=nav.slice(start,end);
  assert(renderer.includes('escapeHtml(rakNativeCalendarAgendaTime(event))'));
  assert(renderer.includes("(event.time ? event.time + ' ' : '') + rakNativeCalendarDisplaySummary(event)"));
});

test('mandatory CI and npm check execute the 1.7.92 gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(workflow.includes('node --test tools/release-gate-17092.test.mjs'));
  assert(pkg.scripts.check.includes('tools/release-gate-17092.test.mjs'));
  assert(workflow.includes('rak-17092-isolated-build-'+'$'+'{{ github.sha }}'));
});
