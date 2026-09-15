#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const latePath = path.join(root, 'styles-overrides-legacy-late.css');
const adminPath = path.join(root, 'styles-admin-polish.css');
const menuPath = path.join(root, 'styles-menu-polish.css');
const earlyPath = path.join(root, 'styles-overrides-legacy-early.css');
const calculatorsPath = path.join(root, 'styles-calculators-mid.css');
const indexPath = path.join(root, 'index.html');
const configPath = path.join(root, 'supabase-config.js');
const swPath = path.join(root, 'sw.js');
const bridgePath = path.join(root, 'supabase-bridge.js');
const rotationTasksPath = path.join(root, 'rotation-tasks.js');

let late = fs.readFileSync(latePath, 'utf8');
let admin = fs.readFileSync(adminPath, 'utf8');
let config = fs.readFileSync(configPath, 'utf8');
let sw = fs.readFileSync(swPath, 'utf8');
const menu = fs.readFileSync(menuPath, 'utf8');
const early = fs.readFileSync(earlyPath, 'utf8');
const calculators = fs.readFileSync(calculatorsPath, 'utf8');
const indexHtml = fs.readFileSync(indexPath, 'utf8');
const bridge = fs.readFileSync(bridgePath, 'utf8');
const rotationTasks = fs.readFileSync(rotationTasksPath, 'utf8');

const DISPLAY_VERSION = '1.6.17';
const BUILD_ID = '1.6.17-cssmenuadmin1';
const CSS_MARKER = '/* RaK 1.6.17 CSS cleanup: Menu/Admin proven dead owner layers consolidated; visual contract unchanged. */';

function replaceExactlyOnce(source, label, oldText, newText) {
  const hits = source.split(oldText).length - 1;
  if (hits !== 1) throw new Error(`[css-cleanup-menu-admin-1617] ${label}: očekáván 1 výskyt, nalezeno ${hits}.`);
  return source.replace(oldText, newText);
}

if (!admin.includes(CSS_MARKER)) {
  const adminHeader = `/* RaK 1.2 (1.146) – Administrace/Rozpisy polish oddělený ze styles-overrides.css.\n   Bez změny logiky, Supabase ani spodní lišty. */`;
  if (!admin.includes(adminHeader)) throw new Error('[css-cleanup-menu-admin-1617] Chybí Admin polish header.');
  admin = admin.replace(adminHeader, adminHeader + '\n' + CSS_MARKER);

  late = replaceExactlyOnce(
    late,
    'starší adminUsage min-height + přepsaný overscroll',
    `#menu .adminUsageList{\n  min-height:0 !important;\n}\n#menu .adminUsageItem[open] .adminUsageBody{\n  overscroll-behavior:contain !important;\n  padding-bottom:12px !important;\n}`,
    `#menu .adminUsageItem[open] .adminUsageBody{\n  padding-bottom:12px !important;\n}`
  );

  const deadBlocks = [
    ['v988 rotace první datumový col 42', `#appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminRotationTable col:first-child{\n  width:42px !important;\n}\n`],
    ['v988 rotace jmenný col 48', `#appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminRotationTable col:not(:first-child){\n  width:48px !important;\n}\n`],
    ['v988 absence datum col 50', `#appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminAbsenceTable col:nth-child(1){\n  width:50px !important;\n}\n`],
    ['v988 absence osoba col 118', `#appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminAbsenceTable col:nth-child(2){\n  width:118px !important;\n}\n`],
    ['v988 absence kód col 34', `#appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminAbsenceTable col:nth-child(3){\n  width:34px !important;\n}\n`],
    ['v998 mezistupeň datumový col 53', `#appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminRotationTable col:first-child{\n  width:53px !important;\n}\n`],
    ['v998 mezistupeň jmenný col 50', `#appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminRotationTable col:not(:first-child){\n  width:50px !important;\n}\n`],
    ['v998 mezistupeň tabulky min 296', `#appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuTableWrap:nth-of-type(1) .appMenuAdminTable,\n#appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuTableWrap:nth-of-type(2) .appMenuAdminTable{\n  width:auto !important;\n  min-width:296px !important;\n  max-width:none !important;\n}\n`],
    ['v998 mezistupeň datum input 51', `#appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminRotationTable input[data-rot-field="date"]{\n  width:51px !important;\n  min-width:51px !important;\n  max-width:51px !important;\n}\n`],
    ['v998 mezistupeň cell input 48', `#appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminRotationTable input[data-rot-field^="cell-"]{\n  width:48px !important;\n  min-width:48px !important;\n  max-width:48px !important;\n}\n`],
    ['v998 mezistupeň absence min 201', `#appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminAbsenceTable{\n  min-width:201px !important;\n}\n`],
    ['v998 mezistupeň absence datum col 63', `#appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminAbsenceTable col:nth-child(1){\n  width:63px !important;\n}\n`],
    ['v998 mezistupeň absence datum input 61', `#appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminAbsenceTable input[data-note-field="date"]{\n  width:61px !important;\n  min-width:61px !important;\n  max-width:61px !important;\n}\n`],
    ['v998 mezistupeň absence kód margin -5', `#appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminAbsenceTable input[data-note-field="code"]{\n  width:28px !important;\n  min-width:28px !important;\n  max-width:28px !important;\n  margin-left:-5px !important;\n}\n`],
    ['v998 mezistupeň quick remove visible', `.adminRotationQuickRemove.isVisible{\n  opacity:1 !important;\n  transform:translateY(0) !important;\n}\n`],
    ['v998 mezistupeň tabulky min 304', `#appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuTableWrap:nth-of-type(1) .appMenuAdminTable,\n#appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuTableWrap:nth-of-type(2) .appMenuAdminTable{\n  min-width:304px !important;\n}\n`]
  ];
  for (const [label, block] of deadBlocks) admin = replaceExactlyOnce(admin, label, block, '');
}

