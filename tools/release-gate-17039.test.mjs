import test from 'node:test';
import assert from 'node:assert/strict';
import { assertReleaseSnapshot, RELEASE } from './release-gate-17039.mjs';
function fixture() {
  const v=RELEASE.version, b=RELEASE.build;
  const ids=['P0.1','P0.2','P0.3','P0.4','P1.1','P1.2','P1.3','P1.4','P1.5','P2.1','P2.2','P2.3','P2.4'];
  return {
    'index.html':`var build='${b}';`,
    'supabase-config.js':`window.RAK_RELEASE_VERSION = "${v}";\nwindow.RAK_TEST_DISPLAY_VERSION = "${v}";\nwindow.RAK_PWA_BUILD = "${b}";\nhttps://${RELEASE.testProject}.supabase.co`,
    'app.js':`const RAK_DEV_UPDATE_BUILD = "${b}";`,
    'sw.js':`const CACHE_VERSION = 'v${v}';\nconst DEVELOPMENT_TEST_DISPLAY_VERSION = '${v}';\nconst DEVELOPMENT_BUILD_ID = '${b}';\nconst SW_APP_VERSION = '1.7.0';`,
    'package.json':JSON.stringify({version:'1.7.0'}),
    'RAK_PLAN_13.md':'# OS číslo 24 měsíců rollback 0/13 ČÁSTEČNĚ\n'+ids.map(id=>`| ${id} | item |`).join('\n'),
    'EMPLOYEE_AUTH_CUTOVER.md':'OS_ONLY_POLICY_20260919',
    'PUBLIC_ROTATION_ACTOR_PRIVACY.md':'24 měsíců',
    'tools/security-rotation-release-17039.sql':'SET LOCAL ROLE anon;\nROLLBACK;',
    'tools/shift-report-mo-hotfix-170-smoke.mjs':'RAK_17039_TWO_PASS_GUARD'
  };
}
test('complete development release passes with all 13 tasks',()=>assert.equal(assertReleaseSnapshot(fixture()).taskCount,13));
test('wrong test database fails closed',()=>{const f=fixture();f['supabase-config.js']=f['supabase-config.js'].replace(RELEASE.testProject,RELEASE.productionProject);assert.throws(()=>assertReleaseSnapshot(f),/test database URL|production Supabase/);});
test('PWA build mismatch fails closed',()=>{const f=fixture();f['sw.js']=f['sw.js'].replace(RELEASE.build,'v1.7.38-actorprivacy1');assert.throws(()=>assertReleaseSnapshot(f),/SW build mismatch/);});
test('missing roadmap item fails closed',()=>{const f=fixture();f['RAK_PLAN_13.md']=f['RAK_PLAN_13.md'].replace(/^\| P2\.4 \|.*$/m,'');assert.throws(()=>assertReleaseSnapshot(f),/exactly 13/);});
test('unresolved public privacy cannot be labeled complete',()=>{const f=fixture();f['RAK_PLAN_13.md']=f['RAK_PLAN_13.md'].replace('0/13','13/13');assert.throws(()=>assertReleaseSnapshot(f),/incomplete tasks/);});
