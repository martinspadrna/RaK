#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DISPLAY_VERSION = '1.6.30';
const BUILD_ID = '1.6.30-audit1';
const PREV_POLICY = "const DEVELOPMENT_MUTATION_OBSERVER_POLICY = 'scoped-8;raf-coalesced-7;runtime-stability-targeted';";
const POLICY = "const DEVELOPMENT_FULL_APP_AUDIT_POLICY = 'export-manifest-current;diagnostics-no-games;keepalive-rpc-only;security-smoke-executed';";

function fail(message) { throw new Error('[full-app-audit-fixes-1630] ' + message); }
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function write(file, source) { fs.writeFileSync(path.join(root, file), source, 'utf8'); }
function assert(condition, message) { if (!condition) fail(message); }
function escapeRe(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  assert(source.includes(before), 'Missing marker: ' + label);
  return source.replace(before, after);
}
function replaceRange(source, start, end, replacement, label) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  assert(a >= 0 && b > a, 'Missing range: ' + label);
  return source.slice(0, a) + replacement + source.slice(b);
}

let exportJs = read('export.js');
let mobileAudit = read('rak-mobile-smoke-audit.js');
let domAudit = read('rak-dom-action-audit.js');
let exportAudit = read('rak-export-release-audit.js');
let releaseGates = read('rak-release-gates.js');
let runtimeHealth = read('rak-runtime-health.js');
let bridge = read('supabase-bridge.js');
let changelog = read('CHANGELOG.md');
let sw = read('sw.js');
let config = read('supabase-config.js');

