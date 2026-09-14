#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const swPath = path.join(root, 'sw.js');
const configPath = path.join(root, 'supabase-config.js');
const appPath = path.join(root, 'app.js');
const indexPath = path.join(root, 'index.html');
const stylesEntryPath = path.join(root, 'styles.css');
const loginLifePath = path.join(root, 'rak-login-life.js');
const themePath = path.join(root, 'styles-theme-polish.css');

let sw = fs.readFileSync(swPath, 'utf8');
let config = fs.readFileSync(configPath, 'utf8');
const app = fs.readFileSync(appPath, 'utf8');
const indexHtml = fs.readFileSync(indexPath, 'utf8');
const stylesEntry = fs.readFileSync(stylesEntryPath, 'utf8');
const loginLife = fs.readFileSync(loginLifePath, 'utf8');
const theme = fs.readFileSync(themePath, 'utf8');

const DISPLAY_VERSION = '1.6.19';
const BUILD_ID = '1.6.19-warm1';
const WARM_POLICY = 'shell-home-login-current-startup';
const POLICY_MARKER = `const DEVELOPMENT_WARM_POLICY = '${WARM_POLICY}';`;

const TARGET_WARM_START = Object.freeze([
  './app.js?v=1.5.1',
  './data.js',
  './module-readiness.js',
  './rak-namespace.js',
  './rak-audit-baseline.js',
  './rak-runtime-health.js',
  './rak-dom-security-hardening.js',
  './styles.css',
  './styles-inline-legacy.css',
  './styles-base.css',
  './styles-layout.css',
  './styles-theme.css',
  './styles-responsive.css',
  './styles-modal.css',
  './styles-overrides-legacy-early.css',
  './styles-interaction-guard.css',
  './styles-low-end-performance.css',
  './styles-dashboard-sync.css',
  './styles-bottom-nav-runtime.css',
  './styles-overrides-legacy-late.css',
  './styles-dashboard-fit.css',
  './styles-viewport-polish.css',
  './styles-theme-polish.css',
  './styles-release-polish.css',
  './styles-dashboard-polish.css',
  './styles-theme-propagation.css',
  './assets/nav-icons/home-gray.png',
  './assets/nav-icons/home-green.png',
  './assets/nav-icons/rotace-gray.png',
  './assets/nav-icons/rotace-green.png',
  './assets/nav-icons/kalkulacky-gray.png',
  './assets/nav-icons/kalkulacky-green.png',
  './supabase-config.js?v=1.6.0',
  './rak-user-profile.js?v=1.6.0',
  './rak-auth-gate.js?v=1.6.0',
  './rak-account-access.js?v=1.6.0',
  './rak-login-splash.js?v=1.6.0',
  './rak-login-fix.js?v=1.6.0',
  './rak-login-life.js?v=1.6.0',
  './core.js?v=1.6.0',
  './lifecycle.js?v=1.6.0',
  './app-runtime-guards.js?v=1.6.0',
  './qr.js?v=1.6.0',
  './payroll.js?v=1.6.0',
  './dashboard.js?v=1.6.0',
  './appearance-theme.js?v=1.6.0',
  './ui.js?v=1.6.0',
  './app-navigation.js?v=1.6.0',
  './app-bottom-nav.js?v=1.6.0',
  './app-actions.js?v=1.6.0',
  './app-pwa-connectivity.js?v=1.6.0',
  './app-home-boot.js?v=1.6.0',
  './rak-runtime-stability.js?v=1.6.0',
  './rak-mobile-layout-guard.js?v=1.6.0',
  './rak-feature-routing.js?v=1.6.0'
]);

const DEFERRED_STYLE_ASSETS = Object.freeze([
  './styles-rotation-summary-compact.css',
  './styles-calc-panels.css',
  './styles-shift-report.css',
  './styles-admin-reports.css',
  './styles-admin-rotation-fold.css',
  './styles-rotation-month.css',
  './styles-admin-service.css',
  './styles-settings-runtime.css',
  './styles-calculators-mid.css',
  './styles-admin-rotation-editor.css',
  './styles-admin-polish.css',
  './styles-menu-polish.css',
  './styles-stats-polish.css',
  './styles-daymods.css',
  './styles-rotation-tasks.css'
]);

