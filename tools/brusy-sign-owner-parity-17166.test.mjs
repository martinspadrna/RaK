import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('Brusy calculator owning v157 layer matches Frezky sign geometry',()=>{
  const src=read('brusy-fhb-v157.js');
  assert(src.includes('grid-template-columns:42px minmax(0,1fr)!important'));
  assert(src.includes('width:42px!important;min-width:42px!important;max-width:42px!important;height:46px!important;min-height:46px!important;max-height:46px!important'));
  assert(src.includes('font-size:22px!important;font-weight:950!important;line-height:1!important'));
  assert(src.includes('background:linear-gradient(135deg,rgba(255,255,255,.16),rgba(255,255,255,.06))!important'));
  assert(src.includes('.brus157Measure input{width:100%;height:46px!important;min-height:46px!important;max-height:46px!important'));
  assert(!src.includes('grid-template-columns:48px minmax(0,1fr)!important;gap:7px!important;align-items:stretch!important}.brus157Measure'));
  assert(!src.includes('min-height:55px!important'));
});

test('Brusy admin owning v158 layer matches Frezky sign geometry',()=>{
  const src=read('brusy-fhb-v158.js');
  assert(src.includes('.adminBrus1594SignedInput{display:grid!important;grid-template-columns:42px minmax(0,1fr)!important;gap:7px!important;align-items:center!important}'));
  assert(src.includes('width:42px!important;min-width:42px!important;max-width:42px!important;height:46px!important;min-height:46px!important;max-height:46px!important'));
  assert(src.includes('.adminBrus1594SignedInput input{height:46px!important;min-height:46px!important;max-height:46px!important;box-sizing:border-box!important}'));
  assert(src.includes('font-size:22px!important;font-weight:950!important;line-height:1!important'));
  assert(!src.includes('.adminBrus1594SignedInput{display:grid!important;grid-template-columns:48px'));
});

test('narrow-screen Brusy controls keep the same Frezky 38x44 fallback',()=>{
  const calc=read('brusy-fhb-v157.js');
  const admin=read('brusy-fhb-v158.js');
  for(const src of [calc,admin]){
    assert(src.includes('grid-template-columns:38px minmax(0,1fr)!important'));
    assert(src.includes('height:44px!important;min-height:44px!important;max-height:44px!important'));
  }
});
