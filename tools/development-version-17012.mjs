#!/usr/bin/env node
// RaK 1.7.12: finish monthly TNKS01/TPKW01 balancing in half-shift units.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const DISPLAY = '1.7.12';
const BUILD = 'v1.7.12-presshalf1';
const CACHE = 'v1.7.12';
const GENERATOR_MARKER = '// RAK_GENERATOR_PRESS_HALF_STEP_17012';
const ROTATION_MARKER = '// RAK_GENERATOR_PRESS_HALF_STEP_CALL_17012';
const read = (file) => fs.readFileSync(file, 'utf8');
const write = (file, content) => fs.writeFileSync(file, content, 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error('[development-version-17012] ' + message); };
const replaceOnce = (source, before, after, label) => {
  if (source.includes(after)) return source;
  assert(source.includes(before), 'missing ' + label);
  return source.replace(before, after);
};
const setLine = (source, expression, target, label) => {
  assert(expression.test(source), 'missing ' + label);
  return source.replace(expression, target);
};

function patchGenerator(source) {
  assert(source.includes('// RAK_GENERATOR_SUNDAY_TBK_FAIRNESS_17011'), '1.7.11 Sunday cleaning fairness missing');
  if (source.includes(GENERATOR_MARKER)) return source;
  const anchor = 'function adminRotationGeneratorCountSoftKinds(month, names) {';
  assert(source.includes(anchor), 'generator insert anchor missing');
  const helper = `${GENERATOR_MARKER}
function adminRotationGeneratorPressFairnessScore17012(counts, names, yearCounts) {
  const list = Array.isArray(names) ? names : [];
  if (!list.length) return { spread: 0, variance: 0, yearVariance: 0 };
  const values = list.map((name) => Number(counts[name] || 0));
  const avg = values.reduce((sum, value) => sum + value, 0) / list.length;
  const annual = list.map((name) => Number(yearCounts[name] || 0) + Number(counts[name] || 0));
  const yearAvg = annual.reduce((sum, value) => sum + value, 0) / list.length;
  return {
    spread: Math.max(...values) - Math.min(...values),
    variance: values.reduce((sum, value) => sum + (value - avg) ** 2, 0),
    yearVariance: annual.reduce((sum, value) => sum + (value - yearAvg) ** 2, 0)
  };
}

function adminRotationGeneratorBalancePressHalfSteps17012(month, model, monthKey) {
  const names = model && Array.isArray(model.knownNames) ? model.knownNames : adminGetKnownNames();
  const core = new Set(adminRotationGeneratorGetSoftCoreNames(names));
  const eligible = adminRotationGeneratorCollectWorkingNames(month, names)
    .filter((name) => names.includes(name) && !core.has(name))
    .filter((name) => adminRotationGeneratorPersonKnowsMachine(name, 'TNKS01'));
  const hardRows = Array.isArray(month && month.hard && month.hard.rows) ? month.hard.rows : [];
  if (eligible.length < 2 || !hardRows.length) return { swaps: 0, spread: 0, disabled: true };
  const yearCounts = model && model.yearHardMachineStats && model.yearHardMachineStats.TNKS01 || Object.create(null);
  const pressIndexes = ['TNKS01', 'TPKW01'].map((machine) => adminRotationGeneratorMachineIndex(HARD_MACHINE_HEADERS, machine)).filter((idx) => idx >= 0);
  if (pressIndexes.length !== 2) return { swaps: 0, spread: 0, disabled: true };
  const fairSet = new Set(eligible);
  let swaps = 0;
  let counts = adminRotationGeneratorCountHardMachine(month, 'TNKS01', eligible, monthKey);
  const initial = adminRotationGeneratorPressFairnessScore17012(counts, eligible, yearCounts);

  // Swap only two occupied TO cells on a split shift. This keeps MO/TO totals, solo mills,
  // Sunday cleanup, staffed-machine counts and the soft-core three-person cycle untouched.
  for (let pass = 0; pass < hardRows.length * 4; pass += 1) {
    const before = adminRotationGeneratorPressFairnessScore17012(counts, eligible, yearCounts);
    let best = null;
    hardRows.forEach((row, rowIdx) => {
      if (!row || !adminRotationGeneratorRowShouldSplitPress(month, rowIdx, monthKey)) return;
      const cells = Array.isArray(row.cells) ? row.cells : [];
      pressIndexes.forEach((pressIdx) => {
        const highName = adminRotationCanonicalName(cells[pressIdx], names);
        if (!fairSet.has(highName)) return;
        const pressMachine = HARD_MACHINE_HEADERS[pressIdx];
        HARD_MACHINE_HEADERS.forEach((otherMachine, otherIdx) => {
          if (pressIndexes.includes(otherIdx)) return;
          const lowName = adminRotationCanonicalName(cells[otherIdx], names);
          if (!fairSet.has(lowName) || lowName === highName) return;
          if (Number(counts[highName] || 0) - Number(counts[lowName] || 0) < 0.999) return;
          if (!adminRotationGeneratorPersonKnowsMachine(lowName, pressMachine)
            || !adminRotationGeneratorPersonKnowsMachine(highName, otherMachine)) return;
          if (!adminRotationGeneratorCanUseHardMachine(month, rowIdx, pressMachine, lowName, names, monthKey)) return;
          if (!adminRotationGeneratorCanUseHardMachine(month, rowIdx, otherMachine, highName, names, monthKey)) return;
          const projected = Object.assign(Object.create(null), counts);
          projected[highName] = Number(projected[highName] || 0) - 0.5;
          projected[lowName] = Number(projected[lowName] || 0) + 0.5;
          const after = adminRotationGeneratorPressFairnessScore17012(projected, eligible, yearCounts);
          const improves = after.spread < before.spread - 0.0001
            || (Math.abs(after.spread - before.spread) < 0.0001 && after.variance < before.variance - 0.0001);
          if (!improves) return;
          if (!best || after.spread < best.after.spread - 0.0001
            || (Math.abs(after.spread - best.after.spread) < 0.0001 && after.variance < best.after.variance - 0.0001)
            || (Math.abs(after.spread - best.after.spread) < 0.0001
              && Math.abs(after.variance - best.after.variance) < 0.0001
              && after.yearVariance < best.after.yearVariance - 0.0001)) {
            best = { cells, pressIdx, otherIdx, highName, lowName, after };
          }
        });
      });
    });
    if (!best) break;
    best.cells[best.pressIdx] = best.lowName;
    best.cells[best.otherIdx] = best.highName;
    counts = adminRotationGeneratorCountHardMachine(month, 'TNKS01', eligible, monthKey);
    swaps += 1;
  }
  const after = adminRotationGeneratorPressFairnessScore17012(counts, eligible, yearCounts);
  return { swaps, initialSpread: initial.spread, spread: after.spread, counts, eligible: eligible.slice() };
}

`;
  source = source.replace(anchor, helper + anchor);
  assert(source.includes(GENERATOR_MARKER), 'half-step helper marker missing');
  return source;
}

