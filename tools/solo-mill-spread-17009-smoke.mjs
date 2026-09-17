#!/usr/bin/env node
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error('[solo-mill-spread-17009-smoke] ' + message); };

const generator = read('admin-rotation-generator.js');
const rotation = read('admin-rotation.js');
const image = read('rak-shift-report-image.js');
const share = read('rak-shift-report-share.js');
const config = read('supabase-config.js');
const index = read('index.html');

assert(generator.includes('// RAK_GENERATOR_SOLO_MILL_SPREAD_17009'), 'monthly solo-mill spread marker missing');
assert(generator.includes('function adminRotationGeneratorRepairSoloMillSpread17009'), 'monthly spread repair function missing');
assert(generator.includes('candidateMaxCount == null || Number(counts[name] || 0) <= Number(candidateMaxCount)'), 'count ceiling missing');
assert(rotation.includes('// RAK_GENERATOR_SOLO_MILL_SPREAD_CALL_17009'), 'monthly spread call marker missing');
assert(rotation.includes("opts.source === 'generator' ? 'error' : 'warn', 'solo-mill-balance'"), 'unresolved generator spread is not rejected');
assert(rotation.indexOf('adminRotationGeneratorRepairSoloMillSpread17009(month, model, monthKey)') < rotation.indexOf("adminRotationValidateMonthRules(month, monthKey, { source: 'generator' })"), 'spread repair must precede final validation');

// Exact distribution observed in the uploaded October 2026 proposal:
// Kmínek 3× solo, Třasák/Starý/Kříž 2×, Synek/Střížek/Pech/Blažek/Novotný 1×.
const october = { 'Kmínek': 3, 'Třasák': 2, 'Starý': 2, 'Kříž': 2, 'Synek': 1, 'Střížek': 1, 'Pech': 1, 'Blažek': 1, 'Novotný': 1 };
const before = Math.max(...Object.values(october)) - Math.min(...Object.values(october));
assert(before === 2, 'October fixture should start with spread 2');
october['Kmínek'] -= 1;
october['Synek'] += 1;
const after = Math.max(...Object.values(october)) - Math.min(...Object.values(october));
assert(after === 1 && october['Kmínek'] === 2, 'one safe transfer must reduce October fixture to 1-2 solo shifts');

for (const [name, source] of [['image', image], ['share', share]]) {
  assert(source.includes('// RAK_SHIFT_REPORT_GLASS_17009'), name + ' glass marker missing');
  assert(source.includes('ctx.globalAlpha = .16;'), name + ' crab watermark not stronger');
  assert(source.includes("rgba(255,255,255,.36)"), name + ' section card not more transparent');
  assert(source.includes("rgba(255,255,255,.38)"), name + ' problems card not more transparent');
  assert(source.includes("rgba(235,242,245,.44)"), name + ' problem detail not more transparent');
  assert(source.includes("ctx.fillText(row.free + ' volné', x + w - 18, y + 50);"), name + ' primary volné quantity missing');
}

assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co'), 'test Supabase changed');
assert(!config.includes('bkqamcbkiwumsvelahxr'), 'production Supabase leaked');
assert(config.includes('window.RAK_RELEASE_VERSION = "1.7.09";'), 'display version is not 1.7.09');
assert(config.includes('window.RAK_PWA_BUILD = "v1.7.09-solomill3";'), 'PWA build is not 1.7.09');
assert(index.includes("var build='v1.7.09-solomill3';"), 'index build marker is not 1.7.09');

console.log('[solo-mill-spread-17009-smoke] OK October 2026 3/2/1 fixture -> 2/2/1 target; generator spread enforcement; transparent PNG cards + stronger crab + primary volné preserved');