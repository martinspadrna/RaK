import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('1.7.111 unplanned-change server milestone remains active in successors', () => {
  const metadata = assertCurrentReleaseIdentity(read, '1.7.111');
  assert.equal(JSON.parse(read('package.json')).version, metadata.displayVersion);
  assert(read('supabase/migrations/20260926033000_rak_unplanned_absence_generator_17111.sql').includes('rak_admin_apply_unplanned_absence_v1'));
  assert(read('supabase-bridge.js').includes('applyUnplannedAbsenceChange'));
  assert(read('admin-rotation-generator-wizard.js').includes('adminOpenUnplannedChangeDialog'));
});

test('1.7.111 safe diagnostics remain wired in successors', () => {
  const diagnostics = read('rak-runtime-diagnostics.js');
  const helper = read('tools/auth-role-diagnostic-17056.js');
  assert(diagnostics.includes('function diagnoseRejectedOperation(operation, value)'));
  assert(helper.includes("diagnoseRejectedOperation('rotation-save'"));
  assert(!helper.includes('await rejectedWriteResponse.json()'));
});

test('1.7.111 historical gate remains wired after successor releases', () => {
  const pkg = JSON.parse(read('package.json'));
  const workflow = read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/release-gate-17111.test.mjs'));
  assert(workflow.includes('tools/release-gate-17111.test.mjs'));
  assert(/rak-1701\d{2}-isolated-build-/.test(workflow));
  assert(read('CHANGELOG.md').includes('## RaK 1.7.111 (development)'));
});
