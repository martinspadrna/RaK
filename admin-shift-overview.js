// RaK TEST – owner-only Přehled směny.
// První iterace ukládá provozní přehled pouze lokálně v zařízení.
try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('admin-shift-overview.js', 'loaded', { source: 'dynamic-loader' }); } catch (err) {}

(function installRakAdminShiftOverview(root) {
  'use strict';

  const STORAGE_KEY = 'rak_admin_shift_overview_v1';
  const MAX_RECORDS = 120;
  const renderedRecords = new WeakMap();
  const AAR_COLUMNS = [
    { key: 'agAe', label: 'AG / AE', cls: 'isGreen' },
    { key: 'afAd', label: 'AF / AD', cls: 'isBlue' },
    { key: 'ahAh', label: 'AH', cls: 'isOrange' }
  ];
  const AAR_ROWS = [
    { key: 'op1121', label: 'op 11+21' },
    { key: 'op212Stock', label: 'op 212 – do skladu' },
    { key: 'turning', label: 'Soustružení' },
    { key: 'washing', label: 'Koncové praní' },
    { key: 'toStock', label: 'Do skladu' },
    { key: 'stock', label: 'Stav skladu' }
  ];
  const PRE_KILN_ROWS = ['Awa','Awi','TW1','TW2','TW3','SR1','SR2','SR3','SR4','SR5','SR6','SR7','FR3','FR5','FR7','ZSB-RLR','SRRG','AAR'];
  const OAM_ROWS = [
    { key: 'ag', left: '0AM 409 155 AG', right: '0AM 409 111 AE', cls: 'isGreen' },
    { key: 'af', left: '0AM 409 155 AF', right: '0AM 409 111 AD', cls: 'isBlue' },
    { key: 'ah', left: '0AM 409 155 AH', right: '0AM 409 111 AH', cls: 'isOrange' }
  ];
  const OAM_LEFT_COLUMNS = [
    { key: 'op1020', label: '10+20', sub: 'Volné' },
    { key: 'op1121', label: '11+21', sub: 'Lis' },
    { key: 'op30', label: '30', sub: 'Volné' },
    { key: 'op31', label: '31', sub: 'Lis' },
    { key: 'op120', label: '120', sub: 'Volné' },
    { key: 'op121', label: '121', sub: 'Lis' },
    { key: 'op145', label: '145', sub: '' }
  ];
  const OAM_RIGHT_COLUMNS = [
    { key: 'hard', label: 'Tvrdé obrábění' },
    { key: 'stock', label: 'Sklad' },
    { key: 'planStock', label: 'Plán sklad' },
    { key: 'assembly', label: 'Montáž' }
  ];
  const PROCESS_COLUMNS = [
    { key: 'soft', label: 'MO' },
    { key: 'beforeKiln', label: 'Před kalírnou' },
    { key: 'kilnDone', label: 'Sklad-vykaleno' },
    { key: 'before145', label: 'Před 145' },
    { key: 'before150', label: 'Před op. 150' },
    { key: 'emergency', label: 'Nouzový sklad' },
    { key: 'washer', label: 'u pračky' },
    { key: 'stock', label: 'Sklad' },
    { key: 'assembly', label: 'Montáž' }
  ];
  const LEGACY_PROCESS_COLUMNS = [
    { key: 'kiln', label: 'Kalírna' },
    { key: 'kilnStock', label: 'Sklad kalírna' },
    { key: 'riveting', label: 'Nýtování' },
    { key: 'after150', label: 'Po op. 150' },
    { key: 'before162', label: 'Před op. 162' }
  ];
  const INPUT_ROWS = ['AAR','SRRG','ZSB-RLR','FR7','FR5','FR3','SR7','SR6','SR5','SR4','SR3','SR2','SR1','TW3','TW2','TW1','Awi','Awa'];

  function ownerAllowed() {
    try {
      return typeof root.rakAdminCanManageAdmins === 'function' && root.rakAdminCanManageAdmins();
    } catch (_) { return false; }
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function localDateString(date) {
    const d = date instanceof Date ? date : new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function displayDate(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? Number(match[3]) + '. ' + Number(match[2]) + '. ' + match[1] : String(value || '');
  }

  function syncDateDisplay(rootEl) {
    const input = rootEl.querySelector('[data-shift-overview-date]');
    const display = rootEl.querySelector('[data-shift-overview-date-display]');
    if (input && display) display.textContent = displayDate(input.value);
  }

  function currentShiftContext(now) {
    const time = now || new Date();
    try {
      const active = typeof root.getActiveShiftNow === 'function' ? root.getActiveShiftNow(time) : null;
      if (active && ['A','B','C','D'].includes(active.team) && active.start instanceof Date && active.end instanceof Date) {
        const hours = (active.end - active.start) / 3600000;
        const night = active.start.getHours() >= 18 || active.start.getHours() < 6;
        return { date: localDateString(active.start), shift: active.team + ':' + (night ? 'nocni' : 'ranni') + (hours <= 8 ? '8' : '12') };
      }
    } catch (_) {}
    return { date: localDateString(time), shift: '' };
  }

  function normalizeShift(value) {
    const shift = String(value || '');
    return /^(ranni|nocni)(8|12)$/.test(shift) ? 'D:' + shift : shift;
  }

  function defaultRecord(date, shift) {
    const matrix = {};
    AAR_ROWS.forEach((row) => {
      matrix[row.key] = {};
      AAR_COLUMNS.forEach((col) => { matrix[row.key][col.key] = ''; });
    });
    const preKiln = {};
    PRE_KILN_ROWS.forEach((name) => { preKiln[name] = ''; });
    const oamRows = {};
    OAM_ROWS.forEach((row) => {
      oamRows[row.key] = {};
      OAM_LEFT_COLUMNS.forEach((col) => { oamRows[row.key][col.key] = ''; });
      OAM_RIGHT_COLUMNS.forEach((col) => { oamRows[row.key][col.key] = ''; });
    });
    return {
      date: date || localDateString(),
      shift: normalizeShift(shift),
      preKiln,
      lastBatch: { ald1: '', ald2: '', ald3: '' },
      ald: [1, 2, 3].map((id) => ({ id, inserts: '', faults: '', rejects: '', running: '', longFaults: '' })),
      aar: {
        plan: 'Po–So 1150/1150 · Ne 704/800',
        matrix,
        freeTurning: '', freeTurningKs: '',
        freeGround: '', freeGroundKs: '',
        freeHardened: '', freeHardenedKs: '',
        faults: ''
      },
      oam: { rows: oamRows },
      process: { rows: {} },
      inputs: { ald1: '', ald2: '', rows: {} },
      nitrogen: '',
      machiningFaults: '',
      notes: '',
      updatedAt: ''
    };
  }

  function readStore() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (_) { return {}; }
  }

  function writeStore(store) {
    const rows = Object.entries(store || {}).sort((a, b) => {
      const aa = String(a[1] && a[1].updatedAt || '');
      const bb = String(b[1] && b[1].updatedAt || '');
      return bb.localeCompare(aa);
    }).slice(0, MAX_RECORDS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(rows)));
  }

  function recordKey(date, shift) { return String(date || '') + '|' + String(shift || ''); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function normalizeRecord(record, date, shift) {
    const base = defaultRecord(date, shift);
    const src = record && typeof record === 'object' ? record : {};
    base.date = String(src.date || date || base.date);
    base.shift = normalizeShift(src.shift || shift || base.shift);
    base.notes = String(src.notes || '');
    base.nitrogen = String(src.nitrogen ?? '');
    base.machiningFaults = String(src.machiningFaults || '');
    base.updatedAt = String(src.updatedAt || '');
    base.preKiln = Object.assign({}, base.preKiln, src.preKiln || {});
    PRE_KILN_ROWS.forEach((name) => {
      if (base.preKiln[name] == null) base.preKiln[name] = '';
    });
    base.lastBatch = Object.assign({}, base.lastBatch, src.lastBatch || {});
    base.ald = base.ald.map((row, index) => Object.assign(row, src.ald && src.ald[index] ? src.ald[index] : {}));
    base.aar = Object.assign(base.aar, src.aar || {});
    base.aar.matrix = base.aar.matrix || {};
    AAR_ROWS.forEach((row) => {
      base.aar.matrix[row.key] = Object.assign({}, base.aar.matrix[row.key] || {});
      AAR_COLUMNS.forEach((col) => {
        if (base.aar.matrix[row.key][col.key] == null) base.aar.matrix[row.key][col.key] = '';
      });
    });
    base.oam = Object.assign({}, base.oam, src.oam || {});
    base.process = Object.assign({}, base.process, src.process || {});
    base.process.rows = Object.assign({}, base.process.rows || {});
    OAM_ROWS.forEach((row) => {
      base.process.rows[row.key] = Object.assign({}, base.process.rows[row.key] || {});
      PROCESS_COLUMNS.concat(LEGACY_PROCESS_COLUMNS).forEach((col) => {
        if (base.process.rows[row.key][col.key] == null) base.process.rows[row.key][col.key] = '';
      });
    });
    base.inputs = Object.assign({}, base.inputs, src.inputs || {});
    base.inputs.rows = Object.assign({}, base.inputs.rows || {});
    INPUT_ROWS.forEach((name) => {
      base.inputs.rows[name] = Object.assign({ ald1: '', ald2: '' }, base.inputs.rows[name] || {});
    });
    base.oam.rows = Object.assign({}, base.oam.rows || {});
    OAM_ROWS.forEach((row) => {
      base.oam.rows[row.key] = Object.assign({}, base.oam.rows[row.key] || {});
      OAM_LEFT_COLUMNS.concat(OAM_RIGHT_COLUMNS).forEach((col) => {
        if (base.oam.rows[row.key][col.key] == null) base.oam.rows[row.key][col.key] = '';
      });
    });
    return base;
  }

  function getSaved(date, shift) {
    const store = readStore();
    const found = store[recordKey(date, shift)] || (String(shift).startsWith('D:') ? store[recordKey(date, String(shift).slice(2))] : null);
    return found ? normalizeRecord(found, date, shift) : null;
  }

  function numberOrZero(value) {
    const normalized = String(value == null ? '' : value).trim().replace(',', '.');
    if (!normalized) return 0;
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }

  function nestedGet(source, path) {
    return String(path || '').split('.').reduce((value, key) => value == null ? undefined : value[key], source);
  }

  function nestedSet(target, path, value) {
    const parts = String(path || '').split('.');
    let cursor = target;
    parts.forEach((part, index) => {
      if (index === parts.length - 1) cursor[part] = value;
      else {
        if (!cursor[part] || typeof cursor[part] !== 'object') cursor[part] = {};
        cursor = cursor[part];
      }
    });
  }

  function field(path, record, options) {
    const opts = options || {};
    const value = nestedGet(record, path);
    if (opts.area) {
      return '<textarea class="rakShiftOverviewArea" data-shift-overview-field="' + esc(path) + '" aria-label="' + esc(opts.label || path) + '" rows="' + String(opts.rows || 3) + '" placeholder="' + esc(opts.placeholder || '') + '">' + esc(value) + '</textarea>';
    }
    return '<input class="appMenuInlineInput rakShiftOverviewInput" data-shift-overview-field="' + esc(path) + '" aria-label="' + esc(opts.label || path) + '" type="text" inputmode="' + esc(opts.inputmode || 'text') + '" value="' + esc(value) + '" placeholder="' + esc(opts.placeholder || '') + '">';
  }

  function shiftOptions(selected) {
    const types = [
      ['ranni12', 'Ranní 12 h · 6–18'], ['nocni12', 'Noční 12 h · 18–6'],
      ['ranni8', 'Ranní 8 h · 6–14'], ['nocni8', 'Noční 8 h · 22–6']
    ];
    return '<option value="">Vyber směnu</option>' + ['A','B','C','D'].map(team => types.map(([key,label]) => {
      const value = team + ':' + key;
      return '<option value="' + value + '"' + (value === selected ? ' selected' : '') + '>' + team + ' · ' + label + '</option>';
    }).join('')).join('');
  }

  function quantityMultiplier(key) {
    return { stock: 32, assembly: 32, op1121: 32, hard: 32, op31: 64, op121: 64 }[key] || 0;
  }

  function canMultiply(value) {
    const text = String(value == null ? '' : value).trim();
    return /^\d{1,2}$/.test(text) && Number(text) >= 1 && Number(text) <= 99;
  }

  function refreshMultipliers(rootEl) {
    rootEl.querySelectorAll('[data-shift-overview-multiply]').forEach(button => {
      const input = button.parentElement.querySelector('[data-shift-overview-field]');
      button.hidden = !input || !canMultiply(input.value);
    });
  }

  function labeledField(label, path, record, options) {
    const opts = Object.assign({ label }, options);
    let control = field(path, record, opts);
    if (opts.multiplier) {
      control = '<div class="rakShiftOverviewQuantity">' + control +
        '<button type="button" class="appMenuAction rakShiftOverviewMultiply" data-shift-overview-multiply="' + esc(path) + '" aria-label="Vynásobit ' + esc(opts.label) + ' číslem ' + opts.multiplier + '"' + (canMultiply(nestedGet(record,path)) ? '' : ' hidden') + '>×' + opts.multiplier + '</button></div>';
    }
    return '<label><span>' + esc(label) + '</span>' + control + '</label>';
  }

  function panel(title, html, cls) {
    return '<section class="rakShiftOverviewPanel ' + (cls || '') + '"><h3>' + esc(title) + '</h3>' + html + '</section>';
  }

  const ALD1_INPUT_ROWS = ['SR1','SR2','SR3','SR4','SR5','SR6','SR7','FR3','FR5','FR7','ZSB-RLR','SRRG','AAR'];
  const ALD2_INPUT_ROWS = ['Awa','Awi','TW1','TW2','TW3'];

  function batchCounter(name, id, record) {
    const path = 'inputs.rows.' + name + '.ald' + id;
    const label = name.replace('-', ' ');
    const value = nestedGet(record, path);
    return '<div class="rakShiftOverviewCounter"><span>' + esc(label) + '</span>' +
      '<button type="button" class="appMenuAction rakShiftOverviewCountPlus" data-shift-overview-count="' + esc(path) + '" data-count-step="1" aria-label="Přidat vsázku ' + esc(label) + ' ALD' + id + '">+</button>' +
      '<input class="rakShiftOverviewInput rakShiftOverviewCountValue" data-shift-overview-field="' + esc(path) + '" aria-label="Počet vsázek ' + esc(label) + ' ALD' + id + '" type="text" readonly value="' + esc(value === '' ? '0' : value) + '">' +
      '<button type="button" class="appMenuAction rakShiftOverviewCountMinus" data-shift-overview-count="' + esc(path) + '" data-count-step="-1" aria-label="Odebrat vsázku ' + esc(label) + ' ALD' + id + '">−</button></div>';
  }

  function inputsTable(record) {
    return '<div class="rakShiftOverviewBatchColumns">' + [[1,ALD1_INPUT_ROWS],[2,ALD2_INPUT_ROWS]].map(([id,rows]) => panel('ALD' + id,
      labeledField('Poslední vsázka', 'lastBatch.ald' + id, record, { label: 'ALD' + id + ' · Poslední vsázka' }) +
      '<div class="rakShiftOverviewInputRows">' + rows.map(name => batchCounter(name,id,record)).join('') + '</div>')).join('') +
      '<div class="rakShiftOverviewUtilities">' + panel('ALD3',labeledField('Poslední vsázka','lastBatch.ald3',record,{label:'ALD3 · Poslední vsázka'})) +
      panel('Dusík',labeledField('Hodnota','nitrogen',record,{inputmode:'decimal',label:'Dusík · Hodnota'})) + '</div></div>';
  }

  function oamTable(record) {
    const groups = [
      ['Měkké obrábění', OAM_LEFT_COLUMNS.slice(0,2)],
      ['Sklad před kalením', OAM_LEFT_COLUMNS.slice(2,4)],
      ['Sklad po kalení', OAM_LEFT_COLUMNS.slice(4,6)],
      ['Nýtování', [OAM_LEFT_COLUMNS[6]]],
      ['Tvrdé obrábění', [{key:'hard',label:'212'}]],
      ['Sklad', [{key:'stock',label:'Sklad'}]],
      ['Montáž', [{key:'assembly',label:'Montáž'}]]
    ];
    return '<div class="rakShiftOverviewFlow">' + groups.map(([title,cols]) => panel(title,
      '<div class="rakShiftOverviewStationRows">' + OAM_ROWS.map((row,index) => '<div class="rakShiftOverviewIndexRow ' + row.cls + '"><h4>' + esc(AAR_COLUMNS[index].label) + '</h4><div class="rakShiftOverviewFieldGrid">' + cols.map(col => labeledField(col.label + (col.sub ? ' · ' + col.sub : ''), 'oam.rows.' + row.key + '.' + col.key,record,{inputmode:'numeric',multiplier:quantityMultiplier(col.key),label:AAR_COLUMNS[index].label + ' · ' + title + ' · ' + col.label + (col.sub ? ' · ' + col.sub : '')})).join('') + '</div></div>').join('') + '</div>')).join('') + '</div>';
  }

  function buildHtml(record) {
    return [
      '<div class="appMenuCard appMenuAdminCard rakShiftOverviewCard" id="rakShiftOverviewRoot">',
      '<div class="appMenuCardTitle">Přehled směny</div>',
      '<div class="appMenuText smallText">Přehled podle provozní tabulky · ukládá se v tomto zařízení.</div>',
      '<div class="rakShiftOverviewHeader">',
      '<label>Datum<div class="rakShiftOverviewDateShell"><span data-shift-overview-date-display aria-hidden="true">' + esc(displayDate(record.date)) + '</span><input class="appMenuInlineInput" aria-label="Datum směny" data-shift-overview-date type="date" value="' + esc(record.date) + '"></div></label>',
      '<label>Směna<select class="appMenuSelect" data-shift-overview-shift>' + shiftOptions(record.shift) + '</select></label>',
      '</div>',
      '<div class="appMenuActionRow rakShiftOverviewTopActions"><button type="button" class="appMenuAction" data-shift-overview-action="load">Načíst</button><button type="button" class="appMenuAction" data-shift-overview-action="previous">Načíst předchozí</button><button type="button" class="appMenuAction isActive" data-shift-overview-action="save">Uložit</button></div>',
      '<div class="smallText rakShiftOverviewStatus" data-shift-overview-status role="status" aria-live="polite">' + (record.updatedAt ? 'Načteno · naposledy uloženo ' + esc(new Date(record.updatedAt).toLocaleString('cs-CZ')) : 'Pro tento den zatím není uložený přehled.') + '</div>',
      '<div class="appMenuSubTitle">Tok dílů</div>',
      oamTable(record),
      '<div class="rakShiftOverviewLower">',
      inputsTable(record),
      panel('Závady', labeledField('Obrábění','machiningFaults',record,{area:true,rows:3}) + [0,1,2].map(index => labeledField('ALD' + (index + 1),'ald.' + index + '.faults',record,{area:true,rows:3,label:'ALD' + (index + 1) + ' · Závady'})).join('')),
      '</div>',
      '<div class="appMenuSubTitle">Celkové poznámky ke směně</div>',
      field('notes', record, { area: true, rows: 4, placeholder: 'Další důležité informace ze směny…' }),
      '<div class="appMenuActionRow"><button type="button" class="appMenuAction isActive" data-shift-overview-action="save">Uložit přehled</button><button type="button" class="appMenuAction appMenuBack" data-menu-back="1">Zpět</button></div>',
      '</div>'
    ].join('');
  }

  function readDom(rootEl) {
    const date = String(rootEl.querySelector('[data-shift-overview-date]')?.value || localDateString());
    const shift = String(rootEl.querySelector('[data-shift-overview-shift]')?.value || '');
    const record = normalizeRecord(clone(renderedRecords.get(rootEl) || {}), date, shift);
    record.date = date;
    record.shift = normalizeShift(shift);
    rootEl.querySelectorAll('[data-shift-overview-field]').forEach((el) => {
      nestedSet(record, el.getAttribute('data-shift-overview-field'), String(el.value || '').trim());
    });
    record.updatedAt = new Date().toISOString();
    return record;
  }

  function refreshTotals(rootEl) {
    let batchTotal = 0;
    INPUT_ROWS.forEach((name) => {
      const total = ['ald1', 'ald2'].reduce((sum, key) => {
        const el = rootEl.querySelector('[data-shift-overview-field="inputs.rows.' + name + '.' + key + '"]');
        return sum + numberOrZero(el && el.value);
      }, 0);
      const out = rootEl.querySelector('[data-shift-overview-input-total="' + name + '"]');
      if (out) out.textContent = String(total);
      batchTotal += total;
    });
    const batches = rootEl.querySelector('[data-shift-overview-batch-total]');
    if (batches) batches.textContent = String(batchTotal);
    AAR_ROWS.forEach((row) => {
      let total = 0;
      AAR_COLUMNS.forEach((col) => {
        const el = rootEl.querySelector('[data-shift-overview-field="aar.matrix.' + row.key + '.' + col.key + '"]');
        total += numberOrZero(el && el.value);
      });
      const out = rootEl.querySelector('[data-shift-overview-total="' + row.key + '"]');
      if (out) out.textContent = String(total);
    });
    const stockTotal = rootEl.querySelector('[data-shift-overview-total="stock"]');
    const grand = rootEl.querySelector('[data-shift-overview-grand-total]');
    if (grand) grand.textContent = stockTotal ? stockTotal.textContent : '0';

    OAM_LEFT_COLUMNS.concat(OAM_RIGHT_COLUMNS).forEach((col) => {
      let total = 0;
      OAM_ROWS.forEach((row) => {
        const el = rootEl.querySelector('[data-shift-overview-field="oam.rows.' + row.key + '.' + col.key + '"]');
        total += numberOrZero(el && el.value);
      });
      const out = rootEl.querySelector('[data-shift-overview-oam-total="' + col.key + '"]');
      if (out) out.textContent = String(total);
    });
  }

  function status(rootEl, message) {
    const el = rootEl.querySelector('[data-shift-overview-status]');
    if (el) el.textContent = String(message || '');
  }

  function render(body, forcedRecord) {
    if (!body) return false;
    if (!ownerAllowed()) {
      body.dataset.adminView = 'shift-overview';
      body.innerHTML = '<div class="appMenuCard appMenuAdminCard"><div class="appMenuCardTitle">Přehled směny</div><div class="appMenuText">Tato testovací funkce je zatím dostupná pouze hlavnímu správci.</div><button type="button" class="appMenuAction appMenuBack" data-menu-back="1">Zpět</button></div>';
      return false;
    }
    const defaults = currentShiftContext();
    const date = forcedRecord && forcedRecord.date ? String(forcedRecord.date) : defaults.date;
    const shift = forcedRecord ? normalizeShift(forcedRecord.shift) : defaults.shift;
    const record = normalizeRecord(forcedRecord || getSaved(date, shift) || defaultRecord(date, shift), date, shift);
    body.dataset.adminView = 'shift-overview';
    body.innerHTML = buildHtml(record);
    const rootEl = body.querySelector('#rakShiftOverviewRoot');
    if (rootEl) renderedRecords.set(rootEl, clone(record));
    bind(body);
    return true;
  }

  function bind(body) {
    const rootEl = body && body.querySelector ? body.querySelector('#rakShiftOverviewRoot') : null;
    if (!rootEl || rootEl.dataset.bound === '1') return;
    rootEl.dataset.bound = '1';
    refreshTotals(rootEl);
    refreshMultipliers(rootEl);

    rootEl.addEventListener('change', () => { syncDateDisplay(rootEl); refreshMultipliers(rootEl); });
    rootEl.addEventListener('input', (event) => {
      syncDateDisplay(rootEl);
      refreshMultipliers(rootEl);
      if (event.target && event.target.matches && (
        event.target.matches('[data-shift-overview-field^="aar.matrix."]')
        || event.target.matches('[data-shift-overview-field^="oam.rows."]')
        || event.target.matches('[data-shift-overview-field^="inputs.rows."]')
      )) refreshTotals(rootEl);
    });

    rootEl.addEventListener('click', (event) => {
      const multiply = event.target && event.target.closest ? event.target.closest('[data-shift-overview-multiply]') : null;
      if (multiply && rootEl.contains(multiply)) {
        event.preventDefault();
        if (!ownerAllowed()) { status(rootEl, 'Přístup byl zamítnut.'); return; }
        const path = multiply.getAttribute('data-shift-overview-multiply');
        const input = multiply.parentElement.querySelector('[data-shift-overview-field]');
        const factor = quantityMultiplier(String(path).split('.').pop());
        if (input && factor && canMultiply(input.value)) {
          input.value = String(Number(input.value.trim()) * factor);
          refreshMultipliers(rootEl);
          refreshTotals(rootEl);
        }
        return;
      }
      const counter = event.target && event.target.closest ? event.target.closest('[data-shift-overview-count]') : null;
      if (counter && rootEl.contains(counter)) {
        event.preventDefault();
        if (!ownerAllowed()) { status(rootEl, 'Přístup byl zamítnut.'); return; }
        const path = counter.getAttribute('data-shift-overview-count');
        const input = rootEl.querySelector('[data-shift-overview-field="' + path + '"]');
        if (input) {
          const step = counter.getAttribute('data-count-step') === '-1' ? -1 : 1;
          input.value = String(Math.max(0, numberOrZero(input.value) + step));
          refreshTotals(rootEl);
        }
        return;
      }
      const button = event.target && event.target.closest ? event.target.closest('[data-shift-overview-action]') : null;
      if (!button || !rootEl.contains(button)) return;
      event.preventDefault();
      if (!ownerAllowed()) {
        status(rootEl, 'Přístup byl zamítnut. Funkce je pouze pro hlavního správce.');
        return;
      }
      const action = String(button.getAttribute('data-shift-overview-action') || '');
      const date = String(rootEl.querySelector('[data-shift-overview-date]')?.value || localDateString());
      const shift = String(rootEl.querySelector('[data-shift-overview-shift]')?.value || '');

      if (action === 'save') {
        if (!/^[ABCD]:(ranni|nocni)(8|12)$/.test(shift)) { status(rootEl, 'Vyber směnu pro tento přehled.'); return; }
        try {
          const record = readDom(rootEl);
          const store = readStore();
          store[recordKey(record.date, record.shift)] = record;
          writeStore(store);
          status(rootEl, 'Uloženo v tomto zařízení ✓ · ' + new Date(record.updatedAt).toLocaleString('cs-CZ'));
        } catch (err) {
          status(rootEl, 'Uložení se nepodařilo: ' + String(err && err.message ? err.message : err));
        }
        return;
      }

      if (action === 'load') {
        const saved = getSaved(date, shift);
        render(body, saved || defaultRecord(date, shift));
        const next = body.querySelector('#rakShiftOverviewRoot');
        if (next && !saved) status(next, 'Pro vybraný den a směnu zatím není nic uložené.');
        return;
      }

      if (action === 'previous') {
        const records = Object.values(readStore())
          .map((row) => normalizeRecord(row))
          .filter((row) => row.date && row.date < date && row.shift === shift)
          .sort((a, b) => String(b.date).localeCompare(String(a.date)));
        if (!records.length) {
          status(rootEl, 'Předchozí uložený přehled pro tento typ směny nebyl nalezen.');
          return;
        }
        const previous = clone(records[0]);
        previous.date = date;
        previous.shift = shift;
        previous.updatedAt = '';
        render(body, previous);
        const next = body.querySelector('#rakShiftOverviewRoot');
        if (next) status(next, 'Načtena předchozí směna z ' + records[0].date + ' jako základ. Změny ještě nejsou uložené.');
      }
    });
  }

  function installStyle() {
    if (document.getElementById('rakShiftOverviewStyle')) return;
    const style = document.createElement('style');
    style.id = 'rakShiftOverviewStyle';
    style.textContent = [
      '#appMenuBody[data-admin-view="shift-overview"] .rakShiftOverviewCard{display:grid;gap:12px;min-width:0;}',
      '.rakShiftOverviewCard *{box-sizing:border-box;min-width:0;}',
      '.rakShiftOverviewCard label{display:grid;gap:6px;font-size:12px;font-weight:800;overflow-wrap:anywhere;}',
      '.rakShiftOverviewHeader{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:12px;align-items:start;}.rakShiftOverviewHeader>label{grid-template-rows:auto 44px;}.rakShiftOverviewTwo{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}',
      '.rakShiftOverviewInput,.rakShiftOverviewArea,.rakShiftOverviewHeader input,.rakShiftOverviewHeader select{width:100%;max-width:100%;min-width:0;margin:0;}.rakShiftOverviewInput,.rakShiftOverviewHeader input,.rakShiftOverviewHeader select{min-height:44px;font-size:16px;}',
      '.rakShiftOverviewDateShell{position:relative;height:44px;width:100%;overflow:hidden;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:rgba(255,255,255,.045);}.rakShiftOverviewDateShell>span{position:absolute;inset:0;display:grid;place-items:center;font-size:14px;white-space:nowrap;pointer-events:none;}.rakShiftOverviewHeader .rakShiftOverviewDateShell input{position:absolute;inset:0;width:100%;height:100%;min-width:0;min-height:0;margin:0;padding:0;opacity:0;}.rakShiftOverviewHeader select{height:44px;min-height:44px;padding:0 6px;overflow:hidden;}',
      '.rakShiftOverviewArea{resize:vertical;min-height:76px;border:1px solid rgba(124,255,124,.18);border-radius:12px;background:rgba(255,255,255,.045);color:var(--text);padding:10px;font:inherit;}',
      '.rakShiftOverviewPanel{border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:12px;display:grid;gap:12px;align-content:start;background:rgba(255,255,255,.025);}',
      '.rakShiftOverviewPanel h3{font-size:14px;margin:0;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,.15);}',
      '.rakShiftOverviewPanel.isGreen{border-top:5px solid #87ac3a;}.rakShiftOverviewPanel.isBlue{border-top:5px solid #1472c2;}.rakShiftOverviewPanel.isOrange{border-top:5px solid #ce552f;}',
      '.rakShiftOverviewFlow,.rakShiftOverviewUtilities{display:grid;gap:12px;}',
      '.rakShiftOverviewStationRows{display:grid;gap:8px;}.rakShiftOverviewIndexRow{border-left:4px solid transparent;padding:8px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,3fr);gap:10px;align-items:center;}.rakShiftOverviewIndexRow h4{margin:0;font-size:12px;}.rakShiftOverviewIndexRow label>span{display:block;width:100%;text-align:center;}.rakShiftOverviewIndexRow label:has(.rakShiftOverviewMultiply:not([hidden]))>span{width:calc(100% - 42px);}.rakShiftOverviewIndexRow{border-radius:10px;}.rakShiftOverviewIndexRow.isGreen{border-color:#87ac3a;background:rgba(135,172,58,.24);}.rakShiftOverviewIndexRow.isBlue{border-color:#1472c2;background:rgba(20,114,194,.27);}.rakShiftOverviewIndexRow.isOrange{border-color:#ce552f;background:rgba(206,85,47,.25);}',
      '.rakShiftOverviewStage{display:grid;align-content:start;gap:8px;}.rakShiftOverviewStage h4{font-size:12px;margin:0;overflow-wrap:anywhere;}',
      '.rakShiftOverviewFieldGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}',
      '.rakShiftOverviewStage:nth-child(n+4) .rakShiftOverviewFieldGrid{grid-template-columns:minmax(0,1fr);}',
      '.rakShiftOverviewIndexRow .rakShiftOverviewFieldGrid:has(>label:only-child){grid-template-columns:minmax(0,1fr);}.rakShiftOverviewQuantity{display:flex;align-items:center;gap:4px;}.rakShiftOverviewQuantity .rakShiftOverviewInput{flex:1;}.rakShiftOverviewQuantity .rakShiftOverviewMultiply{flex:0 0 38px;width:38px;min-width:0;height:44px;min-height:44px;margin:0;padding:0;display:grid;place-items:center;font-size:12px;line-height:1;}.rakShiftOverviewMultiply[hidden]{display:none!important;}',
      '.rakShiftOverviewStages .rakShiftOverviewInput{padding:8px 4px;text-align:center;}',
      '.rakShiftOverviewStages label{font-size:11px;}',
      '.rakShiftOverviewPanels{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:12px;}',
      '.rakShiftOverviewLower{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:12px;align-items:start;}',
      '.rakShiftOverviewBatchColumns{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:12px;align-items:start;}',
      '.rakShiftOverviewUtilities{grid-column:1/-1;grid-template-columns:repeat(2,minmax(0,1fr));}',
      '.rakShiftOverviewInputRows{display:grid;gap:6px;}.rakShiftOverviewInputRows label{grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:center;}',
      '.rakShiftOverviewInputRows input{padding:8px;text-align:center;}',
      '.rakShiftOverviewCounter{display:grid;grid-template-columns:minmax(40px,.65fr) minmax(44px,1fr) minmax(54px,1fr) minmax(44px,.85fr);gap:8px;align-items:center;padding:8px 0;}.rakShiftOverviewCounter+.rakShiftOverviewCounter{border-top:1px solid rgba(255,255,255,.12);}.rakShiftOverviewCounter>span{font-size:12px;font-weight:800;overflow-wrap:anywhere;}.rakShiftOverviewCounter .appMenuAction{width:100%;min-width:0;height:44px;min-height:44px;margin:0;padding:0;display:grid;place-items:center;line-height:1;font-size:24px;align-self:center;}.rakShiftOverviewCounter .rakShiftOverviewCountValue{height:44px;min-height:44px;margin:0;text-align:center;font-weight:900;border:1px solid rgba(255,255,255,.15);border-radius:10px;background:rgba(255,255,255,.035);color:var(--text);padding:0;align-self:center;}.rakShiftOverviewCounter .rakShiftOverviewCountMinus{width:calc(100% - 8px);justify-self:end;opacity:.75;}',

      '.rakShiftOverviewStatus,.rakShiftOverviewSummary,.rakShiftOverviewBatchSummary{padding:10px;border-radius:12px;background:rgba(124,255,124,.06);overflow-wrap:anywhere;}',
      '.rakShiftOverviewSummary,.rakShiftOverviewBatchSummary{display:flex;justify-content:space-between;gap:10px;}',
      '.rakShiftOverviewDetails{border:1px solid rgba(124,255,124,.16);border-radius:12px;padding:10px;}.rakShiftOverviewDetails summary{cursor:pointer;font-weight:800;}',
      '.rakShiftOverviewExtra{display:grid;gap:12px;margin-top:12px;}',
      '.rakShiftOverviewFree{display:grid;grid-template-columns:minmax(0,1fr) 76px;gap:10px;}',
      '.rakShiftOverviewCard .appMenuActionRow{flex-wrap:wrap;}',
      '.rakShiftOverviewFlow{grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));}.rakShiftOverviewHeader select{font-size:13px;}',
      '@media(max-width:650px){.rakShiftOverviewStages{grid-template-columns:repeat(2,minmax(0,1fr));}.rakShiftOverviewLower{grid-template-columns:minmax(0,1fr);}.rakShiftOverviewBatchColumns{grid-template-columns:minmax(0,1fr);}}',
      '@media(max-width:430px){.rakShiftOverviewCard{padding:12px!important;}.rakShiftOverviewUtilities{grid-template-columns:minmax(0,1fr);}}'
    ].join('');
    document.head.appendChild(style);
  }

  installStyle();
  root.renderAdminShiftOverview = render;
  root.RakAdminShiftOverview = Object.freeze({ render, storageKey: STORAGE_KEY, ownerAllowed });
})(typeof window !== 'undefined' ? window : globalThis);
