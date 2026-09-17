#!/usr/bin/env node
// RaK 1.7.08: final consecutive solo-mill repair + primary "volné" quantity in shift PNG.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const DISPLAY = '1.7.08';
const BUILD = 'v1.7.08-solomill2';
const CACHE = 'v1.7.08';
const GENERATOR_MARKER = '// RAK_GENERATOR_FINAL_SOLO_MILL_REPAIR_17008';
const ROTATION_MARKER = '// RAK_GENERATOR_FINAL_SOLO_MILL_CALL_17008';
const IMAGE_MARKER = '// RAK_SHIFT_REPORT_FREE_PRIMARY_17008';
const read = (file) => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value, 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error('[development-version-17008] ' + message); };

function setLine(source, expression, target, label) {
  assert(expression.test(source), 'missing ' + label);
  return source.replace(expression, target);
}
function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  assert(source.includes(before), 'missing ' + label);
  return source.replace(before, after);
}

function patchGenerator(source) {
  assert(source.includes('// RAK_GENERATOR_SOLO_MILL_STREAK_17007'), '1.7.07 solo-mill guard missing');
  if (!source.includes(GENERATOR_MARKER)) {
    const anchor = 'function adminRotationGeneratorCountSoftKinds(month, names) {';
    assert(source.includes(anchor), 'soft-kind anchor missing');
    const helper = `${GENERATOR_MARKER}
function adminRotationGeneratorSoloMillNameAtRow17008(month, rowIdx, knownNames) {
  const rows = Array.isArray(month && month.soft && month.soft.rows) ? month.soft.rows : [];
  const mfkf06Idx = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF06');
  const mfkf10Idx = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF10');
  const row = rows[Number(rowIdx)] || null;
  const cells = Array.isArray(row && row.cells) ? row.cells : [];
  if (mfkf06Idx < 0 || mfkf10Idx < 0 || !cells.length) return '';
  const on06 = adminRotationCanonicalName(cells[mfkf06Idx], knownNames);
  const on10 = adminRotationCanonicalName(cells[mfkf10Idx], knownNames);
  return !on06 && on10 ? on10 : '';
}

function adminRotationGeneratorTryRepairSoloMillRow17008(month, rowIdx, repeatedName, knownNames, monthKey, soloCounts) {
  const repeated = adminRotationCanonicalName(repeatedName, knownNames);
  const softRow = month && month.soft && Array.isArray(month.soft.rows) ? month.soft.rows[rowIdx] : null;
  const softCells = Array.isArray(softRow && softRow.cells) ? softRow.cells : [];
  const mfkf06Idx = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF06');
  const mfkf10Idx = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF10');
  if (!repeated || mfkf06Idx < 0 || mfkf10Idx < 0 || !softCells.length) return null;
  if (adminRotationGeneratorSoloMillNameAtRow17008(month, rowIdx, knownNames) !== repeated) return null;

  const counts = soloCounts || adminRotationGeneratorCountSoloMill(month, knownNames);
  const candidates = knownNames
    .filter((name) => name && name !== repeated)
    .filter((name) => adminRotationGeneratorPersonKnowsMachine(name, 'MFKF10'))
    .filter((name) => !adminRotationGeneratorWouldRepeatSoloMill(month, rowIdx, name, knownNames))
    .filter((name) => adminRotationGeneratorCanUseSoloMill(month, rowIdx, name, knownNames, monthKey))
    .sort((a, b) => Number(counts[a] || 0) - Number(counts[b] || 0) || a.localeCompare(b, 'cs'));

  for (const candidate of candidates) {
    const candidateCell = adminRotationGeneratorFindSoloMillSwapCell(month, rowIdx, candidate);
    if (!candidateCell || !candidateCell.cells || !candidateCell.machine) continue;

    const candidateOnHard = candidateCell.sectionKey === 'hard';
    const protectedHard = candidateOnHard && /^(?:TNKS01|TPKW01|TPKW02)$/i.test(String(candidateCell.machine || ''));
    if (!protectedHard
        && adminRotationGeneratorPersonKnowsMachine(repeated, candidateCell.machine)
        && (!candidateOnHard || adminRotationGeneratorCanUseHardMachine(month, rowIdx, candidateCell.machine, repeated, knownNames, monthKey))
        && (!candidateOnHard || (!adminRotationGeneratorIsSoftCoreName(repeated, knownNames) && !adminRotationGeneratorIsSoftCoreName(candidate, knownNames)))) {
      candidateCell.cells[candidateCell.idx] = repeated;
      softCells[mfkf10Idx] = candidate;
      return { mode: 'direct', rowIdx, from: repeated, to: candidate, machine: candidateCell.machine };
    }

    // Když přímá výměna nejde (typicky každý z trojice má svůj základní soustruh),
    // zkus bezpečnou třícestnou výměnu pouze uvnitř měkoty:
    // kandidát -> MFKF10, původní solo člověk -> jiný soustruh, třetí člověk -> soustruh kandidáta.
    if (candidateCell.sectionKey !== 'soft') continue;
    const candidateMachine = String(candidateCell.machine || '').toUpperCase();
    if (!/^MSKC\d+$/i.test(candidateMachine)) continue;
    for (let destIdx = 0; destIdx < softCells.length; destIdx += 1) {
      if (destIdx === candidateCell.idx || destIdx === mfkf06Idx || destIdx === mfkf10Idx) continue;
      const destMachine = String(SOFT_MACHINE_HEADERS[destIdx] || '').toUpperCase();
      if (!/^MSKC\d+$/i.test(destMachine)) continue;
      const third = adminRotationCanonicalName(softCells[destIdx], knownNames);
      if (!third || third === repeated || third === candidate) continue;
      if (!adminRotationGeneratorPersonKnowsMachine(repeated, destMachine)) continue;
      if (!adminRotationGeneratorPersonKnowsMachine(third, candidateMachine)) continue;
      candidateCell.cells[candidateCell.idx] = third;
      softCells[destIdx] = repeated;
      softCells[mfkf10Idx] = candidate;
      return { mode: 'three-way-soft', rowIdx, from: repeated, to: candidate, third, machine: candidateMachine, destination: destMachine };
    }
  }
  return null;
}

function adminRotationGeneratorRepairConsecutiveSoloMill17008(month, model, monthKey) {
  const knownNames = model && Array.isArray(model.knownNames) ? model.knownNames : adminGetKnownNames();
  const softRows = Array.isArray(month && month.soft && month.soft.rows) ? month.soft.rows : [];
  if (!softRows.length || !knownNames.length) return { repairs: 0, direct: 0, threeWay: 0, unresolved: [] };

  let repairs = 0;
  let direct = 0;
  let threeWay = 0;
  const unresolved = [];
  const boundary = adminRotationGeneratorGetPreviousMonthBoundary(monthKey, knownNames);
  let previousSolo = String(boundary && boundary.soloMillName || '');
  let previousSoloRowIdx = -1;
  let counts = adminRotationGeneratorCountSoloMill(month, knownNames);

  for (let rowIdx = 0; rowIdx < softRows.length; rowIdx += 1) {
    if (!adminRotationGeneratorIsWorkingRow(month, rowIdx)) continue;
    let currentSolo = adminRotationGeneratorSoloMillNameAtRow17008(month, rowIdx, knownNames);
    if (currentSolo && previousSolo && currentSolo === previousSolo) {
      let result = adminRotationGeneratorTryRepairSoloMillRow17008(month, rowIdx, currentSolo, knownNames, monthKey, counts);
      if (!result && previousSoloRowIdx >= 0) {
        result = adminRotationGeneratorTryRepairSoloMillRow17008(month, previousSoloRowIdx, currentSolo, knownNames, monthKey, counts);
      }
      if (result) {
        repairs += 1;
        if (result.mode === 'three-way-soft') threeWay += 1;
        else direct += 1;
        counts = adminRotationGeneratorCountSoloMill(month, knownNames);
      } else {
        unresolved.push({
          previousRowIdx: previousSoloRowIdx,
          rowIdx,
          name: currentSolo,
          date: String(softRows[rowIdx] && softRows[rowIdx].date || '')
        });
      }
      currentSolo = adminRotationGeneratorSoloMillNameAtRow17008(month, rowIdx, knownNames);
    }
    previousSolo = currentSolo || '';
    previousSoloRowIdx = currentSolo ? rowIdx : -1;
  }

  return { repairs, direct, threeWay, unresolved, counts };
}

`;
    source = source.replace(anchor, helper + anchor);
  }
  assert(source.includes(GENERATOR_MARKER), 'final solo-mill repair marker missing');
  assert(source.includes('function adminRotationGeneratorRepairConsecutiveSoloMill17008'), 'final repair function missing');
  assert(source.includes("mode: 'three-way-soft'"), 'three-way soft fallback missing');
  return source;
}

