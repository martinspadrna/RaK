import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.105 uses one unified runtime identity and preserves the 1.7.104 milestone',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.105');
  assert.equal(metadata.displayVersion,'1.7.105');
  assert.equal(metadata.technicalVersion,'1.7.105');
  assert.equal(metadata.moduleCacheVersion,'1.7.105');
  assert.equal(metadata.cacheVersion,'v1.7.105');
  assert.equal(metadata.buildId,'v1.7.105-diagnostics-privacy1');
  assert.equal(JSON.parse(read('package.json')).version,'1.7.105');
  assert(read('index.html').includes('app.js?v=1.7.105'));
  const sw=read('sw.js');
  assert(sw.includes("importScripts('./rak-release-metadata.js?sw=1.7.105');"));
  assert(sw.includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.105';"));
  assert(fs.existsSync(new URL('./release-gate-17104.test.mjs',import.meta.url)));
});

test('privacy runtime and real Chromium canary are mandatory release gates',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/privacy-diagnostics-17105.test.mjs'));
  assert(pkg.scripts.check.includes('tools/release-gate-17105.test.mjs'));
  assert(workflow.includes('node --test tools/privacy-diagnostics-17105.test.mjs tools/release-gate-17105.test.mjs'));
  assert(workflow.includes('node tools/browser-privacy-diagnostics-17105.mjs'));
  assert(workflow.includes('rak-170105-isolated-build-'+'$'+'{{ github.sha }}'));
});

test('performance parity targets 1.7.105 without changing immutable baseline or tolerances',()=>{
  const config=JSON.parse(read('tools/performance-parity-17069.json'));
  const script=read('tools/performance-parity-17069.mjs');
  assert.equal(config.baseline.sha,'1693c8631c13d6e381e44a96810a55140ad6aa62');
  assert.equal(config.current.version,'1.7.105');
  assert.equal(config.rounds,5);
  assert(script.includes('current-1.7.105'));
  for(const spec of Object.values(config.metrics)){
    assert(spec.maxMedianRegressionPct<=10);
    assert(spec.maxP95DeltaMs<=100);
  }
});