// 1) ZIP export: remove only paths proven absent from current repository/runtime.
const staleExportPaths = [
  'games-engine.js',
  'games-profile.js',
  'games-gomoku.js',
  'games-classic.js',
  'games-arcade.js',
  'gomoku-ai-smoke-v966.js',
  'app-usage-smoke-v963.js',
  'styles-games.css',
  'styles-overrides.css',
  'assets/docs/sql/supabase_app_usage_v963.sql',
  'assets/nav-icons/games-gray.png',
  'assets/nav-icons/games-green.png',
  'assets/rak-memory-total-time-fix.js'
];
for (const stalePath of staleExportPaths) {
  const quoted = escapeRe(stalePath);
  exportJs = exportJs.replace(new RegExp('^\\s*"' + quoted + '"\\s*:\\s*"[^"]+",?\\s*\\n?', 'gm'), '');
  exportJs = exportJs.replace(new RegExp('^\\s*"' + quoted + '"\\s*,?\\s*\\n?', 'gm'), '');
}
if (!exportJs.includes('"rak-lazy-external-libs.js": "src-rak-lazy-external-libs-js"')) {
  exportJs = replaceOnce(
    exportJs,
    '  "rak-mobile-smoke-audit.js": "src-rak-mobile-smoke-audit-js",',
    '  "rak-mobile-smoke-audit.js": "src-rak-mobile-smoke-audit-js",\n  "rak-lazy-external-libs.js": "src-rak-lazy-external-libs-js",',
    'export source id for lazy loader'
  );
}
if (!/var EXPORT_JS_FILES = \[[\s\S]*?"rak-lazy-external-libs\.js"/.test(exportJs)) {
  exportJs = replaceOnce(
    exportJs,
    '  "rak-mobile-smoke-audit.js",',
    '  "rak-mobile-smoke-audit.js",\n  "rak-lazy-external-libs.js",',
    'export js manifest lazy loader'
  );
}

function parseQuotedList(source, regex, label) {
  const match = source.match(regex);
  assert(match, 'Cannot parse ' + label);
  return Array.from(match[1].matchAll(/"([^"]+)"/g), (item) => item[1]);
}
const manifestJs = parseQuotedList(exportJs, /var EXPORT_JS_FILES = \[([\s\S]*?)\n\];/, 'EXPORT_JS_FILES');
const manifestText = parseQuotedList(exportJs, /var EXPORT_TEXT_FILES = \[([\s\S]*?)\n\];/, 'EXPORT_TEXT_FILES');
const manifestBinary = parseQuotedList(exportJs, /var EXPORT_BINARY_FILES = new Set\(\[([\s\S]*?)\n\]\);/, 'EXPORT_BINARY_FILES');
const missingManifestFiles = ['index.html', ...manifestJs, ...manifestText, ...manifestBinary].filter((file) => !fs.existsSync(path.join(root, file)));
assert(missingManifestFiles.length === 0, 'Export manifest still references missing files: ' + missingManifestFiles.join(', '));
for (const stalePath of staleExportPaths) assert(!manifestJs.includes(stalePath) && !manifestText.includes(stalePath) && !manifestBinary.includes(stalePath), 'Stale export path survived: ' + stalePath);

// 2) Diagnostics: Games were intentionally removed from RaK. Remove stale required routes/actions and make the browser-smoke status truthful.
mobileAudit = replaceRange(
  mobileAudit,
  '  function getRouteSmokeChecklist() {',
  '\n\n  function getDeviceMatrix()',
`  function getRouteSmokeChecklist() {
    return [
      { id: 'dashboard', route: 'dashboard', expected: 'dashboard cards visible, no blank page, food tiles readable' },
      { id: 'rotation', route: 'rotace', expected: 'Rotace opens, names/months/stats render without blank state' },
      { id: 'calculators', route: 'kalkulacky', expected: 'calculator hub and Soustruhy/Frézky/Brusy pages open and accept input' },
      { id: 'admin', route: 'menu/admin', expected: 'admin shell opens only after secure auth and diagnostics remain readable' },
      { id: 'export', route: 'admin/service/export', expected: 'ZIP preflight references only existing current files' }
    ];
  }`,
  'mobile route smoke checklist'
);

mobileAudit = replaceRange(
  mobileAudit,
  '  window.getRakPlaywrightDomSmokeDraftHealth = function getRakPlaywrightDomSmokeDraftHealth() {',
  '\n\n  window.getRakFinalAuditClosureHealth',
`  window.getRakPlaywrightDomSmokeDraftHealth = function getRakPlaywrightDomSmokeDraftHealth() {
    return {
      ok: true,
      mode: 'legacy-playwright-alias-browser-smoke-v1630',
      version: String(window.APP_VERSION || VERSION),
      checkedAt: nowIso(),
      implementationStatus: 'browser-smoke-script-ready;playwright-spec-not-present',
      installRequired: false,
      shouldRunAgainstProductionDb: false,
      blockerCandidates: [
        'app boots without console page crash',
        'bottom navigation visible and active tab changes',
        'Rotace and statistics render',
        'calculator routes render and accept input',
        'admin generator shell and export preflight render'
      ],
      suggestedCommand: 'npm run test:browser-smoke',
      note: 'Historický alias názvu zůstává kvůli kompatibilitě diagnostiky. Aktuální repo používá browser-smoke-v1103.js; samostatný playwright-smoke.spec.js v repu není.'
    };
  };`,
  'browser smoke diagnostic alias'
);

mobileAudit = replaceRange(
  mobileAudit,
  '  function getManualValidationChecklist() {',
  '\n\n  window.getRakManualValidationReadinessHealth',
`  function getManualValidationChecklist() {
    return [
      { id: 'M-01', area: 'Start aplikace', expected: 'Home/Dashboard bez bílé obrazovky.', priority: 'P0', blocksRelease: true },
      { id: 'M-02', area: 'Spodní lišta', expected: 'Home, Rotace, Kalkulačky a Více se přepnou bez zamrznutí.', priority: 'P0', blocksRelease: true },
      { id: 'M-03', area: 'Kantýna/jídelna', expected: 'Karty i rozklik ukazují běžný režim a přesčasové výjimky.', priority: 'P0', blocksRelease: true },
      { id: 'M-04', area: 'Rotace', expected: 'Jména, Rozpisy a Statistiky se otevřou a zachovají ovládání.', priority: 'P0', blocksRelease: true },
      { id: 'M-05', area: 'Kalkulačky', expected: 'Soustruhy, Frézky, Brusy a Pračka se otevřou; vstupy a reset fungují.', priority: 'P0', blocksRelease: true },
      { id: 'M-06', area: 'Korekce', expected: 'Korekce soustruhů/frézek fungují; Brusy zobrazí aktuální stav bez starého placeholderu.', priority: 'P0', blocksRelease: true },
      { id: 'M-07', area: 'QR', expected: 'QR osoby zůstane dostupné online i z cache bez změny dat.', priority: 'P0', blocksRelease: true },
      { id: 'M-08', area: 'Administrace', expected: 'Přístup vyžaduje platnou admin relaci; rozpis/generátor se načtou bez změny pravidel.', priority: 'P0', blocksRelease: true },
      { id: 'M-09', area: 'ZIP export', expected: 'Preflight projde a ZIP nepožaduje odstraněné nebo neexistující soubory.', priority: 'P0', blocksRelease: true },
      { id: 'M-10', area: 'PWA aktualizace', expected: 'Aktualizace se nabídne jen při novém buildu a po potvrzení se načte nový build.', priority: 'P0', blocksRelease: true },
      { id: 'M-11', area: 'O aplikaci', expected: 'Historie obsahuje aktuální řadu RaK 1.6.', priority: 'P2', blocksRelease: false },
      { id: 'M-12', area: 'Diagnostika', expected: 'Neobsahuje povinné kontroly odstraněných Her ani neexistující Playwright spec.', priority: 'P2', blocksRelease: false },
      { id: 'M-13', area: 'Profilový vzhled', expected: 'Téma i pozadí se drží aktivního profilu.', priority: 'P0', blocksRelease: true }
    ];
  }`,
  'manual validation checklist'
);
mobileAudit = mobileAudit.replace("percentComplete: 100,\n      percentRemaining: 0,", "percentComplete: 95,\n      percentRemaining: 5,");
mobileAudit = mobileAudit.replace("'post-release: npm run test:smoke spustit mimo produkční Supabase při dostupném Playwrightu'", "'post-release: npm run test:browser-smoke spustit nad bezpečným lokálním snapshotem'");
mobileAudit = mobileAudit.replace("manualGateCount: 4,\n      manualGates: [\n        'reálný mobilní smoke',\n        'reálný browser smoke',\n        'skutečný Playwright běh',\n        'post-release PWA/hosting validace'\n      ],", "manualGateCount: 3,\n      manualGates: [\n        'reálný mobilní smoke',\n        'reálný browser smoke',\n        'post-release PWA/hosting validace'\n      ],");

// DOM/action audit must match the current navigation surface.
domAudit = replaceOnce(domAudit,
  "  const REQUIRED_NAV_ACTIONS = ['home', 'rotace', 'kalkulacky', 'games', 'menu'];",
  "  const REQUIRED_NAV_ACTIONS = ['home', 'rotace', 'kalkulacky', 'menu'];",
  'DOM required nav actions'
);
domAudit = domAudit.replace("    'open-game',\n", '');

// Export release audit must not require removed game runtime.
exportAudit = exportAudit.replace("      'games-engine.js',\n", '');

// Release-gate UI: drop legacy Games gates. Their historical helpers may remain unloaded for compatibility, but they are no longer release requirements.
releaseGates = replaceRange(
  releaseGates,
  "    gates.push(makeGate(\n      'online-game-contracts'",
  "    gates.push(makeGate(\n      'food-sunday-overtime'",
  '',
  'online games release gate'
);
releaseGates = replaceRange(
  releaseGates,
  "    gates.push(makeGate(\n      'games-profile-dom-hardening'",
  "    gates.push(makeGate(\n      'dom-security-hardening'",
  '',
  'games hardening release gates'
);
if (releaseGates.includes("      'v928-games-achievement-rewards'")) {
  releaseGates = replaceRange(
    releaseGates,
    "    gates.push(makeGate(\n      'v928-games-achievement-rewards'",
    "    gates.push(makeGate(\n      'v928-profile-appearance-rewards'",
    '',
    'games achievements release gate'
  );
}
releaseGates = releaseGates
  .replace("'Playwright/DOM smoke návrh'", "'Browser/DOM smoke kontrola'")
  .replace("'První test spustit mimo produkční DB; zatím nezavádět jako povinnou závislost do hotfix buildu.'", "'Spouštět npm run test:browser-smoke nad bezpečným lokálním snapshotem; nejde o produkční DB test.'")
  .replace('mobil + Playwright', 'mobil + browser smoke')
  .replace('mobilní a Playwright validace', 'mobilní a browser validace')
  .replace('mobil/browser smoke a skutečný Playwright běh', 'mobilní a browser smoke');

// Runtime health must not emit false warnings for removed online Games contracts.
runtimeHealth = runtimeHealth.replace("    const onlineGameContracts = typeof window.getRakOnlineGameContractAuditHealth === 'function' ? window.getRakOnlineGameContractAuditHealth() : null;\n", '');
runtimeHealth = runtimeHealth.replace("    if (onlineGameContracts && onlineGameContracts.ok === false) warnings.push('online game contracts warning: ' + String((onlineGameContracts.issues || []).join(', ') || onlineGameContracts.status || 'kontrola'));\n", '');
runtimeHealth = runtimeHealth.replace("      onlineGameContractsOk: onlineGameContracts ? !!onlineGameContracts.ok : null,\n      onlineGameContractsPhasePercent: onlineGameContracts ? Number(onlineGameContracts.phasePercent || 0) : 0,\n      onlineGameContractsFallbackCount: onlineGameContracts ? Number(onlineGameContracts.fallbackCount || 0) : 0,\n", '');

// Keepalive diagnostics: runtime uses RPC only; direct table grants are removed by the matching DB migration.
bridge = bridge.replace("access: 'RPC rak_app_keepalive + app_keepalive-only RLS', note: 'bezpečný heartbeat proti pauze free projektu, mimo herní data; klient používá RPC, tabulka má jen úzké heartbeat RLS'", "access: 'RPC rak_app_keepalive only', note: 'heartbeat proti pauze free projektu; klient používá RPC a veřejné tabulkové granty/policies jsou odebrané'");

// About/history: deployed CHANGELOG must reflect the current 1.6 line.
if (!/^## RaK 1\.6$/m.test(changelog)) {
  changelog = `## RaK 1.6\n\n- Stabilizace vývojové větve 1.6: oddělená testovací Supabase, zabezpečené admin zápisy přes RPC a zachovaný produkční main.\n- Rotace a generátor: zachovaná pravidla návaznosti, absencí, TNKS01/TPKW01, Měkota/Tvrdota a sdílených úkolů MSKC01; audit 1.6.30 do těchto pravidel nezasahuje.\n- Výkon/PWA 1.6.22–1.6.29: bezpečné lazy-loading úpravy, optimalizace PNG/login assetů, cache tuning, performance guardy, startup přesun a cílené MutationObserver cleanupy.\n- Audit 1.6.30: opravený ZIP manifest, diagnostika zbavená povinných kontrol odstraněných Her, pravdivý browser-smoke stav a utažený app_keepalive na RPC-only přístup.\n\n` + changelog;
}

// Version/build marker. Keep stable public cache contract v1.6.0.
assert(sw.includes(PREV_POLICY), 'Previous 1.6.29 policy marker missing.');
if (!sw.includes(POLICY)) sw = sw.replace(PREV_POLICY, PREV_POLICY + '\n' + POLICY);
sw = sw.replace(/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '[^']+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY_VERSION}';`);
sw = sw.replace(/^const DEVELOPMENT_BUILD_ID = '[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD_ID}';`);
config = config.replace(/^window\.RAK_RELEASE_VERSION = "[^"]+";$/m, `window.RAK_RELEASE_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_TEST_DISPLAY_VERSION = "[^"]+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_PWA_BUILD = "[^"]+";$/m, `window.RAK_PWA_BUILD = "v${BUILD_ID}";`);

