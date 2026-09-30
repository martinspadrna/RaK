import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('1.7.116 Kalírna reflow milestone remains active in successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.116');
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
  const rotation=read('admin-rotation.js');
  const wizard=read('admin-rotation-generator-wizard.js');
  const migration=read('supabase/migrations/20260926094214_rak_unplanned_kalirna_reflow_17116.sql');
  assert(rotation.includes('function adminRotationUnavailableNamesForDate('));
  assert(rotation.includes("String(mod.type || '').trim() !== 'kalirnaOut'"));
  assert(wizard.includes('adminRotationUnplannedGenerationSeed(candidate)'));
  assert(migration.includes('Kalirna person is still assigned to a machine'));
});

test('1.7.116 historical gate remains wired after successor releases',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/unplanned-kalirna-17116.test.mjs'));
  assert(pkg.scripts.check.includes('tools/release-gate-17116.test.mjs'));
  assert(workflow.includes('tools/unplanned-kalirna-17116.test.mjs'));
  assert(workflow.includes('tools/release-gate-17116.test.mjs'));
  assert(/rak-1701\d{2}-isolated-build-/.test(workflow));
  assert(read('CHANGELOG.md').includes('## RaK 1.7.116 (development)'));
});
