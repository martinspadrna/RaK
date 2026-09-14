#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = path.join(root, 'index.html');
const appPath = path.join(root, 'app.js');
const swPath = path.join(root, 'sw.js');
const configPath = path.join(root, 'supabase-config.js');
const qrPath = path.join(root, 'qr.js');
const qrDataPath = path.join(root, 'qr-data.generated.js');
const exportPath = path.join(root, 'export.js');

let html = fs.readFileSync(indexPath, 'utf8');
let app = fs.readFileSync(appPath, 'utf8');
let sw = fs.readFileSync(swPath, 'utf8');
let config = fs.readFileSync(configPath, 'utf8');
let qr = fs.readFileSync(qrPath, 'utf8');
let exportJs = fs.readFileSync(exportPath, 'utf8');

const bridge = fs.readFileSync(path.join(root, 'supabase-bridge.js'), 'utf8');
const rotationTasks = fs.readFileSync(path.join(root, 'rotation-tasks.js'), 'utf8');
const calcCss = fs.readFileSync(path.join(root, 'styles-calc-panels.css'), 'utf8');
const rotationCss = fs.readFileSync(path.join(root, 'styles-rotation-month.css'), 'utf8');
const menuCss = fs.readFileSync(path.join(root, 'styles-menu-polish.css'), 'utf8');
const adminCss = fs.readFileSync(path.join(root, 'styles-admin-polish.css'), 'utf8');
const themeCss = fs.readFileSync(path.join(root, 'styles-theme-polish.css'), 'utf8');

const DISPLAY_VERSION = '1.6.23';
const BUILD_ID = '1.6.23-qrsplit1';
const POLICY_MARKER = "const DEVELOPMENT_STARTUP_QR_POLICY = 'idle-foundation-2;feature-css-10;qr-data-lazy-offline-warm';";
const QR_SPLIT_MARKER = "const RAK_QR_DATA_SPLIT_MODE = '1.6.23-lazy-data';";
const QR_DATA_URL = './qr-data.generated.js?v=1.6.23-qrsplit1';
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
  './assets/nav-icons/kalkulacky-gray.png', './assets/nav-icons/kalkulacky-green.png',
  QR_DATA_URL
]);

function arrayBlock(source, name) {
  const match = source.match(new RegExp(`const ${name} = \\[\\n([\\s\\S]*?)\\n\\];`));
  if (!match) throw new Error(`[pwa-startup-qr-1623] Chybí ${name}.`);
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
  if (!match) throw new Error(`[pwa-startup-qr-1623] app.js neobsahuje ${name}.`);
  return Array.from(match[1].matchAll(/"([^"]+)"/g), (item) => item[1]);
}

