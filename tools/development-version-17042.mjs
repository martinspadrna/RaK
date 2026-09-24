#!/usr/bin/env node
// RaK 1.7.42: owner-only complete backup now preserves private Excel import provenance.
// Employee sign-in remains OS-number-only. No account or rotation write is changed here.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const VERSION = '1.7.42';
const BUILD = 'v1.7.42-privatebackup1';
const PREVIOUS = 'v1.7.41-twopass1';
const MARK = '// RAK_PRIVATE_IMPORT_BACKUP_17042';
const read = path => fs.readFileSync(path, 'utf8');
function change(path, fn) {
  const original = read(path);
  const updated = fn(original);
  if (updated !== original) fs.writeFileSync(path, updated, 'utf8');
  return updated;
}
function swap(source, oldText, newText, label) {
  if (source.includes(oldText)) {
    assert.equal(source.split(oldText).length, 2, '[17042] duplicate anchor ' + label);
    return source.replace(oldText, newText);
  }
  assert(source.includes(newText), '[17042] missing anchor ' + label);
  return source;
}
const migration = read('supabase/history/non-production-migrations/20260919132743_rak_owner_complete_backup_include_private_rotation_import_provenance.sql');
const regression = read('tools/private-import-backup-17042.sql');
const design = read('PRIVATE_IMPORT_BACKUP_17042.md');
assert(migration.includes('rak_require_admin(true)') && migration.includes('rak_rotation_import_metadata_v1')
  && migration.includes('Unexpected backup layout'), '[17042] owner snapshot migration incomplete');
assert(regression.includes('ROLLBACK;') && regression.includes('SET LOCAL ROLE anon;')
  && regression.includes('rak_rotation_import_metadata_v1'), '[17042] backup regression incomplete');
assert(design.includes('OS číslem') && design.includes('offline') && design.includes('salt'), '[17042] documented privacy scope incomplete');

change('tools/shift-report-mo-hotfix-170-smoke.mjs', source => {
  if (source.includes('// RAK_17042_TWO_PASS_GUARD')) return source;
  source = swap(source,
    `// RAK_17041_TWO_PASS_GUARD\nconst already17041=indexSource.includes("var build='${PREVIOUS}';");`,
    `// RAK_17041_TWO_PASS_GUARD\n// RAK_17042_TWO_PASS_GUARD\nconst already17042=indexSource.includes("var build='${BUILD}';");\nconst already17041=already17042||indexSource.includes("var build='${PREVIOUS}';");`,
    'second-pass detection');
  return swap(source,
    `already17041?"var build='${PREVIOUS}';":already17040?`,
    `already17042?"var build='${BUILD}';":already17041?"var build='${PREVIOUS}';":already17040?`,
    'second-pass reset');
});
change('rak-complete-backup.js', source => {
  if (source.includes(MARK)) return source;
  source = swap(source,
    `  function addSupabaseSnapshotFiles(zip, snapshot) {\n    const data = snapshot && snapshot.data || {};\n    const publicData = data.public && typeof data.public === 'object' ? data.public : {};\n    addJson(zip, 'supabase/complete-snapshot.json', snapshot);`,
    `  ${MARK}\n  function addSupabaseSnapshotFiles(zip, snapshot) {\n    const data = snapshot && snapshot.data || {};\n    const publicData = data.public && typeof data.public === 'object' ? data.public : {};\n    const privateData = data.private;\n    const privateKeys = privateData && typeof privateData === 'object' && !Array.isArray(privateData) ? Object.keys(privateData) : [];\n    if (privateKeys.length !== 1 || privateKeys[0] !== 'rak_rotation_import_metadata_v1') {\n      throw new Error('Úplná záloha neobsahuje očekávaný omezený soukromý archiv. Ověř migraci 1.7.42.');\n    }\n    const imported = privateData.rak_rotation_import_metadata_v1;\n    if (!Array.isArray(imported) || imported.some(row => !row || typeof row !== 'object'\n      || typeof row.rotation_key !== 'string' || typeof row.month_key !== 'string'\n      || !Object.prototype.hasOwnProperty.call(row, 'import_metadata'))) {\n      throw new Error('Úplná záloha obsahuje neplatná soukromá metadata importu. Export zastaven.');\n    }\n    addJson(zip, 'supabase/complete-snapshot.json', snapshot);`,
    'private backup validation');
  source = swap(source,
    `    Object.keys(publicData).sort().forEach((table) => addJson(zip, 'supabase/data/public/' + safePart(table) + '.json', publicData[table]));`,
    `    Object.keys(publicData).sort().forEach((table) => addJson(zip, 'supabase/data/public/' + safePart(table) + '.json', publicData[table]));\n    addJson(zip, 'supabase/data/private/rak_rotation_import_metadata_v1.json', imported);`,
    'private archive file');
  source = swap(source,
    `      'supabase/data/         aktuální data aplikačních tabulek',`,
    `      'supabase/data/         veřejná aplikační data a oddělená soukromá metadata importů',`,
    'restore contents');
  source = swap(source,
    `      '4. Nahraj aplikační data ze supabase/data/public/.',`,
    `      '4. Nahraj aplikační data ze supabase/data/public/.',\n      '4a. Obnov také supabase/data/private/rak_rotation_import_metadata_v1.json do stejnojmenné private tabulky až po aplikování migrací. Archiv nikdy veřejně nezpřístupňuj.',`,
    'restore private metadata');
  source = swap(source,
    `      'Aplikačních tabulek: ' + String(metrics.publicTables || 0),`,
    `      'Aplikačních tabulek: ' + String(metrics.publicTables || 0),\n      'Soukromých záznamů importu: ' + String(metrics.privateImportRows || 0),`,
    'restore metrics');
  source = swap(source,
    `    const metrics = { repositoryFiles: 0, deployedFiles: 0, publicTables: 0, storageObjects: 0 };`,
    `    const metrics = { repositoryFiles: 0, deployedFiles: 0, publicTables: 0, storageObjects: 0, privateImportRows: 0 };`,
    'manifest counter');
  source = swap(source,
    `    metrics.publicTables = addSupabaseSnapshotFiles(zip, snapshot);`,
    `    metrics.publicTables = addSupabaseSnapshotFiles(zip, snapshot);\n    metrics.privateImportRows = snapshot.data.private.rak_rotation_import_metadata_v1.length;`,
    'manifest private count');
  source = swap(source,
    `    if (!confirm('Vytvořit jednu úplnou zálohu RaK? ZIP bude obsahovat zdroj aplikace, nasazenou PWA, aktuální data Supabase, DB strukturu/RLS/RPC a Storage. Tajné klíče a aktivní relace se z bezpečnostních důvodů nezahrnou.')) return;`,
    `    if (!confirm('Vytvořit jednu úplnou zálohu RaK? ZIP obsahuje také osobní data a soukromá metadata importů: ulož jej bezpečně a nezveřejňuj. Tajné klíče a aktivní relace se nezahrnou.')) return;`,
    'sensitive archive confirmation');
  return source;
});
change('supabase-config.js', source => {
  assert(source.includes('https://cgshssdjgzzuprlwnabl.supabase.co')
    && !source.includes('bkqamcbkiwumsvelahxr'), '[17042] not development Supabase');
  source = swap(source, 'window.RAK_RELEASE_VERSION = "1.7.41";', `window.RAK_RELEASE_VERSION = "${VERSION}";`, 'config version');
  source = swap(source, 'window.RAK_TEST_DISPLAY_VERSION = "1.7.41";', `window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`, 'config display');
  return swap(source, `window.RAK_PWA_BUILD = "${PREVIOUS}";`, `window.RAK_PWA_BUILD = "${BUILD}";`, 'config PWA');
});
change('app.js', source => {
  source = swap(source, `const RAK_DEV_UPDATE_BUILD = "${PREVIOUS}";`, `const RAK_DEV_UPDATE_BUILD = "${BUILD}";`, 'app build');
  return swap(source, 'window.RAK_RELEASE_VERSION = "1.7.41";', `window.RAK_RELEASE_VERSION = "${VERSION}";`, 'app release');
});
change('sw.js', source => {
  assert(source.includes("const SW_APP_VERSION = '1.7.0';"), '[17042] technical version changed');
  source = swap(source, "const CACHE_VERSION = 'v1.7.41';", `const CACHE_VERSION = 'v${VERSION}';`, 'SW cache');
  source = swap(source, "const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.41';", `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`, 'SW display');
  return swap(source, `const DEVELOPMENT_BUILD_ID = '${PREVIOUS}';`, `const DEVELOPMENT_BUILD_ID = '${BUILD}';`, 'SW build');
});
change('index.html', source => swap(source, `var build='${PREVIOUS}';`, `var build='${BUILD}';`, 'index build'));
const stage = read('tools/shift-report-mo-hotfix-170-smoke.mjs');
for (const n of ['17039','17040','17041','17042'])
  assert(stage.includes(`// RAK_${n}_TWO_PASS_GUARD`), '[17042] historical build guard lost: ' + n);
