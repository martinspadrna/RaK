#!/usr/bin/env node
// RaK development 1.7.02: subtle portrait PNG background + new numbered iOS update.
// Run after the frozen 1.7 release checks and the 1.7.01 development stamp.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const DISPLAY = '1.7.02';
const BUILD = 'v1.7.02-png2';
const CACHE = 'v1.7.02';
const ROOT = process.cwd();
const fail = (message) => { throw new Error('[development-version-17002] ' + message); };
const assert = (ok, message) => { if (!ok) fail(message); };
const read = (file) => fs.readFileSync(`${ROOT}/${file}`, 'utf8');
const write = (file, content) => fs.writeFileSync(`${ROOT}/${file}`, content, 'utf8');
function setLine(source, expression, target, label) {
  assert(expression.test(source), 'missing ' + label);
  return source.replace(expression, target);
}
function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  assert(source.includes(before), 'missing previous ' + label);
  return source.replace(before, after);
}

// The first stamp deliberately still runs for legacy release compatibility.
// Override its display/build metadata here, preserving technical version 1.7.0.
let config = read('supabase-config.js');
assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co'), 'test Supabase must stay isolated');
assert(!config.includes('bkqamcbkiwumsvelahxr'), 'production Supabase in development config');
config = setLine(config, /^window\.RAK_RELEASE_VERSION = "[^"]+";$/m, `window.RAK_RELEASE_VERSION = "${DISPLAY}";`, 'config release');
config = setLine(config, /^window\.RAK_TEST_DISPLAY_VERSION = "[^"]+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY}";`, 'config display');
config = setLine(config, /^window\.RAK_PWA_BUILD = "[^"]+";$/m, `window.RAK_PWA_BUILD = "${BUILD}";`, 'config PWA build');
write('supabase-config.js', config);

let app = read('app.js');
app = setLine(app, /^  const RAK_DEV_UPDATE_BUILD = "[^"]+";$/m, `  const RAK_DEV_UPDATE_BUILD = "${BUILD}";`, 'app PWA build');
app = setLine(app, /^  window\.RAK_RELEASE_VERSION = "[^"]+";$/m, `  window.RAK_RELEASE_VERSION = "${DISPLAY}";`, 'app release');
write('app.js', app);

let sw = read('sw.js');
sw = setLine(sw, /^const CACHE_VERSION = '[^']+';$/m, `const CACHE_VERSION = '${CACHE}';`, 'SW cache');
sw = setLine(sw, /^const DEVELOPMENT_TEST_DISPLAY_VERSION = '[^']+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY}';`, 'SW display');
sw = setLine(sw, /^const DEVELOPMENT_BUILD_ID = '[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD}';`, 'SW build');
assert(sw.includes("const SW_APP_VERSION = '1.7.0';"), 'technical SW version changed');
assert(sw.includes("'./assets/rak-login-crab.png'"), 'original login crab is no longer cached');
assert(sw.includes("data.type === 'SKIP_WAITING'"), 'explicit update approval lost');
write('sw.js', sw);

// Retarget the 1.7.01 early-HTML update unblock instead of adding a second
// competing bootstrap: older suppression clears once per new numbered build.
let index = read('index.html');
assert(index.includes('RAK_DEV_17001_UPDATE_PROMPT_RESET'), 'early update unblock not installed');
index = replaceOnce(index, "var build='v1.7.01-png1';", `var build='${BUILD}';`, 'entry update unblock');
assert(index.includes(`var build='${BUILD}';`), 'new build does not reset old update suppression');
write('index.html', index);

// Modify ONLY the image's canvas background, not report data, index colours,
// the original login crab asset, or any other app background.
let runtime = read('rak-shift-report-share.js');
const begin = runtime.indexOf('  function drawBackground(ctx, width, height, watermark) {');
const end = runtime.indexOf('  function drawHeader(ctx, model) {', begin);
assert(begin >= 0 && end > begin, 'portrait PNG background not found');
assert(runtime.indexOf('  function drawBackground(ctx, width, height, watermark) {', begin + 1) < 0, 'duplicate canvas backgrounds');
let background = runtime.slice(begin, end);
for (const [before, after, label] of [
  ["base.addColorStop(0, '#071a26');", "base.addColorStop(0, '#121820');", 'top base'],
  ["base.addColorStop(.48, '#0b242b');", "base.addColorStop(.48, '#161e24');", 'middle base'],
  ["base.addColorStop(1, '#061118');", "base.addColorStop(1, '#10171e');", 'bottom base'],
  ["glowA.addColorStop(0, 'rgba(32,163,225,.16)');", "glowA.addColorStop(0, 'rgba(115,139,153,.025)');", 'blue glow'],
  ["glowB.addColorStop(0, 'rgba(48,186,137,.10)');", "glowB.addColorStop(0, 'rgba(112,142,134,.014)');", 'green glow'],
  ['ctx.globalAlpha = .055;', 'ctx.globalAlpha = .17;', 'original crab visibility']
]) background = replaceOnce(background, before, after, label);
runtime = runtime.slice(0, begin) + background + runtime.slice(end);
assert(runtime.includes("const WATERMARK_SRC = './assets/rak-login-crab.png';"), 'exact login watermark source changed');
assert(runtime.includes('ctx.globalAlpha = .17;'), 'crab is not visible at new opacity');
assert(runtime.includes('canvas.toBlob') && runtime.includes('files: [file]'), 'PNG export/share regressed');
write('rak-shift-report-share.js', runtime);

assert(JSON.parse(read('package.json')).version === '1.7.0', 'technical version must stay 1.7.0');
assert(read('supabase-config.js').includes(`window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY}";`), 'test label regressed');
assert(read('app.js').includes(`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`), 'app build marker regressed');
assert(read('sw.js').includes(`const CACHE_VERSION = '${CACHE}';`), 'PWA cache marker regressed');
assert(read('sw.js').includes(`const DEVELOPMENT_BUILD_ID = '${BUILD}';`), 'SW build marker regressed');
assert(read('index.html').includes(`var build='${BUILD}';`), 'entry unblock marker regressed');
assert(read('rak-shift-report-share.js').includes("glowA.addColorStop(0, 'rgba(115,139,153,.025)');"), 'PNG glow reverted');
for (const file of ['app.js', 'sw.js', 'supabase-config.js', 'app-pwa-connectivity.js', 'rak-shift-report-share.js']) {
  try { execFileSync(process.execPath, ['--check', file], { cwd: ROOT, stdio: 'pipe' }); }
  catch (error) { fail('syntax check failed: ' + file + ': ' + String(error && error.stderr || error)); }
}
console.log(`[development-version-17002] OK RaK ${DISPLAY}; subdued PNG gradient, exact login crab alpha .17, colours/data/share unchanged; cache ${CACHE}; update approval preserved; syntax OK`);
