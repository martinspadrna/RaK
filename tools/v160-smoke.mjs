import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (file) => fs.readFileSync(file, 'utf8');
const app = read('app.js');
const pkg = JSON.parse(read('package.json'));
const sw = read('sw.js');
const config = read('supabase-config.js');
const menuPages = read('app-menu-pages.js');
const shiftReportMenu = read('app-menu-shift-report.js');
const shiftReport = read('rak-shift-report.js');
const brus = read('brusy-fhb-v158.js');
const hotfix = read('kalirna-daymod-override.js');
const kalirnaStats = read('kalirna-stats-override.js');
const viewport = read('styles-viewport-polish.css').replace(/\/\*[\s\S]*?\*\//g, '');
const polish = read('styles-dashboard-polish.css');

assert.equal(pkg.version, '1.6.0', 'package version must stay 1.6.0');
assert.match(app, /RAK_MODULE_CACHE_VERSION\s*=\s*["']1\.6\.0["']/, 'app cache version must stay 1.6.0');
assert.match(app, /RAK_DEV_UPDATE_BUILD\s*=\s*["']v1\.6\.0["']/, 'app update build must stay v1.6.0');
assert(app.includes('window.RAK_RELEASE_VERSION = "1.6";'), 'public RaK 1.6 release version marker missing');
assert.match(sw, /CACHE_VERSION\s*=\s*["']v1\.6\.(?:0|\d{2,})["']/, 'service worker cache must stay in the RaK 1.6 production/test line');
assert.match(sw, /SW_APP_VERSION\s*=\s*["']1\.6\.(?:0|\d{2,})["']/, 'service worker technical version must stay in the RaK 1.6 production/test line');
assert(sw.includes("const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.6.03';"), 'service worker visible test version must be 1.6.03');
assert(sw.includes("const DEVELOPMENT_BUILD_ID = '1.6.03-stats1';"), 'service worker internal stats hotfix build id missing');
assert(sw.includes("type: 'sw-version', version: CACHE_VERSION, appVersion: DEVELOPMENT_TEST_DISPLAY_VERSION"), 'update offer must expose visible 1.6.03 as appVersion');
assert(sw.includes("type: 'sw-activated', version: CACHE_VERSION, appVersion: DEVELOPMENT_TEST_DISPLAY_VERSION"), 'activated worker must expose visible 1.6.03 as appVersion');
assert(sw.includes('technicalAppVersion: SW_APP_VERSION'), 'technical 1.6.0 must remain separately available');
assert(sw.includes('buildId: DEVELOPMENT_BUILD_ID'), 'worker must report internal hotfix build id without changing visible version');
assert(sw.includes("'./core.js?v=1.6.0'"), 'warm-start core must use current 1.6.0 build');
assert(sw.includes("'./app-menu-shift-report.js?v=1.6.0'"), 'PWA must invalidate cached shift-report menu entry for MO free hotfix');
assert(sw.includes("'./kalirna-stats-override.js?v=20260913-1'"), 'PWA must invalidate the Kalirna stats override on this hotfix');
assert(sw.includes("nextUrl.searchParams.set('_rak_update', CACHE_VERSION + '-' + Date.now().toString(36))"), 'confirmed update cache-busting navigation missing');
assert(sw.includes("const SAME_VERSION_HOTFIX_ASSETS = ['./app-menu-pages.js?v=1.6.0'];"), 'same-version About cache invalidation missing');
assert(sw.includes('await clearSameVersionHotfixAssets();'), 'same-version About cache invalidation must run during SW install');
assert(!sw.includes('await self.skipWaiting();'), 'service worker install must wait for explicit user confirmation');
assert(sw.includes("if (data.type === 'SKIP_WAITING')"), 'confirmed update message handler missing');
assert(sw.includes('self.skipWaiting();'), 'confirmed update activation missing');

assert(config.includes('window.RAK_RELEASE_VERSION = "1.6.03";'), 'development display version must be 1.6.03');
assert(config.includes('window.RAK_TEST_DISPLAY_VERSION = "1.6.03";'), 'development test display version must be 1.6.03');
assert(config.includes('window.RAK_PWA_BUILD = "v1.6.03-stats1";'), 'development internal PWA marker must identify the stats hotfix');
assert(config.includes('installRak1603EarlyHomePaint'), 'early Home paint installer missing');
assert(config.includes('window.__rak1603EarlyHomePaintInstalled = true;'), 'early Home paint idempotency guard missing');
assert(config.includes('typeof window.updateDashboard === "function"'), 'early Home paint must wait for dashboard readiness');
assert(config.includes('window.rakUserProfileApplyToRuntime(profile);'), 'early Home paint must restore stored profile before rendering');
assert(config.includes('active.id === "home"'), 'early Home paint must never steal navigation away from another page');
assert(config.includes('window.__rak1603EarlyHomePaintDone = true;'), 'early Home paint completion marker missing');
assert(config.includes('kalirna-stats-override.js?v=20260913-1'), 'development config must load Kalirna stats filter');
assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co'), 'development must keep test Supabase');
assert(!config.includes('bkqamcbkiwumsvelahxr'), 'production Supabase must not enter development runtime');

assert(shiftReportMenu.includes("input.className = 'rakShiftInput rakShiftFree';"), 'MO free input must use existing shift-report free field class');
assert(shiftReportMenu.includes("input.placeholder = 'volné';"), 'MO free input placeholder missing');
assert(shiftReportMenu.includes('appMenuReadShiftReportMoFreeValues'), 'MO free values must restore from retained report draft');
assert(shiftReportMenu.includes("data-shift-add=\"mo\""), 'new MO index rows must receive a free input too');
assert(shiftReportMenu.includes("window.__rakShiftReportMoFreeMode = 'per-index-like-brusy';"), 'MO free diagnostic mode missing');
assert(
  shiftReport.includes("if(r.free)extras.push('z toho '+r.free+' volné')")
  || (shiftReport.includes('// RAK_SHIFT_TEXT_INDEX_TOTALS_17015')
    && shiftReport.includes("if (free) produced.push({index,text:fmt(free)+' '+index+' volné'})")
    && shiftReport.includes('if (qty+free) totals.set(index,(totals.get(index)||0)+qty+free);')),
  'shift report text must include free pieces for MO as well as grinders'
);

assert(hotfix.includes("const SHIFT_REPORT_EXTRA_MACHINES = ['TTKW01', 'TTKW02'];"), 'shift report extra TTKW machines missing');
assert(hotfix.includes("option.value === 'TPKW02'"), 'TTKW machines must be inserted after TPKW02');
assert(hotfix.includes("'Sám na 2 frézkách'"), 'personal MFK solo tile missing');
assert(hotfix.includes("'Ve 2 lidech na soustruzích'"), 'personal MSK pair tile missing');
assert(hotfix.includes('stats.mfkSoloCounts && stats.mfkSoloCounts[name]'), 'personal MFK tile must use existing verified yearly counter');
assert(hotfix.includes('stats.mskPairCounts && stats.mskPairCounts[name]'), 'personal MSK tile must use existing verified yearly counter');
assert(hotfix.includes("base: '1.6.03'"), 'requested extension baseline marker must stay 1.6.03');
assert(hotfix.includes('__rak1603RequestedExtensionsInstalled'), '1.6.03 requested extension guard missing');
assert(!hotfix.includes('__rak1604RequestedExtensionsInstalled'), '1.6.04 recovery extension must not remain');
assert(!hotfix.includes('__rak1606RegressionRecoveryInstalled'), 'broken 1.6.06 recovery layer must not return');
assert(!hotfix.includes('__rak1607'), 'broken 1.6.07 navigation layer must not return');

assert(kalirnaStats.includes("mod.type !== 'kalirnaOut'"), 'Kalirna stats filter must target kalirnaOut day mods');
assert(kalirnaStats.includes("return '';"), 'Kalirna stats filter must blank the original machine cell in the temporary stats view');
assert(kalirnaStats.includes('runtimeApp.rotation = view.rotation;'), 'Kalirna stats filter must run the original stats engine on the temporary filtered rotation');
assert(kalirnaStats.includes('runtimeApp.rotation = originalRotation;'), 'Kalirna stats filter must restore the real rotation after stats calculation');
assert(kalirnaStats.includes("window.__rakKalirnaStatsMode = 'kalirnaOut-excluded-from-machine-cells-before-stats';"), 'Kalirna stats mode diagnostic missing');
assert(kalirnaStats.includes('ve statistice mimo původní stroj'), 'old misleading Kalirna stats label must be replaced in the UI');

{
  const fixtureRotation = {
    months: {
      '09.2026': {
        dayMods: [
          { type: 'kalirnaOut', date: '13.9. N', person: 'Novotný', section: 'soft', cellIndex: 3 },
          { type: 'kalirnaOut', date: '13.9. N', person: 'Pech', section: 'soft', cellIndex: 2 }
        ],
        soft: {
          machines: ['MSKC01', 'MSKC03', 'MSKC04', 'MFKF06', 'MFKF10'],
          rows: [{ date: '13.9. N', cells: ['Blažek', 'Kříž', 'Pech', 'Novotný', 'Špadrna'] }]
        },
        hard: {
          machines: ['TNKS01'],
          rows: [{ date: '13.9. N', cells: ['Starý'] }]
        }
      }
    }
  };
  const before = JSON.stringify(fixtureRotation);
  const fakeDocument = {
    querySelectorAll: () => [],
    getElementById: () => null,
    addEventListener: () => {}
  };
  const context = {
    console,
    document: fakeDocument,
    setTimeout: () => 0,
    Date,
    Map,
    Set,
    Object,
    Array,
    String
  };
  context.window = context;
  context.app = { rotation: fixtureRotation };
  context.addEventListener = () => {};
  context.buildStatsForYear = function fakeOriginalStats() {
    const row = context.app.rotation.months['09.2026'].soft.rows[0];
    const cells = row.cells;
    const mfkPeople = new Set([cells[3], cells[4]].filter(Boolean));
    const mskPeople = new Set([cells[0], cells[1], cells[2]].filter(Boolean));
    return {
      cells: cells.slice(),
      mfkSoloCounts: mfkPeople.size === 1 ? { [Array.from(mfkPeople)[0]]: 1 } : {},
      mskPairCounts: mskPeople.size === 2
        ? Object.fromEntries(Array.from(mskPeople).map((name) => [name, 1]))
        : {}
    };
  };
  vm.createContext(context);
  vm.runInContext(kalirnaStats, context);

  const filteredStats = context.buildStatsForYear(2026);
  assert.deepEqual(Array.from(filteredStats.cells), ['Blažek', 'Kříž', '', '', 'Špadrna'], 'Kalirna people must disappear only from the temporary machine view');
  assert.equal(filteredStats.mfkSoloCounts['Špadrna'], 1, 'remaining mill worker must count as solo after colleague leaves for Kalirna');
  assert.equal(filteredStats.mskPairCounts['Blažek'], 1, 'first remaining lathe worker must count in the two-person pair');
  assert.equal(filteredStats.mskPairCounts['Kříž'], 1, 'second remaining lathe worker must count in the two-person pair');
  assert.equal(JSON.stringify(fixtureRotation), before, 'Kalirna stats filter must never mutate the real rotation');
  assert.equal(context.__rakKalirnaStatsFilterLast.removedCells, 2, 'fixture must filter exactly two original machine assignments');
}

assert(menuPages.includes('function buildAppMenuAboutHistoryHtml()'), 'concise About history builder missing');
assert(menuPages.includes("range: 'RaK 1.6'"), 'RaK 1.6 About section missing');
assert(menuPages.includes("range: 'RaK 1.5'"), 'RaK 1.5 About section missing');
assert(menuPages.includes("range: 'RaK 1.2'"), 'RaK 1.2 About section missing');
assert(menuPages.includes("range: 'RaK 1.1'"), 'RaK 1.1 About section missing');
assert(menuPages.includes("range: 'RaK 1.0 a začátky'"), 'RaK beginnings About section missing');
assert(menuPages.includes('celkem 24 citlivostí'), '1.6 About notes must mention the 24 Brusy sensitivities');
assert(menuPages.includes('aktualizace PWA jsou rychlejší a stabilnější'), '1.6 About notes must mention PWA/start improvements');
assert(menuPages.includes('Dashboard a mobilní/iPhone rozložení'), '1.6 About notes must mention mobile Dashboard cleanup');
assert(menuPages.includes('odstranily se Hry'), '1.6 About notes must mention Games removal');
assert(!menuPages.includes('<div class="appMenuText">Testovací build:'), 'About must not render the test-build label');
assert(!menuPages.includes('devBuildLine'), 'About must not render the test-build helper');
assert(!menuPages.includes('RaK (Rotace a Kalkulačky) je pracovní PWA'), 'About must not show the extra app-description paragraph');
assert(menuPages.includes('window.RAK_RELEASE_VERSION || versionText'), 'About must prefer public release version over legacy core display version');
assert(!menuPages.includes('buildAppHistoryHtml(versionText)'), 'About must not render the old long detailed history');
for (const oldRange of ['1.297–1.338', '1.290–1.296', '951–1000', '901–950', '450–499']) {
  assert(!menuPages.includes(oldRange), `old detailed About range returned: ${oldRange}`);
}

const aboutRangeCount = (menuPages.match(/range:\s*'RaK /g) || []).length;
assert.equal(aboutRangeCount, 5, `About history must stay concise at 5 groups; got ${aboutRangeCount}`);

assert(brus.includes("const INDEXES = ['AD', 'AE', 'AH'];"), 'Brusy AD/AE/AH sensitivity dimension missing');
assert(brus.includes('samples[row.machine][row.index][row.c][row.side].push(rate)'), 'Brusy calibration separation drifted');
assert(brus.includes('settings.activeModels[safeMachine][safeIndex][safeSpindle][safeSide]'), '24-way Brusy active sensitivity model drifted');
assert(brus.includes('<small>24 kombinací</small>'), 'Brusy admin 24-combination summary drifted');

assert(viewport.includes('height:100dvh !important;') && viewport.includes('overflow-y:auto !important;'), 'mobile Home scroll owner must stay unchanged');
assert(viewport.includes('grid-template-rows:repeat(4, auto) !important;'), 'Dashboard four-row mobile guard must stay unchanged');
assert(polish.includes('@media (min-width:380px) and (max-width:440px) and (min-height:830px) and (max-height:940px)'), 'iPhone Dashboard stack owner missing');

for (const accidental of ['__never_use__', '__noop__', '__noop2__']) {
  assert(!fs.existsSync(accidental), `temporary preparation file leaked into RaK 1.6: ${accidental}`);
}

assert(String(pkg.scripts.check || '').includes('tools/v160-smoke.mjs'), 'v1.6 smoke must run in npm check');
assert(!String(pkg.scripts.check || '').includes('tools/v1599-smoke.mjs'), 'old v1.5.99 smoke must not remain in active check chain');

console.log('[v1.6-smoke] OK 1.6.03 stable baseline + Kalirna machine exclusion/pair-solo recalculation + early Home local/profile paint + MO free pieces + requested person stats + TTKW shift-report machines + visible 1.6.03 update label + mobile/Brusy invariants preserved');