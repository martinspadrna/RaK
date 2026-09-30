import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('production release is manual, exact-SHA and post-CI only',()=>{
  const workflow=read('.github/workflows/rak-production-release.yml');
  assert.match(workflow,/workflow_dispatch:/);
  assert(!/\n\s+push:|\n\s+pull_request:/.test(workflow),'production release must never auto-trigger');
  for(const marker of ['expected_sha:','expected_development_sha:','Require a successful exact-SHA validation run','rak-ci-proof-$EXPECTED_SHA','verify-ci'])assert(workflow.includes(marker),marker);
  assert(workflow.indexOf('Verify downloaded CI and two-build proof')<workflow.indexOf('Create one unaliased production candidate'),'deployment must follow exact green CI proof');
  assert((workflow.match(/git\/ref\/heads\/development/g)||[]).length>=3,'development HEAD must be rechecked before production writes');
  assert((workflow.match(/git\/ref\/heads\/main/g)||[]).length>=3,'main HEAD must be rechecked before production writes');
});

test('candidate is isolated, production-bound and aliased only after HTTP proof',()=>{
  const workflow=read('.github/workflows/rak-production-release.yml');
  for(const marker of ['vercel@59.24.0','vercel build --yes --prod','--prod --skip-domain','githubCommitSha="$EXPECTED_SHA"','http-check immutable-production','bkqamcbkiwumsvelahxr','cgshssdjgzzuprlwnabl'])assert(workflow.includes(marker),marker);
  assert(workflow.indexOf('http-check immutable-production')<workflow.indexOf('vercel alias set "$DEPLOYMENT_ID" "$PRODUCTION_ALIAS"'),'alias moved before immutable HTTP verification');
  assert(workflow.includes('testProjectAbsentFromOutput:true'));
  assert(workflow.includes("if: failure() && env.ALIAS_ATTEMPTED == 'true'"),'post-alias failure must restore rollback target');
  assert(workflow.includes('rak-production-release-evidence-${{ inputs.expected_sha }}'));
  assert(workflow.includes('retention-days: 90'));
  assert(!workflow.includes('supabase migration'),'release workflow must not hide database mutation');
});

test('both Git-integrated protected branches have automatic Vercel deployments disabled',()=>{
  const config=JSON.parse(read('vercel.json'));
  assert.deepEqual(config.git?.deploymentEnabled,{development:false,main:false});
});
