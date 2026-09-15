#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const swPath = path.join(root, 'sw.js');
const configPath = path.join(root, 'supabase-config.js');
const appPath = path.join(root, 'app.js');
const indexPath = path.join(root, 'index.html');
const themePath = path.join(root, 'styles-theme-polish.css');
const accountAccessPath = path.join(root, 'rak-account-access.js');
const authGatePath = path.join(root, 'rak-auth-gate.js');

let sw = fs.readFileSync(swPath, 'utf8');
let config = fs.readFileSync(configPath, 'utf8');
const app = fs.readFileSync(appPath, 'utf8');
const indexHtml = fs.readFileSync(indexPath, 'utf8');
const theme = fs.readFileSync(themePath, 'utf8');
const accountAccess = fs.readFileSync(accountAccessPath, 'utf8');
const authGate = fs.readFileSync(authGatePath, 'utf8');

const DISPLAY_VERSION = '1.6.20';
const BUILD_ID = '1.6.20-warmmicro1';
const WARM_POLICY = 'micro-defer-calculator-css-2';
const POLICY_MARKER = `const DEVELOPMENT_WARM_POLICY = '${WARM_POLICY}';`;
const DEFERRED = Object.freeze([
  './styles-calc-panels.css',
  './styles-calculators-mid.css'
]);

function extractArray(source, name) {
  const match = source.match(new RegExp(`const ${name} = \\[\\n([\\s\\S]*?)\\n\\];`));
  if (!match) throw new Error(`[pwa-warm-cache-micro-1620] Chybí ${name} array.`);
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
  if (!match) throw new Error(`[pwa-warm-cache-micro-1620] app.js neobsahuje ${name}.`);
  return Array.from(match[1].matchAll(/"([^"]+)"/g), (item) => item[1]);
}

if (!sw.includes(POLICY_MARKER)) {
  const core = extractArray(sw, 'CORE');
  const warm = extractArray(sw, 'WARM_START');
  if (core.values.length !== 8 || !core.values.includes('./assets/rak-login-crab.png')) {
    throw new Error('[pwa-warm-cache-micro-1620] CORE musí zůstat původních 8 položek včetně login PNG.');
  }
  if (warm.values.length !== 70) {
    throw new Error(`[pwa-warm-cache-micro-1620] Očekáván WARM_START=70, nalezeno ${warm.values.length}.`);
  }
  for (const asset of DEFERRED) {
    if (!warm.values.includes(asset)) throw new Error('[pwa-warm-cache-micro-1620] Cílové CSS chybí ve warm cache: ' + asset);
    const plain = asset.replace(/^\.\//, '');
    if (!indexHtml.includes(plain)) throw new Error('[pwa-warm-cache-micro-1620] Cílové CSS není dostupné z indexu: ' + plain);
  }
  const nextWarm = warm.values.filter((asset) => !DEFERRED.includes(asset));
  sw = sw.replace(warm.full, renderArray('WARM_START', nextWarm));

  const buildLine = /^const DEVELOPMENT_BUILD_ID = '[^']+';$/m;
  if (!buildLine.test(sw)) throw new Error('[pwa-warm-cache-micro-1620] Chybí DEVELOPMENT_BUILD_ID.');
  sw = sw.replace(buildLine, (line) => line + '\n' + POLICY_MARKER);

  const statusLine = '      warmStartCount: WARM_START.length,';
  if (!sw.includes(statusLine)) throw new Error('[pwa-warm-cache-micro-1620] Chybí warmStartCount diagnostika.');
  sw = sw.replace(statusLine, [
    statusLine,
    '      coreCount: CORE.length,',
    '      warmPolicy: DEVELOPMENT_WARM_POLICY,',
    `      deferredStyleCount: ${DEFERRED.length},`
  ].join('\n'));
}

