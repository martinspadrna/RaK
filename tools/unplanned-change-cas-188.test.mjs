import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const lateMigration='supabase/migrations/20260928212500_rak_unplanned_kalirna_direct_cell_17148.sql';
const repairMigration='supabase/migrations/20260930112049_rak_unplanned_change_cas_nonretryable_188.sql';

test('1.8.8 repairs the CAS SQLSTATE reintroduced by the final 1.7.148 function replacement',()=>{
  const late=read(lateMigration);
  const repair=read(repairMigration);
  assert(late.includes("errcode='40001'"),'1.7.148 regression evidence must remain explicit');
  assert(repair.includes("rak_admin_apply_unplanned_change_v2(text,jsonb,jsonb,bigint,uuid,text,text,text,text,jsonb)"));
  assert(repair.includes("replace(v_definition, '''40001''', '''P0001''')"));
  assert(repair.includes("position('40001' in v_definition) > 0"));
  assert(repair.includes("position('P0001' in v_definition) = 0"));
  assert(repair.includes("CAS SQLSTATE repair did not stick"));
  assert(repair.includes("NOTIFY pgrst, 'reload schema'"));
});

test('1.8.8 CAS repair is forward-only and narrowly scoped',()=>{
  const repair=read(repairMigration);
  assert(!repair.includes('DROP FUNCTION'));
  assert(!repair.includes('DROP TABLE'));
  assert(!repair.includes('cgshssdjgzzuprlwnabl'));
  assert(!repair.includes('bkqamcbkiwumsvelahxr'));
  assert.equal((repair.match(/EXECUTE v_repaired/g)||[]).length,1);
});

test('1.8.8 production operations bundle is fail-closed and never embeds calendar secrets',()=>{
  const preflight=read('supabase/ops/production_preflight_188.sql');
  const postcheck=read('supabase/ops/production_postcheck_188.sql');
  const rollback=read('supabase/ops/rollback_188_restore_legacy_v2_writers.sql');
  for(const sql of [preflight,postcheck,rollback]){
    assert(!sql.includes('/private-'));
    assert(!sql.includes('basic.ics'));
  }
  assert(preflight.includes("supabase_migrations.schema_migrations"));
  assert(preflight.includes("still_compatible_with_1_7_83"));
  assert(preflight.includes("installed_version IS NOT NULL AS installed"));
  assert(postcheck.includes("no_retryable_40001"));
  assert(postcheck.includes("has_nonretryable_p0001"));
  assert(postcheck.includes("Revision-aware RaK client required"));
  assert(rollback.includes("settings.save.legacy_v2"));
  assert(rollback.includes("rotation.month_entries.save.legacy_v2"));
  assert(rollback.includes("Legacy v2 rollback grants are incomplete"));
  assert(!rollback.includes('DROP TABLE'));
});

test('1.8.8 production calendar prerequisite and runbook stay secret-free',()=>{
  const prerequisite=read('supabase/ops/production_calendar_prerequisite_188.sql');
  const runbook=read('supabase/ops/PRODUCTION_ROLLOUT_188.md');
  assert(prerequisite.includes('CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions'));
  assert(prerequisite.includes('vault.create_secret()'));
  assert(runbook.includes('20260930112049_rak_unplanned_change_cas_nonretryable_188.sql'));
  assert(runbook.includes('rollback_188_restore_legacy_v2_writers.sql'));
  for(const text of [prerequisite,runbook]){
    assert(!text.includes('/private-'));
    assert(!text.includes('basic.ics'));
  }
});
