#!/usr/bin/env node
import fs from 'node:fs';

// Sequential stages: finalizer uses top-level await to skip already applied hotfixes on repeated builds.
await import('./rak-170-brusy-order.mjs');
await import('./rak-170-profile-appearance-sync.mjs');
await import('./generator-finalize-170.mjs');
await import('./generator-staffing-170-smoke.mjs');
await import('./rak-v170-three-absence-regression.mjs');
// Development test releases are applied AFTER the frozen 1.7 release and regression gates.
await import('./development-version-17001.mjs');
const indexSource = fs.readFileSync('index.html', 'utf8');
const imageSource = fs.readFileSync('rak-shift-report-image.js', 'utf8');
const already17004 = indexSource.includes("var build='v1.7.04-png4';") && imageSource.includes('// RAK_REPORT_ACCENT_PALETTE_17004');
if (already17004) {
  console.log('[shift-report-mo-hotfix-170-smoke] second build pass: 1.7.04 image layer already includes 1.7.03 light base; skipping 1.7.03 downgrade');
} else {
  await import('./development-version-17003.mjs');
}
await import('./development-version-17004.mjs');
console.log('[shift-report-mo-hotfix-170-smoke] OK RaK 1.7 hotfixes, generator and grinder tasks verified; test build 1.7.04');
