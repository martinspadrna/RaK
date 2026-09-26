import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity, RELEASE_METADATA} from './release-metadata-test-helper.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('1.7.110 has one unified runtime identity', () => {
  assert.equal(RELEASE_METADATA.displayVersion, '1.7.110');
  const metadata = assertCurrentReleaseIdentity(read, '1.7.110');
  assert.equal(metadata.buildId, 'v1.7.110-whatsapp-shift-label1');
  assert(read('index.html').includes('rak-runtime-diagnostics.js?v=1.7.110'));
  assert(read('index.html').includes('app.js?v=1.7.110'));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.110'"));
});

test('WhatsApp text uses human-readable Czech shift labels in helper and live runtime', () => {
  for (const file of ['rak-shift-report-image.js','rak-shift-report-share.js']) {
    const source = read(file);
    assert(source.includes("return ({ N: 'Noční', R: 'Ranní', N8: 'Noční 8 h', R8: 'Ranní 8 h' })"));
    assert(source.includes("const shift = ['N', 'R', 'N8', 'R8'].includes(rawShift) ? shiftLabel(rawShift) : '—';"));
    assert(source.includes("return 'RaK – Report směny diferenciály · ' + date + ' · směna ' + shift;"));
    assert(source.includes('navigator.share({ title: caption, text: caption, files: [file] })'));
  }
});

test('1.7.110 regression gate and evidence are wired into CI', () => {
  const pkg = JSON.parse(read('package.json'));
  const workflow = read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/release-gate-17110.test.mjs'));
  assert(workflow.includes('tools/release-gate-17110.test.mjs'));
  assert(workflow.includes('rak-170110-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(workflow.includes('rak-170109-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(read('CHANGELOG.md').startsWith('## RaK 1.7.110 (development)'));
});
