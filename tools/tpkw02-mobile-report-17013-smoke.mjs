#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read = (file) => fs.readFileSync(file, 'utf8');
const generator = read('admin-rotation-generator.js');
const rotation = read('admin-rotation.js');
const image = read('rak-shift-report-image.js');
const share = read('rak-shift-report-share.js');
const config = read('supabase-config.js');
const index = read('index.html');
assert(generator.includes('// RAK_TPKW02_FINAL_FAIRNESS_17013'));
assert(rotation.includes('// RAK_TPKW02_FINAL_CALL_17013'));
assert(rotation.indexOf('adminRotationGeneratorBalancePressHalfSteps17012(month, model, monthKey)') < rotation.indexOf('adminRotationGeneratorBalanceTpkw02Final17013(month, model, monthKey)'));
assert(rotation.indexOf('adminRotationGeneratorBalanceTpkw02Final17013(month, model, monthKey)') < rotation.indexOf("adminRotationValidateMonthRules(month, monthKey, { source: 'generator' })"));
assert(generator.includes("if (!/^TBKR/i.test(String(otherMachine || ''))) return;"));
assert(generator.includes('adminRotationGeneratorPersonKnowsMachine(high, otherMachine)'));
assert(generator.includes('adminRotationGeneratorIsSundayMorning17011(row.date, monthKey)'));
assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co') && !config.includes('bkqamcbkiwumsvelahxr'));
assert(config.includes('window.RAK_RELEASE_VERSION = "1.7.13";'));
assert(index.includes("var build='v1.7.13-tpkwmobile1';"));
const begin = generator.indexOf('// RAK_TPKW02_FINAL_FAIRNESS_17013');
const end = generator.indexOf('function adminRotationGeneratorCountSoftKinds(month, names) {', begin);
assert(end > begin);
const HEADERS = ['TNKS01','TBKR07','TPKW01','TPKW02','TBKR01'];
const names = ['A','B','C','D','E','F','G','H','I'];
const rows = [
 ['1.10. N','G','F','A','C','D'],
 ['5.10. R','H','C','F','E','B'],
 ['6.10. R','I','D','B','A','E'],
 ['9.10. N','E','B','D','A','F'],
 ['10.10. N','A','E','G','D','C'],
 ['11.10. N8','C','F','H','B','D'],
 ['14.10. R','D','C','I','A','B'],
 ['15.10. R','B','D','C','F','E'],
 ['19.10. N','A','B','D','G','F'],
 ['20.10. N','F','E','B','H','C'],
 ['23.10. R','C','F','E','I','D'],
 ['24.10. R','G','C','F','E','B'],
 ['25.10. R8','H','A','C','F','E'],
 ['29.10. N','I','B','E','','F']
];
const fixture = { hard: { rows: rows.map((r) => ({ date:r[0], cells:r.slice(1) })) }, soft: { rows: [] } };
const before = JSON.parse(JSON.stringify(fixture));
const count = (month, machine, eligible) => {
 const idx = HEADERS.indexOf(machine);
 return Object.fromEntries(eligible.map((n) => [n, month.hard.rows.filter((r) => r.cells[idx] === n).length]));
};
const context = vm.createContext({
 HARD_MACHINE_HEADERS:HEADERS,
 adminGetKnownNames:()=>names,
 adminRotationCanonicalName:(val,known)=>known.includes(val)?val:'',
 adminRotationGeneratorGetSoftCoreNames:()=>['G','H','I'],
 adminRotationGeneratorCollectWorkingNames:()=>names,
 adminRotationGeneratorMachineIndex:(list,machine)=>list.indexOf(machine),
 adminRotationGeneratorPersonKnowsMachine:()=>true,
 adminRotationGeneratorIsWorkingRow:()=>true,
 adminRotationGeneratorIsSundayMorning17011:(date)=>date==='25.10. R8',
 adminRotationGeneratorCanUseHardMachine:()=>true,
 adminRotationGeneratorCountHardMachine:count
});
vm.runInContext(generator.slice(begin,end),context);
const balance = vm.runInContext('adminRotationGeneratorBalanceTpkw02Final17013',context);
const beforePress = before.hard.rows.map((r)=>[r.cells[0],r.cells[2]]);
const result = balance(fixture,{knownNames:names,yearHardMachineStats:{TPKW02:{}}},'10/26');
const counts = count(fixture,'TPKW02',names.slice(0,6));
assert.equal(result.swaps,1);
assert.equal(result.spread,1);
assert.equal(counts.A,2);
assert.equal(counts.B,2);
assert.deepEqual(fixture.hard.rows.map((r)=>[r.cells[0],r.cells[2]]),beforePress,'press assignments changed');
assert.equal(fixture.hard.rows[6].cells[4],'A','14 Oct Novotny to TBKR01');
assert.equal(fixture.hard.rows[6].cells[3],'B','14 Oct Kriz to TPKW02');
assert.deepEqual(fixture.hard.rows[12],before.hard.rows[12],'Sunday changed');
assert.equal(balance(fixture,{knownNames:names},'10/26').swaps,0,'balancer not idempotent');
const unqualified=JSON.parse(JSON.stringify(before));
context.adminRotationGeneratorPersonKnowsMachine=(name,machine)=>!(name==='A' && /^TBKR/.test(machine));
assert.equal(balance(unqualified,{knownNames:names},'10/26').swaps,0,'unqualified grinder swap performed');
assert.deepEqual(unqualified,before,'unqualified worker changed');

