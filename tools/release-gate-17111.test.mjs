import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity, RELEASE_METADATA} from './release-metadata-test-helper.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('1.7.111 has one unified runtime identity', () => {
  assert.equal(RELEASE_METADATA.displayVersion, '1.7.111');
  const metadata = assertCurrentReleaseIdentity(read, '1.7.111');
  assert.equal(metadata.buildId, 'v1.7.111-unplanned-diagnostics1');
  assert(read('index.html').includes('rak-runtime-diagnostics.js?v=1.7.111'));
  assert(read('index.html').includes('app.js?v=1.7.111'));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.111'"));
});

test('WhatsApp message omits the redundant word směna but keeps human Czech shift labels', () => {
  for (const file of ['rak-shift-report-image.js','rak-shift-report-share.js']) {
    const source = read(file);
    assert(source.includes("return 'RaK – Report směny diferenciály · ' + date + ' · ' + shift;"));
    assert(!source.includes("return 'RaK – Report směny diferenciály · ' + date + ' · směna ' + shift;"));
    assert(source.includes("return ({ N: 'Noční', R: 'Ranní', N8: 'Noční 8 h', R8: 'Ranní 8 h' })"));
  }
});

test('unplanned absence generator and server migration are mandatory release evidence', () => {
  const pkg = JSON.parse(read('package.json'));
  const workflow = read('.github/workflows/rak-development-validation.yml');
  const migration = read('supabase/migrations/20260926033000_rak_unplanned_absence_generator_17111.sql');
  assert(pkg.scripts.check.includes('tools/unplanned-absence-17111.test.mjs'));
  assert(workflow.includes('tools/unplanned-absence-17111.test.mjs'));
  assert(migration.includes('rak_admin_apply_unplanned_absence_v1'));
  assert(migration.includes('private.rak_unplanned_absence_ops_v1'));
  assert(read('supabase-bridge.js').includes('applyUnplannedAbsenceChange'));
  assert(read('admin-rotation-generator-wizard.js').includes('adminOpenUnplannedChangeDialog'));
});

test('sanitized rejected-operation diagnostics are wired through the actual signed TEST role probe', () => {
  const diagnostics = read('rak-runtime-diagnostics.js');
  const helper = read('tools/auth-role-diagnostic-17056.js');
  const renderer = read('app-menu-admin-renderer.js');
  assert(diagnostics.includes('function diagnoseRejectedOperation(operation, value)'));
  assert(helper.includes("diagnoseRejectedOperation('rotation-save'"));
  assert(helper.includes("p_payload: []"));
  assert(renderer.includes("diagnoseRejectedOperation('rotation-save'"));
  assert(!helper.includes('await rejectedWriteResponse.json()'));
});

test('1.7.111 regression gate and evidence are wired into CI', () => {
  const pkg = JSON.parse(read('package.json'));
  const workflow = read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/release-gate-17111.test.mjs'));
  assert(pkg.scripts.check.includes('tools/rejected-operation-diagnostics-17111.test.mjs'));
  assert(workflow.includes('tools/release-gate-17111.test.mjs'));
  assert(workflow.includes('tools/rejected-operation-diagnostics-17111.test.mjs'));
  assert(workflow.includes('rak-170111-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(workflow.includes('rak-170110-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(read('CHANGELOG.md').startsWith('## RaK 1.7.111 (development)'));
});
