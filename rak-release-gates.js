// RaK 1.2 (1.155) – release gates a checklist vrstva.

(function setupRakReleaseGates() {
  const started = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  const VERSION = '1.2 (1.155)';
  const MODE = 'release-gates-readonly-v929';

  try {
    if (typeof window.rakMarkModuleReady === 'function') {
      window.rakMarkModuleReady('rak-release-gates.js', 'loading', { source: 'index' });
    }
  } catch (err) {}

  function nowIso() {
    try { return new Date().toISOString(); } catch (err) { return ''; }
  }

  function safeString(value, fallback) {
    try {
      const str = String(value ?? '').trim();
      return str || String(fallback || '');
    } catch (err) {
      return String(fallback || '');
    }
  }

  function readDiag(alias, fallbackGlobalName) {
    try {
      if (window.RaK && window.RaK.diagnostics && typeof window.RaK.diagnostics.readWithFallback === 'function') {
        const result = window.RaK.diagnostics.readWithFallback(alias, fallbackGlobalName);
        if (result) return result;
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
      return { ok: false, error: safeString(err && err.message ? err.message : err) };
    }
  }

  function makeGate(id, label, status, severity, evidence, action, source) {
    const safeStatus = ['ok', 'warning', 'blocker', 'manual'].includes(String(status || '')) ? String(status) : 'warning';
    return {
      id: safeString(id, 'unknown'),
      label: safeString(label, id),
      status: safeStatus,
      ok: safeStatus === 'ok' || safeStatus === 'manual',
      severity: safeString(severity || safeStatus, safeStatus),
      evidence: safeString(evidence, '—').slice(0, 260),
      action: safeString(action, 'Zkontrolovat v Diagnostice.').slice(0, 320),
      source: safeString(source, 'runtime')
    };
  }

  function okStatus(value, warningWhenMissing) {
    if (!value) return warningWhenMissing ? 'warning' : 'blocker';
    return value.ok === false ? 'warning' : 'ok';
  }

  function collectReleaseGateSignals() {
    const releaseOpsChecklist = readDiag('releaseOpsChecklist', 'getRakReleaseOpsChecklistHealth');
    const releaseOpsClosure = readDiag('releaseOpsClosure', 'getRakReleaseOpsClosureHealth');
    const appSecPrivacyClosure = readDiag('appSecPrivacyClosure', 'getRakAppSecPrivacyClosureHealth');
    const onlineGameContractClosure = readDiag('onlineGameContractClosure', 'getRakOnlineGameContractClosureHealth');
    const storageSyncClosure = readDiag('storageSyncClosure', 'getRakStorageSyncClosureHealth');
    const supabaseQueueClosure = readDiag('supabaseQueueClosure', 'getRakSupabaseQueueClosureHealth');
    const domActionClosure = readDiag('domActionClosure', 'getRakDomActionRegistryClosureHealth');
    const foodSundayGuard = readDiag('foodSundayGuard', 'getFoodScheduleSundayGuardHealth');
    const exportReleaseTooling = readDiag('exportReleaseTooling', 'getRakExportReleaseToolingHealth');
    const exportSmokeReport = readDiag('exportSmokeReport', 'getRakExportSmokeReport');
    const moduleReadiness = readDiag('health', 'getRakModuleReadinessHealth');
    const releaseReadiness = readDiag('releaseReadiness', 'getRakReleaseReadinessHealth');
    const bootSequence = readDiag('bootSequence', 'getRakBootSequenceHealth');
    const runtimeGuard = readDiag('runtimeGuard', 'getRakRuntimeGuardHealth');
    const gamesTopScoreDomHardening = readDiag('gamesTopScoreDomHardening', 'getRakGamesTopScoreDomHardeningHealth');
    const gamesTopScoreSeconds = readDiag('gamesTopScoreSeconds', 'getRakGamesTopScoreSecondsHealth');
    const gamesProfileDomHardening = readDiag('gamesProfileDomHardening', 'getRakGamesProfileDomHardeningHealth');
    const gamesHudMessageDomHardening = readDiag('gamesHudMessageDomHardening', 'getRakGamesHudMessageDomHardeningHealth');
    const gamesShipsMenuDomHardening = readDiag('gamesShipsMenuDomHardening', 'getRakGamesShipsMenuDomHardeningHealth');
    const gamesDailyChallengeDomHardening = readDiag('gamesDailyChallengeDomHardening', 'getRakGamesDailyChallengeDomHardeningHealth');
    const gamesPostFixScoreFlow = readDiag('gamesPostFixScoreFlow', 'getRakGamesPostFixScoreFlowHealth');
    const gamesActionTextDomHardening = readDiag('gamesActionTextDomHardening', 'getRakGamesActionTextDomHardeningHealth');
    const gamesOverlayResultDomHardening = readDiag('gamesOverlayResultDomHardening', 'getRakGamesOverlayResultDomHardeningHealth');
    const domSecurityHardeningClosure = readDiag('domSecurityHardeningClosure', 'getRakDomSecurityHardeningClosureHealth');
    const dueDiligenceProgress = readDiag('dueDiligenceProgress', 'getRakDueDiligenceAuditProgressHealth');
    const performanceBudgetAudit = readDiag('performanceBudgetAudit', 'getRakPerformanceBudgetAuditHealth');
    const testAutomationCiPlan = readDiag('testAutomationCiPlan', 'getRakTestAutomationCiPlanHealth');
    const performanceCiClosure = readDiag('performanceCiClosure', 'getRakPerformanceCiClosureHealth');
    const mobilePerformanceSmokePlan = readDiag('mobilePerformanceSmokePlan', 'getRakMobilePerformanceSmokePlanHealth');
    const playwrightDomSmokeDraft = readDiag('playwrightDomSmokeDraft', 'getRakPlaywrightDomSmokeDraftHealth');
    const finalAuditClosure = readDiag('finalAuditClosure', 'getRakFinalAuditClosureHealth');
    const promptComplianceClosure = readDiag('promptComplianceClosure', 'getRakPromptComplianceClosureHealth');
    const manualValidationReadiness = readDiag('manualValidationReadiness', 'getRakManualValidationReadinessHealth');
    const validationReadinessClosure = readDiag('validationReadinessClosure', 'getRakValidationReadinessClosureHealth');
    const gamesAchievementRewards = readDiag('gamesAchievementRewards', 'getRakGamesAchievementRewardHealth');
    const profileAppearanceRewards = readDiag('profileAppearanceRewards', 'getRakProfileAppearanceRewardHealth');
    const dashboardGlassTheme = readDiag('dashboardGlassTheme', 'getRakDashboardGlassThemeHealth');
    const dashboardAnnouncement = readDiag('dashboardAnnouncement', 'getRakDashboardAnnouncementHealth');
    const rotaceNamesDock = readDiag('rotaceNamesDock', 'getRakRotaceNamesDockHealth');
    const statsMonthlyThemeChart = readDiag('statsMonthlyThemeChart', 'getRakStatsMonthlyThemeChartHealth');
    const frezkyCorrectionSignToggle = readDiag('frezkyCorrectionSignToggle', 'getRakFrezkyCorrectionSignToggleHealth');
    const ladaPerformance = readDiag('ladaPerformance', 'getLadaPerformanceHealth');

    return {
      releaseOpsChecklist,
      releaseOpsClosure,
      appSecPrivacyClosure,
      onlineGameContractClosure,
      storageSyncClosure,
      supabaseQueueClosure,
      domActionClosure,
      foodSundayGuard,
      exportReleaseTooling,
      exportSmokeReport,
      moduleReadiness,
      releaseReadiness,
      bootSequence,
      runtimeGuard,
      gamesTopScoreDomHardening,
      gamesTopScoreSeconds,
      gamesProfileDomHardening,
      gamesHudMessageDomHardening,
      gamesShipsMenuDomHardening,
      gamesDailyChallengeDomHardening,
      gamesPostFixScoreFlow,
      gamesActionTextDomHardening,
      gamesOverlayResultDomHardening,
      domSecurityHardeningClosure,
      dueDiligenceProgress,
      performanceBudgetAudit,
      testAutomationCiPlan,
      performanceCiClosure,
      mobilePerformanceSmokePlan,
      playwrightDomSmokeDraft,
      finalAuditClosure,
      promptComplianceClosure,
      manualValidationReadiness,
      validationReadinessClosure,
      gamesAchievementRewards,
      profileAppearanceRewards,
      dashboardGlassTheme,
      dashboardAnnouncement,
      rotaceNamesDock,
      statsMonthlyThemeChart,
      frezkyCorrectionSignToggle,
      ladaPerformance
    };
  }

  function buildGateMatrix(signals) {
    const gates = [];
    const version = safeString(window.APP_VERSION || VERSION);
    const versionOk = version === VERSION;

    gates.push(makeGate(
      'version-consistency',
      'Verze / build značka',
      versionOk ? 'ok' : 'blocker',
      'blocker',
      version,
      'Před ZIPem musí sedět core.js, sw.js, package.json, CHANGELOG, O aplikaci, export manifest i realtime kanál.',
      'core/sw/export'
    ));

    const moduleMissing = Number(signals.moduleReadiness && signals.moduleReadiness.missingCount || 0);
    const moduleErrors = Number(signals.moduleReadiness && signals.moduleReadiness.errorCount || 0);
    gates.push(makeGate(
      'module-readiness',
      'Načtení modulů',
      signals.moduleReadiness && signals.moduleReadiness.ok ? 'ok' : 'blocker',
      'blocker',
      signals.moduleReadiness ? ('loaded ' + String(signals.moduleReadiness.loadedCount || 0) + '/' + String(signals.moduleReadiness.expectedCount || 0) + ', missing ' + moduleMissing + ', errors ' + moduleErrors) : 'module readiness helper chybí',
      'Chybějící modul je release blocker; zkontrolovat index.html, sw.js APP_SHELL, export manifest a ZIP.',
      'module-readiness'
    ));

    gates.push(makeGate(
      'export-manifest',
      'Export ZIP / manifest',
      signals.exportReleaseTooling && signals.exportReleaseTooling.ok ? 'ok' : 'warning',
      'warning',
      signals.exportReleaseTooling ? ('source ' + String(signals.exportReleaseTooling.sourceIdCount || 0) + ', bin dup ' + String(signals.exportReleaseTooling.duplicateBinaryCount || 0)) : 'export tooling helper chybí',
      'Před vydáním pustit export preflight; ZIP musí mít soubory v kořeni a jedinou složku assets/.',
      'export'
    ));

    gates.push(makeGate(
      'runtime-release-readiness',
      'Runtime/release readiness',
      okStatus(signals.releaseReadiness, true),
      'warning',
      signals.releaseReadiness ? ('issues ' + String(signals.releaseReadiness.issueCount || 0) + ', warnings ' + String(signals.releaseReadiness.warningCount || 0)) : 'release readiness helper chybí',
      'Warning není automatický blocker, ale před releasem se musí ručně přečíst konkrétní řádek v Diagnostice.',
      'rak-audit-baseline'
    ));

    gates.push(makeGate(
      'boot-sequence',
      'Boot sekvence',
      okStatus(signals.bootSequence, true),
      'warning',
      signals.bootSequence ? ('static ' + (signals.bootSequence.staticOrderOk ? 'OK' : 'kontrola') + ', dynamic ' + (signals.bootSequence.dynamicOrderOk ? 'OK' : 'kontrola')) : 'boot helper chybí',
      'Při warningu neměnit pořadí skriptů v tom samém buildu bez samostatného testu.',
      'rak-boot-sequence-audit'
    ));

    gates.push(makeGate(
      'storage-sync',
      'Storage/offline sync closure',
      signals.storageSyncClosure && signals.storageSyncClosure.ok && !signals.storageSyncClosure.autoCleanupEnabled ? 'ok' : 'warning',
      'warning',
      signals.storageSyncClosure ? ('fáze ' + String(signals.storageSyncClosure.phasePercent || 0) + '%, auto cleanup ' + (signals.storageSyncClosure.autoCleanupEnabled ? 'zapnuto' : 'vypnuto')) : 'closure chybí',
      'Automatické mazání dat musí zůstat vypnuté; cleanup jen ručně po kontrole.',
      'rak-storage-sync-audit'
    ));

    gates.push(makeGate(
      'supabase-queue',
      'Supabase queue closure',
      signals.supabaseQueueClosure && signals.supabaseQueueClosure.ok && !signals.supabaseQueueClosure.autoFlushEnabled && !signals.supabaseQueueClosure.autoDeleteEnabled ? 'ok' : 'warning',
      'warning',
      signals.supabaseQueueClosure ? ('auto flush ' + (signals.supabaseQueueClosure.autoFlushEnabled ? 'zapnuto' : 'vypnuto') + ', auto delete ' + (signals.supabaseQueueClosure.autoDeleteEnabled ? 'zapnuto' : 'vypnuto')) : 'closure chybí',
      'Auto flush a auto delete fronty nepouštět bez samostatného ověření online/offline scénáře.',
      'rak-supabase-client-audit'
    ));

    gates.push(makeGate(
      'food-sunday-overtime',
      'Kantýna/jídelna neděle',
      signals.foodSundayGuard && signals.foodSundayGuard.ok ? 'ok' : 'warning',
      'warning',
      signals.foodSundayGuard ? ('přesčasových nedělí ' + String(signals.foodSundayGuard.overtimeSundayCount || 0)) : 'guard chybí',
      'Běžná neděle musí použít normální rozpis; přesčasová neděle musí přepnout na mimořádný režim a být označená.',
      'dashboard/food schedule'
    ));

    gates.push(makeGate(
      'dom-action-registry',
      'DOM/action closure',
      signals.domActionClosure && signals.domActionClosure.ok ? 'ok' : 'warning',
      'warning',
      signals.domActionClosure ? ('fáze ' + String(signals.domActionClosure.phasePercent || 0) + '%, warningy ' + String(signals.domActionClosure.warningCount || 0)) : 'closure chybí',
      'Při warningu nejdřív dohledat konkrétní data-action; nepřepojovat handler vrstvu naslepo.',
      'rak-dom-action-audit'
    ));

    gates.push(makeGate(
      'appsec-privacy',
      'AppSec/privacy closure',
      signals.appSecPrivacyClosure && signals.appSecPrivacyClosure.ok ? 'ok' : 'warning',
      'warning',
      signals.appSecPrivacyClosure ? ('fáze ' + String(signals.appSecPrivacyClosure.phasePercent || 0) + '%, storage unknown ' + String(signals.appSecPrivacyClosure.storageUnknownKeyCount || 0) + ', DOM sinky ' + String(signals.appSecPrivacyClosure.domStaticSinkCount || 0)) : 'closure chybí',
      'CSP/SRI zavádět jen report-only; hodnoty storage klíčů v diagnostice nečíst.',
      'rak-appsec-privacy-audit'
    ));

    gates.push(makeGate(
      'release-ops',
      'Release ops closure',
      signals.releaseOpsClosure && signals.releaseOpsClosure.ok ? 'ok' : 'warning',
      'warning',
      signals.releaseOpsClosure ? ('fáze ' + String(signals.releaseOpsClosure.phasePercent || 0) + '%, manual ' + String(signals.releaseOpsClosure.checklistManualCount || 0)) : 'closure chybí',
      'Monitoring/rollback checklist musí být dostupný; ruční browser/mobil smoke zůstává požadavek.',
      'rak-release-ops-audit'
    ));


    gates.push(makeGate(
      'dom-security-hardening',
      'DOM/security hardening plán',
      signals.domSecurityHardeningClosure && signals.domSecurityHardeningClosure.ok ? 'ok' : 'warning',
      'warning',
      signals.domSecurityHardeningClosure ? ('fáze ' + String(signals.domSecurityHardeningClosure.phasePercent || 0) + '%, kandidáti ' + String(signals.domSecurityHardeningClosure.candidateCount || 0) + ', P1 review ' + String(signals.domSecurityHardeningClosure.p1ReviewCount || 0)) : 'closure chybí',
      'DOM hardening dělat jen po jedné sink skupině; žádný hromadný přepis innerHTML bez regression testu.',
      'rak-dom-security-hardening'
    ));




    gates.push(makeGate(
      'performance-ci-audit',
      'Výkon + CI/test audit',
      signals.performanceCiClosure && signals.performanceCiClosure.ok ? 'ok' : 'warning',
      'warning',
      signals.performanceCiClosure ? ('fáze ' + String(signals.performanceCiClosure.phasePercent || 0) + '%, test vrstvy ' + String(signals.performanceCiClosure.testLayerCount || 0) + ', performance warningy ' + String(signals.performanceCiClosure.performanceWarnings || 0)) : 'performance/CI closure chybí',
      'Výkonový audit a minimální CI/test strategy musí zůstat read-only; reálné mobilní měření je ruční kontrola.',
      'rak-performance-ci-audit'
    ));

    gates.push(makeGate(
      'due-diligence-progress',
      'Due diligence audit progress',
      signals.dueDiligenceProgress && signals.dueDiligenceProgress.ok ? 'ok' : 'warning',
      'warning',
      signals.dueDiligenceProgress ? ('hotovo ' + String(signals.dueDiligenceProgress.percentComplete || 0) + '%, chybí ' + String(signals.dueDiligenceProgress.percentRemaining || 0) + '%') : 'progress helper chybí',
      'Před předáním dalších velkých úkolů držet přehled zbývajících auditních částí podle původního promptu.',
      'rak-due-diligence-progress'
    ));


    gates.push(makeGate(
      'mobile-performance-smoke-plan',
      'Mobile/performance smoke plán',
      signals.mobilePerformanceSmokePlan && signals.mobilePerformanceSmokePlan.ok ? 'manual' : 'warning',
      'manual',
      signals.mobilePerformanceSmokePlan ? ('zařízení ' + String(signals.mobilePerformanceSmokePlan.deviceCount || 0) + ', trasy ' + String(signals.mobilePerformanceSmokePlan.routeSmokeCount || 0) + ', real device ' + (signals.mobilePerformanceSmokePlan.realDeviceMeasured ? 'ano' : 'ne')) : 'mobile smoke helper chybí',
      'Skutečné měření na mobilu je ruční gate; netvrdit, že proběhlo, dokud nebude otestováno.',
      'rak-mobile-smoke-audit'
    ));

    gates.push(makeGate(
      'playwright-dom-smoke-draft',
      'Browser/DOM smoke kontrola',
      signals.playwrightDomSmokeDraft && signals.playwrightDomSmokeDraft.ok ? 'ok' : 'warning',
      'warning',
      signals.playwrightDomSmokeDraft ? ('stav ' + String(signals.playwrightDomSmokeDraft.implementationStatus || 'draft')) : 'Playwright draft helper chybí',
      'Spouštět npm run test:browser-smoke nad bezpečným lokálním snapshotem; nejde o produkční DB test.',
      'rak-mobile-smoke-audit'
    ));

    gates.push(makeGate(
      'due-diligence-final-closure',
      'Due diligence closure',
      signals.finalAuditClosure && signals.finalAuditClosure.ok ? 'manual' : 'warning',
      'manual',
      signals.finalAuditClosure ? ('hotovo ' + String(signals.finalAuditClosure.percentComplete || 0) + ' %, zbývá ' + String(signals.finalAuditClosure.percentRemaining || 0) + ' %') : 'closure helper chybí',
      'Zbývající část je hlavně ruční měření a skutečně spuštěné smoke testy.',
      'rak-mobile-smoke-audit'
    ));

    gates.push(makeGate(
      'prompt-compliance-docs',
      'Prompt compliance dokumenty',
      signals.promptComplianceClosure && signals.promptComplianceClosure.documentaryComplete ? 'ok' : 'warning',
      'warning',
      signals.promptComplianceClosure ? ('dokumentačně ' + String(signals.promptComplianceClosure.percentComplete || 0) + ' %, dokumentů ' + String(signals.promptComplianceClosure.documentCount || 0)) : 'prompt compliance helper chybí',
      'Dokumenty v924 musí existovat v assets/docs a být v export manifestu; mobilní a browser validace zůstává ruční gate.',
      'rak-due-diligence-progress'
    ));

    gates.push(makeGate(
      'prompt-compliance-manual-validation',
      'Prompt compliance ruční validace',
      'manual',
      'manual',
      signals.promptComplianceClosure ? ('manual gate ' + String(signals.promptComplianceClosure.manualGateCount || 0) + ': mobil + browser smoke') : 'staticky nelze potvrdit',
      'Po nahrání ověřit mobilní a browser smoke; nevydávat za hotové bez reálného testu.',
      'manual'
    ));


    gates.push(makeGate(
      'v928-validation-readiness-package',
      'v928 validační balíček',
      signals.validationReadinessClosure && signals.validationReadinessClosure.ok ? 'ok' : 'warning',
      'warning',
      signals.validationReadinessClosure ? ('manual gates ' + String(signals.validationReadinessClosure.manualGateCount || 0) + ', user testing ' + (signals.validationReadinessClosure.readyForUserTesting ? 'ready' : 'ne')) : 'validation helper chybí',
      'v928 musí mít připravený ruční runbook, Playwright runbook, post-release checklist a closure helper; skutečné testy zůstávají manual.',
      'rak-mobile-smoke-audit'
    ));



    gates.push(makeGate(
      'v928-profile-appearance-rewards',
      'Témata a pozadí jako profilové odměny',
      signals.profileAppearanceRewards && signals.profileAppearanceRewards.themes && signals.profileAppearanceRewards.backgrounds ? 'ok' : 'warning',
      'warning',
      signals.profileAppearanceRewards ? ('themes ' + String((signals.profileAppearanceRewards.themes || {}).total || 0) + ', backgrounds ' + String((signals.profileAppearanceRewards.backgrounds || {}).total || 0) + ', storage ' + String(signals.profileAppearanceRewards.profileThemeStorage || 'profil')) : 'appearance reward helper chybí',
      'Aktivní téma i pozadí se při přihlášeném profilu ukládají do account.uiSettings; localStorage zůstává fallback mimo profil.',
      'ui'
    ));




    gates.push(makeGate(
      'v930-dashboard-ios-glass-icons',
      'Dashboard iOS glass bez ikonových kapslí',
      signals.dashboardGlassTheme && signals.dashboardGlassTheme.ok ? 'ok' : 'warning',
      'warning',
      signals.dashboardGlassTheme ? ('theme ' + String(signals.dashboardGlassTheme.theme || '—') + ', bg ' + String(signals.dashboardGlassTheme.background || '—') + ', mode ' + String(signals.dashboardGlassTheme.lightweightSafe || '—')) : 'dashboard glass helper chybí',
      'Na mobilu ověřit čitelnost, průhlednější iOS glass a že ikonky už nemají vlastní pozadí; v Láďově/low-end režimu musí zůstat vypnutý těžký blur.',
      'styles/ui'
    ));



    gates.push(makeGate(
      'v935-dashboard-announcement-system',
      'Dashboard announcement ticker jako lokální nastavení',
      signals.dashboardAnnouncement && signals.dashboardAnnouncement.ok ? 'ok' : 'warning',
      'warning',
      signals.dashboardAnnouncement ? ('lokální oznámení ' + String(signals.dashboardAnnouncement.hasLocalAnnouncement ? 'ano' : 'ne') + ', active ' + String(signals.dashboardAnnouncement.activeHasMessage ? 'ano' : 'ne') + ', source ' + String(signals.dashboardAnnouncement.activeSource || '—')) : 'announcement helper chybí',
      'Ručně ověřit v Administraci: uložit online, otevřít na druhém zařízení, ověřit realtime/refresh a vypnutí. Pokud policy nepustí zápis, zobrazí se lokální fallback a je potřeba upravit Supabase policy mimo build.',
      'dashboard/ui/supabase/local-fallback'
    ));

    gates.push(makeGate(
      'v935-dashboard-glass-announcement-polish',
      'Dashboard průhlednější glass + online announcement',
      signals.dashboardGlassTheme && signals.dashboardGlassTheme.ok && signals.dashboardAnnouncement && signals.dashboardAnnouncement.ok ? 'ok' : 'warning',
      'warning',
      signals.dashboardGlassTheme ? ('theme ikony ' + String(signals.dashboardGlassTheme.themeIconAware ? 'ano' : 'ne') + ', glass ' + String(signals.dashboardGlassTheme.dashboardCards || '—')) : 'dashboard glass helper chybí',
      'Ručně ověřit tmavší, ale průhlednější glass panely, theme barvy ikon a online announcement s lokálním fallbackem.',
      'dashboard/ui/theme/supabase'
    ));



    gates.push(makeGate(
      'v938-dashboard-panel-height',
      'Dashboard: panely cca o 5 % nižší',
      signals.dashboardGlassTheme && signals.dashboardGlassTheme.ok ? 'ok' : 'warning',
      'warning',
      signals.dashboardGlassTheme ? String(signals.dashboardGlassTheme.dashboardPanelHeight || 'panel height info chybí') : 'dashboard glass helper chybí',
      'Ručně ověřit Dashboard na mobilu, že panely působí o trochu nižší, ale texty a ikony nejsou natlačené.',
      'dashboard/styles'
    ));



    gates.push(makeGate(
      'v941-stats-monthly-chart-theme-area-fill',
      'Obsazenost strojů: jemná theme výplň jen pod čárou',
      signals.statsMonthlyThemeChart && signals.statsMonthlyThemeChart.ok ? 'ok' : 'warning',
      'warning',
      signals.statsMonthlyThemeChart ? ('theme ' + String(signals.statsMonthlyThemeChart.themeAware ? 'ano' : 'ne') + ', area rgba ' + String(signals.statsMonthlyThemeChart.svgAreaUsesStableRgba ? 'ano' : 'ne')) : 'stats monthly chart helper chybí',
      'Ručně ověřit ve Statistikách, že jemné podbarvení je jen pod linkou grafu, ne přes celé pole, a že se nevrací černý fallback.',
      'stats/styles/theme'
    ));

    gates.push(makeGate(
      'v930-rotace-names-dock-stability',
      'Rotace seznam jmen bez cuknutí a se správnou velikostí',
      signals.rotaceNamesDock && signals.rotaceNamesDock.ok ? 'ok' : 'warning',
      'warning',
      signals.rotaceNamesDock && signals.rotaceNamesDock.dom ? ('position ' + String(signals.rotaceNamesDock.dom.namesGridPosition || '—') + ', bottom ' + String(signals.rotaceNamesDock.dom.namesGridBottom || '—')) : 'rotace dock helper chybí',
      'Na mobilu ověřit, že seznam jmen po přepnutí na Rotaci necukne, zůstane nad spodním panelem a dlaždice nejsou zmenšené.',
      'ui/styles'
    ));


    gates.push(makeGate(
      'v932-frezky-correction-sign-toggle',
      'Korekce Frézky +/− přepínače',
      signals.frezkyCorrectionSignToggle && signals.frezkyCorrectionSignToggle.ok ? 'ok' : 'warning',
      'warning',
      signals.frezkyCorrectionSignToggle ? ('naměřeno ' + String(signals.frezkyCorrectionSignToggle.buttons && signals.frezkyCorrectionSignToggle.buttons.measured ? 'OK' : 'chybí') + ', konicita ' + String(signals.frezkyCorrectionSignToggle.buttons && signals.frezkyCorrectionSignToggle.buttons.taper ? 'OK' : 'chybí') + ', fhβ ' + String(signals.frezkyCorrectionSignToggle.buttons && signals.frezkyCorrectionSignToggle.buttons.shift ? 'OK' : 'chybí')) : 'helper znaménka frézek chybí',
      'Na mobilu ověřit, že tlačítka +/− u Naměřeno, konicity a fhβ jsou stejně vysoká, vycentrovaná a mění znaménko stejně jako u korekcí soustruhů.',
      'soustruhy/index/styles'
    ));

    gates.push(makeGate(
      'v928-lada-performance-lite',
      'Láďův režim výkon',
      signals.ladaPerformance && signals.ladaPerformance.ok ? 'ok' : 'warning',
      'warning',
      signals.ladaPerformance ? ('active ' + String(!!signals.ladaPerformance.active) + ', mode ' + String(signals.ladaPerformance.mode || '—') + ', frame ' + String(signals.ladaPerformance.frameMs || signals.ladaPerformance.ladaPerformanceFrameMs || '—')) : 'lada performance helper chybí',
      'Na Ládově telefonu ručně ověřit plynulost; staticky lze potvrdit jen odlehčený profil a CSS guardy.',
      'ui/games/css'
    ));

    gates.push(makeGate(
      'v928-manual-test-status',
      'v928 skutečné mobil/Playwright testy',
      'manual',
      'manual',
      signals.manualValidationReadiness ? ('checklist ' + String(signals.manualValidationReadiness.checklistCount || 0) + ', blocking ' + String(signals.manualValidationReadiness.blockingChecklistCount || 0)) : 'staticky nelze potvrdit',
      'Až Martin otestuje mobil/browser/Playwright, zapsat výsledek do dalšího buildu nebo opravit nalezené chyby.',
      'manual'
    ));

    gates.push(makeGate(
      'manual-mobile-smoke',
      'Ruční mobil/browser smoke',
      'manual',
      'manual',
      'staticky nelze ověřit',
      'Po nahrání ověřit mobil: PWA tvrdý reload, Dashboard, kantýna/jídelna, Top score nula, Piškvorky AI, online Piškvorky link/kód, Lodě, export.',
      'manual'
    ));

    gates.push(makeGate(
      'supabase-policy-change-freeze',
      'Supabase policies freeze',
      'manual',
      'manual',
      'bez dvoumobilového smoke testu policies neutahovat',
      'Jakákoli policy změna musí být samostatný build až po reálném dvoumobilovém smoke testu online Piškvorek i Lodí.',
      'manual'
    ));

    return gates;
  }

  window.getRakReleaseGatePolicy = function getRakReleaseGatePolicy() {
    return {
      ok: true,
      mode: 'release-gate-policy-v928',
      version: safeString(window.APP_VERSION || VERSION),
      checkedAt: nowIso(),
      statuses: [
        { status: 'blocker', meaning: 'Nesmí do ZIPu/release bez opravy nebo vědomého rollback plánu.' },
        { status: 'warning', meaning: 'Může do ZIPu jen po přečtení evidence a vědomém přijetí rizika.' },
        { status: 'manual', meaning: 'Staticky nelze potvrdit; musí ověřit člověk v mobilu/prohlížeči.' },
        { status: 'ok', meaning: 'Read-only kontrola nehlásí problém.' }
      ],
      blockerRules: [
        'nesedící APP_VERSION/cache/realtime/package/export verze',
        'chybějící nebo chybový modul v module readiness',
        'rozbitý export manifest s chybějícími soubory',
        'nečekaná DB/policy mutace v buildu, který ji neměl dělat',
        'hromadný DOM rewrite bez regression testů a rollback plánu'
      ],
      manualRules: [
        'browser/mobil smoke',
        'online Piškvorky link + ruční kód na dvou mobilech',
        'Lodě create/accept/save na dvou mobilech',
        'PWA cache tvrdý reload po nasazení'
      ],
      mutationPolicy: 'Tato vrstva jen čte existující diagnostiky; nesmí mazat data, měnit DB, měnit policies ani přepojovat online flow.'
    };
  };

  window.getRakReleaseGateMatrixHealth = function getRakReleaseGateMatrixHealth() {
    const signals = collectReleaseGateSignals();
    const gates = buildGateMatrix(signals);
    const blockers = gates.filter(gate => gate.status === 'blocker');
    const warnings = gates.filter(gate => gate.status === 'warning');
    const manual = gates.filter(gate => gate.status === 'manual');
    const okGates = gates.filter(gate => gate.status === 'ok');
    const bySeverity = gates.reduce((acc, gate) => {
      const key = safeString(gate.status || gate.severity, 'unknown');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return {
      ok: blockers.length === 0,
      mode: MODE,
      version: safeString(window.APP_VERSION || VERSION),
      checkedAt: nowIso(),
      gateCount: gates.length,
      okGateCount: okGates.length,
      blockerCount: blockers.length,
      warningCount: warnings.length,
      manualCount: manual.length,
      readyForZip: blockers.length === 0,
      readyForProduction: blockers.length === 0 && manual.length === 0,
      bySeverity,
      gates,
      blockers,
      warnings,
      manualChecks: manual,
      note: 'readyForProduction zůstává false, dokud neproběhne ruční mobil/browser smoke; readyForZip řeší jen statické blockery.'
    };
  };

  window.getRakReleaseGateClosureHealth = function getRakReleaseGateClosureHealth() {
    const matrix = window.getRakReleaseGateMatrixHealth();
    const policy = window.getRakReleaseGatePolicy();
    return {
      ok: !!(matrix && matrix.ok),
      mode: 'release-gates-closure-v928',
      version: safeString(window.APP_VERSION || VERSION),
      checkedAt: nowIso(),
      phase: 'phase K release gating / checklist matrix',
      phasePercent: 100,
      phaseClosed: true,
      gateCount: matrix ? Number(matrix.gateCount || 0) : 0,
      blockerCount: matrix ? Number(matrix.blockerCount || 0) : 0,
      warningCount: matrix ? Number(matrix.warningCount || 0) : 0,
      manualCount: matrix ? Number(matrix.manualCount || 0) : 0,
      readyForZip: !!(matrix && matrix.readyForZip),
      readyForProduction: !!(matrix && matrix.readyForProduction),
      policyStatusCount: policy && Array.isArray(policy.statuses) ? policy.statuses.length : 0,
      dbSchemaChanges: false,
      policyChanges: false,
      onlineFlowChanges: false,
      dataMutation: false,
      nextStep: 'Další bezpečný krok: reálný mobil/browser smoke podle v929 checklistu; případné chyby opravit po jedné bez zásahu do online flow.'
    };
  };

  try {
    if (window.RaK && window.RaK.diagnostics && typeof window.RaK.diagnostics.register === 'function') {
      window.RaK.diagnostics.register('releaseGatePolicy', window.getRakReleaseGatePolicy);
      window.RaK.diagnostics.register('releaseGateMatrix', window.getRakReleaseGateMatrixHealth);
      window.RaK.diagnostics.register('releaseGateClosure', window.getRakReleaseGateClosureHealth);
    }
  } catch (err) {}

  try {
    const ended = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (typeof window.rakMarkModuleReady === 'function') {
      window.rakMarkModuleReady('rak-release-gates.js', 'loaded', { source: 'index', durationMs: Math.max(0, Math.round(ended - started)) });
    }
  } catch (err) {}
})();
