import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity,RELEASE_METADATA} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('1.7.124 has one unified runtime identity',()=>{
  assert.equal(RELEASE_METADATA.displayVersion,'1.7.124');
  const metadata=assertCurrentReleaseIdentity(read,'1.7.124');
  assert.equal(metadata.buildId,'v1.7.124-admin-password-six1');
  assert.equal(JSON.parse(read('package.json')).version,'1.7.124');
  assert(read('index.html').includes('rak-runtime-diagnostics.js?v=1.7.124'));
  assert(read('index.html').includes('app.js?v=1.7.124'));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.124'"));
});

test('1.7.124 uses six-character minimum in client and TEST edge source',()=>{
  const readiness=read('module-readiness.js');
  const unlock=read('app-admin-unlock.js');
  const menu=read('app-menu.js');
  const edge=read('supabase/functions/rak-admin-users/index.ts');
  assert(readiness.includes('const MIN_PASSWORD_LENGTH = 6;'));
  assert.equal((unlock.match(/newPassword\.length < 6/g)||[]).length,2);
  assert(menu.includes('alespoň 6 znaků'));
  assert.equal((edge.match(/newPassword\.length < 6/g)||[]).length,2);
  assert.equal((edge.match(/password\.length < 6/g)||[]).length,1);
  assert(!edge.includes('newPassword.length < 12'));
  assert(!edge.includes('password.length < 12'));
});

test('1.7.124 password regression and evidence gates are wired into CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const name of ['tools/admin-password-min-17124.test.mjs','tools/release-gate-17124.test.mjs']){
    assert(pkg.scripts.check.includes(name),name);
    assert(workflow.includes(name),name);
  }
  assert(workflow.includes('rak-170124-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(workflow.includes('rak-170123-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(read('CHANGELOG.md').startsWith('## RaK 1.7.124 (development)'));
});
