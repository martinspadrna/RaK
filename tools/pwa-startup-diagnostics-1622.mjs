#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = path.join(root, 'index.html');
const appPath = path.join(root, 'app.js');
const swPath = path.join(root, 'sw.js');
const configPath = path.join(root, 'supabase-config.js');

let html = fs.readFileSync(indexPath, 'utf8');
let app = fs.readFileSync(appPath, 'utf8');
let sw = fs.readFileSync(swPath, 'utf8');
let config = fs.readFileSync(configPath, 'utf8');

const bridge = fs.readFileSync(path.join(root, 'supabase-bridge.js'), 'utf8');
const rotationTasks = fs.readFileSync(path.join(root, 'rotation-tasks.js'), 'utf8');
const calcCss = fs.readFileSync(path.join(root, 'styles-calc-panels.css'), 'utf8');
const rotationCss = fs.readFileSync(path.join(root, 'styles-rotation-month.css'), 'utf8');
const menuCss = fs.readFileSync(path.join(root, 'styles-menu-polish.css'), 'utf8');
const adminCss = fs.readFileSync(path.join(root, 'styles-admin-polish.css'), 'utf8');
const themeCss = fs.readFileSync(path.join(root, 'styles-theme-polish.css'), 'utf8');

const DISPLAY_VERSION = '1.6.22';
const BUILD_ID = '1.6.22-startupdiag1';
const POLICY_MARKER = "const DEVELOPMENT_STARTUP_DIAGNOSTIC_POLICY = 'idle-foundation-2;feature-css-10';";
const IDLE_FOUNDATION_MARKER = 'const idleFoundationFiles = [';
const DIAGNOSTIC_FILES = Object.freeze(['rak-audit-baseline.js', 'rak-runtime-health.js']);
const DEFERRED_STYLES = Object.freeze([
  './styles-calc-panels.css', './styles-calculators-mid.css', './styles-shift-report.css', './styles-admin-reports.css',
  './styles-admin-rotation-fold.css', './styles-admin-service.css', './styles-admin-rotation-editor.css', './styles-stats-polish.css',
  './styles-daymods.css', './styles-rotation-tasks.css'
]);
const DEFERRED_WARM = Object.freeze([
  ...DEFERRED_STYLES,
  './rak-audit-baseline.js',
  './rak-runtime-health.js'
]);
const REQUIRED_WARM = Object.freeze([
  './app.js?v=1.5.1', './data.js', './module-readiness.js', './rak-namespace.js', './rak-dom-security-hardening.js',
  './styles.css', './styles-inline-legacy.css', './styles-base.css', './styles-layout.css', './styles-theme.css', './styles-responsive.css',
  './styles-modal.css', './styles-rotation-summary-compact.css', './styles-overrides-legacy-early.css', './styles-interaction-guard.css',
  './styles-rotation-month.css', './styles-low-end-performance.css', './styles-dashboard-sync.css', './styles-settings-runtime.css',
  './styles-bottom-nav-runtime.css', './styles-overrides-legacy-late.css', './styles-dashboard-fit.css', './styles-admin-polish.css',
  './styles-menu-polish.css', './styles-viewport-polish.css', './styles-theme-polish.css', './styles-release-polish.css',
  './styles-dashboard-polish.css', './styles-theme-propagation.css',
  './assets/nav-icons/home-gray.png', './assets/nav-icons/home-green.png', './assets/nav-icons/rotace-gray.png', './assets/nav-icons/rotace-green.png',
  './assets/nav-icons/kalkulacky-gray.png', './assets/nav-icons/kalkulacky-green.png'
]);

function arrayBlock(source, name) {
  const match = source.match(new RegExp(`const ${name} = \\[\\n([\\s\\S]*?)\\n\\];`));
  if (!match) throw new Error(`[pwa-startup-diagnostics-1622] Chybí ${name}.`);
  const values = match[1].split('\n').map((row) => {
    const item = row.match(/^\s*'([^']+)'\s*,?\s*$/);
    return item ? item[1] : '';
  }).filter(Boolean);
  return { full: match[0], values };
}

function renderArray(name, values) {
  return `const ${name} = [\n${values.map((value) => `  '${value}'`).join(',\n')}\n];`;
}

function appList(name) {
  const match = app.match(new RegExp(`const ${name} = \\[\\n([\\s\\S]*?)\\n  \\];`));
  if (!match) throw new Error(`[pwa-startup-diagnostics-1622] app.js neobsahuje ${name}.`);
  return Array.from(match[1].matchAll(/"([^"]+)"/g), (item) => item[1]);
}