assert(stage.includes(`const already17041=already17042||indexSource.includes("var build='${PREVIOUS}';");`)
  && stage.includes(`already17042?"var build='${BUILD}';":already17041?`), '[17042] second build replay missing');
assert.equal(JSON.parse(read('package.json')).version, '1.7.0', '[17042] technical version changed');
for (const [path, token] of [
  ['index.html', `var build='${BUILD}';`],
  ['supabase-config.js', `window.RAK_RELEASE_VERSION = "${VERSION}";`],
  ['supabase-config.js', `window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`],
  ['supabase-config.js', `window.RAK_PWA_BUILD = "${BUILD}";`],
  ['app.js', `const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],
  ['sw.js', `const CACHE_VERSION = 'v${VERSION}';`],
  ['sw.js', `const DEVELOPMENT_BUILD_ID = '${BUILD}';`],
  ['rak-complete-backup.js', "'supabase/data/private/rak_rotation_import_metadata_v1.json'"],
  ['rak-complete-backup.js', "privateKeys.length !== 1"],
  ['supabase-bridge.js', ".select('id,key,payload,meta,revision,updated_at').eq('key', 'main').maybeSingle()"]
]) assert(read(path).includes(token), '[17042] final marker mismatch: ' + path);
for (const path of ['tools/development-version-17041.mjs', 'tools/development-version-17042.mjs',
  'tools/shift-report-mo-hotfix-170-smoke.mjs', 'rak-complete-backup.js', 'supabase-config.js',
  'app.js', 'sw.js', 'supabase-bridge.js']) {
  execFileSync(process.execPath, ['--check', path], {stdio:'pipe'});
}
execFileSync(process.execPath, ['--test', 'tools/private-import-backup-17042.test.mjs'], {stdio:'inherit'});
console.log('[development-version-17042] OK 1.7.42: owner ZIP contains private import archive; no anonymous access, employee OS-only, PWA/second pass aligned');
