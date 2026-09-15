#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const earlyPath = path.join(root, 'styles-overrides-legacy-early.css');
const latePath = path.join(root, 'styles-overrides-legacy-late.css');
const viewportPath = path.join(root, 'styles-viewport-polish.css');
const releasePath = path.join(root, 'styles-release-polish.css');
const calculatorsPath = path.join(root, 'styles-calculators-mid.css');
const configPath = path.join(root, 'supabase-config.js');
const swPath = path.join(root, 'sw.js');
const bridgePath = path.join(root, 'supabase-bridge.js');
const rotationTasksPath = path.join(root, 'rotation-tasks.js');

let early = fs.readFileSync(earlyPath, 'utf8');
let late = fs.readFileSync(latePath, 'utf8');
let config = fs.readFileSync(configPath, 'utf8');
let sw = fs.readFileSync(swPath, 'utf8');
const viewport = fs.readFileSync(viewportPath, 'utf8');
const release = fs.readFileSync(releasePath, 'utf8');
const calculators = fs.readFileSync(calculatorsPath, 'utf8');
const bridge = fs.readFileSync(bridgePath, 'utf8');
const rotationTasks = fs.readFileSync(rotationTasksPath, 'utf8');

const DISPLAY_VERSION = '1.6.16';
const BUILD_ID = '1.6.16-cssrot1';
const CSS_MARKER = '/* RaK 1.6.16 CSS cleanup: Rotace legacy owner layers consolidated; visual contract unchanged. */';

function replaceExactlyOnce(source, label, oldText, newText) {
  const hits = source.split(oldText).length - 1;
  if (hits !== 1) throw new Error(`[css-cleanup-rotation-1616] ${label}: očekáván 1 výskyt, nalezeno ${hits}.`);
  return source.replace(oldText, newText);
}

if (!early.includes(CSS_MARKER)) {
  const rotationInventory = '/* RaK v1.5.62 – proven Rotace legacy dedupe + inventory.';
  if (!early.includes(rotationInventory)) throw new Error('[css-cleanup-rotation-1616] Chybí Rotace legacy inventory marker.');
  early = early.replace(rotationInventory, CSS_MARKER + '\n' + rotationInventory);

  early = replaceExactlyOnce(
    early,
    'mrtvý první Rotace listItem blok',
    `#rotaceNamesPanel .listItem{font-size:11px !important;\n    min-height:30px !important;\n    padding:4px 6px !important;\n    line-height:1.05 !important;}\n`,
    ''
  );

  late = replaceExactlyOnce(
    late,
    'v928 base dock max-height přepsaný v930',
    `:root{\n  --rak-rotace-names-dock-gap:10px;\n  --rak-rotace-names-dock-max-height:min(34dvh, 136px);\n}`,
    `:root{\n  --rak-rotace-names-dock-gap:10px;\n}`
  );

  late = replaceExactlyOnce(
    late,
    'v928 base item motion přepsaný v930',
    `#rotace.page.active #rotaceNamesPanel.active #namesGrid .listItem,\n#rotace.page.active #rotaceNamesPanel.active #namesGrid .rotaceNameTile{\n  transition:none !important;\n  animation:none !important;\n}\n`,
    ''
  );

  late = replaceExactlyOnce(
    late,
    'v928 compact root max-height přepsaný v930',
    `  :root{\n    --rak-rotace-names-dock-gap:8px;\n    --rak-rotace-names-dock-max-height:min(30dvh, 112px);\n  }`,
    `  :root{\n    --rak-rotace-names-dock-gap:8px;\n  }`
  );

  late = replaceExactlyOnce(
    late,
    'v928 compact namesGrid layout přepsaný v930',
    `  #rotace #rotaceNamesPanel.active #namesGrid{\n    padding:8px 4px 5px !important;\n    gap:5px !important;\n    border-radius:15px !important;\n  }\n`,
    ''
  );

  late = replaceExactlyOnce(
    late,
    'v928 compact item size přepsaný v930',
    `  #rotace.page.active #rotaceNamesPanel.active #namesGrid .listItem,\n  #rotace.page.active #rotaceNamesPanel.active #namesGrid .rotaceNameTile{\n    min-height:32px !important;\n    padding:4px 2px !important;\n  }\n`,
    ''
  );

  late = replaceExactlyOnce(
    late,
    'v928 compact title font-size přepsaný v930',
    `  #rotaceNamesPanel .rotaceTileTitle{\n    font-size:10.5px !important;\n    line-height:1.05 !important;\n  }`,
    `  #rotaceNamesPanel .rotaceTileTitle{\n    line-height:1.05 !important;\n  }`
  );
}

