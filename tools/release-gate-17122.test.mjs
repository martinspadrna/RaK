import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('1.7.122 remains a historical milestone while successors keep unified identity',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.122');
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
  assert(read('CHANGELOG.md').includes('## RaK 1.7.122 (development)'));
});

test('1.7.122 MO-only absence guards remain present in successors',()=>{
  const wizard=read('admin-rotation-generator-wizard.js');
  const generator=read('admin-rotation-generator.js');
  const rotation=read('admin-rotation.js');
  assert(wizard.includes('adminRotationUnplannedPreserveHardCellsByDate'));
  assert(wizard.includes('adminRotationUnplannedAssertHardPreserved'));
  assert(generator.includes('const preserveHardActive = !!(requestedHardCells'));
  assert(rotation.includes('preserveHardCellsByDate'));
});

test('1.7.122 regression gate remains wired after successor releases',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const name of ['tools/unplanned-mo-only-17122.test.mjs','tools/release-gate-17122.test.mjs']){
    assert(pkg.scripts.check.includes(name),name);
    assert(workflow.includes(name),name);
  }
  assert(workflow.includes('rak-17012'));
  assert(read('CHANGELOG.md').includes('## RaK 1.7.122 (development)'));
});
