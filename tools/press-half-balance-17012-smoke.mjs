#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const generator = read('admin-rotation-generator.js');
const rotation = read('admin-rotation.js');
const config = read('supabase-config.js');
const index = read('index.html');
const marker = '// RAK_GENERATOR_PRESS_HALF_STEP_17012';
assert(generator.includes(marker), 'missing generator marker');
const start = generator.indexOf(marker);
const end = generator.indexOf('function adminRotationGeneratorCountSoftKinds(month, names) {', start);
assert(end > start, 'missing helper boundary');
const helper = generator.slice(start, end);
assert(rotation.includes('// RAK_GENERATOR_PRESS_HALF_STEP_CALL_17012'), 'missing final call');
assert(rotation.indexOf('adminRotationGeneratorBalancePressHalfSteps17012(month, model, monthKey)') < rotation.indexOf("adminRotationValidateMonthRules(month, monthKey, { source: 'generator' })"), 'balancer runs after final validation');
assert(generator.includes("adminRotationGeneratorRowShouldSplitPress(month, rowIdx, monthKey)"), 'non-split Sundays not excluded');
assert(generator.includes('adminRotationGeneratorCanUseHardMachine(month, rowIdx, pressMachine, lowName'), 'press consecutive guard absent');
assert(generator.includes('adminRotationGeneratorPersonKnowsMachine(lowName, pressMachine)'), 'qualification guard absent');
assert(generator.includes('pressIndexes.includes(otherIdx)'), 'press-to-press swap incorrectly allowed');
assert(generator.includes('after.spread < before.spread'), 'no strict improvement requirement');
assert(generator.includes('after.yearVariance < best.after.yearVariance'), 'annual tie-break absent');
assert(generator.includes('// RAK_GENERATOR_SUNDAY_TBK_FAIRNESS_17011'), 'Sunday cleanup fairness lost');
assert(rotation.includes('// RAK_GENERATOR_SOLO_MILL_SPREAD_CALL_17009'), 'solo mill spread lost');
assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co') && !config.includes('bkqamcbkiwumsvelahxr'), 'test Supabase isolation broken');
assert(config.includes('window.RAK_RELEASE_VERSION = "1.7.12";'), 'display version');
assert(config.includes('window.RAK_PWA_BUILD = "v1.7.12-presshalf1";'), 'PWA marker');
assert(index.includes("var build='v1.7.12-presshalf1';"), 'index marker');

const HEADERS = ['TNKS01', 'TBKR07', 'TPKW01', 'TPKW02', 'TBKR01'];
const SOFT = ['MSKC01', 'MSKC03', 'MSKC04', 'MFKF06', 'MFKF10'];
const known = ['A','B','C','D','E','F','G','H','I','Absent'];
const core = ['G','H','I'];
const mock = {
  HARD_MACHINE_HEADERS: HEADERS,
  SOFT_MACHINE_HEADERS: SOFT,
  adminGetKnownNames: () => known,
  adminRotationCanonicalName: (value, names) => names.includes(value) ? value : '',
  adminRotationGeneratorMachineIndex: (items, machine) => items.indexOf(machine),
  adminRotationGeneratorGetSoftCoreNames: () => core,
  adminRotationGeneratorCollectWorkingNames: (month, names) => [...new Set([...month.hard.rows, ...month.soft.rows].flatMap(row => row.cells).filter(name => names.includes(name)))],
  adminRotationGeneratorPersonKnowsMachine: () => true,
  adminRotationGeneratorRowShouldSplitPress: (month, idx) => !/[RN]8$/.test(month.hard.rows[idx].date),
  adminRotationGeneratorCanUseHardMachine: (month, idx, machine, name) => {
    if (!['TNKS01', 'TPKW01'].includes(machine)) return true;
    for (const near of [idx - 1, idx + 1]) {
      if (near < 0 || near >= month.hard.rows.length) continue;
      const cells = month.hard.rows[near].cells;
      if (cells[0] === name || (!/[RN]8$/.test(month.hard.rows[near].date) && cells[2] === name)) return false;
    }
    return true;
  },
  adminRotationGeneratorCountHardMachine: (month, machine, names) => {
    const counts = Object.fromEntries(names.map(name => [name, 0]));
    for (const row of month.hard.rows) {
      const split = !/[RN]8$/.test(row.date);
      const press = split ? [row.cells[0], row.cells[2]] : [row.cells[0]];
      for (const name of press) if (Object.hasOwn(counts, name)) counts[name] += split ? .5 : 1;
    }
    return counts;
  }
};
const context = vm.createContext(mock);
vm.runInContext(helper, context);
// Anonymized October-shaped fixture. A=worker at 2, B=worker at 1, C=worker at 2.
// Only the relevant press and replacement positions are populated; no real roster is stored.
const pairs = [
  ['G','A'],['H','D'],['I','A'],['E','F'],['A','G'],['C','H'],['F','I'],
  ['B','C'],['A','F'],['D','B'],['C','E'],['G','D'],['H','C'],['I','E']
];
const dates = ['1.10. N','5.10. R','6.10. R','9.10. N','10.10. N','11.10. N8',
  '14.10. R','15.10. R','19.10. N','20.10. N','23.10. R','24.10. R','25.10. R8','29.10. N'];
