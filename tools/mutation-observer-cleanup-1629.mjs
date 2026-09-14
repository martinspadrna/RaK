#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DISPLAY_VERSION = '1.6.29';
const BUILD_ID = '1.6.29-observer1';
const POLICY_MARKER = "const DEVELOPMENT_MUTATION_OBSERVER_POLICY = 'scoped-8;raf-coalesced-7;runtime-stability-targeted';";
const PREV_STARTUP_MARKER = "const DEVELOPMENT_STARTUP_EXECUTION_POLICY = 'mobile-layout-guard-idle;warm-cache-preserved;startup-files-15';";
const PREV_PERF_MARKER = "const DEVELOPMENT_PERFORMANCE_GUARD_POLICY = 'core8;warm58;startup-js-1536k;startup-file-300k;login-each-1000k;login-total-2900k;eager-diagnostics-0;qr-full';";

const files = {
  runtimeGuards: 'app-runtime-guards.js',
  loginLife: 'rak-login-life.js',
  userProfile: 'rak-user-profile.js',
  accountAccess: 'rak-account-access.js',
  shiftShare: 'rak-shift-report-share.js',
  vacation: 'rak-vacation-report.js',
  brus157: 'brusy-fhb-v157.js',
  brus158: 'brusy-fhb-v158.js',
  runtimeStability: 'rak-runtime-stability.js',
  sw: 'sw.js',
  config: 'supabase-config.js'
};

function assert(condition, message) {
  if (!condition) throw new Error('[mutation-observer-cleanup-1629] ' + message);
}

function read(name) {
  return fs.readFileSync(path.join(root, name), 'utf8');
}

function write(name, source) {
  fs.writeFileSync(path.join(root, name), source, 'utf8');
}

function replaceExact(source, before, after, label) {
  if (source.includes(after)) return source;
  assert(source.includes(before), `Missing expected observer block: ${label}.`);
  const next = source.replace(before, after);
  assert(next !== source, `Observer block did not change: ${label}.`);
  return next;
}

let runtimeGuards = read(files.runtimeGuards);
let loginLife = read(files.loginLife);
let userProfile = read(files.userProfile);
let accountAccess = read(files.accountAccess);
let shiftShare = read(files.shiftShare);
let vacation = read(files.vacation);
let brus157 = read(files.brus157);
let brus158 = read(files.brus158);
const runtimeStability = read(files.runtimeStability);
let sw = read(files.sw);
let config = read(files.config);

assert(sw.includes(PREV_STARTUP_MARKER), 'RaK 1.6.28 startup execution policy missing.');
assert(sw.includes(PREV_PERF_MARKER), 'RaK 1.6.27 performance guard policy missing.');
assert(runtimeStability.includes('const observer = new MutationObserver((records) => {'), 'Targeted runtime stability observer changed unexpectedly.');
assert(runtimeStability.includes('record.addedNodes.forEach(scanNode);'), 'Runtime stability observer no longer processes addedNodes directly.');

runtimeGuards = replaceExact(runtimeGuards,
`  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(() => apply());
    observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
  }`,
`  if (typeof MutationObserver !== 'undefined') {
    const calcRootSelector = '#soustruhy, #frezky, #brusy, .calcPage';
    let applyScheduled = false;
    const scheduleApply = () => {
      if (applyScheduled) return;
      applyScheduled = true;
      const run = () => { applyScheduled = false; apply(); };
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
      else setTimeout(run, 0);
    };
    const observer = new MutationObserver((records) => {
      const relevant = Array.from(records || []).some((record) => {
        const target = record && record.target;
        try {
          if (target && target.nodeType === 1 && target.closest && target.closest(calcRootSelector)) return true;
          return Array.from(record && record.addedNodes || []).some((node) => node && node.nodeType === 1 && (
            (node.matches && node.matches(calcRootSelector))
            || (node.querySelector && node.querySelector(selector))
          ));
        } catch (err) { return false; }
      });
      if (relevant) scheduleApply();
    });
    observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
  }`,
'app-runtime-guards numeric keyboard');

