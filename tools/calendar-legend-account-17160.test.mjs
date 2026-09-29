import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('legend visibility is local-first and account-scoped',()=>{
  const core=read('core.js');
  const nav=read('app-navigation.js');
  assert(core.includes("RAK_CALENDAR_HIDDEN_STORAGE_PREFIX = 'rak-calendar-hidden-v17160:'"));
  assert(core.includes('function getRakCalendarHiddenKeys'));
  assert(core.includes('function getRakVisibleCalendarKeys'));
  assert(core.includes('function setRakVisibleCalendarKeys'));
  assert(core.includes('queueRakAccountCalendarHiddenSync(nextHidden)'));
  assert(nav.includes('getRakVisibleCalendarKeys(selectedCalendarKeys)'));
  assert(nav.includes('window.setRakVisibleCalendarKeys(nextVisible)'));
});

test('account UI CAS sync carries hidden calendar keys through v3 RPC',()=>{
  const appearance=read('appearance-theme.js');
  const bridge=read('supabase-bridge.js');
  assert(appearance.includes('calendarHiddenKeys'));
  assert(appearance.includes('calendar_hidden_keys: localCalendarHiddenKeys'));
  assert(appearance.includes('saveActiveAccountCalendarHiddenKeys'));
  assert(appearance.includes('applyRakRemoteCalendarHiddenKeys'));
  assert(bridge.includes("rpc('rak_save_account_ui_preferences_v3'"));
  assert(bridge.includes('p_calendar_hidden_keys: normalized.calendar_hidden_keys'));
  assert(bridge.includes('sameHiddenCalendars'));
});

test('TEST migration bounds hidden keys and keeps direct table access revoked',()=>{
  const sql=read('supabase/migrations/20260929163000_rak_calendar_hidden_account_sync_17160.sql');
  assert(sql.includes('ADD COLUMN IF NOT EXISTS calendar_hidden_keys jsonb'));
  assert(sql.includes('rak_save_account_ui_preferences_v3'));
  assert(sql.includes("'^(obrabeni|kalirna)-[ABCD]$'"));
  assert(sql.includes('jsonb_array_length(calendar_hidden_keys) <= 8'));
  assert(sql.includes('REVOKE ALL ON FUNCTION public.rak_save_account_ui_preferences_v3'));
  assert(sql.includes("has_table_privilege('anon', 'public.rak_account_ui_preferences', 'SELECT')"));
});

test('account-synced zero active state stays independent of D vacation source',()=>{
  const nav=read('app-navigation.js');
  const core=read('core.js');
  const report=read('rak-vacation-report.js');
  assert(nav.includes('rakEnsureBlankCalendar(empty)'));
  assert(core.includes('function getRakActiveShiftCalendarContext()'));
  assert(report.includes('getRakActiveShiftCalendarContext'));
  assert(core.includes("obrabeni: '31eea99edff1771be15ba877f7c2f5b1371e0a742ad9d54fca526d41eafa5995@group.calendar.google.com'"));
});
