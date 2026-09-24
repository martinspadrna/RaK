import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
import {runNamedDeclarations} from './runtime-vm-fixture.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.87 uses one unified release identity',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.87');
  assert.equal(metadata.displayVersion,'1.7.87');
  assert.equal(metadata.technicalVersion,'1.7.87');
  assert.equal(metadata.moduleCacheVersion,'1.7.87');
  assert.equal(metadata.cacheVersion,'v1.7.87');
  assert.equal(metadata.buildId,'v1.7.87-public-ics1');
  assert.equal(JSON.parse(read('package.json')).version,'1.7.87');
  assert(read('index.html').includes('app.js?v=1.7.87'));
  const sw=read('sw.js');
  assert(sw.includes("importScripts('./rak-release-metadata.js?sw=1.7.87');"));
  assert(sw.includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.87';"));
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

test('mandatory CI and npm check execute the 1.7.87 gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(workflow.includes('node --test tools/release-gate-17087.test.mjs'));
  assert(pkg.scripts.check.includes('tools/release-gate-17087.test.mjs'));
  assert(workflow.includes("rak-17087-isolated-build-${{ github.sha }}"));
});