loginLife = replaceExact(loginLife,
`  const start=()=>{if(document.body)new MutationObserver(()=>mount()).observe(document.body,{childList:true,subtree:true})};`,
`  const start=()=>{
    if(!document.body)return;
    let scheduled=false;
    const relevant=(node)=>{
      if(!node||node.nodeType!==1)return false;
      try{return !!((node.matches&&node.matches('#rakUserLoginOverlay,#rakSplashBrand'))||(node.querySelector&&node.querySelector('#rakUserLoginOverlay,#rakSplashBrand')))}catch(err){return false}
    };
    const observer=new MutationObserver((records)=>{
      const needed=Array.from(records||[]).some((record)=>{
        const target=record&&record.target;
        try{
          if(target&&target.nodeType===1&&target.closest&&target.closest('#rakUserLoginOverlay,#rakSplashBrand'))return true;
          return Array.from(record&&record.addedNodes||[]).some(relevant);
        }catch(err){return false}
      });
      if(!needed||scheduled)return;
      scheduled=true;
      const run=()=>{scheduled=false;mount()};
      if(typeof requestAnimationFrame==='function')requestAnimationFrame(run);else setTimeout(run,0);
    });
    observer.observe(document.body,{childList:true,subtree:true});
  };`,
'rak-login-life mascot mount');

userProfile = replaceExact(userProfile,
`        const observer = new MutationObserver(() => syncSettingsProfileCard(get()));
        observer.observe(document.body, { childList: true, subtree: true });
        window.__rakUserProfileSettingsObserver = observer;`,
`        const observer = new MutationObserver((records) => {
          const cardAdded = Array.from(records || []).some((record) => Array.from(record && record.addedNodes || []).some((node) => {
            if (!node || node.nodeType !== 1) return false;
            try { return node.id === 'gamesAccountCard' || !!(node.querySelector && node.querySelector('#gamesAccountCard')); }
            catch (err) { return false; }
          }));
          if (cardAdded) syncSettingsProfileCard(get());
        });
        observer.observe(document.body, { childList: true, subtree: true });
        window.__rakUserProfileSettingsObserver = observer;`,
'rak-user-profile settings card');

accountAccess = replaceExact(accountAccess,
`      const observer = new MutationObserver(() => refreshEnhancements());
      observer.observe(document.body, { childList: true, subtree: true });
      window.__rakAccountAccessObserver = observer;`,
`      let refreshScheduled = false;
      const scheduleRefresh = () => {
        if (refreshScheduled) return;
        refreshScheduled = true;
        const run = () => { refreshScheduled = false; refreshEnhancements(); };
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
        else setTimeout(run, 0);
      };
      const observer = new MutationObserver((records) => {
        const relevant = Array.from(records || []).some((record) => {
          const target = record && record.target;
          try {
            if (target && target.nodeType === 1 && target.closest && target.closest('#appMenuBody')) return true;
            return Array.from(record && record.addedNodes || []).some((node) => node && node.nodeType === 1 && (
              node.id === 'appMenuBody' || !!(node.querySelector && node.querySelector('#appMenuBody'))
            ));
          } catch (err) { return false; }
        });
        if (relevant) scheduleRefresh();
      });
      observer.observe(document.body, { childList: true, subtree: true });
      window.__rakAccountAccessObserver = observer;`,
'rak-account-access menu enhancements');

shiftShare = replaceExact(shiftShare,
`  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan, { once: true });
  else scan();
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });`,
`  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan, { once: true });
  else scan();
  let scanScheduled = false;
  const scheduleScan = () => {
    if (scanScheduled) return;
    scanScheduled = true;
    const run = () => { scanScheduled = false; scan(); };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    else setTimeout(run, 0);
  };
  new MutationObserver((records) => {
    const relevant = Array.from(records || []).some((record) => {
      const target = record && record.target;
      try {
        if (target && target.nodeType === 1 && target.closest && target.closest('#appMenuBody')) return true;
        return Array.from(record && record.addedNodes || []).some((node) => node && node.nodeType === 1 && (
          node.id === 'appMenuBody' || !!(node.querySelector && node.querySelector('#appMenuBody'))
        ));
      } catch (err) { return false; }
    });
    if (relevant) scheduleScan();
  }).observe(document.body, { childList: true, subtree: true });`,
'rak-shift-report-share menu observer');

