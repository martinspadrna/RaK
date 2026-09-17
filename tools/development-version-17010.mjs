#!/usr/bin/env node
// RaK 1.7.10: when grinder row contains only free pieces, render a single primary label such as "200 AD volné".
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const DISPLAY = '1.7.10';
const BUILD = 'v1.7.10-reportfree1';
const CACHE = 'v1.7.10';
const MARKER = '// RAK_SHIFT_REPORT_FREE_ONLY_GRINDER_17010';
const read = (file) => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value, 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error('[development-version-17010] ' + message); };

function setLine(source, expression, target, label) {
  assert(expression.test(source), 'missing ' + label);
  return source.replace(expression, target);
}
function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  assert(source.includes(before), 'missing ' + label);
  return source.replace(before, after);
}

function patchShiftImage(source, path) {
  assert(source.includes('// RAK_SHIFT_REPORT_GLASS_17009'), '1.7.09 report glass missing in ' + path);
  assert(source.includes('// RAK_SHIFT_REPORT_FREE_PRIMARY_17008'), '1.7.08 primary free quantity missing in ' + path);
  if (!source.includes(MARKER)) {
    source = replaceOnce(source,
`  function drawProductionRow(ctx, row, x, y, w) {`,
`  ${MARKER}
  function drawProductionRow(ctx, row, x, y, w, section) {`,
      'production row signature in ' + path);

    source = replaceOnce(source,
`    const tone = TONES[row.index] || DEFAULT_TONE;
    fillRounded(ctx, x, y, w, ROW_HEIGHT, 20, tone.fill, tone.stroke);

    fillRounded(ctx, x + 18, y + 15, 96, 48, 14, tone.chip || 'rgba(255,255,255,.86)', tone.stroke);`,
`    const tone = TONES[row.index] || DEFAULT_TONE;
    fillRounded(ctx, x, y, w, ROW_HEIGHT, 20, tone.fill, tone.stroke);

    const freeOnlyGrinder = !!row.free && !row.qty && !row.nok && section && (section.id === 'r01' || section.id === 'r07');
    if (freeOnlyGrinder) {
      ctx.textAlign = 'left';
      ctx.fillStyle = tone.text;
      ctx.font = '850 35px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(row.free + ' ' + (row.index || '') + ' volné', x + 24, y + 63);
      return;
    }

    fillRounded(ctx, x + 18, y + 15, 96, 48, 14, tone.chip || 'rgba(255,255,255,.86)', tone.stroke);`,
      'free-only grinder primary row in ' + path);

    source = replaceOnce(source,
`      drawProductionRow(ctx, row, x + 18, rowY, w - 36);`,
`      drawProductionRow(ctx, row, x + 18, rowY, w - 36, section);`,
      'section-aware production row call in ' + path);
  }
  assert(source.includes(MARKER), 'free-only grinder marker missing in ' + path);
  assert(source.includes("section.id === 'r01' || section.id === 'r07'"), 'grinder-only scope missing in ' + path);
  assert(source.includes("ctx.fillText(row.free + ' ' + (row.index || '') + ' volné', x + 24, y + 63);"), 'single free-only grinder label missing in ' + path);
  assert(source.includes('drawProductionRow(ctx, row, x + 18, rowY, w - 36, section);'), 'section is not passed to row renderer in ' + path);
  assert(source.includes('ctx.globalAlpha = .16;'), '1.7.09 stronger crab watermark lost in ' + path);
  assert(source.includes("rgba(255,255,255,.36)"), '1.7.09 transparent report cards lost in ' + path);
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
  assert(index.includes("var build='v1.7.09-solomill3';"), 'previous 1.7.09 build marker missing');
  index = index.replace("var build='v1.7.09-solomill3';", `var build='${BUILD}';`);
}
write('index.html', index);

write('rak-shift-report-image.js', patchShiftImage(read('rak-shift-report-image.js'), 'rak-shift-report-image.js'));
write('rak-shift-report-share.js', patchShiftImage(read('rak-shift-report-share.js'), 'rak-shift-report-share.js'));

assert(JSON.parse(read('package.json')).version === '1.7.0', 'technical package version changed');
for (const path of ['rak-shift-report-image.js', 'rak-shift-report-share.js', 'app.js', 'sw.js', 'supabase-config.js']) {
  execFileSync(process.execPath, ['--check', path], { stdio: 'pipe' });
}
execFileSync(process.execPath, ['tools/shift-report-free-only-17010-smoke.mjs'], { stdio: 'pipe' });
console.log('[development-version-17010] OK 1.7.10: grinder free-only PNG row renders as one primary label, e.g. 200 AD volné; mixed normal+free layout and 1.7.09 glass preserved');