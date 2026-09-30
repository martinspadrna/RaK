import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('shared Brusy/admin sign controls remain explicitly centered',()=>{
  const src=read('brusy-fhb-correction.js');
  for(const scope of [
    '#korekce-brusy .brusFhbSignedInput .calcSignToggle',
    '.adminFhbCalibration .adminCorrectionSignedInput .calcSignToggle',
    '.adminBrusFhbCalibration .adminCorrectionSignedInput .calcSignToggle'
  ]) assert(src.includes(scope),scope);
  assert(src.includes('align-items:center!important'));
  assert(src.includes('justify-content:center!important'));
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
