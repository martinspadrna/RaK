import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
import {runNamedDeclarations} from './runtime-vm-fixture.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.88 uses one unified release identity',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.88');
  assert.equal(metadata.displayVersion,'1.7.88');
  assert.equal(metadata.technicalVersion,'1.7.88');
  assert.equal(metadata.moduleCacheVersion,'1.7.88');
  assert.equal(metadata.cacheVersion,'v1.7.88');
  assert.equal(metadata.buildId,'v1.7.88-calendar-admin-ui1');
  assert.equal(JSON.parse(read('package.json')).version,'1.7.88');
  assert(read('index.html').includes('app.js?v=1.7.88'));
  const sw=read('sw.js');
  assert(sw.includes("importScripts('./rak-release-metadata.js?sw=1.7.88');"));
  assert(sw.includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.88';"));
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
  assert(!core.includes("data-shift-calendar-rows>' + rows + '</div>',\n      '  <button type=\"button\" class=\"appMenuAction\" data-admin-action=\"add-shift-calendar\""));
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

test('mandatory CI and npm check execute the 1.7.88 gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(workflow.includes('node --test tools/release-gate-17088.test.mjs'));
  assert(pkg.scripts.check.includes('tools/release-gate-17088.test.mjs'));
  assert(workflow.includes("rak-17088-isolated-build-${{ github.sha }}"));
});
