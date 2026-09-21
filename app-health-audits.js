// RAK_NO_GAME_AUDIT_REQUIREMENTS_17021
// RaK 1.2 (1.155) – health/audit helpery oddělené z app.js.
try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('app-health-audits.js', 'loaded', { source: 'dynamic-loader' }); } catch (err) {}

function runPhaseOneFinalAudit() {
  if (document.readyState === 'loading') {
    const rerun = () => runPhaseOneFinalAudit();
    if (typeof registerListener === 'function') {
      registerListener(document, 'DOMContentLoaded', rerun, { once: true });
    } else {
      document.addEventListener('DOMContentLoaded', rerun, { once: true });
    }
    return {
      version: window.APP_VERSION || 'unknown',
      phase: 'phase-1-final',
      checkedAt: new Date().toISOString(),
      ok: true,
      deferred: true
    };
  }

  const report = {
    version: window.APP_VERSION || 'unknown',
    phase: 'phase-1-final',
    checkedAt: new Date().toISOString(),
    ok: true,
    missingDom: [],
    missingStyles: [],
    duplicateIds: []
  };

  const requiredDom = [
    '#home',
    '#rotace',
    '#rotaceStatsPanel',
    '.bottomNav',
    '#dashKantyna',
    '#dashJidelna'
  ];

  requiredDom.forEach((selector) => {
    if (!document.querySelector(selector)) report.missingDom.push(selector);
  });

  const loadedStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map((link) => String(link.getAttribute('href') || '').split('?')[0].trim())
    .filter(Boolean);
  [
    'styles.css',
    'styles-inline-legacy.css',
    'styles-calc-panels.css',
    'styles-overrides-legacy-early.css',
    'styles-overrides-legacy-mid.css',
    'styles-overrides-legacy-late.css',
    'styles-dashboard-fit.css',
    'styles-admin-polish.css',
    'styles-menu-polish.css',
    'styles-stats-polish.css',
    'styles-viewport-polish.css',
    'styles-theme-polish.css',
    'styles-release-polish.css',
    'styles-dashboard-polish.css'
  ].forEach((href) => {
    if (!loadedStyles.some((item) => item.endsWith(href))) report.missingStyles.push(href);
  });

  const ids = new Map();
  document.querySelectorAll('[id]').forEach((el) => {
    const id = el.id;
    if (!ids.has(id)) ids.set(id, 0);
    ids.set(id, ids.get(id) + 1);
  });
  report.duplicateIds = Array.from(ids.entries())
    .filter(([, count]) => count > 1)
    .map(([id, count]) => ({ id, count }));

  report.ok = !report.missingDom.length && !report.missingStyles.length && !report.duplicateIds.length;
  try {
    document.documentElement.dataset.rakPhase1 = report.ok ? 'complete' : 'check';
    window.__rakPhase1Audit = report;
  } catch (err) {}

  if (!report.ok) {
    console.warn('[RaK] Phase 1 final audit', report);
    try {
      const log = JSON.parse(localStorage.getItem('rotace_err_log_v1') || '[]');
      log.push({
        ts: report.checkedAt,
        ver: report.version,
        type: 'phase1-audit',
        missingDom: report.missingDom,
        missingStyles: report.missingStyles,
        duplicateIds: report.duplicateIds
      });
      localStorage.setItem('rotace_err_log_v1', JSON.stringify(log.slice(-50)));
    } catch (err) {}
  }
  return report;
}

function runPhaseTwoCalcScopeAudit() {
  const calcPageIds = ['soustruhy', 'frezky', 'brusy', 'pracka'];
  const requiredResults = ['soustruhyLisResult', 'soustruhy126Result', 'soustruhy106Result', 'outF', 'outFTime', 'outB', 'outBTime', 'outP'];

  const run = () => {
    const report = {
      version: window.APP_VERSION || 'unknown',
      phase: 'phase-2-calc-system',
      checkedAt: new Date().toISOString(),
      ok: true,
      visibleInactive: [],
      missingResultCards: [],
      unscopedCalcButtons: [],
      overflowingPages: []
    };

    calcPageIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const style = window.getComputedStyle ? window.getComputedStyle(el) : null;

      if (!el.classList.contains('active')) {
        const isVisible = style && style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
        if (isVisible) report.visibleInactive.push(id);
      }

      if (el.classList.contains('active')) {
        const viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        if (viewportWidth && el.scrollWidth > viewportWidth + 2) {
          report.overflowingPages.push({ id, scrollWidth: el.scrollWidth, viewportWidth });
        }
      }

      el.querySelectorAll('button[data-action^="calc-"]').forEach((button) => {
        if (!button.classList.contains('calcPrimaryBtn')) {
          report.unscopedCalcButtons.push(button.getAttribute('data-action') || button.id || 'unknown');
        }
      });
    });

    requiredResults.forEach((id) => {
      const el = document.getElementById(id);
      if (!el || !el.classList.contains('calcResultCard')) report.missingResultCards.push(id);
    });

    report.ok = !report.visibleInactive.length && !report.missingResultCards.length && !report.unscopedCalcButtons.length && !report.overflowingPages.length;
    try {
      document.documentElement.dataset.rakCalcScope = report.ok ? 'ok' : 'check';
      document.documentElement.dataset.rakPhase2 = report.ok ? 'complete' : 'check';
      window.__rakPhase2CalcScopeAudit = report;
    } catch (err) {}

    if (!report.ok) {
      console.warn('[RaK] Phase 2 calc final audit', report);
      try {
        const log = JSON.parse(localStorage.getItem('rotace_err_log_v1') || '[]');
        log.push({
          ts: report.checkedAt,
          ver: report.version,
          type: 'phase2-calc-final-audit',
          visibleInactive: report.visibleInactive,
          missingResultCards: report.missingResultCards,
          unscopedCalcButtons: report.unscopedCalcButtons,
          overflowingPages: report.overflowingPages
        });
        localStorage.setItem('rotace_err_log_v1', JSON.stringify(log.slice(-50)));
      } catch (err) {}
    }
    return report;
  };

  if (document.readyState === 'loading') {
    const rerun = () => setTimeout(run, 0);
    if (typeof registerListener === 'function') registerListener(document, 'DOMContentLoaded', rerun, { once: true });
    else document.addEventListener('DOMContentLoaded', rerun, { once: true });
    return { version: window.APP_VERSION || 'unknown', phase: 'phase-2-calc-system', ok: true, deferred: true };
  }

  requestAnimationFrame(() => setTimeout(run, 0));
  return { version: window.APP_VERSION || 'unknown', phase: 'phase-2-calc-system', ok: true, deferred: true };
}


function runPhaseThreeLightweightAudit() {
  const run = () => {
    const prefs = (typeof loadUiPrefs === 'function') ? loadUiPrefs() : null;
    const report = {
      version: window.APP_VERSION || 'unknown',
      phase: 'phase-3-lightweight-mode',
      checkedAt: new Date().toISOString(),
      lightweight: !!(document.body && document.body.classList && document.body.classList.contains('lightweightMode')),
      lightweightLabel: 'Láďův režim',
      autoSuggested: (typeof isLowEndDevice === 'function') ? !!isLowEndDevice() : null,
      reduceMotion: !!(document.body && document.body.classList && document.body.classList.contains('reduceMotion')),
      prefs,
      ok: true
    };
    try {
      document.documentElement.dataset.rakPhase3 = 'laduv-rezim-foundation';
      window.__rakPhase3LightweightAudit = report;
    } catch (err) {}
    return report;
  };

  if (document.readyState === 'loading') {
    const rerun = () => setTimeout(run, 0);
    if (typeof registerListener === 'function') registerListener(document, 'DOMContentLoaded', rerun, { once: true });
    else document.addEventListener('DOMContentLoaded', rerun, { once: true });
    return { version: window.APP_VERSION || 'unknown', phase: 'phase-3-lightweight-mode', ok: true, deferred: true };
  }

  requestAnimationFrame(() => setTimeout(run, 0));
  return { version: window.APP_VERSION || 'unknown', phase: 'phase-3-lightweight-mode', ok: true, deferred: true };
}

