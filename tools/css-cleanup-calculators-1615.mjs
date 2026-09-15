#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cssPath = path.join(root, 'styles-calculators-mid.css');
const configPath = path.join(root, 'supabase-config.js');
const swPath = path.join(root, 'sw.js');
const bridgePath = path.join(root, 'supabase-bridge.js');
const rotationTasksPath = path.join(root, 'rotation-tasks.js');
const indexPath = path.join(root, 'index.html');

let css = fs.readFileSync(cssPath, 'utf8');
let config = fs.readFileSync(configPath, 'utf8');
let sw = fs.readFileSync(swPath, 'utf8');
const bridge = fs.readFileSync(bridgePath, 'utf8');
const rotationTasks = fs.readFileSync(rotationTasksPath, 'utf8');
const indexHtml = fs.readFileSync(indexPath, 'utf8');

const DISPLAY_VERSION = '1.6.15';
const BUILD_ID = '1.6.15-csscalc1';
const CSS_MARKER = '/* RaK 1.6.15 CSS cleanup: Kalkulačky owner consolidated; visual contract unchanged. */';

function replaceExactlyOnce(label, oldText, newText) {
  const hits = css.split(oldText).length - 1;
  if (hits !== 1) throw new Error(`[css-cleanup-calculators-1615] ${label}: očekáván 1 výskyt, nalezeno ${hits}.`);
  css = css.replace(oldText, newText);
}

if (!css.includes(CSS_MARKER)) {
  const ownerLine = '/* RaK v1.5.76 – owner: Kalkulačky / hlavní menu, výpočet kusů a korekce */';
  if (!css.includes(ownerLine)) throw new Error('[css-cleanup-calculators-1615] Chybí Kalkulačky owner marker.');
  css = css.replace(ownerLine, ownerLine + '\n' + CSS_MARKER);

  replaceExactlyOnce(
    'duplicitní calcHomeGrid deklarace',
    `#kalkulacky .calcHomeSection .calcHomeGrid{\n  display:grid !important;\n  grid-template-columns:1fr !important;\n  gap:8px !important;\n  margin-top:2px !important;\n}`,
    `#kalkulacky .calcHomeSection .calcHomeGrid{\n  margin-top:2px !important;\n}`
  );

  replaceExactlyOnce(
    'rozdělený calcTile owner blok',
    `#kalkulacky .calcHomeSection .calcTile.calcTileStack{\n  min-height:66px !important;\n  padding:9px 11px !important;\n  border-radius:18px !important;\n}`,
    `#kalkulacky .calcHomeSection .calcTile.calcTileStack{\n  min-height:66px !important;\n  padding:9px 11px !important;\n  border-radius:18px !important;\n  width:100% !important;\n  max-width:none !important;\n  grid-column:1 / -1 !important;\n}`
  );

  replaceExactlyOnce(
    'pozdější rozdělený calcTile doplněk',
    `#kalkulacky .calcHomeSection .calcTile.calcTileStack{\n  width:100% !important;\n  max-width:none !important;\n  grid-column:1 / -1 !important;\n}\n`,
    ''
  );

  replaceExactlyOnce(
    'mrtvá první correction header vrstva',
    `:is(#korekce-soustruhy, #korekce-frezky, #korekce-brusy).calcPage .calcHeaderBar{\n  min-height:50px !important;\n  display:grid !important;\n  grid-template-columns:1fr minmax(0, auto) 1fr !important;\n  align-items:center !important;\n  padding-right:88px !important;\n}\n`,
    ''
  );

  replaceExactlyOnce(
    'mrtvá první correction title vrstva',
    `:is(#korekce-soustruhy, #korekce-frezky, #korekce-brusy).calcPage .calcHeaderBar h3{\n  white-space:nowrap !important;\n  overflow:hidden !important;\n  text-overflow:ellipsis !important;\n  font-size:clamp(16px, 4.2vw, 20px) !important;\n  line-height:1 !important;\n}\n`,
    ''
  );
}

