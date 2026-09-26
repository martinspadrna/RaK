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
  const appTag=index.indexOf('<script src="app.js?v=1.7.127"></script>');
  assert(nav>=0&&appTag>nav,'bottom nav must exist before app bootstrap executes');
  assert(!index.includes('<script src="supabase-vendor-2.110.7.js"'),'Supabase SDK must not parser-block startup');
  const foundation=app.indexOf('RAK_17127_INTERACTION_FOUNDATION');
  const foundationLoad=app.indexOf('for (const file of interactionCoreFiles) await loadScript(file);');
  const bind=app.indexOf("markRakFirstInteractive('startup-shell-bound')",foundationLoad);
  const critical=app.indexOf('for (const file of criticalFiles) await loadScript(file);');
  const startup=app.indexOf('await loadFiles(startupFiles);',critical);
  assert(foundation>=0&&foundationLoad>foundation&&bind>foundationLoad&&critical>bind&&startup>critical);
});

test('Supabase SDK remains local and integrity-pinned but loads only on demand',()=>{
  assert(app.includes("const RAK_SUPABASE_SDK_URL = 'supabase-vendor-2.110.7.js'"));
  assert(app.includes('script.integrity = RAK_SUPABASE_SDK_INTEGRITY'));
  assert(profile.includes("await window.rakEnsureSupabaseSdk({ force: true })"));
  assert(access.includes("await window.rakEnsureSupabaseSdk({ force: true })"));
  assert(read('sw.js').includes("'./supabase-vendor-2.110.7.js'"));
});

test('Admin click gets immediate menu-owned feedback and root does not await machine settings',()=>{
  assert(!routing.includes("source.closest('#appMenuBody [data-menu-action=\"admin\"]')"));
  assert(menu.includes("'<div class=\"appMenuText\">Načítám administraci…</div>'"));
  assert(menu.includes('if (verifiedRole) void appMenuWarmAdminFeature();'));
  const adminRoot=menu.slice(menu.indexOf("} else if (v === 'admin') {"),menu.indexOf("} else if (v === 'admin-machines')"));
  assert(adminRoot.indexOf("renderAdminMenuBody(body, 'home');")>=0);
  assert(adminRoot.indexOf("renderAdminMenuBody(body, 'home');") < adminRoot.indexOf('loadAdminMachineSettingsFromSupabase()'));
  assert(!adminRoot.includes('await loadAdminMachineSettingsFromSupabase()'));
});

test('real Chromium gate proves a physical navigation completes before delayed startupReady',()=>{
  assert(browser.includes('RAK_17127_REAL_TAP_GATE'));
  assert(browser.includes("pathname==='/dashboard.js'&&delayStartupDashboard"));
  assert(browser.includes("document.querySelector('#kalkulacky')?.classList.contains('active')===true"));
  assert(browser.includes("assert(earlyTapMs<=1200"));
  assert(browser.includes("navigation completed only after startupReady"));
});
