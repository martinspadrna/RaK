#!/usr/bin/env node
// RaK 1.7.09: enforce monthly solo-mill spread + stronger transparent shift-report PNG.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const DISPLAY = '1.7.09';
const BUILD = 'v1.7.09-solomill3';
const CACHE = 'v1.7.09';
const GENERATOR_MARKER = '// RAK_GENERATOR_SOLO_MILL_SPREAD_17009';
const ROTATION_MARKER = '// RAK_GENERATOR_SOLO_MILL_SPREAD_CALL_17009';
const IMAGE_MARKER = '// RAK_SHIFT_REPORT_GLASS_17009';
const read = (file) => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value, 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error('[development-version-17009] ' + message); };

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
  assert(source.includes('// RAK_GENERATOR_FINAL_SOLO_MILL_REPAIR_17008'), '1.7.08 final solo-mill repair missing');
  if (!source.includes(GENERATOR_MARKER)) {
    source = replaceOnce(source,
`function adminRotationGeneratorTryRepairSoloMillRow17008(month, rowIdx, repeatedName, knownNames, monthKey, soloCounts) {`,
`function adminRotationGeneratorTryRepairSoloMillRow17008(month, rowIdx, repeatedName, knownNames, monthKey, soloCounts, candidateMaxCount) {`,
      '1.7.08 repair signature');

    source = replaceOnce(source,
`  const candidates = knownNames
    .filter((name) => name && name !== repeated)
    .filter((name) => adminRotationGeneratorPersonKnowsMachine(name, 'MFKF10'))`,
`  const candidates = knownNames
    .filter((name) => name && name !== repeated)
    .filter((name) => candidateMaxCount == null || Number(counts[name] || 0) <= Number(candidateMaxCount))
    .filter((name) => adminRotationGeneratorPersonKnowsMachine(name, 'MFKF10'))`,
      'candidate count ceiling');

    const anchor = 'function adminRotationGeneratorCountSoftKinds(month, names) {';
    assert(source.includes(anchor), 'soft-kind anchor missing');
    const helper = `${GENERATOR_MARKER}
function adminRotationGeneratorRepairSoloMillSpread17009(month, model, monthKey) {
  const knownNames = model && Array.isArray(model.knownNames) ? model.knownNames : adminGetKnownNames();
  const rules = getAdminRotationGeneratorRules();
  if (rules.soloMillBalanceEnabled === false) return { repairs: 0, spread: 0, counts: Object.create(null), disabled: true };
  const allowedSpread = Math.max(0, Math.min(6, Number(rules.soloMillMaxSpread ?? 1) || 1));
  const workingNames = adminRotationGeneratorCollectWorkingNames(month, knownNames)
    .filter((name) => knownNames.includes(name))
    .filter((name) => adminRotationGeneratorPersonKnowsMachine(name, 'MFKF10'));
  const softRows = Array.isArray(month && month.soft && month.soft.rows) ? month.soft.rows : [];
  if (workingNames.length < 2 || !softRows.length) return { repairs: 0, spread: 0, counts: adminRotationGeneratorCountSoloMill(month, workingNames) };

  let repairs = 0;
  let counts = adminRotationGeneratorCountSoloMill(month, workingNames);
  const maxPasses = Math.max(1, softRows.length * workingNames.length);
  for (let pass = 0; pass < maxPasses; pass += 1) {
    const values = workingNames.map((name) => Number(counts[name] || 0));
    const high = Math.max(...values);
    const low = Math.min(...values);
    if (high - low <= allowedSpread) break;

    const highNames = workingNames
      .filter((name) => Number(counts[name] || 0) === high)
      .sort((a, b) => a.localeCompare(b, 'cs'));
    let repaired = false;
    for (const highName of highNames) {
      for (let rowIdx = 0; rowIdx < softRows.length; rowIdx += 1) {
        if (!adminRotationGeneratorIsWorkingRow(month, rowIdx)) continue;
        if (adminRotationGeneratorSoloMillNameAtRow17008(month, rowIdx, knownNames) !== highName) continue;
        const allCounts = adminRotationGeneratorCountSoloMill(month, knownNames);
        const result = adminRotationGeneratorTryRepairSoloMillRow17008(
          month,
          rowIdx,
          highName,
          knownNames,
          monthKey,
          allCounts,
          high - allowedSpread - 1
        );
        if (!result) continue;
        repairs += 1;
        counts = adminRotationGeneratorCountSoloMill(month, workingNames);
        repaired = true;
        break;
      }
      if (repaired) break;
    }
    if (!repaired) break;
  }

  counts = adminRotationGeneratorCountSoloMill(month, workingNames);
  const finalValues = workingNames.map((name) => Number(counts[name] || 0));
  const spread = finalValues.length ? Math.max(...finalValues) - Math.min(...finalValues) : 0;
  return { repairs, spread, allowedSpread, counts, workingNames: workingNames.slice() };
}

`;
    source = source.replace(anchor, helper + anchor);
  }
  assert(source.includes(GENERATOR_MARKER), 'monthly solo-mill spread marker missing');
  assert(source.includes('candidateMaxCount == null || Number(counts[name] || 0) <= Number(candidateMaxCount)'), 'candidate ceiling missing');
  assert(source.includes('function adminRotationGeneratorRepairSoloMillSpread17009'), 'monthly spread repair missing');
  return source;
}

