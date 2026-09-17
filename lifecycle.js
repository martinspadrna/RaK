// RaK 1.2 (1.155) – lifecycle stabilizace aplikace.
(function setupLifecycleHelpers() {
  if (window.__rotaceLifecycleHelpersInstalled) return;
  window.__rotaceLifecycleHelpersInstalled = true;

  const store = window.__rotaceLifecycleStore || {
    listeners: [],
    intervals: [],
    timeouts: [],
    subscriptions: []
  };
  window.__rotaceLifecycleStore = store;

  const safeCall = (fn) => {
    try { fn(); } catch (err) {}
  };

  const register = (bucket, disposer) => {
    if (typeof disposer !== 'function') return disposer;
    bucket.push(disposer);
    return disposer;
  };

  window.registerListener = function registerListener(target, type, handler, options) {
    if (!target || typeof target.addEventListener !== 'function' || typeof handler !== 'function') return null;
    target.addEventListener(type, handler, options);
    return register(store.listeners, () => {
      safeCall(() => target.removeEventListener(type, handler, options));
    });
  };

  window.registerInterval = function registerInterval(fn, delay) {
    if (typeof fn !== 'function') return null;
    const id = window.setInterval(fn, delay);
    return register(store.intervals, () => {
      safeCall(() => window.clearInterval(id));
    });
  };

  window.registerTimeout = function registerTimeout(fn, delay) {
    if (typeof fn !== 'function') return null;
    const id = window.setTimeout(fn, delay);
    return register(store.timeouts, () => {
      safeCall(() => window.clearTimeout(id));
    });
  };

  window.registerSubscription = function registerSubscription(disposer) {
    if (typeof disposer !== 'function') return null;
    return register(store.subscriptions, () => safeCall(disposer));
  };

  window.cleanupListeners = function cleanupListeners() {
    while (store.listeners.length) safeCall(store.listeners.pop());
  };

  window.cleanupIntervals = function cleanupIntervals() {
    while (store.intervals.length) safeCall(store.intervals.pop());
  };

  window.cleanupTimeouts = function cleanupTimeouts() {
    while (store.timeouts.length) safeCall(store.timeouts.pop());
  };

  window.cleanupSubscriptions = function cleanupSubscriptions() {
    while (store.subscriptions.length) safeCall(store.subscriptions.pop());
  };

  window.cleanupAllLifecycle = function cleanupAllLifecycle() {
    cleanupSubscriptions();
    cleanupTimeouts();
    cleanupIntervals();
    cleanupListeners();
  };

  window.bindGlobalEscapeOnce = function bindGlobalEscapeOnce(flagName, closeFn) {
    if (typeof closeFn !== 'function') return false;
    const flag = String(flagName || '').trim();
    if (!flag) return false;
    const host = document.body || document.documentElement;
    if (host && host.dataset && host.dataset[flag] === '1') return false;
    if (host && host.dataset) host.dataset[flag] = '1';
    registerListener(document, 'keydown', (event) => {
      if (event && event.key === 'Escape') closeFn();
    });
    return true;
  };
})();

