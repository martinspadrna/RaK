import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('1.7.119 remains a historical milestone while successors preserve its unplanned-change scope',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.119');
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
  assert(read('CHANGELOG.md').includes('## RaK 1.7.119 (development)'));
});

test('1.7.119 keeps five reasons, Kalírna availability and compact popup in successors',()=>{
  const wizard=read('admin-rotation-generator-wizard.js');
  const rotation=read('admin-rotation.js');
  const start=wizard.indexOf('const ADMIN_UNPLANNED_REASON_OPTIONS');
  const end=wizard.indexOf('\nfunction adminRotationUnplannedReasonOption',start);
  const block=wizard.slice(start,end);
  const values=[...block.matchAll(/value: '([^']+)'/g)].map(m=>m[1]);
  assert.deepEqual(values,['D','NV','§','LEK','kalirnaOut']);
  assert(rotation.includes('const absent = adminRotationUnavailableNamesForDate(month, dateLabel, knownNames);'));
  assert(wizard.includes('height:auto!important'));
  assert(wizard.includes('max-height:calc(100dvh - 28px - env(safe-area-inset-top) - env(safe-area-inset-bottom))'));
});

test('1.7.119 regression gate remains wired after successor releases',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/release-gate-17119.test.mjs'));
  assert(workflow.includes('tools/release-gate-17119.test.mjs'));
  assert(/rak-1701\d{2}-isolated-build-/.test(workflow));
  assert(workflow.includes('Retain historical isolated-build evidence alias'));
  assert(read('CHANGELOG.md').includes('## RaK 1.7.119 (development)'));
});