config = config.replace(/^window\.RAK_RELEASE_VERSION = "1\.6\.\d+";$/m, `window.RAK_RELEASE_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_TEST_DISPLAY_VERSION = "1\.6\.\d+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_PWA_BUILD = "v1\.6\.[^"]+";$/m, `window.RAK_PWA_BUILD = "v${BUILD_ID}";`);

sw = sw.replace(/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '1\.6\.\d+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY_VERSION}';`);
sw = sw.replace(/^const DEVELOPMENT_BUILD_ID = '1\.6\.[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD_ID}';`);

if (!early.includes(CSS_MARKER)) throw new Error('[css-cleanup-rotation-1616] Rotace CSS marker chybí.');
if (early.includes(`#rotaceNamesPanel .listItem{font-size:11px !important;\n    min-height:30px !important;\n    padding:4px 6px !important;\n    line-height:1.05 !important;}`)) {
  throw new Error('[css-cleanup-rotation-1616] Mrtvý první Rotace listItem blok zůstal.');
}
if (!early.includes(`#rotaceNamesPanel .listItem{min-height: clamp(36px, 6dvh, 52px) !important;\n    padding: clamp(6px, 1.2vw, 10px) !important;\n    font-size: clamp(11px, 3.1vw, 15px) !important;\n    line-height: 1.08 !important;}`)) {
  throw new Error('[css-cleanup-rotation-1616] Aktivní legacy Rotace listItem owner se nesmí ztratit.');
}
if (late.includes('--rak-rotace-names-dock-max-height:min(34dvh, 136px);')
  || late.includes('--rak-rotace-names-dock-max-height:min(30dvh, 112px);')
  || late.includes('min-height:32px !important;\n    padding:4px 2px !important;')) {
  throw new Error('[css-cleanup-rotation-1616] Staré v928 Rotace hodnoty zůstaly.');
}
if (!late.includes('--rak-rotace-names-dock-gap:10px;')
  || !late.includes('--rak-rotace-names-dock-gap:8px;')
  || !late.includes(`#rotaceNamesPanel .rotaceTileTitle{\n    line-height:1.05 !important;\n  }`)) {
  throw new Error('[css-cleanup-rotation-1616] Hodnoty z v928, které stále vlastní chování, se nesmí ztratit.');
}
if (!late.includes('--rak-rotace-names-dock-max-height:min(38dvh, 156px);')
  || !late.includes('--rak-rotace-names-dock-max-height:min(36dvh, 146px);')
  || !late.includes('min-height:44px !important;\n    padding:6px 3px !important;')) {
  throw new Error('[css-cleanup-rotation-1616] Pozdější v930 Rotace owner se nesmí ztratit.');
}
if (!late.includes('#rotace.page:not(.active) #rotaceNamesPanel #namesGrid,')
  || !late.includes('#rotaceNamesPanel:not(.active) #namesGrid{')
  || !late.includes('.rotaceNameTile.activeChoice{')) {
  throw new Error('[css-cleanup-rotation-1616] Rotace visibility/activeChoice kontrakt se nesmí ztratit.');
}
if (!viewport.includes('#rotace.page.active #rotaceNamesPanel.active')
  || !release.includes('#rotace.page.active #rotaceNamesPanel.active #namesGrid')) {
  throw new Error('[css-cleanup-rotation-1616] Pozdní viewport/release vlastníci Rotace musí zůstat.');
}
if (!calculators.includes('/* RaK 1.6.15 CSS cleanup: Kalkulačky owner consolidated; visual contract unchanged. */')) {
  throw new Error('[css-cleanup-rotation-1616] 1.6.15 Kalkulačky CSS cleanup marker se nesmí ztratit.');
}
if (!bridge.includes("const RAK_ACTIVE_WRITE_PATHS_RPC_ONLY = '1.6.14-sec1';")) {
  throw new Error('[css-cleanup-rotation-1616] 1.6.14 RPC-only security marker se nesmí ztratit.');
}
if (!rotationTasks.includes("const RAK_SHARED_MSKC01_TASKS_MODE = '1.6.13-two-lathes';")
  || !rotationTasks.includes("tasksForMachine('MSKC01', normalizedShift)")) {
  throw new Error('[css-cleanup-rotation-1616] 1.6.13 sdílení úkolů MSKC01 se nesmí ztratit.');
}
if (!sw.includes("strategy: 'navigation-network-first;build-static-cache-first;isolated-prewarm'")) {
  throw new Error('[css-cleanup-rotation-1616] Navigace musí zůstat network-first.');
}
if (!/^window\.RAK_RELEASE_VERSION = "1\.6\.16";$/m.test(config)
  || !/^window\.RAK_TEST_DISPLAY_VERSION = "1\.6\.16";$/m.test(config)
  || !/^window\.RAK_PWA_BUILD = "v1\.6\.16-cssrot1";$/m.test(config)) {
  throw new Error('[css-cleanup-rotation-1616] Development visible/build verze není 1.6.16-cssrot1.');
}
if (!/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '1\.6\.16';$/m.test(sw)
  || !/^const DEVELOPMENT_BUILD_ID = '1\.6\.16-cssrot1';$/m.test(sw)) {
  throw new Error('[css-cleanup-rotation-1616] SW verze není 1.6.16-cssrot1.');
}

fs.writeFileSync(earlyPath, early, 'utf8');
fs.writeFileSync(latePath, late, 'utf8');
fs.writeFileSync(configPath, config, 'utf8');
fs.writeFileSync(swPath, sw, 'utf8');
console.log('[css-cleanup-rotation-1616] OK RaK 1.6.16 Rotace dead/overwritten CSS consolidated; visual contract, 1.6.15 calculators, security, MSKC01 tasks and network-first preserved');
