import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('the frozen 1.7.69 rewrite chain is retained only as a compatibility compiler',()=>{
  const chain=read('tools/development-version-17048.mjs');
  assert(chain.includes("development-version-17069.mjs"));
  assert(!chain.includes("development-version-17070.mjs"));
  assert(!fs.existsSync(new URL('./development-version-17070.mjs',import.meta.url)),'new rewrite script is forbidden');
  const pkg=JSON.parse(read('package.json'));
  assert.equal(pkg.scripts['vercel-build'],'node tools/canonical-build.mjs build');
  assert(pkg.scripts['legacy:vercel-build'].includes('tools/release-170.mjs pre'));
});

test('strict historical, browser, HTTP and repeat-build gates remain active',()=>{
  const ci=read('.github/workflows/rak-development-validation.yml');
  for(const command of [
    'npm run vercel-build\n          npm run vercel-build',
    'node --test tools/release-gate-17068.test.mjs',
    'node --test tools/release-gate-17069.test.mjs',
    'node tools/browser-offline-17052.mjs',
    'node tools/browser-ui-parity-17104.mjs',
    'node tools/browser-privacy-diagnostics-17105.mjs',
    'node tools/performance-parity-17069.mjs',
    'node tools/quality-thresholds-17104.mjs',
    'node --test tools/ui-parity-contract.test.mjs',
    'node tools/http-anon-audit-17050.mjs',
    'git diff --exit-code HEAD --',
    'test -f .rak-canonical-build/verified.json'
  ])assert(ci.includes(command),'missing safety check: '+command);
});
