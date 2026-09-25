#!/usr/bin/env node
// Pure release assertions; invoked AFTER the version transform, never writes production or app data.
import assert from 'node:assert/strict';
import {verifyRoadmapSummary} from './roadmap-contract.mjs';

export const RELEASE = Object.freeze({
  version: '1.7.39',
  build: 'v1.7.39-releasegate1',
  testProject: 'cgshssdjgzzuprlwnabl',
  productionProject: 'bkqamcbkiwumsvelahxr'
});

export function assertReleaseSnapshot(files) {
  const read = (path) => {
    assert.equal(typeof files[path], 'string', `Missing release file: ${path}`);
    return files[path];
  };
  const index = read('index.html');
  const config = read('supabase-config.js');
  const app = read('app.js');
  const sw = read('sw.js');
  const packageJson = JSON.parse(read('package.json'));
  const plan = read('RAK_HANDOFF.md');
  const policy = read('EMPLOYEE_AUTH_CUTOVER.md');
  const privacy = read('PUBLIC_ROTATION_ACTOR_PRIVACY.md');
  const sql = read('tools/security-rotation-release-17039.sql');
  const stage = read('tools/shift-report-mo-hotfix-170-smoke.mjs');
  const { version, build, testProject, productionProject } = RELEASE;
  const mustInclude = [
    [index, `var build='${build}';`, 'HTML build'],
    [config, `window.RAK_RELEASE_VERSION = "${version}";`, 'config release'],
    [config, `window.RAK_TEST_DISPLAY_VERSION = "${version}";`, 'display version'],
    [config, `window.RAK_PWA_BUILD = "${build}";`, 'PWA build'],
    [app, `const RAK_DEV_UPDATE_BUILD = "${build}";`, 'app build'],
    [sw, `const CACHE_VERSION = 'v${version}';`, 'SW cache'],
    [sw, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${version}';`, 'SW display'],
    [sw, `const DEVELOPMENT_BUILD_ID = '${build}';`, 'SW build'],
    [sw, "const SW_APP_VERSION = '1.7.0';", 'technical SW version'],
    [config, `https://${testProject}.supabase.co`, 'test database URL'],
    [policy, 'OS_ONLY_POLICY_20260919', 'OS-only policy'],
    [privacy, '24 měsíců', 'honest privacy scope'],
    [sql, 'SET LOCAL ROLE anon;', 'anonymous regression'],
    [sql, 'ROLLBACK;', 'rollback-only regression'],
    [stage, 'RAK_17039_TWO_PASS_GUARD', 'second-pass build guard']
  ];
  for (const [content, token, label] of mustInclude) {
    assert(content.includes(token), `Release gate: ${label} mismatch`);
  }
  assert(!config.includes(productionProject), 'Release gate: production Supabase in development config');
  assert.equal(packageJson.version, '1.7.0', 'Technical package version must remain 1.7.0');
  // The living roadmap is validated by IDs here and by counts/percentages in an
  // independent CI contract; historic releases must never demand frozen prose.
  const ids = verifyRoadmapSummary(plan);
  return Object.freeze({ version, build, taskCount: ids.length, testProject });
}
