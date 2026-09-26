import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const wizard=read('admin-rotation-generator-wizard.js');
const generator=read('admin-rotation-generator.js');
const rotation=read('admin-rotation.js');

function block(source,name,nextName){
  const start=source.indexOf('function '+name+'(');
  assert(start>=0,'missing '+name);
  const end=source.indexOf('\nfunction '+nextName+'(',start);
  assert(end>start,'missing boundary '+name+' -> '+nextName);
  return source.slice(start,end);
}

test('absence on MO requests exact TO preservation when current TO is still valid',()=>{
  const source=block(wizard,'adminRotationUnplannedPreserveHardCellsByDate','adminRotationUnplannedAssertHardPreserved');
  const names=['A','B','C','D','E','F','G','H','I','Blažek'];
  const hard=['H1','H2','H3','H4','H5'];
  const context=vm.createContext({
    Object,Array,String,Set,
    HARD_MACHINE_HEADERS:hard,
    adminRotationUnplannedFindAssignment:()=>({section:'soft',cellIndex:1}),
    adminRotationUnavailableNamesForDate:()=>new Set(['Blažek']),
    adminRotationGeneratorHardTarget:()=>5,
    adminRotationCanonicalName:(value,known)=>known.includes(String(value||'').trim())?String(value||'').trim():'',
    adminRotationGeneratorPersonKnowsMachine:()=>true
  });
  vm.runInContext(source,context);
  const original={hard:{rows:[{date:'26.9. R',cells:['A','B','C','D','E']}]},soft:{rows:[]}};
  const prepared={};
  const result=context.adminRotationUnplannedPreserveHardCellsByDate(original,prepared,['26.9. R'],'Blažek',names);
  assert.deepEqual(Array.from(result['26.9. R']),['A','B','C','D','E']);
});

test('absence on TO does not lock TO and allows broader reflow',()=>{
  const source=block(wizard,'adminRotationUnplannedPreserveHardCellsByDate','adminRotationUnplannedAssertHardPreserved');
  const names=['A','B','C','D','E','F','G','H','I','Blažek'];
  const context=vm.createContext({
    Object,Array,String,Set,
    HARD_MACHINE_HEADERS:['H1','H2','H3','H4','H5'],
    adminRotationUnplannedFindAssignment:()=>({section:'hard',cellIndex:1}),
    adminRotationUnavailableNamesForDate:()=>new Set(['Blažek']),
    adminRotationGeneratorHardTarget:()=>5,
    adminRotationCanonicalName:(value,known)=>known.includes(String(value||'').trim())?String(value||'').trim():'',
    adminRotationGeneratorPersonKnowsMachine:()=>true
  });
  vm.runInContext(source,context);
  const result=context.adminRotationUnplannedPreserveHardCellsByDate(
    {hard:{rows:[{date:'26.9. R',cells:['A','B','C','D','E']}]}},{},['26.9. R'],'Blažek',names
  );
  assert.equal(Object.keys(result).length,0);
});

test('TO lock is refused when another unavailable person makes the old TO row invalid',()=>{
  const source=block(wizard,'adminRotationUnplannedPreserveHardCellsByDate','adminRotationUnplannedAssertHardPreserved');
  const names=['A','B','C','D','E','F','G','H','I','Blažek'];
  const context=vm.createContext({
    Object,Array,String,Set,
    HARD_MACHINE_HEADERS:['H1','H2','H3','H4','H5'],
    adminRotationUnplannedFindAssignment:()=>({section:'soft',cellIndex:1}),
    adminRotationUnavailableNamesForDate:()=>new Set(['Blažek','C']),
    adminRotationGeneratorHardTarget:()=>5,
    adminRotationCanonicalName:(value,known)=>known.includes(String(value||'').trim())?String(value||'').trim():'',
    adminRotationGeneratorPersonKnowsMachine:()=>true
  });
  vm.runInContext(source,context);
  const result=context.adminRotationUnplannedPreserveHardCellsByDate(
    {hard:{rows:[{date:'26.9. R',cells:['A','B','C','D','E']}]}},{},['26.9. R'],'Blažek',names
  );
  assert.equal(Object.keys(result).length,0);
});

test('BuildDay preserves hard cells and skips hard-cycle exchange only when preserveHardActive is valid',()=>{
  assert(generator.includes('const preserveHardActive = !!(requestedHardCells'));
  assert(generator.includes('if (preserveHardActive) {'));
  assert(generator.includes('if (!preserveHardActive) hardPreferred.filter'));
  assert(generator.includes('if (!preserveHardActive) {'));
  assert(generator.includes('if (!preserveHardActive) HARD_MACHINE_HEADERS.forEach'));
});

test('absence path passes preservation map and fail-closed verifies TO stayed byte-identical',()=>{
  assert(wizard.includes('const preserveHardCellsByDate = adminRotationUnplannedPreserveHardCellsByDate(original, withAbsence, allowedDateLabels, person, knownNames);'));
  assert(wizard.includes('preserveHardCellsByDate'));
  assert(wizard.includes('adminRotationUnplannedAssertHardPreserved(original, candidate, preserveHardCellsByDate);'));
  assert(rotation.includes('const preserveHardCellsByDate = generationOptions.preserveHardCellsByDate'));
  assert(rotation.includes('adminRotationGeneratorBuildDay(month, model, counters, rowIdx, dateLabel, absenceNames, monthKey, { preserveHardCells })'));
});
