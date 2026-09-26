import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('1.7.113 stacked menu milestone remains active in successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.113');
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
  const editor=read('admin-rotation-editor.js');
  assert(editor.includes('Neplánovaná dovolená'));
  assert(editor.includes('adminRotationQuickRemoveBtn">Odebrat</button>'));
  assert(editor.includes("box.style.setProperty('display', 'grid', 'important')"));
});

test('1.7.113 historical gate remains wired after successor releases',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/release-gate-17113.test.mjs'));
  assert(workflow.includes('tools/release-gate-17113.test.mjs'));
  assert(/rak-1701\d{2}-isolated-build-/.test(workflow));
  assert(read('CHANGELOG.md').includes('## RaK 1.7.113 (development)'));
});