config = config.replace(/^window\.RAK_RELEASE_VERSION = "1\.6\.\d+";$/m, `window.RAK_RELEASE_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_TEST_DISPLAY_VERSION = "1\.6\.\d+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_PWA_BUILD = "v1\.6\.[^"]+";$/m, `window.RAK_PWA_BUILD = "v${BUILD_ID}";`);
sw = sw.replace(/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '1\.6\.\d+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY_VERSION}';`);
sw = sw.replace(/^const DEVELOPMENT_BUILD_ID = '1\.6\.[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD_ID}';`);

const finalCore = extractArray(sw, 'CORE').values;
const finalWarm = extractArray(sw, 'WARM_START').values;
if (finalCore.length !== 8 || !finalCore.includes('./assets/rak-login-crab.png')) {
  throw new Error('[pwa-warm-cache-micro-1620] CORE/login se nesmí změnit.');
}
if (finalWarm.length !== 68) throw new Error(`[pwa-warm-cache-micro-1620] WARM_START musí mít 68 položek, má ${finalWarm.length}.`);
for (const asset of DEFERRED) {
  if (finalWarm.includes(asset)) throw new Error('[pwa-warm-cache-micro-1620] Cílové CSS zůstalo ve warm cache: ' + asset);
}
for (const file of extractAppList('criticalFiles').concat(extractAppList('startupFiles'))) {
  const url = `./${file}?v=1.6.0`;
  if (!finalWarm.includes(url)) throw new Error('[pwa-warm-cache-micro-1620] Boot/auth/startup dependency zmizela: ' + url);
}
for (const essential of [
  './styles.css', './styles-inline-legacy.css', './styles-base.css', './styles-layout.css', './styles-theme.css',
  './styles-responsive.css', './styles-modal.css', './styles-overrides-legacy-early.css', './styles-overrides-legacy-late.css',
  './styles-dashboard-sync.css', './styles-bottom-nav-runtime.css', './styles-dashboard-fit.css', './styles-viewport-polish.css',
  './styles-theme-polish.css', './styles-release-polish.css', './styles-dashboard-polish.css', './styles-theme-propagation.css',
  './styles-admin-polish.css', './styles-menu-polish.css', './styles-daymods.css', './styles-rotation-tasks.css'
]) {
  if (!finalWarm.includes(essential)) throw new Error('[pwa-warm-cache-micro-1620] Ne-cílové shell/feature CSS se nesmí změnit: ' + essential);
}
if (!accountAccess.includes("const ADMIN_PROMPTED_KEY = 'adminPromptedAccountSession';")
  || !accountAccess.includes('async function accountNeedsAdminPassword(accountId)')
  || !authGate.includes('window.rakAuthGateIsUnlocked')) {
  throw new Error('[pwa-warm-cache-micro-1620] Auth/admin startup kontrakt se nesmí změnit.');
}
if (!theme.includes('/* RaK 1.6.18 CSS cleanup: global theme dead helpers consolidated; visual contract unchanged. */')) {
  throw new Error('[pwa-warm-cache-micro-1620] 1.6.18 theme cleanup se nesmí ztratit.');
}
if (!sw.includes("strategy: 'navigation-network-first;build-static-cache-first;isolated-prewarm'")) {
  throw new Error('[pwa-warm-cache-micro-1620] Navigace musí zůstat network-first.');
}
if (!sw.includes("if (data.type === 'SKIP_WAITING')") || !sw.includes('self.skipWaiting();')) {
  throw new Error('[pwa-warm-cache-micro-1620] Potvrzený update flow se nesmí změnit.');
}
if (!sw.includes(POLICY_MARKER)
  || !sw.includes('coreCount: CORE.length,')
  || !sw.includes('warmPolicy: DEVELOPMENT_WARM_POLICY,')
  || !sw.includes(`deferredStyleCount: ${DEFERRED.length},`)) {
  throw new Error('[pwa-warm-cache-micro-1620] Warm-cache diagnostika chybí.');
}
if (!/^window\.RAK_RELEASE_VERSION = "1\.6\.20";$/m.test(config)
  || !/^window\.RAK_TEST_DISPLAY_VERSION = "1\.6\.20";$/m.test(config)
  || !/^window\.RAK_PWA_BUILD = "v1\.6\.20-warmmicro1";$/m.test(config)
  || !/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '1\.6\.20';$/m.test(sw)
  || !/^const DEVELOPMENT_BUILD_ID = '1\.6\.20-warmmicro1';$/m.test(sw)) {
  throw new Error('[pwa-warm-cache-micro-1620] Verze/build marker není 1.6.20-warmmicro1.');
}

fs.writeFileSync(swPath, sw, 'utf8');
fs.writeFileSync(configPath, config, 'utf8');
console.log('[pwa-warm-cache-micro-1620] OK RaK 1.6.20 WARM_START 70→68; CORE/login/auth/startup untouched; only 2 calculator CSS deferred; network-first/update flow preserved');
