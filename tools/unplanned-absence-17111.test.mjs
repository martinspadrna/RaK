import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const wizard = read('admin-rotation-generator-wizard.js');
const rotation = read('admin-rotation.js');
const editor = read('admin-rotation-editor.js');
const bridge = read('supabase-bridge.js');
const renderer = read('app-menu-admin-renderer.js');
const migration = read('supabase/migrations/20260926033000_rak_unplanned_absence_generator_17111.sql');

function extractFunction(source, name, nextName) {
  const start = source.indexOf('function ' + name + '(');
  assert(start >= 0, 'missing function ' + name);
  const end = source.indexOf('\nfunction ' + nextName + '(', start);
  assert(end > start, 'missing function boundary ' + name + ' -> ' + nextName);
  return source.slice(start, end);
}

test('unplanned-change server RPC is admin-only, CAS-bound, idempotent and day-scoped', () => {
  for (const marker of [
    'create table if not exists private.rak_unplanned_absence_ops_v1',
    'primary key (user_id, operation_id)',
    'pg_advisory_xact_lock',
    'Operation id was already used for a different request',
    "errcode='40001'",
    'Unplanned change touched a non-selected day',
    'Unplanned change touched unrelated absences',
    'Each selected day must contain exactly one absence for the selected person',
    "public.rak_admin_save_rotation_v2(",
    "grant execute on function public.rak_admin_apply_unplanned_absence_v1",
    'to authenticated'
  ]) assert(migration.toLowerCase().includes(marker.toLowerCase()), 'missing SQL guard: ' + marker);
  assert(migration.includes('perform private.rak_require_admin(false)'));
  assert(migration.includes('from public,anon'));
  assert(!/grant execute[\s\S]{0,180}\bto\s+anon\b/i.test(migration), 'anon execute grant leaked');
});

test('partial generator never persists a full generated draft and explicitly protects non-target days', () => {
  assert(rotation.includes('generationOptions.ignoreDom === true'));
  assert(rotation.includes('generationOptions.persistPending !== false'));
  assert(wizard.includes("adminGenerateRotationMonthDraft(monthKey, seed, { ignoreDom: true, persistPending: false })"));
  assert(wizard.includes('adminRotationUnplannedAssertIsolation(original, candidate, allowedDateLabels)'));
  assert(wizard.includes("throw new Error('Částečný přepočet sáhl na jiný den: ' + date + '.')"));
  assert(editor.includes('adminRotationQuickUnplannedBtn'));
  assert(editor.includes("adminOpenUnplannedChangeDialog(target)"));
  assert(renderer.includes('klikni přímo na jméno v konkrétním dni a zvol Neplánovaná změna'));
});

test('splicing generated days changes only allowlisted rows', () => {
  const context = vm.createContext({ JSON, Set, Map, Error, Array, String });
  vm.runInContext(extractFunction(wizard, 'adminRotationUnplannedSpliceGeneratedDays', 'adminRotationUnplannedAssertIsolation'), context);
  vm.runInContext(extractFunction(wizard, 'adminRotationUnplannedAssertIsolation', 'adminRotationUnplannedIssueKey'), context);

  const source = {
    hard: { title:'H', machines:['A'], rows:[
      { date:'1. 10. R', cells:['Původní A'], tag:'keep-a' },
      { date:'2. 10. R', cells:['Původní B'], tag:'keep-b' }
    ]},
    soft: { title:'S', machines:['B'], rows:[
      { date:'1. 10. R', cells:['Původní C'], tag:'keep-c' },
      { date:'2. 10. R', cells:['Původní D'], tag:'keep-d' }
    ]},
    notes:[{date:'1. 10. R',person:'Jiný',code:'D'}],
    untouched:{value:42}
  };
  const generated = {
    hard:{rows:[
      {date:'1. 10. R',cells:['NOVÉ A']},
      {date:'2. 10. R',cells:['NOVÉ B']}
    ]},
    soft:{rows:[
      {date:'1. 10. R',cells:['NOVÉ C']},
      {date:'2. 10. R',cells:['NOVÉ D']}
    ]}
  };
  const before = JSON.stringify(source);
  const result = context.adminRotationUnplannedSpliceGeneratedDays(source, generated, ['2. 10. R']);
  assert.equal(JSON.stringify(source), before, 'source month mutated');
  assert.deepEqual(JSON.parse(JSON.stringify(result.hard.rows[0])), source.hard.rows[0]);
  assert.deepEqual(JSON.parse(JSON.stringify(result.soft.rows[0])), source.soft.rows[0]);
  assert.deepEqual(JSON.parse(JSON.stringify(result.hard.rows[1])), {date:'2. 10. R',cells:['NOVÉ B'],tag:'keep-b'});
  assert.deepEqual(JSON.parse(JSON.stringify(result.soft.rows[1])), {date:'2. 10. R',cells:['NOVÉ D'],tag:'keep-d'});
  assert.equal(JSON.stringify(result.notes), JSON.stringify(source.notes));
  assert.equal(JSON.stringify(result.untouched), JSON.stringify(source.untouched));
  assert.equal(context.adminRotationUnplannedAssertIsolation(source, result, ['2. 10. R']), true);

  const bad = JSON.parse(JSON.stringify(result));
  bad.hard.rows[0].cells[0] = 'NESMÍ';
  assert.throws(() => context.adminRotationUnplannedAssertIsolation(source, bad, ['2. 10. R']), /jiný den/);
});

test('client write uses one idempotent RPC and does not enqueue or touch recovery paths', () => {
  const start = bridge.indexOf('async function applyUnplannedAbsenceChange(');
  const end = bridge.indexOf('\n  async function listRotationBackups(', start);
  assert(start >= 0 && end > start);
  const block = bridge.slice(start, end);
  assert(block.includes("client.rpc('rak_admin_apply_unplanned_absence_v1'"));
  assert(block.includes('p_expected_revision: state.rotationRevision'));
  assert(block.includes('p_operation_id: operationId'));
  assert(block.includes('p_allowed_date_labels: allowedDateLabels'));
  assert(block.includes("attempts: 2"));
  for (const forbidden of ['queuePendingWrite','enqueue','restoreRotationBackup','flushPendingWrites']) {
    assert(!block.includes(forbidden), 'partial write unexpectedly touches ' + forbidden);
  }
});
