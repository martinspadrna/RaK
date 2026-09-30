import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('1.7.124 remains a historical milestone while successors keep unified identity',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.124');
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
  assert(read('CHANGELOG.md').includes('## RaK 1.7.124 (development)'));
});

test('1.7.124 six-character admin password policy remains present in successors',()=>{
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

test('1.7.124 regression gate remains wired after successor releases',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const name of ['tools/admin-password-min-17124.test.mjs','tools/release-gate-17124.test.mjs']){
    assert(pkg.scripts.check.includes(name),name);
    assert(workflow.includes(name),name);
  }
  assert(/rak-1701\d{2}-isolated-build-/.test(workflow));
  assert(read('CHANGELOG.md').includes('## RaK 1.7.124 (development)'));
});
