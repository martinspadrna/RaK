import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('1.7.126 remains a historical milestone while successors keep unified identity',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.126');
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
  assert(read('CHANGELOG.md').includes('## RaK 1.7.126 (development)'));
});

test('1.7.126 fail-closed role rendering remains present in successors',()=>{
  const menu=read('app-menu.js');
  assert(menu.includes("void appMenuRefreshRoleAccess('menu-open');"));
  assert(menu.includes('data-menu-action="role-refresh"'));
  assert(menu.includes("window.addEventListener('rak-admin-access-changed', appMenuRerenderVisibleRoot)"));
  const show=menu.slice(menu.indexOf('function appMenuShouldShowAdminEntry()'),menu.indexOf('function appMenuShouldOfferRoleRefresh()'));
  assert(show.includes('rakAdminCanOpenShiftReport'));
  assert(!show.includes('rakAdminAccountRequiresPassword'));
});

test('1.7.126 role-ready regression gate remains wired after successor releases',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const name of ['tools/menu-role-ready-17126.test.mjs','tools/release-gate-17126.test.mjs']){
    assert(pkg.scripts.check.includes(name),name);
    assert(workflow.includes(name),name);
  }
  assert(/rak-1701\d{2}-isolated-build-/.test(workflow));
  assert(read('CHANGELOG.md').includes('## RaK 1.7.126 (development)'));
});
