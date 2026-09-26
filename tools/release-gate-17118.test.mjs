import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('1.7.118 remains a historical milestone while successors preserve its staffing correction',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.118');
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
  assert(read('CHANGELOG.md').includes('## RaK 1.7.118 (development)'));
});

test('1.7.118 removes the invalid four-absence branch and preserves the established three-absence rule',()=>{
  const generator=read('admin-rotation-generator.js');
  const rotation=read('admin-rotation.js');
  assert(generator.includes('function adminRotationGeneratorThreeAbsences('));
  assert(generator.includes("adminRotationGeneratorThreeAbsences(knownNames, available) && machineName === 'TPKW02'"));
  assert(!generator.includes('adminRotationGeneratorTpkw02ClosedForStaffing'));
  assert(!generator.includes('missing === 4'));
  assert(rotation.includes('absent.size !== 3'));
  assert(rotation.includes("inspect(SOFT_MACHINE_HEADERS, softRow, ['MSKC03', 'MSKC04', 'MFKF10']);"));
  assert(!rotation.includes('absent.size !== 4'));
  assert(!rotation.includes('Při čtyřech absencích'));
});

test('1.7.118 regression gate remains wired after successor releases',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/release-gate-17118.test.mjs'));
  assert(workflow.includes('tools/release-gate-17118.test.mjs'));
  assert(/rak-1701\d{2}-isolated-build-/.test(workflow));
  assert(workflow.includes('Retain historical isolated-build evidence alias'));
  assert(read('CHANGELOG.md').includes('## RaK 1.7.118 (development)'));
});
