#!/usr/bin/env node
// RaK 1.7.15 – index-separated MO/TO columns and identical PNG/text arithmetic.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const VERSION = '1.7.15';
const BUILD = 'v1.7.15-indexgrid1';
const MARKER = '// RAK_REPORT_INDEX_GRID_TEXT_17015';
const read = file => fs.readFileSync(file, 'utf8');
const write = (file, text) => fs.writeFileSync(file, text, 'utf8');
const assert = (condition, label) => { if (!condition) throw Error('[17015] ' + label); };
function replaceRegion(source, start, end, replacement, label) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert(from >= 0 && to > from, label + ' boundary missing');
  return source.slice(0, from) + replacement.trimEnd() + '\n' + source.slice(to);
}
function changeLine(source, pattern, replacement, label) {
  assert(pattern.test(source), label + ' missing');
  return source.replace(pattern, replacement);
}

function patchImage(source, file) {
  assert(source.includes('// RAK_REPORT_NOK_TOTALS_ZERO_17014'), file + ' 1.7.14 baseline missing');
  assert(source.includes('// RAK_MOBILE_REPORT_LINES_17013'), file + ' portrait baseline missing');
  if (source.includes(MARKER)) return source;
  const lines = `  ${MARKER}
  function sectionLines17013(section) {
    const rows = section && Array.isArray(section.rows) ? section.rows : [];
    const lines = [];
    const kind = section && section.id || '';
    if (kind === 'mo' || kind === 'to') {
      const totals = new Map();
      rows.forEach(row => {
        const index = row.index || '—';
        const regular = positiveQuantity17014(row.qty);
        const free = positiveQuantity17014(row.free);
        const nok = positiveQuantity17014(row.nok);
        if (regular) lines.push({
          text: kind === 'mo' ? quantityText17013(regular) + ' ' + index : index + ' ' + quantityText17013(regular) + ' ks',
          kind: 'normal', index
        });
        if (free) lines.push({text: quantityText17013(free) + ' ' + index + ' volné', kind: 'free', index});
        if (nok) lines.push({text: index + ' NOK ' + quantityText17013(nok), kind: 'nok', index});
        if (regular + free) totals.set(index, (totals.get(index) || 0) + regular + free);
      });
      if (totals.size) {
        const all = Array.from(totals.values()).reduce((sum, count) => sum + count, 0);
        lines.push({
          text: kind === 'mo'
            ? 'Celkově ' + Array.from(totals, ([index, count]) => quantityText17013(count) + ' ' + index).join(', ') + ' (' + quantityText17013(all) + ' ks)'
            : 'Celkově ' + quantityText17013(all) + ' ks',
          kind: 'total'
        });
      }
    } else if (kind === 'r01' || kind === 'r07') {
      const totals = new Map();
      rows.forEach(row => {
        const regular = positiveQuantity17014(row.qty);
        const free = positiveQuantity17014(row.free);
        const nok = positiveQuantity17014(row.nok);
        const index = row.index || '—';
        if (regular) lines.push({
          text: quantityText17013(regular) + ' ' + index + ' ks' + nokSuffix17014(row.nok),
          kind: 'normal', index
        });
        if (free) lines.push({
          text: quantityText17013(free) + ' ' + index + ' volné' + (regular ? '' : nokSuffix17014(row.nok)),
          kind: 'free', index
        });
        if (nok && !regular && !free) lines.push({
          text: index + ' NOK ' + quantityText17013(nok), kind: 'nok', index
        });
        // NOK is already included in regular/free output, not an extra produced piece.
        if (regular + free) totals.set(index, (totals.get(index) || 0) + regular + free);
      });
      if (totals.size) {
        const total = Array.from(totals.values()).reduce((sum, count) => sum + count, 0);
        lines.push({
          text: 'Celkově ' + quantityText17013(total) + ' ks (' + Array.from(totals, ([index, count]) => quantityText17013(count) + ' ' + index).join(', ') + ')',
          kind: 'total'
        });
      }
    } else {
      rows.forEach(row => {
        const index = row.index || '—';
        if (positiveQuantity17014(row.qty)) lines.push({text:index+' '+formattedQuantity17014(row.qty)+' ks',kind:'normal',index});
        if (positiveQuantity17014(row.free)) lines.push({text:index+' '+formattedQuantity17014(row.free)+' volné',kind:'free',index});
        if (positiveQuantity17014(row.nok)) lines.push({text:'NOK '+formattedQuantity17014(row.nok),kind:'nok',index});
      });
    }
    if (!lines.length) lines.push({ text: 'Bez záznamu', kind: 'empty' });
    return lines;
  }
`;
  source = replaceRegion(source, '  function sectionLines17013(section) {', '  function wrappedSectionLines17013(ctx,section,maxWidth) {', lines, file + ' section lines');
  const layout = `  function sectionLayout17015(ctx, section, width) {
    const all = sectionLines17013(section);
    const footer = all.filter(line => line.kind === 'total');
    const content = all.filter(line => line.kind !== 'total');
    const isProduction = section.id === 'mo' || section.id === 'to';
    const names = Array.from(new Set(content.filter(line => line.kind !== 'empty').map(line => line.index)));
    const twoColumns = isProduction && names.length > 1;
    const gap = 16;
    const cellWidth = twoColumns ? (width - 40 - gap) / 2 : width - 40;
    const fullWidth = width - 40;
    ctx.font = '850 44px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const wrapped = (list, w) => list.flatMap(line => wrapLines(ctx, line.text, w - 46).map(text => ({...line, text})));
    const groups = [];
    let contentSteps = 0;
    if (twoColumns) {
      const byIndex = new Map();
      content.forEach(line => {
        if (!byIndex.has(line.index)) byIndex.set(line.index, []);
        byIndex.get(line.index).push(line);
      });
      const indexed = Array.from(byIndex.values());
      for (let i = 0; i < indexed.length; i += 2) {
        const left = wrapped(indexed[i], cellWidth);
        const right = indexed[i + 1] ? wrapped(indexed[i + 1], cellWidth) : [];
        const steps = Math.max(left.length, right.length);
        groups.push({left, right, steps});
        contentSteps += steps;
      }
    } else {
      const full = wrapped(content, cellWidth);
      groups.push({left:full,right:[],steps:full.length});
      contentSteps = full.length;
    }
    const totals = wrapped(footer, fullWidth);
    const height = 98 + (contentSteps + totals.length) * MOBILE_LINE_STEP
      + (positiveQuantity17014(section.totalNok) ? 58 : 0) + 16;
    return { twoColumns, cellWidth, gap, groups, totals, height };
  }
  function sectionHeight17013(ctx,section) {
    return sectionLayout17015(ctx, section, CANVAS_WIDTH - OUTER * 2).height;
  }
`;
  source = replaceRegion(source, '  function sectionHeight17013(ctx,section) {', '  function problemHeight17013(ctx,problems) {', layout, file + ' grid height');
  const draw = `  function drawSection(ctx,section,x,y,w) {
    const layout = sectionLayout17015(ctx,section,w);
    fillRounded(ctx,x,y,w,layout.height,28,'rgba(255,255,255,.36)','rgba(36,65,78,.17)');
    ctx.textAlign='left';ctx.fillStyle='#183c50';
    ctx.font='850 46px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(section.label,x+30,y+61);
    let rowY = y + 80;
    layout.groups.forEach(group => {
      group.left.forEach((line,i) => drawProductionRow(ctx,line,x+20,rowY+i*MOBILE_LINE_STEP,layout.cellWidth));
      if (layout.twoColumns) group.right.forEach((line,i) => {
        drawProductionRow(ctx,line,x+20+layout.cellWidth+layout.gap,rowY+i*MOBILE_LINE_STEP,layout.cellWidth);
      });
      rowY += group.steps*MOBILE_LINE_STEP;
    });
    // Index-specific columns end here: both MO and TO totals always occupy the full width.
    layout.totals.forEach(line => {
      drawProductionRow(ctx,line,x+20,rowY,w-40);
      rowY += MOBILE_LINE_STEP;
    });
    if (positiveQuantity17014(section.totalNok)) {
      ctx.fillStyle='#365363';
      ctx.font='700 39px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText('NOK celkem: '+section.totalNok,x+29,rowY+43);
    }
    return y+layout.height+22;
  }
`;
  source = replaceRegion(source, '  function drawSection(ctx,section,x,y,w) {', '  function drawProblems(ctx,problems,y) {', draw, file + ' grid drawing');
  assert(source.includes(MARKER) && source.includes('const CANVAS_WIDTH = 1080;') && source.includes('ctx.globalAlpha = .16;'), file + ' mobile/watermark invariant');
  return source;
}

