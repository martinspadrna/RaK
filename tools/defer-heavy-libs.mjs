#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = path.join(root, 'index.html');
const appPath = path.join(root, 'app.js');
const swPath = path.join(root, 'sw.js');
let html = fs.readFileSync(indexPath, 'utf8');
let appJs = fs.readFileSync(appPath, 'utf8');
let sw = fs.readFileSync(swPath, 'utf8');

const patterns = [
  /\n?<script\s+src="https:\/\/cdn\.jsdelivr\.net\/npm\/xlsx@0\.18\.5\/dist\/xlsx\.full\.min\.js"[^>]*><\/script>/,
  /\n?<script\s+src="https:\/\/cdn\.jsdelivr\.net\/npm\/jszip@3\.10\.1\/dist\/jszip\.min\.js"[^>]*><\/script>/,
];

const idleDiagnosticFiles = [
  'rak-storage-sync-audit.js',
  'rak-boot-sequence-audit.js',
  'rak-dom-action-audit.js',
  'rak-supabase-client-audit.js',
  'rak-appsec-privacy-audit.js',
  'rak-release-gates.js',
  'rak-export-release-audit.js',
  'rak-release-ops-audit.js',
  'rak-due-diligence-progress.js',
  'rak-performance-ci-audit.js',
  'rak-mobile-smoke-audit.js'
];

for (const pattern of patterns) html = html.replace(pattern, '');
for (const file of idleDiagnosticFiles) {
  const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  html = html.replace(new RegExp('\\n?<script\\s+src="' + escaped + '"[^>]*><\\/script>'), '');
}

// RaK 1.6.03: Home nemusí čekat na zbytek startup vrstvy. Nejdřív načteme jen
// minimum potřebné pro lokální Dashboard, vykreslíme ho, pustíme browser k paintu
// a teprve potom dokončíme QR, vzhled, navigaci a ostatní stabilní startup moduly.
const homeFirstStageMarker = "window.__rak1603HomeFirstStagePaint = {";
if (!appJs.includes(homeFirstStageMarker)) {
  const originalStartupAwait = '  await loadFiles(startupFiles);';
  if (!appJs.includes(originalStartupAwait)) {
    throw new Error('[defer-heavy-libs] app.js nemá očekávaný startup await pro Home first-stage.');
  }
  const homeFirstStage = `  const homeFirstFiles = [\n    "core.js",\n    "lifecycle.js",\n    "app-runtime-guards.js",\n    "payroll.js",\n    "dashboard.js"\n  ];\n  await loadFiles(homeFirstFiles);\n\n  try {\n    const nowMs = () => (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();\n    const storedProfile = typeof window.rakUserProfileGet === 'function' ? window.rakUserProfileGet() : null;\n    if (storedProfile && typeof window.rakUserProfileApplyToRuntime === 'function') {\n      window.rakUserProfileApplyToRuntime(storedProfile);\n    }\n    if (typeof window.updateDashboard === 'function') window.updateDashboard();\n    window.__rak1603HomeFirstStagePaint = {\n      mode: 'dashboard-before-heavy-startup',\n      paintedAtMs: Math.max(0, Math.round(nowMs() - bootStartedAt)),\n      remainingReadyAtMs: 0,\n      at: Date.now()\n    };\n  } catch (err) {\n    console.warn('RaK Home first-stage paint failed', err);\n  }\n\n  await new Promise((resolve) => {\n    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(resolve);\n    else setTimeout(resolve, 0);\n  });\n\n  await loadFiles(startupFiles.filter((file) => !homeFirstFiles.includes(file)));\n  try {\n    if (window.__rak1603HomeFirstStagePaint) {\n      const endedAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();\n      window.__rak1603HomeFirstStagePaint.remainingReadyAtMs = Math.max(0, Math.round(endedAt - bootStartedAt));\n    }\n  } catch (err) {}`;
  appJs = appJs.replace(originalStartupAwait, homeFirstStage);
}

