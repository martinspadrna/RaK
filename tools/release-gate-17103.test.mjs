import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.103 iPhone-retest milestone remains active in verified successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.103');
  assert.equal(metadata.technicalVersion,metadata.displayVersion);
  assert.equal(metadata.moduleCacheVersion,metadata.displayVersion);
  assert.equal(metadata.cacheVersion,'v'+metadata.displayVersion);
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
  assert(read('index.html').includes('app.js?v='+metadata.displayVersion));
  const sw=read('sw.js');
  assert(sw.includes("importScripts('./rak-release-metadata.js?sw="+metadata.displayVersion+"');"));
  assert(sw.includes("const SW_RELEASE_CACHE_MARKER = 'v"+metadata.displayVersion+"';"));
});

test('picker uses one document coordinate system and the visual viewport only as a page-space clamp',()=>{
  const src=read('admin-rotation.js');
  const css=read('styles-admin-rotation-editor.css');
  assert(src.includes('const vvPageTop = vv ? Number(vv.pageTop) : NaN;'));
  assert(src.includes('top: rect.top + scrollY'));
  assert(src.includes('const minTop = vp.top + margin'));
  assert(src.includes("box.style.position = 'absolute'"));
  assert(css.includes('.adminRotationChoicePicker{\n  position:absolute !important;'));
  assert(!css.includes('.adminRotationChoicePicker{\n  position:fixed !important;'));
});

test('worker OS column is 50 percent wider while the double name column stays intact',()=>{
  const css=read('styles-admin-polish.css');
  assert(css.includes('.adminAppAccountsTable{width:285px !important;min-width:285px !important'));
  assert(css.includes('.adminAppAccountNameCol{width:126px;}'));
  assert(css.includes('.adminAppAccountLoginCol{width:54px;}'));
  assert(css.includes('.adminAppAccountScopeCol{width:105px;}'));
});

test('the final visible Brusy layers own signed controls',()=>{
  const base=read('brusy-fhb-correction.js');
  const v157=read('brusy-fhb-v157.js');
  const v158=read('brusy-fhb-v158.js');
  assert(base.includes('[data-brus-fhb-sign-input="1"],#brus_fhb_left'));
  assert(v157.includes('class="calcSignedInput brus157SignedInput"'));
  assert(v157.includes('data-brus-fhb-sign-target="'));
  assert(v157.includes('data-brus-fhb-sign-input="1"'));
  assert(v157.includes('.brus157SignedInput .calcSignToggle{display:grid!important'));
  assert(!v158.includes("if (prefix !== 'correction')"));
  assert(v158.includes('class="calcSignedInput adminBrus1594SignedInput"'));
  assert(v158.includes('data-brus-fhb-sign-target="'));
  assert(v158.includes('.adminBrus1594SignedInput .calcSignToggle{display:grid!important'));
});

test('landscape overlay contains only a full-viewport login mascot',()=>{
  const src=read('app-pwa-connectivity.js');
  const block=src.slice(src.indexOf('function installRakPortraitOnlyPwaMode()'),src.indexOf('function installPwaAndConnectivityHooks()'));
  assert(block.includes("overlay.innerHTML = '<div class=\"rakPortraitOnlyCrab\">' + crab + '</div>';"));
  assert(block.includes('width:100vw;height:100vh'));
  assert(block.includes('.rakSplashMascot{position:relative;width:100vw;height:100vh'));
  assert(!block.includes('<strong>Otoč telefon na výšku</strong>'));
  assert(!block.includes('RaK je na mobilu uzamčený na výšku.'));
});

test('shift report compact date is part of base markup and not polish-only',()=>{
  const core=read('rak-shift-report.js');
  const share=read('rak-shift-report-share.js');
  assert(core.includes('class="rakShiftDateShell"'));
  assert(core.includes('class="rakShiftDateDisplay"'));
  assert(core.includes('grid-template-columns:124px 112px'));
  assert(core.includes('width:124px;max-width:124px;height:48px'));
  assert(share.includes('grid-template-columns:124px 112px'));
  assert(share.includes('#rakShiftReport .rakShiftDateShell{position:relative;width:124px!important'));
  assert(share.includes('border:1px solid rgba(255,255,255,.18)!important'));
  assert(share.includes('opacity:0!important'));
});

test('Vercel preview can never publish the tracked backup placeholder as a green release',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  assert(workflow.includes('cp -a ".rak-dist/." ".vercel/output/static/"'));
  assert(workflow.includes('cmp ".rak-dist/rak-complete-backup-source.zip" ".vercel/output/static/rak-complete-backup-source.zip"'));
  assert(workflow.includes('unzip -tqq ".vercel/output/static/rak-complete-backup-source.zip"'));
  assert(workflow.includes('vercel curl /rak-complete-backup-source.zip --deployment "$DEPLOYMENT_ID"'));
  assert(workflow.includes('fetch_public "/rak-complete-backup-source.zip?v=$DISPLAY_VERSION" "source-zip"'));
  assert.equal((workflow.match(/wc -c < .*source-zip\.body/g)||[]).length,2);
  assert(/name: rak-170\d+-isolated-build-\$\{\{ github\.sha \}\}/.test(workflow));
});

test('1.7.103 gate is mandatory in npm check and the release workflow',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/release-gate-17103.test.mjs'));
  assert(workflow.includes('node --test tools/release-gate-17103.test.mjs'));
});