function patchRotation(source) {
  assert(source.includes('// RAK_GENERATOR_SUNDAY_TBK_FAIRNESS_CALL_17011'), '1.7.11 call missing');
  if (!source.includes(ROTATION_MARKER)) {
    source = replaceOnce(source,
`  const annualSundayTbkrCleanupBalance = adminRotationGeneratorBalanceSundayTbkrCleanup17011(month, model, monthKey);
  const ruleCheck = adminRotationValidateMonthRules(month, monthKey, { source: 'generator' });`,
`  const annualSundayTbkrCleanupBalance = adminRotationGeneratorBalanceSundayTbkrCleanup17011(month, model, monthKey);
  ${ROTATION_MARKER}
  const pressHalfStepBalance = adminRotationGeneratorBalancePressHalfSteps17012(month, model, monthKey);
  const ruleCheck = adminRotationValidateMonthRules(month, monthKey, { source: 'generator' });`,
      'final press half-step pass');
    source = replaceOnce(source,
`    annualSundayTbkrCleanupSpread: annualSundayTbkrCleanupBalance && Number(annualSundayTbkrCleanupBalance.tbkSpread || 0),`,
`    annualSundayTbkrCleanupSpread: annualSundayTbkrCleanupBalance && Number(annualSundayTbkrCleanupBalance.tbkSpread || 0),
    pressHalfStepBalanceSwaps: pressHalfStepBalance && Number(pressHalfStepBalance.swaps || 0),
    pressHalfStepMonthlySpread: pressHalfStepBalance && Number(pressHalfStepBalance.spread || 0),`,
      'press fairness diagnostics');
  }
  assert(source.includes(ROTATION_MARKER), 'press fairness call marker missing');
  assert(source.indexOf('adminRotationGeneratorBalancePressHalfSteps17012(month, model, monthKey)') < source.indexOf("adminRotationValidateMonthRules(month, monthKey, { source: 'generator' })"), 'press fairness must precede validation');
  return source;
}

