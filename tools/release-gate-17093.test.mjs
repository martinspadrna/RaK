import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.93 uses one unified release identity',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.93');
  assert.equal(metadata.displayVersion,'1.7.93');
  assert.equal(metadata.technicalVersion,'1.7.93');
  assert.equal(metadata.moduleCacheVersion,'1.7.93');
  assert.equal(metadata.cacheVersion,'v1.7.93');
  assert.equal(metadata.buildId,'v1.7.93-light-calendar-popup1');
  assert.equal(JSON.parse(read('package.json')).version,'1.7.93');
  assert(read('index.html').includes('app.js?v=1.7.93'));
  const sw=read('sw.js');
  assert(sw.includes("importScripts('./rak-release-metadata.js?sw=1.7.93');"));
  assert(sw.includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.93';"));
});

test('native calendar uses a light surface while retaining compact month cells',()=>{
  const css=read('styles-modal.css');
  assert(css.includes('.calendarNative{position:relative;'));
  assert(css.includes('background:#f5f7fa;'));
  assert(css.includes('.calendarNativeDay{position:relative;'));
  assert(css.includes('background:#fff;'));
  assert(css.includes('.calendarNativeChip{display:block;'));
  assert(css.includes('background:#e7f0ff;'));
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

test('mandatory CI and npm check execute the 1.7.93 gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(workflow.includes('node --test tools/release-gate-17093.test.mjs'));
  assert(pkg.scripts.check.includes('tools/release-gate-17093.test.mjs'));
  assert(workflow.includes('rak-17093-isolated-build-'+'$'+'{{ github.sha }}'));
});
