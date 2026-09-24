import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
import {runNamedDeclarations} from './runtime-vm-fixture.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.94 uses one unified release identity',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.94');
  assert.equal(metadata.displayVersion,'1.7.94');
  assert.equal(metadata.technicalVersion,'1.7.94');
  assert.equal(metadata.moduleCacheVersion,'1.7.94');
  assert.equal(metadata.cacheVersion,'v1.7.94');
  assert.equal(metadata.buildId,'v1.7.94-calendar-mobile-readability1');
  assert.equal(JSON.parse(read('package.json')).version,'1.7.94');
  assert(read('index.html').includes('app.js?v=1.7.94'));
  const sw=read('sw.js');
  assert(sw.includes("importScripts('./rak-release-metadata.js?sw=1.7.94');"));
  assert(sw.includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.94';"));
});

test('month grid uses five rows when possible and six only when necessary',()=>{
  const nav=read('app-navigation.js');
  const {api}=runNamedDeclarations({
    modules:[{source:nav,names:['rakNativeCalendarAddDays','rakNativeCalendarMonthRange']}],
    globals:{},
    exports:{range:'rakNativeCalendarMonthRange'}
  });
  assert.equal(api.range(2026,9).cellCount,35);
  assert.equal(api.range(2026,7).cellCount,42);
  assert.equal(api.range(2027,1).cellCount,35);
  assert(nav.includes('for (let i = 0; i < range.cellCount; i += 1)'));
  assert(!nav.includes('for (let i = 0; i < 42; i += 1)'));
});

test('calendar controls are isolated from global glass styling and mobile text stays readable',()=>{
  const css=read('styles-modal.css');
  assert(css.includes('.calendarNative button{'));
  assert(css.includes('background-image:none !important;'));
  assert(css.includes('background:#fff !important;'));
  assert(css.includes('color:#202832 !important;'));
  assert(css.includes('.calendarNativeDay.isToday .calendarNativeDayNumber{background:#3478f6;'));
  assert(css.includes('.calendarNativeChip{font-size:9px;padding:2px 3px;}'));
  assert(css.includes('.calendarNativeWeekdays{font-size:11px;}'));
  assert(!css.includes('.calendarNativeChip{font-size:7px'));
});

test('1.7.93 popup detail and 1.7.92 time-range behavior remain intact',()=>{
  const nav=read('app-navigation.js');
  assert(nav.includes('data-calendar-detail-backdrop'));
  assert(nav.includes('data-calendar-detail-close'));
  assert(nav.includes('rakNativeCalendarAgendaTime(event)'));
  assert(nav.includes("if (start && end) return start + '–' + end;"));
});

test('mandatory CI and npm check execute the 1.7.94 gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(workflow.includes('node --test tools/release-gate-17094.test.mjs'));
  assert(pkg.scripts.check.includes('tools/release-gate-17094.test.mjs'));
  assert(workflow.includes('rak-17094-isolated-build-'+'$'+'{{ github.sha }}'));
});
