// RaK 1.6.03 – online synchronizace rozpisů + secure write gate pro legacy Supabase fallbacky.
function applyRakRotationState(payload, options) {
  const next = typeof normalizeRotationData === 'function' ? normalizeRotationData(payload) : payload;
  if (!next || !next.months) return null;

  const nextText = JSON.stringify(next);
  const currentText = JSON.stringify(typeof app !== 'undefined' && app.rotation ? app.rotation : null);
  if (!options?.force && nextText === currentText) return next;

  if (typeof app !== 'undefined') {
    app.rotation = next;
    if (!app.selectedYear || !getAvailableYears(app.rotation).includes(parseInt(app.selectedYear, 10))) {
      app.selectedYear = getInitialSelectedYear(app.rotation);
    }
  }

  if (typeof saveRotationData === 'function') saveRotationData();
  if (typeof renderRotace === 'function') renderRotace();
  if (typeof renderStatsPanel === 'function') renderStatsPanel();
  if (typeof app !== 'undefined' && app.selectedMonth && typeof renderMonth === 'function') renderMonth(app.selectedMonth);
  if (typeof app !== 'undefined' && app.selectedName && typeof renderPerson === 'function') renderPerson(app.selectedName);
  if (typeof updateImportBoxVisibility === 'function') updateImportBoxVisibility();
  return next;
}

function refreshRakMachineSettingsInBackground(bridge) {
  if (!bridge || typeof bridge.loadMachineSettings !== 'function' || typeof app === 'undefined') return;
  void bridge.loadMachineSettings()
    .then((rows) => {
      if (Array.isArray(rows) && rows.length) app.machineSettingsRows = rows;
    })
    .catch((settingsErr) => console.warn('Machine settings sync failed', settingsErr));
}

async function syncRotationFromSupabase(force) {
  const bridge = window.RotationSupabaseBridge;
  if (!bridge || typeof bridge.loadRotationState !== 'function') return null;
  if (force !== 'discard-draft' && typeof app !== 'undefined' && app && app.adminRotationDirty === true && document.getElementById('adminRotationEditor')) return null;
  try {
    if (typeof bridge.loadCachedRotationState === 'function') {
      const cached = bridge.loadCachedRotationState();
      if (cached && cached.payload) applyRakRotationState(cached.payload, { force: false });
    }
    refreshRakMachineSettingsInBackground(bridge);
    const remote = await bridge.loadRotationState();
    if (!remote || !remote.payload) return null;
    return applyRakRotationState(remote.payload, { force: !!force });
  } catch (err) {
    console.warn('Supabase rotation sync failed', err);
    return null;
  }
}

function getRakAdminPinForWrite() {
  if (typeof app === 'undefined' || !app.adminUnlocked) return '';
  if (app.adminPin) return String(app.adminPin);
  try {
    return String(sessionStorage.getItem('adminPinSession') || '');
  } catch (err) {
    return '';
  }
}

function isRakAdminRotationWrite(meta) {
  if (typeof app === 'undefined' || !app.adminUnlocked) return false;
  const source = String(meta && meta.source ? meta.source : '').trim();
  return source === 'admin-menu'
    || source === 'admin-daymod'
    || source === 'excel-import'
    || source === 'admin-excel-import';
}

async function saveRotationToSupabase(rotation, meta) {
  const bridge = window.RotationSupabaseBridge;
  if (!bridge || typeof bridge.saveRotationState !== 'function') return { ok: false, reason: 'missing-bridge' };
  if (!isRakAdminRotationWrite(meta || {})) return { ok: false, reason: 'admin-required' };
  const adminPin = getRakAdminPinForWrite();
  if (!adminPin && !(typeof app !== 'undefined' && app && app.adminAuthVersion === 2)) return { ok: false, reason: 'admin-auth-required' };
  try {
    return await bridge.saveRotationState(rotation, meta || {}, { adminPin });
  } catch (err) {
    console.warn('Supabase rotation save helper failed', err);
    return { ok: false, error: err };
  }
}