assert(!exportJs.includes('"games-engine.js"'), 'games-engine.js remains in export source');
assert(!domAudit.includes("'games', 'menu'"), 'Games remain required in DOM nav audit');
assert(!mobileAudit.includes("route: 'games'"), 'Games remain in mobile route smoke');
assert(!mobileAudit.includes('root-playwright-smoke-spec-ready'), 'Nonexistent Playwright spec still advertised');
assert(!releaseGates.includes("'games-profile-dom-hardening'"), 'Games release gates still active');
assert(!runtimeHealth.includes('online game contracts warning:'), 'Runtime health still warns about removed Games');
assert(sw.includes(POLICY), '1.6.30 audit policy marker missing');
assert(sw.includes("const CACHE_VERSION = 'v1.6.0';"), 'Stable PWA cache version changed unexpectedly');

write('export.js', exportJs);
write('rak-mobile-smoke-audit.js', mobileAudit);
write('rak-dom-action-audit.js', domAudit);
write('rak-export-release-audit.js', exportAudit);
write('rak-release-gates.js', releaseGates);
write('rak-runtime-health.js', runtimeHealth);
write('supabase-bridge.js', bridge);
write('CHANGELOG.md', changelog);
write('sw.js', sw);
write('supabase-config.js', config);

console.log(`[full-app-audit-fixes-1630] OK RaK ${DISPLAY_VERSION}: export/diagnostics/changelog current; Games removed from release gates; keepalive expects RPC-only DB access.`);
