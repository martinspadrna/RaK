import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
import {runNamedDeclarations} from './runtime-vm-fixture.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.88 calendar-admin milestone remains active in verified successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.88');
  assert.equal(metadata.technicalVersion,metadata.displayVersion);
  assert.equal(metadata.moduleCacheVersion,metadata.displayVersion);
  assert.equal(metadata.cacheVersion,'v'+metadata.displayVersion);
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
  assert(read('index.html').includes('app.js?v='+metadata.displayVersion));
  const sw=read('sw.js');
  assert(sw.includes("importScripts('./rak-release-metadata.js?sw="+metadata.displayVersion+"');"));
  assert(sw.includes("const SW_RELEASE_CACHE_MARKER = 'v"+metadata.displayVersion+"';"));
});

test('calendar page is a permitted authenticated admin interaction context',()=>{
  const menu=read('app-menu.js');
  const {api}=runNamedDeclarations({
    modules:[{source:menu,names:['appMenuAdminModeSet']}],
    globals:{},
    exports:{modes:'appMenuAdminModeSet'}
  });
  const modes=api.modes();
  assert.equal(modes.has('calendars'),true);
  assert.equal(modes.has('external-links'),true);
});

test('calendar add and remove handlers stay inside the calendar editor',()=>{
  const menu=read('app-menu.js');
  assert(menu.includes("if (adminAction === 'add-shift-calendar')"));
  assert(menu.includes("row.insertAdjacentHTML('afterend', html)"));
  assert(menu.includes("if (adminAction === 'remove-shift-calendar')"));
  assert(menu.includes("if (rowCount <= 1)"));
  assert(menu.includes("input.value = ''"));
  assert(menu.includes("if (adminAction === 'save-calendars')"));
  assert(menu.includes("renderAdminMenuBody(body, 'calendars')"));
});

test('calendar row renders compact side-by-side remove and add controls with spaced teams',()=>{
  const core=read('core.js');
  const css=read('styles-admin-polish.css');
  assert(core.includes('adminShiftCalendarRowActions'));
  assert(core.includes('adminShiftCalendarRemove'));
  assert(core.includes('adminShiftCalendarAdd'));
  assert(core.includes('+ Přidat kalendář'));
  assert(css.includes('.adminShiftCalendarTeam + .adminShiftCalendarTeam'));
  assert(css.includes('grid-template-columns:54px minmax(0,1fr)'));
});

test('public ICS normalization from 1.7.87 remains intact',()=>{
  const core=read('core.js');
  const {api}=runNamedDeclarations({
    modules:[{source:core,names:['normalizeRakGoogleCalendarUrl']}],
    globals:{window:{},URL},
    exports:{normalize:'normalizeRakGoogleCalendarUrl'}
  });
  const id='849eb5bcbcfdba0ce4171f4a530c530e6fe096c4f9848bede490cd4e129c7b02@group.calendar.google.com';
  const input='https://calendar.google.com/calendar/ical/'+encodeURIComponent(id)+'/public/basic.ics';
  assert.equal(api.normalize(input),'https://calendar.google.com/calendar/embed?src='+encodeURIComponent(id));
});

test('npm check retains 1.7.88 while CI runs the current release gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(pkg.scripts.check.includes('tools/release-gate-17088.test.mjs'));
  assert(/node --test tools\/release-gate-1708\d\.test\.mjs/.test(workflow));
});
