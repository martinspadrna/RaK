import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity, RELEASE_METADATA} from './release-metadata-test-helper.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('1.7.112 has one unified runtime identity', () => {
  assert.equal(RELEASE_METADATA.displayVersion, '1.7.112');
  const metadata = assertCurrentReleaseIdentity(read, '1.7.112');
  assert.equal(metadata.buildId, 'v1.7.112-unplanned-popup1');
  assert(read('index.html').includes('rak-runtime-diagnostics.js?v=1.7.112'));
  assert(read('index.html').includes('app.js?v=1.7.112'));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.112'"));
});

test('1.7.112 changes only the unplanned-change interaction into a page-like popup', () => {
  const menu = read('app-menu.js');
  const wizard = read('admin-rotation-generator-wizard.js');
  const css = read('styles-admin-polish.css');
  assert(menu.includes('adminOpenUnplannedChangeDialog(target)'));
  assert(menu.includes('event.preventDefault()'));
  assert(wizard.includes('adminUnplannedChangePage'));
  assert(wizard.includes('data-unplanned-action="manual"'));
  assert(css.includes('.adminUnplannedChangeDialog.adminUnplannedChangePage{'));
});

test('1.7.112 regression gate and evidence are wired into CI', () => {
  const pkg = JSON.parse(read('package.json'));
  const workflow = read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/unplanned-popup-17112.test.mjs'));
  assert(pkg.scripts.check.includes('tools/release-gate-17112.test.mjs'));
  assert(workflow.includes('tools/unplanned-popup-17112.test.mjs'));
  assert(workflow.includes('tools/release-gate-17112.test.mjs'));
  assert(workflow.includes('rak-170112-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(workflow.includes('rak-170111-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(read('CHANGELOG.md').startsWith('## RaK 1.7.112 (development)'));
});
