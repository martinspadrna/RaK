#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { classifyVercelBuild } from './vercel-build-policy.mjs';

const previous = String(process.env.VERCEL_GIT_PREVIOUS_SHA || '').trim();
const branch = String(process.env.VERCEL_GIT_COMMIT_REF || '').trim();
// Feature/PR branches are verified by GitHub Actions before merging to development.
// No application changes are built here until the release branch receives the commit.
const branchDecision = classifyVercelBuild({ branch, previous });
if (branchDecision.reason === 'non-release-branch') {
  console.log('[vercel-ignore-build] skip non-release branch:', branch);
  process.exit(0);
}
if (branchDecision.reason === 'missing-or-invalid-previous-sha') {
  console.log('[vercel-ignore-build] previous deployment SHA missing or invalid; build');
  process.exit(1);
}

let output = '';
try {
  output = execFileSync('git', ['diff', '--name-only', previous + '..HEAD'], { encoding: 'utf8' });
} catch (_) {
  console.log('[vercel-ignore-build] diff failed; build');
  process.exit(1);
}
const files = output.split(/\r?\n/).map(value => value.trim()).filter(Boolean);
const decision = classifyVercelBuild({ branch, previous, files });
console.log('[vercel-ignore-build]', decision.skip ? 'skip' : 'build', decision.reason, files.join(', '));
process.exit(decision.skip ? 0 : 1);
