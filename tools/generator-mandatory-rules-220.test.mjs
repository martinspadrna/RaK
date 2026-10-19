#!/usr/bin/env node
// RaK: trvale regresni testy pravidel automatickeho generatoru.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../admin-rotation-generator.js', import.meta.url), 'utf8');
const actualNames = [
  'adminRotationGeneratorNextHardCycleMachine',
  'adminRotationGeneratorAdvanceHardCycle',
  'adminRotationGeneratorThreeAbsences',
  'adminRotationGeneratorHardTarget',
  'adminRotationGeneratorSoftSlotPlan',
  'adminRotationGeneratorSoftKind',
  'adminRotationGeneratorIsTwoLatheOneMillPlan',
  'adminRotationGeneratorAvoidLatheNamesForPlan',
  'adminRotationGeneratorCanAutoUseSoftMachine',
  'adminRotationGeneratorGrinderStreaks',
  'adminRotationGeneratorRepairGrinderStreaks'
];
function functionSource(name) {
  const start = source.indexOf('function ' + name + '(');
  assert.ok(start >= 0, name + ' must exist in real runtime');
  const opening = source.indexOf('{', start);
  let depth = 0;
  for (let i = opening; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('Unbalanced function: ' + name);
}

const known = ['Blažek', 'Kmínek', 'Kříž', 'Novotný', 'Pech',
  'Starý', 'Střížek', 'Synek', 'Třasák', 'Špadrna'];
const softMachines = ['MSKC01', 'MSKC03', 'MSKC04', 'MFKF06', 'MFKF10'];
const hardMachines = ['TNKS01', 'TBKR07', 'TPKW01', 'TPKW02', 'TBKR01'];
let forbidden = true;
let grinderQualified = true;
const deps = {
  SOFT_MACHINE_HEADERS: softMachines,
  HARD_MACHINE_HEADERS: hardMachines,
  adminRotationGeneratorMachineIndex: (headers, machine) => headers.indexOf(machine),
  adminGetKnownNames: () => known,
  adminRotationCanonicalName: (name) => String(name || '').trim(),
  adminRotationSplitGeneratorList: (items) => Array.isArray(items) ? items : String(items || '').split(/[\n,;]/),
  adminRotationUnavailableNamesForDate: (month) => new Set(month.absent || []),
  getAdminRotationGeneratorRules: () => ({
    avoidLatheWhenTwoLathesOneMillEnabled: forbidden,
    avoidLatheWhenTwoLathesOneMillNames: ['Starý'],
    hardCycle: ['TBKR01','TNKS01','TBKR07','TPKW01','TPKW02']
  }),
  adminRotationGeneratorIsWorkingRow: () => true,
  adminRotationGeneratorCanEditRow: () => true,
  adminRotationGeneratorPersonKnowsMachine: () => grinderQualified,
  adminRotationGeneratorCanUseHardMachine: () => true
};
const getFunctions = new Function(...Object.keys(deps),
  actualNames.map(functionSource).join('\n') + '\nreturn {' + actualNames.join(',') + '};');
const f = getFunctions(...Object.values(deps));
function monthWithAbsent(absent) {
  return { absent, hard: { rows: [{ date: '1.11.2026', cells: [] }] },
    soft: { rows: [{ date: '1.11.2026', cells: [] }] } };
}

test('7 available workers require exactly 4 TO + 3 MO', () => {
  const available = known.slice(3);
  assert.equal(f.adminRotationGeneratorHardTarget(known, available), 4);
  assert.deepEqual(f.adminRotationGeneratorSoftSlotPlan(3).map((idx) => softMachines[idx]),
    ['MSKC03', 'MSKC04', 'MFKF10']);
});

test('Starý must not be automatically put on either lathe in 2+1; mill stays allowed', () => {
  const day = monthWithAbsent(known.slice(0, 3));
  assert.equal(f.adminRotationGeneratorCanAutoUseSoftMachine(day, 0, 'MSKC03', 'Starý', known), false);
  assert.equal(f.adminRotationGeneratorCanAutoUseSoftMachine(day, 0, 'MSKC04', 'Starý', known), false);
  assert.equal(f.adminRotationGeneratorCanAutoUseSoftMachine(day, 0, 'MFKF10', 'Starý', known), true);
  assert.equal(f.adminRotationGeneratorCanAutoUseSoftMachine(day, 0, 'MSKC03', 'Kmínek', known), true);
  assert.equal(f.adminRotationGeneratorCanAutoUseSoftMachine(monthWithAbsent([]), 0, 'MSKC03', 'Starý', known), true);
  forbidden = false;
  assert.equal(f.adminRotationGeneratorCanAutoUseSoftMachine(day, 0, 'MSKC03', 'Starý', known), true);
  forbidden = true;
});

test('4 consecutive TBKR01 assignments can be safely shortened to at most 2', () => {
  const day = { hard: { rows: [1, 2, 3, 4].map((number) =>
    ({ date: number + '.11.2026', cells: ['', 'Pech', '', '', 'Kmínek'] })) } };
  const before = f.adminRotationGeneratorGrinderStreaks(day, known);
  assert.equal(before.maxStreak, 4);
  const after = f.adminRotationGeneratorRepairGrinderStreaks(day, { knownNames: known }, '2026-11');
  assert.ok(after.swaps > 0);
  assert.equal(after.unresolved.length, 0);
  assert.ok(after.maxStreak <= 2);
});

test('two consecutive shifts on TBKR01 are eliminated by safe TBKR07 exchange', () => {
 const month = { hard: { rows: [1, 2].map((number) =>
  ({ date: number + '.11.2026', cells: ['', 'Pech', '', '', 'Kmínek'] })) } };
 const before = f.adminRotationGeneratorGrinderStreaks(month, known);
 assert.equal(before.excess, 0, 'two shifts were previously ignored');
 assert.equal(before.adjacentPairs, 2);
 const result = f.adminRotationGeneratorRepairGrinderStreaks(month, { knownNames: known }, '11/26');
 assert.ok(result.swaps > 0);
 assert.equal(result.pairsRemaining, 0);
 assert.equal(f.adminRotationGeneratorGrinderStreaks(month, known).maxStreak, 1);
 assert.deepEqual(month.hard.rows.map(row => row.cells.filter(Boolean).sort()), [
  ['Kmínek', 'Pech'], ['Kmínek', 'Pech']
 ]);
});

test('unavoidable grinder double assignment stays visible without an unsafe swap', () => {
 const month = { hard: { rows: [1, 2].map((number) =>
  ({ date: number + '.11.2026', cells: ['', 'Pech', '', '', 'Kmínek'] })) } };
 grinderQualified = false;
 try {
  const result = f.adminRotationGeneratorRepairGrinderStreaks(month, { knownNames: known }, '11/26');
  assert.equal(result.swaps, 0);
  assert.equal(result.pairsRemaining, 2);
  assert.equal(month.hard.rows[1].cells[4], 'Kmínek');
 } finally { grinderQualified = true; }
});

test('unrepairable grinder streak is reported, never silently overridden', () => {
  const day = { hard: { rows: [1, 2, 3].map((number) =>
    ({ date: number + '.11.2026', cells: ['', 'Pech', '', '', 'Kmínek'] })) } };
  grinderQualified = false;
  try {
    const result = f.adminRotationGeneratorRepairGrinderStreaks(day, { knownNames: known }, '2026-11');
    assert.equal(result.swaps, 0);
    assert.ok(result.unresolved.length > 0);
  } finally {
    grinderQualified = true;
  }
});

test('TO cursor advances from actual assigned machine, not a stale prediction', () => {
 const counters={hardCycleCursor:{Kmínek:0}};
 f.adminRotationGeneratorAdvanceHardCycle(counters,'Kmínek','TPKW01');
 assert.equal(f.adminRotationGeneratorNextHardCycleMachine(counters,'Kmínek'),'TPKW02');
 f.adminRotationGeneratorAdvanceHardCycle(counters,'Kmínek','TPKW02');
 assert.equal(f.adminRotationGeneratorNextHardCycleMachine(counters,'Kmínek'),'TBKR01');
});