function removeEagerScript(file) {
  const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\n?<script\\s+src="${escaped}"[^>]*><\\/script>`);
  html = html.replace(pattern, '');
}

function ensureIdleDiagnostics() {
  for (const file of DIAGNOSTIC_FILES) removeEagerScript(file);
  if (app.includes(IDLE_FOUNDATION_MARKER)) return;

  const idleAnchor = '  const idleAuditFiles = [';
  if (!app.includes(idleAnchor)) throw new Error('[pwa-startup-qr-1623] Chybí idleAuditFiles anchor.');
  const foundation = `  const idleFoundationFiles = [\n    "rak-audit-baseline.js",\n    "rak-runtime-health.js"\n  ];\n\n`;
  app = app.replace(idleAnchor, foundation + idleAnchor);

  const expectedOld = "window.__rakModuleReadinessRegistry.expected = ['module-readiness.js', 'rak-namespace.js', 'rak-audit-baseline.js', 'rak-runtime-health.js', 'rak-dom-security-hardening.js', 'app.js', 'data.js']";
  const expectedNew = "window.__rakModuleReadinessRegistry.expected = ['module-readiness.js', 'rak-namespace.js', 'rak-dom-security-hardening.js', 'app.js', 'data.js']";
  if (!app.includes(expectedOld)) throw new Error('[pwa-startup-qr-1623] Chybí původní module readiness expected seznam.');
  app = app.replace(expectedOld, expectedNew);

  const runOld = `  const runIdleAudits = () => {\n    Promise.all(idleAuditFiles.map(loadScript)).then(() => {`;
  const runNew = `  const runIdleAudits = () => {\n    loadFiles(idleFoundationFiles).then(() => Promise.all(idleAuditFiles.map(loadScript))).then(() => {`;
  if (!app.includes(runOld)) throw new Error('[pwa-startup-qr-1623] Chybí původní runIdleAudits blok.');
  app = app.replace(runOld, runNew);
}

function ensureQrSplit() {
  if (qr.includes(QR_SPLIT_MARKER)) {
    if (!fs.existsSync(qrDataPath)) throw new Error('[pwa-startup-qr-1623] QR runtime je split, ale qr-data.generated.js chybí.');
    return;
  }

  const lines = qr.split('\n');
  if (lines.length < 3 || !/^const\s+PERSON_QR_CODES\s*=/.test(lines[1] || '')) {
    throw new Error('[pwa-startup-qr-1623] qr.js nemá očekávaný PERSON_QR_CODES na druhém řádku.');
  }

  const sourceBytes = Buffer.byteLength(qr);
  const dataLine = lines[1];
  const dataObject = dataLine.replace(/^const\s+PERSON_QR_CODES\s*=\s*/, '').replace(/;\s*$/, '');
  const lazyLoader = `\n${QR_SPLIT_MARKER}\nlet __rakPersonQrDataPromise = null;\nfunction ensurePersonQrDataLoaded() {\n  if (window.PERSON_QR_CODES && Object.keys(window.PERSON_QR_CODES).length) {\n    return Promise.resolve(window.PERSON_QR_CODES);\n  }\n  if (__rakPersonQrDataPromise) return __rakPersonQrDataPromise;\n  __rakPersonQrDataPromise = new Promise((resolve, reject) => {\n    const existing = document.querySelector('script[data-rak-qr-data="1"]');\n    if (existing) {\n      if (existing.dataset.rakQrDataLoaded === '1' && window.PERSON_QR_CODES) {\n        resolve(window.PERSON_QR_CODES);\n        return;\n      }\n      existing.addEventListener('load', () => resolve(window.PERSON_QR_CODES || {}), { once: true });\n      existing.addEventListener('error', () => reject(new Error('qr-data.generated.js load failed')), { once: true });\n      return;\n    }\n    const script = document.createElement('script');\n    script.src = 'qr-data.generated.js?v=1.6.23-qrsplit1';\n    script.async = true;\n    script.dataset.rakQrData = '1';\n    script.onload = () => {\n      script.dataset.rakQrDataLoaded = '1';\n      resolve(window.PERSON_QR_CODES || {});\n    };\n    script.onerror = () => {\n      __rakPersonQrDataPromise = null;\n      reject(new Error('qr-data.generated.js load failed'));\n    };\n    document.head.appendChild(script);\n  });\n  return __rakPersonQrDataPromise;\n}\nif (typeof window !== 'undefined') window.ensurePersonQrDataLoaded = ensurePersonQrDataLoaded;\n`;

  let runtime = [lines[0] + lazyLoader, ...lines.slice(2)].join('\n');
  const oldLookup = 'return PERSON_QR_CODES[normalizePersonQrKey(name)] || null;';
  const newLookup = 'return (window.PERSON_QR_CODES || {})[normalizePersonQrKey(name)] || null;';
  if (!runtime.includes(oldLookup)) throw new Error('[pwa-startup-qr-1623] Chybí původní QR lookup.');
  runtime = runtime.replace(oldLookup, newLookup);

  const oldShow = 'function showPersonQrModal(name) {';
  const newShow = `async function showPersonQrModal(name) {\n  try {\n    await ensurePersonQrDataLoaded();\n  } catch (err) {\n    console.warn('RaK QR data se nepodařilo načíst', err);\n    alert('QR kódy se nepodařilo načíst. Zkus to prosím znovu.');\n    return;\n  }`;
  if (!runtime.includes(oldShow)) throw new Error('[pwa-startup-qr-1623] Chybí showPersonQrModal pro lazy QR split.');
  runtime = runtime.replace(oldShow, newShow);

  const data = `// Generated from qr.js by tools/pwa-startup-qr-1623.mjs. Do not edit manually.\nwindow.PERSON_QR_CODES = ${dataObject};\n`;
  new vm.Script(runtime, { filename: 'qr.js' });
  new vm.Script(data, { filename: 'qr-data.generated.js' });

  const runtimeBytes = Buffer.byteLength(runtime);
  const dataBytes = Buffer.byteLength(data);
  if (runtimeBytes >= sourceBytes) throw new Error('[pwa-startup-qr-1623] QR runtime se po splitu nezmenšil.');
  if (dataBytes < 10000) throw new Error('[pwa-startup-qr-1623] QR data jsou neočekávaně malá.');
  if (!runtime.includes('const BRUS_CONFIG') || !runtime.includes('function getFoodMachineSettings') || !runtime.includes('function getFoodSpecialDateSet')) {
    throw new Error('[pwa-startup-qr-1623] QR split odřízl runtime Brusy/Jídelna funkce.');
  }

  qr = runtime;
  fs.writeFileSync(qrDataPath, data, 'utf8');
  console.log(`[pwa-startup-qr-1623] qr.js ${sourceBytes} B -> startup runtime ${runtimeBytes} B + lazy/offline-warm data ${dataBytes} B`);
}

function ensureExportIncludesQrData() {
  if (!exportJs.includes('"qr-data.generated.js"')) {
    const anchor = '  "qr.js",\n';
    if (!exportJs.includes(anchor)) throw new Error('[pwa-startup-qr-1623] Export manifest nemá qr.js anchor.');
    exportJs = exportJs.replace(anchor, anchor + '  "qr-data.generated.js",\n');
  }
}

ensureIdleDiagnostics();
ensureQrSplit();
ensureExportIncludesQrData();

if (!sw.includes(POLICY_MARKER)) {
  const core = arrayBlock(sw, 'CORE');
  const warm = arrayBlock(sw, 'WARM_START');
  if (core.values.length !== 8 || !core.values.includes('./assets/rak-login-crab.png')) {
    throw new Error('[pwa-startup-qr-1623] CORE/login kontrakt porušen.');
  }
  if (warm.values.length !== 70) {
    throw new Error(`[pwa-startup-qr-1623] Očekáván stabilní source WARM_START=70, nalezeno ${warm.values.length}.`);
  }
  for (const asset of DEFERRED_WARM) {
    if (!warm.values.includes(asset)) throw new Error('[pwa-startup-qr-1623] Cílový warm asset chybí: ' + asset);
  }
  for (const asset of DEFERRED_STYLES) {
    if (!html.includes(asset.replace(/^\.\//, ''))) throw new Error('[pwa-startup-qr-1623] Deferred CSS není linkovaný v indexu: ' + asset);
  }
  const next = warm.values.filter((asset) => !DEFERRED_WARM.includes(asset));
  if (next.length !== 58) throw new Error('[pwa-startup-qr-1623] Základ po deferral musí mít WARM_START=58.');
  if (!next.includes('./qr.js?v=1.6.0')) throw new Error('[pwa-startup-qr-1623] Slim qr.js musí zůstat warm startup dependency.');
  next.push(QR_DATA_URL);
  if (next.length !== 59) throw new Error('[pwa-startup-qr-1623] QR offline warm musí skončit na WARM_START=59.');
  sw = sw.replace(warm.full, renderArray('WARM_START', next));

  const buildLine = /^const DEVELOPMENT_BUILD_ID = '[^']+';$/m;
  if (!buildLine.test(sw)) throw new Error('[pwa-startup-qr-1623] Chybí build marker.');
  sw = sw.replace(buildLine, (line) => line + '\n' + POLICY_MARKER);

  const status = '      warmStartCount: WARM_START.length,';
  if (!sw.includes(status)) throw new Error('[pwa-startup-qr-1623] Chybí cache diagnostika.');
  sw = sw.replace(status, [
    status,
    '      coreCount: CORE.length,',
    '      startupQrPolicy: DEVELOPMENT_STARTUP_QR_POLICY,',
    `      deferredStyleCount: ${DEFERRED_STYLES.length},`,
    `      deferredStartupDiagnosticCount: ${DIAGNOSTIC_FILES.length},`,
    '      qrDataLazy: true,',
    '      qrDataOfflineWarm: true,'
  ].join('\n'));
}

config = config.replace(/^window\.RAK_RELEASE_VERSION = "1\.6\.\d+";$/m, `window.RAK_RELEASE_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_TEST_DISPLAY_VERSION = "1\.6\.\d+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_PWA_BUILD = "v1\.6\.[^"]+";$/m, `window.RAK_PWA_BUILD = "v${BUILD_ID}";`);
sw = sw.replace(/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '1\.6\.\d+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY_VERSION}';`);
sw = sw.replace(/^const DEVELOPMENT_BUILD_ID = '1\.6\.[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD_ID}';`);

for (const file of DIAGNOSTIC_FILES) {
  if (new RegExp(`<script\\s+src="${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(html)) {
    throw new Error('[pwa-startup-qr-1623] Diagnostika zůstala parser-blocking v indexu: ' + file);
  }
}
if (!app.includes('const idleFoundationFiles = [') || !app.includes('"rak-audit-baseline.js"') || !app.includes('"rak-runtime-health.js"')) {
  throw new Error('[pwa-startup-qr-1623] Idle diagnostic foundation chybí.');
}
if (!app.includes('loadFiles(idleFoundationFiles).then(() => Promise.all(idleAuditFiles.map(loadScript)))')) {
  throw new Error('[pwa-startup-qr-1623] Idle foundation se nenačítá před ostatními audity.');
}
const expectedMatch = app.match(/window\.__rakModuleReadinessRegistry\.expected = \[([^\]]+)\]/);
if (!expectedMatch) throw new Error('[pwa-startup-qr-1623] Chybí module readiness expected seznam.');
if (expectedMatch[1].includes('rak-audit-baseline.js') || expectedMatch[1].includes('rak-runtime-health.js')) {
  throw new Error('[pwa-startup-qr-1623] Idle diagnostika stále blokuje startup readiness.');
}
if (!expectedMatch[1].includes('rak-dom-security-hardening.js')) {
  throw new Error('[pwa-startup-qr-1623] DOM security musí zůstat eager.');
}

if (!qr.includes(QR_SPLIT_MARKER)) throw new Error('[pwa-startup-qr-1623] QR runtime split marker chybí.');
if (/^const\s+PERSON_QR_CODES\s*=/m.test(qr)) throw new Error('[pwa-startup-qr-1623] Obří QR data zůstala ve startup qr.js.');
if (!qr.includes('async function showPersonQrModal(name)') || !qr.includes('await ensurePersonQrDataLoaded();')) throw new Error('[pwa-startup-qr-1623] QR modal není navázaný na lazy data loader.');
if (!qr.includes('const BRUS_CONFIG') || !qr.includes('function getFoodMachineSettings') || !qr.includes('function getFoodSpecialDateSet')) throw new Error('[pwa-startup-qr-1623] Slim qr.js ztratil Brusy/Jídelna runtime.');
if (!fs.existsSync(qrDataPath)) throw new Error('[pwa-startup-qr-1623] qr-data.generated.js chybí.');
const qrData = fs.readFileSync(qrDataPath, 'utf8');
new vm.Script(qr, { filename: 'qr.js' });
new vm.Script(qrData, { filename: 'qr-data.generated.js' });
if (!qrData.includes('window.PERSON_QR_CODES = ') || qrData.length < 10000) throw new Error('[pwa-startup-qr-1623] QR data soubor je neplatný.');
if (!exportJs.includes('"qr.js",\n  "qr-data.generated.js",')) throw new Error('[pwa-startup-qr-1623] Export manifest neobsahuje QR data soubor.');

const core = arrayBlock(sw, 'CORE').values;
const warm = arrayBlock(sw, 'WARM_START').values;
if (core.length !== 8 || !core.includes('./assets/rak-login-crab.png')) throw new Error('[pwa-startup-qr-1623] CORE musí zůstat 8 včetně login PNG.');
if (warm.length !== 59) throw new Error(`[pwa-startup-qr-1623] WARM_START musí být 59, je ${warm.length}.`);
for (const asset of DEFERRED_WARM) if (warm.includes(asset)) throw new Error('[pwa-startup-qr-1623] Deferred asset zůstal ve warm cache: ' + asset);
for (const asset of REQUIRED_WARM) if (!warm.includes(asset)) throw new Error('[pwa-startup-qr-1623] Chráněný warm asset zmizel: ' + asset);
for (const file of appList('criticalFiles').concat(appList('startupFiles'))) {
  const url = `./${file}?v=1.6.0`;
  if (!warm.includes(url)) throw new Error('[pwa-startup-qr-1623] Boot/auth/startup dependency zmizela: ' + url);
}
if (!sw.includes("strategy: 'navigation-network-first;build-static-cache-first;isolated-prewarm'")) throw new Error('[pwa-startup-qr-1623] Network-first kontrakt chybí.');
if (!sw.includes("if (data.type === 'SKIP_WAITING')") || !sw.includes('self.skipWaiting();')) throw new Error('[pwa-startup-qr-1623] Potvrzovací update flow chybí.');
if (!bridge.includes("const RAK_ACTIVE_WRITE_PATHS_RPC_ONLY = '1.6.14-sec1';")) throw new Error('[pwa-startup-qr-1623] RPC-only security marker chybí.');
if (!rotationTasks.includes("const RAK_SHARED_MSKC01_TASKS_MODE = '1.6.13-two-lathes';") || !rotationTasks.includes("tasksForMachine('MSKC01', normalizedShift)") || !rotationTasks.includes('sharedMskc01: shouldShareMskc01FromCard(card)')) throw new Error('[pwa-startup-qr-1623] MSKC01 sharing kontrakt chybí.');
if (!calcCss.includes('calcPanel') || !rotationCss.includes('rotationViewFold') || !menuCss.includes('.appMenu') || !adminCss.includes('#appMenuBody') || !themeCss.includes('/* RaK 1.6.18 CSS cleanup: global theme dead helpers consolidated; visual contract unchanged. */')) throw new Error('[pwa-startup-qr-1623] CSS cleanup 1.6.15–1.6.18 kontrakt není kompletní.');
if (!sw.includes(POLICY_MARKER) || !sw.includes('coreCount: CORE.length,') || !sw.includes('deferredStyleCount: 10,') || !sw.includes('deferredStartupDiagnosticCount: 2,') || !sw.includes('qrDataLazy: true,') || !sw.includes('qrDataOfflineWarm: true,')) throw new Error('[pwa-startup-qr-1623] Startup/QR diagnostika v SW chybí.');
if (!/^window\.RAK_RELEASE_VERSION = "1\.6\.23";$/m.test(config) || !/^window\.RAK_TEST_DISPLAY_VERSION = "1\.6\.23";$/m.test(config) || !/^window\.RAK_PWA_BUILD = "v1\.6\.23-qrsplit1";$/m.test(config) || !/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '1\.6\.23';$/m.test(sw) || !/^const DEVELOPMENT_BUILD_ID = '1\.6\.23-qrsplit1';$/m.test(sw)) throw new Error('[pwa-startup-qr-1623] Verze/build marker není 1.6.23-qrsplit1.');

fs.writeFileSync(indexPath, html, 'utf8');
fs.writeFileSync(appPath, app, 'utf8');
fs.writeFileSync(swPath, sw, 'utf8');
fs.writeFileSync(configPath, config, 'utf8');
fs.writeFileSync(qrPath, qr, 'utf8');
fs.writeFileSync(exportPath, exportJs, 'utf8');

console.log(`[pwa-startup-qr-1623] OK RaK 1.6.23: diagnostics idle + QR data mimo startup JS; qr runtime ${Buffer.byteLength(qr)} B; qr data ${Buffer.byteLength(qrData)} B; WARM_START=59; QR zůstává offline warm; CORE/login/auth/Menu/Rotace/dashboard/update/security/export preserved`);
