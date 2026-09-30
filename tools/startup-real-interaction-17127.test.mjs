import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const index=read('index.html');
const app=read('app.js');
const profile=read('rak-user-profile.js');
const access=read('rak-account-access.js');
const routing=read('rak-feature-routing.js');
const menu=read('app-menu.js');
const browser=read('tools/browser-offline-17052.mjs');

test('real interaction foundation binds before auth/dashboard startup',()=>{
  const nav=index.indexOf('<nav class="bottomNav"');
  const currentVersion=JSON.parse(read('package.json')).version;
  const appScript='<script defer src="app.js?v='+currentVersion+'"></script>';
  const appTag=index.indexOf(appScript);
  assert(nav>=0&&appTag>nav,'bottom nav must exist before app bootstrap executes');
  assert(index.includes(appScript),'app bootstrap must not block parser/CSS discovery');
  assert(!index.includes('<script src="supabase-vendor-2.110.7.js"'),'Supabase SDK must not parser-block startup');
  const foundation=app.indexOf('RAK_17127_INTERACTION_FOUNDATION');
  const criticalStart=app.indexOf('const criticalLoadPromise = (async () => {');
  const foundationLoad=app.indexOf('for (const file of interactionCoreFiles) await loadScript(file);');
  const bind=app.indexOf("markRakFirstInteractive('startup-shell-bound')",foundationLoad);
  const criticalAwait=app.indexOf('await criticalLoadPromise;',bind);
  const startup=app.indexOf('await loadFiles(startupFiles);',criticalAwait);
  assert(foundation>=0&&criticalStart>foundation&&foundationLoad>criticalStart&&bind>foundationLoad&&criticalAwait>bind&&startup>criticalAwait);
  assert(!app.includes("void ensureFeature('menu').catch((err) => console.warn('Early menu warmup failed', err))"));
});

test('Supabase SDK remains local and integrity-pinned but loads only on demand',()=>{
  assert(app.includes("const RAK_SUPABASE_SDK_URL = 'supabase-vendor-2.110.7.js'"));
  assert(app.includes('script.integrity = RAK_SUPABASE_SDK_INTEGRITY'));
  assert(profile.includes("await window.rakEnsureSupabaseSdk({ force: true })"));
  assert(access.includes("await window.rakEnsureSupabaseSdk({ force: true })"));
  assert(read('sw.js').includes("'./supabase-vendor-2.110.7.js'"));
});

test('Admin click gets immediate menu-owned feedback and secure root is split from heavy tools',()=>{
  assert(!routing.includes("source.closest('#appMenuBody [data-menu-action=\"admin\"]')"));
  assert(menu.includes('Načítám administraci…'));
  assert(menu.includes('void appMenuWarmAdminShellFeature();'));
  const click=menu.slice(menu.indexOf("if (menuAction === 'admin')"),menu.indexOf("if (menuAction === 'admin-machines')"));
  assert(click.includes("window.rakIsFeatureReady('admin-shell')"));
  assert(click.includes('await appMenuWarmAdminShellFeature()'));
  assert(!click.includes('await appMenuWarmAdminFeature()'));
  const adminRoot=menu.slice(menu.indexOf("} else if (v === 'admin') {"),menu.indexOf("} else if (v === 'admin-machines')"));
  assert(adminRoot.indexOf("renderAdminRootMenuBody(body);")>=0);
  assert(!adminRoot.includes('appMenuScheduleAdminToolsWarmup();'),'Admin root must not auto-warm heavy tools');
  assert(!adminRoot.includes('await loadAdminMachineSettingsFromSupabase()'));
});

test('person QR payload no longer contributes to startup parse tail but remains offline-safe',()=>{
  const qr=read('qr.js');
  const data=read('rak-qr-data.js');
  const sw=read('sw.js');
  assert(qr.includes('RAK_17127_QR_PAYLOAD_LAZY'));
  assert(!qr.includes('const PERSON_QR_CODES = {'));
  assert(data.includes('window.PERSON_QR_CODES = {'));
  assert(data.length > qr.length,'QR payload should be the large lazy half');
  assert(sw.includes("'./rak-qr-data.js'"));
  assert(read('export.js').includes('"rak-qr-data.js"'));
  assert(read('rak-complete-backup.js').includes('"rak-qr-data.js"'));
});

test('capture router preloads bottom-nav features without swallowing the user click',()=>{
  const routing=read('rak-feature-routing.js');
  const bottom=read('app-bottom-nav.js');
  assert(routing.includes('RAK_17127_NAVIGATE_FIRST'));
  const navigateFirst=routing.slice(routing.indexOf('RAK_17127_NAVIGATE_FIRST'),routing.indexOf("event.preventDefault();",routing.indexOf('RAK_17127_NAVIGATE_FIRST')));
  assert(navigateFirst.includes("el.closest('nav.bottomNav')"));
  assert(navigateFirst.includes('return;'));
  assert(bottom.includes('function openRakEarlyMenuShell()'));
  assert(bottom.includes('function rakEarlyMenuLocalRootHtml()'));
  for (const label of ['Nastavení','O aplikaci','Kontakt','Pošli mi chybu']) assert(bottom.includes(label),label);
  assert(bottom.includes("menu: () => { openRakEarlyMenuShell(); }"));
});

test('non-active nav icons do not compete with render-blocking CSS for first paint',()=>{
  for(const icon of ['rotace-gray.png','rotace-green.png','kalkulacky-gray.png','kalkulacky-green.png']){
    const marker='src="assets/nav-icons/'+icon+'"';
    const at=index.indexOf(marker);
    assert(at>=0,icon);
    assert(index.slice(at,at+180).includes('fetchpriority="low"'),icon+' must stay low priority');
  }
  assert(index.includes('src="assets/nav-icons/home-green.png"'));
});

test('real Chromium gate proves a physical navigation completes before delayed startupReady',()=>{
  assert(browser.includes('RAK_17127_REAL_TAP_GATE'));
  assert(browser.includes("pathname==='/dashboard.js'&&delayStartupDashboard"));
  assert(browser.includes("document.querySelector('#kalkulacky')?.classList.contains('active')===true"));
  assert(browser.includes("assert(earlyTapMs<=1200"));
  assert(browser.includes("navigation completed only after startupReady"));
  assert(browser.includes('RAK_17130_MORE_TOGGLE_RACE_GATE'));
  assert(browser.includes("[17130-more-toggle-race] local More waited for sync feature"));
  assert(browser.includes("['Nastavení','O aplikaci','Kontakt','Pošli mi chybu']"));
});
