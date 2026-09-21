// RaK – nastavení strojů a FHB oddělené z admin-rotation.js.
try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('admin-machine-settings.js', 'loading', { source: 'dynamic-loader' }); } catch (err) {}

async function loadAdminMachineSettingsFromSupabase() {
  if (window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.loadMachineSettings === 'function') {
    app.machineSettingsRows = await window.RotationSupabaseBridge.loadMachineSettings();
    // RAK_EXTERNAL_SHIFT_TEAMS_17020
    if(typeof rakApplyShiftAccess==='function') rakApplyShiftAccess();
    return app.machineSettingsRows;
  }
  return [];
}



function splitMachineKey(rawKey) {
  const raw = String(rawKey || '').trim();
  if (!raw) return { machine: '', index: '' };
  const parts = raw.includes('-') ? raw.split('-') : (raw.includes('_') ? raw.split('_') : [raw]);
  const machine = String(parts[0] || '').trim();
  const index = String(parts.slice(1).join('-') || '').trim();
  return { machine, index };
}


function makeMachineKey(machineCode, machineIndex, category) {
  const machine = String(machineCode || '').trim();
  const index = String(machineIndex || '').trim();
  const cat = String(category || '').trim();
  if (!machine) return '';
  if (cat === 'brus') return machine + (index ? '-' + index : '');
  return machine;
}



function getAdminFhbTargetRows() {
  if (typeof getAllFhbTargetPresets === 'function') {
    return getAllFhbTargetPresets();
  }
  return [
    { key: 'afag-lis', label: 'AF/AG lis', left: 50, right: 70, toleranceMinus: 10, tolerancePlus: 10 },
    { key: 'ah-lis', label: 'AH lis', left: 20, right: 80, toleranceMinus: 10, tolerancePlus: 10 },
    { key: 'afag-volne', label: 'AF/AG volné', left: -5, right: 10, toleranceMinus: 10, tolerancePlus: 10 },
    { key: 'ah-volne', label: 'AH volné', left: 10, right: 25, toleranceMinus: 10, tolerancePlus: 10 }
  ];
}


function buildAdminFhbTargetSettingsHtml() {
  const rows = getAdminFhbTargetRows();
  const rowsHtml = rows.map((row) => {
    const key = String(row.key || '').trim();
    const label = String(row.label || key || '').trim();
    const toleranceMinus = row.toleranceMinus ?? row.tolerance_minus ?? row.toleranceMin ?? row.tolerance_min ?? 10;
    const tolerancePlus = row.tolerancePlus ?? row.tolerance_plus ?? row.toleranceMax ?? row.tolerance_max ?? 10;
    return [
      '<tr data-fhb-target-row="' + escapeHtml(key) + '">',
      '  <td><input class="appMenuInlineInput" data-fhb-target-field="label" value="' + escapeHtml(label) + '" readonly></td>',
      '  <td><input class="appMenuInlineInput" data-fhb-target-field="left" value="' + escapeHtml(String(row.left ?? '')) + '" inputmode="decimal"></td>',
      '  <td><input class="appMenuInlineInput" data-fhb-target-field="right" value="' + escapeHtml(String(row.right ?? '')) + '" inputmode="decimal"></td>',
      '  <td><input class="appMenuInlineInput" data-fhb-target-field="tolerance_minus" value="' + escapeHtml(String(toleranceMinus)) + '" inputmode="decimal"></td>',
      '  <td><input class="appMenuInlineInput" data-fhb-target-field="tolerance_plus" value="' + escapeHtml(String(tolerancePlus)) + '" inputmode="decimal"></td>',
      '</tr>'
    ].join('');
  }).join('');
  return [
    '<div class="tableWrap appMenuTableWrap uMt12">',
    '  <div class="smallText">Korekce frézky · středy a tolerance fhβ</div>',
    '  <table class="appMenuTable appMenuAdminTable appMenuAdminTableDense appMenuAdminFhbTargetTable">',
    '    <thead><tr><th>Index</th><th>Levá</th><th>Pravá</th><th>Tol. −</th><th>Tol. +</th></tr></thead>',
    '    <tbody>' + rowsHtml + '</tbody>',
    '  </table>',
    '</div>'
  ].join('');
}



