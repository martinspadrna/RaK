import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.105 privacy milestone remains protected by the current unified identity',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.105');
  assert.match(metadata.displayVersion,/^1\.7\.(?:10[5-9]|1[1-9]\d|[2-9]\d{2,})$/);
  assert.equal(metadata.technicalVersion,metadata.displayVersion);
  assert.equal(metadata.moduleCacheVersion,metadata.displayVersion);
  assert.equal(metadata.cacheVersion,'v'+metadata.displayVersion);
  assert(metadata.buildId.startsWith('v'+metadata.displayVersion+'-'));
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
  assert(read('index.html').includes('app.js?v='+metadata.displayVersion));
  const sw=read('sw.js');
  assert(sw.includes("importScripts('./rak-release-metadata.js?sw="+metadata.displayVersion+"');"));
  assert(sw.includes("const SW_RELEASE_CACHE_MARKER = 'v"+metadata.displayVersion+"';"));
  assert(fs.existsSync(new URL('./release-gate-17104.test.mjs',import.meta.url)));
  assert(read('CHANGELOG.md').includes('RaK 1.7.105'));
});

test('privacy runtime and real Chromium canary are mandatory release gates',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/privacy-diagnostics-17105.test.mjs'));
  assert(pkg.scripts.check.includes('tools/release-gate-17105.test.mjs'));
  assert(workflow.includes('node --test tools/privacy-diagnostics-17105.test.mjs tools/release-gate-17105.test.mjs'));
  assert(workflow.includes('node tools/browser-privacy-diagnostics-17105.mjs'));
});

test('performance parity preserves immutable baseline and tolerances after 1.7.105',()=>{
  const config=JSON.parse(read('tools/performance-parity-17069.json'));
  const script=read('tools/performance-parity-17069.mjs');
  assert.equal(config.baseline.sha,'1693c8631c13d6e381e44a96810a55140ad6aa62');
  assert.equal(config.current.version,JSON.parse(read('package.json')).version);
  assert.equal(config.rounds,5);
  assert(script.includes('current-'+config.current.version));
  for(const spec of Object.values(config.metrics)){
    assert(spec.maxMedianRegressionPct<=10);
    assert(spec.maxP95DeltaMs<=100);
  }
});
