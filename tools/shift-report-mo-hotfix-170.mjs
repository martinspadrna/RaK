#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, value) => fs.writeFileSync(path.join(root, file), value, 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error('[shift-report-mo-hotfix-170] ' + message); };
const POLICY = "const RAK_SHIFT_REPORT_MO_POLICY = 'separate-normal-free-lines;restore-free-draft';";
const CACHE_ASSETS = "const RAK_170_SHIFT_REPORT_HOTFIX_ASSETS = ['./rak-shift-report.js?v=1.7.0'];";
const BUILD_ID = '1.7.0-release3';

let shift = read('rak-shift-report.js');

if (!shift.includes(POLICY)) {
  const separator = "  const REPORT_SEPARATOR = '__________';";
  assert(shift.includes(separator), 'report separator anchor missing');
  shift = shift.replace(separator, separator + '\n  ' + POLICY);
}

const moOld = "{ id: 'mo', label: 'MO', fields: [], indexes: ['AF', 'AG', 'AH'], defaultIndex: 'AF', totalNok: true }";
const moNew = "{ id: 'mo', label: 'MO', fields: ['free'], indexes: ['AF', 'AG', 'AH'], defaultIndex: 'AF', totalNok: true }";
if (shift.includes(moOld)) shift = shift.replace(moOld, moNew);
assert(shift.includes(moNew), 'MO free field definition missing');

const reportStart = shift.indexOf('  function reportText(draft)');
const saveStart = shift.indexOf('  function saveLocal', reportStart);
assert(reportStart >= 0 && saveStart > reportStart, 'reportText/saveLocal anchors missing');

const reportFunction = `  function reportText(draft){
    const date=draft.date?new Date(draft.date+'T12:00:00').toLocaleDateString('cs-CZ'):new Date().toLocaleDateString('cs-CZ');
    const lines=['RaK – REPORT SMĚNY',date+(draft.shift?' · '+draft.shift:''),''];
    const labels={mo:'MO',to:'TO',r01:'TBKR01',r07:'TRBR07'};
    Object.keys(labels).forEach((id)=>{
      if(id==='r01')lines.push('');
      lines.push(labels[id]+':');
      const rows=draft.production[id]||[];
      rows.forEach((r)=>{
        if(id==='mo'){
          if(r.qty)lines.push('  - '+r.qty+' '+r.index);
          if(r.free)lines.push('  - '+r.free+' '+r.index+' volné');
          return;
        }
        const extras=[];
        if(r.nok)extras.push(r.nok+' NOK');
        if(r.free)extras.push('z toho '+r.free+' volné');
        lines.push('  - '+r.qty+' '+r.index+(extras.length?' ('+extras.join(', ')+')':''));
      });
      if(!rows.length)lines.push('  -');
      if(id==='mo'&&draft.moNok)lines.push('  NoK celkem: '+draft.moNok);
      if(id!=='r01')lines.push('');
    });
    if(draft.problems.length){
      const order=['TNKS01','TPKW01','TPKW02','TBKR01','TBKR07','MSKC01','MSKC02','MSKC03','MSKC04','MFKF06','MFKF10'];
      lines.push('');
      lines.push('PROBLÉMY:');
      draft.problems.slice().sort((a,b)=>{const ai=order.indexOf(a.machine);const bi=order.indexOf(b.machine);return (ai<0?order.length:ai)-(bi<0?order.length:bi);}).forEach((p)=>{
        const duration=formatProblemDuration(problemDuration(p.from,p.to));
        lines.push('  '+p.machine+' – '+(p.from||'??:??')+'–'+(p.to||'??:??')+(duration?' ('+duration+')':'')+', '+(p.text||'bez popisu'));
      });
    }
    return sortReportRowsByIndexColor(formatShiftReportText(lines.join('\\n').trim()));
  }
`;
shift = shift.slice(0, reportStart) + reportFunction + shift.slice(saveStart);

assert(shift.includes("if(id==='mo')"), 'MO-only output branch missing');
assert(shift.includes("if(r.qty)lines.push('  - '+r.qty+' '+r.index);"), 'MO normal pieces line missing');
assert(shift.includes("if(r.free)lines.push('  - '+r.free+' '+r.index+' volné');"), 'MO free pieces line missing');
assert(shift.includes("if(r.free)extras.push('z toho '+r.free+' volné');"), 'non-MO free formatting changed unexpectedly');
assert(shift.includes("fields: ['free']"), 'MO free input/restore support missing');
write('rak-shift-report.js', shift);

let sw = read('sw.js');
sw = sw.replace(/^const DEVELOPMENT_BUILD_ID = '[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD_ID}';`);
if (!sw.includes('const RAK_170_SHIFT_REPORT_HOTFIX_ASSETS =')) {
  const anchor = /^const RAK_170_STARTUP_AUTH_HOTFIX_ASSETS = .*$/m;
  assert(anchor.test(sw), '1.7 startup hotfix asset anchor missing');
  sw = sw.replace(anchor, (line) => line + '\n' + CACHE_ASSETS + '\n' + POLICY);
} else {
  sw = sw.replace(/^const RAK_170_SHIFT_REPORT_HOTFIX_ASSETS = .*$/m, CACHE_ASSETS);
  if (!sw.includes(POLICY)) sw = sw.replace(CACHE_ASSETS, CACHE_ASSETS + '\n' + POLICY);
}
sw = sw.replace(/const hotfixAssets = ([^;]+);/, (match, expr) => {
  if (expr.includes('RAK_170_SHIFT_REPORT_HOTFIX_ASSETS')) return match;
  return `const hotfixAssets = ${expr}.concat(RAK_170_SHIFT_REPORT_HOTFIX_ASSETS);`;
});
assert(sw.includes("'./rak-shift-report.js?v=1.7.0'"), 'same-version shift report cache invalidation missing');
assert(sw.includes('RAK_170_SHIFT_REPORT_HOTFIX_ASSETS'), 'shift report hotfix assets not wired');
write('sw.js', sw);

let config = read('supabase-config.js');
config = config.replace(/^window\.RAK_PWA_BUILD = "[^"]+";$/m, `window.RAK_PWA_BUILD = "v${BUILD_ID}";`);
assert(config.includes('window.RAK_RELEASE_VERSION = "1.7";'), 'visible release must remain 1.7');
assert(config.includes('window.RAK_TEST_DISPLAY_VERSION = "1.7";'), 'display version must remain 1.7');
write('supabase-config.js', config);

console.log('[shift-report-mo-hotfix-170] OK RaK 1.7: MO normal/free on separate report lines + restored free draft preserved; visible version unchanged');