// RaK 1.7 – pracovník může zůstat přihlášený do aplikace, ale být vyřazený z aktivní rotace.
(function setupWorkerActiveState() {
  if (window.__rakWorkerActiveStateInstalled) return;

  const originalGetSettings = window.getRakWorkerRosterSettings;
  const originalMergeRows = window.mergeRakWorkerRosterSettingsRows;
  const originalBuildHtml = window.buildAdminWorkerRosterSettingsHtml;
  const originalReadDom = window.readAdminWorkerRosterSettingsFromDom;
  if (typeof originalGetSettings !== 'function' || typeof originalMergeRows !== 'function' || typeof originalBuildHtml !== 'function' || typeof originalReadDom !== 'function') return;

  window.__rakWorkerActiveStateInstalled = true;

  function isExplicitlyInactive(value) {
    if (value === false || value === 0 || value === '0') return true;
    return /^(?:false|ne|no|off|inactive)$/i.test(String(value || '').trim());
  }

  function workerActiveValue(entry) {
    if (!entry || typeof entry !== 'object') return true;
    if (!Object.prototype.hasOwnProperty.call(entry, 'active')
      && !Object.prototype.hasOwnProperty.call(entry, 'enabled')
      && !Object.prototype.hasOwnProperty.call(entry, 'isActive')) return true;
    const raw = Object.prototype.hasOwnProperty.call(entry, 'active')
      ? entry.active
      : (Object.prototype.hasOwnProperty.call(entry, 'enabled') ? entry.enabled : entry.isActive);
    return !isExplicitlyInactive(raw);
  }

  function workerSettingsJson(row) {
    if (row && row.settings_json && typeof row.settings_json === 'object') return row.settings_json;
    try { return row && row.settings_json ? JSON.parse(String(row.settings_json)) : {}; }
    catch (err) { return {}; }
  }

  function workerSettingsRow() {
    const rows = (typeof app !== 'undefined' && app && Array.isArray(app.machineSettingsRows)) ? app.machineSettingsRows : [];
    return rows.find((row) => String(row && row.category || '').trim() === 'worker_roster_settings')
      || rows.find((row) => String(row && row.machine_key || '').trim() === 'WORKER_ROSTER_SETTINGS')
      || null;
  }

  function storedActiveMap() {
    const raw = workerSettingsJson(workerSettingsRow());
    const source = Array.isArray(raw.workers) ? raw.workers : (Array.isArray(raw.names) ? raw.names : []);
    const map = new Map();
    source.forEach((entry) => {
      const name = typeof entry === 'string' ? String(entry || '').trim() : String(entry && entry.name || '').trim();
      if (name) map.set(name, workerActiveValue(entry));
    });
    return map;
  }

  function addActiveState(settings) {
    const safe = settings && typeof settings === 'object' ? settings : {};
    const activeByName = storedActiveMap();
    const workers = (Array.isArray(safe.workers) ? safe.workers : []).map((entry) => {
      const worker = Object.assign({}, entry || {});
      const name = String(worker.name || '').trim();
      worker.active = activeByName.has(name) ? activeByName.get(name) : workerActiveValue(worker);
      return worker;
    });
    return Object.assign({}, safe, { workers });
  }

  function activeMapFromSettings(settings) {
    const map = new Map();
    (Array.isArray(settings && settings.workers) ? settings.workers : []).forEach((entry) => {
      const name = String(entry && entry.name || '').trim();
      if (name) map.set(name, workerActiveValue(entry));
    });
    return map;
  }

  window.getRakWorkerRosterSettings = function getRakWorkerRosterSettingsWithActive() {
    return addActiveState(originalGetSettings());
  };

  window.getActiveWorkerNames = function getActiveWorkerNamesWithToggle() {
    const settings = window.getRakWorkerRosterSettings();
    const names = (Array.isArray(settings && settings.workers) ? settings.workers : [])
      .filter((worker) => worker && worker.active !== false)
      .map((worker) => String(worker.name || '').trim())
      .filter(Boolean);
    return new Set(names);
  };

  window.isRakWorkerActive = function isRakWorkerActive(name) {
    const wanted = String(name || '').trim();
    if (!wanted) return false;
    return window.getActiveWorkerNames().has(wanted);
  };

  window.mergeRakWorkerRosterSettingsRows = function mergeRakWorkerRosterSettingsRowsWithActive(settings) {
    const activeByName = activeMapFromSettings(settings);
    const rows = originalMergeRows(settings);
    const row = (Array.isArray(rows) ? rows : []).find((item) => String(item && item.category || '').trim() === 'worker_roster_settings')
      || (Array.isArray(rows) ? rows : []).find((item) => String(item && item.machine_key || '').trim() === 'WORKER_ROSTER_SETTINGS');
    if (!row) return rows;
    const json = workerSettingsJson(row);
    const workers = (Array.isArray(json.workers) ? json.workers : []).map((entry) => {
      const worker = Object.assign({}, entry || {});
      const name = String(worker.name || '').trim();
      worker.active = activeByName.has(name) ? activeByName.get(name) : true;
      return worker;
    });
    row.settings_json = Object.assign({}, json, { workers });
    return rows;
  };

  function ensureStyles() {
    if (document.getElementById('rak-worker-active-style')) return;
    const style = document.createElement('style');
    style.id = 'rak-worker-active-style';
    style.textContent = [
      '.adminWorkerRosterTable{min-width:590px!important}',
      '.adminWorkerActiveCol{width:70px}',
      '.adminWorkerActiveCell{text-align:center;vertical-align:middle}',
      '.adminWorkerActiveToggle{display:inline-flex;align-items:center;justify-content:center;min-width:34px;min-height:34px;cursor:pointer}',
      '.adminWorkerActiveToggle input{width:19px;height:19px;margin:0}',
      '.adminWorkerRosterTable tr[data-worker-active="0"] .adminWorkerNameInput,',
      '.adminWorkerRosterTable tr[data-worker-active="0"] .adminWorkerLoginInput,',
      '.adminWorkerRosterTable tr[data-worker-active="0"] .adminWorkerMachineChecks{opacity:.48}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function setStatusItem(item, label, value, detail, state) {
    if (!item) return;
    item.className = 'adminSpecialDaysStatusItem is' + String(state || 'ok').charAt(0).toUpperCase() + String(state || 'ok').slice(1);
    const labelEl = item.querySelector('span');
    const valueEl = item.querySelector('b');
    const detailEl = item.querySelector('small');
    if (labelEl) labelEl.textContent = label;
    if (valueEl) valueEl.textContent = value;
    if (detailEl) detailEl.textContent = detail;
  }

  window.buildAdminWorkerRosterSettingsHtml = function buildAdminWorkerRosterSettingsHtmlWithActive() {
    ensureStyles();
    const holder = document.createElement('div');
    holder.innerHTML = originalBuildHtml();
    const settings = window.getRakWorkerRosterSettings();
    const workers = Array.isArray(settings && settings.workers) ? settings.workers : [];
    const activeByName = activeMapFromSettings(settings);
    const activeWorkers = workers.filter((worker) => worker && worker.active !== false);
    const inactiveWorkers = workers.filter((worker) => worker && worker.active === false);

    const table = holder.querySelector('.adminWorkerRosterTable');
    if (table) {
      const colgroup = table.querySelector('colgroup');
      if (colgroup && !colgroup.querySelector('.adminWorkerActiveCol')) {
        const col = document.createElement('col');
        col.className = 'adminWorkerActiveCol';
        colgroup.insertBefore(col, colgroup.children[2] || null);
      }
      const header = table.querySelector('thead tr');
      if (header && !header.querySelector('[data-worker-active-header]')) {
        const th = document.createElement('th');
        th.textContent = 'Aktivní';
        th.setAttribute('data-worker-active-header', '1');
        header.insertBefore(th, header.children[2] || null);
      }
      table.querySelectorAll('tbody tr[data-worker-row]').forEach((tr) => {
        if (tr.querySelector('[data-worker-field="active"]')) return;
        const name = String(tr.querySelector('[data-worker-field="name"]')?.value || '').trim();
        const isActive = activeByName.has(name) ? activeByName.get(name) : true;
        tr.dataset.workerActive = isActive ? '1' : '0';
        const td = document.createElement('td');
        td.className = 'adminWorkerActiveCell';
        const label = document.createElement('label');
        label.className = 'adminWorkerActiveToggle';
        label.title = isActive ? 'Pracovník je aktivní v rozpisu a statistikách' : 'Pracovník má jen přístup do aplikace';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = isActive;
        if (isActive) input.setAttribute('checked', '');
        input.setAttribute('data-worker-field', 'active');
        input.setAttribute('aria-label', 'Aktivní pracovník');
        label.appendChild(input);
        td.appendChild(label);
        tr.insertBefore(td, tr.children[2] || null);
      });
    }

    const status = holder.querySelector('#adminWorkerRosterStatus');
    if (status) {
      const note = status.querySelector('.smallText.uMb10');
      if (note) note.textContent = 'Přepínač Aktivní určuje, kdo se počítá v generátoru, statistikách a zobrazuje v Rotaci. Vypnutý pracovník zůstává uložený i s přístupem do aplikace.';
      const items = status.querySelectorAll('.adminSpecialDaysStatusItem');
      setStatusItem(items[0], 'Aktivní', String(activeWorkers.length) + '×', activeWorkers.length ? 'Tito lidé se používají v rozpisu a statistikách.' : 'Nikdo není aktivní pro rozpis.', activeWorkers.length ? 'ok' : 'warn');
      setStatusItem(items[1], 'Neaktivní', inactiveWorkers.length ? inactiveWorkers.map((worker) => worker.name).join(', ') : 'žádní', inactiveWorkers.length ? 'Mají dál účet, ale nevstupují do rotace ani statistik.' : 'Všichni pracovníci jsou aktivní.', inactiveWorkers.length ? 'info' : 'ok');
      setStatusItem(items[2], 'Celkem uložených', String(workers.length) + '×', 'Aktivní i dočasně vyřazení pracovníci.', workers.length ? 'ok' : 'warn');
    }

    const help = holder.querySelector('.adminWorkerRosterTable')?.closest('.tableWrap')?.nextElementSibling;
    if (help && help.classList && help.classList.contains('smallText')) {
      help.textContent = 'Pro přidání napiš jméno do prázdného řádku. Přepínačem Aktivní pracovníka dočasně vyřadíš z generátoru, statistik, ruční nabídky i spodního seznamu jmen v Rotaci, ale zachováš jeho účet, kvalifikace a nastavení. Pro úplné odebrání jméno smaž a ulož. Když u pracovníka nezaškrtneš žádný stroj, generátor ho na povolených pozicích neomezuje kvalifikací.';
    }

    return holder.innerHTML;
  };

  window.readAdminWorkerRosterSettingsFromDom = function readAdminWorkerRosterSettingsFromDomWithActive() {
    const activeByName = new Map();
    document.querySelectorAll('#appMenuBody tr[data-worker-row]').forEach((tr) => {
      const name = String(tr.querySelector('[data-worker-field="name"]')?.value || '').trim();
      if (!name) return;
      const checkbox = tr.querySelector('[data-worker-field="active"]');
      activeByName.set(name, !checkbox || checkbox.checked);
    });
    const settings = originalReadDom();
    settings.workers = (Array.isArray(settings.workers) ? settings.workers : []).map((worker) => Object.assign({}, worker, {
      active: activeByName.has(String(worker && worker.name || '').trim()) ? activeByName.get(String(worker && worker.name || '').trim()) : true
    }));
    return settings;
  };

  const onActiveChange = (event) => {
    const target = event && event.target;
    if (!target || !target.matches || !target.matches('[data-worker-field="active"]')) return;
    const row = target.closest('tr[data-worker-row]');
    if (row) row.dataset.workerActive = target.checked ? '1' : '0';
  };
  if (typeof window.registerListener === 'function') window.registerListener(document, 'change', onActiveChange);
  else document.addEventListener('change', onActiveChange);
})();

// RaK 1.7 – barevný výsledný náhled reportu směny podle výrobního indexu.
(function setupShiftReportPreviewColors() {
  if (window.__rakShiftReportPreviewColorsInstalled) return;
  window.__rakShiftReportPreviewColorsInstalled = true;

  const INDEX_TONES = { AF: 'blue', AD: 'blue', AG: 'green', AE: 'green', AH: 'orange' };
  let scheduled = false;

  function ensurePreviewStyles() {
    if (document.getElementById('rak-shift-preview-colors')) return;
    const style = document.createElement('style');
    style.id = 'rak-shift-preview-colors';
    style.textContent = [
      '#rakShiftReport .rakShiftPreviewColored{font-weight:850}',
      '#rakShiftReport .rakShiftPreviewTone--blue{color:#52caff;text-shadow:0 0 12px rgba(82,202,255,.28)}',
      '#rakShiftReport .rakShiftPreviewTone--green{color:#55efa8;text-shadow:0 0 12px rgba(85,239,168,.24)}',
      '#rakShiftReport .rakShiftPreviewTone--orange{color:#ffc04d;text-shadow:0 0 12px rgba(255,192,77,.25)}',
      '#rakShiftReport .rakShiftPreviewIndex{display:inline-block;min-width:26px;padding:0 4px;border-radius:6px;text-align:center;font-weight:950}',
      '#rakShiftReport .rakShiftPreviewIndex.rakShiftPreviewTone--blue{background:rgba(38,168,255,.14);box-shadow:inset 0 0 0 1px rgba(82,202,255,.28)}',
      '#rakShiftReport .rakShiftPreviewIndex.rakShiftPreviewTone--green{background:rgba(42,216,132,.13);box-shadow:inset 0 0 0 1px rgba(85,239,168,.25)}',
      '#rakShiftReport .rakShiftPreviewIndex.rakShiftPreviewTone--orange{background:rgba(255,172,35,.14);box-shadow:inset 0 0 0 1px rgba(255,192,77,.28)}',
      '#rakShiftReport .rakShiftPreviewColorMarker{display:none!important}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function coloredSpan(text, className) {
    const span = document.createElement('span');
    span.className = 'rakShiftPreviewColored ' + className;
    span.textContent = text;
    return span;
  }

  function appendColoredNumbers(parent, text, toneClass) {
    String(text || '').split(/(\d+)/).forEach((part) => {
      if (!part) return;
      if (/^\d+$/.test(part)) parent.appendChild(coloredSpan(part, toneClass));
      else parent.appendChild(document.createTextNode(part));
    });
  }

  function decoratePreview() {
    scheduled = false;
    const root = document.getElementById('rakShiftReport');
    const preview = root && root.querySelector('.rakShiftPreview');
    if (!preview) return;
    const text = preview.textContent || '';
    if (!text.trim()) return;
    if (preview.dataset.rakColoredText === text && preview.querySelector('.rakShiftPreviewColorMarker')) return;

    ensurePreviewStyles();
    const fragment = document.createDocumentFragment();
    const lines = text.split('\n');

    lines.forEach((line, index) => {
      const match = line.match(/^(\s*-\s+)(\d+)(\s+)(AF|AG|AH|AD|AE)\b(.*)$/i);
      if (!match) {
        fragment.appendChild(document.createTextNode(line));
      } else {
        const reportIndex = match[4].toUpperCase();
        const toneClass = 'rakShiftPreviewTone--' + (INDEX_TONES[reportIndex] || 'blue');
        fragment.appendChild(document.createTextNode(match[1]));
        fragment.appendChild(coloredSpan(match[2], toneClass));
        fragment.appendChild(document.createTextNode(match[3]));
        const indexSpan = coloredSpan(reportIndex, toneClass + ' rakShiftPreviewIndex');
        fragment.appendChild(indexSpan);
        appendColoredNumbers(fragment, match[5], toneClass);
      }
      if (index < lines.length - 1) fragment.appendChild(document.createTextNode('\n'));
    });

    const marker = document.createElement('span');
    marker.className = 'rakShiftPreviewColorMarker';
    marker.setAttribute('aria-hidden', 'true');
    fragment.appendChild(marker);
    preview.replaceChildren(fragment);
    preview.dataset.rakColoredText = text;

    const hint = root.querySelector('.rakShiftPreviewHint');
    if (hint && hint.textContent !== 'Barvy platí pro náhled v RaK; při textovém kopírování nebo sdílení se nepřenášejí.') {
      hint.textContent = 'Barvy platí pro náhled v RaK; při textovém kopírování nebo sdílení se nepřenášejí.';
    }
  }

  function schedulePreviewColors() {
    if (scheduled) return;
    scheduled = true;
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(decoratePreview);
    else setTimeout(decoratePreview, 0);
  }

  function startPreviewColors() {
    ensurePreviewStyles();
    schedulePreviewColors();
    const host = document.body || document.documentElement;
    if (!host || typeof MutationObserver !== 'function') return;
    const observer = new MutationObserver(schedulePreviewColors);
    observer.observe(host, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startPreviewColors, { once: true });
  else startPreviewColors();
})();