function adminMachineIsEditableMachineRow(row) {
  const cat = String(row && row.category ? row.category : '').trim();
  const key = String(row && row.machine_key ? row.machine_key : '').trim();
  return cat !== 'brus'
    && cat !== 'fhb_target'
    && cat !== 'food_schedule'
    && !(typeof adminIsFoodScheduleRow === 'function' && adminIsFoodScheduleRow(row))
    && cat !== 'rotation_save_backup'
    && cat !== 'rotation_machine_tasks_settings'
    && cat !== 'fhb_correction_calibration_settings'
    && !(typeof isRotationSaveBackupRow === 'function' && isRotationSaveBackupRow(row))
    && cat !== 'admin_change_log'
    && !(typeof isRakChangeLogRow === 'function' && isRakChangeLogRow(row))
    && cat !== 'vacation_countdown_settings'
    && cat !== 'admin_accounts_settings'
    && cat !== 'admin_full_settings_backup'
    && cat !== 'admin_settings_deleted'
    && key !== 'ADMIN_ACCOUNTS_SETTINGS'
    && key.indexOf('ADMIN_FULL_SETTINGS_BACKUP_') !== 0
    && key !== 'VACATION_COUNTDOWN_SETTINGS'
    && key !== 'ROTATION_MACHINE_TASKS_SETTINGS'
    && key !== 'FHB_CORRECTION_CALIBRATION_SETTINGS'
    && cat !== ADMIN_ROTATION_OVERTIME_SETTINGS_CATEGORY
    && !(typeof rakAdminIsAccountsSettingsRow === 'function' && rakAdminIsAccountsSettingsRow(row))
    && !(typeof isRakExternalLinksSettingsRow === 'function' && isRakExternalLinksSettingsRow(row))
    && !(typeof isRakAppContactSettingsRow === 'function' && isRakAppContactSettingsRow(row))
    && !(typeof isRakPayrollSettingsRow === 'function' && isRakPayrollSettingsRow(row))
    && !(typeof isRakSpecialDaysSettingsRow === 'function' && isRakSpecialDaysSettingsRow(row))
    && !(typeof isRakWorkerRosterSettingsRow === 'function' && isRakWorkerRosterSettingsRow(row))
    && !(typeof isRakCalendarNotesSettingsRow === 'function' && isRakCalendarNotesSettingsRow(row))
    && !adminIsRotationGeneratorSettingsRow(row);
}


function adminMachineNormalizeNumberText(value) {
  return String(value ?? '').trim().replace(',', '.');
}


function adminMachineIsPositiveNumber(value) {
  const raw = adminMachineNormalizeNumberText(value);
  if (!raw) return false;
  const num = Number(raw);
  return Number.isFinite(num) && num > 0;
}


function adminMachineIsFiniteNumber(value) {
  const raw = adminMachineNormalizeNumberText(value);
  if (!raw) return false;
  return Number.isFinite(Number(raw));
}


