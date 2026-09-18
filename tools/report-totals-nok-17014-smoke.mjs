#!/usr/bin/env node
// Test the real PNG line formatter from both image and share entrypoints.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const read = file => fs.readFileSync(file, 'utf8');
const config = read('supabase-config.js');
const index = read('index.html');
assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co') && !config.includes('bkqamcbkiwumsvelahxr'), 'test Supabase isolation');
assert(config.includes('window.RAK_RELEASE_VERSION = "1.7.14";'), 'visible version');
assert(config.includes('window.RAK_PWA_BUILD = "v1.7.14-reporttotals1";'), 'build version');
assert(index.includes("var build='v1.7.14-reporttotals1';"), 'index build');
assert.equal(JSON.parse(read('package.json')).version, '1.7.0', 'technical version must stay');

for (const file of ['rak-shift-report-image.js', 'rak-shift-report-share.js']) {
  const src = read(file);
  assert(src.includes('// RAK_REPORT_NOK_TOTALS_ZERO_17014'), file + ': patch marker');
  assert(src.includes('// RAK_MOBILE_REPORT_LINES_17013'), file + ': mobile portrait lost');
  assert(src.includes('const CANVAS_WIDTH = 1080;'), file + ': wrong mobile width');
  assert(src.includes('ctx.globalAlpha = .16;'), file + ': watermark lost');
  assert(src.includes("fill: 'rgba(45,156,255,.26)'"), file + ': blue saturation');
  assert(src.includes("fill: 'rgba(139,228,88,.27)'"), file + ': green saturation');
  assert(src.includes("fill: 'rgba(255,179,63,.28)'"), file + ': orange saturation');
  assert(src.includes("AF:'#004e83'"), file + ': blue AF text');
  assert(src.includes("(positiveQuantity17014(section.totalNok)?58:0)"), file + ': zero MO NOK height');
  assert(src.includes('if(positiveQuantity17014(section.totalNok)){'), file + ': zero MO NOK footer');
  assert(src.includes("title: 'RaK – Report směny diferenciály'"), file + ': iPhone sharing lost');
  const start = src.indexOf('  function quantityNumber17013(value) {');
  const end = src.indexOf('  function wrappedSectionLines17013(ctx,section,maxWidth) {', start);
  assert(start >= 0 && end > start, file + ': production formatting region');
  const context = vm.createContext({});
  vm.runInContext(src.slice(start, end), context);
  const lines = vm.runInContext('sectionLines17013', context);
  const texts = section => Array.from(lines(section), item => item.text);

  assert.deepEqual(texts({id:'r01',rows:[
    {index:'AD',qty:'555',free:'21',nok:'2'},
    {index:'AE',qty:'21',free:'0',nok:'0'}
  ]}), [
    '555 AD ks (z toho 2 NOK)',
    '21 AD volné',
    '21 AE ks',
    'Celkově 597 ks (576 AD, 21 AE)'
  ], file + ': exact TBKR01 customer fixture');
  assert.deepEqual(texts({id:'r07',rows:[
    {index:'AD',qty:'222',free:'5',nok:'1'},
    {index:'AH',qty:'0',free:'100',nok:'0'}
  ]}), [
    '222 AD ks (z toho 1 NOK)',
    '5 AD volné',
    '100 AH volné',
    'Celkově 327 ks (227 AD, 100 AH)'
  ], file + ': exact TBKR07 customer fixture');
  assert.deepEqual(texts({id:'r07',rows:[{index:'AH',qty:'',free:'100',nok:'3'}]}), [
    '100 AH volné (z toho 3 NOK)',
    'Celkově 100 ks (100 AH)'
  ], file + ': NOK on a free-only index must appear and must not be added to total');
  assert.deepEqual(texts({id:'r01',rows:[{index:'AD',qty:'0',free:'0',nok:'0'}]}), [
    'Bez záznamu'
  ], file + ': zero-only lines must disappear, not show 0 ks');
  assert.deepEqual(texts({id:'r01',rows:[{index:'AD',qty:'0',free:'0',nok:'2'}]}), [
    'AD NOK 2'
  ], file + ': positive standalone NOK must not vanish or invent production');
  const mo = lines({id:'mo',rows:[{index:'AF',qty:'55',free:'100',nok:'0'}]});
  assert.deepEqual(Array.from(mo, item => item.text), ['55 AF','100 AF volné','Celkově 155 AF'], file + ': MO regular and free totals');
  assert.equal(mo[0].index, 'AF', file + ': MO first row must have AF blue color');
  assert.deepEqual(texts({id:'mo',rows:[
    {index:'AF',qty:'200',free:'100',nok:''},
    {index:'AG',qty:'300',free:'0',nok:''}
  ]}), ['200 AF, 300 AG', '100 AF volné', 'Celkově 300 AF, 300 AG'], file + ': multi-index MO grouping');
  assert.deepEqual(texts({id:'to',rows:[{index:'AH',qty:'0',free:'0',nok:'0'},{index:'AD',qty:'255',free:'0',nok:'0'}]}), [
    'AD 255 ks'
  ], file + ': TO zero suppression');
}
console.log('[report-totals-nok-17014-smoke] OK exact TBKR01=597, TBKR07=327, free-only NOK kept, zero values hidden, MO blue/total, stronger index colors, 1080px portrait, share and test Supabase');