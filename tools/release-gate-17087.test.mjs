import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
import {runNamedDeclarations} from './runtime-vm-fixture.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.87 public-ICS milestone remains active in verified successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.87');
  assert.equal(metadata.technicalVersion,metadata.displayVersion);
  assert.equal(metadata.moduleCacheVersion,metadata.displayVersion);
  assert.equal(metadata.cacheVersion,'v'+metadata.displayVersion);
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
  assert(read('index.html').includes('app.js?v='+metadata.displayVersion));
  const sw=read('sw.js');
  assert(sw.includes("importScripts('./rak-release-metadata.js?sw="+metadata.displayVersion+"');"));
  assert(sw.includes("const SW_RELEASE_CACHE_MARKER = 'v"+metadata.displayVersion+"';"));
});
test('public Google Calendar ICS is accepted and normalized to embed',()=>{
  const core=read('core.js');
  const {api}=runNamedDeclarations({
    modules:[{source:core,names:['normalizeRakGoogleCalendarUrl','isRakAllowedGoogleCalendarUrl']}],
    globals:{window:{},URL},
    exports:{normalize:'normalizeRakGoogleCalendarUrl',valid:'isRakAllowedGoogleCalendarUrl'}
  });
  const calendarId='849eb5bcbcfdba0ce4171f4a530c530e6fe096c4f9848bede490cd4e129c7b02@group.calendar.google.com';
  const publicIcs='https://calendar.google.com/calendar/ical/'+encodeURIComponent(calendarId)+'/public/basic.ics';
  assert.equal(api.valid(publicIcs),true);
  const normalized=api.normalize(publicIcs);
  assert.equal(normalized,'https://calendar.google.com/calendar/embed?src='+encodeURIComponent(calendarId));
  assert.equal(api.valid(normalized),true);
});

test('private Google Calendar ICS remains blocked',()=>{
  const core=read('core.js');
  const {api}=runNamedDeclarations({
    modules:[{source:core,names:['normalizeRakGoogleCalendarUrl','isRakAllowedGoogleCalendarUrl']}],
    globals:{window:{},URL},
    exports:{normalize:'normalizeRakGoogleCalendarUrl',valid:'isRakAllowedGoogleCalendarUrl'}
  });
  const privateIcs='https://calendar.google.com/calendar/ical/test%40group.calendar.google.com/private-secret/basic.ics';
  assert.equal(api.valid(privateIcs),false);
  assert.equal(api.normalize(privateIcs),'');
  assert.equal(api.valid('https://evil.example/calendar/ical/test/public/basic.ics'),false);
});

test('calendar form stores normalized URLs and explains public ICS support',()=>{
  const core=read('core.js');
  const renderer=read('app-menu-admin-renderer.js');
  assert(core.includes('const normalizedUrl = normalizeRakGoogleCalendarUrl(url);'));
  assert(core.includes("url: normalizedUrl"));
  assert(core.includes('Google embed nebo public/basic.ics'));
  assert(renderer.includes('veřejné public/basic.ics adresy'));
  assert(renderer.includes('automaticky převede na embed'));
});

test('npm check retains the 1.7.87 milestone while CI runs the current release gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(pkg.scripts.check.includes('tools/release-gate-17087.test.mjs'));
  assert(/node --test tools\/release-gate-1708\d\.test\.mjs/.test(workflow));
});
