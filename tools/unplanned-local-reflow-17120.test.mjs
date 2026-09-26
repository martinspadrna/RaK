import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const rotation = read('admin-rotation.js');
const wizard = read('admin-rotation-generator-wizard.js');
const generator = read('admin-rotation-generator.js');

function block(source,name,nextName){
  const start=source.indexOf('function '+name+'(');
  assert(start>=0,'missing '+name);
  const end=source.indexOf('\nfunction '+nextName+'(',start);
  assert(end>start,'missing boundary '+name+' -> '+nextName);
  return source.slice(start,end);
}

test('scoped unplanned generation skips month-wide rebalance and repair passes',()=>{
  assert(rotation.includes('const scopedGeneration = scopedDateLabels.length > 0;'));
  assert(rotation.includes("const tnksBalance = scopedGeneration ? scopedNoop() : adminRotationGeneratorBalanceHardMachine"));
  assert(rotation.includes('const finalSoloMillStreakRepair = scopedGeneration ? scopedNoop()'));
  assert(rotation.includes('const finalTpkw02Balance = scopedGeneration ? scopedNoop()'));
  assert.equal((wizard.match(/scopedDateLabels: allowedDateLabels/g)||[]).length,2);
});

test('selected-date issue filter ignores 30.9 when only 26.9 is edited',()=>{
  const source=block(wizard,'adminRotationUnplannedIssueTouchesSelectedDate','adminRotationUnplannedAssertSelectedDayStaffing');
  const context=vm.createContext({
    String,Array,
    adminRotationDateBaseKey:value=>String(value||'').replace(/\s+(?:R8|N8|R|N)$/,'')
  });
  vm.runInContext(source,context);
  assert.equal(context.adminRotationUnplannedIssueTouchesSelectedDate({message:'26.9. R: Blažek má absenci a zároveň je v rozpisu.'},['26.9. R']),true);
  assert.equal(context.adminRotationUnplannedIssueTouchesSelectedDate({message:'30.9. N: Synek je ve stejném bloku trojice na TPKW02 podruhé.'},['26.9. R']),false);
});

test('four available MO workers must be exactly 3 lathes plus 1 mill and no blocked person',()=>{
  const source=block(wizard,'adminRotationUnplannedAssertSelectedDayStaffing','adminRotationBuildUnplannedChangeCandidate');
  const names=['A','B','C','D','E','F','G','H','I','Blažek'];
  const hardHeaders=['TNKS01','TPKW01','TPKW02','TBKR01','TBKR07'];
  const softHeaders=['MSKC01','MSKC03','MSKC04','MFKF06','MFKF10'];
  const context=vm.createContext({
    String,Array,Set,Math,Error,
    HARD_MACHINE_HEADERS:hardHeaders,
    SOFT_MACHINE_HEADERS:softHeaders,
    adminGetKnownNames:()=>names.slice(),
    adminRotationUnavailableNamesForDate:()=>new Set(['Blažek']),
    adminRotationCanonicalName:(value,known)=>known.includes(String(value||'').trim())?String(value||'').trim():'',
    adminRotationGeneratorHardTarget:()=>5,
    adminRotationGeneratorMachineIndex:(headers,name)=>headers.indexOf(name)
  });
  vm.runInContext(source,context);
  const ok={
    hard:{rows:[{date:'26.9. R',cells:['A','B','C','D','E']}]},
    soft:{rows:[{date:'26.9. R',cells:['F','G','H','', 'I']}]}
  };
  assert.equal(context.adminRotationUnplannedAssertSelectedDayStaffing(ok,['26.9. R']),true);
  const badBlocked=JSON.parse(JSON.stringify(ok));
  badBlocked.soft.rows[0].cells[1]='Blažek';
  assert.throws(()=>context.adminRotationUnplannedAssertSelectedDayStaffing(badBlocked,['26.9. R']),/nedostupný/);
  const badLayout=JSON.parse(JSON.stringify(ok));
  badLayout.soft.rows[0].cells=['F','G','','H','I'];
  assert.throws(()=>context.adminRotationUnplannedAssertSelectedDayStaffing(badLayout,['26.9. R']),/3 soustruhy a 1 fréza/);
});

test('existing soft-slot plan for four MO workers is 3 lathes and one mill',()=>{
  const match=generator.match(/function adminRotationGeneratorSoftSlotPlan\(softCount\) \{[\s\S]*?\n\}/);
  assert(match);
  const soft=['MSKC01','MSKC03','MSKC04','MFKF06','MFKF10'];
  const context=vm.createContext({SOFT_MACHINE_HEADERS:soft,adminRotationGeneratorMachineIndex:(headers,name)=>headers.indexOf(name)});
  vm.runInContext(match[0],context);
  const layout=Array.from(context.adminRotationGeneratorSoftSlotPlan(4)).map(i=>soft[i]);
  assert.deepEqual(layout,['MSKC01','MSKC03','MSKC04','MFKF10']);
});

test('absence and Kalírna candidates validate only newly introduced selected-day errors',()=>{
  assert.equal((wizard.match(/adminRotationUnplannedIssueTouchesSelectedDate\(issue, allowedDateLabels\)/g)||[]).length,2);
  assert.equal((wizard.match(/adminRotationUnplannedAssertSelectedDayStaffing\(/g)||[]).length>=3,true);
});
