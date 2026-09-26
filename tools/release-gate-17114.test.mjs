import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity,RELEASE_METADATA} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('1.7.114 has one unified runtime identity',()=>{
  assert.equal(RELEASE_METADATA.displayVersion,'1.7.114');
  const metadata=assertCurrentReleaseIdentity(read,'1.7.114');
  assert.equal(metadata.buildId,'v1.7.114-unplanned-menu-inline1');
  assert(read('index.html').includes('rak-runtime-diagnostics.js?v=1.7.114'));
  assert(read('index.html').includes('app.js?v=1.7.114'));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.114'"));
});

test('1.7.114 forces inner action container and both buttons inline',()=>{
  const editor=read('admin-rotation-editor.js');
  for(const marker of [
    "actions.style.setProperty('display', 'grid', 'important')",
    "actions.style.setProperty('grid-template-columns', '1fr', 'important')",
    "actions.style.setProperty('width', '100%', 'important')",
    "button.style.setProperty('display', 'block', 'important')",
    "button.style.setProperty('width', '100%', 'important')",
    "button.style.setProperty('white-space', 'normal', 'important')"
  ]) assert(editor.includes(marker),marker);
  assert(editor.includes('Neplánovaná dovolená'));
  assert(editor.includes('adminRotationQuickRemoveBtn">Odebrat</button>'));
});

test('1.7.114 regression gate and evidence are wired into CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/release-gate-17114.test.mjs'));
  assert(workflow.includes('tools/release-gate-17114.test.mjs'));
  assert(workflow.includes('rak-170114-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(workflow.includes('rak-170113-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(read('CHANGELOG.md').startsWith('## RaK 1.7.114 (development)'));
});
