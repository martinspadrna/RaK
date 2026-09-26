import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity,RELEASE_METADATA} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('1.7.126 has one unified runtime identity',()=>{
  assert.equal(RELEASE_METADATA.displayVersion,'1.7.126');
  const metadata=assertCurrentReleaseIdentity(read,'1.7.126');
  assert.equal(metadata.buildId,'v1.7.126-menu-role-ready1');
  assert.equal(JSON.parse(read('package.json')).version,'1.7.126');
  assert(read('index.html').includes('rak-runtime-diagnostics.js?v=1.7.126'));
  assert(read('index.html').includes('app.js?v=1.7.126'));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.126'"));
});

test('1.7.126 keeps More local-first and privileged role rendering fail-closed',()=>{
  const routing=read('rak-feature-routing.js');
  const menu=read('app-menu.js');
  assert(routing.includes("if (key === 'menu') return window.rakEnsureFeature('menu');"));
  assert(routing.includes("if (key === 'admin') return window.rakEnsureFeature('sync').then(() => window.rakEnsureFeature('admin'));"));
  assert(menu.includes("void appMenuRefreshRoleAccess('menu-open');"));
  assert(menu.includes('data-menu-action="role-refresh"'));
  assert(menu.includes("window.addEventListener('rak-admin-access-changed', appMenuRerenderVisibleRoot)"));
});

test('1.7.126 role-ready regression and evidence gates are wired into CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const name of ['tools/menu-role-ready-17126.test.mjs','tools/release-gate-17126.test.mjs']){
    assert(pkg.scripts.check.includes(name),name);
    assert(workflow.includes(name),name);
  }
  assert(workflow.includes('rak-170126-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(workflow.includes('rak-170125-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(read('CHANGELOG.md').startsWith('## RaK 1.7.126 (development)'));
});
