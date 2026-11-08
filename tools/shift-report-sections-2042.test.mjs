import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const css=read('features/shift-report-sections.css');
const report=read('rak-shift-report.js');
const polish=read('rak-shift-report-share.js');
const sw=read('sw.js');
test('all real foreman report sections receive visual separation, with untouched inputs',()=>{
  for(const key of ['mo','to','r01','r07']) {
    assert(report.includes("id: '"+key+"'"),'report section '+key+' must exist');
    assert(css.includes('[data-section-block="'+key+'"]'),'missing accent '+key);
  }
  for(const key of ['rakShiftProblemsSection','rakShiftPreviewSection']) {
    assert(css.includes('.'+key),'missing visual section '+key);
    assert(polish.includes("classList.add('"+key+"')"),'polish must mark '+key);
  }
  assert(css.includes('border-left:6px solid var(--rak-report-divider)'));
  assert(css.includes('border-bottom:2px solid var(--rak-report-divider)'));
  assert(css.includes('gap:20px'));
  assert(css.includes('@media(max-width:390px)'));
  assert(!report.includes('shift-report-sections.css'),'no change to report form/data code');
});
test('decorative stylesheet is loaded on demand with foreman report and cached offline',()=>{
  assert(polish.includes("dividers.href='features/shift-report-sections.css?v=2.0.44'"));
  assert(polish.includes("dividers.rel='stylesheet'"));
  const asset="'./features/shift-report-sections.css?v=2.0.44'";
  assert(sw.slice(sw.indexOf('const WARM_START = ['),sw.indexOf('const OFFLINE_REQUIRED =')).includes(asset),'CSS must be prewarmed');
  assert(sw.slice(sw.indexOf('const OFFLINE_REQUIRED =')).includes(asset),'CSS must be required for offline completeness');
  assert(!read('app.js').includes('shift-report-sections.css'),'startup core must not load decorative CSS');
});
