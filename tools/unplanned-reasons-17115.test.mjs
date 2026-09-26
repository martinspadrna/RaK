import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const wizard = read('admin-rotation-generator-wizard.js');
const bridge = read('supabase-bridge.js');
const migration = read('supabase/migrations/20260926081926_rak_unplanned_reason_catalog_17115.sql');

function extractFunction(source, name, nextName) {
  const start = source.indexOf('function ' + name + '(');
  assert(start >= 0, 'missing function ' + name);
  const end = source.indexOf('\nfunction ' + nextName + '(', start);
  assert(end > start, 'missing function boundary ' + name + ' -> ' + nextName);
  return source.slice(start, end);
}

test('unplanned reason picker contains exactly the five owner-approved choices', () => {
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

test('Kalírna candidate changes only matching dayMods and leaves rows/notes intact', () => {
  const context = vm.createContext({
    JSON, Set, Array, String, Number, Error,
    adminRotationUnplannedDateLabels: () => ['1.10. R','2.10. R'],
    adminRotationUnplannedDateIndex: (labels, value) => labels.indexOf(String(value || '')),
    adminGetKnownNames: () => ['Blažek','Kříž'],
    adminRotationCanonicalName: (value, names) => names.includes(String(value || '').trim()) ? String(value || '').trim() : '',
    adminRotationUnplannedReasonOption: (value) => value === 'kalirnaOut' ? {value:'kalirnaOut',label:'Odešel na kalírnu',kind:'daymod'} : null
  });
  vm.runInContext(extractFunction(wizard, 'adminRotationUnplannedFindAssignment', 'adminRotationBuildUnplannedDayModCandidate'), context);
  vm.runInContext(extractFunction(wizard, 'adminRotationBuildUnplannedDayModCandidate', 'adminRotationUnplannedOperationId'), context);

  const source = {
    hard:{machines:['H1'],rows:[
      {date:'1.10. R',cells:['Blažek']},
      {date:'2.10. R',cells:['Blažek']}
    ]},
    soft:{machines:['S1'],rows:[
      {date:'1.10. R',cells:['Kříž']},
      {date:'2.10. R',cells:['Kříž']}
    ]},
    notes:[{date:'1.10. R',person:'Kříž',code:'D'}],
    dayMods:[
      {section:'hard',date:'1.10. R',cellIndex:0,person:'Blažek',type:'leaveEarly'},
      {section:'soft',date:'1.10. R',cellIndex:0,person:'Kříž',type:'kalirnaOut'}
    ],
    untouched:{x:1}
  };
  const before = JSON.stringify(source);
  const out = context.adminRotationBuildUnplannedDayModCandidate('10/26', source, {
    fromDate:'1.10. R',toDate:'2.10. R',person:'Blažek',reason:'kalirnaOut'
  });
  assert.equal(JSON.stringify(source), before, 'source month mutated');
  assert.equal(out.changeKind, 'daymod');
  assert.equal(out.reason, 'kalirnaOut');
  assert.deepEqual(JSON.parse(JSON.stringify(out.month.hard)), source.hard);
  assert.deepEqual(JSON.parse(JSON.stringify(out.month.soft)), source.soft);
  assert.deepEqual(JSON.parse(JSON.stringify(out.month.notes)), source.notes);
  assert.deepEqual(JSON.parse(JSON.stringify(out.month.untouched)), source.untouched);
  const blazek = out.month.dayMods.filter((m) => m.person === 'Blažek');
  assert.equal(blazek.length, 2);
  assert(blazek.every((m) => m.type === 'kalirnaOut'));
  assert.equal(out.month.dayMods.filter((m) => m.person === 'Kříž').length, 1);
});

test('client v2 path accepts only four absences or Kalírna and sends change kind to RPC', () => {
  const start = bridge.indexOf('async function applyUnplannedChange(');
  const end = bridge.indexOf('\n  async function listRotationBackups(', start);
  assert(start >= 0 && end > start);
  const block = bridge.slice(start, end);
  assert(block.includes("['D','NV','§','LEK'].includes(reason)"));
  assert(block.includes("changeKind === 'daymod' && reason === 'kalirnaOut'"));
  assert(block.includes("client.rpc('rak_admin_apply_unplanned_change_v2'"));
  assert(block.includes('p_change_kind: changeKind'));
  assert(block.includes('p_expected_revision: state.rotationRevision'));
  assert(block.includes('p_operation_id: operationId'));
  for (const forbidden of ['queuePendingWrite','enqueue','restoreRotationBackup','flushPendingWrites']) {
    assert(!block.includes(forbidden), 'v2 partial write unexpectedly touches ' + forbidden);
  }
});

test('server v2 enforces the same exact catalog and protects unrelated dayMods', () => {
  for (const marker of [
    "if v_reason not in ('D','NV','§','LEK') then",
    "if v_kind<>'daymod' or v_reason<>'kalirnaOut' then",
    'Day exception may modify only dayMods',
    'Day exception touched unrelated dayMods',
    'Each selected day must contain exactly one Kalirna exception',
    'Kalirna person is not assigned in selected source cell',
    'pg_advisory_xact_lock',
    "errcode='40001'",
    'perform private.rak_require_admin(false)',
    'grant execute on function public.rak_admin_apply_unplanned_change_v2',
    'to authenticated'
  ]) assert(migration.includes(marker), 'missing server guard: ' + marker);
  assert(migration.includes('from public,anon'));
  assert(!/grant execute[\s\S]{0,220}\bto\s+anon\b/i.test(migration), 'anon execute grant leaked');
});