for (const [label,source] of [['image',image],['share',share]]) {
 assert(source.includes('// RAK_MOBILE_REPORT_LINES_17013'),label+' mobile marker missing');
 assert(source.includes('const CANVAS_WIDTH = 1080;'),label+' wrong portrait width');
 assert(source.includes('const MIN_CANVAS_HEIGHT = 1920;'),label+' wrong portrait baseline');
 assert(source.includes('ctx.globalAlpha = .16;'),label+' crab changed');
 assert(source.includes("'rgba(255,255,255,.36)'"),label+' translucency changed');
 assert(source.includes('model.sections.forEach((section) => {'),label+' stacked mobile cards missing');
 assert(source.includes("title: 'RaK – Report směny diferenciály'"),label+' share title changed');
 const p=source.indexOf('// RAK_MOBILE_REPORT_LINES_17013');
 const q=source.indexOf('function roundedPath(ctx, x, y, w, h, r) {',p);
 assert(q>p,label+' line helper boundary missing');
 const helper=source.slice(p,q);
 const ctx=vm.createContext({
   CANVAS_WIDTH:1080,MIN_CANVAS_HEIGHT:1920,MAX_CANVAS_HEIGHT:8192,OUTER:50,
   document:{createElement:()=>({getContext:()=>({font:'',measureText:(s)=>({width:s.length*23})})})},
   wrapLines:(context,text,width)=> { const max=Math.max(2,Math.floor(width/23)); const words=text.split(/\s+/); const arr=[];let cur=''; for(const word of words){ if(cur && (cur+' '+word).length>max){arr.push(cur);cur=word;}else cur=cur?cur+' '+word:word;} if(cur)arr.push(cur); return arr; }
 });
 vm.runInContext(helper,ctx);
 const lines=vm.runInContext('sectionLines17013',ctx);
 assert.deepEqual(Array.from(lines({id:'mo',rows:[{index:'AF',qty:'200',free:'100',nok:''},{index:'AG',qty:'300',free:'',nok:''}]}).map(x=>x.text)),
 ['200 AF, 300 AG','100 AF volné','Celkově 300 AF, 300 AG']);
 assert.deepEqual(Array.from(lines({id:'r01',rows:[{index:'AD',qty:'300',free:'100',nok:''},{index:'AE',qty:'300',free:'',nok:''}]}).map(x=>x.text)),
 ['AD 300 ks','AD 100 volné','AE 300 ks','600 ks (300 AD, 300 AE)']);
 assert.deepEqual(Array.from(lines({id:'r07',rows:[{index:'AD',qty:'',free:'200',nok:''}]}).map(x=>x.text)),
 ['AD 200 volné','0 ks']);
 const height=vm.runInContext('estimateHeight',ctx)({sections:[{id:'mo',rows:[{index:'AF',qty:'200',free:'100'}]},{id:'to',rows:[{index:'AF',qty:'200'}]},{id:'r01',rows:[{index:'AD',qty:'300',free:'100'}]},{id:'r07',rows:[{index:'AE',qty:'300'}]}],problems:[]});
 assert(height>=1920 && height<=8192,label+' height invalid');
}
console.log('[tpkw02-mobile-report-17013-smoke] OK October: TPKW02 3→2, 1→2, full press untouched, no Sunday/core shifts; mobile 1080 portrait, MO/free totals, per-index grinder and complete-piece total, free-only starts first');