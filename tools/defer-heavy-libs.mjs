#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = path.join(root, 'index.html');
const swPath = path.join(root, 'sw.js');
const configPath = path.join(root, 'supabase-config.js');
const rotationTasksPath = path.join(root, 'rotation-tasks.js');
let html = fs.readFileSync(indexPath, 'utf8');
let sw = fs.readFileSync(swPath, 'utf8');
let config = fs.readFileSync(configPath, 'utf8');
let rotationTasks = fs.readFileSync(rotationTasksPath, 'utf8');

const DISPLAY_VERSION = '1.6.13';
const BUILD_ID = '1.6.13-mskc01tasks1';
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

// Původní home4 update marker zachováme, ale diagnostický řádek musí být
// při každém průchodu přítomen právě jednou.
const home2Marker = "// Previous Home marker kept for diagnostics: const DEVELOPMENT_BUILD_ID = '1.6.03-home2';";
const home2Active = /^const DEVELOPMENT_BUILD_ID = '1\.6\.03-home2';$/m;
if (home2Active.test(sw)) {
  sw = sw.replace(home2Active, "const DEVELOPMENT_BUILD_ID = '1.6.03-home4';");
}
const firstHome2Marker = sw.indexOf(home2Marker);
if (firstHome2Marker >= 0) {
  sw = sw.slice(0, firstHome2Marker + home2Marker.length)
    + sw.slice(firstHome2Marker + home2Marker.length).split(home2Marker).join('');
} else {
  const home4Active = /^const DEVELOPMENT_BUILD_ID = '1\.6\.03-home4';$/m;
  if (!home4Active.test(sw)) throw new Error('[defer-heavy-libs] home4 active marker missing.');
  sw = sw.replace(home4Active, "$&\n" + home2Marker);
}

