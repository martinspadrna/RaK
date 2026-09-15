// RaK 1.6 – Home boot: jeden běžný render + jeden chytrý recovery watchdog.

function rakHomeBootIsAllowed() {
  const activePage = document.querySelector('.page.active')?.id || '';
  return !(
    (typeof app !== 'undefined' && app.homeBootSuppressed && activePage !== 'home')
    || window.__rotaceManualNavLocked
    || (window.__rotaceHomeBootLocked && activePage !== 'home')
    || (window.__rotaceUserNavigated && activePage !== 'home')
  );
}

function rakBumpHomeOptimizationCounter(key, amount = 1) {
  try {
    if (typeof bumpDataOptimizationCounter === 'function') {
      bumpDataOptimizationCounter(key, amount);
      return;
    }
    const stats = window.__rakDataOptimizationStats;
    if (stats && key) stats[key] = Number(stats[key] || 0) + amount;
  } catch (err) {}
}

function rakMarkHomeOptimizationRefresh(reason) {
  try {
    if (typeof markDataOptimizationHomeRefresh === 'function') {
      markDataOptimizationHomeRefresh(reason);
      return;
    }
    const stats = window.__rakDataOptimizationStats;
    if (!stats) return;
    stats.homeRefreshLastReason = String(reason || 'refresh');
    stats.homeRefreshLastAt = Date.now();
  } catch (err) {}
}

function installRakOptimizedHomeRefreshScheduler() {
  if (window.__rakOptimizedHomeRefreshSchedulerInstalled) return;
  window.__rakOptimizedHomeRefreshSchedulerInstalled = true;

  let framePending = false;
  let latestReason = 'home-refresh';

  const optimizedScheduleHomeRefresh = function scheduleHomeRefreshOptimized(reason = 'home-refresh') {
    latestReason = String(reason || 'home-refresh');
    rakBumpHomeOptimizationCounter('homeRefreshSchedules');

    if (framePending) {
      rakBumpHomeOptimizationCounter('homeRefreshCoalescedSchedules');
      rakMarkHomeOptimizationRefresh('coalesced-' + latestReason);
      return false;
    }

    framePending = true;
    const run = () => {
      framePending = false;
      const runReason = latestReason;
      if (typeof isAnyModalOpen === 'function' && isAnyModalOpen()) {
        rakBumpHomeOptimizationCounter('homeRefreshModalSkips');
        return false;
      }
      rakBumpHomeOptimizationCounter('homeRefreshRuns');
      rakMarkHomeOptimizationRefresh(runReason + ':single-render');
      try {
        if (typeof refreshHomeScreen === 'function') return refreshHomeScreen();
        if (typeof updateDashboard === 'function') updateDashboard();
        if (typeof updateFoodTile === 'function') updateFoodTile();
        if (typeof updateEportalTile === 'function') updateEportalTile();
      } catch (err) {
        console.warn('Home refresh failed', err);
      }
      return true;
    };

    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    else setTimeout(run, 0);
    return true;
  };

  // app-navigation.js má z historických důvodů vícestupňový scheduler. Od RaK 1.6
  // ho po načtení Home boot modulu nahrazujeme jedním coalescovaným renderem.
  window.scheduleHomeRefresh = optimizedScheduleHomeRefresh;
  window.__rakOptimizedScheduleHomeRefresh = optimizedScheduleHomeRefresh;
}

let rakHomeBootRecoveryTimer = null;

