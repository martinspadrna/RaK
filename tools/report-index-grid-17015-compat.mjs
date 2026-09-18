#!/usr/bin/env node
// Restore the established text formatter pipeline after the new 1.7.15 per-index model.
// This keeps the second build's critical runtime contract and preserves AF/AG input order.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const file='rak-shift-report.js';
let source=fs.readFileSync(file,'utf8');
const marker='// RAK_SHIFT_TEXT_INDEX_TOTALS_17015';
assert(source.includes(marker),'1.7.15 text generator missing');
const begin=source.indexOf('  function reportText(draft)');
const end=source.indexOf('  function saveLocal',begin);
assert(begin>=0 && end>begin,'reportText function missing');
let block=source.slice(begin,end);
const expectedReturn=String.raw`    return sortReportRowsByIndexColor(formatShiftReportText(lines.join('\n').trim()));`;
if (!block.includes(expectedReturn)) {
  const oldStart=block.indexOf('    return lines.join(');
  const oldEnd=block.indexOf(';',oldStart);
  assert(oldStart>=0 && oldEnd>oldStart,'new text return anchor missing');
  block=block.slice(0,oldStart)+expectedReturn+block.slice(oldEnd+1);
}
// The legacy sorter only reorders lines beginning with "-". Here each index's
// normal/free lines are intentionally already grouped in display order.
block=block.replaceAll("lines.push('  - '+item.text)","lines.push('  '+item.text)")
  .replace("lines.push('  - Bez záznamu')","lines.push('  Bez záznamu')");
source=source.slice(0,begin)+block+source.slice(end);
// Preserve the visible section-wide NOK footer instead of converting it to a
// separate unspecific bullet by the historic formatter.
const nokOld="if (nok) value = '  - ' + nok[1] + ' NoK';";
const nokNew="if (nok) value = '  NOK celkem: ' + nok[1];";
if (source.includes(nokOld)) source=source.replace(nokOld,nokNew);
assert(source.includes(nokNew),'MO NOK footer must retain its label');
assert(source.includes(expectedReturn),'verified text pipeline must remain present');
fs.writeFileSync(file,source,'utf8');
execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
const latest=fs.readFileSync(file,'utf8');
const from=latest.indexOf('  function reportText(draft)');
const to=latest.indexOf('  function saveLocal',from);
const context=vm.createContext({
 formatShiftReportText: vm.runInNewContext('(' + latest.slice(latest.indexOf('  function formatShiftReportText(text) {'),latest.indexOf('  function sortReportRowsByIndexColor(text) {')).trim().replace(/^function formatShiftReportText/,'function formatShiftReportText') + ')'),
 sortReportRowsByIndexColor:()=>{throw Error('sort must be supplied below');}
});
// The app's real formatter and sorter are evaluated from the same deployed file.
vm.runInContext(latest.slice(latest.indexOf('  function reportLineIndex(line) {'),from),context);
vm.runInContext(latest.slice(from,to),context);
const render=vm.runInContext('reportText',context);
const result=render({date:'2026-09-18',shift:'R',moNok:'5',production:{
 mo:[{index:'AF',qty:'55',free:'100'},{index:'AG',qty:'100'}],
 to:[{index:'AD',qty:'255'},{index:'AE',qty:'244'},{index:'AH',qty:'555'}],
 r01:[{index:'AD',qty:'555',free:'21',nok:'2'},{index:'AE',qty:'21'}],
 r07:[{index:'AD',qty:'222',free:'5',nok:'1'},{index:'AH',free:'100'}]
},problems:[]});
assert(result.indexOf('55 AF')<result.indexOf('100 AG'),'AF/AG must preserve PNG index order');
for(const part of ['Celkově 155 AF, 100 AG (255 ks)','Celkově 1 054 ks','Celkově 597 ks (576 AD, 21 AE)','Celkově 327 ks (227 AD, 100 AH)','NOK celkem: 5'])
  assert(result.includes(part),'formatted text missing '+part);
console.log('[report-index-grid-17015-compat] OK inherited text pipeline retained, per-index row order preserved, NOK footer and PNG totals match');