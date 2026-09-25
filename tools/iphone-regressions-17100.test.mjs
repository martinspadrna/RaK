import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('rotation choice picker stays bound to visual viewport and repositions after keyboard/scroll changes',()=>{
  const src=read('admin-rotation.js');
  assert(src.includes('function adminRotationFloatingViewport()'));
  assert(src.includes('window.visualViewport'));
  assert(src.includes('function adminPositionRotationChoicePicker()'));
  assert(src.includes('setTimeout(adminQueueRotationChoicePickerPosition, 180)'));
  assert(src.includes('setTimeout(adminQueueRotationChoicePickerPosition, 420)'));
  assert(src.includes("window.addEventListener('scroll', adminQueueRotationChoicePickerPosition, true)"));
  assert(src.includes("window.visualViewport.addEventListener('resize', adminQueueRotationChoicePickerPosition)"));
  assert(src.includes("window.visualViewport.addEventListener('scroll', adminQueueRotationChoicePickerPosition)"));
  assert(!src.includes("window.addEventListener('scroll', () => adminCloseRotationChoicePicker(), true)"));
});

test('app accounts not present in rotation get a double-width name column',()=>{
  const css=read('styles-admin-polish.css');
  assert(css.includes('.adminAppAccountsTable{width:285px !important;min-width:285px !important'));
  assert(css.includes('.adminAppAccountNameCol{width:126px;}'));
  assert(css.includes('.adminAppAccountLoginCol{width:54px;}'));
  assert(css.includes('.adminAppAccountScopeCol{width:105px;}'));
});

test('Brusy signed controls are explicitly visible and touch sized in calculator and calibration admin',()=>{
  const src=read('brusy-fhb-correction.js');
  assert(src.includes('class="calcSignedInput brusFhbSignedInput"'));
  assert(src.includes('class="calcSignedInput adminCorrectionSignedInput"'));
  assert(src.includes('#korekce-brusy .brusFhbSignedInput,.adminBrusFhbCalibration .adminCorrectionSignedInput{display:grid!important'));
  assert(src.includes('.brusFhbSignedInput .calcSignToggle,.adminBrusFhbCalibration .adminCorrectionSignedInput .calcSignToggle{display:grid!important'));
  assert(src.includes('visibility:visible!important;opacity:1!important;width:48px!important'));
  assert(src.includes('data-brus-fhb-sign-target="brus_fhb_left"'));
  assert(src.includes('data-brus-fhb-sign-target="brus_fhb_right"'));
  assert(src.includes('data-brus-fhb-sign-target="admin_brus_fhb_correction"'));
});

test('Christmas grammar ignores legacy Vánocům settings',()=>{
  const src=read('core.js');
  assert(src.includes("const isChristmasCountdown = String(upcoming.key || '').toLowerCase().startsWith('vanoce');"));
  assert(src.includes("isChristmasCountdown ? 'do Vánoc'"));
  assert(!src.includes("? 'do ' : 'k ') + String(upcoming.countdownLabel"));
});

test('landscape overlay reuses exact login mascot assets and not the old SVG crab',()=>{
  const splash=read('rak-login-splash.js');
  const pwa=read('app-pwa-connectivity.js');
  for(const asset of ['assets/rak-login-crab.png','assets/rak-login-crab-step.png','assets/rak-login-crab-tap.png']){
    assert(splash.includes(asset));
    assert(pwa.includes(asset));
  }
  assert(splash.includes('window.rakLoginMascotHtml'));
  assert(pwa.includes('window.rakLoginMascotHtml'));
  const portraitBlock=pwa.slice(pwa.indexOf('function installRakPortraitOnlyPwaMode()'),pwa.indexOf('function installPwaAndConnectivityHooks()'));
  assert(!portraitBlock.includes('rakLivingLogoHtml'));
  assert(portraitBlock.includes('.rakSplashMascotFrame'));
});

test('shift report date is compact and has an explicit right border',()=>{
  const src=read('rak-shift-report-share.js');
  assert(src.includes('grid-template-columns:124px 112px'));
  assert(src.includes('#rakShiftReport .rakShiftDate{width:124px!important;inline-size:124px!important;max-width:124px!important'));
  assert(src.includes('border-right:1px solid rgba(255,255,255,.18)!important'));
  assert(src.includes('grid-template-columns:118px 108px'));
});

test('complete backup embeds the CI-verified Git ZIP without reparsing it on iPhone',()=>{
  const app=read('rak-complete-backup.js');
  const legacy=read('tools/complete-backup-ios-fix-1633.mjs');
  assert(app.includes('function validateExactSourceArchive(arrayBuffer)'));
  assert(app.includes('bytes[index + 2] === 0x05 && bytes[index + 3] === 0x06'));
  assert(app.includes("zip.file('repository/source-exact.zip', exactBytes, { binary: true, compression: 'STORE' })"));
  assert(app.includes("repository/source-exact.zip  přesný buildem ověřený Git archiv"));
  assert(!app.includes('window.JSZip.loadAsync(archiveData)'));
  assert(legacy.includes("assert(!moduleJs.includes('window.JSZip.loadAsync(archiveData)')"));
  assert(legacy.includes("zip.file('repository/source-exact.zip'"));
});
