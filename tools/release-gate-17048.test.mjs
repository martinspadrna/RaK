import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {verifyRoadmapProgress} from './roadmap-contract.mjs';
const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const VERSION='1.7.48',BUILD='v1.7.48-deviceauth1';

test('RaK 1.7.48 all release markers, test DB, OS-only employees and technical version',()=>{
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
 const config=read('supabase-config.js');
 assert(config.includes('cgshssdjgzzuprlwnabl')&&!config.includes('bkqamcbkiwumsvelahxr'));
 assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"));
 assert(read('rak-account-access.js').includes('Zadej 4 číslice.'));
 assert(read('rak-complete-backup.js').includes('RAK_PRIVATE_IMPORT_BACKUP_17042'));
});

test('admin device migration retains each Auth session and revokes all physical-device sessions',()=>{
 const initial=read('supabase/history/non-production-migrations/20260919161000_rak_17048_admin_device_sessions_and_revocation.sql');
 const fix=read('supabase/history/non-production-migrations/20260919161500_rak_17048_admin_device_conflict_constraint_fix.sql');
 for(const marker of ['DROP CONSTRAINT rak_admin_devices_user_id_device_id_key',
  'rak_admin_devices_user_session_device_key UNIQUE (user_id, session_id, device_id)',
  "INTERVAL '10 minutes'",'session.created_at', 'device.revoked_at IS NOT NULL',
  'private.rak_current_admin_role()', 'public.rak_owner_revoke_admin_device',
  'WHERE device_id=v_device_id AND revoked_at IS NULL','revoked_sessions',
  'REVOKE ALL ON FUNCTION public.rak_owner_revoke_admin_device'])
  assert(initial.includes(marker),`initial migration missing ${marker}`);
 for(const marker of ['v_session_id','ON CONFLICT ON CONSTRAINT rak_admin_devices_user_session_device_key',
  'WHERE public.rak_admin_devices.revoked_at IS NULL',"RAISE EXCEPTION 'Device session has been revoked'",
  'REVOKE ALL ON FUNCTION public.rak_admin_touch_device'])
  assert(fix.includes(marker),`corrective migration missing ${marker}`);
 assert(!/\b(?:insert|delete|update|truncate)\s+public\.rotation_state\b/i.test(initial+fix));
});

test('rollback SQL exercises two sessions, owner authorization, revocation and blocked resurrection',()=>{
 const sql=read('tools/admin-device-revocation-17048.sql');
 for(const marker of ['BEGIN;','ROLLBACK;','SET LOCAL ROLE authenticated;',
  'pg_catalog.has_function_privilege',"'anon'",'Need two registered owner sessions',
  'Per-session uniqueness rejected same-device multiple sessions',
  'Device revocation did not cover both sessions','Revoked session retained admin role',
  'Revoked device session successfully re-registered'])
  assert(sql.includes(marker),`SQL rollback matrix missing ${marker}`);
 assert(!/\b(?:delete|truncate|update)\s+public\.rotation_state\b/i.test(sql));
});

test('owner OS-only decision is risk acceptance, never mistaken for technical security',()=>{
 const progress=verifyRoadmapProgress(read('RAK_HANDOFF.md'));
 assert.equal(progress.length,13);
 assert.equal(progress.find(item=>item.id==='P0.2').percentage,100);
 const policy=read('EMPLOYEE_AUTH_CUTOVER.md');
 assert(policy.includes('OS_ONLY_POLICY_20260919'));
 assert(read('PUBLIC_ROTATION_ACTOR_PRIVACY.md').includes('24 měsíců'));
 const ui=read('app-admin-unlock.js');
 assert(ui.includes('všechny jeho admin relace'),'device logout must describe all account sessions');
 assert(ui.includes('Odhlásit zařízení'),'device logout button must match scope');
});

test('all inherited two-pass gates and CI still run after newer release',()=>{
 const stage=read('tools/shift-report-mo-hotfix-170-smoke.mjs');
 for(const id of ['17039','17040','17041','17042','17043','17044','17045','17046','17047','17048'])
  assert(stage.includes(`// RAK_${id}_TWO_PASS_GUARD`),`missing replay ${id}`);
 assert(stage.includes(`already17048?"var build='${BUILD}';":already17047?`));
 const workflow=read('.github/workflows/rak-development-validation.yml');
 assert(workflow.includes('npm run vercel-build\n          npm run vercel-build'));
 for(const id of ['17039','17040','17041','17043','17044','17045','17046','17047','17048'])
  assert(workflow.includes(`${id}.test.mjs`),`missing CI gate ${id}`);
 assert(read('tools/development-version-17047.mjs').includes("await import('./development-version-17048.mjs');"));
});
