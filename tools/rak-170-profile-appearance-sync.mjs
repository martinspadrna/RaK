#!/usr/bin/env node
import fs from 'node:fs';
const read = (f) => fs.readFileSync(f, 'utf8');
const write = (f, v) => fs.writeFileSync(f, v, 'utf8');
const must = (ok, m) => { if (!ok) throw new Error('[rak-170-profile-appearance-sync] ' + m); };
const BUILD = '1.7.0-release4';
let app = read('app.js');
const anchor = "  window.rakEnsureFeature = ensureFeature;\n";
const hook = "  if (!window.__rakProfileAppearanceSyncListener) {\n    window.__rakProfileAppearanceSyncListener = true;\n    window.addEventListener('rak:user-profile-ready', () => {\n      void ensureFeature('sync').then(() => {\n        try { if (typeof applyProfileUiPreferencesForActiveAccount === 'function') applyProfileUiPreferencesForActiveAccount({ loadRemote: true, source: 'profile-sync-ready' }); } catch (err) {}\n      }).catch(() => {});\n    });\n  }\n";
if (!app.includes('__rakProfileAppearanceSyncListener')) {
  must(app.includes(anchor), 'feature export anchor missing');
  app = app.replace(anchor, anchor + hook);
}
must(app.includes("ensureFeature('sync').then"), 'profile login does not wait for sync');
write('app.js', app);
let sw = read('sw.js');
sw = sw.replace(/^const DEVELOPMENT_BUILD_ID = '[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD}';`);
const assets = "const RAK_170_REPORT_APPEARANCE_ASSETS = ['./app.js?v=1.7.0', './rak-shift-report.js?v=1.7.0'];";
if (!sw.includes('RAK_170_REPORT_APPEARANCE_ASSETS')) {
  const a = /^const RAK_170_SHIFT_REPORT_HOTFIX_ASSETS = .*$/m;
  must(a.test(sw), 'hotfix asset anchor missing');
  sw = sw.replace(a, (line) => line + '\n' + assets);
}
sw = sw.replace(/const hotfixAssets = ([^;]+);/, (m, expr) => expr.includes('RAK_170_REPORT_APPEARANCE_ASSETS') ? m : `const hotfixAssets = ${expr}.concat(RAK_170_REPORT_APPEARANCE_ASSETS);`);
write('sw.js', sw);
let config = read('supabase-config.js');
config = config.replace(/^window\.RAK_PWA_BUILD = "[^"]+";$/m, `window.RAK_PWA_BUILD = "v${BUILD}";`);
must(config.includes('window.RAK_RELEASE_VERSION = "1.7";'), 'visible version changed');
write('supabase-config.js', config);
console.log('[rak-170-profile-appearance-sync] OK account appearance sync after profile login; visible version stays 1.7');
