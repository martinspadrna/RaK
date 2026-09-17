import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'supabase-bridge.js');
let source = fs.readFileSync(target, 'utf8');

const marker = "storedCategory === 'rotation_save_backup'";
const needle = "      || storedKey === 'ADMIN_ACCOUNTS_SETTINGS'\n      || storedKey.indexOf('ADMIN_FULL_SETTINGS_BACKUP_') === 0;";
const replacement = "      || storedKey === 'ADMIN_ACCOUNTS_SETTINGS'\n      || storedKey.indexOf('ADMIN_FULL_SETTINGS_BACKUP_') === 0\n      || category === 'rotation_save_backup'\n      || key.indexOf('ROTATION_SAVE_BACKUP_') === 0\n      || storedCategory === 'rotation_save_backup'\n      || storedKey.indexOf('ROTATION_SAVE_BACKUP_') === 0;";

if (!source.includes(marker)) {
  if (!source.includes(needle)) {
    throw new Error('[machine-settings-backup-filter-170] expected filter anchor not found');
  }
  source = source.replace(needle, replacement);
  fs.writeFileSync(target, source);
  console.log('[machine-settings-backup-filter-170] applied rotation backup exclusion before secure settings RPC');
} else {
  console.log('[machine-settings-backup-filter-170] repeated build: rotation backup exclusion already applied');
}

const required = [
  "category === 'rotation_save_backup'",
  "key.indexOf('ROTATION_SAVE_BACKUP_') === 0",
  "storedCategory === 'rotation_save_backup'",
  "storedKey.indexOf('ROTATION_SAVE_BACKUP_') === 0",
  "const operationalPayloads = payloads.filter((payload) => !isCredentialOrBackupMachineSettingsPayload(payload));"
];
for (const item of required) {
  if (!source.includes(item)) throw new Error('[machine-settings-backup-filter-170] missing guard: ' + item);
}

console.log('[machine-settings-backup-filter-170] OK legacy rotation backups are excluded from generic machine-settings writes');
