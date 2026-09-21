// RaK 1.2 (1.155) – export/release audit.

(function setupRakExportReleaseAudit() {
  const started = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

  try {
    if (typeof window.rakMarkModuleReady === 'function') {
      window.rakMarkModuleReady('rak-export-release-audit.js', 'loading', { source: 'index' });
    }
  } catch (err) {}

  function listLocalScripts() {
    try {
      return Array.from(document.scripts || [])
        .map((script) => String(script && script.getAttribute ? (script.getAttribute('src') || '') : '').trim())
        .filter(Boolean)
        .filter((src) => !/^https?:\/\//i.test(src));
    } catch (err) {
      return [];
    }
  }

  function listStylesheets() {
    try {
      return Array.from(document.querySelectorAll('link[rel="stylesheet"][href]') || [])
        .map((link) => String(link && link.getAttribute ? link.getAttribute('href') || '' : '').trim())
        .filter(Boolean);
    } catch (err) {
      return [];
    }
  }

  function uniqueCount(list) {
    return new Set((Array.isArray(list) ? list : []).map((item) => String(item || '').trim()).filter(Boolean)).size;
  }

  function readExportSourceInventory() {
    try {
      if (typeof window.getRakExportSourceInventoryHealth === 'function') return window.getRakExportSourceInventoryHealth();
    } catch (err) {
      return { ok: false, error: String(err && err.message ? err.message : err) };
    }
    return null;
  }

  function readExportSmokeReport() {
    try {
      if (typeof window.getRakExportSmokeReport === 'function') return window.getRakExportSmokeReport();
    } catch (err) {
      return { ok: false, status: 'read-error', error: String(err && err.message ? err.message : err) };
    }
    return null;
  }

  function readReleaseReadiness() {
    try {
      if (window.RaK && window.RaK.diagnostics && typeof window.RaK.diagnostics.readWithFallback === 'function') {
        return window.RaK.diagnostics.readWithFallback('releaseReadiness', 'getRakReleaseReadinessHealth');
      }
    } catch (err) {}
    try {
      return typeof window.getRakReleaseReadinessHealth === 'function' ? window.getRakReleaseReadinessHealth() : null;
    } catch (err) {
      return null;
    }
  }

  function readDomActionSmokeReport() {
    try {
      if (typeof window.getRakDomActionSmokeReport === 'function') return window.getRakDomActionSmokeReport();
    } catch (err) {}
    return null;
  }

  window.getRakExportReleaseToolingHealth = function getRakExportReleaseToolingHealth() {
    const issues = [];
    const warnings = [];
    const scripts = listLocalScripts();
    const stylesheets = listStylesheets();
    const sourceInventory = readExportSourceInventory();
    const exportSmokeReport = readExportSmokeReport();
    const releaseReadiness = readReleaseReadiness();
    const domActionSmokeReport = readDomActionSmokeReport();
    const requiredRuntimeFiles = [
      'index.html',
      'core.js',
      'app.js',
      'app-runtime-guards.js',
      'app-health-audits.js',
      'app-postload-audits.js',
      'app-pwa-connectivity.js',
      'admin-food.js',
      'ui.js',
      'app-navigation.js',
      'app-bottom-nav.js',
      'app-menu.js',
      'app-actions.js',
      'app-boot-selftest.js',
      'app-excel-import.js',
      'app-home-boot.js',
      'app-rotation-sync.js',
      'app-rotation-controls.js',
      'export.js',
      'sw.js',
      'manifest.webmanifest',
      'styles.css',
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
    ];
    const requiredExportSignals = [
      'exportCurrentHtml',
      'triggerRakZipExport',
      'getRakExportSourceInventoryHealth',
      'validateRakExportManifestFiles',
      'getRakExportManifestDuplicateReport',
      'getRakExportSmokeReport',
      'runRakExportSmokeReport'
    ];
    const missingExportSignals = requiredExportSignals.filter((name) => typeof window[name] === 'undefined');
    const missingScripts = ['rak-export-release-audit.js', 'export.js', 'app-postload-audits.js', 'app-bottom-nav.js', 'app-rotation-sync.js', 'app-excel-import.js', 'app-rotation-controls.js', 'app-admin-unlock.js', 'app-home-boot.js', 'app-init.js'].filter((tail) => !scripts.some((src) => String(src).split('?')[0].endsWith(tail)));
    if (missingExportSignals.length) warnings.push('export signals not visible yet: ' + missingExportSignals.join(', '));
    if (missingScripts.length) warnings.push('runtime scripts not visible yet: ' + missingScripts.join(', '));
    if (!stylesheets.some((href) => /styles\.css$/.test(href))) warnings.push('styles.css not visible in DOM stylesheet inventory');
    if (!releaseReadiness) warnings.push('release readiness health unavailable');
    else if (releaseReadiness.ok === false) warnings.push('release readiness has warnings: ' + String(releaseReadiness.warningCount || 0));
    if (!domActionSmokeReport) warnings.push('DOM/action smoke report unavailable until rak-dom-action-audit.js loads');
    else if (domActionSmokeReport.ok === false) warnings.push('DOM/action smoke report has warnings: ' + String(domActionSmokeReport.warningCount || 0));
    if (!sourceInventory) warnings.push('export source inventory unavailable until export.js loads');
    else if (sourceInventory.ok === false) issues.push('export source inventory failed');
    if (!exportSmokeReport) warnings.push('export smoke report unavailable until export.js loads');
    else if (exportSmokeReport.ok === false) warnings.push('last export smoke report failed: ' + String(exportSmokeReport.lastError || exportSmokeReport.status || 'kontrola'));
    if (sourceInventory && Number(sourceInventory.duplicateBinaryCount || 0) > 0) issues.push('duplicate binary export entries: ' + String(sourceInventory.duplicateBinaryCount || 0));
    if (sourceInventory && !sourceInventory.hasPreflightValidation) issues.push('export manifest preflight validation is missing');

    return {
      ok: issues.length === 0,
      mode: 'export-release-tooling-audit-v897',
      checkedAt: new Date().toISOString(),
      version: String(window.APP_VERSION || 'unknown'),
      issueCount: issues.length,
      warningCount: warnings.length,
      issues: issues.slice(0, 12),
      warnings: warnings.slice(0, 12),
      localScriptCount: scripts.length,
      stylesheetCount: stylesheets.length,
      requiredRuntimeFiles,
      requiredRuntimeFileCount: requiredRuntimeFiles.length,
      missingExportSignalCount: missingExportSignals.length,
      missingExportSignals,
      exportFunctionReady: typeof window.exportCurrentHtml === 'function',
      exportTriggerReady: typeof window.triggerRakZipExport === 'function',
      jszipReady: typeof window.JSZip !== 'undefined',
      sourceInventoryOk: !!(sourceInventory && sourceInventory.ok),
      sourceIdCount: sourceInventory ? Number(sourceInventory.sourceIdCount || 0) : 0,
      binaryFileCount: sourceInventory ? Number(sourceInventory.binaryFileCount || 0) : 0,
      duplicateBinaryCount: sourceInventory ? Number(sourceInventory.duplicateBinaryCount || 0) : 0,
      manifestSplit: !!(sourceInventory && sourceInventory.manifestSplit),
      manifestTextPathCount: sourceInventory ? Number(sourceInventory.manifestTextPathCount || 0) : 0,
      totalManifestPathCount: sourceInventory ? Number(sourceInventory.totalManifestPathCount || 0) : 0,
      duplicateManifestPathCount: sourceInventory ? Number(sourceInventory.duplicateManifestPathCount || 0) : 0,
      preflightValidationReady: typeof window.validateRakExportManifestFiles === 'function',
      hasPreflightValidation: !!(sourceInventory && sourceInventory.hasPreflightValidation),
      uniqueSourcePathCount: sourceInventory ? Number(sourceInventory.uniqueSourcePathCount || 0) : 0,
      releaseReadinessOk: !!(releaseReadiness && releaseReadiness.ok),
      releaseReadinessWarningCount: releaseReadiness ? Number(releaseReadiness.warningCount || 0) : 0,
      exportSmokeReportReady: !!exportSmokeReport,
      exportSmokeReportOk: exportSmokeReport ? exportSmokeReport.ok : null,
      exportSmokeReportStatus: exportSmokeReport ? String(exportSmokeReport.status || '—') : '—',
      exportSmokeReportLastStage: exportSmokeReport ? String(exportSmokeReport.lastStage || '—') : '—',
      exportSmokeReportRunCount: exportSmokeReport ? Number(exportSmokeReport.runCount || 0) : 0,
      exportSmokeReportFailureCount: exportSmokeReport ? Number(exportSmokeReport.failureCount || 0) : 0,
      exportSmokeReportCheckedTextFileCount: exportSmokeReport ? Number(exportSmokeReport.checkedTextFileCount || 0) : 0,
      exportSmokeReportCheckedBinaryFileCount: exportSmokeReport ? Number(exportSmokeReport.checkedBinaryFileCount || 0) : 0,
      domActionSmokeReportReady: !!domActionSmokeReport,
      domActionSmokeReportOk: domActionSmokeReport ? domActionSmokeReport.ok : null,
      domActionSmokeReportStatus: domActionSmokeReport ? String(domActionSmokeReport.status || '—') : '—',
      domActionSmokeReportRunCount: domActionSmokeReport ? Number(domActionSmokeReport.runCount || 0) : 0,
      releaseReadinessLinkedToDomActionSmoke: !!(releaseReadiness && Object.prototype.hasOwnProperty.call(releaseReadiness, 'domActionSmokeReportLinked')),
      zipRootRule: 'kořen ZIPu bez vnitřní složky; jediná složka v kořeni je assets/',
      phase: 'phase D export/release tooling closure',
      phasePercent: 100,
      phaseClosed: true,
      releaseReadinessLinkedToExportSmoke: !!(releaseReadiness && Object.prototype.hasOwnProperty.call(releaseReadiness, 'exportSmokeReportLinked')),
      nextStep: 'Export/release tooling fáze uzavřená; další směr je pouze dlouhodobé udržení checklistu a browser/mobile smoke po nasazení.'
    };
  };

  try {
    if (window.RaK && window.RaK.diagnostics && typeof window.RaK.diagnostics.read === 'function') {
      // Reader se registruje přes rak-namespace.js mapu; tady pouze držíme globální fallback.
    }
  } catch (err) {}

  try {
    const ended = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (typeof window.rakMarkModuleReady === 'function') {
      window.rakMarkModuleReady('rak-export-release-audit.js', 'loaded', { source: 'index', durationMs: Math.max(0, Math.round(ended - started)) });
    }
  } catch (err) {}
})();
