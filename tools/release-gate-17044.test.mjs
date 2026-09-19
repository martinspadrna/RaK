import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
// Historical 1.7.44 checks execute both at their own build stage and at the latest final build.
const config = read('supabase-config.js');
const version = config.match(/^window\.RAK_RELEASE_VERSION = "([^"]+)";/m)?.[1] || '1.7.44';
const build = config.match(/^window\.RAK_PWA_BUILD = "([^"]+)";/m)?.[1] || 'v1.7.44-publicguard1';

test('public rotation guard is bounded and protects contextual identifiers', () => {
  const sql = read('supabase/migrations/20260919140220_rak_public_rotation_contact_os_guard_v3.sql');
  assert(sql.includes('CREATE OR REPLACE FUNCTION private.rak_rotation_has_restricted_public_value'));
  assert(sql.includes("~* '(^|[^[:digit:]])([+]420|00420)"), 'phone country prefix must have digit boundary');
  assert(sql.includes('(telefon|tel[.]?|mobil|sms|kontakt)'), 'national phone guard missing');
  assert(sql.includes('osobn[íi]'), 'employee number context missing');
  assert(sql.includes('REVOKE ALL ON FUNCTION private.rak_rotation_has_restricted_public_value(jsonb)'));
  assert(sql.includes('COMMENT ON CONSTRAINT rak_rotation_no_public_secret_fields_v2'));
  assert(sql.includes('Existing rotation violates 1.7.44 guard'));
  assert(!/\b(?:update|delete|insert|truncate)\s+public\.rotation_state\b/i.test(sql), 'existing rotation must not be rewritten');
});

test('13 synthetic nested SQL cases, anonymous denial and rollback retained', () => {
  const sql = read('tools/rotation-public-guard-17044.sql');
  assert(sql.includes('BEGIN;') && sql.includes('ROLLBACK;'));
  for (const fixture of ['phone_plus','phone_00420','phone_national','os_diacritics',
    'os_ascii','os_abbrev','no_false_positive','unlabelled_id','normal_note'])
    assert(sql.includes("'" + fixture + "'"), `missing ${fixture}`);
  assert(sql.includes("has_function_privilege('anon'"));
  assert(sql.includes('Existing rotation violates privacy guard'));
});

test('version, isolated test DB, backup and OS-only login preserve contracts', () => {
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
    ['sw.js', "const SW_APP_VERSION = '1.7.0';"]]) assert(read(file).includes(marker), `${file}: ${marker}`);
  assert.equal(JSON.parse(read('package.json')).version, '1.7.0');
  assert(config.includes('cgshssdjgzzuprlwnabl'));
  assert(!config.includes('bkqamcbkiwumsvelahxr'));
  const stage = read('tools/development-version-17044.mjs');
  assert(!stage.includes("change('rak-account-access.js'"));
  assert(!stage.includes("change('supabase-bridge.js'"));
  assert(read('admin-rotation-generator.js').includes('note.text'));
  assert(read('rak-complete-backup.js').includes('RAK_PRIVATE_IMPORT_BACKUP_17042'));
});

test('inherited 1.7.44 guards survive later releases and CI keeps historical testing', () => {
  const stage = read('tools/shift-report-mo-hotfix-170-smoke.mjs');
  for (const id of ['17039','17040','17041','17042','17043','17044'])
    assert(stage.includes(`// RAK_${id}_TWO_PASS_GUARD`), `missing ${id}`);
  assert(stage.includes('const already17043=already17044||indexSource.includes('));
  if (version === '1.7.44') assert(stage.includes(`already17044?"var build='${build}';":already17043?`));
  else assert(stage.includes('RAK_17045_TWO_PASS_GUARD'), 'latest release lost the 1.7.44 replay guard');
  const workflow = read('.github/workflows/rak-development-validation.yml');
  assert(workflow.includes('npm run vercel-build\n          npm run vercel-build'));
  assert(workflow.includes('node --test tools/release-gate-17044.test.mjs'));
});
