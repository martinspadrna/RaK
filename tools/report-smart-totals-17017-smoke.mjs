#!/usr/bin/env node
// Exercise both actual PNG row generators and the real clipboard text renderer.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read = file => fs.readFileSync(file, 'utf8');
const moSingle = [{index:'AF',qty:'500',free:'0',nok:'0'}];
const moNormalFree = [{index:'AF',qty:'500',free:'100',nok:'0'}];
const moTwo = [{index:'AF',qty:'500'},{index:'AG',qty:'100'}];
const toSingle = [{index:'AD',qty:'500'}];
const toTwo = [{index:'AD',qty:'500'},{index:'AE',qty:'100'}];
const grinderSingle = [{index:'AD',qty:'500',nok:'2'}];
const grinderFreeOnly = [{index:'AH',qty:'0',free:'200',nok:'3'}];
const grinderMixed = [{index:'AD',qty:'500',free:'100',nok:'2'}];
const grinderTwo = [{index:'AD',qty:'300'},{index:'AE',qty:'200'}];
const grinderEmpty = [{index:'AD',qty:'0',free:'0',nok:'0'}];
const fixtures = [
  ['mo',moSingle,['500 AF']],
  ['mo',moNormalFree,['500 AF','100 AF volné','Celkově 600 AF (600 ks)']],
  ['mo',moTwo,['500 AF','100 AG','Celkově 500 AF, 100 AG (600 ks)']],
  ['to',toSingle,['AD 500 ks']],
  ['to',toTwo,['AD 500 ks','AE 100 ks','Celkově 600 ks']],
  ['r01',grinderSingle,['500 AD ks (z toho 2 NOK)']],
  ['r07',grinderFreeOnly,['200 AH volné (z toho 3 NOK)']],
  ['r01',grinderMixed,['500 AD ks (z toho 2 NOK)','100 AD volné','Celkově 600 ks (600 AD)']],
  ['r07',grinderTwo,['300 AD ks','200 AE ks','Celkově 500 ks (300 AD, 200 AE)']],
  ['r01',grinderEmpty,['Bez záznamu']]
];
for (const path of ['rak-shift-report-image.js','rak-shift-report-share.js']) {
  const source = read(path);
  assert(source.includes('// RAK_REPORT_SMART_TOTALS_17017'),path+' smart totals marker missing');
  assert(source.includes('ctx.globalAlpha = .16;') && source.includes('const CANVAS_WIDTH = 1080;'),path+' mobile PNG/crab regression');
  const begin = source.indexOf('  function quantityNumber17013(value) {');
  const end = source.indexOf('  function problemHeight17013(ctx,problems) {',begin);
  assert(begin>=0 && end>begin,path+' actual PNG function bounds missing');
  const context = vm.createContext({CANVAS_WIDTH:1080,OUTER:50,MOBILE_LINE_STEP:78,
    wrapLines:(ctx,text)=>[text]});
  vm.runInContext(source.slice(begin,end),context);
  const sectionLines = vm.runInContext('sectionLines17013',context);
  for (const [id,rows,expected] of fixtures) {
    const actual = Array.from(sectionLines({id,rows}),line=>line.text);
    assert.deepEqual(actual,expected,path+' '+id+' '+JSON.stringify(rows));
  }
  const layout=vm.runInContext('sectionLayout17015',context);
  const ctx={font:'',measureText:text=>({width:String(text).length*22})};
  assert.equal(layout(ctx,{id:'mo',rows:moSingle},980).totals.length,0,path+' single MO must have no total footprint');
  assert.equal(layout(ctx,{id:'mo',rows:moNormalFree},980).totals.length,1,path+' mixed MO total must keep full-width footprint');
  assert.equal(layout(ctx,{id:'to',rows:toSingle},980).totals.length,0,path+' single TO must have no total footprint');
  assert.equal(layout(ctx,{id:'r01',rows:grinderSingle},980).totals.length,0,path+' single grinder must have no total footprint');
}
const shift=read('rak-shift-report.js');
assert(shift.includes('// RAK_REPORT_SMART_TOTALS_17017'), 'clipboard formatter marker missing');
const start=shift.indexOf('  function reportText(draft)');
const end=shift.indexOf('  function saveLocal',start);
const helpers=shift.indexOf('  function reportLineIndex(line) {');
assert(helpers>=0 && start>helpers && end>start,'clipboard helper/function bounds missing');
const context=vm.createContext({REPORT_SEPARATOR:'__________',INDEX_ORDER:{AG:0,AE:0,AF:1,AD:1,AH:2}});
vm.runInContext(shift.slice(helpers,start),context);
vm.runInContext(shift.slice(start,end),context);
const reportText=vm.runInContext('reportText',context);
for (const [id,rows,expected] of fixtures) {
  const text=reportText({date:'2026-09-18',shift:'R',moNok:id==='mo'?'5':'0',
    production:{mo:[],to:[],r01:[],r07:[],[id]:rows},problems:[]});
  const sectionHeader={mo:'MO:',to:'TO:',r01:'TBKR01:',r07:'TBKR07:'}[id];
  const section=text.split(sectionHeader)[1].split(/\n(?:MO|TO|TBKR01|TBKR07|PROBLÉMY):/)[0];
  for (const line of expected) assert(section.includes(line),'text '+id+' missing '+line);
  assert.equal(section.includes('Celkově '),expected.some(line=>line.startsWith('Celkově ')),'clipboard total parity '+id+' '+JSON.stringify(rows));
  if (id==='mo') assert(text.includes('NOK celkem: 5'),'MO NOK footer must remain independent of totals');
}
const config=read('supabase-config.js'),index=read('index.html'),sw=read('sw.js');
assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co')&&!config.includes('bkqamcbkiwumsvelahxr'),'test Supabase only');
assert(config.includes('window.RAK_RELEASE_VERSION = "1.7.17";') && config.includes('window.RAK_PWA_BUILD = "v1.7.17-smarttotals1";'),'release markers');
assert(index.includes("var build='v1.7.17-smarttotals1';"),'index build marker');
assert(sw.includes("const CACHE_VERSION = 'v1.7.17';"),'PWA cache marker');
assert.equal(JSON.parse(read('package.json')).version,'1.7.0','technical version unchanged');
console.log('[report-smart-totals-17017-smoke] OK MO/TO/TBKR01/TBKR07: single normal/free (+ NOK) no total; two indices or normal+free total; PNG sizes/clipboard parity/zero suppression/test database/version');
