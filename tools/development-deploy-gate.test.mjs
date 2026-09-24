import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('development waits for an explicit post-CI preview while main policy is untouched',()=>{
  const config=JSON.parse(read('vercel.json'));
  assert.deepEqual(config.git?.deploymentEnabled,{development:false},'only development automatic Git deployments may be disabled');
  assert.equal(Object.hasOwn(config.git.deploymentEnabled,'main'),false,'development must not change the main deployment policy');
  assert.equal(config.ignoreCommand,'node tools/vercel-ignore-build.mjs','fail-closed non-runtime skip policy remains active');
});

test('verify job cannot deploy and release job depends on complete green verification',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const marker='\n  release-preview:';
  assert(workflow.includes(marker),'post-success release job missing');
  const [verify,release]=workflow.split(marker);
  assert.match(workflow,/push:\s*\n\s*branches: \[development\]/);
  assert(verify.includes('tools/development-deploy-gate.test.mjs'));
  assert(verify.includes('tools/release-evidence.test.mjs'));
  assert(verify.includes('npm run vercel-build\n          npm run vercel-build'),'two complete builds remain mandatory');
  assert(!/\bvercel\s+(?:deploy|--prod)\b/.test(verify),'verify job must never deploy');
  assert.match(release,/needs: verify/);
  assert.match(release,/github\.event_name == 'push'.*github\.ref == 'refs\/heads\/development'.*needs\.verify\.result == 'success'/);
  assert(release.includes('ref: ${{ github.sha }}'),'release checkout must use exact green SHA');
  assert(release.includes('VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN_2 }}'),'encrypted Vercel credential missing');
  assert(release.includes('vercel@59.24.0'),'Vercel CLI must be pinned');
  assert(release.includes('vercel deploy --prebuilt --yes --target=preview'),'deployment must use verified prebuilt preview target');
  assert(release.includes('vercel curl / --deployment "$DEPLOYMENT_ID"'),'protected HTTP verification must target the immutable deployment');
  assert(!release.split(String.fromCharCode(10)).filter(line=>line.includes('vercel curl ')).some(line=>line.includes('--token')),'vercel curl must consume the masked VERCEL_TOKEN environment variable instead of forwarding a token flag');
  assert(!/--prod\b|--target=production/.test(release),'production deployment is prohibited');
});

test('release job proves exact SHA, HTTP TEST isolation, rollback and durable evidence',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const release=workflow.split('\n  release-preview:')[1];
  assert((release.match(/git\/ref\/heads\/development/g)||[]).length>=3,'development HEAD must be rechecked around deployment and aliasing');
  assert(release.includes('--meta githubCommitSha="$GITHUB_SHA"'));
  assert(release.includes('vercel api "/v13/deployments/$STABLE_ALIAS" --raw'),'release evidence must use complete read-only deployment API metadata');
  assert(release.includes('vercel alias set "$DEPLOYMENT_ID" "$STABLE_ALIAS"'));
  assert(release.includes("scope:'alias-protection-override',action:'create'"),'stable development alias must explicitly bypass Vercel SSO without disabling project protection');
  assert(release.includes('/protection-bypass?teamId='),'alias-specific protection API is required');
  assert(release.includes('Verify the stable development alias is publicly usable without Vercel auth'));
  assert(release.includes('curl --silent --show-error --max-redirs 0'),'stable alias must be checked anonymously without Vercel credentials');
  assert(release.includes('/supabase-vendor-2.110.7.js'),'public verification must cover the self-hosted Supabase SDK');
  assert(release.includes('fetch_public "/app.js?v=$DISPLAY_VERSION" "app"'),'public verification must cover the current application runtime');
  assert(release.includes("metadata.displayVersion"),'public runtime verification must derive the version from release metadata');
  assert(release.includes('test -s ".vercel/output/static/supabase-vendor-2.110.7.js"'),'prebuilt output must contain the self-hosted Supabase SDK before deployment');
  assert(release.includes('/rak-release-metadata.js'));
  assert(release.includes('/supabase-config.js'));
  assert(release.includes('node tools/release-evidence.mjs assemble'));
  assert(release.includes('rak-release-evidence-${{ github.sha }}'));
  assert(release.includes('retention-days: 90'));
  assert(release.includes('production-before.json')&&release.includes('production-after.json'));
});
