import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('Brusy/admin sign controls mirror the proven Frezky control geometry',()=>{
  const target=read('styles-overrides-legacy-late.css');
  const src=read('brusy-fhb-correction.js');
  assert(target.includes('--rakFrezkySignButtonW:42px'));
  assert(target.includes('--rakFrezkySignedInputH:46px'));
  assert(src.includes('--rakCorrectionSignButtonW:42px'));
  assert(src.includes('--rakCorrectionSignedInputH:46px'));
  assert(src.includes('grid-template-columns:var(--rakCorrectionSignButtonW) minmax(0,1fr)!important'));
  assert(src.includes('height:var(--rakCorrectionSignedInputH)!important'));
  assert(src.includes('width:var(--rakCorrectionSignButtonW)!important'));
  assert(src.includes('font-size:22px!important'));
  assert(src.includes('font-weight:950!important'));
  assert(src.includes('line-height:1!important'));
  assert(src.includes('display:flex!important'));
  assert(src.includes('align-items:center!important'));
  assert(src.includes('justify-content:center!important'));
});

test('Brusy/admin use the real plus/minus glyph like Frezky, not custom pseudo bars',()=>{
  const src=read('brusy-fhb-correction.js');
  assert(!src.includes('.calcSignToggle::before'));
  assert(!src.includes('.calcSignToggle:not(.isNegative)::after'));
  assert(!src.includes('font:900 0/1 system-ui!important'));
  assert(src.includes("button.textContent = negative ? '−' : '+'"));
});
