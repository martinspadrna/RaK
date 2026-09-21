// RaK – uživatelský report chyby oddělený od menu shellu.
try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('app-menu-bug-report.js', 'loaded', { source: 'dynamic-loader' }); } catch (err) {}

const RAK_REPORTS_KEY = APP_KEY + ':userReports';
try { window.RAK_REPORTS_KEY = RAK_REPORTS_KEY; } catch (err) {}

// RAK_NO_RETIRED_GAMES_17021
function getBugReportAccount() {
  try {
    const profile = typeof window.rakUserProfileGet === 'function' ? window.rakUserProfileGet() : null;
    const current = typeof app !== 'undefined' && app ? app : null;
    const id = String(profile && profile.accountNumber || current && current.activeAccountId || '').trim();
    const name = String(profile && profile.fullName || current && current.activeAccountName || '').trim();
    return id && name ? { id, name } : null;
  } catch (err) { return null; }
}

function getBugReportBuildVersion() {
  try {
    const build = String((typeof window !== 'undefined' && window.RAK_PWA_BUILD) || '').trim().replace(/^v/i, '');
    if (build) return build;
  } catch (err) {}
  return String((typeof getRakCurrentAppVersion === 'function' ? getRakCurrentAppVersion() : '') || '—').trim() || '—';
}

function getBugReportAppearanceMeta() {
  let id = '';
  try {
    if (typeof getAppearancePreference === 'function') id = String(getAppearancePreference() || '').trim();
  } catch (err) {}
  if (!id) {
    try { id = String(document.documentElement.dataset.rakTheme || document.documentElement.dataset.rakBackground || '').trim(); } catch (err) {}
  }
  let label = '';
  try {
    const defs = Array.isArray(window.RAK_APPEARANCE_DEFS) ? window.RAK_APPEARANCE_DEFS : [];
    const item = defs.find((entry) => String(entry && entry.id || '') === id);
    label = String(item && item.label || '').trim();
  } catch (err) {}
  return { id: id || '—', label: label || id || '—' };
}

function buildBugReportPayload() {
  const account = getBugReportAccount();
  const typeEl = document.getElementById('bugReportType');
  const textEl = document.getElementById('bugReportText');
  const type = String(typeEl && typeEl.value || 'Chyba').trim() || 'Chyba';
  const text = String(textEl && textEl.value || '').trim();
  const version = getBugReportBuildVersion();
  const appearance = getBugReportAppearanceMeta();
  return {
    id: 'report-' + Date.now(),
    type,
    text,
    accountId: account ? String(account.id || '') : '',
    accountName: account ? String(account.name || account.id || '') : '',
    version,
    page: String(document.querySelector('.page.active')?.id || '—'),
    appearanceId: appearance.id,
    appearanceLabel: appearance.label,
    online: !!(typeof navigator !== 'undefined' && navigator.onLine),
    userAgent: String(navigator.userAgent || ''),
    createdAt: new Date().toISOString(),
    createdAtLocal: new Date().toLocaleString('cs-CZ')
  };
}

function formatBugReportMessage(report) {
  return [
    'RaK report – ' + String(report.type || 'Chyba'),
    '',
    'Od: ' + (report.accountName ? report.accountName + ' (' + report.accountId + ')' : 'nepřihlášený'),
    'Verze: ' + String(report.version || '—'),
    'Kdy: ' + String(report.createdAtLocal || '—'),
    'Stránka: ' + String(report.page || '—'),
    'Vzhled aplikace: ' + String(report.appearanceLabel || report.appearanceId || '—'),
    'Online: ' + (report.online ? 'ano' : 'ne'),
    '',
    'Text:',
    String(report.text || '').trim(),
    '',
    'Zařízení:',
    String(report.userAgent || '—')
  ].join('\n');
}

function saveBugReportLocal(report) {
  try {
    const current = typeof parseLocalStorageJsonCached === 'function'
      ? parseLocalStorageJsonCached(RAK_REPORTS_KEY, [])
      : JSON.parse(localStorage.getItem(RAK_REPORTS_KEY) || '[]');
    const next = (Array.isArray(current) ? current : []).concat([report]).slice(-30);
    const payload = JSON.stringify(next);
    if (typeof setLocalStorageIfChanged === 'function') setLocalStorageIfChanged(RAK_REPORTS_KEY, payload);
    else localStorage.setItem(RAK_REPORTS_KEY, payload);
  } catch (err) {
    console.warn('saveBugReportLocal failed', err);
  }
}

