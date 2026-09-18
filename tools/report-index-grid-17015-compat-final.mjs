#!/usr/bin/env node
// Preserve the established text formatting pipeline without losing the new
// index-by-index production structure or changing the first-pass generators.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const path='rak-shift-report.js';
let source=fs.readFileSync(path,'utf8');
assert(source.includes('// RAK_SHIFT_TEXT_INDEX_TOTALS_17015'),'new text formatter missing');
const begin=source.indexOf('  function reportText(draft)');
const end=source.indexOf('  function saveLocal',begin);
assert(begin>=0&&end>begin,'reportText boundaries missing');
let block=source.slice(begin,end);
const safeReturn=String.raw`    return sortReportRowsByIndexColor(formatShiftReportText(lines.join('\n').trim()));`;
if(!block.includes(safeReturn)){
  const from=block.indexOf('    return lines.join(');
  const to=block.indexOf(';',from);
  assert(from>=0&&to>from,'new formatter return missing');
  block=block.slice(0,from)+safeReturn+block.slice(to+1);
}
// The old sorter reorders dash-prefixed rows. Use clean indentation instead,
// so AF remains left/first and AG right/second as on the PNG.
block=block.replaceAll("lines.push('  - '+item.text)","lines.push('  '+item.text)")
  .replace("lines.push('  - Bez záznamu')","lines.push('  Bez záznamu')");
source=source.slice(0,begin)+block+source.slice(end);
// The former formatter relabelled this footer. Retain the same NOK title
// as the PNG while continuing to use the legacy formatting pipeline.
const oldNok="if (nok) value = '  - ' + nok[1] + ' NoK';";
const newNok="if (nok) value = '  NOK celkem: ' + nok[1];";
if(source.includes(oldNok)) source=source.replace(oldNok,newNok);
assert(source.includes(newNok),'MO NOK footer label missing');
assert(source.includes(safeReturn),'safe text pipeline missing');
fs.writeFileSync(path,source,'utf8');
execFileSync(process.execPath,['--check',path],{stdio:'pipe'});
const actual=fs.readFileSync(path,'utf8');
const reportStart=actual.indexOf('  function reportText(draft)');
const reportEnd=actual.indexOf('  function saveLocal',reportStart);
const helpersStart=actual.indexOf('  function reportLineIndex(line) {');
assert(helpersStart>=0&&reportEnd>reportStart&&reportStart>helpersStart,'report helper bounds');
const context=vm.createContext({REPORT_SEPARATOR:'__________',INDEX_ORDER:{AG:0,AE:0,AF:1,AD:1,AH:2}});
vm.runInContext(actual.slice(helpersStart,reportStart),context);
vm.runInContext(actual.slice(reportStart,reportEnd),context);
const render=vm.runInContext('reportText',context);
const output=render({date:'2026-09-18',shift:'R',moNok:'5',production:{
 mo:[{index:'AF',qty:'55',free:'100'},{index:'AG',qty:'100'}],
 to:[{index:'AD',qty:'255'},{index:'AE',qty:'244'},{index:'AH',qty:'555'}],
 r01:[{index:'AD',qty:'555',free:'21',nok:'2'},{index:'AE',qty:'21'}],
 r07:[{index:'AD',qty:'222',free:'5',nok:'1'},{index:'AH',free:'100'}]
},problems:[]});
assert(output.indexOf('55 AF')<output.indexOf('100 AG'),'MO index order differs from PNG');
for(const item of ['Celkově 155 AF, 100 AG (255 ks)','Celkově 1 054 ks','Celkově 597 ks (576 AD, 21 AE)','Celkově 327 ks (227 AD, 100 AH)','NOK celkem: 5'])
  assert(output.includes(item),'formatted text differs from PNG: '+item);
console.log('[report-index-grid-17015-compat] OK legacy text pipeline + new MO/TO/grinder totals; index order, NOK label and readable copied output verified');