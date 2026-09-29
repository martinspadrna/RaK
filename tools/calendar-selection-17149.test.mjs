import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.149 exposes eight managed calendars and defaults to exactly one',()=>{
  const core=read('core.js');
  assert(core.includes("obrabeni: '849eb5bcbcfdba0ce4171f4a530c530e6fe096c4f9848bede490cd4e129c7b02@group.calendar.google.com'"));
  assert(core.includes("kalirna: 'd5be95a22ab9eaad50fbe177a127966aa6cf9542c8d7060f109f8b007d1e22ee@group.calendar.google.com'"));
  assert(core.includes("return unique.length ? unique : [getRakDefaultCalendarKey()];"));
  assert(core.includes("if (!selected.length) return { ok: false, reason: 'at-least-one-calendar' };"));
  assert(core.includes("entry.calendarAssignment || entry.calendar_assignment || entry.workGroup || entry.work_group"));
  assert(core.includes("calendarAssignment:'obrabeni-D'"));
  assert(core.includes("['obrabeni-' + team, 'kalirna-' + team]"));
});

test('calendar selection is available in Settings and calendar opens in native RaK renderer',()=>{
  const pages=read('app-menu-pages.js');
  const nav=read('app-navigation.js');
  const css=read('styles-settings-runtime.css');
  assert(pages.includes('buildRakCalendarSelectionSettingsHtml'));
  assert(pages.includes('bindRakCalendarSelectionSettings'));
  assert(nav.includes("content.innerHTML = '<div class=\"calendarNativeHost\"></div>';"));
  assert(nav.includes('void rakNativeCalendarLoad(content, 0);'));
  assert(css.includes('.rakCalendarPreferenceGroups'));
  assert(css.includes('.rakCalendarPreferenceOption'));
});

test('Kalírna private Google URLs stay outside repository source and use allowlisted Vault feed',()=>{
  const api=read('api/public-calendar.js');
  const feedMigration=read('supabase/migrations/20260929022427_rak_calendar_private_feed_17149.sql');
  const checked=[
    read('core.js'),api,feedMigration,read('app-navigation.js'),read('rak-user-profile.js')
  ].join('\n');
  assert((api.match(/group\.calendar\.google\.com/g)||[]).length>=4);
  assert(api.includes('PRIVATE_CALENDAR_SOURCE_IDS'));
  assert(api.includes('rak_calendar_private_feed'));
  assert(feedMigration.includes('vault.decrypted_secrets'));
  assert(feedMigration.includes('extensions.http_get'));
  assert(feedMigration.includes('v_secret_name := case v_source'));
  assert(!/private-[0-9a-f]{16,}/i.test(checked),'repository must not contain private Google ICS tokens');
});

test('login carries calendarAssignment so Kalírna default is correct on first login',()=>{
  const profile=read('rak-user-profile.js');
  const migration=read('supabase/migrations/20260929023449_rak_login_calendar_assignment_v4_17149.sql');
  assert(profile.includes("client.rpc('rak_lookup_account_for_login_v4'"));
  assert(profile.includes('calendarAssignment'));
  assert(migration.includes("jsonb_build_object('calendarAssignment', v_assignment)"));
  assert(migration.includes("'kalirna'"));
  assert(migration.includes("'obrabeni-' || lower(v_shift)"));
});

test('owner admin and deputy can change only their own password from Settings',()=>{
  const pages=read('app-menu-pages.js');
  const menu=read('app-menu.js');
  const unlock=read('app-admin-unlock.js');
  const edge=read('supabase/functions/rak-admin-users/index.ts');
  assert(pages.includes('data-menu-action="change-account-password"'));
  assert(menu.includes("menuAction === 'change-account-password'"));
  assert(unlock.includes('if (!rakAdminCanOpenShiftReport()'));
  assert(edge.includes('["owner", "admin", "deputy"].includes'));
  assert(edge.includes('if (action === "change-own-password")'));
  const own=edge.indexOf('if (action === "change-own-password")');
  const deputyBlock=edge.indexOf('if (actor.role === "deputy")');
  assert(own>=0 && deputyBlock>own,'deputy must pass only the own-password action before management is blocked');
  assert(edge.includes('owner_permission_required'));
});
