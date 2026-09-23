import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.81 identifies the root-level Supabase asset release',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.81');
  assert(metadata.buildId.startsWith('v'+metadata.displayVersion+'-'));
});

test('Supabase SDK is emitted at the static output root and all runtime references match',()=>{
  const build=read('tools/canonical-build.mjs');
  const index=read('index.html');
  const app=read('app.js');
  const sw=read('sw.js');
  assert(build.includes("SUPABASE_VENDOR_RELATIVE='supabase-vendor-2.110.7.js'"));
  assert(index.includes('src="supabase-vendor-2.110.7.js"'));
  assert(app.includes("RAK_SUPABASE_SDK_URL = 'supabase-vendor-2.110.7.js'"));
  assert(sw.includes("'./supabase-vendor-2.110.7.js'"));
  for(const source of [build,index,app,sw]) assert(!source.includes('vendor/supabase-2.110.7.js'));
});

test('release pipeline proves the root asset exists before deploy and is anonymously public after aliasing',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  assert(workflow.includes('test -s ".vercel/output/static/supabase-vendor-2.110.7.js"'));
  assert(workflow.includes('fetch_public "/supabase-vendor-2.110.7.js" "vendor"'));
  assert(workflow.includes("scope:'alias-protection-override',action:'create'"));
  assert(workflow.includes('curl --silent --show-error --max-redirs 0'));
});

test('release evidence cannot pass without the self-hosted Supabase SDK in the canonical build',()=>{
  const evidence=read('tools/release-evidence.mjs');
  assert(evidence.includes("'supabase-vendor-2.110.7.js'"));
  const pkg=JSON.parse(read('package.json'));
  assert(pkg.scripts.check.includes('tools/release-gate-17081.test.mjs'));
});
