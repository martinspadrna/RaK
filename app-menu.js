// RAK_NO_RETIRED_GAMES_17021
// RaK 1.2 (1.155) – Více/menu shell a router; admin implementace je v samostatných modulech.
try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('app-menu.js', 'loaded', { source: 'dynamic-loader' }); } catch (err) {}


function formatRakDisplayVersion(version) {
  const text = String(version || '').trim();
  if (!text) return '—';
  return /^RaK\s+/i.test(text) ? text : ('RaK ' + text);
}

function getRakCurrentAppVersion() {
  const runtimeVersion = typeof APP_VERSION !== 'undefined'
    ? APP_VERSION
    : (typeof window !== 'undefined' ? window.APP_VERSION : '');
  if (String(runtimeVersion || '').trim()) return String(runtimeVersion).trim();
  return String((typeof app !== 'undefined' && app && app.version) || '').trim();
}

function ensureAppMenuOverlay() {
  let page = document.getElementById('menu');
  if (page) return page;

  page = document.createElement('div');
  page.id = 'menu';
  page.className = 'page appMenuPage';
  page.innerHTML = [
    '<div class="headerBar appMenuPageTitleBar">',
    '  <div></div>',
    '  <h3>Více</h3>',
    '  <div class="appMenuTitleSpacer"></div>',
    '</div>',
    '<div class="card appMenuPageCard">',
    '  <div class="appMenuBody" id="appMenuBody"></div>',
    '</div>'
  ].join('');

  document.body.appendChild(page);
  return page;
}

function hideAppMenu() {
  const page = document.getElementById('menu');
  if (!page) return;
  page.classList.remove('active');
}

function appMenuAdminModeSet() {
  return new Set([
    'home',
    'machines',
    'food',
    'vacation',
    'special-days',
    'rotation',
    'overtime',
    'generator-settings',
    'machine-tasks',
    'workers',
    'change-log',
    'monthly-workflow',
    'handover',
    'manual',
    'settings-map',
    'admin-accounts',
    'calendars',
    'external-links',
    'app-contact',
    'payroll-settings',
    'backups',
    'settings-backups',
    'announcement',
    'export',
    'reports',
    'service'
  ]);
}

function appMenuIsAdminInteraction(target, menuAction, adminAction, adminMonthKey, adminYearKey) {
  if (/^admin-/.test(String(menuAction || '').trim())) return true;
  if (adminAction || adminMonthKey || adminYearKey) return true;
  if (!target) return false;
  if (target.hasAttribute && (target.hasAttribute('data-admin-clear-field') || target.hasAttribute('data-admin-selected-remove'))) return true;
  return !!(target.matches && target.matches('[data-rot-field], [data-note-field]'));
}

function appMenuCanRunAdminInteraction(currentView) {
  const view = String(currentView || '').trim();
  return appMenuAdminModeSet().has(view)
    && typeof rakAdminCanOpenAdmin === 'function'
    && rakAdminCanOpenAdmin();
}

function appMenuPersistentAdminSessionMatches(activeId) {
  return false;
}

function rakAdminMenuResolveActiveAccountId() {
  let activeId = '';
  try {
    if (typeof rakAdminGetActiveAccountId === 'function') activeId = String(rakAdminGetActiveAccountId() || '').trim();
  } catch (err) {}
  if (!activeId) {
    try {
      const profile = typeof window.rakUserProfileGet === 'function' ? window.rakUserProfileGet() : null;
      activeId = String(profile && profile.accountNumber || '').trim();
    } catch (err) {}
  }
  if (!activeId) {
    try { activeId = String(app && app.activeAccountId || '').trim(); } catch (err) {}
  }
  return activeId;
}

function appMenuShouldShowAdminEntry() {
  const activeId = rakAdminMenuResolveActiveAccountId();
  if (!activeId) return false;
  if (typeof rakAdminCanOpenShiftReport === 'function' && rakAdminCanOpenShiftReport()) return true;
  if (typeof rakAdminAccountRequiresPassword === 'function' && rakAdminAccountRequiresPassword(activeId)) return true;
  if (activeId === '9811') return true;
  return appMenuPersistentAdminSessionMatches(activeId);
}

async function appMenuEnsureAdminAccessFromMenu() {
  const canOpen = () => !!(typeof rakAdminCanOpenShiftReport === 'function' && rakAdminCanOpenShiftReport());
  if (canOpen()) return true;
  const activeId = typeof rakAdminGetActiveAccountId === 'function' ? String(rakAdminGetActiveAccountId() || '').trim() : '';
  if (!activeId) return false;
  try {
    if (typeof rakAdminRestoreSecureSessionForActiveAccount === 'function' && await rakAdminRestoreSecureSessionForActiveAccount('admin-menu-click') && canOpen()) return true;
  } catch (err) {}
  try {
    if (typeof rakAdminRestorePersistentSessionForActiveAccount === 'function' && rakAdminRestorePersistentSessionForActiveAccount('admin-menu-click') && canOpen()) return true;
  } catch (err) {}
  try {
    if (typeof rakAdminRestoreSessionForActiveAccount === 'function' && rakAdminRestoreSessionForActiveAccount() && canOpen()) return true;
  } catch (err) {}
  try {
    if (window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.loadMachineSettings === 'function') {
      const rows = await window.RotationSupabaseBridge.loadMachineSettings();
      if (typeof app !== 'undefined' && app) app.machineSettingsRows = Array.isArray(rows) ? rows : [];
      if (typeof rakAdminRestorePersistentSessionForActiveAccount === 'function' && rakAdminRestorePersistentSessionForActiveAccount('admin-menu-click-online') && canOpen()) return true;
      if (typeof rakAdminRestoreSessionForActiveAccount === 'function' && rakAdminRestoreSessionForActiveAccount() && canOpen()) return true;
    }
  } catch (err) {}
  try {
    if (typeof rakAdminPromptUnlockForAccount === 'function' && await rakAdminPromptUnlockForAccount(activeId) && canOpen()) return true;
  } catch (err) {}
  return canOpen();
}

