#!/usr/bin/env node
// RaK 1.7.25: first-name-only Czech greetings. No employee list, surname, OS, or contact data.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

const VERSION = '1.7.25';
const BUILD = 'v1.7.25-greetings1';
const MARK = '// RAK_FIRSTNAME_GREETING_17025';
const read = name => fs.readFileSync(name, 'utf8');
const write = (name, value) => fs.writeFileSync(name, value, 'utf8');
function swap(source, before, after, label) {
  assert(source.includes(before), '[17025] missing anchor: ' + label);
  return source.replace(before, after);
}
function update(name, transform) {
  const old = read(name);
  const next = transform(old);
  if (next !== old) write(name, next);
  return next;
}

// Only given names extracted from the supplied workbook. No personal records are imported.
// Existing greetings (Honzo, Láďo, Máro, Martine, Míro, ...) retain precedence.
const greetings = Object.freeze({
  'aleš': 'Aleši',
  'daniel': 'Dane',
  'david': 'Davide',
  'dominik': 'Dominiku',
  'filip': 'Filipe',
  'jakub': 'Kubo',
  'jan': 'Honzo',
  'jaromír': 'Jaromíre',
  'jaroslav': 'Jardo',
  'jindřich': 'Jindro',
  'jiří': 'Jirko',
  'josef': 'Pepo',
  'karel': 'Karle',
  'ladislav': 'Láďo',
  'libor': 'Libore',
  'lukáš': 'Lukáši',
  'marek': 'Máro',
  'martin': 'Martine',
  'matěj': 'Matěji',
  'michal': 'Michale',
  'milan': 'Milane',
  'miroslav': 'Míro',
  'oldřich': 'Oldo',
  'pavel': 'Pavle',
  'petr': 'Petře',
  'radek': 'Radku',
  'radim': 'Radime',
  'rafal': 'Rafale',
  'richard': 'Richarde',
  'robert': 'Roberte',
  'roman': 'Romane',
  'stanislav': 'Stando',
  'tomáš': 'Tomáši',
  'vladimír': 'Vláďo',
  'vojtěch': 'Vojto',
  'václav': 'Vašku',
  'vítězslav': 'Víťo',
  'zdeněk': 'Zdeňku'
});
assert.equal(Object.keys(greetings).length, 38, '38 distinct given names, no employee records');

const dashboard = update('dashboard.js', source => {
  if (source.includes(MARK)) return source;
  const anchor = 'const DASHBOARD_FRIENDLY_NAME_OVERRIDES = Object.freeze({';
  const start = source.indexOf(anchor);
  const end = source.indexOf('\n});', start);
  assert(start >= 0 && end > start, '[17025] greeting dictionary boundaries');
  const existing = source.slice(start + anchor.length, end);
  const existingKeys = new Set([...existing.matchAll(/^\s*([\p{L}]+)\s*:/gmu)].map(hit => hit[1]));
  const additions = Object.entries(greetings)
    .filter(([name]) => !existingKeys.has(name))
    .map(([name, vocative]) => `  ${name}: '${vocative}',`)
    .join('\n');
  assert(additions.includes("jakub: 'Kubo'"), '[17025] missing Jakub greeting');
  return source.replace(anchor, MARK + '\n' + anchor + '\n' + additions);
});

// Exercise the actual production greeting function with both name orders.
const start = dashboard.indexOf(MARK);
const end = dashboard.indexOf('\nfunction getDashboardScheduleName(', start);
assert(start >= 0 && end > start, '[17025] deployed greeting function bounds');
const ctx = {};
vm.runInNewContext(dashboard.slice(start, end) + '\nthis.greet = getDashboardFriendlyName;', ctx);
for (const [name, vocative] of Object.entries(greetings)) {
  const given = name[0].toLocaleUpperCase('cs-CZ') + name.slice(1);
  assert.equal(ctx.greet(given + ' Novák'), vocative, 'given-name-first: ' + name);
  assert.equal(ctx.greet('Novák ' + given), vocative, 'surname-first: ' + name);
  assert.equal(ctx.greet(given.toLocaleUpperCase('cs-CZ') + ' Novák'), vocative, 'uppercase: ' + name);
}
assert.equal(ctx.greet(''), '', 'empty account name is safe');
assert.equal(ctx.greet('Novák Alex'), 'Alex', 'unknown given name preserves existing safe fallback');
assert.equal(ctx.greet('Novák Martin'), 'Martine', 'existing Martin greeting preserved');
assert.equal(ctx.greet('Novák Jan'), 'Honzo', 'existing Jan greeting preserved');

