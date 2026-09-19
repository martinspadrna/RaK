import test from 'node:test';
import assert from 'node:assert/strict';
import { RELEASE, assertRotationRelease } from './rotation-release-gate-17040.mjs';
function fixture() {
  const v=RELEASE.version, b=RELEASE.build;
  const tasks=['P0.1','P0.2','P0.3','P0.4','P1.1','P1.2','P1.3','P1.4','P1.5','P2.1','P2.2','P2.3','P2.4'];
  return {
    'index.html':`var build='${b}';`,
    'supabase-config.js':`window.RAK_RELEASE_VERSION = "${v}";\nwindow.RAK_TEST_DISPLAY_VERSION = "${v}";\nwindow.RAK_PWA_BUILD = "${b}";\nhttps://${RELEASE.testProject}.supabase.co`,
    'app.js':`const RAK_DEV_UPDATE_BUILD = "${b}";\nwindow.RAK_RELEASE_VERSION = "${v}";`,
    'sw.js':`const CACHE_VERSION = 'v${v}';\nconst DEVELOPMENT_TEST_DISPLAY_VERSION = '${v}';\nconst DEVELOPMENT_BUILD_ID = '${b}';\nconst SW_APP_VERSION = '1.7.0';`,
    'supabase-bridge.js':".select('id,key,payload,meta,revision,updated_at').eq('key', 'main').maybeSingle()",
    'package.json':JSON.stringify({version:'1.7.0'}),
    'tools/shift-report-mo-hotfix-170-smoke.mjs':'RAK_17040_TWO_PASS_GUARD',
    'supabase/migrations/20260919111542_rak_rotation_archive_import_provenance.sql':'private.rak_rotation_import_metadata_v1',
    'tools/security-rotation-minimization-17040.sql':'ROLLBACK;',
    'PUBLIC_ROTATION_MINIMIZATION_17040.md':'offline',
    'RAK_PLAN_13.md':'OS číslo 0/13 importMeta\n'+tasks.map(id=>`| ${id} | item |`).join('\n')
  };
}
test('release markers, minimal column projection, OS-only and thirteen tasks pass',()=>{
  assert.equal(assertRotationRelease(fixture()).taskCount,13);
});
test('wrong Supabase fails closed',()=>{
  const f=fixture();f['supabase-config.js']=f['supabase-config.js'].replace(RELEASE.testProject,RELEASE.productionProject);
  assert.throws(()=>assertRotationRelease(f),/testProject|Missing release marker|Production Supabase/);
});
test('stale service worker fails closed',()=>{
  const f=fixture();f['sw.js']=f['sw.js'].replace(RELEASE.build,'v1.7.39-releasegate1');
  assert.throws(()=>assertRotationRelease(f),/Missing release marker/);
});
test('missing roadmap task fails closed',()=>{
  const f=fixture();f['RAK_PLAN_13.md']=f['RAK_PLAN_13.md'].replace(/^\| P2\.4 \|.*$/m,'');
  assert.throws(()=>assertRotationRelease(f));
});
test('accidentally widened SELECT fails closed',()=>{
  const f=fixture();f['supabase-bridge.js']=".select('*').eq('key', 'main').maybeSingle()";
  assert.throws(()=>assertRotationRelease(f),/Missing release marker/);
});
