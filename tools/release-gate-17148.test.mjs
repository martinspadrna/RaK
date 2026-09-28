import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.148 unplanned local staffing release has one unified cache-busted identity',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.148');
  assert.equal(metadata.displayVersion,'1.7.148');
  assert.equal(metadata.buildId,'v1.7.148-unplanned-local1');
  assert(read('index.html').includes('app.js?v=1.7.148'));
  assert(read('sw.js').includes("importScripts('./rak-release-metadata.js?sw=1.7.148')"));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.148'"));
  assert.equal(JSON.parse(read('tools/performance-parity-17069.json')).current.version,'1.7.148');
  const migration=read('supabase/migrations/20260928212500_rak_unplanned_kalirna_direct_cell_17148.sql');
  assert(migration.includes('Kalirna display cell must be in soft section'));
  assert(migration.includes('Kalirna display person must appear exactly once after change'));
  const cellIndexRegex = "if coalesce(v_mod->>'cellIndex','') !~ '^[0-9]+" + '$' + "' then";
  assert(migration.includes(cellIndexRegex));
  assert.equal((migration.match(/v_result:=public\.rak_admin_save_rotation_v2/g)||[]).length,1);
  assert.equal((migration.match(/\$rak\$;/g)||[]).length,1);
  assert(!migration.includes('Kalirna person is still assigned to a machine'));
});

test('1.7.148 local staffing gates are mandatory locally and in CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const file of ['tools/kalirna-direct-cell-17148.test.mjs','tools/unplanned-local-staffing-17148.test.mjs','tools/release-gate-17148.test.mjs']){
    assert(pkg.scripts.check.includes(file));
    assert(workflow.includes(file));
  }
  assert(workflow.includes('rak-170148-isolated-build-${{ github.sha }}'));
});

test('1.7.148 remains isolated to TEST Supabase',()=>{
  const config=read('supabase-config.js');
  assert(config.includes('cgshssdjgzzuprlwnabl'));
  assert(!config.includes('bkqamcbkiwumsvelahxr'));
});
