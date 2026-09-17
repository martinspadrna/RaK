#!/usr/bin/env node
// RaK 1.7.11: yearly Sunday TBK cleanup fairness. Nýtování stays on its existing balance path.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const DISPLAY = '1.7.11';
const BUILD = 'v1.7.11-cleanfair1';
const CACHE = 'v1.7.11';
const GENERATOR_MARKER = '// RAK_GENERATOR_SUNDAY_TBK_FAIRNESS_17011';
const ROTATION_MARKER = '// RAK_GENERATOR_SUNDAY_TBK_FAIRNESS_CALL_17011';
const read = (file) => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value, 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error('[development-version-17011] ' + message); };

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
  assert(source.includes('// RAK_GENERATOR_SOLO_MILL_SPREAD_17009'), '1.7.09 solo-mill fairness layer missing');
  if (source.includes(GENERATOR_MARKER)) return source;

  const anchor = 'function adminRotationGeneratorCountSoftKinds(month, names) {';
  assert(source.includes(anchor), 'soft-kind helper anchor missing');
  const helper = `${GENERATOR_MARKER}
function adminRotationGeneratorSundayCleanupGroup17011(machineName) {
  const machine = String(machineName || '').trim().toUpperCase();
  if (/^TBKR/.test(machine)) return 'TBK';
  if (/^MSKC/.test(machine)) return 'MSK';
  return '';
}

function adminRotationGeneratorIsSundayMorning17011(dateLabel, monthKey) {
  const meta = adminRotationGeneratorParseDayMeta(dateLabel, monthKey);
  return !!(meta && meta.isSunday && /^R/.test(String(meta.shift || '').toUpperCase()));
}

function adminRotationGeneratorCreateCleanupCounts17011(names) {
  const result = Object.create(null);
  (Array.isArray(names) ? names : []).forEach((name) => {
    result[name] = { TBK: 0, MSK: 0 };
  });
  return result;
}

function adminRotationGeneratorAddSundayCleanupMonth17011(counts, month, monthKey, names) {
  const list = Array.isArray(names) ? names : adminGetKnownNames();
  const hardRows = Array.isArray(month && month.hard && month.hard.rows) ? month.hard.rows : [];
  const softRows = Array.isArray(month && month.soft && month.soft.rows) ? month.soft.rows : [];
  const maxRows = Math.max(hardRows.length, softRows.length);
  for (let rowIdx = 0; rowIdx < maxRows; rowIdx += 1) {
    const hardRow = hardRows[rowIdx] || null;
    const softRow = softRows[rowIdx] || null;
    const dateLabel = String((hardRow && hardRow.date) || (softRow && softRow.date) || '').trim();
    if (!dateLabel || !adminRotationGeneratorIsSundayMorning17011(dateLabel, monthKey)) continue;
    const scan = (row, machines) => {
      const cells = Array.isArray(row && row.cells) ? row.cells : [];
      machines.forEach((machineName, idx) => {
        const group = adminRotationGeneratorSundayCleanupGroup17011(machineName);
        if (!group) return;
        const name = adminRotationCanonicalName(cells[idx], list);
        if (!name || !Object.prototype.hasOwnProperty.call(counts, name)) return;
        counts[name][group] = Number(counts[name][group] || 0) + 1;
      });
    };
    scan(hardRow, HARD_MACHINE_HEADERS);
    scan(softRow, SOFT_MACHINE_HEADERS);
  }
  return counts;
}

function adminRotationGeneratorYearCleanupCounts17011(month, monthKey, names) {
  const list = Array.isArray(names) ? names : adminGetKnownNames();
  const counts = adminRotationGeneratorCreateCleanupCounts17011(list);
  const target = typeof parseMonthKey === 'function' ? parseMonthKey(monthKey) : null;
  const targetYear = Number(target && target.year);
  const targetMonth = Number(target && target.month);
  if (Number.isFinite(targetYear) && Number.isFinite(targetMonth)) {
    getAdminRotationMonthKeys().forEach((historyKey) => {
      const parsed = typeof parseMonthKey === 'function' ? parseMonthKey(historyKey) : null;
      if (!parsed || Number(parsed.year) !== targetYear || Number(parsed.month) >= targetMonth) return;
      const historyMonth = app && app.rotation && app.rotation.months ? app.rotation.months[historyKey] : null;
      if (historyMonth) adminRotationGeneratorAddSundayCleanupMonth17011(counts, historyMonth, historyKey, list);
    });
  }
  adminRotationGeneratorAddSundayCleanupMonth17011(counts, month, monthKey, list);
  return counts;
}

function adminRotationGeneratorCleanupScore17011(counts, names) {
  const list = Array.isArray(names) ? names : [];
  if (!list.length) return 0;
  const totals = { TBK: 0, MSK: 0 };
  list.forEach((name) => {
    totals.TBK += Number(counts[name] && counts[name].TBK || 0);
    totals.MSK += Number(counts[name] && counts[name].MSK || 0);
  });
  const avg = { TBK: totals.TBK / list.length, MSK: totals.MSK / list.length };
  let score = 0;
  list.forEach((name) => {
    ['TBK', 'MSK'].forEach((group) => {
      const diff = Number(counts[name] && counts[name][group] || 0) - avg[group];
      score += (diff * diff) / Math.max(1, avg[group]);
    });
  });
  return score;
}

function adminRotationGeneratorSundayFairCells17011(month, rowIdx, monthKey, knownNames, fairNames) {
  const fair = new Set(Array.isArray(fairNames) ? fairNames : []);
  const softCore = new Set(adminRotationGeneratorGetSoftCoreNames(knownNames));
  const hardRow = month && month.hard && Array.isArray(month.hard.rows) ? month.hard.rows[rowIdx] : null;
  const softRow = month && month.soft && Array.isArray(month.soft.rows) ? month.soft.rows[rowIdx] : null;
  const dateLabel = String((hardRow && hardRow.date) || (softRow && softRow.date) || '').trim();
  if (!dateLabel || !adminRotationGeneratorIsSundayMorning17011(dateLabel, monthKey)) return [];
  const out = [];
  const hardCells = Array.isArray(hardRow && hardRow.cells) ? hardRow.cells : [];
  HARD_MACHINE_HEADERS.forEach((machineName, idx) => {
    if (!/^TBKR/i.test(String(machineName || ''))) return;
    const name = adminRotationCanonicalName(hardCells[idx], knownNames);
    if (!name || !fair.has(name) || softCore.has(name)) return;
    out.push({ sectionKey: 'hard', row: hardRow, cells: hardCells, idx, machine: machineName, group: 'TBK', name });
  });
  const softCells = Array.isArray(softRow && softRow.cells) ? softRow.cells : [];
  SOFT_MACHINE_HEADERS.forEach((machineName, idx) => {
    if (!/^MSKC/i.test(String(machineName || ''))) return;
    const name = adminRotationCanonicalName(softCells[idx], knownNames);
    if (!name || !fair.has(name) || softCore.has(name)) return;
    out.push({ sectionKey: 'soft', row: softRow, cells: softCells, idx, machine: machineName, group: 'MSK', name });
  });
  return out;
}

function adminRotationGeneratorCanSwapSundayCleanup17011(month, rowIdx, first, second, knownNames, monthKey) {
  if (!first || !second || first.group === second.group || first.name === second.name) return false;
  if (!adminRotationGeneratorPersonKnowsMachine(first.name, second.machine)) return false;
  if (!adminRotationGeneratorPersonKnowsMachine(second.name, first.machine)) return false;
  if (second.sectionKey === 'hard' && !adminRotationGeneratorCanUseHardMachine(month, rowIdx, second.machine, first.name, knownNames, monthKey)) return false;
  if (first.sectionKey === 'hard' && !adminRotationGeneratorCanUseHardMachine(month, rowIdx, first.machine, second.name, knownNames, monthKey)) return false;
  return true;
}

function adminRotationGeneratorBalanceSundayTbkrCleanup17011(month, model, monthKey) {
  const knownNames = model && Array.isArray(model.knownNames) ? model.knownNames : adminGetKnownNames();
  const softCore = new Set(adminRotationGeneratorGetSoftCoreNames(knownNames));
  const fairNames = knownNames.filter((name) => !softCore.has(name))
    .filter((name) => adminRotationGeneratorPersonKnowsMachine(name, 'TBKR01'))
    .filter((name) => adminRotationGeneratorPersonKnowsMachine(name, 'MSKC03'));
  if (fairNames.length < 2) return { swaps: 0, counts: adminRotationGeneratorYearCleanupCounts17011(month, monthKey, fairNames), fairNames, disabled: true };

  let counts = adminRotationGeneratorYearCleanupCounts17011(month, monthKey, fairNames);
  let swaps = 0;
  const rows = Math.max(
    Array.isArray(month && month.hard && month.hard.rows) ? month.hard.rows.length : 0,
    Array.isArray(month && month.soft && month.soft.rows) ? month.soft.rows.length : 0
  );
  const maxPasses = Math.max(1, rows * 8);

  const cloneCounts = (source) => {
    const next = adminRotationGeneratorCreateCleanupCounts17011(fairNames);
    fairNames.forEach((name) => {
      next[name].TBK = Number(source[name] && source[name].TBK || 0);
      next[name].MSK = Number(source[name] && source[name].MSK || 0);
    });
    return next;
  };

  for (let pass = 0; pass < maxPasses; pass += 1) {
    const beforeScore = adminRotationGeneratorCleanupScore17011(counts, fairNames);
    let best = null;
    for (let rowIdx = 0; rowIdx < rows; rowIdx += 1) {
      const cells = adminRotationGeneratorSundayFairCells17011(month, rowIdx, monthKey, knownNames, fairNames);
      const tbkCells = cells.filter((cell) => cell.group === 'TBK');
      const mskCells = cells.filter((cell) => cell.group === 'MSK');
      for (const tbkCell of tbkCells) {
        for (const mskCell of mskCells) {
          if (!adminRotationGeneratorCanSwapSundayCleanup17011(month, rowIdx, tbkCell, mskCell, knownNames, monthKey)) continue;
          const next = cloneCounts(counts);
          next[tbkCell.name].TBK -= 1;
          next[tbkCell.name].MSK += 1;
          next[mskCell.name].MSK -= 1;
          next[mskCell.name].TBK += 1;
          const afterScore = adminRotationGeneratorCleanupScore17011(next, fairNames);
          const improvement = beforeScore - afterScore;
          const zeroTbkrBonus = Number(counts[mskCell.name] && counts[mskCell.name].TBK || 0) === 0
            && Number(counts[tbkCell.name] && counts[tbkCell.name].TBK || 0) >= 2 ? 0.15 : 0;
          const effectiveImprovement = improvement + zeroTbkrBonus;
          if (improvement <= 0.0001) continue;
          if (!best || effectiveImprovement > best.effectiveImprovement + 0.0001) {
            best = { rowIdx, tbkCell, mskCell, next, improvement, effectiveImprovement };
          }
        }
      }
    }
    if (!best) break;
    best.tbkCell.cells[best.tbkCell.idx] = best.mskCell.name;
    best.mskCell.cells[best.mskCell.idx] = best.tbkCell.name;
    counts = best.next;
    swaps += 1;
  }

  const tbkValues = fairNames.map((name) => Number(counts[name] && counts[name].TBK || 0));
  const tbkSpread = tbkValues.length ? Math.max(...tbkValues) - Math.min(...tbkValues) : 0;
  return { swaps, counts, fairNames: fairNames.slice(), tbkSpread, score: adminRotationGeneratorCleanupScore17011(counts, fairNames) };
}

`;
  source = source.replace(anchor, helper + anchor);
  assert(source.includes(GENERATOR_MARKER), 'Sunday TBK fairness marker missing');
  assert(source.includes('function adminRotationGeneratorBalanceSundayTbkrCleanup17011'), 'Sunday TBK fairness helper missing');
  assert(source.includes("if (!/^TBKR/i.test(String(machineName || ''))) return;"), 'TBK-only hard scope missing');
  assert(source.includes("if (!/^MSKC/i.test(String(machineName || ''))) return;"), 'MSK swap pool missing');
  return source;
}

