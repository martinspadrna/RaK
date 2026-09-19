#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
const read = p => fs.readFileSync(p,'utf8');
const migration=read('supabase/migrations/20260919071456_rak_public_rotation_reject_nested_secret_fields_os_only.sql');
const sql=read('tools/security-rotation-public-field-matrix.sql');
const policy=read('EMPLOYEE_AUTH_CUTOVER.md');
assert(migration.includes('rak_rotation_no_public_secret_fields_v1'));
assert(migration.includes("'accesstoken'") && migration.includes("'medical'"));
assert(sql.includes('Sensitive UPDATE not blocked') && sql.includes('ROLLBACK;'));
assert(policy.includes('OS_ONLY_POLICY_20260919'));
console.log('[security-rotation-public-release-17036] migration and SQL regression present; OS-only policy retained');
