import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('1.7.107 calendar and contextual share-title milestone remains active in successors', () => {
  const metadata = assertCurrentReleaseIdentity(read, '1.7.107');
  assert.equal(JSON.parse(read('package.json')).version, metadata.displayVersion);
  assert(read('index.html').includes('rak-runtime-diagnostics.js?v=' + metadata.displayVersion));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v" + metadata.displayVersion + "'"));
});

test('calendar remove cross remains centered inside its mobile touch target', () => {
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

test('contextual WhatsApp share text still comes from the selected report date and shift', () => {
  const image = read('rak-shift-report-image.js');
  assert(image.includes('function shiftReportShareTitle(root)'));
  assert(image.includes('const model = collectModel(root);'));
  assert(image.includes("const rawDate = String(model.date || '').trim();"));
  assert(image.includes("const rawShift = String(model.shift || '').trim().toUpperCase();"));
  assert(image.includes("return 'RaK – Report směny diferenciály · ' + date + ' · ' + shift;"));
  assert(image.includes('title: caption'));
  assert(!image.includes("navigator.share({ title: 'RaK – Report směny diferenciály'"));
});

test('1.7.107 historical gate remains wired after successor releases', () => {
  const pkg = JSON.parse(read('package.json'));
  const workflow = read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/release-gate-17107.test.mjs'));
  assert(workflow.includes('tools/release-gate-17107.test.mjs'));
  assert(/rak-1701\d{2}-isolated-build-/.test(workflow));
  assert(read('CHANGELOG.md').includes('## RaK 1.7.107 (development)'));
});
