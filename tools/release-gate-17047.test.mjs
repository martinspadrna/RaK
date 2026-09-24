import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {verifyRoadmapProgress} from './roadmap-contract.mjs';
const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const VERSION='1.7.47', BUILD='v1.7.47-privacyguard1';
test('1.7.47 PWA, app, test Supabase and 1.7.0 technical version are aligned',()=>{
  for(const [path,marker] of [
    ['index.html',`var build='${BUILD}';`],
    ['app.js',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],
    ['app.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
    ['supabase-config.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
    ['supabase-config.js',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`],
    ['supabase-config.js',`window.RAK_PWA_BUILD = "${BUILD}";`],
    ['sw.js',`const CACHE_VERSION = 'v${VERSION}';`],
    ['sw.js',`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],
    ['sw.js',`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],
    ['sw.js',"const SW_APP_VERSION = '1.7.0';"]])
    assert(read(path).includes(marker),`${path}: ${marker}`);
  assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
  assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl'));
  assert(!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
});
test('public-field guard, machine settings trigger and deep backup validation remain separate and testable',()=>{
  const sql=read('supabase/history/non-production-migrations/20260919153000_rak_17047_privacy_keys_machine_guard_backup_months.sql');
  for(const marker of ['accountnumber','personalnumber','osnumber','userid','workers','appaccounts',
    'CREATE OR REPLACE FUNCTION private.rak_machine_settings_no_public_leak_v1()',
    'CREATE TRIGGER rak_machine_settings_no_public_leak_v1',
    'v_stored_category = ANY(v_private_categories)','v_type = ANY(v_private_categories)',
    'CREATE OR REPLACE FUNCTION private.rak_rotation_backup_months_shape_v1',
    'rak_rotation_backup_months_shape_v1','REVOKE ALL ON FUNCTION private.rak_rotation_backup_months_shape_v1',
    'Legacy backup failed deep shape validation','Existing rotation contains newly blocked keys'])
    assert(sql.includes(marker),`migration missing ${marker}`);
  assert(!/\b(?:update|delete|truncate)\s+public\.rotation_state\b/i.test(sql),'rotation rewrite forbidden');
  const matrix=read('tools/privacy-backup-matrix-17047.sql');
  for(const marker of ['BEGIN;','ROLLBACK;','SET LOCAL ROLE anon;',
    'corrupted backup insert did not fail closed',
    'public machine identifier was not blocked','public machine email was not blocked',
    'private roster update blocked','private helper privilege regression',
    'malformed notes were accepted','missing shift in note was accepted'])
    assert(matrix.includes(marker),`regression missing ${marker}`);
});
test('OS-only login and all existing employee rotation/offline paths stay intact',()=>{
  const stage=read('tools/development-version-17047.mjs');
  assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"));
  assert(read('rak-account-access.js').includes('Zadej 4 číslice.'));
  for(const path of ['rak-account-access.js','rak-user-profile.js','supabase-bridge.js',
     'admin-rotation-generator.js','admin-rotation.js','rotace.js','app-rotation-sync.js'])
    assert(!stage.includes(`change('${path}'`),`unexpected runtime edit: ${path}`);
  assert(read('rak-complete-backup.js').includes('RAK_PRIVATE_IMPORT_BACKUP_17042'));
  // P0.2 is acceptance of exposure, not technical protection. The shared contract
  // checks this and computes current progress without freezing historical wording.
  const progress=verifyRoadmapProgress(read('RAK_PLAN_13.md'));
  assert.equal(progress.find(item=>item.id==='P0.2').percentage,100);
  assert(read('PUBLIC_ROTATION_ACTOR_PRIVACY.md').includes('24 měsíců'));
});
test('full historical gates and two-pass CI include final 1.7.47',()=>{
  const stage=read('tools/shift-report-mo-hotfix-170-smoke.mjs');
  for(const id of ['17039','17040','17041','17042','17043','17044','17045','17046','17047'])
    assert(stage.includes(`// RAK_${id}_TWO_PASS_GUARD`),`missing ${id}`);
  assert(stage.includes(`already17047?"var build='${BUILD}';":already17046?`));
  assert(read('tools/release-gate-17043.test.mjs').includes('(43|44|45|46|47)'));
  assert(read('tools/release-gate-17045.test.mjs').includes('(45|46|47)'));
  assert(read('tools/release-gate-17046.test.mjs').includes('(46|47)'));
  const ci=read('.github/workflows/rak-development-validation.yml');
  assert(ci.includes('npm run vercel-build\n          npm run vercel-build'));
  for(const id of ['17039','17040','17041','17043','17044','17045','17046','17047'])
    assert(ci.includes(id+'.test.mjs'),`missing CI gate ${id}`);
});
