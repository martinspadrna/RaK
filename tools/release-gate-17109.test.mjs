import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('1.7.109 live-runtime and report-alignment milestone remains active in successors', () => {
  const metadata = assertCurrentReleaseIdentity(read, '1.7.109');
  assert.equal(JSON.parse(read('package.json')).version, metadata.displayVersion);
  const runtime = read('rak-shift-report-share.js');
  assert(runtime.includes('function shiftReportShareTitle(root)'));
  assert(runtime.includes('navigator.share({ title: caption, text: caption, files: [file] })'));
  const base = read('rak-shift-report.js');
  assert(base.includes('.rakShiftContext .rakShiftMetaLabel{grid-template-rows:auto 48px;align-content:start}'));
});

test('canonical build still synchronizes the embedded live PNG helper', () => {
  const compiler = read('tools/shift-report-image-170.mjs');
  const smoke = read('tools/shift-report-image-170-smoke.mjs');
  assert(compiler.includes('runtime.lastIndexOf(helperHeader)'));
  assert(compiler.includes("runtime = runtime.slice(0, embeddedStart)"));
  assert(smoke.includes("['helper', helper], ['live runtime', runtime]"));
});

test('1.7.109 historical gate remains wired after successor releases', () => {
  const pkg = JSON.parse(read('package.json'));
  const workflow = read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/release-gate-17109.test.mjs'));
  assert(workflow.includes('tools/release-gate-17109.test.mjs'));
  assert(/rak-1701\d{2}-isolated-build-/.test(workflow));
  assert(read('CHANGELOG.md').includes('## RaK 1.7.109 (development)'));
});