// Instalovaná PWA už má schválený app shell v cache. Při běžném znovuotevření
// ho proto vrať hned a síťovou kopii obnov na pozadí. První návštěva bez cache
// dál normálně čeká na síť.
if (!sw.includes("strategy: 'navigation-cache-first-background-refresh;build-static-cache-first;isolated-prewarm'")) {
  const oldNavigation = `async function navigationResponse(request, event) {\n  try {\n    if (event && event.preloadResponse) {\n      const preload = await event.preloadResponse;\n      if (cacheable(preload)) {\n        put(RUNTIME_CACHE, request, preload);\n        return preload;\n      }\n    }\n  } catch (_) {}\n  const fallback = (await cached('./index.html')) || (await cached('./')) || Response.error();\n  return networkFirst(request, fallback);\n}`;
  const newNavigation = `async function navigationResponse(request, event) {\n  const shell = (await cached('./index.html')) || (await cached('./'));\n  const refresh = (async () => {\n    let response = null;\n    try {\n      if (event && event.preloadResponse) response = await event.preloadResponse;\n    } catch (_) {}\n    if (!cacheable(response)) {\n      response = await fetch(new Request(request, { cache: 'no-store' }));\n    }\n    if (cacheable(response)) await put(RUNTIME_CACHE, request, response);\n    return response;\n  })();\n\n  if (shell) {\n    try { if (event && typeof event.waitUntil === 'function') event.waitUntil(refresh.catch(() => null)); } catch (_) {}\n    return shell;\n  }\n\n  try {\n    const response = await refresh;\n    return response || Response.error();\n  } catch (_) {\n    return Response.error();\n  }\n}`;
  if (!sw.includes(oldNavigation)) {
    throw new Error('[defer-heavy-libs] sw.js nemá očekávanou navigationResponse pro cache-first warm start.');
  }
  sw = sw.replace(oldNavigation, newNavigation);
  sw = sw.replace(
    "strategy: 'navigation-network-first;build-static-cache-first;isolated-prewarm'",
    "strategy: 'navigation-cache-first-background-refresh;build-static-cache-first;isolated-prewarm'"
  );
}

if (sw.includes("const DEVELOPMENT_BUILD_ID = '1.6.03-home2';")) {
  sw = sw.replace(
    "const DEVELOPMENT_BUILD_ID = '1.6.03-home2';",
    "const DEVELOPMENT_BUILD_ID = '1.6.03-home3';\n// Previous Home marker kept for diagnostics: const DEVELOPMENT_BUILD_ID = '1.6.03-home2';"
  );
}

if (/cdn\.jsdelivr\.net\/npm\/xlsx@0\.18\.5\/dist\/xlsx\.full\.min\.js/.test(html)) {
  throw new Error('[defer-heavy-libs] XLSX zůstal v index.html jako eager script.');
}
if (/cdn\.jsdelivr\.net\/npm\/jszip@3\.10\.1\/dist\/jszip\.min\.js/.test(html)) {
  throw new Error('[defer-heavy-libs] JSZip zůstal v index.html jako eager script.');
}
for (const file of idleDiagnosticFiles) {
  if (html.includes('src="' + file + '"')) {
    throw new Error('[defer-heavy-libs] Diagnostický modul zůstal v startup HTML: ' + file);
  }
}
if (!/@supabase\/supabase-js@2\.110\.7/.test(html)) {
  throw new Error('[defer-heavy-libs] Supabase eager script se nesmí při této optimalizaci změnit.');
}
if (!/src="rak-dom-security-hardening\.js"/.test(html)) {
  throw new Error('[defer-heavy-libs] DOM security hardening musí zůstat v startup HTML.');
}
if (!appJs.includes(homeFirstStageMarker) || !appJs.includes("mode: 'dashboard-before-heavy-startup'")) {
  throw new Error('[defer-heavy-libs] Home first-stage paint se nepodařilo vložit do app.js.');
}
if (!sw.includes("strategy: 'navigation-cache-first-background-refresh;build-static-cache-first;isolated-prewarm'")) {
  throw new Error('[defer-heavy-libs] PWA warm navigation není cache-first.');
}
if (!sw.includes("const DEVELOPMENT_BUILD_ID = '1.6.03-home3';")) {
  throw new Error('[defer-heavy-libs] PWA build ID nebylo posunuto na home3.');
}

fs.writeFileSync(indexPath, html, 'utf8');
fs.writeFileSync(appPath, appJs, 'utf8');
fs.writeFileSync(swPath, sw, 'utf8');
console.log('[defer-heavy-libs] OK XLSX + JSZip + diagnostics deferred; Home paints before heavy startup; installed navigation cache-first; Supabase + DOM security untouched');
