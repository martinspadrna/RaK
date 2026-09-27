import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('1.7.133 Rotation to More cleanup milestone remains active in successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.133');
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
  assert(read('CHANGELOG.md').includes('## RaK 1.7.133 (development)'));
});

test('local-first More tears down Rotation names dock before hiding pages',()=>{
  const nav=read('app-bottom-nav.js');
  const start=nav.indexOf('function openRakEarlyMenuShell()');
  const end=nav.indexOf('function installBottomNavBindings()',start);
  const block=nav.slice(start,end);
  const cleanup=block.indexOf("setRotaceNamesDockPortalActive(false, 'openRakEarlyMenuShell')");
  const hidePages=block.indexOf("document.querySelectorAll('.page').forEach");
  assert(start>=0&&end>start);
  assert(cleanup>=0,'early More must explicitly clean the Rotation dock portal');
  assert(hidePages>cleanup,'dock cleanup must happen before Rotace loses .active');
  assert(block.includes('RAK_17133_ROTACE_MENU_PORTAL_CLEANUP'));
  assert(block.includes("classList.remove('rakRotaceDockSettling', 'rakRotaceEntering')"));
});

test('real Chromium gate reproduces direct Rotation to More portal leak',()=>{
  const browser=read('tools/browser-offline-17052.mjs');
  assert(browser.includes('RAK_17133_ROTACE_TO_MORE_PORTAL_GATE'));
  assert(browser.includes("portal:'body-fixed',root:true,body:true"));
  assert(browser.includes("parent:'rotaceNamesPanel',portal:'',root:false,body:false"));
  assert(browser.includes('[17133-rotace-more] PASS direct Rotation -> More cleans body-fixed names dock'));
});

test('1.7.133 gate and evidence are wired fail-closed',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/rotation-menu-transition-17133.test.mjs'));
  assert(workflow.includes('tools/rotation-menu-transition-17133.test.mjs'));
  const at=workflow.indexOf('name: rak-170133-isolated-build-'+'$'+'{{ github.sha }}');
  assert(at>=0);
  const block=workflow.slice(at,at+420);
  assert(block.includes('include-hidden-files: true'));
  assert(block.includes('if-no-files-found: error'));
});
