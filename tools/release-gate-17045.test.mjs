import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const version = '1.7.45';
const build = 'v1.7.45-logingate1';

test('bounded v2 login combines the admin prompt, old PWA oracle fails closed', () => {
  const migration = read('supabase/migrations/20260919141936_rak_bounded_admin_gate_and_login_v2.sql');
  assert(migration.includes('CREATE OR REPLACE FUNCTION public.rak_lookup_account_for_login_v2(p_last4 text)'));
  assert(migration.includes('public.rak_lookup_account_for_login_v1(p_last4)'));
  assert(migration.includes("'requiresAdminAuth'"));
  assert(migration.includes('legacy-admin-check-global'));
  assert(migration.includes('legacy-admin-check-ip:'));
  assert(migration.includes('v_hits > 300') && migration.includes('v_hits > 60'));
  assert(migration.includes("RAISE EXCEPTION 'Admin gate rate limited'"));
  assert(migration.includes('REVOKE ALL ON FUNCTION public.rak_admin_account_requires_auth(text) FROM PUBLIC'));
  assert(migration.includes('SET search_path = \x27\x27'));
  const sql = read('tools/login-admin-gate-17045.sql');
  assert(sql.includes('BEGIN;') && sql.includes('ROLLBACK;') && sql.includes('SET LOCAL ROLE anon;'));
  assert(sql.includes('legacy oracle did not fail closed'));
});

test('OS-only employee lookup and admin password prompt are preserved without a second request', () => {
  const profile = read('rak-user-profile.js');
  const access = read('rak-account-access.js');
  assert(profile.includes("client.rpc('rak_lookup_account_for_login_v2', { p_last4: suffix })"));
  assert(!profile.includes("client.rpc('rak_lookup_account_for_login_v1', { p_last4: suffix })"));
  assert(profile.includes("typeof data.requiresAdminAuth !== 'boolean'"), 'missing flag must fail closed');
  assert(profile.includes('requiresAdminAuth: data.requiresAdminAuth'));
  assert(!profile.includes(".from('game_accounts')"), 'anonymous bulk directory must stay closed');
  assert(access.includes("typeof result.requiresAdminAuth === 'boolean'"));
  assert(access.includes('result.requiresAdminAuth : await accountNeedsAdminPassword(profile.accountNumber)'),
    'legacy test/PWA fallback must remain gated');
  assert(access.includes('showAdminPasswordGate(profile, button)'));
  assert(access.includes('rakAdminSecureSignIn'));
  assert(access.includes('Zadej 4 číslice.'));
  assert(!access.includes(".from('game_accounts')"));
});

test('exact 1.7.45 preview version and privacy/offline contracts', () => {
  for (const [file, marker] of [
    ['index.html', `var build='${build}';`],
    ['app.js', `const RAK_DEV_UPDATE_BUILD = "${build}";`],
    ['app.js', `window.RAK_RELEASE_VERSION = "${version}";`],
    ['supabase-config.js', `window.RAK_RELEASE_VERSION = "${version}";`],
    ['supabase-config.js', `window.RAK_TEST_DISPLAY_VERSION = "${version}";`],
    ['supabase-config.js', `window.RAK_PWA_BUILD = "${build}";`],
    ['sw.js', `const CACHE_VERSION = 'v${version}';`],
    ['sw.js', `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${version}';`],
    ['sw.js', `const DEVELOPMENT_BUILD_ID = '${build}';`],
    ['sw.js', "const SW_APP_VERSION = '1.7.0';"]])
    assert(read(file).includes(marker), `${file}: ${marker}`);
  assert.equal(JSON.parse(read('package.json')).version, '1.7.0');
  const config = read('supabase-config.js');
  assert(config.includes('cgshssdjgzzuprlwnabl') && !config.includes('bkqamcbkiwumsvelahxr'));
  assert(read('rak-complete-backup.js').includes('RAK_PRIVATE_IMPORT_BACKUP_17042'));
  assert(read('admin-rotation-generator.js').includes('note.text'));
  const plan = read('RAK_PLAN_13.md');
  assert(plan.includes('0/13') && plan.includes('24 měsíců') && plan.includes('ČÁSTEČNĚ'));
  assert(plan.includes('OS číslo') && plan.includes('rollback'));
});

test('two complete builds, all inherited gates and final 1.7.45 guard', () => {
  const stage = read('tools/shift-report-mo-hotfix-170-smoke.mjs');
  for (const id of ['17039','17040','17041','17042','17043','17044','17045'])
    assert(stage.includes(`// RAK_${id}_TWO_PASS_GUARD`));
  assert(stage.includes('const already17044=already17045||indexSource.includes('));
  assert(stage.includes(`already17045?"var build='${build}';":already17044?`));
  assert(read('tools/development-version-17044.mjs').includes("await import('./development-version-17045.mjs');"));
  const workflow = read('.github/workflows/rak-development-validation.yml');
  assert(workflow.includes('npm run vercel-build\n          npm run vercel-build'));
  for (const gate of ['17039','17040','17041','17043','17044','17045'])
    assert(workflow.includes(`node --test tools/${gate==='17040' ? 'rotation-release-gate' : gate==='17041' ? 'two-pass-release' : 'release-gate'}-${gate}.test.mjs`));
});
