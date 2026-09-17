#!/usr/bin/env node
// Last build stage for RaK 1.7 generator staffing and task-sharing hotfix.
import fs from 'node:fs';
const read = (file) => fs.readFileSync(file, 'utf8');
const must = (ok, message) => { if (!ok) throw new Error('[generator-finalize-170] ' + message); };
if (!read('admin-rotation-generator.js').includes('function adminRotationGeneratorThreeAbsences(')) {
  await import('./generator-staffing-170.mjs');
} else {
  must(read('admin-rotation.js').includes("const tpkw02Balance = adminRotationGeneratorBalanceHardMachine(month, 'TPKW02', model, monthKey);"), 'incomplete staffing patch on repeated build');
  console.log('[generator-finalize-170] repeated build: staffing patch already applied');
}
if (!read('rotation-tasks.js').includes('sharedTpkw02: shouldShareTpkw02FromCard(card)')) {
  await import('./generator-grinder-tasks-170.mjs');
} else {
  must(read('rotation-tasks.js').includes("tasksForMachine('TPKW02', normalizedShift)"), 'incomplete grinder task patch on repeated build');
  console.log('[generator-finalize-170] repeated build: grinder task patch already applied');
}
const BUILD = '1.7.0-release9';
let sw = read('sw.js');
sw = sw.replace(/^const DEVELOPMENT_BUILD_ID = '[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD}';`);
const assets = "const RAK_170_GENERATOR_STAFFING_ASSETS = ['./admin-rotation-generator.js?v=1.7.0', './admin-rotation.js?v=1.7.0', './rotation-tasks.js?v=1.7.0'];";
if (/^const RAK_170_GENERATOR_STAFFING_ASSETS = .*$/m.test(sw)) sw = sw.replace(/^const RAK_170_GENERATOR_STAFFING_ASSETS = .*$/m, assets);
else {
  const anchor = /^const RAK_170_REPORT_APPEARANCE_ASSETS = .*$/m;
  must(anchor.test(sw), 'previous release7 cache anchor missing');
  sw = sw.replace(anchor, (line) => line + '\n' + assets);
}
sw = sw.replace(/const hotfixAssets = ([^;]+);/, (full, expr) => expr.includes('RAK_170_GENERATOR_STAFFING_ASSETS') ? full : `const hotfixAssets = ${expr}.concat(RAK_170_GENERATOR_STAFFING_ASSETS);`);
must(sw.includes('concat(RAK_170_GENERATOR_STAFFING_ASSETS)'), 'generator same-version cache invalidation missing');
fs.writeFileSync('sw.js', sw, 'utf8');
let config = read('supabase-config.js');
config = config.replace(/^window\.RAK_PWA_BUILD = "[^"]+";$/m, `window.RAK_PWA_BUILD = "v${BUILD}";`);
must(config.includes('window.RAK_RELEASE_VERSION = "1.7";'), 'public version changed');
must(config.includes('window.RAK_TEST_DISPLAY_VERSION = "1.7";'), 'display version changed');
fs.writeFileSync('supabase-config.js', config, 'utf8');
console.log('[generator-finalize-170] OK idempotent generator + TPKW02 grinder tasks + same-version PWA refresh; RaK 1.7');
