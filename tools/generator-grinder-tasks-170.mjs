#!/usr/bin/env node
// RaK 1.7: if TPKW02 is unstaffed, each staffed grinder inherits its configured duties.
import fs from 'node:fs';
const path = 'rotation-tasks.js';
let source = fs.readFileSync(path, 'utf8');
const must = (ok, reason) => { if (!ok) throw new Error('[generator-grinder-tasks-170] ' + reason); };
const replace = (from, to, label) => {
  must(source.includes(from), label + ' anchor missing');
  source = source.replace(from, to);
};
const own = "    const sharedMskc01 = !!(options && options.sharedMskc01 && (machine === 'MSKC03' || machine === 'MSKC04'));\n    const ownTasks = tasksForMachine(machine, normalizedShift);\n    const tasks = sharedMskc01 ? mergeTasks(ownTasks, tasksForMachine('MSKC01', normalizedShift)) : ownTasks;\n    return {\n      machine: sharedMskc01 ? machine + ' (+MSKC01)' : machine,\n      tasks\n    };";
const inherit = "    const sharedMskc01 = !!(options && options.sharedMskc01 && (machine === 'MSKC03' || machine === 'MSKC04'));\n    const sharedTpkw02 = !!(options && options.sharedTpkw02 && (machine === 'TBKR01' || machine === 'TBKR07'));\n    const ownTasks = tasksForMachine(machine, normalizedShift);\n    const ownAndMsk = sharedMskc01 ? mergeTasks(ownTasks, tasksForMachine('MSKC01', normalizedShift)) : ownTasks;\n    const tasks = sharedTpkw02 ? mergeTasks(ownAndMsk, tasksForMachine('TPKW02', normalizedShift)) : ownAndMsk;\n    return {\n      machine: (sharedMskc01 ? machine + ' (+MSKC01)' : machine) + (sharedTpkw02 ? ' (+TPKW02)' : ''),\n      tasks\n    };";
replace(own, inherit, 'configured task merging');
replace("    const result = getTasksForAssignment(input.machine, input.shift, { sharedMskc01: !!input.sharedMskc01 });", "    const result = getTasksForAssignment(input.machine, input.shift, { sharedMskc01: !!input.sharedMskc01, sharedTpkw02: !!input.sharedTpkw02 });", 'modal propagation');
const helper = `  function shouldShareTpkw02FromCard(card) {
    if (!card) return false;
    const machine = assignmentMachine(card.dataset.rotationTaskMachine || '');
    if (machine !== 'TBKR01' && machine !== 'TBKR07') return false;
    const date = String(card.dataset.rotationTaskDate || '').trim();
    const shift = assignmentShift(card.dataset.rotationTaskShift || '');
    let tpkw02Occupied = false;
    let grinderOccupied = false;
    document.querySelectorAll('.rotaceShiftTaskCard').forEach((other) => {
      if (String(other.dataset.rotationTaskDate || '').trim() !== date) return;
      if (assignmentShift(other.dataset.rotationTaskShift || '') !== shift) return;
      const otherMachine = assignmentMachine(other.dataset.rotationTaskMachine || '');
      if (otherMachine === 'TPKW02') tpkw02Occupied = true;
      if (otherMachine === machine) grinderOccupied = true;
    });
    return grinderOccupied && !tpkw02Occupied;
  }

`;
replace('  function openTaskFromCard(card) {', helper + '  function openTaskFromCard(card) {', 'grinder duty detection');
replace("      sharedMskc01: shouldShareMskc01FromCard(card)\n    });", "      sharedMskc01: shouldShareMskc01FromCard(card),\n      sharedTpkw02: shouldShareTpkw02FromCard(card)\n    });", 'task card payload');
must(source.includes("tasksForMachine('TPKW02', normalizedShift)"), 'TPKW02 configured tasks lost');
must(source.includes('sharedMskc01: shouldShareMskc01FromCard(card)'), 'MSKC01 sharing lost');
fs.writeFileSync(path, source, 'utf8');
console.log('[generator-grinder-tasks-170] OK TPKW02 unstaffed -> both TBKR01/TBKR07 inherit configured base and shift tasks with deduplication');
