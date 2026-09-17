#!/usr/bin/env node
// RaK 1.7.03: light portrait PNG, softer original crab watermark, Czech shift labels.
// Runs after frozen 1.7 checks and the 1.7.01 stamp; technical version stays 1.7.0.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const DISPLAY = '1.7.03';
const BUILD = 'v1.7.03-png3';
const CACHE = 'v1.7.03';
const MARKER = '// RAK_REPORT_LIGHT_THEME_17003';
const read = (file) => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value, 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error('[development-version-17003] ' + message); };

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

function lightImage(source) {
  if (source.includes(MARKER)) return source;
  assert(source.includes("const WATERMARK_SRC = './assets/rak-login-crab.png';"), 'exact login crab asset unavailable');
  source = replaceRegion(source, '  const TONES = {', '  const imageCache = new WeakMap();', `  const TONES = {
    AF: { text: '#087199', fill: 'rgba(44,153,209,.11)', stroke: 'rgba(15,115,161,.29)' },
    AD: { text: '#087199', fill: 'rgba(44,153,209,.11)', stroke: 'rgba(15,115,161,.29)' },
    AG: { text: '#147b55', fill: 'rgba(49,175,117,.11)', stroke: 'rgba(27,127,87,.28)' },
    AE: { text: '#147b55', fill: 'rgba(49,175,117,.11)', stroke: 'rgba(27,127,87,.28)' },
    AH: { text: '#975d09', fill: 'rgba(221,162,63,.13)', stroke: 'rgba(160,104,22,.30)' }
  };
  const DEFAULT_TONE = { text: '#2a4655', fill: 'rgba(75,102,116,.06)', stroke: 'rgba(52,81,96,.18)' };`, 'index palette');

  source = replaceRegion(source, '  function drawBackground(ctx, width, height, watermark) {', '  function drawHeader(ctx, model) {', `${MARKER}
  function drawBackground(ctx, width, height, watermark) {
    const base = ctx.createLinearGradient(0, 0, 0, height);
    base.addColorStop(0, '#f8fafb');
    base.addColorStop(.5, '#eff3f5');
    base.addColorStop(1, '#e8edf0');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    if (watermark && watermark.naturalWidth && watermark.naturalHeight) {
      const scale = Math.max((width * 1.12) / watermark.naturalWidth, (height * 1.03) / watermark.naturalHeight);
      const drawW = watermark.naturalWidth * scale;
      const drawH = watermark.naturalHeight * scale;
      ctx.save();
      ctx.globalAlpha = .085;
      ctx.drawImage(watermark, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
      ctx.restore();
    }
  }`, 'PNG background');

  source = replaceRegion(source, '  function drawHeader(ctx, model) {', '  function drawProductionRow(ctx, row, x, y, w) {', `  function drawHeader(ctx, model) {
    ctx.fillStyle = '#1d3643';
    let headingSize = 64;
    ctx.font = '800 ' + headingSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const heading = 'REPORT SMĚNY DIFERENCIÁLY';
    while (ctx.measureText(heading).width > CANVAS_WIDTH - OUTER * 2 && headingSize > 46) {
      headingSize -= 2;
      ctx.font = '800 ' + headingSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    }
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(heading, OUTER, 150);

    ctx.fillStyle = 'rgba(35,56,67,.82)';
    ctx.font = '600 36px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(formatDate(model.date) + '  •  ' + shiftLabel(model.shift), OUTER, 218);

    const rule = ctx.createLinearGradient(OUTER, 0, CANVAS_WIDTH - OUTER, 0);
    rule.addColorStop(0, 'rgba(25,106,143,.62)');
    rule.addColorStop(.55, 'rgba(35,117,89,.28)');
    rule.addColorStop(1, 'rgba(35,56,67,0)');
    ctx.fillStyle = rule;
    ctx.fillRect(OUTER, 258, CANVAS_WIDTH - OUTER * 2, 3);
  }`, 'PNG header');

  source = replaceRegion(source, '  function drawProductionRow(ctx, row, x, y, w) {', '  function drawSection(ctx, section, y) {', `  function drawProductionRow(ctx, row, x, y, w) {
    const tone = TONES[row.index] || DEFAULT_TONE;
    fillRounded(ctx, x, y, w, 86, 20, tone.fill, tone.stroke);

    fillRounded(ctx, x + 24, y + 18, 116, 50, 14, 'rgba(255,255,255,.78)', tone.stroke);
    ctx.fillStyle = tone.text;
    ctx.font = '800 31px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(row.index || '—', x + 82, y + 53);

    ctx.textAlign = 'left';
    ctx.fillStyle = tone.text;
    ctx.font = '800 38px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText((row.qty || '—') + (row.qty ? ' ks' : ''), x + 176, y + 55);

    const extras = [];
    if (row.free) extras.push('Volné ' + row.free);
    if (row.nok) extras.push('NOK ' + row.nok);
    if (extras.length) {
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(32,54,67,.86)';
      ctx.font = '650 29px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(extras.join('   •   '), x + w - 28, y + 54);
    }
    ctx.textAlign = 'left';
  }`, 'PNG production rows');

  source = replaceRegion(source, '  function drawSection(ctx, section, y) {', '  function drawProblems(ctx, problems, y) {', `  function drawSection(ctx, section, y) {
    const x = OUTER;
    const w = CANVAS_WIDTH - OUTER * 2;
    const rows = section.rows.length ? section.rows : [{ index: '', qty: '', free: '', nok: '' }];
    const totalExtra = section.totalNok ? 62 : 0;
    const h = 82 + rows.length * 104 + totalExtra + 14;

    fillRounded(ctx, x, y, w, h, 28, 'rgba(255,255,255,.77)', 'rgba(36,65,78,.14)');
    ctx.fillStyle = '#1c3644';
    ctx.font = '800 38px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(section.label, x + 32, y + 53);

    let rowY = y + 78;
    rows.forEach((row) => {
      drawProductionRow(ctx, row, x + 24, rowY, w - 48);
      rowY += 104;
    });

    if (section.totalNok) {
      ctx.fillStyle = 'rgba(39,60,72,.79)';
      ctx.font = '650 29px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText('NOK celkem: ' + (section.totalNok || '—'), x + 32, rowY + 34);
    }
    return y + h + 30;
  }`, 'PNG section cards');

  source = replaceRegion(source, '  function drawProblems(ctx, problems, y) {', '  function renderCanvas(model, watermark) {', `  function drawProblems(ctx, problems, y) {
    if (!problems.length) return y;
    const x = OUTER;
    const w = CANVAS_WIDTH - OUTER * 2;
    ctx.font = '500 29px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const measured = problems.map((problem) => wrapLines(ctx, problem.text || 'bez popisu', w - 96));
    const h = 82 + measured.reduce((sum, lines) => sum + 82 + Math.max(1, lines.length) * 38, 0) + 20;

    fillRounded(ctx, x, y, w, h, 28, 'rgba(255,255,255,.77)', 'rgba(36,65,78,.14)');
    ctx.fillStyle = '#1c3644';
    ctx.font = '800 38px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('PROBLÉMY / ODSTÁVKY', x + 32, y + 53);

    let cursor = y + 92;
    problems.forEach((problem, index) => {
      const duration = durationLabel(problemMinutes(problem.from, problem.to));
      const time = (problem.from || '??:??') + '–' + (problem.to || '??:??') + (duration ? '  (' + duration + ')' : '');
      fillRounded(ctx, x + 24, cursor, w - 48, 70 + Math.max(1, measured[index].length) * 38, 18, 'rgba(235,242,245,.75)', 'rgba(44,75,88,.12)');
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
  }`, 'PNG problem cards');

  source = replaceOnce(source,
    "return ({ N: 'Noc', R: 'Ráno', N8: 'Noc 8 h', R8: 'Ráno 8 h' })[String(value || '')] || String(value || '—');",
    "return ({ N: 'Noční', R: 'Ranní', N8: 'Noční 8 h', R8: 'Ranní 8 h' })[String(value || '')] || String(value || '—');",
    'Czech shift names');
  source = replaceOnce(source, "{ id: 'r07', label: 'TRBR07' }", "{ id: 'r07', label: 'TBKR07' }", 'grinder label');
  source = replaceOnce(source, "ctx.fillStyle = 'rgba(236,246,250,.34)';", "ctx.fillStyle = 'rgba(38,59,71,.51)';", 'PNG footer contrast');
  source = replaceOnce(source, "title: 'RaK – report směny', files: [file]", "title: 'RaK – Report směny diferenciály', files: [file]", 'image sharing title');
  return source;
}

