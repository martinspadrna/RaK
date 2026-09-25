import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.97 calculator-mobile milestone remains active in verified successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.97');
  assert.equal(metadata.technicalVersion,metadata.displayVersion);
  assert.equal(metadata.moduleCacheVersion,metadata.displayVersion);
  assert.equal(metadata.cacheVersion,'v'+metadata.displayVersion);
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
  assert(read('index.html').includes('app.js?v='+metadata.displayVersion));
  const sw=read('sw.js');
  assert(sw.includes("importScripts('./rak-release-metadata.js?sw="+metadata.displayVersion+"');"));
  assert(sw.includes("const SW_RELEASE_CACHE_MARKER = 'v"+metadata.displayVersion+"';"));
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
  assert(core.includes("const isChristmasCountdown = String(upcoming.key || '').toLowerCase().startsWith('vanoce');"));
  assert(core.includes("isChristmasCountdown ? 'do Vánoc'"));
  assert(!core.includes("? 'do ' : 'k ') + String(upcoming.countdownLabel"));
});

test('landscape overlay reuses the current login mascot and honors reduced motion',()=>{
  const splash=read('rak-login-splash.js');
  const pwa=read('app-pwa-connectivity.js');
  for(const asset of ['assets/rak-login-crab.png','assets/rak-login-crab-step.png','assets/rak-login-crab-tap.png']){
    assert(splash.includes(asset));
    assert(pwa.includes(asset));
  }
  assert(splash.includes('window.rakLoginMascotHtml'));
  assert(splash.includes('@media(prefers-reduced-motion:reduce)'));
  assert(pwa.includes("typeof window.rakLoginMascotHtml === 'function'"));
  assert(pwa.includes('rakPortraitOnlyCrab'));
  assert(!pwa.includes("typeof window.rakLivingLogoHtml === 'function'"));
});

test('shift report mobile geometry has an explicit gap and is covered by real Chromium',()=>{
  const report=read('rak-shift-report.js');
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const browser=read('tools/browser-fourth-bundle-17097.mjs');
  assert(report.includes('grid-template-columns:124px 112px;align-items:end;gap:10px'));
  assert(report.includes('border-right:1px solid rgba(255,255,255,.18)'));
  assert(report.includes('.rakShiftContext label{overflow:hidden}'));
  assert(browser.includes('assert.equal(data.overlap,false'));
  assert(browser.includes('assert(data.gap>=9'));
  assert(browser.includes('assert(data.sign.width>=40&&data.sign.height>=40'));
  assert(workflow.includes('node tools/browser-fourth-bundle-17097.mjs'));
});

test('npm check retains 1.7.97 while CI runs the current release gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(pkg.scripts.check.includes('tools/release-gate-17097.test.mjs'));
  assert(/node --test tools\/release-gate-1709\d\.test\.mjs/.test(workflow));
});