function runRakHomeBootRecovery(reason = 'watchdog') {
  if (!rakHomeBootIsAllowed()) return false;
  const activePage = document.querySelector('.page.active')?.id || '';
  if (activePage !== 'home') return false;

  // Recovery smí přestavět Home pouze tehdy, když umíme pozitivně potvrdit,
  // že základní Dashboard opravdu zůstal nevykreslený.
  const needsRecovery = typeof homeLooksUnpainted === 'function' && homeLooksUnpainted() === true;
  if (!needsRecovery) {
    rakBumpHomeOptimizationCounter('homeBootRecoverySkips');
    return false;
  }

  rakBumpHomeOptimizationCounter('homeBootRecoveryRuns');
  rakMarkHomeOptimizationRefresh('home-boot-recovery:' + String(reason || 'watchdog'));
  try {
    if (typeof forceHomeRefresh === 'function') forceHomeRefresh();
    else if (typeof refreshHomeScreen === 'function') refreshHomeScreen();
    else {
      if (typeof updateDashboard === 'function') updateDashboard();
      if (typeof updateFoodTile === 'function') updateFoodTile();
      if (typeof updateEportalTile === 'function') updateEportalTile();
    }
    return true;
  } catch (err) {
    console.warn('Home recovery failed', err);
    return false;
  }
}

function scheduleRakHomeBootRecoveryWatchdog(reason = 'boot') {
  if (rakHomeBootRecoveryTimer) clearTimeout(rakHomeBootRecoveryTimer);
  rakHomeBootRecoveryTimer = setTimeout(() => {
    rakHomeBootRecoveryTimer = null;
    runRakHomeBootRecovery(reason);
  }, 900);
}

function runRakHomeBootRefresh(reason = 'boot') {
  if (!rakHomeBootIsAllowed()) return false;
  installRakOptimizedHomeRefreshScheduler();

  try {
    const activePage = document.querySelector('.page.active')?.id || '';
    if (activePage !== 'home' && typeof showPage === 'function') {
      // showPage('home') samo zavolá optimalizovaný scheduleHomeRefresh.
      showPage('home');
    } else if (typeof scheduleHomeRefresh === 'function') {
      scheduleHomeRefresh('home-boot:' + String(reason || 'boot'));
    } else if (typeof refreshHomeScreen === 'function') {
      refreshHomeScreen();
    } else {
      if (typeof updateDashboard === 'function') updateDashboard();
      if (typeof updateFoodTile === 'function') updateFoodTile();
      if (typeof updateEportalTile === 'function') updateEportalTile();
    }
  } catch (err) {
    console.warn('Initial home boot failed', err);
  }

  scheduleRakHomeBootRecoveryWatchdog(reason);
  return true;
}

function runRakLateHomeBootRefresh() {
  // Zachováváme veřejný název kvůli starším vazbám, ale už nejde o další
  // povinný render. Je to jen stejný podmíněný watchdog recovery krok.
  return runRakHomeBootRecovery('late-compat');
}

function installRakHomeBootSequence() {
  installRakOptimizedHomeRefreshScheduler();

  if (window.__rakHomeBootSequenceInstalled) {
    scheduleRakHomeBootRecoveryWatchdog('reinstall');
    return;
  }
  window.__rakHomeBootSequenceInstalled = true;

  // Jeden běžný startovací render. Žádné dvojité RAF ani pevné 60/80/220/240/
  // 520/980/1100 ms přestavování Dashboardu.
  runRakHomeBootRefresh('initial');

  // load/pageshow pouze znovu naplánují jednu kontrolu prázdné Home; samy
  // Dashboard nepřestavují. Timer se vždy coalescuje na jediný watchdog.
  window.addEventListener('load', () => scheduleRakHomeBootRecoveryWatchdog('load'), { once: true });
  window.addEventListener('pageshow', () => scheduleRakHomeBootRecoveryWatchdog('pageshow'));
}

window.installRakOptimizedHomeRefreshScheduler = installRakOptimizedHomeRefreshScheduler;
window.runRakHomeBootRefresh = runRakHomeBootRefresh;
window.runRakHomeBootRecovery = runRakHomeBootRecovery;
window.runRakLateHomeBootRefresh = runRakLateHomeBootRefresh;
window.scheduleRakHomeBootRecoveryWatchdog = scheduleRakHomeBootRecoveryWatchdog;
window.installRakHomeBootSequence = installRakHomeBootSequence;

try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('app-home-boot.js', 'loaded', { source: 'dynamic-loader' }); } catch (err) {}