let config = read('supabase-config.js');
assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co'), 'test Supabase changed');
assert(!config.includes('bkqamcbkiwumsvelahxr'), 'production Supabase leaked');
config = setLine(config, /^window\.RAK_RELEASE_VERSION = "[^"]+";$/m, `window.RAK_RELEASE_VERSION = "${DISPLAY}";`, 'release display');
config = setLine(config, /^window\.RAK_TEST_DISPLAY_VERSION = "[^"]+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY}";`, 'test display');
config = setLine(config, /^window\.RAK_PWA_BUILD = "[^"]+";$/m, `window.RAK_PWA_BUILD = "${BUILD}";`, 'PWA build');
write('supabase-config.js', config);
let appSource = read('app.js');
appSource = setLine(appSource, /^  const RAK_DEV_UPDATE_BUILD = "[^"]+";$/m, `  const RAK_DEV_UPDATE_BUILD = "${BUILD}";`, 'app build');
appSource = setLine(appSource, /^  window\.RAK_RELEASE_VERSION = "[^"]+";$/m, `  window.RAK_RELEASE_VERSION = "${DISPLAY}";`, 'app display');
write('app.js', appSource);
let sw = read('sw.js');
sw = setLine(sw, /^const CACHE_VERSION = '[^']+';$/m, `const CACHE_VERSION = '${CACHE}';`, 'service worker cache');
sw = setLine(sw, /^const DEVELOPMENT_TEST_DISPLAY_VERSION = '[^']+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY}';`, 'SW display');
sw = setLine(sw, /^const DEVELOPMENT_BUILD_ID = '[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD}';`, 'SW build');
assert(sw.includes("const SW_APP_VERSION = '1.7.0';"), 'technical SW version changed');
write('sw.js', sw);
let index = read('index.html');
if (!index.includes(`var build='${BUILD}';`)) {
  assert(index.includes("var build='v1.7.11-cleanfair1';"), 'previous 1.7.11 build missing');
  index = index.replace("var build='v1.7.11-cleanfair1';", `var build='${BUILD}';`);
}
write('index.html', index);
write('admin-rotation-generator.js', patchGenerator(read('admin-rotation-generator.js')));
write('admin-rotation.js', patchRotation(read('admin-rotation.js')));
assert(read('rak-shift-report-image.js').includes('// RAK_SHIFT_REPORT_FREE_ONLY_GRINDER_17010'), 'grinder reporting changed');
assert(read('rak-shift-report-image.js').includes('// RAK_SHIFT_REPORT_GLASS_17009'), 'PNG glass changed');
assert(JSON.parse(read('package.json')).version === '1.7.0', 'technical version changed');
for (const file of ['admin-rotation-generator.js', 'admin-rotation.js', 'app.js', 'sw.js', 'supabase-config.js']) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
}
execFileSync(process.execPath, ['tools/press-half-balance-17012-smoke.mjs'], { stdio: 'pipe' });
console.log('[development-version-17012] OK 1.7.12: press monthly half-step fairness, annual tie-break, TO-only safe swaps, existing Sunday/solo/report rules preserved');
