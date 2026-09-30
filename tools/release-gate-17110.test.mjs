import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('1.7.110 human-readable WhatsApp shift milestone remains active in successors', () => {
  const metadata = assertCurrentReleaseIdentity(read, '1.7.110');
  assert.equal(JSON.parse(read('package.json')).version, metadata.displayVersion);
  for (const file of ['rak-shift-report-image.js','rak-shift-report-share.js']) {
    const source = read(file);
    assert(source.includes("return ({ N: 'Noční', R: 'Ranní', N8: 'Noční 8 h', R8: 'Ranní 8 h' })"));
    assert(source.includes("const shift = ['N', 'R', 'N8', 'R8'].includes(rawShift) ? shiftLabel(rawShift) : '—';"));
    assert(source.includes('navigator.share({ title: caption, text: caption, files: [file] })'));
  }
});

test('1.7.110 historical gate remains wired after successor releases', () => {
  const pkg = JSON.parse(read('package.json'));
  const workflow = read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/release-gate-17110.test.mjs'));
  assert(workflow.includes('tools/release-gate-17110.test.mjs'));
  assert(/rak-1701\d{2}-isolated-build-/.test(workflow));
  assert(read('CHANGELOG.md').includes('## RaK 1.7.110 (development)'));
});
