#!/usr/bin/env node
// RaK 1.7.14 – correct PNG production totals, zero suppression and stronger index colors.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const VERSION = '1.7.14';
const BUILD = 'v1.7.14-reporttotals1';
const MARKER = '// RAK_REPORT_NOK_TOTALS_ZERO_17014';
const read = file => fs.readFileSync(file, 'utf8');
const write = (file, text) => fs.writeFileSync(file, text, 'utf8');
const assert = (condition, label) => { if (!condition) throw new Error('[development-version-17014] ' + label); };
const changeLine = (source, pattern, replacement, label) => {
  assert(pattern.test(source), label);
  return source.replace(pattern, replacement);
};

function patchReport(source, file) {
  assert(source.includes('// RAK_MOBILE_REPORT_LINES_17013'), file + ': mobile portrait layout missing');
  assert(source.includes('// RAK_SHIFT_REPORT_GLASS_17009'), file + ': glass styling missing');
  if (source.includes(MARKER)) return source;
  const begin = '  function sectionLines17013(section) {';
  const end = '  function wrappedSectionLines17013(ctx,section,maxWidth) {';
  const from = source.indexOf(begin);
  const to = source.indexOf(end, from + begin.length);
  assert(from >= 0 && to > from, file + ': line formatting anchor missing');
  const replacement = `  ${MARKER}
  function positiveQuantity17014(value) {
    const amount = quantityNumber17013(value);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
  }
  function formattedQuantity17014(value) {
    return quantityText17013(positiveQuantity17014(value));
  }
  function nokSuffix17014(value) {
    const nok = positiveQuantity17014(value);
    return nok ? ' (z toho ' + quantityText17013(nok) + ' NOK)' : '';
  }
  function sectionLines17013(section) {
    const rows = section && Array.isArray(section.rows) ? section.rows : [];
    const lines = [];
    const kind = section && section.id || '';
    if (kind === 'mo') {
      const normal = rows.filter(row => positiveQuantity17014(row.qty))
        .map(row => ({ text: formattedQuantity17014(row.qty) + ' ' + (row.index || '—'), index: row.index }));
      if (normal.length) lines.push({ text: normal.map(item => item.text).join(', '), kind: 'normal', index: normal[0].index });
      rows.forEach(row => {
        if (positiveQuantity17014(row.free)) lines.push({
          text: formattedQuantity17014(row.free) + ' ' + (row.index || '—') + ' volné', kind: 'free', index: row.index
        });
      });
      const totals = new Map();
      rows.forEach(row => {
        const count = positiveQuantity17014(row.qty) + positiveQuantity17014(row.free);
        if (count) totals.set(row.index || '—', (totals.get(row.index || '—') || 0) + count);
      });
      if (totals.size) lines.push({
        text: 'Celkově ' + Array.from(totals, ([index, count]) => quantityText17013(count) + ' ' + index).join(', '),
        kind: 'total'
      });
      // The section-wide MO NOK is retained separately. Do not render zero-value index NOK entries.
      rows.forEach(row => {
        if (positiveQuantity17014(row.nok)) lines.push({
          text: (row.index || '—') + ' NOK ' + formattedQuantity17014(row.nok), kind: 'nok', index: row.index
        });
      });
    } else if (kind === 'r01' || kind === 'r07') {
      const totals = new Map();
      rows.forEach(row => {
        const regular = positiveQuantity17014(row.qty);
        const free = positiveQuantity17014(row.free);
        const nok = positiveQuantity17014(row.nok);
        const index = row.index || '—';
        if (regular) lines.push({
          text: quantityText17013(regular) + ' ' + index + ' ks' + nokSuffix17014(row.nok),
          kind: 'normal', index: row.index
        });
        if (free) lines.push({
          text: quantityText17013(free) + ' ' + index + ' volné' + (regular ? '' : nokSuffix17014(row.nok)),
          kind: 'free', index: row.index
        });
        // NOK is a subset of already produced pieces, never an extra produced quantity.
        // Preserve a positive NOK note even if no quantity was filled in, without inventing a zero-piece total.
        if (nok && !regular && !free) lines.push({
          text: index + ' NOK ' + quantityText17013(nok), kind: 'nok', index: row.index
        });
        if (regular + free) totals.set(index, (totals.get(index) || 0) + regular + free);
      });
      if (totals.size) {
        const total = Array.from(totals.values()).reduce((sum, count) => sum + count, 0);
        const parts = Array.from(totals, ([index, count]) => quantityText17013(count) + ' ' + index);
        lines.push({ text: 'Celkově ' + quantityText17013(total) + ' ks (' + parts.join(', ') + ')', kind: 'total' });
      }
    } else {
      rows.forEach(row => {
        const index = row.index || '—';
        if (positiveQuantity17014(row.qty)) lines.push({
          text: index + ' ' + formattedQuantity17014(row.qty) + ' ks', kind: 'normal', index: row.index
        });
        if (positiveQuantity17014(row.free)) lines.push({
          text: index + ' ' + formattedQuantity17014(row.free) + ' volné', kind: 'free', index: row.index
        });
        if (positiveQuantity17014(row.nok)) lines.push({
          text: 'NOK ' + formattedQuantity17014(row.nok), kind: 'nok', index: row.index
        });
      });
    }
    if (!lines.length) lines.push({ text: 'Bez záznamu', kind: 'empty' });
    return lines;
  }
`;
  source = source.slice(0, from) + replacement + source.slice(to);
  const colorChanges = [
    ["fill: 'rgba(45,156,255,.14)'", "fill: 'rgba(45,156,255,.26)'"],
    ["fill: 'rgba(139,228,88,.14)'", "fill: 'rgba(139,228,88,.27)'"],
    ["fill: 'rgba(255,179,63,.15)'", "fill: 'rgba(255,179,63,.28)'"],
    ["stroke: 'rgba(17,120,200,.68)'", "stroke: 'rgba(17,120,200,.82)'"],
    ["stroke: 'rgba(78,164,47,.66)'", "stroke: 'rgba(78,164,47,.82)'"],
    ["stroke: 'rgba(213,120,10,.68)'", "stroke: 'rgba(213,120,10,.84)'"],
    ["line.kind==='total'?'rgba(40,134,174,.18)'", "line.kind==='total'?'rgba(40,134,174,.26)'"],
    ["line.kind==='total'?'rgba(17,120,200,.36)'", "line.kind==='total'?'rgba(17,120,200,.68)'"],
    ["ctx.textAlign='left';ctx.fillStyle=line.kind==='total'?'#173d59':({AF:'#07558b',AD:'#07558b',AG:'#126343',AE:'#126343',AH:'#805117'}[line.index]||'#244554');",
     "ctx.textAlign='left';ctx.fillStyle=line.kind==='total'?'#123d5b':({AF:'#004e83',AD:'#004e83',AG:'#0b632e',AE:'#0b632e',AH:'#8b4300'}[line.index]||'#244554');"]
  ];
  for (const [before, after] of colorChanges) {
    assert(source.includes(before), file + ': color anchor missing: ' + before);
    source = source.replaceAll(before, after);
  }
  // A string '0' is truthy: guard both the reserved vertical space and the rendered MO NOK footer.
  const oldHeight = '(section.totalNok?58:0)';
  assert(source.includes(oldHeight), file + ': MO NOK height guard missing');
  source = source.replaceAll(oldHeight, '(positiveQuantity17014(section.totalNok)?58:0)');
  assert(source.includes('if(section.totalNok){'), file + ': MO NOK label guard missing');
  source = source.replace('if(section.totalNok){', 'if(positiveQuantity17014(section.totalNok)){');
  assert(source.includes('ctx.globalAlpha = .16;'), file + ': original crab watermark changed');
  return source;
}

