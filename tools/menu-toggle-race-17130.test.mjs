import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
// Keep source-contract checks identical on Windows and Linux. Git may expose the
// working tree with CRLF locally even though CI reads LF from the repository.
const read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n?/g,'\n');

test('1.7.130 menu-toggle race milestone remains active in successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.130');
  assert(read('CHANGELOG.md').includes('## RaK 1.7.130 (development)'));
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
});

test('first More render never delegates to legacy show-only toggleAppMenu',()=>{
  const nav=read('app-bottom-nav.js');
  const start=nav.indexOf('function openRakEarlyMenuShell()');
  const end=nav.indexOf('\n\nfunction installBottomNavBindings()',start);
  assert(start>=0&&end>start);
  const body=nav.slice(start,end);
  assert(body.includes('RAK_17130_EARLY_MENU_OWNS_FIRST_RENDER'));
  assert(body.includes('rakPopulateEarlyMenuLocalRoot(page);'));
  assert(!body.includes("if (typeof toggleAppMenu === 'function')"));
  assert(body.indexOf('rakPopulateEarlyMenuLocalRoot(page);')<body.indexOf("window.rakEnsureFeature('menu')"));
});

test('legacy startup and post-lazy wrappers both render menu content',()=>{
  const runtime=read('rak-runtime-stability.js');
  const app=read('app.js');
  const runtimeStart=runtime.indexOf('function installMoreSinglePass()');
  const runtimeEnd=runtime.indexOf('\n\n  function scanNode',runtimeStart);
  const runtimeBody=runtime.slice(runtimeStart,runtimeEnd);
  assert(runtimeBody.includes('RAK_17130_NO_EMPTY_MORE_RACE'));
  assert(runtimeBody.includes("if (typeof openRakEarlyMenuShell === 'function')"));
  const earlyCall=runtimeBody.indexOf('openRakEarlyMenuShell();');
  const fullMenuBranch=runtimeBody.indexOf("if (typeof openAppMenu === 'function')");
  assert(earlyCall>=0&&fullMenuBranch>earlyCall,'early renderer branch must precede full-menu fallback');

  const reapplyStart=app.indexOf('function reapplyMoreSinglePassAfterLazyMenu()');
  const reapplyEnd=app.indexOf('\n\n  function activateRemoteSync()',reapplyStart);
  const reapply=app.slice(reapplyStart,reapplyEnd);
  assert(reapply.includes('RAK_17130_FULL_MENU_RENDER_AFTER_LAZY'));
  assert(reapply.includes("showPage('menu');"));
  assert(reapply.includes("openAppMenu('menu')"));
});

test('real Chromium fixture reproduces the physical stale-toggle race before sync',()=>{
  const browser=read('tools/browser-offline-17052.mjs');
  assert(browser.includes('RAK_17130_MORE_TOGGLE_RACE_GATE'));
  assert(browser.includes('window.__rak17130LegacyToggleCalls=0'));
  assert(browser.includes('early More delegated to legacy show-only toggle'));
  assert(browser.includes("['Nastavení','O aplikaci','Kontakt','Pošli mi chybu']"));
  assert(browser.includes('moreState.sync,false'));
});

test('1.7.130 root-cause gate is mandatory',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/menu-toggle-race-17130.test.mjs'));
  assert(workflow.includes('tools/menu-toggle-race-17130.test.mjs'));
  assert(workflow.includes('rak-170130-isolated-build-'+'$'+'{{ github.sha }}'));
});
