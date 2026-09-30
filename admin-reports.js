// RaK 1.2 (1.155) – Administrace Reporty chyb oddělená z hlavního UI modulu.
(function(){
'use strict';

function getAdminReportsStorageKey() {
  try { return String(window.RAK_REPORTS_KEY || ((typeof APP_KEY !== 'undefined' ? APP_KEY : 'rak') + ':userReports')); }
  catch (err) { return 'rak:userReports'; }
}

function formatAdminReportDate(value) {
  try {
    const d = value ? new Date(value) : null;
    if (!d || Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('cs-CZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch (err) { return '—'; }
}

function normalizeAdminReportTypeLabel(value) {
  const raw = String(value || '').toLowerCase();
  if (raw === 'nelibi') return 'Nelíbí se mi';
  if (raw === 'napad') return 'Nápad';
  if (raw === 'vykon') return 'Výkon / sekání';
  if (raw === 'hra') return 'Hra';
  if (raw === 'ostatni') return 'Ostatní';
  return 'Chyba';
}

function normalizeAdminReportStatusLabel(value) {
  const raw = String(value || '').toLowerCase();
  if (raw === 'seen') return 'Viděno';
  if (raw === 'done') return 'Hotovo';
  if (raw === 'ignored') return 'Ignorovat';
  return 'Nové';
}

function formatAdminReportVersion(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return /^v/i.test(raw) ? raw : ('v' + raw);
}

function resolveAdminReportAppearance(deviceInfo) {
  const device = deviceInfo && typeof deviceInfo === 'object' ? deviceInfo : {};
  const explicitId = String(device.appearanceId || device.appearance || '').trim();
  const legacyTheme = String(device.theme || '').trim();
  const legacyBackground = String(device.background || '').trim();
  let id = explicitId;
  let legacyAmbiguous = false;
  if (!id && legacyTheme && legacyBackground && legacyTheme !== legacyBackground) legacyAmbiguous = true;
  if (!id && !legacyAmbiguous) id = legacyTheme || legacyBackground;
  let label = String(device.appearanceLabel || '').trim();
  if (!label && id) {
    try {
      const defs = Array.isArray(window.RAK_APPEARANCE_DEFS) ? window.RAK_APPEARANCE_DEFS : [];
      const item = defs.find((entry) => String(entry && entry.id || '') === id);
      label = String(item && item.label || '').trim();
    } catch (err) {}
  }
  if (legacyAmbiguous) return { id: '', label: 'starší oddělené nastavení' };
  return { id, label: label || id };
}

function getAdminReportsCache() {
  return Array.isArray(app.adminBugReports) ? app.adminBugReports : [];
}

function isAdminReportUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
}

function normalizeAdminReportStatusKey(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'seen' || raw === 'done' || raw === 'ignored') return raw;
  return 'new';
}

function buildAdminReportsStatusSummary(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const summary = {
    total: list.length,
    newCount: 0,
    seenCount: 0,
    doneCount: 0,
    ignoredCount: 0,
    localCount: 0,
    onlineCount: 0,
    latestAt: ''
  };
  list.forEach((row) => {
    const status = normalizeAdminReportStatusKey(row && row.status);
    if (status === 'seen') summary.seenCount += 1;
    else if (status === 'done') summary.doneCount += 1;
    else if (status === 'ignored') summary.ignoredCount += 1;
    else summary.newCount += 1;

    const id = String(row && row.id || '').trim();
    if (row && (row.local_only || !isAdminReportUuid(id))) summary.localCount += 1;
    else summary.onlineCount += 1;

    const created = new Date(row && row.created_at || 0).getTime();
    const latest = summary.latestAt ? new Date(summary.latestAt).getTime() : 0;
    if (Number.isFinite(created) && created > latest) summary.latestAt = row.created_at;
  });
  return summary;
}

function adminReportsStatusItemHtml(label, value, detail, state) {
  const safeState = state || 'ok';
  return [
    '<div class="adminReportsStatusItem is' + escapeHtml(safeState.charAt(0).toUpperCase() + safeState.slice(1)) + '">',
    '  <span>' + escapeHtml(label || '') + '</span>',
    '  <b>' + escapeHtml(value || '') + '</b>',
    detail ? '  <small>' + escapeHtml(detail) + '</small>' : '',
    '</div>'
  ].join('');
}

function buildAdminReportsStatusHtml(rows) {
  const summary = buildAdminReportsStatusSummary(rows);
  const openCount = summary.newCount + summary.seenCount;
  const handledCount = summary.doneCount + summary.ignoredCount;
  const items = [
    {
      label: 'Celkem',
      value: String(summary.total),
      detail: summary.total ? ('Poslední: ' + formatAdminReportDate(summary.latestAt)) : 'Zatím není načtený žádný report.',
      state: summary.total ? 'info' : 'ok'
    },
    {
      label: 'K řešení',
      value: String(openCount),
      detail: String(summary.newCount) + ' nové · ' + String(summary.seenCount) + ' viděné.',
      state: openCount ? 'warn' : 'ok'
    },
    {
      label: 'Uzavřené',
      value: String(handledCount),
      detail: String(summary.doneCount) + ' hotovo · ' + String(summary.ignoredCount) + ' ignorováno.',
      state: handledCount ? 'ok' : 'info'
    },
    {
      label: 'Zdroj',
      value: String(summary.onlineCount) + ' online',
      detail: String(summary.localCount) + ' lokálně uložené zálohy.',
      state: summary.localCount ? 'info' : 'ok'
    }
  ];
  return [
    '<div class="adminReportsStatus" id="adminReportsStatus">',
    '  <div class="appMenuSubTitle">Stav reportů</div>',
    '  <div class="smallText uMb10">Souhrn vychází z načtených reportů níže. Akce Viděno, Hotovo a Ignorovat mění jen vybraný report.</div>',
    '  <div class="adminReportsStatusGrid">',
    items.map((item) => adminReportsStatusItemHtml(item.label, item.value, item.detail, item.state)).join(''),
    '  </div>',
    '</div>'
  ].join('');
}

function buildAdminReportsHtml() {
  const rows = getAdminReportsCache();
  const list = rows.length ? rows.map((row) => {
    const id = escapeHtml(String(row.id || ''));
    const status = String(row.status || 'new');
    const device = row.device_info && typeof row.device_info === 'object' ? row.device_info : {};
    const appearance = resolveAdminReportAppearance(device);
    const meta = [
      row.app_version ? formatAdminReportVersion(row.app_version) : '',
      row.route ? String(row.route) : '',
      appearance.label ? ('Vzhled ' + String(appearance.label)) : ''
    ].filter(Boolean).join(' · ');
    return [
      '<details class="adminReportItem" data-report-id="' + id + '">',
      '  <summary class="adminReportSummary">',
      '    <span><b>' + escapeHtml(normalizeAdminReportTypeLabel(row.report_type)) + '</b><small>' + escapeHtml(formatAdminReportDate(row.created_at)) + ' · ' + escapeHtml(row.player_name || row.account_number || 'bez jména') + '</small></span>',
      '    <em class="adminReportStatus adminReportStatus-' + escapeHtml(status) + '">' + escapeHtml(normalizeAdminReportStatusLabel(status)) + '</em>',
      '  </summary>',
      '  <div class="adminReportBody">',
      '    <div class="adminReportMessage">' + escapeHtml(row.message || '') + '</div>',
      meta ? '    <div class="smallText">' + escapeHtml(meta) + '</div>' : '',
      row.user_agent ? '    <div class="smallText adminReportDevice">' + escapeHtml(row.user_agent) + '</div>' : '',
      row.has_screenshot && isAdminReportUuid(row.id) ? '    <button type="button" class="appMenuAction adminReportScreenshotBtn" data-admin-action="report-screenshot" data-report-id="' + id + '">Zobrazit screenshot</button>' : '',
      '    <div class="appMenuActionRow adminReportActions">',
      '      <button type="button" class="appMenuAction" data-admin-action="report-seen" data-report-id="' + id + '">Viděno</button>',
      '      <button type="button" class="appMenuAction isActive" data-admin-action="report-done" data-report-id="' + id + '">Hotovo</button>',
      '      <button type="button" class="appMenuAction" data-admin-action="report-ignore" data-report-id="' + id + '">Ignorovat</button>',
      '      <button type="button" class="appMenuAction adminReportDeleteBtn" data-admin-action="report-delete" data-report-id="' + id + '">Smazat</button>',
      '    </div>',
      '  </div>',
      '</details>'
    ].join('');
  }).join('') : '<div class="appMenuText">Zatím tu nejsou žádné reporty.</div>';
  return [
    '<div class="adminReportsFolder">',
    buildAdminReportsStatusHtml(rows),
    '  <div class="adminReportsToolbar">',
    '    <button type="button" class="appMenuAction isActive" data-admin-action="load-reports">Načíst reporty</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="download-reports">Stáhnout reporty</button>',
    '    <span class="smallText">' + String(rows.length || 0) + ' záznamů</span>',
    '  </div>',
    '  <div class="adminReportsList">' + list + '</div>',
    '</div>'
  ].join('');
}


function getAdminReportDeletedNoteMarker() {
  return '__rak_deleted__';
}

function getAdminDeletedReportsKey() {
  try { return String(APP_KEY || 'rak') + ':deletedBugReports'; }
  catch (err) { return 'rak:deletedBugReports'; }
}

function readAdminDeletedReportKeys() {
  try {
    const raw = localStorage.getItem(getAdminDeletedReportsKey()) || '[]';
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : [];
    return new Set(list.map((value) => String(value || '').trim()).filter(Boolean));
  } catch (err) {
    return new Set();
  }
}

function writeAdminDeletedReportKeys(keys) {
  try {
    const list = Array.from(keys || []).map((value) => String(value || '').trim()).filter(Boolean).slice(-240);
    const payload = JSON.stringify(list);
    if (typeof setLocalStorageIfChanged === 'function') setLocalStorageIfChanged(getAdminDeletedReportsKey(), payload);
    else localStorage.setItem(getAdminDeletedReportsKey(), payload);
    return true;
  } catch (err) {
    console.warn('writeAdminDeletedReportKeys failed', err);
    return false;
  }
}

function getAdminReportIdentityKeys(rowOrId, fallbackIndex) {
  const keys = [];
  try {
    if (rowOrId && typeof rowOrId === 'object') {
      const row = rowOrId;
      const device = row.device_info && typeof row.device_info === 'object' ? row.device_info : {};
      [
        row.id,
        row.sourceId,
        row.source_id,
        device.sourceId,
        device.source_id,
        device.source,
        row.created_at,
        row.createdAt,
        row.handled_at,
        row.handledAt
      ].forEach((value) => {
        const raw = String(value || '').trim();
        if (raw) keys.push(raw);
      });
      const msg = String(row.message || row.text || '').trim().slice(0, 220);
      const player = String((row.account_number || row.accountId || row.player_name || row.accountName) || '').trim().slice(0, 80);
      const created = String(row.created_at || row.createdAt || '').trim().slice(0, 19);
      if (msg && created) keys.push('fingerprint:' + created + ':' + player + ':' + msg);
      if (Number.isFinite(Number(fallbackIndex))) keys.push('local-report-' + Number(fallbackIndex));
    } else {
      const raw = String(rowOrId || '').trim();
      if (raw) keys.push(raw);
    }
  } catch (err) {}
  return Array.from(new Set(keys.filter(Boolean)));
}

function isAdminReportMarkedDeleted(rowOrId, fallbackIndex) {
  try {
    if (rowOrId && typeof rowOrId === 'object') {
      const row = rowOrId;
      const note = String(row.handled_note || row.handledNote || '').trim();
      const status = String(row.status || row.adminStatus || '').trim().toLowerCase();
      if (row.adminDeleted || note === getAdminReportDeletedNoteMarker() || status === 'deleted') return true;
    }
    const deleted = readAdminDeletedReportKeys();
    return getAdminReportIdentityKeys(rowOrId, fallbackIndex).some((key) => deleted.has(key));
  } catch (err) {
    return false;
  }
}

function rememberAdminDeletedReport(rowOrId) {
  try {
    const deleted = readAdminDeletedReportKeys();
    getAdminReportIdentityKeys(rowOrId).forEach((key) => deleted.add(key));
    return writeAdminDeletedReportKeys(deleted);
  } catch (err) {
    console.warn('rememberAdminDeletedReport failed', err);
    return false;
  }
}

function normalizeLocalBugReportsForAdmin() {
  try {
    const raw = typeof parseLocalStorageJsonCached === 'function'
      ? parseLocalStorageJsonCached(getAdminReportsStorageKey(), [])
      : JSON.parse(localStorage.getItem(getAdminReportsStorageKey()) || '[]');
    return (Array.isArray(raw) ? raw : []).map((report, idx) => {
      const legacyAppearanceId = String(report.theme || report.background || '').trim();
      const device = {
        appearanceId: report.appearanceId || report.appearance || legacyAppearanceId || '',
        appearanceLabel: report.appearanceLabel || '',
        source: 'local-backup',
        sourceId: report.id || ('local-' + idx),
        game: report.game || '',
        online: !!report.online
      };
      return {
        id: report.id || ('local-report-' + idx),
        account_number: report.accountId || '',
        player_name: report.accountName || '',
        report_type: report.type || 'Chyba',
        message: report.text || '',
        app_version: report.version || '',
        route: report.page || '',
        user_agent: report.userAgent || '',
        device_info: device,
        status: report.adminStatus || report.status || 'new',
        created_at: report.createdAt || new Date().toISOString(),
        local_only: true,
        handled_at: report.handledAt || '',
        handled_note: report.handledNote || '',
        has_screenshot: !!report.hasScreenshot && !!report.uploadedOnline,
        adminDeleted: !!report.adminDeleted
      };
    }).filter((row, idx) => String(row.message || '').trim() && !isAdminReportMarkedDeleted(row, idx));
  } catch (err) {
    console.warn('normalizeLocalBugReportsForAdmin failed', err);
    return [];
  }
}

function getAdminReportSourceKey(row) {
  try {
    const device = row && row.device_info && typeof row.device_info === 'object' ? row.device_info : {};
    const sourceId = String(device.sourceId || device.source_id || row.sourceId || '').trim();
    if (sourceId) return 'source:' + sourceId;
    const msg = String(row && row.message || '').trim().slice(0, 220);
    const player = String(row && (row.account_number || row.player_name) || '').trim().slice(0, 80);
    const created = String(row && row.created_at || '').trim().slice(0, 19);
    if (msg && created) return 'fingerprint:' + created + ':' + player + ':' + msg;
    return 'id:' + String(row && row.id || Math.random()).trim();
  } catch (err) {
    return 'id:' + String(row && row.id || Math.random()).trim();
  }
}

function getAdminReportLocalSourceId(row) {
  try {
    const device = row && row.device_info && typeof row.device_info === 'object' ? row.device_info : {};
    return String(device.sourceId || device.source_id || row.sourceId || '').trim();
  } catch (err) {
    return '';
  }
}

function markLocalBugReportDeletedByAdmin(rowOrId) {
  try {
    const row = rowOrId && typeof rowOrId === 'object' ? rowOrId : null;
    const ids = [];
    if (row) {
      ids.push(String(row.id || '').trim());
      ids.push(getAdminReportLocalSourceId(row));
      ids.push(String(row.created_at || '').trim());
    } else {
      ids.push(String(rowOrId || '').trim());
    }
    rememberAdminDeletedReport(row || rowOrId);
    ids.filter(Boolean).forEach((id) => updateLocalBugReportRecord(id, { adminDeleted: true, status: 'deleted', adminStatus: 'deleted', handledNote: getAdminReportDeletedNoteMarker() }));
  } catch (err) {
    console.warn('markLocalBugReportDeletedByAdmin failed', err);
  }
}

function markLocalBugReportStatusByAdmin(rowOrId, status, handledAt, note) {
  try {
    const row = rowOrId && typeof rowOrId === 'object' ? rowOrId : null;
    const ids = [];
    if (row) {
      ids.push(String(row.id || '').trim());
      ids.push(getAdminReportLocalSourceId(row));
      ids.push(String(row.created_at || '').trim());
    } else {
      ids.push(String(rowOrId || '').trim());
    }
    ids.filter(Boolean).forEach((id) => updateLocalBugReportRecord(id, { adminStatus: status, status, handledAt, handledNote: note }));
  } catch (err) {
    console.warn('markLocalBugReportStatusByAdmin failed', err);
  }
}

function mergeAdminBugReports(remoteRows, localRows) {
  const map = new Map();
  const add = (row, source) => {
    if (!row) return;
    const key = getAdminReportSourceKey(row);
    if (!key) return;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, row);
      return;
    }
    // Online záznam má přednost před lokální zálohou stejného reportu, aby se po načtení nevracely duplicity.
    const existingIsLocal = !!existing.local_only;
    const incomingIsRemote = !row.local_only || source === 'remote';
    if (existingIsLocal && incomingIsRemote) map.set(key, row);
  };
  (Array.isArray(localRows) ? localRows : []).forEach((row) => add(row, 'local'));
  (Array.isArray(remoteRows) ? remoteRows : []).forEach((row) => add(row, 'remote'));
  return Array.from(map.values()).sort((a, b) => Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0));
}

