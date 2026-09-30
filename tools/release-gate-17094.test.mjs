import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
import {runNamedDeclarations} from './runtime-vm-fixture.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.94 mobile-readability milestone remains active in verified successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.94');
  assert.equal(metadata.technicalVersion,metadata.displayVersion);
  assert.equal(metadata.moduleCacheVersion,metadata.displayVersion);
  assert.equal(metadata.cacheVersion,'v'+metadata.displayVersion);
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
  assert(read('index.html').includes('app.js?v='+metadata.displayVersion));
  const sw=read('sw.js');
  assert(sw.includes("importScripts('./rak-release-metadata.js?sw="+metadata.displayVersion+"');"));
  assert(sw.includes("const SW_RELEASE_CACHE_MARKER = 'v"+metadata.displayVersion+"';"));
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

test('npm check retains 1.7.94 while CI runs the current release gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(pkg.scripts.check.includes('tools/release-gate-17094.test.mjs'));
  assert(/node --test tools\/release-gate-1709\d\.test\.mjs/.test(workflow));
});
