import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.98 uses one unified release identity',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.98');
  assert.equal(metadata.displayVersion,'1.7.98');
  assert.equal(metadata.technicalVersion,'1.7.98');
  assert.equal(metadata.moduleCacheVersion,'1.7.98');
  assert.equal(metadata.cacheVersion,'v1.7.98');
  assert.equal(metadata.buildId,'v1.7.98-chunked-complete-backup1');
  assert.equal(JSON.parse(read('package.json')).version,'1.7.98');
  assert(read('index.html').includes('app.js?v=1.7.98'));
  const sw=read('sw.js');
  assert(sw.includes("importScripts('./rak-release-metadata.js?sw=1.7.98');"));
  assert(sw.includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.98';"));
});

test('complete backup uses bounded manifest/table RPCs and keeps legacy only as rollback metadata',()=>{
  const app=read('rak-complete-backup.js');
  assert(app.includes("const MANIFEST_RPC_NAME = 'rak_owner_complete_backup_manifest_v2'"));
  assert(app.includes("const TABLE_RPC_NAME = 'rak_owner_complete_backup_table_v2'"));
  assert(app.includes("const LEGACY_RPC_NAME = 'rak_owner_complete_backup_v1'"));
  assert(app.includes('const MAX_PARALLEL_DB_FETCHES = 2'));
  assert(app.includes("format: 'rak-complete-backup-v1'"));
  assert(app.includes("status('Supabase tabulky: ' + completed + '/' + tableNames.length)"));
  assert(!app.includes('postBackupRpc(base, key, token, LEGACY_RPC_NAME'));
});

test('TEST migration is additive, owner-only, secret-safe and leaves v1 definition untouched',()=>{
  const sql=read('supabase/migrations/20260924194000_rak_owner_complete_backup_chunked_v2_17098.sql');
  assert(sql.includes('CREATE OR REPLACE FUNCTION public.rak_owner_complete_backup_manifest_v2()'));
  assert(sql.includes('CREATE OR REPLACE FUNCTION public.rak_owner_complete_backup_table_v2(p_table text)'));
  assert.equal((sql.match(/PERFORM private\.rak_require_admin\(true\);/g)||[]).length,2);
  assert(sql.includes("v_table = 'rak_admin_secrets'"));
  assert(sql.includes("pg_catalog.format("));
  assert(sql.includes("public.%I"));
  assert(sql.includes('REVOKE ALL ON FUNCTION public.rak_owner_complete_backup_manifest_v2() FROM PUBLIC,anon,authenticated'));
  assert(sql.includes('REVOKE ALL ON FUNCTION public.rak_owner_complete_backup_table_v2(text) FROM PUBLIC,anon,authenticated'));
  assert(!sql.includes('CREATE OR REPLACE FUNCTION public.rak_owner_complete_backup_v1()'));
  assert(!sql.includes('DROP FUNCTION public.rak_owner_complete_backup_v1'));
});

test('runtime VM regression exercises chunk assembly and forbidden-table failure',()=>{
  const pkg=JSON.parse(read('package.json'));
  const unit=read('tools/complete-backup-chunked-17098.test.mjs');
  assert(pkg.scripts.check.includes('tools/complete-backup-chunked-17098.test.mjs'));
  assert(unit.includes("assert.equal(snapshot.format,'rak-complete-backup-v1')"));
  assert(unit.includes("assert.equal(calls.some(x=>x.name==='rak_owner_complete_backup_v1'),false)"));
  assert(unit.includes("await assert.rejects"));
});

test('mandatory CI and npm check execute the 1.7.98 gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(workflow.includes('node --test tools/release-gate-17098.test.mjs'));
  assert(pkg.scripts.check.includes('tools/release-gate-17098.test.mjs'));
  assert(workflow.includes('rak-17098-isolated-build-'+'$'+'{{ github.sha }}'));
});