function renderBugReportMenuBody(body) {
  const account = getBugReportAccount();
  const disabled = !account;
  const accountText = account ? escapeHtml(String(account.name || account.id || 'Uživatel')) : 'Nejdřív se přihlas do RaK.';
  body.innerHTML = [
    '<div class="appMenuCard appMenuReportCard">',
    '  <div class="appMenuCardTitle">Pošli mi chybu</div>',
    '  <div class="appMenuText">',
    '    <div>Sem napiš chybu, co se ti nelíbí, nebo nápad na zlepšení. Po odeslání se report uloží online do RaK databáze.</div>',
    '    <div>Když zrovna nejde internet, nechám ho v telefonu ve frontě a appka ho odešle později.</div>',
    '  </div>',
    '  <div class="appMenuContactRow"><span>Profil</span><b>' + accountText + '</b></div>',
    '  <label class="appMenuReportLabel" for="bugReportType">Typ</label>',
    '  <select class="appMenuReportSelect" id="bugReportType" ' + (disabled ? 'disabled' : '') + '>',
    '    <option>Chyba</option>',
    '    <option>Nelíbí se mi</option>',
    '    <option>Nápad</option>',
    '    <option>Výkon / sekání</option>',
    '  </select>',
    '  <label class="appMenuReportLabel" for="bugReportText">Popis</label>',
    '  <textarea class="appMenuReportTextarea" id="bugReportText" maxlength="1200" rows="7" placeholder="Napiš co nejpřesněji, kde se to stalo a co jsi dělal." ' + (disabled ? 'disabled' : '') + '></textarea>',
    '  <div class="appMenuReportHint" id="bugReportStatus">' + (disabled ? 'Bez přihlášení nejde report odeslat.' : 'Přidám k tomu verzi, zařízení, stránku a vzhled aplikace.') + '</div>',
    '  <div class="appMenuActionRow appMenuReportActions">',
    disabled ? '    <button type="button" class="appMenuAction" data-menu-action="settings">Přihlásit / profil</button>' : '    <button type="button" class="appMenuAction isActive" data-menu-action="bug-report-submit">Odeslat</button>',
    '  </div>',
    '  <button type="button" class="appMenuAction appMenuBack" data-menu-back="1">Zpět</button>',
    '</div>'
  ].join('');
}

async function handleBugReportAction(action) {
  const account = getBugReportAccount();
  const status = document.getElementById('bugReportStatus');
  const submitBtn = document.querySelector('[data-menu-action="bug-report-submit"]');
  if (!account) {
    if (status) status.textContent = 'Nejdřív se přihlas do RaK.';
    return;
  }
  const report = buildBugReportPayload();
  if (!report.text || report.text.length < 5) {
    if (status) status.textContent = 'Napiš aspoň krátký popis, ať vím, co hledat.';
    document.getElementById('bugReportText')?.focus?.();
    return;
  }
  saveBugReportLocal(Object.assign({}, report, { localBackup: true }));
  if (status) status.textContent = 'Odesílám report…';
  if (submitBtn) submitBtn.disabled = true;
  try {
    let result = null;
    if (window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.submitBugReport === 'function') {
      result = await window.RotationSupabaseBridge.submitBugReport(report);
    }
    if (result && result.ok && result.queued) {
      if (status) status.textContent = 'Report je uložený ve frontě a odešle se automaticky, až bude online spojení.';
    } else if (result && result.ok) {
      updateLocalBugReportRecord(report.id, { uploadedOnline: true, adminDeleted: true, status: 'sent', adminStatus: 'sent' });
      if (status) status.textContent = 'Díky, report je odeslaný.';
      const textEl = document.getElementById('bugReportText');
      if (textEl) textEl.value = '';
    } else {
      saveBugReportLocal(Object.assign({}, report, { pendingOnline: true }));
      if (status) status.textContent = 'Report jsem uložil v appce. Online odeslání se nepovedlo, zkus to prosím později.';
    }
  } catch (err) {
    console.warn('Bug report submit failed', err);
    saveBugReportLocal(Object.assign({}, report, { pendingOnline: true, error: String(err && err.message ? err.message : err || '') }));
    if (status) status.textContent = 'Report jsem uložil v appce. Online odeslání se nepovedlo, zkus to prosím později.';
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}