function patchRotation(source) {
  assert(source.includes('const finalSoloMillBalance = adminRotationGeneratorBalanceSoloMill(month, model);'), 'final solo balance call missing');
  if (!source.includes(ROTATION_MARKER)) {
    source = replaceOnce(source,
`  const finalSoloMillBalance = adminRotationGeneratorBalanceSoloMill(month, model);
  const ruleCheck = adminRotationValidateMonthRules(month, monthKey, { source: 'generator' });`,
`  const finalSoloMillBalance = adminRotationGeneratorBalanceSoloMill(month, model);
  ${ROTATION_MARKER}
  const finalSoloMillStreakRepair = adminRotationGeneratorRepairConsecutiveSoloMill17008(month, model, monthKey);
  const ruleCheck = adminRotationValidateMonthRules(month, monthKey, { source: 'generator' });`,
      'final solo streak repair call');

    source = replaceOnce(source,
`  if (opts.source === 'manual-save') {
    const mfkf06IdxManual = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF06');`,
`  if (opts.source === 'manual-save' || opts.source === 'generator') {
    const mfkf06IdxManual = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF06');`,
      'generator consecutive solo validation');

    source = replaceOnce(source,
`    softRows.forEach((row, rowIdx) => {
      const dateLabel = String(row && row.date || '').trim();
      if (!dateLabel) return;
      const cells = Array.isArray(row && row.cells) ? row.cells : [];`,
`    softRows.forEach((row, rowIdx) => {
      const dateLabel = String(row && row.date || '').trim();
      if (!dateLabel) return;
      if (typeof adminRotationGeneratorIsWorkingRow === 'function' && !adminRotationGeneratorIsWorkingRow(month, rowIdx)) return;
      const cells = Array.isArray(row && row.cells) ? row.cells : [];`,
      'working-row consecutive solo validation');

    source = replaceOnce(source,
`    soloMillBalanceSwaps: (soloMillBalance && Number(soloMillBalance.swaps || 0)) + (soloMillRebalance && Number(soloMillRebalance.swaps || 0)) + (finalSoloMillBalance && Number(finalSoloMillBalance.swaps || 0)),
    tpkw02BalanceSwaps:`,
`    soloMillBalanceSwaps: (soloMillBalance && Number(soloMillBalance.swaps || 0)) + (soloMillRebalance && Number(soloMillRebalance.swaps || 0)) + (finalSoloMillBalance && Number(finalSoloMillBalance.swaps || 0)) + (finalSoloMillStreakRepair && Number(finalSoloMillStreakRepair.repairs || 0)),
    soloMillConsecutiveRepairs: finalSoloMillStreakRepair && Number(finalSoloMillStreakRepair.repairs || 0),
    soloMillConsecutiveUnresolved: finalSoloMillStreakRepair && Array.isArray(finalSoloMillStreakRepair.unresolved) ? finalSoloMillStreakRepair.unresolved.length : 0,
    tpkw02BalanceSwaps:`,
      'solo repair diagnostics');
  }
  assert(source.includes(ROTATION_MARKER), 'final repair call marker missing');
  assert(source.includes("opts.source === 'manual-save' || opts.source === 'generator'"), 'generator solo-streak validation missing');
  assert(source.indexOf('adminRotationGeneratorRepairConsecutiveSoloMill17008(month, model, monthKey)') < source.indexOf("adminRotationValidateMonthRules(month, monthKey, { source: 'generator' })"), 'repair must run before final validation');
  return source;
}

