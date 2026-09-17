#!/usr/bin/env node
// Sequential stages: finalizer uses top-level await to skip already applied hotfixes on repeated builds.
await import('./rak-170-brusy-order.mjs');
await import('./rak-170-profile-appearance-sync.mjs');
await import('./generator-finalize-170.mjs');
await import('./generator-staffing-170-smoke.mjs');
await import('./rak-v170-three-absence-regression.mjs');
console.log('[shift-report-mo-hotfix-170-smoke] OK RaK 1.7 same-version hotfixes, generator and grinder tasks verified');