function runPhaseFourCleanupManagerAudit() {
  const run = () => {
    const report = {
      version: window.APP_VERSION || 'unknown',
      phase: 'phase-5-game-performance-realtime',
      checkedAt: new Date().toISOString(),
      ok: true,
      dashboard: { missingCards: [], missingValues: [], missingIcons: [], dLine: { exists: false, hasMain: false, hasSub: false } },
      bottomNav: { exists: false, missingButtons: [], menuAligned: false, allItemsAligned: false, menuBottomAligned: false, menuWidthAligned: false, menuHasIcon: false, menuHasLabel: false },
      stats: { machineGridExists: false, machineOneLine: false, machineTileCount: 0, machineRows: 0 }
    };

    const requiredDashboardCards = [
      'dashCalendar',
      'dashCountdown',
      'dashKantyna',
      'dashJidelna',
      'dashVyplata',
      'dashCzd',
      'dashFoodLink',
      'dashEportalLink'
    ];

    requiredDashboardCards.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) {
        report.dashboard.missingCards.push(id);
        return;
      }
      const value = el.querySelector('.dashboardValue');
      const icon = el.querySelector('.dashboardIconInline img, .dashboardIconInline svg, .dashboardIconImg, .dashboardIconSvg');
      const valueText = value && value.textContent ? value.textContent.trim() : '';
      if (!value || !valueText) report.dashboard.missingValues.push(id);
      if (!icon) report.dashboard.missingIcons.push(id);
    });

    const dLine = document.querySelector('#dashHero .dashboardHeroLine3Pill');
    report.dashboard.dLine.exists = !!dLine;
    report.dashboard.dLine.hasMain = !!(dLine && dLine.querySelector('.dashboardHeroLine3Main'));
    report.dashboard.dLine.hasSub = !!(dLine && dLine.querySelector('.dashboardHeroLine3Sub'));


    const bottomNav = document.querySelector('.bottomNav');
    report.bottomNav.exists = !!bottomNav;
    const requiredNavActions = ['home', 'rotace', 'kalkulacky', 'menu'];
    if (bottomNav) {
      requiredNavActions.forEach((action) => {
        if (!bottomNav.querySelector('[data-action="' + action + '"]')) report.bottomNav.missingButtons.push(action);
      });
      const menuBtn = bottomNav.querySelector('.bottomNavMenuBtn');
      report.bottomNav.menuHasIcon = !!(menuBtn && menuBtn.querySelector('.moreIcon'));
      report.bottomNav.menuHasLabel = !!(menuBtn && menuBtn.querySelector('.bottomNavLabel'));
      if (menuBtn && window.getComputedStyle) {
        const menuRect = menuBtn.getBoundingClientRect();
        const peerButtons = Array.from(bottomNav.querySelectorAll('.bottomNavBtn')).filter(Boolean);
        const peer = bottomNav.querySelector('.bottomNavBtn:not(.bottomNavMenuBtn):not(.active)') || bottomNav.querySelector('.bottomNavBtn:not(.bottomNavMenuBtn)');
        const peerRect = peer ? peer.getBoundingClientRect() : null;
        report.bottomNav.menuAligned = !!(peerRect && Math.abs(menuRect.top - peerRect.top) <= 5 && Math.abs(menuRect.height - peerRect.height) <= 6);
        report.bottomNav.menuBottomAligned = !!(peerRect && Math.abs(menuRect.bottom - peerRect.bottom) <= 4);
        // Více má být záměrně užší než ostatní záložky, ale výškově zarovnané.
        report.bottomNav.menuWidthAligned = !!(peerRect && menuRect.width <= peerRect.width - 6 && menuRect.width >= 22);
        report.bottomNav.allItemsAligned = peerButtons.length > 0 && peerButtons.every((btn) => {
          const rect = btn.getBoundingClientRect();
          return Math.abs(rect.bottom - menuRect.bottom) <= 5 && Math.abs(rect.height - menuRect.height) <= 7;
        });
      } else {
        report.bottomNav.menuAligned = !!menuBtn;
        report.bottomNav.menuBottomAligned = !!menuBtn;
        report.bottomNav.menuWidthAligned = !!menuBtn;
        report.bottomNav.allItemsAligned = !!menuBtn;
      }
    }

    const statsMachineGrid = document.getElementById('statsMachineGrid');
    report.stats.machineGridExists = !!statsMachineGrid;
    if (statsMachineGrid && window.getComputedStyle) {
      const machineTiles = Array.from(statsMachineGrid.querySelectorAll('.statsMachineTile, .listItem')).filter(Boolean);
      report.stats.machineTileCount = machineTiles.length;
      const tops = [];
      machineTiles.forEach((tile) => {
        const rect = tile.getBoundingClientRect();
        const top = Math.round(rect.top);
        if (!tops.some((value) => Math.abs(value - top) <= 2)) tops.push(top);
      });
      report.stats.machineRows = tops.length;
      report.stats.machineOneLine = machineTiles.length > 0 && tops.length <= 1;
    } else {
      report.stats.machineOneLine = !!statsMachineGrid;
    }

    report.ok = !report.dashboard.missingCards.length
      && !report.dashboard.missingValues.length
      && !report.dashboard.missingIcons.length
      && report.dashboard.dLine.exists
      && report.dashboard.dLine.hasMain
      && report.dashboard.dLine.hasSub
      && report.bottomNav.exists
      && !report.bottomNav.missingButtons.length
      && report.bottomNav.menuHasIcon
      && report.bottomNav.menuHasLabel
      && report.bottomNav.menuAligned
      && report.bottomNav.menuBottomAligned
      && report.bottomNav.menuWidthAligned
      && report.bottomNav.allItemsAligned
      && report.stats.machineGridExists;
    try {
      document.documentElement.dataset.rakPhase4 = report.ok ? 'cleanup-manager-start' : 'dashboard-check';
      window.__rakPhase4CleanupAudit = report;
    } catch (err) {}

    if (!report.ok) {
      console.warn('[RaK] Phase 4 cleanup/dashboard/bottom-nav audit', report);
      try {
        if (typeof forceHomeRefresh === 'function') forceHomeRefresh();
      } catch (err) {}
    }
    return report;
  };

  if (document.readyState === 'loading') {
    const rerun = () => setTimeout(run, 220);
    if (typeof registerListener === 'function') registerListener(document, 'DOMContentLoaded', rerun, { once: true });
    else document.addEventListener('DOMContentLoaded', rerun, { once: true });
    return { version: window.APP_VERSION || 'unknown', phase: 'phase-5-game-performance-realtime', ok: true, deferred: true };
  }

  requestAnimationFrame(() => setTimeout(run, 220));
  return { version: window.APP_VERSION || 'unknown', phase: 'phase-5-game-performance-realtime', ok: true, deferred: true };
}


function runPhaseFiveGamePerformanceAudit() {
  const run = () => {
    const report = {
      version: window.APP_VERSION || 'unknown',
      phase: 'phase-5-game-performance-complete',
      checkedAt: new Date().toISOString(),
      ok: true,
      games: {
        activeShell: !!(window.app && window.app.activeGameShell),
        arcadeLoaded: !!window.__rakArcadeLoaded,
        perfManager: !!window.__rakGamePerfManager,
        stopLoops: typeof window.gamesStopActiveLoops === 'function',
        leaderboardThrottle: !!(window.app && window.app.gamesLeaderboardThrottle),
        shellRenderSkips: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.shellRenderSkips || 0),
        intervalHiddenSkips: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.intervalHiddenSkips || 0),
        activeManagedIntervals: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.activeManagedIntervals || 0),
        leaderboardTtlMs: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.leaderboardTtlMs || 0),
        pageLifecycleBound: !!window.__rakGamePerfPageLifecycleBound,
        pageHideCount: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.pageHideCount || 0),
        pageShowCount: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.pageShowCount || 0),
        launchRenderSkips: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.launchRenderSkips || 0),
        statsRenderSkips: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.statsRenderSkips || 0),
        scheduledStatsRenders: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.scheduledStatsRenders || 0),
        statsIdlePending: !!(window.__rakGamePerfManager && window.__rakGamePerfManager.statsIdlePending),
        profileSyncRuns: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.profileSyncRuns || 0),
        profileSyncSkips: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.profileSyncSkips || 0),
        profileSyncInFlightSkips: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.profileSyncInFlightSkips || 0),
        profileSyncOfflineSkips: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.profileSyncOfflineSkips || 0),
        profileSyncHiddenSkips: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.profileSyncHiddenSkips || 0),
        profileRenderSkips: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.profileRenderSkips || 0),
        achievementRenderSkips: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.achievementRenderSkips || 0),
        leaderboardInFlightSkips: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.leaderboardInFlightSkips || 0),
        leaderboardHiddenSkips: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.leaderboardHiddenSkips || 0),
        hubRenderRuns: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.hubRenderRuns || 0),
        hubActiveShellSkips: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.hubActiveShellSkips || 0),
        launchObserverBatches: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.launchObserverBatches || 0),
        launchObserverSkips: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.launchObserverSkips || 0),
        launchObserverIgnored: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.launchObserverIgnored || 0),
        launchObserverRoot: String(window.__rakGamePerfManager && window.__rakGamePerfManager.launchObserverRoot || ''),
        statsRenderRuns: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.statsRenderRuns || 0),
        profileRenderRuns: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.profileRenderRuns || 0),
        achievementRenderRuns: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.achievementRenderRuns || 0),
        leaderboardRefreshRuns: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.leaderboardRefreshRuns || 0),
        leaderboardCacheHits: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.leaderboardCacheHits || 0),
        leaderboardFreshLoads: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.leaderboardFreshLoads || 0),
        onlineRefreshRuns: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.onlineRefreshRuns || 0),
        onlineRefreshSkips: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.onlineRefreshSkips || 0),
        liveLeaderboardRefreshRuns: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.liveLeaderboardRefreshRuns || 0),
        liveLeaderboardRefreshSkips: Number(window.__rakGamePerfManager && window.__rakGamePerfManager.liveLeaderboardRefreshSkips || 0)
      }
    };
    report.ok = report.games.stopLoops && (report.games.arcadeLoaded ? report.games.perfManager && report.games.pageLifecycleBound : true);
    report.games.shellRerenderGuard = report.games.arcadeLoaded ? (typeof window.__rakGamePerfManager === 'object' && 'shellRenderSkips' in window.__rakGamePerfManager) : true;
    try {
      document.documentElement.dataset.rakPhase5 = report.ok ? 'game-performance-complete' : 'game-performance-check';
      window.__rakPhase5GamePerformanceAudit = report;
    } catch (err) {}
    if (!report.ok) console.warn('[RaK] Phase 5 game performance audit', report);
    return report;
  };

  if (document.readyState === 'loading') {
    const rerun = () => setTimeout(run, 260);
    if (typeof registerListener === 'function') registerListener(document, 'DOMContentLoaded', rerun, { once: true });
    else document.addEventListener('DOMContentLoaded', rerun, { once: true });
    return { version: window.APP_VERSION || 'unknown', phase: 'phase-5-game-performance-complete', ok: true, deferred: true };
  }

  requestAnimationFrame(() => setTimeout(run, 260));
  return { version: window.APP_VERSION || 'unknown', phase: 'phase-5-game-performance-complete', ok: true, deferred: true };
}


function runPhaseSevenDataOptimizationAudit() {
  const run = () => {
    const dataStatus = typeof window.getDataOptimizationStatus === 'function' ? window.getDataOptimizationStatus() : null;
    const report = {
      version: window.APP_VERSION || 'unknown',
      phase: 'phase-7-data-optimization-style-guard',
      checkedAt: new Date().toISOString(),
      ok: !!dataStatus,
      dataOptimization: dataStatus || null
    };
    try {
      document.documentElement.dataset.rakPhase7 = report.ok ? 'data-optimization-style-guard' : 'data-optimization-check';
      window.__rakPhase7DataOptimizationAudit = report;
    } catch (err) {}
    if (!report.ok) console.warn('[RaK] Phase 7 data optimization audit', report);
    return report;
  };

  if (document.readyState === 'loading') {
    const rerun = () => setTimeout(run, 300);
    if (typeof registerListener === 'function') registerListener(document, 'DOMContentLoaded', rerun, { once: true });
    else document.addEventListener('DOMContentLoaded', rerun, { once: true });
    return { version: window.APP_VERSION || 'unknown', phase: 'phase-7-data-optimization-style-guard', ok: true, deferred: true };
  }

  requestAnimationFrame(() => setTimeout(run, 300));
  return { version: window.APP_VERSION || 'unknown', phase: 'phase-7-data-optimization-style-guard', ok: true, deferred: true };
}


