#!/usr/bin/env node
import fs from 'node:fs';
const read = (f) => fs.readFileSync(f, 'utf8');
const write = (f, v) => fs.writeFileSync(f, v, 'utf8');
const must = (ok, m) => { if (!ok) throw new Error('[rak-170-brusy-order] ' + m); };
let s = read('rak-shift-report.js');
const oldOrder = "fields.includes('nok')?'  '+inputNumber(d.nok,'rakShiftNok','NOK'):'',fields.includes('free')?'  '+inputNumber(d.free,'rakShiftFree','volné'):''";
const newOrder = "fields.includes('free')?'  '+inputNumber(d.free,'rakShiftFree','volné'):'',fields.includes('nok')?'  '+inputNumber(d.nok,'rakShiftNok','NOK'):''";
must(s.includes(oldOrder) || s.includes(newOrder), 'field order anchor missing');
if (s.includes(oldOrder)) s = s.replace(oldOrder, newOrder);
must(s.includes(newOrder), 'NOK is not after free');
write('rak-shift-report.js', s);
console.log('[rak-170-brusy-order] OK Index | kusy | volné | NOK');
