import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('development waits for explicit post-CI deployment while main policy is untouched', () => {
  const config = JSON.parse(read('vercel.json'));
  assert.deepEqual(config.git?.deploymentEnabled, {development:false},
    'only development automatic Git deployments may be disabled');
  assert.equal(Object.hasOwn(config.git.deploymentEnabled, 'main'), false,
    'development must not change the main deployment policy');
  assert.equal(config.ignoreCommand, 'node tools/vercel-ignore-build.mjs',
    'verified documentation-only skip policy remains active for explicit deployments');
});

test('the exact development CI runs the deploy-gate contract before full validation', () => {
  const workflow = read('.github/workflows/rak-development-validation.yml');
  assert.match(workflow, /push:\s*\n\s*branches: \[development\]/);
  assert(workflow.includes('tools/development-deploy-gate.test.mjs'),
    'CI must fail if the explicit post-success deployment gate is removed');
  assert(workflow.includes('npm run vercel-build\n          npm run vercel-build'),
    'two complete builds remain mandatory before an explicit deployment');
  assert(!/\bvercel\s+(?:deploy|--prod)\b/.test(workflow),
    'this validation job must never deploy before all later gates finish');
});