const textFormatter = String.raw`  // RAK_SHIFT_TEXT_INDEX_TOTALS_17015
  function reportText(draft) {
    const date = draft.date ? new Date(draft.date + 'T12:00:00').toLocaleDateString('cs-CZ') : new Date().toLocaleDateString('cs-CZ');
    const lines = ['RaK – REPORT SMĚNY', date + (draft.shift ? ' · ' + draft.shift : ''), ''];
    const labels = {mo:'MO',to:'TO',r01:'TBKR01',r07:'TBKR07'};
    const count = value => { const n=Number(String(value ?? '').trim().replace(',','.')); return Number.isFinite(n) && n>0 ? n : 0; };
    const fmt = value => new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:2}).format(value);
    const suffix = value => count(value) ? ' (z toho ' + fmt(count(value)) + ' NOK)' : '';
    for (const id of Object.keys(labels)) {
      if (id === 'r01') lines.push('');
      lines.push(labels[id] + ':');
      const rows = Array.isArray(draft.production && draft.production[id]) ? draft.production[id] : [];
      const totals = new Map();
      const produced = [];
      rows.forEach(row => {
        const index = row.index || '—', qty = count(row.qty), free = count(row.free), nok = count(row.nok);
        if (id === 'mo' || id === 'to') {
          if (qty) produced.push({index,text:id==='mo'?fmt(qty)+' '+index:index+' '+fmt(qty)+' ks'});
          if (free) produced.push({index,text:fmt(free)+' '+index+' volné'});
          if (nok) produced.push({index,text:index+' NOK '+fmt(nok)});
        } else {
          if (qty) produced.push({index,text:fmt(qty)+' '+index+' ks'+suffix(row.nok)});
          if (free) produced.push({index,text:fmt(free)+' '+index+' volné'+(qty?'':suffix(row.nok))});
          if (nok && !qty && !free) produced.push({index,text:index+' NOK '+fmt(nok)});
        }
        if (qty+free) totals.set(index,(totals.get(index)||0)+qty+free);
      });
      // Keep all lines of the same index together, matching the grouped PNG columns.
      if (id === 'mo' || id === 'to') {
        const names = Array.from(new Set(produced.map(item=>item.index)));
        names.forEach(index=>produced.filter(item=>item.index===index).forEach(item=>lines.push('  - '+item.text)));
      } else produced.forEach(item=>lines.push('  - '+item.text));
      if (!produced.length) lines.push('  - Bez záznamu');
      if (totals.size) {
        const total = Array.from(totals.values()).reduce((sum,n)=>sum+n,0);
        const indexed = Array.from(totals,([index,n])=>fmt(n)+' '+index).join(', ');
        const summary = id==='mo' ? 'Celkově '+indexed+' ('+fmt(total)+' ks)'
          : id==='to' ? 'Celkově '+fmt(total)+' ks'
          : 'Celkově '+fmt(total)+' ks ('+indexed+')';
        lines.push('  '+summary);
      }
      if (id==='mo' && count(draft.moNok)) lines.push('  NOK celkem: '+fmt(count(draft.moNok)));
      lines.push('');
    }
    if (draft.problems && draft.problems.length) {
      const order=['TNKS01','TPKW01','TPKW02','TBKR01','TBKR07','MSKC01','MSKC02','MSKC03','MSKC04','MFKF06','MFKF10'];
      lines.push('PROBLÉMY:');
      draft.problems.slice().sort((a,b)=>{
        const ai=order.indexOf(a.machine),bi=order.indexOf(b.machine);
        return (ai<0?order.length:ai)-(bi<0?order.length:bi);
      }).forEach(p=>{
        const duration=formatProblemDuration(problemDuration(p.from,p.to));
        lines.push('  '+(p.machine||'Stroj')+' – '+(p.from||'??:??')+'–'+(p.to||'??:??')+(duration?' ('+duration+')':'')+', '+(p.text||'bez popisu'));
      });
    }
    return lines.join('\n').replace(/\n{3,}/g,'\n\n').trim();
  }
`;
function patchText(source) {
  assert(source.includes("fields: ['free']"), 'MO free input missing');
  if (source.includes('// RAK_SHIFT_TEXT_INDEX_TOTALS_17015')) return source;
  return replaceRegion(source,'  function reportText(draft)','  function saveLocal',textFormatter,'shift text format');
}