function downloadAdminBugReports() {
  try {
    const rows = getAdminReportsCache();
    const statusEl = document.getElementById('adminOnlineSaveStatus');
    if (!rows.length) {
      if (statusEl) statusEl.textContent = 'Žádné reporty k exportu.';
      try { showToast('Žádné reporty k exportu.'); } catch (err) {}
      return { ok: true, empty: true };
    }
    const payload = JSON.stringify({ exportedAt: new Date().toISOString(), appVersion: (typeof APP_VERSION !== 'undefined' ? APP_VERSION : ''), rows }, null, 2);
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'RaK_reporty_chyb_' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
    if (statusEl) statusEl.textContent = 'Reporty stažené.';
    return { ok: true, rows: rows.length };
  } catch (err) {
    const statusEl = document.getElementById('adminOnlineSaveStatus');
    if (statusEl) statusEl.textContent = 'Stažení reportů se nepovedlo.';
    console.warn('downloadAdminBugReports failed', err);
    return { ok: false, error: err };
  }
}

async function loadAdminBugReportsFromSupabase() {
  const localRows = normalizeLocalBugReportsForAdmin();
  if (window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.loadBugReports === 'function') {
    try {
      const result = await window.RotationSupabaseBridge.loadBugReports({ limit: 50, status: 'all' });
      const remoteRows = result && Array.isArray(result.rows)
        ? result.rows.filter((row) => !isAdminReportMarkedDeleted(row))
        : [];
      app.adminBugReports = mergeAdminBugReports(remoteRows, localRows).filter((row) => !isAdminReportMarkedDeleted(row));
      return Object.assign({}, result || {}, { ok: true, rows: app.adminBugReports });
    } catch (err) {
      console.warn('loadAdminBugReportsFromSupabase failed, using local backup', err);
      app.adminBugReports = localRows;
      return { ok: false, rows: localRows, reason: 'remote-failed', error: err };
    }
  }
  app.adminBugReports = localRows;
  return { ok: false, rows: localRows, reason: 'missing-bridge' };
}

