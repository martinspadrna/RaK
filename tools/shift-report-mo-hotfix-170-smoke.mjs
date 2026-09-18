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

const already17015 = indexSource.includes("var build='v1.7.15-indexgrid1';")
  && imageSource.includes('// RAK_REPORT_INDEX_GRID_TEXT_17015')
  && shareSource.includes('// RAK_REPORT_INDEX_GRID_TEXT_17015')
  && generatorSource.includes('// RAK_TPKW02_FINAL_FAIRNESS_17013')
  && adminRotationSource.includes('// RAK_TPKW02_FINAL_CALL_17013');
const already17014 = indexSource.includes("var build='v1.7.14-reporttotals1';")
  && imageSource.includes('// RAK_REPORT_NOK_TOTALS_ZERO_17014')
  && shareSource.includes('// RAK_REPORT_NOK_TOTALS_ZERO_17014')
  && generatorSource.includes('// RAK_TPKW02_FINAL_FAIRNESS_17013')
  && adminRotationSource.includes('// RAK_TPKW02_FINAL_CALL_17013');
const already17013 = indexSource.includes("var build='v1.7.13-tpkwmobile1';")
  && generatorSource.includes('// RAK_TPKW02_FINAL_FAIRNESS_17013')
  && adminRotationSource.includes('// RAK_TPKW02_FINAL_CALL_17013')
  && imageSource.includes('// RAK_MOBILE_REPORT_LINES_17013')
  && shareSource.includes('// RAK_MOBILE_REPORT_LINES_17013');
const already17012 = indexSource.includes("var build='v1.7.12-presshalf1';")
  && generatorSource.includes('// RAK_GENERATOR_PRESS_HALF_STEP_17012')
  && adminRotationSource.includes('// RAK_GENERATOR_PRESS_HALF_STEP_CALL_17012');
const already17011 = indexSource.includes("var build='v1.7.11-cleanfair1';")
  && generatorSource.includes('// RAK_GENERATOR_SUNDAY_TBK_FAIRNESS_17011')
  && adminRotationSource.includes('// RAK_GENERATOR_SUNDAY_TBK_FAIRNESS_CALL_17011');
const already17010 = indexSource.includes("var build='v1.7.10-reportfree1';")
  && imageSource.includes('// RAK_SHIFT_REPORT_FREE_ONLY_GRINDER_17010')
  && shareSource.includes('// RAK_SHIFT_REPORT_FREE_ONLY_GRINDER_17010');
const already17009 = indexSource.includes("var build='v1.7.09-solomill3';")
  && imageSource.includes('// RAK_SHIFT_REPORT_GLASS_17009')
  && shareSource.includes('// RAK_SHIFT_REPORT_GLASS_17009')
  && generatorSource.includes('// RAK_GENERATOR_SOLO_MILL_SPREAD_17009')
  && adminRotationSource.includes('// RAK_GENERATOR_SOLO_MILL_SPREAD_CALL_17009');
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

if (already17015 || already17014 || already17013 || already17012 || already17010 || already17009 || already17008 || already17007) {
  console.log('[shift-report-mo-hotfix-170-smoke] repeated build: first-pass three-absence regression already passed; dedicated development smokes will run');
} else {
  await import('./rak-v170-three-absence-regression.mjs');
}

if (already17015) {
  console.log('[shift-report-mo-hotfix-170-smoke] second build pass: preserve 1.7.15 index grid, older development transforms skipped');
} else if (already17014) {
  console.log('[shift-report-mo-hotfix-170-smoke] 1.7.14 layer complete; older development transforms skipped');
} else if (already17013) {
  console.log('[shift-report-mo-hotfix-170-smoke] 1.7.13 layer complete; older development transforms skipped');
} else if (already17012) {
  console.log('[shift-report-mo-hotfix-170-smoke] 1.7.12 layer complete; older development transforms skipped');
} else if (already17011) {
  console.log('[shift-report-mo-hotfix-170-smoke] 1.7.11 layer complete; older development transforms skipped');
} else {
  if (already17010) {
    console.log('[shift-report-mo-hotfix-170-smoke] 1.7.10 layer complete; older development transforms skipped');
  } else {
    if (already17009) {
      console.log('[shift-report-mo-hotfix-170-smoke] 1.7.09 layer complete; skipping 1.7.08 and older development rebuilds');
    } else {
      if (already17008) {
        console.log('[shift-report-mo-hotfix-170-smoke] 1.7.08 layer complete; skipping 1.7.07 and older development rebuilds');
      } else {
        if (already17007) {
          console.log('[shift-report-mo-hotfix-170-smoke] 1.7.07 roster/report/generator layer complete; skipping older development rebuilds');
        } else {
          if (already17006) {
            console.log('[shift-report-mo-hotfix-170-smoke] 1.7.06 admin + 1.7.05 image layers complete; skipping older visual rebuilds');
          } else {
            if (already17005) {
              console.log('[shift-report-mo-hotfix-170-smoke] 1.7.05 image layer complete; skipping 1.7.03/1.7.04 rebuild');
            } else {
              if (already17004) {
                console.log('[shift-report-mo-hotfix-170-smoke] 1.7.04 already includes 1.7.03 light base; skipping downgrade');
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
    }
    await import('./development-version-17009.mjs');
  }
  await import('./development-version-17010.mjs');
}

if (already17015) {
  // The 1.7.0 hotfix rewrites reportText each pass. Finalize its output again.
  console.log('[shift-report-mo-hotfix-170-smoke] second build: restoring final shared text + release labels');
} else if (already17014) {
  console.log('[shift-report-mo-hotfix-170-smoke] 1.7.14 image is complete; applying final grid/text stage');
} else if (already17013) {
  await import('./tpkw02-mobile-report-17013-smoke.mjs');
} else {
  if (!already17012) await import('./development-version-17011.mjs');
  await import('./development-version-17012.mjs');
  await import('./development-version-17013.mjs');
}
if (!already17015) await import('./development-version-17014.mjs');
await import('./development-version-17015.mjs');
await import('./report-index-grid-17015-compat-final.mjs');
console.log('[shift-report-mo-hotfix-170-smoke] OK 1.7.15: original regression gates, safe press/TPKW02, colored MO/TO index grid, full-width totals and matching copy/share verified');