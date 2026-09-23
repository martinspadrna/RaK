// RaK 1.2 (1.155) – release/architecture readiness audit.

(function setupRakAuditBaselineHelpers() {
  const started = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

  try {
    if (typeof window.rakMarkModuleReady === 'function') {
      window.rakMarkModuleReady('rak-audit-baseline.js', 'loading', { source: 'index' });
    }
  } catch (err) {}

function readRakDiagnosticForAudit(alias, fallbackGlobalName) {
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

function getRakReleaseReadinessHealth() {
  const issues = [];
  const warnings = [];
  const checkedAt = new Date().toISOString();
  const currentVersion = String(window.APP_VERSION || '').trim();
  const expectedExternalScripts = [
    'cdn.jsdelivr.net/npm/xlsx',
    'cdn.jsdelivr.net/npm/jszip@3.10.1'
  ];
  const allowedExternalScriptHosts = ['cdn.jsdelivr.net'];
  let externalScripts = [];
  let externalLinks = [];
  let externalDependencyStatus = {};
  let exportSmokeReport = null;
  let domActionSmokeReport = null;
  let storageSyncAudit = null;
  let storageSyncSmokeReport = null;
  let storageManualCleanupGuard = null;
  let storageSyncClosure = null;
  let supabaseClientQueueAudit = null;
  let supabaseQueueSmokeReport = null;
  let supabaseQueueClosure = null;
  let onlineGameContracts = null;

  try {
    externalDependencyStatus = Object.assign({}, window.__RAK_EXTERNAL_DEP_STATUS__ || {});
  } catch (err) {
    externalDependencyStatus = {};
  }

  try {
    if (typeof window.getRakExportSmokeReport === 'function') {
      exportSmokeReport = window.getRakExportSmokeReport();
    }
  } catch (err) {
    exportSmokeReport = { ok: false, status: 'read-error', lastError: String(err && err.message ? err.message : err) };
  }

  try {
    domActionSmokeReport = readRakDiagnosticForAudit('domActionSmokeReport', 'getRakDomActionSmokeReport');
  } catch (err) {
    domActionSmokeReport = { ok: false, status: 'read-error', lastError: String(err && err.message ? err.message : err) };
  }

  try {
    storageSyncAudit = readRakDiagnosticForAudit('storageSyncAudit', 'getRakStorageSyncAuditHealth');
  } catch (err) {
    storageSyncAudit = { ok: false, status: 'read-error', lastError: String(err && err.message ? err.message : err) };
  }

  try {
    storageSyncSmokeReport = readRakDiagnosticForAudit('storageSyncSmokeReport', 'getRakStorageSyncSmokeReport');
  } catch (err) {
    storageSyncSmokeReport = { ok: false, status: 'read-error', lastError: String(err && err.message ? err.message : err) };
  }

  try {
    storageManualCleanupGuard = readRakDiagnosticForAudit('storageManualCleanupGuard', 'getRakStorageManualCleanupGuard');
  } catch (err) {
    storageManualCleanupGuard = { ok: false, status: 'read-error', lastError: String(err && err.message ? err.message : err) };
  }

  try {
    storageSyncClosure = readRakDiagnosticForAudit('storageSyncClosure', 'getRakStorageSyncClosureHealth');
  } catch (err) {
    storageSyncClosure = { ok: false, status: 'read-error', lastError: String(err && err.message ? err.message : err) };
  }

  try {
    supabaseClientQueueAudit = readRakDiagnosticForAudit('supabaseClientQueueAudit', 'getRakSupabaseClientQueueAuditHealth');
  } catch (err) {
    supabaseClientQueueAudit = { ok: false, status: 'read-error', lastError: String(err && err.message ? err.message : err) };
  }

  try {
    supabaseQueueSmokeReport = readRakDiagnosticForAudit('supabaseQueueSmokeReport', 'getRakSupabaseQueueSmokeReport');
  } catch (err) {
    supabaseQueueSmokeReport = { ok: false, status: 'read-error', lastError: String(err && err.message ? err.message : err) };
  }

  try {
    supabaseQueueClosure = readRakDiagnosticForAudit('supabaseQueueClosure', 'getRakSupabaseQueueClosureHealth');
  } catch (err) {
    supabaseQueueClosure = { ok: false, status: 'read-error', lastError: String(err && err.message ? err.message : err) };
  }

  try {
    onlineGameContracts = readRakDiagnosticForAudit('onlineGameContracts', 'getRakOnlineGameContractAuditHealth');
  } catch (err) {
    onlineGameContracts = { ok: false, status: 'read-error', lastError: String(err && err.message ? err.message : err) };
  }


  try {
    externalScripts = Array.from(document.scripts || [])
      .map((script) => String(script && script.getAttribute ? script.getAttribute('src') || '' : '').trim())
      .filter((src) => /^https?:\/\//i.test(src));
    externalLinks = Array.from(document.querySelectorAll('link[href]') || [])
      .map((link) => String(link && link.getAttribute ? link.getAttribute('href') || '' : '').trim())
      .filter((href) => /^https?:\/\//i.test(href));
  } catch (err) {}

  const hasUnexpectedExternalScript = externalScripts.some((src) => {
    try { return !allowedExternalScriptHosts.includes(new URL(src).hostname); }
    catch (err) { return true; }
  });
  const missingExpectedExternalScripts = expectedExternalScripts.filter((part) => !externalScripts.some((src) => src.includes(part)));

  if (!/^v\.\d+\.\d+ \(\d+\)$/.test(currentVersion)) issues.push('version format');
  if (!document.querySelector('link[rel="manifest"][href="manifest.webmanifest"]')) issues.push('manifest link missing');
  if (!document.querySelector('link[rel="apple-touch-icon"][href^="assets/app-icons/"]')) issues.push('apple touch icon path');
  if (!document.querySelector('link[rel="icon"][href^="assets/app-icons/"]')) issues.push('favicon path');
  if (hasUnexpectedExternalScript) issues.push('unexpected external script host');
  if (missingExpectedExternalScripts.length) warnings.push('external script reference changed: ' + missingExpectedExternalScripts.join(', '));
  ['googleFonts', 'xlsx', 'jszip', 'supabase'].forEach((key) => {
    const status = externalDependencyStatus && externalDependencyStatus[key] ? String(externalDependencyStatus[key].status || '') : '';
    if (status === 'failed') warnings.push(key + ' CDN failed during boot');
  });
  if (!externalLinks.some((href) => href.includes('fonts.googleapis.com/css2'))) warnings.push('Google Fonts reference missing: app poběží s náhradním písmem');
  if (!('serviceWorker' in navigator)) warnings.push('service worker unsupported on this browser');
  if (typeof window.XLSX === 'undefined') warnings.push('XLSX CDN unavailable: Excel import/export může být omezený');
  if (typeof window.JSZip === 'undefined') warnings.push('JSZip CDN unavailable: ZIP export nebude dostupný');
  if (typeof window.supabase === 'undefined') warnings.push('Lokální Supabase klient není dostupný: online sync poběží jen offline/fallback režimem');
  if (exportSmokeReport && exportSmokeReport.ok === false) {
    warnings.push('export smoke report failed: ' + String(exportSmokeReport.lastError || exportSmokeReport.status || 'kontrola'));
  }
  if (domActionSmokeReport && domActionSmokeReport.ok === false) {
    warnings.push('DOM/action smoke report failed: ' + String(domActionSmokeReport.lastError || domActionSmokeReport.status || 'kontrola'));
  }
  if (storageSyncAudit && storageSyncAudit.ok === false) {
    warnings.push('storage/sync audit warning: ' + String((storageSyncAudit.issues || []).join(', ') || storageSyncAudit.status || 'kontrola'));
  }
  if (storageSyncSmokeReport && storageSyncSmokeReport.ok === false) {
    warnings.push('storage/sync smoke report failed: ' + String(storageSyncSmokeReport.lastError || storageSyncSmokeReport.status || 'kontrola'));
  }
  if (storageManualCleanupGuard && storageManualCleanupGuard.autoCleanupEnabled) {
    issues.push('storage manual cleanup guard: auto cleanup enabled');
  }
  if (storageSyncClosure && storageSyncClosure.ok === false) {
    warnings.push('storage/sync closure warning: ' + String((storageSyncClosure.issues || []).join(', ') || storageSyncClosure.status || 'kontrola'));
  }
  if (supabaseClientQueueAudit && supabaseClientQueueAudit.ok === false) {
    warnings.push('Supabase client/queue audit warning: ' + String((supabaseClientQueueAudit.issues || []).join(', ') || supabaseClientQueueAudit.status || 'kontrola'));
  }
  if (supabaseQueueSmokeReport && supabaseQueueSmokeReport.ok === false) {
    warnings.push('Supabase queue smoke warning: ' + String((supabaseQueueSmokeReport.lastIssueSample || []).join(', ') || supabaseQueueSmokeReport.status || 'kontrola'));
  }
  if (supabaseQueueClosure && supabaseQueueClosure.ok === false) {
    warnings.push('Supabase queue closure warning: ' + String((supabaseQueueClosure.issues || []).join(', ') || supabaseQueueClosure.status || 'kontrola'));
  }
  if (onlineGameContracts && onlineGameContracts.ok === false) {
    warnings.push('Online game contracts warning: ' + String((onlineGameContracts.issues || []).join(', ') || onlineGameContracts.status || 'kontrola'));
  }

  return {
    ok: issues.length === 0,
    mode: 'audit-baseline-split-release-readiness-v923',
    checkedAt,
    version: currentVersion || 'unknown',
    issueCount: issues.length,
    warningCount: warnings.length,
    issues: issues.slice(0, 12),
    warnings: warnings.slice(0, 12),
    externalScriptCount: externalScripts.length,
    externalScripts: externalScripts.slice(0, 8),
    externalDependencyStatus,
    externalDependencyStatusCount: Object.keys(externalDependencyStatus || {}).length,
    externalDependencyFailedCount: Object.keys(externalDependencyStatus || {}).filter((key) => String(externalDependencyStatus[key] && externalDependencyStatus[key].status || '') === 'failed').length,
    exportSmokeReportLinked: !!exportSmokeReport,
    exportSmokeReportOk: exportSmokeReport ? exportSmokeReport.ok : null,
    exportSmokeReportStatus: exportSmokeReport ? String(exportSmokeReport.status || '—') : '—',
    exportSmokeReportLastStage: exportSmokeReport ? String(exportSmokeReport.lastStage || '—') : '—',
    exportSmokeReportFailureCount: exportSmokeReport ? Number(exportSmokeReport.failureCount || 0) : 0,
    exportSmokeReportMissingFileCount: exportSmokeReport ? Number((exportSmokeReport.missingTextFileCount || 0) + (exportSmokeReport.missingBinaryFileCount || 0)) : 0,
    domActionSmokeReportLinked: !!domActionSmokeReport,
    domActionSmokeReportOk: domActionSmokeReport ? domActionSmokeReport.ok : null,
    domActionSmokeReportStatus: domActionSmokeReport ? String(domActionSmokeReport.status || '—') : '—',
    domActionSmokeReportRunCount: domActionSmokeReport ? Number(domActionSmokeReport.runCount || 0) : 0,
    supabaseClientQueueAuditAvailable: !!supabaseClientQueueAudit,
    supabaseClientQueueAuditOk: supabaseClientQueueAudit ? !!supabaseClientQueueAudit.ok : null,
    supabaseClientQueuePhasePercent: supabaseClientQueueAudit ? Number(supabaseClientQueueAudit.phasePercent || 0) : 0,
    supabaseClientQueueLength: supabaseClientQueueAudit ? Number(supabaseClientQueueAudit.queueLength || 0) : 0,
    supabaseQueueClosureAvailable: !!supabaseQueueClosure,
    supabaseQueueClosureOk: supabaseQueueClosure ? !!supabaseQueueClosure.ok : null,
    supabaseQueueClosurePhasePercent: supabaseQueueClosure ? Number(supabaseQueueClosure.phasePercent || 0) : 0,
    onlineGameContractsAvailable: !!onlineGameContracts,
    onlineGameContractsOk: onlineGameContracts ? !!onlineGameContracts.ok : null,
    onlineGameContractsPhasePercent: onlineGameContracts ? Number(onlineGameContracts.phasePercent || 0) : 0,
    onlineGameContractsFallbackCount: onlineGameContracts ? Number(onlineGameContracts.fallbackCount || 0) : 0,
    domActionSmokeReportIssueCount: domActionSmokeReport ? Number(domActionSmokeReport.issueCount || 0) : 0,
    domActionSmokeReportWarningCount: domActionSmokeReport ? Number(domActionSmokeReport.warningCount || 0) : 0,
    storageSyncAuditLinked: !!storageSyncAudit,
    storageSyncAuditOk: storageSyncAudit ? storageSyncAudit.ok : null,
    storageSyncAuditPhasePercent: storageSyncAudit ? Number(storageSyncAudit.phasePercent || 0) : 0,
    storageSyncAuditWarningCount: storageSyncAudit ? Number(storageSyncAudit.warningCount || 0) : 0,
    storageSyncAuditIssueCount: storageSyncAudit ? Number(storageSyncAudit.issueCount || 0) : 0,
    storageSyncSmokeReportLinked: !!storageSyncSmokeReport,
    storageSyncSmokeReportOk: storageSyncSmokeReport ? storageSyncSmokeReport.ok : null,
    storageSyncSmokeReportStatus: storageSyncSmokeReport ? String(storageSyncSmokeReport.status || '—') : '—',
    storageSyncSmokeReportRunCount: storageSyncSmokeReport ? Number(storageSyncSmokeReport.runCount || 0) : 0,
    storageManualCleanupGuardLinked: !!storageManualCleanupGuard,
    storageManualCleanupGuardOk: storageManualCleanupGuard ? storageManualCleanupGuard.ok : null,
    storageManualCleanupGuardAutoCleanupEnabled: storageManualCleanupGuard ? !!storageManualCleanupGuard.autoCleanupEnabled : false,
    storageManualCleanupGuardCandidateCount: storageManualCleanupGuard ? Number(storageManualCleanupGuard.candidateCount || 0) : 0,
    storageSyncClosureLinked: !!storageSyncClosure,
    storageSyncClosureOk: storageSyncClosure ? storageSyncClosure.ok : null,
    storageSyncClosurePhasePercent: storageSyncClosure ? Number(storageSyncClosure.phasePercent || 0) : 0,
    storageSyncClosureIssueCount: storageSyncClosure ? Number(storageSyncClosure.issueCount || 0) : 0,
    storageSyncClosureWarningCount: storageSyncClosure ? Number(storageSyncClosure.warningCount || 0) : 0,
    supabaseClientQueueAuditLinked: !!supabaseClientQueueAudit,
    supabaseClientQueueAuditOk: supabaseClientQueueAudit ? supabaseClientQueueAudit.ok : null,
    supabaseClientQueuePhasePercent: supabaseClientQueueAudit ? Number(supabaseClientQueueAudit.phasePercent || 0) : 0,
    supabaseClientQueueLength: supabaseClientQueueAudit ? Number(supabaseClientQueueAudit.queueLength || 0) : 0,
    supabaseQueueClosureAvailable: !!supabaseQueueClosure,
    supabaseQueueClosureOk: supabaseQueueClosure ? !!supabaseQueueClosure.ok : null,
    supabaseQueueClosurePhasePercent: supabaseQueueClosure ? Number(supabaseQueueClosure.phasePercent || 0) : 0,
    supabaseClientQueueStaleTaskCount: supabaseClientQueueAudit ? Number(supabaseClientQueueAudit.queueStaleTaskCount || 0) : 0,
    supabaseQueueSmokeReportLinked: !!supabaseQueueSmokeReport,
    supabaseQueueSmokeReportOk: supabaseQueueSmokeReport ? supabaseQueueSmokeReport.ok : null,
    supabaseQueueSmokeReportStatus: supabaseQueueSmokeReport ? String(supabaseQueueSmokeReport.status || '—') : '—',
    supabaseQueueClosureLinked: !!supabaseQueueClosure,
    supabaseQueueClosureOk: supabaseQueueClosure ? supabaseQueueClosure.ok : null,
    supabaseQueueClosurePhasePercent: supabaseQueueClosure ? Number(supabaseQueueClosure.phasePercent || 0) : 0,
    supabaseQueueClosureIssueCount: supabaseQueueClosure ? Number(supabaseQueueClosure.issueCount || 0) : 0,
    supabaseQueueClosureWarningCount: supabaseQueueClosure ? Number(supabaseQueueClosure.warningCount || 0) : 0,
    externalLinkCount: externalLinks.length,
    externalLinks: externalLinks.slice(0, 8),
    requiredChecks: [
      'manifest + app ikony v assets/app-icons',
      'service worker cache verze sedí s buildem',
      'ZIP bez vnitřní hlavní složky a jen assets/ jako složka',
      'root SQL soubory nejsou v release kořeni',
      'JS syntax všech modulů',
      'manifest JSON',
      'duplicitní DOM ID',
      'CSS brace kontrola',
      'browser/mobil smoke po nasazení',
      'rollback bod a release baseline dokumentace',
      'architecture/boot baseline dokumentace a refactor backlog',
      'export smoke report napojený na release readiness',
      'DOM/action registry smoke report napojený na release readiness bez přepojení navigace/renderu/her',
      'storage/localStorage a offline/sync audit jako read-only kontrola bez mazání dat',
      'storage/sync smoke report a ruční cleanup guard bez automatického mazání dat',
      'storage/sync closure fáze 100 % bez automatického mazání dat',
      'Supabase klient/offline queue audit read-only bez DB změn a bez automatického flush/mazání',
      'Supabase client/offline queue closure 100 % bez DB změn, policies, auto flush nebo mazání',
      'release ops checklist, monitoring mapa a rollback playbook jako read-only closure'
    ]
  };
}
window.getRakReleaseReadinessHealth = getRakReleaseReadinessHealth;

function getRakArchitectureBaselineHealth() {
  const issues = [];
  const warnings = [];
  const checkedAt = new Date().toISOString();
  const version = String(window.APP_VERSION || '').trim();
  let scripts = [];
  let stylesheets = [];
  let dataActionCount = 0;
  let duplicateIds = [];
  let moduleReadiness = null;
  let bootSequence = null;
  let namespaceHealth = null;
  let exportReleaseTooling = null;
  let domActionRegistry = null;
  let domActionSmokeReport = null;
  let storageSyncAudit = null;
  let supabaseClientQueueAudit = null;
  let supabaseQueueClosure = null;
  let onlineGameContracts = null;

  try {
    scripts = Array.from(document.scripts || [])
      .map((script) => String(script && script.getAttribute ? (script.getAttribute('src') || 'inline') : 'inline'));
  } catch (err) {
    warnings.push('script inventory unavailable');
  }

  try {
    stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"][href]') || [])
      .map((link) => String(link && link.getAttribute ? link.getAttribute('href') || '' : '').trim())
      .filter(Boolean);
  } catch (err) {
    warnings.push('stylesheet inventory unavailable');
  }

  try {
    dataActionCount = document.querySelectorAll('[data-action]').length;
  } catch (err) {
    warnings.push('data-action inventory unavailable');
  }

  try {
    duplicateIds = typeof getPhaseTenDuplicateDomIds === 'function' ? getPhaseTenDuplicateDomIds() : [];
  } catch (err) {
    duplicateIds = [];
  }

  try {
    moduleReadiness = readRakDiagnosticForAudit('health', 'getRakModuleReadinessHealth');
  } catch (err) {
    moduleReadiness = null;
  }

  try {
    bootSequence = readRakDiagnosticForAudit('bootSequence', 'getRakBootSequenceHealth');
  } catch (err) {
    bootSequence = null;
  }

  try {
    namespaceHealth = readRakDiagnosticForAudit('namespace', 'getRakNamespaceHealth');
  } catch (err) {
    namespaceHealth = null;
  }

  try {
    exportReleaseTooling = readRakDiagnosticForAudit('exportReleaseTooling', 'getRakExportReleaseToolingHealth');
  } catch (err) {
    exportReleaseTooling = null;
  }

  try {
    domActionRegistry = readRakDiagnosticForAudit('domActionRegistry', 'getRakDomActionRegistryHealth');
  } catch (err) {
    domActionRegistry = null;
  }

  try {
    domActionSmokeReport = readRakDiagnosticForAudit('domActionSmokeReport', 'getRakDomActionSmokeReport');
  } catch (err) {
    domActionSmokeReport = null;
  }

  try {
    supabaseClientQueueAudit = readRakDiagnosticForAudit('supabaseClientQueueAudit', 'getRakSupabaseClientQueueAuditHealth');
  } catch (err) {
    supabaseClientQueueAudit = null;
  }

  try {
    supabaseQueueClosure = readRakDiagnosticForAudit('supabaseQueueClosure', 'getRakSupabaseQueueClosureHealth');
  } catch (err) {
    supabaseQueueClosure = null;
  }
  try {
    onlineGameContracts = readRakDiagnosticForAudit('onlineGameContracts', 'getRakOnlineGameContractAuditHealth');
  } catch (err) {
    onlineGameContracts = null;
  }


  const requiredGlobals = [
    'app',
    'openPage',
    'renderCurrentPage',
    'getRakReleaseReadinessHealth',
    'getRakModuleReadinessHealth',
    'RaK',
    'getRakNamespaceHealth',
    'getRakRuntimeGuardHealth',
    'getRakStorageSyncAuditHealth',
    'getRakBootSequenceHealth',
    'getRakExportReleaseToolingHealth',
    'getRakDomActionRegistryHealth',
    'getRakDomActionSmokeReport',
    'getRakSupabaseClientQueueAuditHealth',
    'getRakSupabaseQueueSmokeReport',
    'getRakSupabaseQueueClosureHealth',
    'getRakOnlineGameContractAuditHealth',
    'getPwaHardeningStatus',
    'getSupabaseHardeningStatus'
  ];
  const missingGlobals = requiredGlobals.filter((name) => typeof window[name] === 'undefined');
  if (missingGlobals.length) issues.push('missing globals: ' + missingGlobals.join(', '));
  if (!/^v\.\d+\.\d+ \(\d+\)$/.test(version)) issues.push('version format');
  if (!scripts.some((src) => /data\.js$/.test(src))) warnings.push('data.js script not visible in boot inventory');
  if (!scripts.some((src) => /module-readiness\.js$/.test(src))) issues.push('module-readiness.js script missing');
  if (!scripts.some((src) => /rak-namespace\.js$/.test(src))) issues.push('rak-namespace.js script missing');
  if (!scripts.some((src) => /rak-audit-baseline\.js$/.test(src))) issues.push('rak-audit-baseline.js script missing');
  if (!scripts.some((src) => /rak-runtime-health\.js$/.test(src))) issues.push('rak-runtime-health.js script missing');
  if (!scripts.some((src) => /rak-storage-sync-audit\.js$/.test(src))) issues.push('rak-storage-sync-audit.js script missing');
  if (!scripts.some((src) => /rak-boot-sequence-audit\.js$/.test(src))) issues.push('rak-boot-sequence-audit.js script missing');
  if (!scripts.some((src) => /rak-export-release-audit\.js$/.test(src))) issues.push('rak-export-release-audit.js script missing');
  if (!scripts.some((src) => /rak-dom-action-audit\.js$/.test(src))) issues.push('rak-dom-action-audit.js script missing');
  if (!scripts.some((src) => /rak-supabase-client-audit\.js$/.test(src))) issues.push('rak-supabase-client-audit.js script missing');
  if (!scripts.some((src) => /app\.js$/.test(src))) issues.push('app.js script missing');
  if (!scripts.some((src) => /app-init\.js$/.test(src))) issues.push('app-init.js script missing');
  if (!stylesheets.some((href) => /styles\.css$/.test(href))) issues.push('main stylesheet missing');
  if (!stylesheets.some((href) => /styles-overrides\.css$/.test(href))) warnings.push('final override stylesheet not visible');
  if (duplicateIds.length) issues.push('duplicate DOM ids: ' + duplicateIds.length);
  if (!moduleReadiness) warnings.push('module readiness registry unavailable');
  else if (!moduleReadiness.ok) issues.push('module readiness incomplete: ' + String(moduleReadiness.missingCount || 0) + ' missing, ' + String(moduleReadiness.errorCount || 0) + ' errors');
  if (!bootSequence) warnings.push('boot sequence audit unavailable');
  else if (!bootSequence.ok) issues.push('boot sequence audit: ' + String(bootSequence.issueCount || 0) + ' issues');
  if (!namespaceHealth) warnings.push('RaK namespace health unavailable');
  else if (!namespaceHealth.ok) issues.push('RaK namespace bridge: ' + String(namespaceHealth.issueCount || 0) + ' issues');
  if (!exportReleaseTooling) warnings.push('export/release tooling health unavailable');
  else if (!exportReleaseTooling.ok) issues.push('export/release tooling: ' + String(exportReleaseTooling.issueCount || 0) + ' issues');
  if (!domActionRegistry) warnings.push('DOM/action registry health unavailable');
  else if (!domActionRegistry.ok) issues.push('DOM/action registry: ' + String(domActionRegistry.issueCount || 0) + ' issues');
  if (!domActionSmokeReport) warnings.push('DOM/action smoke report unavailable');
  else if (domActionSmokeReport.ok === false) warnings.push('DOM/action smoke report: ' + String(domActionSmokeReport.status || 'kontrola'));
  if (!supabaseClientQueueAudit) warnings.push('Supabase client/queue audit unavailable');
  else if (!supabaseClientQueueAudit.ok) warnings.push('Supabase client/queue audit warnings: ' + String(supabaseClientQueueAudit.warningCount || 0));
  if (!supabaseQueueClosure) warnings.push('Supabase queue closure unavailable');
  else if (!supabaseQueueClosure.ok) warnings.push('Supabase queue closure warnings: ' + String(supabaseQueueClosure.warningCount || 0));
  if (!onlineGameContracts) warnings.push('Online game contracts audit unavailable');
  else if (!onlineGameContracts.ok) warnings.push('Online game contracts warnings: ' + String(onlineGameContracts.warningCount || 0));

  return {
    ok: issues.length === 0,
    mode: 'audit-baseline-split-architecture-boot-audit-v923',
    checkedAt,
    version: version || 'unknown',
    issueCount: issues.length,
    warningCount: warnings.length,
    issues: issues.slice(0, 12),
    warnings: warnings.slice(0, 12),
    scriptCount: scripts.length,
    scripts: scripts.slice(0, 24),
    stylesheetCount: stylesheets.length,
    stylesheets: stylesheets.slice(0, 16),
    dataActionCount,
    duplicateIdCount: duplicateIds.length,
    requiredGlobals,
    missingGlobals,
    moduleReadinessOk: !!(moduleReadiness && moduleReadiness.ok),
    moduleExpectedCount: moduleReadiness ? Number(moduleReadiness.expectedCount || 0) : 0,
    moduleLoadedCount: moduleReadiness ? Number(moduleReadiness.loadedCount || 0) : 0,
    moduleMissingCount: moduleReadiness ? Number(moduleReadiness.missingCount || 0) : 0,
    moduleErrorCount: moduleReadiness ? Number(moduleReadiness.errorCount || 0) : 0,
    moduleBootDurationMs: moduleReadiness ? Number(moduleReadiness.bootDurationMs || 0) : 0,
    moduleOrderMismatch: !!(moduleReadiness && moduleReadiness.orderMismatch),
    moduleLoadedOrder: moduleReadiness && Array.isArray(moduleReadiness.loadedOrder) ? moduleReadiness.loadedOrder.slice(0, 24) : [],
    moduleMissing: moduleReadiness && Array.isArray(moduleReadiness.missing) ? moduleReadiness.missing.slice(0, 12) : [],
    bootSequenceOk: !!(bootSequence && bootSequence.ok),
    bootSequenceIssueCount: bootSequence ? Number(bootSequence.issueCount || 0) : 0,
    bootSequenceWarningCount: bootSequence ? Number(bootSequence.warningCount || 0) : 0,
    bootStaticOrderOk: !!(bootSequence && bootSequence.staticOrderOk),
    bootDynamicOrderOk: !!(bootSequence && bootSequence.dynamicOrderOk),
    bootDynamicMissingCount: bootSequence ? Number(bootSequence.dynamicMissingCount || 0) : 0,
    namespaceBridgeOk: !!(namespaceHealth && namespaceHealth.ok),
    namespaceIssueCount: namespaceHealth ? Number(namespaceHealth.issueCount || 0) : 0,
    namespaceWarningCount: namespaceHealth ? Number(namespaceHealth.warningCount || 0) : 0,
    namespaceCompatibility: namespaceHealth ? String(namespaceHealth.compatibility || '') : '',
    namespaceMapCount: namespaceHealth ? Number(namespaceHealth.namespaceMapCount || 0) : 0,
    namespaceRefactorProgressPercent: namespaceHealth ? Number(namespaceHealth.refactorProgressPercent || 0) : 0,
    namespacePassiveBridgeOnly: !!(namespaceHealth && namespaceHealth.passiveBridgeOnly),
    exportReleaseToolingOk: !!(exportReleaseTooling && exportReleaseTooling.ok),
    exportReleaseToolingIssueCount: exportReleaseTooling ? Number(exportReleaseTooling.issueCount || 0) : 0,
    exportReleaseToolingWarningCount: exportReleaseTooling ? Number(exportReleaseTooling.warningCount || 0) : 0,
    exportSourceIdCount: exportReleaseTooling ? Number(exportReleaseTooling.sourceIdCount || 0) : 0,
    exportBinaryFileCount: exportReleaseTooling ? Number(exportReleaseTooling.binaryFileCount || 0) : 0,
    domActionRegistryOk: !!(domActionRegistry && domActionRegistry.ok),
    domActionRegistryIssueCount: domActionRegistry ? Number(domActionRegistry.issueCount || 0) : 0,
    domActionRegistryWarningCount: domActionRegistry ? Number(domActionRegistry.warningCount || 0) : 0,
    domActionRegistryActionCount: domActionRegistry ? Number(domActionRegistry.actionElementCount || 0) : 0,
    domActionRegistryUnknownCount: domActionRegistry ? Number(domActionRegistry.unknownActionCount || 0) : 0,
    domActionSmokeReportStatus: domActionSmokeReport ? String(domActionSmokeReport.status || '—') : '—',
    domActionSmokeReportRunCount: domActionSmokeReport ? Number(domActionSmokeReport.runCount || 0) : 0,
    supabaseClientQueueAuditAvailable: !!supabaseClientQueueAudit,
    supabaseClientQueueAuditOk: supabaseClientQueueAudit ? !!supabaseClientQueueAudit.ok : null,
    supabaseClientQueuePhasePercent: supabaseClientQueueAudit ? Number(supabaseClientQueueAudit.phasePercent || 0) : 0,
    supabaseClientQueueLength: supabaseClientQueueAudit ? Number(supabaseClientQueueAudit.queueLength || 0) : 0,
    supabaseQueueClosureAvailable: !!supabaseQueueClosure,
    supabaseQueueClosureOk: supabaseQueueClosure ? !!supabaseQueueClosure.ok : null,
    supabaseQueueClosurePhasePercent: supabaseQueueClosure ? Number(supabaseQueueClosure.phasePercent || 0) : 0,
    onlineGameContractsAvailable: !!onlineGameContracts,
    onlineGameContractsOk: onlineGameContracts ? !!onlineGameContracts.ok : null,
    onlineGameContractsPhasePercent: onlineGameContracts ? Number(onlineGameContracts.phasePercent || 0) : 0,
    onlineGameContractsFallbackCount: onlineGameContracts ? Number(onlineGameContracts.fallbackCount || 0) : 0,
    architectureBootAuditPercent: 100,
    namespaceDiagnosticsReadOnly: !!(window.RaK && window.RaK.diagnostics && typeof window.RaK.diagnostics.read === 'function'),
    architectureBootAuditClosed: true,
    nextRecommendedPhase: 'phase E DOM/action registry audit uzavřený; další směr je pouze read-only sledování a případný budoucí handler refactor po samostatném rozhodnutí',
    runtimeLayers: [
      'index.html boot shell + CDN dependency notes',
      'core/app state + routing',
      'ui rendering + delegated actions',
      'domain modules: dashboard/rotace/stats/kalkulacky/games',
      'localStorage/sessionStorage persistence',
      'Supabase bridge + realtime + queue',
      'PWA service worker/cache/export'
    ],
    refactorBacklog: [
      'phase A: boot order guard + explicit module readiness map – hotovo a uzavřeno',
      'phase B: split app.js runtime audits from page/business logic – module readiness, release/architecture, runtime health a boot sequence uzavřené',
      'phase C: window.RaK namespace read-only mapa a fallbacky – hotovo a uzavřeno ve v875; navigace/render/hry zůstávají mimo přepojení',
      'phase D: isolate export/release tooling from runtime app code – uzavřeno ve v880 přes manifest, preflight, smoke report a release readiness linkage',
      'phase E: DOM/action registry audit a DOM smoke testy pro zamčené sekce – uzavřeno ve v885 přes release readiness linkage bez změny funkčnosti',
      'phase G: storage/localStorage a offline/sync audit – uzavřeno ve v889 jako read-only diagnostika bez mazání dat',
      'phase H: Supabase client/offline queue audit – uzavřen ve v892 jako read-only diagnostika bez DB změn, policies, auto flush nebo mazání',
      'phase I: Online game create/accept/save contract audit – uzavřen ve v901 jako read-only diagnostika bez DB změn, policies a zásahu do online flow',
      'phase J: release readiness / monitoring / rollback checklist – uzavřen ve v902 jako read-only release ops vrstva'
    ]
  };
}
window.getRakArchitectureBaselineHealth = getRakArchitectureBaselineHealth;

  try {
    const ended = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (typeof window.rakMarkModuleReady === 'function') {
      window.rakMarkModuleReady('rak-audit-baseline.js', 'loaded', { source: 'index', durationMs: ended - started });
    }
  } catch (err) {}
})();