function getRakSecureBridgeSnapshot(bridge) {
  try {
    return bridge && typeof bridge.getState === 'function' ? bridge.getState() : null;
  } catch (err) {
    return null;
  }
}

function getRakSecureAdminWriteState(bridge) {
  const state = getRakSecureBridgeSnapshot(bridge);
  const context = state && state.adminAuth ? state.adminAuth.context : null;
  const capabilities = state && state.adminAuth ? state.adminAuth.capabilities : null;
  const role = String(context && context.role || '').trim().toLowerCase();
  return {
    ok: !!(context && context.authenticated === true && context.account_id && (role === 'owner' || role === 'admin') && capabilities && capabilities.enforced === true),
    context,
    capabilities,
    client: state && state.client ? state.client : null
  };
}

async function ensureRakSecureAdminWriteState(bridge) {
  let status = getRakSecureAdminWriteState(bridge);
  if (status.ok) return status;
  try {
    if (bridge && typeof bridge.getAdminAuthCapabilities === 'function') {
      await bridge.getAdminAuthCapabilities({ force: false });
    }
  } catch (err) {}
  status = getRakSecureAdminWriteState(bridge);
  if (status.ok) return status;
  try {
    if (bridge && typeof bridge.loadAdminAuthContext === 'function') {
      await bridge.loadAdminAuthContext();
    }
  } catch (err) {}
  return getRakSecureAdminWriteState(bridge);
}

async function ensureRakSecureRpcCapability(bridge) {
  try {
    if (!bridge || typeof bridge.getAdminAuthCapabilities !== 'function') return false;
    const capabilities = await bridge.getAdminAuthCapabilities({ force: false });
    return !!(capabilities && capabilities.available === true && capabilities.enforced === true);
  } catch (err) {
    return false;
  }
}

