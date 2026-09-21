// RaK – vstup do Reportu směny oddělený z app-menu.js.
try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('app-menu-shift-report.js', 'loaded', { source: 'dynamic-loader' }); } catch (err) {}

let appMenuShiftReportOpening = false;

const RAK_SHIFT_REPORT_DRAFT_PREFIX = 'rak:shiftReportDraft:v1';

function appMenuShiftReportDraftKey() {
  let account = '';
  try {
    const profile = typeof window.rakUserProfileGet === 'function' ? window.rakUserProfileGet() : null;
    account = String(profile && profile.accountNumber || '').trim();
    if (!account && window.app && window.app.gamesProfile) account = String(window.app.gamesProfile.activeAccountId || '').trim();
  } catch (err) {}
  return RAK_SHIFT_REPORT_DRAFT_PREFIX + ':' + (account || 'local');
}

function appMenuReadShiftReportMoFreeValues() {
  try {
    const saved = JSON.parse(localStorage.getItem(appMenuShiftReportDraftKey()) || 'null');
    const rows = saved && saved.draft && saved.draft.production && Array.isArray(saved.draft.production.mo)
      ? saved.draft.production.mo
      : [];
    return rows.map((row) => String(row && row.free || ''));
  } catch (err) {
    return [];
  }
}

function appMenuEnsureShiftReportMoFreeInputs() {
  const root = document.getElementById('rakShiftReport');
  if (!root) return false;

  const savedValues = appMenuReadShiftReportMoFreeValues();
  const rows = Array.from(root.querySelectorAll('[data-section="mo"]'));
  rows.forEach((row, index) => {
    let input = row.querySelector('.rakShiftFree');
    if (!input) {
      input = document.createElement('input');
      input.className = 'rakShiftInput rakShiftFree';
      input.type = 'number';
      input.min = '0';
      input.step = '1';
      input.inputMode = 'numeric';
      input.placeholder = 'volné';
      input.setAttribute('aria-label', 'Volné kusy MO');

      const remove = row.querySelector('.rakShiftRemove');
      if (remove) row.insertBefore(input, remove);
      else row.appendChild(input);

      row.classList.remove('rakShiftProdRow--basic', 'rakShiftProdRow--nokFree');
      row.classList.add('rakShiftProdRow--nok');
    }

    if (input.dataset.rakMoFreeRestored !== '1') {
      if (!input.value && savedValues[index]) input.value = savedValues[index];
      input.dataset.rakMoFreeRestored = '1';
    }
  });

  if (rows.length) window.__rakShiftReportMoFreeMode = 'per-index-like-brusy';
  return rows.length > 0;
}

function appMenuScheduleShiftReportMoFreeInputs() {
  try { appMenuEnsureShiftReportMoFreeInputs(); } catch (err) {}
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => { try { appMenuEnsureShiftReportMoFreeInputs(); } catch (err) {} });
  } else {
    setTimeout(() => { try { appMenuEnsureShiftReportMoFreeInputs(); } catch (err) {} }, 0);
  }
}

async function appMenuOpenShiftReport() {
  if (appMenuShiftReportOpening) return false;
  appMenuShiftReportOpening = true;
  try {
    let ready = false;
    try { ready = typeof window.rakAdminCanOpenShiftReport === 'function' && window.rakAdminCanOpenShiftReport(); } catch (err) {}
    if (!ready && typeof window.appMenuEnsureAdminAccessFromMenu === 'function') {
      try { await window.appMenuEnsureAdminAccessFromMenu(); } catch (err) {}
      try { ready = typeof window.rakAdminCanOpenShiftReport === 'function' && window.rakAdminCanOpenShiftReport(); } catch (err) {}
    }
    if (!ready && typeof window.rakAdminLoadSettingsThenCheckOnce === 'function') {
      try { await window.rakAdminLoadSettingsThenCheckOnce('shift-report'); } catch (err) {}
      try { ready = typeof window.rakAdminCanOpenShiftReport === 'function' && window.rakAdminCanOpenShiftReport(); } catch (err) {}
    }
    if (!ready) return false;
    const body = document.getElementById('appMenuBody');
    if (body) body.dataset.rakShiftReportOpen = '1';
    if (window.RakShiftReport && typeof window.RakShiftReport.open === 'function') {
      window.RakShiftReport.open();
      appMenuScheduleShiftReportMoFreeInputs();
      return true;
    }
    return false;
  } finally {
    appMenuShiftReportOpening = false;
  }
}

function appMenuHandleShiftReportEntry(event) {
  const target = event.target && event.target.closest ? event.target.closest('[data-rak-shift-report-entry="1"]') : null;
  if (!target) return;
  event.preventDefault();
  event.stopPropagation();
  void appMenuOpenShiftReport();
}

function appMenuHandleShiftReportMoIndexAdd(event) {
  const target = event.target && event.target.closest ? event.target.closest('.rakShiftAddIndex[data-shift-add="mo"]') : null;
  if (!target) return;
  setTimeout(appMenuScheduleShiftReportMoFreeInputs, 0);
}

if (!window.__rakAppMenuShiftReportBound) {
  window.__rakAppMenuShiftReportBound = true;
  document.addEventListener('click', appMenuHandleShiftReportEntry, true);
  document.addEventListener('click', appMenuHandleShiftReportMoIndexAdd, false);
}
window.appMenuOpenShiftReport = appMenuOpenShiftReport;
window.appMenuEnsureShiftReportMoFreeInputs = appMenuEnsureShiftReportMoFreeInputs;
