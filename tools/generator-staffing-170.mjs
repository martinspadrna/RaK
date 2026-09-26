#!/usr/bin/env node
// RaK 1.7: three or four absences keep TPKW02 empty; final fairness includes TPKW02 and solo mills.
import fs from 'node:fs';
const file = 'admin-rotation-generator.js';
let src = fs.readFileSync(file, 'utf8');
const must = (ok, reason) => { if (!ok) throw new Error('[generator-staffing-170] ' + reason); };
function replaceOnce(before, after, label) {
  must(src.includes(before), label + ' anchor missing');
  src = src.replace(before, after);
}
const helper = `function adminRotationGeneratorThreeAbsences(knownNames, available) {
  return Array.isArray(knownNames) && knownNames.length === 10 && Array.isArray(available) && available.length === 7;
}
function adminRotationGeneratorTpkw02ClosedForStaffing(knownNames, available) {
  if (!Array.isArray(knownNames) || knownNames.length !== 10 || !Array.isArray(available)) return false;
  const missing = knownNames.length - available.length;
  return missing === 3 || missing === 4;
}
function adminRotationGeneratorHardTarget(knownNames, available) {
  return adminRotationGeneratorTpkw02ClosedForStaffing(knownNames, available) ? 4 : Math.min(HARD_MACHINE_HEADERS.length, available.length);
}
`;
replaceOnce('function adminRotationGeneratorBuildDay(month, model, counters, rowIdx, dateLabel, blockedNames, monthKey) {', helper + '\nfunction adminRotationGeneratorBuildDay(month, model, counters, rowIdx, dateLabel, blockedNames, monthKey) {', 'day helper');
replaceOnce('  const hardTargetCount = Math.min(HARD_MACHINE_HEADERS.length, available.length);', '  const hardTargetCount = adminRotationGeneratorHardTarget(knownNames, available);', 'day hard budget');
replaceOnce("    const machineName = HARD_MACHINE_HEADERS[machineIdx] || '';\n    if (machineIdx < 0 || !machineName || !name", "    const machineName = HARD_MACHINE_HEADERS[machineIdx] || '';\n    if (adminRotationGeneratorTpkw02ClosedForStaffing(knownNames, available) && machineName === 'TPKW02') return false;\n    if (machineIdx < 0 || !machineName || !name", 'TPKW02 day closure');
replaceOnce('    exchangeSoft = cycleIdx >= 0 && hardTargetCount > 0', "    exchangeSoft = cycleIdx >= 0 && hardTargetCount > 0 && !(adminRotationGeneratorTpkw02ClosedForStaffing(knownNames, available) && cycleMachine === 'TPKW02')", 'soft-core closure');
replaceOnce('    if (!exchangeSoft) adminRotationGeneratorSkipUnavailableSoftCoreRemainder(month, knownNames, rowIdx, available, usedNames, counters, monthKey);', "    if (!exchangeSoft && !(adminRotationGeneratorTpkw02ClosedForStaffing(knownNames, available) && cycleMachine === 'TPKW02')) adminRotationGeneratorSkipUnavailableSoftCoreRemainder(month, knownNames, rowIdx, available, usedNames, counters, monthKey);", 'preserve pending TPKW02 block');
replaceOnce('    const hardTargetCount = Math.min(HARD_MACHINE_HEADERS.length, available.length);', '    const hardTargetCount = adminRotationGeneratorHardTarget(knownNames, available);', 'repair hard budget');
replaceOnce('    HARD_MACHINE_HEADERS.forEach((machineName, machineIdx) => {\n      if (hardFilled >= hardTargetCount', "    HARD_MACHINE_HEADERS.forEach((machineName, machineIdx) => {\n      if (adminRotationGeneratorTpkw02ClosedForStaffing(knownNames, available) && machineName === 'TPKW02') return;\n      if (hardFilled >= hardTargetCount", 'repair TPKW02 closure');
const adjacentSolo = `function adminRotationGeneratorWouldRepeatSoloMill(month, rowIdx, person, knownNames) {
  const rows = Array.isArray(month && month.soft && month.soft.rows) ? month.soft.rows : [];
  const mill06 = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF06');
  const mill10 = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF10');
  for (const direction of [-1, 1]) {
    let idx = rowIdx + direction;
    while (idx >= 0 && idx < rows.length && !adminRotationGeneratorIsWorkingRow(month, idx)) idx += direction;
    if (idx < 0 || idx >= rows.length) continue;
    const cells = Array.isArray(rows[idx] && rows[idx].cells) ? rows[idx].cells : [];
    const solo = !adminRotationGeneratorCanonicalSoloCell(cells[mill06], knownNames) && adminRotationGeneratorCanonicalSoloCell(cells[mill10], knownNames);
    if (solo === person) return true;
  }
  return false;
}
function adminRotationGeneratorCanonicalSoloCell(cell, knownNames) {
  return adminRotationCanonicalName(cell, knownNames);
}
`;
replaceOnce('function adminRotationGeneratorBalanceSoloMill(month, model) {', adjacentSolo + '\nfunction adminRotationGeneratorBalanceSoloMill(month, model) {', 'solo adjacency helper');
replaceOnce("        if (!lowCell || !lowCell.cells) continue;\n        if (lowCell.sectionKey === 'hard' && (adminRotationGeneratorIsSoftCoreName(highName, knownNames) || adminRotationGeneratorIsSoftCoreName(lowName, knownNames))) continue;", "        if (!lowCell || !lowCell.cells) continue;\n        if (!adminRotationGeneratorPersonKnowsMachine(lowName, 'MFKF10') || !adminRotationGeneratorPersonKnowsMachine(highName, lowCell.machine)) continue;\n        if (adminRotationGeneratorWouldRepeatSoloMill(month, rowIdx, lowName, knownNames)) continue;\n        if (lowCell.sectionKey === 'hard' && /^(?:TNKS01|TPKW01|TPKW02)$/.test(lowCell.machine)) continue;\n        if (lowCell.sectionKey === 'hard' && (adminRotationGeneratorIsSoftCoreName(highName, knownNames) || adminRotationGeneratorIsSoftCoreName(lowName, knownNames))) continue;", 'safe solo swap');
replaceOnce("  const isPressBalance = /^(?:TNKS01|TPKW01)$/i.test(String(machineName || ''));", "  const isPressBalance = /^(?:TNKS01|TPKW01)$/i.test(String(machineName || ''));\n  const isTpkw02Balance = String(machineName || '').toUpperCase() === 'TPKW02';", 'TPKW02 balance mode');
replaceOnce("    .filter((name) => !isPressBalance || !softCorePressNames.has(name))\n    .filter((name) => adminRotationGeneratorPersonKnowsMachine(name, machineName));", "    .filter((name) => !(isPressBalance || isTpkw02Balance) || !softCorePressNames.has(name))\n    .filter((name) => adminRotationGeneratorPersonKnowsMachine(name, machineName));", 'exclude soft-core from fair balance');
replaceOnce('  const combinedCount = (name) => currentCount(name) + yearCount(name);', '  const combinedCount = (name) => currentCount(name) + (isTpkw02Balance ? 0 : yearCount(name));', 'monthly TPKW02 fairness');
replaceOnce("        if (isPressBalance && highCell.splitPress && lowCell.sectionKey === 'hard' && (lowCell.idx === tnksIdx || lowCell.idx === tpkw01Idx)) continue;", "        if (isPressBalance && highCell.splitPress && lowCell.sectionKey === 'hard' && (lowCell.idx === tnksIdx || lowCell.idx === tpkw01Idx)) continue;\n        if (isTpkw02Balance) {\n          if (lowCell.sectionKey !== 'soft') continue;\n          if (!adminRotationGeneratorPersonKnowsMachine(targetLowName, highCell.machine) || !adminRotationGeneratorPersonKnowsMachine(highName, lowCell.machine)) continue;\n          if (lowCell.machine === 'MFKF10' && (!adminRotationGeneratorCanUseSoloMill(month, rowIdx, highName, knownNames, monthKey) || adminRotationGeneratorWouldRepeatSoloMill(month, rowIdx, highName, knownNames))) continue;\n        }", 'safe TPKW02 swap');
fs.writeFileSync(file, src, 'utf8');
let rotation = fs.readFileSync('admin-rotation.js', 'utf8');
const finalAnchor = "  const finalTnksBalance = adminRotationGeneratorBalanceHardMachine(month, 'TNKS01', model, monthKey);\n  const ruleCheck = adminRotationValidateMonthRules";
must(rotation.includes(finalAnchor), 'final validation anchor missing');
rotation = rotation.replace(finalAnchor, "  const finalTnksBalance = adminRotationGeneratorBalanceHardMachine(month, 'TNKS01', model, monthKey);\n  const tpkw02Balance = adminRotationGeneratorBalanceHardMachine(month, 'TPKW02', model, monthKey);\n  const finalSoloMillBalance = adminRotationGeneratorBalanceSoloMill(month, model);\n  const ruleCheck = adminRotationValidateMonthRules");
const swapAnchor = '    soloMillBalanceSwaps: (soloMillBalance && Number(soloMillBalance.swaps || 0)) + (soloMillRebalance && Number(soloMillRebalance.swaps || 0)),';
must(rotation.includes(swapAnchor), 'solo summary anchor missing');
rotation = rotation.replace(swapAnchor, swapAnchor.replace('),', ') + (finalSoloMillBalance && Number(finalSoloMillBalance.swaps || 0)),') + "\n    tpkw02BalanceSwaps: tpkw02Balance && Number(tpkw02Balance.swaps || 0),");
fs.writeFileSync('admin-rotation.js', rotation, 'utf8');
console.log('[generator-staffing-170] OK 3/4 absences close TPKW02 in day + repair; final safe TPKW02 and solo balancing');
