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
  assert(polish.includes("dividers.href='features/shift-report-sections.css?v=2.0.46'"));
  assert(polish.includes("dividers.rel='stylesheet'"));
  const asset="'./features/shift-report-sections.css?v=2.0.46'";
  assert(sw.slice(sw.indexOf('const WARM_START = ['),sw.indexOf('const OFFLINE_REQUIRED =')).includes(asset),'CSS must be prewarmed');
  assert(sw.slice(sw.indexOf('const OFFLINE_REQUIRED =')).includes(asset),'CSS must be required for offline completeness');
  assert(!read('app.js').includes('shift-report-sections.css'),'startup core must not load decorative CSS');
});

test('report rows reuse the exact green, blue and orange tint of the shift overview, without neon highlights',()=>{
  const overview=read('admin-shift-overview.js');
  const palette=[
    ['Green','#87ac3a','rgba(135,172,58,.24)'],
    ['Blue','#1472c2','rgba(20,114,194,.27)'],
    ['Orange','#ce552f','rgba(206,85,47,.25)']
  ];
  for(const [name,stroke,tint] of palette){
    assert(overview.includes('.rakShiftOverviewIndexRow.is'+name+'{border-color:'+stroke+';background:'+tint+';}'),'overview palette changed: '+name);
    assert(report.includes('--rak-index-stroke:'+stroke+';--rak-index-fill:'+tint),'report not using matching palette: '+name);
  }
  assert(report.includes('border-left:4px solid var(--rak-index-stroke,transparent)'),'report rows need overview accent stripe');
  assert(report.includes('background:var(--rak-index-fill,transparent)!important'),'index selector uses identical tint');
  assert(!report.includes('linear-gradient(145deg,#00b966,#00ee87)'),'old neon remains');
  assert(report.includes("if(row)row.dataset.indexColor=color"),'changing index must update the row');
});
