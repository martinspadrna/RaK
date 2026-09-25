// RaK – doplňkové akce sdílení reportu směny + umístění vstupu jen pro adminy.
(function () {
  'use strict';

  function getReport(root) {
    const preview = root && root.querySelector('.rakShiftPreview');
    return preview ? preview.textContent.trim() : '';
  }

  function status(root, text) {
    const el = root && root.querySelector('.rakShiftStatus');
    if (el) el.textContent = text;
  }

  async function copy(root) {
    const text = getReport(root);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      status(root, 'Report zkopírovaný do schránky.');
    } catch (err) {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try { document.execCommand('copy'); status(root, 'Report zkopírovaný do schránky.'); }
      catch (copyErr) { status(root, 'Kopírování se nepodařilo.'); }
      area.remove();
    }
  }

  function whatsapp(root) {
    const text = getReport(root);
    if (!text) return;
    const href = 'whatsapp://send?text=' + encodeURIComponent(text);
    const link = document.createElement('a');
    link.href = href;
    link.style.display = 'none';
    link.setAttribute('aria-hidden', 'true');
    document.body.appendChild(link);
    try {
      link.click();
      status(root, 'Otevírám WhatsApp…');
    } finally {
      setTimeout(() => link.remove(), 0);
    }
  }

  function install(root) {
    if (!root || root.dataset.rakShareActions === '1') return;
    const actions = root.querySelector('.rakShiftActions');
    if (!actions) return;
    const send = actions.querySelector('[data-shift-action="send"]');
    if (!send) return;

    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'appMenuAction';
    copyButton.dataset.rakShareAction = 'copy';
    copyButton.textContent = 'Zkopírovat';

    const whatsappButton = document.createElement('button');
    whatsappButton.type = 'button';
    whatsappButton.className = 'appMenuAction isActive';
    whatsappButton.dataset.rakShareAction = 'whatsapp';
    whatsappButton.textContent = 'WhatsApp';

    send.textContent = 'Sdílet…';
    actions.insertBefore(copyButton, send);
    actions.insertBefore(whatsappButton, send.nextSibling);
    root.dataset.rakShareActions = '1';

    copyButton.addEventListener('click', () => { void copy(root); });
    whatsappButton.addEventListener('click', () => whatsapp(root));
  }

  function adminAllowed() {
    try {
      if (typeof appMenuShouldShowAdminEntry === 'function') return !!appMenuShouldShowAdminEntry();
    } catch (err) {}
    try {
      const id = typeof rakAdminGetActiveAccountId === 'function' ? String(rakAdminGetActiveAccountId() || '').trim() : '';
      if (id === '9811') return true;
      if (id && typeof rakAdminAccountRequiresPassword === 'function' && rakAdminAccountRequiresPassword(id)) return true;
      if (typeof rakAdminCanOpenAdmin === 'function' && rakAdminCanOpenAdmin()) return true;
    } catch (err) {}
    return false;
  }

  function placeAdminEntry() {
    const body = document.getElementById('appMenuBody');
    if (!body || body.dataset.rakShiftReportOpen === '1') return;
    const report = body.querySelector('[data-admin-action="shift-report"]');
    if (!report) return;
    const admin = body.querySelector('[data-menu-action="admin"]');
    const allowed = adminAllowed() && !!admin;
    report.hidden = !allowed;
    report.disabled = !allowed;
    report.setAttribute('aria-hidden', allowed ? 'false' : 'true');
    if (!allowed) return;
    report.classList.remove('isActive');
    report.dataset.rakAdminOnly = '1';
    if (admin.nextElementSibling !== report) admin.insertAdjacentElement('afterend', report);
  }

  function scan() {
    const root = document.getElementById('rakShiftReport');
    if (root) install(root);
    placeAdminEntry();
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target && event.target.closest ? event.target.closest('[data-admin-action="shift-report"]') : null;
    if (!trigger || adminAllowed()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan, { once: true });
  else scan();
  let scanScheduled = false;
  const scheduleScan = () => {
    if (scanScheduled) return;
    scanScheduled = true;
    const run = () => { scanScheduled = false; scan(); };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    else setTimeout(run, 0);
  };
  new MutationObserver((records) => {
    const relevant = Array.from(records || []).some((record) => {
      const target = record && record.target;
      try {
        if (target && target.nodeType === 1 && target.closest && target.closest('#appMenuBody')) return true;
        return Array.from(record && record.addedNodes || []).some((node) => node && node.nodeType === 1 && (
          node.id === 'appMenuBody' || !!(node.querySelector && node.querySelector('#appMenuBody'))
        ));
      } catch (err) { return false; }
    });
    if (relevant) scheduleScan();
  }).observe(document.body, { childList: true, subtree: true });
})();

