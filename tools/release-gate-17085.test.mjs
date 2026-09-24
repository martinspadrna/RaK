import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.85 uses one version identity everywhere in the current runtime',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.85');
  assert.equal(metadata.displayVersion,'1.7.85');
  assert.equal(metadata.technicalVersion,'1.7.85');
  assert.equal(metadata.moduleCacheVersion,'1.7.85');
  assert.equal(metadata.cacheVersion,'v1.7.85');
  assert.equal(JSON.parse(read('package.json')).version,'1.7.85');
  assert.equal(metadata.buildId,'v1.7.85-pwa-update-delivery1');
  assert(read('index.html').includes('app.js?v=1.7.85'));
  for(const file of ['rak-release-metadata.js','package.json','index.html','sw.js']){
    assert(!read(file).includes('1.7.0'),file+' still exposes the obsolete current-version value 1.7.0');
  }
});

test('service worker itself changes for 1.7.85 and imports versioned metadata',()=>{
  const sw=read('sw.js');
  assert(sw.includes("importScripts('./rak-release-metadata.js?sw=1.7.85');"));
  assert(sw.includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.85';"));
  assert(sw.includes('CACHE_VERSION !== SW_RELEASE_CACHE_MARKER'));
  assert(sw.includes("'./core.js?v=1.7.85'"));
  assert(sw.includes("'./app-rotation-sync.js?v=1.7.85'"));
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

test('mandatory CI and npm check execute the 1.7.85 gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(workflow.includes('node --test tools/release-gate-17085.test.mjs'));
  assert(pkg.scripts.check.includes('tools/release-gate-17085.test.mjs'));
  assert(workflow.includes('rak-17085-isolated-build-${{ github.sha }}'));
});