function adminMachineBuildInitialStatus(machineRows, brusRows, allRows) {
  const summary = { machines: 0, brus: 0, fhb: 0, incomplete: 0, duplicates: 0 };
  const seen = new Set();
  const addRow = (row, category) => {
    const machineCode = String(row && (row.machine_code || splitMachineKey(row.machine_key).machine) || '').trim();
    const machineIndex = String(row && (row.machine_index || splitMachineKey(row.machine_key).index) || '').trim();
    const cycleTime = row && (row.cycle_time ?? row.speed ?? (row.settings_json && row.settings_json.cycle_time));
    const dressTime = row && (row.dress_time ?? (row.settings_json && row.settings_json.dress_time));
    const dressCount = row && (row.dress_count ?? (row.settings_json && row.settings_json.dress_count));
    const key = String(row && row.machine_key || makeMachineKey(machineCode, machineIndex, category)).trim().toUpperCase();
    if (key) {
      if (seen.has(key)) summary.duplicates += 1;
      else seen.add(key);
    }
    if (category === 'brus') summary.brus += 1;
    else summary.machines += 1;
    if (!machineCode || !adminMachineIsPositiveNumber(cycleTime)) summary.incomplete += 1;
    if (category === 'brus' && (!machineIndex || !adminMachineIsPositiveNumber(dressTime) || !adminMachineIsPositiveNumber(dressCount))) summary.incomplete += 1;
  };
  (Array.isArray(machineRows) ? machineRows : []).forEach((row) => addRow(row, String(row && row.category || '').trim() || 'frezka'));
  (Array.isArray(brusRows) ? brusRows : []).forEach((row) => addRow(row, 'brus'));
  let fhbRows = (Array.isArray(allRows) ? allRows : []).filter((row) => String(row && row.category || '').trim() === 'fhb_target');
  if (!fhbRows.length && typeof getAdminFhbTargetRows === 'function') fhbRows = getAdminFhbTargetRows();
  fhbRows.forEach((row) => {
    const settings = row && row.settings_json && typeof row.settings_json === 'object' ? row.settings_json : {};
    const left = settings.target_left ?? row.left;
    const right = settings.target_right ?? row.right;
    summary.fhb += 1;
    if (!adminMachineIsFiniteNumber(left) || !adminMachineIsFiniteNumber(right)) summary.incomplete += 1;
  });
  return summary;
}


function adminMachineRefreshStatus() {}