const fixture = {
  hard: { rows: pairs.map(([tnks, tpkw], i) => ({ date: dates[i], cells: [tnks, '', tpkw, i === 2 ? 'B' : '', ''] })) },
  soft: { rows: dates.map((date, i) => ({ date, cells: ['', i === 0 ? 'B' : '', '', '', ''] })) }
};
const original = JSON.parse(JSON.stringify(fixture));
const model = { knownNames: known, yearHardMachineStats: { TNKS01: {} } };
const before = mock.adminRotationGeneratorCountHardMachine(fixture, 'TNKS01', known);
assert.equal(before.A, 2);
assert.equal(before.B, 1);
const result = vm.runInContext('adminRotationGeneratorBalancePressHalfSteps17012', context)(fixture, model, '10/26');
const after = mock.adminRotationGeneratorCountHardMachine(fixture, 'TNKS01', known);
assert.equal(result.swaps, 1, 'exactly one safe half-shift hard swap expected');
assert.equal(after.A, 1.5);
assert.equal(after.B, 1.5);
assert.equal(after.C, 2);
assert.equal(result.initialSpread, 1);
assert.equal(result.spread, .5);
assert.equal(fixture.hard.rows[2].cells[2], 'B', 'October 6 TPKW01 should move to B');
assert.equal(fixture.hard.rows[2].cells[3], 'A', 'October 6 TPKW02 should move to A');
assert.deepEqual(fixture.soft, original.soft, 'no soft or solo mill changes');
assert.deepEqual(fixture.hard.rows[5], original.hard.rows[5], 'regular Sunday must remain untouched');
assert.deepEqual(fixture.hard.rows[12], original.hard.rows[12], 'regular Sunday must remain untouched');
for (const row of fixture.hard.rows) {
  assert.deepEqual(row.cells.length, 5, 'staffing width altered');
  assert.equal(new Set(row.cells.filter(Boolean)).size, row.cells.filter(Boolean).length, 'duplicate employee on same hard shift');
}
const repeated = vm.runInContext('adminRotationGeneratorBalancePressHalfSteps17012', context)(fixture, model, '10/26');
assert.equal(repeated.swaps, 0, 'balancer should be stable on repeat');
const unqualified = JSON.parse(JSON.stringify(original));
mock.adminRotationGeneratorPersonKnowsMachine = (name, machine) => !(name === 'B' && machine === 'TPKW01');
const skipped = vm.runInContext('adminRotationGeneratorBalancePressHalfSteps17012', context)(unqualified, model, '10/26');
assert.equal(skipped.swaps, 0, 'an unqualified replacement must never be assigned');
assert.deepEqual(unqualified, original, 'unqualified replacement must leave the draft untouched');
console.log('[press-half-balance-17012-smoke] OK anonymized October-shaped fixture: Novotný 2→1.5, Kříž 1→1.5, spread 1→0.5; one qualified hard-only swap on Oct 6; Sunday, solo mills, three-person cycle and PWA preserved');
