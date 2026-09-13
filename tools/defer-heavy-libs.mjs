#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = path.join(root, 'index.html');
const swPath = path.join(root, 'sw.js');
let html = fs.readFileSync(indexPath, 'utf8');
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

// Auth-safe warm Home: žádná změna pořadí app.js, auth, admin ani login modulů.
// Jen obnovíme poslední známé textové hodnoty Dashboardu synchronně z localStorage,
// takže PWA nemusí první vteřinu ukazovat samé "--". Standardní updateDashboard je
// vzápětí přepíše aktuálními daty. Ukládáme pouze textContent, nikdy HTML.
const snapshotMarker = 'id="rak-home-warm-snapshot"';
if (!html.includes(snapshotMarker)) {
  const beforeCalculators = '\n<div id="kalkulacky" class="page">';
  if (!html.includes(beforeCalculators)) {
    throw new Error('[defer-heavy-libs] Nenalezen bod pro Home warm snapshot.');
  }
  const snapshotScript = `\n<script id="rak-home-warm-snapshot">\n(function(){\n  var KEY='rak_home_warm_snapshot_v1';\n  var MAX_AGE=6*60*60*1000;\n  var selectors=[\n    '.dashboardHeroLine1Text',\n    '.dashboardHeroLine2',\n    '.dashboardHeroLine3Pill',\n    '#dashCalendar .dashboardValue',\n    '#dashCalendar .dashboardMeta',\n    '#dashCountdown .dashboardValue',\n    '#dashCountdown .dashboardMeta',\n    '#dashKantyna .dashboardValue',\n    '#dashKantyna .dashboardMeta',\n    '#dashJidelna .dashboardValue',\n    '#dashJidelna .dashboardMeta',\n    '#dashVyplata .dashboardValue',\n    '#dashVyplata .dashboardMeta',\n    '#dashCzd .dashboardValue',\n    '#dashCzd .dashboardMeta'\n  ];\n  function validText(text){\n    text=String(text||'').trim();\n    return !!text && text!=='--' && text.indexOf('Načítám')<0;\n  }\n  function restore(){\n    try{\n      var raw=localStorage.getItem(KEY);\n      if(!raw)return false;\n      var snap=JSON.parse(raw);\n      if(!snap||!snap.values||!snap.at||Date.now()-Number(snap.at)>MAX_AGE)return false;\n      var count=0;\n      selectors.forEach(function(sel){\n        var value=snap.values[sel];\n        if(!validText(value))return;\n        var el=document.querySelector(sel);\n        if(!el)return;\n        el.textContent=String(value);\n        count++;\n      });\n      window.__rak1603HomeWarmSnapshot={restored:count>0,restoredCount:count,ageMs:Math.max(0,Date.now()-Number(snap.at)),at:Date.now()};\n      return count>0;\n    }catch(err){return false;}\n  }\n  function save(){\n    try{\n      var values={};\n      var count=0;\n      selectors.forEach(function(sel){\n        var el=document.querySelector(sel);\n        if(!el)return;\n        var text=String(el.textContent||'').trim();\n        if(!validText(text))return;\n        values[sel]=text;\n        count++;\n      });\n      if(count<4)return false;\n      localStorage.setItem(KEY,JSON.stringify({at:Date.now(),values:values}));\n      window.__rak1603HomeWarmSnapshot=Object.assign({},window.__rak1603HomeWarmSnapshot||{},{saved:true,savedCount:count,savedAt:Date.now()});\n      return true;\n    }catch(err){return false;}\n  }\n  restore();\n  window.addEventListener('pagehide',save,{capture:true});\n  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')save();});\n})();\n<\/script>\n`;
  html = html.replace(beforeCalculators, snapshotScript + beforeCalculators);
}

// Posuň SW build marker, aby se po stažení této opravy spolehlivě nabídla aktualizace.
// Navigační strategii necháváme původní network-first: poslední cache-first experiment
// se kvůli neočekávanému admin promptu zcela ruší.
if (sw.includes("const DEVELOPMENT_BUILD_ID = '1.6.03-home2';")) {
  sw = sw.replace(
    "const DEVELOPMENT_BUILD_ID = '1.6.03-home2';",
    "const DEVELOPMENT_BUILD_ID = '1.6.03-home4';\n// Previous Home marker kept for diagnostics: const DEVELOPMENT_BUILD_ID = '1.6.03-home2';"
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
if (!html.includes(snapshotMarker) || !html.includes("localStorage.setItem(KEY,JSON.stringify({at:Date.now(),values:values}))")) {
  throw new Error('[defer-heavy-libs] Home warm snapshot nebyl vložen.');
}
if (!sw.includes("strategy: 'navigation-network-first;build-static-cache-first;isolated-prewarm'")) {
  throw new Error('[defer-heavy-libs] Navigace musí po rollbacku zůstat network-first.');
}
if (!sw.includes("const DEVELOPMENT_BUILD_ID = '1.6.03-home4';")) {
  throw new Error('[defer-heavy-libs] PWA build ID nebylo posunuto na home4.');
}

fs.writeFileSync(indexPath, html, 'utf8');
fs.writeFileSync(swPath, sw, 'utf8');
console.log('[defer-heavy-libs] OK XLSX + JSZip + diagnostics deferred; auth-safe original boot restored; Home text snapshot warm-start active; navigation network-first');