function updateLocalBugReportRecord(reportId, patch) {
  try {
    const raw = typeof parseLocalStorageJsonCached === 'function'
      ? parseLocalStorageJsonCached(getAdminReportsStorageKey(), [])
      : JSON.parse(localStorage.getItem(getAdminReportsStorageKey()) || '[]');
    const rows = Array.isArray(raw) ? raw : [];
    let changed = false;
    rows.forEach((report, idx) => {
      if (!report || typeof report !== 'object') return;
      const ids = [report.id, 'local-report-' + idx, report.createdAt, report.created_at].map(v => String(v || '').trim()).filter(Boolean);
      if (!ids.includes(String(reportId || '').trim())) return;
      Object.assign(report, patch || {});
      changed = true;
    });
    if (changed) {
      const payload = JSON.stringify(rows);
      if (typeof setLocalStorageIfChanged === 'function') setLocalStorageIfChanged(getAdminReportsStorageKey(), payload);
      else localStorage.setItem(getAdminReportsStorageKey(), payload);
    }
    return changed;
  } catch (err) {
    console.warn('updateLocalBugReportRecord failed', err);
    return false;
  }
}

async function openAdminBugReportScreenshot(reportId) {
  const id = String(reportId || '').trim();
  if (!isAdminReportUuid(id)) return { ok: false, reason: 'invalid-report-id' };
  const bridge = window.RotationSupabaseBridge;
  if (!bridge || typeof bridge.loadBugReportScreenshot !== 'function') return { ok: false, reason: 'missing-bridge' };
  const result = await bridge.loadBugReportScreenshot(id);
  if (!result || result.ok === false) return result || { ok: false, reason: 'load-failed' };
  if (!result.found) return { ok: false, reason: 'not-found' };
  const mime = String(result.mime_type || '').toLowerCase();
  const base64 = String(result.base64 || '').trim();
  if (!['image/jpeg','image/png','image/webp'].includes(mime) || !base64 || base64.length > 1000000) {
    return { ok: false, reason: 'invalid-image-response' };
  }

  document.getElementById('adminReportScreenshotViewer')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'adminReportScreenshotViewer';
  overlay.className = 'adminReportScreenshotViewer';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Screenshot reportu');
  const card = document.createElement('div');
  card.className = 'adminReportScreenshotCard';
  const top = document.createElement('div');
  top.className = 'adminReportScreenshotTop';
  const title = document.createElement('strong');
  title.textContent = 'Screenshot reportu';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'appMenuAction adminReportScreenshotClose';
  close.textContent = 'Zavřít';
  const image = document.createElement('img');
  image.className = 'adminReportScreenshotImage';
  image.alt = 'Screenshot přiložený k reportu';
  image.src = 'data:' + mime + ';base64,' + base64;
  const meta = document.createElement('div');
  meta.className = 'smallText';
  meta.textContent = String(result.width || '—') + '×' + String(result.height || '—') + ' · ' + Math.max(0, Number(result.byte_size || 0) || 0).toLocaleString('cs-CZ') + ' B';
  top.append(title, close);
  card.append(top, image, meta);
  overlay.append(card);
  const dismiss = () => overlay.remove();
  close.addEventListener('click', dismiss);
  overlay.addEventListener('click', (event) => { if (event.target === overlay) dismiss(); });
  document.body.appendChild(overlay);
  close.focus();
  return { ok: true, shown: true };
}

