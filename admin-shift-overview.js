// RaK TEST – owner-only Přehled směny.
// První iterace ukládá provozní přehled pouze lokálně v zařízení.
try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('admin-shift-overview.js', 'loaded', { source: 'dynamic-loader' }); } catch (err) {}

(function installRakAdminShiftOverview(root) {
  'use strict';

  const STORAGE_KEY = 'rak_admin_shift_overview_v1';
  const MAX_RECORDS = 120;
  const AAR_COLUMNS = [
    { key: 'agAe', label: 'AG / AE', cls: 'isGreen' },
    { key: 'afAd', label: 'AF / AD', cls: 'isBlue' },
    { key: 'adAg', label: 'AD / AG', cls: 'isYellow' },
    { key: 'ahAh', label: 'AH / AH', cls: 'isOrange' }
  ];
  const AAR_ROWS = [
    { key: 'turning', label: 'Soustružení' },
    { key: 'toStock', label: 'Do skladu' },
    { key: 'stock', label: 'Stav skladu' }
  ];

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
    return {
      date: date || localDateString(),
      shift: shift || 'ranni12',
      ald: [1, 2, 3].map((id) => ({ id, inserts: '', faults: '', rejects: '', running: '', longFaults: '' })),
      aar: {
        plan: 'Po–So 1184/1184 · Ne 704/800',
        matrix,
        freeTurning: '', freeTurningKs: '',
        freeGround: '', freeGroundKs: '',
        freeHardened: '', freeHardenedKs: '',
        faults: ''
      },
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
    base.ald = base.ald.map((row, index) => Object.assign(row, src.ald && src.ald[index] ? src.ald[index] : {}));
    base.aar = Object.assign(base.aar, src.aar || {});
    base.aar.matrix = base.aar.matrix || {};
    AAR_ROWS.forEach((row) => {
      base.aar.matrix[row.key] = Object.assign({}, base.aar.matrix[row.key] || {});
      AAR_COLUMNS.forEach((col) => {
        if (base.aar.matrix[row.key][col.key] == null) base.aar.matrix[row.key][col.key] = '';
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
      return '<textarea class="rakShiftOverviewArea" data-shift-overview-field="' + esc(path) + '" rows="' + String(opts.rows || 3) + '" placeholder="' + esc(opts.placeholder || '') + '">' + esc(value) + '</textarea>';
    }
    return '<input class="appMenuInlineInput rakShiftOverviewInput" data-shift-overview-field="' + esc(path) + '" type="text" inputmode="' + esc(opts.inputmode || 'text') + '" value="' + esc(value) + '" placeholder="' + esc(opts.placeholder || '') + '">';
  }

  function shiftOptions(selected) {
    return [
      ['ranni12', 'Ranní 12 h · 6–18'],
      ['nocni12', 'Noční 12 h · 18–6'],
      ['ranni8', 'Ranní 8 h · 6–14'],
      ['nocni8', 'Noční 8 h · 22–6']
    ].map((row) => '<option value="' + row[0] + '"' + (row[0] === selected ? ' selected' : '') + '>' + row[1] + '</option>').join('');
  }

  function aldCard(index, record) {
    const prefix = 'ald.' + index + '.';
    return [
      '<section class="rakShiftOverviewAldCard">',
      '<div class="rakShiftOverviewAldTitle"><b>ALD ' + String(index + 1) + '</b><span>zařízení</span></div>',
      '<div class="rakShiftOverviewTwo">',
      '<label>Vsázky před kalírnou' + field(prefix + 'inserts', record, { inputmode: 'numeric', placeholder: '0' }) + '</label>',
      '<label>Počet zmetků' + field(prefix + 'rejects', record, { inputmode: 'numeric', placeholder: '0' }) + '</label>',
      '</div>',
      '<label>Závady' + field(prefix + 'faults', record, { area: true, rows: 3, placeholder: 'Průběh závady, čas, zásah…' }) + '</label>',
      '<label>Počet BK/ST v provozu' + field(prefix + 'running', record, { placeholder: 'např. 9 nebo 4 / 1;2;3;5' }) + '</label>',
      '<label>Dlouhodobé závady' + field(prefix + 'longFaults', record, { area: true, rows: 2, placeholder: 'Dlouhodobý problém / omezení…' }) + '</label>',
      '</section>'
    ].join('');
  }

  function aarTable(record) {
    const head = AAR_COLUMNS.map((col) => '<th class="' + col.cls + '">' + col.label + '</th>').join('');
    const body = AAR_ROWS.map((row) => {
      const cells = AAR_COLUMNS.map((col) =>
        '<td>' + field('aar.matrix.' + row.key + '.' + col.key, record, { inputmode: 'numeric' }) + '</td>'
      ).join('');
      return '<tr><th>' + row.label + '</th>' + cells + '<td class="rakShiftOverviewTotal" data-shift-overview-total="' + row.key + '">0</td></tr>';
    }).join('');
    return '<div class="rakShiftOverviewTableScroll"><table class="rakShiftOverviewAarTable"><thead><tr><th></th>' + head + '<th>Celkem</th></tr></thead><tbody>' + body + '</tbody></table></div>';
  }

  function buildHtml(record) {
    return [
      '<div class="appMenuCard appMenuAdminCard rakShiftOverviewCard" id="rakShiftOverviewRoot">',
      '<div class="appMenuCardTitle">Přehled směny</div>',
      '<div class="appMenuText"><div>Provozní přehled podle papírové tabulky. Testovací verze je zatím jen pro hlavního správce.</div><div class="smallText">Ukládá se pouze v tomto zařízení. Nic se zatím neposílá do Supabase ani do produkce.</div></div>',
      '<div class="rakShiftOverviewHeader">',
      '<label>Datum<input class="appMenuInlineInput" data-shift-overview-date type="date" value="' + esc(record.date) + '"></label>',
      '<label>Směna D<select class="appMenuSelect" data-shift-overview-shift>' + shiftOptions(record.shift) + '</select></label>',
      '</div>',
      '<div class="appMenuActionRow rakShiftOverviewTopActions"><button type="button" class="appMenuAction" data-shift-overview-action="load">Načíst</button><button type="button" class="appMenuAction" data-shift-overview-action="previous">Načíst předchozí</button><button type="button" class="appMenuAction isActive" data-shift-overview-action="save">Uložit</button></div>',
      '<div class="smallText rakShiftOverviewStatus" data-shift-overview-status role="status" aria-live="polite">' + (record.updatedAt ? 'Načteno · naposledy uloženo ' + esc(new Date(record.updatedAt).toLocaleString('cs-CZ')) : 'Pro tento den zatím není uložený přehled.') + '</div>',
      '<div class="appMenuSubTitle">ALD 1–3</div>',
      [0, 1, 2].map((index) => aldCard(index, record)).join(''),
      '<div class="appMenuSubTitle">Výroba AAR</div>',
      '<label class="rakShiftOverviewPlan">PLÁN' + field('aar.plan', record, { placeholder: 'Po–So 1184/1184 · Ne 704/800' }) + '</label>',
      aarTable(record),
      '<div class="rakShiftOverviewSummary"><span>Stav skladu celkem</span><b data-shift-overview-grand-total>0</b></div>',
      '<div class="rakShiftOverviewFree">',
      '<label>Volné kalení – nasoustruženo' + field('aar.freeTurning', record, { placeholder: 'poznámka / stav' }) + '</label><label>ks' + field('aar.freeTurningKs', record, { inputmode: 'numeric' }) + '</label>',
      '<label>Volné kalení – nabroušeno' + field('aar.freeGround', record, { placeholder: 'poznámka / stav' }) + '</label><label>ks' + field('aar.freeGroundKs', record, { inputmode: 'numeric' }) + '</label>',
      '<label>Volné kalení – zakaleno ALD1 + ALD2 / AAR' + field('aar.freeHardened', record, { placeholder: 'poznámka / stav' }) + '</label><label>ks' + field('aar.freeHardenedKs', record, { inputmode: 'numeric' }) + '</label>',
      '</div>',
      '<label>Závady na zařízení AAR' + field('aar.faults', record, { area: true, rows: 3, placeholder: 'např. TBKR07 – přestavba z AE na AD' }) + '</label>',
      '<div class="appMenuSubTitle">Celkové poznámky ke směně</div>',
      field('notes', record, { area: true, rows: 4, placeholder: 'Další důležité informace ze směny…' }),
      '<div class="appMenuActionRow"><button type="button" class="appMenuAction isActive" data-shift-overview-action="save">Uložit přehled</button><button type="button" class="appMenuAction appMenuBack" data-admin-action="back-admin">Zpět</button></div>',
      '</div>'
    ].join('');
  }

  function readDom(rootEl) {
    const date = String(rootEl.querySelector('[data-shift-overview-date]')?.value || localDateString());
    const shift = String(rootEl.querySelector('[data-shift-overview-shift]')?.value || 'ranni12');
    const record = defaultRecord(date, shift);
    rootEl.querySelectorAll('[data-shift-overview-field]').forEach((el) => {
      nestedSet(record, el.getAttribute('data-shift-overview-field'), String(el.value || '').trim());
    });
    record.updatedAt = new Date().toISOString();
    return record;
  }

  function refreshTotals(rootEl) {
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
  }

  function status(rootEl, message) {
    const el = rootEl.querySelector('[data-shift-overview-status]');
    if (el) el.textContent = String(message || '');
  }

  function render(body, forcedRecord) {
    if (!body) return false;
    if (!ownerAllowed()) {
      body.dataset.adminView = 'shift-overview';
      body.innerHTML = '<div class="appMenuCard appMenuAdminCard"><div class="appMenuCardTitle">Přehled směny</div><div class="appMenuText">Tato testovací funkce je zatím dostupná pouze hlavnímu správci.</div><button type="button" class="appMenuAction appMenuBack" data-admin-action="back-admin">Zpět</button></div>';
      return false;
    }
    const date = forcedRecord && forcedRecord.date ? String(forcedRecord.date) : localDateString();
    const shift = forcedRecord && forcedRecord.shift ? String(forcedRecord.shift) : 'ranni12';
    const record = normalizeRecord(forcedRecord || getSaved(date, shift) || defaultRecord(date, shift), date, shift);
    body.dataset.adminView = 'shift-overview';
    body.innerHTML = buildHtml(record);
    bind(body);
    return true;
  }

  function bind(body) {
    const rootEl = body && body.querySelector ? body.querySelector('#rakShiftOverviewRoot') : null;
    if (!rootEl || rootEl.dataset.bound === '1') return;
    rootEl.dataset.bound = '1';
    refreshTotals(rootEl);

    rootEl.addEventListener('input', (event) => {
      if (event.target && event.target.matches && event.target.matches('[data-shift-overview-field^="aar.matrix."]')) refreshTotals(rootEl);
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
      '.rakShiftOverviewTableScroll{overflow-x:auto;border-radius:14px;border:1px solid rgba(124,255,124,.14);}',
      '.rakShiftOverviewAarTable{width:100%;min-width:620px;border-collapse:collapse;background:rgba(0,0,0,.12);}',
      '.rakShiftOverviewAarTable th,.rakShiftOverviewAarTable td{border:1px solid rgba(255,255,255,.10);padding:6px;text-align:center;vertical-align:middle;}',
      '.rakShiftOverviewAarTable th{font-size:11px;font-weight:900;}',
      '.rakShiftOverviewAarTable thead th.isGreen{background:#48c92f;color:#071006;}',
      '.rakShiftOverviewAarTable thead th.isBlue{background:#22a9ef;color:#061019;}',
      '.rakShiftOverviewAarTable thead th.isYellow{background:#ffe21f;color:#171300;}',
      '.rakShiftOverviewAarTable thead th.isOrange{background:#ff6b18;color:#1b0900;}',
      '.rakShiftOverviewAarTable .rakShiftOverviewInput{min-height:34px;padding:6px;text-align:center;}',
      '.rakShiftOverviewTotal{font-weight:900;min-width:58px;}',
      '.rakShiftOverviewSummary{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid rgba(124,255,124,.14);border-radius:12px;background:rgba(255,255,255,.025);}',
      '.rakShiftOverviewSummary b{font-size:18px;color:var(--green2);}',
      '.rakShiftOverviewFree{display:grid;grid-template-columns:minmax(0,1fr) 92px;gap:10px;}',
      '.rakShiftOverviewStatus{padding:8px 10px;border-radius:12px;background:rgba(124,255,124,.06);border:1px solid rgba(124,255,124,.10);}',
      '@media(max-width:430px){.rakShiftOverviewHeader,.rakShiftOverviewTwo{grid-template-columns:1fr;}.rakShiftOverviewFree{grid-template-columns:minmax(0,1fr) 76px;}.rakShiftOverviewCard{padding:12px!important;}}'
    ].join('');
    document.head.appendChild(style);
  }

  installStyle();
  root.renderAdminShiftOverview = render;
  root.RakAdminShiftOverview = Object.freeze({ render, storageKey: STORAGE_KEY, ownerAllowed });
})(typeof window !== 'undefined' ? window : globalThis);
