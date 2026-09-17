#!/usr/bin/env node
// RaK 1.7.05: vivid index chips + compact paired PNG sections on the 1.7.04 light report.
// Keeps the light background, original crab watermark, image sharing and text report unchanged.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const DISPLAY = '1.7.05';
const BUILD = 'v1.7.05-png5';
const CACHE = 'v1.7.05';
const LIGHT_MARKER = '// RAK_REPORT_LIGHT_THEME_17003';
const ACCENT_MARKER = '// RAK_REPORT_ACCENT_PALETTE_17004';
const MARKER = '// RAK_REPORT_COMPACT_PAIRS_17005';
const read = (file) => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value, 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error('[development-version-17005] ' + message); };

function setLine(source, expression, target, label) {
  assert(expression.test(source), 'missing ' + label);
  return source.replace(expression, target);
}
function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  assert(source.includes(before), 'missing ' + label);
  return source.replace(before, after);
}
function replaceRegion(source, begin, end, replacement, label) {
  const start = source.indexOf(begin);
  const stop = source.indexOf(end, start + begin.length);
  assert(start !== -1 && stop > start, 'missing ' + label);
  assert(source.indexOf(begin, start + 1) === -1, 'duplicate ' + label);
  return source.slice(0, start) + replacement.trimEnd() + '\n\n' + source.slice(stop);
}

const OLD_PALETTE = `  const TONES = {
    AF: { text: '#006a98', fill: 'rgba(20,139,199,.17)', stroke: 'rgba(0,106,152,.48)' },
    AD: { text: '#006a98', fill: 'rgba(20,139,199,.17)', stroke: 'rgba(0,106,152,.48)' },
    AG: { text: '#0b7848', fill: 'rgba(31,160,99,.16)', stroke: 'rgba(11,120,72,.47)' },
    AE: { text: '#0b7848', fill: 'rgba(31,160,99,.16)', stroke: 'rgba(11,120,72,.47)' },
    AH: { text: '#a55a00', fill: 'rgba(226,137,40,.18)', stroke: 'rgba(165,90,0,.49)' }
  };
  const DEFAULT_TONE = { text: '#2a4655', fill: 'rgba(75,102,116,.06)', stroke: 'rgba(52,81,96,.18)' };`;

const NEW_PALETTE = `${MARKER}
  const TONES = {
    AF: { text: '#005f8f', fill: 'rgba(45,156,255,.22)', stroke: 'rgba(17,120,200,.68)', chip: '#2d9cff', chipText: '#ffffff' },
    AD: { text: '#005f8f', fill: 'rgba(45,156,255,.22)', stroke: 'rgba(17,120,200,.68)', chip: '#2d9cff', chipText: '#ffffff' },
    AG: { text: '#0a6d3d', fill: 'rgba(139,228,88,.22)', stroke: 'rgba(78,164,47,.66)', chip: '#8be458', chipText: '#173b18' },
    AE: { text: '#0a6d3d', fill: 'rgba(139,228,88,.22)', stroke: 'rgba(78,164,47,.66)', chip: '#8be458', chipText: '#173b18' },
    AH: { text: '#984800', fill: 'rgba(255,179,63,.24)', stroke: 'rgba(213,120,10,.68)', chip: '#ffb33f', chipText: '#4a2800' }
  };
  const DEFAULT_TONE = { text: '#2a4655', fill: 'rgba(75,102,116,.08)', stroke: 'rgba(52,81,96,.24)', chip: '#dce6ea', chipText: '#28414e' };
  const PAIR_GAP = 28;
  const ROW_HEIGHT = 104;
  const ROW_STEP = 116;`;

