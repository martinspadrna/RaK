// Ověřené doladění citlivosti výpočtu korekcí pro frézky / FHB.
// RaK 1.5.92: Frézky i Brusy mají vlastní nativní fold; skutečný Brusy FHB builder se skládá přímo při renderu, bez placeholderu a bez DOM přesouvání.
(function installAdminFhbCalibration() {
  'use strict';

  const KEY = 'FHB_CORRECTION_CALIBRATION_SETTINGS';
  const CATEGORY = 'fhb_correction_calibration_settings';
  const MAX_RECORDS = 60;
  const MIN_SAMPLES = 3;
  const DEFAULT_MODEL = Object.freeze({ taperDownSensitivityPer001: 1.8, taperUpSensitivityPer001: 1.45, shiftSensitivityPer001: 1.6 });

  function esc(value) { return typeof escapeHtml === 'function' ? escapeHtml(String(value == null ? '' : value)) : String(value == null ? '' : value); }
  function json(row) {
    if (row && row.settings_json && typeof row.settings_json === 'object') return row.settings_json;
    try { return row && row.settings_json ? JSON.parse(String(row.settings_json)) : {}; } catch (err) { return {}; }
  }
  function number(value) {
    const parsed = Number(String(value == null ? '' : value).trim().replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  function correction(value) {
    const parsed = number(value);
    return Number.isFinite(parsed) ? (Math.abs(parsed) >= 1 ? parsed / 1000 : parsed) : NaN;
  }
  function within(value, min, max) { return Number.isFinite(value) && value >= min && value <= max; }
  function cloneModel(value) {
    const source = value && typeof value === 'object' ? value : {};
    const clean = {};
    Object.keys(DEFAULT_MODEL).forEach((key) => {
      const candidate = number(source[key]);
      clean[key] = within(candidate, 0.2, 4) ? candidate : DEFAULT_MODEL[key];
    });
    return clean;
  }
  function isSettingsRow(row) {
    const data = json(row);
    return String(row && row.category || '') === CATEGORY
      || String(row && row.machine_key || '') === KEY
      || String(data.stored_category || '') === CATEGORY
      || String(data.admin_settings_key || '') === KEY;
  }
  function cleanRecord(source) {
    const row = source && typeof source === 'object' ? source : {};
    const protocolLeft = number(row.protocolLeft);
    const protocolRight = number(row.protocolRight);
    const resultLeft = number(row.resultLeft);
    const resultRight = number(row.resultRight);
    const taperRaw = String(row.taperDelta == null ? '' : row.taperDelta).trim();
    const shiftRaw = String(row.shiftDelta == null ? '' : row.shiftDelta).trim();
    const taperDelta = taperRaw ? correction(taperRaw) : 0;
    const shiftDelta = shiftRaw ? correction(shiftRaw) : 0;
    if (![protocolLeft, protocolRight, resultLeft, resultRight, taperDelta, shiftDelta].every(Number.isFinite)) return null;
    if (![protocolLeft, protocolRight, resultLeft, resultRight].every((value) => within(value, -1000, 1000))) return null;
    if (!within(taperDelta, -1, 1) || !within(shiftDelta, -1, 1)) return null;
    if (Math.abs(taperDelta) < 0.0000005 && Math.abs(shiftDelta) < 0.0000005) return null;
    return {
      id: String(row.id || (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8))).slice(0, 48),
      at: String(row.at || new Date().toISOString()).slice(0, 40),
      protocolLeft, protocolRight, resultLeft, resultRight, taperDelta, shiftDelta,
      note: String(row.note || '').trim().slice(0, 160)
    };
  }
  function normalize(source) {
    const raw = source && typeof source === 'object' ? source : {};
    const records = (Array.isArray(raw.records) ? raw.records : []).map(cleanRecord).filter(Boolean).slice(0, MAX_RECORDS);
    return { type: CATEGORY, activeModel: cloneModel(raw.activeModel), records };
  }
  function getSettings() {
    const rows = typeof app !== 'undefined' && app && Array.isArray(app.machineSettingsRows) ? app.machineSettingsRows : [];
    const row = rows.find(isSettingsRow);
    return normalize(row ? json(row) : null);
  }
  function median(values) {
    const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
    if (!sorted.length) return NaN;
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }
  function derive(settings) {
    const safe = normalize(settings);
    const samples = { taperUp: [], taperDown: [], shift: [] };
    safe.records.forEach((row) => {
      const beforeCenter = (row.protocolLeft + row.protocolRight) / 2;
      const afterCenter = (row.resultLeft + row.resultRight) / 2;
      const beforeSpread = row.protocolRight - row.protocolLeft;
      const afterSpread = row.resultRight - row.resultLeft;
      const taperOnly = Math.abs(row.taperDelta) >= 0.0005 && Math.abs(row.shiftDelta) < 0.0000005;
      const shiftOnly = Math.abs(row.shiftDelta) >= 0.0005 && Math.abs(row.taperDelta) < 0.0000005;
      if (taperOnly) {
        const rate = (afterSpread - beforeSpread) / (row.taperDelta / 0.001);
        if (within(rate, 0.2, 4)) (row.taperDelta > 0 ? samples.taperUp : samples.taperDown).push(rate);
      }
      if (shiftOnly) {
        const rate = (afterCenter - beforeCenter) / (row.shiftDelta / 0.001);
        if (within(rate, 0.2, 4)) samples.shift.push(rate);
      }
    });
    const proposed = cloneModel(safe.activeModel);
    const values = { taperUp: median(samples.taperUp), taperDown: median(samples.taperDown), shift: median(samples.shift) };
    if (samples.taperUp.length >= MIN_SAMPLES) proposed.taperUpSensitivityPer001 = values.taperUp;
    if (samples.taperDown.length >= MIN_SAMPLES) proposed.taperDownSensitivityPer001 = values.taperDown;
    if (samples.shift.length >= MIN_SAMPLES) proposed.shiftSensitivityPer001 = values.shift;
    const ready = {
      taperUp: samples.taperUp.length >= MIN_SAMPLES,
      taperDown: samples.taperDown.length >= MIN_SAMPLES,
      shift: samples.shift.length >= MIN_SAMPLES
    };
    const changes = Object.keys(proposed).filter((key) => Math.abs(proposed[key] - safe.activeModel[key]) >= 0.05);
    return { samples, values, ready, proposed, changes, usableRecords: samples.taperUp.length + samples.taperDown.length + samples.shift.length };
  }
  function addRecord(settings, record) {
    const next = normalize(settings);
    const clean = cleanRecord(record);
    if (!clean) return { ok: false, reason: 'invalid-record' };
    next.records = [clean].concat(next.records).slice(0, MAX_RECORDS);
    return { ok: true, settings: next };
  }
  function removeRecord(settings, id) {
    const next = normalize(settings);
    const key = String(id || '').trim();
    next.records = next.records.filter((row) => row.id !== key);
    return next;
  }
  function applyRecommendation(settings) {
    const next = normalize(settings);
    const analysis = derive(next);
    if (!analysis.changes.length) return { ok: false, reason: 'no-recommendation', settings: next, analysis };
    next.activeModel = cloneModel(analysis.proposed);
    return { ok: true, settings: next, analysis };
  }
  function makeRow(settings) {
    const safe = normalize(settings);
    return {
      machine_key: KEY, machine_code: 'FHB', machine_index: 'calibration', label: 'Doladění korekcí FHB', category: CATEGORY,
      cycle_time: '', speed: '', dress_time: '', dress_count: '',
      settings_json: Object.assign({ machine: 'FHB', index: 'calibration', stored_category: CATEGORY, admin_settings_key: KEY }, safe)
    };
  }
  function mergeRows(settings) {
    const rows = typeof app !== 'undefined' && app && Array.isArray(app.machineSettingsRows) ? app.machineSettingsRows : [];
    return rows.filter((row) => !isSettingsRow(row)).concat(makeRow(settings));
  }
  function correctionLabel(value) {
    return Number.isFinite(value) ? String(Math.round(value * 1000)) : '—';
  }
  function sensitivityLabel(value) { return Number.isFinite(value) ? value.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'; }
  function recordDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  function adminSignedField(field, id, placeholder, ariaLabel) {
    return '<div class="calcSignedInput adminCorrectionSignedInput"><button type="button" class="calcSignToggle" data-admin-correction-sign-target="' + esc(id) + '" aria-label="' + esc(ariaLabel) + '">+</button><input id="' + esc(id) + '" class="appMenuInput" data-fhb-calibration-field="' + esc(field) + '" data-admin-correction-sign-input="1" inputmode="decimal" placeholder="' + esc(placeholder) + '"></div>';
  }

  function recommendationRow(label, count, value, active, ready) {
    const status = ready ? (Math.abs(value - active) >= 0.05 ? 'doporučení připraveno' : 'potvrzeno') : ('chybí ' + String(Math.max(0, MIN_SAMPLES - count)) + ' záznam' + (MIN_SAMPLES - count === 1 ? '' : 'y'));
    return '<div class="adminFhbCalibrationMetric"><span>' + esc(label) + '</span><b>' + esc(sensitivityLabel(ready ? value : active)) + '</b><small>' + esc(String(count) + '/' + MIN_SAMPLES + ' · ' + status) + '</small></div>';
  }

  function buildHtml() {
    const settings = getSettings();
    const analysis = derive(settings);
    const recordsHtml = settings.records.length
      ? settings.records.map((row) => '<div class="adminFhbCalibrationRecord">' +
          '<div><b>' + esc(recordDate(row.at)) + '</b><span> Protokol L/P ' + esc(row.protocolLeft + ' / ' + row.protocolRight) + ' → výsledek ' + esc(row.resultLeft + ' / ' + row.resultRight) + '</span></div>' +
          '<small>Δ konicita ' + esc(correctionLabel(row.taperDelta)) + ' · Δ fhβ ' + esc(correctionLabel(row.shiftDelta)) + (row.note ? (' · ' + esc(row.note)) : '') + '</small>' +
          '<button type="button" class="appMenuInlineClearBtn" data-fhb-calibration-remove="' + esc(row.id) + '" aria-label="Smazat záznam">×</button>' +
        '</div>').join('')
      : '<div class="smallText">Zatím nejsou žádná měření. Pro spolehlivý návrh potřebuje každý směr alespoň tři čisté záznamy — vždy měň jen konicitu, nebo jen fhβ.</div>';
    const applyDisabled = analysis.changes.length ? '' : ' disabled';
    const brusyHtml = typeof window.buildAdminBrusFhbCorrectionHtml === 'function'
      ? String(window.buildAdminBrusFhbCorrectionHtml() || '')
      : '<div class="smallText" data-rak-brusy-builder-error="1">Nastavení brusů se nepodařilo načíst.</div>';
    return [
      '<div class="appMenuSettingsList adminFhbCalibration">',
      '<div class="smallText">Zapiš hodnoty z protokolu před korekcí, o kolik ses ve stroji pohnul, a výsledek po korekci. Korekce může být zapsaná jako <b>35</b> nebo <b>0,035</b>. Aplikace sama nic nemění: doporučení se promítne až tlačítkem níže.</div>',
      '<details class="rakCorrectionMachineFold" data-rak-correction-group="frezky">',
      '<summary><span>Frézky FHB · MFKF06 + MFKF10</span><small>měření, nastavení výpočtu a záznamy</small></summary>',
      '<div class="rakCorrectionMachineFoldBody">',
      '<div class="adminFhbCalibrationForm">',
      '<div class="adminFhbCalibrationFieldset"><b>Protokol před korekcí</b><div class="adminFhbCalibrationTwo"><label>L' + adminSignedField('protocolLeft', 'admin_fhb_protocol_left', 'levá', 'Přepnout znaménko protokolu vlevo') + '</label><label>P' + adminSignedField('protocolRight', 'admin_fhb_protocol_right', 'pravá', 'Přepnout znaménko protokolu vpravo') + '</label></div></div>',
      '<div class="adminFhbCalibrationFieldset"><b>Změna ve stroji</b><div class="adminFhbCalibrationTwo"><label>Konicita' + adminSignedField('taperDelta', 'admin_fhb_taper_delta', 'např. 35', 'Přepnout znaménko konicity') + '</label><label>fhβ' + adminSignedField('shiftDelta', 'admin_fhb_shift_delta', 'např. 20', 'Přepnout znaménko fhβ') + '</label></div></div>',
      '<div class="adminFhbCalibrationFieldset"><b>Výsledek po korekci</b><div class="adminFhbCalibrationTwo"><label>L' + adminSignedField('resultLeft', 'admin_fhb_result_left', 'levá', 'Přepnout znaménko výsledku vlevo') + '</label><label>P' + adminSignedField('resultRight', 'admin_fhb_result_right', 'pravá', 'Přepnout znaménko výsledku vpravo') + '</label></div></div>',
      '<label class="adminFhbCalibrationNote">Poznámka<input class="appMenuInput" data-fhb-calibration-field="note" maxlength="160" placeholder="volitelné"></label>',
      '<button type="button" class="appMenuAction isActive" data-admin-action="save-fhb-calibration-record">Uložit měření</button>',
      '</div>',
      '<div class="adminFhbCalibrationModel"><div class="appMenuCardTitle">Nastavení výpočtu</div><div class="smallText">Aktivní citlivost je společná pro kalkulačku Korekce · Frézky. Střední hodnota záznamů omezuje vliv jednoho nepřesného měření.</div><div class="adminFhbCalibrationMetrics">',
      recommendationRow('Konicita +', analysis.samples.taperUp.length, analysis.values.taperUp, settings.activeModel.taperUpSensitivityPer001, analysis.ready.taperUp),
      recommendationRow('Konicita −', analysis.samples.taperDown.length, analysis.values.taperDown, settings.activeModel.taperDownSensitivityPer001, analysis.ready.taperDown),
      recommendationRow('fhβ', analysis.samples.shift.length, analysis.values.shift, settings.activeModel.shiftSensitivityPer001, analysis.ready.shift),
      '</div><button type="button" class="appMenuAction" data-admin-action="apply-fhb-calibration"' + applyDisabled + '>Potvrdit doporučené nastavení</button></div>',
      '<div class="adminFhbCalibrationHistory"><div class="appMenuCardTitle">Záznamy</div>' + recordsHtml + '</div>',
      '</div>',
      '</details>',
      '<details class="rakCorrectionMachineFold" data-rak-correction-group="brusy">',
      '<summary><span>Brusy FHB · TBKR01 + TBKR07</span><small>nastavení brusů</small></summary>',
      '<div class="rakCorrectionMachineFoldBody">',
      brusyHtml,
      '</div>',
      '</details>',
      '</div>'
    ].join('');
  }
  function readRecord(root) {
    const scope = root && root.querySelector ? root : document;
    const value = (field) => scope.querySelector('[data-fhb-calibration-field="' + field + '"]')?.value || '';
    return { protocolLeft: value('protocolLeft'), protocolRight: value('protocolRight'), taperDelta: value('taperDelta'), shiftDelta: value('shiftDelta'), resultLeft: value('resultLeft'), resultRight: value('resultRight'), note: value('note') };
  }

  if (!window.__rakAdminCorrectionSignBound) {
    window.__rakAdminCorrectionSignBound = true;
    document.addEventListener('click', (event) => {
      const button = event.target && event.target.closest ? event.target.closest('[data-admin-correction-sign-target]') : null;
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      const input = document.getElementById(String(button.dataset.adminCorrectionSignTarget || ''));
      if (!input) return;
      let raw = String(input.value || '').trim().replace(/[−–—]/g, '-');
      if (raw.startsWith('-')) raw = raw.replace(/^-+/, '');
      else if (raw.startsWith('+')) raw = '-' + raw.slice(1);
      else raw = raw ? '-' + raw : '-';
      input.value = raw;
      const negative = raw.startsWith('-');
      button.textContent = negative ? '−' : '+';
      button.classList.toggle('isNegative', negative);
      button.setAttribute('aria-pressed', negative ? 'true' : 'false');
      try { input.focus({ preventScroll: true }); if (input.setSelectionRange) input.setSelectionRange(raw.length, raw.length); } catch (_) {}
    }, true);
    document.addEventListener('input', (event) => {
      const input = event.target && event.target.matches && event.target.matches('[data-admin-correction-sign-input="1"]') ? event.target : null;
      if (!input) return;
      const button = document.querySelector('[data-admin-correction-sign-target="' + input.id + '"]');
      if (!button) return;
      const negative = String(input.value || '').trim().replace(/[−–—]/g, '-').startsWith('-');
      button.textContent = negative ? '−' : '+';
      button.classList.toggle('isNegative', negative);
      button.setAttribute('aria-pressed', negative ? 'true' : 'false');
    }, true);
  }

  window.RAK_FHB_CORRECTION_CALIBRATION_KEY = KEY;
  window.getAdminFhbCorrectionCalibrationSettings = getSettings;
  window.buildAdminFhbCorrectionCalibrationHtml = buildHtml;
  window.readAdminFhbCorrectionCalibrationRecord = readRecord;
  window.addAdminFhbCorrectionCalibrationRecord = addRecord;
  window.removeAdminFhbCorrectionCalibrationRecord = removeRecord;
  window.applyAdminFhbCorrectionCalibration = applyRecommendation;
  window.mergeAdminFhbCorrectionCalibrationRows = mergeRows;
  window.getFhbCorrectionModel = function getFhbCorrectionModel() { return cloneModel(getSettings().activeModel); };
})();