function patchShiftImage(source, path) {
  assert(source.includes('// RAK_REPORT_COMPACT_PAIRS_17005'), '1.7.05 compact report layer missing in ' + path);
  if (!source.includes(IMAGE_MARKER)) {
    source = replaceOnce(source,
`  function drawProductionRow(ctx, row, x, y, w) {`,
`  ${IMAGE_MARKER}
  function drawProductionRow(ctx, row, x, y, w) {`,
      'shift image marker in ' + path);

    source = replaceOnce(source,
`    const extras = [];
    if (row.free) extras.push('Volné ' + row.free);
    if (row.nok) extras.push('NOK ' + row.nok);
    if (extras.length) {
      ctx.fillStyle = 'rgba(32,54,67,.88)';
      ctx.font = '700 23px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(extras.join('   •   '), x + 18, y + 87);
    }
    ctx.textAlign = 'left';`,
`    if (row.free) {
      ctx.textAlign = 'right';
      ctx.fillStyle = tone.text;
      ctx.font = '850 35px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(row.free + ' volné', x + w - 18, y + 50);
    }
    if (row.nok) {
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(32,54,67,.88)';
      ctx.font = '700 23px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText('NOK ' + row.nok, x + 18, y + 87);
    }
    ctx.textAlign = 'left';`,
      'primary free quantity in ' + path);
  }
  assert(source.includes(IMAGE_MARKER), 'primary free marker missing in ' + path);
  assert(source.includes("ctx.fillText(row.free + ' volné', x + w - 18, y + 50);"), '"volné" primary quantity missing in ' + path);
  assert(source.includes("ctx.font = '850 35px -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif';"), 'free quantity must use normal quantity font in ' + path);
  return source;
}