function compactImage(source, path) {
  assert(source.includes(LIGHT_MARKER), '1.7.03 light theme missing in ' + path);
  assert(source.includes(ACCENT_MARKER), '1.7.04 accent layer missing in ' + path);
  assert(source.includes("const WATERMARK_SRC = './assets/rak-login-crab.png';"), 'original crab missing in ' + path);
  assert(source.includes('ctx.globalAlpha = .085;'), 'watermark opacity changed in ' + path);
  assert(source.includes('REPORT SMĚNY DIFERENCIÁLY'), 'report title changed in ' + path);
  assert(source.includes("N: 'Noční', R: 'Ranní'"), 'shift labels changed in ' + path);

  if (!source.includes(MARKER)) {
    assert(source.includes(OLD_PALETTE), '1.7.04 palette missing in ' + path);
    source = source.replace(OLD_PALETTE, NEW_PALETTE);

    source = replaceRegion(source, '  function estimateHeight(model) {', '  function roundedPath(ctx, x, y, w, h, r) {', `  function sectionHeight(section) {
    const rows = Math.max(1, section && section.rows ? section.rows.length : 0);
    return 76 + rows * ROW_STEP + (section && section.totalNok ? 56 : 0) + 14;
  }

  function estimateHeight(model) {
    let height = 338;
    for (let i = 0; i < model.sections.length; i += 2) {
      const left = model.sections[i];
      const right = model.sections[i + 1];
      height += Math.max(sectionHeight(left), right ? sectionHeight(right) : 0) + 30;
    }
    if (model.problems.length) {
      height += 92;
      model.problems.forEach((problem) => {
        const textLines = Math.max(1, Math.ceil(String(problem.text || '').length / 58));
        height += 94 + Math.max(0, textLines - 1) * 38;
      });
      height += 24;
    }
    height += 100;
    return Math.min(MAX_CANVAS_HEIGHT, Math.max(MIN_CANVAS_HEIGHT, height));
  }`, 'paired PNG height');

    source = replaceRegion(source, '  function drawProductionRow(ctx, row, x, y, w) {', '  function drawSection(ctx, section, y) {', `  function drawProductionRow(ctx, row, x, y, w) {
    const tone = TONES[row.index] || DEFAULT_TONE;
    fillRounded(ctx, x, y, w, ROW_HEIGHT, 20, tone.fill, tone.stroke);

    fillRounded(ctx, x + 18, y + 15, 96, 48, 14, tone.chip || 'rgba(255,255,255,.86)', tone.stroke);
    ctx.fillStyle = tone.chipText || tone.text;
    ctx.font = '900 29px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(row.index || '—', x + 66, y + 49);

    ctx.textAlign = 'left';
    ctx.fillStyle = tone.text;
    ctx.font = '850 35px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText((row.qty || '—') + (row.qty ? ' ks' : ''), x + 132, y + 50);

    const extras = [];
    if (row.free) extras.push('Volné ' + row.free);
    if (row.nok) extras.push('NOK ' + row.nok);
    if (extras.length) {
      ctx.fillStyle = 'rgba(32,54,67,.88)';
      ctx.font = '700 23px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(extras.join('   •   '), x + 18, y + 87);
    }
    ctx.textAlign = 'left';
  }`, 'compact production rows');

    source = replaceRegion(source, '  function drawSection(ctx, section, y) {', '  function drawProblems(ctx, problems, y) {', `  function drawSection(ctx, section, x, y, w) {
    const rows = section.rows.length ? section.rows : [{ index: '', qty: '', free: '', nok: '' }];
    const h = sectionHeight(section);

    fillRounded(ctx, x, y, w, h, 28, 'rgba(255,255,255,.58)', 'rgba(36,65,78,.16)');
    ctx.fillStyle = '#1c3644';
    ctx.font = '850 36px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(section.label, x + 26, y + 50);

    let rowY = y + 70;
    rows.forEach((row) => {
      drawProductionRow(ctx, row, x + 18, rowY, w - 36);
      rowY += ROW_STEP;
    });

    if (section.totalNok) {
      ctx.fillStyle = 'rgba(39,60,72,.82)';
      ctx.font = '700 25px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText('NOK celkem: ' + (section.totalNok || '—'), x + 26, rowY + 30);
    }
    return h;
  }

  function drawSectionPair(ctx, left, right, y) {
    const fullWidth = CANVAS_WIDTH - OUTER * 2;
    const columnWidth = (fullWidth - PAIR_GAP) / 2;
    const leftHeight = drawSection(ctx, left, OUTER, y, columnWidth);
    const rightHeight = right ? drawSection(ctx, right, OUTER + columnWidth + PAIR_GAP, y, columnWidth) : 0;
    return y + Math.max(leftHeight, rightHeight) + 30;
  }`, 'paired section cards');

    source = replaceRegion(source, '  function drawProblems(ctx, problems, y) {', '  function renderCanvas(model, watermark) {', `  function drawProblems(ctx, problems, y) {
    if (!problems.length) return y;
    const x = OUTER;
    const w = CANVAS_WIDTH - OUTER * 2;
    ctx.font = '500 29px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const measured = problems.map((problem) => wrapLines(ctx, problem.text || 'bez popisu', w - 96));
    const h = 82 + measured.reduce((sum, lines) => sum + 82 + Math.max(1, lines.length) * 38, 0) + 20;

    fillRounded(ctx, x, y, w, h, 28, 'rgba(255,255,255,.60)', 'rgba(36,65,78,.14)');
    ctx.fillStyle = '#1c3644';
    ctx.font = '800 38px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('PROBLÉMY / ODSTÁVKY', x + 32, y + 53);

    let cursor = y + 92;
    problems.forEach((problem, index) => {
      const duration = durationLabel(problemMinutes(problem.from, problem.to));
      const time = (problem.from || '??:??') + '–' + (problem.to || '??:??') + (duration ? '  (' + duration + ')' : '');
      fillRounded(ctx, x + 24, cursor, w - 48, 70 + Math.max(1, measured[index].length) * 38, 18, 'rgba(235,242,245,.66)', 'rgba(44,75,88,.12)');
      ctx.fillStyle = '#203a48';
      ctx.font = '750 30px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(problem.machine || 'Stroj', x + 48, cursor + 38);
      ctx.fillStyle = '#146a90';
      ctx.font = '650 27px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(time, x + w - 48, cursor + 38);
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(34,55,67,.85)';
      ctx.font = '500 29px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      measured[index].forEach((line, lineIndex) => {
        ctx.fillText(line, x + 48, cursor + 80 + lineIndex * 38);
      });
      cursor += 82 + Math.max(1, measured[index].length) * 38;
    });
    return y + h + 30;
  }`, 'transparent problems card');

    source = replaceOnce(source,
      `    let y = 306;
    model.sections.forEach((section) => {
      y = drawSection(ctx, section, y);
    });
    y = drawProblems(ctx, model.problems, y);`,
      `    let y = 306;
    for (let i = 0; i < model.sections.length; i += 2) {
      y = drawSectionPair(ctx, model.sections[i], model.sections[i + 1], y);
    }
    y = drawProblems(ctx, model.problems, y);`,
      'paired render loop');
  }

  assert(source.includes(MARKER), '1.7.05 layout marker missing in ' + path);
  assert(source.includes("chip: '#2d9cff'"), 'blue chip mismatch in ' + path);
  assert(source.includes("chip: '#8be458'"), 'green chip mismatch in ' + path);
  assert(source.includes("chip: '#ffb33f'"), 'orange chip mismatch in ' + path);
  assert(source.includes("fillRounded(ctx, x, y, w, h, 28, 'rgba(255,255,255,.58)'"), 'section transparency mismatch in ' + path);
  assert(source.includes('function drawSectionPair(ctx, left, right, y)'), 'paired sections missing in ' + path);
  assert(source.includes('for (let i = 0; i < model.sections.length; i += 2)'), 'paired render loop missing in ' + path);
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
index = replaceOnce(index, "var build='v1.7.04-png4';", `var build='${BUILD}';`, 'first-boot update marker');
write('index.html', index);

for (const path of ['rak-shift-report-image.js', 'rak-shift-report-share.js']) {
  write(path, compactImage(read(path), path));
}

assert(JSON.parse(read('package.json')).version === '1.7.0', 'technical package version changed');
assert(read('sw.js').includes(`const CACHE_VERSION = '${CACHE}';`), 'SW cache changed after release');
assert(read('supabase-config.js').includes(`window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY}";`), 'release label changed');
assert(read('index.html').includes(`var build='${BUILD}';`), 'update notice did not reset for new build');
for (const path of ['app.js', 'sw.js', 'supabase-config.js', 'app-pwa-connectivity.js', 'rak-shift-report-image.js', 'rak-shift-report-share.js']) {
  execFileSync(process.execPath, ['--check', path], { stdio: 'pipe' });
}
execFileSync(process.execPath, ['tools/shift-report-image-170-smoke.mjs'], { stdio: 'pipe' });
console.log('[development-version-17005] OK 1.7.05: vivid index chips, MO+TO paired, TBKR01+TBKR07 paired, transparent cards; light crab PNG + sharing preserved');
