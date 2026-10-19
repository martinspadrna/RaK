import {assertSupabaseTarget} from './release-metadata-test-helper.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('production has one release identity across runtime, PWA and package metadata',()=>{
  const version=JSON.parse(read('package.json')).version;
  const metadata=assertCurrentReleaseIdentity(read,version);
  assert.equal(metadata.displayVersion,version);
  assert.equal(metadata.visibleTestVersion,version);
  assert.equal(metadata.technicalVersion,version);
  assert.equal(metadata.moduleCacheVersion,version);
  assert.equal(metadata.cacheVersion,'v'+version');
  assert.equal(metadata.buildId,'v'+version+'-release1');
  assert.equal(JSON.parse(read('tools/performance-parity-17069.json')).current.version,version);
  assert(read('index.html').includes('app.js?v='+version));
  assert(read('sw.js').includes("importScripts('./rak-release-metadata.js?sw="+version+"')"));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v"+version+"'"));
  assert(read('CHANGELOG.md').includes('## RaK '+version+' (development)'));
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
  assertSupabaseTarget(config);
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
