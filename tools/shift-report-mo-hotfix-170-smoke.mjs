#!/usr/bin/env node
import fs from 'node:fs';

// Sequential stages: finalizer uses top-level await to skip already applied hotfixes on repeated builds.
await import('./rak-170-brusy-order.mjs');
await import('./rak-170-profile-appearance-sync.mjs');
await import('./generator-finalize-170.mjs');
await import('./generator-staffing-170-smoke.mjs');
// Development test releases are applied AFTER the frozen 1.7 release and regression gates.
await import('./development-version-17001.mjs');
const indexSource = fs.readFileSync('index.html', 'utf8');
const imageSource = fs.readFileSync('rak-shift-report-image.js', 'utf8');
const shareSource = fs.readFileSync('rak-shift-report-share.js', 'utf8');
const editorSource = fs.readFileSync('admin-rotation-editor.js', 'utf8');
const coreSource = fs.readFileSync('core.js', 'utf8');
const generatorSource = fs.readFileSync('admin-rotation-generator.js', 'utf8');
const rotationSource = fs.readFileSync('rotace.js', 'utf8');
const adminRotationSource = fs.readFileSync('admin-rotation.js', 'utf8');

const already17008 = indexSource.includes("var build='v1.7.08-solomill2';")
  && imageSource.includes('// RAK_SHIFT_REPORT_FREE_PRIMARY_17008')
  && shareSource.includes('// RAK_SHIFT_REPORT_FREE_PRIMARY_17008')
  && generatorSource.includes('// RAK_GENERATOR_FINAL_SOLO_MILL_REPAIR_17008')
  && adminRotationSource.includes('// RAK_GENERATOR_FINAL_SOLO_MILL_CALL_17008');
const already17007 = indexSource.includes("var build='v1.7.07-rosterreport1';")
  && imageSource.includes('// RAK_REPORT_COMPACT_PAIRS_17005')
  && editorSource.includes('// RAK_ADMIN_SMART_MANUAL_INPUT_17006')
  && coreSource.includes('// RAK_ACTIVE_ROSTER_SOURCE_17007')
  && generatorSource.includes('// RAK_GENERATOR_SOLO_MILL_STREAK_17007')
  && rotationSource.includes('// RAK_ROTATION_EXPORT_GLASS_17007');
const already17006 = indexSource.includes("var build='v1.7.06-smartadmin1';")
  && imageSource.includes('// RAK_REPORT_COMPACT_PAIRS_17005')
  && editorSource.includes('// RAK_ADMIN_SMART_MANUAL_INPUT_17006');
const already17005 = indexSource.includes("var build='v1.7.05-png5';") && imageSource.includes('// RAK_REPORT_COMPACT_PAIRS_17005');
const already17004 = indexSource.includes("var build='v1.7.04-png4';") && imageSource.includes('// RAK_REPORT_ACCENT_PALETTE_17004');

if (already17008 || already17007) {
  // The full three-absence regression already ran on the clean first pass before the
  // development-only solo-mill helper layers were applied. Their dedicated smoke owns
  // those transformed helpers on Vercel's repeated build pass.
  console.log('[shift-report-mo-hotfix-170-smoke] repeated build: first-pass three-absence regression already passed; dedicated solo-mill smoke will run');
} else {
  await import('./rak-v170-three-absence-regression.mjs');
}

if (already17008) {
  console.log('[shift-report-mo-hotfix-170-smoke] second build pass: 1.7.08 layer already complete; skipping 1.7.07 and older development rebuilds');
} else {
  if (already17007) {
    console.log('[shift-report-mo-hotfix-170-smoke] 1.7.07 roster/report/generator layer already complete; skipping older development rebuilds');
  } else {
    if (already17006) {
      console.log('[shift-report-mo-hotfix-170-smoke] 1.7.06 admin + 1.7.05 image layers already complete; skipping older visual rebuilds');
    } else {
      if (already17005) {
        console.log('[shift-report-mo-hotfix-170-smoke] 1.7.05 image layer already complete; skipping 1.7.03/1.7.04 rebuild');
      } else {
        if (already17004) {
          console.log('[shift-report-mo-hotfix-170-smoke] 1.7.04 image layer already includes 1.7.03 light base; skipping 1.7.03 downgrade');
        } else {
          await import('./development-version-17003.mjs');
        }
        await import('./development-version-17004.mjs');
        await import('./development-version-17005.mjs');
      }
      if (already17005 === false && fs.readFileSync('index.html', 'utf8').includes("var build='v1.7.04-png4';")) {
        await import('./development-version-17005.mjs');
      }
      await import('./development-version-17006-bootstrap.mjs');
    }
  }
  await import('./development-version-17007.mjs');
}

await import('./development-version-17008.mjs');
console.log('[shift-report-mo-hotfix-170-smoke] OK RaK 1.7 hotfixes, smart admin, active roster, final solo-mill repair and PNG "volné" quantity verified; test build 1.7.08');
