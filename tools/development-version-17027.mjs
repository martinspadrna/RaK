#!/usr/bin/env node
// RaK 1.7.27: narrow login lookup and session-verified admin directory.
// The database cutover is a separate gated step: old PWA clients still require legacy SELECT.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

const VERSION = '1.7.27';
const BUILD = 'v1.7.27-directoryrpc1';
const read = path => fs.readFileSync(path, 'utf8');
const change = (path, fn) => {
  const original = read(path);
  const updated = fn(original);
  if (updated !== original) fs.writeFileSync(path, updated, 'utf8');
  return updated;
};
function swap(source, before, after, label) {
  if (source.includes(before)) {
    assert.equal(source.split(before).length, 2, '[17027] duplicate anchor: ' + label);
    return source.replace(before, after);
  }
  assert(source.includes(after), '[17027] missing anchor: ' + label);
  return source;
}

const profile = change('rak-user-profile.js', source => {
  if (source.includes('// RAK_LOGIN_RPC_17027')) return source;
  const start = source.indexOf("      const { data, error } = await client.from('game_accounts').select('account_number,full_name').like('account_number', `%${suffix}`);");
  const end = source.indexOf('\n    } catch (error) {', start);
  assert(start >= 0 && end > start, '[17027] exact login directory lookup bounds');
  const body = `      // RAK_LOGIN_RPC_17027: do not expose the whole table to the login client.
      const { data, error } = await client.rpc('rak_lookup_account_for_login_v1', { p_last4: suffix });
      if (error) return { ok: false, reason: 'lookup-failed', error };
      if (!data || data.ok !== true) return { ok: false, reason: data && data.reason || 'not-found' };
      return { ok: true, accountNumber: String(data.accountNumber || '').trim(), fullName: String(data.fullName || '').trim() };`;
  return source.slice(0, start) + body + source.slice(end);
});
assert(profile.includes('rak_lookup_account_for_login_v1') && !profile.includes(".from('game_accounts')"), '[17027] login still reading the entire account table');

const bridge = change('supabase-bridge.js', source => {
  if (source.includes('// RAK_SECURE_DIRECTORY_17027')) return source;
  const oldRead = `      const { data, error } = await runSharedSupabaseRead('game_accounts.load', () => runSupabaseOperation('game_accounts.load', () => client
        .from('game_accounts')
        .select('account_number, full_name, updated_at')
        .order('account_number', { ascending: true }), { mode: 'read' }));`;
  const secureRead = `      // Retired game-directory API must never fall back to anonymous bulk table reads.
      if (!hasSecureAdminContext()) return [];
      const { data, error } = await runSharedSupabaseRead('game_accounts.load', () => runSupabaseOperation('game_accounts.load', () => client.rpc('rak_admin_list_application_accounts_v1'), { mode: 'read' }));`;
  source = swap(source, oldRead, secureRead, 'retired games directory');
  const marker = '    getAdminAccessToken,\n';
  const method = `    // RAK_SECURE_DIRECTORY_17027: same authenticated client as the admin console.
    listApplicationAccountsSecure: async () => {
      const client = getClient();
      if (!client || !hasSecureAdminContext()) return { ok: false, reason: 'admin-auth-required', rows: [] };
      const { data, error } = await client.rpc('rak_admin_list_application_accounts_v1');
      return error ? { ok: false, error, rows: [] } : { ok: true, rows: Array.isArray(data) ? data : [] };
    },
`;
  return swap(source, marker, marker + method, 'authenticated directory bridge');
});
assert(bridge.includes('RAK_SECURE_DIRECTORY_17027') && bridge.includes('rak_admin_list_application_accounts_v1'), '[17027] authenticated bridge unavailable');