function patchRotation(source) {
  assert(source.includes('// RAK_GENERATOR_FINAL_SOLO_MILL_CALL_17008'), '1.7.08 final solo-mill call missing');
  if (!source.includes(ROTATION_MARKER)) {
    source = replaceOnce(source,
`  const finalSoloMillStreakRepair = adminRotationGeneratorRepairConsecutiveSoloMill17008(month, model, monthKey);
  const ruleCheck = adminRotationValidateMonthRules(month, monthKey, { source: 'generator' });`,
`  const finalSoloMillStreakRepair = adminRotationGeneratorRepairConsecutiveSoloMill17008(month, model, monthKey);
  ${ROTATION_MARKER}
  const finalSoloMillSpreadRepair = adminRotationGeneratorRepairSoloMillSpread17009(month, model, monthKey);
  const ruleCheck = adminRotationValidateMonthRules(month, monthKey, { source: 'generator' });`,
      'monthly spread repair call');

    source = replaceOnce(source,
`    if (spread > allowed) addIssue('warn', 'solo-mill-balance', 'Samostatné frézky nejdou bezpečně dorovnat na výchozí rozdíl ' + String(allowed) + '.', 'Aktuální rozdíl: ' + String(spread) + '.');`,
`    if (spread > allowed) addIssue(opts.source === 'generator' ? 'error' : 'warn', 'solo-mill-balance', 'Samostatné frézky nejdou bezpečně dorovnat na výchozí rozdíl ' + String(allowed) + '.', 'Aktuální rozdíl: ' + String(spread) + '.');`,
      'generator spread validation severity');

    source = replaceOnce(source,
`    soloMillBalanceSwaps: (soloMillBalance && Number(soloMillBalance.swaps || 0)) + (soloMillRebalance && Number(soloMillRebalance.swaps || 0)) + (finalSoloMillBalance && Number(finalSoloMillBalance.swaps || 0)) + (finalSoloMillStreakRepair && Number(finalSoloMillStreakRepair.repairs || 0)),
    soloMillConsecutiveRepairs: finalSoloMillStreakRepair && Number(finalSoloMillStreakRepair.repairs || 0),`,
`    soloMillBalanceSwaps: (soloMillBalance && Number(soloMillBalance.swaps || 0)) + (soloMillRebalance && Number(soloMillRebalance.swaps || 0)) + (finalSoloMillBalance && Number(finalSoloMillBalance.swaps || 0)) + (finalSoloMillStreakRepair && Number(finalSoloMillStreakRepair.repairs || 0)) + (finalSoloMillSpreadRepair && Number(finalSoloMillSpreadRepair.repairs || 0)),
    soloMillMonthlySpreadRepairs: finalSoloMillSpreadRepair && Number(finalSoloMillSpreadRepair.repairs || 0),
    soloMillMonthlySpread: finalSoloMillSpreadRepair && Number(finalSoloMillSpreadRepair.spread || 0),
    soloMillConsecutiveRepairs: finalSoloMillStreakRepair && Number(finalSoloMillStreakRepair.repairs || 0),`,
      'monthly spread diagnostics');
  }
  assert(source.includes(ROTATION_MARKER), 'monthly spread call marker missing');
  assert(source.indexOf('adminRotationGeneratorRepairSoloMillSpread17009(month, model, monthKey)') < source.indexOf("adminRotationValidateMonthRules(month, monthKey, { source: 'generator' })"), 'monthly spread repair must run before validation');
  assert(source.includes("opts.source === 'generator' ? 'error' : 'warn', 'solo-mill-balance'"), 'generator must reject unresolved monthly spread');
  return source;
}

