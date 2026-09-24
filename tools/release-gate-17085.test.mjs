import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.85 unified-version milestone remains active in verified successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.85');
  assert.equal(metadata.technicalVersion,metadata.displayVersion);
  assert.equal(metadata.moduleCacheVersion,metadata.displayVersion);
  assert.equal(metadata.cacheVersion,'v'+metadata.displayVersion);
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
  assert(read('index.html').includes('app.js?v='+metadata.displayVersion));
  const sw=read('sw.js');
  assert(sw.includes("importScripts('./rak-release-metadata.js?sw="+metadata.displayVersion+"');"));
  assert(sw.includes("const SW_RELEASE_CACHE_MARKER = 'v"+metadata.displayVersion+"';"));
  assert(sw.includes("'./core.js?v="+metadata.displayVersion+"'"));
  assert(sw.includes("'./app-rotation-sync.js?v="+metadata.displayVersion+"'"));
});
test('service worker update checks bypass HTTP cache',()=>{
  const pwa=read('app-pwa-connectivity.js');
  assert(pwa.includes("navigator.serviceWorker.register('sw.js', { scope: './', updateViaCache: 'none' })"));
  assert(pwa.includes('await registration.update()'));
  assert(pwa.includes("registration.addEventListener('updatefound'"));
});

test('1.7.85 retains local-first startup and account appearance CAS',()=>{
  const app=read('app.js');
  const bridge=read('supabase-bridge.js');
  const profile=read('rak-user-profile.js');
  assert(app.includes('RAK_17084_LOCAL_FIRST_BOOT'));
  assert(app.includes('window.rakMarkFirstUsableRender'));
  assert(bridge.includes("rpc('rak_load_account_ui_preferences'"));
  assert(bridge.includes("rpc('rak_save_account_ui_preferences'"));
  assert(profile.includes('resetRuntimeForAccountSwitch(next.accountNumber);'));
});

test('npm check retains the 1.7.85 milestone while CI runs the current release gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(pkg.scripts.check.includes('tools/release-gate-17085.test.mjs'));
  assert(/node --test tools\/release-gate-1708\d\.test\.mjs/.test(workflow));
});
