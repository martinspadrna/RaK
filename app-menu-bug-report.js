// RaK – uživatelský report chyby oddělený od menu shellu.
try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('app-menu-bug-report.js', 'loaded', { source: 'dynamic-loader' }); } catch (err) {}

const RAK_REPORTS_KEY = APP_KEY + ':userReports';
const RAK_BUG_SCREENSHOT_MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const RAK_BUG_SCREENSHOT_MAX_BYTES = 650000;
const RAK_BUG_SCREENSHOT_MAX_EDGE = 1400;
let rakBugReportScreenshot = null;
try { window.RAK_REPORTS_KEY = RAK_REPORTS_KEY; } catch (err) {}

function bugReportScreenshotByteLabel(value) {
  const bytes = Math.max(0, Number(value || 0) || 0);
  return bytes < 1024 ? (bytes + ' B') : (bytes < 1024 * 1024 ? ((bytes / 1024).toFixed(0) + ' kB') : ((bytes / (1024 * 1024)).toFixed(1) + ' MB'));
}

function bugReportCanvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Obrázek se nepodařilo převést.')), type, quality);
    } catch (err) { reject(err); }
  });
}

function bugReportBlobBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Obrázek se nepodařilo načíst.'));
    reader.onload = () => {
      const value = String(reader.result || '');
      const comma = value.indexOf(',');
      if (comma < 0) return reject(new Error('Obrázek má nečekaný formát.'));
      resolve(value.slice(comma + 1));
    };
    reader.readAsDataURL(blob);
  });
}

function loadBugReportImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Vybraný obrázek nejde otevřít.')); };
    image.src = url;
  });
}

async function prepareBugReportScreenshot(file) {
  if (!file) return null;
  const mime = String(file.type || '').toLowerCase();
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) throw new Error('Použij JPG, PNG nebo WebP.');
  if (Number(file.size || 0) <= 0 || Number(file.size || 0) > RAK_BUG_SCREENSHOT_MAX_SOURCE_BYTES) {
    throw new Error('Původní obrázek může mít maximálně 12 MB.');
  }
  const image = await loadBugReportImage(file);
  const sourceWidth = Math.max(1, Number(image.naturalWidth || image.width || 0));
  const sourceHeight = Math.max(1, Number(image.naturalHeight || image.height || 0));
  if (!sourceWidth || !sourceHeight) throw new Error('Obrázek nemá platné rozměry.');

  let scale = Math.min(1, RAK_BUG_SCREENSHOT_MAX_EDGE / Math.max(sourceWidth, sourceHeight));
  let lastBlob = null;
  let lastWidth = 0;
  let lastHeight = 0;
  for (let pass = 0; pass < 6; pass += 1) {
    const width = Math.max(1, Math.min(1600, Math.round(sourceWidth * scale)));
    const height = Math.max(1, Math.min(1600, Math.round(sourceHeight * scale)));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Prohlížeč neumí bezpečně zpracovat screenshot.');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    const quality = Math.max(.48, .82 - pass * .07);
    const blob = await bugReportCanvasBlob(canvas, 'image/jpeg', quality);
    lastBlob = blob;
    lastWidth = width;
    lastHeight = height;
    if (blob.size <= RAK_BUG_SCREENSHOT_MAX_BYTES) break;
    scale *= .82;
  }
  if (!lastBlob || lastBlob.size > RAK_BUG_SCREENSHOT_MAX_BYTES) {
    throw new Error('Screenshot je i po zmenšení příliš velký. Zkus menší výřez.');
  }
  const base64 = await bugReportBlobBase64(lastBlob);
  return {
    base64,
    mime: 'image/jpeg',
    width: lastWidth,
    height: lastHeight,
    byteSize: lastBlob.size,
    sourceName: String(file.name || 'screenshot').slice(0, 120)
  };
}

function clearBugReportScreenshot() {
  rakBugReportScreenshot = null;
  const input = document.getElementById('bugReportScreenshot');
  if (input) input.value = '';
  renderBugReportScreenshotState();
}

function renderBugReportScreenshotState() {
  const wrap = document.getElementById('bugReportScreenshotPreviewWrap');
  const image = document.getElementById('bugReportScreenshotPreview');
  const info = document.getElementById('bugReportScreenshotInfo');
  if (!wrap || !image || !info) return;
  if (!rakBugReportScreenshot) {
    wrap.hidden = true;
    image.removeAttribute('src');
    info.textContent = '';
    return;
  }
  wrap.hidden = false;
  image.src = 'data:' + rakBugReportScreenshot.mime + ';base64,' + rakBugReportScreenshot.base64;
  info.textContent = rakBugReportScreenshot.width + '×' + rakBugReportScreenshot.height + ' · ' + bugReportScreenshotByteLabel(rakBugReportScreenshot.byteSize);
}

