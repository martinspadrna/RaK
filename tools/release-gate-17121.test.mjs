import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('1.7.121 remains a historical milestone while successors keep generator options forwarding',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.121');
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
  assert(read('CHANGELOG.md').includes('## RaK 1.7.121 (development)'));
});

test('1.7.121 runtime wrapper fix remains present in successors',()=>{
  const readiness=read('module-readiness.js');
  const wizard=read('admin-rotation-generator-wizard.js');
  assert(readiness.includes('adminGenerateRotationMonthDraftWithMonthKeyContext(monthKey, preparedMonth, generationOptions)'));
  assert(readiness.includes('return original(monthKey, preparedMonth, generationOptions);'));
  assert(!readiness.includes('return original(monthKey, preparedMonth);'));
  assert.equal((wizard.match(/scopedDateLabels: allowedDateLabels/g)||[]).length,2);
});

test('1.7.121 regression gate remains wired after successor releases',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/unplanned-generator-options-17121.test.mjs'));
  assert(pkg.scripts.check.includes('tools/release-gate-17121.test.mjs'));
  assert(workflow.includes('tools/unplanned-generator-options-17121.test.mjs'));
  assert(workflow.includes('tools/release-gate-17121.test.mjs'));
  assert(/rak-1701\d{2}-isolated-build-/.test(workflow));
  assert(read('CHANGELOG.md').includes('## RaK 1.7.121 (development)'));
});
