import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity,RELEASE_METADATA} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('1.7.118 has one unified runtime identity',()=>{
  assert.equal(RELEASE_METADATA.displayVersion,'1.7.118');
  const metadata=assertCurrentReleaseIdentity(read,'1.7.118');
  assert.equal(metadata.buildId,'v1.7.118-three-absence-only1');
  assert(read('index.html').includes('rak-runtime-diagnostics.js?v=1.7.118'));
  assert(read('index.html').includes('app.js?v=1.7.118'));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.118'"));
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

test('1.7.118 regression gate and evidence are wired into CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/release-gate-17118.test.mjs'));
  assert(workflow.includes('tools/release-gate-17118.test.mjs'));
  assert(workflow.includes('rak-170118-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(workflow.includes('rak-170117-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(read('CHANGELOG.md').startsWith('## RaK 1.7.118 (development)'));
});
