import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const version = '1.7.42';
const build = 'v1.7.42-privatebackup1';
test('owner backup fails closed when private archive missing or widened', () => {
  const source = read('rak-complete-backup.js');
  assert(source.includes('// RAK_PRIVATE_IMPORT_BACKUP_17042'));
  assert(source.includes("privateKeys.length !== 1 || privateKeys[0] !== 'rak_rotation_import_metadata_v1'"));
  assert(source.includes('if (!Array.isArray(imported) || imported.some('));
  assert(source.includes("'supabase/data/private/rak_rotation_import_metadata_v1.json'"));
});
test('ZIP snapshot exports private rows, preserves public files, rejects missing or unexpected private tables', () => {
  const source = read('rak-complete-backup.js');
  const begin = source.indexOf('  function addSupabaseSnapshotFiles(zip, snapshot) {');
  const end = source.indexOf('  async function addStorageObjectBytes', begin);
  assert(begin >= 0 && end > begin, 'snapshot function boundaries');
  const add = new Function('addJson', 'safePart', 'sqlFromDefinitions',
    source.slice(begin, end) + '\nreturn addSupabaseSnapshotFiles;')(
      (zip, path, value) => zip.file(path, JSON.stringify(value)), value => value, () => ''
    );
  const files = new Map();
  const zip = {file: (path, contents) => files.set(path, contents)};
  const row = {rotation_key:'main',month_key:'2026-09',import_metadata:{source:'test'},archived_at:'2026-09-19T00:00:00Z'};
  const snapshot = {data:{public:{rotation_state:[{key:'main'}]},
    private:{rak_rotation_import_metadata_v1:[row]}, auth:{},storage:{}},schema:{}};
  assert.equal(add(zip,snapshot), 1);
  assert.deepEqual(JSON.parse(files.get('supabase/data/private/rak_rotation_import_metadata_v1.json')),[row]);
  assert.deepEqual(JSON.parse(files.get('supabase/data/public/rotation_state.json')),[{key:'main'}]);
  assert.deepEqual(JSON.parse(files.get('supabase/complete-snapshot.json')),snapshot);
  assert.throws(()=>add(zip,{...snapshot,data:{...snapshot.data,private:{}}}),/soukromý archiv/);
  assert.throws(()=>add(zip,{...snapshot,data:{...snapshot.data,private:{...snapshot.data.private,rak_login_lookup_salt:[{}]}}}),/soukromý archiv/);
  assert.throws(()=>add(zip,{...snapshot,data:{...snapshot.data,private:{rak_rotation_import_metadata_v1:[{}]}}}),/neplatná soukromá/);
});
test('restore instructions and manifest include recoverable private import metadata', () => {
  const source = read('rak-complete-backup.js');
  assert(source.includes('snapshot.data.private.rak_rotation_import_metadata_v1.length'));
  assert(source.includes('privateImportRows: 0'));
  // 1.7.55 corrects the historic unsafe order (data before Auth). Keep both
  // the original 1.7.42 stage and the later Auth-first recovery testable.
  const oldGuide = source.includes('4a. Obnov také supabase/data/private/');
  const authFirstGuide = source.includes('RAK_17055_RESTORE_ORDER_GUARD')
    && source.includes('8. Obnov soukromá metadata importů ze supabase/data/private/rak_rotation_import_metadata_v1.json')
    && source.includes('4. NEJDŘÍV v novém projektu znovu vytvoř administrátorské Auth účty');
  assert(oldGuide || authFirstGuide, 'recoverable private import metadata must appear in the restoration guide');
  assert(source.includes('soukr') || source.includes('Soukrom'));
});
test('migration preserves owner authorization, excludes login salts and tests transaction rollback', () => {
  const sql = read('supabase/migrations/20260919132743_rak_owner_complete_backup_include_private_rotation_import_provenance.sql');
  const matrix = read('tools/private-import-backup-17042.sql');
  assert(sql.includes('rak_require_admin(true)') && sql.includes('rak_rotation_import_metadata_v1'));
  assert(!sql.includes("''rak_login_lookup_salt'',"));
  assert(matrix.includes('SET LOCAL ROLE anon;') && matrix.includes('ROLLBACK;'));
  assert(matrix.includes('Private archive row loss in JSON snapshot'));
});
test('OS-number login unchanged; exact preview build and second-pass guards intact', () => {
  const config = read('supabase-config.js');
  assert(config.includes('cgshssdjgzzuprlwnabl') && !config.includes('bkqamcbkiwumsvelahxr'));
  assert(config.includes(`window.RAK_RELEASE_VERSION = "${version}";`));
  assert(read('index.html').includes(`var build='${build}';`));
  assert(read('sw.js').includes(`const CACHE_VERSION = 'v${version}';`));
  assert.equal(JSON.parse(read('package.json')).version, '1.7.0');
  const stage = read('tools/shift-report-mo-hotfix-170-smoke.mjs');
  for (const n of ['17039','17040','17041','17042'])
    assert(stage.includes(`// RAK_${n}_TWO_PASS_GUARD`));
});