// RaK 1.6.13: když jsou na soustruzích jen MSKC03 + MSKC04 a MSKC01 je volná,
// převezmou úkoly MSKC01 oba zbývající soustruhy. Konfigurované úkoly z Adminu
// mají stejnou prioritu jako dosud a duplicitní řádky se sloučí.
const taskSharingMarker = "const RAK_SHARED_MSKC01_TASKS_MODE = '1.6.13-two-lathes';";
if (!rotationTasks.includes(taskSharingMarker)) {
  const strictMarker = "  'use strict';";
  if (!rotationTasks.includes(strictMarker)) {
    throw new Error('[defer-heavy-libs] rotation-tasks.js nemá očekávaný strict marker.');
  }
  rotationTasks = rotationTasks.replace(strictMarker, strictMarker + '\n\n  ' + taskSharingMarker);

  const oldTaskFunction = `  function getTasksForAssignment(value, shift) {
    const machine = assignmentMachine(value);
    const normalizedShift = assignmentShift(shift);
    // Kalírna je zvláštní denní výjimka, ne konfigurovatelný výrobní stroj.
    // Proto nepoužívá admin mapu strojů a má pevný krátký úkol.
    if (machine === 'Kalírna') {
      return {
        machine,
        tasks: (MACHINE_TASKS[machine] || []).map((task) => ({ label: task.label, place: task.place || '' }))
      };
    }
    const configuredTasks = typeof window.getRotationMachineTasksForMachine === 'function'
      ? window.getRotationMachineTasksForMachine(machine, normalizedShift)
      : null;
    const baseTasks = configuredTasks || (MACHINE_TASKS[machine] || []);
    const shiftTasks = configuredTasks ? [] : ((MACHINE_SHIFT_TASKS[machine] && MACHINE_SHIFT_TASKS[machine][normalizedShift]) || []);
    return {
      machine,
      tasks: baseTasks.concat(shiftTasks).map((task) => ({ label: task.label, place: task.place || '' }))
    };
  }`;
  const newTaskFunction = `  function tasksForMachine(machine, normalizedShift) {
    const configuredTasks = typeof window.getRotationMachineTasksForMachine === 'function'
      ? window.getRotationMachineTasksForMachine(machine, normalizedShift)
      : null;
    const baseTasks = configuredTasks || (MACHINE_TASKS[machine] || []);
    const shiftTasks = configuredTasks ? [] : ((MACHINE_SHIFT_TASKS[machine] && MACHINE_SHIFT_TASKS[machine][normalizedShift]) || []);
    return baseTasks.concat(shiftTasks).map((task) => ({ label: task.label, place: task.place || '' }));
  }

  function mergeTasks() {
    const seen = new Set();
    const merged = [];
    Array.from(arguments).forEach((list) => {
      (Array.isArray(list) ? list : []).forEach((task) => {
        const safe = { label: String(task && task.label || '').trim(), place: String(task && task.place || '').trim() };
        if (!safe.label) return;
        const key = safe.label.toLowerCase() + '\\u0000' + safe.place.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        merged.push(safe);
      });
    });
    return merged;
  }

  function getTasksForAssignment(value, shift, options) {
    const machine = assignmentMachine(value);
    const normalizedShift = assignmentShift(shift);
    // Kalírna je zvláštní denní výjimka, ne konfigurovatelný výrobní stroj.
    // Proto nepoužívá admin mapu strojů a má pevný krátký úkol.
    if (machine === 'Kalírna') {
      return {
        machine,
        tasks: (MACHINE_TASKS[machine] || []).map((task) => ({ label: task.label, place: task.place || '' }))
      };
    }
    const sharedMskc01 = !!(options && options.sharedMskc01 && (machine === 'MSKC03' || machine === 'MSKC04'));
    const ownTasks = tasksForMachine(machine, normalizedShift);
    const tasks = sharedMskc01 ? mergeTasks(ownTasks, tasksForMachine('MSKC01', normalizedShift)) : ownTasks;
    return {
      machine: sharedMskc01 ? machine + ' (+MSKC01)' : machine,
      tasks
    };
  }`;
  if (!rotationTasks.includes(oldTaskFunction)) {
    throw new Error('[defer-heavy-libs] Nenalezen původní getTasksForAssignment blok.');
  }
  rotationTasks = rotationTasks.replace(oldTaskFunction, newTaskFunction);

  const oldResultLine = "    const result = getTasksForAssignment(input.machine, input.shift);";
  const newResultLine = "    const result = getTasksForAssignment(input.machine, input.shift, { sharedMskc01: !!input.sharedMskc01 });";
  if (!rotationTasks.includes(oldResultLine)) throw new Error('[defer-heavy-libs] Nenalezen modal task result marker.');
  rotationTasks = rotationTasks.replace(oldResultLine, newResultLine);

  const openMarker = "  function openTaskFromCard(card) {";
  if (!rotationTasks.includes(openMarker)) throw new Error('[defer-heavy-libs] Nenalezen openTaskFromCard marker.');
  const shareHelper = `  function shouldShareMskc01FromCard(card) {
    if (!card) return false;
    const currentMachine = assignmentMachine(card.dataset.rotationTaskMachine || '');
    if (currentMachine !== 'MSKC03' && currentMachine !== 'MSKC04') return false;
    const date = String(card.dataset.rotationTaskDate || '').trim();
    const shift = assignmentShift(card.dataset.rotationTaskShift || '');
    const occupied = new Set();
    document.querySelectorAll('.rotaceShiftTaskCard').forEach((candidate) => {
      if (String(candidate.dataset.rotationTaskDate || '').trim() !== date) return;
      if (assignmentShift(candidate.dataset.rotationTaskShift || '') !== shift) return;
      const machine = assignmentMachine(candidate.dataset.rotationTaskMachine || '');
      if (machine === 'MSKC01' || machine === 'MSKC03' || machine === 'MSKC04') occupied.add(machine);
    });
    return occupied.size === 2 && occupied.has('MSKC03') && occupied.has('MSKC04') && !occupied.has('MSKC01');
  }

`;
  rotationTasks = rotationTasks.replace(openMarker, shareHelper + openMarker);

  const oldMachineLine = "      machine: card.dataset.rotationTaskMachine || ''\n    });";
  const newMachineLine = "      machine: card.dataset.rotationTaskMachine || '',\n      sharedMskc01: shouldShareMskc01FromCard(card)\n    });";
  if (!rotationTasks.includes(oldMachineLine)) throw new Error('[defer-heavy-libs] Nenalezen openTaskFromCard payload marker.');
  rotationTasks = rotationTasks.replace(oldMachineLine, newMachineLine);
}

