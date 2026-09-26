import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity, RELEASE_METADATA} from './release-metadata-test-helper.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('1.7.109 has one unified runtime identity', () => {
  assert.equal(RELEASE_METADATA.displayVersion, '1.7.109');
  const metadata = assertCurrentReleaseIdentity(read, '1.7.109');
  assert.equal(metadata.buildId, 'v1.7.109-whatsapp-runtime-align1');
  assert(read('index.html').includes('rak-runtime-diagnostics.js?v=1.7.109'));
  assert(read('index.html').includes('app.js?v=1.7.109'));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.109'"));
});

test('the actually loaded shift-report runtime sends dynamic WhatsApp message text with the PNG', () => {
  const app = read('app.js');
  const runtime = read('rak-shift-report-share.js');
  assert(app.includes('"rak-shift-report-share.js"'), 'live report runtime is not loaded by app.js');
  assert(runtime.includes('function shiftReportShareTitle(root)'));
  assert(runtime.includes("return 'RaK – Report směny diferenciály · ' + date + ' · směna ' + shift;"));
  assert(runtime.includes('const caption = shiftReportShareTitle(root);'));
  assert(runtime.includes('navigator.share({ title: caption, text: caption, files: [file] })'));
  assert(!runtime.includes("navigator.share({ title: 'RaK – Report směny diferenciály', files: [file] })"));
});

test('canonical build synchronizes the embedded live PNG helper instead of keeping a stale copy', () => {
  const compiler = read('tools/shift-report-image-170.mjs');
  const smoke = read('tools/shift-report-image-170-smoke.mjs');
  assert(compiler.includes('runtime.lastIndexOf(helperHeader)'));
  assert(compiler.includes("runtime = runtime.slice(0, embeddedStart)"));
  assert(!compiler.includes('repeated build: PNG image export already attached'));
  assert(smoke.includes("['helper', helper], ['live runtime', runtime]"));
});

test('Datum and Směna controls share the same 48px row on mobile', () => {
  const base = read('rak-shift-report.js');
  const runtime = read('rak-shift-report-share.js');
  assert(base.includes('.rakShiftContext .rakShiftMetaLabel{grid-template-rows:auto 48px;align-content:start}'));
  assert(base.includes('.rakShiftContext .rakShiftShift{display:block;width:100%;min-width:0;max-width:100%;height:48px!important;min-height:48px!important;margin:0!important;box-sizing:border-box!important;'));
  assert(runtime.includes('#rakShiftReport .rakShiftMetaLabel{display:grid;width:100%;grid-template-rows:auto 48px;align-content:start;'));
  assert(runtime.includes('height:48px!important;min-height:48px!important;margin:0!important;box-sizing:border-box!important;'));
  assert(runtime.includes('#rakShiftReport .rakShiftDateShell{position:relative;width:124px!important;inline-size:124px!important;max-width:124px!important;height:48px!important;min-height:48px!important;'));
});

test('1.7.109 regression gate and evidence are wired into CI', () => {
  const pkg = JSON.parse(read('package.json'));
  const workflow = read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/release-gate-17109.test.mjs'));
  assert(workflow.includes('tools/release-gate-17109.test.mjs'));
  assert(workflow.includes('rak-170109-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(workflow.includes('rak-170108-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(read('CHANGELOG.md').startsWith('## RaK 1.7.109 (development)'));
});
