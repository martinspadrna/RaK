import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
import {runNamedDeclarations} from './runtime-vm-fixture.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.86 shift-calendar milestone remains active in verified successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.86');
  assert.equal(metadata.technicalVersion,metadata.displayVersion);
  assert.equal(metadata.moduleCacheVersion,metadata.displayVersion);
  assert.equal(metadata.cacheVersion,'v'+metadata.displayVersion);
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
  assert(read('index.html').includes('app.js?v='+metadata.displayVersion));
  const sw=read('sw.js');
  assert(sw.includes("importScripts('./rak-release-metadata.js?sw="+metadata.displayVersion+"');"));
  assert(sw.includes("const SW_RELEASE_CACHE_MARKER = 'v"+metadata.displayVersion+"';"));
});
test('shift calendars keep Google embed allowed while rejecting private and foreign URLs',()=>{
  const core=read('core.js');
  const {api}=runNamedDeclarations({
    modules:[{source:core,names:['normalizeRakGoogleCalendarUrl','isRakAllowedGoogleCalendarUrl']}],
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

test('shift calendar settings remain on the authenticated machine-settings RPC path in successors',()=>{
  const bridge=read('supabase-bridge.js');
  assert(bridge.includes("category === 'shift_calendar_settings'"));
  assert(bridge.includes("key === 'SHIFT_CALENDAR_SETTINGS'"));
  assert(bridge.includes("rpc('rak_admin_save_machine_settings_v3'"));
  assert(bridge.includes('p_expected_revision: state.machineSettingsRevision'));
  assert(bridge.includes("if (!hasSecureAdminContext()) throw new Error('admin authentication required')"));
  assert(!bridge.includes("rpc('rak_admin_save_machine_settings_v2'"));
});

test('npm check retains the 1.7.86 milestone while CI runs the current release gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(pkg.scripts.check.includes('tools/release-gate-17086.test.mjs'));
  assert(/node --test tools\/release-gate-1708\d\.test\.mjs/.test(workflow));
});
