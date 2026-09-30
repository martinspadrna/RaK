import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('1.7.117 remains a historical milestone while successors correct its staffing assumption',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.117');
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
  assert(read('CHANGELOG.md').includes('## RaK 1.7.117 (development)'));
});

test('the obsolete four-absence staffing branch cannot survive successor releases',()=>{
  const generator=read('admin-rotation-generator.js');
  const rotation=read('admin-rotation.js');
  assert(!generator.includes('function adminRotationGeneratorTpkw02ClosedForStaffing('));
  assert(!generator.includes('missing === 3 || missing === 4'));
  assert(!rotation.includes('(absent.size !== 3 && absent.size !== 4)'));
  assert(!rotation.includes('Při čtyřech absencích'));
});

test('1.7.117 regression coverage remains wired into CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/staffing-shortage-17117.test.mjs'));
  assert(pkg.scripts.check.includes('tools/release-gate-17117.test.mjs'));
  assert(workflow.includes('tools/staffing-shortage-17117.test.mjs'));
  assert(workflow.includes('tools/release-gate-17117.test.mjs'));
});
