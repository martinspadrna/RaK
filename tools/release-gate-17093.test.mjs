import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.93 light-calendar popup milestone remains active in verified successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.93');
  assert.equal(metadata.technicalVersion,metadata.displayVersion);
  assert.equal(metadata.moduleCacheVersion,metadata.displayVersion);
  assert.equal(metadata.cacheVersion,'v'+metadata.displayVersion);
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
  assert(read('index.html').includes('app.js?v='+metadata.displayVersion));
  const sw=read('sw.js');
  assert(sw.includes("importScripts('./rak-release-metadata.js?sw="+metadata.displayVersion+"');"));
  assert(sw.includes("const SW_RELEASE_CACHE_MARKER = 'v"+metadata.displayVersion+"';"));
});
test('native calendar uses a light surface while retaining compact month cells',()=>{
  const css=read('styles-modal.css');
  assert(css.includes('.calendarNative{position:relative;'));
  assert(css.includes('background:#f5f7fa;'));
  assert(css.includes('.calendarNativeDay{position:relative;'));
  assert(css.includes('background:#fff;'));
  assert(css.includes('.calendarNativeChip{display:block;'));
  assert(/\.calendarNativeChip\{display:block;[\s\S]*?background:#(?:e7f0ff|edf4ff);/.test(css));
  assert(css.includes('.calendarNativeDetail{position:relative;'));
  assert(css.includes('box-shadow:0 24px 60px rgba(0,0,0,.28);'));
});

test('date click opens an in-app detail popup with full time range and close affordances',()=>{
  const nav=read('app-navigation.js');
  assert(nav.includes("content.__rakCalendarState.detailKey = key"));
  assert(nav.includes('data-calendar-detail-backdrop'));
  assert(nav.includes('data-calendar-detail-close'));
  assert(nav.includes('rakNativeCalendarDetailDateLabel(state.detailKey)'));
  assert(nav.includes('rakNativeCalendarAgendaTime(event)'));
  assert(nav.includes("content.__rakCalendarState.detailKey = ''"));
  assert(nav.includes("if (state.detailKey && !detailEvents.length) state.detailKey = ''"));
  assert(!nav.includes('<div class="calendarNativeAgenda"><div class="calendarNativeAgendaTitle">'));
});

test('npm check retains 1.7.93 while CI runs the current release gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(pkg.scripts.check.includes('tools/release-gate-17093.test.mjs'));
  assert(/node --test tools\/release-gate-1709\d\.test\.mjs/.test(workflow));
});
