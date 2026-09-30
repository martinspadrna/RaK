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
