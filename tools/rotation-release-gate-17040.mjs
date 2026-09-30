import assert from 'node:assert/strict';
import {verifyRoadmapSummary} from './roadmap-contract.mjs';
export const RELEASE = Object.freeze({
  version: '1.7.40', build: 'v1.7.40-rotationmin1',
  testProject: 'cgshssdjgzzuprlwnabl', productionProject: 'bkqamcbkiwumsvelahxr'
});
export function assertRotationRelease(files) {
  const read = path => {
    assert.equal(typeof files[path], 'string', 'Missing release file: ' + path);
    return files[path];
  };
  const { version, build, testProject, productionProject } = RELEASE;
  const config = read('supabase-config.js');
  const mustInclude = [
    ['index.html', `var build='${build}';`],
    ['supabase-config.js', `window.RAK_RELEASE_VERSION = "${version}";`],
    ['supabase-config.js', `window.RAK_TEST_DISPLAY_VERSION = "${version}";`],
    ['supabase-config.js', `window.RAK_PWA_BUILD = "${build}";`],
    ['app.js', `const RAK_DEV_UPDATE_BUILD = "${build}";`],
    ['app.js', `window.RAK_RELEASE_VERSION = "${version}";`],
    ['sw.js', `const CACHE_VERSION = 'v${version}';`],
    ['sw.js', `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${version}';`],
    ['sw.js', `const DEVELOPMENT_BUILD_ID = '${build}';`],
    ['sw.js', "const SW_APP_VERSION = '1.7.0';"],
    ['supabase-config.js', `https://${testProject}.supabase.co`],
    ['supabase-bridge.js', ".select('id,key,payload,meta,revision,updated_at').eq('key', 'main').maybeSingle()"],
    ['tools/shift-report-mo-hotfix-170-smoke.mjs', 'RAK_17040_TWO_PASS_GUARD'],
    ['supabase/history/non-production-migrations/20260919111542_rak_rotation_archive_import_provenance.sql', 'private.rak_rotation_import_metadata_v1'],
    ['tools/security-rotation-minimization-17040.sql', 'ROLLBACK;'],
    ['PUBLIC_ROTATION_MINIMIZATION_17040.md', 'offline']
  ];
  for (const [path, token] of mustInclude) assert(read(path).includes(token), 'Missing release marker: ' + path + ': ' + token);
  assert(!config.includes(productionProject), 'Production Supabase leaked into preview config');
  assert.equal(JSON.parse(read('package.json')).version, '1.7.0', 'Technical version must be 1.7.0');
  // The detailed checkboxes and risk declaration are validated by roadmap-contract.test.mjs.
  const ids = verifyRoadmapSummary(read('RAK_HANDOFF.md'));
  return { version, build, taskCount: ids.length };
}