vacation = replaceExact(vacation,
`  function observe() {
    bindBody(); injectAdminEntry();
    new MutationObserver(() => { bindBody(); if (document.getElementById('appMenuBody')?.dataset.rakVacationReportOpen !== '1') injectAdminEntry(); }).observe(document.body, { childList: true, subtree: true });
  }`,
`  function observe() {
    bindBody(); injectAdminEntry();
    let refreshScheduled = false;
    const scheduleRefresh = () => {
      if (refreshScheduled) return;
      refreshScheduled = true;
      const run = () => {
        refreshScheduled = false;
        bindBody();
        if (document.getElementById('appMenuBody')?.dataset.rakVacationReportOpen !== '1') injectAdminEntry();
      };
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
      else setTimeout(run, 0);
    };
    new MutationObserver((records) => {
      const relevant = Array.from(records || []).some((record) => {
        const target = record && record.target;
        try {
          if (target && target.nodeType === 1 && target.closest && target.closest('#appMenuBody')) return true;
          return Array.from(record && record.addedNodes || []).some((node) => node && node.nodeType === 1 && (
            node.id === 'appMenuBody' || !!(node.querySelector && node.querySelector('#appMenuBody'))
          ));
        } catch (err) { return false; }
      });
      if (relevant) scheduleRefresh();
    }).observe(document.body, { childList: true, subtree: true });
  }`,
'rak-vacation-report menu observer');

brus157 = replaceExact(brus157,
`  const observer = new MutationObserver(() => {
    renderCalculatorUi();
    decorateAdmin();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });`,
`  let observerScheduled = false;
  const observer = new MutationObserver((records) => {
    const relevant = Array.from(records || []).some((record) => {
      const target = record && record.target;
      try {
        if (target && target.nodeType === 1 && target.closest && target.closest('#korekce-brusy, #appMenuBody, .adminBrusFhbCalibration')) return true;
        return Array.from(record && record.addedNodes || []).some((node) => node && node.nodeType === 1 && (
          (node.matches && node.matches('#korekce-brusy, #appMenuBody, .adminBrusFhbCalibration, .brusFhbCalcRoot'))
          || !!(node.querySelector && node.querySelector('#korekce-brusy, #appMenuBody, .adminBrusFhbCalibration, .brusFhbCalcRoot'))
        ));
      } catch (err) { return false; }
    });
    if (!relevant || observerScheduled) return;
    observerScheduled = true;
    const run = () => {
      observerScheduled = false;
      renderCalculatorUi();
      decorateAdmin();
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    else setTimeout(run, 0);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });`,
'brusy-fhb-v157 feature observer');

brus158 = replaceExact(brus158,
`  const observer = new MutationObserver(() => {
    removeDevelopmentBadge();
    removeAdminSideWarning();
    upgradeAdminRoot();
    cleanResultText();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });`,
`  let observerScheduled = false;
  const observer = new MutationObserver((records) => {
    const relevant = Array.from(records || []).some((record) => {
      const target = record && record.target;
      try {
        if (target && target.nodeType === 1 && target.closest && target.closest('#kalkulacky, #korekce-brusy, #appMenuBody, .adminBrusFhbCalibration')) return true;
        return Array.from(record && record.addedNodes || []).some((node) => node && node.nodeType === 1 && (
          (node.matches && node.matches('#kalkulacky, #korekce-brusy, #appMenuBody, .adminBrusFhbCalibration, .calcTileText'))
          || !!(node.querySelector && node.querySelector('#kalkulacky, #korekce-brusy, #appMenuBody, .adminBrusFhbCalibration, .calcTileText'))
        ));
      } catch (err) { return false; }
    });
    if (!relevant || observerScheduled) return;
    observerScheduled = true;
    const run = () => {
      observerScheduled = false;
      removeDevelopmentBadge();
      removeAdminSideWarning();
      upgradeAdminRoot();
      cleanResultText();
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    else setTimeout(run, 0);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });`,
'brusy-fhb-v158 feature observer');

