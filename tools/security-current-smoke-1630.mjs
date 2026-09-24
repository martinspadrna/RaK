#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const index = read('index.html');
const vercel = JSON.parse(read('vercel.json'));
const bridge = read('supabase-bridge.js');
const adminUnlock = read('app-admin-unlock.js');
const config = read('supabase-config.js');
const migration = read('supabase/migrations/20260915144000_audit_keepalive_rpc_only.sql');
const exportJs = read('export.js');
assert(!exportJs.includes('document.documentElement.cloneNode'), 'ZIP export must never clone live DOM');
assert(!exportJs.includes('používám DOM kopii'), 'ZIP export DOM fallback returned');
assert(exportJs.includes('Export byl bezpečně zastaven: nepodařilo se načíst čistý index.html.'), 'ZIP export must fail closed without canonical index');
const mobileAudit = read('rak-mobile-smoke-audit.js');
const domAudit = read('rak-dom-action-audit.js');

const globalHeaders = (vercel.headers || []).find((rule) => rule.source === '/(.*)');
const csp = globalHeaders && (globalHeaders.headers || []).find((header) => header.key === 'Content-Security-Policy');
assert(csp && csp.value.includes("frame-ancestors 'none'"), 'CSP frame protection missing');
assert(csp.value.includes("object-src 'none'"), 'CSP object-src protection missing');
assert(csp.value.includes("connect-src 'self' https://*.supabase.co wss://*.supabase.co"), 'Supabase connect-src contract changed');

