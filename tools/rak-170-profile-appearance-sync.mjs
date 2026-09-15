#!/usr/bin/env node
import fs from 'node:fs';
const read = (f) => fs.readFileSync(f, 'utf8');
const write = (f, v) => fs.writeFileSync(f, v, 'utf8');
const must = (ok, m) => { if (!ok) throw new Error('[rak-170-profile-appearance-sync] ' + m); };
const BUILD = '1.7.0-release6';

let appearance = read('appearance-theme.js');
const saveAnchor = "  const bridge = window.RotationSupabaseBridge;\n  if (!bridge || typeof bridge.saveGameAccountUiSettings !== 'function') return false;\n";
const saveRetry = "  const bridge = window.RotationSupabaseBridge;\n  if (!bridge || typeof bridge.saveGameAccountUiSettings !== 'function') {\n    if (typeof window.rakEnsureFeature === 'function') {\n      if (!window.__rakProfileUiRemoteSaveSyncEnsurePromise) {\n        window.__rakProfileUiRemoteSaveSyncEnsurePromise = Promise.resolve()\n          .then(() => window.rakEnsureFeature('sync'))\n          .catch((err) => { console.warn('Profile UI sync feature load failed', err); return null; })\n          .finally(() => { window.__rakProfileUiRemoteSaveSyncEnsurePromise = null; });\n      }\n      void window.__rakProfileUiRemoteSaveSyncEnsurePromise.then(() => {\n        const readyBridge = window.RotationSupabaseBridge;\n        if (readyBridge && typeof readyBridge.saveGameAccountUiSettings === 'function') {\n          scheduleActiveAccountUiRemoteSave(reason || 'profile-ui-sync-ready-save');\n        }\n      });\n      return true;\n    }\n    return false;\n  }\n";
if (!appearance.includes('__rakProfileUiRemoteSaveSyncEnsurePromise')) {
  must(appearance.includes(saveAnchor), 'remote-save bridge anchor missing');
  appearance = appearance.replace(saveAnchor, saveRetry);
}
must(appearance.includes("window.rakEnsureFeature('sync')"), 'appearance save does not ensure sync feature');
must(appearance.includes("scheduleActiveAccountUiRemoteSave(reason || 'profile-ui-sync-ready-save')"), 'appearance save does not retry after sync ready');
write('appearance-theme.js', appearance);

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
const assets = "const RAK_170_REPORT_APPEARANCE_ASSETS = ['./app.js?v=1.7.0', './appearance-theme.js?v=1.7.0', './rak-shift-report.js?v=1.7.0'];";
const assetLine = /^const RAK_170_REPORT_APPEARANCE_ASSETS = .*$/m;
if (assetLine.test(sw)) sw = sw.replace(assetLine, assets);
else {
  const a = /^const RAK_170_SHIFT_REPORT_HOTFIX_ASSETS = .*$/m;
  must(a.test(sw), 'hotfix asset anchor missing');
  sw = sw.replace(a, (line) => line + '\n' + assets);
}
sw = sw.replace(/const hotfixAssets = ([^;]+);/, (m, expr) => expr.includes('RAK_170_REPORT_APPEARANCE_ASSETS') ? m : `const hotfixAssets = ${expr}.concat(RAK_170_REPORT_APPEARANCE_ASSETS);`);
must(sw.includes("'./appearance-theme.js?v=1.7.0'"), 'appearance-theme cache refresh missing');
write('sw.js', sw);

let config = read('supabase-config.js');
config = config.replace(/^window\.RAK_PWA_BUILD = "[^"]+";$/m, `window.RAK_PWA_BUILD = "v${BUILD}";`);
must(config.includes('window.RAK_RELEASE_VERSION = "1.7";'), 'visible version changed');
write('supabase-config.js', config);
console.log('[rak-170-profile-appearance-sync] OK appearance changes persist after lazy sync load; account appearance loads after login; visible version stays 1.7');
