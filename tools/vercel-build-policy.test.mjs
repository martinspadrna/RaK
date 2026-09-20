import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyVercelBuild } from './vercel-build-policy.mjs';
const previous = 'a'.repeat(40);
const classify = (files, branch = 'development') => classifyVercelBuild({ previous, files, branch });

test('verification-only commits do not consume a Vercel build', () => {
  for (const path of [
    'tools/release-gate-17063.test.mjs',
    'tools/vercel-build-policy.test.mjs',
    '.github/workflows/rak-development-validation.yml',
    'RAK_PLAN_13.md',
    'RAK_STABILIZATION_PLAN.md',
    'RAK_PLAN_17068_STATUS.md',
    'tools/rak-v14-ci-helper.mjs'
  ]) assert.equal(classify([path]).skip, true, path);
  assert.equal(classify(['tools/release-gate-17063.test.mjs', 'RAK_PLAN_13.md']).skip, true);
});

test('runtime, build scripts, config and unknown files always require a build', () => {
  for (const path of [
    'app.js', 'supabase-bridge.js', 'tools/development-version-17070.mjs',
    'tools/vercel-ignore-build.mjs', 'tools/vercel-build-policy.mjs',
    'package.json', 'vercel.json', 'api/admin-users.js', 'tools/random-helper.mjs',
    '../outside.test.mjs', 'tools\\fake.test.mjs'
  ]) assert.equal(classify([path]).skip, false, path);
  assert.equal(classify(['RAK_PLAN_13.md', 'app.js']).skip, false);
});

test('missing or invalid diff baseline fails open to a build', () => {
  assert.equal(classifyVercelBuild({ branch: 'development', files: ['RAK_PLAN_13.md'] }).skip, false);
  assert.equal(classifyVercelBuild({ branch: 'development', previous: 'not-a-sha', files: [] }).skip, false);
  assert.equal(classifyVercelBuild({ branch: 'development', previous }).skip, false);
});

test('non-release branches are reserved for CI before merge; main and development runtime still build', () => {
  assert.equal(classifyVercelBuild({ branch: 'stabilization/ci', files: ['app.js'] }).skip, true);
  assert.equal(classifyVercelBuild({ branch: 'development', previous, files: ['app.js'] }).skip, false);
  assert.equal(classifyVercelBuild({ branch: 'main', previous, files: ['app.js'] }).skip, false);
  assert.equal(classifyVercelBuild({ branch: '', previous, files: ['app.js'] }).skip, false);
  assert.equal(classify([], 'main').skip, true);
});
