#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const read = (file) => fs.readFileSync(file, 'utf8');
const shift = read('rak-shift-report.js');
const sw = read('sw.js');
const config = read('supabase-config.js');
const app = read('app.js');
const pkg = JSON.parse(read('package.json'));

for (const file of ['rak-shift-report.js', 'tools/shift-report-mo-hotfix-170.mjs', 'tools/shift-report-mo-hotfix-170-smoke.mjs']) {
  const checked = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  assert.equal(checked.status, 0, file + ' syntax check failed: ' + (checked.stderr || checked.stdout || ''));
}

assert.equal(pkg.version, '1.7.0', 'technical version must remain 1.7.0');
assert(app.includes('window.RAK_RELEASE_VERSION = "1.7";'), 'visible version must remain RaK 1.7');
assert(config.includes('window.RAK_RELEASE_VERSION = "1.7";'), 'runtime visible version must remain 1.7');
assert(config.includes('window.RAK_TEST_DISPLAY_VERSION = "1.7";'), 'runtime display version must remain 1.7');
assert(config.includes('window.RAK_PWA_BUILD = "v1.7.0-release3";'), 'same-version internal build marker must refresh to release3');
assert(sw.includes("const CACHE_VERSION = 'v1.7.0';"), 'PWA cache version must remain v1.7.0');
assert(sw.includes("const SW_APP_VERSION = '1.7.0';"), 'technical SW version must remain 1.7.0');
assert(sw.includes("const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7';"), 'SW display version must remain 1.7');
assert(sw.includes("const DEVELOPMENT_BUILD_ID = '1.7.0-release3';"), 'internal SW build marker must be release3');
assert(sw.includes("const RAK_170_SHIFT_REPORT_HOTFIX_ASSETS = ['./rak-shift-report.js?v=1.7.0'];"), 'shift report same-version cache invalidation missing');
assert(sw.includes('.concat(RAK_170_SHIFT_REPORT_HOTFIX_ASSETS)'), 'shift report cache invalidation not wired');
assert(sw.includes("const RAK_SHIFT_REPORT_MO_POLICY = 'separate-normal-free-lines;restore-free-draft';"), 'MO report policy marker missing from SW');

assert(shift.includes("const RAK_SHIFT_REPORT_MO_POLICY = 'separate-normal-free-lines;restore-free-draft';"), 'MO report policy marker missing');
assert(shift.includes("{ id: 'mo', label: 'MO', fields: ['free'], indexes: ['AF', 'AG', 'AH'], defaultIndex: 'AF', totalNok: true }"), 'MO must render free input');
assert(shift.includes("inputNumber(d.free,'rakShiftFree','volné')"), 'free draft value is not rendered back into input');
assert(shift.includes("free:row.querySelector('.rakShiftFree')?.value||''"), 'free input is not read into draft');
assert(shift.includes("draft.production&&draft.production[section.id]"), 'saved production draft restore path missing');

const reportStart = shift.indexOf('  function reportText(draft)');
const saveStart = shift.indexOf('  function saveLocal', reportStart);
assert(reportStart >= 0 && saveStart > reportStart, 'reportText boundaries missing');
const report = shift.slice(reportStart, saveStart);
assert(report.includes("if(id==='mo')"), 'MO-specific report branch missing');
assert(report.includes("if(r.qty)lines.push('  - '+r.qty+' '+r.index);"), 'normal MO pieces must be own line');
assert(report.includes("if(r.free)lines.push('  - '+r.free+' '+r.index+' volné');"), 'free MO pieces must be own line');
assert(report.includes("if(r.free)extras.push('z toho '+r.free+' volné');"), 'non-MO formatting must stay unchanged');
assert(report.indexOf("if(id==='mo')") < report.indexOf('const extras=[]'), 'MO branch must run before generic combined formatting');
assert(shift.includes("{ id: 'to', label: 'TO', fields: []"), 'TO input contract changed unexpectedly');
assert(shift.includes("{ id: 'r01', label: 'TBKR01', fields: ['nok', 'free']"), 'TBKR01 input contract changed unexpectedly');
assert(shift.includes("{ id: 'r07', label: 'TRBR07', fields: ['nok', 'free']"), 'TBKR07 input contract changed unexpectedly');

console.log('[shift-report-mo-hotfix-170-smoke] OK RaK 1.7 unchanged: MO normal/free split, restored free draft preserved, TO/Brusy behavior preserved');
