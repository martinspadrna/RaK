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
const mobileAudit = read('rak-mobile-smoke-audit.js');
const domAudit = read('rak-dom-action-audit.js');

const globalHeaders = (vercel.headers || []).find((rule) => rule.source === '/(.*)');
const csp = globalHeaders && (globalHeaders.headers || []).find((header) => header.key === 'Content-Security-Policy');
assert(csp && csp.value.includes("frame-ancestors 'none'"), 'CSP frame protection missing');
assert(csp.value.includes("object-src 'none'"), 'CSP object-src protection missing');
assert(csp.value.includes("connect-src 'self' https://*.supabase.co wss://*.supabase.co"), 'Supabase connect-src contract changed');

assert(index.includes('@supabase/supabase-js@2.110.7'), 'Pinned Supabase client missing');
assert(!index.includes('xlsx.full.min.js'), 'XLSX must stay lazy after build transforms');
assert(!index.includes('jszip.min.js'), 'JSZip must stay lazy after build transforms');
assert(config.includes('cgshssdjgzzuprlwnabl.supabase.co'), 'Development Supabase isolation changed');
assert(!adminUnlock.includes('RAK_OWNER_ADMIN_PASSWORD'), 'Client contains owner password constant');
assert(!bridge.includes('p_admin_pin'), 'Legacy admin PIN write path returned');
assert(bridge.includes("client.rpc('rak_submit_bug_report_v2'"), 'Bug reports must use RPC');
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
assert.deepEqual(apiFiles, ['_admin-auth.js', 'admin-users.js', 'rotation-absence-calendar.js'],
  'New server API endpoint requires a security review');
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
const payloadPolicy = read('supabase/migrations/20260918211000_rak_machine_settings_protect_admin_json_types.sql');
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

console.log('[security-current-smoke-1630] OK current security/export/diagnostic/API contract; retired routes and admin JSON guards verified');