config = config.replace(/^window\.RAK_RELEASE_VERSION = "1\.6\.\d+";$/m, `window.RAK_RELEASE_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_TEST_DISPLAY_VERSION = "1\.6\.\d+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_PWA_BUILD = "v1\.6\.[^"]+";$/m, `window.RAK_PWA_BUILD = "v${BUILD_ID}";`);

sw = sw.replace(/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '1\.6\.\d+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY_VERSION}';`);
sw = sw.replace(/^const DEVELOPMENT_BUILD_ID = '1\.6\.[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD_ID}';`);

if (!css.includes(CSS_MARKER)) throw new Error('[css-cleanup-calculators-1615] CSS marker chybí.');
if (!css.includes(`#kalkulacky .calcHomeSection .calcHomeGrid{\n  margin-top:2px !important;\n}`)) {
  throw new Error('[css-cleanup-calculators-1615] calcHomeGrid margin owner není zachovaný.');
}
if (!css.includes(`#kalkulacky .calcHomeSection .calcHomeGrid,\n#kalkulacky .calcHomeGrid.grid{\n  display:grid !important;\n  grid-template-columns:1fr !important;\n  gap:8px !important;\n}`)) {
  throw new Error('[css-cleanup-calculators-1615] Finální calcHomeGrid layout owner chybí.');
}
if (!css.includes(`#kalkulacky .calcHomeSection .calcTile.calcTileStack{\n  min-height:66px !important;\n  padding:9px 11px !important;\n  border-radius:18px !important;\n  width:100% !important;\n  max-width:none !important;\n  grid-column:1 / -1 !important;\n}`)) {
  throw new Error('[css-cleanup-calculators-1615] Sloučený calcTile owner chybí.');
}
if (css.includes('font-size:clamp(16px, 4.2vw, 20px) !important;')) {
  throw new Error('[css-cleanup-calculators-1615] Stará correction title vrstva zůstala.');
}
if (css.includes(`min-height:50px !important;\n  display:grid !important;\n  grid-template-columns:1fr minmax(0, auto) 1fr !important;\n  align-items:center !important;\n  padding-right:88px !important;`)) {
  throw new Error('[css-cleanup-calculators-1615] Stará correction header vrstva zůstala.');
}
if (!css.includes('#kalkulacky.page > .headerBar,')
  || !css.includes('--rakCalcTitleHeight:46px;')) {
  throw new Error('[css-cleanup-calculators-1615] Finální sjednocený Kalkulačky header owner se nesmí ztratit.');
}

const settingsPos = indexHtml.indexOf('styles-settings-runtime.css');
const calculatorsPos = indexHtml.indexOf('styles-calculators-mid.css');
const adminRotationPos = indexHtml.indexOf('styles-admin-rotation-editor.css');
if (settingsPos < 0 || calculatorsPos < 0 || adminRotationPos < 0 || !(settingsPos < calculatorsPos && calculatorsPos < adminRotationPos)) {
  throw new Error('[css-cleanup-calculators-1615] Pořadí Kalkulačky stylesheetu se nesmí změnit.');
}
if (!bridge.includes("const RAK_ACTIVE_WRITE_PATHS_RPC_ONLY = '1.6.14-sec1';")) {
  throw new Error('[css-cleanup-calculators-1615] 1.6.14 RPC-only security marker se nesmí ztratit.');
}
if (!rotationTasks.includes("const RAK_SHARED_MSKC01_TASKS_MODE = '1.6.13-two-lathes';")
  || !rotationTasks.includes("tasksForMachine('MSKC01', normalizedShift)")) {
  throw new Error('[css-cleanup-calculators-1615] 1.6.13 sdílení úkolů MSKC01 se nesmí ztratit.');
}
if (!sw.includes("strategy: 'navigation-network-first;build-static-cache-first;isolated-prewarm'")) {
  throw new Error('[css-cleanup-calculators-1615] Navigace musí zůstat network-first.');
}
if (!/^window\.RAK_RELEASE_VERSION = "1\.6\.15";$/m.test(config)
  || !/^window\.RAK_TEST_DISPLAY_VERSION = "1\.6\.15";$/m.test(config)
  || !/^window\.RAK_PWA_BUILD = "v1\.6\.15-csscalc1";$/m.test(config)) {
  throw new Error('[css-cleanup-calculators-1615] Development visible/build verze není 1.6.15-csscalc1.');
}
if (!/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '1\.6\.15';$/m.test(sw)
  || !/^const DEVELOPMENT_BUILD_ID = '1\.6\.15-csscalc1';$/m.test(sw)) {
  throw new Error('[css-cleanup-calculators-1615] SW verze není 1.6.15-csscalc1.');
}

fs.writeFileSync(cssPath, css, 'utf8');
fs.writeFileSync(configPath, config, 'utf8');
fs.writeFileSync(swPath, sw, 'utf8');
console.log('[css-cleanup-calculators-1615] OK RaK 1.6.15 Kalkulačky duplicate/dead CSS consolidated; visual contract, security, MSKC01 tasks and network-first preserved');