const RAK_FINAL_STABILIZATION_DEFAULTS = {
  phase: 'phase-10-final-stabilization',
  phasePercent: 100,
  auditMode: 'runtime-readiness-script-storage-navigation-page-shell-action-link-form-safe-helper-supabase-structure-game-engine-baseline-readiness-summary-audit-post-stabilization-baseline-watch',
  audits: 0,
  lastAuditOk: false,
  lastMissingCount: 0,
  lastMissingItems: [],
  lastCheckedAt: '',
  lastVersion: '',
  lastPage: '',
  lastPhase9Percent: 0,
  lastPhase8Percent: 0,
  lastDuplicateIdCount: 0,
  lastDuplicateIds: [],
  lastErrorLogCount: 0,
  lastStorageOk: false,
  lastStorageItemCount: 0,
  lastLargeStorageKeyCount: 0,
  lastLargeStorageKeys: [],
  lastNavigatorOnline: true,
  lastVisibilityState: '',
  lastScriptHealthOk: false,
  lastScriptMissingCount: 0,
  lastScriptDuplicateCount: 0,
  lastScriptUnexpectedCount: 0,
  lastScriptMissingFiles: [],
  lastScriptDuplicateFiles: [],
  lastNavigationHealthOk: false,
  lastNavigationButtonCount: 0,
  lastNavigationActiveCount: 0,
  lastNavigationMissingCount: 0,
  lastNavigationMissingItems: [],
  lastPageShellHealthOk: false,
  lastPageShellPageCount: 0,
  lastPageShellActiveCount: 0,
  lastPageShellCriticalPanelCount: 0,
  lastPageShellMissingCount: 0,
  lastPageShellMissingItems: [],
  lastActionHealthOk: false,
  lastActionCount: 0,
  lastActionUnknownCount: 0,
  lastActionRequiredMissingCount: 0,
  lastActionMissingTargetsCount: 0,
  lastActionLinkIssueCount: 0,
  lastActionUnknownItems: [],
  lastActionRequiredMissingItems: [],
  lastActionMissingTargetItems: [],
  lastActionLinkIssues: [],
  lastFormHealthOk: false,
  lastFormInputCount: 0,
  lastFormSelectCount: 0,
  lastFormButtonCount: 0,
  lastFormRequiredMissingCount: 0,
  lastFormActionMissingCount: 0,
  lastFormInvalidNumberCount: 0,
  lastFormRequiredMissingItems: [],
  lastFormActionMissingItems: [],
  lastFormInvalidNumberItems: [],
  lastRuntimeReadinessOk: false,
  lastRuntimeReadinessPassedCount: 0,
  lastRuntimeReadinessTotalCount: 0,
  lastRuntimeReadinessFailedItems: [],
  lastPostStabilizationOk: false,
  lastPostStabilizationMode: '',
  lastPostStabilizationCheckedAt: '',
  lastPostStabilizationIssueCount: 0,
  lastPostStabilizationIssues: [],
  lastSupabaseStructureOk: false,
  lastSupabaseStructureMode: '',
  lastSupabaseStructureTableCount: 0,
  lastSupabaseStructureIssueCount: 0,
  lastSupabaseStructureIssues: [],
  lastSafeHelperHealthOk: false,
  lastSafeHelperCount: 0,
  lastSafeHelperMissingCount: 0,
  lastSafeHelperMissingItems: [],
  lastGameEngineHealthOk: false,
  lastGameEngineMode: '',
  lastGameEngineActiveGame: '',
  lastGameEngineManagedLoopCount: 0,
  lastGameEngineLifecycleEvents: 0,
  lastGameEngineIssueCount: 0,
  lastGameEngineIssues: []
};

function ensureFinalStabilizationStatus() {
  const current = window.__rakFinalStabilizationStatus || {};
  const status = Object.assign({}, RAK_FINAL_STABILIZATION_DEFAULTS, current, {
    phase: 'phase-10-final-stabilization',
    phasePercent: 100,
    auditMode: 'runtime-readiness-script-storage-navigation-page-shell-action-link-form-safe-helper-supabase-structure-game-engine-baseline-readiness-summary-audit-post-stabilization-baseline-watch'
  });
  window.__rakFinalStabilizationStatus = status;
  return status;
}

function getFinalStabilizationStatus() {
  return Object.assign({}, ensureFinalStabilizationStatus());
}
window.getFinalStabilizationStatus = getFinalStabilizationStatus;

function getPhaseTenDuplicateDomIds() {
  const seen = new Set();
  const duplicates = new Set();
  try {
    document.querySelectorAll('[id]').forEach((node) => {
      const id = String(node && node.id ? node.id : '').trim();
      if (!id) return;
      if (seen.has(id)) duplicates.add(id);
      else seen.add(id);
    });
  } catch (err) {}
  return Array.from(duplicates).slice(0, 25);
}

function getPhaseTenErrorLogCount() {
  try {
    const log = JSON.parse(localStorage.getItem('rotace_err_log_v1') || '[]');
    return Array.isArray(log) ? log.length : 0;
  } catch (err) {
    return 0;
  }
}

function getPhaseTenStorageHealth() {
  const health = {
    ok: false,
    writable: false,
    itemCount: 0,
    largeKeys: [],
    error: '',
    navigatorOnline: typeof navigator !== 'undefined' ? navigator.onLine !== false : true,
    visibilityState: typeof document !== 'undefined' ? String(document.visibilityState || 'unknown') : 'unknown'
  };

  try {
    const probeKey = '__rak_phase10_storage_probe__';
    localStorage.setItem(probeKey, '1');
    localStorage.removeItem(probeKey);
    health.writable = true;
    health.ok = true;

    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
    health.itemCount = keys.length;
    health.largeKeys = keys.map((key) => {
      let size = 0;
      try { size = String(localStorage.getItem(key) || '').length; } catch (err) { size = 0; }
      return { key, size };
    }).filter((item) => item.size > 180000).sort((a, b) => b.size - a.size).slice(0, 8);
  } catch (err) {
    health.error = String(err && err.message ? err.message : err || 'storage error');
  }

  return health;
}
window.getPhaseTenStorageHealth = getPhaseTenStorageHealth;

function getPhaseTenScriptLoadHealth() {
  const expectedFiles = [
    'data.js',
    'module-readiness.js',
    'rak-namespace.js',
    'rak-audit-baseline.js',
    'rak-runtime-health.js',
    'rak-storage-sync-audit.js',
    'rak-boot-sequence-audit.js',
    'rak-export-release-audit.js',
    'rak-dom-action-audit.js',
    'rak-supabase-client-audit.js',
    'rak-release-ops-audit.js',
    'rak-appsec-privacy-audit.js',
    'rak-release-gates.js',
    'rak-dom-security-hardening.js',
    'rak-due-diligence-progress.js',
    'rak-performance-ci-audit.js',
    'app.js',
    'app-runtime-guards.js',
    'app-health-audits.js',
    'app-postload-audits.js',
    'app-pwa-connectivity.js',
    'core.js',
    'lifecycle.js',
    'qr.js',
    'payroll.js',
    'brusy.js',
    'stats.js',
    'dashboard.js',
    'soustruhy.js',
    'rotace.js',
    'games-engine.js',
    'games-profile.js',
    'appearance-theme.js',
    'games-gomoku.js',
    'games-classic.js',
    'changelog.js',
    'admin-rotation.js',
    'admin-food.js',
    'admin-reports.js',
    'admin-service-usage.js',
    'ui.js',
    'app-navigation.js',
    'app-bottom-nav.js',
    'app-menu.js',
    'app-actions.js',
    'app-boot-selftest.js',
    'games-arcade.js',
    'export.js',
    'supabase-config.js',
    'supabase-bridge.js',
    'app-excel-import.js',
    'app-admin-unlock.js',
    'app-home-boot.js',
    'app-init.js'
  ];
  const expectedSet = new Set(expectedFiles);
  const counts = Object.create(null);
  const unexpectedLocalJs = [];

  try {
    Array.from(document.scripts || []).forEach((script) => {
      const rawSrc = String(script && script.getAttribute ? script.getAttribute('src') || '' : '').trim();
      if (!rawSrc) return;
      let fileName = rawSrc.split('?')[0].split('#')[0].split('/').filter(Boolean).pop() || rawSrc;
      try {
        const url = new URL(rawSrc, window.location.href);
        fileName = url.pathname.split('/').filter(Boolean).pop() || fileName;
        const sameOrigin = url.origin === window.location.origin;
        if (sameOrigin && fileName.endsWith('.js') && !expectedSet.has(fileName)) unexpectedLocalJs.push(fileName);
      } catch (err) {
        if (fileName.endsWith('.js') && !expectedSet.has(fileName) && !/^https?:/i.test(rawSrc)) unexpectedLocalJs.push(fileName);
      }
      if (expectedSet.has(fileName)) counts[fileName] = Number(counts[fileName] || 0) + 1;
    });
  } catch (err) {}

  const missing = expectedFiles.filter((file) => Number(counts[file] || 0) < 1);
  const duplicateFiles = expectedFiles
    .filter((file) => Number(counts[file] || 0) > 1)
    .map((file) => ({ file, count: Number(counts[file] || 0) }));

  return {
    ok: missing.length === 0,
    expectedCount: expectedFiles.length,
    loadedExpectedCount: expectedFiles.filter((file) => Number(counts[file] || 0) > 0).length,
    missing,
    duplicateFiles,
    duplicateCount: duplicateFiles.length,
    unexpectedLocalJs: Array.from(new Set(unexpectedLocalJs)).slice(0, 12),
    unexpectedLocalJsCount: Array.from(new Set(unexpectedLocalJs)).length
  };
}
window.getPhaseTenScriptLoadHealth = getPhaseTenScriptLoadHealth;


function getPhaseTenNavigationHealth() {
  const health = {
    ok: false,
    navExists: false,
    bound: false,
    buttonCount: 0,
    activeCount: 0,
    activePageId: '',
    missing: [],
    actions: []
  };

  try {
    const nav = document.querySelector('.bottomNav');
    health.navExists = !!nav;
    if (!nav) {
      health.missing.push('DOM .bottomNav');
      return health;
    }

    health.bound = !!nav.__rotaceBound;
    if (!health.bound) health.missing.push('bottom nav binding');

    const allowedActions = new Set(['home', 'rotace', 'kalkulacky', 'menu']);
    const allowedPages = new Set(['home', 'rotace', 'kalkulacky', 'menu']);
    const requiredActions = ['home', 'rotace', 'kalkulacky', 'menu'];
    const seenActions = new Set();
    const buttons = Array.from(nav.querySelectorAll('.bottomNavBtn[data-action]'));
    health.buttonCount = buttons.length;
    health.activeCount = buttons.filter((btn) => btn.classList && btn.classList.contains('active')).length;
    health.activePageId = String(document.querySelector('.page.active')?.id || '');

    buttons.forEach((btn) => {
      const action = String(btn.dataset.action || '').trim();
      const page = String(btn.dataset.page || '').trim();
      if (action) seenActions.add(action);
      health.actions.push(action || '—');
      if (!allowedActions.has(action)) health.missing.push('unknown nav action: ' + (action || 'empty'));
      if (!allowedPages.has(page)) health.missing.push('unknown nav page: ' + (page || 'empty'));
      if (!btn.querySelector('.bottomNavLabel')) health.missing.push('missing nav label: ' + (action || page || 'unknown'));
    });

    requiredActions.forEach((action) => {
      if (!seenActions.has(action)) health.missing.push('missing nav action: ' + action);
    });

    if (!document.getElementById('home')) health.missing.push('DOM #home');
    if (!document.getElementById('rotace')) health.missing.push('DOM #rotace');
    if (!document.getElementById('kalkulacky')) health.missing.push('DOM #kalkulacky');
    if (health.activePageId && !document.getElementById(health.activePageId)) health.missing.push('active page missing: ' + health.activePageId);

    health.missing = Array.from(new Set(health.missing)).slice(0, 18);
    health.ok = health.navExists && health.bound && health.buttonCount >= requiredActions.length && health.missing.length === 0;
  } catch (err) {
    health.missing.push(String(err && err.message ? err.message : err || 'navigation health error'));
  }

  return health;
}
window.getPhaseTenNavigationHealth = getPhaseTenNavigationHealth;


