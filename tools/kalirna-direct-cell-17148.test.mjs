import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const wizard=fs.readFileSync(new URL('../admin-rotation-generator-wizard.js',import.meta.url),'utf8');
const admin=fs.readFileSync(new URL('../admin-rotation.js',import.meta.url),'utf8');
const rotation=fs.readFileSync(new URL('../rotace.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles-daymods.css',import.meta.url),'utf8');

function block(source,name,nextName){
  const start=source.indexOf('function '+name+'(');
  assert(start>=0,'missing '+name);
  const end=source.indexOf('\nfunction '+nextName+'(',start);
  assert(end>start,'missing boundary '+name+' -> '+nextName);
  return source.slice(start,end);
}

const helper=block(wizard,'adminRotationUnplannedPlaceKalirnaDisplayCell','adminRotationBuildUnplannedDayModCandidate');
const hard=['TNKS01','TBKR07','TPKW01','TPKW02','TBKR01'];
const soft=['MSKC01','MSKC03','MSKC04','MFKF06','MFKF10'];
const names=['A','B','C','D','E','F','G','H','I','K'];

function ctx(){
  const context=vm.createContext({
    Array,String,Set,Math,Number,
    HARD_MACHINE_HEADERS:hard,SOFT_MACHINE_HEADERS:soft,
    adminRotationCanonicalName:(value,known)=>known.includes(String(value||'').trim())?String(value||'').trim():'',
    adminRotationUnavailableNamesForDate:(month,date)=>{
      const blocked=new Set();
      (month.notes||[]).filter(n=>n.date===date).forEach(n=>blocked.add(n.person));
      (month.dayMods||[]).filter(m=>m.date===date&&m.type==='kalirnaOut').forEach(m=>blocked.add(m.person));
      return blocked;
    },
    adminRotationGeneratorHardTarget:(known,available)=>known.length===10&&available.length===7?4:Math.min(5,available.length),
    adminRotationGeneratorSoftSlotPlan:count=>count>=5?[0,1,2,3,4]:count===4?[0,1,2,4]:count===3?[1,2,4]:count===2?[1,4]:count===1?[4]:[],
    adminRotationGeneratorMachineIndex:(headers,machine)=>headers.indexOf(machine)
  });
  vm.runInContext(helper,context);
  return context;
}

function month(softCells,notes=[]){
  return {
    notes:JSON.parse(JSON.stringify(notes)),
    dayMods:[{section:'soft',date:'7.9. R',cellIndex:1,person:'K',type:'kalirnaOut'}],
    hard:{rows:[{date:'7.9. R',cells:['A','B','C','D','E']}]},
    soft:{rows:[{date:'7.9. R',cells:softCells.slice()}]}
  };
}

test('with only Kalírna missing physically: 4 active MO stay and K is displayed on MFKF06',()=>{
  const m=month(['F','G','H','','I']);
  const result=ctx().adminRotationUnplannedPlaceKalirnaDisplayCell(m,'7.9. R','K',names);
  assert.equal(result.machine,'MFKF06');
  assert.equal(result.softTarget,4);
  assert.deepEqual(Array.from(m.soft.rows[0].cells),['F','G','H','K','I']);
  assert.equal(m.dayMods[0].section,'soft');
  assert.equal(m.dayMods[0].cellIndex,3);
});

test('with one other absence plus Kalírna: 3 active MO stay and K is displayed on MSKC01',()=>{
  const m=month(['','F','G','','H'],[{date:'7.9. R',person:'I',code:'D'}]);
  const result=ctx().adminRotationUnplannedPlaceKalirnaDisplayCell(m,'7.9. R','K',names);
  assert.equal(result.machine,'MSKC01');
  assert.equal(result.softTarget,3);
  assert.deepEqual(Array.from(m.soft.rows[0].cells),['K','F','G','','H']);
  assert.equal(m.dayMods[0].cellIndex,0);
});

test('public/admin use direct kalirnaOut cell and pink presentation, not derived evidence DOM',()=>{
  assert(admin.includes("mod && mod.type === 'kalirnaOut'"));
  assert(rotation.includes("mod && mod.type === 'kalirnaOut'"));
  assert(rotation.includes("const exportWorker = mod && mod.type === 'kalirnaOut'"));
  assert(css.includes('.rakDayModCell.rakKalirnaOutCell'));
  assert(!admin.includes('rakKalirnaEvidenceList'));
  assert(!rotation.includes('rakKalirnaEvidenceList'));
});