for (const file of ['rak-shift-report-image.js', 'rak-shift-report-share.js']) {
  const source = patchReport(read(file), file);
  assert(source.includes(MARKER), file + ': report patch missing');
  write(file, source);
}
let config = read('supabase-config.js');
assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co') && !config.includes('bkqamcbkiwumsvelahxr'), 'production/test Supabase isolation');
config = changeLine(config, /^window\.RAK_RELEASE_VERSION = "[^"]+";$/m, `window.RAK_RELEASE_VERSION = "${VERSION}";`, 'config version');
config = changeLine(config, /^window\.RAK_TEST_DISPLAY_VERSION = "[^"]+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`, 'config test version');
config = changeLine(config, /^window\.RAK_PWA_BUILD = "[^"]+";$/m, `window.RAK_PWA_BUILD = "${BUILD}";`, 'config build');
write('supabase-config.js', config);
let app = read('app.js');
app = changeLine(app, /^  const RAK_DEV_UPDATE_BUILD = "[^"]+";$/m, `  const RAK_DEV_UPDATE_BUILD = "${BUILD}";`, 'app build');
app = changeLine(app, /^  window\.RAK_RELEASE_VERSION = "[^"]+";$/m, `  window.RAK_RELEASE_VERSION = "${VERSION}";`, 'app version');
write('app.js', app);
let sw = read('sw.js');
assert(sw.includes("const SW_APP_VERSION = '1.7.0';"), 'technical SW version changed');
sw = changeLine(sw, /^const CACHE_VERSION = '[^']+';$/m, `const CACHE_VERSION = 'v${VERSION}';`, 'SW cache');
sw = changeLine(sw, /^const DEVELOPMENT_TEST_DISPLAY_VERSION = '[^']+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`, 'SW version');
sw = changeLine(sw, /^const DEVELOPMENT_BUILD_ID = '[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD}';`, 'SW build');
write('sw.js', sw);
let index = read('index.html');
if (!index.includes(`var build='${BUILD}';`)) {
  assert(index.includes("var build='v1.7.13-tpkwmobile1';"), 'previous 1.7.13 index marker missing');
  index = index.replace("var build='v1.7.13-tpkwmobile1';", `var build='${BUILD}';`);
}
write('index.html', index);
assert(JSON.parse(read('package.json')).version === '1.7.0', 'technical package version changed');
for (const file of ['rak-shift-report-image.js', 'rak-shift-report-share.js', 'app.js', 'sw.js', 'supabase-config.js']) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
}
execFileSync(process.execPath, ['tools/report-totals-nok-17014-smoke.mjs'], { stdio: 'pipe' });
console.log('[development-version-17014] OK 1.7.14: zero rows suppressed; NOK attached to produced/free pieces; all totals include free without double-counting NOK; stronger index colors');