function patchRotation(source) {
  assert(source.includes('// RAK_GENERATOR_SOLO_MILL_SPREAD_CALL_17009'), '1.7.09 final fairness call missing');
  if (!source.includes(ROTATION_MARKER)) {
    source = replaceOnce(source,
`  const finalSoloMillSpreadRepair = adminRotationGeneratorRepairSoloMillSpread17009(month, model, monthKey);
  const ruleCheck = adminRotationValidateMonthRules(month, monthKey, { source: 'generator' });`,
`  const finalSoloMillSpreadRepair = adminRotationGeneratorRepairSoloMillSpread17009(month, model, monthKey);
  ${ROTATION_MARKER}
  const annualSundayTbkrCleanupBalance = adminRotationGeneratorBalanceSundayTbkrCleanup17011(month, model, monthKey);
  const ruleCheck = adminRotationValidateMonthRules(month, monthKey, { source: 'generator' });`,
      'Sunday TBK fairness call');

    source = replaceOnce(source,
`    soloMillMonthlySpread: finalSoloMillSpreadRepair && Number(finalSoloMillSpreadRepair.spread || 0),
    soloMillConsecutiveRepairs: finalSoloMillStreakRepair && Number(finalSoloMillStreakRepair.repairs || 0),`,
`    soloMillMonthlySpread: finalSoloMillSpreadRepair && Number(finalSoloMillSpreadRepair.spread || 0),
    annualSundayTbkrCleanupBalanceSwaps: annualSundayTbkrCleanupBalance && Number(annualSundayTbkrCleanupBalance.swaps || 0),
    annualSundayTbkrCleanupSpread: annualSundayTbkrCleanupBalance && Number(annualSundayTbkrCleanupBalance.tbkSpread || 0),
    soloMillConsecutiveRepairs: finalSoloMillStreakRepair && Number(finalSoloMillStreakRepair.repairs || 0),`,
      'Sunday TBK fairness diagnostics');
  }
  assert(source.includes(ROTATION_MARKER), 'Sunday TBK fairness call marker missing');
  assert(source.indexOf('adminRotationGeneratorBalanceSundayTbkrCleanup17011(month, model, monthKey)') < source.indexOf("adminRotationValidateMonthRules(month, monthKey, { source: 'generator' })"), 'Sunday TBK fairness must run before final validation');
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
  assert(index.includes("var build='v1.7.10-reportfree1';"), 'previous 1.7.10 build marker missing');
  index = index.replace("var build='v1.7.10-reportfree1';", `var build='${BUILD}';`);
}
write('index.html', index);

write('admin-rotation-generator.js', patchGenerator(read('admin-rotation-generator.js')));
write('admin-rotation.js', patchRotation(read('admin-rotation.js')));

assert(read('rak-shift-report-image.js').includes('// RAK_SHIFT_REPORT_FREE_ONLY_GRINDER_17010'), '1.7.10 grinder report behavior lost');
assert(read('rak-shift-report-image.js').includes('// RAK_SHIFT_REPORT_GLASS_17009'), '1.7.09 report glass behavior lost');
assert(JSON.parse(read('package.json')).version === '1.7.0', 'technical package version changed');
for (const path of ['admin-rotation-generator.js', 'admin-rotation.js', 'app.js', 'sw.js', 'supabase-config.js']) {
  execFileSync(process.execPath, ['--check', path], { stdio: 'pipe' });
}
execFileSync(process.execPath, ['tools/sunday-cleanup-fairness-17011-smoke.mjs'], { stdio: 'pipe' });
console.log('[development-version-17011] OK 1.7.11: yearly Sunday TBK cleanup is rebalanced against MSK among qualified non-core workers; nýtování and solo-mill rules preserved');