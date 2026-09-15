#!/usr/bin/env node
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const FILE = 'supabase-config.js';
const PROD_URL = 'https://bkqamcbkiwumsvelahxr.supabase.co';
const PROD_KEY = 'sb_publishable_MYL2dR_WGYFUMf0jKHpUbQ_70mCbUOy';
const TEST_URL = 'https://cgshssdjgzzuprlwnabl.supabase.co';
const TEST_KEY = 'sb_publishable_v7jeuZC-MNUEO5nfE5xcUQ_Pu9pT-X_';

function branch() {
  const fromEnv = String(process.env.VERCEL_GIT_COMMIT_REF || process.env.GITHUB_REF_NAME || '').trim();
  if (fromEnv) return fromEnv;
  try {
    return String(execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }) || '').trim();
  } catch {
    return '';
  }
}

function must(ok, message) {
  if (!ok) throw new Error('[main-production-smoke-config] ' + message);
}

const mode = String(process.argv[2] || '').trim();
const currentBranch = branch();
let source = fs.readFileSync(FILE, 'utf8');

if (mode === 'enter') {
  if (currentBranch === 'main') {
    must(source.includes(PROD_URL), 'main source config is not production before smoke swap');
    must(!source.includes(TEST_URL), 'test Supabase leaked into main before smoke swap');
    source = source.replaceAll(PROD_URL, TEST_URL).replaceAll(PROD_KEY, TEST_KEY);
    fs.writeFileSync(FILE, source, 'utf8');
    must(source.includes(TEST_URL) && !source.includes(PROD_URL), 'temporary legacy-smoke test config swap failed');
    console.log('[main-production-smoke-config] main: temporary test config enabled for legacy smoke suite');
  } else {
    console.log(`[main-production-smoke-config] ${currentBranch || 'unknown'}: enter no-op`);
  }
} else if (mode === 'restore') {
  if (currentBranch === 'main') {
    must(source.includes(TEST_URL), 'temporary test config missing before production restore');
    source = source.replaceAll(TEST_URL, PROD_URL).replaceAll(TEST_KEY, PROD_KEY);
    fs.writeFileSync(FILE, source, 'utf8');
    must(source.includes(PROD_URL) && !source.includes(TEST_URL), 'production config restore failed');
    console.log('[main-production-smoke-config] main: production Supabase restored after legacy smoke suite');
  } else {
    console.log(`[main-production-smoke-config] ${currentBranch || 'unknown'}: restore no-op`);
  }
} else if (mode === 'verify') {
  if (currentBranch === 'main') {
    must(source.includes(PROD_URL), 'main final runtime must point to production Supabase');
    must(!source.includes(TEST_URL), 'test Supabase leaked into main final runtime');
    must(source.includes('window.RAK_RELEASE_VERSION = "1.7";'), 'main final visible version must be RaK 1.7');
    console.log('[main-production-smoke-config] OK main final runtime = production Supabase + RaK 1.7');
  } else if (currentBranch === 'development') {
    must(source.includes(TEST_URL), 'development final runtime must point to test Supabase');
    must(!source.includes(PROD_URL), 'production Supabase leaked into development runtime');
    console.log('[main-production-smoke-config] OK development final runtime = test Supabase');
  } else {
    console.log(`[main-production-smoke-config] ${currentBranch || 'unknown'}: verify skipped`);
  }
} else {
  throw new Error('[main-production-smoke-config] use enter, restore or verify');
}
