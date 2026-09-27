import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('1.7.132 local-first startup release identity is unified',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.132');
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
  assert(metadata.buildId.includes('local-first-startup'));
  assert(read('CHANGELOG.md').includes('## RaK 1.7.132 (development)'));
});

test('render and sync paths cannot own the user route',()=>{
  const home=read('app-home-boot.js');
  const dashboard=read('dashboard.js');
  const app=read('app.js');
  assert(!home.includes("showPage('home')"),'Home boot must never navigate');
  const force=dashboard.slice(dashboard.indexOf('function forceHomeRefresh()'),dashboard.indexOf('function homeLooksUnpainted()'));
  assert(!force.includes('showPage('),'forceHomeRefresh must be route-neutral');
  assert(force.includes('RAK_17132_ROUTE_NEUTRAL_HOME_REFRESH'));
  const syncBranch=app.slice(app.indexOf("} else if (name === 'sync')"),app.indexOf("} else if (name === 'menu')"));
  assert(!syncBranch.includes('activateRemoteSync'),'loading sync feature must not start network');
  const startSync=app.slice(app.indexOf("const startSync = () => ensureFeature('sync')"),app.indexOf('const runIdleAudits'));
  assert(startSync.includes('.then(() => activateRemoteSync())'),'remote sync needs one explicit post-local owner');
});

test('rotation calculators and ordinary More are unconditional local startup core',()=>{
  const app=read('app.js');
  assert(app.includes('"rak-rotation-local-store.js"'),'local Rotation storage must load before hydration');
  const start=app.indexOf('RAK_17084_LOCAL_FIRST_BOOT: navigator.onLine');
  const end=app.indexOf('const startupReadyAt',start);
  const block=app.slice(start,end);
  assert(start>=0&&end>start);
  assert(block.includes('const rakMustHydrateRotationBeforeReady = true'));
  assert(block.includes('await hydrateRakRotationLocalFirst()'));
  assert(block.includes("await ensureFeature('rotation')"));
  assert(block.includes("ensureFeature('calculators')"));
  assert(block.includes("ensureFeature('menu')"));
  assert(block.includes('window.__rakBootV2LocalReady = true'));
  assert(block.includes('RAK_17132_LOCAL_STORAGE_SPLIT'));
  assert(!block.includes('loadFiles(syncFeatureFiles)'),'remote sync files must not block startupReady');
  assert(!block.includes('activateRemoteSync()'));
});

test('profile appearance remote refresh cannot run before local-ready',()=>{
  const app=read('app.js');
  const start=app.indexOf('const syncActiveAppearance = (source) =>');
  const end=app.indexOf('window.__rakSyncActiveAppearance',start);
  const block=app.slice(start,end);
  assert(block.includes('if (!window.__rakBootV2LocalReady)'));
  const localAt=app.indexOf('window.__rakBootV2LocalReady = true');
  const remoteAt=app.indexOf("window.__rakSyncActiveAppearance('startup-ready')");
  assert(localAt>=0&&remoteAt>localAt);
  assert(!app.includes("window.__rakSyncActiveAppearance('startup')"));
});

test('PWA cache guarantees local calculators and ordinary More modules',()=>{
  const sw=read('sw.js');
  const warm=sw.slice(sw.indexOf('const WARM_START = ['),sw.indexOf('const OFFLINE_REQUIRED'));
  const offline=sw.slice(sw.indexOf('const OFFLINE_REQUIRED'),sw.indexOf('const STATIC_EXT'));
  for(const asset of ['rak-rotation-local-store.js','brusy.js','soustruhy.js','app-menu.js','app-menu-pages.js','app-menu-profile.js','styles-calc-panels.css','styles-calculators-mid.css','styles-menu-polish.css']){
    assert(warm.includes(asset),asset+' missing from warm cache');
    assert(offline.includes(asset),asset+' missing from offline-required cache');
  }
});

test('local Rotation storage is network-free and remains available while sync is deferred',()=>{
  const local=read('rak-rotation-local-store.js');
  const bridge=read('supabase-bridge.js');
  assert(local.includes('root.RakRotationLocalStore = api'));
  assert(local.includes('__rakLocalOnly: true'));
  assert(local.includes('loadBestOfflineRotationState'));
  assert(local.includes('persistRotationOfflineSnapshot'));
  assert(!/fetch\s*\(|\.from\s*\(|\.rpc\s*\(|createClient/.test(local),'local store must contain no remote transport');
  assert(bridge.includes('window.RakRotationLocalStore.persistRotationOfflineSnapshot'));
  assert(bridge.includes('window.RakRotationLocalStore.loadBestOfflineRotationState'));
});

test('first-frame bottom navigation and safe More root are static, not post-sync geometry',()=>{
  const html=read('index.html');
  const nav=read('app-bottom-nav.js');
  const late=read('styles-overrides-legacy-late.css');
  assert(html.includes('id="rak-local-first-nav-geometry"'));
  assert(html.includes('data-rak-static-local-menu-root="1"'));
  assert(html.indexOf('data-rak-static-local-menu-root="1"')<html.indexOf('<nav class="bottomNav"'));
  assert(late.includes('width:32px !important;'));
  const hard=nav.slice(nav.indexOf('function applyBottomNavMoreHardFix()'),nav.indexOf("window.__rakApplyBottomNavMoreHardFix = apply;"));
  assert(hard.includes('RAK_17132_STATIC_NAV_GEOMETRY'));
  assert(!hard.includes('setStyle('),'late More compatibility hook must not resize geometry');
});

test('real Chromium gate covers slow startup, local-ready surfaces and route preservation across sync',()=>{
  const browser=read('tools/browser-offline-17052.mjs');
  assert(browser.includes('RAK_17132_LOCAL_FIRST_ROUTE_GATE'));
  assert(browser.includes('bottom nav geometry changes before hydration'));
  assert(browser.includes('ordinary local surfaces were not complete before remote sync'));
  assert(browser.includes('later sync completion returned user from More to Home'));
  assert(browser.includes("window.rakIsFeatureReady?.('sync')===true"));
});

test('1.7.132 gate and fail-closed evidence are mandatory in CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/local-first-startup-17132.test.mjs'));
  assert(workflow.includes('tools/local-first-startup-17132.test.mjs'));
  const at=workflow.indexOf('name: rak-170132-isolated-build-'+'$'+'{{ github.sha }}');
  assert(at>=0);
  const block=workflow.slice(at,at+420);
  assert(block.includes('include-hidden-files: true'));
  assert(block.includes('if-no-files-found: error'));
});
