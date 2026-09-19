#!/usr/bin/env node
// RaK 1.7.41: preserve predecessor two-pass markers; stamp only after the verified 1.7.40 stage.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const VERSION = '1.7.41';
const BUILD = 'v1.7.41-twopass1';
const PREVIOUS = 'v1.7.40-rotationmin1';
const read = path => fs.readFileSync(path, 'utf8');
function change(path, transform) {
  const before = read(path);
  const after = transform(before);
  if (after !== before) fs.writeFileSync(path, after, 'utf8');
  return after;
}
function swap(source, before, after, label) {
  if (source.includes(before)) {
    assert.equal(source.split(before).length, 2, '[17041] duplicated ' + label);
    return source.replace(before, after);
  }
  assert(source.includes(after), '[17041] missing ' + label);
  return source;
}
change('tools/shift-report-mo-hotfix-170-smoke.mjs', source => {
  if (source.includes('// RAK_17041_TWO_PASS_GUARD')) return source;
  source = swap(source,
    `// RAK_17039_TWO_PASS_GUARD\n// RAK_17040_TWO_PASS_GUARD\nconst already17040=indexSource.includes("var build='${PREVIOUS}';");`,
    `// RAK_17039_TWO_PASS_GUARD\n// RAK_17040_TWO_PASS_GUARD\n// RAK_17041_TWO_PASS_GUARD\nconst already17041=indexSource.includes("var build='${BUILD}';");
const already17040=already17041||indexSource.includes("var build='${PREVIOUS}';");`,
    'preserve 17039 + 17040 guards');
  return swap(source,
    `already17040?"var build='${PREVIOUS}';":already17039?`,
    `already17041?"var build='${BUILD}';":already17040?"var build='${PREVIOUS}';":already17039?`,
    'detect final build on replay');
});
change('supabase-config.js', source => {
  assert(source.includes('https://cgshssdjgzzuprlwnabl.supabase.co')
    && !source.includes('bkqamcbkiwumsvelahxr'), '[17041] development Supabase isolation');
  source = swap(source, 'window.RAK_RELEASE_VERSION = "1.7.40";', `window.RAK_RELEASE_VERSION = "${VERSION}";`, 'visible release');
  source = swap(source, 'window.RAK_TEST_DISPLAY_VERSION = "1.7.40";', `window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`, 'display release');
  return swap(source, `window.RAK_PWA_BUILD = "${PREVIOUS}";`, `window.RAK_PWA_BUILD = "${BUILD}";`, 'PWA marker');
});
change('app.js', source => {
  source = swap(source, `const RAK_DEV_UPDATE_BUILD = "${PREVIOUS}";`, `const RAK_DEV_UPDATE_BUILD = "${BUILD}";`, 'app build');
  return swap(source, 'window.RAK_RELEASE_VERSION = "1.7.40";', `window.RAK_RELEASE_VERSION = "${VERSION}";`, 'app version');
});
change('sw.js', source => {
  assert(source.includes("const SW_APP_VERSION = '1.7.0';"), '[17041] technical version changed');
  source = swap(source, "const CACHE_VERSION = 'v1.7.40';", `const CACHE_VERSION = 'v${VERSION}';`, 'cache');
  source = swap(source, "const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.40';", `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`, 'SW version');
  return swap(source, `const DEVELOPMENT_BUILD_ID = '${PREVIOUS}';`, `const DEVELOPMENT_BUILD_ID = '${BUILD}';`, 'SW build');
});
change('index.html', source => swap(source, `var build='${PREVIOUS}';`, `var build='${BUILD}';`, 'HTML build'));
const stage = read('tools/shift-report-mo-hotfix-170-smoke.mjs');
for (const marker of ['RAK_17039_TWO_PASS_GUARD', 'RAK_17040_TWO_PASS_GUARD', 'RAK_17041_TWO_PASS_GUARD']) {
  assert(stage.includes(marker), '[17041] lost historical guard: ' + marker);
}
assert(stage.includes(`const already17040=already17041||indexSource.includes("var build='${PREVIOUS}';");`)
  && stage.includes(`already17041?"var build='${BUILD}';":already17040?`), '[17041] replay detector incomplete');
assert.equal(JSON.parse(read('package.json')).version, '1.7.0', '[17041] technical package version changed');
const markers = [
  ['index.html', `var build='${BUILD}';`],
  ['supabase-config.js', `window.RAK_RELEASE_VERSION = "${VERSION}";`],
  ['supabase-config.js', `window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`],
  ['supabase-config.js', `window.RAK_PWA_BUILD = "${BUILD}";`],
  ['app.js', `const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],
  ['app.js', `window.RAK_RELEASE_VERSION = "${VERSION}";`],
  ['sw.js', `const CACHE_VERSION = 'v${VERSION}';`],
  ['sw.js', `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],
  ['sw.js', `const DEVELOPMENT_BUILD_ID = '${BUILD}';`],
  ['supabase-bridge.js', ".select('id,key,payload,meta,revision,updated_at').eq('key', 'main').maybeSingle()"]
];
for (const [path, token] of markers) assert(read(path).includes(token), '[17041] invalid final build: ' + path);
for (const path of ['tools/development-version-17039.mjs','tools/development-version-17040.mjs',
  'tools/development-version-17041.mjs', 'tools/shift-report-mo-hotfix-170-smoke.mjs',
  'supabase-config.js', 'app.js', 'sw.js', 'supabase-bridge.js']) {
  execFileSync(process.execPath, ['--check', path], { stdio: 'pipe' });
}
console.log('[development-version-17041] OK: version 1.7.41; 1.7.39/1.7.40 guards retained; replay detection; TEST Supabase; PWA aligned');
await import('./development-version-17042.mjs');
await import('./development-version-17043.mjs');
