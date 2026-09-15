#!/usr/bin/env node
import fs from 'node:fs';
const read = (f) => fs.readFileSync(f, 'utf8');
const write = (f, v) => fs.writeFileSync(f, v, 'utf8');
const must = (ok, m) => { if (!ok) throw new Error('[rak-170-profile-appearance-sync] ' + m); };
const BUILD = '1.7.0-release7';

let appearance = read('appearance-theme.js');

// Keep the generic delayed save path resilient when the sync feature is not loaded yet.
const saveAnchor = "  const bridge = window.RotationSupabaseBridge;\n  if (!bridge || typeof bridge.saveGameAccountUiSettings !== 'function') return false;\n";
const saveRetry = "  const bridge = window.RotationSupabaseBridge;\n  if (!bridge || typeof bridge.saveGameAccountUiSettings !== 'function') {\n    if (typeof window.rakEnsureFeature === 'function') {\n      if (!window.__rakProfileUiRemoteSaveSyncEnsurePromise) {\n        window.__rakProfileUiRemoteSaveSyncEnsurePromise = Promise.resolve()\n          .then(() => window.rakEnsureFeature('sync'))\n          .catch((err) => { console.warn('Profile UI sync feature load failed', err); return null; })\n          .finally(() => { window.__rakProfileUiRemoteSaveSyncEnsurePromise = null; });\n      }\n      void window.__rakProfileUiRemoteSaveSyncEnsurePromise.then(() => {\n        const readyBridge = window.RotationSupabaseBridge;\n        if (readyBridge && typeof readyBridge.saveGameAccountUiSettings === 'function') {\n          scheduleActiveAccountUiRemoteSave(reason || 'profile-ui-sync-ready-save');\n        }\n      });\n      return true;\n    }\n    return false;\n  }\n";
if (!appearance.includes('__rakProfileUiRemoteSaveSyncEnsurePromise')) {
  must(appearance.includes(saveAnchor), 'remote-save bridge anchor missing');
  appearance = appearance.replace(saveAnchor, saveRetry);
}

// Appearance taps are user intent: write them immediately instead of relying on the 650 ms debounce.
const oldAppearanceSave = "  if (persist && !options.skipProfile) saveActiveAccountUiSettings({ themeId:id, backgroundId:id }, { reason:'appearance-change', skipRemote:!!options.skipRemote });\n";
const immediateAppearanceSave = "  if (persist && !options.skipProfile) {\n    saveActiveAccountUiSettings({ themeId:id, backgroundId:id }, { reason:'appearance-change', skipRemote:true });\n    if (!options.skipRemote) {\n      const pushAppearanceNow = () => {\n        try { if (typeof pushActiveAccountUiRemoteSettings === 'function') void pushActiveAccountUiRemoteSettings('appearance-change-immediate'); } catch (err) { console.warn('Profile UI immediate remote save failed', err); }\n      };\n      if (typeof window.rakEnsureFeature === 'function') {\n        void window.rakEnsureFeature('sync').then(pushAppearanceNow).catch((err) => console.warn('Profile UI immediate sync load failed', err));\n      } else {\n        pushAppearanceNow();\n      }\n    }\n  }\n";
if (!appearance.includes("appearance-change-immediate")) {
  must(appearance.includes(oldAppearanceSave), 'unified appearance save anchor missing');
  appearance = appearance.replace(oldAppearanceSave, immediateAppearanceSave);
}
must(appearance.includes("pushActiveAccountUiRemoteSettings('appearance-change-immediate')"), 'appearance change is not saved immediately');
must(appearance.includes("window.rakEnsureFeature('sync')"), 'appearance save does not ensure sync feature');
write('appearance-theme.js', appearance);

let app = read('app.js');
const featureAnchor = "  window.rakEnsureFeature = ensureFeature;\n";
const syncHook = "  if (!window.__rakProfileAppearanceSyncListener) {\n    window.__rakProfileAppearanceSyncListener = true;\n    let appearanceSyncPromise = null;\n    let appearanceSyncLastAt = 0;\n    const syncActiveAppearance = (source) => {\n      const now = Date.now();\n      if (appearanceSyncPromise) return appearanceSyncPromise;\n      if (source !== 'startup' && source !== 'profile-ready' && now - appearanceSyncLastAt < 1500) return Promise.resolve(false);\n      appearanceSyncLastAt = now;\n      appearanceSyncPromise = ensureFeature('sync').then(() => {\n        try {\n          if (typeof applyProfileUiPreferencesForActiveAccount === 'function') {\n            return applyProfileUiPreferencesForActiveAccount({ loadRemote: true, source: source || 'active-device-sync' });\n          }\n        } catch (err) { console.warn('Profile UI active-device sync failed', err); }\n        return false;\n      }).catch((err) => { console.warn('Profile UI active-device sync load failed', err); return false; })\n        .finally(() => { appearanceSyncPromise = null; });\n      return appearanceSyncPromise;\n    };\n    window.__rakSyncActiveAppearance = syncActiveAppearance;\n    window.addEventListener('rak:user-profile-ready', () => { void syncActiveAppearance('profile-ready'); });\n    window.addEventListener('pageshow', () => { void syncActiveAppearance('pageshow'); });\n    window.addEventListener('focus', () => { void syncActiveAppearance('focus'); });\n    document.addEventListener('visibilitychange', () => { if (!document.hidden) void syncActiveAppearance('visibility'); });\n  }\n";
if (!app.includes('__rakProfileAppearanceSyncListener')) {
  must(app.includes(featureAnchor), 'feature export anchor missing');
  app = app.replace(featureAnchor, featureAnchor + syncHook);
}
const startupAnchor = "  } catch (err) { console.warn('RaK user profile runtime restore failed', err); }\n\n  const startupReadyAt =";
const startupSync = "  } catch (err) { console.warn('RaK user profile runtime restore failed', err); }\n  try { if (typeof window.__rakSyncActiveAppearance === 'function') void window.__rakSyncActiveAppearance('startup'); } catch (err) {}\n\n  const startupReadyAt =";
if (!app.includes("__rakSyncActiveAppearance('startup')")) {
  must(app.includes(startupAnchor), 'startup appearance sync anchor missing');
  app = app.replace(startupAnchor, startupSync);
}
must(app.includes("window.addEventListener('pageshow'"), 'appearance does not sync on pageshow');
must(app.includes("window.addEventListener('focus'"), 'appearance does not sync on focus');
must(app.includes("document.addEventListener('visibilitychange'"), 'appearance does not sync on resume');
must(app.includes("__rakSyncActiveAppearance('startup')"), 'appearance does not sync on startup');
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
console.log('[rak-170-profile-appearance-sync] OK immediate appearance save + startup/pageshow/focus/resume remote pull; visible version stays 1.7');
