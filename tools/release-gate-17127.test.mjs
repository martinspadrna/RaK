import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity,RELEASE_METADATA} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('1.7.127 has one unified runtime identity',()=>{
  assert.equal(RELEASE_METADATA.displayVersion,'1.7.127');
  const metadata=assertCurrentReleaseIdentity(read,'1.7.127');
  assert.equal(metadata.buildId,'v1.7.127-real-interaction1');
  assert.equal(JSON.parse(read('package.json')).version,'1.7.127');
  assert(read('index.html').includes('app.js?v=1.7.127'));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.127'"));
});

test('1.7.127 keeps privilege checks while removing network work from visible shell',()=>{
  const menu=read('app-menu.js');
  const unlock=read('app-admin-unlock.js');
  assert(menu.includes('appMenuShouldShowAdminEntry()'));
  assert(menu.includes('rakAdminCanOpenAdmin'));
  assert(unlock.includes("['owner', 'admin', 'deputy'].includes(String(app.adminRole || ''))"));
  assert(!read('index.html').includes('<script src="supabase-vendor-2.110.7.js"'));
  assert(read('app.js').includes("void ensureFeature('menu').catch"));
});

test('1.7.127 interaction regression and evidence gates are wired into CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const name of ['tools/startup-real-interaction-17127.test.mjs','tools/release-gate-17127.test.mjs']){
    assert(pkg.scripts.check.includes(name),name);
    assert(workflow.includes(name),name);
  }
  assert(workflow.includes('rak-170127-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(workflow.includes('rak-170126-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(read('CHANGELOG.md').startsWith('## RaK 1.7.127 (development)'));
});