let config = read('supabase-config.js');
assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co'), 'test Supabase changed');
assert(!config.includes('bkqamcbkiwumsvelahxr'), 'production Supabase leaked');
config = setLine(config, /^window\.RAK_RELEASE_VERSION = "[^"]+";$/m, `window.RAK_RELEASE_VERSION = "${DISPLAY}";`, 'display version');
config = setLine(config, /^window\.RAK_TEST_DISPLAY_VERSION = "[^"]+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY}";`, 'test version');
config = setLine(config, /^window\.RAK_PWA_BUILD = "[^"]+";$/m, `window.RAK_PWA_BUILD = "${BUILD}";`, 'PWA build');
write('supabase-config.js', config);

let appSource = read('app.js');
appSource = setLine(appSource, /^  const RAK_DEV_UPDATE_BUILD = "[^"]+";$/m, `  const RAK_DEV_UPDATE_BUILD = "${BUILD}";`, 'app build');
appSource = setLine(appSource, /^  window\.RAK_RELEASE_VERSION = "[^"]+";$/m, `  window.RAK_RELEASE_VERSION = "${DISPLAY}";`, 'app display');
write('app.js', appSource);

let sw = read('sw.js');
sw = setLine(sw, /^const CACHE_VERSION = '[^']+';$/m, `const CACHE_VERSION = '${CACHE}';`, 'SW cache');
sw = setLine(sw, /^const DEVELOPMENT_TEST_DISPLAY_VERSION = '[^']+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY}';`, 'SW display');
sw = setLine(sw, /^const DEVELOPMENT_BUILD_ID = '[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD}';`, 'SW build');
assert(sw.includes("const SW_APP_VERSION = '1.7.0';"), 'technical SW version changed');
write('sw.js', sw);

let index = read('index.html');
if (!index.includes(`var build='${BUILD}';`)) {
  assert(index.includes("var build='v1.7.07-rosterreport1';"), 'previous 1.7.07 build marker missing');
  index = index.replace("var build='v1.7.07-rosterreport1';", `var build='${BUILD}';`);
}
write('index.html', index);

write('admin-rotation-generator.js', patchGenerator(read('admin-rotation-generator.js')));
write('admin-rotation.js', patchRotation(read('admin-rotation.js')));
write('rak-shift-report-image.js', patchShiftImage(read('rak-shift-report-image.js'), 'rak-shift-report-image.js'));
write('rak-shift-report-share.js', patchShiftImage(read('rak-shift-report-share.js'), 'rak-shift-report-share.js'));

assert(JSON.parse(read('package.json')).version === '1.7.0', 'technical package version changed');
assert(read('supabase-config.js').includes(`window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY}";`), 'release label changed');
assert(read('index.html').includes(`var build='${BUILD}';`), 'PWA build marker changed');
for (const path of ['admin-rotation-generator.js', 'admin-rotation.js', 'rak-shift-report-image.js', 'rak-shift-report-share.js', 'app.js', 'sw.js', 'supabase-config.js']) {
  execFileSync(process.execPath, ['--check', path], { stdio: 'pipe' });
}
execFileSync(process.execPath, ['tools/generator-solo-mill-final-17008-smoke.mjs'], { stdio: 'pipe' });
console.log('[development-version-17008] OK 1.7.08: final solo-mill streak repair (direct + 3-way soft fallback), generator hard-stop validation, PNG free pieces as primary "volné" quantity');