async function handleBugReportScreenshotFile(file) {
  const status = document.getElementById('bugReportScreenshotStatus');
  if (!file) { clearBugReportScreenshot(); return; }
  if (status) status.textContent = 'Zmenšuji screenshot a odstraňuji metadata…';
  try {
    rakBugReportScreenshot = await prepareBugReportScreenshot(file);
    renderBugReportScreenshotState();
    if (status) status.textContent = 'Screenshot je připravený. Odešle se jen online a uvidí ho pouze správce.';
  } catch (err) {
    rakBugReportScreenshot = null;
    renderBugReportScreenshotState();
    const input = document.getElementById('bugReportScreenshot');
    if (input) input.value = '';
    if (status) status.textContent = String(err && err.message ? err.message : 'Screenshot se nepodařilo připravit.');
  }
}

if (!window.__rakBugReportScreenshotBound) {
  window.__rakBugReportScreenshotBound = true;
  document.addEventListener('change', (event) => {
    const input = event.target && event.target.id === 'bugReportScreenshot' ? event.target : null;
    if (!input) return;
    handleBugReportScreenshotFile(input.files && input.files[0] ? input.files[0] : null).catch(() => {});
  });
  document.addEventListener('click', (event) => {
    const button = event.target && event.target.closest ? event.target.closest('[data-bug-report-screenshot-remove]') : null;
    if (!button) return;
    event.preventDefault();
    clearBugReportScreenshot();
    const status = document.getElementById('bugReportScreenshotStatus');
    if (status) status.textContent = 'Screenshot odebraný.';
  });
}

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
    '  <label class="appMenuReportLabel" for="bugReportScreenshot">Screenshot <span class="smallText">(volitelný)</span></label>',
    '  <input class="appMenuReportFile" id="bugReportScreenshot" type="file" accept="image/jpeg,image/png,image/webp" ' + (disabled ? 'disabled' : '') + '>',
    '  <div class="smallText appMenuReportPrivacy">Před odesláním zkontroluj, že na obrázku není něco, co poslat nechceš. RaK ho zmenší, překóduje bez metadat a uloží neveřejně. Screenshot se neposílá přes offline frontu.</div>',
    '  <div class="appMenuReportScreenshotStatus smallText" id="bugReportScreenshotStatus"></div>',
    '  <div class="appMenuReportScreenshotPreview" id="bugReportScreenshotPreviewWrap" hidden>',
    '    <img id="bugReportScreenshotPreview" alt="Náhled přiloženého screenshotu">',
    '    <div><span class="smallText" id="bugReportScreenshotInfo"></span><button type="button" class="appMenuAction" data-bug-report-screenshot-remove="1">Odebrat screenshot</button></div>',
    '  </div>',
    '  <div class="appMenuReportHint" id="bugReportStatus">' + (disabled ? 'Bez přihlášení nejde report odeslat.' : 'Přidám k tomu verzi, zařízení, stránku a vzhled aplikace.') + '</div>',
    '  <div class="appMenuActionRow appMenuReportActions">',
    disabled ? '    <button type="button" class="appMenuAction" data-menu-action="settings">Přihlásit / profil</button>' : '    <button type="button" class="appMenuAction isActive" data-menu-action="bug-report-submit">Odeslat</button>',
    '  </div>',
    '  <button type="button" class="appMenuAction appMenuBack" data-menu-back="1">Zpět</button>',
    '</div>'
  ].join('');
  renderBugReportScreenshotState();
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
  if (rakBugReportScreenshot && !(typeof navigator !== 'undefined' && navigator.onLine)) {
    if (status) status.textContent = 'Screenshot lze odeslat jen online. Připoj internet, nebo screenshot odeber a report se uloží do fronty bez něj.';
    return;
  }
  saveBugReportLocal(Object.assign({}, report, { localBackup: true, hasScreenshot: !!rakBugReportScreenshot }));
  if (status) status.textContent = rakBugReportScreenshot ? 'Odesílám report se screenshotem…' : 'Odesílám report…';
  if (submitBtn) submitBtn.disabled = true;
  try {
    let result = null;
    if (window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.submitBugReport === 'function') {
      result = await window.RotationSupabaseBridge.submitBugReport(Object.assign({}, report, {
        screenshot: rakBugReportScreenshot ? {
          base64: rakBugReportScreenshot.base64,
          mime: rakBugReportScreenshot.mime,
          width: rakBugReportScreenshot.width,
          height: rakBugReportScreenshot.height,
          byteSize: rakBugReportScreenshot.byteSize
        } : null
      }));
    }
    if (result && result.ok && result.queued) {
      if (status) status.textContent = 'Report je uložený ve frontě a odešle se automaticky, až bude online spojení.';
    } else if (result && result.ok) {
      updateLocalBugReportRecord(report.id, { uploadedOnline: true, adminDeleted: true, status: 'sent', adminStatus: 'sent' });
      if (status) status.textContent = rakBugReportScreenshot ? 'Díky, report i screenshot jsou odeslané.' : 'Díky, report je odeslaný.';
      const textEl = document.getElementById('bugReportText');
      if (textEl) textEl.value = '';
      clearBugReportScreenshot();
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
