import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationDir = path.join(root, 'supabase', 'migrations');
const archiveDir = path.join(root, 'supabase', 'history', 'non-production-migrations');
const lockPath = path.join(root, 'supabase', 'production-migration-lock.json');
const migrationName = /^(\d{14})_.+\.sql$/;

function normalizedHash(buffer) {
  const normalized = buffer.toString('utf8').replace(/\r\n/g, '\n');
  return createHash('sha256').update(normalized).digest('hex');
}

test('active Supabase migrations preserve the exact production history', async () => {
  const lock = JSON.parse(await readFile(lockPath, 'utf8'));
  assert.equal(lock.schema, 'rak-production-migration-lock-v1');
  assert.equal(lock.projectRef, 'bkqamcbkiwumsvelahxr');
  assert.ok(Array.isArray(lock.migrations));
  assert.ok(lock.migrations.length > 0);

  const lockedFiles = new Set();
  const lockedVersions = new Set();
  let previousVersion = '';

  for (const migration of lock.migrations) {
    const match = migrationName.exec(migration.file);
    assert.ok(match, `Invalid locked migration filename: ${migration.file}`);
    assert.equal(migration.version, match[1]);
    assert.ok(migration.version > previousVersion, 'Locked migrations must be sorted by version');
    assert.ok(!lockedFiles.has(migration.file), `Duplicate locked file: ${migration.file}`);
    assert.ok(!lockedVersions.has(migration.version), `Duplicate locked version: ${migration.version}`);

    const contents = await readFile(path.join(migrationDir, migration.file));
    assert.equal(
      normalizedHash(contents),
      migration.sha256,
      `Production migration changed: ${migration.file}`,
    );

    lockedFiles.add(migration.file);
    lockedVersions.add(migration.version);
    previousVersion = migration.version;
  }

  assert.equal(lock.lastProductionVersion, previousVersion);

  const activeFiles = (await readdir(migrationDir)).filter((file) => file.endsWith('.sql'));
  const activeVersions = new Set();
  for (const file of activeFiles) {
    const match = migrationName.exec(file);
    assert.ok(match, `Invalid active migration filename: ${file}`);
    const version = match[1];
    assert.ok(!activeVersions.has(version), `Duplicate active migration version: ${version}`);
    activeVersions.add(version);

    if (!lockedFiles.has(file)) {
      assert.ok(
        version > lock.lastProductionVersion,
        `Unapplied migration ${file} must be newer than production ${lock.lastProductionVersion}`,
      );
    }
  }

  for (const file of lockedFiles) {
    assert.ok(activeFiles.includes(file), `Production migration is missing: ${file}`);
  }

  const archivedFiles = (await readdir(archiveDir)).filter((file) => file.endsWith('.sql'));
  for (const file of archivedFiles) {
    assert.ok(!activeFiles.includes(file), `Migration exists in active and archive directories: ${file}`);
    assert.ok(!lockedFiles.has(file), `Production migration must not be archived: ${file}`);
  }
});
