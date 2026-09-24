import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
import {runNamedDeclarations} from './runtime-vm-fixture.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.86 uses one unified release identity',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.86');
  assert.equal(metadata.displayVersion,'1.7.86');
  assert.equal(metadata.technicalVersion,'1.7.86');
  assert.equal(metadata.moduleCacheVersion,'1.7.86');
  assert.equal(metadata.cacheVersion,'v1.7.86');
  assert.equal(metadata.buildId,'v1.7.86-shift-calendars1');
  assert.equal(JSON.parse(read('package.json')).version,'1.7.86');
  assert(read('index.html').includes('app.js?v=1.7.86'));
  const sw=read('sw.js');
  assert(sw.includes("importScripts('./rak-release-metadata.js?sw=1.7.86');"));
  assert(sw.includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.86';"));
});

test('shift calendars accept only public Google Calendar embed URLs',()=>{
  const core=read('core.js');
  const {api}=runNamedDeclarations({
    modules:[{source:core,names:['isRakAllowedGoogleCalendarUrl']}],
    globals:{window:{},URL},
    exports:{valid:'isRakAllowedGoogleCalendarUrl'}
  });
  assert.equal(api.valid('https://calendar.google.com/calendar/embed?src=test%40group.calendar.google.com'),true);
  assert.equal(api.valid('https://calendar.google.com/calendar/ical/test/private-secret/basic.ics'),false);
  assert.equal(api.valid('http://calendar.google.com/calendar/embed?src=test'),false);
  assert.equal(api.valid('https://evil.example/calendar/embed?src=test'),false);
});

test('Dashboard and modal select calendars from the active account shift',()=>{
  const core=read('core.js');
  const nav=read('app-navigation.js');
  const dashboard=read('dashboard.js');
  assert(core.includes('function getRakActiveShiftCalendarContext()'));
  assert(core.includes('const info = getRakActiveAccountShiftInfo();'));
  assert(core.includes('calendars: getRakShiftCalendarsForTeam(team)'));
  assert(nav.includes("const context = typeof getRakActiveShiftCalendarContext === 'function'"));
  assert(nav.includes('data-calendar-choice-index'));
  assert(dashboard.includes('getRakActiveShiftCalendarContext()'));
  assert(dashboard.includes("setCard('dashCalendar', 'Kalendář', calendarDate, calendarMeta, '', true, calendarIcon)"));
});

test('calendar settings have their own admin page and preserve the legacy D calendar until saved',()=>{
  const core=read('core.js');
  const nav=read('app-navigation.js');
  const renderer=read('app-menu-admin-renderer.js');
  const menu=read('app-menu.js');
  assert(renderer.includes("{ action: 'open-calendars', label: 'Kalendáře' }"));
  assert(renderer.includes('buildAdminShiftCalendarsSettingsHtml'));
  assert(renderer.includes("mode === 'calendars'"));
  assert.equal((renderer.match(/adminCalendarNotesCard/g)||[]).length,1);
  assert(menu.includes("adminAction === 'save-calendars'"));
  assert(menu.includes("openAppMenu('admin-calendars')"));
  assert(core.includes("teams.D.push({ label: 'Kalendář směny D', url: legacyUrl })"));
  assert(nav.includes("const rows = ['food', 'eportal', 'payroll'].map"));
  assert(nav.includes("const links = { calendar: current.links.calendar };"));
});

test('shift calendar settings use the existing authenticated machine-settings RPC path',()=>{
  const bridge=read('supabase-bridge.js');
  assert(bridge.includes("category === 'shift_calendar_settings'"));
  assert(bridge.includes("key === 'SHIFT_CALENDAR_SETTINGS'"));
  assert(bridge.includes("rpc('rak_admin_save_machine_settings_v2'"));
  assert(bridge.includes("if (!hasSecureAdminContext()) throw new Error('admin authentication required')"));
});

test('mandatory CI and npm check execute the 1.7.86 gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(workflow.includes('node --test tools/release-gate-17086.test.mjs'));
  assert(pkg.scripts.check.includes('tools/release-gate-17086.test.mjs'));
  assert(workflow.includes("rak-17086-isolated-build-${{ github.sha }}"));
});