// 1.7.24 patches the build driver in pass one; recognize 1.7.25 before pass two.
const driver = update('tools/shift-report-mo-hotfix-170-smoke.mjs', source => {
  if (source.includes('// RAK_17025_TWO_PASS_GUARD')) return source;
  source = swap(source,
    'const already17024=indexSource.includes("var build=\'v1.7.24-crossshift1\';");',
    '// RAK_17025_TWO_PASS_GUARD\nconst already17025=indexSource.includes("var build=\'v1.7.25-greetings1\';");\nconst already17024=already17025||indexSource.includes("var build=\'v1.7.24-crossshift1\';");',
    'release detection');
  source = swap(source,
    'already17024?"var build=\'v1.7.24-crossshift1\';":already17023?',
    'already17025?"var build=\'v1.7.25-greetings1\';":already17024?"var build=\'v1.7.24-crossshift1\';":already17023?',
    'second-pass index reset');
  return source;
});
assert(driver.includes('const already17025=') && driver.includes('already17025?"var build='), '[17025] both build passes supported');

const config = update('supabase-config.js', source => {
  assert(source.includes('https://cgshssdjgzzuprlwnabl.supabase.co') && !source.includes('bkqamcbkiwumsvelahxr'), '[17025] only test Supabase');
  source = swap(source, 'window.RAK_RELEASE_VERSION = "1.7.24";', `window.RAK_RELEASE_VERSION = "${VERSION}";`, 'release version');
  source = swap(source, 'window.RAK_TEST_DISPLAY_VERSION = "1.7.24";', `window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`, 'test version');
  return swap(source, 'window.RAK_PWA_BUILD = "v1.7.24-crossshift1";', `window.RAK_PWA_BUILD = "${BUILD}";`, 'build ID');
});
update('app.js', source => {
  source = swap(source, 'const RAK_DEV_UPDATE_BUILD = "v1.7.24-crossshift1";', `const RAK_DEV_UPDATE_BUILD = "${BUILD}";`, 'app build');
  return swap(source, 'window.RAK_RELEASE_VERSION = "1.7.24";', `window.RAK_RELEASE_VERSION = "${VERSION}";`, 'app version');
});
update('sw.js', source => {
  assert(source.includes("const SW_APP_VERSION = '1.7.0';"), 'technical service worker stays 1.7.0');
  source = swap(source, "const CACHE_VERSION = 'v1.7.24';", `const CACHE_VERSION = 'v${VERSION}';`, 'SW cache');
  source = swap(source, "const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.24';", `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`, 'SW display');
  return swap(source, "const DEVELOPMENT_BUILD_ID = 'v1.7.24-crossshift1';", `const DEVELOPMENT_BUILD_ID = '${BUILD}';`, 'SW build');
});
const index = update('index.html', source => swap(source,
  "var build='v1.7.24-crossshift1';", `var build='${BUILD}';`, 'index version'));
assert(config.includes(`window.RAK_RELEASE_VERSION = "${VERSION}";`) && index.includes(`var build='${BUILD}';`), 'release consistent');
assert.equal(JSON.parse(read('package.json')).version, '1.7.0', 'technical package version unchanged');
for (const file of ['dashboard.js','tools/shift-report-mo-hotfix-170-smoke.mjs','supabase-config.js','app.js','sw.js']) {
  execFileSync(process.execPath, ['--check', file], {stdio:'pipe'});
}
console.log('[first-name-greetings-17025] OK 38 unique given names, both name orders and uppercase, prior overrides, unknown fallback, no personnel import, two-pass build and test database');
