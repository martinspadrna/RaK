#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = String(process.argv[2] || '').trim();
const DISPLAY_VERSION = '1.7';
const TECH_VERSION = '1.7.0';
const BUILD_ID = '1.7.0-release1';
const ABOUT_START = '    // RAK_170_ABOUT_START';
const ABOUT_END = '    // RAK_170_ABOUT_END';
const RELEASE_POLICY = "const RAK_RELEASE_170_POLICY = 'display-1.7;technical-1.7.0;cache-v1.7.0;about-summary;complete-backup-preserved';";

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, value) => fs.writeFileSync(path.join(root, file), value, 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error('[release-170] ' + message); };

function removeAbout170(source) {
  const re = /\n\s*\/\/ RAK_170_ABOUT_START[\s\S]*?\/\/ RAK_170_ABOUT_END\n/;
  return source.replace(re, '\n');
}

function removeChangelog170(source) {
  return source.replace(/^## RaK 1\.7\n[\s\S]*?(?=^##\s)/m, '');
}

function pre() {
  const pkg = JSON.parse(read('package.json'));
  pkg.version = '1.6.0';
  write('package.json', JSON.stringify(pkg, null, 2) + '\n');

  let app = read('app.js');
  app = app.replace(/const RAK_MODULE_CACHE_VERSION = "[^"]+";/, 'const RAK_MODULE_CACHE_VERSION = "1.6.0";');
  app = app.replace(/const RAK_DEV_UPDATE_BUILD = "[^"]+";/, 'const RAK_DEV_UPDATE_BUILD = "v1.6.0";');
  app = app.replace(/window\.RAK_RELEASE_VERSION = "[^"]+";/, 'window.RAK_RELEASE_VERSION = "1.6";');
  write('app.js', app);

  let core = read('core.js');
  core = core.replace(/const APP_VERSION = "[^"]+";/, 'const APP_VERSION = "1.5";');
  write('core.js', core);

  let sw = read('sw.js');
  sw = sw.replace(/^const CACHE_VERSION = '[^']+';$/m, "const CACHE_VERSION = 'v1.6.0';");
  sw = sw.replace(/^const SW_APP_VERSION = '[^']+';$/m, "const SW_APP_VERSION = '1.6.0';");
  sw = sw.replace(/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '[^']+';$/m, "const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.6.03';");
  sw = sw.replace(/^const DEVELOPMENT_BUILD_ID = '[^']+';$/m, "const DEVELOPMENT_BUILD_ID = '1.6.03-home2';");
  sw = sw.replace(/\?v=1\.7\.0/g, '?v=1.6.0');
  sw = sw.replace(/\.\/app\.js\?v=1\.6\.0/g, './app.js?v=1.5.1');
  write('sw.js', sw);

  let config = read('supabase-config.js');
  config = config.replace(/^window\.RAK_RELEASE_VERSION = "[^"]+";$/m, 'window.RAK_RELEASE_VERSION = "1.6.03";');
  config = config.replace(/^window\.RAK_TEST_DISPLAY_VERSION = "[^"]+";$/m, 'window.RAK_TEST_DISPLAY_VERSION = "1.6.03";');
  config = config.replace(/^window\.RAK_PWA_BUILD = "[^"]+";$/m, 'window.RAK_PWA_BUILD = "v1.6.03-stats2";');
  write('supabase-config.js', config);

  let menuPages = removeAbout170(read('app-menu-pages.js'));
  menuPages = menuPages.replace(/window\.RAK_RELEASE_VERSION \|\| versionText \|\| '1\.7'/, "window.RAK_RELEASE_VERSION || versionText || '1.6'");
  write('app-menu-pages.js', menuPages);

  let changelog = removeChangelog170(read('CHANGELOG.md'));
  write('CHANGELOG.md', changelog);

  let index = read('index.html');
  index = index.replace(/app\.js\?v=1\.7\.0/g, 'app.js?v=1.5.1');
  write('index.html', index);

  console.log('[release-170] pre: restored verified 1.6 build baseline for legacy regression guards');
}

function final() {
  const pkg = JSON.parse(read('package.json'));
  pkg.version = TECH_VERSION;
  write('package.json', JSON.stringify(pkg, null, 2) + '\n');

  let app = read('app.js');
  app = app.replace(/const RAK_MODULE_CACHE_VERSION = "[^"]+";/, `const RAK_MODULE_CACHE_VERSION = "${TECH_VERSION}";`);
  app = app.replace(/const RAK_DEV_UPDATE_BUILD = "[^"]+";/, `const RAK_DEV_UPDATE_BUILD = "v${TECH_VERSION}";`);
  app = app.replace(/window\.RAK_RELEASE_VERSION = "[^"]+";/, `window.RAK_RELEASE_VERSION = "${DISPLAY_VERSION}";`);
  app = app.replace(/^\/\/ RaK 1\.6\.0[^\n]*$/m, '// RaK 1.7 – stabilní release po dokončení 1.6 optimalizací, auditu a úplné zálohy.');
  write('app.js', app);

  let core = read('core.js');
  core = core.replace(/const APP_VERSION = "[^"]+";/, `const APP_VERSION = "${DISPLAY_VERSION}";`);
  core = core.replace(/^\/\/ RaK 1\.5[^\n]*$/m, '// RaK 1.7 – core stav, verze a sdílené helpery aplikace.');
  write('core.js', core);

  let sw = read('sw.js');
  sw = sw.replace(/^const CACHE_VERSION = '[^']+';$/m, `const CACHE_VERSION = 'v${TECH_VERSION}';`);
  sw = sw.replace(/^const SW_APP_VERSION = '[^']+';$/m, `const SW_APP_VERSION = '${TECH_VERSION}';`);
  sw = sw.replace(/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '[^']+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY_VERSION}';`);
  sw = sw.replace(/^const DEVELOPMENT_BUILD_ID = '[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD_ID}';`);
  sw = sw.replace(/\?v=1\.6\.0/g, `?v=${TECH_VERSION}`);
  sw = sw.replace(/\.\/app\.js\?v=1\.5\.1/g, `./app.js?v=${TECH_VERSION}`);
  if (!sw.includes(RELEASE_POLICY)) {
    const anchor = "const DEVELOPMENT_COMPLETE_BACKUP_IOS_POLICY = 'single-same-origin-source-archive;no-raw-github-fetch;expanded-repository-folder';";
    assert(sw.includes(anchor), '1.6.34 complete-backup policy marker missing');
    sw = sw.replace(anchor, anchor + '\n' + RELEASE_POLICY);
  }
  sw = sw.replace(/^\/\/ RaK 1\.6[^\n]*service worker[^\n]*$/m, '// RaK 1.7 PWA service worker – v1.7.0 cache + confirmed-update navigation.');
  write('sw.js', sw);

  let config = read('supabase-config.js');
  config = config.replace(/^window\.RAK_RELEASE_VERSION = "[^"]+";$/m, `window.RAK_RELEASE_VERSION = "${DISPLAY_VERSION}";`);
  config = config.replace(/^window\.RAK_TEST_DISPLAY_VERSION = "[^"]+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY_VERSION}";`);
  config = config.replace(/^window\.RAK_PWA_BUILD = "[^"]+";$/m, `window.RAK_PWA_BUILD = "v${BUILD_ID}";`);
  write('supabase-config.js', config);

  let menuPages = removeAbout170(read('app-menu-pages.js'));
  const section = [
    ABOUT_START,
    '    {',
    "      range: 'RaK 1.7',",
    "      title: 'Co je nové proti 1.6',",
    '      lines: [',
    "        'Výrobní přehledy jsou přesnější: Kalírna se už nepočítá na původní stroj, osobní statistiky ukazují samostatné frézky a dvojici na soustruzích a report směny umí MO volné kusy i TTKW01/TTKW02.',",
    "        'Úkoly MSKC01 se při obsazení jen MSKC03 + MSKC04 správně sdílí na oba soustruhy, včetně úkolů upravených v administraci.',",
    "        'Bezpečnost se zpřísnila: vývoj používá oddělenou Supabase, pracovní zápisy jdou přes chráněná RPC a zbytečný přímý přístup ke keepalive tabulce byl uzavřen.',",
    "        'Start a PWA jsou lehčí: proběhl CSS cleanup, bezpečné lazy/idle načítání, omezení MutationObserverů, optimalizace obrázků a cache a přibyly pevné výkonové rozpočty.',",
    "        'Proběhl celkový audit aplikace: opravený ZIP export, aktuálnější diagnostika a changelog, odstraněné zbytky Her a přidané nové security a regresní kontroly.',",
    "        'Administrace má novou Úplnou zálohu RaK na jeden klik: ukládá přesný zdroj, nasazenou PWA, data a strukturu Supabase, sanitizovaný Auth přehled, Storage a návod k obnově.'",
    '      ]',
    '    },',
    ABOUT_END
  ].join('\n');
  const sectionsAnchor = '  const sections = [\n';
  assert(menuPages.includes(sectionsAnchor), 'About sections anchor missing');
  menuPages = menuPages.replace(sectionsAnchor, sectionsAnchor + section + '\n');
  menuPages = menuPages.replace(/window\.RAK_RELEASE_VERSION \|\| versionText \|\| '1\.6'/, "window.RAK_RELEASE_VERSION || versionText || '1.7'");
  write('app-menu-pages.js', menuPages);

  let changelog = removeChangelog170(read('CHANGELOG.md'));
  const changelog170 = [
    '## RaK 1.7',
    '',
    '- Přesnější výroba a statistiky: Kalírna mimo původní stroj, osobní MFK solo/MSK dvojice, MO volné kusy, TTKW01/TTKW02 a sdílené úkoly MSKC01 při obsazení MSKC03 + MSKC04.',
    '- Bezpečnost: oddělená development Supabase, aktivní pracovní zápisy RPC-only a utažený keepalive přístup.',
    '- Výkon/PWA: CSS cleanup, bezpečné lazy/idle načítání, MutationObserver cleanup, optimalizace PNG, cache tuning a výkonové guardy.',
    '- Celkový audit: opravený ZIP export, srovnaná diagnostika/changelog, odstraněné pozůstatky Her a nové security/regresní smoke testy.',
    '- Úplná záloha RaK: jeden ZIP obsahuje přesný Git zdroj, nasazenou PWA, Supabase data a strukturu, sanitizovaný Auth přehled, Storage, manifest a návod k obnově.',
    '- Release metadata sjednocena na veřejnou verzi RaK 1.7, technickou verzi 1.7.0 a novou PWA cache v1.7.0.',
    '',
    ''
  ].join('\n');
  changelog = changelog170 + changelog;
  write('CHANGELOG.md', changelog);

  let index = read('index.html');
  index = index.replace(/app\.js\?v=1\.5\.1/g, `app.js?v=${TECH_VERSION}`);
  write('index.html', index);

  console.log('[release-170] final: RaK 1.7 / technical 1.7.0 release metadata + concise About summary applied');
}

if (mode === 'pre') pre();
else if (mode === 'final') final();
else throw new Error('[release-170] use pre or final');
