import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('1.7.120 remains a historical milestone while successors preserve local unplanned reflow',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.120');
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
  assert(read('CHANGELOG.md').includes('## RaK 1.7.120 (development)'));
});

test('1.7.120 scoped reflow protections remain present in successors',()=>{
  const rotation=read('admin-rotation.js');
  const wizard=read('admin-rotation-generator-wizard.js');
  assert(rotation.includes('const scopedGeneration = scopedDateLabels.length > 0;'));
  assert(rotation.includes("const tnksBalance = scopedGeneration ? scopedNoop()"));
  assert.equal((wizard.match(/scopedDateLabels: allowedDateLabels/g)||[]).length,2);
  assert((wizard.match(/adminRotationUnplannedIssueTouchesSelectedDate\(issue, allowedDateLabels\)/g)||[]).length >= 3);
  assert(wizard.includes(': při čtyřech lidech na MO musí být 3 soustruhy a 1 fréza.'));
});

test('1.7.120 regression gate remains wired after successor releases',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/release-gate-17120.test.mjs'));
  assert(workflow.includes('tools/release-gate-17120.test.mjs'));
  assert(/rak-1701\d{2}-isolated-build-/.test(workflow));
  assert(read('CHANGELOG.md').includes('## RaK 1.7.120 (development)'));
});
