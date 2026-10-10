import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.9.0 has one release identity across runtime, PWA and package metadata',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.9.0');
  assert.equal(metadata.displayVersion,'1.9.0');
  assert.equal(metadata.visibleTestVersion,'1.9.7');
  assert.equal(metadata.technicalVersion,'1.9.0');
  assert.equal(metadata.moduleCacheVersion,'1.9.0');
  assert.equal(metadata.cacheVersion,'v1.9.0');
  assert.equal(metadata.buildId,'v1.9.0-shift-overview7');
  assert.equal(JSON.parse(read('tools/performance-parity-17069.json')).current.version,'1.9.0');
  assert(read('index.html').includes('app.js?v=1.9.0'));
  assert(read('sw.js').includes("importScripts('./rak-release-metadata.js?sw=1.9.0')"));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v1.9.0'"));
  assert(read('CHANGELOG.md').includes('## RaK 1.9.0 (development)'));
});

test('1.9 About summary covers performance, parity, isolation and cross-shift navigation',()=>{
  const about=read('app-menu-pages.js');
  const start=about.indexOf('// RAK_190_ABOUT_START');
  const end=about.indexOf('// RAK_190_ABOUT_END',start);
  const block=about.slice(start,end);
  assert(start>=0&&end>start);
  for(const phrase of ['rychlém jádru','oddělené moduly','1:1','Home – Kalkulačky – Více','PWA cache']){
    assert(block.includes(phrase),phrase);
  }
  assert.equal((block.match(/^\s*'/gm)||[]).length,5);
});

test('1.9 remains TEST-only and preserves the explicit cross-shift order',()=>{
  const config=read('supabase-config.js');
  assert(config.includes('cgshssdjgzzuprlwnabl'));
  assert(!config.includes('bkqamcbkiwumsvelahxr'));
  const core=read('core.js');
  assert(core.includes("['home','kalkulacky','menu'].forEach((action,index)=>"));
  assert(core.includes("button.style.setProperty('grid-column',String(index+1),'important')"));
});

test('1.9 gate is mandatory locally and in CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/release-gate-190.test.mjs'));
  assert(workflow.includes('tools/release-gate-190.test.mjs'));
  assert(workflow.includes('rak-190-isolated-build-${{ github.sha }}'));
});