function bindAppMenuHandlers(body) {
  if (!body || body.dataset.menuHandlersBound === '1') return;
  body.dataset.menuHandlersBound = '1';
  adminBindRotationZoomGuard();

  body.addEventListener('focusin', (event) => {
    const target = event.target;
    if (target && target.matches && target.matches('[data-rot-field^="cell-"], [data-note-field="person"]')) adminShowRotationSelectedRemove(target);
    else adminHideRotationSelectedRemove();
  }, true);
  body.addEventListener('focusout', (event) => {
    const target = event.target;
    if (target && target.matches && target.matches('[data-rotation-overtime-date]') && typeof adminRotationOvertimeNormalizeDateInput === 'function') {
      const normalized = adminRotationOvertimeNormalizeDateInput(target.value);
      if (normalized !== target.value) target.value = normalized;
      if (typeof adminRotationRefreshOvertimeShiftBadges === 'function') adminRotationRefreshOvertimeShiftBadges(body, true);
      if (typeof adminRotationRefreshOvertimeStatus === 'function') adminRotationRefreshOvertimeStatus(body);
    }
  }, true);
  body.addEventListener('input', (event) => {
    const target = event.target;
    if (target && target.matches && target.matches('[data-rot-field], [data-note-field], [data-press-rotation-date]') && typeof app !== 'undefined' && app) {
      app.adminRotationDirty = true;
    }
    if (target && target.matches && target.matches('[data-rot-field^="cell-"], [data-note-field="person"]')) adminShowRotationSelectedRemove(target);
    if (target && target.matches && target.matches('[data-rotation-overtime-date]') && typeof adminRotationRefreshOvertimeShiftBadges === 'function') {
      adminRotationRefreshOvertimeShiftBadges(body, false);
    }
    if (target && target.matches && target.matches('[data-rotation-overtime-note]') && typeof adminRotationRefreshOvertimeStatus === 'function') {
      adminRotationRefreshOvertimeStatus(body);
    }
    if (target && target.matches && target.matches('[data-vacation-field]') && typeof adminVacationRefreshStatus === 'function') {
      adminVacationRefreshStatus(body);
    }
    if (target && target.matches && target.matches('[data-food-schedule-field]') && typeof adminFoodRefreshStatus === 'function') {
      adminFoodRefreshStatus(body);
    }
    if (target && target.matches && target.matches('[data-special-day-field]') && typeof adminSpecialDaysRefreshStatus === 'function') {
      adminSpecialDaysRefreshStatus(body);
    }
    if (target && target.matches && target.matches('[data-machine-field], [data-fhb-target-field]') && typeof adminMachineRefreshStatus === 'function') {
      adminMachineRefreshStatus(body);
    }
    if (target && target.matches && target.matches('[data-external-link-field]') && typeof adminExternalLinksRefreshStatus === 'function') {
      adminExternalLinksRefreshStatus(body);
    }
    if (target && target.matches && target.matches('[data-app-contact-field]') && typeof adminAppContactRefreshStatus === 'function') {
      adminAppContactRefreshStatus(body);
    }
    if (target && target.matches && target.matches('#adminPayrollWorkdayOrdinal, [data-payroll-override-field]') && typeof adminPayrollRefreshStatus === 'function') {
      adminPayrollRefreshStatus(body);
    }
    if (target && target.matches && target.matches('#adminAnnouncementTitle, #adminAnnouncementMessage, #adminAnnouncementStart, #adminAnnouncementEnd') && typeof adminAnnouncementRefreshStatus === 'function') {
      adminAnnouncementRefreshStatus(body);
    }
    if (target && target.matches && target.matches('[data-app-account-field]') && typeof ensureAdminAppAccountBlankRow === 'function') {
      ensureAdminAppAccountBlankRow(body, target.closest('tr[data-app-account-row]'));
    }
    if (target && target.matches && target.matches('[data-admin-account-field]')) {
      if (typeof ensureAdminAccountsBlankRow === 'function') ensureAdminAccountsBlankRow(body, target.closest('tr[data-admin-account-row]'));
      if (typeof adminAccountsRefreshStatus === 'function') adminAccountsRefreshStatus(body);
    }
    if (target && target.matches && target.matches('[data-generator-settings-field]') && typeof adminRotationRefreshGeneratorSettingsStatus === 'function') {
      adminRotationRefreshGeneratorSettingsStatus(body);
    }
  }, true);

  body.addEventListener('change', (event) => {
    const target = event.target;
    if (!target || typeof target.matches !== 'function') return;
    if (target.matches('[data-rot-field], [data-note-field], [data-press-rotation-date]') && typeof app !== 'undefined' && app) {
      app.adminRotationDirty = true;
    }
    if (target.matches('#rakFullSettingsBackupFile')) {
      void handleFullSettingsBackupFileSelection(target, body);
      return;
    }
    if (target.matches('#rakRotationExcelExportMonth, #rakExcelImportScope, #rakExcelImportDetectedMonth')) {
      renderAdminExportImportStatus();
    }
    if (target.matches('[data-rotation-overtime-to]') && typeof adminRotationRefreshOvertimeStatus === 'function') {
      adminRotationRefreshOvertimeStatus(body);
    }
    if (target.matches('[data-vacation-field]') && typeof adminVacationRefreshStatus === 'function') {
      adminVacationRefreshStatus(body);
    }
    if (target.matches('[data-food-schedule-field]') && typeof adminFoodRefreshStatus === 'function') {
      adminFoodRefreshStatus(body);
    }
    if (target.matches('[data-special-day-field]') && typeof adminSpecialDaysRefreshStatus === 'function') {
      adminSpecialDaysRefreshStatus(body);
    }
    if (target.matches('[data-machine-field], [data-fhb-target-field]') && typeof adminMachineRefreshStatus === 'function') {
      adminMachineRefreshStatus(body);
    }
    if (target.matches('[data-external-link-field]') && typeof adminExternalLinksRefreshStatus === 'function') {
      adminExternalLinksRefreshStatus(body);
    }
    if (target.matches('[data-app-contact-field]') && typeof adminAppContactRefreshStatus === 'function') {
      adminAppContactRefreshStatus(body);
    }
    if (target.matches('[data-app-account-field]') && typeof ensureAdminAppAccountBlankRow === 'function') {
      ensureAdminAppAccountBlankRow(body, target.closest('tr[data-app-account-row]'));
    }
    if (target.matches('[data-admin-account-field]')) {
      if (typeof ensureAdminAccountsBlankRow === 'function') ensureAdminAccountsBlankRow(body, target.closest('tr[data-admin-account-row]'));
      if (typeof adminAccountsRefreshStatus === 'function') adminAccountsRefreshStatus(body);
    }
    if (target.matches('[data-generator-settings-field]') && typeof adminRotationRefreshGeneratorSettingsStatus === 'function') {
      adminRotationRefreshGeneratorSettingsStatus(body);
    }
    if (target.matches('#adminPayrollWorkdayOrdinal, [data-payroll-override-field]') && typeof adminPayrollRefreshStatus === 'function') {
      adminPayrollRefreshStatus(body);
    }
    if (target.matches('#adminAnnouncementTitle, #adminAnnouncementMessage, #adminAnnouncementStart, #adminAnnouncementEnd, #adminAnnouncementActive, #adminAnnouncementMarquee') && typeof adminAnnouncementRefreshStatus === 'function') {
      adminAnnouncementRefreshStatus(body);
    }
  }, true);

  body.addEventListener('click', async (event) => {
    const target = event.target && typeof event.target.closest === 'function'
      ? event.target.closest('[data-menu-action], [data-admin-action], [data-admin-month-key], [data-admin-year-key], [data-admin-clear-field], [data-admin-selected-remove], [data-ui-pref], [data-ui-reset], [data-menu-back], [data-rot-field], [data-note-field]')
      : null;
    if (!target || !body.contains(target)) return;

    const menuAction = target.getAttribute('data-menu-action');
    const adminAction = target.getAttribute('data-admin-action');
    const uiPref = target.getAttribute('data-ui-pref');
    const uiReset = target.hasAttribute('data-ui-reset');
    const menuBack = target.getAttribute('data-menu-back');
    const currentView = String(body.dataset.adminView || '');
    const select = body.querySelector('#adminMonthSelect');
    const monthKey = select ? select.value : getAdminSelectedMonthKey();
    const adminMonthKey = target.getAttribute('data-admin-month-key');
    const adminYearKey = target.getAttribute('data-admin-year-key');

    try {
      if (appMenuIsAdminInteraction(target, menuAction, adminAction, adminMonthKey, adminYearKey) && !appMenuCanRunAdminInteraction(currentView)) {
        event.preventDefault();
        openAppMenu('menu');
        return;
      }

      if (target.hasAttribute('data-admin-selected-remove')) {
        event.preventDefault();
        adminRemoveSelectedRotationName();
        return;
      }

      if (menuBack) {
        // RAK_17066_MENU_NAVIGATION_GUARD
        if(typeof rakGuardAdminRotationDiscard==='function' && !rakGuardAdminRotationDiscard()) return;
        openAppMenu('menu');
        return;
      }

      if (target.matches && target.matches('[data-rot-field], [data-note-field]')) {
        if (target.matches('[data-note-field="code"]')) {
          adminHideRotationSelectedRemove();
          adminCloseRotationQuickRemove();
          adminShowAbsenceCodePicker(target);
        } else if (target.matches('[data-rot-field^="cell-"], [data-note-field="person"]')) {
          adminCloseAbsenceCodePicker();
          adminShowRotationSelectedRemove(target);
          adminShowRotationQuickRemove(target);
        } else {
          adminHideRotationSelectedRemove();
          adminCloseAbsenceCodePicker();
        }
        return;
      }

      if (menuAction === 'import' || adminAction === 'import' || adminAction === 'excel-pick') {
        startMenuImport();
        return;
      }
      if (adminAction === 'run-live-auth-check') {
        event.preventDefault();
        if (currentView === 'service' && typeof rakRunLiveAuthDiagnostic === 'function') await rakRunLiveAuthDiagnostic();
        return;
      }
      if (adminAction === 'excel-import') {
        document.getElementById('importBtn')?.click();
        return;
      }
      if (adminAction === 'admin-download-rotation-excel') {
        const exportMonthEl = document.getElementById('rakRotationExcelExportMonth');
        const exportMonthKey = String((exportMonthEl && exportMonthEl.value) || app.selectedMonth || '').trim();
        if (!exportMonthKey) {
          alert('Nejdřív vyber měsíc pro Excel export rozpisu.');
          return;
        }
        app.selectedMonth = exportMonthKey;
        if (typeof adminRotationGeneratorDownloadExcel === 'function') {
          adminRotationGeneratorDownloadExcel(exportMonthKey);
        } else {
          alert('Excel export rozpisu není dostupný. Zkus aplikaci obnovit.');
        }
        return;
      }
      if (adminAction === 'download-admin-manual') {
        downloadAdminManualText();
        return;
      }
      if (adminAction === 'download-monthly-workflow') {
        downloadAdminMonthlyWorkflowText();
        return;
      }
      if (adminAction === 'download-handover-status') {
        downloadAdminHandoverStatusText();
        return;
      }
      if (adminAction === 'download-handover-todo') {
        downloadAdminHandoverTodoText();
        return;
      }
      if (adminAction === 'download-handover-package') {
        downloadAdminHandoverPackageText();
        return;
      }
      if (adminAction === 'download-settings-map') {
        downloadAdminSettingsMapText();
        return;
      }
      if (menuAction === 'export' || adminAction === 'export') {
        if (typeof triggerRakZipExport === 'function') {
          await triggerRakZipExport();
        } else if (typeof exportCurrentHtml === 'function') {
          await exportCurrentHtml();
        } else {
          document.getElementById('exportBtn')?.click();
        }
        return;
      }
      if (menuAction === 'settings') {
        openAppMenu('settings');
        return;
      }
      if (menuAction === 'about') {
        triggerAboutAction();
        return;
      }
      if (menuAction === 'contact') {
        openAppMenu('contact');
        return;
      }
      if (menuAction === 'bug-report') {
        openAppMenu('bug-report');
        return;
      }
      if (menuAction === 'bug-report-submit') {
        await handleBugReportAction(menuAction);
        return;
      }
      if (menuAction === 'admin') {
        if (typeof rakAdminIsDeputy === 'function' && rakAdminIsDeputy()) { openAppMenu('menu'); return; }
        const adminReady = await appMenuEnsureAdminAccessFromMenu();
        if (!adminReady) {
          openAppMenu('menu');
          return;
        }
        openAppMenu('admin');
        return;
      }
      if (menuAction === 'admin-machines') {
        openAppMenu('admin-machines');
        return;
      }
      if (menuAction === 'admin-rotation') {
        openAppMenu('admin-rotation');
        return;
      }
      if (adminYearKey) {
        // RAK_17066_YEAR_SWITCH_GUARD: snapshot before replacing DOM.
        if(typeof rakGuardAdminRotationDiscard==='function' && !rakGuardAdminRotationDiscard()) return;
        const parsedYear = parseInt(adminYearKey, 10);
        if (Number.isFinite(parsedYear)) {
          app.selectedYear = parsedYear;
          const monthsForYear = typeof getMonthsForYear === 'function' ? getMonthsForYear(app.rotation, parsedYear) : [];
          if (!app.selectedMonth || !monthsForYear.includes(app.selectedMonth)) {
            app.selectedMonth = monthsForYear[0] || app.selectedMonth || null;
          }
          renderAdminMenuBody(body, currentView);
        }
        return;
      }
      if (adminMonthKey) {
        // RAK_17066_MONTH_SWITCH_GUARD: snapshot before mutating selection.
        if(typeof rakGuardAdminRotationDiscard==='function' && !rakGuardAdminRotationDiscard()) return;
        if (select) select.value = adminMonthKey;
        app.selectedMonth = adminMonthKey;
        const parsedMonth = typeof parseMonthKey === 'function' ? parseMonthKey(adminMonthKey) : null;
        if (parsedMonth && Number.isFinite(parsedMonth.year)) app.selectedYear = parsedMonth.year;
        renderAdminMenuBody(body, currentView);
        return;
      }
      if (target.hasAttribute('data-admin-clear-field')) {
        const wrap = target.closest('.appMenuInlineFieldWrap');
        const input = wrap ? wrap.querySelector('input') : null;
        if (input) {
          input.value = '';
          const clearBtn = wrap ? wrap.querySelector('.appMenuInlineClearBtn') : null;
          if (clearBtn) clearBtn.remove();
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.focus();
        }
        return;
      }
      if (menuAction === 'admin-export') {
        openAppMenu('admin-export');
        return;
      }
      if (menuAction === 'admin-reports') {
        openAppMenu('admin-reports');
        return;
      }
      if (menuAction === 'device-performance-test') {
        const status = body.querySelector('#adminOnlineSaveStatus') || body.querySelector('.rakDevicePerfCard .smallText');
        if (status) status.textContent = 'Měřím plynulost… chvíli nehýbej obrazovkou.';
        try {
          const result = await runRakDevicePerformanceProbe({ durationMs: 950 });
          const msg = 'Měření hotové: skóre ' + String(result.score || 0) + '/100, ' + String(result.avgFps || '—') + ' FPS, doporučení ' + String(result.label || '—') + '.';
          alert(msg);
        } catch (err) {
          console.warn('Device performance test failed', err);
          alert('Měření se nepovedlo. Zkus to prosím znovu.');
        }
        openAppMenu('settings');
        return;
      }
      if (menuAction === 'clear-cache') {
        if (!confirm('Vyčistit cache a tvrdě obnovit aplikaci?')) return;
        try {
          if ('caches' in window && typeof caches.keys === 'function') {
            const keys = await caches.keys();
            await Promise.all(keys.map((key) => caches.delete(key)));
          }
          if ('serviceWorker' in navigator && navigator.serviceWorker && typeof navigator.serviceWorker.getRegistrations === 'function') {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map((reg) => reg && reg.update ? reg.update().catch(() => {}) : Promise.resolve()));
          }
          alert('Cache byla vyčištěná. Appka se teď tvrdě obnoví.');
          window.location.reload();
        } catch (err) {
          console.error('Cache clear failed', err);
          alert('Cache se nepodařilo vymazat.');
        }
        return;
      }
      if (menuAction === 'app-diagnostics') {
        const lowEndInfo = typeof getLowEndDeviceInfo === 'function' ? getLowEndDeviceInfo() : { lowEnd: false, reasons: [], cores: 0, memory: null, isIOS: false, isAndroid: false, dpr: 1, width: 0, effectiveType: '' };
        const lowEndReason = lowEndInfo.lowEnd && lowEndInfo.reasons && lowEndInfo.reasons.length ? ' · důvod: ' + lowEndInfo.reasons.join(', ') : '';
        const lightweightManual = !!(app && app.uiPrefs && app.uiPrefs.lightweightManual);
        const deviceInfo = [
          lowEndInfo.cores ? (lowEndInfo.cores + ' jader') : 'jádra neznámá',
          lowEndInfo.memory ? (lowEndInfo.memory + ' GB RAM') : 'RAM nehlášena',
          lowEndInfo.width ? ('šířka ' + lowEndInfo.width + ' px') : '',
          lowEndInfo.dpr ? ('DPR ' + Math.round(lowEndInfo.dpr * 100) / 100) : '',
          lowEndInfo.effectiveType ? ('síť ' + lowEndInfo.effectiveType) : '',
          lowEndInfo.isIOS ? 'iOS/Safari' : (lowEndInfo.isAndroid ? 'Android' : '')
        ].filter(Boolean).join(' · ');
        const supabaseHardening = typeof window.getSupabaseHardeningStatus === 'function' ? window.getSupabaseHardeningStatus() : null;
        const supabaseGuard = supabaseHardening && supabaseHardening.guard ? supabaseHardening.guard : null;
        const gameStatsRpcSmoke = typeof window.getGameStatsRpcSmokeStatus === 'function' ? window.getGameStatsRpcSmokeStatus() : (supabaseHardening && supabaseHardening.gameStatsRpcSmoke ? supabaseHardening.gameStatsRpcSmoke : null);
        const gameUiRpcSmoke = typeof window.getGameUiRpcSmokeStatus === 'function' ? window.getGameUiRpcSmokeStatus() : (supabaseHardening && supabaseHardening.gameUiRpcSmoke ? supabaseHardening.gameUiRpcSmoke : null);
        const gameSessionRpcSmoke = typeof window.getGameSessionRpcSmokeStatus === 'function' ? window.getGameSessionRpcSmokeStatus() : (supabaseHardening && supabaseHardening.gameSessionRpcSmoke ? supabaseHardening.gameSessionRpcSmoke : null);
        const tttOnlineJoinHealth = typeof window.getTttOnlineJoinHealth === 'function' ? window.getTttOnlineJoinHealth() : null;
        const rpcHardeningStatus = supabaseHardening && supabaseHardening.rpcHardening ? supabaseHardening.rpcHardening : null;
        const supabaseSyncGuard = supabaseHardening && supabaseHardening.syncGuard ? supabaseHardening.syncGuard : null;
        const supabaseCacheGuard = supabaseHardening && supabaseHardening.cacheGuard ? supabaseHardening.cacheGuard : null;
        const supabasePerformanceHealth = typeof window.getSupabasePerformanceHealth === 'function' ? window.getSupabasePerformanceHealth() : (supabaseHardening && supabaseHardening.performanceHealth ? supabaseHardening.performanceHealth : null);
        const supabaseKeepaliveStatus = typeof window.getSupabaseKeepaliveStatus === 'function' ? window.getSupabaseKeepaliveStatus() : (supabaseHardening && supabaseHardening.keepaliveStatus ? supabaseHardening.keepaliveStatus : null);
        const supabaseStructureHealth = typeof window.getSupabaseStructureHealth === 'function' ? window.getSupabaseStructureHealth() : (supabaseHardening && supabaseHardening.structureHealth ? supabaseHardening.structureHealth : null);
        const supabasePolicyRiskHealth = typeof window.getSupabasePolicyRiskHealth === 'function' ? window.getSupabasePolicyRiskHealth() : (supabaseHardening && supabaseHardening.policyRiskHealth ? supabaseHardening.policyRiskHealth : null);
        const supabaseHardeningReadiness = typeof window.getSupabaseHardeningReadiness === 'function' ? window.getSupabaseHardeningReadiness() : (supabaseHardening && supabaseHardening.hardeningReadiness ? supabaseHardening.hardeningReadiness : null);
        const readRakDiag = (alias, fallbackGlobalName) => {
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
        };
        const releaseReadiness = readRakDiag('releaseReadiness', 'getRakReleaseReadinessHealth');
        const architectureBaseline = readRakDiag('architectureBaseline', 'getRakArchitectureBaselineHealth');
        const moduleReadiness = readRakDiag('health', 'getRakModuleReadinessHealth');
        const runtimeGuard = readRakDiag('runtimeGuard', 'getRakRuntimeGuardHealth');
        const storageSyncAudit = readRakDiag('storageSyncAudit', 'getRakStorageSyncAuditHealth');
        const storageSyncSmokeReport = readRakDiag('storageSyncSmokeReport', 'getRakStorageSyncSmokeReport');
        const storageManualCleanupGuard = readRakDiag('storageManualCleanupGuard', 'getRakStorageManualCleanupGuard');
        const storageSyncClosure = readRakDiag('storageSyncClosure', 'getRakStorageSyncClosureHealth');
        const supabaseClientQueueAudit = readRakDiag('supabaseClientQueueAudit', 'getRakSupabaseClientQueueAuditHealth');
        const supabaseQueueSmokeReport = readRakDiag('supabaseQueueSmokeReport', 'getRakSupabaseQueueSmokeReport');
        const supabaseQueueManualGuard = readRakDiag('supabaseQueueManualGuard', 'getRakSupabaseQueueManualGuard');
        const supabaseQueueClosure = readRakDiag('supabaseQueueClosure', 'getRakSupabaseQueueClosureHealth');
        const onlineGameContracts = readRakDiag('onlineGameContracts', 'getRakOnlineGameContractAuditHealth');
        const onlineGameContractSmoke = readRakDiag('onlineGameContractSmoke', 'getRakOnlineGameContractSmokeReport');
        const onlineGameContractClosure = readRakDiag('onlineGameContractClosure', 'getRakOnlineGameContractClosureHealth');
        const foodSundayGuard = readRakDiag('foodSundayGuard', 'getFoodScheduleSundayGuardHealth');
        const releaseOpsChecklist = readRakDiag('releaseOpsChecklist', 'getRakReleaseOpsChecklistHealth');
        const monitoringPlan = readRakDiag('monitoringPlan', 'getRakMonitoringPlanHealth');
        const rollbackPlaybook = readRakDiag('rollbackPlaybook', 'getRakRollbackPlaybookHealth');
        const releaseOpsClosure = readRakDiag('releaseOpsClosure', 'getRakReleaseOpsClosureHealth');
        const appSecPrivacySurface = readRakDiag('appSecPrivacySurface', 'getRakAppSecPrivacySurfaceHealth');
        const appSecPrivacyRisks = readRakDiag('appSecPrivacyRisks', 'getRakAppSecPrivacyRiskRegister');
        const appSecStorageKeys = readRakDiag('appSecStorageKeys', 'getRakAppSecStorageKeyClassificationHealth');
        const appSecDomSurface = readRakDiag('appSecDomSurface', 'getRakAppSecDomInjectionSurfaceHealth');
        const appSecCspSriPlan = readRakDiag('appSecCspSriPlan', 'getRakAppSecCspSriReportOnlyPlan');
        const appSecPrivacyClosure = readRakDiag('appSecPrivacyClosure', 'getRakAppSecPrivacyClosureHealth');
        const releaseGatePolicy = readRakDiag('releaseGatePolicy', 'getRakReleaseGatePolicy');
        const releaseGateMatrix = readRakDiag('releaseGateMatrix', 'getRakReleaseGateMatrixHealth');
        const releaseGateClosure = readRakDiag('releaseGateClosure', 'getRakReleaseGateClosureHealth');
        const domSafeHelperPolicy = readRakDiag('domSafeHelperPolicy', 'getRakDomSafeHelperPolicy');
        const domSecurityHardeningPlan = readRakDiag('domSecurityHardeningPlan', 'getRakDomSecurityHardeningPlan');
        const domSecurityHardeningClosure = readRakDiag('domSecurityHardeningClosure', 'getRakDomSecurityHardeningClosureHealth');
        const bootSequence = readRakDiag('bootSequence', 'getRakBootSequenceHealth');
        const namespaceHealth = readRakDiag('namespace', 'getRakNamespaceHealth');
        const namespaceReadOnlyMap = readRakDiag('namespaceReadOnlyMap', 'getRakNamespaceReadOnlyMapHealth');
        const exportReleaseTooling = readRakDiag('exportReleaseTooling', 'getRakExportReleaseToolingHealth');
        const exportSmokeReport = readRakDiag('exportSmokeReport', 'getRakExportSmokeReport');
        const domActionRegistry = readRakDiag('domActionRegistry', 'getRakDomActionRegistryHealth');
        const domActionSmokeReport = readRakDiag('domActionSmokeReport', 'getRakDomActionSmokeReport');
        const profileUiStatus = typeof window.getProfileUiSyncStatus === 'function' ? window.getProfileUiSyncStatus() : null;
        const profileUiGuard = profileUiStatus && profileUiStatus.guard ? profileUiStatus.guard : null;
        const dataOptStatus = typeof window.getDataOptimizationStatus === 'function' ? window.getDataOptimizationStatus() : null;
        const pwaStatus = typeof window.getPwaHardeningStatus === 'function' ? window.getPwaHardeningStatus() : null;
        const securityRenderStatus = typeof window.getSecurityRenderStatus === 'function' ? window.getSecurityRenderStatus() : null;
        const finalStabilizationStatus = typeof window.getFinalStabilizationStatus === 'function' ? window.getFinalStabilizationStatus() : null;
        const ladaPerformanceStatus = typeof window.getLadaPerformanceHealth === 'function' ? window.getLadaPerformanceHealth() : null;
        const devicePerformanceStatus = typeof window.getRakDevicePerformanceStatus === 'function' ? window.getRakDevicePerformanceStatus() : null;
        const gameEngineStatus = typeof window.getGameEngineBaselineHealth === 'function' ? window.getGameEngineBaselineHealth() : null;
        const securityRenderDiag = securityRenderStatus ? [
          'Security/render: fáze ' + String(securityRenderStatus.phasePercent || 0) + '% · escapované dynamické HTML ' + String(securityRenderStatus.escapedDynamicHtmlWrites || 0) + ' · text render ' + String(securityRenderStatus.guardedTextWrites || 0) + '/' + String(securityRenderStatus.guardedTextSkippedWrites || 0),
          'Security/render HTML: zápisy/skip/riziko ' + String(securityRenderStatus.guardedHtmlWrites || 0) + '/' + String(securityRenderStatus.guardedHtmlSkippedWrites || 0) + '/' + String(securityRenderStatus.riskyHtmlWrites || 0) + ' · poslední ' + String(securityRenderStatus.lastHtmlKey || '—') + ' / ' + String(securityRenderStatus.lastHtmlRisk || '—'),
          'Security/render URL: kontroly/blokace ' + String(securityRenderStatus.safeExternalUrlChecks || 0) + '/' + String(securityRenderStatus.safeExternalUrlBlocked || 0) + ' · allowlist ' + String(securityRenderStatus.safeExternalUrlAllowlistChecks || 0) + '/' + String(securityRenderStatus.safeExternalUrlAllowlistBlocked || 0) + ' · href ' + String(securityRenderStatus.safeExternalHrefWrites || 0) + '/' + String(securityRenderStatus.safeExternalHrefSkippedWrites || 0) + ' · poslední ' + String(securityRenderStatus.lastAllowedExternalUrlKey || securityRenderStatus.lastExternalUrlKey || '—'),
          'Security/render akce: kontroly/blokace ' + String(securityRenderStatus.delegatedActionChecks || 0) + '/' + String(securityRenderStatus.delegatedActionBlocked || 0) + ' · režim ' + String(securityRenderStatus.delegatedActionGuardMode || '—'),
          'Security/render poslední: HTML escape ' + String(securityRenderStatus.lastEscapedKey || '—') + ' · text ' + String(securityRenderStatus.lastTextKey || '—') + ' · safe DOM build/skip ' + String(securityRenderStatus.safeDomBuilds || 0) + '/' + String(securityRenderStatus.safeDomSkippedBuilds || 0) + ' / ' + String(securityRenderStatus.lastSafeDomKey || '—') + ' · replace/clear/fallback ' + String(securityRenderStatus.safeDomReplacements || 0) + '/' + String(securityRenderStatus.safeDomClears || 0) + '/' + String(securityRenderStatus.safeDomFallbackReplacements || 0)
        ] : [];
        const ladaPerformanceDiag = ladaPerformanceStatus ? [
          'Láďův režim výkon: ' + (ladaPerformanceStatus.ok ? 'OK' : 'kontrola') + ' · režim ' + String(ladaPerformanceStatus.mode || '—') + ' · profil ' + String(ladaPerformanceStatus.profileLevel || '—') + ' · aktivní ' + (ladaPerformanceStatus.active ? 'ano' : 'ne'),
          'Láďův režim efekty: DPR limit ' + String(ladaPerformanceStatus.dprLimit || '—') + ' · FPS brzda ' + String(ladaPerformanceStatus.frameMs || 0) + ' ms · resize ' + String(ladaPerformanceStatus.resizeThrottleMs || 0) + ' ms · max blur ' + String(ladaPerformanceStatus.maxBlurPx || 0) + 'px · animované vzorky ' + String(ladaPerformanceStatus.animatedSampleCount || 0) + ' · problémy ' + String((ladaPerformanceStatus.issues || []).length || 0)
        ] : [];
        const devicePerformanceDiag = devicePerformanceStatus ? [
          'Výkon zařízení: režim ' + String(devicePerformanceStatus.label || devicePerformanceStatus.mode || '—') + ' · doporučení ' + String(devicePerformanceStatus.recommendedProfile || '—') + ' · měření ' + (devicePerformanceStatus.probe ? (String(devicePerformanceStatus.probe.score || 0) + '/100, ' + String(devicePerformanceStatus.probe.avgFps || '—') + ' FPS') : 'není')
        ] : [];
        const gameEngineDiag = gameEngineStatus ? [
          'Herní engine: ' + (gameEngineStatus.ok ? 'OK' : 'kontrola') + ' · režim ' + String(gameEngineStatus.mode || '—') + ' · aktivní hra ' + String(gameEngineStatus.activeGame || '—') + ' · pauza ' + (gameEngineStatus.paused ? 'ano' : 'ne'),
          'Herní engine lifecycle: otevřeno/zavřeno ' + String(gameEngineStatus.openedCount || 0) + '/' + String(gameEngineStatus.closedCount || 0) + ' · pauza/resume ' + String(gameEngineStatus.pausedCount || 0) + '/' + String(gameEngineStatus.resumedCount || 0) + ' · stop loop ' + String(gameEngineStatus.loopStopRequests || 0) + ' · problémy ' + String((gameEngineStatus.issues || []).length || 0)
        ] : [];
        const tttOnlineJoinDiag = tttOnlineJoinHealth ? [
          'Piškvorky online join: ' + (tttOnlineJoinHealth.ok ? 'OK' : 'kontrola') + ' · link pokusy/OK ' + String(tttOnlineJoinHealth.linkAttempts || 0) + '/' + String(tttOnlineJoinHealth.linkSuccesses || 0) + ' · ruční pokusy/OK ' + String(tttOnlineJoinHealth.manualAttempts || 0) + '/' + String(tttOnlineJoinHealth.manualSuccesses || 0) + ' · chyby ' + String(tttOnlineJoinHealth.errors || 0),
          'Piškvorky online stav: režim ' + String(tttOnlineJoinHealth.activeMode || '—') + ' · role ' + String(tttOnlineJoinHealth.activeRole || '—') + ' · tah ' + String(tttOnlineJoinHealth.activeTurn || '—') + ' · může hrát teď ' + (tttOnlineJoinHealth.activeCanMoveNow ? 'ano' : 'ne') + ' · opravy role ' + String(tttOnlineJoinHealth.roleRepairs || 0) + ' · blokované tahy ' + String(tttOnlineJoinHealth.moveBlocks || 0) + ' · problémy ' + String((tttOnlineJoinHealth.issues || []).length || 0)
        ] : [];
        const finalStabilizationDiag = finalStabilizationStatus ? [
          'Finální stabilizace: fáze ' + String(finalStabilizationStatus.phasePercent || 0) + '% · audit ' + (finalStabilizationStatus.lastAuditOk ? 'OK' : 'kontrola') + ' · běhy ' + String(finalStabilizationStatus.audits || 0) + ' · chybí ' + String(finalStabilizationStatus.lastMissingCount || 0),
          'Finální stabilizace stav: verze ' + String(finalStabilizationStatus.lastVersion || '—') + ' · stránka ' + String(finalStabilizationStatus.lastPage || '—') + ' · F9 ' + String(finalStabilizationStatus.lastPhase9Percent || 0) + '% · PWA mismatch ' + (finalStabilizationStatus.lastPwaVersionMismatch ? 'ano' : 'ne'),
          'Finální stabilizace DOM/log: duplicitní ID ' + String(finalStabilizationStatus.lastDuplicateIdCount || 0) + ' · error log ' + String(finalStabilizationStatus.lastErrorLogCount || 0),
          'Finální stabilizace storage: localStorage ' + (finalStabilizationStatus.lastStorageOk ? 'OK' : 'kontrola') + ' · položky ' + String(finalStabilizationStatus.lastStorageItemCount || 0) + ' · velké klíče ' + String(finalStabilizationStatus.lastLargeStorageKeyCount || 0) + ' · online ' + (finalStabilizationStatus.lastNavigatorOnline === false ? 'ne' : 'ano'),
          'Finální stabilizace moduly: načtení ' + (finalStabilizationStatus.lastScriptHealthOk ? 'OK' : 'kontrola') + ' · chybí ' + String(finalStabilizationStatus.lastScriptMissingCount || 0) + ' · duplicity ' + String(finalStabilizationStatus.lastScriptDuplicateCount || 0) + ' · navíc ' + String(finalStabilizationStatus.lastScriptUnexpectedCount || 0),
          'Finální stabilizace navigace: ' + (finalStabilizationStatus.lastNavigationHealthOk ? 'OK' : 'kontrola') + ' · tlačítka ' + String(finalStabilizationStatus.lastNavigationButtonCount || 0) + ' · aktivní ' + String(finalStabilizationStatus.lastNavigationActiveCount || 0) + ' · chybí ' + String(finalStabilizationStatus.lastNavigationMissingCount || 0),
          'Finální stabilizace stránky: ' + (finalStabilizationStatus.lastPageShellHealthOk ? 'OK' : 'kontrola') + ' · stránky ' + String(finalStabilizationStatus.lastPageShellPageCount || 0) + ' · aktivní ' + String(finalStabilizationStatus.lastPageShellActiveCount || 0) + ' · panely ' + String(finalStabilizationStatus.lastPageShellCriticalPanelCount || 0) + ' · chybí ' + String(finalStabilizationStatus.lastPageShellMissingCount || 0),
          'Finální stabilizace akce/odkazy: ' + (finalStabilizationStatus.lastActionHealthOk ? 'OK' : 'kontrola') + ' · akce ' + String(finalStabilizationStatus.lastActionCount || 0) + ' · neznámé ' + String(finalStabilizationStatus.lastActionUnknownCount || 0) + ' · chybí ' + String(finalStabilizationStatus.lastActionRequiredMissingCount || 0) + ' · cíle ' + String(finalStabilizationStatus.lastActionMissingTargetsCount || 0) + ' · odkazy ' + String(finalStabilizationStatus.lastActionLinkIssueCount || 0),
          'Finální stabilizace formuláře: ' + (finalStabilizationStatus.lastFormHealthOk ? 'OK' : 'kontrola') + ' · inputy ' + String(finalStabilizationStatus.lastFormInputCount || 0) + ' · selecty ' + String(finalStabilizationStatus.lastFormSelectCount || 0) + ' · tlačítka ' + String(finalStabilizationStatus.lastFormButtonCount || 0) + ' · chybí ' + String((finalStabilizationStatus.lastFormRequiredMissingCount || 0) + (finalStabilizationStatus.lastFormActionMissingCount || 0)) + ' · čísla ' + String(finalStabilizationStatus.lastFormInvalidNumberCount || 0),
          'Finální stabilizace připravenost: ' + (finalStabilizationStatus.lastRuntimeReadinessOk ? 'OK' : 'kontrola') + ' · splněno ' + String(finalStabilizationStatus.lastRuntimeReadinessPassedCount || 0) + '/' + String(finalStabilizationStatus.lastRuntimeReadinessTotalCount || 0) + ' · body ke kontrole ' + String((finalStabilizationStatus.lastRuntimeReadinessFailedItems || []).length || 0),
          'Supabase struktura: ' + (finalStabilizationStatus.lastSupabaseStructureOk ? 'OK' : 'kontrola') + ' · tabulky ' + String(finalStabilizationStatus.lastSupabaseStructureTableCount || 0) + ' · problémy ' + String(finalStabilizationStatus.lastSupabaseStructureIssueCount || 0) + ' · režim ' + String(finalStabilizationStatus.lastSupabaseStructureMode || '—'),
          'Herní engine základ: ' + (finalStabilizationStatus.lastGameEngineHealthOk ? 'OK' : 'kontrola') + ' · režim ' + String(finalStabilizationStatus.lastGameEngineMode || '—') + ' · aktivní ' + String(finalStabilizationStatus.lastGameEngineActiveGame || '—') + ' · lifecycle ' + String(finalStabilizationStatus.lastGameEngineLifecycleEvents || 0) + ' · problémy ' + String(finalStabilizationStatus.lastGameEngineIssueCount || 0),
          'Post-stabilizace helpery: ' + (finalStabilizationStatus.lastSafeHelperHealthOk ? 'OK' : 'kontrola') + ' · helpery ' + String(finalStabilizationStatus.lastSafeHelperCount || 0) + ' · chybí ' + String(finalStabilizationStatus.lastSafeHelperMissingCount || 0),
          'Post-stabilizace: ' + (finalStabilizationStatus.lastPostStabilizationOk ? 'OK' : 'kontrola') + ' · režim ' + String(finalStabilizationStatus.lastPostStabilizationMode || '—') + ' · body ke kontrole ' + String(finalStabilizationStatus.lastPostStabilizationIssueCount || 0)
        ] : [];
        const architectureDiag = architectureBaseline ? [
          'Architektura/boot: ' + (architectureBaseline.ok ? 'OK' : 'kontrola') + ' · režim ' + String(architectureBaseline.mode || '—') + ' · skripty ' + String(architectureBaseline.scriptCount || 0) + ' · styly ' + String(architectureBaseline.stylesheetCount || 0) + ' · data-action ' + String(architectureBaseline.dataActionCount || 0),
          'Architektura coupling: chybějící globály ' + String((architectureBaseline.missingGlobals || []).length || 0) + ' · duplicitní ID ' + String(architectureBaseline.duplicateIdCount || 0) + ' · warningy ' + String(architectureBaseline.warningCount || 0),
          moduleReadiness ? ('Module readiness: ' + (moduleReadiness.ok ? 'OK' : 'kontrola') + ' · načteno ' + String(moduleReadiness.loadedCount || 0) + '/' + String(moduleReadiness.expectedCount || 0) + ' · chyby ' + String(moduleReadiness.errorCount || 0) + ' · chybí ' + String(moduleReadiness.missingCount || 0) + ' · boot ' + String(moduleReadiness.bootDurationMs || 0) + ' ms') : '',
          bootSequence ? ('Boot sekvence: ' + (bootSequence.ok ? 'OK' : 'kontrola') + ' · statická ' + (bootSequence.staticOrderOk ? 'OK' : 'kontrola') + ' · dynamická ' + (bootSequence.dynamicOrderOk ? 'OK' : 'kontrola') + ' · chybí ' + String(bootSequence.dynamicMissingCount || 0)) : '',
          namespaceHealth ? ('RaK namespace: ' + (namespaceHealth.ok ? 'OK' : 'kontrola') + ' · režim ' + String(namespaceHealth.mode || '—') + ' · mapa ' + String(namespaceHealth.namespaceMapCount || 0) + ' · fáze ' + String(namespaceHealth.refactorProgressPercent || 0) + '% · mapa uzavřená ' + (namespaceHealth.namespaceMapClosed ? 'ano' : 'ne') + ' · warningy ' + String(namespaceHealth.warningCount || 0)) : '',
          namespaceReadOnlyMap ? ('RaK namespace fallbacky: ' + (namespaceReadOnlyMap.ok ? 'OK' : 'kontrola') + ' · read-only aliasy ' + String(namespaceReadOnlyMap.safeNowCount || 0) + ' · runtime ' + String(namespaceReadOnlyMap.runtimeAliasCount || 0) + ' · chybí čtečky ' + String(namespaceReadOnlyMap.missingReaderCount || 0) + ' · rizikové mutace ' + String(namespaceReadOnlyMap.mutatingRiskCount || 0)) : '',
          runtimeGuard ? ('Runtime health: ' + (runtimeGuard.ok ? 'OK' : 'kontrola') + ' · warningy ' + String(runtimeGuard.warningCount || 0) + ' · storage ' + (runtimeGuard.storage && runtimeGuard.storage.writable ? 'OK' : 'kontrola') + ' · budoucí měsíce ' + String(runtimeGuard.statsScope && runtimeGuard.statsScope.futureImportedMonthCount || 0)) : '',
          storageSyncAudit ? ('Storage/sync audit: ' + (storageSyncAudit.ok ? 'OK' : 'kontrola') + ' · položky ' + String(storageSyncAudit.storage && storageSyncAudit.storage.itemCount || 0) + ' · JSON chyby ' + String(storageSyncAudit.storage && storageSyncAudit.storage.invalidJsonCount || 0) + ' · velké klíče ' + String(storageSyncAudit.storage && storageSyncAudit.storage.largeKeyCount || 0) + ' · kandidáti úklidu ' + String(storageSyncAudit.staleCleanupCandidateCount || 0) + ' · offline/sync klíče ' + String(storageSyncAudit.storage && storageSyncAudit.storage.offlineSyncKeyCount || 0) + ' · fáze ' + String(storageSyncAudit.phasePercent || 0) + '%') : '',
          storageSyncSmokeReport ? ('Storage/sync smoke: ' + (storageSyncSmokeReport.ok === true ? 'OK' : (storageSyncSmokeReport.ok === false ? 'kontrola' : 'zatím neběžel')) + ' · stav ' + String(storageSyncSmokeReport.status || '—') + ' · běhy ' + String(storageSyncSmokeReport.runCount || 0) + ' · kandidáti ' + String(storageSyncSmokeReport.cleanupCandidateCount || 0) + ' · JSON chyby ' + String(storageSyncSmokeReport.invalidJsonCount || 0) + ' · guard ' + (storageSyncSmokeReport.manualGuardReady ? 'OK' : 'kontrola')) : '',
          storageManualCleanupGuard ? ('Storage cleanup guard: ruční režim ' + (storageManualCleanupGuard.manualOnly ? 'OK' : 'kontrola') + ' · auto mazání ' + (storageManualCleanupGuard.autoCleanupEnabled ? 'zapnuto' : 'vypnuto') + ' · kandidáti ' + String(storageManualCleanupGuard.candidateCount || 0) + ' · ruční kontrola ' + (storageManualCleanupGuard.requiresHumanReview ? 'ano' : 'ne')) : '',
          storageSyncClosure ? ('Storage/sync closure: ' + (storageSyncClosure.ok ? 'OK' : 'kontrola') + ' · fáze ' + String(storageSyncClosure.phasePercent || 0) + '% · kandidáti ' + String(storageSyncClosure.candidateCount || 0) + ' · auto mazání ' + (storageSyncClosure.autoCleanupEnabled ? 'zapnuto' : 'vypnuto')) : '',
          supabaseClientQueueAudit ? ('Supabase client/queue: ' + (supabaseClientQueueAudit.ok ? 'OK' : 'kontrola') + ' · fronta ' + String(supabaseClientQueueAudit.queueLength || 0) + '/' + String(supabaseClientQueueAudit.queueMaxItems || '—') + ' · stale ' + String(supabaseClientQueueAudit.queueStaleTaskCount || 0) + ' · realtime ' + String(supabaseClientQueueAudit.realtimeStatus || '—') + ' · fáze ' + String(supabaseClientQueueAudit.phasePercent || 0) + '%') : '',
          supabaseQueueSmokeReport ? ('Supabase queue smoke: ' + (supabaseQueueSmokeReport.ok === true ? 'OK' : (supabaseQueueSmokeReport.ok === false ? 'kontrola' : 'zatím neběžel')) + ' · stav ' + String(supabaseQueueSmokeReport.status || '—') + ' · fronta ' + String(supabaseQueueSmokeReport.queueLength || 0) + ' · stale ' + String(supabaseQueueSmokeReport.staleTaskCount || 0) + ' · guard ' + (supabaseQueueSmokeReport.manualGuardReady ? 'OK' : 'kontrola') + ' · online ' + (supabaseQueueSmokeReport.online ? 'ano' : 'ne')) : '',
          supabaseQueueManualGuard ? ('Supabase queue guard: ' + (supabaseQueueManualGuard.ok ? 'OK' : 'kontrola') + ' · auto flush ' + (supabaseQueueManualGuard.autoFlushEnabled ? 'zapnuto' : 'vypnuto') + ' · auto mazání ' + (supabaseQueueManualGuard.autoDeleteEnabled ? 'zapnuto' : 'vypnuto') + ' · fronta ' + String(supabaseQueueManualGuard.queueLength || 0)) : '',
          supabaseQueueClosure ? ('Supabase queue closure: ' + (supabaseQueueClosure.ok ? 'OK' : 'kontrola') + ' · fáze ' + String(supabaseQueueClosure.phasePercent || 0) + '% · auto flush ' + (supabaseQueueClosure.autoFlushEnabled ? 'zapnuto' : 'vypnuto') + ' · DB změny ' + (supabaseQueueClosure.dbMutations ? 'ano' : 'ne') + ' · policies ' + (supabaseQueueClosure.policyChanges ? 'ano' : 'ne')) : '',
          onlineGameContracts ? ('Online hry kontrakty: ' + (onlineGameContracts.ok ? 'OK' : 'kontrola') + ' · fáze ' + String(onlineGameContracts.phasePercent || 0) + '% · bridge ' + (onlineGameContracts.bridgeMethodsReady ? 'OK' : 'kontrola') + ' · c/a/s ' + String(onlineGameContracts.gameCoverageText || '—') + ' · fallback ' + String(onlineGameContracts.fallbackCount || 0)) : '',
          onlineGameContractSmoke ? ('Online hry smoke: ' + (onlineGameContractSmoke.ok ? 'OK' : 'kontrola') + ' · pokusy/OK/fallback ' + String(onlineGameContractSmoke.attempts || 0) + '/' + String(onlineGameContractSmoke.successes || 0) + '/' + String(onlineGameContractSmoke.fallbackCount || 0) + ' · policies ' + (onlineGameContractSmoke.readyForPolicyTightening ? 'lze zvažovat' : 'neutahovat')) : '',
          onlineGameContractClosure ? ('Online hry closure: ' + (onlineGameContractClosure.ok ? 'OK' : 'kontrola') + ' · fáze ' + String(onlineGameContractClosure.phasePercent || 0) + '% · policies ' + (onlineGameContractClosure.policyChangeAllowedNow ? 'lze' : 'neutahovat') + ' · warningy ' + String(onlineGameContractClosure.warningCount || 0)) : '',
          foodSundayGuard ? ('Kantýna/jídelna neděle: ' + (foodSundayGuard.ok ? 'OK' : 'kontrola') + ' · přesčasových nedělí ' + String(foodSundayGuard.overtimeSundayCount || 0) + ' · běžná neděle = normální rozpis ' + (foodSundayGuard.rows && foodSundayGuard.rows.every ? (foodSundayGuard.rows.every((row) => row.plainMatchesRegular) ? 'ano' : 'ne') : '—')) : '',
          releaseOpsChecklist ? ('Release ops checklist: ' + (releaseOpsChecklist.ok ? 'OK' : 'kontrola') + ' · gate ' + String(releaseOpsChecklist.gateCount || 0) + ' · blockery ' + String(releaseOpsChecklist.blockerCount || 0) + ' · ruční kontroly ' + String(releaseOpsChecklist.manualCount || 0) + ' · ZIP ' + (releaseOpsChecklist.readyForZip ? 'ano' : 'ne')) : '',
          monitoringPlan ? ('Monitoring mapa: metriky ' + String(monitoringPlan.metricCount || 0) + ' · alerty ' + String((monitoringPlan.alertRules || []).length || 0) + ' · režim ' + String(monitoringPlan.mode || '—')) : '',
          rollbackPlaybook ? ('Rollback playbook: kroky ' + String((rollbackPlaybook.steps || []).length || 0) + ' · pravidla ' + String((rollbackPlaybook.decisionRules || []).length || 0) + ' · artefakt ' + String(rollbackPlaybook.rollbackArtifactRule || '—')) : '',
          releaseOpsClosure ? ('Release ops closure: ' + (releaseOpsClosure.ok ? 'OK' : 'kontrola') + ' · fáze ' + String(releaseOpsClosure.phasePercent || 0) + '% · monitoring ' + String(releaseOpsClosure.monitoringMetricCount || 0) + ' · rollback kroky ' + String(releaseOpsClosure.rollbackStepCount || 0)) : '',
          appSecPrivacySurface ? ('AppSec/privacy: ' + (appSecPrivacySurface.ok ? 'OK' : 'kontrola') + ' · CSP ' + (appSecPrivacySurface.cspMetaPresent ? 'ano' : 'ne') + ' · CDN skripty ' + String(appSecPrivacySurface.externalScriptCount || 0) + ' · bez SRI ' + String(appSecPrivacySurface.externalScriptsWithoutSri || 0) + ' · storage podezřelé ' + String(appSecPrivacySurface.storage && appSecPrivacySurface.storage.suspiciousKeyCount || 0) + ' · warningy ' + String(appSecPrivacySurface.warningCount || 0)) : '',
          appSecPrivacyRisks ? ('AppSec risk register: položky ' + String(appSecPrivacyRisks.itemCount || 0) + ' · P0 ' + String(appSecPrivacyRisks.p0Count || 0) + ' · P1 ' + String(appSecPrivacyRisks.p1Count || 0) + ' · P2 ' + String(appSecPrivacyRisks.p2Count || 0)) : '',
          appSecStorageKeys ? ('AppSec storage: klíče ' + String(appSecStorageKeys.classifiedKeyCount || 0) + ' · kategorie ' + String(appSecStorageKeys.categoryCount || 0) + ' · neznámé ' + String(appSecStorageKeys.unknownKeyCount || 0) + ' · podezřelé ' + String(appSecStorageKeys.suspiciousKeyCount || 0) + ' · hodnoty ' + String(appSecStorageKeys.valueInspectionMode || '—')) : '',
          appSecDomSurface ? ('AppSec DOM: sinky ' + String(appSecDomSurface.staticSinkCount || 0) + ' · innerHTML ' + String(appSecDomSurface.staticBySink && appSecDomSurface.staticBySink.innerHTML || 0) + ' · insertAdjacentHTML ' + String(appSecDomSurface.staticBySink && appSecDomSurface.staticBySink.insertAdjacentHTML || 0) + ' · target blank bez noopener ' + String(appSecDomSurface.targetBlankWithoutNoopener || 0)) : '',
          appSecCspSriPlan ? ('AppSec CSP/SRI: report-only ' + (appSecCspSriPlan.enforceNow ? 'ne' : 'ano') + ' · CDN skripty bez SRI ' + String(appSecCspSriPlan.externalScriptsWithoutSri || 0) + ' · rollout kroky ' + String((appSecCspSriPlan.rolloutSteps || []).length || 0)) : '',
          appSecPrivacyClosure ? ('AppSec closure: ' + (appSecPrivacyClosure.ok ? 'OK' : 'kontrola') + ' · fáze ' + String(appSecPrivacyClosure.phasePercent || 0) + '% · storage neznámé ' + String(appSecPrivacyClosure.storageUnknownKeyCount || 0) + ' · DOM sinky ' + String(appSecPrivacyClosure.domStaticSinkCount || 0)) : '',
          releaseGateMatrix ? ('Release gate matrix: ' + (releaseGateMatrix.ok ? 'OK' : 'blocker') + ' · gate ' + String(releaseGateMatrix.gateCount || 0) + ' · blockery ' + String(releaseGateMatrix.blockerCount || 0) + ' · warningy ' + String(releaseGateMatrix.warningCount || 0) + ' · ruční ' + String(releaseGateMatrix.manualCount || 0) + ' · ZIP ' + (releaseGateMatrix.readyForZip ? 'ano' : 'ne')) : '',
          releaseGateClosure ? ('Release gate closure: ' + (releaseGateClosure.ok ? 'OK' : 'kontrola') + ' · fáze ' + String(releaseGateClosure.phasePercent || 0) + '% · produkce ' + (releaseGateClosure.readyForProduction ? 'ano' : 'čeká na ruční smoke')) : '',
          releaseGatePolicy ? ('Release gate pravidla: statusy ' + String(releaseGatePolicy.policyStatusCount || (releaseGatePolicy.statuses || []).length || 0) + ' · mutace ' + String(releaseGatePolicy.mutationPolicy || 'read-only')) : '',
          domSecurityHardeningPlan ? ('DOM/security hardening: kandidáti ' + String(domSecurityHardeningPlan.candidateCount || 0) + ' · P1 review ' + String(domSecurityHardeningPlan.p1ReviewCount || 0) + ' · sinky ' + String(domSecurityHardeningPlan.staticSinkCount || 0)) : '',
          domSafeHelperPolicy ? ('DOM safe helper policy: helpery ' + String(domSafeHelperPolicy.helperCount || 0) + ' · režim ' + String(domSafeHelperPolicy.rule || 'read-only')) : '',
          domSecurityHardeningClosure ? ('DOM/security closure: ' + (domSecurityHardeningClosure.ok ? 'OK' : 'kontrola') + ' · fáze ' + String(domSecurityHardeningClosure.phasePercent || 0) + '% · render změny ' + (domSecurityHardeningClosure.renderChanges ? 'ano' : 'ne')) : '',
          exportReleaseTooling ? ('Export/release tooling: ' + (exportReleaseTooling.ok ? 'OK' : 'kontrola') + ' · source ID ' + String(exportReleaseTooling.sourceIdCount || 0) + ' · binární ' + String(exportReleaseTooling.binaryFileCount || 0) + ' · duplicit ' + String(exportReleaseTooling.duplicateBinaryCount || 0) + ' · warningy ' + String(exportReleaseTooling.warningCount || 0)) : '',
          exportSmokeReport ? ('Export smoke report: ' + (exportSmokeReport.ok === true ? 'OK' : (exportSmokeReport.ok === false ? 'kontrola' : 'zatím neběžel')) + ' · stav ' + String(exportSmokeReport.status || '—') + ' · text/bin ' + String(exportSmokeReport.checkedTextFileCount || 0) + '/' + String(exportSmokeReport.checkedBinaryFileCount || 0) + ' · chybí ' + String((exportSmokeReport.missingTextFileCount || 0) + (exportSmokeReport.missingBinaryFileCount || 0)) + ' · poslední ' + String(exportSmokeReport.lastStage || '—')) : '',
          domActionRegistry ? ('DOM/action registry: ' + (domActionRegistry.ok ? 'OK' : 'kontrola') + ' · akce ' + String(domActionRegistry.actionElementCount || 0) + ' · unikátní ' + String(domActionRegistry.uniqueActionCount || 0) + ' · kategorie ' + String(domActionRegistry.categoryCount || 0) + ' · target mapa ' + String(domActionRegistry.targetCoveragePercent || 0) + '% · target warningy ' + String(domActionRegistry.actionTargetWarningCount || 0) + ' · neznámé ' + String(domActionRegistry.unknownActionCount || 0) + ' · cíle ' + String(domActionRegistry.missingTargetCount || 0) + ' · warningy ' + String(domActionRegistry.warningCount || 0)) : '',
          domActionSmokeReport ? ('DOM/action smoke: ' + (domActionSmokeReport.ok === true ? 'OK' : (domActionSmokeReport.ok === false ? 'kontrola' : 'zatím neběžel')) + ' · stav ' + String(domActionSmokeReport.status || '—') + ' · běhy ' + String(domActionSmokeReport.runCount || 0) + ' · akce ' + String(domActionSmokeReport.actionElementCount || 0) + ' · target mapa ' + String(domActionSmokeReport.targetCoveragePercent || 0) + '% · problémy ' + String(domActionSmokeReport.issueCount || 0) + ' · warningy ' + String(domActionSmokeReport.warningCount || 0)) : ''
        ].filter(Boolean) : [];
        const pwaDiag = pwaStatus ? [
          'PWA/SW: fáze ' + String(pwaStatus.phasePercent || 0) + '% · controller ' + (pwaStatus.hasController ? 'ano' : 'ne') + ' · update toast ' + (pwaStatus.updateToastVisible ? 'viditelný' : 'ne') + ' · verze cache ' + (pwaStatus.swVersionMismatch ? 'nesedí' : 'sedí'),
          'PWA update check: běhy/skip/join ' + String(pwaStatus.updateChecks || 0) + '/' + String(pwaStatus.updateCheckSkips || 0) + '/' + String(pwaStatus.updateCheckJoins || 0) + ' · update volání ' + String(pwaStatus.registrationUpdates || 0) + ' · chyby ' + String(pwaStatus.registrationUpdateErrors || 0),
          'PWA zprávy SW: celkem/verze/aktivace/cache ' + String(pwaStatus.swMessages || 0) + '/' + String(pwaStatus.swVersionMessages || 0) + '/' + String(pwaStatus.swActivatedMessages || 0) + '/' + String(pwaStatus.swCacheStatusMessages || 0) + ' · poslední ' + String(pwaStatus.lastMessageType || '—'),
          'PWA cache: verze ' + String(pwaStatus.swCacheVersion || '—') + ' / oček. ' + String(pwaStatus.swExpectedCacheVersion || '—') + ' · mismatch ' + String(pwaStatus.swVersionMismatchCount || 0) + ' · update/skip ' + String(pwaStatus.swVersionMismatchUpdateChecks || 0) + '/' + String(pwaStatus.swVersionMismatchUpdateSkips || 0) + ' · static/runtime ' + String(pwaStatus.swStaticCacheEntries || 0) + '/' + String(pwaStatus.swRuntimeCacheEntries || 0) + ' · runtime trim ' + String(pwaStatus.swRuntimeTrimDeletedCount || 0) + '/' + String(pwaStatus.swRuntimeTrimBeforeCount || 0) + ' · staré RaK cache/smazáno ' + String(pwaStatus.swStaleRakCacheCount || 0) + '/' + String(pwaStatus.swStaleRakCacheDeletedCount || 0) + ' · precache OK/chyby/chybí ' + String(pwaStatus.swPrecacheSuccessCount || 0) + '/' + String(pwaStatus.swPrecacheFailedCount || 0) + '/' + String(pwaStatus.swPrecacheMissingCount || 0) + ' · požadavky/skip ' + String(pwaStatus.swCacheStatusRequests || 0) + '/' + String(pwaStatus.swCacheStatusRequestSkips || 0) + ' · klienti ' + String(pwaStatus.swClientsCount || 0) + ' · preload ' + (pwaStatus.swNavigationPreloadEnabled ? 'ano' : 'ne'),
          'PWA cache režim: lookup ' + String(pwaStatus.swCacheLookupMode || '—') + ' · ukládání ' + String(pwaStatus.swCacheableResponseMode || '—') + ' · trim ' + String(pwaStatus.swActivateRuntimeTrimMode || '—') + ' · síť fallback ' + String(pwaStatus.swNetworkTimeoutFallbackMode || '—') + ' (' + String(pwaStatus.swNetworkFallbackTimeoutMs || 0) + ' ms)' + ' · static timeout ' + String(pwaStatus.swStaticCacheFirstTimeoutMode || '—'),
          'PWA asset audit: ' + String(pwaStatus.pwaAssetAuditMode || '—') + ' · manifest ' + (pwaStatus.pwaAssetManifestOk ? 'OK' : 'kontrola') + ' · favicon ' + (pwaStatus.pwaAssetFaviconOk ? 'OK' : 'kontrola') + ' · apple ' + (pwaStatus.pwaAssetAppleTouchOk ? 'OK' : 'kontrola') + ' · SW ikony ' + String(pwaStatus.swAssetIconCount || 0) + '/' + String(pwaStatus.pwaAssetExpectedIconCount || 0) + ' · root odkazy ' + (pwaStatus.pwaAssetRootIconRefsBlocked && !Number(pwaStatus.swAssetLegacyRootIconCount || 0) ? 'žádné' : 'kontrola') + ' · ZIP ' + String(pwaStatus.swExportZipRootMode || '—'),
          'PWA dokončení: ' + String(pwaStatus.swPhase8CompletionMode || '—') + ' · připraveno ' + (pwaStatus.swPhase8Ready ? 'ano' : 'ne') + ' · app shell ' + String(pwaStatus.swAppShellCachedRatio || 0) + '%',
          releaseReadiness ? ('Release readiness: ' + (releaseReadiness.ok ? 'OK' : 'kontrola') + ' · verze ' + String(releaseReadiness.version || '—') + ' · CDN skripty ' + String(releaseReadiness.externalScriptCount || 0) + ' · export ' + String(releaseReadiness.exportSmokeReportStatus || '—') + ' · DOM ' + String(releaseReadiness.domActionSmokeReportStatus || '—') + ' · SQ ' + String(releaseReadiness.supabaseQueueSmokeReportStatus || '—') + ' · warningy ' + String(releaseReadiness.warningCount || 0)) : ''
        ] : [];
        const dataOptDiag = dataOptStatus ? [
          'Data opt: zápisy/skipy ' + String(dataOptStatus.localStorageWrites || 0) + '/' + String(dataOptStatus.localStorageSkippedWrites || 0) + ' · čtení/cache ' + String(dataOptStatus.localStorageReads || 0) + '/' + String(dataOptStatus.localStorageReadCacheHits || 0),
          'Data opt JSON: parse/cache ' + String(dataOptStatus.localStorageJsonParseReads || 0) + '/' + String(dataOptStatus.localStorageJsonParseCacheHits || 0) + ' · chyby ' + String(dataOptStatus.localStorageJsonParseErrors || 0),
          'Data opt cache: read/json ' + String(dataOptStatus.localReadCacheSize || 0) + '/' + String(dataOptStatus.localCacheMaxSize || 0) + ' · ' + String(dataOptStatus.localJsonCacheSize || 0) + '/' + String(dataOptStatus.localJsonCacheMaxSize || 0) + ' · úklid ' + String(dataOptStatus.localReadCachePrunes || 0) + '/' + String(dataOptStatus.localJsonCachePrunes || 0) + ' · ořez ' + String(dataOptStatus.localReadCacheTrimmedEntries || 0) + '/' + String(dataOptStatus.localJsonCacheTrimmedEntries || 0),
          'Data opt bajty: zapsáno/přeskočeno/přečteno ' + String(dataOptStatus.approxBytesWritten || 0) + '/' + String(dataOptStatus.approxBytesSkipped || 0) + '/' + String(dataOptStatus.approxBytesRead || 0),
          'Data opt home refresh: plán/sloučeno/běh ' + String(dataOptStatus.homeRefreshSchedules || 0) + '/' + String(dataOptStatus.homeRefreshCoalescedSchedules || 0) + '/' + String(dataOptStatus.homeRefreshRuns || 0) + ' · modaly skip ' + String(dataOptStatus.homeRefreshModalSkips || 0),
          'Data opt DOM HTML: zápisy/skipy ' + String(dataOptStatus.domHtmlWrites || 0) + '/' + String(dataOptStatus.domHtmlSkippedWrites || 0) + ' · chyby ' + String(dataOptStatus.domHtmlWriteErrors || 0) + ' · poslední ' + String(dataOptStatus.domHtmlLastKey || '—'),
          'Data opt DOM text/class: text ' + String(dataOptStatus.domTextWrites || 0) + '/' + String(dataOptStatus.domTextSkippedWrites || 0) + ' · class ' + String(dataOptStatus.domClassWrites || 0) + '/' + String(dataOptStatus.domClassSkippedWrites || 0) + ' · poslední ' + String(dataOptStatus.domTextLastKey || dataOptStatus.domClassLastKey || '—'),
          'Data opt DOM select: zápisy/skipy ' + String(dataOptStatus.domSelectWrites || 0) + '/' + String(dataOptStatus.domSelectSkippedWrites || 0) + ' · chyby ' + String(dataOptStatus.domSelectWriteErrors || 0) + ' · poslední ' + String(dataOptStatus.domSelectLastKey || '—'),
          'Data opt DOM toggle: zápisy/skipy ' + String(dataOptStatus.domToggleWrites || 0) + '/' + String(dataOptStatus.domToggleSkippedWrites || 0) + ' · chyby ' + String(dataOptStatus.domToggleWriteErrors || 0) + ' · poslední ' + String(dataOptStatus.domToggleLastKey || '—'),
          'Data opt DOM style: zápisy/skipy ' + String(dataOptStatus.domStyleWrites || 0) + '/' + String(dataOptStatus.domStyleSkippedWrites || 0) + ' · chyby ' + String(dataOptStatus.domStyleWriteErrors || 0) + ' · poslední ' + String(dataOptStatus.domStyleLastKey || '—')
        ] : [];
        const supabaseDiag = supabaseHardening ? [
          'Supabase fronta: ' + String(supabaseHardening.queueLength || 0) + ' / ' + String(supabaseHardening.queueMaxItems || '—'),
          'Supabase realtime: ' + String(supabaseHardening.realtimeStatus || '—'),
          supabaseKeepaliveStatus ? ('Supabase stav: ' + String(supabaseKeepaliveStatus.label || supabaseKeepaliveStatus.status || '—') + ' · poslední OK ' + String(supabaseKeepaliveStatus.lastSuccessAt || '—') + ' · poslední chyba ' + String(supabaseKeepaliveStatus.lastErrorMessage || '—')) : '',
          supabaseKeepaliveStatus ? ('Supabase heartbeat: tabulka ' + String(supabaseKeepaliveStatus.table || 'app_keepalive') + ' · interval ' + String(supabaseKeepaliveStatus.minIntervalHours || 12) + ' h · pokusy/OK/chyby/skip ' + String(supabaseKeepaliveStatus.attempts || 0) + '/' + String(supabaseKeepaliveStatus.successes || 0) + '/' + String(supabaseKeepaliveStatus.failures || 0) + '/' + String(supabaseKeepaliveStatus.skips || 0) + ' · důvod ' + String(supabaseKeepaliveStatus.lastReason || '—') + ' · typ ' + String(supabaseKeepaliveStatus.lastClassification || '—')) : '',
          supabasePerformanceHealth ? ('Supabase výkon: ' + (supabasePerformanceHealth.ok ? 'OK' : 'kontrola') + ' · refresh sloučeno/běh ' + String(supabasePerformanceHealth.realtimeRefreshCoalesced || 0) + '/' + String(supabasePerformanceHealth.realtimeRefreshRuns || 0) + ' · hidden odklad ' + String(supabasePerformanceHealth.realtimeRefreshHiddenDefers || 0) + ' · tabulek ' + String(supabasePerformanceHealth.realtimeTableCount || 0)) : '',
          supabasePerformanceHealth ? ('Supabase cache/realtime: cache hit/write ' + String(supabasePerformanceHealth.cacheHits || 0) + '/' + String(supabasePerformanceHealth.cacheWrites || 0) + ' · sdílené čtení start/join/peak ' + String(supabasePerformanceHealth.sharedReadStarts || 0) + '/' + String(supabasePerformanceHealth.sharedReadJoins || 0) + '/' + String(supabasePerformanceHealth.sharedReadPeak || 0) + ' · problémy ' + String((supabasePerformanceHealth.issues || []).length || 0)) : '',
          supabasePerformanceHealth ? ('Supabase zápisy: check/start/join/skip ' + String(supabasePerformanceHealth.writeOptimizationChecks || 0) + '/' + String(supabasePerformanceHealth.writeOptimizationStarts || 0) + '/' + String(supabasePerformanceHealth.writeOptimizationJoins || 0) + '/' + String(supabasePerformanceHealth.writeOptimizationSkips || 0) + ' · aktivní/peak ' + String(supabasePerformanceHealth.writeOptimizationActive || 0) + '/' + String(supabasePerformanceHealth.writeOptimizationPeak || 0)) : '',
          supabaseStructureHealth ? ('Supabase struktura/RLS: ' + (supabaseStructureHealth.ok ? 'OK' : 'kontrola') + ' · tabulky ' + String(supabaseStructureHealth.expectedTableCount || 0) + ' · realtime chybí ' + String(supabaseStructureHealth.missingRealtimeTableCount || 0) + ' · queue chybí ' + String(supabaseStructureHealth.missingQueueTypeCount || 0) + ' · helpery chybí ' + String(supabaseStructureHealth.missingHelperCount || 0)) : '',
          supabaseStructureHealth ? ('Supabase GRANT/policies checklist: signály ' + String(supabaseStructureHealth.grantSignalCount || 0) + ' · policies ' + String(supabaseStructureHealth.rlsPolicyChecklistCount || 0) + ' · problémy ' + String((supabaseStructureHealth.issues || []).length || 0)) : '',
          supabasePolicyRiskHealth ? ('Supabase RLS audit: ' + (supabasePolicyRiskHealth.ok ? 'OK' : 'rizika') + ' · P0/P1/P2 ' + String(supabasePolicyRiskHealth.p0Count || 0) + '/' + String(supabasePolicyRiskHealth.p1Count || 0) + '/' + String(supabasePolicyRiskHealth.p2Count || 0) + ' · veřejný write tabulek ' + String(supabasePolicyRiskHealth.publicWriteTableCount || 0) + ' · destruktivní ' + String(supabasePolicyRiskHealth.destructiveTableCount || 0)) : '',
          supabasePolicyRiskHealth && supabasePolicyRiskHealth.phase ? ('Supabase fáze: ' + String(supabasePolicyRiskHealth.phase.current || '—') + ' · další: ' + String(supabasePolicyRiskHealth.phase.next || '—')) : '',
          supabaseHardeningReadiness ? ('Supabase readiness: ' + String(supabaseHardeningReadiness.readinessPercent || 0) + '% · policy změna teď ' + (supabaseHardeningReadiness.policyChangeAllowedNow ? 'ano' : 'ne') + ' · přímé fallback oblasti ' + String(supabaseHardeningReadiness.directFallbackCount || 0) + ' · P0 ' + String(supabaseHardeningReadiness.p0Count || 0)) : '',
          supabaseHardeningReadiness ? ('Supabase další bezpečný krok: ' + String(supabaseHardeningReadiness.nextSafeStep || '—')) : '',
          supabaseHardeningReadiness ? ('Supabase potvrzeno: Piškvorky link/kód ' + (supabaseHardeningReadiness.confirmed && supabaseHardeningReadiness.confirmed.tttLinkAndCode ? 'OK' : 'ne') + ' · Lodě smoke ' + (gameSessionRpcSmoke && gameSessionRpcSmoke.perGameCoverage && gameSessionRpcSmoke.perGameCoverage.battleship && gameSessionRpcSmoke.perGameCoverage.battleship.create && gameSessionRpcSmoke.perGameCoverage.battleship.accept && gameSessionRpcSmoke.perGameCoverage.battleship.save ? 'OK' : 'čeká') + ' · heartbeat RPC ' + (supabaseHardeningReadiness.confirmed && supabaseHardeningReadiness.confirmed.keepaliveRpc ? 'OK' : 'kontrola') + ' · DB policies v tomto buildu ' + (supabaseHardeningReadiness.confirmed && supabaseHardeningReadiness.confirmed.noPolicyChangeInThisBuild ? 'beze změny' : 'kontrola')) : '',

          rpcHardeningStatus ? ('Supabase bug_reports: veřejné SELECT/UPDATE policies ' + String(rpcHardeningStatus.bugReportsPublicSelectUpdatePolicies || 0) + ' · DB změna ' + (rpcHardeningStatus.bugReportsDbChanged ? 'ano' : 'ne') + ' · další ' + String(rpcHardeningStatus.bugReportsNextStep || '—')) : '',
          gameStatsRpcSmoke ? ('Supabase game_stats RPC smoke: pokusy/OK/fallback ' + String(gameStatsRpcSmoke.attempts || 0) + '/' + String(gameStatsRpcSmoke.successes || 0) + '/' + String(gameStatsRpcSmoke.fallbacks || 0) + ' · ready ' + (gameStatsRpcSmoke.readyForPolicyTightening ? 'ano' : 'ne') + ' · poslední OK ' + String(gameStatsRpcSmoke.lastSuccessType || '—')) : '',
          gameUiRpcSmoke ? ('Supabase profile UI RPC smoke: pokusy/OK/fallback ' + String(gameUiRpcSmoke.attempts || 0) + '/' + String(gameUiRpcSmoke.successes || 0) + '/' + String(gameUiRpcSmoke.fallbacks || 0) + ' · ready ' + (gameUiRpcSmoke.readyForPolicyTightening ? 'ano' : 'ne')) : '',
          gameSessionRpcSmoke ? ('Supabase session/pozvánky RPC smoke: pokusy/OK/fallback ' + String(gameSessionRpcSmoke.attempts || 0) + '/' + String(gameSessionRpcSmoke.successes || 0) + '/' + String(gameSessionRpcSmoke.fallbacks || 0) + ' · ready ' + (gameSessionRpcSmoke.readyForPolicyTightening ? 'ano' : 'ne') + ' · poslední OK ' + String(gameSessionRpcSmoke.lastSuccessType || '—')) : '',
          gameSessionRpcSmoke ? ('Supabase online hry RPC pokrytí: ' + String(gameSessionRpcSmoke.gameCoverageText || gameSessionRpcSmoke.coverageText || 'Piškvorky c/a/s 0/0/0 · fallback 0 | Lodě c/a/s 0/0/0 · fallback 0')) : '',
          gameSessionRpcSmoke ? ('Supabase online hry chybí: ' + String((gameSessionRpcSmoke.missingGameOperations || []).length ? gameSessionRpcSmoke.missingGameOperations.join(', ') : 'nic')) : '',
          supabaseGuard ? ('Supabase guard: sloučeno ' + String(supabaseGuard.deduped || 0) + ' · ořezáno ' + String(supabaseGuard.trimmed || 0) + ' · odmítnuto ' + String((supabaseGuard.rejected || 0) + (supabaseGuard.oversized || 0))) : '',
          supabaseSyncGuard ? ('Supabase sync: timeouty R/W ' + String(supabaseSyncGuard.readTimeouts || 0) + '/' + String(supabaseSyncGuard.writeTimeouts || 0) + ' · retry R/W ' + String(supabaseSyncGuard.readRetries || 0) + '/' + String(supabaseSyncGuard.writeRetries || 0) + ' · fallback ' + String(supabaseSyncGuard.queuedFallbacks || 0)) : '',
          supabaseSyncGuard ? ('Supabase chyby: čtení ' + String(supabaseSyncGuard.failedReads || 0) + ' · zápis ' + String(supabaseSyncGuard.failedWrites || 0) + ' · cooldown ' + String(supabaseSyncGuard.cooldownSkips || 0)) : '',
          supabaseCacheGuard ? ('Supabase herní cache: účty hit/write ' + String(supabaseCacheGuard.accountCacheHits || 0) + '/' + String(supabaseCacheGuard.accountCacheWrites || 0) + ' · statistiky hit/write ' + String(supabaseCacheGuard.statsCacheHits || 0) + '/' + String(supabaseCacheGuard.statsCacheWrites || 0)) : '',
          supabaseCacheGuard ? ('Supabase sdílené čtení: spojeno ' + String(supabaseCacheGuard.sharedReadJoins || 0) + ' · stale fallback ' + String(supabaseCacheGuard.staleFallbacks || 0)) : '',
          profileUiGuard ? ('Profilový vzhled: load ' + String(profileUiGuard.remoteLoads || 0) + ' · apply ' + String(profileUiGuard.remoteApplies || 0) + ' · skip starší ' + String(profileUiGuard.remoteOlderSkips || 0) + ' · save ' + String(profileUiGuard.remoteSaves || 0)) : '',
          profileUiGuard ? ('Profilový vzhled guard: stejný save ' + String(profileUiGuard.saveSameSkips || 0) + ' · in-flight load/save ' + String(profileUiGuard.loadInFlightJoins || 0) + '/' + String(profileUiGuard.saveInFlightJoins || 0)) : ''
        ].filter(Boolean) : [];
        const diag = [
          'Verze: ' + formatRakDisplayVersion(getRakCurrentAppVersion()),
          'Online: ' + (navigator.onLine ? 'ano' : 'ne'),
          formatSupabaseKeepaliveLine(supabaseKeepaliveStatus || readSupabaseKeepaliveStatusForUi()),
          'Kompaktní režim: ' + (document.body.classList.contains('compactUI') ? 'zapnutý' : 'vypnutý'),
          LIGHTWEIGHT_MODE_LABEL + ': ' + (document.body.classList.contains('lightweightMode') ? 'zapnutý' : 'vypnutý') + (document.body.classList.contains('reduceMotion') ? ' · méně animací aktivní' : '') + (lightweightManual ? ' · ručně' : ''),
          'Výkonový profil: ' + (document.body.classList.contains('lightweightMode') || document.body.classList.contains('lowEndDevice') ? 'odlehčený' : 'normální'),
          'Starší/slabší zařízení detekováno: ' + (lowEndInfo.lowEnd ? 'ano' : (document.body.classList.contains('lightweightMode') ? 'ne automaticky, ale Láďův režim je zapnutý' : 'ne')) + lowEndReason,
          'Canvas DPR limit: ' + String(typeof getRakPerformanceDprMax === 'function' ? getRakPerformanceDprMax() : '—'),
          'Zařízení: ' + deviceInfo,
          'Aktuální stránka: ' + String(document.querySelector('.page.active')?.id || '—'),
          'Pozadí: ' + String((typeof getBackgroundPreference === 'function' ? getBackgroundPreference() : document.documentElement.dataset.rakBackground) || '—'),
          'Bottom lišta: ' + String(getComputedStyle(document.querySelector('.bottomNav') || document.body).bottom || '—'),
          ...securityRenderDiag,
          ...finalStabilizationDiag,
          ...ladaPerformanceDiag,
          ...devicePerformanceDiag,
          ...gameEngineDiag,
          ...architectureDiag,
          ...tttOnlineJoinDiag,
          ...pwaDiag,
          ...dataOptDiag,
          ...supabaseDiag
        ].filter(line => !/(?:herní|herni|piškvorky|lodě|online hry|top.?score|leaderboard|game[_ -]|gameengine|battleship|ttt|herních profilů|session\/pozvánky|RPC pokrytí|herní cache)/i.test(String(line))).join('\n');
        body.innerHTML = [
          '<div class="appMenuCard appMenuDiagnosticsCard">',
          '  <div class="appMenuCardTitle">Diagnostika</div>',
          '</div>',
          buildSupabaseKeepaliveStatusHtml({ includeButton: true }),
          '<div class="appMenuCard appMenuDiagnosticsCard">',
          '  <pre class="appMenuDiagnosticsText">' + escapeHtml(diag) + '</pre>',
          '</div>',
          '<button type="button" class="appMenuAction appMenuStandaloneBack" data-menu-action="settings">Zpět do nastavení</button>'
        ].join('');
        return;
      }
      if (menuAction === 'supabase-heartbeat-now') {
        try {
          const before = readSupabaseKeepaliveStatusForUi();
          const run = typeof window.runSupabaseKeepaliveNow === 'function'
            ? window.runSupabaseKeepaliveNow
            : (typeof window.RotationSupabaseBridge !== 'undefined' && window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.runKeepaliveNow === 'function' ? window.RotationSupabaseBridge.runKeepaliveNow : null);
          if (!run) {
            alert('Supabase heartbeat ještě není připravený. Zkus to po pár sekundách znovu.\n\n' + formatSupabaseKeepaliveLine(before));
            return;
          }
          await Promise.resolve(run('manual-diagnostics'));
          const after = readSupabaseKeepaliveStatusForUi();
          alert(formatSupabaseKeepaliveLine(after));
        } catch (err) {
          const after = readSupabaseKeepaliveStatusForUi();
          alert('Supabase heartbeat test se nepovedl: ' + String(err && err.message ? err.message : err || 'neznámá chyba') + '\n\n' + formatSupabaseKeepaliveLine(after));
        }
        return;
      }
      if (menuAction === 'hard-reload') {
        if (confirm('Načíst appku znovu bez uložené cache?')) {
          try {
            window.location.reload();
          } catch (err) {
            window.location.reload();
          }
        }
        return;
      }
      if (menuAction === 'reset-state') {
        if (confirm('Smazat uložený stav aplikace?')) {
          try {
            localStorage.removeItem(APP_KEY);
            localStorage.removeItem('rotationBuild');
            localStorage.removeItem(UI_PREFS_KEY);
            localStorage.removeItem('adminUnlocked');
          } catch (err) {
            console.warn(err);
          }
          if (typeof forceHomeRefresh === 'function') forceHomeRefresh();
          if (typeof renderRotace === 'function') renderRotace();
          if (typeof renderStatsPanel === 'function') renderStatsPanel();
          if (typeof updateDashboard === 'function') updateDashboard();
        }
        return;
      }

      if (adminAction === 'back-admin') {
        if(typeof rakGuardAdminRotationDiscard==='function' && !rakGuardAdminRotationDiscard()) return;
        openAppMenu('admin');
        return;
      }
      if (adminAction === 'open-machines') {
        openAppMenu('admin-machines');
        return;
      }
      if (adminAction === 'open-food') {
        openAppMenu('admin-food');
        return;
      }
      if (adminAction === 'open-vacation') {
        openAppMenu('admin-vacation');
        return;
      }
      if (adminAction === 'open-special-days') {
        openAppMenu('admin-special-days');
        return;
      }
      if (adminAction === 'open-rotation') {
        openAppMenu('admin-rotation');
        return;
      }
      if (adminAction === 'open-overtime') {
        openAppMenu('admin-overtime');
        return;
      }
      if (adminAction === 'open-generator-settings') {
        openAppMenu('admin-generator-settings');
        return;
      }
      if (adminAction === 'open-machine-tasks') {
        openAppMenu('admin-machine-tasks');
        return;
      }
      if (adminAction === 'open-correction-settings') {
        openAppMenu('admin-correction-settings');
        return;
      }
      if (adminAction === 'open-workers') {
        openAppMenu('admin-workers');
        return;
      }
      if (adminAction === 'open-change-log') {
        await rakAdminLoadChangeLog();
        openAppMenu('admin-change-log');
        return;
      }
      if (adminAction === 'load-change-log') {
        await rakAdminLoadChangeLog();
        renderAdminMenuBody(body, 'change-log');
        return;
      }
      if (adminAction === 'open-monthly-workflow') {
        openAppMenu('admin-monthly-workflow');
        return;
      }
      if (adminAction === 'open-handover') {
        openAppMenu('admin-handover');
        return;
      }
      if (adminAction === 'open-admin-manual') {
        openAppMenu('admin-manual');
        return;
      }
      if (adminAction === 'open-settings-map') {
        openAppMenu('admin-settings-map');
        return;
      }
      if (adminAction === 'open-admin-accounts') {
        openAppMenu('admin-accounts');
        return;
      }
      if (adminAction === 'open-calendars') {
        openAppMenu('admin-calendars');
        return;
      }
      if (adminAction === 'open-external-links') {
        openAppMenu('admin-external-links');
        return;
      }
      if (adminAction === 'open-app-contact') {
        openAppMenu('admin-app-contact');
        return;
      }
      if (adminAction === 'open-payroll-settings') {
        openAppMenu('admin-payroll-settings');
        return;
      }
      if (adminAction === 'open-backups') {
        openAppMenu('admin-backups');
        return;
      }
      if (adminAction === 'open-settings-backups') {
        openAppMenu('admin-settings-backups');
        return;
      }
      if (adminAction === 'open-announcement') {
        openAppMenu('admin-announcement');
        return;
      }
      if (adminAction === 'open-export') {
        openAppMenu('admin-export');
        return;
      }
      if (adminAction === 'open-reports') {
        openAppMenu('admin-reports');
        return;
      }
      if (adminAction === 'open-service') {
        openAppMenu('admin-service');
        return;
      }
      if (adminAction === 'service-sync-now') {
        const statusEl = document.getElementById('adminOnlineSaveStatus');
        if (statusEl) statusEl.textContent = 'Synchronizuji pracovní data…';
        if (typeof runDashboardManualSync === 'function') await runDashboardManualSync('admin-service-sync');
        else if (typeof window.__rotaceTriggerLiveRefresh === 'function') await window.__rotaceTriggerLiveRefresh('admin-service-sync', { force: true });
        renderAdminMenuBody(body, 'service');
        return;
      }
      if (adminAction === 'service-update-check') {
        const statusEl = document.getElementById('adminOnlineSaveStatus');
        if (statusEl) statusEl.textContent = 'Kontroluji aktualizaci…';
        if (typeof window.__rotaceForcePwaUpdateCheck === 'function') await window.__rotaceForcePwaUpdateCheck('admin-service');
        if (typeof window.__rotaceRequestPwaCacheStatus === 'function') window.__rotaceRequestPwaCacheStatus('admin-service');
        renderAdminMenuBody(body, 'service');
        return;
      }
      if (adminAction === 'load-reports') {
        const statusEl = document.getElementById('adminOnlineSaveStatus');
        if (statusEl) statusEl.textContent = 'Načítám reporty…';
        await loadAdminBugReportsFromSupabase();
        renderAdminMenuBody(body, 'reports');
        return;
      }
      if (adminAction === 'download-reports') {
        downloadAdminBugReports();
        return;
      }
      if (adminAction === 'report-screenshot') {
        const reportId = target.getAttribute('data-report-id') || target.closest('[data-report-id]')?.getAttribute('data-report-id') || '';
        const result = typeof openAdminBugReportScreenshot === 'function' ? await openAdminBugReportScreenshot(reportId) : { ok: false, reason: 'missing-viewer' };
        if (!result || result.ok === false) throw (result && result.error ? result.error : new Error('Screenshot reportu se nepodařilo načíst.'));
        return;
      }
      if (adminAction === 'report-delete') {
        const reportId = target.getAttribute('data-report-id') || target.closest('[data-report-id]')?.getAttribute('data-report-id') || '';
        const result = await deleteAdminBugReport(reportId);
        if (!result || result.ok === false) throw (result && result.error ? result.error : new Error('Report se nepodařilo smazat.'));
        renderAdminMenuBody(body, 'reports');
        return;
      }
      if (adminAction === 'report-seen' || adminAction === 'report-done' || adminAction === 'report-ignore') {
        const reportId = target.getAttribute('data-report-id') || target.closest('[data-report-id]')?.getAttribute('data-report-id') || '';
        const nextStatus = adminAction === 'report-done' ? 'done' : (adminAction === 'report-ignore' ? 'ignored' : 'seen');
        const result = await updateAdminBugReportStatus(reportId, nextStatus);
        if (!result || result.ok === false) throw (result && result.error ? result.error : new Error('Report se nepodařilo upravit.'));
        renderAdminMenuBody(body, 'reports');
        return;
      }
      if (adminAction === 'save-announcement') {
        const statusEl = document.getElementById('adminOnlineSaveStatus');
        const payload = readAdminAnnouncementFromDom();
        if (!payload.message) {
          if (statusEl) statusEl.textContent = 'Nejdřív napiš text oznámení.';
          document.getElementById('adminAnnouncementMessage')?.focus?.();
          return;
        }
        if (payload.startAt && payload.endAt && new Date(payload.startAt).getTime() > new Date(payload.endAt).getTime()) {
          if (statusEl) statusEl.textContent = 'Čas „Od“ musí být před časem „Do“.';
          return;
        }
        if (typeof window.writeRakDashboardAnnouncement === 'function') {
          if (statusEl) statusEl.textContent = 'Ukládám oznámení…';
          const result = await window.writeRakDashboardAnnouncement(payload);
          if (statusEl) {
            statusEl.textContent = result && result.ok
              ? 'Oznámení uložené ✓ · uvidí ho všichni po načtení appky.'
              : 'Oznámení se nepodařilo uložit online: ' + String((result && (result.reason || result.message)) || 'zkontroluj připojení / Supabase.');
          }
          renderAdminMenuBody(body, 'announcement');
        } else if (statusEl) {
          statusEl.textContent = 'Oznámení se nepodařilo uložit, chybí dashboard helper.';
        }
        return;
      }
      if (adminAction === 'clear-announcement') {
        const statusEl = document.getElementById('adminOnlineSaveStatus');
        if (typeof window.clearRakDashboardAnnouncement === 'function') {
          if (statusEl) statusEl.textContent = 'Vypínám oznámení…';
          const result = await window.clearRakDashboardAnnouncement();
          if (statusEl) {
            statusEl.textContent = result && result.ok
              ? 'Oznámení vypnuté ✓'
              : 'Oznámení se nepodařilo vypnout online: ' + String((result && (result.reason || result.message)) || 'zkontroluj připojení / Supabase.');
          }
          renderAdminMenuBody(body, 'announcement');
        } else if (statusEl) {
          statusEl.textContent = 'Oznámení se nepodařilo vypnout, chybí dashboard helper.';
        }
        return;
      }
      if (adminAction === 'load-month') {
        if (monthKey) {
          app.selectedMonth = monthKey;
          setRotaceView('months');
          renderRotace();
          if (typeof renderMonth === 'function') renderMonth(monthKey);
        }
        return;
      }
      // RAK_17069_EXPLICIT_DRAFT_DISCARD: all local, online read-only preflight, never server overwrite.
      if(adminAction==='discard-local-rotation-drafts'){
        if(body.dataset.adminView!=='rotation'||!app||app.adminUnlocked!==true)throw Error('Administrace rozpisů není odemčená.');
        if(window.__rakLocalDraftCleanupRunning)return;
        const bridge=window.RotationSupabaseBridge;
        if(!bridge||typeof bridge.loadRotationState!=='function'||typeof window.rakLocalRotationDraftCleanupPreview!=='function'
          ||typeof window.rakDiscardLocalRotationDrafts!=='function')throw Error('Čištění místních návrhů není připravené.');
        const before=window.rakLocalRotationDraftCleanupPreview();
        if(!before.ok)throw Error('Místní návrhy nebo frontu nelze bezpečně ověřit. Nic nebylo smazáno.');
        const editor=document.getElementById('adminRotationEditor');
        const fingerprint=editor&&typeof rakRotationEditorFingerprint==='function'?rakRotationEditorFingerprint(editor):null;
        if(editor&&fingerprint===null)throw Error('Editor se nepodařilo ověřit. Nic nebylo smazáno.');
        const month=String(app.selectedMonth||'');
        const rotationBefore=JSON.stringify(app.rotation);
        if(!before.drafts&&!before.rotationQueued&&!app.adminRotationDirty){
          const status=document.getElementById('rakAdminLocalDraftCleanupStatus');
          if(status)status.textContent='Žádné neuložené návrhy rozpisů tu nejsou.';
          return;
        }
        if(!confirm('Opravdu nevratně smazat '+before.drafts+' místních záloh a '+before.rotationQueued
          +' čekajících změn rozpisů v tomto zařízení (včetně jiných měsíců a případně jiných administrátorských účtů)?'
          +' Aktuálně rozepsané změny se zahodí a načte se jen ověřený online rozpis. Online data ani jiná fronta se nemažou.'))return;
        window.__rakLocalDraftCleanupRunning=true;
        target.disabled=true;
        try{
          const status=document.getElementById('rakAdminLocalDraftCleanupStatus');
          if(status)status.textContent='Ověřuji aktuální online rozpis; místní návrhy zatím zůstávají…';
          if(typeof navigator!=='undefined'&&navigator.onLine===false)throw Error('Bez internetu nelze ověřit online rozpis. Nic nebylo smazáno.');
          const online=await bridge.loadRotationState();
          const state=typeof bridge.getState==='function'?bridge.getState():null;
          const source=String(state&&state.rotationSync&&state.rotationSync.lastSource||'');
          if(!online||!online.payload||!online.payload.months||online.meta&&online.meta.source==='local-cache'
            ||!['remote','tables'].includes(source)||state.rotationSync.lastError)
            throw Error('Nepodařilo se ověřit skutečný online rozpis. Místní návrhy zůstaly zachovány.');
          if(document.getElementById('adminRotationEditor')!==editor||String(app.selectedMonth||'')!==month
            ||JSON.stringify(app.rotation)!==rotationBefore
            ||editor&&rakRotationEditorFingerprint(editor)!==fingerprint)
            throw Error('Během načítání vznikly nové úpravy. Nic nebylo smazáno.');
          const current=window.rakLocalRotationDraftCleanupPreview();
          if(!current.ok||current.signature!==before.signature)throw Error('Místní návrhy se mezitím změnily. Nic nebylo smazáno.');
          const erased=window.rakDiscardLocalRotationDrafts(before.signature);
          if(!erased||!erased.ok)throw Error('Bezpečné smazání selhalo. Zkontroluj úložiště; změny nepřepisuj.');
          if(typeof rakInvalidateRotationSyncForDraftCleanup==='function')rakInvalidateRotationSyncForDraftCleanup();
          app.adminRotationDirty=false;
          if(typeof applyRakRotationState==='function')applyRakRotationState(online.payload,{force:true});
          renderAdminMenuBody(body,currentView);
          const nextStatus=document.getElementById('rakAdminLocalDraftCleanupStatus');
          if(nextStatus)nextStatus.textContent='Odstraněno místně: '+erased.drafts+' návrhů a '+erased.rotationQueued
            +' čekajících rozpisů. Online rozpis byl znovu načten.'
            +(erased.otherConflicts?' Pozor: '+erased.otherConflicts+' jiných konfliktů zůstává.':'');
          if(typeof window.__rakRefreshSyncBadgeTruth==='function')window.__rakRefreshSyncBadgeTruth();
        }finally{window.__rakLocalDraftCleanupRunning=false;target.disabled=false;}
        return;
      }
      if (adminAction === 'load-online') {
        // RAK_17067_ONLINE_RELOAD_RERENDER_GUARD: canceled or failed read never destroys the DOM draft.
        const loaded = await loadAdminRotationFromSupabase();
        if (!loaded) return;
        renderAdminMenuBody(body, currentView);
        return;
      }
      if (adminAction === 'load-rotation-backups') {
        const statusEl = document.getElementById('adminOnlineSaveStatus');
        if (statusEl) statusEl.textContent = 'Načítám zálohy…';
        await loadAdminRotationBackupsFromSupabase();
        renderAdminMenuBody(body, 'backups');
        return;
      }
      if (adminAction === 'restore-rotation-backup') {
        const backupId = target.getAttribute('data-backup-id') || target.closest('[data-backup-id]')?.getAttribute('data-backup-id') || '';
        if (!backupId) return;
        if (!confirm('Obnovit vybranou zálohu rozpisu? Aktuální stav se před obnovou ještě uloží jako nová záloha.')) return;
        const statusEl = document.getElementById('adminOnlineSaveStatus');
        if (statusEl) statusEl.textContent = 'Obnovuji zálohu…';
        const result = await restoreAdminRotationBackupFromSupabase(backupId);
        if (!result || result.ok === false) throw (result && result.error ? result.error : new Error('Obnova zálohy selhala.'));
        await loadAdminRotationBackupsFromSupabase();
        renderAdminMenuBody(body, 'backups');
        const nextStatus = document.getElementById('adminOnlineSaveStatus');
        if (nextStatus) nextStatus.textContent = 'Záloha obnovená online ✓';
        return;
      }
      if (adminAction === 'restore-rotation-save-backup') {
        const saveBackupKey = target.getAttribute('data-save-backup-key') || target.closest('[data-save-backup-key]')?.getAttribute('data-save-backup-key') || '';
        if (!saveBackupKey) return;
        if (!confirm('Obnovit tuhle automatickou zálohu? Aktuální rozpis se přepíše stavem před posledním uložením.')) return;
        const statusEl = document.getElementById('adminOnlineSaveStatus');
        if (statusEl) statusEl.textContent = 'Obnovuji automatickou zálohu…';
        const result = await restoreRotationSaveBackup(saveBackupKey);
        if (!result || result.ok === false) throw (result && result.error ? result.error : new Error('Obnova automatické zálohy selhala.'));
        renderAdminMenuBody(body, 'backups');
        const nextStatus = document.getElementById('adminOnlineSaveStatus');
        if (nextStatus) nextStatus.textContent = 'Automatická záloha obnovená ✓';
        return;
      }
      if (adminAction === 'load-full-settings-backups') {
        if (!(typeof rakAdminCanManageAdmins === 'function' && rakAdminCanManageAdmins())) return;
        const statusEl = document.getElementById('adminOnlineSaveStatus');
        if (statusEl) statusEl.textContent = 'Načítám zálohy nastavení…';
        await loadAdminFullSettingsBackupsFromSupabase();
        renderAdminMenuBody(body, 'settings-backups');
        return;
      }
      if (adminAction === 'create-full-settings-backup') {
        if (!(typeof rakAdminCanManageAdmins === 'function' && rakAdminCanManageAdmins())) return;
        if (!confirm('Vytvořit úplnou zálohu všech online nastavení a stáhnout ji jako JSON soubor?')) return;
        const statusEl = document.getElementById('adminOnlineSaveStatus');
        if (statusEl) statusEl.textContent = 'Vytvářím úplnou zálohu nastavení…';
        const result = await createAdminFullSettingsBackupOnline();
        if (!result || result.ok === false) throw (result && result.error ? result.error : new Error('Vytvoření zálohy nastavení selhalo.'));
        const backupId = result.backup && result.backup.machine_key ? result.backup.machine_key : '';
        const downloadResult = backupId ? await downloadAdminFullSettingsBackup(backupId) : { ok: false };
        if (!downloadResult || downloadResult.ok === false) throw new Error('Záloha je uložená online, ale stažení JSON souboru selhalo.');
        renderAdminMenuBody(body, 'settings-backups');
        const nextStatus = document.getElementById('adminOnlineSaveStatus');
        if (nextStatus) nextStatus.textContent = 'Úplná záloha nastavení vytvořená online a stažená jako JSON ✓';
        return;
      }
      if (adminAction === 'create-full-settings-backup-online') {
        if (!(typeof rakAdminCanManageAdmins === 'function' && rakAdminCanManageAdmins())) return;
        if (!confirm('Vytvořit úplnou zálohu všech online nastavení jen na Supabase, bez stažení souboru?')) return;
        const statusEl = document.getElementById('adminOnlineSaveStatus');
        if (statusEl) statusEl.textContent = 'Vytvářím úplnou zálohu nastavení (jen online)…';
        const result = await createAdminFullSettingsBackupOnline();
        if (!result || result.ok === false) throw (result && result.error ? result.error : new Error('Vytvoření zálohy nastavení selhalo.'));
        renderAdminMenuBody(body, 'settings-backups');
        const nextStatus = document.getElementById('adminOnlineSaveStatus');
        if (nextStatus) nextStatus.textContent = 'Úplná záloha nastavení vytvořená online ✓';
        return;
      }
      if (adminAction === 'restore-full-settings-backup-from-file') {
        if (!(typeof rakAdminCanManageAdmins === 'function' && rakAdminCanManageAdmins())) return;
        if (!confirm('Nahrát zálohu nastavení ze souboru z telefonu a rovnou obnovit nastavení? Přepíše to uložená nastavení aplikace hodnotami ze souboru.')) return;
        if (typeof app !== 'undefined' && app) app.pendingFullSettingsBackupAutoRestore = true;
        startFullSettingsBackupImport();
        return;
      }
      if (adminAction === 'download-full-settings-backup') {
        if (!(typeof rakAdminCanManageAdmins === 'function' && rakAdminCanManageAdmins())) return;
        const backupId = target.getAttribute('data-settings-backup-id') || target.closest('[data-settings-backup-id]')?.getAttribute('data-settings-backup-id') || '';
        const result = await downloadAdminFullSettingsBackup(backupId);
        if (!result || result.ok === false) throw new Error('Stažení zálohy nastavení selhalo.');
        return;
      }
      if (adminAction === 'restore-full-settings-backup') {
        if (!(typeof rakAdminCanManageAdmins === 'function' && rakAdminCanManageAdmins())) return;
        const backupId = target.getAttribute('data-settings-backup-id') || target.closest('[data-settings-backup-id]')?.getAttribute('data-settings-backup-id') || '';
        if (!backupId) return;
        if (!confirm('Obnovit úplnou zálohu nastavení? Přepíše to uložená nastavení aplikace hodnotami ze zálohy.')) return;
        const statusEl = document.getElementById('adminOnlineSaveStatus');
        if (statusEl) statusEl.textContent = 'Obnovuji úplnou zálohu nastavení…';
        const result = await restoreAdminFullSettingsBackupOnline(backupId);
        if (!result || result.ok === false) throw (result && result.error ? result.error : new Error('Obnova zálohy nastavení selhala.'));
        renderAdminMenuBody(body, 'settings-backups');
        const nextStatus = document.getElementById('adminOnlineSaveStatus');
        if (nextStatus) nextStatus.textContent = 'Nastavení obnovené ze zálohy online ✓';
        return;
      }
      if (adminAction === 'delete-full-settings-backup') {
        if (!(typeof rakAdminCanManageAdmins === 'function' && rakAdminCanManageAdmins())) return;
        const backupId = target.getAttribute('data-settings-backup-id') || target.closest('[data-settings-backup-id]')?.getAttribute('data-settings-backup-id') || '';
        if (!backupId || !confirm('Opravdu smazat tuto online zálohu nastavení? Stažený JSON soubor se tím nesmaže.')) return;
        const result = await deleteAdminFullSettingsBackup(backupId);
        if (!result || result.ok === false) throw (result && result.error ? result.error : new Error('Smazání zálohy nastavení selhalo.'));
        renderAdminMenuBody(body, 'settings-backups');
        const nextStatus = document.getElementById('adminOnlineSaveStatus');
        if (nextStatus) nextStatus.textContent = 'Online záloha nastavení byla smazána.';
        return;
      }
      if (adminAction === 'generate-rotation') {
        if (typeof adminOpenRotationGeneratorWizard === 'function') {
          adminOpenRotationGeneratorWizard(monthKey);
        }
        return;
      }
      if (adminAction === 'overtime-shift-filter') {
        if (typeof adminRotationOvertimeSetShiftFilter === 'function') adminRotationOvertimeSetShiftFilter(target && target.getAttribute('data-overtime-shift-filter'));
        renderAdminMenuBody(body, 'overtime');
        return;
      }
      if (adminAction === 'overtime-row-add') {
        if (typeof adminRotationAddOvertimeRow === 'function') adminRotationAddOvertimeRow(target && target.getAttribute('data-overtime-year'));
        if (typeof adminRotationRefreshOvertimeShiftBadges === 'function') adminRotationRefreshOvertimeShiftBadges(body, true);
        return;
      }
      if (adminAction === 'overtime-row-clear') {
        if (typeof adminRotationClearOvertimeRow === 'function') adminRotationClearOvertimeRow(target);
        return;
      }
      if (adminAction === 'load-overtime-settings') {
        await loadAdminMachineSettingsFromSupabase();
        renderAdminMenuBody(body, 'overtime');
        return;
      }
      if (adminAction === 'save-overtime-settings') {
        const overtimeSettings = readAdminRotationOvertimeSettingsFromDom();
        const rows = mergeAdminRotationOvertimeSettingsRows(overtimeSettings);
        if (window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.saveMachineSettings === 'function') {
          const result = await window.RotationSupabaseBridge.saveMachineSettings(rows);
          if (result && result.ok === false) throw (result.error || new Error('Uložení přesčasů selhalo.'));
          app.machineSettingsRows = rows;
          try { await rakAdminLogChange('Přesčasy', 'Uloženo ' + String((overtimeSettings.entries || []).length) + ' termínů'); } catch (err) {}
          try { if (typeof renderStatsPanel === 'function') renderStatsPanel(); } catch (err) {}
          try { if (typeof updateFoodTile === 'function') updateFoodTile(); } catch (err) {}
          try { if (typeof renderFoodSchedulePage === 'function') renderFoodSchedulePage(); } catch (err) {}
          renderAdminMenuBody(body, 'overtime');
          const statusEl = document.getElementById('adminOnlineSaveStatus');
          if (statusEl) statusEl.textContent = (result && result.queued)
            ? 'Přesčasy uložené lokálně ✓ · po připojení se synchronizují'
            : 'Přesčasy uložené online ✓';
        }
        return;
      }
      if (adminAction === 'load-generator-settings') {
        await loadAdminMachineSettingsFromSupabase();
        renderAdminMenuBody(body, 'generator-settings');
        return;
      }
      if (adminAction === 'save-generator-settings') {
        const generatorSettings = readAdminRotationGeneratorSettingsFromDom();
        const rows = mergeAdminRotationGeneratorSettingsRows(generatorSettings);
        if (window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.saveMachineSettings === 'function') {
          const result = await window.RotationSupabaseBridge.saveMachineSettings(rows);
          if (result && result.ok === false) throw (result.error || new Error('Uložení pravidel generátoru selhalo.'));
          app.machineSettingsRows = rows;
          renderAdminMenuBody(body, 'generator-settings');
          const statusEl = document.getElementById('adminOnlineSaveStatus');
          if (statusEl) statusEl.textContent = (result && result.queued)
            ? 'Pravidla uložená lokálně - po připojení se synchronizují'
            : 'Pravidla generátoru uložená online';
        }
        return;
      }
      if (adminAction === 'load-machine-tasks') {
        await loadAdminMachineSettingsFromSupabase();
        renderAdminMenuBody(body, 'machine-tasks');
        return;
      }
      if (adminAction === 'save-machine-tasks') {
        const taskSettings = typeof readAdminMachineTasksSettingsFromDom === 'function' ? readAdminMachineTasksSettingsFromDom(body) : null;
        const rows = typeof mergeAdminMachineTasksSettingsRows === 'function' ? mergeAdminMachineTasksSettingsRows(taskSettings) : null;
        if (!taskSettings || !Array.isArray(rows) || !(window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.saveMachineSettings === 'function')) throw new Error('Nastavení úkolů není dostupné. Zkus aplikaci obnovit.');
        const result = await window.RotationSupabaseBridge.saveMachineSettings(rows);
        if (result && result.ok === false) throw (result.error || new Error('Uložení úkolů selhalo.'));
        app.machineSettingsRows = rows;
        renderAdminMenuBody(body, 'machine-tasks');
        const statusEl = document.getElementById('adminOnlineSaveStatus');
        if (statusEl) statusEl.textContent = result && result.queued ? 'Úkoly uložené lokálně ✓ · po připojení se synchronizují' : 'Úkoly uložené online ✓';
        return;
      }
      if (adminAction === 'save-fhb-calibration-record') {
        await loadAdminMachineSettingsFromSupabase();
        const current = typeof getAdminFhbCorrectionCalibrationSettings === 'function' ? getAdminFhbCorrectionCalibrationSettings() : null;
        const record = typeof readAdminFhbCorrectionCalibrationRecord === 'function' ? readAdminFhbCorrectionCalibrationRecord(body) : null;
        const added = typeof addAdminFhbCorrectionCalibrationRecord === 'function' ? addAdminFhbCorrectionCalibrationRecord(current, record) : { ok: false };
        if (!added || !added.ok) throw new Error('Doplň levý i pravý údaj před a po korekci a zapiš alespoň jednu změnu korekce.');
        const rows = typeof mergeAdminFhbCorrectionCalibrationRows === 'function' ? mergeAdminFhbCorrectionCalibrationRows(added.settings) : null;
        if (!Array.isArray(rows) || !(window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.saveMachineSettings === 'function')) throw new Error('Nastavení korekcí není dostupné. Zkus aplikaci obnovit.');
        const result = await window.RotationSupabaseBridge.saveMachineSettings(rows);
        if (result && result.ok === false) throw (result.error || new Error('Uložení měření selhalo.'));
        app.machineSettingsRows = rows;
        renderAdminMenuBody(body, 'correction-settings');
        const statusEl = document.getElementById('adminOnlineSaveStatus');
        if (statusEl) statusEl.textContent = 'Měření uložené online ✓';
        return;
      }
      if (adminAction === 'apply-fhb-calibration') {
        await loadAdminMachineSettingsFromSupabase();
        const current = typeof getAdminFhbCorrectionCalibrationSettings === 'function' ? getAdminFhbCorrectionCalibrationSettings() : null;
        const applied = typeof applyAdminFhbCorrectionCalibration === 'function' ? applyAdminFhbCorrectionCalibration(current) : { ok: false };
        if (!applied || !applied.ok) throw new Error('Ještě není dost ověřených měření, nebo aktivní výpočet už doporučení odpovídá.');
        const rows = typeof mergeAdminFhbCorrectionCalibrationRows === 'function' ? mergeAdminFhbCorrectionCalibrationRows(applied.settings) : null;
        if (!Array.isArray(rows) || !(window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.saveMachineSettings === 'function')) throw new Error('Nastavení korekcí není dostupné. Zkus aplikaci obnovit.');
        const result = await window.RotationSupabaseBridge.saveMachineSettings(rows);
        if (result && result.ok === false) throw (result.error || new Error('Potvrzení doporučení selhalo.'));
        app.machineSettingsRows = rows;
        try { if (typeof refreshFhbSettingsUi === 'function') refreshFhbSettingsUi(); } catch (err) {}
        renderAdminMenuBody(body, 'correction-settings');
        const statusEl = document.getElementById('adminOnlineSaveStatus');
        if (statusEl) statusEl.textContent = 'Doporučené nastavení je aktivní v kalkulačce Korekce · Frézky ✓';
        return;
      }
      if (adminAction === 'remove-fhb-calibration-record') {
        const id = String(target.getAttribute('data-fhb-calibration-remove') || target.closest('[data-fhb-calibration-remove]')?.getAttribute('data-fhb-calibration-remove') || '');
        if (!id) return;
        await loadAdminMachineSettingsFromSupabase();
        const current = typeof getAdminFhbCorrectionCalibrationSettings === 'function' ? getAdminFhbCorrectionCalibrationSettings() : null;
        const next = typeof removeAdminFhbCorrectionCalibrationRecord === 'function' ? removeAdminFhbCorrectionCalibrationRecord(current, id) : null;
        const rows = typeof mergeAdminFhbCorrectionCalibrationRows === 'function' ? mergeAdminFhbCorrectionCalibrationRows(next) : null;
        if (!Array.isArray(rows) || !(window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.saveMachineSettings === 'function')) throw new Error('Nastavení korekcí není dostupné. Zkus aplikaci obnovit.');
        const result = await window.RotationSupabaseBridge.saveMachineSettings(rows);
        if (result && result.ok === false) throw (result.error || new Error('Smazání měření selhalo.'));
        app.machineSettingsRows = rows;
        renderAdminMenuBody(body, 'correction-settings');
        const statusEl = document.getElementById('adminOnlineSaveStatus');
        if (statusEl) statusEl.textContent = 'Záznam byl smazán.';
        return;
      }
      if (adminAction === 'load-workers') {
        await loadAdminMachineSettingsFromSupabase();
        renderAdminMenuBody(body, 'workers');
        return;
      }
      if (adminAction === 'save-workers') {
        const workerSettings = readAdminWorkerRosterSettingsFromDom();
        const appAccounts = Array.isArray(workerSettings.appAccounts) ? workerSettings.appAccounts : [];
        if (appAccounts.length) {
          const bridge = window.RotationSupabaseBridge;
          if (!bridge || typeof bridge.saveApplicationAccount !== 'function') throw new Error('Samostatné účty aplikace teď nejsou připravené.');
          for (const account of appAccounts) {
            const savedAccount = await bridge.saveApplicationAccount({ accountNumber: account.loginNumber, fullName: account.name });
            if (!savedAccount || savedAccount.ok === false) {
              const reason = savedAccount && savedAccount.reason === 'online-required'
                ? 'Pro přidání účtu aplikace je potřeba připojení k internetu.'
                : 'Uložení účtu aplikace se nepovedlo.';
              throw (savedAccount && savedAccount.error ? savedAccount.error : new Error(reason));
            }
          }
        }
        const rows = mergeRakWorkerRosterSettingsRows(workerSettings);
        if (window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.saveMachineSettings === 'function') {
          const result = await window.RotationSupabaseBridge.saveMachineSettings(rows);
          if (result && result.ok === false) throw (result.error || new Error('Uložení pracovníků selhalo.'));
          app.machineSettingsRows = rows;
          // RAK_EXTERNAL_SHIFT_TEAMS_17020
          if(typeof rakApplyShiftAccess==='function') rakApplyShiftAccess();
          if(typeof updateDashboard==='function') updateDashboard();
          try { if (typeof renderStatsPanel === 'function') renderStatsPanel(); } catch (err) {}
          renderAdminMenuBody(body, 'workers');
          const statusEl = document.getElementById('adminOnlineSaveStatus');
          // RAK_17065_NO_GAME_PROVISIONING_GUARD: saving workers must not create game profiles.
          const newProfilesText = appAccounts.length ? (' · účty aplikace: ' + String(appAccounts.length)) : '';
          if (statusEl) statusEl.textContent = (result && result.queued)
            ? 'Pracovníci uložení lokálně ✓ · po připojení se synchronizují'
            : ('Pracovníci uložení online ✓' + newProfilesText);
        }
        return;
      }
      if (adminAction === 'admin-account-row-clear') {
        if (typeof rakAdminClearAccountRow === 'function') rakAdminClearAccountRow(target);
        return;
      }
      if (adminAction === 'load-admin-accounts') {
        if (typeof app !== 'undefined' && app && app.adminAuthVersion === 2 && typeof rakAdminLoadAccountsDirectoryForViewer === 'function') {
          const loaded = await rakAdminLoadAccountsDirectoryForViewer();
          if (!loaded.ok) throw (loaded.profileError || loaded.deviceError || new Error('Načtení správců selhalo.'));
          renderAdminMenuBody(body, 'admin-accounts');
          return;
        }
        if (window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.loadMachineSettings === 'function') {
          app.machineSettingsRows = await window.RotationSupabaseBridge.loadMachineSettings();
          renderAdminMenuBody(body, 'admin-accounts');
          return;
        }
      }
      if (adminAction === 'save-admin-accounts') {
        if (!(typeof rakAdminCanManageAdmins === 'function' && rakAdminCanManageAdmins())) return;
        if (typeof app !== 'undefined' && app && app.adminAuthVersion === 2 && typeof rakAdminSaveSecureAccounts === 'function') {
          const secureResult = await rakAdminSaveSecureAccounts(body);
          // RAK_CROSS_SHIFT_FIXES_17024
          if (!secureResult.ok) throw (secureResult.error || new Error(secureResult.reason === 'account-not-in-login-directory'
            ? 'Osobní číslo není v přihlašovacích účtech RaK. Ulož pracovníka v Účty aplikace a znovu načti správce.'
            : 'Uložení správců selhalo: ' + String(secureResult.reason || 'neznámá chyba')));
          renderAdminMenuBody(body, 'admin-accounts');
          const secureStatus = document.getElementById('adminOnlineSaveStatus');
          if (secureStatus) secureStatus.textContent = 'Správci uloženi bezpečně online ✓';
          return;
        }
        const adminSettings = readAdminAccountsSettingsFromDom();
        const rows = mergeAdminAccountsSettingsRows(adminSettings);
        if (window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.saveMachineSettings === 'function') {
          const result = await window.RotationSupabaseBridge.saveMachineSettings(rows);
          if (result && result.ok === false) throw (result.error || new Error('Uložení správců selhalo.'));
          app.machineSettingsRows = rows;
          renderAdminMenuBody(body, 'admin-accounts');
          const statusEl = document.getElementById('adminOnlineSaveStatus');
          if (statusEl) statusEl.textContent = (result && result.queued)
            ? 'Správci uložení lokálně ✓ · po připojení se synchronizují'
            : 'Správci uložení online ✓';
        }
        return;
      }
      if (adminAction === 'revoke-admin-session') {
        if (!(typeof rakAdminCanManageAdmins === 'function' && rakAdminCanManageAdmins())) return;
        const deviceId = String(target && target.dataset ? target.dataset.adminDeviceId || '' : '').trim();
        const isCurrentDevice = !!(target && target.dataset && target.dataset.adminCurrentDevice === '1');
        if (!deviceId || typeof rakAdminRevokePersistentSession !== 'function') return;
        const result = await rakAdminRevokePersistentSession(deviceId);
        if (result && result.ok === false) throw (result.error || new Error('Odhlášení zařízení selhalo.'));
        if (isCurrentDevice || !(typeof rakAdminCanOpenAdmin === 'function' && rakAdminCanOpenAdmin())) {
          openAppMenu('menu');
          return;
        }
        renderAdminMenuBody(body, 'admin-accounts');
        const statusEl = document.getElementById('adminOnlineSaveStatus');
        if (statusEl) statusEl.textContent = 'Zařízení odhlášené online ✓';
        return;
      }
      if (adminAction === 'change-owner-password') {
        if (!(typeof rakAdminCanManageAdmins === 'function' && rakAdminCanManageAdmins())) return;
        const statusEl = document.getElementById('adminOnlineSaveStatus');
        if (statusEl) statusEl.textContent = 'Měním heslo hlavního admina…';
        const result = typeof rakAdminChangeOwnerPassword === 'function'
          ? await rakAdminChangeOwnerPassword(body)
          : { ok: false, reason: 'missing-handler' };
        if (!result || result.ok === false) {
          const messages = {
            'password-too-short': 'Nové heslo musí mít alespoň 6 znaků a současné nesmí být prázdné.',
            'password-mismatch': 'Nová hesla se neshodují.',
            'password-unchanged': 'Nové heslo je stejné jako současné.',
            'invalid_current_password': 'Současné heslo není správné.'
          };
          throw (result && result.error ? result.error : new Error(messages[result && result.reason] || 'Změna hesla selhala.'));
        }
        renderAdminMenuBody(body, 'admin-accounts');
        const nextStatus = document.getElementById('adminOnlineSaveStatus');
        if (nextStatus) nextStatus.textContent = 'Heslo hlavního admina bylo změněno.';
        return;
      }
      if (adminAction === 'change-own-admin-password') {
        if (!(typeof rakAdminCanOpenAdmin === 'function' && rakAdminCanOpenAdmin()) || (typeof rakAdminCanManageAdmins === 'function' && rakAdminCanManageAdmins())) return;
        const statusEl = document.getElementById('adminOnlineSaveStatus');
        if (statusEl) statusEl.textContent = 'Měním moje heslo…';
        const result = typeof rakAdminChangeOwnPassword === 'function' ? await rakAdminChangeOwnPassword(body) : { ok: false, reason: 'missing-handler' };
        if (!result || result.ok === false) {
          const messages = { 'password-too-short': 'Nové heslo musí mít alespoň 6 znaků a současné nesmí být prázdné.', 'password-mismatch': 'Nová hesla se neshodují.', 'password-unchanged': 'Nové heslo je stejné jako současné.', 'invalid_current_password': 'Současné heslo není správné.' };
          throw (result && result.error ? result.error : new Error(messages[result && result.reason] || 'Změna hesla selhala.'));
        }
        renderAdminMenuBody(body, 'admin-accounts');
        const nextStatus = document.getElementById('adminOnlineSaveStatus');
        if (nextStatus) nextStatus.textContent = 'Moje heslo bylo změněno.';
        return;
      }
      if (adminAction === 'add-shift-calendar') {
        const team = String(target.getAttribute('data-calendar-team') || '').trim().toUpperCase();
        const block = target.closest('[data-shift-calendar-team-block]');
        const rows = block ? block.querySelector('[data-shift-calendar-rows]') : null;
        const row = target.closest('[data-shift-calendar-row]');
        if (typeof buildAdminShiftCalendarRowHtml === 'function') {
          const html = buildAdminShiftCalendarRowHtml(team, {});
          if (row) row.insertAdjacentHTML('afterend', html);
          else if (rows) rows.insertAdjacentHTML('beforeend', html);
        }
        return;
      }
      if (adminAction === 'remove-shift-calendar') {
        const row = target.closest('[data-shift-calendar-row]');
        if (!row) return;
        const rowsWrap = row.closest('[data-shift-calendar-rows]');
        const rowCount = rowsWrap ? rowsWrap.querySelectorAll('[data-shift-calendar-row]').length : 0;
        if (rowCount <= 1) {
          row.querySelectorAll('[data-shift-calendar-field]').forEach((input) => { input.value = ''; });
        } else {
          row.remove();
        }
        return;
      }
      if (adminAction === 'load-calendars') {
        await loadAdminMachineSettingsFromSupabase();
        renderAdminMenuBody(body, 'calendars');
        return;
      }
      if (adminAction === 'save-calendars') {
        const calendarSettings = readAdminShiftCalendarsSettingsFromDom();
        const rows = mergeRakShiftCalendarSettingsRows(calendarSettings);
        if (window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.saveMachineSettings === 'function') {
          const result = await window.RotationSupabaseBridge.saveMachineSettings(rows, { reason: 'shift-calendars' });
          if (result && result.ok === false) throw (result.error || new Error('Uložení kalendářů selhalo.'));
          app.machineSettingsRows = rows;
          try { if (typeof updateDashboard === 'function') updateDashboard(); } catch (err) {}
          try {
            const modal = document.getElementById('calendarModal');
            if (modal && modal.classList.contains('isVisible') && typeof renderCalendarModalContent === 'function') {
              renderCalendarModalContent(modal);
            }
          } catch (err) {}
          renderAdminMenuBody(body, 'calendars');
          const statusEl = document.getElementById('adminOnlineSaveStatus');
          if (statusEl) statusEl.textContent = 'Kalendáře uložené online';
        }
        return;
      }
      if (adminAction === 'load-external-links') {
        await loadAdminMachineSettingsFromSupabase();
        renderAdminMenuBody(body, 'external-links');
        return;
      }
      if (adminAction === 'save-external-links') {
        const linkSettings = readAdminExternalLinksSettingsFromDom();
        const rows = mergeRakExternalLinksSettingsRows(linkSettings);
        if (window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.saveMachineSettings === 'function') {
          const result = await window.RotationSupabaseBridge.saveMachineSettings(rows);
          if (result && result.ok === false) throw (result.error || new Error('Uložení odkazů selhalo.'));
          app.machineSettingsRows = rows;
          try { if (typeof syncDashboardExternalLinks === 'function') syncDashboardExternalLinks(); } catch (err) {}
          try { if (typeof updateDashboard === 'function') updateDashboard(); } catch (err) {}
          renderAdminMenuBody(body, 'external-links');
          const statusEl = document.getElementById('adminOnlineSaveStatus');
          if (statusEl) statusEl.textContent = (result && result.queued)
            ? 'Odkazy uložené lokálně - po připojení se synchronizují'
            : 'Odkazy uložené online';
        }
        return;
      }
      if (adminAction === 'load-app-contact') {
        await loadAdminMachineSettingsFromSupabase();
        renderAdminMenuBody(body, 'app-contact');
        return;
      }
      if (adminAction === 'save-app-contact') {
        if (!(typeof rakAdminCanManageAdmins === 'function' && rakAdminCanManageAdmins())) return;
        const contactSettings = readAdminAppContactSettingsFromDom();
        const rows = mergeRakAppContactSettingsRows(contactSettings);
        if (window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.saveMachineSettings === 'function') {
          const result = await window.RotationSupabaseBridge.saveMachineSettings(rows);
          if (result && result.ok === false) throw (result.error || new Error('Uložení kontaktu selhalo.'));
          app.machineSettingsRows = rows;
          renderAdminMenuBody(body, 'app-contact');
          const statusEl = document.getElementById('adminOnlineSaveStatus');
          if (statusEl) statusEl.textContent = (result && result.queued)
            ? 'Kontakt uložený lokálně - po připojení se synchronizuje'
            : 'Kontakt uložený online';
        }
        return;
      }
      if (adminAction === 'load-payroll-settings') {
        await loadAdminMachineSettingsFromSupabase();
        renderAdminMenuBody(body, 'payroll-settings');
        return;
      }
      if (adminAction === 'save-payroll-settings') {
        const payrollSettings = readAdminPayrollSettingsFromDom();
        const rows = mergeRakPayrollSettingsRows(payrollSettings);
        if (window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.saveMachineSettings === 'function') {
          const result = await window.RotationSupabaseBridge.saveMachineSettings(rows);
          if (result && result.ok === false) throw (result.error || new Error('Uložení výplaty selhalo.'));
          app.machineSettingsRows = rows;
          try { if (typeof updateDashboard === 'function') updateDashboard(); } catch (err) {}
          try { if (typeof updateFoodTile === 'function') updateFoodTile(); } catch (err) {}
          renderAdminMenuBody(body, 'payroll-settings');
          const statusEl = document.getElementById('adminOnlineSaveStatus');
          if (statusEl) statusEl.textContent = (result && result.queued)
            ? 'Výplata uložená lokálně - po připojení se synchronizuje'
            : 'Výplata uložená online';
        }
        return;
      }
      if (adminAction === 'add-absence-row') {
        if (typeof adminAddAbsenceRowToEditor === 'function') adminAddAbsenceRowToEditor();
        return;
      }
      if (adminAction === 'copy-rotation-vacations') {
        if (typeof copyAdminRotationVacationsToClipboard !== 'function') throw new Error('Kopírování dovolených není dostupné.');
        const result = await copyAdminRotationVacationsToClipboard(monthKey);
        const statusEl = document.getElementById('adminRotationDraftStatus') || document.getElementById('adminOnlineSaveStatus');
        if (statusEl) statusEl.textContent = 'Dovolené zkopírované do schránky · řádků: ' + String(result && result.lineCount || 0) + '.';
        return;
      }
      if (adminAction && adminAction.indexOf('generator-') === 0) {
        if (typeof adminHandleRotationGeneratorWizardAction === 'function' && adminHandleRotationGeneratorWizardAction(adminAction, target, body)) return;
      }
      if (adminAction === 'download-unsynced-draft') {
        if (typeof rakDownloadPreservedAdminMonthDraft !== 'function'
          || !rakDownloadPreservedAdminMonthDraft(String(target.getAttribute('data-draft-key')||'')))
          throw new Error('Soukromý návrh se nepodařilo stáhnout. Původní data zůstávají beze změny.');
        return;
      }
      if (adminAction === 'save-rotation') {
        const manualMonth = readAdminRotationFromDom(monthKey);
        const overrideState = adminRotationBuildManualRuleOverrideState(monthKey, manualMonth);
        let saveOptions = {
          normalizedMonth: overrideState.normalized,
          ruleCheck: overrideState.ruleCheck
        };
        if (overrideState.blockingIssues.length) {
          const confirmed = await adminRotationConfirmManualRuleOverride(overrideState);
          if (!confirmed) {
            const cancelledStatus = document.getElementById('adminOnlineSaveStatus') || document.getElementById('adminRotationDraftStatus');
            if (cancelledStatus) cancelledStatus.textContent = 'Uložení zrušeno · rozepsané změny zůstaly v editoru.';
            return;
          }
          saveOptions = {
            normalizedMonth: overrideState.normalized,
            ruleCheck: overrideState.ruleCheck,
            manualOverride: true,
            allowRuleViolations: true,
            manualOverrideIssues: overrideState.blockingIssues
          };
        }
        const result = await saveAdminRotationFromDom(monthKey, saveOptions);
        const saveResult = result && result.saveResult ? result.saveResult : null;
        const ruleWarnings = result && result.ruleCheck && Array.isArray(result.ruleCheck.issues)
          ? result.ruleCheck.issues.filter((issue) => issue && issue.severity === 'warn')
          : [];
        const manualOverrideIssues = result && Array.isArray(result.manualOverrideIssues) ? result.manualOverrideIssues : [];
        const baseText = saveResult && saveResult.ok === true && saveResult.queued !== true
          ? (saveResult.queued
              ? 'Rozpis uložený lokálně ✓ · po připojení se synchronizuje'
              : ('Rozpis uložený online ✓ · měsíců: ' + String(saveResult.months || 0) + ' · řádků: ' + String(saveResult.entries || 0)))
          : 'Rozpis se nepodařilo uložit online.';
        const statusText = manualOverrideIssues.length && typeof adminRotationFormatRuleIssues === 'function'
          ? baseText + ' · Uloženo přes varování: ' + adminRotationFormatRuleIssues(manualOverrideIssues)
          : (ruleWarnings.length && typeof adminRotationFormatRuleIssues === 'function'
              ? baseText + ' · Kontrola: ' + adminRotationFormatRuleIssues(ruleWarnings)
              : baseText);
        if (saveResult && saveResult.ok === true && saveResult.queued !== true) renderAdminMenuBody(body, currentView);
        const statusEl = document.getElementById('adminOnlineSaveStatus');
        if (statusEl) statusEl.textContent = saveResult && saveResult.ok === true && saveResult.queued !== true
          ? statusText
          : ((saveResult && saveResult.reason === 'draft-storage-failed')
              ? 'Uložení zastaveno: nelze ověřit místní zálohu. Neobnovuj stránku; stáhni návrh.'
              : 'Rozpis se nepodařilo potvrdit online. Návrh zůstal zachován; neobnovuj bez zálohy.');
        if (!(saveResult && saveResult.ok === true && saveResult.queued !== true)
          && result && result.draft && typeof rakShowAdminDraftExport === 'function') {
          rakShowAdminDraftExport(result.draft,statusEl||document.getElementById('adminRotationDraftStatus'));
        }
        return;
      }
      if (adminAction === 'load-food-schedule') {
        if (window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.loadMachineSettings === 'function') {
          app.machineSettingsRows = await window.RotationSupabaseBridge.loadMachineSettings();
          try { if (typeof updateFoodTile === 'function') updateFoodTile(); } catch (err) {}
          try { if (typeof renderFoodSchedulePage === 'function') renderFoodSchedulePage(); } catch (err) {}
          try { if (typeof updateDashboard === 'function') updateDashboard(); } catch (err) {}
          renderAdminMenuBody(body, 'food');
          return;
        }
      }
      if (adminAction === 'save-food-schedule') {
        const foodSettings = readAdminFoodScheduleSettingsFromDom();
        const rows = mergeAdminFoodScheduleSettingsRows(foodSettings);
        if (window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.saveMachineSettings === 'function') {
          const result = await window.RotationSupabaseBridge.saveMachineSettings(rows);
          if (result && result.ok === false) throw (result.error || new Error('Uložení časů selhalo.'));
          app.machineSettingsRows = rows;
          try { if (typeof updateFoodTile === 'function') updateFoodTile(); } catch (err) {}
          try { if (typeof renderFoodSchedulePage === 'function') renderFoodSchedulePage(); } catch (err) {}
          try { if (typeof updateDashboard === 'function') updateDashboard(); } catch (err) {}
          renderAdminMenuBody(body, 'food');
          const statusEl = document.getElementById('adminOnlineSaveStatus');
          if (statusEl) statusEl.textContent = (result && result.queued)
            ? ('Časy uložené lokálně ✓ · po připojení se synchronizují')
            : ('Časy uložené online ✓');
          return;
        }
      }
      if (adminAction === 'load-vacation-countdown') {
        if (window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.loadMachineSettings === 'function') {
          app.machineSettingsRows = await window.RotationSupabaseBridge.loadMachineSettings();
          try { if (typeof updateDashboard === 'function') updateDashboard(); } catch (err) {}
          renderAdminMenuBody(body, 'vacation');
          return;
        }
      }
      if (adminAction === 'save-vacation-countdown') {
        const vacationSettings = readAdminVacationCountdownSettingsFromDom();
        const rows = mergeAdminVacationCountdownSettingsRows(vacationSettings);
        if (window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.saveMachineSettings === 'function') {
          const result = await window.RotationSupabaseBridge.saveMachineSettings(rows);
          if (result && result.ok === false) throw (result.error || new Error('Uložení dovolené selhalo.'));
          app.machineSettingsRows = rows;
          try { await rakAdminLogChange('Dovolená / odstávky', 'Uloženo ' + String((vacationSettings.periods || []).length) + ' období'); } catch (err) {}
          try { if (typeof updateDashboard === 'function') updateDashboard(); } catch (err) {}
          renderAdminMenuBody(body, 'vacation');
          const statusEl = document.getElementById('adminOnlineSaveStatus');
          if (statusEl) statusEl.textContent = (result && result.queued)
            ? ('Dovolená uložená lokálně ✓ · po připojení se synchronizuje')
            : ('Dovolená uložená online ✓');
          return;
        }
      }
      if (adminAction === 'load-special-days') {
        if (window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.loadMachineSettings === 'function') {
          app.machineSettingsRows = await window.RotationSupabaseBridge.loadMachineSettings();
          try { if (typeof updateDashboard === 'function') updateDashboard(); } catch (err) {}
          renderAdminMenuBody(body, 'special-days');
          return;
        }
      }
      if (adminAction === 'save-special-days') {
        const specialDaysSettings = readAdminSpecialDaysSettingsFromDom();
        const rows = mergeRakSpecialDaysSettingsRows(specialDaysSettings);
        if (window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.saveMachineSettings === 'function') {
          const result = await window.RotationSupabaseBridge.saveMachineSettings(rows);
          if (result && result.ok === false) throw (result.error || new Error('Uložení volných dnů selhalo.'));
          app.machineSettingsRows = rows;
          try { if (typeof updateDashboard === 'function') updateDashboard(); } catch (err) {}
          try { if (typeof updateFoodTile === 'function') updateFoodTile(); } catch (err) {}
          renderAdminMenuBody(body, 'special-days');
          const statusEl = document.getElementById('adminOnlineSaveStatus');
          if (statusEl) statusEl.textContent = (result && result.queued)
            ? 'Volné dny uložené lokálně ✓ · po připojení se synchronizují'
            : 'Volné dny uložené online ✓';
          return;
        }
      }
      if (adminAction === 'load-machines') {
        if (window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.loadMachineSettings === 'function') {
          app.machineSettingsRows = await window.RotationSupabaseBridge.loadMachineSettings();
          try { if (typeof updateFoodTile === 'function') updateFoodTile(); } catch (err) {}
          try { if (typeof renderFoodSchedulePage === 'function') renderFoodSchedulePage(); } catch (err) {}
          try { if (typeof updateDashboard === 'function') updateDashboard(); } catch (err) {}
          renderAdminMenuBody(body, currentView);
          return;
        }
      }
      if (adminAction === 'save-machines') {
        const rows = readAdminMachineSettingsFromDom();
        if (window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.saveMachineSettings === 'function') {
          const result = await window.RotationSupabaseBridge.saveMachineSettings(rows);
          if (result && result.ok === false) throw (result.error || new Error('Uložení strojů selhalo.'));
          app.machineSettingsRows = rows;
          try {
            if (typeof refreshPrackaFromMachineSettings === 'function') refreshPrackaFromMachineSettings('admin-save-machines');
            else if (typeof updatePrackaInfo === 'function') updatePrackaInfo();
          } catch (err) {}
          try {
            if (typeof refreshFhbSettingsUi === 'function') refreshFhbSettingsUi({ source: 'admin-save-machines', recalculate: true });
            else if (typeof updateFhbPresetButtons === 'function') updateFhbPresetButtons();
          } catch (err) {}
          try { if (typeof updateFoodTile === 'function') updateFoodTile(); } catch (err) {}
          try { if (typeof renderFoodSchedulePage === 'function') renderFoodSchedulePage(); } catch (err) {}
          renderAdminMenuBody(body, currentView);
          const statusEl = document.getElementById('adminOnlineSaveStatus');
          if (statusEl) statusEl.textContent = (result && result.queued)
            ? ('Stroje uložené lokálně ✓ · po připojení se synchronizují' + ((result && result.savedCount) ? (' · řádků: ' + result.savedCount) : ''))
            : ('Stroje uložené online ✓' + ((result && result.savedCount) ? (' · řádků: ' + result.savedCount) : ''));
          return;
        }
      }
      if (adminAction === 'toggle-calendar-note') {
        const noteId = target.getAttribute('data-calendar-note-id');
        const current = typeof getRakCalendarNotesSettings === 'function' ? getRakCalendarNotesSettings() : {};
        if (noteId && Object.prototype.hasOwnProperty.call(current, noteId) && window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.saveMachineSettings === 'function') {
          current[noteId] = !current[noteId];
          const rows = mergeRakCalendarNotesSettingsRows(current);
          const result = await window.RotationSupabaseBridge.saveMachineSettings(rows);
          if (result && result.ok === false) throw (result.error || new Error('Uložení upozornění selhalo.'));
          app.machineSettingsRows = rows;
          try { if (typeof updateDashboard === 'function') updateDashboard(); } catch (err) {}
          renderAdminMenuBody(body, currentView);
        }
        return;
      }

      if (uiPref) {
        toggleUiPref(uiPref);
        openAppMenu('settings');
        return;
      }
      if (uiReset) {
        resetUiPrefs();
        openAppMenu('settings');
        return;
      }
    } catch (err) {
      console.error('Menu/admin action failed', err);
      alert(err && err.message ? err.message : 'Akce se nepodařila.');
    }
  });

  body.addEventListener('focusout', (event) => {
    const target = event.target;
    if (!target || typeof target.matches !== 'function') return;
    if (target.matches('[data-food-overtime-date]')) {
      if (typeof adminFoodNormalizeDateInput === 'function') {
        const normalized = adminFoodNormalizeDateInput(target.value || '');
        if (normalized && normalized !== target.value) target.value = normalized;
      }
      if (typeof adminFoodRefreshStatus === 'function') adminFoodRefreshStatus(body);
      return;
    }
    if (!target.matches('[data-rot-field], [data-note-field]')) return;
    window.setTimeout(() => {
      const next = document.activeElement;
      const codePicker = document.getElementById('adminAbsenceCodePicker');
      if (codePicker && codePicker.classList && codePicker.classList.contains('isVisible')) {
        if (next === codePicker || (next && codePicker.contains && codePicker.contains(next))) return;
        if (!next || !next.matches || !next.matches('[data-note-field="code"]')) adminCloseAbsenceCodePicker();
      }
      const quick = document.getElementById('adminRotationQuickRemove');
      if (quick && quick.classList && quick.classList.contains('isVisible')) {
        if (next === quick || (next && quick.contains && quick.contains(next))) return;
        const shownAt = Number(window.__rakAdminRotationQuickRemoveShownAt || 0) || 0;
        // Mobilní klávesnice/focus občas po tapnutí pole hned vyvolá blur. Nezavírat rychlé Odebrat okamžitě po zobrazení.
        if (shownAt && Date.now() - shownAt < 8000) return;
      }
      if (!next || !next.matches || !next.matches('[data-rot-field], [data-note-field]')) adminCloseRotationQuickRemove();
    }, 120);
  });

  body.addEventListener('scroll', () => {
    if (body.dataset.adminView !== 'rotation') return;
    try {
      if (window.__rakAdminRotationScrollCloseRaf) return;
      window.__rakAdminRotationScrollCloseRaf = window.requestAnimationFrame(() => {
        window.__rakAdminRotationScrollCloseRaf = 0;
        const codeTarget = window.__rakAdminAbsenceCodeInput;
        if (codeTarget && codeTarget.isConnected && body.contains(codeTarget)) adminShowAbsenceCodePicker(codeTarget);
        else adminCloseAbsenceCodePicker();
        const target = window.__rakAdminRotationQuickRemoveInput;
        if (target && target.isConnected && body.contains(target)) adminShowRotationQuickRemove(target);
        else adminCloseRotationQuickRemove();
      });
    } catch (err) {
      const codeTarget = window.__rakAdminAbsenceCodeInput;
      if (codeTarget && codeTarget.isConnected && body.contains(codeTarget)) adminShowAbsenceCodePicker(codeTarget);
      else adminCloseAbsenceCodePicker();
      const target = window.__rakAdminRotationQuickRemoveInput;
      if (target && target.isConnected && body.contains(target)) adminShowRotationQuickRemove(target);
      else adminCloseRotationQuickRemove();
    }
  }, { passive: true });

  body.addEventListener('input', (event) => {
    const target = event.target;
    if (!target || typeof target.matches !== 'function') return;
    if (!target.matches('[data-rot-field], [data-note-field]')) return;
    if (target.matches('[data-note-field="code"]')) {
      adminCloseRotationQuickRemove();
      adminScheduleAbsenceCodePicker(target);
    } else if (adminRotationIsRemoveValue(target.value)) {
      target.value = '';
      adminCloseRotationQuickRemove();
    } else {
      adminScheduleRotationQuickRemove(target);
    }
    if (body.dataset.adminView === 'rotation') {
      scheduleAdminRotationEditorMaintenance(body, 'input', 900);
    }
  });

  body.addEventListener('focusin', (event) => {
    const target = event.target;
    if (!target || typeof target.matches !== 'function') return;
    if (!target.matches('[data-rot-field], [data-note-field]')) return;
    if (body.dataset.adminView === 'rotation') {
      if (target.matches('[data-note-field="code"]')) {
        adminCloseRotationQuickRemove();
        adminScheduleAbsenceCodePicker(target);
      } else {
        adminCloseAbsenceCodePicker();
        adminScheduleRotationQuickRemove(target);
      }
      adminAttachRotationAvailableDatalist(target);
    }
  });
}

