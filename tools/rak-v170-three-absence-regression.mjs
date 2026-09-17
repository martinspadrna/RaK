#!/usr/bin/env node
// Behavioral regression across 120 three-absence combinations and neighboring counts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = (path) => fs.readFileSync(path, 'utf8');
const generator = read('admin-rotation-generator.js');
const rotation = read('admin-rotation.js');
const tasks = read('rotation-tasks.js');
const hard = ['TNKS01', 'TBKR07', 'TPKW01', 'TPKW02', 'TBKR01'];
const soft = ['MSKC01', 'MSKC03', 'MSKC04', 'MFKF06', 'MFKF10'];
const names = ['Blažek', 'Kmínek', 'Kříž', 'Pech', 'Starý', 'Střížek', 'Synek', 'Třasák', 'Špadrna', 'Novotný'];
const rules = {
  hardPreferred: names.slice(0, 5), softPreferred: names.slice(5),
  hardCycle: ['TBKR01', 'TNKS01', 'TBKR07', 'TPKW01', 'TPKW02'],
  softBaseLathe: { Třasák: 'MSKC01', Střížek: 'MSKC03', Synek: 'MSKC04' }
};
function segment(src, begin, end) {
  const a = src.indexOf(begin);
  const b = src.indexOf(end, a + begin.length);
  assert(a >= 0 && b > a, 'missing real generator segment: ' + begin);
  return src.slice(a, b);
}
const slots = generator.match(/function adminRotationGeneratorSoftSlotPlan\(softCount\) \{[\s\S]*?\n\}/);
assert(slots, 'real soft-slot plan missing');
const daySource = segment(generator, 'function adminRotationGeneratorThreeAbsences(', '\nfunction adminRotationGeneratorCollectWorkingNames(');
const validatorSource = rotation.match(/function adminRotationThreeAbsenceStaffingIssues\([\s\S]*?\n\}/);
assert(validatorSource && rotation.includes('adminRotationThreeAbsenceStaffingIssues(hardRow, softRow, knownNames, absent).forEach'), 'actual validator must enforce layout');
assert(rotation.includes('filledCells: finalFilledCells,'), 'statistics must count final repairs');
function scenario(absences, cycleMachine = '') {
  const state = { skipped: 0, advances: 0 };
  const context = {
    HARD_MACHINE_HEADERS: hard, SOFT_MACHINE_HEADERS: soft,
    getAdminRotationGeneratorRules: () => rules,
    adminRotationGeneratorMachineIndex: (headers, machine) => headers.indexOf(machine),
    adminRotationGeneratorNextHardCycleMachine: () => 'TBKR01',
    adminRotationGeneratorAdvanceHardCycle: (counts, name) => { counts.advances[name] = (counts.advances[name] || 0) + 1; },
    adminRotationGeneratorCanUseHardMachine: () => true,
    adminRotationGeneratorPersonKnowsMachine: () => true,
    adminRotationGeneratorMarkAssignment: (counts, section, machine, name) => {
      counts.total[name] = (counts.total[name] || 0) + 1;
      counts[section][name] = (counts[section][name] || 0) + 1;
      counts.machine[machine] = (counts.machine[machine] || 0) + 1;
    },
    adminRotationGeneratorUnmarkAssignment: (counts, section, machine, name) => {
      counts.total[name] -= 1; counts[section][name] -= 1; counts.machine[machine] -= 1;
    },
    adminRotationGeneratorSoftCoreStateInfo: () => ({ machine: cycleMachine, core: [] }),
    adminRotationGeneratorPickSoftCoreForHard: () => { throw new Error('protected TPKW02 cycle consumed'); },
    adminRotationGeneratorSkipUnavailableSoftCoreRemainder: () => { state.skipped++; return false; },
    adminRotationGeneratorAdvanceSoftCoreCycle: () => { state.advances++; },
    adminRotationCanonicalName: (name) => String(name || '').trim(),
    adminRotationGeneratorPickName: (candidates, used) => candidates.find((name) => !used.has(name)) || '',
    adminRotationGeneratorHistoricalMachineScore: () => 0,
    adminRotationGeneratorBaseLathePerson: (machine, known, available, used) =>
      Object.entries(rules.softBaseLathe).find(([person, target]) => target === machine && available.includes(person) && !used.has(person))?.[0] || '',
    adminRotationGeneratorAvoidLatheNamesForPlan: () => [],
    adminRotationGeneratorSoftKind: (machine) => machine.startsWith('MFKF') ? 'mill' : 'lathe',
    adminRotationGeneratorCanUseSoloMill: () => true
  };
  vm.createContext(context);
  vm.runInContext(slots[0] + '\n' + daySource, context, { filename: 'admin-rotation-generator.js' });
  const counters = { total: {}, hard: {}, soft: {}, machine: {}, advances: {}, softCoreGapPending: false };
  const model = { knownNames: names, dayTemplates: [{ hardCells: [] }] };
  const result = context.adminRotationGeneratorBuildDay({}, model, counters, 0, '1.10. R', new Set(absences), '10.2026');
  const used = result.hardCells.concat(result.softCells).filter(Boolean);
  assert.equal(new Set(used).size, used.length, 'a person may be assigned once only');
  assert(used.every((person) => !absences.includes(person)), 'absent person assigned');
  assert.equal(used.length, names.length - absences.length, 'available people not fully assigned');
  assert.equal(Object.values(counters.total).reduce((a, b) => a + b, 0), used.length, 'counters mismatch');
  for (const person of used) assert.equal(counters.total[person], 1, 'double-counted worker');
  return { result, state };
}
const expectedHard = new Set(['TNKS01', 'TBKR07', 'TPKW01', 'TBKR01']);
const expectedSoft = new Set(['MSKC03', 'MSKC04', 'MFKF10']);
const validator = { HARD_MACHINE_HEADERS: hard, SOFT_MACHINE_HEADERS: soft,
  adminRotationIsRealName: (name) => names.includes(name) };
