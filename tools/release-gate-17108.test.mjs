import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('1.7.108 contextual WhatsApp caption milestone remains active in successors', () => {
  const metadata = assertCurrentReleaseIdentity(read, '1.7.108');
  assert.equal(JSON.parse(read('package.json')).version, metadata.displayVersion);
  assert(read('index.html').includes('rak-runtime-diagnostics.js?v=' + metadata.displayVersion));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v" + metadata.displayVersion + "'"));
});

test('contextual WhatsApp caption stays present in the helper and live runtime', () => {
  for (const file of ['rak-shift-report-image.js','rak-shift-report-share.js']) {
    const source = read(file);
    assert(source.includes('function shiftReportShareTitle(root)'), file + ': caption helper missing');
    assert(source.includes("return 'RaK – Report směny diferenciály · ' + date + ' · ' + shift;"), file + ': contextual caption missing');
    assert(source.includes('navigator.share({ title: caption, text: caption, files: [file] })'), file + ': caption text+file payload missing');
  }
});

test('1.7.108 historical gate remains wired after successor releases', () => {
  const pkg = JSON.parse(read('package.json'));
  const workflow = read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/release-gate-17108.test.mjs'));
  assert(workflow.includes('tools/release-gate-17108.test.mjs'));
  assert(/rak-1701\d{2}-isolated-build-/.test(workflow));
  assert(read('CHANGELOG.md').includes('## RaK 1.7.108 (development)'));
});
