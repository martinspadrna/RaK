#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const themePath = path.join(root, 'styles-theme-polish.css');
const propagationPath = path.join(root, 'styles-theme-propagation.css');
const adminPath = path.join(root, 'styles-admin-polish.css');
const earlyPath = path.join(root, 'styles-overrides-legacy-early.css');
const calculatorsPath = path.join(root, 'styles-calculators-mid.css');
const indexPath = path.join(root, 'index.html');
const configPath = path.join(root, 'supabase-config.js');
const swPath = path.join(root, 'sw.js');
const bridgePath = path.join(root, 'supabase-bridge.js');
const rotationTasksPath = path.join(root, 'rotation-tasks.js');

let theme = fs.readFileSync(themePath, 'utf8');
let config = fs.readFileSync(configPath, 'utf8');
let sw = fs.readFileSync(swPath, 'utf8');
const propagation = fs.readFileSync(propagationPath, 'utf8');
const admin = fs.readFileSync(adminPath, 'utf8');
const early = fs.readFileSync(earlyPath, 'utf8');
const calculators = fs.readFileSync(calculatorsPath, 'utf8');
const indexHtml = fs.readFileSync(indexPath, 'utf8');
const bridge = fs.readFileSync(bridgePath, 'utf8');
const rotationTasks = fs.readFileSync(rotationTasksPath, 'utf8');

const DISPLAY_VERSION = '1.6.18';
const BUILD_ID = '1.6.18-csstheme1';
const CSS_MARKER = '/* RaK 1.6.18 CSS cleanup: global theme dead helpers consolidated; visual contract unchanged. */';

function replaceExactlyOnce(source, label, oldText, newText) {
  const hits = source.split(oldText).length - 1;
  if (hits !== 1) throw new Error(`[css-cleanup-theme-1618] ${label}: očekáván 1 výskyt, nalezeno ${hits}.`);
  return source.replace(oldText, newText);
}

function removeRegexExactlyOnce(source, label, regex) {
  let hits = 0;
  const out = source.replace(regex, () => {
    hits += 1;
    return '';
  });
  if (hits !== 1) throw new Error(`[css-cleanup-theme-1618] ${label}: očekáván 1 blok, nalezeno ${hits}.`);
  return out;
}

if (!theme.includes(CSS_MARKER)) {
  const header = '/* RaK 1.2 (1.146) – finální theme/background polish oddělený ze styles-overrides.css. */';
  if (!theme.includes(header)) throw new Error('[css-cleanup-theme-1618] Chybí theme polish header.');
  theme = theme.replace(header, header + '\n' + CSS_MARKER);

  theme = replaceExactlyOnce(
    theme,
    'nepoužitý ThemeHueSoft helper',
    '  --rakThemeHueSoft:color-mix(in srgb, var(--rakThemeHue) 18%, transparent);\n',
    ''
  );
  theme = replaceExactlyOnce(
    theme,
    'nepoužitý ThemeHueMid helper',
    '  --rakThemeHueMid:color-mix(in srgb, var(--rakThemeHue) 34%, transparent);\n',
    ''
  );
  theme = replaceExactlyOnce(
    theme,
    'ThemeHueLine používaný jen mrtvou Home seam vrstvou',
    '  --rakThemeHueLine:color-mix(in srgb, var(--rakThemeHue) 62%, rgba(255,255,255,.26));\n',
    ''
  );
  theme = replaceExactlyOnce(
    theme,
    'ThemeHueShadow používaný jen mrtvou Home seam vrstvou',
    '  --rakThemeHueShadow:color-mix(in srgb, var(--rakThemeHue) 20%, transparent);\n',
    ''
  );

  theme = removeRegexExactlyOnce(
    theme,
    'mrtvý Home before seam owner přepsaný propagation vrstvou',
    /#home\.page\.active \.dashboardShell::before,\nhtml body #home\.page\.active > \.dashboardShell::before\{\n[\s\S]*?\n\}\n/g
  );
  theme = removeRegexExactlyOnce(
    theme,
    'mrtvý Home after seam owner přepsaný propagation vrstvou',
    /#home\.page\.active \.dashboardShell::after,\nhtml body #home\.page\.active > \.dashboardShell::after\{\n[\s\S]*?\n\}\n/g
  );
}

