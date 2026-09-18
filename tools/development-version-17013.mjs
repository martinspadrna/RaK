#!/usr/bin/env node
// RaK 1.7.13 — final TPKW02 balance and portrait mobile report.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const VERSION = '1.7.13', BUILD = 'v1.7.13-tpkwmobile1';
const MARKER = '// RAK_TPKW02_FINAL_FAIRNESS_17013';
const IMAGE_MARKER = '// RAK_MOBILE_REPORT_LINES_17013';
const assert = (ok, label) => { if (!ok) throw Error('[17013] ' + label); };
const read = (file) => fs.readFileSync(file, 'utf8');
const write = (file, text) => fs.writeFileSync(file, text, 'utf8');
function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  assert(source.includes(before), 'missing ' + label);
  return source.replace(before, after);
}
function replaceRegion(source, begin, end, text, label) {
  const start = source.indexOf(begin), stop = source.indexOf(end, start + begin.length);
  assert(start >= 0 && stop > start, 'missing region ' + label);
  return source.slice(0, start) + text.trimEnd() + '\n\n' + source.slice(stop);
}
function patchGenerator(source) {
  assert(source.includes('// RAK_GENERATOR_PRESS_HALF_STEP_17012'), 'prior press stage missing');
  if (source.includes(MARKER)) return source;
  const anchor = 'function adminRotationGeneratorCountSoftKinds(month, names) {';
  assert(source.includes(anchor), 'generator anchor missing');
  const helper = `${MARKER}
function adminRotationGeneratorTpkw02Score17013(counts, names) {
  const values = names.map((name) => Number(counts[name] || 0));
  if (!values.length) return { spread: 0, variance: 0 };
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return { spread: Math.max(...values) - Math.min(...values), variance: values.reduce((sum, value) => sum + (value - avg) ** 2, 0) };
}
function adminRotationGeneratorBalanceTpkw02Final17013(month, model, monthKey) {
  const names = model && Array.isArray(model.knownNames) ? model.knownNames : adminGetKnownNames();
  const core = new Set(adminRotationGeneratorGetSoftCoreNames(names));
  const eligible = adminRotationGeneratorCollectWorkingNames(month, names)
    .filter((name) => names.includes(name) && !core.has(name))
    .filter((name) => adminRotationGeneratorPersonKnowsMachine(name, 'TPKW02'));
  const rows = Array.isArray(month && month.hard && month.hard.rows) ? month.hard.rows : [];
  const targetIdx = adminRotationGeneratorMachineIndex(HARD_MACHINE_HEADERS, 'TPKW02');
  if (eligible.length < 2 || targetIdx < 0) return { swaps: 0, spread: 0, eligible, disabled: true };
  let counts = adminRotationGeneratorCountHardMachine(month, 'TPKW02', eligible, monthKey);
  const year = model && model.yearHardMachineStats && model.yearHardMachineStats.TPKW02 || Object.create(null);
  let swaps = 0;
  const near = (a,b) => Math.abs(a-b) < .0001;
  for (let pass = 0; pass < rows.length * 3; pass += 1) {
    const before = adminRotationGeneratorTpkw02Score17013(counts, eligible);
    if (before.spread <= 1) break;
    let best = null;
    rows.forEach((row, rowIdx) => {
      if (!row || !adminRotationGeneratorIsWorkingRow(month, rowIdx)) return;
      if (adminRotationGeneratorIsSundayMorning17011(row.date, monthKey)) return;
      const cells = Array.isArray(row.cells) ? row.cells : [];
      const high = adminRotationCanonicalName(cells[targetIdx], names);
      if (!eligible.includes(high)) return;
      HARD_MACHINE_HEADERS.forEach((otherMachine, otherIdx) => {
        if (!/^TBKR/i.test(String(otherMachine || ''))) return;
        const low = adminRotationCanonicalName(cells[otherIdx], names);
        if (!eligible.includes(low) || low === high) return;
        if (Number(counts[high] || 0) - Number(counts[low] || 0) < 2) return;
        if (!adminRotationGeneratorPersonKnowsMachine(high, otherMachine)
          || !adminRotationGeneratorPersonKnowsMachine(low, 'TPKW02')) return;
        if (!adminRotationGeneratorCanUseHardMachine(month, rowIdx, otherMachine, high, names, monthKey)
          || !adminRotationGeneratorCanUseHardMachine(month, rowIdx, 'TPKW02', low, names, monthKey)) return;
        const projected = Object.assign(Object.create(null), counts);
        projected[high] -= 1; projected[low] += 1;
        const after = adminRotationGeneratorTpkw02Score17013(projected, eligible);
        if (!(after.spread < before.spread - .0001 || (near(after.spread,before.spread) && after.variance < before.variance - .0001))) return;
        const grinderCounts = adminRotationGeneratorCountHardMachine(month, otherMachine, eligible, monthKey);
        const grinderBefore = adminRotationGeneratorTpkw02Score17013(grinderCounts,eligible);
        grinderCounts[high] += 1; grinderCounts[low] -= 1;
        const grinderAfter = adminRotationGeneratorTpkw02Score17013(grinderCounts,eligible);
        const candidate = { cells, otherIdx, high, low, after,
          grinderGain: grinderBefore.variance - grinderAfter.variance,
          yearDelta: Number(year[low] || 0) - Number(year[high] || 0) };
        if (!best || candidate.after.spread < best.after.spread - .0001
          || (near(candidate.after.spread,best.after.spread) && candidate.after.variance < best.after.variance - .0001)
          || (near(candidate.after.spread,best.after.spread) && near(candidate.after.variance,best.after.variance) && candidate.grinderGain > best.grinderGain + .0001)
          || (near(candidate.after.spread,best.after.spread) && near(candidate.after.variance,best.after.variance)
            && near(candidate.grinderGain,best.grinderGain) && candidate.yearDelta < best.yearDelta - .0001)) best = candidate;
      });
    });
    if (!best) break;
    best.cells[targetIdx] = best.low;
    best.cells[best.otherIdx] = best.high;
    counts = adminRotationGeneratorCountHardMachine(month,'TPKW02',eligible,monthKey);
    swaps += 1;
  }
  return { swaps, spread: adminRotationGeneratorTpkw02Score17013(counts,eligible).spread, counts, eligible: eligible.slice() };
}

`;
  return source.replace(anchor, helper + anchor);
}
function patchRotation(source) {
  assert(source.includes('// RAK_GENERATOR_PRESS_HALF_STEP_CALL_17012'), 'prior press call missing');
  if (source.includes('// RAK_TPKW02_FINAL_CALL_17013')) return source;
  source = replaceOnce(source,
`  const pressHalfStepBalance = adminRotationGeneratorBalancePressHalfSteps17012(month, model, monthKey);
  const ruleCheck = adminRotationValidateMonthRules(month, monthKey, { source: 'generator' });`,
`  const pressHalfStepBalance = adminRotationGeneratorBalancePressHalfSteps17012(month, model, monthKey);
  // RAK_TPKW02_FINAL_CALL_17013
  const finalTpkw02Balance = adminRotationGeneratorBalanceTpkw02Final17013(month, model, monthKey);
  const ruleCheck = adminRotationValidateMonthRules(month, monthKey, { source: 'generator' });
  if (finalTpkw02Balance.spread > 1 && !finalTpkw02Balance.disabled) {
    ruleCheck.issues.push({ severity: 'warn', code: 'tpkw02-month-spread', message: 'TPKW02 nelze s aktuální kvalifikací bezpečně vyrovnat na rozdíl 1 směny.' });
  }`, 'final TPKW02 call');
  return replaceOnce(source,
`    pressHalfStepMonthlySpread: pressHalfStepBalance && Number(pressHalfStepBalance.spread || 0),`,
`    pressHalfStepMonthlySpread: pressHalfStepBalance && Number(pressHalfStepBalance.spread || 0),
    finalTpkw02BalanceSwaps: finalTpkw02Balance && Number(finalTpkw02Balance.swaps || 0),
    finalTpkw02MonthlySpread: finalTpkw02Balance && Number(finalTpkw02Balance.spread || 0),`, 'TPKW02 diagnostic');
}
function patchImage(source,file) {
  assert(source.includes('// RAK_SHIFT_REPORT_FREE_ONLY_GRINDER_17010'),file+' free-only layer missing');
  assert(source.includes('// RAK_SHIFT_REPORT_GLASS_17009'),file+' glass layer missing');
  if (source.includes(IMAGE_MARKER)) return source;
  for (const [before,after] of [
    ['const CANVAS_WIDTH = 1440;','const CANVAS_WIDTH = 1080;'],
    ['const MAX_CANVAS_HEIGHT = 5200;','const MAX_CANVAS_HEIGHT = 8192;'],
    ['const OUTER = 88;','const OUTER = 50;']
  ]) source = replaceOnce(source,before,after,file+' canvas size');
  source = replaceOnce(source,
    'const scale = Math.max((width * 1.12) / watermark.naturalWidth, (height * 1.03) / watermark.naturalHeight);',
    'const scale = Math.min((width * 1.15) / watermark.naturalWidth, (height * .85) / watermark.naturalHeight);',file+' watermark fit');
  source = replaceRegion(source,'  function sectionHeight(section) {','  function roundedPath(ctx, x, y, w, h, r) {',`  ${IMAGE_MARKER}
  const MOBILE_LINE_STEP = 78;
  function quantityNumber17013(value) {
    const text = String(value ?? '').trim().replace(',','.');
    return /^\\d+(?:\\.\\d+)?$/.test(text) ? Number(text) : NaN;
  }
  function quantityText17013(value) { return new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:2}).format(value); }
  function sectionLines17013(section) {
    const rows = section && Array.isArray(section.rows) ? section.rows : [];
    const lines = [], kind = section && section.id || '';
    if (kind === 'mo') {
      const normal = rows.filter(row => row.qty).map(row => row.qty + ' ' + (row.index || ''));
      if (normal.length) lines.push({text:normal.join(', '),kind:'normal'});
      rows.forEach(row => { if (row.free) lines.push({text:row.free + ' ' + (row.index || '') + ' volné',kind:'free',index:row.index}); });
      const totals = new Map();
      rows.forEach(row => { for(const value of [row.qty,row.free]) {
        const n = quantityNumber17013(value);
        if (Number.isFinite(n)) totals.set(row.index || '—',(totals.get(row.index || '—') || 0) + n);
      }});
      if (totals.size) lines.push({text:'Celkově ' + Array.from(totals,([index,count]) => quantityText17013(count)+' '+index).join(', '),kind:'total'});
    } else if (kind === 'r01' || kind === 'r07') {
      const complete = new Map();
      rows.forEach(row => {
        if (row.qty) {
          lines.push({text:(row.index || '—')+' '+row.qty+' ks',kind:'normal',index:row.index});
          const n = quantityNumber17013(row.qty);
          if (Number.isFinite(n)) complete.set(row.index || '—',(complete.get(row.index || '—') || 0)+n);
        }
        if (row.free) lines.push({text:(row.index || '—')+' '+row.free+' volné',kind:'free',index:row.index});
        if (row.nok) lines.push({text:(row.index || '—')+' NOK '+row.nok,kind:'nok',index:row.index});
      });
      if (rows.length) {
        const total = Array.from(complete.values()).reduce((sum,n)=>sum+n,0);
        const parts = Array.from(complete,([index,n])=>quantityText17013(n)+' '+index);
        lines.push({text:quantityText17013(total)+' ks'+(parts.length?' ('+parts.join(', ')+')':''),kind:'total'});
      }
    } else {
      rows.forEach(row => {
        if (row.qty) lines.push({text:(row.index || '—')+' '+row.qty+' ks',kind:'normal',index:row.index});
        if (row.free) lines.push({text:(row.index || '—')+' '+row.free+' volné',kind:'free',index:row.index});
        if (row.nok) lines.push({text:'NOK '+row.nok,kind:'nok',index:row.index});
      });
    }
    if (kind === 'mo') rows.forEach(row => { if (row.nok) lines.push({text:(row.index || '—')+' NOK '+row.nok,kind:'nok',index:row.index}); });
    if (!lines.length) lines.push({text:'Bez záznamu',kind:'empty'});
    return lines;
  }
  function wrappedSectionLines17013(ctx,section,maxWidth) {
    const lines=[];
    ctx.font = '800 44px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    sectionLines17013(section).forEach(item => wrapLines(ctx,item.text,maxWidth).forEach(text=>lines.push({...item,text})));
    return lines;
  }
  function sectionHeight17013(ctx,section) {
    const lines=wrappedSectionLines17013(ctx,section,CANVAS_WIDTH-OUTER*2-88);
    return 98+lines.length*MOBILE_LINE_STEP+(section.totalNok?58:0)+16;
  }
  function problemHeight17013(ctx,problems) {
    if(!problems.length) return 0;
    ctx.font='500 38px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    return 88+problems.reduce((sum,item)=>sum+148+wrapLines(ctx,item.text||'bez popisu',CANVAS_WIDTH-OUTER*2-110).length*50,0)+20;
  }
  function estimateHeight(model) {
    const ctx=document.createElement('canvas').getContext('2d');
    if(!ctx) throw Error('Canvas 2D není dostupný.');
    let height=396;
    model.sections.forEach(section=>{height+=sectionHeight17013(ctx,section)+22;});
    height+=problemHeight17013(ctx,model.problems||[])+(model.problems.length?24:0);
    return Math.max(MIN_CANVAS_HEIGHT,Math.min(MAX_CANVAS_HEIGHT,Math.ceil(height/16)*16));
  }`,file+' height/rows');
  source=replaceRegion(source,'  function drawHeader(ctx, model) {','  // RAK_SHIFT_REPORT_FREE_PRIMARY_17008',`  function drawHeader(ctx,model) {
    ctx.textBaseline='alphabetic'; ctx.textAlign='left'; ctx.fillStyle='#1c3543';
    ctx.font='850 74px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('REPORT SMĚNY',OUTER,127);
    ctx.font='700 35px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('DIFERENCIÁLY',OUTER,186);
    ctx.fillStyle='#315567';ctx.font='650 37px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(formatDate(model.date)+'  •  '+shiftLabel(model.shift),OUTER,248);
    ctx.fillStyle='rgba(20,119,177,.45)';ctx.fillRect(OUTER,278,CANVAS_WIDTH-OUTER*2,4);
  }`,file+' header');
  source=replaceRegion(source,'  function drawProductionRow(ctx, row, x, y, w, section) {','  function drawProblems(ctx, problems, y) {',`  function drawProductionRow(ctx,line,x,y,w) {
    const tone=TONES[line.index]||DEFAULT_TONE;
    const fill=line.kind==='total'?'rgba(40,134,174,.18)':line.kind==='empty'?'rgba(75,102,116,.045)':tone.fill;
    fillRounded(ctx,x,y,w,68,16,fill,line.kind==='total'?'rgba(17,120,200,.36)':tone.stroke);
    ctx.textAlign='left';ctx.fillStyle=line.kind==='total'?'#173d59':tone.text;
    ctx.font='850 44px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(line.text,x+23,y+49,w-46);
  }
  function drawSection(ctx,section,x,y,w) {
    const lines=wrappedSectionLines17013(ctx,section,w-88);
    const h=98+lines.length*MOBILE_LINE_STEP+(section.totalNok?58:0)+16;
    fillRounded(ctx,x,y,w,h,28,'rgba(255,255,255,.36)','rgba(36,65,78,.17)');
    ctx.textAlign='left';ctx.fillStyle='#183c50';
    ctx.font='850 46px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(section.label,x+30,y+61);
    let rowY=y+80;
    lines.forEach(line=>{drawProductionRow(ctx,line,x+20,rowY,w-40);rowY+=MOBILE_LINE_STEP;});
    if(section.totalNok){ctx.fillStyle='#365363';ctx.font='700 39px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';ctx.fillText('NOK celkem: '+section.totalNok,x+29,rowY+43);}
    return y+h+22;
  }`,file+' stacked cards');
  source=replaceRegion(source,'  function drawProblems(ctx, problems, y) {','  function renderCanvas(model, watermark) {',`  function drawProblems(ctx,problems,y) {
    if(!problems.length) return y;
    const x=OUTER,w=CANVAS_WIDTH-OUTER*2;
    ctx.font='500 38px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const measured=problems.map(item=>wrapLines(ctx,item.text||'bez popisu',w-110));
    const h=88+measured.reduce((sum,lines)=>sum+148+lines.length*50,0)+20;
    fillRounded(ctx,x,y,w,h,28,'rgba(255,255,255,.38)','rgba(36,65,78,.17)');
    ctx.fillStyle='#183c50';ctx.font='850 43px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('PROBLÉMY / ODSTÁVKY',x+30,y+56);
    let cursor=y+86;
    problems.forEach((problem,idx)=>{
      const boxH=134+measured[idx].length*50;
      fillRounded(ctx,x+22,cursor,w-44,boxH,18,'rgba(235,242,245,.44)','rgba(44,75,88,.12)');
      ctx.fillStyle='#183c50';ctx.font='800 41px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(problem.machine||'Stroj',x+46,cursor+47);
      const duration=durationLabel(problemMinutes(problem.from,problem.to));
      ctx.fillStyle='#146a90';ctx.font='650 34px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText((problem.from||'??:??')+'–'+(problem.to||'??:??')+(duration?'  ('+duration+')':''),x+46,cursor+92,w-88);
      ctx.fillStyle='#284453';ctx.font='500 38px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      measured[idx].forEach((line,i)=>ctx.fillText(line,x+46,cursor+145+i*50,w-88));
      cursor+=148+measured[idx].length*50;
    });
    return y+h+24;
  }`,file+' problem cards');
  source=replaceOnce(source,
`    let y = 306;
    for (let i = 0; i < model.sections.length; i += 2) {
      y = drawSectionPair(ctx, model.sections[i], model.sections[i + 1], y);
    }
    y = drawProblems(ctx, model.problems, y);`,
`    let y = 306;
    model.sections.forEach((section) => {
      y = drawSection(ctx, section, OUTER, y, CANVAS_WIDTH - OUTER * 2);
    });
    y = drawProblems(ctx, model.problems, y);`,file+' render loop');
  assert(source.includes(IMAGE_MARKER) && source.includes('ctx.globalAlpha = .16;'),file+' report markers');
  return source;
}
let config=read('supabase-config.js');
assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co')&&!config.includes('bkqamcbkiwumsvelahxr'),'Supabase isolation');
config=config.replace(/^window\.RAK_RELEASE_VERSION = "[^"]+";$/m,`window.RAK_RELEASE_VERSION = "${VERSION}";`)
 .replace(/^window\.RAK_TEST_DISPLAY_VERSION = "[^"]+";$/m,`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`)
 .replace(/^window\.RAK_PWA_BUILD = "[^"]+";$/m,`window.RAK_PWA_BUILD = "${BUILD}";`);
