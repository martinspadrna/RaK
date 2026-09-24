import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.97 uses one unified release identity',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.97');
  assert.equal(metadata.displayVersion,'1.7.97');
  assert.equal(metadata.technicalVersion,'1.7.97');
  assert.equal(metadata.moduleCacheVersion,'1.7.97');
  assert.equal(metadata.cacheVersion,'v1.7.97');
  assert.equal(metadata.buildId,'v1.7.97-calculators-mobile-polish1');
  assert.equal(JSON.parse(read('package.json')).version,'1.7.97');
  assert(read('index.html').includes('app.js?v=1.7.97'));
  const sw=read('sw.js');
  assert(sw.includes("importScripts('./rak-release-metadata.js?sw=1.7.97');"));
  assert(sw.includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.97';"));
});

test('grinder and admin correction inputs share explicit plus-minus controls',()=>{
  const grinder=read('brusy-fhb-correction.js');
  const millAdmin=read('admin-fhb-calibration.js');
  assert(grinder.includes('data-brus-fhb-sign-target="brus_fhb_left"'));
  assert(grinder.includes('data-brus-fhb-sign-target="brus_fhb_right"'));
  assert(grinder.includes('data-brus-fhb-sign-target="admin_brus_fhb_correction"'));
  assert(grinder.includes('function toggleSignedInput(input, button)'));
  assert(grinder.includes("button.textContent = negative ? '−' : '+'"));
  assert(millAdmin.includes('data-admin-correction-sign-target="admin_fhb_taper_delta"'));
  assert(millAdmin.includes('data-admin-correction-sign-target="admin_fhb_shift_delta"'));
  assert(millAdmin.includes("raw = raw ? '-' + raw : '-'"));
});

test('about page is compact and Christmas countdown says do Vanoc',()=>{
  const pages=read('app-menu-pages.js');
  const core=read('core.js');
  assert(!pages.includes('RaK spojuje pracovní rotace'));
  assert(pages.includes("title: 'Aktuální generace'"));
  const start=pages.indexOf("range: 'RaK 1.7'");
  const end=pages.indexOf("range: 'RaK 1.6'",start);
  const current=pages.slice(start,end);
  assert.equal((current.match(/^\s*'/gm)||[]).length,4);
  assert(core.includes("countdownLabel: 'Vánoc'"));
  assert(core.includes("startsWith('vanoce') ? 'do ' : 'k '"));
});

test('landscape overlay reuses animated login crab and honors reduced motion',()=>{
  const login=read('rak-login-life.js');
  const pwa=read('app-pwa-connectivity.js');
  assert(login.includes('window.rakLivingLogoHtml'));
  assert(login.includes('window.rakInstallLoginLifeStyles'));
  assert(login.includes('@media (prefers-reduced-motion:reduce)'));
  assert(pwa.includes("typeof window.rakLivingLogoHtml === 'function'"));
  assert(pwa.includes("!overlay.querySelector('.rakLivingLogo')"));
  assert(pwa.includes('rakPortraitOnlyCrab'));
});

test('shift report mobile geometry has an explicit gap and is covered by real Chromium',()=>{
  const report=read('rak-shift-report.js');
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const browser=read('tools/browser-fourth-bundle-17097.mjs');
  assert(report.includes('grid-template-columns:minmax(0,1.32fr) minmax(104px,.68fr);gap:12px'));
  assert(report.includes('.rakShiftContext label{overflow:hidden}'));
  assert(browser.includes('assert.equal(data.overlap,false'));
  assert(browser.includes('assert(data.gap>=9'));
  assert(browser.includes('assert(data.sign.width>=40&&data.sign.height>=40'));
  assert(workflow.includes('node tools/browser-fourth-bundle-17097.mjs'));
});

test('mandatory CI and npm check execute the 1.7.97 gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(workflow.includes('node --test tools/release-gate-17097.test.mjs'));
  assert(pkg.scripts.check.includes('tools/release-gate-17097.test.mjs'));
  assert(workflow.includes('rak-17097-isolated-build-'+'$'+'{{ github.sha }}'));
});
