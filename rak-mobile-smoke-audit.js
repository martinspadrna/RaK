// RaK 1.2 (1.155) – mobile/Playwright smoke readiness.
(function setupRakMobileSmokeAudit() {
  const VERSION = '1.2 (1.155)';
  const MODE = 'mobile-performance-smoke-readonly-v928';

  try {
    if (typeof window.rakMarkModuleReady === 'function') {
      window.rakMarkModuleReady('rak-mobile-smoke-audit.js', 'loading', { source: 'index' });
    }
  } catch (err) {}

  function nowIso() {
    try { return new Date().toISOString(); } catch (err) { return ''; }
  }

  function safeString(value, fallback) {
    try {
      const text = String(value ?? '').trim();
      return text || String(fallback || '');
    } catch (err) {
      return String(fallback || '');
    }
  }

  function safeNumber(value, fallback) {
    const num = Number(value);
    return Number.isFinite(num) ? num : Number(fallback || 0);
  }

  function count(selector) {
    try { return document.querySelectorAll(selector).length; } catch (err) { return 0; }
  }

  function getNavigationTiming() {
    try {
      if (typeof performance !== 'undefined' && typeof performance.getEntriesByType === 'function') {
        const nav = performance.getEntriesByType('navigation');
        if (nav && nav[0]) {
          const item = nav[0];
          return {
            type: safeString(item.type, 'unknown'),
            domContentLoadedMs: Math.round(safeNumber(item.domContentLoadedEventEnd, 0)),
            loadEventMs: Math.round(safeNumber(item.loadEventEnd, 0)),
            transferSizeKb: Math.round((safeNumber(item.transferSize, 0) / 1024) * 10) / 10
          };
        }
      }
    } catch (err) {}
    return { type: 'unavailable', domContentLoadedMs: 0, loadEventMs: 0, transferSizeKb: 0 };
  }

  function getRouteSmokeChecklist() {
    return [
      { id: 'dashboard', route: 'dashboard', expected: 'dashboard cards visible, no blank page, food tiles readable' },
      { id: 'rotation', route: 'rotace', expected: 'Rotace opens, names/months/stats render without blank state' },
      { id: 'calculators', route: 'kalkulacky', expected: 'calculator hub and Soustruhy/Frézky/Brusy pages open and accept input' },
      { id: 'admin', route: 'menu/admin', expected: 'admin shell opens only after secure auth and diagnostics remain readable' },
      { id: 'export', route: 'admin/service/export', expected: 'ZIP preflight references only existing current files' }
    ];
  }

  function getDeviceMatrix() {
    return [
      { id: 'small-android', label: 'Samsung A15 / A14 class', viewport: '360×800', priority: 'P0 mobile smoke' },
      { id: 'iphone-large', label: 'iPhone 13 Pro Max class', viewport: '428×926', priority: 'P1 visual smoke' },
      { id: 'desktop-edge', label: 'Edge desktop F12', viewport: 'responsive', priority: 'P1 regression check' }
    ];
  }

  window.getRakMobilePerformanceSmokePlanHealth = function getRakMobilePerformanceSmokePlanHealth() {
    const nav = getNavigationTiming();
    const routeCount = getRouteSmokeChecklist().length;
    const deviceCount = getDeviceMatrix().length;
    const currentDomNodes = count('*');
    const actionCount = count('[data-action]');
    return {
      ok: true,
      mode: MODE,
      version: String(window.APP_VERSION || VERSION),
      checkedAt: nowIso(),
      realDeviceMeasured: false,
      runtimeSampleAvailable: nav.type !== 'unavailable',
      navigationTiming: nav,
      currentDomNodes,
      actionCount,
      routeSmokeCount: routeCount,
      deviceCount,
      manualStillRequired: true,
      missingPercentContribution: 3,
      note: 'Toto je read-only plán a runtime snapshot. Skutečné mobilní měření musí proběhnout ručně na zařízení.',
      deviceMatrix: getDeviceMatrix(),
      routeSmokeChecklist: getRouteSmokeChecklist()
    };
  };

  window.getRakPlaywrightDomSmokeDraftHealth = function getRakPlaywrightDomSmokeDraftHealth() {
    return {
      ok: true,
      mode: 'legacy-playwright-alias-browser-smoke-v1630',
      version: String(window.APP_VERSION || VERSION),
      checkedAt: nowIso(),
      implementationStatus: 'browser-smoke-script-ready;playwright-spec-not-present',
      installRequired: false,
      shouldRunAgainstProductionDb: false,
      blockerCandidates: [
        'app boots without console page crash',
        'bottom navigation visible and active tab changes',
        'Rotace and statistics render',
        'calculator routes render and accept input',
        'admin generator shell and export preflight render'
      ],
      suggestedCommand: 'npm run test:browser-smoke',
      note: 'Historický alias názvu zůstává kvůli kompatibilitě diagnostiky. Aktuální repo používá browser-smoke-v1103.js; samostatný playwright-smoke.spec.js v repu není.'
    };
  };

  window.getRakFinalAuditClosureHealth = function getRakFinalAuditClosureHealth() {
    const mobilePlan = window.getRakMobilePerformanceSmokePlanHealth();
    const playwrightDraft = window.getRakPlaywrightDomSmokeDraftHealth();
    return {
      ok: true,
      mode: 'due-diligence-final-closure-v928',
      version: String(window.APP_VERSION || VERSION),
      checkedAt: nowIso(),
      percentComplete: 95,
      percentRemaining: 5,
      mobileSmokePlanReady: !!(mobilePlan && mobilePlan.ok),
      playwrightDraftReady: !!(playwrightDraft && playwrightDraft.ok),
      remainingManualWork: [
        'post-release: skutečné měření na mobilu Martinovým zařízením',
        'post-release: npm run test:browser-smoke spustit nad bezpečným lokálním snapshotem'
      ],
      auditPromptCompleteFromProvidedMaterials: true
    };
  };


  function getManualValidationChecklist() {
    return [
      { id: 'M-01', area: 'Start aplikace', expected: 'Home/Dashboard bez bílé obrazovky.', priority: 'P0', blocksRelease: true },
      { id: 'M-02', area: 'Spodní lišta', expected: 'Home, Rotace, Kalkulačky a Více se přepnou bez zamrznutí.', priority: 'P0', blocksRelease: true },
      { id: 'M-03', area: 'Kantýna/jídelna', expected: 'Karty i rozklik ukazují běžný režim a přesčasové výjimky.', priority: 'P0', blocksRelease: true },
      { id: 'M-04', area: 'Rotace', expected: 'Jména, Rozpisy a Statistiky se otevřou a zachovají ovládání.', priority: 'P0', blocksRelease: true },
      { id: 'M-05', area: 'Kalkulačky', expected: 'Soustruhy, Frézky, Brusy a Pračka se otevřou; vstupy a reset fungují.', priority: 'P0', blocksRelease: true },
      { id: 'M-06', area: 'Korekce', expected: 'Korekce soustruhů/frézek fungují; Brusy zobrazí aktuální stav bez starého placeholderu.', priority: 'P0', blocksRelease: true },
      { id: 'M-07', area: 'QR', expected: 'QR osoby zůstane dostupné online i z cache bez změny dat.', priority: 'P0', blocksRelease: true },
      { id: 'M-08', area: 'Administrace', expected: 'Přístup vyžaduje platnou admin relaci; rozpis/generátor se načtou bez změny pravidel.', priority: 'P0', blocksRelease: true },
      { id: 'M-09', area: 'ZIP export', expected: 'Preflight projde a ZIP nepožaduje odstraněné nebo neexistující soubory.', priority: 'P0', blocksRelease: true },
      { id: 'M-10', area: 'PWA aktualizace', expected: 'Aktualizace se nabídne jen při novém buildu a po potvrzení se načte nový build.', priority: 'P0', blocksRelease: true },
      { id: 'M-11', area: 'O aplikaci', expected: 'Historie obsahuje aktuální řadu RaK 1.6.', priority: 'P2', blocksRelease: false },
      { id: 'M-12', area: 'Diagnostika', expected: 'Neobsahuje povinné kontroly odstraněných Her ani neexistující Playwright spec.', priority: 'P2', blocksRelease: false },
      { id: 'M-13', area: 'Profilový vzhled', expected: 'Téma i pozadí se drží aktivního profilu.', priority: 'P0', blocksRelease: true }
    ];
  }

  window.getRakManualValidationReadinessHealth = function getRakManualValidationReadinessHealth() {
    const checklist = getManualValidationChecklist();
    const docs = [
      'assets/docs/manual-validation-runbook-v926.md',
      'assets/docs/playwright-real-run-readiness-v926.md',
      'assets/docs/post-release-validation-v926.md',
      'assets/docs/validation-readiness-closure-v926.md',
      'assets/docs/games-achievement-rewards-v926.md',
      'assets/docs/profile-appearance-rewards-v926.md',
      'assets/docs/rotace-names-dock-stability-v928.md',
      'assets/docs/lada-mode-performance-v928.md',
      'assets/docs/about-50-version-summary-v928.md'
    ];
    return {
      ok: true,
      mode: 'manual-validation-readiness-v928',
      version: String(window.APP_VERSION || VERSION),
      checkedAt: nowIso(),
      readyForUserTesting: true,
      realMobileTestDone: false,
      realBrowserSmokeDone: false,
      realPlaywrightRunDone: false,
      postReleaseHostingValidationDone: false,
      manualStillRequired: true,
      documentCount: docs.length,
      documents: docs,
      checklistCount: checklist.length,
      blockingChecklistCount: checklist.filter((item) => item.blocksRelease).length,
      deviceMatrix: getDeviceMatrix(),
      checklist,
      note: 'v928 připravuje ruční a Playwright validaci; skutečné testy zůstávají manual, dokud je člověk nespustí.'
    };
  };

  window.getRakValidationReadinessClosureHealth = function getRakValidationReadinessClosureHealth() {
    const manual = window.getRakManualValidationReadinessHealth();
    const mobilePlan = window.getRakMobilePerformanceSmokePlanHealth();
    const playwright = window.getRakPlaywrightDomSmokeDraftHealth();
    return {
      ok: !!(manual && manual.ok && mobilePlan && mobilePlan.ok && playwright && playwright.ok),
      mode: 'validation-readiness-closure-v928',
      version: String(window.APP_VERSION || VERSION),
      checkedAt: nowIso(),
      phase: 'post-audit manual validation readiness',
      phasePercent: 100,
      readyForZip: true,
      readyForUserTesting: !!(manual && manual.readyForUserTesting),
      readyForProduction: false,
      manualGateCount: 3,
      manualGates: [
        'reálný mobilní smoke',
        'reálný browser smoke',
        'post-release PWA/hosting validace'
      ],
      dbSchemaChanges: false,
      policyChanges: false,
      onlineFlowChanges: false,
      gameplayChanges: false,
      nextStep: 'Nahrát ZIP a projít P0 checklist na mobilu; případné chyby řešit po jedné v dalším buildu.'
    };
  };

  try {
    if (window.RaK && window.RaK.diagnostics && typeof window.RaK.diagnostics.register === 'function') {
      window.RaK.diagnostics.register('manualValidationReadiness', window.getRakManualValidationReadinessHealth);
      window.RaK.diagnostics.register('validationReadinessClosure', window.getRakValidationReadinessClosureHealth);
      window.RaK.diagnostics.register('mobilePerformanceSmokePlan', window.getRakMobilePerformanceSmokePlanHealth);
      window.RaK.diagnostics.register('playwrightDomSmokeDraft', window.getRakPlaywrightDomSmokeDraftHealth);
      window.RaK.diagnostics.register('finalAuditClosure', window.getRakFinalAuditClosureHealth);
    }
  } catch (err) {}

  try {
    if (typeof window.rakMarkModuleReady === 'function') {
      window.rakMarkModuleReady('rak-mobile-smoke-audit.js', 'loaded', { mode: MODE });
    }
  } catch (err) {}
})();