function getPhaseTenPageShellHealth() {
  const health = {
    ok: false,
    pageCount: 0,
    activePageCount: 0,
    activePageId: '',
    criticalPanelCount: 0,
    missing: []
  };

  try {
    const pages = Array.from(document.querySelectorAll('.page'));
    health.pageCount = pages.length;
    health.activePageCount = pages.filter((page) => page.classList && page.classList.contains('active')).length;
    health.activePageId = String(document.querySelector('.page.active')?.id || '');

    const requiredPages = [
      'home',
      'kalkulacky',
      'rotace',
      'soustruhy',
      'jidlo',
      'frezky',
      'brusy',
      'pracka'
    ];
    requiredPages.forEach((id) => {
      const el = document.getElementById(id);
      if (!el || !el.classList || !el.classList.contains('page')) health.missing.push('page #' + id);
    });

    const criticalPanels = [
      'dashCalendar',
      'dashCountdown',
      'dashKantyna',
      'dashJidelna',
      'dashFoodLink',
      'dashEportalLink',
      'rotaceNamesPanel',
      'rotaceStatsPanel',
      'rotaceMonthsPanel',
      'namesGrid',
      'monthView',
      'soustruhyLisPanel',
      'soustruhy126Panel',
      'soustruhy106Panel',
      'soustruhyComboPanel',
      'brusyInfo',
      'outB',
      'outBTime'
    ];
    criticalPanels.forEach((id) => {
      if (document.getElementById(id)) health.criticalPanelCount += 1;
      else health.missing.push('panel #' + id);
    });

    if (health.pageCount < requiredPages.length) health.missing.push('page count: ' + String(health.pageCount));
    if (health.activePageCount !== 1) health.missing.push('active page count: ' + String(health.activePageCount));
    if (health.activePageId && !document.getElementById(health.activePageId)) health.missing.push('active page missing: ' + health.activePageId);

    health.missing = Array.from(new Set(health.missing)).slice(0, 24);
    health.ok = health.missing.length === 0;
  } catch (err) {
    health.missing.push(String(err && err.message ? err.message : err || 'page shell health error'));
  }

  return health;
}
window.getPhaseTenPageShellHealth = getPhaseTenPageShellHealth;

