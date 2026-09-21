// RaK 1.2 (1.155) – runtime health helpery.

(function setupRakRuntimeHealthHelpers() {
  const started = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

  try {
    if (typeof window.rakMarkModuleReady === 'function') {
      window.rakMarkModuleReady('rak-runtime-health.js', 'loading', { source: 'index' });
    }
  } catch (err) {}

  function nowIso() {
    try { return new Date().toISOString(); } catch (err) { return ''; }
  }

  function getRuntimeStorageSnapshot() {
    const health = {
      ok: false,
      writable: false,
      itemCount: 0,
      largeKeyCount: 0,
      largeKeys: [],
      error: '',
      navigatorOnline: typeof navigator !== 'undefined' ? navigator.onLine !== false : true,
      visibilityState: typeof document !== 'undefined' ? String(document.visibilityState || 'unknown') : 'unknown'
    };

    try {
      if (typeof window.getPhaseTenStorageHealth === 'function') {
        const phaseTen = window.getPhaseTenStorageHealth() || {};
        return Object.assign(health, phaseTen, {
          largeKeyCount: Array.isArray(phaseTen.largeKeys) ? phaseTen.largeKeys.length : 0
        });
      }

      const probeKey = '__rak_runtime_health_probe__';
      localStorage.setItem(probeKey, '1');
      localStorage.removeItem(probeKey);
      health.ok = true;
      health.writable = true;
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
      health.largeKeyCount = health.largeKeys.length;
    } catch (err) {
      health.error = String(err && err.message ? err.message : err || 'runtime storage error');
    }

    return health;
  }

  function getStatsYearScopeHealth() {
    const health = {
      ok: true,
      mode: 'current-year-excludes-future-imported-months-v897',
      selectedYear: null,
      currentYear: null,
      currentMonth: null,
      importedMonthCount: 0,
      countedMonthCount: 0,
      futureImportedMonthCount: 0,
      futureImportedMonths: [],
      note: ''
    };

    try {
      const selectedYear = parseInt((window.app && window.app.selectedStatsYear) || (new Date()).getFullYear(), 10);
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const rotation = window.app && Array.isArray(window.app.rotation) ? window.app.rotation : [];
      const monthKeys = [];
      rotation.forEach((row) => {
        const key = String(row && row.monthKey || '').trim();
        if (key && !monthKeys.includes(key)) monthKeys.push(key);
      });
      const parsed = monthKeys.map((key) => {
        const parsedKey = typeof window.parseMonthKey === 'function' ? window.parseMonthKey(key) : null;
        return parsedKey ? { key, month: parsedKey.month, year: parsedKey.year } : null;
      }).filter(Boolean).filter((item) => item.year === selectedYear);
      const counted = parsed.filter((item) => {
        if (selectedYear > currentYear) return false;
        if (selectedYear === currentYear) return item.month <= currentMonth;
        return true;
      });
      const future = parsed.filter((item) => selectedYear === currentYear && item.month > currentMonth);

      health.selectedYear = Number.isFinite(selectedYear) ? selectedYear : null;
      health.currentYear = currentYear;
      health.currentMonth = currentMonth;
      health.importedMonthCount = parsed.length;
      health.countedMonthCount = counted.length;
      health.futureImportedMonthCount = future.length;
      health.futureImportedMonths = future.map((item) => item.key).slice(0, 12);
      health.note = future.length
        ? 'Statistiky u aktuálního roku počítají jen měsíce do aktuálního měsíce; budoucí nahrané měsíce jsou jen pro plánování.'
        : 'Statistiky u aktuálního roku nemají nahrané budoucí měsíce mimo aktuální započtený rozsah.';
    } catch (err) {
      health.ok = false;
      health.note = String(err && err.message ? err.message : err || 'stats scope health error');
    }

    return health;
  }

  window.getRakStatsYearScopeHealth = getStatsYearScopeHealth;

  window.getRakRuntimeGuardHealth = function getRakRuntimeGuardHealth() {
    const issues = [];
    const warnings = [];
    const storage = getRuntimeStorageSnapshot();
    const statsScope = getStatsYearScopeHealth();
    const pwa = typeof window.getPwaHardeningStatus === 'function' ? window.getPwaHardeningStatus() : null;
    const release = typeof window.getRakReleaseReadinessHealth === 'function' ? window.getRakReleaseReadinessHealth() : null;
    const moduleReadiness = typeof window.getRakModuleReadinessHealth === 'function' ? window.getRakModuleReadinessHealth() : null;
    const storageSyncAudit = typeof window.getRakStorageSyncAuditHealth === 'function' ? window.getRakStorageSyncAuditHealth() : null;
    const storageSyncSmokeReport = typeof window.getRakStorageSyncSmokeReport === 'function' ? window.getRakStorageSyncSmokeReport() : null;
    const storageSyncClosure = typeof window.getRakStorageSyncClosureHealth === 'function' ? window.getRakStorageSyncClosureHealth() : null;
    const releaseOpsClosure = typeof window.getRakReleaseOpsClosureHealth === 'function' ? window.getRakReleaseOpsClosureHealth() : null;

    if (!storage.ok || !storage.writable) issues.push('localStorage not writable');
    if (pwa && pwa.swVersionMismatch) issues.push('service worker cache version mismatch');
    if (release && !release.ok) warnings.push('release readiness warning: ' + String((release.issues || []).join(', ') || 'kontrola'));
    if (moduleReadiness && !moduleReadiness.ok) warnings.push('module readiness incomplete');
    if (storageSyncAudit && storageSyncAudit.ok === false) warnings.push('storage/sync audit warning: ' + String((storageSyncAudit.issues || []).join(', ') || 'kontrola'));
    if (storageSyncSmokeReport && storageSyncSmokeReport.ok === false) warnings.push('storage/sync smoke warning: ' + String(storageSyncSmokeReport.lastError || storageSyncSmokeReport.status || 'kontrola'));
    if (storageSyncClosure && storageSyncClosure.ok === false) warnings.push('storage/sync closure warning: ' + String((storageSyncClosure.issues || []).join(', ') || storageSyncClosure.status || 'kontrola'));
    if (releaseOpsClosure && releaseOpsClosure.ok === false) warnings.push('release ops closure warning: ' + String((releaseOpsClosure.issues || []).join(', ') || releaseOpsClosure.status || 'kontrola'));
    if (statsScope && statsScope.futureImportedMonthCount > 0) warnings.push('budoucí měsíce ve statistikách zatím nejsou započtené: ' + statsScope.futureImportedMonths.join(', '));

    return {
      ok: issues.length === 0,
      mode: 'runtime-health-split-storage-pwa-stats-scope-v923',
      checkedAt: nowIso(),
      version: String(window.APP_VERSION || 'unknown'),
      issueCount: issues.length,
      warningCount: warnings.length,
      issues: issues.slice(0, 12),
      warnings: warnings.slice(0, 12),
      storage,
      statsScope,
      pwaOk: pwa ? !pwa.swVersionMismatch : null,
      releaseOk: release ? !!release.ok : null,
      moduleReadinessOk: moduleReadiness ? !!moduleReadiness.ok : null,
      storageSyncAuditOk: storageSyncAudit ? storageSyncAudit.ok : null,
      storageSyncAuditWarningCount: storageSyncAudit ? Number(storageSyncAudit.warningCount || 0) : 0,
      storageSyncSmokeReportStatus: storageSyncSmokeReport ? String(storageSyncSmokeReport.status || '—') : '—',
      storageSyncSmokeReportOk: storageSyncSmokeReport ? storageSyncSmokeReport.ok : null,
      storageSyncClosureOk: storageSyncClosure ? storageSyncClosure.ok : null,
      storageSyncClosurePhasePercent: storageSyncClosure ? Number(storageSyncClosure.phasePercent || 0) : 0,
      releaseOpsClosureOk: releaseOpsClosure ? !!releaseOpsClosure.ok : null,
      releaseOpsPhasePercent: releaseOpsClosure ? Number(releaseOpsClosure.phasePercent || 0) : 0,
      releaseOpsManualCount: releaseOpsClosure ? Number(releaseOpsClosure.checklistManualCount || 0) : 0
    };
  };

  try {
    const ended = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (typeof window.rakMarkModuleReady === 'function') {
      window.rakMarkModuleReady('rak-runtime-health.js', 'loaded', { source: 'index', durationMs: ended - started });
    }
  } catch (err) {}
})();
