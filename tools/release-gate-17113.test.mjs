import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity, RELEASE_METADATA} from './release-metadata-test-helper.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('1.7.113 has one unified runtime identity', () => {
  assert.equal(RELEASE_METADATA.displayVersion, '1.7.113');
  const metadata = assertCurrentReleaseIdentity(read, '1.7.113');
  assert.equal(metadata.buildId, 'v1.7.113-unplanned-menu-stack1');
  assert(read('index.html').includes('rak-runtime-diagnostics.js?v=1.7.113'));
  assert(read('index.html').includes('app.js?v=1.7.113'));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.113'"));
});

test('rotation name action menu is forced into one vertical column', () => {
  const editor = read('admin-rotation-editor.js');
  assert(editor.includes("box.style.setProperty('display', 'grid', 'important')"));
  assert(editor.includes("box.style.setProperty('grid-template-columns', '1fr', 'important')"));
  assert(editor.includes("box.style.setProperty('align-items', 'stretch', 'important')"));
  assert(editor.includes(".adminRotationQuickRemove.isVisible{display:grid!important;grid-template-columns:1fr!important;align-items:stretch!important;justify-content:stretch!important}"));
  assert(editor.includes('Neplánovaná dovolená'));
  assert(editor.includes('adminRotationQuickRemoveBtn">Odebrat</button>'));
});

test('1.7.113 regression gate and evidence are wired into CI', () => {
  const pkg = JSON.parse(read('package.json'));
  const workflow = read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/release-gate-17113.test.mjs'));
  assert(workflow.includes('tools/release-gate-17113.test.mjs'));
  assert(workflow.includes('rak-170113-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(workflow.includes('rak-170112-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(read('CHANGELOG.md').startsWith('## RaK 1.7.113 (development)'));
});
