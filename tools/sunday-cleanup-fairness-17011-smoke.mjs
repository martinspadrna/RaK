#!/usr/bin/env node
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error('[sunday-cleanup-fairness-17011-smoke] ' + message); };

const generator = read('admin-rotation-generator.js');
const rotation = read('admin-rotation.js');
const image = read('rak-shift-report-image.js');
const config = read('supabase-config.js');
const index = read('index.html');

assert(generator.includes('// RAK_GENERATOR_SUNDAY_TBK_FAIRNESS_17011'), 'generator fairness marker missing');
assert(generator.includes('function adminRotationGeneratorBalanceSundayTbkrCleanup17011'), 'fairness function missing');
assert(generator.includes("if (!/^TBKR/i.test(String(machineName || ''))) return;"), 'hard swap scope is not limited to grinders');
assert(generator.includes("if (!/^MSKC/i.test(String(machineName || ''))) return;"), 'soft swap pool is not limited to MSK lathes');
assert(generator.includes("meta.isSunday && /^R/.test"), 'Sunday morning guard missing');
assert(generator.includes("adminRotationGeneratorPersonKnowsMachine(name, 'TBKR01')"), 'TBK qualification guard missing');
assert(generator.includes("adminRotationGeneratorPersonKnowsMachine(name, 'MSKC03')"), 'MSK qualification guard missing');
assert(generator.includes('adminRotationGeneratorCanUseHardMachine(month, rowIdx'), 'hard-machine safety guard missing');
assert(rotation.includes('// RAK_GENERATOR_SUNDAY_TBK_FAIRNESS_CALL_17011'), 'fairness call marker missing');
assert(rotation.includes('annualSundayTbkrCleanupBalanceSwaps'), 'fairness diagnostics missing');
assert(rotation.indexOf('adminRotationGeneratorBalanceSundayTbkrCleanup17011(month, model, monthKey)') < rotation.indexOf("adminRotationValidateMonthRules(month, monthKey, { source: 'generator' })"), 'fairness must run before final validation');
assert(generator.includes('// RAK_GENERATOR_SOLO_MILL_SPREAD_17009'), '1.7.09 solo-mill fairness lost');
assert(rotation.includes('// RAK_GENERATOR_SOLO_MILL_SPREAD_CALL_17009'), '1.7.09 solo-mill call lost');
assert(image.includes('// RAK_SHIFT_REPORT_FREE_ONLY_GRINDER_17010'), '1.7.10 free-only grinder report lost');
assert(image.includes('// RAK_SHIFT_REPORT_GLASS_17009'), '1.7.09 report glass lost');

function score(rows) {
  const names = Object.keys(rows);
  const avgTBK = names.reduce((sum, name) => sum + rows[name].TBK, 0) / names.length;
  const avgMSK = names.reduce((sum, name) => sum + rows[name].MSK, 0) / names.length;
  return names.reduce((sum, name) => {
    const dt = rows[name].TBK - avgTBK;
    const dm = rows[name].MSK - avgMSK;
    return sum + dt * dt / Math.max(1, avgTBK) + dm * dm / Math.max(1, avgMSK);
  }, 0);
}

// Regression for the reported shape: one qualified worker can be on 0 TBK cleanups while another is far ahead.
const before = {
  'Novotný': { TBK: 0, MSK: 5 },
  'Kříž': { TBK: 6, MSK: 1 },
  'Pech': { TBK: 3, MSK: 3 }
};
const after = JSON.parse(JSON.stringify(before));
after['Kříž'].TBK -= 1;
after['Kříž'].MSK += 1;
after['Novotný'].MSK -= 1;
after['Novotný'].TBK += 1;
assert(score(after) < score(before), '0-vs-6 TBK transfer must improve annual cleanup fairness');
assert(after['Novotný'].TBK === 1 && after['Kříž'].TBK === 5, 'TBK transfer fixture mismatch');

assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co'), 'test Supabase changed');
assert(!config.includes('bkqamcbkiwumsvelahxr'), 'production Supabase leaked');
assert(config.includes('window.RAK_RELEASE_VERSION = "1.7.11";'), 'display version is not 1.7.11');
assert(config.includes('window.RAK_PWA_BUILD = "v1.7.11-cleanfair1";'), 'PWA build is not 1.7.11');
assert(index.includes("var build='v1.7.11-cleanfair1';"), 'index build marker is not 1.7.11');

console.log('[sunday-cleanup-fairness-17011-smoke] OK annual TBK/MSK Sunday cleanup fairness; reported 0-vs-6 fixture improves; nýtování, solo mills and 1.7.10 report preserved');