function removeEagerScript(file) {
  const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\n?<script\\s+src="${escaped}"[^>]*><\\/script>`);
  html = html.replace(pattern, '');
}

// 1) Two diagnostic-only foundations are no longer parser-blocking during boot.
for (const file of DIAGNOSTIC_FILES) removeEagerScript(file);

if (!app.includes(IDLE_FOUNDATION_MARKER)) {
  const idleAnchor = '  const idleAuditFiles = [';
  if (!app.includes(idleAnchor)) throw new Error('[pwa-startup-diagnostics-1622] Chybí idleAuditFiles anchor.');
  const foundation = `  const idleFoundationFiles = [\n    "rak-audit-baseline.js",\n    "rak-runtime-health.js"\n  ];\n\n`;
  app = app.replace(idleAnchor, foundation + idleAnchor);

  const expectedOld = "window.__rakModuleReadinessRegistry.expected = ['module-readiness.js', 'rak-namespace.js', 'rak-audit-baseline.js', 'rak-runtime-health.js', 'rak-dom-security-hardening.js', 'app.js', 'data.js']";
  const expectedNew = "window.__rakModuleReadinessRegistry.expected = ['module-readiness.js', 'rak-namespace.js', 'rak-dom-security-hardening.js', 'app.js', 'data.js']";
  if (!app.includes(expectedOld)) throw new Error('[pwa-startup-diagnostics-1622] Chybí původní module readiness expected seznam.');
  app = app.replace(expectedOld, expectedNew);

  const runOld = `  const runIdleAudits = () => {\n    Promise.all(idleAuditFiles.map(loadScript)).then(() => {`;
  const runNew = `  const runIdleAudits = () => {\n    loadFiles(idleFoundationFiles).then(() => Promise.all(idleAuditFiles.map(loadScript))).then(() => {`;
  if (!app.includes(runOld)) throw new Error('[pwa-startup-diagnostics-1622] Chybí původní runIdleAudits blok.');
  app = app.replace(runOld, runNew);
}

// 2) Preserve 1.6.21 CSS deferral and also stop prewarming the two idle-only diagnostics.
if (!sw.includes(POLICY_MARKER)) {
  const core = arrayBlock(sw, 'CORE');
  const warm = arrayBlock(sw, 'WARM_START');
  if (core.values.length !== 8 || !core.values.includes('./assets/rak-login-crab.png')) {
    throw new Error('[pwa-startup-diagnostics-1622] CORE/login kontrakt porušen.');
  }
  if (warm.values.length !== 70) {
    throw new Error(`[pwa-startup-diagnostics-1622] Očekáván stabilní source WARM_START=70, nalezeno ${warm.values.length}.`);
  }
  for (const asset of DEFERRED_WARM) {
    if (!warm.values.includes(asset)) throw new Error('[pwa-startup-diagnostics-1622] Cílový warm asset chybí: ' + asset);
  }
  for (const asset of DEFERRED_STYLES) {
    if (!html.includes(asset.replace(/^\.\//, ''))) throw new Error('[pwa-startup-diagnostics-1622] Deferred CSS není linkovaný v indexu: ' + asset);
  }
  const next = warm.values.filter((asset) => !DEFERRED_WARM.includes(asset));
  if (next.length !== 58) throw new Error('[pwa-startup-diagnostics-1622] Přesný startup batch musí skončit na WARM_START=58.');
  sw = sw.replace(warm.full, renderArray('WARM_START', next));

  const buildLine = /^const DEVELOPMENT_BUILD_ID = '[^']+';$/m;
  if (!buildLine.test(sw)) throw new Error('[pwa-startup-diagnostics-1622] Chybí build marker.');
  sw = sw.replace(buildLine, (line) => line + '\n' + POLICY_MARKER);

  const status = '      warmStartCount: WARM_START.length,';
  if (!sw.includes(status)) throw new Error('[pwa-startup-diagnostics-1622] Chybí cache diagnostika.');
  sw = sw.replace(status, [
    status,
    '      coreCount: CORE.length,',
    '      startupDiagnosticPolicy: DEVELOPMENT_STARTUP_DIAGNOSTIC_POLICY,',
    `      deferredStyleCount: ${DEFERRED_STYLES.length},`,
    `      deferredStartupDiagnosticCount: ${DIAGNOSTIC_FILES.length},`
  ].join('\n'));
}

config = config.replace(/^window\.RAK_RELEASE_VERSION = "1\.6\.\d+";$/m, `window.RAK_RELEASE_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_TEST_DISPLAY_VERSION = "1\.6\.\d+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_PWA_BUILD = "v1\.6\.[^"]+";$/m, `window.RAK_PWA_BUILD = "v${BUILD_ID}";`);
sw = sw.replace(/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '1\.6\.\d+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY_VERSION}';`);
sw = sw.replace(/^const DEVELOPMENT_BUILD_ID = '1\.6\.[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD_ID}';`);

// Final guards: startup contract is smaller, but auth/security/navigation and all product features stay unchanged.
for (const file of DIAGNOSTIC_FILES) {
  if (new RegExp(`<script\\s+src="${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(html)) {
    throw new Error('[pwa-startup-diagnostics-1622] Diagnostika zůstala parser-blocking v indexu: ' + file);
  }
}
if (!app.includes('const idleFoundationFiles = [') || !app.includes('"rak-audit-baseline.js"') || !app.includes('"rak-runtime-health.js"')) {
  throw new Error('[pwa-startup-diagnostics-1622] Idle diagnostic foundation chybí.');
}
if (!app.includes('loadFiles(idleFoundationFiles).then(() => Promise.all(idleAuditFiles.map(loadScript)))')) {
  throw new Error('[pwa-startup-diagnostics-1622] Idle foundation se nenačítá před ostatními audity.');
}
const expectedMatch = app.match(/window\.__rakModuleReadinessRegistry\.expected = \[([^\]]+)\]/);
if (!expectedMatch) throw new Error('[pwa-startup-diagnostics-1622] Chybí module readiness expected seznam.');
if (expectedMatch[1].includes('rak-audit-baseline.js') || expectedMatch[1].includes('rak-runtime-health.js')) {
  throw new Error('[pwa-startup-diagnostics-1622] Idle diagnostika stále blokuje startup readiness.');
}
if (!expectedMatch[1].includes('rak-dom-security-hardening.js')) {
  throw new Error('[pwa-startup-diagnostics-1622] DOM security musí zůstat eager.');
}

const core = arrayBlock(sw, 'CORE').values;
const warm = arrayBlock(sw, 'WARM_START').values;
if (core.length !== 8 || !core.includes('./assets/rak-login-crab.png')) throw new Error('[pwa-startup-diagnostics-1622] CORE musí zůstat 8 včetně login PNG.');
if (warm.length !== 58) throw new Error(`[pwa-startup-diagnostics-1622] WARM_START musí být 58, je ${warm.length}.`);
for (const asset of DEFERRED_WARM) if (warm.includes(asset)) throw new Error('[pwa-startup-diagnostics-1622] Deferred asset zůstal ve warm cache: ' + asset);
for (const asset of REQUIRED_WARM) if (!warm.includes(asset)) throw new Error('[pwa-startup-diagnostics-1622] Chráněný warm asset zmizel: ' + asset);
for (const file of appList('criticalFiles').concat(appList('startupFiles'))) {
  const url = `./${file}?v=1.6.0`;
  if (!warm.includes(url)) throw new Error('[pwa-startup-diagnostics-1622] Boot/auth/startup dependency zmizela: ' + url);
}
if (!sw.includes("strategy: 'navigation-network-first;build-static-cache-first;isolated-prewarm'")) throw new Error('[pwa-startup-diagnostics-1622] Network-first kontrakt chybí.');
if (!sw.includes("if (data.type === 'SKIP_WAITING')") || !sw.includes('self.skipWaiting();')) throw new Error('[pwa-startup-diagnostics-1622] Potvrzovací update flow chybí.');
if (!bridge.includes("const RAK_ACTIVE_WRITE_PATHS_RPC_ONLY = '1.6.14-sec1';")) throw new Error('[pwa-startup-diagnostics-1622] RPC-only security marker chybí.');
if (!rotationTasks.includes("const RAK_SHARED_MSKC01_TASKS_MODE = '1.6.13-two-lathes';") || !rotationTasks.includes("tasksForMachine('MSKC01', normalizedShift)") || !rotationTasks.includes('sharedMskc01: shouldShareMskc01FromCard(card)')) throw new Error('[pwa-startup-diagnostics-1622] MSKC01 sharing kontrakt chybí.');
if (!calcCss.includes('calcPanel') || !rotationCss.includes('rotationViewFold') || !menuCss.includes('.appMenu') || !adminCss.includes('#appMenuBody') || !themeCss.includes('/* RaK 1.6.18 CSS cleanup: global theme dead helpers consolidated; visual contract unchanged. */')) throw new Error('[pwa-startup-diagnostics-1622] CSS cleanup 1.6.15–1.6.18 kontrakt není kompletní.');
if (!sw.includes(POLICY_MARKER) || !sw.includes('coreCount: CORE.length,') || !sw.includes('deferredStyleCount: 10,') || !sw.includes('deferredStartupDiagnosticCount: 2,')) throw new Error('[pwa-startup-diagnostics-1622] Startup diagnostika v SW chybí.');
if (!/^window\.RAK_RELEASE_VERSION = "1\.6\.22";$/m.test(config) || !/^window\.RAK_TEST_DISPLAY_VERSION = "1\.6\.22";$/m.test(config) || !/^window\.RAK_PWA_BUILD = "v1\.6\.22-startupdiag1";$/m.test(config) || !/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '1\.6\.22';$/m.test(sw) || !/^const DEVELOPMENT_BUILD_ID = '1\.6\.22-startupdiag1';$/m.test(sw)) throw new Error('[pwa-startup-diagnostics-1622] Verze/build marker není 1.6.22-startupdiag1.');

fs.writeFileSync(indexPath, html, 'utf8');
fs.writeFileSync(appPath, app, 'utf8');
fs.writeFileSync(swPath, sw, 'utf8');
fs.writeFileSync(configPath, config, 'utf8');
console.log('[pwa-startup-diagnostics-1622] OK RaK 1.6.22: 2 diagnostické helpery parser-blocking→idle; WARM_START 70→58; CORE/login/auth/startup/Menu/Rotace/dashboard/update/security preserved');
