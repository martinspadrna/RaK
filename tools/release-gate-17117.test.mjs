import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity,RELEASE_METADATA} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('1.7.117 has one unified runtime identity',()=>{
  assert.equal(RELEASE_METADATA.displayVersion,'1.7.117');
  const metadata=assertCurrentReleaseIdentity(read,'1.7.117');
  assert.equal(metadata.buildId,'v1.7.117-tpkw02-four-absence1');
  assert(read('index.html').includes('rak-runtime-diagnostics.js?v=1.7.117'));
  assert(read('index.html').includes('app.js?v=1.7.117'));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.117'"));
});

test('TPKW02 remains empty for both three and four absences',()=>{
  const generator=read('admin-rotation-generator.js');
  const rotation=read('admin-rotation.js');
  assert(generator.includes('function adminRotationGeneratorTpkw02ClosedForStaffing('));
  assert(generator.includes('return missing === 3 || missing === 4;'));
  assert(generator.includes("adminRotationGeneratorTpkw02ClosedForStaffing(knownNames, available) && machineName === 'TPKW02'"));
  assert(rotation.includes('(absent.size !== 3 && absent.size !== 4)'));
  assert(rotation.includes("Při čtyřech absencích: 4 TO (bez TPKW02), 2 MO (MSKC03, MFKF10)."));
});

test('1.7.117 regression gate and evidence are wired into CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/staffing-shortage-17117.test.mjs'));
  assert(pkg.scripts.check.includes('tools/release-gate-17117.test.mjs'));
  assert(workflow.includes('tools/staffing-shortage-17117.test.mjs'));
  assert(workflow.includes('tools/release-gate-17117.test.mjs'));
  assert(workflow.includes('rak-170117-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(workflow.includes('rak-170116-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(read('CHANGELOG.md').startsWith('## RaK 1.7.117 (development)'));
});