function getPhaseTenActionHealth() {
  const health = {
    ok: false,
    actionCount: 0,
    delegatedAllowedCount: 0,
    navAllowedCount: 0,
    changeAllowedCount: 0,
    unknownActions: [],
    requiredMissing: [],
    missingTargets: [],
    linkIssues: []
  };

  try {
    const delegatedAllowed = new Set(Array.isArray(window.__rakDelegatedAllowedActions) ? window.__rakDelegatedAllowedActions : []);
    const changeAllowed = new Set(Array.isArray(window.__rakDelegatedChangeActions) ? window.__rakDelegatedChangeActions : ['month-select']);
    const navAllowed = new Set(['home', 'rotace', 'kalkulacky', 'rozpisy', 'statistiky', 'menu']);
    const requiredDelegated = [
      'show-food-kantyna',
      'show-food-jidelna',
      'open-food-link',
      'open-eportal-link',
      'open-payroll-link',
      'page-kalkulacky',
      'page-soustruhy',
      'page-frezky',
      'page-brusy',
      'page-pracka',
      'page-korekce-soustruhy',
      'set-lathe-axis-machine',
      'calc-lathe-axis-correction',
      'toggle-lathe-axis-sign',
      'toggle-frezky-correction-sign',
      'open-lathe-axis-help',
      'page-korekce-frezky',
      'page-korekce-brusy',
      'calc-frezky-fhb',
      'set-fhb-target-preset',
      'open-frezky-correction-help',
      'calc-brusy',
      'calc-brusy-finish',
      'calc-p',
      'calc-p-finish',
      'reset-fields',
      'calendar-open'
    ];
    const seen = new Set();
    const nodes = Array.from(document.querySelectorAll('[data-action], [data-rak-open-calendar]'));

    health.actionCount = nodes.length;
    health.delegatedAllowedCount = delegatedAllowed.size;
    health.navAllowedCount = navAllowed.size;
    health.changeAllowedCount = changeAllowed.size;

    nodes.forEach((node) => {
      const action = node.hasAttribute('data-rak-open-calendar') ? 'calendar-open' : String(node.getAttribute('data-action') || '').trim();
      if (action) seen.add(action);
      const isBottomNav = !!(node.closest && node.closest('.bottomNav'));
      const isSelect = String(node.tagName || '').toUpperCase() === 'SELECT';
      const allowed = isBottomNav ? navAllowed.has(action) : (delegatedAllowed.has(action) || (isSelect && changeAllowed.has(action)));
      if (!allowed) health.unknownActions.push(action || 'empty');

      if (action === 'set-machine' && !String(node.getAttribute('data-machine') || '').trim()) health.missingTargets.push('set-machine data-machine');
      if (action === 'set-prog' && !String(node.getAttribute('data-prog') || '').trim()) health.missingTargets.push('set-prog data-prog');
      if (action === 'set-fhb-target-preset') {
        if (!String(node.getAttribute('data-fhb-key') || '').trim()) health.missingTargets.push('set-fhb-target-preset data-fhb-key');
        if (!String(node.getAttribute('data-fhb-left') || '').trim()) health.missingTargets.push('set-fhb-target-preset data-fhb-left');
        if (!String(node.getAttribute('data-fhb-right') || '').trim()) health.missingTargets.push('set-fhb-target-preset data-fhb-right');
      }
      if (action === 'open-frezky-correction-help' && !String(node.getAttribute('data-help-type') || '').trim()) health.missingTargets.push('open-frezky-correction-help data-help-type');
      if (action === 'reset-fields' && !String(node.getAttribute('data-reset-fields') || '').trim()) health.missingTargets.push('reset-fields data-reset-fields');
      if (action === 'soustruh-mode' && !String(node.getAttribute('data-soustruh-mode') || '').trim()) health.missingTargets.push('soustruh-mode data-soustruh-mode');
      if (action === 'soustruh-combo-first' && !String(node.getAttribute('data-combo-first') || '').trim()) health.missingTargets.push('soustruh-combo-first data-combo-first');
      if (action === 'soustruh-combo-free' && !String(node.getAttribute('data-combo-free') || '').trim()) health.missingTargets.push('soustruh-combo-free data-combo-free');
    });

    requiredDelegated.forEach((action) => {
      if (!delegatedAllowed.has(action)) health.requiredMissing.push('allowlist ' + action);
      if (!seen.has(action)) health.requiredMissing.push('DOM action ' + action);
    });

    ['dashFoodLink', 'dashEportalLink'].forEach((id) => {
      const link = document.getElementById(id);
      if (!link) {
        health.linkIssues.push(id + ' missing');
        return;
      }
      const href = String(link.getAttribute('href') || '').trim();
      const rel = String(link.getAttribute('rel') || '').toLowerCase();
      const target = String(link.getAttribute('target') || '').trim();
      if (!/^https:\/\//i.test(href)) health.linkIssues.push(id + ' href');
      if (target !== '_blank') health.linkIssues.push(id + ' target');
      if (!rel.includes('noopener') || !rel.includes('noreferrer')) health.linkIssues.push(id + ' rel');
    });

    health.unknownActions = Array.from(new Set(health.unknownActions)).slice(0, 18);
    health.requiredMissing = Array.from(new Set(health.requiredMissing)).slice(0, 18);
    health.missingTargets = Array.from(new Set(health.missingTargets)).slice(0, 18);
    health.linkIssues = Array.from(new Set(health.linkIssues)).slice(0, 12);
    health.ok = health.actionCount > 0 && health.delegatedAllowedCount >= requiredDelegated.length && health.unknownActions.length === 0 && health.requiredMissing.length === 0 && health.missingTargets.length === 0 && health.linkIssues.length === 0;
  } catch (err) {
    health.unknownActions.push(String(err && err.message ? err.message : err || 'action health error'));
  }

  return health;
}
window.getPhaseTenActionHealth = getPhaseTenActionHealth;

function getPhaseTenFormHealth() {
  const health = {
    ok: false,
    inputCount: 0,
    selectCount: 0,
    buttonCount: 0,
    requiredMissing: [],
    actionMissing: [],
    invalidNumberInputs: []
  };

  try {
    const requiredInputs = [
      'excelFile',
      'lis_first',
      'lis_plan',
      'v127_first',
      'v127_plan',
      'v127_heat_first',
      'v106_first',
      'v106_c1',
      'v106_c2',
      'v106_c3',
      'v106_c4',
      'v106_plan',
      'v106_heat_first',
      'combo106_c1',
      'combo106_c2',
      'combo106_c3',
      'combo106_c4',
      'combo_first_start',
      'combo_first_end',
      'combo_second_start',
      'combo_second_plan',
      'combo_heat_first',
      'f_kusy',
      'f_finish_kusy',
      'f_finish_davky',
      'celkem',
      'davka',
      'orovnani',
      'b_finish_davky',
      'b_finish_davka',
      'b_finish_orovnani',
      'p_kusy',
      'p_finish_davky',
      'p_finish_davka',
      'lathe_axis_drill3',
      'lathe_axis_drill7',
    ];
    const requiredSelects = ['statsYearSelect', 'monthYearSelect', 'monthSelect'];
    const requiredButtons = ['importBtn', 'exportBtn'];
    const requiredActions = [
      'calc-soustruhy-lis',
      'calc-soustruhy-126',
      'calc-soustruhy-126-heat',
      'calc-soustruhy-106',
      'calc-soustruhy-106-heat',
      'calc-soustruhy-combo',
      'calc-soustruhy-combo-heat',
      'calc-f',
      'calc-f-finish',
      'calc-frezky-fhb',
      'set-fhb-target-preset',
      'open-frezky-correction-help',
      'calc-brusy',
      'calc-brusy-finish',
      'calc-p',
      'calc-p-finish',
      'page-pracka',
      'set-lathe-axis-machine',
      'calc-lathe-axis-correction',
      'toggle-lathe-axis-sign',
      'toggle-frezky-correction-sign',
      'open-lathe-axis-help',
      'reset-soustruhy',
      'reset-fields',
      'page-kalkulacky'
    ];

    const allInputs = Array.from(document.querySelectorAll('input'));
    const allSelects = Array.from(document.querySelectorAll('select'));
    const allButtons = Array.from(document.querySelectorAll('button'));
    health.inputCount = allInputs.length;
    health.selectCount = allSelects.length;
    health.buttonCount = allButtons.length;

    requiredInputs.forEach((id) => {
      const el = document.getElementById(id);
      if (!el || String(el.tagName || '').toUpperCase() !== 'INPUT') health.requiredMissing.push('input #' + id);
    });
    requiredSelects.forEach((id) => {
      const el = document.getElementById(id);
      if (!el || String(el.tagName || '').toUpperCase() !== 'SELECT') health.requiredMissing.push('select #' + id);
    });
    requiredButtons.forEach((id) => {
      const el = document.getElementById(id);
      if (!el || String(el.tagName || '').toUpperCase() !== 'BUTTON') health.requiredMissing.push('button #' + id);
    });
    requiredActions.forEach((action) => {
      if (!document.querySelector('[data-action="' + action + '"]')) health.actionMissing.push('action ' + action);
    });

    allInputs.forEach((input) => {
      const type = String(input.getAttribute('type') || '').toLowerCase();
      if (type !== 'number') return;
      const id = String(input.id || input.getAttribute('name') || 'number-input').trim();
      const min = input.getAttribute('min');
      const max = input.getAttribute('max');
      const step = input.getAttribute('step');
      if (min !== null && min !== '' && Number.isNaN(Number(min))) health.invalidNumberInputs.push(id + ' min');
      if (max !== null && max !== '' && Number.isNaN(Number(max))) health.invalidNumberInputs.push(id + ' max');
      if (step !== null && step !== '' && step !== 'any' && Number.isNaN(Number(step))) health.invalidNumberInputs.push(id + ' step');
    });

    health.requiredMissing = Array.from(new Set(health.requiredMissing)).slice(0, 24);
    health.actionMissing = Array.from(new Set(health.actionMissing)).slice(0, 24);
    health.invalidNumberInputs = Array.from(new Set(health.invalidNumberInputs)).slice(0, 24);
    health.ok = health.requiredMissing.length === 0 && health.actionMissing.length === 0 && health.invalidNumberInputs.length === 0;
  } catch (err) {
    health.requiredMissing.push(String(err && err.message ? err.message : err || 'form health error'));
  }

  return health;
}
window.getPhaseTenFormHealth = getPhaseTenFormHealth;

function getPostStabilizationSafeHelperHealth() {
  const requiredHelpers = [
    'setElementTextIfChanged',
    'setElementHtmlIfChanged',
    'setElementChildrenIfChanged',
    'setSelectOptionsIfChanged',
    'replaceElementChildrenSafely',
    'clearElementChildrenSafely',
    'normalizeSafeExternalUrl',
    'normalizeAllowedExternalUrl',
    'setSafeExternalAnchor',
    'getSecurityRenderStatus',
    'getFinalStabilizationStatus',
    'getPhaseTenRuntimeReadinessHealth',
    'getPostStabilizationBaselineHealth',
    'getLadaPerformanceHealth',
    'getRakLadaPerformanceProfile',
    'getRakDevicePerformanceStatus',
    'runRakDevicePerformanceProbe',
    'runLadaPerformanceAudit',
    'getSupabaseStructureHealth',
    'getGameEngineBaselineHealth',
    'runGameEngineBaselineAudit',
    'setupRakGameEngineLifecycleBindings',
    'getRakModuleReadinessHealth',
    'getRakRuntimeGuardHealth',
    'getRakStatsYearScopeHealth',
    'getRakDomActionRegistryHealth',
    'getRakDomActionSmokeReport'
  ];
  const missing = [];

  requiredHelpers.forEach((name) => {
    try {
      if (typeof window[name] !== 'function') missing.push(name);
    } catch (err) {
      missing.push(name);
    }
  });

  return {
    ok: missing.length === 0,
    mode: 'post-stabilization-safe-helper-guard',
    helperCount: requiredHelpers.length,
    missingCount: missing.length,
    missing: missing.slice(0, 18)
  };
}
window.getPostStabilizationSafeHelperHealth = getPostStabilizationSafeHelperHealth;

function parseCssBlurPx(value) {
  try {
    const text = String(value || '').toLowerCase();
    const match = text.match(/blur\(([-0-9.]+)px\)/);
    return match ? Math.max(0, Number(match[1]) || 0) : 0;
  } catch (err) {
    return 0;
  }
}
window.parseCssBlurPx = parseCssBlurPx;

function getLadaPerformanceHealth() {
  const body = document.body || null;
  const root = document.documentElement || null;
  const classes = body && body.classList ? body.classList : null;
  const active = !!(classes && (classes.contains('lightweightMode') || classes.contains('lowEndDevice') || classes.contains('ladaMode')));
  const lowEndInfo = typeof getLowEndDeviceInfo === 'function'
    ? getLowEndDeviceInfo()
    : { lowEnd: false, reasons: [], dpr: Number(window.devicePixelRatio || 1) || 1 };
  const profile = typeof getRakLadaPerformanceProfile === 'function'
    ? getRakLadaPerformanceProfile()
    : { active, level: active ? 'lite' : 'normal', frameMs: active ? 34 : 0, canvasDprMax: active ? 1 : 2, resizeThrottleMs: active ? 520 : 120, leaderboardTtlMs: active ? 180000 : 60000, cssEffects: active ? 'minimal' : 'full' };
  const dprLimit = typeof getRakPerformanceDprMax === 'function' ? Number(getRakPerformanceDprMax()) : Number(profile.canvasDprMax || 2);
  const cssSamples = [];
  const issues = [];
  const sampleSelectors = [
    '.dashboardCard',
    '.dashboardHeroCard',
    '.bottomNav',
    '.bottomNavBtn',
    '.appMenuCard',
    '.calcTile',
    '.tile',
    '.appMenuSettingBtn'
  ];

  try {
    sampleSelectors.forEach((selector) => {
      const el = document.querySelector(selector);
      if (!el || typeof getComputedStyle !== 'function') return;
      const style = getComputedStyle(el);
      const blur = Math.max(parseCssBlurPx(style.backdropFilter), parseCssBlurPx(style.webkitBackdropFilter));
      const transition = String(style.transitionDuration || '').trim();
      const animation = String(style.animationDuration || '').trim();
      const shadow = String(style.boxShadow || '').trim();
      cssSamples.push({ selector, blur, transition, animation, hasShadow: !!shadow && shadow !== 'none' });
    });
  } catch (err) {
    issues.push('css sample error');
  }

  const maxBlur = cssSamples.reduce((max, item) => Math.max(max, Number(item.blur || 0)), 0);
  const animatedSamples = active
    ? cssSamples.filter((item) => {
      const transition = String(item.transition || '0s').split(',').some((part) => parseFloat(part) > 0.05);
      const animation = String(item.animation || '0s').split(',').some((part) => parseFloat(part) > 0.05);
      return transition || animation;
    })
    : [];

  if (active && !classes.contains('reduceMotion')) issues.push('reduceMotion class missing');
  if (active && dprLimit > 1) issues.push('canvas DPR limit over 1');
  if (active && maxBlur > 3.5) issues.push('heavy blur still active');
  if (active && animatedSamples.length) issues.push('animations/transitions still active');
  if (active && root && !String(root.dataset.rakPerformanceMode || '').includes('lada')) issues.push('performance dataset missing');
  if (active && root && !root.classList.contains('rakLadaPaintLite')) issues.push('lada lite paint layer missing');
  if (active && root && String(root.dataset.rakLadaPaintLite || '') !== 'yes') issues.push('lada lite paint dataset missing');
  if (active && profile && Number(profile.frameMs || 0) < 28) issues.push('lada frame throttle too low');
  if (active && profile && String(profile.cssEffects || '') !== 'minimal') issues.push('lada css effects not minimal');
  const deviceStatus = typeof getRakDevicePerformanceStatus === 'function' ? getRakDevicePerformanceStatus() : null;
  if (typeof getRakPerformanceDprMax !== 'function') issues.push('getRakPerformanceDprMax missing');
  if (typeof getRakLadaPerformanceProfile !== 'function') issues.push('getRakLadaPerformanceProfile missing');
  if (typeof getRakDevicePerformanceStatus !== 'function') issues.push('getRakDevicePerformanceStatus missing');
  if (typeof runRakDevicePerformanceProbe !== 'function') issues.push('runRakDevicePerformanceProbe missing');
  if (typeof getLowEndDeviceInfo !== 'function') issues.push('getLowEndDeviceInfo missing');

  return {
    ok: issues.length === 0,
    mode: active ? 'lada-performance-turbo-active' : 'lada-performance-ready',
    active,
    lightweight: !!(classes && classes.contains('lightweightMode')),
    lowEndDevice: !!(classes && classes.contains('lowEndDevice')),
    ladaMode: !!(classes && classes.contains('ladaMode')),
    reduceMotion: !!(classes && classes.contains('reduceMotion')),
    dprLimit,
    profileLevel: String(profile && profile.level || (active ? 'lite' : 'normal')),
    frameMs: Number(profile && profile.frameMs || 0) || 0,
    resizeThrottleMs: Number(profile && profile.resizeThrottleMs || 0) || 0,
    leaderboardTtlMs: Number(profile && profile.leaderboardTtlMs || 0) || 0,
    cssEffects: String(profile && profile.cssEffects || 'full'),
    litePaintLayer: !!(root && root.classList && root.classList.contains('rakLadaPaintLite')),
    litePaintDataset: root ? String(root.dataset.rakLadaPaintLite || '') : '',
    detectedDpr: Number(lowEndInfo && lowEndInfo.dpr || window.devicePixelRatio || 1) || 1,
    lowEndDetected: !!(lowEndInfo && lowEndInfo.lowEnd),
    lowEndReasons: Array.isArray(lowEndInfo && lowEndInfo.reasons) ? lowEndInfo.reasons.slice(0, 8) : [],
    devicePerformanceScore: deviceStatus && deviceStatus.probe ? Number(deviceStatus.probe.score || 0) || 0 : null,
    devicePerformanceRecommendation: deviceStatus ? String(deviceStatus.recommendedProfile || 'normal') : 'unknown',
    devicePerformanceProbeAgeMs: deviceStatus ? deviceStatus.probeAgeMs : null,
    cssSampleCount: cssSamples.length,
    maxBlurPx: Math.round(maxBlur * 10) / 10,
    animatedSampleCount: animatedSamples.length,
    issues: issues.slice(0, 12)
  };
}
window.getLadaPerformanceHealth = getLadaPerformanceHealth;

function runLadaPerformanceAudit() {
  const run = () => {
    const report = getLadaPerformanceHealth();
    try {
      document.documentElement.dataset.rakLadaPerformanceAudit = report.ok ? report.mode : 'lada-performance-check';
      window.__rakLadaPerformanceAudit = Object.assign({ checkedAt: new Date().toISOString(), version: window.APP_VERSION || 'unknown' }, report);
    } catch (err) {}
    if (!report.ok) console.warn('[RaK] Láďův režim performance audit', report);
    return report;
  };

  if (document.readyState === 'loading') {
    const rerun = () => setTimeout(run, 380);
    if (typeof registerListener === 'function') registerListener(document, 'DOMContentLoaded', rerun, { once: true });
    else document.addEventListener('DOMContentLoaded', rerun, { once: true });
    return { version: window.APP_VERSION || 'unknown', phase: 'lada-performance-audit', ok: true, deferred: true };
  }

  requestAnimationFrame(() => setTimeout(run, 380));
  return { version: window.APP_VERSION || 'unknown', phase: 'lada-performance-audit', ok: true, deferred: true };
}
window.runLadaPerformanceAudit = runLadaPerformanceAudit;

// 1.2 (1.155): Sdílený herní engine baseline je oddělený v games-engine.js.



function readRakAuditDiagnostic(alias, fallbackGlobalName) {
  try {
    if (window.RaK && window.RaK.diagnostics && typeof window.RaK.diagnostics.readWithFallback === 'function') {
      return window.RaK.diagnostics.readWithFallback(alias, fallbackGlobalName);
    }
  } catch (err) {}
  try {
    if (window.RaK && window.RaK.diagnostics && typeof window.RaK.diagnostics.read === 'function') {
      const result = window.RaK.diagnostics.read(alias);
      if (result) return result;
    }
  } catch (err) {}
  try {
    const fn = window[String(fallbackGlobalName || '')];
    return typeof fn === 'function' ? fn() : null;
  } catch (err) {
    return null;
  }
}

function getPhaseTenRuntimeReadinessHealth(parts = {}) {
  const checks = [];
  const addCheck = (name, ok) => checks.push({ name, ok: !!ok });

  try {
    const version = String(parts.version || window.APP_VERSION || '').trim();
    const appVersion = String(parts.appVersion || ((typeof app !== 'undefined' && app && app.version) || '')).trim();
    const securityStatus = parts.securityStatus || (typeof window.getSecurityRenderStatus === 'function' ? window.getSecurityRenderStatus() : null);
    const pwaStatus = parts.pwaStatus || (typeof window.getPwaHardeningStatus === 'function' ? window.getPwaHardeningStatus() : null);
    const dataStatus = parts.dataStatus || (typeof window.getDataOptimizationStatus === 'function' ? window.getDataOptimizationStatus() : null);
    const duplicateDomIds = Array.isArray(parts.duplicateDomIds) ? parts.duplicateDomIds : getPhaseTenDuplicateDomIds();
    const storageHealth = parts.storageHealth || getPhaseTenStorageHealth();
    const scriptHealth = parts.scriptHealth || getPhaseTenScriptLoadHealth();
    const navigationHealth = parts.navigationHealth || getPhaseTenNavigationHealth();
    const pageShellHealth = parts.pageShellHealth || getPhaseTenPageShellHealth();
    const actionHealth = parts.actionHealth || getPhaseTenActionHealth();
    const formHealth = parts.formHealth || getPhaseTenFormHealth();
    const safeHelperHealth = parts.safeHelperHealth || getPostStabilizationSafeHelperHealth();
    const ladaPerformanceHealth = parts.ladaPerformanceHealth || (typeof window.getLadaPerformanceHealth === 'function' ? getLadaPerformanceHealth() : null);
    const supabaseStructureHealth = parts.supabaseStructureHealth || (typeof window.getSupabaseStructureHealth === 'function' ? window.getSupabaseStructureHealth() : null);
    const gameEngineHealth = parts.gameEngineHealth || (typeof window.getGameEngineBaselineHealth === 'function' ? window.getGameEngineBaselineHealth() : null);
    const releaseReadinessHealth = parts.releaseReadinessHealth || readRakAuditDiagnostic('releaseReadiness', 'getRakReleaseReadinessHealth');
    const architectureBaselineHealth = parts.architectureBaselineHealth || readRakAuditDiagnostic('architectureBaseline', 'getRakArchitectureBaselineHealth');
    const moduleReadinessHealth = parts.moduleReadinessHealth || readRakAuditDiagnostic('health', 'getRakModuleReadinessHealth');
    const runtimeGuardHealth = parts.runtimeGuardHealth || readRakAuditDiagnostic('runtimeGuard', 'getRakRuntimeGuardHealth');
    const namespaceHealth = parts.namespaceHealth || readRakAuditDiagnostic('namespace', 'getRakNamespaceHealth');

    addCheck('verze aplikace', /^v\.\d+\.\d+ \(\d+\)$/.test(version) && (!appVersion || appVersion === version));
    addCheck('Fáze 9 security/render', !!securityStatus && Number(securityStatus.phasePercent || 0) >= 100);
    addCheck('PWA/SW hardening', !pwaStatus || !pwaStatus.swVersionMismatch);
    addCheck('data optimalizace', !!dataStatus);
    addCheck('duplicitní DOM ID', duplicateDomIds.length === 0);
    addCheck('localStorage/runtime', !!storageHealth.ok && !!storageHealth.writable);
    addCheck('načtené moduly', !!scriptHealth.ok && Number(scriptHealth.duplicateCount || 0) === 0);
    addCheck('spodní navigace', !!navigationHealth.ok);
    addCheck('page shell', !!pageShellHealth.ok);
    addCheck('data-action/odkazy', !!actionHealth.ok);
    addCheck('formuláře/inputy', !!formHealth.ok);
    addCheck('safe helpery', !!safeHelperHealth.ok);
    addCheck('Láďův režim výkon', !!ladaPerformanceHealth && !!ladaPerformanceHealth.ok);
    addCheck('Supabase struktura', !!supabaseStructureHealth && !!supabaseStructureHealth.ok);
    addCheck('herní engine základ', !!gameEngineHealth && !!gameEngineHealth.ok);
    addCheck('release readiness', !!releaseReadinessHealth && !!releaseReadinessHealth.ok);
    addCheck('architektura/boot baseline', !!architectureBaselineHealth && !!architectureBaselineHealth.ok);
    addCheck('module readiness registry', !!moduleReadinessHealth && !!moduleReadinessHealth.ok);
    addCheck('runtime health guard', !!runtimeGuardHealth && !!runtimeGuardHealth.ok);
    addCheck('RaK namespace bridge', !!namespaceHealth && !!namespaceHealth.ok);
  } catch (err) {
    addCheck(String(err && err.message ? err.message : err || 'runtime readiness error'), false);
  }

  const failed = checks.filter((item) => !item.ok).map((item) => item.name);
  return {
    ok: failed.length === 0,
    passedCount: checks.length - failed.length,
    totalCount: checks.length,
    failedItems: failed.slice(0, 18),
    checks
  };
}
window.getPhaseTenRuntimeReadinessHealth = getPhaseTenRuntimeReadinessHealth;


// Release readiness a architecture baseline helpery jsou v rak-audit-baseline.js; namespace bridge a read-only aliasy jsou v rak-namespace.js.

function getPostStabilizationBaselineHealth(parts = {}) {
  const issues = [];
  const checkedAt = new Date().toISOString();

  try {
    const version = String(parts.version || window.APP_VERSION || '').trim();
    const appVersion = String(parts.appVersion || ((typeof app !== 'undefined' && app && app.version) || '')).trim();
    const finalStatus = parts.finalStatus || ensureFinalStabilizationStatus();
    const runtimeReadinessHealth = parts.runtimeReadinessHealth || getPhaseTenRuntimeReadinessHealth(parts);
    const safeHelperHealth = parts.safeHelperHealth || getPostStabilizationSafeHelperHealth();
    const ladaPerformanceHealth = parts.ladaPerformanceHealth || (typeof window.getLadaPerformanceHealth === 'function' ? getLadaPerformanceHealth() : null);
    const supabaseStructureHealth = parts.supabaseStructureHealth || (typeof window.getSupabaseStructureHealth === 'function' ? window.getSupabaseStructureHealth() : null);
    const gameEngineHealth = parts.gameEngineHealth || (typeof window.getGameEngineBaselineHealth === 'function' ? getGameEngineBaselineHealth() : null);
    const releaseReadinessHealth = parts.releaseReadinessHealth || readRakAuditDiagnostic('releaseReadiness', 'getRakReleaseReadinessHealth');

    if (!/^v\.\d+\.\d+ \(\d+\)$/.test(version)) issues.push('version format');
    if (appVersion && version && appVersion !== version) issues.push('app.version mismatch');
    if (!finalStatus || Number(finalStatus.phasePercent || 0) < 100) issues.push('phase 10 not complete');
    if (!String(finalStatus && finalStatus.auditMode ? finalStatus.auditMode : '').includes('readiness-summary')) issues.push('missing readiness summary mode');
    if (!String(finalStatus && finalStatus.auditMode ? finalStatus.auditMode : '').includes('post-stabilization-baseline-watch')) issues.push('missing post-stabilization watch mode');
    if (!runtimeReadinessHealth || !runtimeReadinessHealth.ok) issues.push('runtime readiness not ok');
    if (!safeHelperHealth || !safeHelperHealth.ok) issues.push('safe helper guard not ok');
    if (!ladaPerformanceHealth || !ladaPerformanceHealth.ok) issues.push('lada performance guard not ok');
    if (!supabaseStructureHealth || !supabaseStructureHealth.ok) issues.push('supabase structure guard not ok');
    if (!gameEngineHealth || !gameEngineHealth.ok) issues.push('game engine baseline not ok');
    if (!releaseReadinessHealth || !releaseReadinessHealth.ok) issues.push('release readiness not ok');
    if (typeof window.getFinalStabilizationStatus !== 'function') issues.push('getFinalStabilizationStatus missing');
    if (typeof window.getPhaseTenRuntimeReadinessHealth !== 'function') issues.push('getPhaseTenRuntimeReadinessHealth missing');
    if (typeof window.getLadaPerformanceHealth !== 'function') issues.push('getLadaPerformanceHealth missing');
    if (typeof window.getSupabaseStructureHealth !== 'function') issues.push('getSupabaseStructureHealth missing');
    if (typeof window.getGameEngineBaselineHealth !== 'function') issues.push('getGameEngineBaselineHealth missing');
    if (typeof window.getRakReleaseReadinessHealth !== 'function') issues.push('getRakReleaseReadinessHealth missing');
  } catch (err) {
    issues.push(String(err && err.message ? err.message : err || 'post-stabilization health error'));
  }

  return {
    ok: issues.length === 0,
    mode: 'post-stabilization-baseline-watch',
    checkedAt,
    issueCount: issues.length,
    issues: issues.slice(0, 12)
  };
}
window.getPostStabilizationBaselineHealth = getPostStabilizationBaselineHealth;

function runPhaseTenFinalStabilizationAudit() {
  const run = () => {
    const status = ensureFinalStabilizationStatus();
    const version = String(window.APP_VERSION || '').trim();
    const appVersion = String((typeof app !== 'undefined' && app && app.version) || '').trim();
    const securityStatus = typeof window.getSecurityRenderStatus === 'function' ? window.getSecurityRenderStatus() : null;
    const pwaStatus = typeof window.getPwaHardeningStatus === 'function' ? window.getPwaHardeningStatus() : null;
    const dataStatus = typeof window.getDataOptimizationStatus === 'function' ? window.getDataOptimizationStatus() : null;
    const missing = [];
    const duplicateDomIds = getPhaseTenDuplicateDomIds();
    const storedErrorLogCount = getPhaseTenErrorLogCount();
    const storageHealth = getPhaseTenStorageHealth();
    const scriptHealth = getPhaseTenScriptLoadHealth();
    const navigationHealth = getPhaseTenNavigationHealth();
    const pageShellHealth = getPhaseTenPageShellHealth();
    const actionHealth = getPhaseTenActionHealth();
    const formHealth = getPhaseTenFormHealth();
    const safeHelperHealth = getPostStabilizationSafeHelperHealth();
    const ladaPerformanceHealth = getLadaPerformanceHealth();
    const supabaseStructureHealth = typeof window.getSupabaseStructureHealth === 'function' ? window.getSupabaseStructureHealth() : null;
    const gameEngineHealth = typeof window.getGameEngineBaselineHealth === 'function' ? window.getGameEngineBaselineHealth() : null;
    const releaseReadinessHealth = readRakAuditDiagnostic('releaseReadiness', 'getRakReleaseReadinessHealth');
    const runtimeReadinessHealth = getPhaseTenRuntimeReadinessHealth({
      version,
      appVersion,
      securityStatus,
      pwaStatus,
      dataStatus,
      duplicateDomIds,
      storageHealth,
      scriptHealth,
      navigationHealth,
      pageShellHealth,
      actionHealth,
      formHealth,
      safeHelperHealth,
      ladaPerformanceHealth,
      supabaseStructureHealth,
      gameEngineHealth,
      releaseReadinessHealth
    });
    const postStabilizationHealth = getPostStabilizationBaselineHealth({
      version,
      appVersion,
      finalStatus: status,
      runtimeReadinessHealth,
      safeHelperHealth,
      ladaPerformanceHealth,
      supabaseStructureHealth,
      gameEngineHealth,
      releaseReadinessHealth
    });

    const requiredDom = ['home', 'kalkulacky', 'rotace', 'rotaceStatsPanel', 'games'];
    requiredDom.forEach((id) => {
      if (!document.getElementById(id)) missing.push('DOM #' + id);
    });
    if (!document.querySelector('.bottomNav')) missing.push('DOM .bottomNav');

    const requiredFns = [
      'setElementTextIfChanged',
      'setElementHtmlIfChanged',
      'setElementChildrenIfChanged',
      'replaceElementChildrenSafely',
      'clearElementChildrenSafely',
      'normalizeSafeExternalUrl',
      'normalizeAllowedExternalUrl',
      'setSafeExternalAnchor',
      'getSecurityRenderStatus',
      'getDataOptimizationStatus',
      'getPhaseTenStorageHealth',
      'getPhaseTenScriptLoadHealth',
      'getPhaseTenNavigationHealth',
      'getPhaseTenPageShellHealth',
      'getPhaseTenActionHealth',
      'getPhaseTenFormHealth',
      'getPhaseTenRuntimeReadinessHealth',
      'getPostStabilizationSafeHelperHealth',
      'getPostStabilizationBaselineHealth',
      'getLadaPerformanceHealth',
      'getSupabaseStructureHealth',
      'runLadaPerformanceAudit',
      'getGameEngineBaselineHealth',
      'runGameEngineBaselineAudit',
      'setupRakGameEngineLifecycleBindings',
    'getRakModuleReadinessHealth',
    'getRakRuntimeGuardHealth',
    'getRakStatsYearScopeHealth',
    'getRakDomActionRegistryHealth',
      'getRakDomActionSmokeReport'
    ];
    requiredFns.forEach((name) => {
      if (typeof window[name] !== 'function') missing.push('fn ' + name);
    });

    if (duplicateDomIds.length) missing.push('duplicate DOM ids: ' + duplicateDomIds.slice(0, 8).join(', '));
    if (!storageHealth.ok || !storageHealth.writable) missing.push('localStorage health');
    if (!scriptHealth.ok) missing.push('script load health');
    if (!navigationHealth.ok) missing.push('navigation health');
    if (!pageShellHealth.ok) missing.push('page shell health');
    if (!actionHealth.ok) missing.push('action/link health');
    if (!formHealth.ok) missing.push('form/input health');
    if (!safeHelperHealth.ok) missing.push('safe helper guard');
    if (!ladaPerformanceHealth.ok) missing.push('Láďův režim performance guard');
    if (!gameEngineHealth || !gameEngineHealth.ok) missing.push('game engine baseline');
    if (!runtimeReadinessHealth.ok) missing.push('runtime readiness summary');
    if (!postStabilizationHealth.ok) missing.push('post-stabilization baseline watch');
    if (!/^v\.\d+\.\d+ \(\d+\)$/.test(version)) missing.push('version format');
    if (appVersion && version && appVersion !== version) missing.push('app.version mismatch');
    if (!securityStatus || Number(securityStatus.phasePercent || 0) < 100) missing.push('phase9 security status');
    if (!dataStatus) missing.push('phase7 data status');
    if (pwaStatus && pwaStatus.swExpectedCacheVersion && pwaStatus.swCacheVersion && pwaStatus.swVersionMismatch) {
      missing.push('service worker cache version mismatch');
    }

    const report = {
      version: version || 'unknown',
      appVersion: appVersion || 'unknown',
      phase: 'phase-10-final-stabilization',
      phasePercent: 100,
      checkedAt: new Date().toISOString(),
      ok: missing.length === 0,
      missing,
      currentPage: String(document.querySelector('.page.active')?.id || ''),
      securityPhasePercent: securityStatus ? Number(securityStatus.phasePercent || 0) : 0,
      pwaPhasePercent: pwaStatus ? Number(pwaStatus.phasePercent || 0) : 0,
      pwaVersionMismatch: !!(pwaStatus && pwaStatus.swVersionMismatch),
      dataOptimizationReady: !!dataStatus,
      duplicateDomIds,
      duplicateDomIdCount: duplicateDomIds.length,
      errorLogCount: storedErrorLogCount,
      storageOk: !!storageHealth.ok,
      storageWritable: !!storageHealth.writable,
      storageItemCount: Number(storageHealth.itemCount || 0),
      largeStorageKeys: Array.isArray(storageHealth.largeKeys) ? storageHealth.largeKeys : [],
      largeStorageKeyCount: Array.isArray(storageHealth.largeKeys) ? storageHealth.largeKeys.length : 0,
      storageError: String(storageHealth.error || ''),
      navigatorOnline: storageHealth.navigatorOnline !== false,
      visibilityState: String(storageHealth.visibilityState || 'unknown'),
      scriptHealthOk: !!scriptHealth.ok,
      scriptExpectedCount: Number(scriptHealth.expectedCount || 0),
      scriptLoadedExpectedCount: Number(scriptHealth.loadedExpectedCount || 0),
      scriptMissingFiles: Array.isArray(scriptHealth.missing) ? scriptHealth.missing : [],
      scriptMissingCount: Array.isArray(scriptHealth.missing) ? scriptHealth.missing.length : 0,
      scriptDuplicateFiles: Array.isArray(scriptHealth.duplicateFiles) ? scriptHealth.duplicateFiles : [],
      scriptDuplicateCount: Number(scriptHealth.duplicateCount || 0),
      scriptUnexpectedLocalJs: Array.isArray(scriptHealth.unexpectedLocalJs) ? scriptHealth.unexpectedLocalJs : [],
      scriptUnexpectedLocalJsCount: Number(scriptHealth.unexpectedLocalJsCount || 0),
      navigationHealthOk: !!navigationHealth.ok,
      navigationButtonCount: Number(navigationHealth.buttonCount || 0),
      navigationActiveCount: Number(navigationHealth.activeCount || 0),
      navigationBound: !!navigationHealth.bound,
      navigationActivePage: String(navigationHealth.activePageId || ''),
      navigationMissingItems: Array.isArray(navigationHealth.missing) ? navigationHealth.missing : [],
      navigationMissingCount: Array.isArray(navigationHealth.missing) ? navigationHealth.missing.length : 0,
      pageShellHealthOk: !!pageShellHealth.ok,
      pageShellPageCount: Number(pageShellHealth.pageCount || 0),
      pageShellActiveCount: Number(pageShellHealth.activePageCount || 0),
      pageShellActivePage: String(pageShellHealth.activePageId || ''),
      pageShellCriticalPanelCount: Number(pageShellHealth.criticalPanelCount || 0),
      pageShellMissingItems: Array.isArray(pageShellHealth.missing) ? pageShellHealth.missing : [],
      pageShellMissingCount: Array.isArray(pageShellHealth.missing) ? pageShellHealth.missing.length : 0,
      actionHealthOk: !!actionHealth.ok,
      actionCount: Number(actionHealth.actionCount || 0),
      actionDelegatedAllowedCount: Number(actionHealth.delegatedAllowedCount || 0),
      actionNavAllowedCount: Number(actionHealth.navAllowedCount || 0),
      actionChangeAllowedCount: Number(actionHealth.changeAllowedCount || 0),
      actionUnknownItems: Array.isArray(actionHealth.unknownActions) ? actionHealth.unknownActions : [],
      actionUnknownCount: Array.isArray(actionHealth.unknownActions) ? actionHealth.unknownActions.length : 0,
      actionRequiredMissingItems: Array.isArray(actionHealth.requiredMissing) ? actionHealth.requiredMissing : [],
      actionRequiredMissingCount: Array.isArray(actionHealth.requiredMissing) ? actionHealth.requiredMissing.length : 0,
      actionMissingTargetItems: Array.isArray(actionHealth.missingTargets) ? actionHealth.missingTargets : [],
      actionMissingTargetsCount: Array.isArray(actionHealth.missingTargets) ? actionHealth.missingTargets.length : 0,
      actionLinkIssues: Array.isArray(actionHealth.linkIssues) ? actionHealth.linkIssues : [],
      actionLinkIssueCount: Array.isArray(actionHealth.linkIssues) ? actionHealth.linkIssues.length : 0,
      formHealthOk: !!formHealth.ok,
      formInputCount: Number(formHealth.inputCount || 0),
      formSelectCount: Number(formHealth.selectCount || 0),
      formButtonCount: Number(formHealth.buttonCount || 0),
      formRequiredMissingItems: Array.isArray(formHealth.requiredMissing) ? formHealth.requiredMissing : [],
      formRequiredMissingCount: Array.isArray(formHealth.requiredMissing) ? formHealth.requiredMissing.length : 0,
      formActionMissingItems: Array.isArray(formHealth.actionMissing) ? formHealth.actionMissing : [],
      formActionMissingCount: Array.isArray(formHealth.actionMissing) ? formHealth.actionMissing.length : 0,
      formInvalidNumberItems: Array.isArray(formHealth.invalidNumberInputs) ? formHealth.invalidNumberInputs : [],
      formInvalidNumberCount: Array.isArray(formHealth.invalidNumberInputs) ? formHealth.invalidNumberInputs.length : 0,
      runtimeReadinessOk: !!runtimeReadinessHealth.ok,
      runtimeReadinessPassedCount: Number(runtimeReadinessHealth.passedCount || 0),
      runtimeReadinessTotalCount: Number(runtimeReadinessHealth.totalCount || 0),
      runtimeReadinessFailedItems: Array.isArray(runtimeReadinessHealth.failedItems) ? runtimeReadinessHealth.failedItems : [],
      safeHelperHealthOk: !!safeHelperHealth.ok,
      safeHelperCount: Number(safeHelperHealth.helperCount || 0),
      safeHelperMissingCount: Number(safeHelperHealth.missingCount || 0),
      safeHelperMissingItems: Array.isArray(safeHelperHealth.missing) ? safeHelperHealth.missing : [],
      ladaPerformanceOk: !!ladaPerformanceHealth.ok,
      ladaPerformanceMode: String(ladaPerformanceHealth.mode || '—'),
      ladaPerformanceActive: !!ladaPerformanceHealth.active,
      ladaPerformanceDprLimit: Number(ladaPerformanceHealth.dprLimit || 0),
      ladaPerformanceMaxBlurPx: Number(ladaPerformanceHealth.maxBlurPx || 0),
      ladaPerformanceAnimatedSampleCount: Number(ladaPerformanceHealth.animatedSampleCount || 0),
      ladaPerformanceIssueCount: Array.isArray(ladaPerformanceHealth.issues) ? ladaPerformanceHealth.issues.length : 0,
      ladaPerformanceIssues: Array.isArray(ladaPerformanceHealth.issues) ? ladaPerformanceHealth.issues : [],
      supabaseStructureOk: !!(supabaseStructureHealth && supabaseStructureHealth.ok),
      supabaseStructureMode: String(supabaseStructureHealth && supabaseStructureHealth.mode || '—'),
      supabaseStructureTableCount: Number(supabaseStructureHealth && supabaseStructureHealth.expectedTableCount || 0),
      supabaseStructureRealtimeTableCount: Number(supabaseStructureHealth && supabaseStructureHealth.realtimeTableCount || 0),
      supabaseStructureMissingRealtimeTableCount: Number(supabaseStructureHealth && supabaseStructureHealth.missingRealtimeTableCount || 0),
      supabaseStructureMissingQueueTypeCount: Number(supabaseStructureHealth && supabaseStructureHealth.missingQueueTypeCount || 0),
      supabaseStructureMissingHelperCount: Number(supabaseStructureHealth && supabaseStructureHealth.missingHelperCount || 0),
      supabaseStructureGrantSignalCount: Number(supabaseStructureHealth && supabaseStructureHealth.grantSignalCount || 0),
      supabaseStructureIssueCount: Array.isArray(supabaseStructureHealth && supabaseStructureHealth.issues) ? supabaseStructureHealth.issues.length : 0,
      supabaseStructureIssues: Array.isArray(supabaseStructureHealth && supabaseStructureHealth.issues) ? supabaseStructureHealth.issues : [],
      gameEngineHealthOk: !!(gameEngineHealth && gameEngineHealth.ok),
      gameEngineMode: String(gameEngineHealth && gameEngineHealth.mode || '—'),
      gameEngineActiveGame: String(gameEngineHealth && gameEngineHealth.activeGame || ''),
      gameEngineManagedLoopCount: Number(gameEngineHealth && gameEngineHealth.managedLoopCount || 0),
      gameEngineLifecycleEvents: Number(gameEngineHealth && gameEngineHealth.lifecycleEvents || 0),
      gameEngineIssueCount: Array.isArray(gameEngineHealth && gameEngineHealth.issues) ? gameEngineHealth.issues.length : 0,
      gameEngineIssues: Array.isArray(gameEngineHealth && gameEngineHealth.issues) ? gameEngineHealth.issues : [],
      postStabilizationOk: !!postStabilizationHealth.ok,
      postStabilizationMode: String(postStabilizationHealth.mode || '—'),
      postStabilizationCheckedAt: String(postStabilizationHealth.checkedAt || ''),
      postStabilizationIssueCount: Number(postStabilizationHealth.issueCount || 0),
      postStabilizationIssues: Array.isArray(postStabilizationHealth.issues) ? postStabilizationHealth.issues : []
    };

    status.audits = Number(status.audits || 0) + 1;
    status.lastAuditOk = report.ok;
    status.lastMissingCount = missing.length;
    status.lastMissingItems = missing.slice(0, 12);
    status.lastCheckedAt = report.checkedAt;
    status.lastVersion = report.version;
    status.lastPage = report.currentPage || '—';
    status.lastPhase9Percent = report.securityPhasePercent;
    status.lastPhase8Percent = report.pwaPhasePercent;
    status.lastPwaVersionMismatch = report.pwaVersionMismatch;
    status.lastDataOptimizationReady = report.dataOptimizationReady;
    status.lastDuplicateIdCount = report.duplicateDomIdCount;
    status.lastDuplicateIds = report.duplicateDomIds.slice(0, 12);
    status.lastErrorLogCount = report.errorLogCount;
    status.lastStorageOk = report.storageOk && report.storageWritable;
    status.lastStorageItemCount = report.storageItemCount;
    status.lastLargeStorageKeyCount = report.largeStorageKeyCount;
    status.lastLargeStorageKeys = report.largeStorageKeys.slice(0, 8);
    status.lastNavigatorOnline = report.navigatorOnline;
    status.lastVisibilityState = report.visibilityState;
    status.lastScriptHealthOk = report.scriptHealthOk;
    status.lastScriptMissingCount = report.scriptMissingCount;
    status.lastScriptDuplicateCount = report.scriptDuplicateCount;
    status.lastScriptUnexpectedCount = report.scriptUnexpectedLocalJsCount;
    status.lastScriptMissingFiles = report.scriptMissingFiles.slice(0, 12);
    status.lastScriptDuplicateFiles = report.scriptDuplicateFiles.slice(0, 12);
    status.lastNavigationHealthOk = report.navigationHealthOk;
    status.lastNavigationButtonCount = report.navigationButtonCount;
    status.lastNavigationActiveCount = report.navigationActiveCount;
    status.lastNavigationMissingCount = report.navigationMissingCount;
    status.lastNavigationMissingItems = report.navigationMissingItems.slice(0, 12);
    status.lastPageShellHealthOk = report.pageShellHealthOk;
    status.lastPageShellPageCount = report.pageShellPageCount;
    status.lastPageShellActiveCount = report.pageShellActiveCount;
    status.lastPageShellCriticalPanelCount = report.pageShellCriticalPanelCount;
    status.lastPageShellMissingCount = report.pageShellMissingCount;
    status.lastPageShellMissingItems = report.pageShellMissingItems.slice(0, 12);
    status.lastActionHealthOk = report.actionHealthOk;
    status.lastActionCount = report.actionCount;
    status.lastActionUnknownCount = report.actionUnknownCount;
    status.lastActionRequiredMissingCount = report.actionRequiredMissingCount;
    status.lastActionMissingTargetsCount = report.actionMissingTargetsCount;
    status.lastActionLinkIssueCount = report.actionLinkIssueCount;
    status.lastActionUnknownItems = report.actionUnknownItems.slice(0, 12);
    status.lastActionRequiredMissingItems = report.actionRequiredMissingItems.slice(0, 12);
    status.lastActionMissingTargetItems = report.actionMissingTargetItems.slice(0, 12);
    status.lastActionLinkIssues = report.actionLinkIssues.slice(0, 12);
    status.lastFormHealthOk = report.formHealthOk;
    status.lastFormInputCount = report.formInputCount;
    status.lastFormSelectCount = report.formSelectCount;
    status.lastFormButtonCount = report.formButtonCount;
    status.lastFormRequiredMissingCount = report.formRequiredMissingCount;
    status.lastFormActionMissingCount = report.formActionMissingCount;
    status.lastFormInvalidNumberCount = report.formInvalidNumberCount;
    status.lastFormRequiredMissingItems = report.formRequiredMissingItems.slice(0, 12);
    status.lastFormActionMissingItems = report.formActionMissingItems.slice(0, 12);
    status.lastFormInvalidNumberItems = report.formInvalidNumberItems.slice(0, 12);
    status.lastRuntimeReadinessOk = report.runtimeReadinessOk;
    status.lastRuntimeReadinessPassedCount = report.runtimeReadinessPassedCount;
    status.lastRuntimeReadinessTotalCount = report.runtimeReadinessTotalCount;
    status.lastRuntimeReadinessFailedItems = report.runtimeReadinessFailedItems.slice(0, 12);
    status.lastSafeHelperHealthOk = report.safeHelperHealthOk;
    status.lastSafeHelperCount = report.safeHelperCount;
    status.lastSafeHelperMissingCount = report.safeHelperMissingCount;
    status.lastSafeHelperMissingItems = report.safeHelperMissingItems.slice(0, 12);
    status.lastLadaPerformanceOk = report.ladaPerformanceOk;
    status.lastLadaPerformanceMode = report.ladaPerformanceMode;
    status.lastLadaPerformanceActive = report.ladaPerformanceActive;
    status.lastLadaPerformanceDprLimit = report.ladaPerformanceDprLimit;
    status.lastLadaPerformanceMaxBlurPx = report.ladaPerformanceMaxBlurPx;
    status.lastLadaPerformanceAnimatedSampleCount = report.ladaPerformanceAnimatedSampleCount;
    status.lastLadaPerformanceIssueCount = report.ladaPerformanceIssueCount;
    status.lastLadaPerformanceIssues = report.ladaPerformanceIssues.slice(0, 12);
    status.lastSupabaseStructureOk = report.supabaseStructureOk;
    status.lastSupabaseStructureMode = report.supabaseStructureMode;
    status.lastSupabaseStructureTableCount = report.supabaseStructureTableCount;
    status.lastSupabaseStructureIssueCount = report.supabaseStructureIssueCount;
    status.lastSupabaseStructureIssues = report.supabaseStructureIssues.slice(0, 12);
    status.lastGameEngineHealthOk = report.gameEngineHealthOk;
    status.lastGameEngineMode = report.gameEngineMode;
    status.lastGameEngineActiveGame = report.gameEngineActiveGame;
    status.lastGameEngineManagedLoopCount = report.gameEngineManagedLoopCount;
    status.lastGameEngineLifecycleEvents = report.gameEngineLifecycleEvents;
    status.lastGameEngineIssueCount = report.gameEngineIssueCount;
    status.lastGameEngineIssues = report.gameEngineIssues.slice(0, 12);
    status.lastPostStabilizationOk = report.postStabilizationOk;
    status.lastPostStabilizationMode = report.postStabilizationMode;
    status.lastPostStabilizationCheckedAt = report.postStabilizationCheckedAt;
    status.lastPostStabilizationIssueCount = report.postStabilizationIssueCount;
    status.lastPostStabilizationIssues = report.postStabilizationIssues.slice(0, 12);
    status.lastAudit = report;

    try {
      document.documentElement.dataset.rakPhase10 = report.ok ? 'final-stabilization-complete' : 'final-stabilization-check';
      window.__rakPhase10FinalStabilizationAudit = report;
    } catch (err) {}

    if (!report.ok) {
      console.warn('[RaK] Phase 10 final stabilization audit', report);
      try {
        const log = JSON.parse(localStorage.getItem('rotace_err_log_v1') || '[]');
        log.push({
          ts: report.checkedAt,
          ver: report.version,
          type: 'phase10-final-stabilization-audit',
          missing: report.missing
        });
        localStorage.setItem('rotace_err_log_v1', JSON.stringify(log.slice(-50)));
      } catch (err) {}
    }

    return report;
  };

  if (document.readyState === 'loading') {
    const rerun = () => setTimeout(run, 360);
    if (typeof registerListener === 'function') registerListener(document, 'DOMContentLoaded', rerun, { once: true });
    else document.addEventListener('DOMContentLoaded', rerun, { once: true });
    return { version: window.APP_VERSION || 'unknown', phase: 'phase-10-final-stabilization', phasePercent: 100, ok: true, deferred: true };
  }

  requestAnimationFrame(() => setTimeout(run, 360));
  return { version: window.APP_VERSION || 'unknown', phase: 'phase-10-final-stabilization', phasePercent: 100, ok: true, deferred: true };
}
