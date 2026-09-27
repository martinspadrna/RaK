import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('1.7.134 Admin first-open release identity is unified',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.134');
  assert(/^1\.7\.\d+$/.test(metadata.displayVersion));
  assert(read('CHANGELOG.md').includes('## RaK 1.7.134 (development)'));
  assert(read('app-menu-admin-shell.js').includes('RAK_17134_LOCAL_ADMIN_ROOT'));
});

test('secure Admin root is a local shell while full tools preserve sync dependency',()=>{
  const app=read('app.js');
  const shell=app.slice(app.indexOf('const adminShellFeatureFiles'),app.indexOf('const adminFeatureFiles'));
  const full=app.slice(app.indexOf('const adminFeatureFiles'),app.indexOf('const deferredFiles'));
  assert(shell.includes('"app-menu-admin-shell.js"'),'admin-shell must load only the tiny secure root module');
  assert(!shell.includes('"app-menu-admin-renderer.js"'),'admin-shell must have no heavy renderer');
  assert(full.includes('"app-menu-admin-renderer.js"'),'heavy renderer belongs to full Admin only');
  assert.match(app,/"admin-shell":\s*Object\.freeze\(\{\s*files:\s*adminShellFeatureFiles,\s*dependencies:\s*Object\.freeze\(\["menu"\]\)/s);
  assert.match(app,/admin:\s*Object\.freeze\(\{\s*files:\s*adminFeatureFiles,\s*dependencies:\s*Object\.freeze\(\["admin-shell",\s*"sync"\]\)/s);
  const menu=read('app-menu.js');
  const click=menu.slice(menu.indexOf("if (menuAction === 'admin')"),menu.indexOf("if (menuAction === 'admin-machines')"));
  assert(click.includes("window.rakIsFeatureReady('admin-shell')"));
  assert(click.includes('await appMenuWarmAdminShellFeature()'));
  assert(!click.includes('await appMenuWarmAdminFeature()'));
  assert(menu.includes('const canOpen = () => appMenuCanOpenAdminNow();'));
  assert(menu.includes("typeof getAdminSelectedMonthKey === 'function' ? getAdminSelectedMonthKey() : ''"),
    'root Admin click must not require a heavy month-selection helper');
});


test('Admin home is rendered by the already-local menu module before heavy builders',()=>{
  const shellFile=read('app-menu-admin-shell.js');
  const rootStart=shellFile.indexOf('function renderAdminRootMenuBody(body)');
  assert(rootStart>=0);
  const rootBlock=shellFile.slice(rootStart);
  assert(rootBlock.includes("rakAdminCanOpenAdmin"));
  assert(rootBlock.includes('Rychlý přístup'));
  assert(!rootBlock.includes('getAdminRotationMonthKeys'));
  assert(!rootBlock.includes('getAdminSelectedMonthKey'));

  const renderer=read('app-menu-admin-renderer.js');
  const homeBranch=renderer.slice(renderer.indexOf("if (mode === 'home')"),renderer.indexOf('const months = getAdminRotationMonthKeys();'));
  assert(homeBranch.includes('renderAdminRootMenuBody(body)'));
  assert(!homeBranch.includes('buildAdminMachineSettingsTableHtml'));
});

test('local Admin root keeps an independent fail-closed role gate',()=>{
  const shellFile=read('app-menu-admin-shell.js');
  const rootStart=shellFile.indexOf('function renderAdminRootMenuBody(body)');
  const source=shellFile.slice(rootStart);
  const body={dataset:{},innerHTML:'',querySelectorAll(){return [];}};
  const context={
    document:{getElementById(){return null;}},
    app:{},
    escapeHtml(value){return String(value??'');},
    rakAdminCanOpenAdmin(){return false;},
    console
  };
  vm.createContext(context);
  vm.runInContext(source,context,{filename:'admin-root-shell.js'});
  context.renderAdminRootMenuBody(body);
  assert(body.innerHTML.includes('Administrace není přístupná.'));
  assert(!body.innerHTML.includes('Rychlý přístup'));
});

test('Admin warmup is role-driven and ordinary local-first surfaces stay independent',()=>{
  const routing=read('rak-feature-routing.js');
  assert(routing.includes('function canWarmVerifiedAdminCode()'));
  assert(routing.includes('if (warmupStarted || !canWarmVerifiedAdminCode()) return;'));
  assert(routing.includes("window.rakEnsureFeature('admin-shell')"));
  assert(routing.includes("window.addEventListener('rak-admin-access-changed', scheduleVerifiedAdminWarmup)"));
  const warmupBlock=routing.slice(routing.indexOf('function startBackgroundWarmup()'),routing.indexOf('function scheduleVerifiedAdminWarmup()'));
  assert(!warmupBlock.includes("ensureFeatureWithAuthOrder('admin')"),'verified-role warmup must not pull the heavy Admin feature');
  assert(routing.includes("if (key === 'admin') return window.rakEnsureFeature('sync').then(() => window.rakEnsureFeature('admin'));"));
  const menu=read('app-menu.js');
  assert(!menu.includes('appMenuScheduleAdminToolsWarmup'),'Admin root/menu must not schedule heavy tools without a user subsection request');
  const sw=read('sw.js');
  const warm=sw.slice(sw.indexOf('const WARM_START = ['),sw.indexOf('const OFFLINE_REQUIRED'));
  const offline=sw.slice(sw.indexOf('const OFFLINE_REQUIRED'),sw.indexOf('const STATIC_EXT'));
  const currentVersion=JSON.parse(read('package.json')).version;
  assert(warm.includes('app-menu-admin-shell.js?v='+currentVersion));
  assert(warm.includes('app-menu-admin-renderer.js?v='+currentVersion));
  assert(offline.includes('app-menu-admin-shell.js?v='+currentVersion));
  assert(offline.includes('app-menu-admin-renderer.js?v='+currentVersion));
  assert(read('app-menu-admin-shell.js').includes('RAK_17134_LOCAL_ADMIN_ROOT'));
  assert(!read('app-menu.js').includes('function renderAdminRootMenuBody(body)'),'ordinary menu must not parse Admin root markup during startup');
  assert(read('app-menu-admin-shell.js').length < 12000,'Admin shell must stay small');
  const app=read('app.js');
  assert(app.includes('script.async = key === "app-menu-admin-shell.js"'),'Admin shell must not queue behind a pending ordered sync script');
  const localStart=app.indexOf('RAK_17084_LOCAL_FIRST_BOOT: navigator.onLine');
  const localEnd=app.indexOf('const startupReadyAt',localStart);
  const local=app.slice(localStart,localEnd);
  assert(!local.includes("ensureFeature('admin-shell')"));
  assert(!local.includes("ensureFeature('admin')"));
});

test('real Chromium gate proves Admin root opens while sync and full Admin are pending',()=>{
  const browser=read('tools/browser-offline-17052.mjs');
  assert(browser.includes('RAK_17134_ADMIN_FIRST_OPEN_GATE'));
  assert(browser.includes("shell:true,full:false,sync:false,view:'home'"));
  assert(browser.includes('Admin root still waited for full tools/sync'));
  assert(browser.includes('full Admin auto-warmed after sync without a tool request'));
  assert(browser.includes('adminRootMs<=900'));
});

test('1.7.134 gate and fail-closed evidence are mandatory in CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/admin-first-open-17134.test.mjs'));
  assert(workflow.includes('tools/admin-first-open-17134.test.mjs'));
  const at=workflow.indexOf('name: rak-170134-isolated-build-'+'$'+'{{ github.sha }}');
  assert(at>=0);
  const block=workflow.slice(at,at+420);
  assert(block.includes('include-hidden-files: true'));
  assert(block.includes('if-no-files-found: error'));
});
