import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('1.7.115 reason-picker milestone remains active in successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.115');
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
  const wizard=read('admin-rotation-generator-wizard.js');
  const bridge=read('supabase-bridge.js');
  for(const label of ['Dovolená','Náhradní volno','Paragraf','Lékař','Odešel na kalírnu']) assert(wizard.includes(label),label);
  assert(wizard.includes('adminRotationBuildUnplannedDayModCandidate'));
  assert(bridge.includes("client.rpc('rak_admin_apply_unplanned_change_v2'"));
});

test('1.7.115 historical gates remain wired after successor releases',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/unplanned-reasons-17115.test.mjs'));
  assert(pkg.scripts.check.includes('tools/release-gate-17115.test.mjs'));
  assert(workflow.includes('tools/unplanned-reasons-17115.test.mjs'));
  assert(workflow.includes('tools/release-gate-17115.test.mjs'));
  assert(/rak-1701\d{2}-isolated-build-/.test(workflow));
  assert(read('CHANGELOG.md').includes('## RaK 1.7.115 (development)'));
});
