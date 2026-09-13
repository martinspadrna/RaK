import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const app = read('app.js');
const pkg = JSON.parse(read('package.json'));
const sw = read('sw.js');
const config = read('supabase-config.js');
const routing = read('rak-feature-routing.js');
const menuPages = read('app-menu-pages.js');
const brus = read('brusy-fhb-v158.js');
const hotfix = read('kalirna-daymod-override.js');
const viewport = read('styles-viewport-polish.css').replace(/\/\*[\s\S]*?\*\//g, '');
const polish = read('styles-dashboard-polish.css');

assert.equal(pkg.version, '1.6.0', 'package version must stay 1.6.0');
assert.match(app, /RAK_MODULE_CACHE_VERSION\s*=\s*["']1\.6\.0["']/, 'app cache version must stay 1.6.0');
assert.match(app, /RAK_DEV_UPDATE_BUILD\s*=\s*["']v1\.6\.0["']/, 'app update build must stay v1.6.0');
assert(app.includes('window.RAK_RELEASE_VERSION = "1.6";'), 'public RaK 1.6 release version marker missing');
assert.match(sw, /CACHE_VERSION\s*=\s*["']v1\.6\.(?:0|\d{2,})["']/, 'service worker cache must stay in the RaK 1.6 production/test line');
assert.match(sw, /SW_APP_VERSION\s*=\s*["']1\.6\.(?:0|\d{2,})["']/, 'service worker technical version must stay in the RaK 1.6 production/test line');
assert(sw.includes("'./core.js?v=1.6.0'"), 'warm-start core must use current 1.6.0 build');
assert(sw.includes("'./rak-feature-routing.js?v=1.6.0'"), 'lazy routing must be prewarmed for activation without bypassing update confirmation');
assert(sw.includes("nextUrl.searchParams.set('_rak_update', CACHE_VERSION + '-' + Date.now().toString(36))"), 'confirmed update cache-busting navigation missing');
assert(sw.includes("const SAME_VERSION_HOTFIX_ASSETS = ['./app-menu-pages.js?v=1.6.0'];"), 'same-version About cache invalidation missing');
assert(sw.includes('await clearSameVersionHotfixAssets();'), 'same-version About cache invalidation must run during SW install');
assert(!sw.includes('await self.skipWaiting();'), 'service worker install must wait for explicit user confirmation');
assert(sw.includes("if (data.type === 'SKIP_WAITING')"), 'confirmed update message handler missing');
assert(sw.includes('self.skipWaiting();'), 'confirmed update activation missing');
assert(config.includes('window.RAK_RELEASE_VERSION = "1.6.04";'), 'recovery must use the last functional 1.6.04 display version');
assert(config.includes('window.RAK_PWA_BUILD = "v1.6.04";'), 'recovery must use the last functional 1.6.04 PWA marker');
assert(sw.includes("const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.6.04';"), 'recovery service worker must report 1.6.04');
assert(sw.includes("'./kalirna-daymod-override.js?v=20260912-1'"), 'recovery service worker must invalidate the extension asset');

assert(routing.includes("version: '1.6.04'"), 'true lazy loading policy version missing');
assert(routing.includes("mode: 'intent-only-features'"), 'true lazy loading mode missing');
assert(routing.includes("automatic: Object.freeze(['sync'])"), 'only sync may preload automatically after Home boot');
assert(routing.includes("intentOnly: Object.freeze(['rotation', 'calculators', 'menu', 'admin'])"), 'feature intent-only policy drifted');
assert(routing.includes('adminAutoPreload: false'), 'admin must never auto-preload for ordinary users');
assert(routing.includes("document.addEventListener('pointerdown'"), 'pointerdown intent prefetch must stay enabled');
assert(routing.includes('el.click();'), 'click replay after lazy feature load must stay enabled');
assert(!routing.includes('startBackgroundWarmup'), 'legacy background feature warmup must stay removed');
assert(!routing.includes('queueBackgroundWarmup'), 'legacy queued feature warmup must stay removed');
assert(!routing.includes("Promise.allSettled(['rotation', 'calculators']"), 'Rotace/Kalkulačky must not preload automatically');
assert(!routing.includes("Boot v2 admin warmup failed"), 'Admin background warmup must not return');
assert(app.includes("requestIdleCallback(startSync, { timeout: 1200 })"), 'Home must keep lightweight sync idle preload');

assert(hotfix.includes("const SHIFT_REPORT_EXTRA_MACHINES = ['TTKW01', 'TTKW02'];"), 'shift report extra TTKW machines missing');
assert(hotfix.includes("option.value === 'TPKW02'"), 'TTKW machines must be inserted after TPKW02');
assert(hotfix.includes("'Sám na 2 frézkách'"), 'personal MFK solo tile missing');
assert(hotfix.includes("'Ve 2 lidech na soustruzích'"), 'personal MSK pair tile missing');
assert(hotfix.includes('stats.mfkSoloCounts && stats.mfkSoloCounts[name]'), 'personal MFK tile must use existing verified yearly counter');
assert(hotfix.includes('stats.mskPairCounts && stats.mskPairCounts[name]'), 'personal MSK tile must use existing verified yearly counter');
assert(hotfix.includes("base: '1.6.04'"), 'recovery extension baseline marker missing');
assert(!hotfix.includes('__rak1606RegressionRecoveryInstalled'), 'broken 1.6.06 recovery layer must not return');
assert(!hotfix.includes('__rak1607'), 'broken 1.6.07 navigation layer must not return');

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

console.log('[v1.6-smoke] OK 1.6.04 recovery baseline + requested person stats + TTKW shift-report machines + original lazy/PWA/mobile/Brusy invariants preserved');
