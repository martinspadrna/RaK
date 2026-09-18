#!/usr/bin/env node
// RaK 1.7.18: group identical absence reasons per worker in the copied vacation report.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const VERSION = '1.7.18';
const BUILD = 'v1.7.18-absencegroups1';
const MARKER = '// RAK_VACATION_GROUP_REASON_17018';
const read = path => fs.readFileSync(path, 'utf8');
const write = (path, value) => fs.writeFileSync(path, value, 'utf8');
function line(source, pattern, replacement, label) {
  assert.match(source, pattern, label + ': missing anchor');
  return source.replace(pattern, replacement);
}

let report = read('rak-vacation-report.js');
assert(report.includes('// RAK_VACATION_COMPLETE_ABSENCES_17016'), '1.7.16 Google+roster union missing');
if (!report.includes(MARKER)) {
  const start = report.indexOf('    function appendGroup(title, source, withReason) {');
  const end = report.indexOf('    if (!rows.length) lines.push(', start);
  assert(start >= 0 && end > start, 'vacation text-group boundaries missing');
  const replacement = `    ${MARKER}
    function appendGroup(title, source, withReason) {
      if (!source.length) return;
      lines.push(title);
      const byName = new Map();
      source.forEach(row => {
        const name = String(row.name || '').trim();
        if (!name) return;
        if (!byName.has(name)) byName.set(name, withReason ? new Map() : []);
        const date = [row.date, row.shift].filter(Boolean).join(' ');
        if (!withReason) {
          byName.get(name).push(date);
          return;
        }
        const reason = row.code === '?' ? (row.reason || 'důvod neuveden')
          : row.code + (reasonLabel[row.code] ? ' – ' + reasonLabel[row.code] : '');
        const reasons = byName.get(name);
        if (!reasons.has(reason)) reasons.set(reason, []);
        reasons.get(reason).push(date);
      });
      byName.forEach((group, name) => {
        if (!withReason) {
          lines.push('- ' + name + ': ' + group.join(', '));
          return;
        }
        if (group.size === 1) {
          const [reason, dates] = group.entries().next().value;
          // Preserve the familiar one-day layout, but never repeat one reason
          // after each date when the same worker is absent for several days.
          if (dates.length === 1) lines.push('- ' + name + ': ' + dates[0] + ' (' + reason + ')');
          else lines.push('- ' + name + ' (' + reason + '): ' + dates.join(', '));
          return;
        }
        // Different reasons for the same person must stay distinct, with
        // each reason printed once before all of its dates.
        lines.push('- ' + name + ':');
        group.forEach((dates, reason) => lines.push('  ' + reason + ': ' + dates.join(', ')));
      });
      lines.push('');
    }
`;
  report = report.slice(0, start) + replacement + report.slice(end);
}
assert(report.includes(MARKER), 'reason grouping not applied');
assert(report.includes("else lines.push('- ' + name + ' (' + reason + '): ' + dates.join(', '));"), 'multi-day grouping lost');
write('rak-vacation-report.js', report);

let config = read('supabase-config.js');
assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co') && !config.includes('bkqamcbkiwumsvelahxr'), 'test Supabase only');
config = line(config, /^window\.RAK_RELEASE_VERSION = "[^"]+";$/m, `window.RAK_RELEASE_VERSION = "${VERSION}";`, 'config release');
config = line(config, /^window\.RAK_TEST_DISPLAY_VERSION = "[^"]+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`, 'config display');
config = line(config, /^window\.RAK_PWA_BUILD = "[^"]+";$/m, `window.RAK_PWA_BUILD = "${BUILD}";`, 'config build');
write('supabase-config.js', config);
let app = read('app.js');
app = line(app, /^  const RAK_DEV_UPDATE_BUILD = "[^"]+";$/m, `  const RAK_DEV_UPDATE_BUILD = "${BUILD}";`, 'app build');
app = line(app, /^  window\.RAK_RELEASE_VERSION = "[^"]+";$/m, `  window.RAK_RELEASE_VERSION = "${VERSION}";`, 'app release');
write('app.js', app);
let sw = read('sw.js');
assert(sw.includes("const SW_APP_VERSION = '1.7.0';"), 'technical SW version changed');
sw = line(sw, /^const CACHE_VERSION = '[^']+';$/m, `const CACHE_VERSION = 'v${VERSION}';`, 'cache');
sw = line(sw, /^const DEVELOPMENT_TEST_DISPLAY_VERSION = '[^']+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`, 'SW display');
sw = line(sw, /^const DEVELOPMENT_BUILD_ID = '[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD}';`, 'SW build');
write('sw.js', sw);
let index = read('index.html');
const oldBuild = "var build='v1.7.17-smarttotals1';";
const newBuild = `var build='${BUILD}';`;
if (!index.includes(newBuild)) {
  assert(index.includes(oldBuild), 'previous 1.7.17 build marker missing');
  index = index.replace(oldBuild, newBuild);
}
write('index.html', index);
assert.equal(JSON.parse(read('package.json')).version, '1.7.0', 'technical package version changed');
for (const path of ['rak-vacation-report.js','supabase-config.js','app.js','sw.js'])
  execFileSync(process.execPath, ['--check', path], { stdio: 'pipe' });
execFileSync(process.execPath, ['tools/vacation-reason-group-17018-smoke.mjs'], {stdio:'inherit'});
console.log('[development-version-17018] OK grouped repeated absence reasons; one-off and vacation layout preserved; copy/share; test version 1.7.18');