function extractArray(source, name) {
  const match = source.match(new RegExp(`const ${name} = \\[\\n([\\s\\S]*?)\\n\\];`));
  if (!match) throw new Error(`[pwa-warm-cache-1619] Chybí ${name} array.`);
  const values = [];
  for (const row of match[1].split('\n')) {
    const item = row.match(/^\s*'([^']+)'\s*,?\s*$/);
    if (item) values.push(item[1]);
  }
  return { full: match[0], values };
}

function renderArray(name, values) {
  return `const ${name} = [\n${values.map((value) => `  '${value}'`).join(',\n')}\n];`;
}

function extractAppList(name) {
  const match = app.match(new RegExp(`const ${name} = \\[\\n([\\s\\S]*?)\\n  \\];`));
  if (!match) throw new Error(`[pwa-warm-cache-1619] app.js neobsahuje ${name}.`);
  return Array.from(match[1].matchAll(/"([^"]+)"/g), (item) => item[1]);
}

if (!sw.includes(POLICY_MARKER)) {
  const core = extractArray(sw, 'CORE');
  const warm = extractArray(sw, 'WARM_START');
  if (warm.values.length !== 70) {
    throw new Error(`[pwa-warm-cache-1619] Očekáván původní WARM_START=70, nalezeno ${warm.values.length}.`);
  }
  if (core.values.length !== 8 || !core.values.includes('./assets/rak-login-crab.png')) {
    throw new Error('[pwa-warm-cache-1619] CORE nemá očekávaný 8prvkový stav s login PNG.');
  }
  for (const asset of TARGET_WARM_START) {
    if (!warm.values.includes(asset)) throw new Error('[pwa-warm-cache-1619] Cílový warm asset chybí v původním seznamu: ' + asset);
  }
  for (const asset of DEFERRED_STYLE_ASSETS) {
    if (!warm.values.includes(asset)) throw new Error('[pwa-warm-cache-1619] Deferred CSS chybí v původním warm seznamu: ' + asset);
    const htmlPath = asset.replace(/^\.\//, '');
    const directLink = indexHtml.includes(`href="${htmlPath}"`);
    const importedByEntry = stylesEntry.includes(`url("${htmlPath}")`) || stylesEntry.includes(`url('${htmlPath}')`);
    if (!directLink && !importedByEntry) throw new Error('[pwa-warm-cache-1619] Deferred CSS musí zůstat dostupné přes index/styles.css cache-on-demand: ' + htmlPath);
  }

  const nextCore = core.values.filter((asset) => asset !== './assets/rak-login-crab.png');
  sw = sw.replace(core.full, renderArray('CORE', nextCore));
  sw = sw.replace(warm.full, renderArray('WARM_START', TARGET_WARM_START));

  const buildLine = /^const DEVELOPMENT_BUILD_ID = '[^']+';$/m;
  if (!buildLine.test(sw)) throw new Error('[pwa-warm-cache-1619] Chybí DEVELOPMENT_BUILD_ID pro warm policy marker.');
  sw = sw.replace(buildLine, (line) => line + '\n' + POLICY_MARKER);

  const statusLine = '      warmStartCount: WARM_START.length,';
  if (!sw.includes(statusLine)) throw new Error('[pwa-warm-cache-1619] Chybí GET_CACHE_STATUS warmStartCount.');
  sw = sw.replace(statusLine, [
    statusLine,
    '      coreCount: CORE.length,',
    '      warmPolicy: DEVELOPMENT_WARM_POLICY,',
    `      deferredStyleCount: ${DEFERRED_STYLE_ASSETS.length},`
  ].join('\n'));
}

