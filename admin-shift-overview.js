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
    { key: 'ahAh', label: 'AH / AH', cls: 'isOrange' }
  ];
  const AAR_ROWS = [
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
    { key: 'soft', label: 'Měkké obrábění' },
    { key: 'kiln', label: 'Kalírna' },
    { key: 'kilnStock', label: 'Sklad kalírna' },
    { key: 'riveting', label: 'Nýtování' },
    { key: 'before150', label: 'Před op. 150' },
    { key: 'after150', label: 'Po op. 150' },
    { key: 'before162', label: 'Před op. 162' },
    { key: 'stock', label: 'Sklad' },
    { key: 'assembly', label: 'Montáž' }
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
      shift: shift || 'ranni12',
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
    base.shift = String(src.shift || shift || base.shift);
    base.notes = String(src.notes || '');
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
      PROCESS_COLUMNS.forEach((col) => {
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
    const found = readStore()[recordKey(date, shift)];
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
    return [
      ['ranni12', 'Ranní 12 h · 6–18'],
      ['nocni12', 'Noční 12 h · 18–6'],
      ['ranni8', 'Ranní 8 h · 6–14'],
      ['nocni8', 'Noční 8 h · 22–6']
    ].map((row) => '<option value="' + row[0] + '"' + (row[0] === selected ? ' selected' : '') + '>' + row[1] + '</option>').join('');
  }

  function scrollTable(label, html) {
    return '<div class="rakShiftOverviewScrollHint" aria-hidden="true"><span>←</span> Posuň tabulku do stran <span>→</span></div>' +
      '<div class="rakShiftOverviewTableScroll" tabindex="0" aria-label="' + esc(label) + ', tabulka se posouvá do stran">' + html + '</div>';
  }

  function processTable(record) {
    const groups = OAM_ROWS.map((row, index) => {
      const label = AAR_COLUMNS[index].label;
      const heading = PROCESS_COLUMNS.map((col) => '<th scope="col" class="' + row.cls + '">' + esc(col.label) + '</th>').join('');
      const cells = PROCESS_COLUMNS.map((col) => '<td>' + field('process.rows.' + row.key + '.' + col.key, record, { inputmode: 'numeric', label: label + ' · ' + col.label }) + '</td>').join('');
      return '<tbody><tr><th scope="rowgroup" rowspan="2" class="' + row.cls + '">' + esc(label) + '</th>' + heading + '</tr><tr>' + cells + '</tr></tbody>';
    }).join('');
    return scrollTable('Zásoby v provozu', '<table class="rakShiftOverviewPaper rakShiftOverviewProcess"><caption>Zásoby v provozu</caption>' + groups + '</table>');
  }

  function aldTable(record) {
    const columns = [
      ['inserts', 'Počty vsázek', 'numeric'], ['rejects', 'Zmetky', 'numeric'],
      ['running', 'Počet BK/ST v provozu', 'text'], ['faults', 'Závady', 'text']
    ];
    const rows = [0, 1, 2].map((index) => '<tr><th scope="row">ALD' + (index + 1) + '</th>' + columns.map(([key, label, mode]) =>
      '<td>' + field('ald.' + index + '.' + key, record, { inputmode: mode, area: key === 'faults', rows: 2, label: 'ALD' + (index + 1) + ' · ' + label }) + '</td>'
    ).join('') + '</tr>').join('');
    return scrollTable('ALD 1–3', '<table class="rakShiftOverviewPaper rakShiftOverviewAldTable"><thead><tr><th>Zařízení</th>' + columns.map((col) => '<th scope="col">' + col[1] + '</th>').join('') + '</tr></thead><tbody>' + rows + '</tbody></table>');
  }

  function inputsTable(record) {
    const rows = INPUT_ROWS.map((name) => '<tr><th scope="row">' + esc(name) + '</th>' + ['ald1', 'ald2'].map((key) =>
      '<td>' + field('inputs.rows.' + name + '.' + key, record, { inputmode: 'numeric', label: name + ' · ' + key.toUpperCase() }) + '</td>'
    ).join('') + '<td class="rakShiftOverviewTotal" data-shift-overview-input-total="' + esc(name) + '">0</td></tr>').join('');
    return '<div class="rakShiftOverviewHeader"><label>ALD1 Vstup' + field('inputs.ald1', record, { label: 'ALD1 Vstup' }) + '</label><label>ALD2 Vstup' + field('inputs.ald2', record, { label: 'ALD2 Vstup' }) + '</label></div>' +
      scrollTable('Vstupy ALD1 / ALD2', '<table class="rakShiftOverviewPaper rakShiftOverviewInputs"><thead><tr><th>Díl</th><th scope="col">ALD1</th><th scope="col">ALD2</th><th scope="col">Celkem</th></tr></thead><tbody>' + rows + '</tbody></table>');
  }

  function preKilnGrid(record) {
    const rows = PRE_KILN_ROWS.map((name) =>
      '<label><span>' + esc(name) + '</span>' + field('preKiln.' + name, record, { inputmode: 'numeric', placeholder: '0' }) + '</label>'
    ).join('');
    return [
      '<div class="rakShiftOverviewPreKiln">',
      rows,
      '</div>',
      '<div class="rakShiftOverviewLastBatch">',
      '<label>ALD1 č. posl. vs.:' + field('lastBatch.ald1', record, { placeholder: 'číslo poslední vsázky' }) + '</label>',
      '<label>ALD2 č. posl. vs.:' + field('lastBatch.ald2', record, { placeholder: 'číslo poslední vsázky' }) + '</label>',
      '<label>ALD3 č. posl. vs.:' + field('lastBatch.ald3', record, { placeholder: 'číslo poslední vsázky' }) + '</label>',
      '</div>'
    ].join('');
  }

  function aarTable(record, legacy) {
    const head = AAR_COLUMNS.map((col) => '<th class="' + col.cls + '">' + col.label + '</th>').join('');
    const body = AAR_ROWS.filter((row) => legacy ? ['toStock', 'stock'].includes(row.key) : ['turning', 'washing'].includes(row.key)).map((row) => {
      const cells = AAR_COLUMNS.map((col) =>
        '<td>' + field('aar.matrix.' + row.key + '.' + col.key, record, { inputmode: 'numeric', label: row.label + ' · ' + col.label }) + '</td>'
      ).join('');
      const rejects = legacy ? '' : '<td>' + field('aar.rejects.' + row.key, record, { inputmode: 'numeric', label: row.label + ' · Zmetky' }) + '</td>';
      return '<tr><th>' + row.label + '</th>' + cells + rejects + '<td class="rakShiftOverviewTotal" data-shift-overview-total="' + row.key + '">0</td></tr>';
    }).join('');
    return [
      '<div class="rakShiftOverviewScrollHint" aria-hidden="true"><span>←</span> Posuň tabulku do stran <span>→</span></div>',
      '<div class="rakShiftOverviewTableScroll" tabindex="0" aria-label="Výroba AAR, tabulka se posouvá do stran">',
      '<table class="rakShiftOverviewAarTable"><thead><tr><th>AAR</th>' + head + (legacy ? '' : '<th>Zmetky</th>') + '<th>Celkem</th></tr></thead><tbody>' + body + '</tbody></table>',
      '</div>'
    ].join('');
  }

  function oamTable(record) {
    const leftHead = OAM_LEFT_COLUMNS.map((col) => '<th><b>' + esc(col.label) + '</b>' + (col.sub ? '<span>' + esc(col.sub) + '</span>' : '') + '</th>').join('');
    const rightHead = OAM_RIGHT_COLUMNS.map((col) => '<th>' + esc(col.label) + '</th>').join('');
    const rows = OAM_ROWS.map((row) => {
      const leftCells = OAM_LEFT_COLUMNS.map((col) => '<td>' + field('oam.rows.' + row.key + '.' + col.key, record, { inputmode: 'numeric' }) + '</td>').join('');
      const rightCells = OAM_RIGHT_COLUMNS.map((col) => '<td>' + field('oam.rows.' + row.key + '.' + col.key, record, { inputmode: 'numeric' }) + '</td>').join('');
      return '<tr><th class="' + row.cls + '">' + esc(row.left) + '</th>' + leftCells + '<th class="' + row.cls + '">' + esc(row.right) + '</th>' + rightCells + '</tr>';
    }).join('');
    const leftTotals = OAM_LEFT_COLUMNS.map((col) => '<td data-shift-overview-oam-total="' + col.key + '">0</td>').join('');
    const rightTotals = OAM_RIGHT_COLUMNS.map((col) => '<td data-shift-overview-oam-total="' + col.key + '">0</td>').join('');
    return [
      '<div class="rakShiftOverviewScrollHint" aria-hidden="true"><span>←</span> Posuň tabulku do stran <span>→</span></div>',
      '<div class="rakShiftOverviewTableScroll" tabindex="0" aria-label="0AM 409 155 a 409 111, tabulka se posouvá do stran"><table class="rakShiftOverviewOamTable">',
      '<thead>',
      '<tr><th>0AM 409 155</th><th colspan="2">Měkké obrábění</th><th colspan="2">Sklad před kalením</th><th colspan="2">Sklad po kalení</th><th>Nýtování</th><th>0AM 409 111</th><th>Tvrdé obrábění</th><th>Sklad</th><th>Plán sklad</th><th>Montáž</th></tr>',
      '<tr><th>Číslo dílu / op</th>' + leftHead + '<th>Číslo dílu / op</th>' + rightHead + '</tr>',
      '</thead><tbody>',
      rows,
      '<tr class="rakShiftOverviewOamTotals"><th>Σ po operacích</th>' + leftTotals + '<th>Σ po operacích</th>' + rightTotals + '</tr>',
      '</tbody></table></div>'
    ].join('');
  }

  function buildHtml(record) {
    return [
      '<div class="appMenuCard appMenuAdminCard rakShiftOverviewCard" id="rakShiftOverviewRoot">',
      '<div class="appMenuCardTitle">Přehled směny</div>',
      '<div class="appMenuText smallText">Přehled podle provozní tabulky · ukládá se v tomto zařízení.</div>',
      '<div class="rakShiftOverviewHeader">',
      '<label>Datum<input class="appMenuInlineInput" data-shift-overview-date type="date" value="' + esc(record.date) + '"></label>',
      '<label>Směna D<select class="appMenuSelect" data-shift-overview-shift>' + shiftOptions(record.shift) + '</select></label>',
      '</div>',
      '<div class="appMenuActionRow rakShiftOverviewTopActions"><button type="button" class="appMenuAction" data-shift-overview-action="load">Načíst</button><button type="button" class="appMenuAction" data-shift-overview-action="previous">Načíst předchozí</button><button type="button" class="appMenuAction isActive" data-shift-overview-action="save">Uložit</button></div>',
      '<div class="smallText rakShiftOverviewStatus" data-shift-overview-status role="status" aria-live="polite">' + (record.updatedAt ? 'Načteno · naposledy uloženo ' + esc(new Date(record.updatedAt).toLocaleString('cs-CZ')) : 'Pro tento den zatím není uložený přehled.') + '</div>',
      '<div class="appMenuSubTitle">Zásoby v provozu</div>',
      processTable(record),
      '<div class="appMenuSubTitle">ALD 1–3</div>',
      aldTable(record),
      '<div class="appMenuSubTitle">Výroba AAR</div>',
      aarTable(record),
      '<div class="appMenuSubTitle">Vstupy ALD1 / ALD2</div>',
      inputsTable(record),
      '<details class="rakShiftOverviewDetails"><summary>Doplňující údaje</summary><div class="rakShiftOverviewExtra">',
      '<div class="appMenuSubTitle">Vsázky před kalírnou</div>',
      preKilnGrid(record),
      '<div class="appMenuSubTitle">Dlouhodobé závady</div>',
      [0, 1, 2].map((index) => '<label>ALD' + (index + 1) + field('ald.' + index + '.longFaults', record, { area: true, rows: 2, label: 'ALD' + (index + 1) + ' · Dlouhodobé závady' }) + '</label>').join(''),
      '<label class="rakShiftOverviewPlan">PLÁN' + field('aar.plan', record, { placeholder: 'Po–So 1184/1184 · Ne 704/800' }) + '</label>',
      aarTable(record, true),
      '<div class="rakShiftOverviewSummary"><span>Stav skladu celkem</span><b data-shift-overview-grand-total>0</b></div>',
      '<div class="rakShiftOverviewFree">',
      '<label>Volné kalení – nasoustruženo' + field('aar.freeTurning', record, { placeholder: 'poznámka / stav' }) + '</label><label>ks' + field('aar.freeTurningKs', record, { inputmode: 'numeric' }) + '</label>',
      '<label>Volné kalení – nabroušeno' + field('aar.freeGround', record, { placeholder: 'poznámka / stav' }) + '</label><label>ks' + field('aar.freeGroundKs', record, { inputmode: 'numeric' }) + '</label>',
      '<label>Volné kalení – zakaleno ALD1 + ALD2 / AAR' + field('aar.freeHardened', record, { placeholder: 'poznámka / stav' }) + '</label><label>ks' + field('aar.freeHardenedKs', record, { inputmode: 'numeric' }) + '</label>',
      '</div>',
      '<label>Závady na zařízení AAR' + field('aar.faults', record, { area: true, rows: 3, placeholder: 'např. TBKR07 – přestavba z AE na AD' }) + '</label>',
      '<div class="appMenuSubTitle">0AM 409 155 / 409 111</div>',
      oamTable(record),
      '</div></details>',
      '<div class="appMenuSubTitle">Celkové poznámky ke směně</div>',
      field('notes', record, { area: true, rows: 4, placeholder: 'Další důležité informace ze směny…' }),
      '<div class="appMenuActionRow"><button type="button" class="appMenuAction isActive" data-shift-overview-action="save">Uložit přehled</button><button type="button" class="appMenuAction appMenuBack" data-menu-back="1">Zpět</button></div>',
      '</div>'
    ].join('');
  }

  function readDom(rootEl) {
    const date = String(rootEl.querySelector('[data-shift-overview-date]')?.value || localDateString());
    const shift = String(rootEl.querySelector('[data-shift-overview-shift]')?.value || 'ranni12');
    const record = normalizeRecord(clone(renderedRecords.get(rootEl) || {}), date, shift);
    record.date = date;
    record.shift = shift;
    rootEl.querySelectorAll('[data-shift-overview-field]').forEach((el) => {
      nestedSet(record, el.getAttribute('data-shift-overview-field'), String(el.value || '').trim());
    });
    record.updatedAt = new Date().toISOString();
    return record;
  }

  function refreshTotals(rootEl) {
    INPUT_ROWS.forEach((name) => {
      const total = ['ald1', 'ald2'].reduce((sum, key) => {
        const el = rootEl.querySelector('[data-shift-overview-field="inputs.rows.' + name + '.' + key + '"]');
        return sum + numberOrZero(el && el.value);
      }, 0);
      const out = rootEl.querySelector('[data-shift-overview-input-total="' + name + '"]');
      if (out) out.textContent = String(total);
    });
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
    const date = forcedRecord && forcedRecord.date ? String(forcedRecord.date) : localDateString();
    const shift = forcedRecord && forcedRecord.shift ? String(forcedRecord.shift) : 'ranni12';
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

    rootEl.addEventListener('input', (event) => {
      if (event.target && event.target.matches && (
        event.target.matches('[data-shift-overview-field^="aar.matrix."]')
        || event.target.matches('[data-shift-overview-field^="oam.rows."]')
        || event.target.matches('[data-shift-overview-field^="inputs.rows."]')
      )) refreshTotals(rootEl);
    });

    rootEl.addEventListener('click', (event) => {
      const button = event.target && event.target.closest ? event.target.closest('[data-shift-overview-action]') : null;
      if (!button || !rootEl.contains(button)) return;
      event.preventDefault();
      if (!ownerAllowed()) {
        status(rootEl, 'Přístup byl zamítnut. Funkce je pouze pro hlavního správce.');
        return;
      }
      const action = String(button.getAttribute('data-shift-overview-action') || '');
      const date = String(rootEl.querySelector('[data-shift-overview-date]')?.value || localDateString());
      const shift = String(rootEl.querySelector('[data-shift-overview-shift]')?.value || 'ranni12');

      if (action === 'save') {
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
      '#appMenuBody[data-admin-view="shift-overview"] .rakShiftOverviewCard{display:grid;gap:12px;}',
      '.rakShiftOverviewHeader{display:grid;grid-template-columns:1fr 1fr;gap:10px;}',
      '.rakShiftOverviewHeader label,.rakShiftOverviewAldCard label,.rakShiftOverviewPlan,.rakShiftOverviewFree label{display:grid;gap:6px;font-size:12px;font-weight:800;}',
      '.rakShiftOverviewInput,.rakShiftOverviewArea{box-sizing:border-box;width:100%;min-width:0;}',
      '.rakShiftOverviewArea{resize:vertical;min-height:68px;border:1px solid rgba(124,255,124,.18);border-radius:12px;background:rgba(255,255,255,.045);color:var(--text);padding:10px;font:inherit;box-shadow:0 10px 22px rgba(0,0,0,.16);}',
      '.rakShiftOverviewAldCard{display:grid;gap:10px;padding:12px;border:1px solid rgba(124,255,124,.16);border-radius:16px;background:rgba(255,255,255,.025);}',
      '.rakShiftOverviewAldTitle{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:16px;}',
      '.rakShiftOverviewAldTitle span{font-size:11px;opacity:.55;text-transform:uppercase;letter-spacing:.12em;}',
      '.rakShiftOverviewTwo{display:grid;grid-template-columns:1fr 1fr;gap:10px;}',
      '.rakShiftOverviewScrollHint{display:none;align-items:center;justify-content:center;gap:8px;margin-bottom:-6px;color:var(--green2);font-size:11px;font-weight:900;letter-spacing:.02em;}',
      '.rakShiftOverviewScrollHint span{font-size:16px;line-height:1;}',
      '.rakShiftOverviewTableScroll{overflow-x:auto;overscroll-behavior-inline:contain;-webkit-overflow-scrolling:touch;scrollbar-color:rgba(255,255,255,.55) rgba(255,255,255,.08);border-radius:14px;border:1px solid rgba(124,255,124,.14);}',
      '.rakShiftOverviewTableScroll:focus-visible{outline:2px solid var(--green2);outline-offset:2px;}',
      '.rakShiftOverviewAarTable{width:100%;min-width:620px;border-collapse:collapse;background:rgba(0,0,0,.12);}',
      '.rakShiftOverviewAarTable th,.rakShiftOverviewAarTable td{border:1px solid rgba(255,255,255,.10);padding:6px;text-align:center;vertical-align:middle;}',
      '.rakShiftOverviewAarTable th{font-size:11px;font-weight:900;}',
      '.rakShiftOverviewAarTable thead th.isGreen{background:#48c92f;color:#071006;}',
      '.rakShiftOverviewAarTable thead th.isBlue{background:#22a9ef;color:#061019;}',
      '.rakShiftOverviewAarTable thead th.isYellow{background:#ffe21f;color:#171300;}',
      '.rakShiftOverviewAarTable thead th.isOrange{background:#ff6b18;color:#1b0900;}',
      '.rakShiftOverviewAarTable .rakShiftOverviewInput{min-height:34px;padding:6px;text-align:center;}',
      '.rakShiftOverviewAarTable thead th:first-child,.rakShiftOverviewAarTable tbody th:first-child{position:sticky;left:0;z-index:2;background:#25125d;box-shadow:8px 0 14px rgba(0,0,0,.22);}',
      '.rakShiftOverviewAarTable thead th:first-child{z-index:3;}',
      '.rakShiftOverviewTotal{font-weight:900;min-width:58px;}',
      '.rakShiftOverviewSummary{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid rgba(124,255,124,.14);border-radius:12px;background:rgba(255,255,255,.025);}',
      '.rakShiftOverviewSummary b{font-size:18px;color:var(--green2);}',
      '.rakShiftOverviewFree{display:grid;grid-template-columns:minmax(0,1fr) 92px;gap:10px;}',
      '.rakShiftOverviewStatus{padding:8px 10px;border-radius:12px;background:rgba(124,255,124,.06);border:1px solid rgba(124,255,124,.10);}',
      '.rakShiftOverviewPreKiln{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;}',
      '.rakShiftOverviewPreKiln label{display:grid;grid-template-columns:minmax(54px,auto) 1fr;align-items:center;gap:7px;font-size:11px;font-weight:900;}',
      '.rakShiftOverviewPreKiln .rakShiftOverviewInput{min-height:36px;padding:6px 8px;text-align:center;}',
      '.rakShiftOverviewLastBatch{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding-top:2px;}',
      '.rakShiftOverviewLastBatch label{display:grid;gap:5px;font-size:11px;font-weight:900;}',
      '.rakShiftOverviewOamTable{width:100%;min-width:1040px;border-collapse:collapse;background:rgba(0,0,0,.12);}',
      '.rakShiftOverviewOamTable th,.rakShiftOverviewOamTable td{border:1px solid rgba(255,255,255,.10);padding:5px;text-align:center;vertical-align:middle;font-size:10px;}',
      '.rakShiftOverviewOamTable thead th{font-weight:900;background:rgba(255,255,255,.045);}',
      '.rakShiftOverviewOamTable thead th span{display:block;font-size:9px;font-weight:700;opacity:.75;margin-top:2px;}',
      '.rakShiftOverviewOamTable th.isGreen{background:#68b832;color:#071006;}.rakShiftOverviewOamTable th.isBlue{background:#1598db;color:#061019;}.rakShiftOverviewOamTable th.isYellow{background:#ffe11e;color:#171300;}.rakShiftOverviewOamTable th.isOrange{background:#df5d1b;color:#1b0900;}',
      '.rakShiftOverviewOamTable .rakShiftOverviewInput{min-width:54px;min-height:34px;padding:5px;text-align:center;}',
      '.rakShiftOverviewOamTotals th,.rakShiftOverviewOamTotals td{font-weight:900;background:rgba(124,255,124,.05);}',
      '.rakShiftOverviewCard{min-width:0;}.rakShiftOverviewCard>*,.rakShiftOverviewExtra>*{min-width:0;}',
      '.rakShiftOverviewPaper{width:100%;border-collapse:collapse;background:rgba(0,0,0,.12);font-size:12px;}',
      '.rakShiftOverviewPaper caption{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);}',
      '.rakShiftOverviewPaper th,.rakShiftOverviewPaper td{border:1px solid rgba(255,255,255,.22);padding:5px;text-align:center;}',
      '.rakShiftOverviewPaper .rakShiftOverviewInput{min-height:36px;padding:6px;text-align:center;}',
      '.rakShiftOverviewProcess{min-width:970px;}.rakShiftOverviewProcess th{font-size:11px;min-width:85px;}.rakShiftOverviewProcess tbody+tbody{border-top:8px solid transparent;}',
      '.rakShiftOverviewProcess th.isGreen,.rakShiftOverviewProcess th:first-child.isGreen{background:#68b832;color:#071006;}.rakShiftOverviewProcess th.isBlue,.rakShiftOverviewProcess th:first-child.isBlue{background:#1598db;color:#061019;}.rakShiftOverviewProcess th.isOrange,.rakShiftOverviewProcess th:first-child.isOrange{background:#df5d1b;color:#1b0900;}',
      '.rakShiftOverviewPaper th:first-child{position:sticky;left:0;z-index:2;background:var(--panel,#25125d);min-width:76px;}',
      '.rakShiftOverviewAldTable{min-width:680px;}.rakShiftOverviewAldTable td:last-child{width:42%;}.rakShiftOverviewAldTable .rakShiftOverviewArea{min-height:64px;padding:6px;}',
      '.rakShiftOverviewInputs{min-width:340px;}.rakShiftOverviewInputs td{width:24%;}',
      '.rakShiftOverviewDetails{border:1px solid rgba(124,255,124,.16);border-radius:12px;padding:10px;}.rakShiftOverviewDetails summary{cursor:pointer;font-weight:800;}.rakShiftOverviewExtra{display:grid;gap:12px;margin-top:12px;}.rakShiftOverviewExtra label{display:grid;gap:6px;font-size:12px;}',
      '@media(max-width:430px){.rakShiftOverviewHeader,.rakShiftOverviewTwo{grid-template-columns:1fr;}.rakShiftOverviewFree{grid-template-columns:minmax(0,1fr) 76px;}.rakShiftOverviewPreKiln{grid-template-columns:repeat(2,minmax(0,1fr));}.rakShiftOverviewLastBatch{grid-template-columns:1fr;}.rakShiftOverviewScrollHint{display:flex;}.rakShiftOverviewCard{padding:12px!important;}}'
    ].join('');
    document.head.appendChild(style);
  }

  installStyle();
  root.renderAdminShiftOverview = render;
  root.RakAdminShiftOverview = Object.freeze({ render, storageKey: STORAGE_KEY, ownerAllowed });
})(typeof window !== 'undefined' ? window : globalThis);