config = config.replace(/^window\.RAK_RELEASE_VERSION = "1\.6\.\d+";$/m, `window.RAK_RELEASE_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_TEST_DISPLAY_VERSION = "1\.6\.\d+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_PWA_BUILD = "v1\.6\.[^"]+";$/m, `window.RAK_PWA_BUILD = "v${BUILD_ID}";`);
sw = sw.replace(/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '1\.6\.\d+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY_VERSION}';`);
sw = sw.replace(/^const DEVELOPMENT_BUILD_ID = '1\.6\.[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD_ID}';`);

if (!theme.includes(CSS_MARKER)) throw new Error('[css-cleanup-theme-1618] CSS marker chybí.');
for (const deadVar of ['--rakThemeHueSoft:', '--rakThemeHueMid:', '--rakThemeHueLine:', '--rakThemeHueShadow:']) {
  if (theme.includes(deadVar)) throw new Error('[css-cleanup-theme-1618] Mrtvá theme proměnná zůstala: ' + deadVar);
}
if (theme.includes('#home.page.active .dashboardShell::before,\nhtml body #home.page.active > .dashboardShell::before{')
  || theme.includes('#home.page.active .dashboardShell::after,\nhtml body #home.page.active > .dashboardShell::after{')) {
  throw new Error('[css-cleanup-theme-1618] Stará Home seam pseudo-vrstva zůstala v theme polish.');
}
if (!theme.includes('--rakThemeHue:var(--rakThemeAccent, var(--green, #7CFF7C));')
  || !theme.includes('--rakThemeHueBright:color-mix(in srgb, var(--rakThemeHue) 72%, #ffffff);')
  || !theme.includes('--rakGlassPanelBg:')
  || !theme.includes('body::before{')
  || !theme.includes('body::after{')
  || !theme.includes('.page, .page.active, #home, #rotace')) {
  throw new Error('[css-cleanup-theme-1618] Aktivní globální theme owner se nesmí ztratit.');
}
if (!propagation.includes('#home.page.active > .dashboardShell::before,')
  || !propagation.includes('#home.page.active > .dashboardShell::after,')
  || !propagation.includes('body:not(.lightweightMode):not(.lowEndDevice):not(.ladaMode) #home.page.active > .dashboardShell::before,')
  || !propagation.includes('body:not(.lightweightMode):not(.lowEndDevice):not(.ladaMode) #home.page.active > .dashboardShell::after,')
  || !propagation.includes('content:none !important;')
  || !propagation.includes('display:none !important;')) {
  throw new Error('[css-cleanup-theme-1618] Pozdější Home seam disable owner se nesmí ztratit.');
}
const themePos = indexHtml.indexOf('styles-theme-polish.css');
const propagationPos = indexHtml.indexOf('styles-theme-propagation.css');
if (themePos < 0 || propagationPos < 0 || !(themePos < propagationPos)) {
  throw new Error('[css-cleanup-theme-1618] Cascade pořadí theme-polish → theme-propagation se nesmí změnit.');
}
if (!admin.includes('/* RaK 1.6.17 CSS cleanup: Menu/Admin proven dead owner layers consolidated; visual contract unchanged. */')) {
  throw new Error('[css-cleanup-theme-1618] 1.6.17 Menu/Admin cleanup marker se nesmí ztratit.');
}
if (!early.includes('/* RaK 1.6.16 CSS cleanup: Rotace legacy owner layers consolidated; visual contract unchanged. */')) {
  throw new Error('[css-cleanup-theme-1618] 1.6.16 Rotace cleanup marker se nesmí ztratit.');
}
if (!calculators.includes('/* RaK 1.6.15 CSS cleanup: Kalkulačky owner consolidated; visual contract unchanged. */')) {
  throw new Error('[css-cleanup-theme-1618] 1.6.15 Kalkulačky cleanup marker se nesmí ztratit.');
}
if (!bridge.includes("const RAK_ACTIVE_WRITE_PATHS_RPC_ONLY = '1.6.14-sec1';")) {
  throw new Error('[css-cleanup-theme-1618] 1.6.14 RPC-only security marker se nesmí ztratit.');
}
if (!rotationTasks.includes("const RAK_SHARED_MSKC01_TASKS_MODE = '1.6.13-two-lathes';")
  || !rotationTasks.includes("tasksForMachine('MSKC01', normalizedShift)")) {
  throw new Error('[css-cleanup-theme-1618] 1.6.13 MSKC01 task sharing se nesmí ztratit.');
}
if (!sw.includes("strategy: 'navigation-network-first;build-static-cache-first;isolated-prewarm'")) {
  throw new Error('[css-cleanup-theme-1618] Navigace musí zůstat network-first.');
}
if (!/^window\.RAK_RELEASE_VERSION = "1\.6\.18";$/m.test(config)
  || !/^window\.RAK_TEST_DISPLAY_VERSION = "1\.6\.18";$/m.test(config)
  || !/^window\.RAK_PWA_BUILD = "v1\.6\.18-csstheme1";$/m.test(config)) {
  throw new Error('[css-cleanup-theme-1618] Development visible/build verze není 1.6.18-csstheme1.');
}
if (!/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '1\.6\.18';$/m.test(sw)
  || !/^const DEVELOPMENT_BUILD_ID = '1\.6\.18-csstheme1';$/m.test(sw)) {
  throw new Error('[css-cleanup-theme-1618] SW verze není 1.6.18-csstheme1.');
}

fs.writeFileSync(themePath, theme, 'utf8');
fs.writeFileSync(configPath, config, 'utf8');
fs.writeFileSync(swPath, sw, 'utf8');
console.log('[css-cleanup-theme-1618] OK RaK 1.6.18 global theme dead helpers/seam layers consolidated; visual contract, 1.6.17 Menu/Admin, 1.6.16 Rotace, 1.6.15 Kalkulačky, security, MSKC01 tasks and network-first preserved');
