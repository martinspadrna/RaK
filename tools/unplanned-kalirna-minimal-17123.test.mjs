import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const wizard=fs.readFileSync(new URL('../admin-rotation-generator-wizard.js',import.meta.url),'utf8');

function block(source,name,nextName){
  const start=source.indexOf('function '+name+'(');
  assert(start>=0,'missing '+name);
  const end=source.indexOf('\nfunction '+nextName+'(',start);
  assert(end>start,'missing boundary '+name+' -> '+nextName);
  return source.slice(start,end);
}

const helper=block(wizard,'adminRotationUnplannedTryMinimalKalirnaSoftReflow','adminRotationBuildUnplannedDayModCandidate');
const hard=['TNKS01','TBKR07','TPKW01','TPKW02','TBKR01'];
const soft=['MSKC01','MSKC03','MSKC04','MFKF06','MFKF10'];
const names=['A','B','C','D','E','F','G','H','I','Blažek'];

function makeContext(knows=()=>true){
  const ctx=vm.createContext({
    Array,String,Set,Map,Math,Number,JSON,
    HARD_MACHINE_HEADERS:hard,
    SOFT_MACHINE_HEADERS:soft,
    adminRotationCanonicalName:(value,known)=>known.includes(String(value||'').trim())?String(value||'').trim():'',
    adminRotationUnplannedFindAssignment:(month,date,person)=>{
      const row=month.soft.rows.find(r=>r.date===date);
      const idx=row.cells.indexOf(person);
      if(idx<0) throw new Error('missing');
      return {section:'soft',cellIndex:idx};
    },
    adminRotationUnavailableNamesForDate:(month,date,known)=>{
      const mods=Array.isArray(month.dayMods)?month.dayMods:[];
      return new Set(mods.filter(m=>m.date===date&&m.type==='kalirnaOut').map(m=>m.person));
    },
    adminRotationGeneratorHardTarget:()=>5,
    adminRotationGeneratorSoftSlotPlan:count=>count===5?[0,1,2,3,4]:count===4?[0,1,2,4]:count===3?[1,2,4]:[],
    adminRotationGeneratorPersonKnowsMachine:knows
  });
  vm.runInContext(helper,ctx);
  return ctx;
}

function month(softCells){
  return {
    hard:{rows:[{date:'26.9. R',cells:['A','B','C','D','E']}]},
    soft:{rows:[{date:'26.9. R',cells:softCells.slice()}]},
    dayMods:[]
  };
}
function withKalirna(source,person){
  const target=JSON.parse(JSON.stringify(source));
  target.dayMods=[{date:'26.9. R',person,type:'kalirnaOut',section:'soft',cellIndex:source.soft.rows[0].cells.indexOf(person)}];
  return target;
}

test('Blažek on a lathe is replaced by MFKF06 worker while MFKF10 stays solo',()=>{
  const source=month(['F','Blažek','G','H','I']);
  const target=withKalirna(source,'Blažek');
  const ctx=makeContext();
  assert.equal(ctx.adminRotationUnplannedTryMinimalKalirnaSoftReflow(source,target,'26.9. R','Blažek',names),true);
  assert.deepEqual(Array.from(target.soft.rows[0].cells),['F','H','G','','I']);
  assert.deepEqual(Array.from(target.hard.rows[0].cells),['A','B','C','D','E']);
});

test('Kalírna from MFKF06 needs no other worker movement',()=>{
  const source=month(['F','G','H','Blažek','I']);
  const target=withKalirna(source,'Blažek');
  const ctx=makeContext();
  assert.equal(ctx.adminRotationUnplannedTryMinimalKalirnaSoftReflow(source,target,'26.9. R','Blažek',names),true);
  assert.deepEqual(Array.from(target.soft.rows[0].cells),['F','G','H','','I']);
});

test('Kalírna from MFKF10 moves only the MFKF06 worker onto MFKF10',()=>{
  const source=month(['F','G','H','I','Blažek']);
  const target=withKalirna(source,'Blažek');
  const ctx=makeContext();
  assert.equal(ctx.adminRotationUnplannedTryMinimalKalirnaSoftReflow(source,target,'26.9. R','Blažek',names),true);
  assert.deepEqual(Array.from(target.soft.rows[0].cells),['F','G','H','','I']);
});

test('qualification tie prefers moving mill workers instead of disturbing another lathe worker',()=>{
  const source=month(['F','Blažek','G','H','I']);
  const target=withKalirna(source,'Blažek');
  const ctx=makeContext((name,machine)=>{
    if(name==='H'&&machine==='MSKC03') return false;
    if(name==='I'&&machine==='MSKC03') return true;
    if(name==='H'&&machine==='MFKF10') return true;
    return true;
  });
  assert.equal(ctx.adminRotationUnplannedTryMinimalKalirnaSoftReflow(source,target,'26.9. R','Blažek',names),true);
  assert.deepEqual(Array.from(target.soft.rows[0].cells),['F','I','G','','H']);
});

test('no qualified local permutation returns false so caller can use generator fallback',()=>{
  const source=month(['F','Blažek','G','H','I']);
  const target=withKalirna(source,'Blažek');
  const originalMachine={F:'MSKC01',G:'MSKC04',H:'MFKF06',I:'MFKF10'};
  const ctx=makeContext((name,machine)=>originalMachine[name]===machine);
  assert.equal(ctx.adminRotationUnplannedTryMinimalKalirnaSoftReflow(source,target,'26.9. R','Blažek',names),false);
  assert.deepEqual(Array.from(target.soft.rows[0].cells),['F','Blažek','G','H','I']);
});

test('daymod path uses minimal reflow first and generator only for unresolved dates',()=>{
  const start=wizard.indexOf('function adminRotationBuildUnplannedDayModCandidate(');
  const end=wizard.indexOf('\nfunction adminRotationUnplannedOperationId(',start);
  const daymod=wizard.slice(start,end);
  assert(daymod.includes('const fallbackDateLabels = [];'));
  assert(daymod.includes('adminRotationUnplannedTryMinimalKalirnaSoftReflow'));
  assert(daymod.includes('if (fallbackDateLabels.length)'));
  assert(daymod.includes('scopedDateLabels: fallbackDateLabels'));
});
