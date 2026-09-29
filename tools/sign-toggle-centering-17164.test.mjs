import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('shared Brusy/admin sign controls use geometric centering instead of font metrics',()=>{
  const src=read('brusy-fhb-correction.js');
  for(const scope of [
    '#korekce-brusy .brusFhbSignedInput .calcSignToggle',
    '.adminFhbCalibration .adminCorrectionSignedInput .calcSignToggle',
    '.adminBrusFhbCalibration .adminCorrectionSignedInput .calcSignToggle'
  ]) assert(src.includes(scope),scope);
  assert(src.includes('display:flex!important;align-items:center!important;justify-content:center!important;position:relative!important'));
  assert(src.includes('font:900 0/1 system-ui!important'));
  assert(src.includes('.calcSignToggle::before'));
  assert(src.includes('.calcSignToggle:not(.isNegative)::after'));
  assert(src.includes('left:50%!important;top:50%!important'));
  assert(src.includes('transform:translate(-50%,-50%)!important'));
});

test('sign switching behavior remains unchanged',()=>{
  const src=read('brusy-fhb-correction.js');
  const start=src.indexOf('function toggleSignedInput');
  const end=src.indexOf('function choiceGroup',start);
  const fn=src.slice(start,end);
  assert(fn.includes("button.textContent = negative ? '−' : '+'"));
  assert(fn.includes("button.classList.toggle('isNegative', negative)"));
  assert(fn.includes("button.setAttribute('aria-pressed', negative ? 'true' : 'false')"));
  const admin=read('admin-fhb-calibration.js');
  assert(admin.includes("button.textContent = negative ? '−' : '+'"));
  assert(admin.includes("button.classList.toggle('isNegative', negative)"));
});