// RaK DEV – finální mobilní doladění Reportu směny.
(function () {
  'use strict';

  const STYLE_ID = 'rak-shift-report-ui-polish-style-v3';
  let scheduled = false;

  function compactEmptySections(text) {
    return String(text || '')
      .replace(/(^|\n)(MO|TO|R01|R07):\n\s*-\s*(?=\n|$)/g, '$1$2: —')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function compactPreview(root) {
    const preview = root && root.querySelector('.rakShiftPreview');
    if (!preview) return;
    const compact = compactEmptySections(preview.textContent);
    if (compact && compact !== preview.textContent.trim()) preview.textContent = compact;
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
#rakShiftReport.rakShiftReportPolished{gap:12px;padding-bottom:18px}
#rakShiftReport .rakShiftHero{padding:2px 2px 4px}
#rakShiftReport .rakShiftHero .appMenuSubTitle{font-size:20px;font-weight:850;letter-spacing:-.02em;margin-bottom:4px}
#rakShiftReport .rakShiftIntro{font-size:12px;line-height:1.4;opacity:.68;max-width:38rem}

#rakShiftReport .rakShiftContext{display:block!important;width:100%;max-width:246px!important;min-width:0}
#rakShiftReport .rakShiftMetaGrid{display:grid;width:max-content;max-width:100%;min-width:0;grid-template-columns:124px 112px;gap:10px;align-items:end;justify-content:start}
#rakShiftReport .rakShiftMetaLabel{display:grid;width:100%;gap:6px;font-size:12px;font-weight:750;opacity:.94;min-width:0;overflow:hidden}
#rakShiftReport .rakShiftMetaLabel>.rakShiftInput,
#rakShiftReport .rakShiftMetaLabel>.rakShiftSelect{width:100%!important;max-width:100%!important;min-width:0!important;min-height:48px;border-radius:14px;font-size:17px;font-weight:700;background:linear-gradient(180deg,rgba(255,255,255,.075),rgba(255,255,255,.038));border-color:rgba(255,255,255,.14);box-shadow:inset 0 1px 0 rgba(255,255,255,.045)}
#rakShiftReport .rakShiftDateShell{position:relative;width:124px!important;inline-size:124px!important;max-width:124px!important;height:48px!important;min-height:48px!important;box-sizing:border-box!important;overflow:hidden!important;border:1px solid rgba(255,255,255,.18)!important;border-radius:14px!important;background:linear-gradient(180deg,rgba(255,255,255,.075),rgba(255,255,255,.038))!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.045)!important}
#rakShiftReport .rakShiftDateDisplay{position:absolute;inset:0;z-index:1;display:grid;place-items:center;padding:0 8px;box-sizing:border-box;font-size:17px;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap;pointer-events:none}
#rakShiftReport .rakShiftDate{position:absolute!important;inset:0!important;z-index:2!important;display:block!important;width:100%!important;inline-size:100%!important;max-width:none!important;min-width:0!important;min-inline-size:0!important;height:100%!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;opacity:0!important;font-size:16px!important;color:transparent!important}

#rakShiftReport .rakShiftSection{padding:12px;border-radius:18px;border:1px solid rgba(255,255,255,.105);background:linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.018));box-shadow:inset 0 1px 0 rgba(255,255,255,.035),0 8px 24px rgba(0,0,0,.08)}
#rakShiftReport .rakShiftSectionHead{margin-bottom:9px}
#rakShiftReport .rakShiftSectionHead h4{font-size:18px;line-height:1.1;font-weight:850;letter-spacing:-.015em}
#rakShiftReport .rakShiftRows{gap:8px}
#rakShiftReport .rakShiftProdRow{gap:7px;padding:5px;border-radius:15px;min-width:0}
#rakShiftReport .rakShiftProdRow[data-section="mo"],
#rakShiftReport .rakShiftProdRow[data-section="to"]{grid-template-columns:82px minmax(0,1fr) minmax(0,1fr) 42px!important}
#rakShiftReport .rakShiftProdRow[data-section="r01"],
#rakShiftReport .rakShiftProdRow[data-section="r07"]{grid-template-columns:78px minmax(0,.9fr) minmax(0,.9fr) minmax(0,1fr) 42px!important}
#rakShiftReport .rakShiftSelect,
#rakShiftReport .rakShiftInput,
#rakShiftReport .rakShiftTime,
#rakShiftReport .rakShiftProblemText{min-height:44px;border-radius:12px;padding:8px 10px;border-color:rgba(255,255,255,.13);background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.035));box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}
#rakShiftReport .rakShiftQty,#rakShiftReport .rakShiftNok,#rakShiftReport .rakShiftFree{text-align:center;font-size:16px;font-variant-numeric:tabular-nums}
#rakShiftReport .rakShiftIndex{height:44px;font-size:17px;border-radius:12px!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}
#rakShiftReport .rakShiftRemove{width:40px;height:40px;min-width:40px;border-radius:12px;background:rgba(255,255,255,.045);display:grid;place-items:center;font-size:21px;line-height:1;opacity:.72;padding:0}
#rakShiftReport .rakShiftRemove:active{transform:scale(.96);opacity:1}
#rakShiftReport .rakShiftAddBelow{width:100%;min-height:44px!important;margin-top:9px!important;padding:9px 12px!important;border-radius:14px!important;font-size:15px!important;font-weight:780!important;background:rgba(255,255,255,.045)!important;box-shadow:none!important}

#rakShiftReport .rakShiftProblemsSection{padding-bottom:13px}
#rakShiftReport .rakShiftProblemRow{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr) 42px!important;gap:8px!important;align-items:end!important;padding:2px 0 5px}
#rakShiftReport .rakShiftMachine{grid-column:1/-1!important;min-height:46px;font-size:16px}
#rakShiftReport .rakShiftTimeField{display:grid!important;grid-template-rows:auto 46px!important;gap:5px!important;min-width:0;opacity:1!important;font-size:12px!important;font-weight:760;color:inherit}
#rakShiftReport .rakShiftFromField{grid-column:1!important}
#rakShiftReport .rakShiftToField{grid-column:2!important}
#rakShiftReport .rakShiftTimeField span{padding-left:4px!important;opacity:.7}
#rakShiftReport .rakShiftTime{width:100%!important;min-width:0!important;height:46px;min-height:46px;padding:6px 8px!important;font-size:16px!important;text-align:center;font-variant-numeric:tabular-nums;-webkit-appearance:none;appearance:none}
#rakShiftReport .rakShiftTime::-webkit-date-and-time-value{text-align:center;margin:0}
#rakShiftReport .rakShiftProblemText{grid-column:1/3!important;min-height:46px;font-size:16px}
#rakShiftReport .rakShiftProblemRemove{grid-column:3!important;width:42px!important;height:42px!important;min-width:42px!important;margin:0!important;border-radius:13px!important;align-self:center}

#rakShiftReport .rakShiftPreviewSection{padding:12px 12px 13px}
#rakShiftReport .rakShiftPreviewHint{font-size:11px;opacity:.55;margin:-2px 0 8px 1px}
#rakShiftReport .rakShiftPreview{padding:14px 15px;border-radius:15px;border-color:rgba(255,255,255,.1);background:linear-gradient(145deg,rgba(4,18,30,.58),rgba(12,23,39,.38));box-shadow:inset 0 1px 0 rgba(255,255,255,.035);font-size:14px;line-height:1.34;white-space:pre-wrap;font-variant-numeric:tabular-nums}

#rakShiftReport .rakShiftActions{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:8px!important;margin-top:1px}
#rakShiftReport .rakShiftActions>.appMenuAction{margin:0!important;min-height:48px!important;border-radius:15px!important;padding:10px 13px!important;font-size:15px!important;font-weight:800!important}
#rakShiftReport .rakShiftActions [data-rak-share-action="copy"]{grid-column:1/-1;order:1;background:linear-gradient(135deg,rgba(35,159,107,.33),rgba(29,121,157,.28))!important;border-color:rgba(100,234,184,.28)!important}
#rakShiftReport .rakShiftActions [data-shift-action="send"]{grid-column:1;order:2}
#rakShiftReport .rakShiftActions [data-rak-share-action="whatsapp"]{grid-column:2;order:3;background:rgba(37,211,102,.12)!important;border-color:rgba(77,221,130,.2)!important}
#rakShiftReport .rakShiftActions [data-shift-action="preview"]{grid-column:1/-1;order:4;min-height:42px!important;font-size:14px!important;opacity:.86}
#rakShiftReport .rakShiftActions [data-shift-action="close"]{grid-column:1/-1;order:5;background:rgba(255,255,255,.025)!important;opacity:.78}
#rakShiftReport .rakShiftStatus{text-align:center;font-size:12px;opacity:.72;padding:0 8px;min-height:16px}

@media(max-width:390px){
  #rakShiftReport .rakShiftMetaGrid{grid-template-columns:124px 112px;gap:9px}
  #rakShiftReport .rakShiftDateShell{width:124px!important;inline-size:124px!important;max-width:124px!important}
  #rakShiftReport .rakShiftSection{padding:10px}
  #rakShiftReport .rakShiftProdRow[data-section="mo"],
  #rakShiftReport .rakShiftProdRow[data-section="to"]{grid-template-columns:74px minmax(0,1fr) minmax(0,1fr) 38px!important;gap:6px}
  #rakShiftReport .rakShiftProdRow[data-section="r01"],
  #rakShiftReport .rakShiftProdRow[data-section="r07"]{grid-template-columns:72px minmax(0,.82fr) minmax(0,.82fr) minmax(0,1fr) 38px!important;gap:5px}
  #rakShiftReport .rakShiftSelect,#rakShiftReport .rakShiftInput{padding-left:7px;padding-right:7px}
  #rakShiftReport .rakShiftIndex{font-size:16px}
  #rakShiftReport .rakShiftQty,#rakShiftReport .rakShiftNok,#rakShiftReport .rakShiftFree{font-size:15px}
  #rakShiftReport .rakShiftRemove{width:36px;height:40px;min-width:36px}
  #rakShiftReport .rakShiftProblemRow{grid-template-columns:minmax(0,1fr) minmax(0,1fr) 38px!important;gap:7px!important}
  #rakShiftReport .rakShiftProblemRemove{width:38px!important;min-width:38px!important}
}
@media(max-width:380px){
  #rakShiftReport .rakShiftMetaGrid{grid-template-columns:118px 108px!important;gap:8px}
  #rakShiftReport .rakShiftDateShell{width:118px!important;inline-size:118px!important;max-width:118px!important}
}
`;
    document.head.appendChild(style);
  }

  function decorateMeta(root) {
    const date = root.querySelector('.rakShiftDate');
    const shift = root.querySelector('.rakShiftShift');
    if (!date || !shift) return;
    const dateLabel = date.closest('label');
    const shiftLabel = shift.closest('label');
    if (!dateLabel || !shiftLabel) return;
    dateLabel.classList.add('rakShiftMetaLabel');
    shiftLabel.classList.add('rakShiftMetaLabel');
    if (dateLabel.parentElement && dateLabel.parentElement.classList.contains('rakShiftMetaGrid')) return;
    const grid = document.createElement('div');
    grid.className = 'rakShiftMetaGrid';
    dateLabel.parentNode.insertBefore(grid, dateLabel);
    grid.appendChild(dateLabel);
    grid.appendChild(shiftLabel);
  }

  function decorateSections(root) {
    const hero = root.firstElementChild;
    if (hero) hero.classList.add('rakShiftHero');
    const problems = root.querySelector('.rakShiftProblems');
    const problemsSection = problems && problems.closest('.rakShiftSection');
    if (problemsSection) problemsSection.classList.add('rakShiftProblemsSection');
    root.querySelectorAll('.rakShiftProblemRow').forEach((row) => {
      const fromLabel = row.querySelector('.rakShiftFrom') && row.querySelector('.rakShiftFrom').closest('label');
      const toLabel = row.querySelector('.rakShiftTo') && row.querySelector('.rakShiftTo').closest('label');
      if (fromLabel) fromLabel.classList.add('rakShiftFromField');
      if (toLabel) toLabel.classList.add('rakShiftToField');
    });
    const preview = root.querySelector('.rakShiftPreview');
    const previewSection = preview && preview.closest('.rakShiftSection');
    if (previewSection) {
      previewSection.classList.add('rakShiftPreviewSection');
      if (!previewSection.querySelector('.rakShiftPreviewHint')) {
        const hint = document.createElement('div');
        hint.className = 'rakShiftPreviewHint';
        hint.textContent = 'Takto se report zkopíruje nebo odešle.';
        preview.parentNode.insertBefore(hint, preview);
      }
    }
  }

  function decorateActions(root) {
    const actions = root.querySelector('.rakShiftActions');
    if (!actions) return;
    const copyButton = actions.querySelector('[data-rak-share-action="copy"]');
    const shareButton = actions.querySelector('[data-shift-action="send"]');
    const whatsappButton = actions.querySelector('[data-rak-share-action="whatsapp"]');
    const previewButton = actions.querySelector('[data-shift-action="preview"]');
    const closeButton = actions.querySelector('[data-shift-action="close"]');
    if (copyButton) copyButton.textContent = 'Zkopírovat report';
    if (shareButton) shareButton.textContent = 'Sdílet';
    if (whatsappButton) whatsappButton.textContent = 'WhatsApp';
    if (previewButton) previewButton.textContent = 'Obnovit náhled';
    if (closeButton) closeButton.textContent = 'Zpět';
  }

  function polish() {
    scheduled = false;
    const root = document.getElementById('rakShiftReport');
    if (!root) return;
    ensureStyles();
    root.classList.add('rakShiftReportPolished');
    decorateMeta(root);
    decorateSections(root);
    decorateActions(root);
    compactPreview(root);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(polish);
    else setTimeout(polish, 0);
  }

  async function shareCompact(root) {
    compactPreview(root);
    const preview = root && root.querySelector('.rakShiftPreview');
    const text = preview ? preview.textContent.trim() : '';
    if (!text) return;
    const status = root.querySelector('.rakShiftStatus');
    try {
      if (navigator.share) {
        await navigator.share({ title: 'RaK – report směny', text });
        if (status) status.textContent = 'Report připravený k odeslání.';
      } else {
        await navigator.clipboard.writeText(text);
        if (status) status.textContent = 'Report zkopírovaný do schránky.';
      }
    } catch (err) {
      if (status) status.textContent = 'Odeslání bylo zrušeno nebo se nepovedlo.';
    }
  }

  function boot() {
    ensureStyles();
    schedule();
    try { new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true }); }
    catch (err) {}
    document.addEventListener('click', (event) => {
      const button = event.target && event.target.closest ? event.target.closest('#rakShiftReport [data-shift-action="send"]') : null;
      if (!button) return;
      const root = button.closest('#rakShiftReport');
      event.preventDefault();
      event.stopImmediatePropagation();
      void shareCompact(root);
    }, true);
  }

  window.rakShiftReportPolishUi = polish;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();

// RaK 1.7 – PNG export Reportu směny s přesným login RaK vodoznakem.
(function setupShiftReportImageExport170() {
  'use strict';
  if (window.__rakShiftReportImageExport170Installed) return;
  window.__rakShiftReportImageExport170Installed = true;

  const WATERMARK_SRC = './assets/rak-login-crab.png';
  const CANVAS_WIDTH = 1080;
  const MIN_CANVAS_HEIGHT = 1920;
  const MAX_CANVAS_HEIGHT = 8192;
  const OUTER = 50;
  const STYLE_ID = 'rak-shift-report-image-export-170-style';
  const SECTION_DEFS = [
    { id: 'mo', label: 'MO', totalNok: true },
    { id: 'to', label: 'TO' },
    { id: 'r01', label: 'TBKR01' },
    { id: 'r07', label: 'TBKR07' }
  ];
// RAK_REPORT_ACCENT_PALETTE_17004
// RAK_REPORT_COMPACT_PAIRS_17005
  const TONES = {
    AF: { text: '#005f8f', fill: 'rgba(45,156,255,.26)', stroke: 'rgba(17,120,200,.82)', chip: '#2d9cff', chipText: '#ffffff' },
    AD: { text: '#005f8f', fill: 'rgba(45,156,255,.26)', stroke: 'rgba(17,120,200,.82)', chip: '#2d9cff', chipText: '#ffffff' },
    AG: { text: '#0a6d3d', fill: 'rgba(139,228,88,.27)', stroke: 'rgba(78,164,47,.82)', chip: '#8be458', chipText: '#173b18' },
    AE: { text: '#0a6d3d', fill: 'rgba(139,228,88,.27)', stroke: 'rgba(78,164,47,.82)', chip: '#8be458', chipText: '#173b18' },
    AH: { text: '#984800', fill: 'rgba(255,179,63,.28)', stroke: 'rgba(213,120,10,.84)', chip: '#ffb33f', chipText: '#4a2800' }
  };
  const DEFAULT_TONE = { text: '#2a4655', fill: 'rgba(75,102,116,.05)', stroke: 'rgba(52,81,96,.24)', chip: '#dce6ea', chipText: '#28414e' };
  const PAIR_GAP = 28;
  const ROW_HEIGHT = 104;
  const ROW_STEP = 116;

  const imageCache = new WeakMap();
  const prepareTimers = new WeakMap();
  let watermarkImage = null;
  let watermarkPromise = null;

  function status(root, text) {
    const el = root && root.querySelector('.rakShiftStatus');
    if (el) el.textContent = text;
  }

  function safeValue(root, selector) {
    const el = root && root.querySelector(selector);
    return String(el && el.value != null ? el.value : '').trim();
  }

  function collectModel(root) {
    const sections = SECTION_DEFS.map((def) => ({
      id: def.id,
      label: def.label,
      totalNok: def.totalNok ? safeValue(root, '.rakShiftTotalNok') : '',
      rows: Array.from(root.querySelectorAll('.rakShiftProdRow[data-section="' + def.id + '"]'))
        .map((row) => ({
          index: String(row.querySelector('.rakShiftIndex')?.value || '').trim().toUpperCase(),
          qty: String(row.querySelector('.rakShiftQty')?.value || '').trim(),
          free: String(row.querySelector('.rakShiftFree')?.value || '').trim(),
          nok: String(row.querySelector('.rakShiftNok')?.value || '').trim()
        }))
        .filter((row) => row.qty || row.free || row.nok)
    }));
    const problems = Array.from(root.querySelectorAll('.rakShiftProblemRow'))
      .map((row) => ({
        machine: String(row.querySelector('.rakShiftMachine')?.value || '').trim(),
        from: String(row.querySelector('.rakShiftFrom')?.value || '').trim(),
        to: String(row.querySelector('.rakShiftTo')?.value || '').trim(),
        text: String(row.querySelector('.rakShiftProblemText')?.value || '').trim()
      }))
      .filter((row) => row.machine || row.from || row.to || row.text);
    return {
      date: safeValue(root, '.rakShiftDate'),
      shift: safeValue(root, '.rakShiftShift'),
      sections,
      problems
    };
  }

  function signature(model) {
    return JSON.stringify(model);
  }

  function formatDate(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return new Date().toLocaleDateString('cs-CZ');
    return Number(match[3]) + '. ' + Number(match[2]) + '. ' + match[1];
  }

  function shiftLabel(value) {
    return ({ N: 'Noční', R: 'Ranní', N8: 'Noční 8 h', R8: 'Ranní 8 h' })[String(value || '')] || String(value || '—');
  }

  function problemMinutes(from, to) {
    const parse = (value) => {
      const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
      if (!match) return null;
      const h = Number(match[1]);
      const m = Number(match[2]);
      return h >= 0 && h < 24 && m >= 0 && m < 60 ? h * 60 + m : null;
    };
    const start = parse(from);
    let end = parse(to);
    if (start == null || end == null) return null;
    if (end < start) end += 24 * 60;
    return end - start;
  }

  function durationLabel(minutes) {
    if (!Number.isFinite(minutes)) return '';
    if (minutes < 60) return minutes + ' min';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h + ' h' + (m ? ' ' + m + ' min' : '');
  }

  // RAK_SHIFT_REPORT_GLASS_17009
  // RAK_MOBILE_REPORT_LINES_17013
  const MOBILE_LINE_STEP = 78;
  function quantityNumber17013(value) {
    const text = String(value ?? '').trim().replace(',','.');
    return /^\d+(?:\.\d+)?$/.test(text) ? Number(text) : NaN;
  }
  function quantityText17013(value) { return new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:2}).format(value); }
  // RAK_REPORT_NOK_TOTALS_ZERO_17014
  function positiveQuantity17014(value) {
    const amount = quantityNumber17013(value);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
  }
  function formattedQuantity17014(value) {
    return quantityText17013(positiveQuantity17014(value));
  }
  function nokSuffix17014(value) {
    const nok = positiveQuantity17014(value);
    return nok ? ' (z toho ' + quantityText17013(nok) + ' NOK)' : '';
  }
  // RAK_REPORT_INDEX_GRID_TEXT_17015
  // RAK_17072_REPORT_QUANTITY_INDEX: mirror the preview/copy quantity-index labels in PNG.
  function sectionLines17013(section) {
    const rows = section && Array.isArray(section.rows) ? section.rows : [];
    const lines = [];
    const kind = section && section.id || '';
    // RAK_REPORT_SMART_TOTALS_17017
    const productionLineCount17017 = rows.reduce((sum, row) =>
      sum + (positiveQuantity17014(row.qty) > 0 ? 1 : 0)
          + (positiveQuantity17014(row.free) > 0 ? 1 : 0), 0);
    if (kind === 'mo' || kind === 'to') {
      const totals = new Map();
      rows.forEach(row => {
        const index = row.index || '—';
        const regular = positiveQuantity17014(row.qty);
        const free = positiveQuantity17014(row.free);
        const nok = positiveQuantity17014(row.nok);
        if (regular) lines.push({
          text: quantityText17013(regular) + ' ' + index,
          kind: 'normal', index
        });
        if (free) lines.push({text: quantityText17013(free) + ' ' + index + ' volné', kind: 'free', index});
        if (nok) lines.push({text: index + ' NOK ' + quantityText17013(nok), kind: 'nok', index});
        if (regular + free) totals.set(index, (totals.get(index) || 0) + regular + free);
      });
      if (totals.size && productionLineCount17017 > 1) {
        const all = Array.from(totals.values()).reduce((sum, count) => sum + count, 0);
        lines.push({
          text: 'Celkově ' + quantityText17013(all) + ' ks',
          kind: 'total'
        });
      }
    } else if (kind === 'r01' || kind === 'r07') {
      const totals = new Map();
      rows.forEach(row => {
        const regular = positiveQuantity17014(row.qty);
        const free = positiveQuantity17014(row.free);
        const nok = positiveQuantity17014(row.nok);
        const index = row.index || '—';
        if (regular) lines.push({
          text: quantityText17013(regular) + ' ' + index + nokSuffix17014(row.nok),
          kind: 'normal', index
        });
        if (free) lines.push({
          text: quantityText17013(free) + ' ' + index + ' volné' + (regular ? '' : nokSuffix17014(row.nok)),
          kind: 'free', index
        });
        if (nok && !regular && !free) lines.push({
          text: index + ' NOK ' + quantityText17013(nok), kind: 'nok', index
        });
        // NOK is already included in regular/free output, not an extra produced piece.
        if (regular + free) totals.set(index, (totals.get(index) || 0) + regular + free);
      });
      if (totals.size && productionLineCount17017 > 1) {
        const total = Array.from(totals.values()).reduce((sum, count) => sum + count, 0);
        lines.push({
          text: 'Celkově ' + quantityText17013(total) + ' ks',
          kind: 'total'
        });
      }
    } else {
      rows.forEach(row => {
        const index = row.index || '—';
        if (positiveQuantity17014(row.qty)) lines.push({text:index+' '+formattedQuantity17014(row.qty)+' ks',kind:'normal',index});
        if (positiveQuantity17014(row.free)) lines.push({text:index+' '+formattedQuantity17014(row.free)+' volné',kind:'free',index});
        if (positiveQuantity17014(row.nok)) lines.push({text:'NOK '+formattedQuantity17014(row.nok),kind:'nok',index});
      });
    }
    if (!lines.length) lines.push({ text: 'Bez záznamu', kind: 'empty' });
    return lines;
  }
  function wrappedSectionLines17013(ctx,section,maxWidth) {
    const lines=[];
    ctx.font = '800 44px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    sectionLines17013(section).forEach(item => wrapLines(ctx,item.text,maxWidth).forEach(text=>lines.push({...item,text})));
    return lines;
  }
  function sectionLayout17015(ctx, section, width) {
    const all = sectionLines17013(section);
    const footer = all.filter(line => line.kind === 'total');
    const content = all.filter(line => line.kind !== 'total');
    const isProduction = section.id === 'mo' || section.id === 'to';
    const names = Array.from(new Set(content.filter(line => line.kind !== 'empty').map(line => line.index)));
    const twoColumns = isProduction && names.length > 1 && width >= 700;
    const gap = 16;
    const cellWidth = twoColumns ? (width - 40 - gap) / 2 : width - 40;
    const fullWidth = width - 40;
    ctx.font = '850 44px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const wrapped = (list, w) => list.flatMap(line => wrapLines(ctx, line.text, w - 46).map(text => ({...line, text})));
    const groups = [];
    let contentSteps = 0;
    if (twoColumns) {
      const byIndex = new Map();
      content.forEach(line => {
        if (!byIndex.has(line.index)) byIndex.set(line.index, []);
        byIndex.get(line.index).push(line);
      });
      const indexed = Array.from(byIndex.values());
      for (let i = 0; i < indexed.length; i += 2) {
        const left = wrapped(indexed[i], cellWidth);
        const right = indexed[i + 1] ? wrapped(indexed[i + 1], cellWidth) : [];
        const steps = Math.max(left.length, right.length);
        groups.push({left, right, steps});
        contentSteps += steps;
      }
    } else {
      const full = wrapped(content, cellWidth);
      groups.push({left:full,right:[],steps:full.length});
      contentSteps = full.length;
    }
    const totals = wrapped(footer, fullWidth);
    const height = 98 + (contentSteps + totals.length) * MOBILE_LINE_STEP
      + (positiveQuantity17014(section.totalNok) ? 58 : 0) + 16;
    return { twoColumns, cellWidth, gap, groups, totals, height };
  }
  function sectionHeight17013(ctx,section) {
    return sectionLayout17015(ctx, section, CANVAS_WIDTH - OUTER * 2).height;
  }

  // RAK_17075_REPORT_SECTION_COLUMNS: pair MO/TO and both grinders only when every label fits.
  const SECTION_PAIR_GAP_17075 = 22;
  function sectionFitsPairColumn17075(ctx, section, width) {
    const rowTextWidth = width - 40 - 46;
    if (rowTextWidth <= 0) return false;
    ctx.font = '850 44px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    if (!sectionLines17013(section).every(line => ctx.measureText(line.text).width <= rowTextWidth)) return false;
    if (positiveQuantity17014(section.totalNok)) {
      ctx.font = '700 39px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      return ctx.measureText('NOK: ' + section.totalNok).width <= width - 58;
    }
    return true;
  }
  function sectionRows17075(ctx, sections) {
    const fullWidth = CANVAS_WIDTH - OUTER * 2;
    const pairWidth = (fullWidth - SECTION_PAIR_GAP_17075) / 2;
    const rows = [];
    for (let i = 0; i < sections.length; i += 2) {
      const left = sections[i];
      const right = sections[i + 1];
      const paired = !!right
        && sectionFitsPairColumn17075(ctx, left, pairWidth)
        && sectionFitsPairColumn17075(ctx, right, pairWidth);
      if (paired) {
        rows.push({
          paired: true,
          sections: [left, right],
          width: pairWidth,
          height: Math.max(
            sectionLayout17015(ctx, left, pairWidth).height,
            sectionLayout17015(ctx, right, pairWidth).height
          )
        });
      } else {
        [left, right].filter(Boolean).forEach(section => rows.push({
          paired: false,
          sections: [section],
          width: fullWidth,
          height: sectionLayout17015(ctx, section, fullWidth).height
        }));
      }
    }
    return rows;
  }
  function problemHeight17013(ctx,problems) {
    if(!problems.length) return 0;
    ctx.font='500 38px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    return 88+problems.reduce((sum,item)=>sum+148+wrapLines(ctx,item.text||'bez popisu',CANVAS_WIDTH-OUTER*2-110).length*50,0)+20;
  }
  function estimateHeight(model) {
    const ctx=document.createElement('canvas').getContext('2d');
    if(!ctx) throw Error('Canvas 2D není dostupný.');
    let height=396;
    sectionRows17075(ctx, model.sections).forEach(row => { height += row.height + 22; });
    height+=problemHeight17013(ctx,model.problems||[])+(model.problems.length?24:0);
    return Math.max(MIN_CANVAS_HEIGHT,Math.min(MAX_CANVAS_HEIGHT,Math.ceil(height/16)*16));
  }

  function roundedPath(ctx, x, y, w, h, r) {
    const radius = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function fillRounded(ctx, x, y, w, h, r, fill, stroke) {
    roundedPath(ctx, x, y, w, h, r);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function wrapLines(ctx, text, maxWidth) {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [''];
    const lines = [];
    let line = words.shift();
    words.forEach((word) => {
      const probe = line + ' ' + word;
      if (ctx.measureText(probe).width <= maxWidth) line = probe;
      else {
        lines.push(line);
        line = word;
      }
    });
    lines.push(line);
    return lines;
  }

  function preloadWatermark() {
    if (watermarkImage) return Promise.resolve(watermarkImage);
    if (watermarkPromise) return watermarkPromise;
    watermarkPromise = new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        watermarkImage = image;
        resolve(image);
      };
      image.onerror = () => reject(new Error('RaK watermark asset failed to load'));
      image.src = new URL(WATERMARK_SRC, document.baseURI).href;
    }).catch((err) => {
      watermarkPromise = null;
      throw err;
    });
    return watermarkPromise;
  }

// RAK_REPORT_LIGHT_THEME_17003
  function drawBackground(ctx, width, height, watermark) {
    const base = ctx.createLinearGradient(0, 0, 0, height);
    base.addColorStop(0, '#f8fafb');
    base.addColorStop(.5, '#eff3f5');
    base.addColorStop(1, '#e8edf0');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    if (watermark && watermark.naturalWidth && watermark.naturalHeight) {
      const scale = Math.min((width * 1.15) / watermark.naturalWidth, (height * .85) / watermark.naturalHeight);
      const drawW = watermark.naturalWidth * scale;
      const drawH = watermark.naturalHeight * scale;
      ctx.save();
      ctx.globalAlpha = .16;
      ctx.drawImage(watermark, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
      ctx.restore();
    }
  }

  function drawHeader(ctx,model) {
    ctx.textBaseline='alphabetic'; ctx.textAlign='left'; ctx.fillStyle='#1c3543';
    ctx.font='850 74px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('REPORT SMĚNY',OUTER,127);
    ctx.font='700 35px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('DIFERENCIÁLY',OUTER,186);
    ctx.fillStyle='#315567';ctx.font='650 37px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    // RAK_EXTERNAL_SHIFT_TEAMS_17020
    ctx.fillText(formatDate(model.date) + '  •  Směna ' + (typeof getRakActiveAccountShiftTeam==='function'?getRakActiveAccountShiftTeam():'D') + '  •  ' + shiftLabel(model.shift), OUTER, 218);
    ctx.fillStyle='rgba(20,119,177,.45)';ctx.fillRect(OUTER,278,CANVAS_WIDTH-OUTER*2,4);
  }

  // RAK_SHIFT_REPORT_FREE_PRIMARY_17008
  // RAK_SHIFT_REPORT_FREE_ONLY_GRINDER_17010
  function drawProductionRow(ctx,line,x,y,w) {
    const tone=TONES[line.index]||DEFAULT_TONE;
    const fill=line.kind==='total'?'rgba(40,134,174,.26)':line.kind==='empty'?'rgba(75,102,116,.045)':tone.fill;
    fillRounded(ctx,x,y,w,68,16,fill,line.kind==='total'?'rgba(17,120,200,.68)':tone.stroke);
    ctx.textAlign='left';ctx.fillStyle=line.kind==='total'?'#123d5b':({AF:'#004e83',AD:'#004e83',AG:'#0b632e',AE:'#0b632e',AH:'#8b4300'}[line.index]||'#244554');
    ctx.font='850 44px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(line.text,x+23,y+49,w-46);
  }
  function drawSection(ctx,section,x,y,w,forcedHeight) {
    const layout = sectionLayout17015(ctx,section,w);
    const cardHeight = Math.max(layout.height, Number(forcedHeight) || 0);
    fillRounded(ctx,x,y,w,cardHeight,28,'rgba(255,255,255,.36)','rgba(36,65,78,.17)');
    ctx.textAlign='left';ctx.fillStyle='#183c50';
    ctx.font='850 46px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(section.label,x+30,y+61);
    let rowY = y + 80;
    layout.groups.forEach(group => {
      group.left.forEach((line,i) => drawProductionRow(ctx,line,x+20,rowY+i*MOBILE_LINE_STEP,layout.cellWidth));
      if (layout.twoColumns) group.right.forEach((line,i) => {
        drawProductionRow(ctx,line,x+20+layout.cellWidth+layout.gap,rowY+i*MOBILE_LINE_STEP,layout.cellWidth);
      });
      rowY += group.steps*MOBILE_LINE_STEP;
    });
    // Index-specific columns end here: both MO and TO totals always occupy the full width.
    layout.totals.forEach(line => {
      drawProductionRow(ctx,line,x+20,rowY,w-40);
      rowY += MOBILE_LINE_STEP;
    });
    if (positiveQuantity17014(section.totalNok)) {
      ctx.fillStyle='#365363';
      ctx.font='700 39px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText('NOK: '+section.totalNok,x+29,rowY+43);
    }
    return y+cardHeight+22;
  }
  function drawSectionRows17075(ctx, sections, startY) {
    let y = startY;
    sectionRows17075(ctx, sections).forEach(row => {
      if (row.paired) {
        drawSection(ctx, row.sections[0], OUTER, y, row.width, row.height);
        drawSection(ctx, row.sections[1], OUTER + row.width + SECTION_PAIR_GAP_17075, y, row.width, row.height);
        y += row.height + 22;
      } else {
        y = drawSection(ctx, row.sections[0], OUTER, y, row.width);
      }
    });
    return y;
  }
  function drawProblems(ctx,problems,y) {
    if(!problems.length) return y;
    const x=OUTER,w=CANVAS_WIDTH-OUTER*2;
    ctx.font='500 38px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const measured=problems.map(item=>wrapLines(ctx,item.text||'bez popisu',w-110));
    const h=88+measured.reduce((sum,lines)=>sum+148+lines.length*50,0)+20;
    fillRounded(ctx,x,y,w,h,28,'rgba(255,255,255,.38)','rgba(36,65,78,.17)');
    ctx.fillStyle='#183c50';ctx.font='850 43px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('PROBLÉMY / ODSTÁVKY',x+30,y+56);
    let cursor=y+86;
    problems.forEach((problem,idx)=>{
      const boxH=134+measured[idx].length*50;
      fillRounded(ctx,x+22,cursor,w-44,boxH,18,'rgba(235,242,245,.44)','rgba(44,75,88,.12)');
      ctx.fillStyle='#183c50';ctx.font='800 41px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(problem.machine||'Stroj',x+46,cursor+47);
      const duration=durationLabel(problemMinutes(problem.from,problem.to));
      ctx.fillStyle='#146a90';ctx.font='650 34px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText((problem.from||'??:??')+'–'+(problem.to||'??:??')+(duration?'  ('+duration+')':''),x+46,cursor+92,w-88);
      ctx.fillStyle='#284453';ctx.font='500 38px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      measured[idx].forEach((line,i)=>ctx.fillText(line,x+46,cursor+145+i*50,w-88));
      cursor+=148+measured[idx].length*50;
    });
    return y+h+24;
  }

  function renderCanvas(model, watermark) {
    const height = estimateHeight(model);
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D není dostupný.');
    drawBackground(ctx, CANVAS_WIDTH, height, watermark);
    drawHeader(ctx, model);

    let y = 306;
    y = drawSectionRows17075(ctx, model.sections, y);
    y = drawProblems(ctx, model.problems, y);

    ctx.fillStyle = 'rgba(38,59,71,.51)';
    ctx.font = '500 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('RaK', CANVAS_WIDTH - OUTER, Math.min(height - 46, y + 26));
    ctx.textAlign = 'left';
    return canvas;
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('PNG se nepodařilo vytvořit.'));
      }, 'image/png');
    });
  }

  function dataUrlToBlob(dataUrl) {
    const parts = String(dataUrl || '').split(',');
    const bytes = atob(parts[1] || '');
    const out = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i += 1) out[i] = bytes.charCodeAt(i);
    return new Blob([out], { type: 'image/png' });
  }

  function fileName(model) {
    const date = String(model.date || '').replace(/[^0-9-]/g, '') || 'report';
    const shift = String(model.shift || '').replace(/[^A-Za-z0-9_-]/g, '') || 'smena';
    return 'RaK_report_smeny_' + date + '_' + shift + '.png';
  }

  async function buildBlob(root) {
    const model = collectModel(root);
    const sig = signature(model);
    const cached = imageCache.get(root);
    if (cached && cached.signature === sig && cached.blob) return cached;
    const watermark = await preloadWatermark();
    const canvas = renderCanvas(model, watermark);
    const blob = await canvasToBlob(canvas);
    const entry = { signature: sig, blob, name: fileName(model) };
    imageCache.set(root, entry);
    return entry;
  }

  function buildBlobSync(root) {
    const model = collectModel(root);
    const sig = signature(model);
    const cached = imageCache.get(root);
    if (cached && cached.signature === sig && cached.blob) return cached;
    if (!watermarkImage) return null;
    const canvas = renderCanvas(model, watermarkImage);
    const blob = dataUrlToBlob(canvas.toDataURL('image/png'));
    const entry = { signature: sig, blob, name: fileName(model) };
    imageCache.set(root, entry);
    return entry;
  }

  function downloadEntry(entry) {
    const url = URL.createObjectURL(entry.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = entry.name;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  async function savePng(root) {
    try {
      status(root, 'Vytvářím PNG…');
      const entry = await buildBlob(root);
      downloadEntry(entry);
      status(root, 'PNG report je připravený.');
    } catch (err) {
      status(root, 'PNG se nepodařilo vytvořit.');
    }
  }

  function canShareFile(file) {
    if (!navigator.share) return false;
    if (typeof navigator.canShare !== 'function') return true;
    try { return navigator.canShare({ files: [file] }); }
    catch (err) { return false; }
  }

  function shareImageFromEntry(root, entry) {
    if (typeof File !== 'function') {
      downloadEntry(entry);
      status(root, 'PNG bylo vytvořené; tento prohlížeč neumí sdílet soubor přímo.');
      return;
    }
    const file = new File([entry.blob], entry.name, { type: 'image/png', lastModified: Date.now() });
    if (!canShareFile(file)) {
      downloadEntry(entry);
      status(root, 'PNG bylo vytvořené; pro WhatsApp ho vyber ze stažených souborů.');
      return;
    }
    status(root, 'Otevírám sdílení obrázku – vyber WhatsApp.');
    let sharePromise;
    try {
      sharePromise = navigator.share({ title: 'RaK – Report směny diferenciály', files: [file] });
    } catch (err) {
      downloadEntry(entry);
      status(root, 'Sdílení obrázku není dostupné; PNG bylo uložené.');
      return;
    }
    Promise.resolve(sharePromise)
      .then(() => status(root, 'Obrázek byl předaný ke sdílení.'))
      .catch((err) => {
        if (err && err.name === 'AbortError') status(root, 'Sdílení bylo zrušeno.');
        else status(root, 'Sdílení obrázku se nepovedlo.');
      });
  }

  function shareWhatsappImage(root) {
    const immediate = buildBlobSync(root);
    if (immediate) {
      shareImageFromEntry(root, immediate);
      return;
    }
    status(root, 'Připravuji vodoznak pro PNG…');
    void buildBlob(root)
      .then(() => status(root, 'Obrázek je připravený. Klepni na WhatsApp ještě jednou.'))
      .catch(() => status(root, 'PNG se nepodařilo připravit.'));
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '#rakShiftReport .rakShiftActions [data-rak-image-action="save"]{grid-column:1/-1!important;order:1!important;background:linear-gradient(135deg,rgba(31,139,194,.28),rgba(36,176,134,.22))!important;border-color:rgba(105,211,231,.25)!important}',
      '#rakShiftReport .rakShiftActions [data-rak-share-action="copy"]{order:2!important}',
      '#rakShiftReport .rakShiftActions [data-shift-action="send"]{order:3!important}',
      '#rakShiftReport .rakShiftActions [data-rak-share-action="whatsapp"]{order:4!important}',
      '#rakShiftReport .rakShiftActions [data-shift-action="preview"]{order:5!important}',
      '#rakShiftReport .rakShiftActions [data-shift-action="clear"]{grid-column:1/-1!important;order:6!important;opacity:.72}',
      '#rakShiftReport .rakShiftActions [data-shift-action="close"]{order:7!important}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function schedulePrepare(root) {
    if (!root) return;
    const old = prepareTimers.get(root);
    if (old) clearTimeout(old);
    const timer = setTimeout(() => {
      prepareTimers.delete(root);
      void buildBlob(root).catch(() => {});
    }, 280);
    prepareTimers.set(root, timer);
  }

  function install(root) {
    if (!root || root.dataset.rakImageExportInstalled === '1') return;
    const actions = root.querySelector('.rakShiftActions');
    if (!actions) return;
    ensureStyles();

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'appMenuAction';
    saveButton.dataset.rakImageAction = 'save';
    saveButton.textContent = 'Uložit PNG';
    actions.insertBefore(saveButton, actions.firstChild);

    root.dataset.rakImageExportInstalled = '1';
    void preloadWatermark().then(() => schedulePrepare(root)).catch(() => {});
  }

  function scan() {
    const root = document.getElementById('rakShiftReport');
    if (root) install(root);
  }

  function boot() {
    ensureStyles();
    void preloadWatermark().catch(() => {});
    scan();
    const reportApi = window.RakShiftReport;
    if (reportApi && typeof reportApi.open === 'function' && !reportApi.__rakImageExportWrapped) {
      const originalOpen = reportApi.open;
      reportApi.open = function rakShiftReportOpenWithImageExport(...args) {
        const result = originalOpen.apply(this, args);
        setTimeout(scan, 0);
        return result;
      };
      reportApi.__rakImageExportWrapped = true;
    }
    document.addEventListener('click', (event) => {
      const trigger = event.target && event.target.closest ? event.target.closest('[data-admin-action=\"shift-report\"]') : null;
      if (trigger) setTimeout(scan, 0);
    }, true);

    document.addEventListener('input', (event) => {
      const root = event.target && event.target.closest ? event.target.closest('#rakShiftReport') : null;
      if (root) schedulePrepare(root);
    }, true);
    document.addEventListener('change', (event) => {
      const root = event.target && event.target.closest ? event.target.closest('#rakShiftReport') : null;
      if (root) schedulePrepare(root);
    }, true);

    document.addEventListener('click', (event) => {
      const target = event.target && event.target.closest ? event.target.closest('#rakShiftReport [data-rak-image-action="save"], #rakShiftReport [data-rak-share-action="whatsapp"]') : null;
      if (!target) return;
      const root = target.closest('#rakShiftReport');
      event.preventDefault();
      event.stopImmediatePropagation();
      if (target.dataset.rakImageAction === 'save') {
        void savePng(root);
        return;
      }
      shareWhatsappImage(root);
    }, true);
  }

  window.rakShiftReportBuildPng = async function rakShiftReportBuildPng() {
    const root = document.getElementById('rakShiftReport');
    if (!root) throw new Error('Report směny není otevřený.');
    return buildBlob(root);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
