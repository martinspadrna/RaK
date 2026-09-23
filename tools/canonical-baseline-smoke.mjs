import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity,RELEASE_METADATA} from './release-metadata-test-helper.mjs';
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

test('canonical release metadata has one executable source of truth',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.78');
  assert.equal(metadata,RELEASE_METADATA);
});