const transformed = [runtimeGuards, loginLife, userProfile, accountAccess, shiftShare, vacation, brus157, brus158];
assert(transformed.every((source) => source.includes('new MutationObserver')), 'An expected observer disappeared entirely.');
assert(!runtimeGuards.includes('new MutationObserver(() => apply())'), 'Unfiltered numeric-keyboard observer returned.');
assert(!loginLife.includes('new MutationObserver(()=>mount())'), 'Unfiltered login-life observer returned.');
assert(!userProfile.includes('new MutationObserver(() => syncSettingsProfileCard(get()))'), 'Unfiltered profile-card observer returned.');
assert(!accountAccess.includes('new MutationObserver(() => refreshEnhancements())'), 'Unfiltered account observer returned.');
assert(!shiftShare.includes('new MutationObserver(scan)'), 'Unfiltered shift-report observer returned.');
assert(!vacation.includes("new MutationObserver(() => { bindBody();"), 'Unfiltered vacation observer returned.');
assert(runtimeGuards.includes('const calcRootSelector ='), 'Numeric keyboard observer scope marker missing.');
assert(loginLife.includes("target.closest('#rakUserLoginOverlay,#rakSplashBrand')"), 'Login observer scope marker missing.');
assert(userProfile.includes("node.id === 'gamesAccountCard'"), 'Profile observer scope marker missing.');
assert(accountAccess.includes("target.closest('#appMenuBody')"), 'Account observer scope marker missing.');
assert(brus157.includes("target.closest('#korekce-brusy, #appMenuBody, .adminBrusFhbCalibration')"), 'Brusy 1.5.7 observer scope missing.');
assert(brus158.includes("target.closest('#kalkulacky, #korekce-brusy, #appMenuBody, .adminBrusFhbCalibration')"), 'Brusy 1.5.8 observer scope missing.');

if (!sw.includes(POLICY_MARKER)) sw = sw.replace(PREV_STARTUP_MARKER, PREV_STARTUP_MARKER + '\n' + POLICY_MARKER);
assert(sw.includes(POLICY_MARKER), 'Mutation observer policy marker missing.');
assert(sw.includes("strategy: 'navigation-network-first;build-static-cache-first;isolated-prewarm'"), 'Stable PWA strategy changed.');
assert(sw.includes("const CACHE_VERSION = 'v1.6.0';"), 'Stable cache version changed.');
assert(sw.includes("'./qr.js?v=1.6.0'"), 'Full QR runtime left WARM_START.');
assert(!sw.includes('qr-data.generated.js'), 'Failed split QR asset returned.');

config = config.replace(/^window\.RAK_RELEASE_VERSION = "1\.6\.\d+";$/m, `window.RAK_RELEASE_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_TEST_DISPLAY_VERSION = "1\.6\.\d+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_PWA_BUILD = "v1\.6\.[^"]+";$/m, `window.RAK_PWA_BUILD = "v${BUILD_ID}";`);
sw = sw.replace(/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '1\.6\.\d+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY_VERSION}';`);
sw = sw.replace(/^const DEVELOPMENT_BUILD_ID = '1\.6\.[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD_ID}';`);

assert(config.includes(`window.RAK_RELEASE_VERSION = "${DISPLAY_VERSION}";`), 'Release version marker missing.');
assert(config.includes(`window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY_VERSION}";`), 'Display version marker missing.');
assert(config.includes(`window.RAK_PWA_BUILD = "v${BUILD_ID}";`), 'PWA build marker missing.');
assert(sw.includes(`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY_VERSION}';`), 'SW display version marker missing.');
assert(sw.includes(`const DEVELOPMENT_BUILD_ID = '${BUILD_ID}';`), 'SW build marker missing.');

write(files.runtimeGuards, runtimeGuards);
write(files.loginLife, loginLife);
write(files.userProfile, userProfile);
write(files.accountAccess, accountAccess);
write(files.shiftShare, shiftShare);
write(files.vacation, vacation);
write(files.brus157, brus157);
write(files.brus158, brus158);
write(files.sw, sw);
write(files.config, config);

console.log('[mutation-observer-cleanup-1629] Scoped 8 broad observers; 7 callbacks coalesced to one animation frame; targeted runtime-stability observer preserved.');
console.log('[mutation-observer-cleanup-1629] OK RaK 1.6.29: observer work limited to calculator/login/profile/menu/Brusy DOM zones; Home/Rotace/QR/PWA/security contracts preserved.');
