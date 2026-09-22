import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('canonical baseline replaces the obsolete pre-1.7 aggregate smoke without dropping its current invariants',()=>{
  const pkg=JSON.parse(read('package.json'));
  assert(pkg.scripts['legacy:check'].includes('tools/v160-smoke.mjs'));
  assert(!pkg.scripts.check.includes('tools/v160-smoke.mjs'));
  assert(pkg.scripts.check.includes('tools/canonical-baseline-smoke.mjs'));
  const menu=read('app-menu-pages.js');
  assert(menu.includes("range: 'RaK 1.7'"));
  assert(menu.includes('odstraněné zbytky Her')||menu.includes('odstranily se Hry'));
  for(const removed of ['games-engine.js','games-ui.js','games-bomberman.js'])assert(!fs.existsSync(new URL('../'+removed,import.meta.url)),removed);
});

test('canonical release metadata is one explicit 1.7.75 preview identity',()=>{
  assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
  assert(read('index.html').includes("var build='v1.7.75-report-columns1';"));
  assert(read('sw.js').includes("const CACHE_VERSION = 'v1.7.75';"));
  assert(read('sw.js').includes("const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.75';"));
  assert(read('sw.js').includes("const DEVELOPMENT_BUILD_ID = 'v1.7.75-report-columns1';"));
  assert(read('app.js').includes('const RAK_DEV_UPDATE_BUILD = "v1.7.75-report-columns1";'));
  assert(read('app.js').includes('window.RAK_RELEASE_VERSION = "1.7.75";'));
  assert(read('supabase-config.js').includes('window.RAK_RELEASE_VERSION = "1.7.75";'));
  assert(read('supabase-config.js').includes('window.RAK_TEST_DISPLAY_VERSION = "1.7.75";'));
  assert(read('supabase-config.js').includes('window.RAK_PWA_BUILD = "v1.7.75-report-columns1";'));
});