write('supabase-config.js',config);
let app=read('app.js');
app=app.replace(/^  const RAK_DEV_UPDATE_BUILD = "[^"]+";$/m,`  const RAK_DEV_UPDATE_BUILD = "${BUILD}";`)
 .replace(/^  window\.RAK_RELEASE_VERSION = "[^"]+";$/m,`  window.RAK_RELEASE_VERSION = "${VERSION}";`);
write('app.js',app);
let sw=read('sw.js');
sw=sw.replace(/^const CACHE_VERSION = '[^']+';$/m,`const CACHE_VERSION = 'v${VERSION}';`)
 .replace(/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '[^']+';$/m,`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`)
 .replace(/^const DEVELOPMENT_BUILD_ID = '[^']+';$/m,`const DEVELOPMENT_BUILD_ID = '${BUILD}';`);
assert(sw.includes("const SW_APP_VERSION = '1.7.0';"),'technical version changed');
write('sw.js',sw);
let index=read('index.html');
index=replaceOnce(index,"var build='v1.7.12-presshalf1';",`var build='${BUILD}';`,'index version');
write('index.html',index);
write('admin-rotation-generator.js',patchGenerator(read('admin-rotation-generator.js')));
write('admin-rotation.js',patchRotation(read('admin-rotation.js')));
for (const file of ['rak-shift-report-image.js','rak-shift-report-share.js']) write(file,patchImage(read(file),file));
assert(JSON.parse(read('package.json')).version==='1.7.0','package version changed');
for (const file of ['admin-rotation-generator.js','admin-rotation.js','rak-shift-report-image.js','rak-shift-report-share.js','app.js','sw.js','supabase-config.js']) execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
execFileSync(process.execPath,['tools/tpkw02-mobile-report-17013-smoke.mjs'],{stdio:'pipe'});
console.log('[development-version-17013] OK 1.7.13: qualified TPKW02 fairness + mobile portrait shift report, MO/free/totals and per-index grinder completed pieces');