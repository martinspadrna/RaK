import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity,RELEASE_METADATA} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('1.7.115 has one unified runtime identity',()=>{
  assert.equal(RELEASE_METADATA.displayVersion,'1.7.115');
  const metadata=assertCurrentReleaseIdentity(read,'1.7.115');
  assert.equal(metadata.buildId,'v1.7.115-unplanned-reasons1');
  assert(read('index.html').includes('rak-runtime-diagnostics.js?v=1.7.115'));
  assert(read('index.html').includes('app.js?v=1.7.115'));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.115'"));
});

test('1.7.115 exposes exactly five owner-approved unplanned reasons',()=>{
  const wizard=read('admin-rotation-generator-wizard.js');
  const bridge=read('supabase-bridge.js');
  const migration=read('supabase/migrations/20260926081926_rak_unplanned_reason_catalog_17115.sql');
  for(const label of ['Dovolená','Náhradní volno','Paragraf','Lékař','Odešel na kalírnu']) assert(wizard.includes(label),label);
  assert(wizard.includes('adminRotationBuildUnplannedDayModCandidate'));
  assert(bridge.includes("client.rpc('rak_admin_apply_unplanned_change_v2'"));
  assert(migration.includes("if v_reason not in ('D','NV','§','LEK') then"));
  assert(migration.includes("v_reason<>'kalirnaOut'"));
});

test('1.7.115 regression gates and isolated-build evidence are wired into CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/unplanned-reasons-17115.test.mjs'));
  assert(pkg.scripts.check.includes('tools/release-gate-17115.test.mjs'));
  assert(workflow.includes('tools/unplanned-reasons-17115.test.mjs'));
  assert(workflow.includes('tools/release-gate-17115.test.mjs'));
  assert(workflow.includes('rak-170115-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(workflow.includes('rak-170114-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(read('CHANGELOG.md').startsWith('## RaK 1.7.115 (development)'));
});
