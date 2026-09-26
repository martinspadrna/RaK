import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const rotation = read('admin-rotation.js');
const generator = read('admin-rotation-generator.js');
const wizard = read('admin-rotation-generator-wizard.js');
const index = read('rotation-name-index.js');
const daymods = read('admin-daymods.js');
const bridge = read('supabase-bridge.js');
const migration = read('supabase/migrations/20260926094214_rak_unplanned_kalirna_reflow_17116.sql');

function functionBlock(source, name, nextName) {
  const start = source.indexOf('function ' + name + '(');
  assert(start >= 0, 'missing function ' + name);
  const end = source.indexOf('\nfunction ' + nextName + '(', start);
  assert(end > start, 'missing boundary ' + name + ' -> ' + nextName);
  return source.slice(start, end);
}

test('Kalírna joins absences only in generator availability, not in absence data', () => {
  const source = functionBlock(rotation,'adminRotationNamesForAbsenceDate','adminRotationUnavailableNamesForDate')
    + '\n' + functionBlock(rotation,'adminRotationUnavailableNamesForDate','adminRotationGetPressRotationOverride');
  const context = vm.createContext({
    Set, Array, String,
    adminRotationDateBaseKey: value => String(value || '').replace(/\s+(?:R8|N8|R|N)$/,''),
    adminSplitPeopleList: value => String(value || '').split(',').map(v=>v.trim()).filter(Boolean),
    adminRotationCanonicalName: (value,names) => names.includes(String(value||'').trim()) ? String(value||'').trim() : ''
  });
  vm.runInContext(source,context);
  const month={
    notes:[{date:'1.10. R',person:'A',code:'D'}],
    dayMods:[
      {date:'1.10. R',person:'B',type:'kalirnaOut'},
      {date:'1.10. R',person:'C',type:'kalirnaIn'},
      {date:'2.10. R',person:'D',type:'kalirnaOut'}
    ]
  };
  const set=context.adminRotationUnavailableNamesForDate(month,'1.10. R',['A','B','C','D']);
  assert.deepEqual([...set].sort(),['A','B']);
  assert.equal(month.notes.length,1,'Kalírna must not create an absence note');
});

test('all generator and validator staffing paths use the combined unavailable set', () => {
  assert(!generator.includes('adminRotationNamesForAbsenceDate(month.notes'), 'generator still has an absence-only availability path');
  assert((generator.match(/adminRotationUnavailableNamesForDate\(/g)||[]).length >= 5);
  assert(rotation.includes('const absenceNames = adminRotationUnavailableNamesForDate(month, dateLabel, knownNames);'));
  assert(rotation.includes('const absent = adminRotationUnavailableNamesForDate(month, dateLabel, knownNames);'));
});

test('existing staffing rules give 3 lathes + 1 mill for four MO people and 2 lathes + 1 mill for three', () => {
  const match=generator.match(/function adminRotationGeneratorSoftSlotPlan\(softCount\) \{[\s\S]*?\n\}/);
  assert(match,'soft slot plan helper missing');
  const soft=['MSKC01','MSKC03','MSKC04','MFKF06','MFKF10'];
  const context=vm.createContext({
    SOFT_MACHINE_HEADERS:soft,
    adminRotationGeneratorMachineIndex:(headers,name)=>headers.indexOf(name)
  });
  vm.runInContext(match[0],context);
  const four=context.adminRotationGeneratorSoftSlotPlan(4).map(i=>soft[i]);
  const three=context.adminRotationGeneratorSoftSlotPlan(3).map(i=>soft[i]);
  assert.deepEqual(Array.from(four),['MSKC01','MSKC03','MSKC04','MFKF10']);
  assert.deepEqual(Array.from(three),['MSKC03','MSKC04','MFKF10']);
  assert(!four.includes('MFKF06'));
  assert(!three.includes('MFKF06'));
});

test('unplanned Kalírna candidate runs the same generator, tolerates only intermediate unrelated errors and splices selected days', () => {
  const start=wizard.indexOf('function adminRotationBuildUnplannedDayModCandidate(');
  const end=wizard.indexOf('\nfunction adminRotationUnplannedOperationId(',start);
  assert(start>=0&&end>start);
  const block=wizard.slice(start,end);
  for(const marker of [
    "type: 'kalirnaOut'",
    'adminRotationUnplannedGenerationSeed(candidate)',
    'adminGenerateRotationMonthDraft(monthKey, seed, { ignoreDom: true, persistPending: false, allowScopedRuleErrors: true })',
    'adminRotationUnplannedSpliceGeneratedDays(candidate, generated.normalized, allowedDateLabels)',
    'adminRotationUnplannedAssertIsolation(sourceMonth, regenerated, allowedDateLabels)',
    "throw new Error('Pracovník označený jako Kalírna zůstal ve stroji: ' + date + '.')",
    "changeKind: 'daymod'"
  ]) assert(block.includes(marker),marker);
  assert(!block.includes('adminRotationUnplannedApplyAbsenceNotes('));
});

test('personal schedule keeps Kalírna visible after the worker is removed from machine cells', () => {
  assert(index.includes("String(mod.type || '').trim() !== 'kalirnaOut'"));
  assert(index.includes("section: 'dayMods'"));
  assert(index.includes("machine: 'Kalírna'"));
  assert(index.includes("target: 'Kalírna'"));
  assert(index.includes('kalirnaOut: true'));
});

test('dayMod badge cannot move onto the replacement worker after reflow', () => {
  const findStart=daymods.indexOf('function findMod(');
  const findEnd=daymods.indexOf('\n  // Veřejné API',findStart);
  const block=daymods.slice(findStart,findEnd);
  assert(block.includes("m.type === 'kalirnaOut'"));
  assert(block.includes("currentPerson !== String(m.person || '').trim()"));
});

test('server allows selected-day reflow for Kalírna but blocks everything else', () => {
  for(const marker of [
    "if v_reason not in ('D','NV','§','LEK') then",
    "if v_kind<>'daymod' or v_reason<>'kalirnaOut' then",
    "v_new_month-array['hard','soft','dayMods']::text[]",
    'Kalirna change touched a non-selected day',
    'Kalirna person is still assigned to a machine',
    'Kalirna change touched unrelated dayMods',
    'Each selected day must contain exactly one Kalirna exception',
    'Kalirna source cell does not contain selected person',
    'pg_advisory_xact_lock',
    'perform private.rak_require_admin(false)'
  ]) assert(migration.includes(marker),'missing server guard: '+marker);
  assert(migration.includes('from public,anon'));
  assert(!/grant execute[\s\S]{0,220}\bto\s+anon\b/i.test(migration));
  assert(bridge.includes("client.rpc('rak_admin_apply_unplanned_change_v2'"));
});
