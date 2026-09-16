#!/usr/bin/env node
// Regression checks for the staffing, fairness and inherited grinder duties hotfix.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
const read = (file) => fs.readFileSync(file, 'utf8');
const generator = read('admin-rotation-generator.js');
const rotation = read('admin-rotation.js');
const tasks = read('rotation-tasks.js');
const sw = read('sw.js');
const config = read('supabase-config.js');
for (const file of ['admin-rotation-generator.js', 'admin-rotation.js', 'rotation-tasks.js', 'sw.js', 'supabase-config.js']) execFileSync(process.execPath, ['--check', file]);
assert(generator.includes('const hardTargetCount = adminRotationGeneratorHardTarget(knownNames, available);'), 'day must reserve mill staffing');
assert(generator.includes('    const hardTargetCount = adminRotationGeneratorHardTarget(knownNames, available);'), 'repair must respect staffing budget');
assert(generator.includes("adminRotationGeneratorThreeAbsences(knownNames, available) && machineName === 'TPKW02'"), 'closed TPKW02 must be enforced in both generation and repair');
assert(generator.includes("cycleMachine === 'TPKW02'"), 'do not consume soft-core cycle when TPKW02 is closed');
assert(generator.includes('adminRotationGeneratorWouldRepeatSoloMill(month, rowIdx, lowName, knownNames)'), 'solo swaps must check consecutive workdays');
assert(generator.includes("!adminRotationGeneratorPersonKnowsMachine(lowName, 'MFKF10')"), 'solo swaps must respect machine skills');
assert(generator.includes("const isTpkw02Balance = String(machineName || '').toUpperCase() === 'TPKW02';"), 'TPKW02 fair balance missing');
assert(generator.includes("if (isTpkw02Balance && lowCell.sectionKey !== 'soft')") || generator.includes("if (lowCell.sectionKey !== 'soft') continue;"), 'TPKW02 swaps must preserve hard cycles');
assert(rotation.includes("const tpkw02Balance = adminRotationGeneratorBalanceHardMachine(month, 'TPKW02', model, monthKey);"), 'final TPKW02 balancing missing');
assert(rotation.includes('const finalSoloMillBalance = adminRotationGeneratorBalanceSoloMill(month, model);'), 'final solo-mill balancing missing');
assert(rotation.indexOf('const finalSoloMillBalance =') < rotation.indexOf("const ruleCheck = adminRotationValidateMonthRules(month, monthKey, { source: 'generator' });"), 'final balancing must precede rule validation');
const helperSource = generator.match(/function adminRotationGeneratorThreeAbsences\([\s\S]*?(?=function adminRotationGeneratorBuildDay\()/);
assert(helperSource, 'staffing helper not found');
const targets = vm.runInNewContext(helperSource[0] + '\n[adminRotationGeneratorHardTarget(Array(10).fill("person"), Array(7).fill("person")), adminRotationGeneratorHardTarget(Array(10).fill("person"), Array(8).fill("person")), adminRotationGeneratorHardTarget(Array(10).fill("person"), Array(10).fill("person"))]', { HARD_MACHINE_HEADERS: ['TNKS01','TBKR07','TPKW01','TPKW02','TBKR01'] });
assert.deepEqual(Array.from(targets), [4, 5, 5], 'hard staffing targets must be 4/5/5 for 7/8/10 available');
const slotSource = generator.match(/function adminRotationGeneratorSoftSlotPlan\(softCount\) \{[\s\S]*?\n\}/);
assert(slotSource, 'soft slots helper missing');
const slots = vm.runInNewContext(slotSource[0] + '\nadminRotationGeneratorSoftSlotPlan(3)', {
  SOFT_MACHINE_HEADERS: ['MSKC01','MSKC03','MSKC04','MFKF06','MFKF10'],
  adminRotationGeneratorMachineIndex: (headers, name) => headers.indexOf(name)
});
assert.deepEqual(Array.from(slots), [1, 2, 4], 'three MO workers must fill MSKC03/MSKC04/MFKF10');
assert(tasks.includes('sharedTpkw02: shouldShareTpkw02FromCard(card)'), 'task cards do not detect vacant TPKW02');
assert(tasks.includes("tasksForMachine('TPKW02', normalizedShift)"), 'grinders do not inherit configured TPKW02 tasks');
assert(tasks.includes('sharedMskc01: shouldShareMskc01FromCard(card)'), 'existing MSKC01 sharing lost');
const customTask = (machine) => machine === 'TPKW02' ? [{label:'TPKW02 kontrola', place:'KP516'}] : [{label:'Stejná kontrola',place:'KP516'}];
const runtime = { window: { getRotationMachineTasksForMachine: customTask }, document: { addEventListener() {} }, Date, String, Array, Object, Set };
vm.runInNewContext(tasks, runtime);
for (const machine of ['TBKR01','TBKR07']) {
  const own = runtime.window.getRotationMachineTasksForAssignment(machine, 'R');
  assert(!own.tasks.some((task) => task.label === 'TPKW02 kontrola'), 'occupied TPKW02 must not be inherited');
  const inherited = runtime.window.getRotationMachineTasksForAssignment(machine, 'R', { sharedTpkw02: true });
  assert(inherited.tasks.some((task) => task.label === 'TPKW02 kontrola'), 'missing configured TPKW02 duty for ' + machine);
  assert(inherited.machine.includes('(+TPKW02)'), 'inherited TPKW02 not shown on ' + machine);
}
assert(sw.includes("const DEVELOPMENT_BUILD_ID = '1.7.0-release8';"), 'new PWA build identifier missing');
assert(sw.includes('concat(RAK_170_GENERATOR_STAFFING_ASSETS)'), 'same-version generator cache invalidation missing');
for (const file of ['admin-rotation-generator.js','admin-rotation.js','rotation-tasks.js']) assert(sw.includes("'./" + file + "?v=1.7.0'"), 'same-version asset missing: ' + file);
assert(config.includes('window.RAK_RELEASE_VERSION = "1.7";'), 'visible version changed');
assert(config.includes('window.RAK_TEST_DISPLAY_VERSION = "1.7";'), 'technical display changed');
assert(config.includes('window.RAK_PWA_BUILD = "v1.7.0-release8";'), 'new build config missing');
console.log('[generator-staffing-170-smoke] OK 7 workers => 4 TO / 3 MO, TPKW02 closed, final balancing, valid syntax, inherited configurable grinder tasks, RaK 1.7 PWA cache');
