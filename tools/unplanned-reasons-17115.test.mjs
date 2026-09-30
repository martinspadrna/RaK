import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const wizard = read('admin-rotation-generator-wizard.js');
const bridge = read('supabase-bridge.js');
const migration = read('supabase/migrations/20260926081926_rak_unplanned_reason_catalog_17115.sql');

test('1.7.115 five owner-approved reasons remain exact in successors', () => {
  const start = wizard.indexOf('const ADMIN_UNPLANNED_REASON_OPTIONS');
  const end = wizard.indexOf('\nfunction adminRotationUnplannedReasonOption', start);
  assert(start >= 0 && end > start);
  const block = wizard.slice(start, end);
  const values = [...block.matchAll(/value: '([^']+)'/g)].map((m) => m[1]);
  const labels = [...block.matchAll(/label: '([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(values, ['D','NV','§','LEK','kalirnaOut']);
  assert.deepEqual(labels, ['Dovolená','Náhradní volno','Paragraf','Lékař','Odešel na kalírnu']);
  assert(wizard.includes('<select id="adminUnplannedReason" class="appMenuSelect">'));
  assert(!wizard.includes('adminUnplannedReasonOptions'), 'old free-text datalist returned');
});

test('1.7.115 Kalírna remains a dayMod rather than an absence note', () => {
  const start = wizard.indexOf('function adminRotationBuildUnplannedDayModCandidate(');
  const end = wizard.indexOf('\nfunction adminRotationUnplannedOperationId(', start);
  assert(start >= 0 && end > start);
  const block = wizard.slice(start, end);
  assert(block.includes("type: 'kalirnaOut'"));
  assert(block.includes("changeKind: 'daymod'"));
  assert(!block.includes('adminRotationUnplannedApplyAbsenceNotes('), 'Kalírna must not become an absence note');
});

test('1.7.115 client/server reason catalog remains locked to four absences plus Kalírna', () => {
  const start = bridge.indexOf('async function applyUnplannedChange(');
  const end = bridge.indexOf('\n  async function listRotationBackups(', start);
  assert(start >= 0 && end > start);
  const block = bridge.slice(start, end);
  assert(block.includes("['D','NV','§','LEK'].includes(reason)"));
  assert(block.includes("changeKind === 'daymod' && reason === 'kalirnaOut'"));
  assert(block.includes("client.rpc('rak_admin_apply_unplanned_change_v2'"));
  assert(migration.includes("if v_reason not in ('D','NV','§','LEK') then"));
  assert(migration.includes("v_reason<>'kalirnaOut'"));
});