const access = change('rak-account-access.js', source => {
  if (source.includes('// RAK_ADMIN_DIRECTORY_RPC_17027')) return source;
  const oldStart = `  async function loadDirectory(force) {
    if (directoryRows.length && !force) return directoryRows.slice();`;
  const newStart = `  async function loadDirectory(force) {
    // RAK_ADMIN_DIRECTORY_RPC_17027: cached names are never returned after admin sign-out.
    const bridge = window.RotationSupabaseBridge;
    if (!bridge || typeof bridge.getAdminAccessToken !== 'function' || !(await bridge.getAdminAccessToken())) {
      directoryRows = [];
      throw new Error('admin-auth-required');
    }
    if (directoryRows.length && !force) return directoryRows.slice();`;
  source = swap(source, oldStart, newStart, 'directory authentication before cache');
  const oldQuery = `      const client = supabaseClient();
      if (!client) throw new Error('directory-not-ready');
      const { data, error } = await client.from('game_accounts').select('account_number,full_name').order('full_name', { ascending: true });
      if (error) throw error;`;
  const newQuery = `      const result = await bridge.listApplicationAccountsSecure();
      if (!result || !result.ok) throw (result && result.error || new Error('admin-directory-unavailable'));
      const data = result.rows;`;
  source = swap(source, oldQuery, newQuery, 'full directory via authenticated RPC');
  source = swap(source, '    try { await loadDirectory(false); } catch (err) {}', '    try { await loadDirectory(false); } catch (err) { return; }', 'do not hide admin labels before authorization');
  source = swap(source, '    if (!card.isConnected || card.querySelector(\'#rakAccountDirectoryBlock\')) return;', '    if (!card.isConnected || card.querySelector(\'#rakAccountDirectoryBlock\') || !rows.length) return;', 'wait for authorized directory load');
  return source;
});
assert(!access.includes(".from('game_accounts')") && access.includes('getAdminAccessToken'), '[17027] admin directory is not authorization-gated');

change('tools/shift-report-mo-hotfix-170-smoke.mjs', source => {
  if (source.includes('// RAK_17027_TWO_PASS_GUARD')) return source;
  source = swap(source,
    'const already17026=indexSource.includes("var build=\'v1.7.26-security1\';");',
    '// RAK_17027_TWO_PASS_GUARD\nconst already17027=indexSource.includes("var build=\'v1.7.27-directoryrpc1\';");\nconst already17026=already17027||indexSource.includes("var build=\'v1.7.26-security1\';");',
    'second-pass latest detection');
  return swap(source,
    'already17026?"var build=\'v1.7.26-security1\';":already17025?',
    'already17027?"var build=\'v1.7.27-directoryrpc1\';":already17026?"var build=\'v1.7.26-security1\';":already17025?',
    'second-pass latest reset');
});
change('supabase-config.js', source => {
  assert(source.includes('https://cgshssdjgzzuprlwnabl.supabase.co') && !source.includes('bkqamcbkiwumsvelahxr'), '[17027] isolated test Supabase only');
  source = swap(source, 'window.RAK_RELEASE_VERSION = "1.7.26";', `window.RAK_RELEASE_VERSION = "${VERSION}";`, 'release');
  source = swap(source, 'window.RAK_TEST_DISPLAY_VERSION = "1.7.26";', `window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`, 'display');
  return swap(source, 'window.RAK_PWA_BUILD = "v1.7.26-security1";', `window.RAK_PWA_BUILD = "${BUILD}";`, 'PWA build');
});
change('app.js', source => {
  source = swap(source, 'const RAK_DEV_UPDATE_BUILD = "v1.7.26-security1";', `const RAK_DEV_UPDATE_BUILD = "${BUILD}";`, 'app update');
  return swap(source, 'window.RAK_RELEASE_VERSION = "1.7.26";', `window.RAK_RELEASE_VERSION = "${VERSION}";`, 'app version');
});
change('sw.js', source => {
  assert(source.includes("const SW_APP_VERSION = '1.7.0';"), '[17027] keep technical version');
  source = swap(source, "const CACHE_VERSION = 'v1.7.26';", `const CACHE_VERSION = 'v${VERSION}';`, 'cache');
  source = swap(source, "const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.26';", `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`, 'worker display');
  return swap(source, "const DEVELOPMENT_BUILD_ID = 'v1.7.26-security1';", `const DEVELOPMENT_BUILD_ID = '${BUILD}';`, 'worker build');
});
change('index.html', source => swap(source, "var build='v1.7.26-security1';", `var build='${BUILD}';`, 'index build'));
assert.equal(JSON.parse(read('package.json')).version, '1.7.0', '[17027] technical package version unchanged');
for (const path of ['rak-user-profile.js', 'rak-account-access.js', 'supabase-bridge.js', 'tools/shift-report-mo-hotfix-170-smoke.mjs', 'supabase-config.js', 'app.js', 'sw.js']) {
  execFileSync(process.execPath, ['--check', path], {stdio:'pipe'});
}
assert(read('index.html').includes(`var build='${BUILD}';`) && read('sw.js').includes(`const CACHE_VERSION = 'v${VERSION}';`), '[17027] release and PWA mismatch');
console.log('[development-version-17027] OK 1.7.27: single-account login RPC, authenticated bulk directory, no anonymous browser table read, two-pass release/version/cache');
await import('./development-version-17028.mjs');
