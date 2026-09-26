import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('1.7.123 remains a historical milestone while successors keep unified identity',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.123');
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
  assert(read('CHANGELOG.md').includes('## RaK 1.7.123 (development)'));
});

test('1.7.123 Kalírna minimum-change reflow remains present in successors',()=>{
  const wizard=read('admin-rotation-generator-wizard.js');
  assert(wizard.includes('function adminRotationUnplannedTryMinimalKalirnaSoftReflow('));
  assert(wizard.includes('const fallbackDateLabels = [];'));
  assert(wizard.includes('adminRotationUnplannedTryMinimalKalirnaSoftReflow(sourceMonth, regenerated, date, person, knownNames)'));
  assert(wizard.includes('if (fallbackDateLabels.length)'));
  assert(wizard.includes('scopedDateLabels: fallbackDateLabels'));
  assert(wizard.includes('movedPeople < best.movedPeople'));
  assert(wizard.includes('movedLathePeople < best.movedLathePeople'));
});

test('1.7.123 regression gate remains wired after successor releases',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const name of ['tools/unplanned-kalirna-minimal-17123.test.mjs','tools/release-gate-17123.test.mjs']){
    assert(pkg.scripts.check.includes(name),name);
    assert(workflow.includes(name),name);
  }
  assert(/rak-1701\d{2}-isolated-build-/.test(workflow));
  assert(read('CHANGELOG.md').includes('## RaK 1.7.123 (development)'));
});
