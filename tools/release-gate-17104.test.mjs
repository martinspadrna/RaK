import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('the current release preserves the unified 1.7.104 minimum milestone',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.104');
  assert(Number(metadata.displayVersion.split('.').at(-1))>=104);
});

test('Frézky correction settings expose +/- on every signed measurement field',()=>{
  const src=read('admin-fhb-calibration.js');
  for(const field of ['protocolLeft','protocolRight','taperDelta','shiftDelta','resultLeft','resultRight']){
    assert(src.includes("adminSignedField('"+field+"'"),'missing signed field '+field);
  }
  assert.equal((src.match(/adminSignedField\('/g)||[]).length,6);
  assert(src.includes('data-admin-correction-sign-input="1"'));
  assert(src.includes("event.target.matches('[data-admin-correction-sign-input=\"1\"]')"));
  const css=read('brusy-fhb-correction.js');
  assert(css.includes('.adminFhbCalibration .adminCorrectionSignedInput'));
  assert(css.includes('visibility:visible!important;opacity:1!important;width:48px!important'));
});

test('Brusy correction settings expose +/- before, during and after correction',()=>{
  const src=read('brusy-fhb-v158.js');
  assert(!src.includes("if (prefix !== 'correction')"));
  assert(src.includes("prefix === 'correction' ? 'korekce'"));
  assert(src.includes('class="calcSignedInput adminBrus1594SignedInput"'));
  assert(src.includes('data-brus-fhb-sign-target="'));
  assert(src.includes('data-brus-fhb-sign-input="1"'));
  for(const stage of [
    "adminStage('Před korekcí (strany dle protokolu)', 'before', 'FHB')",
    "adminStage('Provedené korekce (strany dle protokolu)', 'correction', 'µm')",
    "adminStage('Po korekci (strany dle protokolu)', 'after', 'FHB')"
  ]) assert(src.includes(stage));
});

test('shift report uses its own visible date shell while native iOS date stays the tap layer',()=>{
  const core=read('rak-shift-report.js');
  const share=read('rak-shift-report-share.js');
  assert(core.includes('function shiftDateDisplayValue(value)'));
  assert(core.includes('function syncShiftDateDisplay(input)'));
  assert(core.includes('class="rakShiftDateShell"'));
  assert(core.includes('class="rakShiftDateDisplay"'));
  assert(core.includes('<input class="rakShiftDate" type="date"'));
  assert(!core.includes('class="rakShiftInput rakShiftDate"'));
  assert(share.includes('#rakShiftReport .rakShiftDateShell{position:relative;width:124px!important'));
  assert(share.includes('border:1px solid rgba(255,255,255,.18)!important'));
  assert(share.includes('#rakShiftReport .rakShiftDate{position:absolute!important'));
  assert(share.includes('opacity:0!important'));
  assert(share.includes('grid-template-columns:124px 112px;gap:9px'));
});

test('real Chromium regression fixtures inspect the visible date shell',()=>{
  const iphone=read('tools/browser-iphone-regressions-17100.mjs');
  const fourth=read('tools/browser-fourth-bundle-17097.mjs');
  for(const src of [iphone,fourth]){
    assert(src.includes("document.querySelector('.rakShiftDateShell')"));
    assert(src.includes('rightBorder'));
    assert(src.includes('nativeOpacity'));
  }
  assert(iphone.includes('data.signs.length===8'));
});

test('1.7.104 gate is mandatory in npm check and the release workflow',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/release-gate-17104.test.mjs'));
  assert(workflow.includes('node --test tools/release-gate-17104.test.mjs'));
  assert(/rak-17010[45]-isolated-build-\$\{\{ github\.sha \}\}/.test(workflow));
});
