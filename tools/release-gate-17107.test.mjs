import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity, RELEASE_METADATA} from './release-metadata-test-helper.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('1.7.107 has one unified runtime identity', () => {
  assert.equal(RELEASE_METADATA.displayVersion, '1.7.107');
  const metadata = assertCurrentReleaseIdentity(read, '1.7.107');
  assert.equal(metadata.buildId, 'v1.7.107-calendar-whatsapp1');
  assert(read('index.html').includes('rak-runtime-diagnostics.js?v=1.7.107'));
  assert(read('index.html').includes('app.js?v=1.7.107'));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.107'"));
});

test('calendar remove cross is centered inside its mobile touch target', () => {
  const css = read('styles-admin-polish.css');
  const selector = '#appMenuBody[data-admin-view="calendars"] .adminShiftCalendarRemove{';
  const start = css.indexOf(selector);
  assert(start >= 0, 'calendar remove selector missing');
  const end = css.indexOf('}', start);
  const block = css.slice(start, end);
  for (const declaration of [
    'padding:0 !important',
    'line-height:1 !important',
    'display:grid !important',
    'place-items:center !important',
    'text-align:center !important'
  ]) assert(block.includes(declaration), 'calendar remove centering missing: ' + declaration);
});

test('WhatsApp PNG title comes from the currently selected report date and shift', () => {
  const image = read('rak-shift-report-image.js');
  assert(image.includes('function shiftReportShareTitle(root)'));
  assert(image.includes('const model = collectModel(root);'));
  assert(image.includes("const rawDate = String(model.date || '').trim();"));
  assert(image.includes("const rawShift = String(model.shift || '').trim().toUpperCase();"));
  assert(image.includes("return 'RaK – Report směny diferenciály · ' + date + ' · směna ' + shift;"));
  assert(image.includes('navigator.share({ title: shiftReportShareTitle(root), files: [file] })'));
  assert(!image.includes("navigator.share({ title: 'RaK – Report směny diferenciály', files: [file] })"));
});

test('1.7.107 regression gate and evidence are wired into CI', () => {
  const pkg = JSON.parse(read('package.json'));
  const workflow = read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/release-gate-17107.test.mjs'));
  assert(workflow.includes('tools/release-gate-17107.test.mjs'));
  assert(workflow.includes('rak-170107-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(workflow.includes('rak-170106-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(read('CHANGELOG.md').startsWith('## RaK 1.7.107 (development)'));
});
