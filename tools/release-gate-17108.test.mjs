import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity, RELEASE_METADATA} from './release-metadata-test-helper.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('1.7.108 has one unified runtime identity', () => {
  assert.equal(RELEASE_METADATA.displayVersion, '1.7.108');
  const metadata = assertCurrentReleaseIdentity(read, '1.7.108');
  assert.equal(metadata.buildId, 'v1.7.108-whatsapp-caption1');
  assert(read('index.html').includes('rak-runtime-diagnostics.js?v=1.7.108'));
  assert(read('index.html').includes('app.js?v=1.7.108'));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.108'"));
});

test('WhatsApp PNG share passes the contextual report string as image caption text', () => {
  const image = read('rak-shift-report-image.js');
  assert(image.includes('function shiftReportShareTitle(root)'));
  assert(image.includes('const caption = shiftReportShareTitle(root);'));
  assert(image.includes('navigator.share({ title: caption, text: caption, files: [file] })'));
  assert(!image.includes('navigator.share({ title: shiftReportShareTitle(root), files: [file] })'));
  assert(image.includes("return 'RaK – Report směny diferenciály · ' + date + ' · směna ' + shift;"));
});

test('1.7.108 caption regression is also covered by the shift-report smoke', () => {
  const smoke = read('tools/shift-report-image-170-smoke.mjs');
  assert(smoke.includes('const caption = shiftReportShareTitle(root);'));
  assert(smoke.includes('navigator.share({ title: caption, text: caption, files: [file] })'));
});

test('1.7.108 regression gate and evidence are wired into CI', () => {
  const pkg = JSON.parse(read('package.json'));
  const workflow = read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/release-gate-17108.test.mjs'));
  assert(workflow.includes('tools/release-gate-17108.test.mjs'));
  assert(workflow.includes('rak-170108-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(workflow.includes('rak-170107-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(read('CHANGELOG.md').startsWith('## RaK 1.7.108 (development)'));
});