// Keep the old release checks intact; override ONLY development metadata.
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
assert(sw.includes("data.type === 'SKIP_WAITING'"), 'user-confirmed updates missing');
write('sw.js', sw);

let index = read('index.html');
assert(index.includes('RAK_DEV_17001_UPDATE_PROMPT_RESET'), 'iOS update unblock missing');
index = replaceOnce(index, "var build='v1.7.01-png1';", `var build='${BUILD}';`, 'first-boot update marker');
write('index.html', index);

for (const path of ['rak-shift-report-image.js', 'rak-shift-report-share.js']) {
  const source = lightImage(read(path));
  assert(source.includes(MARKER), 'light theme not installed in ' + path);
  assert(source.includes("const WATERMARK_SRC = './assets/rak-login-crab.png';"), 'original crab missing in ' + path);
  assert(source.includes("ctx.globalAlpha = .085;"), 'watermark opacity mismatch in ' + path);
  assert(source.includes("ctx.fillText(heading, OUTER, 150);"), 'differential report title missing in ' + path);
  assert(source.includes("N: 'Noční', R: 'Ranní'"), 'shift labels missing in ' + path);
  assert(source.includes('canvas.toBlob') && source.includes('files: [file]'), 'PNG save/share missing in ' + path);
  write(path, source);
}

assert(JSON.parse(read('package.json')).version === '1.7.0', 'technical version changed');
assert(read('sw.js').includes(`const CACHE_VERSION = '${CACHE}';`), 'SW cache changed after release');
assert(read('supabase-config.js').includes(`window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY}";`), 'release label changed');
assert(read('index.html').includes(`var build='${BUILD}';`), 'update notice did not reset for new build');
for (const path of ['app.js', 'sw.js', 'supabase-config.js', 'app-pwa-connectivity.js', 'rak-shift-report-image.js', 'rak-shift-report-share.js']) {
  execFileSync(process.execPath, ['--check', path], { stdio: 'pipe' });
}
execFileSync(process.execPath, ['tools/shift-report-image-170-smoke.mjs'], { stdio: 'pipe' });
console.log('[development-version-17003] OK 1.7.03: light readable PNG, translucent original crab, report title, Ranní/Noční, PNG + WhatsApp, PWA cache refreshed');