function installRakSupabaseSecureWriteGate() {
  const bridge = window.RotationSupabaseBridge;
  if (!bridge || bridge.__rakSecureWriteGateV1603) return false;

  const originalSaveRotationMonthEntries = typeof bridge.saveRotationMonthEntries === 'function'
    ? bridge.saveRotationMonthEntries.bind(bridge)
    : null;
  const originalSaveAnnouncement = typeof bridge.saveDashboardAnnouncementOnline === 'function'
    ? bridge.saveDashboardAnnouncementOnline.bind(bridge)
    : null;
  const originalClearAnnouncement = typeof bridge.clearDashboardAnnouncementOnline === 'function'
    ? bridge.clearDashboardAnnouncementOnline.bind(bridge)
    : null;
  const originalAnnouncementStatus = typeof bridge.getDashboardAnnouncementOnlineStatus === 'function'
    ? bridge.getDashboardAnnouncementOnlineStatus.bind(bridge)
    : null;
  const originalSubmitBugReport = typeof bridge.submitBugReport === 'function'
    ? bridge.submitBugReport.bind(bridge)
    : null;
  const originalLoadBugReports = typeof bridge.loadBugReports === 'function'
    ? bridge.loadBugReports.bind(bridge)
    : null;
  const originalUpdateBugReportStatus = typeof bridge.updateBugReportStatus === 'function'
    ? bridge.updateBugReportStatus.bind(bridge)
    : null;
  const originalDeleteBugReport = typeof bridge.deleteBugReport === 'function'
    ? bridge.deleteBugReport.bind(bridge)
    : null;
  const originalFlushPendingWrites = typeof bridge.flushPendingWrites === 'function'
    ? bridge.flushPendingWrites.bind(bridge)
    : null;

  if (originalSaveRotationMonthEntries) {
    bridge.saveRotationMonthEntries = async (monthStart, label, rows) => {
      const secure = await ensureRakSecureAdminWriteState(bridge);
      if (!secure.ok) return { ok: false, reason: 'admin-auth-required', months: 0, entries: 0 };
      const result = await originalSaveRotationMonthEntries(monthStart, label, rows);
      if (!result || result.ok !== true) return result;
      return Object.assign({}, result, {
        months: Number.isFinite(Number(result.months)) ? Number(result.months) : 1,
        entries: Number.isFinite(Number(result.entries)) ? Number(result.entries) : (Array.isArray(rows) ? rows.length : 0)
      });
    };
  }

  if (originalSaveAnnouncement) {
    bridge.saveDashboardAnnouncementOnline = async (payload) => {
      const secure = await ensureRakSecureAdminWriteState(bridge);
      if (!secure.ok) return { ok: false, reason: 'admin-auth-required' };
      return await originalSaveAnnouncement(payload);
    };
  }

  if (originalClearAnnouncement) {
    bridge.clearDashboardAnnouncementOnline = async () => {
      const secure = await ensureRakSecureAdminWriteState(bridge);
      if (!secure.ok) return { ok: false, reason: 'admin-auth-required' };
      return await originalClearAnnouncement();
    };
  }

  if (originalAnnouncementStatus) {
    bridge.getDashboardAnnouncementOnlineStatus = () => Object.assign({}, originalAnnouncementStatus(), {
      writeMode: 'authenticated admin RPC save/clear only; direct table fallback closed by RaK 1.6.03'
    });
  }

  if (originalSubmitBugReport) {
    bridge.submitBugReport = async (payload) => {
      if (typeof navigator !== 'undefined' && navigator.onLine !== false) {
        const rpcReady = await ensureRakSecureRpcCapability(bridge);
        if (!rpcReady) return { ok: false, reason: 'secure-rpc-capability-required' };
      }
      return await originalSubmitBugReport(payload);
    };
  }

  if (originalLoadBugReports) {
    bridge.loadBugReports = async (options = {}) => {
      const secure = await ensureRakSecureAdminWriteState(bridge);
      if (!secure.ok) return { ok: false, reason: 'admin-auth-required', rows: [] };
      return await originalLoadBugReports(options);
    };
  }

  if (originalUpdateBugReportStatus) {
    bridge.updateBugReportStatus = async (id, status, note = '') => {
      const secure = await ensureRakSecureAdminWriteState(bridge);
      if (!secure.ok) return { ok: false, reason: 'admin-auth-required' };
      return await originalUpdateBugReportStatus(id, status, note);
    };
  }

  if (originalDeleteBugReport) {
    bridge.deleteBugReport = async (id) => {
      const secure = await ensureRakSecureAdminWriteState(bridge);
      if (!secure.ok) return { ok: false, reason: 'admin-auth-required' };
      return await originalDeleteBugReport(id);
    };
  }

  if (originalFlushPendingWrites) {
    bridge.flushPendingWrites = async (...args) => {
      if (typeof navigator !== 'undefined' && navigator.onLine !== false) {
        const rpcReady = await ensureRakSecureRpcCapability(bridge);
        if (!rpcReady) return { ok: false, reason: 'secure-rpc-capability-required' };
      }
      return await originalFlushPendingWrites(...args);
    };
    window.flushSupabaseSyncQueue = (...args) => bridge.flushPendingWrites(...args);
  }

  bridge.__rakSecureWriteGateV1603 = true;
  window.__rakSupabaseSecureWriteGate = Object.freeze({
    version: '1.6.03',
    mode: 'secure-rpc-gate',
    guarded: Object.freeze([
      'rotation_month_entries',
      'dashboard_announcements',
      'bug_report_submission',
      'bug_report_admin',
      'queued_writes'
    ])
  });

  if (typeof navigator === 'undefined' || navigator.onLine !== false) {
    void ensureRakSecureRpcCapability(bridge);
  }
  window.addEventListener('online', () => { void ensureRakSecureRpcCapability(bridge); }, { passive: true });
  return true;
}

window.syncRotationFromSupabase = syncRotationFromSupabase;
window.saveRotationToSupabase = saveRotationToSupabase;
installRakSupabaseSecureWriteGate();
