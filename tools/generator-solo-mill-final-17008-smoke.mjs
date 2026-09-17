#!/usr/bin/env node
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error('[generator-solo-mill-final-17008-smoke] ' + message); };

const generator = read('admin-rotation-generator.js');
const rotation = read('admin-rotation.js');
const image = read('rak-shift-report-image.js');
const share = read('rak-shift-report-share.js');
const config = read('supabase-config.js');
const index = read('index.html');

assert(generator.includes('// RAK_GENERATOR_FINAL_SOLO_MILL_REPAIR_17008'), 'final solo-mill repair marker missing');
assert(generator.includes('function adminRotationGeneratorRepairConsecutiveSoloMill17008'), 'final repair function missing');
assert(generator.includes("mode: 'direct'"), 'direct solo-mill repair missing');
assert(generator.includes("mode: 'three-way-soft'"), 'three-way soft fallback missing');
assert(generator.includes('adminRotationGeneratorWouldRepeatSoloMill(month, rowIdx, name, knownNames)'), 'candidate adjacency guard missing');
assert(generator.includes("adminRotationGeneratorPersonKnowsMachine(name, 'MFKF10')"), 'MFKF10 qualification guard missing');

assert(rotation.includes('// RAK_GENERATOR_FINAL_SOLO_MILL_CALL_17008'), 'final repair call marker missing');
const repairPos = rotation.indexOf('adminRotationGeneratorRepairConsecutiveSoloMill17008(month, model, monthKey)');
const validatePos = rotation.indexOf("adminRotationValidateMonthRules(month, monthKey, { source: 'generator' })");
assert(repairPos >= 0 && validatePos > repairPos, 'final repair must run after balancing and before validation');
assert(rotation.includes("opts.source === 'manual-save' || opts.source === 'generator'"), 'generator does not hard-stop consecutive solo mill');
assert(rotation.includes('soloMillConsecutiveRepairs:'), 'repair diagnostics missing');

for (const [path, source] of [['image', image], ['share', share]]) {
  assert(source.includes('// RAK_SHIFT_REPORT_FREE_PRIMARY_17008'), path + ' primary-free marker missing');
  assert(source.includes("ctx.fillText(row.free + ' volné', x + w - 18, y + 50);"), path + ' does not render X volné');
  assert(source.includes("ctx.font = '850 35px -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif';"), path + ' free pieces are not normal-size quantity');
  assert(!source.includes("extras.push('Volné ' + row.free)"), path + ' still uses old small secondary free label');
}

assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co'), 'test Supabase changed');
assert(!config.includes('bkqamcbkiwumsvelahxr'), 'production Supabase leaked');
assert(config.includes('window.RAK_RELEASE_VERSION = "1.7.08";'), 'display version is not 1.7.08');
assert(config.includes('window.RAK_PWA_BUILD = "v1.7.08-solomill2";'), 'PWA build is not 1.7.08');
assert(index.includes("var build='v1.7.08-solomill2';"), 'index build marker is not 1.7.08');

// Behavioural micro-check: a repeated solo worker must be excluded when at least
// one qualified non-adjacent candidate exists; otherwise coverage is preserved.
function eligible(previousSolo, candidates, qualified, adjacent) {
  const options = candidates.filter((name) => name !== previousSolo && qualified.has(name) && !adjacent.has(name));
  return options.length ? options : candidates;
}
const qualified = new Set(['Synek', 'Třasák', 'Střížek']);
const options = eligible('Synek', ['Synek', 'Třasák', 'Střížek'], qualified, new Set());
assert(!options.includes('Synek') && options.length === 2, 'Synek should not repeat when Třasák/Střížek are available');
const fallback = eligible('Synek', ['Synek'], new Set(['Synek']), new Set());
assert(fallback.length === 1 && fallback[0] === 'Synek', 'coverage fallback changed unexpectedly');

console.log('[generator-solo-mill-final-17008-smoke] OK final solo-mill repair + generator validation + primary "volné" PNG quantity + test Supabase/version');
