import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity,RELEASE_METADATA} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('1.7.116 has one unified runtime identity',()=>{
  assert.equal(RELEASE_METADATA.displayVersion,'1.7.116');
  const metadata=assertCurrentReleaseIdentity(read,'1.7.116');
  assert.equal(metadata.buildId,'v1.7.116-kalirna-reflow1');
  assert(read('index.html').includes('rak-runtime-diagnostics.js?v=1.7.116'));
  assert(read('index.html').includes('app.js?v=1.7.116'));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.116'"));
});

test('1.7.116 makes Kalírna unavailable to the existing generator without turning it into absence',()=>{
  const rotation=read('admin-rotation.js');
  const wizard=read('admin-rotation-generator-wizard.js');
  const migration=read('supabase/migrations/20260926094214_rak_unplanned_kalirna_reflow_17116.sql');
  assert(rotation.includes('function adminRotationUnavailableNamesForDate('));
  assert(rotation.includes("String(mod.type || '').trim() !== 'kalirnaOut'"));
  assert(wizard.includes('adminRotationUnplannedGenerationSeed(candidate)'));
  assert(wizard.includes('adminRotationUnplannedSpliceGeneratedDays(candidate, generated.normalized, allowedDateLabels)'));
  assert(!wizard.slice(wizard.indexOf('function adminRotationBuildUnplannedDayModCandidate('),wizard.indexOf('\nfunction adminRotationUnplannedOperationId(')).includes('adminRotationUnplannedApplyAbsenceNotes('));
  assert(migration.includes('Kalirna person is still assigned to a machine'));
});

test('1.7.116 regression gate and evidence are wired into CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/unplanned-kalirna-17116.test.mjs'));
  assert(pkg.scripts.check.includes('tools/release-gate-17116.test.mjs'));
  assert(workflow.includes('tools/unplanned-kalirna-17116.test.mjs'));
  assert(workflow.includes('tools/release-gate-17116.test.mjs'));
  assert(workflow.includes('rak-170116-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(workflow.includes('rak-170115-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(read('CHANGELOG.md').startsWith('## RaK 1.7.116 (development)'));
});