function buildAdminMachineSettingsTableHtml() {
  const rows = Array.isArray(app.machineSettingsRows) ? app.machineSettingsRows : [];
  const machineRows = rows.filter(adminMachineIsEditableMachineRow);
  const brusRows = rows.filter(row => String(row && row.category ? row.category : '').trim() === 'brus');

  const machineDefaults = machineRows.length ? machineRows : [
    { machine_key: 'FREZKY', machine_code: 'FREZKY', machine_index: '', label: 'Frezky', category: 'frezka', cycle_time: '', settings_json: { machine: 'FREZKY', index: '', cycle_time: '' } },
    { machine_key: 'TPKW01', machine_code: 'TPKW01', machine_index: '', label: 'Pračka', category: 'pracka', cycle_time: '30', settings_json: { machine: 'TPKW01', index: '', cycle_time: '30' } }
  ];

  const brusDefaults = brusRows.length ? brusRows : [
    { machine_key: 'TBKR01-AD', machine_code: 'TBKR01', machine_index: 'AD', label: 'TBKR01-AD', category: 'brus', cycle_time: '58.2', dress_time: '323', dress_count: '59', settings_json: { machine: 'TBKR01', index: 'AD', cycle_time: '58.2', dress_time: '323', dress_count: '59' } },
    { machine_key: 'TBKR01-AE', machine_code: 'TBKR01', machine_index: 'AE', label: 'TBKR01-AE', category: 'brus', cycle_time: '57.0', dress_time: '240', dress_count: '58', settings_json: { machine: 'TBKR01', index: 'AE', cycle_time: '57.0', dress_time: '240', dress_count: '58' } },
    { machine_key: 'TBKR01-AH', machine_code: 'TBKR01', machine_index: 'AH', label: 'TBKR01-AH', category: 'brus', cycle_time: '66.0', dress_time: '400', dress_count: '87', settings_json: { machine: 'TBKR01', index: 'AH', cycle_time: '66.0', dress_time: '400', dress_count: '87' } },
    { machine_key: 'TBKR01-AD volné', machine_code: 'TBKR01', machine_index: 'AD volné', label: 'TBKR01-AD volné', category: 'brus', cycle_time: '62.7', dress_time: '240', dress_count: '45', settings_json: { machine: 'TBKR01', index: 'AD volné', cycle_time: '62.7', dress_time: '240', dress_count: '45' } },
    { machine_key: 'TBKR01-AE volné', machine_code: 'TBKR01', machine_index: 'AE volné', label: 'TBKR01-AE volné', category: 'brus', cycle_time: '60.0', dress_time: '240', dress_count: '45', settings_json: { machine: 'TBKR01', index: 'AE volné', cycle_time: '60.0', dress_time: '240', dress_count: '45' } },
    { machine_key: 'TBKR07-AD', machine_code: 'TBKR07', machine_index: 'AD', label: 'TBKR07-AD', category: 'brus', cycle_time: '58.2', dress_time: '298', dress_count: '59', settings_json: { machine: 'TBKR07', index: 'AD', cycle_time: '58.2', dress_time: '298', dress_count: '59' } },
    { machine_key: 'TBKR07-AE', machine_code: 'TBKR07', machine_index: 'AE', label: 'TBKR07-AE', category: 'brus', cycle_time: '56.4', dress_time: '325', dress_count: '59', settings_json: { machine: 'TBKR07', index: 'AE', cycle_time: '56.4', dress_time: '325', dress_count: '59' } },
    { machine_key: 'TBKR07-AH', machine_code: 'TBKR07', machine_index: 'AH', label: 'TBKR07-AH', category: 'brus', cycle_time: '63', dress_time: '360', dress_count: '88', settings_json: { machine: 'TBKR07', index: 'AH', cycle_time: '63', dress_time: '360', dress_count: '88' } },
    { machine_key: 'TBKR07-AD volné', machine_code: 'TBKR07', machine_index: 'AD volné', label: 'TBKR07-AD volné', category: 'brus', cycle_time: '60.3', dress_time: '240', dress_count: '45', settings_json: { machine: 'TBKR07', index: 'AD volné', cycle_time: '60.3', dress_time: '240', dress_count: '45' } },
    { machine_key: 'TBKR07-AE volné', machine_code: 'TBKR07', machine_index: 'AE volné', label: 'TBKR07-AE volné', category: 'brus', cycle_time: '60.0', dress_time: '240', dress_count: '45', settings_json: { machine: 'TBKR07', index: 'AE volné', cycle_time: '60.0', dress_time: '240', dress_count: '45' } }
  ];

  const machineRowsHtml = machineDefaults.map((row, idx) => {
    const machineCode = String(row.machine_code || splitMachineKey(row.machine_key).machine || '').trim();
    const cycleTime = row.cycle_time ?? row.speed ?? (row.settings_json && row.settings_json.cycle_time) ?? '';
    return [
      '<tr data-machine-row-index="m' + String(idx) + '">',
      '  <td><input class="appMenuInlineInput" data-machine-field="machine_code" value="' + escapeHtml(machineCode) + '" placeholder="FREZKY / TPKW01"></td>',
      '  <td><input class="appMenuInlineInput" data-machine-field="label" value="' + escapeHtml(String(row.label || '')) + '" placeholder="název"></td>',
      '  <td><input class="appMenuInlineInput" data-machine-field="cycle_time" value="' + escapeHtml(String(cycleTime ?? '')) + '" placeholder="čas výroby kola"></td>',
      '</tr>'
    ].join('');
  }).join('');

  const brusRowsHtml = brusDefaults.map((row, idx) => {
    const machineCode = String(row.machine_code || splitMachineKey(row.machine_key).machine || '').trim();
    const machineIndex = String(row.machine_index || splitMachineKey(row.machine_key).index || '').trim();
    const cycleTime = row.cycle_time ?? row.speed ?? (row.settings_json && row.settings_json.cycle_time) ?? '';
    const dressTime = row.dress_time ?? (row.settings_json && row.settings_json.dress_time) ?? '';
    const dressCount = row.dress_count ?? (row.settings_json && row.settings_json.dress_count) ?? '';
    return [
      '<tr data-machine-row-index="b' + String(idx) + '">',
      '  <td><input class="appMenuInlineInput" data-machine-field="machine_code" value="' + escapeHtml(machineCode) + '" placeholder="TBKR01"></td>',
      '  <td><input class="appMenuInlineInput" data-machine-field="machine_index" value="' + escapeHtml(machineIndex) + '" placeholder="AD / AE / AH / volné"></td>',
      '  <td><input class="appMenuInlineInput" data-machine-field="label" value="' + escapeHtml(String(row.label || '')) + '" placeholder="název"></td>',
      '  <td><input class="appMenuInlineInput" data-machine-field="cycle_time" value="' + escapeHtml(String(cycleTime ?? '')) + '" placeholder="čas výroby kola"></td>',
      '  <td><input class="appMenuInlineInput" data-machine-field="dress_time" value="' + escapeHtml(String(dressTime ?? '')) + '" placeholder="čas orovnání"></td>',
      '  <td><input class="appMenuInlineInput" data-machine-field="dress_count" value="' + escapeHtml(String(dressCount ?? '')) + '" placeholder="po kolika ks"></td>',
      '</tr>'
    ].join('');
  }).join('');

  return [
    '<div class="appMenuSubSection" id="adminMachinesSection">',
    '  <div class="appMenuSubTitle">Nastavení strojů</div>',
    '  <div class="appMenuText">Frezky a pračka mají jen čas výroby kola. Brusky mají stroj, index, čas výroby kola, čas orovnání a počet kusů po orovnání. Níž upravíš i středy fhβ.</div>',
    '  <div class="tableWrap appMenuTableWrap">',
    '    <div class="smallText">Frezky a pračka</div>',
    '    <table class="appMenuTable appMenuAdminTable appMenuAdminTableDense">',
    '      <thead><tr><th>Stroj</th><th>Název</th><th>Čas výroby kola</th></tr></thead>',
    '      <tbody>' + machineRowsHtml + '</tbody>',
    '    </table>',
    '  </div>',
    '  <div class="tableWrap appMenuTableWrap uMt12">',
    '    <div class="smallText">Brusy</div>',
    '    <table class="appMenuTable appMenuAdminTable appMenuAdminTableDense">',
    '      <thead><tr><th>Stroj</th><th>Index</th><th>Název</th><th>Čas výroby kola</th><th>Čas orovnání</th><th>Po kolika ks</th></tr></thead>',
    '      <tbody>' + brusRowsHtml + '</tbody>',
    '    </table>',
    '  </div>',
    buildAdminFhbTargetSettingsHtml(),
    '</div>'
  ].join('');
}



