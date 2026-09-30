import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('Google iframe gets stable per-calendar colors and a matching visible legend',()=>{
  const nav=read('app-navigation.js');
  const css=read('styles-modal.css');
  assert(nav.includes('RAK_CALENDAR_DISPLAY_COLORS'));
  assert(nav.includes("'kalirna-A': '#A32929'"));
  assert(nav.includes("'kalirna-D': '#5229A3'"));
  assert(nav.includes('rakCalendarLegendHtml(calendars'));
  assert(nav.includes("embed.searchParams.append('color', colors[index])"));
  assert(css.includes('.calendarSourceLegendChip'));
  assert(css.includes('.calendarSourceLegendDot'));
});

test('calendar selection remains local-first but is also saved in the account UI CAS profile',()=>{
  const core=read('core.js');
  const appearance=read('appearance-theme.js');
  const bridge=read('supabase-bridge.js');
  assert(core.includes('queueRakAccountCalendarSelectionSync(selected)'));
  assert(core.includes('applyRakRemoteCalendarSelection'));
  assert(appearance.includes('saveActiveAccountCalendarSelection'));
  assert(appearance.includes('calendar_keys:'));
  assert(bridge.includes("rpc('rak_save_account_ui_preferences_v2'"));
  assert(bridge.includes('sameCalendars'));
});

test('TEST migration stores only bounded managed calendar keys without exposing the table directly',()=>{
  const sql=read('supabase/migrations/20260929141619_rak_calendar_selection_account_sync_17153.sql');
  assert(sql.includes('ADD COLUMN IF NOT EXISTS calendar_keys jsonb'));
  assert(sql.includes('rak_save_account_ui_preferences_v2'));
  assert(sql.includes("'^(obrabeni|kalirna)-[ABCD]$'"));
  assert(sql.includes('jsonb_array_length(calendar_keys) <= 8'));
  assert(sql.includes('REVOKE ALL ON FUNCTION public.rak_save_account_ui_preferences_v2'));
});

test('generator stays on the single assigned calendar while report uses its dedicated admin calendar and D source stays untouched',()=>{
  const core=read('core.js');
  const wizard=read('admin-rotation-generator-wizard.js');
  const report=read('rak-vacation-report.js');
  assert(core.includes('function getRakActiveShiftCalendarContext()'));
  assert(wizard.includes('getRakActiveShiftCalendarContext'));
  assert(report.includes('getRakVacationReportCalendarContext'));
  assert(!report.includes('getRakActiveShiftCalendarContext'));
  assert(core.includes("obrabeni: '31eea99edff1771be15ba877f7c2f5b1371e0a742ad9d54fca526d41eafa5995@group.calendar.google.com'"));
  assert(!read('app-navigation.js').includes('calendar.google.com/calendar/v3'));
});

test('calendar cannot race first paint through an idle prewarm',()=>{
  const nav=read('app-navigation.js');
  const bindStart=nav.indexOf('function bindCalendarTile()');
  const bindEnd=nav.indexOf("try {\n  if (typeof window !== 'undefined' && !window.__rakBottomNavIndicatorResizeBound)",bindStart);
  const binder=nav.slice(bindStart,bindEnd);
  assert(bindStart>=0 && bindEnd>bindStart);
  assert(!binder.includes('requestIdleCallback'));
  assert(!binder.includes('ensureCalendarModal(false)'));
  assert(binder.includes('return openCalendarInRak();'));
});
