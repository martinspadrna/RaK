import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
import {runNamedDeclarations} from './runtime-vm-fixture.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.91 calendar-label milestone remains active in verified successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.91');
  assert.equal(metadata.technicalVersion,metadata.displayVersion);
  assert.equal(metadata.moduleCacheVersion,metadata.displayVersion);
  assert.equal(metadata.cacheVersion,'v'+metadata.displayVersion);
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
  assert(read('index.html').includes('app.js?v='+metadata.displayVersion));
  const sw=read('sw.js');
  assert(sw.includes("importScripts('./rak-release-metadata.js?sw="+metadata.displayVersion+"');"));
  assert(sw.includes("const SW_RELEASE_CACHE_MARKER = 'v"+metadata.displayVersion+"';"));
});
test('busy shift events get Czech day/night labels from start time without rewriting named events',()=>{
  const nav=read('app-navigation.js');
  const {api}=runNamedDeclarations({
    modules:[{source:nav,names:['rakNativeCalendarDisplaySummary']}],
    globals:{},
    exports:{label:'rakNativeCalendarDisplaySummary'}
  });
  assert.equal(api.label({summary:'Busy',time:'06:00'}),'Ranní');
  assert.equal(api.label({summary:'Busy',time:'18:00'}),'Noční');
  assert.equal(api.label({summary:'Busy',time:'22:00'}),'Noční');
  assert.equal(api.label({summary:'Zaneprázdněn',time:'06:00'}),'Ranní');
  assert.equal(api.label({summary:'Ranní 12h',time:'06:00'}),'Ranní 12h');
  assert.equal(api.label({summary:'Noční 12h',time:'18:00'}),'Noční 12h');
  assert.equal(api.label({summary:'Porada',time:'06:00'}),'Porada');
});

test('native calendar uses the normalized shift label in month chips and daily agenda',()=>{
  const nav=read('app-navigation.js');
  const start=nav.indexOf('function rakNativeCalendarRender(content)');
  const end=nav.indexOf('async function rakNativeCalendarLoad',start);
  const renderer=nav.slice(start,end);
  assert(renderer.includes('rakNativeCalendarDisplaySummary(event)'));
  assert.equal((renderer.match(/rakNativeCalendarDisplaySummary\(event\)/g)||[]).length,2);
});

test('npm check retains 1.7.91 while CI runs the current release gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(pkg.scripts.check.includes('tools/release-gate-17091.test.mjs'));
  assert(/node --test tools\/release-gate-1709\d\.test\.mjs/.test(workflow));
});