function patchShiftImage(source, path) {
  assert(source.includes('// RAK_SHIFT_REPORT_FREE_PRIMARY_17008'), '1.7.08 free quantity layer missing in ' + path);
  if (!source.includes(IMAGE_MARKER)) {
    source = replaceOnce(source,
`  // RAK_SHIFT_REPORT_FREE_PRIMARY_17008`,
`  ${IMAGE_MARKER}
  // RAK_SHIFT_REPORT_FREE_PRIMARY_17008`,
      'shift-report glass marker in ' + path);

    const replacements = [
      ['ctx.globalAlpha = .085;', 'ctx.globalAlpha = .16;'],
      ["fill: 'rgba(45,156,255,.22)'", "fill: 'rgba(45,156,255,.14)'"],
      ["fill: 'rgba(139,228,88,.22)'", "fill: 'rgba(139,228,88,.14)'"],
      ["fill: 'rgba(255,179,63,.24)'", "fill: 'rgba(255,179,63,.15)'"],
      ["fill: 'rgba(75,102,116,.08)'", "fill: 'rgba(75,102,116,.05)'"],
      ["fillRounded(ctx, x, y, w, h, 28, 'rgba(255,255,255,.58)'", "fillRounded(ctx, x, y, w, h, 28, 'rgba(255,255,255,.36)'"],
      ["fillRounded(ctx, x, y, w, h, 28, 'rgba(255,255,255,.60)'", "fillRounded(ctx, x, y, w, h, 28, 'rgba(255,255,255,.38)'"],
      ["fillRounded(ctx, x + 24, cursor, w - 48, 70 + Math.max(1, measured[index].length) * 38, 18, 'rgba(235,242,245,.66)'", "fillRounded(ctx, x + 24, cursor, w - 48, 70 + Math.max(1, measured[index].length) * 38, 18, 'rgba(235,242,245,.44)'"]
    ];
    replacements.forEach(([before, after]) => {
      assert(source.includes(before), 'missing visual token in ' + path + ': ' + before);
      source = source.replaceAll(before, after);
    });
  }
  assert(source.includes(IMAGE_MARKER), 'shift-report glass marker missing in ' + path);
  assert(source.includes('ctx.globalAlpha = .16;'), 'crab watermark opacity mismatch in ' + path);
  assert(source.includes("rgba(255,255,255,.36)"), 'section cards not transparent enough in ' + path);
  assert(source.includes("rgba(255,255,255,.38)"), 'problem card not transparent enough in ' + path);
  assert(source.includes("rgba(235,242,245,.44)"), 'problem inner card not transparent enough in ' + path);
  assert(source.includes("ctx.fillText(row.free + ' volné', x + w - 18, y + 50);"), 'primary volné quantity lost in ' + path);
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
assert(sw.includes("data.type === 'SKIP_WAITING'"), 'user-confirmed update flow missing');
write('sw.js', sw);

let index = read('index.html');
if (!index.includes(`var build='${BUILD}';`)) {
  assert(index.includes("var build='v1.7.08-solomill2';"), 'previous 1.7.08 build marker missing');
  index = index.replace("var build='v1.7.08-solomill2';", `var build='${BUILD}';`);
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
execFileSync(process.execPath, ['tools/solo-mill-spread-17009-smoke.mjs'], { stdio: 'pipe' });
console.log('[development-version-17009] OK 1.7.09: monthly solo MFKF10 spread enforced to configured max when safely possible; unresolved generator spread rejected; shift-report cards more transparent + crab stronger');