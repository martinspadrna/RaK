#!/usr/bin/env node
// Verify both PNG exporters and the real copied/shared text formatter against the same production fixtures.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read = file => fs.readFileSync(file, 'utf8');
const index = read('index.html');
const config = read('supabase-config.js');
assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co') && !config.includes('bkqamcbkiwumsvelahxr'), 'test Supabase only');
assert(config.includes('window.RAK_RELEASE_VERSION = "1.7.15";'), 'display version');
assert(config.includes('window.RAK_PWA_BUILD = "v1.7.15-indexgrid1";'), 'build version');
assert(index.includes("var build='v1.7.15-indexgrid1';"), 'index build version');
assert.equal(JSON.parse(read('package.json')).version,'1.7.0','technical version');

const moRows=[{index:'AF',qty:'55',free:'100',nok:'0'},{index:'AG',qty:'100',free:'0',nok:''}];
const toRows=[{index:'AD',qty:'255',free:'',nok:''},{index:'AE',qty:'244',free:'',nok:''},{index:'AH',qty:'555',free:'',nok:''}];
const r01Rows=[{index:'AD',qty:'555',free:'21',nok:'2'},{index:'AE',qty:'21',free:'0',nok:'0'}];
const r07Rows=[{index:'AD',qty:'222',free:'5',nok:'1'},{index:'AH',qty:'0',free:'100',nok:'0'}];
for(const file of ['rak-shift-report-image.js','rak-shift-report-share.js']) {
  const source=read(file);
  assert(source.includes('// RAK_REPORT_INDEX_GRID_TEXT_17015'),file+' new formatter missing');
  assert(source.includes('// RAK_REPORT_NOK_TOTALS_ZERO_17014'),file+' previous zero/NOK rules lost');
  assert(source.includes('const CANVAS_WIDTH = 1080;'),file+' portrait dimensions changed');
  assert(source.includes('ctx.globalAlpha = .16;'),file+' crab watermark changed');
  assert(source.includes("fill: 'rgba(45,156,255,.26)'"),file+' saturated blue lost');
  assert(source.includes("fill: 'rgba(139,228,88,.27)'"),file+' saturated green lost');
  assert(source.includes("AF:'#004e83'"),file+' blue AF ink missing');
  assert(source.includes("AG:'#0b632e'"),file+' green AG ink missing');
  assert(source.includes('layout.twoColumns'),file+' two-column rendering missing');
  assert(source.includes('drawProductionRow(ctx,line,x+20,rowY,w-40);'),file+' full-width total missing');
  assert(source.includes("title: 'RaK – Report směny diferenciály'"),file+' iPhone sharing lost');
  const begin=source.indexOf('  function quantityNumber17013(value) {');
  const end=source.indexOf('  function problemHeight17013(ctx,problems) {',begin);
  assert(begin>=0 && end>begin,file+' helper bounds');
  const context=vm.createContext({
    CANVAS_WIDTH:1080,OUTER:50,MOBILE_LINE_STEP:78,
    wrapLines:(ctx,text,width)=>{
      const limit=Math.max(4,Math.floor(width/22));
      const lines=[];let line='';
      String(text).split(/\s+/).forEach(word=>{
        if(line && (line+' '+word).length>limit){lines.push(line);line=word;}
        else line=line?line+' '+word:word;
      });
      if(line)lines.push(line);
      return lines;
    }
  });
  vm.runInContext(source.slice(begin,end),context);
  const getLines=vm.runInContext('sectionLines17013',context);
  const layout=vm.runInContext('sectionLayout17015',context);
  const texts = section => Array.from(getLines(section),line=>line.text);
  assert.deepEqual(texts({id:'mo',rows:moRows}),[
    '55 AF','100 AF volné','100 AG','Celkově 155 AF, 100 AG (255 ks)'
  ],file+' MO per-index rows and grand total');
  assert.deepEqual(texts({id:'to',rows:toRows}),[
    'AD 255 ks','AE 244 ks','AH 555 ks','Celkově 1 054 ks'
  ],file+' TO grand total');
  assert.deepEqual(texts({id:'r01',rows:r01Rows}),[
    '555 AD ks (z toho 2 NOK)','21 AD volné','21 AE ks','Celkově 597 ks (576 AD, 21 AE)'
  ],file+' TBKR01 NOK/free totals');
  assert.deepEqual(texts({id:'r07',rows:r07Rows}),[
    '222 AD ks (z toho 1 NOK)','5 AD volné','100 AH volné','Celkově 327 ks (227 AD, 100 AH)'
  ],file+' TBKR07 NOK/free totals');
  assert.deepEqual(texts({id:'r07',rows:[{index:'AH',qty:'0',free:'100',nok:'3'}]}),[
    '100 AH volné (z toho 3 NOK)','Celkově 100 ks (100 AH)'
  ],file+' free-only positive NOK');
  assert.deepEqual(texts({id:'r01',rows:[{index:'AD',qty:'0',free:'0',nok:'0'}]}),['Bez záznamu'],file+' zero suppression');
  const ctx={font:'',measureText:txt=>({width:String(txt).length*22})};
  const moLayout=layout(ctx,{id:'mo',rows:moRows},980);
  assert(moLayout.twoColumns,file+' MO must use two index columns');
  assert.equal(moLayout.groups[0].left[0].index,'AF',file+' AF should be left/blue');
  assert.equal(moLayout.groups[0].right[0].index,'AG',file+' AG should be right/green');
  assert.equal(moLayout.groups[0].left.length,2,file+' AF normal and free must stay in one column');
  assert.equal(moLayout.totals[0].kind,'total',file+' MO total must span whole width');
  const toLayout=layout(ctx,{id:'to',rows:toRows},980);
  assert(toLayout.twoColumns && toLayout.groups.length===2,file+' three TO indexes need two grid rows');
  assert(toLayout.totals[0].kind==='total',file+' TO total full width');
  assert(!layout(ctx,{id:'mo',rows:[moRows[0]]},980).twoColumns,file+' single-index MO must remain full-width');
  assert(moLayout.height>0 && toLayout.height>0,file+' computed height invalid');
}
const shift=read('rak-shift-report.js');
assert(shift.includes('// RAK_SHIFT_TEXT_INDEX_TOTALS_17015'),'shared copied text patch missing');
const textStart=shift.indexOf('  function reportText(draft)');
const textEnd=shift.indexOf('  function saveLocal',textStart);
const helpersStart=shift.indexOf('  function reportLineIndex(line) {');
assert(helpersStart>=0 && textStart>helpersStart && textEnd>textStart,'real report text/helper bounds');
// First build uses the new text function directly; repeated Vercel build adds the
// original formatShiftReportText/sortReportRowsByIndexColor compatibility layer.
// Exercise the same real helpers on both passes, never mock them away.
const textContext=vm.createContext({REPORT_SEPARATOR:'__________',INDEX_ORDER:{AG:0,AE:0,AF:1,AD:1,AH:2}});
vm.runInContext(shift.slice(helpersStart,textStart),textContext);
vm.runInContext(shift.slice(textStart,textEnd),textContext);
const render=vm.runInContext('reportText',textContext);
const text=render({date:'2026-09-18',shift:'R',moNok:'5',production:{mo:moRows,to:toRows,r01:r01Rows,r07:r07Rows},problems:[]});
for(const expected of [
 '55 AF','100 AF volné','100 AG','Celkově 155 AF, 100 AG (255 ks)',
 'AD 255 ks','AE 244 ks','AH 555 ks','Celkově 1 054 ks',
 '555 AD ks (z toho 2 NOK)','21 AD volné','21 AE ks','Celkově 597 ks (576 AD, 21 AE)',
 '222 AD ks (z toho 1 NOK)','100 AH volné','Celkově 327 ks (227 AD, 100 AH)',
 'NOK celkem: 5','TBKR07:'
]) assert(text.includes(expected),'copied text missing '+expected);
assert(text.includes('\nMO:\n') && text.includes('\nTO:\n'),'copied text must preserve readable newlines');
assert(!text.includes('NOK 0') && !/^\s*-\s*0 AH (?:ks|volné)\s*$/m.test(text),'copied text shows zero lines');
const freeText=render({date:'2026-09-18',shift:'R',moNok:'0',production:{mo:[],to:[],r01:[],r07:[{index:'AH',qty:'0',free:'100',nok:'3'}]},problems:[]});
assert(freeText.includes('100 AH volné (z toho 3 NOK)'),'copied text free-only NOK');
assert(freeText.includes('Celkově 100 ks (100 AH)'),'copied text free-only total');
assert(!freeText.includes('NOK celkem: 0'),'copied text zero MO NOK');
console.log('[report-index-grid-17015-smoke] OK 2 index-colored columns; MO 255, TO 1054, TBKR01 597, TBKR07 327; full-width totals; free-only NOK; zero suppression; copied text matches PNG; test DB only');