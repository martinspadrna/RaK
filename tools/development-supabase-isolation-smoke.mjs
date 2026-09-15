import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const TEST_REF = 'cgshssdjgzzuprlwnabl';
const PROD_REF = 'bkqamcbkiwumsvelahxr';
const read = (file) => fs.readFileSync(file, 'utf8');

function currentBranch() {
  const fromEnv = String(process.env.VERCEL_GIT_COMMIT_REF || process.env.GITHUB_REF_NAME || '').trim();
  if (fromEnv) return fromEnv;
  try {
    return String(execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }) || '').trim();
  } catch {
    return '';
  }
}

const branch = currentBranch();
if (branch && branch !== 'development') {
  console.log(`[development-supabase-isolation-smoke] SKIP branch=${branch}`);
  process.exit(0);
}

const config = read('supabase-config.js');
const adminAuth = read('api/_admin-auth.js');
const adminUsersApi = read('api/admin-users.js');
const absenceApi = read('api/rotation-absence-calendar.js');
const bridge = read('supabase-bridge.js');
const userProfile = read('rak-user-profile.js');
const generatorWizard = read('admin-rotation-generator-wizard.js');

assert(config.includes(TEST_REF), 'development frontend must point to RaK-test Supabase');
assert(!config.includes(PROD_REF), 'production Supabase ref leaked into development frontend config');
assert(adminAuth.includes("VERCEL_GIT_COMMIT_REF") && adminAuth.includes("=== 'development'"), 'server admin auth must branch-isolate development');
assert(adminAuth.includes(TEST_REF), 'development server API must contain the RaK-test Supabase override');
assert(!adminAuth.includes(PROD_REF), 'production Supabase ref must not be hardcoded in development server auth');
assert(adminUsersApi.includes('admin_users_endpoint_moved') && adminUsersApi.includes('status(410)'), 'retired admin users Vercel endpoint must stay disabled');
assert(absenceApi.includes('calendar_endpoint_moved') && absenceApi.includes('status(410)'), 'retired absence Vercel endpoint must stay disabled');
assert(bridge.includes('window.SUPABASE_CONFIG'), 'Supabase bridge must derive its client from the active public config');
assert(userProfile.includes('window.SUPABASE_CONFIG'), 'user profile lookup must derive its client from the active public config');
assert(generatorWizard.includes('window.SUPABASE_CONFIG'), 'generator absence calendar URL must derive from the active public config');

for (const [name, source] of [
  ['api/admin-users.js', adminUsersApi],
  ['api/rotation-absence-calendar.js', absenceApi],
  ['supabase-bridge.js', bridge],
  ['rak-user-profile.js', userProfile],
  ['admin-rotation-generator-wizard.js', generatorWizard]
]) {
  assert(!source.includes(PROD_REF), `production Supabase ref leaked into development runtime file: ${name}`);
}

console.log(`[development-supabase-isolation-smoke] OK branch=${branch || 'unknown'} test=${TEST_REF} production runtime ref absent`);
