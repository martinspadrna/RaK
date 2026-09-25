// RaK 1.5.94 working candidate – Brusy/FHB: citlivost po brusu + indexu + C1/C2 + straně protokolu.
(function installBrusFhbV158() {
  'use strict';

  const BUILD = '1.5.94-working-indexed';
  const SETTINGS_KEY = 'BRUS_FHB_CORRECTION_CALIBRATION_SETTINGS';
  const CATEGORY = 'brus_fhb_correction_calibration_settings';
  const MIN_SAMPLES = 3;
  const MAX_RECORDS = 80;
  const MACHINES = ['TBKR01', 'TBKR07'];
  const INDEXES = ['AD', 'AE', 'AH'];
  const SPINDLES = ['C1', 'C2'];
  const SIDES = ['left', 'right'];
  const DEFAULT_MODEL = Object.freeze({ left: 2.0, right: 1.5 });
  const FALLBACK_KPO = Object.freeze({
    AD: Object.freeze({ left: Object.freeze({ target: 17, tolerance: 3, kpo: 'Zpět / Schub' }), right: Object.freeze({ target: 7, tolerance: 5, kpo: 'Tah / Zug' }) }),
    AE: Object.freeze({ left: Object.freeze({ target: 10, tolerance: 3, kpo: 'Zpět / Schub' }), right: Object.freeze({ target: 7, tolerance: 5, kpo: 'Tah / Zug' }) }),
    AH: Object.freeze({ left: Object.freeze({ target: 10, tolerance: 3, kpo: 'Zpět / Schub' }), right: Object.freeze({ target: 5, tolerance: 3, kpo: 'Tah / Zug' }) })
  });

  function esc(value) {
    if (typeof escapeHtml === 'function') return escapeHtml(String(value == null ? '' : value));
    return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function num(value) {
    const n = Number(String(value == null ? '' : value).trim().replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  }

  function fmt(value, digits) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return n.toLocaleString('cs-CZ', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function signed(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || Math.abs(n) < 0.0001) return '0';
    return (n > 0 ? '+' : '') + Math.round(n).toLocaleString('cs-CZ');
  }

  function protocolSideCs(side) { return side === 'right' ? 'vpravo' : 'vlevo'; }
  function protocolSideShort(side) { return side === 'right' ? 'P' : 'L'; }
  function programSide(side) { return side === 'right' ? 'left' : 'right'; }
  function programSideCs(side) { return programSide(side) === 'right' ? 'VPRAVO' : 'VLEVO'; }
  function programSideShort(side) { return programSide(side) === 'right' ? 'P' : 'L'; }
  function kpoTargets() { return window.RAK_BRUS_FHB_KPO_TARGETS || FALLBACK_KPO; }

  function rowJson(row) {
    if (row && row.settings_json && typeof row.settings_json === 'object') return row.settings_json;
    try { return row && row.settings_json ? JSON.parse(String(row.settings_json)) : {}; } catch (_) { return {}; }
  }

  function isSettingsRow(row) {
    const data = rowJson(row);
    return String(row && row.category || '') === CATEGORY
      || String(row && row.machine_key || '') === SETTINGS_KEY
      || String(data.stored_category || '') === CATEGORY
      || String(data.admin_settings_key || '') === SETTINGS_KEY;
  }

  function defaultModels() {
    const models = {};
    MACHINES.forEach((machine) => {
      models[machine] = {};
      INDEXES.forEach((index) => {
        models[machine][index] = {};
        SPINDLES.forEach((spindle) => {
          models[machine][index][spindle] = { left: DEFAULT_MODEL.left, right: DEFAULT_MODEL.right };
        });
      });
    });
    return models;
  }

  // Migrace je záměrně zpětně kompatibilní:
  // 1. nový tvar machine -> index -> C1/C2 -> L/P
  // 2. v1.5.94 machine -> C1/C2 -> L/P (hodnota se použije jako start pro všechny indexy)
  // 3. starší machine -> L/P (stejný start pro všechny indexy a obě vřetena)
  function cleanModels(source) {
    const raw = source && typeof source === 'object' ? source : {};
    const models = defaultModels();
    MACHINES.forEach((machine) => {
      INDEXES.forEach((index) => {
        SPINDLES.forEach((spindle) => {
          SIDES.forEach((side) => {
            const indexed = num(raw[machine] && raw[machine][index] && raw[machine][index][spindle] && raw[machine][index][spindle][side]);
            const v1594 = num(raw[machine] && raw[machine][spindle] && raw[machine][spindle][side]);
            const legacy = num(raw[machine] && raw[machine][side]);
            const candidate = Number.isFinite(indexed) ? indexed : (Number.isFinite(v1594) ? v1594 : legacy);
            if (Number.isFinite(candidate) && candidate >= 0.25 && candidate <= 8) models[machine][index][spindle][side] = candidate;
          });
        });
      });
    });
    return models;
  }

  function cleanRecord(source) {
    const row = source && typeof source === 'object' ? source : {};
    const machine = MACHINES.includes(String(row.machine || '').toUpperCase()) ? String(row.machine).toUpperCase() : '';
    const index = INDEXES.includes(String(row.index || '').toUpperCase()) ? String(row.index).toUpperCase() : '';
    const spindle = SPINDLES.includes(String(row.c || '').toUpperCase()) ? String(row.c).toUpperCase() : '';
    const side = SIDES.includes(String(row.side || '').toLowerCase()) ? String(row.side).toLowerCase() : '';
    const before = num(row.before);
    const correction = num(row.correction);
    const after = num(row.after);
    if (!machine || !index || !spindle || !side || ![before, correction, after].every(Number.isFinite)) return null;
    if (Math.abs(correction) < 0.0001 || Math.abs(correction) > 20) return null;
    if (Math.abs(before) > 100 || Math.abs(after) > 100) return null;
    return {
      id: String(row.id || (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8))).slice(0, 48),
      batchId: String(row.batchId || '').trim().slice(0, 48),
      at: String(row.at || new Date().toISOString()).slice(0, 40),
      machine,
      index,
      c: spindle,
      side,
      before,
      correction,
      after,
      note: String(row.note || '').trim().slice(0, 160)
    };
  }

  function normalizeSettings(source) {
    const raw = source && typeof source === 'object' ? source : {};
    return {
      type: CATEGORY,
      activeModels: cleanModels(raw.activeModels),
      records: (Array.isArray(raw.records) ? raw.records : []).map(cleanRecord).filter(Boolean).slice(0, MAX_RECORDS)
    };
  }

  function getSettings() {
    const rows = typeof app !== 'undefined' && app && Array.isArray(app.machineSettingsRows) ? app.machineSettingsRows : [];
    const row = rows.find(isSettingsRow);
    return normalizeSettings(row ? rowJson(row) : null);
  }

  function makeRow(settings) {
    const safe = normalizeSettings(settings);
    return {
      machine_key: SETTINGS_KEY,
      machine_code: 'TBKR_FHB',
      machine_index: 'calibration',
      label: 'Doladění korekcí Brusy FHB',
      category: CATEGORY,
      cycle_time: '', speed: '', dress_time: '', dress_count: '',
      settings_json: Object.assign({ machine: 'TBKR_FHB', index: 'calibration', stored_category: CATEGORY, admin_settings_key: SETTINGS_KEY }, safe)
    };
  }

  function mergeRows(settings) {
    const rows = typeof app !== 'undefined' && app && Array.isArray(app.machineSettingsRows) ? app.machineSettingsRows : [];
    return rows.filter((row) => !isSettingsRow(row)).concat(makeRow(settings));
  }

  async function refreshSettingsOnline() {
    if (!(window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.loadMachineSettings === 'function')) return;
    const rows = await window.RotationSupabaseBridge.loadMachineSettings();
    if (Array.isArray(rows) && typeof app !== 'undefined' && app) app.machineSettingsRows = rows;
  }

  async function persistSettings(settings) {
    const rows = mergeRows(settings);
    if (!(window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.saveMachineSettings === 'function')) {
      throw new Error('Online uložení nastavení není připravené.');
    }
    const result = await window.RotationSupabaseBridge.saveMachineSettings(rows);
    if (result && result.ok === false) throw (result.error || new Error('Online uložení selhalo.'));
    if (typeof app !== 'undefined' && app) app.machineSettingsRows = rows;
    return result || { ok: true };
  }

  function median(values) {
    const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
    if (!sorted.length) return NaN;
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function derive(settings) {
    const safe = normalizeSettings(settings);
    const samples = {};
    const medians = {};
    const ready = {};
    const proposed = cleanModels(safe.activeModels);
    const changes = [];

    MACHINES.forEach((machine) => {
      samples[machine] = {};
      medians[machine] = {};
      ready[machine] = {};
      INDEXES.forEach((index) => {
        samples[machine][index] = {};
        medians[machine][index] = {};
        ready[machine][index] = {};
        SPINDLES.forEach((spindle) => {
          samples[machine][index][spindle] = { left: [], right: [] };
          medians[machine][index][spindle] = {};
          ready[machine][index][spindle] = { left: false, right: false };
        });
      });
    });

    safe.records.forEach((row) => {
      const rate = (row.before - row.after) / row.correction;
      if (Number.isFinite(rate) && rate >= 0.25 && rate <= 8) samples[row.machine][row.index][row.c][row.side].push(rate);
    });

    MACHINES.forEach((machine) => {
      INDEXES.forEach((index) => {
        SPINDLES.forEach((spindle) => {
          SIDES.forEach((side) => {
            const values = samples[machine][index][spindle][side];
            const m = median(values);
            medians[machine][index][spindle][side] = m;
            ready[machine][index][spindle][side] = values.length >= MIN_SAMPLES;
            if (ready[machine][index][spindle][side] && Number.isFinite(m)) {
              proposed[machine][index][spindle][side] = m;
              if (Math.abs(m - safe.activeModels[machine][index][spindle][side]) >= 0.10) {
                changes.push(machine + ':' + index + ':' + spindle + ':' + side);
              }
            }
          });
        });
      });
    });
    return { samples, medians, ready, proposed, changes };
  }

  function sensitivity(machine, index, side, spindle) {
    const safeMachine = MACHINES.includes(String(machine || '').toUpperCase()) ? String(machine).toUpperCase() : 'TBKR01';
    const safeIndex = INDEXES.includes(String(index || '').toUpperCase()) ? String(index).toUpperCase() : 'AD';
    const safeSpindle = SPINDLES.includes(String(spindle || '').toUpperCase()) ? String(spindle).toUpperCase() : 'C1';
    const safeSide = String(side || '').toLowerCase() === 'right' ? 'right' : 'left';
    const settings = getSettings();
    const value = Number(settings.activeModels[safeMachine] && settings.activeModels[safeMachine][safeIndex] && settings.activeModels[safeMachine][safeIndex][safeSpindle] && settings.activeModels[safeMachine][safeIndex][safeSpindle][safeSide]);
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_MODEL[safeSide];
  }

  function chooseCenterCorrection(measured, target, tolerance, rate) {
    const min = target - tolerance;
    const max = target + tolerance;
    let best = null;
    for (let correction = -20; correction <= 20; correction += 1) {
      const predicted = measured - correction * rate;
      const centerDistance = Math.abs(predicted - target);
      const inside = predicted >= min - 1e-9 && predicted <= max + 1e-9;
      const candidate = { correction, predicted, centerDistance, inside, min, max };
      if (!best
        || candidate.centerDistance < best.centerDistance - 1e-9
        || (Math.abs(candidate.centerDistance - best.centerDistance) < 1e-9 && Math.abs(candidate.correction) < Math.abs(best.correction))) best = candidate;
    }
    return best || { correction: 0, predicted: measured, centerDistance: Math.abs(measured - target), inside: measured >= min && measured <= max, min, max };
  }

  function calculatorSelectedValue(name, fallback) {
    const el = document.querySelector('#korekce-brusy [data-brus157-select="' + name + '"] .brus157Choice.isActive');
    return String(el && el.dataset.value || fallback || '');
  }

  function calculatorResultHtml(machine, index, spindle, side, measured) {
    const targets = kpoTargets();
    const spec = (targets[index] || targets.AD)[side];
    const rate = sensitivity(machine, index, side, spindle);
    const choice = chooseCenterCorrection(measured, spec.target, spec.tolerance, rate);
    const correction = choice.correction;
    const protocol = protocolSideCs(side);
    const program = programSideCs(side);
    return [
      '<div class="brus157ResultSide' + (correction === 0 ? ' isOk' : '') + '">',
      '<div class="brus157ResultTop"><span>' + esc(spindle + ' · FHB ' + protocol) + '</span><b>' + esc(correction === 0 ? ('Program ' + program + ' · bez korekce') : ('Program ' + program + ' · ' + signed(correction) + ' µm')) + '</b></div>',
      '<div class="brus157ProgramCallout">ZADAT VE STROJI: <strong>' + esc(spindle + ' ' + program + ' ' + signed(correction) + ' µm') + '</strong></div>',
      '<div class="brus157Meta">Naměřeno <b>' + esc(fmt(measured, 0)) + '</b> · střed KPO <b>' + esc(String(spec.target)) + '</b> · pásmo ' + esc(String(choice.min)) + ' až ' + esc(String(choice.max)) + ' · odhad po korekci <b>' + esc(fmt(choice.predicted, 1)) + '</b></div>',
      '<div class="brus157Meta">Aktuální citlivost ' + esc(index + ' · ' + spindle + ' · protokol ' + protocolSideShort(side)) + ': ' + esc(fmt(rate, 2)) + ' µm FHB / 1 µm korekce</div>',
      '</div>'
    ].join('');
  }

  function evaluateCalculator() {
    const machine = calculatorSelectedValue('machine', 'TBKR01');
    const index = calculatorSelectedValue('index', 'AD');
    const out = document.getElementById('brus157Result');
    if (!out) return;
    const rows = [];
    SPINDLES.forEach((spindle) => {
      SIDES.forEach((side) => {
        const input = document.getElementById('brus157_' + spindle.toLowerCase() + '_' + side);
        const raw = String(input && input.value || '').trim();
        if (!raw) return;
        const value = num(raw);
        if (Number.isFinite(value)) rows.push(calculatorResultHtml(machine, index, spindle, side, value));
      });
    });
    if (!rows.length) {
      out.innerHTML = '<div class="smallText">Zadej alespoň jednu hodnotu C1/C2 vlevo nebo vpravo.</div>';
      return;
    }
    out.innerHTML = '<div class="brus157ResultTitle">' + esc(machine + ' · ' + index) + '</div>' + rows.join('') + '<div class="brus157Foot">Strany L/P jsou podle protokolu. Kalkulačka vždy převede protokol L → program P a protokol P → program L pro stejné vřeteno C1/C2.</div>';
  }

  function modelMetricHtml(machine, index, spindle, side, settings, analysis) {
    const current = settings.activeModels[machine][index][spindle][side];
    const values = analysis.samples[machine][index][spindle][side];
    const proposed = analysis.medians[machine][index][spindle][side];
    const isReady = analysis.ready[machine][index][spindle][side];
    const state = isReady ? (Math.abs(proposed - current) >= 0.10 ? 'doporučení ' + fmt(proposed, 2) : 'potvrzeno') : ('chybí ' + Math.max(0, MIN_SAMPLES - values.length) + ' vz.');
    return '<div class="adminBrusFhbMetric"><span>' + esc(machine + ' · ' + index + ' · ' + spindle + ' · protokol ' + protocolSideShort(side)) + '</span><b>' + esc(fmt(current, 2)) + '</b><small>' + esc(values.length + '/' + MIN_SAMPLES + ' · ' + state) + '</small></div>';
  }

  function metricsHtml(settings, analysis) {
    return MACHINES.map((machine) => '<div class="adminBrusSensitivityMachine"><b>' + esc(machine) + '</b>' + INDEXES.map((index) =>
      '<div class="adminBrusSensitivityIndex"><strong>' + esc(index) + '</strong><div class="adminBrusFhbMetrics">' +
      SPINDLES.flatMap((spindle) => SIDES.map((side) => modelMetricHtml(machine, index, spindle, side, settings, analysis))).join('') +
      '</div></div>'
    ).join('') + '</div>').join('');
  }

  function adminPair(prefix, spindle, placeholder) {
    const input = (side, label) => {
      const suffix = spindle + (side === 'right' ? 'Right' : 'Left');
      const field = prefix + suffix;
      const id = 'brus1594_' + field.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
      const inputHtml = '<input id="' + esc(id) + '" class="appMenuInput" inputmode="decimal" data-brus1594-field="' + esc(field) + '" data-brus-fhb-sign-input="1" placeholder="' + esc(placeholder || '') + '">';
      const signLabel = prefix === 'correction' ? 'korekce' : (prefix === 'before' ? 'hodnoty před korekcí' : 'hodnoty po korekci');
      return '<label>' + label + '<div class="calcSignedInput adminBrus1594SignedInput"><button type="button" class="calcSignToggle" data-brus-fhb-sign-target="' + esc(id) + '" aria-label="Přepnout znaménko ' + esc(signLabel) + '">+</button>' + inputHtml + '</div></label>';
    };
    return '<div class="adminBrus1594Spindle"><strong>' + esc(spindle) + '</strong><div class="adminFhbCalibrationTwo">' +
      input('left', 'L') + input('right', 'P') +
      '</div></div>';
  }

  function adminStage(title, prefix, placeholder) {
    return '<div class="adminFhbCalibrationFieldset adminBrus1594Stage"><b>' + esc(title) + '</b>' + SPINDLES.map((spindle) => adminPair(prefix, spindle, placeholder)).join('') + '</div>';
  }

  function historyGroups(records) {
    const safe = Array.isArray(records) ? records : [];
    const groups = [];
    const used = new Set();
    safe.forEach((row) => {
      if (!row || used.has(row.id)) return;
      if (row.batchId) {
        const batch = safe.filter((candidate) => candidate && candidate.batchId === row.batchId);
        batch.forEach((candidate) => used.add(candidate.id));
        groups.push(batch);
      } else {
        used.add(row.id);
        groups.push([row]);
      }
    });
    return groups;
  }

  function recordDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function historyGroupHtml(group) {
    const rows = Array.isArray(group) ? group.filter(Boolean) : [];
    if (!rows.length) return '';
    const first = rows[0];
    const order = (row) => SPINDLES.indexOf(row.c) * 10 + SIDES.indexOf(row.side);
    const lines = rows.slice().sort((a, b) => order(a) - order(b)).map((row) => {
      const rate = (row.before - row.after) / row.correction;
      return '<span><b>' + esc(row.c + ' · protokol ' + protocolSideShort(row.side) + ' → program ' + programSideShort(row.side)) + '</b>: ' +
        esc(String(row.before) + ' → ' + String(row.after) + ' · korekce ' + signed(row.correction) + ' µm · odezva ' + fmt(rate, 2)) + '</span>';
    }).join('');
    const removeAttr = first.batchId ? ' data-batch-id="' + esc(first.batchId) + '"' : ' data-record-id="' + esc(first.id) + '"';
    return '<div class="adminBrusFhbRecord adminBrus1594Record"><div><b>' + esc(recordDate(first.at) + ' · ' + first.machine + ' · ' + first.index) + '</b>' + lines + '</div>' +
      (first.note ? '<small>' + esc(first.note) + '</small>' : '') +
      '<button type="button" class="appMenuInlineClearBtn" data-brus1594-action="remove"' + removeAttr + ' aria-label="Smazat záznam">×</button></div>';
  }

  function buildAdminHtml() {
    const settings = getSettings();
    const analysis = derive(settings);
    const groups = historyGroups(settings.records).slice(0, 24);
    const recordsHtml = groups.length ? groups.map(historyGroupHtml).join('') : '<div class="smallText">Zatím nejsou žádná měření brusů.</div>';
    return [
      '<div class="adminBrusFhbCalibration" data-rak-brusy-real-section="1" data-rak-brus1594="1" data-rak-brus-indexed="1" data-v157="1">',
      '<div class="appMenuSubTitle">Brusy · FHB</div>',
      '<div class="smallText">Vyber brus a index. Vyplň jen ty kombinace C1/C2 a L/P, na kterých skutečně proběhla korekce. L/P jsou vždy strany podle protokolu.</div>',
      '<div class="adminBrusFhbForm adminFhbCalibrationForm">',
      '<div class="adminFhbCalibrationTwo">',
      '<label>Stroj<select class="appMenuSelect" data-brus1594-field="machine"><option>TBKR01</option><option>TBKR07</option></select></label>',
      '<label>Index<select class="appMenuSelect" data-brus1594-field="index"><option>AD</option><option>AE</option><option>AH</option></select></label>',
      '</div>',
      adminStage('Před korekcí (strany dle protokolu)', 'before', 'FHB'),
      adminStage('Provedené korekce (strany dle protokolu)', 'correction', 'µm'),
      adminStage('Po korekci (strany dle protokolu)', 'after', 'FHB'),
      '<label class="adminFhbCalibrationNote">Poznámka<input class="appMenuInput" maxlength="160" data-brus1594-field="note" placeholder="volitelné"></label>',
      '<button type="button" class="appMenuAction isActive" data-brus1594-action="save">Uložit zadaná měření</button>',
      '</div>',
      '<details class="adminBrusFhbModel adminBrusSensitivityFold">',
      '<summary><span>Aktivní citlivost kalkulačky</span><small>24 kombinací</small></summary>',
      '<div class="adminBrusSensitivityBody">',
      '<div class="smallText">Citlivost se učí zvlášť pro brus, index AD/AE/AH, vřeteno C1/C2 a stranu protokolu L/P. Každá kombinace potřebuje alespoň tři použitelné záznamy.</div>',
      metricsHtml(settings, analysis),
      '<button type="button" class="appMenuAction" data-brus1594-action="apply"' + (analysis.changes.length ? '' : ' disabled') + '>Potvrdit doporučené nastavení brusů</button>',
      '</div></details>',
      '<div class="adminBrusFhbHistory"><div class="appMenuCardTitle">Měření brusů</div>' + recordsHtml + '</div>',
      '</div>'
    ].join('');
  }

  function adminField(root, name) {
    return root.querySelector('[data-brus1594-field="' + name + '"]')?.value || '';
  }

  function readAdminRecords() {
    const root = document.querySelector('.adminBrusFhbCalibration[data-rak-brus-indexed="1"]');
    if (!root) return null;
    const machine = String(adminField(root, 'machine') || '').toUpperCase();
    const index = String(adminField(root, 'index') || '').toUpperCase();
    const note = adminField(root, 'note');
    const at = new Date().toISOString();
    const batchId = 'brus-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    const records = [];
    let partial = false;
    SPINDLES.forEach((spindle) => {
      SIDES.forEach((side) => {
        const suffix = spindle + (side === 'right' ? 'Right' : 'Left');
        const before = String(adminField(root, 'before' + suffix) || '').trim();
        const correction = String(adminField(root, 'correction' + suffix) || '').trim();
        const after = String(adminField(root, 'after' + suffix) || '').trim();
        const filled = [before, correction, after].filter(Boolean).length;
        if (!filled) return;
        if (filled !== 3) { partial = true; return; }
        const row = cleanRecord({ machine, index, c: spindle, side, before, correction, after, note, at, batchId });
        if (!row) { partial = true; return; }
        records.push(row);
      });
    });
    return partial || !records.length ? null : { records, batchId };
  }

  async function handleAdminAction(button) {
    const action = String(button.dataset.brus1594Action || '');
    const status = document.getElementById('adminOnlineSaveStatus');
    if (action === 'save') {
      const batch = readAdminRecords();
      if (!batch) throw new Error('U každé zadané kombinace doplň hodnotu před korekcí, provedenou nenulovou korekci a hodnotu po korekci. Ostatní kombinace můžeš nechat prázdné.');
      if (status) status.textContent = 'Ukládám měření brusů…';
      await refreshSettingsOnline();
      const settings = getSettings();
      settings.records = batch.records.concat(settings.records).slice(0, MAX_RECORDS);
      await persistSettings(settings);
      if (typeof openAppMenu === 'function') openAppMenu('admin-correction-settings');
      const next = document.getElementById('adminOnlineSaveStatus');
      if (next) next.textContent = 'Měření brusů uložené online ✓';
      return;
    }
    if (action === 'remove') {
      const id = String(button.dataset.recordId || '');
      const batchId = String(button.dataset.batchId || '');
      if ((!id && !batchId) || !confirm('Smazat toto kalibrační měření brusu?')) return;
      if (status) status.textContent = 'Mažu měření brusu…';
      await refreshSettingsOnline();
      const settings = getSettings();
      settings.records = settings.records.filter((row) => batchId ? row.batchId !== batchId : row.id !== id);
      await persistSettings(settings);
      if (typeof openAppMenu === 'function') openAppMenu('admin-correction-settings');
      return;
    }
    if (action === 'apply') {
      await refreshSettingsOnline();
      const settings = getSettings();
      const analysis = derive(settings);
      if (!analysis.changes.length) return;
      if (!confirm('Použít doporučenou citlivost z naměřených brusů v kalkulačce FHB?')) return;
      settings.activeModels = cleanModels(analysis.proposed);
      await persistSettings(settings);
      if (typeof openAppMenu === 'function') openAppMenu('admin-correction-settings');
      const next = document.getElementById('adminOnlineSaveStatus');
      if (next) next.textContent = 'Doporučené nastavení brusů je aktivní ✓';
    }
  }

  function upgradeAdminRoot() {
    const root = document.querySelector('.adminBrusFhbCalibration');
    if (!root || root.dataset.rakBrusIndexed === '1') return;
    const holder = document.createElement('div');
    holder.innerHTML = buildAdminHtml();
    const replacement = holder.firstElementChild;
    if (replacement) root.replaceWith(replacement);
  }

  function installStyles() {
    if (document.getElementById('brus-fhb-v158-styles')) return;
    const style = document.createElement('style');
    style.id = 'brus-fhb-v158-styles';
    style.textContent = `
html body #korekce-brusy .brus157Intro > span,
html body #korekce-brusy .brus157Warning,
html body #korekce-brusy .brus157KpoSide > small,
html body #korekce-brusy .brus157Measure > small,
html body #korekce-brusy .brus157ResultTop > b,
html body #korekce-brusy .brus157Movement,
html body .adminBrusFhbCalibration .brus157AdminWarning,
html body .adminBrusFhbCalibration .brus157AdminProgramHint{display:none !important;}
html body #korekce-brusy .brus157Card{gap:10px !important;}
html body #korekce-brusy .brus157KpoSide{gap:2px !important;}
html body #korekce-brusy .brus157Measure{gap:5px !important;}
html body #korekce-brusy .brus157ChoiceGroup[data-brus157-select="index"] .brus157Choice.index-ad{background:linear-gradient(145deg,#067dff 0%,#00aaff 100%) !important;border-color:#b3efff !important;color:#fff !important;text-shadow:0 1px 1px #003d8f,0 0 20px #bdeeff !important;box-shadow:0 10px 26px rgba(0,0,0,.30),0 0 30px rgba(0,164,255,.72),inset 0 1px 0 rgba(255,255,255,.54) !important;}
html body #korekce-brusy .brus157ChoiceGroup[data-brus157-select="index"] .brus157Choice.index-ae{background:linear-gradient(145deg,#00b966 0%,#00ee87 100%) !important;border-color:#b5ffe0 !important;color:#fff !important;text-shadow:0 1px 1px #00562f,0 0 20px #c7ffdd !important;box-shadow:0 10px 26px rgba(0,0,0,.30),0 0 30px rgba(0,237,135,.68),inset 0 1px 0 rgba(255,255,255,.54) !important;}
html body #korekce-brusy .brus157ChoiceGroup[data-brus157-select="index"] .brus157Choice.index-ah{background:linear-gradient(145deg,#ffe12b 0%,#ffae00 52%,#f55c00 100%) !important;border-color:#fff0ad !important;color:#fff !important;text-shadow:0 1px 1px #943000,0 0 20px #fff0a5 !important;box-shadow:0 10px 26px rgba(0,0,0,.30),0 0 32px rgba(255,163,0,.76),inset 0 1px 0 rgba(255,255,255,.54) !important;}
html body #korekce-brusy .brus157ChoiceGroup[data-brus157-select="index"] .brus157Choice.isActive{outline:3px solid rgba(255,255,255,.98) !important;outline-offset:3px !important;transform:translateY(-1px) !important;}
.adminBrusFhbCalibration[data-rak-brus-indexed="1"] .adminBrus1594Stage{display:flex;flex-direction:column;gap:8px;}
.adminBrusFhbCalibration[data-rak-brus-indexed="1"] .adminBrus1594Spindle{display:flex;flex-direction:column;gap:5px;padding:8px;border-radius:12px;background:rgba(4,18,39,.34);border:1px solid rgba(160,210,255,.12);}
.adminBrusFhbCalibration[data-rak-brus-indexed="1"] .adminBrus1594Spindle>strong{font-size:12px;color:var(--green2,#a8ff61);}
.adminBrusFhbCalibration[data-rak-brus-indexed="1"] .adminBrus1594SignedInput{display:grid!important;grid-template-columns:48px minmax(0,1fr)!important;gap:7px!important;align-items:stretch!important}
.adminBrusFhbCalibration[data-rak-brus-indexed="1"] .adminBrus1594SignedInput .calcSignToggle{display:grid!important;place-items:center!important;width:48px!important;min-width:48px!important;min-height:46px!important;border-radius:12px!important;visibility:visible!important;opacity:1!important;font-size:22px!important;font-weight:950!important}
.adminBrusFhbCalibration[data-rak-brus-indexed="1"] .adminBrus1594SignedInput .calcSignToggle.isNegative{color:#fff38a!important;}
.adminBrusFhbCalibration[data-rak-brus-indexed="1"] .adminBrus1594Record>div{gap:4px;}
.adminBrusFhbCalibration[data-rak-brus-indexed="1"] .adminBrus1594Record>div>span{display:block;}
.adminBrusSensitivityFold{padding:0 !important;overflow:hidden;}
.adminBrusSensitivityFold>summary{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px;cursor:pointer;font-weight:900;list-style:none;}
.adminBrusSensitivityFold>summary::-webkit-details-marker{display:none;}
.adminBrusSensitivityFold>summary small{font-size:10px;color:rgba(232,245,255,.58);font-weight:700;}
.adminBrusSensitivityFold>summary::after{content:'⌄';font-size:18px;line-height:1;transition:transform .15s ease;}
.adminBrusSensitivityFold[open]>summary::after{transform:rotate(180deg);}
.adminBrusSensitivityBody{display:flex;flex-direction:column;gap:10px;padding:0 11px 11px;}
.adminBrusSensitivityMachine{display:flex;flex-direction:column;gap:7px;}
.adminBrusSensitivityMachine>b{font-size:13px;color:var(--green2,#a8ff61);}
.adminBrusSensitivityIndex{display:flex;flex-direction:column;gap:5px;padding:8px;border:1px solid rgba(160,210,255,.12);border-radius:12px;background:rgba(4,18,39,.26);}
.adminBrusSensitivityIndex>strong{font-size:12px;}
`;
    document.head.appendChild(style);
  }

  function removeDevelopmentBadge() {
    document.querySelectorAll('.calcTileText .calcDevBadge').forEach((badge) => {
      const parent = badge.closest('.calcTileText');
      if (parent && /Brusy/i.test(parent.textContent || '')) badge.remove();
    });
  }

  function removeAdminSideWarning() {
    document.querySelectorAll('.adminBrusFhbCalibration .brus157AdminWarning, .adminBrusFhbCalibration .brus157AdminProgramHint').forEach((node) => node.remove());
  }

  function cleanResultText() {
    document.querySelectorAll('#korekce-brusy .brus157Meta').forEach((meta) => {
      const phrase = ' · hodnota už je v pásmu, ale korekce ji posune blíž středu';
      if ((meta.textContent || '').includes(phrase)) meta.textContent = (meta.textContent || '').replace(phrase, '');
    });
  }

  function clearSuppressedUpdatePrompt() {
    try {
      sessionStorage.removeItem('rotace_sw_update_notice_v1');
      sessionStorage.removeItem('rotace_sw_update_pending_v1');
      localStorage.removeItem('rotace_sw_update_suppress_v1');
    } catch (_) {}
  }

  async function probeDevelopmentUpdate(source) {
    try {
      if (!('serviceWorker' in navigator) || !navigator.onLine) return false;
      const registration = await navigator.serviceWorker.getRegistration('./');
      if (!registration) return false;
      if (typeof registration.update === 'function') await registration.update();
      if (!registration.waiting) return false;
      clearSuppressedUpdatePrompt();
      window.__RAK_DEV_WAITING_SW = true;
      if (typeof window.__rotaceForcePwaUpdateCheck === 'function') {
        try { await window.__rotaceForcePwaUpdateCheck('dev-probe:' + String(source || 'boot')); } catch (_) {}
      }
      return true;
    } catch (_) { return false; }
  }

  window.addEventListener('click', (event) => {
    const calc = event.target && event.target.closest ? event.target.closest('#brus157Evaluate') : null;
    if (calc) {
      event.preventDefault();
      event.stopImmediatePropagation();
      evaluateCalculator();
      return;
    }
    const admin = event.target && event.target.closest ? event.target.closest('[data-brus1594-action]') : null;
    if (!admin) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    Promise.resolve(handleAdminAction(admin)).catch((err) => {
      console.error('Brus FHB indexed admin action failed', err);
      const status = document.getElementById('adminOnlineSaveStatus');
      if (status) status.textContent = 'Uložení kalibrace brusů selhalo.';
      try { alert(err && err.message ? err.message : 'Uložení kalibrace brusů selhalo.'); } catch (_) {}
    });
  }, true);

  window.buildAdminBrusFhbCorrectionHtml = buildAdminHtml;
  window.getBrusFhbCorrectionCalibrationSettings = getSettings;
  window.getBrusFhbCorrectionSensitivity = function getBrusFhbCorrectionSensitivityIndexed(machine, arg2, arg3, arg4) {
    // nový tvar: (machine, index, side, spindle); starý tvar: (machine, side, spindle)
    if (INDEXES.includes(String(arg2 || '').toUpperCase())) return sensitivity(machine, arg2, arg3, arg4);
    return sensitivity(machine, 'AD', arg2, arg3);
  };
  window.calculateBrusFhbCorrection = function calculateBrusFhbCorrectionIndexed(machine, index, side, measured, spindle) {
    const targets = kpoTargets();
    const safeMachine = MACHINES.includes(String(machine || '').toUpperCase()) ? String(machine).toUpperCase() : 'TBKR01';
    const safeIndex = INDEXES.includes(String(index || '').toUpperCase()) ? String(index).toUpperCase() : 'AD';
    const safeSide = String(side || '').toLowerCase() === 'right' ? 'right' : 'left';
    const safeSpindle = SPINDLES.includes(String(spindle || '').toUpperCase()) ? String(spindle).toUpperCase() : 'C1';
    const spec = targets[safeIndex][safeSide];
    const result = chooseCenterCorrection(num(measured), spec.target, spec.tolerance, sensitivity(safeMachine, safeIndex, safeSide, safeSpindle));
    return Object.assign({}, result, { measurementSide: safeSide, programSide: programSide(safeSide), spindle: safeSpindle, index: safeIndex, target: spec.target, tolerance: spec.tolerance, strategy: 'center-indexed' });
  };

  try { window.RAK_BRUS_FHB_CALIBRATION_BUILD = BUILD; } catch (_) {}
  installStyles();
  removeDevelopmentBadge();
  removeAdminSideWarning();
  upgradeAdminRoot();
  cleanResultText();
  void probeDevelopmentUpdate('module-load');
  window.setTimeout(() => { void probeDevelopmentUpdate('after-boot'); }, 1400);

  let observerScheduled = false;
  const observer = new MutationObserver((records) => {
    const relevant = Array.from(records || []).some((record) => {
      const target = record && record.target;
      try {
        if (target && target.nodeType === 1 && target.closest && target.closest('#kalkulacky, #korekce-brusy, #appMenuBody, .adminBrusFhbCalibration')) return true;
        return Array.from(record && record.addedNodes || []).some((node) => node && node.nodeType === 1 && (
          (node.matches && node.matches('#kalkulacky, #korekce-brusy, #appMenuBody, .adminBrusFhbCalibration, .calcTileText'))
          || !!(node.querySelector && node.querySelector('#kalkulacky, #korekce-brusy, #appMenuBody, .adminBrusFhbCalibration, .calcTileText'))
        ));
      } catch (err) { return false; }
    });
    if (!relevant || observerScheduled) return;
    observerScheduled = true;
    const run = () => {
      observerScheduled = false;
      removeDevelopmentBadge();
      removeAdminSideWarning();
      upgradeAdminRoot();
      cleanResultText();
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    else setTimeout(run, 0);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
