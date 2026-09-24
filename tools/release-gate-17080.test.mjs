import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.80 identifies offline boot and reconnect hardening',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.80');
  assert(metadata.buildId.startsWith('v'+metadata.displayVersion+'-'));
});

test('offline boot restores persisted Rotation before startup is declared ready',()=>{
  const app=read('app.js');
  if(app.includes('RAK_17084_LOCAL_FIRST_BOOT')){
    const restore=app.slice(app.indexOf('RAK_17084_LOCAL_FIRST_BOOT: navigator.onLine'),app.indexOf('const startupReadyAt'));
    assert(restore.includes("await hydrateRakRotationLocalFirst();"));
    assert(restore.includes("await ensureFeature('rotation');"));
    assert(restore.includes('navigator.onLine === false'));
    assert(!restore.includes("await ensureFeature('sync')"));
    assert(!restore.includes('activateRemoteSync()'));
    return;
  }
  assert(app.includes('RAK_17080_OFFLINE_BOOT_RESTORE'));
  const restore=app.slice(app.indexOf('RAK_17080_OFFLINE_BOOT_RESTORE'),app.indexOf('const startupReadyAt'));
  assert(restore.includes("await ensureFeature('sync')"));
  assert(restore.includes('await window.hydrateRakRotationFromOfflineCache'));
  assert(restore.includes('navigator.onLine === false'));
  assert(restore.indexOf('await window.hydrateRakRotationFromOfflineCache') < restore.indexOf('void activateRemoteSync()'));
  assert(!restore.includes('await activateRemoteSync()'));
});

test('Supabase SDK is self-hosted and recoverable without reloading the page',()=>{
  const app=read('app.js');
  const index=read('index.html');
  const sw=read('sw.js');
  const build=read('tools/canonical-build.mjs');
  assert(index.includes('supabase-vendor-2.110.7.js'));
  assert(!index.includes('cdn.jsdelivr.net/npm/@supabase/supabase-js'));
  assert(app.includes("const RAK_SUPABASE_SDK_URL = 'supabase-vendor-2.110.7.js'"));
  assert(sw.includes("'./supabase-vendor-2.110.7.js'"));
  assert(build.includes("SUPABASE_VENDOR_SHA384='hazsLVND17GNLVdtV19te6qbFT2YuLgl8SamcF+QR5eIOC+W4dGKrUNMxU1jH1zD'"));
  assert(build.includes('prepareVendor()'));
  assert(app.includes('function ensureRakSupabaseSdk(options = {})'));
  assert(app.includes('window.rakEnsureSupabaseSdk = ensureRakSupabaseSdk'));
  assert(app.includes("window.addEventListener('online'"));
  assert(app.includes("then(() => ensureFeature('sync'))"));
  assert(app.includes("then(() => activateRemoteSync())"));
  assert(app.includes("supabaseSdkLoadPromise = null"));
  const activation=app.slice(app.indexOf('function activateRemoteSync()'),app.indexOf('function afterFeatureReady'));
  assert(activation.includes('if (remoteSyncActivationPromise) return remoteSyncActivationPromise'));
  assert(activation.includes('if (remoteSyncActivationPromise === run) remoteSyncActivationPromise = null'));
});

test('live refresh waits for SDK and sync feature after network recovery',()=>{
  const pwa=read('app-pwa-connectivity.js');
  const live=pwa.slice(pwa.indexOf('const runLiveRefresh'),pwa.indexOf('const signalStateChange'));
  assert(live.includes('window.rakEnsureSupabaseSdk'));
  assert(live.includes("window.rakEnsureFeature('sync')"));
});

test('browser regression removes ordinary HTTP cache and proves self-hosted SDK plus no-reload recovery',()=>{
  const browser=read('tools/browser-offline-17052.mjs');
  assert(browser.includes("Network.clearBrowserCache"));
  assert(browser.includes('supabaseSdkOffline:true'));
  assert(browser.includes("window.dispatchEvent(new Event('online'))"));
  assert(browser.includes("await until('!!window.supabase?.createClient'"));
  assert(browser.includes('online recovery did not rehydrate Rotation-driven UI without reload'));
});

test('mandatory CI executes the 1.7.80 gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(workflow.includes('node --test tools/release-gate-17080.test.mjs'));
  assert(pkg.scripts.check.includes('tools/release-gate-17080.test.mjs'));
});