async function updateAdminBugReportStatus(reportId, status) {
  if (!reportId) return { ok: false, reason: 'missing-id' };
  const rows = getAdminReportsCache();
  const hit = rows.find(r => String(r.id || '') === String(reportId));
  const note = 'Změněno z administrace RaK';
  const handledAt = new Date().toISOString();
  if (hit && (hit.local_only || !isAdminReportUuid(reportId))) {
    hit.status = status;
    hit.handled_at = handledAt;
    hit.handled_note = note;
    updateLocalBugReportRecord(reportId, { adminStatus: status, status, handledAt, handledNote: note });
    return { ok: true, localOnly: true };
  }
  if (window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.updateBugReportStatus === 'function') {
    const result = await window.RotationSupabaseBridge.updateBugReportStatus(reportId, status, note);
    if (result && result.ok) {
      if (hit) {
        hit.status = status;
        hit.handled_at = handledAt;
        hit.handled_note = note;
        markLocalBugReportStatusByAdmin(hit, status, handledAt, note);
      }
    }
    return result;
  }
  return { ok: false, reason: 'missing-bridge' };
}

async function deleteAdminBugReport(reportId) {
  if (!reportId) return { ok: false, reason: 'missing-id' };
  const rows = getAdminReportsCache();
  const index = rows.findIndex(r => String(r.id || '') === String(reportId));
  const hit = index >= 0 ? rows[index] : null;
  if (hit && (hit.local_only || !isAdminReportUuid(reportId))) {
    rememberAdminDeletedReport(hit || reportId);
    updateLocalBugReportRecord(reportId, { adminDeleted: true, status: 'deleted', adminStatus: 'deleted', handledNote: getAdminReportDeletedNoteMarker() });
    rows.splice(index, 1);
    return { ok: true, localOnly: true, deleted: true };
  }
  if (window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.deleteBugReport === 'function') {
    const result = await window.RotationSupabaseBridge.deleteBugReport(reportId);
    if (result && result.ok && index >= 0) {
      if (hit) {
        hit.status = 'ignored';
        hit.handled_note = getAdminReportDeletedNoteMarker();
      }
      rememberAdminDeletedReport(hit || reportId);
      markLocalBugReportDeletedByAdmin(hit || reportId);
      rows.splice(index, 1);
    }
    return result;
  }
  return { ok: false, reason: 'missing-bridge' };
}



