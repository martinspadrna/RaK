// RaK 1.5.93 – Brusy / FHB korekce + admin kalibrace; párové zadání obou vřeten v jednom měření.
(function installBrusFhbCorrection() {
  'use strict';

  const SETTINGS_KEY = 'BRUS_FHB_CORRECTION_CALIBRATION_SETTINGS';
  const CATEGORY = 'brus_fhb_correction_calibration_settings';
  const MIN_SAMPLES = 3;
  const MAX_RECORDS = 80;
  const MACHINES = ['TBKR01', 'TBKR07'];
  const SIDES = ['left', 'right'];
  const DEFAULT_MODEL = Object.freeze({ left: 2.0, right: 1.5 });

  const KPO_TARGETS = Object.freeze({
    AD: Object.freeze({
      left: Object.freeze({ target: 17, tolerance: 3, kpo: 'Zpět / Schub' }),
      right: Object.freeze({ target: 7, tolerance: 5, kpo: 'Tah / Zug' })
    }),
    AE: Object.freeze({
      left: Object.freeze({ target: 10, tolerance: 3, kpo: 'Zpět / Schub' }),
      right: Object.freeze({ target: 7, tolerance: 5, kpo: 'Tah / Zug' })
    }),
    AH: Object.freeze({
      left: Object.freeze({ target: 10, tolerance: 3, kpo: 'Zpět / Schub' }),
      right: Object.freeze({ target: 5, tolerance: 3, kpo: 'Tah / Zug' })
    })
  });

  function esc(value) {
    if (typeof escapeHtml === 'function') return escapeHtml(String(value == null ? '' : value));
    return String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function num(value) {
    const parsed = Number(String(value == null ? '' : value).trim().replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  function fmt(value, digits) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return n.toLocaleString('cs-CZ', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function signed(value, digits) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    if (Math.abs(n) < Math.pow(10, -(digits || 0)) / 2) return '0';
    return (n > 0 ? '+' : '') + fmt(n, digits || 0);
  }

  function json(row) {
    if (row && row.settings_json && typeof row.settings_json === 'object') return row.settings_json;
    try { return row && row.settings_json ? JSON.parse(String(row.settings_json)) : {}; } catch (err) { return {}; }
  }

  function isSettingsRow(row) {
    const data = json(row);
    return String(row && row.category || '') === CATEGORY
      || String(row && row.machine_key || '') === SETTINGS_KEY
      || String(data.stored_category || '') === CATEGORY
      || String(data.admin_settings_key || '') === SETTINGS_KEY;
  }

  function defaultModels() {
    return {
      TBKR01: { left: DEFAULT_MODEL.left, right: DEFAULT_MODEL.right },
      TBKR07: { left: DEFAULT_MODEL.left, right: DEFAULT_MODEL.right }
    };
  }

  function cleanModels(source) {
    const raw = source && typeof source === 'object' ? source : {};
    const models = defaultModels();
    MACHINES.forEach((machine) => {
      SIDES.forEach((side) => {
        const candidate = num(raw[machine] && raw[machine][side]);
        if (Number.isFinite(candidate) && candidate >= 0.25 && candidate <= 8) models[machine][side] = candidate;
      });
    });
    return models;
  }

  function cleanRecord(source) {
    const row = source && typeof source === 'object' ? source : {};
    const machine = MACHINES.includes(String(row.machine || '').toUpperCase()) ? String(row.machine).toUpperCase() : '';
    const index = Object.prototype.hasOwnProperty.call(KPO_TARGETS, String(row.index || '').toUpperCase()) ? String(row.index).toUpperCase() : '';
    const side = SIDES.includes(String(row.side || '').toLowerCase()) ? String(row.side).toLowerCase() : '';
    const c = /^(C1|C2)$/i.test(String(row.c || '').trim()) ? String(row.c).toUpperCase() : 'C1';
    const before = num(row.before);
    const correction = num(row.correction);
    const after = num(row.after);
    if (!machine || !index || !side || ![before, correction, after].every(Number.isFinite)) return null;
    if (Math.abs(correction) < 0.0001 || Math.abs(correction) > 20) return null;
    if (Math.abs(before) > 100 || Math.abs(after) > 100) return null;
    return {
      id: String(row.id || (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8))).slice(0, 48),
      batchId: String(row.batchId || '').trim().slice(0, 48),
      at: String(row.at || new Date().toISOString()).slice(0, 40),
      machine,
      index,
      c,
      side,
      before,
      correction,
      after,
      note: String(row.note || '').trim().slice(0, 160)
    };
  }

  function normalize(source) {
    const raw = source && typeof source === 'object' ? source : {};
    const records = (Array.isArray(raw.records) ? raw.records : []).map(cleanRecord).filter(Boolean).slice(0, MAX_RECORDS);
    return { type: CATEGORY, activeModels: cleanModels(raw.activeModels), records };
  }

  function getSettings() {
    const rows = typeof app !== 'undefined' && app && Array.isArray(app.machineSettingsRows) ? app.machineSettingsRows : [];
    const row = rows.find(isSettingsRow);
    return normalize(row ? json(row) : null);
  }

  function median(values) {
    const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
    if (!sorted.length) return NaN;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function derive(settings) {
    const safe = normalize(settings);
    const samples = {};
    const proposed = cleanModels(safe.activeModels);
    const ready = {};
    MACHINES.forEach((machine) => {
      samples[machine] = { left: [], right: [] };
      ready[machine] = { left: false, right: false };
    });

    safe.records.forEach((row) => {
      const rate = (row.before - row.after) / row.correction;
      if (Number.isFinite(rate) && rate >= 0.25 && rate <= 8) samples[row.machine][row.side].push(rate);
    });

    const medians = {};
    const changes = [];
    MACHINES.forEach((machine) => {
      medians[machine] = {};
      SIDES.forEach((side) => {
        const m = median(samples[machine][side]);
        medians[machine][side] = m;
        ready[machine][side] = samples[machine][side].length >= MIN_SAMPLES;
        if (ready[machine][side] && Number.isFinite(m)) {
          proposed[machine][side] = m;
          if (Math.abs(m - safe.activeModels[machine][side]) >= 0.10) changes.push(machine + ':' + side);
        }
      });
    });
    return { samples, medians, ready, proposed, changes };
  }

  function makeRow(settings) {
    const safe = normalize(settings);
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
    try {
      if (window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.loadMachineSettings === 'function') {
        const rows = await window.RotationSupabaseBridge.loadMachineSettings();
        if (Array.isArray(rows) && typeof app !== 'undefined' && app) app.machineSettingsRows = rows;
      }
    } catch (err) {
      console.warn('Brus FHB calibration preload failed', err);
    }
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

  function sensitivity(machine, side) {
    const settings = getSettings();
    return Number(settings.activeModels[machine] && settings.activeModels[machine][side]) || DEFAULT_MODEL[side];
  }

  function chooseCorrection(measured, target, tolerance, rate) {
    const min = target - tolerance;
    const max = target + tolerance;
    if (measured >= min && measured <= max) return { correction: 0, predicted: measured, min, max, inTolerance: true };

    let best = null;
    for (let correction = -20; correction <= 20; correction += 1) {
      const predicted = measured - correction * rate;
      const inside = predicted >= min - 1e-9 && predicted <= max + 1e-9;
      const bandDistance = inside ? 0 : (predicted < min ? min - predicted : predicted - max);
      const centerDistance = Math.abs(predicted - target);
      const candidate = { correction, predicted, inside, bandDistance, centerDistance };
      if (!best
        || (candidate.inside && !best.inside)
        || (candidate.inside === best.inside && Math.abs(candidate.correction) < Math.abs(best.correction))
        || (candidate.inside === best.inside && Math.abs(candidate.correction) === Math.abs(best.correction) && candidate.bandDistance < best.bandDistance)
        || (candidate.inside === best.inside && Math.abs(candidate.correction) === Math.abs(best.correction) && Math.abs(candidate.bandDistance - best.bandDistance) < 1e-9 && candidate.centerDistance < best.centerDistance)) {
        best = candidate;
      }
    }
    return { correction: best ? best.correction : 0, predicted: best ? best.predicted : measured, min, max, inTolerance: false };
  }

  function selectedValue(name, fallback) {
    const el = document.querySelector('#korekce-brusy [data-brus-fhb-select="' + name + '"] .brusFhbChoice.isActive');
    return String(el && el.dataset.value || fallback || '');
  }

  function targetSummary(index) {
    const t = KPO_TARGETS[index] || KPO_TARGETS.AD;
    return '<div class="brusFhbKpoSide"><span>Vlevo · ' + esc(t.left.kpo) + '</span><b>' + esc(String(t.left.target)) + ' ± ' + esc(String(t.left.tolerance)) + ' µm</b></div>' +
      '<div class="brusFhbKpoSide"><span>Vpravo · ' + esc(t.right.kpo) + '</span><b>' + esc(String(t.right.target)) + ' ± ' + esc(String(t.right.tolerance)) + ' µm</b></div>';
  }

  function updateKpoSummary() {
    const index = selectedValue('index', 'AD');
    const target = document.getElementById('brusFhbKpoTarget');
    if (target) target.innerHTML = targetSummary(index);
  }

  function resultSideHtml(label, measured, spec, rate) {
    if (!Number.isFinite(measured)) return '';
    const choice = chooseCorrection(measured, spec.target, spec.tolerance, rate);
    const corr = choice.correction;
    const status = corr === 0 ? 'Bez korekce' : ('Korekce ' + signed(corr, 0) + ' µm');
    const direction = corr > 0 ? '← spodek čáry doleva' : (corr < 0 ? 'spodek čáry doprava →' : 'hodnota je v doporučeném pásmu');
    return [
      '<div class="brusFhbResultSide' + (corr === 0 ? ' isOk' : '') + '">',
      '  <div class="brusFhbResultHead"><span>' + esc(label) + '</span><b>' + esc(status) + '</b></div>',
      '  <div class="brusFhbResultDirection">' + esc(direction) + '</div>',
      '  <div class="brusFhbResultMeta">Naměřeno <b>' + esc(fmt(measured, 0)) + '</b> · KPO <b>' + esc(String(spec.target)) + ' ± ' + esc(String(spec.tolerance)) + '</b> · odhad po korekci <b>' + esc(fmt(choice.predicted, 1)) + '</b></div>',
      '  <div class="brusFhbResultMeta">Citlivost kalkulačky: ' + esc(fmt(rate, 2)) + ' µm FHB / 1 µm korekce</div>',
      '</div>'
    ].join('');
  }

  function evaluate() {
    const machine = selectedValue('machine', 'TBKR01');
    const index = selectedValue('index', 'AD');
    const c = selectedValue('c', 'C1');
    const left = num(document.getElementById('brus_fhb_left')?.value);
    const right = num(document.getElementById('brus_fhb_right')?.value);
    const out = document.getElementById('brusFhbResult');
    if (!out) return;
    if (!Number.isFinite(left) && !Number.isFinite(right)) {
      out.innerHTML = '<div class="smallText">Zadej FHB vlevo, vpravo, nebo obě hodnoty.</div>';
      return;
    }
    const target = KPO_TARGETS[index] || KPO_TARGETS.AD;
    const leftRate = sensitivity(machine, 'left');
    const rightRate = sensitivity(machine, 'right');
    out.innerHTML = [
      '<div class="brusFhbResultTitle">' + esc(machine + ' · ' + index + ' · ' + c) + '</div>',
      resultSideHtml('FHB vlevo', left, target.left, leftRate),
      resultSideHtml('FHB vpravo', right, target.right, rightRate),
      '<div class="brusFhbResultFoot">Výpočet volí nejmenší celou korekci, která má podle aktuální kalibrace dostat FHB do doporučeného pásma KPO.</div>'
    ].join('');
  }

  function toggleSignedInput(input, button) {
    if (!input) return;
    let raw = String(input.value || '').trim().replace(/[−–—]/g, '-');
    if (raw.startsWith('-')) raw = raw.replace(/^-+/, '');
    else if (raw.startsWith('+')) raw = '-' + raw.slice(1);
    else raw = raw ? '-' + raw : '-';
    input.value = raw;
    const negative = raw.startsWith('-');
    if (button) {
      button.textContent = negative ? '−' : '+';
      button.classList.toggle('isNegative', negative);
      button.setAttribute('aria-pressed', negative ? 'true' : 'false');
    }
    try { input.focus({ preventScroll: true }); if (input.setSelectionRange) input.setSelectionRange(raw.length, raw.length); } catch (_) {}
  }

  function choiceGroup(name, values, active) {
    return '<div class="brusFhbChoiceGroup" data-brus-fhb-select="' + esc(name) + '">' + values.map((value) =>
      '<button type="button" class="brusFhbChoice' + (value === active ? ' isActive' : '') + '" data-value="' + esc(value) + '">' + esc(value) + '</button>'
    ).join('') + '</div>';
  }

  function installCalculatorUi() {
    const page = document.getElementById('korekce-brusy');
    if (!page || page.dataset.brusFhbInstalled === '1') return;
    page.dataset.brusFhbInstalled = '1';
    const header = page.querySelector(':scope > .headerBar');
    Array.from(page.children).forEach((child) => { if (child !== header) child.remove(); });
    const reset = header && header.querySelector('.resetBtn');
    if (reset) {
      reset.setAttribute('data-reset-fields', 'brus_fhb_left,brus_fhb_right');
      reset.setAttribute('data-reset-results', 'brusFhbResult');
    }
    const root = document.createElement('div');
    root.className = 'brusFhbCalcRoot';
    root.innerHTML = [
      '<div class="card brusFhbCalcCard">',
      '  <div class="brusFhbIntro"><b>FHB · korekce brusu</b><span>Zadej hodnoty z protokolu. KPO cíle se doplní podle indexu.</span></div>',
      '  <div class="brusFhbField"><span>Stroj</span>' + choiceGroup('machine', MACHINES, 'TBKR01') + '</div>',
      '  <div class="brusFhbField"><span>Index</span>' + choiceGroup('index', Object.keys(KPO_TARGETS), 'AD') + '</div>',
      '  <div class="brusFhbField"><span>Měření</span>' + choiceGroup('c', ['C1', 'C2'], 'C1') + '</div>',
      '  <div class="brusFhbKpo" id="brusFhbKpoTarget">' + targetSummary('AD') + '</div>',
      '  <div class="brusFhbInputs">',
      '    <label><span>FHB vlevo</span><div class="calcSignedInput brusFhbSignedInput"><button type="button" class="calcSignToggle" data-brus-fhb-sign-target="brus_fhb_left" aria-label="Přepnout znaménko FHB vlevo">+</button><input id="brus_fhb_left" type="text" inputmode="decimal" autocomplete="off" placeholder="např. 21"></div></label>',
      '    <label><span>FHB vpravo</span><div class="calcSignedInput brusFhbSignedInput"><button type="button" class="calcSignToggle" data-brus-fhb-sign-target="brus_fhb_right" aria-label="Přepnout znaménko FHB vpravo">+</button><input id="brus_fhb_right" type="text" inputmode="decimal" autocomplete="off" placeholder="např. 15"></div></label>',
      '  </div>',
      '  <button type="button" class="calcPrimaryBtn calcCorrectionPrimaryBtn" id="brusFhbEvaluate">Vyhodnotit</button>',
      '  <div class="card calcResultCard calcCorrectionResultCard brusFhbResult" id="brusFhbResult"></div>',
      '</div>'
    ].join('');
    page.appendChild(root);
  }

  function recordDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function modelMetricHtml(machine, side, settings, analysis) {
    const current = settings.activeModels[machine][side];
    const values = analysis.samples[machine][side];
    const proposed = analysis.medians[machine][side];
    const isReady = analysis.ready[machine][side];
    const label = side === 'left' ? 'levé vřeteno' : 'pravé vřeteno';
    const state = isReady ? (Math.abs(proposed - current) >= 0.10 ? 'doporučení ' + fmt(proposed, 2) : 'potvrzeno') : ('chybí ' + Math.max(0, MIN_SAMPLES - values.length) + ' vz.');
    return '<div class="adminBrusFhbMetric"><span>' + esc(machine + ' · ' + label) + '</span><b>' + esc(fmt(current, 2)) + '</b><small>' + esc(values.length + '/' + MIN_SAMPLES + ' · ' + state) + '</small></div>';
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

  function historyGroupHtml(group) {
    const rows = Array.isArray(group) ? group.filter(Boolean) : [];
    if (!rows.length) return '';
    const first = rows[0];
    const left = rows.find((row) => row.side === 'left');
    const right = rows.find((row) => row.side === 'right');
    const isPair = !!(first.batchId && left && right);
    if (isPair) {
      const leftRate = (left.before - left.after) / left.correction;
      const rightRate = (right.before - right.after) / right.correction;
      return '<div class="adminBrusFhbRecord">' +
        '<div><b>' + esc(recordDate(first.at) + ' · ' + first.machine + ' · ' + first.index) + '</b><span>' +
          esc('Před L/P ' + left.before + ' / ' + right.before + ' → po ' + left.after + ' / ' + right.after + ' · korekce ' + signed(first.correction, 0) + ' µm') +
        '</span></div>' +
        '<small>odezva L/P ' + esc(fmt(leftRate, 2) + ' / ' + fmt(rightRate, 2)) + ' µm FHB/µm' + (first.note ? (' · ' + esc(first.note)) : '') + '</small>' +
        '<button type="button" class="appMenuInlineClearBtn" data-brus-fhb-cal-action="remove" data-batch-id="' + esc(first.batchId) + '" aria-label="Smazat záznam obou vřeten">×</button>' +
        '</div>';
    }
    const row = first;
    const rate = (row.before - row.after) / row.correction;
    return '<div class="adminBrusFhbRecord">' +
      '<div><b>' + esc(recordDate(row.at) + ' · ' + row.machine + ' · ' + row.index + ' · ' + row.c + ' · ' + (row.side === 'left' ? 'L' : 'P')) + '</b><span>' + esc(row.before + ' → ' + row.after + ' · korekce ' + signed(row.correction, 0) + ' µm') + '</span></div>' +
      '<small>odezva ' + esc(fmt(rate, 2)) + ' µm FHB/µm' + (row.note ? (' · ' + esc(row.note)) : '') + '</small>' +
      '<button type="button" class="appMenuInlineClearBtn" data-brus-fhb-cal-action="remove" data-record-id="' + esc(row.id) + '" aria-label="Smazat záznam">×</button>' +
      '</div>';
  }

  function buildAdminHtml() {
    const settings = getSettings();
    const analysis = derive(settings);
    const groups = historyGroups(settings.records).slice(0, 24);
    const recordsHtml = groups.length
      ? groups.map(historyGroupHtml).join('')
      : '<div class="smallText">Zatím nejsou žádná měření brusů. Aktivní výchozí model je pro levé vřeteno 2,00 a pro pravé 1,50 µm FHB na 1 µm korekce.</div>';

    return [
      '<div class="adminBrusFhbCalibration" data-rak-brusy-real-section="1">',
      '<div class="appMenuSubTitle">Brusy · FHB</div>',
      '<div class="smallText">Vyber brus a index. Zapiš FHB na obou vřetenech před korekcí, skutečnou korekci ve stroji a hodnoty po korekci. Jedním uložením se zapíšou oba kalibrační vzorky.</div>',
      '<div class="adminBrusFhbForm adminFhbCalibrationForm">',
      '<div class="adminFhbCalibrationTwo">',
      '<label>Stroj<select class="appMenuSelect" data-brus-fhb-cal-field="machine"><option>TBKR01</option><option>TBKR07</option></select></label>',
      '<label>Index<select class="appMenuSelect" data-brus-fhb-cal-field="index"><option>AD</option><option>AE</option><option>AH</option></select></label>',
      '</div>',
      '<div class="adminFhbCalibrationFieldset"><b>Před korekcí</b><div class="adminFhbCalibrationTwo">',
      '<label>L<input class="appMenuInput" inputmode="decimal" data-brus-fhb-cal-field="beforeLeft" placeholder="levé vřeteno"></label>',
      '<label>P<input class="appMenuInput" inputmode="decimal" data-brus-fhb-cal-field="beforeRight" placeholder="pravé vřeteno"></label>',
      '</div></div>',
      '<div class="adminFhbCalibrationFieldset"><b>Provedená korekce</b>',
      '<label>Korekce [µm]<div class="calcSignedInput adminCorrectionSignedInput"><button type="button" class="calcSignToggle" data-brus-fhb-sign-target="admin_brus_fhb_correction" aria-label="Přepnout znaménko korekce brusů">+</button><input id="admin_brus_fhb_correction" class="appMenuInput" inputmode="decimal" data-brus-fhb-cal-field="correction" placeholder="např. 2"></div></label>',
      '</div>',
      '<div class="adminFhbCalibrationFieldset"><b>Po korekci</b><div class="adminFhbCalibrationTwo">',
      '<label>L<input class="appMenuInput" inputmode="decimal" data-brus-fhb-cal-field="afterLeft" placeholder="levé vřeteno"></label>',
      '<label>P<input class="appMenuInput" inputmode="decimal" data-brus-fhb-cal-field="afterRight" placeholder="pravé vřeteno"></label>',
      '</div></div>',
      '<label class="adminFhbCalibrationNote">Poznámka<input class="appMenuInput" maxlength="160" data-brus-fhb-cal-field="note" placeholder="volitelné"></label>',
      '<button type="button" class="appMenuAction isActive" data-brus-fhb-cal-action="save">Uložit obě vřetena</button>',
      '</div>',
      '<div class="adminBrusFhbModel"><div class="appMenuCardTitle">Aktivní citlivost kalkulačky</div>',
      '<div class="smallText">Číslo říká, o kolik µm se typicky změní FHB při korekci stroje o 1 µm. Pro změnu potřebujeme nejméně tři použitelné záznamy pro daný brus a každé vřeteno.</div>',
      '<div class="adminBrusFhbMetrics">' + MACHINES.flatMap((machine) => SIDES.map((side) => modelMetricHtml(machine, side, settings, analysis))).join('') + '</div>',
      '<button type="button" class="appMenuAction" data-brus-fhb-cal-action="apply"' + (analysis.changes.length ? '' : ' disabled') + '>Potvrdit doporučené nastavení brusů</button>',
      '</div>',
      '<div class="adminBrusFhbHistory"><div class="appMenuCardTitle">Měření brusů</div>' + recordsHtml + '</div>',
      '</div>'
    ].join('');
  }

  function adminField(root, name) {
    return root.querySelector('[data-brus-fhb-cal-field="' + name + '"]')?.value || '';
  }

  function readAdminRecords() {
    const root = document.querySelector('.adminBrusFhbCalibration');
    if (!root) return null;
    const machine = adminField(root, 'machine');
    const index = adminField(root, 'index');
    const correction = adminField(root, 'correction');
    const note = adminField(root, 'note');
    const at = new Date().toISOString();
    const batchId = 'pair-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    const left = cleanRecord({
      machine,
      index,
      c: 'C1',
      side: 'left',
      before: adminField(root, 'beforeLeft'),
      correction,
      after: adminField(root, 'afterLeft'),
      note,
      at,
      batchId
    });
    const right = cleanRecord({
      machine,
      index,
      c: 'C2',
      side: 'right',
      before: adminField(root, 'beforeRight'),
      correction,
      after: adminField(root, 'afterRight'),
      note,
      at,
      batchId
    });
    return left && right ? { records: [left, right], batchId } : null;
  }

  async function handleAdminAction(button) {
    const action = String(button.dataset.brusFhbCalAction || '');
    const status = document.getElementById('adminOnlineSaveStatus');
    if (action === 'save') {
      const pair = readAdminRecords();
      if (!pair) throw new Error('Doplň brus, index, FHB na obou vřetenech před i po korekci a nenulovou korekci.');
      if (status) status.textContent = 'Ukládám měření obou vřeten…';
      await refreshSettingsOnline();
      const settings = getSettings();
      settings.records = pair.records.concat(settings.records).slice(0, MAX_RECORDS);
      await persistSettings(settings);
      if (typeof openAppMenu === 'function') openAppMenu('admin-correction-settings');
      const next = document.getElementById('adminOnlineSaveStatus');
      if (next) next.textContent = 'Měření obou vřeten uložené online ✓';
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

  function installStyles() {
    if (document.getElementById('brus-fhb-correction-styles')) return;
    const style = document.createElement('style');
    style.id = 'brus-fhb-correction-styles';
    style.textContent = `
#korekce-brusy .brusFhbCalcRoot{max-width:720px;margin:0 auto;padding:10px 12px calc(96px + env(safe-area-inset-bottom));box-sizing:border-box}
#korekce-brusy .brusFhbCalcCard{display:flex;flex-direction:column;gap:12px;padding:14px!important}
#korekce-brusy .brusFhbIntro{display:flex;flex-direction:column;gap:3px}
#korekce-brusy .brusFhbIntro>b{font-size:20px;color:var(--green2,#a8ff61)}
#korekce-brusy .brusFhbIntro>span,.brusFhbField>span{font-size:12px;color:rgba(232,245,255,.72)}
#korekce-brusy .brusFhbField{display:flex;flex-direction:column;gap:6px}
#korekce-brusy .brusFhbChoiceGroup{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:7px}
#korekce-brusy .brusFhbChoice{min-height:46px;border:1px solid rgba(180,255,190,.28);border-radius:14px;background:rgba(7,25,45,.56);color:#edf7ff;font-weight:850;font-size:15px}
#korekce-brusy .brusFhbChoice.isActive{border-color:rgba(169,255,99,.78);background:linear-gradient(135deg,rgba(62,135,72,.60),rgba(38,72,136,.56));color:var(--green2,#b7ff68);box-shadow:0 0 18px rgba(115,255,100,.12)}
#korekce-brusy .brusFhbKpo{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#korekce-brusy .brusFhbKpoSide{display:flex;flex-direction:column;gap:3px;padding:10px 11px;border:1px solid rgba(160,210,255,.22);border-radius:14px;background:rgba(4,18,39,.48)}
#korekce-brusy .brusFhbKpoSide span{font-size:11px;color:rgba(232,245,255,.68)}
#korekce-brusy .brusFhbKpoSide b{font-size:16px;color:#effcff}
#korekce-brusy .brusFhbInputs{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#korekce-brusy .brusFhbInputs label{display:flex;flex-direction:column;gap:5px;font-weight:800;font-size:13px}
#korekce-brusy .brusFhbInputs input{width:100%;min-height:54px;border-radius:15px;border:1px solid rgba(180,255,190,.30);background:rgba(4,16,36,.68);color:#fff;font:900 22px/1 system-ui;text-align:center;box-sizing:border-box;padding:8px}
#korekce-brusy .brusFhbSignedInput,.adminFhbCalibration .adminCorrectionSignedInput,.adminBrusFhbCalibration .adminCorrectionSignedInput{display:grid!important;grid-template-columns:48px minmax(0,1fr)!important;align-items:stretch!important;gap:7px!important;width:100%!important;min-width:0!important}
#korekce-brusy .brusFhbSignedInput .calcSignToggle,.adminFhbCalibration .adminCorrectionSignedInput .calcSignToggle,.adminBrusFhbCalibration .adminCorrectionSignedInput .calcSignToggle{display:grid!important;place-items:center!important;position:static!important;visibility:visible!important;opacity:1!important;width:48px!important;min-width:48px!important;min-height:48px!important;margin:0!important;padding:0!important;border:1px solid rgba(180,255,190,.34)!important;border-radius:14px!important;background:rgba(16,54,55,.78)!important;color:#dffff0!important;font:900 24px/1 system-ui!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.08)!important;appearance:none!important;-webkit-appearance:none!important}
#korekce-brusy .brusFhbSignedInput .calcSignToggle.isNegative,.adminFhbCalibration .adminCorrectionSignedInput .calcSignToggle.isNegative,.adminBrusFhbCalibration .adminCorrectionSignedInput .calcSignToggle.isNegative{border-color:rgba(255,196,116,.5)!important;background:rgba(83,47,17,.72)!important;color:#ffe1a5!important}
#korekce-brusy .brusFhbSignedInput input,.adminFhbCalibration .adminCorrectionSignedInput input,.adminBrusFhbCalibration .adminCorrectionSignedInput input{width:100%!important;min-width:0!important;max-width:100%!important;box-sizing:border-box!important}
#korekce-brusy .brusFhbSignedInput .calcSignToggle{height:54px!important}
.adminFhbCalibration .adminCorrectionSignedInput .calcSignToggle,.adminBrusFhbCalibration .adminCorrectionSignedInput .calcSignToggle{height:44px!important;min-height:44px!important}
#korekce-brusy .brusFhbResult{display:flex;flex-direction:column;gap:9px;min-height:0!important}
#korekce-brusy .brusFhbResult:empty{display:none}
#korekce-brusy .brusFhbResultTitle{font-weight:900;font-size:14px;color:rgba(232,245,255,.78)}
#korekce-brusy .brusFhbResultSide{padding:11px;border-radius:15px;border:1px solid rgba(255,222,92,.30);background:rgba(42,29,3,.28)}
#korekce-brusy .brusFhbResultSide.isOk{border-color:rgba(118,255,120,.35);background:rgba(18,70,31,.22)}
#korekce-brusy .brusFhbResultHead{display:flex;align-items:center;justify-content:space-between;gap:8px}
#korekce-brusy .brusFhbResultHead span{font-weight:800}#korekce-brusy .brusFhbResultHead b{font-size:19px;color:#fff67c}
#korekce-brusy .brusFhbResultSide.isOk .brusFhbResultHead b{color:var(--green2,#aaff67)}
#korekce-brusy .brusFhbResultDirection{font-weight:900;font-size:15px;margin-top:4px;color:#dff7ff}
#korekce-brusy .brusFhbResultMeta,#korekce-brusy .brusFhbResultFoot{font-size:11px;line-height:1.35;color:rgba(232,245,255,.72);margin-top:4px}
.adminBrusFhbCalibration{margin-top:16px;padding-top:14px;border-top:1px solid rgba(180,255,190,.18);display:flex;flex-direction:column;gap:12px}
.adminBrusFhbForm,.adminBrusFhbModel,.adminBrusFhbHistory{display:flex;flex-direction:column;gap:9px;padding:11px;border:1px solid rgba(180,255,190,.17);border-radius:14px;background:rgba(5,18,37,.35)}
.adminBrusFhbTwo{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
.adminBrusFhbForm label{display:flex;flex-direction:column;gap:4px;font-size:11px;color:rgba(232,245,255,.74)}
.adminBrusFhbMetrics{display:grid;grid-template-columns:1fr 1fr;gap:7px}.adminBrusFhbMetric{display:flex;flex-direction:column;gap:2px;padding:9px;border-radius:12px;background:rgba(5,22,42,.62);border:1px solid rgba(156,220,255,.15)}
.adminBrusFhbMetric span{font-size:11px;color:rgba(232,245,255,.70)}.adminBrusFhbMetric b{font-size:18px;color:var(--green2,#aaff67)}.adminBrusFhbMetric small{font-size:10px;color:rgba(232,245,255,.58)}
.adminBrusFhbRecord{position:relative;display:flex;flex-direction:column;gap:3px;padding:9px 34px 9px 9px;border-radius:11px;background:rgba(4,17,34,.58);border:1px solid rgba(160,210,255,.12)}
.adminBrusFhbRecord>div{display:flex;flex-direction:column;gap:2px}.adminBrusFhbRecord b{font-size:11px}.adminBrusFhbRecord span,.adminBrusFhbRecord small{font-size:10px;color:rgba(232,245,255,.68)}.adminBrusFhbRecord .appMenuInlineClearBtn{position:absolute;right:6px;top:50%;transform:translateY(-50%)}
@media(max-width:390px){.adminBrusFhbMetrics{grid-template-columns:1fr}.adminBrusFhbTwo{grid-template-columns:1fr 1fr}#korekce-brusy .brusFhbKpo{grid-template-columns:1fr 1fr}}
`;
    document.head.appendChild(style);
  }

  document.addEventListener('click', (event) => {
    const signButton = event.target && event.target.closest ? event.target.closest('[data-brus-fhb-sign-target]') : null;
    if (signButton) {
      event.preventDefault();
      event.stopPropagation();
      const input = document.getElementById(String(signButton.dataset.brusFhbSignTarget || ''));
      toggleSignedInput(input, signButton);
      if (input && input.closest('#korekce-brusy')) {
        const out = document.getElementById('brusFhbResult');
        if (out && String(out.innerHTML || '').trim()) evaluate();
      }
      return;
    }
    const choice = event.target && event.target.closest ? event.target.closest('#korekce-brusy .brusFhbChoice') : null;
    if (choice) {
      const group = choice.closest('.brusFhbChoiceGroup');
      if (group) group.querySelectorAll('.brusFhbChoice').forEach((btn) => btn.classList.toggle('isActive', btn === choice));
      if (group && group.dataset.brusFhbSelect === 'index') updateKpoSummary();
      const out = document.getElementById('brusFhbResult');
      if (out) out.innerHTML = '';
      return;
    }
    const evaluateButton = event.target && event.target.closest ? event.target.closest('#brusFhbEvaluate') : null;
    if (evaluateButton) {
      event.preventDefault();
      evaluate();
      return;
    }
    const adminButton = event.target && event.target.closest ? event.target.closest('[data-brus-fhb-cal-action]') : null;
    if (adminButton) {
      event.preventDefault();
      event.stopPropagation();
      Promise.resolve(handleAdminAction(adminButton)).catch((err) => {
        console.error('Brus FHB admin action failed', err);
        const status = document.getElementById('adminOnlineSaveStatus');
        if (status) status.textContent = 'Uložení kalibrace brusů selhalo.';
        try { alert(err && err.message ? err.message : 'Uložení kalibrace brusů selhalo.'); } catch (_) {}
      });
    }
  }, true);
  document.addEventListener('input', (event) => {
    const input = event.target && event.target.matches && event.target.matches('[data-brus-fhb-sign-input="1"],#brus_fhb_left,#brus_fhb_right,#admin_brus_fhb_correction') ? event.target : null;
    if (!input || !input.id) return;
    const button = document.querySelector('[data-brus-fhb-sign-target="' + input.id + '"]');
    if (!button) return;
    const negative = String(input.value || '').trim().replace(/[−–—]/g, '-').startsWith('-');
    button.textContent = negative ? '−' : '+';
    button.classList.toggle('isNegative', negative);
    button.setAttribute('aria-pressed', negative ? 'true' : 'false');
  }, true);

  window.buildAdminBrusFhbCorrectionHtml = buildAdminHtml;
  installStyles();
  installCalculatorUi();

  window.RAK_BRUS_FHB_KPO_TARGETS = KPO_TARGETS;
  window.getBrusFhbCorrectionCalibrationSettings = getSettings;
  window.getBrusFhbCorrectionSensitivity = sensitivity;
  window.calculateBrusFhbCorrection = function calculateBrusFhbCorrection(machine, index, side, measured) {
    const safeIndex = KPO_TARGETS[String(index || '').toUpperCase()] ? String(index).toUpperCase() : 'AD';
    const safeMachine = MACHINES.includes(String(machine || '').toUpperCase()) ? String(machine).toUpperCase() : 'TBKR01';
    const safeSide = side === 'right' ? 'right' : 'left';
    const spec = KPO_TARGETS[safeIndex][safeSide];
    return chooseCorrection(num(measured), spec.target, spec.tolerance, sensitivity(safeMachine, safeSide));
  };
})();
