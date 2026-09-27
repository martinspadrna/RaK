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
  assert.equal(metadata.displayVersion,'1.7.134');
  assert(metadata.buildId.includes('admin-first-open'));
  assert(read('CHANGELOG.md').includes('## RaK 1.7.134 (development)'));
});

test('secure Admin root is a local shell while full tools preserve sync dependency',()=>{
  const app=read('app.js');
  const shell=app.slice(app.indexOf('const adminShellFeatureFiles'),app.indexOf('const adminFeatureFiles'));
  const full=app.slice(app.indexOf('const adminFeatureFiles'),app.indexOf('const deferredFiles'));
  assert(shell.includes('"app-menu-admin-renderer.js"'));
  assert(!full.includes('"app-menu-admin-renderer.js"'),'renderer must not be paid twice by full Admin');
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


test('Admin home renderer short-circuits before heavy subpage builders',()=>{
  const source=read('app-menu-admin-renderer.js');
  const page={dataset:{}};
  const body={dataset:{},innerHTML:'',querySelectorAll(){return [];}};
  const context={
    window:{},
    document:{getElementById(id){return id==='menu'?page:null;}},
    app:{adminCompactOpenGroup:''},
    escapeHtml(value){return String(value??'').replace(/[&<>"']/g,'');},
    rakAdminCanOpenAdmin(){return true;},
    rakAdminCanManageAdmins(){return false;},
    console,
    setTimeout,
    clearTimeout
  };
  vm.createContext(context);
  vm.runInContext(source,context,{filename:'app-menu-admin-renderer.js'});
  context.getAdminRotationMonthKeys=()=>{throw new Error('heavy rotation helper reached');};
  context.getAdminSelectedMonthKey=()=>{throw new Error('heavy month helper reached');};
  context.buildAdminMachineSettingsTableHtml=()=>{throw new Error('heavy machine builder reached');};
  context.renderAdminMenuBody(body,'home');
  assert.equal(body.dataset.adminView,'home');
  assert(body.innerHTML.includes('Administrace'));
  assert(body.innerHTML.includes('Rychlý přístup'));
  assert(source.indexOf('RAK_17134_ADMIN_HOME_SHORT_CIRCUIT')<source.indexOf('const months = getAdminRotationMonthKeys();'));
  assert(!read('app-menu-admin-service.js').includes('function buildAdminMenuSectionHtml('),'tiny root helper must stay in shell renderer');
});

test('renderer keeps an independent secure gate even when shell code is cached',()=>{
  const source=read('app-menu-admin-renderer.js');
  const body={dataset:{},innerHTML:'',querySelectorAll(){return [];}};
  const context={
    window:{},
    document:{getElementById(){return null;}},
    app:{},
    escapeHtml(value){return String(value??'');},
    rakAdminCanOpenAdmin(){return false;},
    console,
    setTimeout,
    clearTimeout
  };
  vm.createContext(context);
  vm.runInContext(source,context,{filename:'app-menu-admin-renderer.js'});
  context.renderAdminMenuBody(body,'home');
  assert(body.innerHTML.includes('Administrace není přístupná.'));
  assert(!body.innerHTML.includes('Rychlý přístup'));
});

test('Admin warmup is role-driven and ordinary local-first surfaces stay independent',()=>{
  const routing=read('rak-feature-routing.js');
  assert(routing.includes('function canWarmVerifiedAdminCode()'));
  assert(routing.includes('if (warmupStarted || !canWarmVerifiedAdminCode()) return;'));
  assert(routing.includes("window.rakEnsureFeature('admin-shell')"));
  assert(routing.includes("window.addEventListener('rak-admin-access-changed', scheduleVerifiedAdminWarmup)"));
  assert(routing.includes("if (key === 'admin') return window.rakEnsureFeature('sync').then(() => window.rakEnsureFeature('admin'));"));
  const sw=read('sw.js');
  const warm=sw.slice(sw.indexOf('const WARM_START = ['),sw.indexOf('const OFFLINE_REQUIRED'));
  const offline=sw.slice(sw.indexOf('const OFFLINE_REQUIRED'),sw.indexOf('const STATIC_EXT'));
  assert(warm.includes('app-menu-admin-renderer.js?v=1.7.134'));
  assert(offline.includes('app-menu-admin-renderer.js?v=1.7.134'));
  const app=read('app.js');
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