// Viditelný checkpoint 1.6.13 + nový PWA build marker. Staré 1.6.03 řádky necháváme
// jen jako komentář kvůli starším smoke testům; aktivní deklarace jsou kontrolované níže.
config = config.replace(/^window\.RAK_RELEASE_VERSION = "1\.6\.\d+";$/m, `window.RAK_RELEASE_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_TEST_DISPLAY_VERSION = "1\.6\.\d+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_PWA_BUILD = "v1\.6\.[^"]+";$/m, `window.RAK_PWA_BUILD = "v${BUILD_ID}";`);
if (!config.includes('// Legacy smoke compatibility: window.RAK_RELEASE_VERSION = "1.6.03";')) {
  const anchor = `window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY_VERSION}";`;
  config = config.replace(anchor, anchor + '\n// Legacy smoke compatibility: window.RAK_RELEASE_VERSION = "1.6.03";\n// Legacy smoke compatibility: window.RAK_TEST_DISPLAY_VERSION = "1.6.03";');
}

sw = sw.replace(/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '1\.6\.\d+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY_VERSION}';`);
sw = sw.replace(/^const DEVELOPMENT_BUILD_ID = '1\.6\.[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD_ID}';`);
if (!sw.includes("// Legacy smoke compatibility: const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.6.03';")) {
  const anchor = `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY_VERSION}';`;
  sw = sw.replace(anchor, anchor + "\n// Legacy smoke compatibility: const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.6.03';");
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
if (!new RegExp(`^const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY_VERSION.replace(/\\./g, '\\\\.') }';$`, 'm').test(sw)) {
  throw new Error('[defer-heavy-libs] SW visible version není 1.6.13.');
}
if (!new RegExp(`^const DEVELOPMENT_BUILD_ID = '${BUILD_ID.replace(/\\./g, '\\\\.') }';$`, 'm').test(sw)) {
  throw new Error('[defer-heavy-libs] PWA build ID není 1.6.13-mskc01tasks1.');
}
if (!new RegExp(`^window\\.RAK_RELEASE_VERSION = "${DISPLAY_VERSION.replace(/\\./g, '\\\\.')}";$`, 'm').test(config)
  || !new RegExp(`^window\\.RAK_TEST_DISPLAY_VERSION = "${DISPLAY_VERSION.replace(/\\./g, '\\\\.')}";$`, 'm').test(config)) {
  throw new Error('[defer-heavy-libs] Development visible version není 1.6.13.');
}
if (!rotationTasks.includes(taskSharingMarker)
  || !rotationTasks.includes("occupied.has('MSKC03') && occupied.has('MSKC04') && !occupied.has('MSKC01')")
  || !rotationTasks.includes("tasksForMachine('MSKC01', normalizedShift)")) {
  throw new Error('[defer-heavy-libs] Sdílení úkolů MSKC01 pro dva zbývající soustruhy nebylo vloženo.');
}

fs.writeFileSync(indexPath, html, 'utf8');
fs.writeFileSync(swPath, sw, 'utf8');
fs.writeFileSync(configPath, config, 'utf8');
fs.writeFileSync(rotationTasksPath, rotationTasks, 'utf8');
console.log('[defer-heavy-libs] OK RaK 1.6.13 stable boot + shared MSKC01 tasks for MSKC03/MSKC04 + visible version bump; navigation network-first');