for (const file of ['rak-shift-report-image.js','rak-shift-report-share.js']) {
  write(file, patchImage(read(file), file));
}
write('rak-shift-report.js',patchText(read('rak-shift-report.js')));
let config=read('supabase-config.js');
assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co') && !config.includes('bkqamcbkiwumsvelahxr'),'test Supabase isolation');
config=changeLine(config,/^window\.RAK_RELEASE_VERSION = "[^"]+";$/m,`window.RAK_RELEASE_VERSION = "${VERSION}";`,'config version');
config=changeLine(config,/^window\.RAK_TEST_DISPLAY_VERSION = "[^"]+";$/m,`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`,'test version');
config=changeLine(config,/^window\.RAK_PWA_BUILD = "[^"]+";$/m,`window.RAK_PWA_BUILD = "${BUILD}";`,'config build');
write('supabase-config.js',config);
let app=read('app.js');
app=changeLine(app,/^  const RAK_DEV_UPDATE_BUILD = "[^"]+";$/m,`  const RAK_DEV_UPDATE_BUILD = "${BUILD}";`,'app build');
app=changeLine(app,/^  window\.RAK_RELEASE_VERSION = "[^"]+";$/m,`  window.RAK_RELEASE_VERSION = "${VERSION}";`,'app version');
write('app.js',app);
let sw=read('sw.js');
assert(sw.includes("const SW_APP_VERSION = '1.7.0';"),'technical SW version changed');
sw=changeLine(sw,/^const CACHE_VERSION = '[^']+';$/m,`const CACHE_VERSION = 'v${VERSION}';`,'SW cache');
sw=changeLine(sw,/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '[^']+';$/m,`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`,'SW version');
sw=changeLine(sw,/^const DEVELOPMENT_BUILD_ID = '[^']+';$/m,`const DEVELOPMENT_BUILD_ID = '${BUILD}';`,'SW build');
write('sw.js',sw);
let index=read('index.html');
if (!index.includes(`var build='${BUILD}';`)) {
  assert(index.includes("var build='v1.7.14-reporttotals1';"),'previous index build missing');
  index=index.replace("var build='v1.7.14-reporttotals1';",`var build='${BUILD}';`);
}
write('index.html',index);
assert(JSON.parse(read('package.json')).version==='1.7.0','technical package version changed');
for(const file of ['rak-shift-report-image.js','rak-shift-report-share.js','rak-shift-report.js','app.js','sw.js','supabase-config.js'])
  execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
execFileSync(process.execPath,['tools/report-index-grid-17015-smoke.mjs'],{stdio:'pipe'});
console.log('[development-version-17015] OK 1.7.15: two colored MO/TO index columns, full-width totals, MO grand total, TO grand total and matching clipboard formatting');