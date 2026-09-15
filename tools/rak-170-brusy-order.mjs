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

const oldReport = "        const extras=[];\n        if(r.nok)extras.push(r.nok+' NOK');\n        if(r.free)extras.push('z toho '+r.free+' volné');\n        lines.push('  - '+r.qty+' '+r.index+(extras.length?' ('+extras.join(', ')+')':''));";
const newReport = "        if(id==='r01'||id==='r07'){\n          const freePart=r.free?' (z toho '+r.free+' volné)':'';\n          const nokPart=r.nok?' ('+r.nok+' NOK)':'';\n          lines.push('  - '+r.qty+' '+r.index+freePart+nokPart);\n          return;\n        }\n        const extras=[];\n        if(r.nok)extras.push(r.nok+' NOK');\n        if(r.free)extras.push('z toho '+r.free+' volné');\n        lines.push('  - '+r.qty+' '+r.index+(extras.length?' ('+extras.join(', ')+')':''));";
must(s.includes(oldReport) || s.includes("const freePart=r.free?' (z toho '+r.free+' volné)':'';"), 'report output anchor missing');
if (s.includes(oldReport)) s = s.replace(oldReport, newReport);
must(s.includes("const freePart=r.free?' (z toho '+r.free+' volné)':'';"), 'free part not separated');
must(s.includes("const nokPart=r.nok?' ('+r.nok+' NOK)':'';"), 'NOK part not separated');
must(s.indexOf("const freePart=r.free") < s.indexOf("const nokPart=r.nok"), 'report order is not free before NOK');

write('rak-shift-report.js', s);
console.log('[rak-170-brusy-order] OK input/output: Index | kusy | volné | NOK; free and NOK separated');
