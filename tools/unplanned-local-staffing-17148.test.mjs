import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const generator=fs.readFileSync(new URL('../admin-rotation-generator.js',import.meta.url),'utf8');
const wizard=fs.readFileSync(new URL('../admin-rotation-generator-wizard.js',import.meta.url),'utf8');

function block(source,name,nextName){
  const start=source.indexOf('function '+name+'(');
  assert(start>=0,'missing '+name);
  const end=source.indexOf('\nfunction '+nextName+'(',start);
  assert(end>start,'missing boundary '+name+' -> '+nextName);
  return source.slice(start,end);
}
const softPlan=block(generator,'adminRotationGeneratorSoftSlotPlan','adminRotationGeneratorSoftKind');
const hardTarget=block(generator,'adminRotationGeneratorThreeAbsences','adminRotationGeneratorBuildDay');
const applyAbsence=block(wizard,'adminRotationUnplannedApplyAbsenceNotes','adminRotationUnplannedGenerationSeed');
const splice=block(wizard,'adminRotationUnplannedSpliceGeneratedDays','adminRotationUnplannedAssertIsolation');
const isolate=block(wizard,'adminRotationUnplannedAssertIsolation','adminRotationUnplannedIssueKey');

const hard=['TNKS01','TBKR07','TPKW01','TPKW02','TBKR01'];
const soft=['MSKC01','MSKC03','MSKC04','MFKF06','MFKF10'];
const names=['A','B','C','D','E','F','G','H','I','J'];

test('one absence means 5 TO + 4 MO on 3 lathes and MFKF10',()=>{
  const c=vm.createContext({Array,Math,HARD_MACHINE_HEADERS:hard,SOFT_MACHINE_HEADERS:soft,adminRotationGeneratorMachineIndex:(h,m)=>h.indexOf(m)});
  vm.runInContext(softPlan+'\n'+hardTarget,c);
  const available=names.slice(0,9);
  const h=c.adminRotationGeneratorHardTarget(names,available);
  const s=available.length-h;
  assert.equal(h,5);
  assert.equal(s,4);
  assert.deepEqual(Array.from(c.adminRotationGeneratorSoftSlotPlan(s)).map(i=>soft[i]),['MSKC01','MSKC03','MSKC04','MFKF10']);
});

test('two absences mean 5 TO + 3 MO on two lathes and MFKF10',()=>{
  const c=vm.createContext({Array,Math,HARD_MACHINE_HEADERS:hard,SOFT_MACHINE_HEADERS:soft,adminRotationGeneratorMachineIndex:(h,m)=>h.indexOf(m)});
  vm.runInContext(softPlan+'\n'+hardTarget,c);
  const available=names.slice(0,8);
  const h=c.adminRotationGeneratorHardTarget(names,available);
  const s=available.length-h;
  assert.equal(h,5);
  assert.equal(s,3);
  assert.deepEqual(Array.from(c.adminRotationGeneratorSoftSlotPlan(s)).map(i=>soft[i]),['MSKC03','MSKC04','MFKF10']);
});

test('absence reasons write the person to notes/Absence and keep an existing absence',()=>{
  const c=vm.createContext({
    Array,String,Set,JSON,
    adminGetKnownNames:()=>names,
    adminRotationCanonicalName:(v,known)=>known.includes(String(v||'').trim())?String(v||'').trim():'',
    parseDateToken:()=>({shift:'R'})
  });
  vm.runInContext(applyAbsence,c);
  const before={notes:[{date:'7.9. R',person:'A',code:'D',shift:'R',text:'A D'}]};
  const after=c.adminRotationUnplannedApplyAbsenceNotes(before,['7.9. R'],'B','D');
  assert.equal(after.notes.length,2);
  assert(after.notes.some(n=>n.person==='A'&&n.code==='D'));
  assert(after.notes.some(n=>n.person==='B'&&n.code==='D'));
});

test('partial regeneration replaces only selected day and isolation rejects any other-day change',()=>{
  const c=vm.createContext({Array,String,Set,Map,JSON});
  vm.runInContext(splice+'\n'+isolate,c);
  const before={
    hard:{rows:[{date:'7.9. R',cells:['A']},{date:'8.9. R',cells:['B']}]},
    soft:{rows:[{date:'7.9. R',cells:['C']},{date:'8.9. R',cells:['D']}]}
  };
  const generated={
    hard:{rows:[{date:'7.9. R',cells:['X']},{date:'8.9. R',cells:['Y']}]},
    soft:{rows:[{date:'7.9. R',cells:['Z']},{date:'8.9. R',cells:['W']}]}
  };
  const out=c.adminRotationUnplannedSpliceGeneratedDays(before,generated,['7.9. R']);
  assert.deepEqual(out.hard.rows[0].cells,['X']);
  assert.deepEqual(out.soft.rows[0].cells,['Z']);
  assert.deepEqual(out.hard.rows[1].cells,['B']);
  assert.deepEqual(out.soft.rows[1].cells,['D']);
  assert.equal(c.adminRotationUnplannedAssertIsolation(before,out,['7.9. R']),true);
  out.soft.rows[1].cells=['BROKEN'];
  assert.throws(()=>c.adminRotationUnplannedAssertIsolation(before,out,['7.9. R']),/jiný den/);
});
