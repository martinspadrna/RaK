#!/usr/bin/env node
// RaK 1.7.04: stronger professional index accents on top of the 1.7.03 light PNG report.
// Runs after 1.7.03 so the report layout/background/watermark stay byte-for-byte in the same build layer.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const DISPLAY = '1.7.04';
const BUILD = 'v1.7.04-png4';
const CACHE = 'v1.7.04';
const LIGHT_MARKER = '// RAK_REPORT_LIGHT_THEME_17003';
const MARKER = '// RAK_REPORT_ACCENT_PALETTE_17004';
const read = (file) => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value, 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error('[development-version-17004] ' + message); };

function setLine(source, expression, target, label) {
  assert(expression.test(source), 'missing ' + label);
  return source.replace(expression, target);
}
function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  assert(source.includes(before), 'missing ' + label);
  return source.replace(before, after);
}

const OLD_PALETTE = `  const TONES = {
    AF: { text: '#087199', fill: 'rgba(44,153,209,.11)', stroke: 'rgba(15,115,161,.29)' },
    AD: { text: '#087199', fill: 'rgba(44,153,209,.11)', stroke: 'rgba(15,115,161,.29)' },
    AG: { text: '#147b55', fill: 'rgba(49,175,117,.11)', stroke: 'rgba(27,127,87,.28)' },
    AE: { text: '#147b55', fill: 'rgba(49,175,117,.11)', stroke: 'rgba(27,127,87,.28)' },
    AH: { text: '#975d09', fill: 'rgba(221,162,63,.13)', stroke: 'rgba(160,104,22,.30)' }
  };`;

const NEW_PALETTE = `${MARKER}
  const TONES = {
    AF: { text: '#006a98', fill: 'rgba(20,139,199,.17)', stroke: 'rgba(0,106,152,.48)' },
    AD: { text: '#006a98', fill: 'rgba(20,139,199,.17)', stroke: 'rgba(0,106,152,.48)' },
    AG: { text: '#0b7848', fill: 'rgba(31,160,99,.16)', stroke: 'rgba(11,120,72,.47)' },
    AE: { text: '#0b7848', fill: 'rgba(31,160,99,.16)', stroke: 'rgba(11,120,72,.47)' },
    AH: { text: '#a55a00', fill: 'rgba(226,137,40,.18)', stroke: 'rgba(165,90,0,.49)' }
  };`;

function accentImage(source, path) {
  assert(source.includes(LIGHT_MARKER), '1.7.03 light theme missing in ' + path);
  assert(source.includes("const WATERMARK_SRC = './assets/rak-login-crab.png';"), 'original crab missing in ' + path);
  assert(source.includes('ctx.globalAlpha = .085;'), 'watermark opacity changed in ' + path);
  assert(source.includes('REPORT SMĚNY DIFERENCIÁLY'), 'report title changed in ' + path);
  assert(source.includes("N: 'Noční', R: 'Ranní'"), 'shift labels changed in ' + path);
  if (!source.includes(MARKER)) {
    assert(source.includes(OLD_PALETTE), '1.7.03 palette missing in ' + path);
    source = source.replace(OLD_PALETTE, NEW_PALETTE);
  }
  assert(source.includes(MARKER), '1.7.04 palette marker missing in ' + path);
  assert(source.includes("AF: { text: '#006a98', fill: 'rgba(20,139,199,.17)', stroke: 'rgba(0,106,152,.48)' }"), 'blue accent mismatch in ' + path);
  assert(source.includes("AG: { text: '#0b7848', fill: 'rgba(31,160,99,.16)', stroke: 'rgba(11,120,72,.47)' }"), 'green accent mismatch in ' + path);
  assert(source.includes("AH: { text: '#a55a00', fill: 'rgba(226,137,40,.18)', stroke: 'rgba(165,90,0,.49)' }"), 'orange accent mismatch in ' + path);
  assert(source.includes("fillRounded(ctx, x + 24, y + 18, 116, 50, 14, 'rgba(255,255,255,.78)', tone.stroke);"), 'light index chip changed in ' + path);
  assert(source.includes('canvas.toBlob') && source.includes('files: [file]'), 'PNG save/share missing in ' + path);
  return source;
}

let config = read('supabase-config.js');
assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co'), 'test Supabase changed');
assert(!config.includes('bkqamcbkiwumsvelahxr'), 'production Supabase leaked');
config = setLine(config, /^window\.RAK_RELEASE_VERSION = "[^"]+";$/m, `window.RAK_RELEASE_VERSION = "${DISPLAY}";`, 'display version');
config = setLine(config, /^window\.RAK_TEST_DISPLAY_VERSION = "[^"]+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY}";`, 'test version');
config = setLine(config, /^window\.RAK_PWA_BUILD = "[^"]+";$/m, `window.RAK_PWA_BUILD = "${BUILD}";`, 'PWA build');
write('supabase-config.js', config);

let app = read('app.js');
app = setLine(app, /^  const RAK_DEV_UPDATE_BUILD = "[^"]+";$/m, `  const RAK_DEV_UPDATE_BUILD = "${BUILD}";`, 'app build');
app = setLine(app, /^  window\.RAK_RELEASE_VERSION = "[^"]+";$/m, `  window.RAK_RELEASE_VERSION = "${DISPLAY}";`, 'app display');
write('app.js', app);

let sw = read('sw.js');
sw = setLine(sw, /^const CACHE_VERSION = '[^']+';$/m, `const CACHE_VERSION = '${CACHE}';`, 'SW cache');
sw = setLine(sw, /^const DEVELOPMENT_TEST_DISPLAY_VERSION = '[^']+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY}';`, 'SW display');
sw = setLine(sw, /^const DEVELOPMENT_BUILD_ID = '[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD}';`, 'SW build');
assert(sw.includes("const SW_APP_VERSION = '1.7.0';"), 'technical SW version changed');
assert(sw.includes("data.type === 'SKIP_WAITING'"), 'user-confirmed update flow missing');
write('sw.js', sw);

let index = read('index.html');
assert(index.includes('RAK_DEV_17001_UPDATE_PROMPT_RESET'), 'iOS update unblock missing');
index = replaceOnce(index, "var build='v1.7.03-png3';", `var build='${BUILD}';`, 'first-boot update marker');
write('index.html', index);

for (const path of ['rak-shift-report-image.js', 'rak-shift-report-share.js']) {
  write(path, accentImage(read(path), path));
}

assert(JSON.parse(read('package.json')).version === '1.7.0', 'technical package version changed');
assert(read('sw.js').includes(`const CACHE_VERSION = '${CACHE}';`), 'SW cache changed after release');
assert(read('supabase-config.js').includes(`window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY}";`), 'release label changed');
assert(read('index.html').includes(`var build='${BUILD}';`), 'update notice did not reset for new build');
for (const path of ['app.js', 'sw.js', 'supabase-config.js', 'app-pwa-connectivity.js', 'rak-shift-report-image.js', 'rak-shift-report-share.js']) {
  execFileSync(process.execPath, ['--check', path], { stdio: 'pipe' });
}
execFileSync(process.execPath, ['tools/shift-report-image-170-smoke.mjs'], { stdio: 'pipe' });
console.log('[development-version-17004] OK 1.7.04: stronger blue/green/orange PNG accents; 1.7.03 light layout + crab + sharing preserved; PWA cache refreshed');