function readAdminMachineSettingsFromDom() {
  const rows = [];
  document.querySelectorAll('#appMenuBody tr[data-machine-row-index]').forEach((tr) => {
    const get = (field) => tr.querySelector('[data-machine-field="' + field + '"]')?.value ?? '';
    const label = String(get('label')).trim();
    const machine_code = String(get('machine_code')).trim();
    if (machine_code.toUpperCase() === 'FOOD' || machine_code.toUpperCase() === 'ROTBK') return;
    const machine_index = String(get('machine_index')).trim();
    const cycle_time = String(get('cycle_time')).trim();
    const dress_time = String(get('dress_time')).trim();
    const dress_count = String(get('dress_count')).trim();
    const category = machine_code.toUpperCase().startsWith('TBKR') ? 'brus' : (machine_code.toUpperCase().startsWith('TPKW') ? 'pracka' : 'frezka');
    const machine_key = makeMachineKey(machine_code, machine_index, category);
    if (!machine_key && !label && !cycle_time && !dress_time && !dress_count) return;

    rows.push({
      machine_key,
      machine_code,
      machine_index,
      label: label || machine_key,
      category,
      cycle_time,
      speed: cycle_time,
      dress_time,
      dress_count,
      settings_json: { machine: machine_code, index: machine_index, cycle_time, dress_time, dress_count }
    });
  });
  document.querySelectorAll('#appMenuBody tr[data-fhb-target-row]').forEach((tr) => {
    const key = String(tr.getAttribute('data-fhb-target-row') || '').trim();
    const get = (field) => tr.querySelector('[data-fhb-target-field="' + field + '"]')?.value ?? '';
    const label = String(get('label')).trim() || key;
    const left = String(get('left')).trim();
    const right = String(get('right')).trim();
    const toleranceMinus = String(get('tolerance_minus')).trim() || '10';
    const tolerancePlus = String(get('tolerance_plus')).trim() || '10';
    if (!key) return;
    rows.push({
      machine_key: 'FHB_TARGET_' + key,
      machine_code: 'FHB',
      machine_index: key,
      label,
      category: 'fhb_target',
      cycle_time: '',
      speed: '',
      dress_time: '',
      dress_count: '',
      settings_json: { machine: 'FHB', index: key, type: 'fhb_target', key, label, target_left: left, target_right: right, tolerance_minus: toleranceMinus, tolerance_plus: tolerancePlus }
    });
  });
  const foodSettings = readAdminFoodScheduleSettingsFromDom();
  if (foodSettings && foodSettings.regular && Object.keys(foodSettings.regular).length) {
    rows.push(makeAdminFoodScheduleSettingsRow(foodSettings));
  } else if (Array.isArray(app.machineSettingsRows)) {
    app.machineSettingsRows.filter(adminIsFoodScheduleRow).forEach((row) => rows.push(row));
  }
  if (Array.isArray(app.machineSettingsRows)) {
    app.machineSettingsRows.filter(adminIsRotationOvertimeSettingsRow).forEach((row) => rows.push(row));
  }
  if (Array.isArray(app.machineSettingsRows) && typeof adminIsVacationCountdownSettingsRow === 'function') {
    app.machineSettingsRows.filter(adminIsVacationCountdownSettingsRow).forEach((row) => rows.push(row));
  }
  if (Array.isArray(app.machineSettingsRows) && typeof rakAdminIsAccountsSettingsRow === 'function') {
    app.machineSettingsRows.filter(rakAdminIsAccountsSettingsRow).forEach((row) => rows.push(row));
  }
  if (Array.isArray(app.machineSettingsRows)) {
    app.machineSettingsRows.filter(adminIsRotationGeneratorSettingsRow).forEach((row) => rows.push(row));
  }
  if (Array.isArray(app.machineSettingsRows)) {
    app.machineSettingsRows.filter((row) => {
      const settings = row && row.settings_json && typeof row.settings_json === 'object' ? row.settings_json : {};
      const key = String(row && row.machine_key || '');
      const category = String(row && row.category || settings.stored_category || '');
      return key === 'ROTATION_MACHINE_TASKS_SETTINGS'
        || key === 'FHB_CORRECTION_CALIBRATION_SETTINGS'
        || category === 'rotation_machine_tasks_settings'
        || category === 'fhb_correction_calibration_settings';
    }).forEach((row) => rows.push(row));
  }
  if (Array.isArray(app.machineSettingsRows) && typeof isRakExternalLinksSettingsRow === 'function') {
    app.machineSettingsRows.filter(isRakExternalLinksSettingsRow).forEach((row) => rows.push(row));
  }
  if (Array.isArray(app.machineSettingsRows) && typeof isRakAppContactSettingsRow === 'function') {
    app.machineSettingsRows.filter(isRakAppContactSettingsRow).forEach((row) => rows.push(row));
  }
  if (Array.isArray(app.machineSettingsRows) && typeof isRakPayrollSettingsRow === 'function') {
    app.machineSettingsRows.filter(isRakPayrollSettingsRow).forEach((row) => rows.push(row));
  }
  if (Array.isArray(app.machineSettingsRows) && typeof isRakSpecialDaysSettingsRow === 'function') {
    app.machineSettingsRows.filter(isRakSpecialDaysSettingsRow).forEach((row) => rows.push(row));
  }
  return rows;
}

try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('admin-machine-settings.js', 'loaded', { source: 'dynamic-loader' }); } catch (err) {}