function openAppMenu(view) {
  // RAK_17067_CENTRAL_MENU_DRAFT_GUARD: protect other navigation paths, too.
  const currentBody = typeof document !== 'undefined' ? document.getElementById('appMenuBody') : null;
  if (currentBody && currentBody.dataset.adminView === 'rotation' && typeof app !== 'undefined' && app && app.adminRotationDirty === true) {
    if (typeof rakGuardAdminRotationDiscard !== 'function' || !rakGuardAdminRotationDiscard()) return false;
  }
  const page = ensureAppMenuOverlay();
  page.classList.add('active');
  const body = page.querySelector('#appMenuBody');
  const v = view || 'menu';
  const adminViews = new Set(['admin', 'admin-machines', 'admin-food', 'admin-vacation', 'admin-special-days', 'admin-rotation', 'admin-overtime', 'admin-generator-settings', 'admin-machine-tasks', 'admin-correction-settings', 'admin-workers', 'admin-change-log', 'admin-monthly-workflow', 'admin-handover', 'admin-manual', 'admin-settings-map', 'admin-accounts', 'admin-calendars', 'admin-external-links', 'admin-app-contact', 'admin-payroll-settings', 'admin-backups', 'admin-settings-backups', 'admin-announcement', 'admin-export', 'admin-reports', 'admin-service']);

  const versionText = getRakCurrentAppVersion();
  const contact = typeof getRakAppContactSettings === 'function'
    ? getRakAppContactSettings()
    : { name: 'Martin Špadrna', phone: '+420 773 682 499', email: 'martinspadrna@gmail.com' };
  const contactPhoneHref = typeof getRakAppContactPhoneHref === 'function' ? getRakAppContactPhoneHref(contact) : '';
  const contactEmailHref = typeof getRakAppContactEmailHref === 'function' ? getRakAppContactEmailHref(contact) : '';

  if (body) {
    bindAppMenuHandlers(body);
    if (!adminViews.has(v)) body.dataset.adminView = '';
    if (adminViews.has(v) && !(typeof rakAdminCanOpenAdmin === 'function' && rakAdminCanOpenAdmin())) {
      body.innerHTML = [
        '<div class="appMenuCard appMenuAdminCard">',
        '  <div class="appMenuCardTitle">Administrace zamčena</div>',
        '  <div class="appMenuText">Administrace je dostupná jen po přihlášení admin účtem.</div>',
        '  <button type="button" class="appMenuAction appMenuBack" data-menu-back="1">Zpět</button>',
        '</div>'
      ].join('');
      return;
    }
    if (v === 'admin-settings-backups' && !(typeof rakAdminCanManageAdmins === 'function' && rakAdminCanManageAdmins())) {
      body.innerHTML = [
        '<div class="appMenuCard appMenuAdminCard">',
        '  <div class="appMenuCardTitle">Zálohy nastavení</div>',
        '  <div class="appMenuText">Úplné zálohy nastavení může vytvářet a obnovovat jen hlavní admin. Nižší admin může spravovat pracovní části aplikace, ale nemůže vracet celé nastavení.</div>',
        '  <button type="button" class="appMenuAction appMenuBack" data-menu-back="1">Zpět</button>',
        '</div>'
      ].join('');
      return;
    }
    if (v === 'admin-app-contact' && !(typeof rakAdminCanManageAdmins === 'function' && rakAdminCanManageAdmins())) {
      body.innerHTML = [
        '<div class="appMenuCard appMenuAdminCard">',
        '  <div class="appMenuCardTitle">Kontakt aplikace</div>',
        '  <div class="appMenuText">Jméno, telefon a e-mail v Kontaktu může měnit jen hlavní admin.</div>',
        '  <button type="button" class="appMenuAction appMenuBack" data-menu-back="1">Zpět</button>',
        '</div>'
      ].join('');
      return;
    }
    if (v === 'about') {
      renderAppMenuAboutPage(body, versionText);
      return;
    } else if (v === 'contact') {
      renderAppMenuContactPage(body, versionText);
      return;
    } else if (v === 'bug-report') {
      bindAppMenuHandlers(body);
      renderBugReportMenuBody(body);
    } else if (v === 'settings') {
      renderAppMenuSettingsPage(body, versionText);
      return;
    } else if (v === 'admin') {
      bindAppMenuHandlers(body);
      void (async () => {
        try {
          await loadAdminMachineSettingsFromSupabase();
          renderAdminMenuBody(body, 'home');
        } catch (err) {
          console.warn('Admin preload failed', err);
          renderAdminMenuBody(body, 'home');
        }
      })();
    } else if (v === 'admin-machines') {
      void (async () => {
        try {
          await loadAdminMachineSettingsFromSupabase();
          renderAdminMenuBody(body, 'machines');
        } catch (err) {
          console.warn('Admin machines preload failed', err);
          renderAdminMenuBody(body, 'machines');
        }
      })();
    } else if (v === 'admin-food') {
      void (async () => {
        try {
          await loadAdminMachineSettingsFromSupabase();
          renderAdminMenuBody(body, 'food');
        } catch (err) {
          console.warn('Admin food preload failed', err);
          renderAdminMenuBody(body, 'food');
        }
      })();
    } else if (v === 'admin-vacation') {
      void (async () => {
        try {
          await loadAdminMachineSettingsFromSupabase();
          renderAdminMenuBody(body, 'vacation');
        } catch (err) {
          console.warn('Admin vacation preload failed', err);
          renderAdminMenuBody(body, 'vacation');
        }
      })();
    } else if (v === 'admin-special-days') {
      void (async () => {
        try {
          await loadAdminMachineSettingsFromSupabase();
          renderAdminMenuBody(body, 'special-days');
        } catch (err) {
          console.warn('Admin special days preload failed', err);
          renderAdminMenuBody(body, 'special-days');
        }
      })();
    } else if (v === 'admin-rotation') {
      void (async () => {
        try {
          await loadAdminRotationFromSupabase();
          await loadAdminMachineSettingsFromSupabase();
          renderAdminMenuBody(body, 'rotation');
        } catch (err) {
          console.warn('Admin rotation preload failed', err);
          renderAdminMenuBody(body, 'rotation');
        }
      })();
    } else if (v === 'admin-overtime') {
      void (async () => {
        try {
          await loadAdminMachineSettingsFromSupabase();
          renderAdminMenuBody(body, 'overtime');
        } catch (err) {
          console.warn('Admin overtime preload failed', err);
          renderAdminMenuBody(body, 'overtime');
        }
      })();
    } else if (v === 'admin-generator-settings') {
      void (async () => {
        try {
          await loadAdminMachineSettingsFromSupabase();
          renderAdminMenuBody(body, 'generator-settings');
        } catch (err) {
          console.warn('Admin generator settings preload failed', err);
          renderAdminMenuBody(body, 'generator-settings');
        }
      })();
    } else if (v === 'admin-machine-tasks') {
      void (async () => {
        try {
          await loadAdminMachineSettingsFromSupabase();
          renderAdminMenuBody(body, 'machine-tasks');
        } catch (err) {
          console.warn('Admin machine tasks preload failed', err);
          renderAdminMenuBody(body, 'machine-tasks');
        }
      })();
    } else if (v === 'admin-correction-settings') {
      void (async () => {
        try {
          await loadAdminMachineSettingsFromSupabase();
          renderAdminMenuBody(body, 'correction-settings');
        } catch (err) {
          console.warn('Admin correction settings preload failed', err);
          renderAdminMenuBody(body, 'correction-settings');
        }
      })();
    } else if (v === 'admin-workers') {
      void (async () => {
        try {
          await loadAdminMachineSettingsFromSupabase();
          renderAdminMenuBody(body, 'workers');
        } catch (err) {
          console.warn('Admin workers preload failed', err);
          renderAdminMenuBody(body, 'workers');
        }
      })();
    } else if (v === 'admin-change-log') {
      void (async () => {
        try {
          await loadAdminMachineSettingsFromSupabase();
          renderAdminMenuBody(body, 'change-log');
        } catch (err) {
          console.warn('Admin change log preload failed', err);
          renderAdminMenuBody(body, 'change-log');
        }
      })();
    } else if (v === 'admin-handover') {
      void (async () => {
        try {
          await loadAdminMachineSettingsFromSupabase();
          renderAdminMenuBody(body, 'handover');
        } catch (err) {
          console.warn('Admin handover preload failed', err);
          renderAdminMenuBody(body, 'handover');
        }
      })();
    } else if (v === 'admin-monthly-workflow') {
      void (async () => {
        try {
          await loadAdminMachineSettingsFromSupabase();
          renderAdminMenuBody(body, 'monthly-workflow');
        } catch (err) {
          console.warn('Admin monthly workflow preload failed', err);
          renderAdminMenuBody(body, 'monthly-workflow');
        }
      })();
    } else if (v === 'admin-manual') {
      void (async () => {
        try {
          await loadAdminMachineSettingsFromSupabase();
          renderAdminMenuBody(body, 'manual');
        } catch (err) {
          console.warn('Admin manual preload failed', err);
          renderAdminMenuBody(body, 'manual');
        }
      })();
    } else if (v === 'admin-settings-map') {
      void (async () => {
        try {
          await loadAdminMachineSettingsFromSupabase();
          renderAdminMenuBody(body, 'settings-map');
        } catch (err) {
          console.warn('Admin settings map preload failed', err);
          renderAdminMenuBody(body, 'settings-map');
        }
      })();
    } else if (v === 'admin-accounts') {
      void (async () => {
        try {
          await loadAdminMachineSettingsFromSupabase();
          if (typeof app !== 'undefined' && app && app.adminAuthVersion === 2 && typeof rakAdminLoadAccountsDirectoryForViewer === 'function') {
            await rakAdminLoadAccountsDirectoryForViewer();
          }
          renderAdminMenuBody(body, 'admin-accounts');
        } catch (err) {
          console.warn('Admin accounts preload failed', err);
          renderAdminMenuBody(body, 'admin-accounts');
        }
      })();
    } else if (v === 'admin-calendars') {
      void (async () => {
        try {
          await loadAdminMachineSettingsFromSupabase();
          renderAdminMenuBody(body, 'calendars');
        } catch (err) {
          console.warn('Admin calendars preload failed', err);
          renderAdminMenuBody(body, 'calendars');
        }
      })();
    } else if (v === 'admin-external-links') {
      void (async () => {
        try {
          await loadAdminMachineSettingsFromSupabase();
          renderAdminMenuBody(body, 'external-links');
        } catch (err) {
          console.warn('Admin external links preload failed', err);
          renderAdminMenuBody(body, 'external-links');
        }
      })();
    } else if (v === 'admin-app-contact') {
      void (async () => {
        try {
          await loadAdminMachineSettingsFromSupabase();
          renderAdminMenuBody(body, 'app-contact');
        } catch (err) {
          console.warn('Admin app contact preload failed', err);
          renderAdminMenuBody(body, 'app-contact');
        }
      })();
    } else if (v === 'admin-payroll-settings') {
      void (async () => {
        try {
          await loadAdminMachineSettingsFromSupabase();
          renderAdminMenuBody(body, 'payroll-settings');
        } catch (err) {
          console.warn('Admin payroll settings preload failed', err);
          renderAdminMenuBody(body, 'payroll-settings');
        }
      })();
    } else if (v === 'admin-backups') {
      void (async () => {
        try {
          await loadAdminRotationBackupsFromSupabase();
          renderAdminMenuBody(body, 'backups');
        } catch (err) {
          console.warn('Admin backups preload failed', err);
          if (typeof app !== 'undefined') app.adminRotationBackupsSnapshot = { ok: false, error: err, backups: [] };
          renderAdminMenuBody(body, 'backups');
        }
      })();
    } else if (v === 'admin-settings-backups') {
      void (async () => {
        try {
          await loadAdminFullSettingsBackupsFromSupabase();
          renderAdminMenuBody(body, 'settings-backups');
        } catch (err) {
          console.warn('Admin full settings backups preload failed', err);
          renderAdminMenuBody(body, 'settings-backups');
        }
      })();
    } else if (v === 'admin-announcement') {
      renderAdminMenuBody(body, 'announcement');
    } else if (v === 'admin-export') {
      renderAdminMenuBody(body, 'export');
    } else if (v === 'admin-reports') {
      void (async () => {
        try {
          await loadAdminBugReportsFromSupabase();
          renderAdminMenuBody(body, 'reports');
        } catch (err) {
          console.warn('Admin reports preload failed', err);
          renderAdminMenuBody(body, 'reports');
        }
      })();
    } else if (v === 'admin-service') {
      bindAppMenuHandlers(body);
      void (async () => {
        try {
            renderAdminMenuBody(body, 'service');
        } catch (err) {
          console.warn('Admin service preload failed', err);
          renderAdminMenuBody(body, 'service');
        }
      })();
    } else {
      body.innerHTML = [
        '<div class="appMenuGrid">',
        '  <button type="button" class="appMenuAction" data-menu-action="settings">Nastavení</button>',
        '  <button type="button" class="appMenuAction" data-menu-action="about">O aplikaci</button>',
        '  <button type="button" class="appMenuAction" data-menu-action="contact">Kontakt</button>',
        '  <button type="button" class="appMenuAction" data-menu-action="bug-report">Pošli mi chybu</button>',
        '</div>',
        (appMenuShouldShowAdminEntry() ?
          '<section class="appMenuAdminQuickLinks" aria-label="Správce">' +
            '<div class="appMenuAdminQuickLinksTitle">' + (typeof rakAdminIsDeputy === 'function' && rakAdminIsDeputy() ? 'Zástupce' : 'Správce') + '</div>' +
            '<div class="appMenuGrid">' +
              // RAK_REPORT_ONLY_DEPUTY_17019
              (typeof rakAdminIsDeputy === 'function' && rakAdminIsDeputy() ? '' : '<button type="button" class="appMenuAction isActive" data-menu-action="admin">Administrace</button><button type="button" class="appMenuAction isActive" data-admin-action="vacation-report">Report dovolené</button>') +
              '<button type="button" class="appMenuAction isActive" data-rak-shift-report-entry="1">Report směny</button>' +
            '</div>' +
          '</section>' : '')
      ].join('');
    }

    bindAppMenuHandlers(body);
  }

  return page;
}

function toggleAppMenu() {

  showPage('menu');
  openAppMenu('menu');
  setBottomNavActive('menu');
}