assert(index.includes('supabase-vendor-2.110.7.js'), 'Self-hosted pinned Supabase client missing');
assert(!index.includes('cdn.jsdelivr.net/npm/@supabase/supabase-js'), 'Supabase client must not depend on a third-party startup CDN');
assert(!index.includes('xlsx.full.min.js'), 'XLSX must stay lazy after build transforms');
assert(!index.includes('jszip.min.js'), 'JSZip must stay lazy after build transforms');
assert(config.includes('cgshssdjgzzuprlwnabl.supabase.co'), 'Development Supabase isolation changed');
assert(!adminUnlock.includes('RAK_OWNER_ADMIN_PASSWORD'), 'Client contains owner password constant');
assert(!bridge.includes('p_admin_pin'), 'Legacy admin PIN write path returned');
assert(bridge.includes("client.rpc('rak_submit_bug_report_v3'"), 'Bug reports must use bounded screenshot-aware RPC');
assert(!/\.from\(['"]bug_reports['"]\)/.test(bridge), 'Direct bug_reports table access returned');
assert(bridge.includes("client.rpc('rak_app_keepalive'"), 'Keepalive must use RPC');
assert(!/\.from\(['"]app_keepalive['"]\)/.test(bridge), 'Direct app_keepalive table access returned');
assert(migration.includes('revoke all privileges on table public.app_keepalive from anon, authenticated;'), 'Keepalive table grants are not revoked');
assert(migration.includes('grant execute on function public.rak_app_keepalive(text, text, text, jsonb) to anon, authenticated;'), 'Keepalive RPC execute grant missing');
assert(!exportJs.includes('"games-engine.js"'), 'Removed Games runtime remains in ZIP export manifest');
assert(!exportJs.includes('"app-usage-smoke-v963.js"'), 'Missing legacy smoke remains in ZIP export manifest');
assert(!exportJs.includes('"styles-overrides.css"'), 'Missing legacy CSS remains in ZIP export manifest');
assert(!mobileAudit.includes("route: 'games'"), 'Removed Games route remains required by diagnostics');
assert(!domAudit.includes("'home', 'rotace', 'kalkulacky', 'games', 'menu'"), 'Removed Games nav remains required by DOM audit');

// P0: Retired server endpoints must never reactivate an old database access path.
const apiFiles = fs.readdirSync('api').filter((name) => name.endsWith('.js')).sort();
assert.deepEqual(apiFiles, ['_admin-auth.js', 'admin-users.js', 'public-calendar.js', 'rotation-absence-calendar.js'],
  'New server API endpoint requires a security review');

const publicCalendarApi = read('api/public-calendar.js');
assert(publicCalendarApi.includes("const GOOGLE_CALENDAR_HOST = 'calendar.google.com'"),
  'Public calendar endpoint must stay pinned to calendar.google.com');
assert(publicCalendarApi.includes("'/public/basic.ics'") && !publicCalendarApi.includes('/private/'),
  'Public calendar endpoint must only construct public/basic.ics paths');
assert(publicCalendarApi.includes('MAX_ICS_BYTES = 2 * 1024 * 1024') &&
  publicCalendarApi.includes('AbortSignal.timeout(12000)'),
  'Public calendar endpoint must keep bounded response size and timeout');
assert(publicCalendarApi.includes("req.method !== 'GET' && req.method !== 'HEAD'"),
  'Public calendar endpoint must remain read-only');
assert(!publicCalendarApi.includes('req.query.url') &&
  !publicCalendarApi.includes('SUPABASE') &&
  !publicCalendarApi.includes('service_role'),
  'Public calendar endpoint must not become an arbitrary proxy or privileged data path');

for (const file of ['api/admin-users.js', 'api/rotation-absence-calendar.js']) {
  const source = read(file);
  assert(/res\.status\(410\)\.json\(/.test(source), `${file} must return 410`);
  assert(!/requireAdmin\s*\(|supabaseRequest\s*\(|fetch\s*\(/.test(source),
    `${file} must not use a legacy data access fallback`);
}
const adminApi = read('api/_admin-auth.js');
assert(adminApi.includes("'/auth/v1/user'"), 'Admin helper must validate actual Auth user');
assert(adminApi.includes("'/rest/v1/rpc/rak_admin_context'"), 'Admin helper must check the database role');
assert(adminApi.includes('String(profile.user_id || \'\') !== String(user.id)'),
  'Admin helper must bind the role to the verified user');
assert(adminApi.includes('options.ownerOnly && profile.role !== \'owner\''),
  'Owner-only API must retain the owner gate');
const policyFiles = fs.readdirSync('supabase/migrations')
  .filter((name) => name.endsWith('_rak_machine_settings_protect_admin_json_types.sql'));
assert.equal(policyFiles.length, 1, 'Admin JSON guard must have exactly one migration');
const payloadPolicy = read('supabase/migrations/' + policyFiles[0]);
assert(payloadPolicy.includes('rak_machine_settings_anon_admin_json_type_v6') &&
  payloadPolicy.includes('rak_machine_settings_authenticated_admin_json_type_v6'),
  'Disguised admin settings read guards missing');
assert(payloadPolicy.includes("'admin_accounts_settings', 'admin_full_settings_backup'"),
  'Admin JSON type denylist missing');
const rpcMatrix = read('tools/security-admin-rpc-matrix.sql');
assert(rpcMatrix.includes('SET LOCAL ROLE anon;') && rpcMatrix.includes('SET LOCAL ROLE authenticated;'),
  'Admin RPC role regression matrix missing');
const publicSurface = read('tools/security-public-surface-matrix.sql');
assert(publicSurface.includes('rak_admin_account_requires_auth') &&
  publicSurface.includes('RAK_RLS_ADMIN_TYPE_TEST_FIXTURE') && publicSurface.includes('ROLLBACK;'),
  'Public RPC allowlist and disguised-row test missing');

// P0: Keep the already-applied test privacy cutovers in the source package and
// fail Vercel builds if their migration/test files vanish or get weakened.
const workerRoster = read('supabase/migrations/20260918214441_rak_hide_worker_roster_from_public_reads.sql');
assert(workerRoster.includes('rak_machine_settings_anon_no_worker_roster_v7') &&
  workerRoster.includes('rak_machine_settings_authenticated_worker_roster_admin_only_v7') &&
  workerRoster.includes("settings_json->>'type'") &&
  workerRoster.includes("machine_key,'') <> 'WORKER_ROSTER_SETTINGS'"),
  'Worker roster / login-number read protection missing');
const announcementsPrivacy = read('supabase/migrations/20260918220431_rak_announcements_hide_inactive_from_public_reads.sql');
assert(announcementsPrivacy.includes('DROP POLICY rak_announcements_public_read_v2') &&
  announcementsPrivacy.includes('rak_announcements_active_public_read_v3') &&
  announcementsPrivacy.includes('rak_announcements_active_or_admin_read_v3') &&
  announcementsPrivacy.includes('USING (is_active IS TRUE)') &&
  announcementsPrivacy.includes('private.rak_is_admin()'),
  'Inactive-announcement privacy or admin access missing');
const dataSurface = read('tools/security-public-data-matrix.sql');
assert(dataSurface.includes("ARRAY['announcements','machine_settings','rotation_state']") &&
  dataSurface.includes('rak_lookup_account_for_login_v1') &&
  dataSurface.includes('SET LOCAL ROLE anon;') &&
  dataSurface.includes('SET LOCAL ROLE authenticated;') &&
  dataSurface.includes('ROLLBACK;'),
  'Integrated public data, login and owner read regression matrix missing');

console.log('[security-current-smoke-1630] OK privacy/RPC/export/API contract; roster, announcements, owner and public regression guards verified');