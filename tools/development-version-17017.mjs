#!/usr/bin/env node
// RaK 1.7.17: suppress a summary that merely repeats a single production line.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const VERSION = '1.7.17';
const BUILD = 'v1.7.17-smarttotals1';
const MARKER = '// RAK_REPORT_SMART_TOTALS_17017';
const read = path => fs.readFileSync(path, 'utf8');
const write = (path, source) => fs.writeFileSync(path, source, 'utf8');
function replaceLine(source, pattern, replacement, label) {
  assert.match(source, pattern, label + ' anchor missing');
  return source.replace(pattern, replacement);
}
function patchImage(source, file) {
  assert(source.includes('// RAK_REPORT_INDEX_GRID_TEXT_17015'), file + ': index grid missing');
  assert(source.includes('// RAK_REPORT_NOK_TOTALS_ZERO_17014'), file + ': NOK/free arithmetic missing');
  if (source.includes(MARKER)) return source;
  const from = source.indexOf('  function sectionLines17013(section) {');
  const to = source.indexOf('  function wrappedSectionLines17013(ctx,section,maxWidth) {', from);
  assert(from >= 0 && to > from, file + ': section function bounds missing');
  let body = source.slice(from, to);
  const anchor = "    const kind = section && section.id || '';";
  assert(body.includes(anchor), file + ': section kind missing');
  body = body.replace(anchor, `${anchor}\n    ${MARKER}\n    const productionLineCount17017 = rows.reduce((sum, row) =>\n      sum + (positiveQuantity17014(row.qty) > 0 ? 1 : 0)\n          + (positiveQuantity17014(row.free) > 0 ? 1 : 0), 0);`);
  const condition = '      if (totals.size) {';
  assert(body.split(condition).length - 1 === 2, file + ': expected two totals in MO/TO and grinders');
  body = body.replaceAll(condition, '      if (totals.size && productionLineCount17017 > 1) {');
  assert(body.split('productionLineCount17017 > 1').length - 1 === 2, file + ': condition missing');
  return source.slice(0, from) + body + source.slice(to);
}
function patchText(source) {
  assert(source.includes('// RAK_SHIFT_TEXT_INDEX_TOTALS_17015'), 'text shared index formatter missing');
  if (source.includes(MARKER)) return source;
  const from = source.indexOf('  function reportText(draft) {');
  const to = source.indexOf('  function saveLocal', from);
  assert(from >= 0 && to > from, 'text report bounds missing');
  let body = source.slice(from, to);
  const anchor = '      const produced = [];';
  assert(body.includes(anchor), 'text produced lines missing');
  body = body.replace(anchor, `${anchor}\n      ${MARKER}\n      const productionLineCount17017 = rows.reduce((sum, row) =>\n        sum + (count(row.qty) > 0 ? 1 : 0) + (count(row.free) > 0 ? 1 : 0), 0);`);
  const condition = '      if (totals.size) {';
  assert(body.split(condition).length - 1 === 1, 'expected exactly one text total condition');
  body = body.replace(condition, '      if (totals.size && productionLineCount17017 > 1) {');
  return source.slice(0, from) + body + source.slice(to);
}
for (const path of ['rak-shift-report-image.js','rak-shift-report-share.js']) write(path, patchImage(read(path), path));
write('rak-shift-report.js', patchText(read('rak-shift-report.js')));
let config = read('supabase-config.js');
assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co') && !config.includes('bkqamcbkiwumsvelahxr'), 'development database isolation');
config = replaceLine(config, /^window\.RAK_RELEASE_VERSION = "[^"]+";$/m, `window.RAK_RELEASE_VERSION = "${VERSION}";`, 'config release');
config = replaceLine(config, /^window\.RAK_TEST_DISPLAY_VERSION = "[^"]+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`, 'config display');
config = replaceLine(config, /^window\.RAK_PWA_BUILD = "[^"]+";$/m, `window.RAK_PWA_BUILD = "${BUILD}";`, 'config build');
write('supabase-config.js', config);
let app = read('app.js');
app = replaceLine(app, /^  const RAK_DEV_UPDATE_BUILD = "[^"]+";$/m, `  const RAK_DEV_UPDATE_BUILD = "${BUILD}";`, 'app build');
app = replaceLine(app, /^  window\.RAK_RELEASE_VERSION = "[^"]+";$/m, `  window.RAK_RELEASE_VERSION = "${VERSION}";`, 'app release');
write('app.js', app);
let sw = read('sw.js');
assert(sw.includes("const SW_APP_VERSION = '1.7.0';"), 'technical SW version changed');
sw = replaceLine(sw, /^const CACHE_VERSION = '[^']+';$/m, `const CACHE_VERSION = 'v${VERSION}';`, 'SW cache');
sw = replaceLine(sw, /^const DEVELOPMENT_TEST_DISPLAY_VERSION = '[^']+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`, 'SW version');
sw = replaceLine(sw, /^const DEVELOPMENT_BUILD_ID = '[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD}';`, 'SW build');
write('sw.js', sw);
let index = read('index.html');
const oldBuild = "var build='v1.7.16-absenceunion1';";
const newBuild = `var build='${BUILD}';`;
if (!index.includes(newBuild)) {
  assert(index.includes(oldBuild), 'previous 1.7.16 build marker missing');
  index = index.replace(oldBuild, newBuild);
}
write('index.html', index);
assert.equal(JSON.parse(read('package.json')).version, '1.7.0', 'technical package version changed');
for (const file of ['rak-shift-report-image.js','rak-shift-report-share.js','rak-shift-report.js','app.js','sw.js','supabase-config.js']) {
  execFileSync(process.execPath, ['--check', file], {stdio:'pipe'});
}
execFileSync(process.execPath, ['tools/report-smart-totals-17017-smoke.mjs'], {stdio:'inherit'});
console.log('[development-version-17017] OK smart totals: one production row no redundant total; normal+free/two indices totals retained in both PNGs and copied text');