config = config.replace(/^window\.RAK_RELEASE_VERSION = "1\.6\.\d+";$/m, `window.RAK_RELEASE_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_TEST_DISPLAY_VERSION = "1\.6\.\d+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_PWA_BUILD = "v1\.6\.[^"]+";$/m, `window.RAK_PWA_BUILD = "v${BUILD_ID}";`);
sw = sw.replace(/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '1\.6\.\d+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY_VERSION}';`);
sw = sw.replace(/^const DEVELOPMENT_BUILD_ID = '1\.6\.[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD_ID}';`);

if (!admin.includes(CSS_MARKER)) throw new Error('[css-cleanup-menu-admin-1617] CSS marker chybí.');
if (!late.includes(`#menu .adminUsageItem[open] .adminUsageBody{\n  padding-bottom:12px !important;\n}`)
  || !late.includes(`#menu .adminUsageList{\n  min-height:0 !important;\n}`)
  || !late.includes(`#menu .adminUsageItem[open] .adminUsageBody{\n  overscroll-behavior:auto !important;\n}`)) {
  throw new Error('[css-cleanup-menu-admin-1617] Aktivní Přehled připojení hodnoty se nesmí ztratit.');
}
if (late.includes('overscroll-behavior:contain !important;\n  padding-bottom:12px !important;')) {
  throw new Error('[css-cleanup-menu-admin-1617] Starý Přehled připojení overscroll owner zůstal.');
}
if (!admin.includes(`.appMenuAdminRotationTable col:first-child{\n  width:61px !important;`)
  || !admin.includes(`.appMenuAdminRotationTable col:not(:first-child){\n  width:54px !important;`)
  || !admin.includes(`input[data-rot-field^="cell-"]{\n  width:52px !important;\n  min-width:52px !important;\n  max-width:52px !important;`)
  || !admin.includes(`.appMenuTableWrap:nth-of-type(2) .appMenuAdminTable{\n  min-width:324px !important;`)
  || !admin.includes(`.appMenuAdminAbsenceTable{\n  min-width:210px !important;`)
  || !admin.includes(`input[data-note-field="date"]{\n  width:70px !important;\n  min-width:70px !important;\n  max-width:70px !important;`)
  || !admin.includes(`input[data-note-field="code"]{\n  margin-left:-7px !important;`)) {
  throw new Error('[css-cleanup-menu-admin-1617] Finální Admin Rozpis owner hodnoty se nesmí ztratit.');
}
if (!admin.includes(`.adminRotationQuickRemove{\n  position:fixed !important;\n  opacity:0 !important;`)
  || !admin.includes(`.adminRotationQuickRemove.isVisible{\n  opacity:1 !important;\n  transform:translate3d(0,0,0) !important;`)) {
  throw new Error('[css-cleanup-menu-admin-1617] Finální quick remove kontrakt se nesmí ztratit.');
}
if (!menu.includes('#appMenuBody .rakDevicePerfCard') || menu.includes('.adminUsage')) {
  throw new Error('[css-cleanup-menu-admin-1617] Menu polish owner/oddělení service usage se nesmí změnit.');
}
if (!admin.includes('.adminRotationQuickRemove{') || !admin.includes('#appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminRotationTable{')) {
  throw new Error('[css-cleanup-menu-admin-1617] Admin owner kontrakt se nesmí ztratit.');
}
const latePos = indexHtml.indexOf('styles-overrides-legacy-late.css');
const adminPos = indexHtml.indexOf('styles-admin-polish.css');
const menuPos = indexHtml.indexOf('styles-menu-polish.css');
if (latePos < 0 || adminPos < 0 || menuPos < 0 || !(latePos < adminPos && adminPos < menuPos)) {
  throw new Error('[css-cleanup-menu-admin-1617] Cascade pořadí legacy-late → admin → menu se nesmí změnit.');
}
if (!early.includes('/* RaK 1.6.16 CSS cleanup: Rotace legacy owner layers consolidated; visual contract unchanged. */')) {
  throw new Error('[css-cleanup-menu-admin-1617] 1.6.16 Rotace cleanup marker se nesmí ztratit.');
}
if (!calculators.includes('/* RaK 1.6.15 CSS cleanup: Kalkulačky owner consolidated; visual contract unchanged. */')) {
  throw new Error('[css-cleanup-menu-admin-1617] 1.6.15 Kalkulačky cleanup marker se nesmí ztratit.');
}
if (!bridge.includes("const RAK_ACTIVE_WRITE_PATHS_RPC_ONLY = '1.6.14-sec1';")) {
  throw new Error('[css-cleanup-menu-admin-1617] 1.6.14 RPC-only security marker se nesmí ztratit.');
}
if (!rotationTasks.includes("const RAK_SHARED_MSKC01_TASKS_MODE = '1.6.13-two-lathes';") || !rotationTasks.includes("tasksForMachine('MSKC01', normalizedShift)")) {
  throw new Error('[css-cleanup-menu-admin-1617] 1.6.13 MSKC01 task sharing se nesmí ztratit.');
}
if (!sw.includes("strategy: 'navigation-network-first;build-static-cache-first;isolated-prewarm'")) {
  throw new Error('[css-cleanup-menu-admin-1617] Navigace musí zůstat network-first.');
}
if (!/^window\.RAK_RELEASE_VERSION = "1\.6\.17";$/m.test(config)
  || !/^window\.RAK_TEST_DISPLAY_VERSION = "1\.6\.17";$/m.test(config)
  || !/^window\.RAK_PWA_BUILD = "v1\.6\.17-cssmenuadmin1";$/m.test(config)) {
  throw new Error('[css-cleanup-menu-admin-1617] Development visible/build verze není 1.6.17-cssmenuadmin1.');
}
if (!/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '1\.6\.17';$/m.test(sw)
  || !/^const DEVELOPMENT_BUILD_ID = '1\.6\.17-cssmenuadmin1';$/m.test(sw)) {
  throw new Error('[css-cleanup-menu-admin-1617] SW verze není 1.6.17-cssmenuadmin1.');
}

fs.writeFileSync(latePath, late, 'utf8');
fs.writeFileSync(adminPath, admin, 'utf8');
fs.writeFileSync(configPath, config, 'utf8');
fs.writeFileSync(swPath, sw, 'utf8');
console.log('[css-cleanup-menu-admin-1617] OK RaK 1.6.17 Menu/Admin dead owner layers consolidated; visual contract, 1.6.16 Rotace, 1.6.15 Kalkulačky, security, MSKC01 tasks and network-first preserved');