config = config.replace(/^window\.RAK_RELEASE_VERSION = "1\.6\.\d+";$/m, `window.RAK_RELEASE_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_TEST_DISPLAY_VERSION = "1\.6\.\d+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_PWA_BUILD = "v1\.6\.[^"]+";$/m, `window.RAK_PWA_BUILD = "v${BUILD_ID}";`);
sw = sw.replace(/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '1\.6\.\d+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY_VERSION}';`);
sw = sw.replace(/^const DEVELOPMENT_BUILD_ID = '1\.6\.[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD_ID}';`);

const finalCore = extractArray(sw, 'CORE').values;
const finalWarm = extractArray(sw, 'WARM_START').values;
if (finalCore.length !== 7 || finalCore.includes('./assets/rak-login-crab.png')) {
  throw new Error('[pwa-warm-cache-1619] CORE musí mít 7 položek a bez velkého login PNG.');
}
if (finalWarm.length !== TARGET_WARM_START.length || finalWarm.length !== 55) {
  throw new Error(`[pwa-warm-cache-1619] WARM_START musí mít 55 položek, má ${finalWarm.length}.`);
}
for (const asset of TARGET_WARM_START) {
  if (!finalWarm.includes(asset)) throw new Error('[pwa-warm-cache-1619] Finální warm asset chybí: ' + asset);
}
for (const asset of DEFERRED_STYLE_ASSETS) {
  if (finalWarm.includes(asset)) throw new Error('[pwa-warm-cache-1619] Feature-only CSS zůstalo v warm cache: ' + asset);
}

const startupFiles = extractAppList('startupFiles');
const criticalFiles = extractAppList('criticalFiles');
for (const file of criticalFiles.concat(startupFiles)) {
  const url = `./${file}?v=1.6.0`;
  if (!finalWarm.includes(url)) throw new Error('[pwa-warm-cache-1619] Aktuální boot dependency nesmí z warm cache zmizet: ' + url);
}
for (const essential of [
  './styles.css', './styles-inline-legacy.css', './styles-base.css', './styles-layout.css', './styles-theme.css',
  './styles-responsive.css', './styles-modal.css', './styles-dashboard-fit.css', './styles-viewport-polish.css',
  './styles-theme-polish.css', './styles-release-polish.css', './styles-dashboard-polish.css', './styles-theme-propagation.css',
  './styles-bottom-nav-runtime.css', './styles-dashboard-sync.css'
]) {
  if (!finalWarm.includes(essential)) throw new Error('[pwa-warm-cache-1619] Home/shell CSS nesmí z warm cache zmizet: ' + essential);
}
if (!loginLife.includes('function livingSvg()') || !loginLife.includes('rakLivingLogo')) {
  throw new Error('[pwa-warm-cache-1619] Login musí mít inline SVG mascot fallback před odebráním PNG z CORE.');
}
if (!theme.includes('/* RaK 1.6.18 CSS cleanup: global theme dead helpers consolidated; visual contract unchanged. */')) {
  throw new Error('[pwa-warm-cache-1619] 1.6.18 global theme cleanup marker se nesmí ztratit.');
}
if (!sw.includes("strategy: 'navigation-network-first;build-static-cache-first;isolated-prewarm'")) {
  throw new Error('[pwa-warm-cache-1619] Navigace/cache strategie musí zůstat beze změny.');
}
if (!sw.includes("if (data.type === 'SKIP_WAITING')") || !sw.includes('self.skipWaiting();')) {
  throw new Error('[pwa-warm-cache-1619] Potvrzený update flow se nesmí ztratit.');
}
if (!sw.includes(POLICY_MARKER)
  || !sw.includes('coreCount: CORE.length,')
  || !sw.includes('warmPolicy: DEVELOPMENT_WARM_POLICY,')
  || !sw.includes(`deferredStyleCount: ${DEFERRED_STYLE_ASSETS.length},`)) {
  throw new Error('[pwa-warm-cache-1619] Warm cache diagnostics nejsou kompletní.');
}
if (!/^window\.RAK_RELEASE_VERSION = "1\.6\.19";$/m.test(config)
  || !/^window\.RAK_TEST_DISPLAY_VERSION = "1\.6\.19";$/m.test(config)
  || !/^window\.RAK_PWA_BUILD = "v1\.6\.19-warm1";$/m.test(config)) {
  throw new Error('[pwa-warm-cache-1619] Development visible/build verze není 1.6.19-warm1.');
}
if (!/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '1\.6\.19';$/m.test(sw)
  || !/^const DEVELOPMENT_BUILD_ID = '1\.6\.19-warm1';$/m.test(sw)) {
  throw new Error('[pwa-warm-cache-1619] SW verze není 1.6.19-warm1.');
}

fs.writeFileSync(swPath, sw, 'utf8');
fs.writeFileSync(configPath, config, 'utf8');
console.log(`[pwa-warm-cache-1619] OK RaK 1.6.19 WARM_START 70→${finalWarm.length}, CORE 8→${finalCore.length}; large login PNG on-demand; all current critical/startup JS + Home shell CSS preserved; update/navigation strategy unchanged`);