vm.createContext(validator);
vm.runInContext(validatorSource[0], validator);
let combinations = 0;
for (let a = 0; a < names.length; a++) for (let b = a + 1; b < names.length; b++) for (let c = b + 1; c < names.length; c++) {
  const missing = [names[a], names[b], names[c]];
  const { result } = scenario(missing);
  for (const [machine, person] of hard.map((machine, idx) => [machine, result.hardCells[idx]]))
    assert.equal(!!person, expectedHard.has(machine), `${missing}: TO ${machine}`);
  for (const [machine, person] of soft.map((machine, idx) => [machine, result.softCells[idx]]))
    assert.equal(!!person, expectedSoft.has(machine), `${missing}: MO ${machine}`);
  const issues = validator.adminRotationThreeAbsenceStaffingIssues({ cells: result.hardCells }, { cells: result.softCells }, names, new Set(missing));
  assert.equal(issues.length, 0, `${missing}: valid 4+3 layout rejected`);
  combinations++;
}
assert.equal(combinations, 120);
for (const count of [0, 1, 2, 4, 5, 6, 7, 8, 9, 10]) {
  const { result } = scenario(names.slice(0, count));
  const available = 10 - count;
  const hardTarget = Math.min(5, available);
  const softTarget = Math.min(5, available - hardTarget);
  assert.equal(result.hardCells.filter(Boolean).length, hardTarget, `${count} absence hard regression`);
  assert.equal(result.softCells.filter(Boolean).length, softTarget, `${count} absence soft regression`);
}
const protectedDay = scenario(names.slice(0, 3), 'TPKW02');
assert.equal(protectedDay.state.skipped, 0, 'protected TPKW02 must not skip pending trio member');
assert.equal(protectedDay.state.advances, 0, 'protected TPKW02 must not advance trio cursor');
const correct = scenario(names.slice(0, 3)).result;
const corrupt = (section, machine) => {
  const clone = { hardCells: correct.hardCells.slice(), softCells: correct.softCells.slice() };
  const headers = section === 'hard' ? hard : soft;
  const cells = section === 'hard' ? clone.hardCells : clone.softCells;
  cells[headers.indexOf(machine)] = cells[headers.indexOf(machine)] ? '' : 'Pech';
  const issues = validator.adminRotationThreeAbsenceStaffingIssues({ cells: clone.hardCells }, { cells: clone.softCells }, names, new Set(names.slice(0, 3)));
  assert(issues.some((issue) => issue.machine === machine), 'incorrect occupancy accepted: ' + machine);
};
for (const machine of hard) corrupt('hard', machine);
for (const machine of soft) corrupt('soft', machine);
assert.equal(validator.adminRotationThreeAbsenceStaffingIssues({ cells: correct.hardCells }, { cells: correct.softCells }, names, new Set(names.slice(0, 2))).length, 0, 'other absence counts changed');
assert(tasks.includes("tasksForMachine('TPKW02', normalizedShift)"), 'TPKW02 configured tasks not inherited');
assert(tasks.includes('sharedMskc01: shouldShareMskc01FromCard(card)'), 'existing MSKC01 sharing lost');
const taskRuntime = { window: { getRotationMachineTasksForMachine: (machine) => [{ label: machine + ' kontrola', place: machine === 'TPKW02' ? 'KP516' : '' }] },
  document: { addEventListener() {} } };
vm.createContext(taskRuntime);
vm.runInContext(tasks, taskRuntime, { filename: 'rotation-tasks.js' });
for (const grinder of ['TBKR01', 'TBKR07']) {
  const own = taskRuntime.window.getRotationMachineTasksForAssignment(grinder, 'R');
  const shared = taskRuntime.window.getRotationMachineTasksForAssignment(grinder, 'R', { sharedTpkw02: true });
  assert(!own.tasks.some((task) => task.label === 'TPKW02 kontrola'), grinder + ' inherited staffed task');
  assert(shared.tasks.some((task) => task.label === 'TPKW02 kontrola' && task.place === 'KP516'), grinder + ' missing TPKW02 task');
  assert(shared.tasks.some((task) => task.label === grinder + ' kontrola'), grinder + ' own task lost');
}
const detect = tasks.match(/function shouldShareTpkw02FromCard\(card\) \{[\s\S]*?\n  \}/);
assert(detect, 'TPKW02 vacancy detector missing');
const cards = (machines) => machines.map((machine) => ({ dataset: { rotationTaskMachine: machine, rotationTaskDate: '1.10.2026', rotationTaskShift: 'R' } }));
const cardContext = { assignmentMachine: (machine) => machine, assignmentShift: (shift) => shift,
  document: { querySelectorAll: () => [] } };
vm.createContext(cardContext);
vm.runInContext(detect[0], cardContext);
const grinders = cards(['TBKR01', 'TBKR07']);
cardContext.document.querySelectorAll = () => grinders;
assert(grinders.every((card) => cardContext.shouldShareTpkw02FromCard(card)), 'both grinders must inherit unstaffed TPKW02');
cardContext.document.querySelectorAll = () => grinders.concat(cards(['TPKW02']));
assert(grinders.every((card) => !cardContext.shouldShareTpkw02FromCard(card)), 'no shared tasks when TPKW02 staffed');
console.log(`[three-absence-regression] OK ${combinations} three-absence combinations; 0/1/2/4–10 baselines; 4 TO + 3 MO; counters; trio; 10-machine validator; both grinder task transfers`);
