import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.83 identifies the About release candidate',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.83');
  assert.equal(metadata.displayVersion,'1.7.83');
  assert.equal(metadata.buildId,'v1.7.83-about-release1');
});

test('O aplikaci explains RaK and lists only evidenced 1.7 outcomes',()=>{
  const about=read('app-menu-pages.js');
  assert(about.includes('RaK spojuje pracovní rotace, osobní směnu, výrobní úkoly, směnové reporty, dovolené a dílenské kalkulačky'));
  assert(about.includes("title: 'Výroba, bezpečnost a práce bez internetu'"));
  assert(about.includes('na ověřeném iPhonu se po úplném restartu načetla i bez internetu'));
  assert(about.includes('při návratu online se porovnává revize, čas a obsah dat'));
  assert(about.includes('při chybě bezpečně skončí bez vytvoření archivu'));
  assert(!about.includes('konflikty synchronizace jsou kompletně vyřešené'));
});

test('mandatory CI and npm check execute the 1.7.83 gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(workflow.includes('node --test tools/release-gate-17083.test.mjs'));
  assert(pkg.scripts.check.includes('tools/release-gate-17083.test.mjs'));
});