window.formatAdminReportDate = formatAdminReportDate;
window.normalizeAdminReportTypeLabel = normalizeAdminReportTypeLabel;
window.normalizeAdminReportStatusLabel = normalizeAdminReportStatusLabel;
window.getAdminReportsCache = getAdminReportsCache;
window.isAdminReportUuid = isAdminReportUuid;
window.normalizeAdminReportStatusKey = normalizeAdminReportStatusKey;
window.buildAdminReportsStatusSummary = buildAdminReportsStatusSummary;
window.buildAdminReportsStatusHtml = buildAdminReportsStatusHtml;
window.buildAdminReportsHtml = buildAdminReportsHtml;
window.getAdminReportDeletedNoteMarker = getAdminReportDeletedNoteMarker;
window.getAdminDeletedReportsKey = getAdminDeletedReportsKey;
window.readAdminDeletedReportKeys = readAdminDeletedReportKeys;
window.writeAdminDeletedReportKeys = writeAdminDeletedReportKeys;
window.getAdminReportIdentityKeys = getAdminReportIdentityKeys;
window.isAdminReportMarkedDeleted = isAdminReportMarkedDeleted;
window.rememberAdminDeletedReport = rememberAdminDeletedReport;
window.normalizeLocalBugReportsForAdmin = normalizeLocalBugReportsForAdmin;
window.getAdminReportSourceKey = getAdminReportSourceKey;
window.getAdminReportLocalSourceId = getAdminReportLocalSourceId;
window.markLocalBugReportDeletedByAdmin = markLocalBugReportDeletedByAdmin;
window.markLocalBugReportStatusByAdmin = markLocalBugReportStatusByAdmin;
window.mergeAdminBugReports = mergeAdminBugReports;
window.downloadAdminBugReports = downloadAdminBugReports;
window.loadAdminBugReportsFromSupabase = loadAdminBugReportsFromSupabase;
window.openAdminBugReportScreenshot = openAdminBugReportScreenshot;
window.updateLocalBugReportRecord = updateLocalBugReportRecord;
window.updateAdminBugReportStatus = updateAdminBugReportStatus;
window.deleteAdminBugReport = deleteAdminBugReport;

})();
