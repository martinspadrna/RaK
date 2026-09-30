import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('1.7.138 conflict-rescue milestone remains protected by successor release identity', () => {
  const current=String(JSON.parse(read('package.json')).version||'');
  assertCurrentReleaseIdentity(read,'1.7.138');
  const metadata = assertCurrentReleaseIdentity(read, current);
  assert.equal(metadata.displayVersion, current);
  assert(read('index.html').includes('rak-runtime-diagnostics.js?v='+current));
  assert(read('index.html').includes('app.js?v='+current));
  assert(read('sw.js').includes("importScripts('./rak-release-metadata.js?sw="+current+"')"));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v"+current+"'"));
  assert(read('CHANGELOG.md').includes('## RaK 1.7.138 (development)'));
});

test('1.7.138 requires the conflict-rescue routing regression in local and CI gates', () => {
  const pkg = JSON.parse(read('package.json'));
  const workflow = read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/conflict-rescue-routing-17138.test.mjs'));
  assert(pkg.scripts.check.includes('tools/release-gate-17138.test.mjs'));
  assert(workflow.includes('tools/conflict-rescue-routing-17138.test.mjs'));
  assert(workflow.includes('tools/release-gate-17138.test.mjs'));
  assert(workflow.includes('rak-170138-isolated-build-${{ github.sha }}'));
});

test('development release contains no temporary P2.3 seeder', () => {
  assert(!read('index.html').includes('p23-rescue-seed.js'));
  assert(read('CHANGELOG.md').includes('## RaK 1.7.138 (development)'));
});
