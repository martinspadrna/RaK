// RaK 1.7 – PNG export Reportu směny s přesným login RaK vodoznakem.
(function setupShiftReportImageExport170() {
  'use strict';
  if (window.__rakShiftReportImageExport170Installed) return;
  window.__rakShiftReportImageExport170Installed = true;

  const WATERMARK_SRC = './assets/rak-login-crab.png';
  const CANVAS_WIDTH = 1440;
  const MIN_CANVAS_HEIGHT = 1920;
  const MAX_CANVAS_HEIGHT = 5200;
  const OUTER = 88;
  const STYLE_ID = 'rak-shift-report-image-export-170-style';
  const SECTION_DEFS = [
    { id: 'mo', label: 'MO', totalNok: true },
    { id: 'to', label: 'TO' },
    { id: 'r01', label: 'TBKR01' },
    { id: 'r07', label: 'TRBR07' }
  ];
  const TONES = {
    AF: { text: '#52caff', fill: 'rgba(40,174,255,.14)', stroke: 'rgba(82,202,255,.48)' },
    AD: { text: '#52caff', fill: 'rgba(40,174,255,.14)', stroke: 'rgba(82,202,255,.48)' },
    AG: { text: '#55efa8', fill: 'rgba(50,225,145,.13)', stroke: 'rgba(85,239,168,.44)' },
    AE: { text: '#55efa8', fill: 'rgba(50,225,145,.13)', stroke: 'rgba(85,239,168,.44)' },
    AH: { text: '#ffc04d', fill: 'rgba(255,174,48,.14)', stroke: 'rgba(255,192,77,.48)' }
  };
  const DEFAULT_TONE = { text: '#dbe9f2', fill: 'rgba(255,255,255,.055)', stroke: 'rgba(255,255,255,.16)' };
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
    return ({ N: 'Noc', R: 'Ráno', N8: 'Noc 8 h', R8: 'Ráno 8 h' })[String(value || '')] || String(value || '—');
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

  function estimateHeight(model) {
    let height = 360;
    model.sections.forEach((section) => {
      const rows = Math.max(1, section.rows.length);
      height += 78 + rows * 104 + (section.totalNok ? 62 : 0) + 30;
    });
    if (model.problems.length) {
      height += 92;
      model.problems.forEach((problem) => {
        const textLines = Math.max(1, Math.ceil(String(problem.text || '').length / 58));
        height += 94 + Math.max(0, textLines - 1) * 38;
      });
      height += 24;
    }
    height += 100;
    return Math.min(MAX_CANVAS_HEIGHT, Math.max(MIN_CANVAS_HEIGHT, height));
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

  function drawBackground(ctx, width, height, watermark) {
    const base = ctx.createLinearGradient(0, 0, 0, height);
    base.addColorStop(0, '#071a26');
    base.addColorStop(.48, '#0b242b');
    base.addColorStop(1, '#061118');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    const glowA = ctx.createRadialGradient(width * .18, height * .08, 0, width * .18, height * .08, width * .72);
    glowA.addColorStop(0, 'rgba(32,163,225,.16)');
    glowA.addColorStop(1, 'rgba(32,163,225,0)');
    ctx.fillStyle = glowA;
    ctx.fillRect(0, 0, width, height);

    const glowB = ctx.createRadialGradient(width * .82, height * .72, 0, width * .82, height * .72, width * .68);
    glowB.addColorStop(0, 'rgba(48,186,137,.10)');
    glowB.addColorStop(1, 'rgba(48,186,137,0)');
    ctx.fillStyle = glowB;
    ctx.fillRect(0, 0, width, height);

    if (watermark && watermark.naturalWidth && watermark.naturalHeight) {
      const scale = Math.max((width * 1.12) / watermark.naturalWidth, (height * 1.03) / watermark.naturalHeight);
      const drawW = watermark.naturalWidth * scale;
      const drawH = watermark.naturalHeight * scale;
      ctx.save();
      ctx.globalAlpha = .055;
      ctx.drawImage(watermark, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
      ctx.restore();
    }
  }

  function drawHeader(ctx, model) {
    ctx.fillStyle = '#f4fbff';
    ctx.font = '800 76px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('REPORT SMĚNY', OUTER, 150);

    ctx.fillStyle = 'rgba(232,244,250,.82)';
    ctx.font = '600 36px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(formatDate(model.date) + '  •  ' + shiftLabel(model.shift), OUTER, 218);

    const rule = ctx.createLinearGradient(OUTER, 0, CANVAS_WIDTH - OUTER, 0);
    rule.addColorStop(0, 'rgba(82,202,255,.75)');
    rule.addColorStop(.55, 'rgba(85,239,168,.42)');
    rule.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rule;
    ctx.fillRect(OUTER, 258, CANVAS_WIDTH - OUTER * 2, 3);
  }

  function drawProductionRow(ctx, row, x, y, w) {
    const tone = TONES[row.index] || DEFAULT_TONE;
    fillRounded(ctx, x, y, w, 86, 20, tone.fill, tone.stroke);

    fillRounded(ctx, x + 24, y + 18, 116, 50, 14, 'rgba(4,16,24,.54)', tone.stroke);
    ctx.fillStyle = tone.text;
    ctx.font = '800 31px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(row.index || '—', x + 82, y + 53);

    ctx.textAlign = 'left';
    ctx.fillStyle = tone.text;
    ctx.font = '800 38px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText((row.qty || '—') + (row.qty ? ' ks' : ''), x + 176, y + 55);

    const extras = [];
    if (row.free) extras.push('Volné ' + row.free);
    if (row.nok) extras.push('NOK ' + row.nok);
    if (extras.length) {
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(235,245,250,.88)';
      ctx.font = '650 29px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(extras.join('   •   '), x + w - 28, y + 54);
    }
    ctx.textAlign = 'left';
  }

  function drawSection(ctx, section, y) {
    const x = OUTER;
    const w = CANVAS_WIDTH - OUTER * 2;
    const rows = section.rows.length ? section.rows : [{ index: '', qty: '', free: '', nok: '' }];
    const totalExtra = section.totalNok ? 62 : 0;
    const h = 82 + rows.length * 104 + totalExtra + 14;

    fillRounded(ctx, x, y, w, h, 28, 'rgba(3,13,20,.50)', 'rgba(255,255,255,.10)');
    ctx.fillStyle = '#f2f8fb';
    ctx.font = '800 38px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(section.label, x + 32, y + 53);

    let rowY = y + 78;
    rows.forEach((row) => {
      drawProductionRow(ctx, row, x + 24, rowY, w - 48);
      rowY += 104;
    });

    if (section.totalNok) {
      ctx.fillStyle = 'rgba(235,245,250,.78)';
      ctx.font = '650 29px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText('NOK celkem: ' + (section.totalNok || '—'), x + 32, rowY + 34);
    }
    return y + h + 30;
  }

  function drawProblems(ctx, problems, y) {
    if (!problems.length) return y;
    const x = OUTER;
    const w = CANVAS_WIDTH - OUTER * 2;
    ctx.font = '500 29px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const measured = problems.map((problem) => wrapLines(ctx, problem.text || 'bez popisu', w - 96));
    const h = 82 + measured.reduce((sum, lines) => sum + 82 + Math.max(1, lines.length) * 38, 0) + 20;

    fillRounded(ctx, x, y, w, h, 28, 'rgba(3,13,20,.50)', 'rgba(255,255,255,.10)');
    ctx.fillStyle = '#f2f8fb';
    ctx.font = '800 38px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('PROBLÉMY / ODSTÁVKY', x + 32, y + 53);

    let cursor = y + 92;
    problems.forEach((problem, index) => {
      const duration = durationLabel(problemMinutes(problem.from, problem.to));
      const time = (problem.from || '??:??') + '–' + (problem.to || '??:??') + (duration ? '  (' + duration + ')' : '');
      fillRounded(ctx, x + 24, cursor, w - 48, 70 + Math.max(1, measured[index].length) * 38, 18, 'rgba(255,255,255,.035)', 'rgba(255,255,255,.08)');
      ctx.fillStyle = '#ffffff';
      ctx.font = '750 30px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(problem.machine || 'Stroj', x + 48, cursor + 38);
      ctx.fillStyle = '#7fd9ff';
      ctx.font = '650 27px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(time, x + w - 48, cursor + 38);
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(235,245,250,.82)';
      ctx.font = '500 29px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      measured[index].forEach((line, lineIndex) => {
        ctx.fillText(line, x + 48, cursor + 80 + lineIndex * 38);
      });
      cursor += 82 + Math.max(1, measured[index].length) * 38;
    });
    return y + h + 30;
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
    model.sections.forEach((section) => {
      y = drawSection(ctx, section, y);
    });
    y = drawProblems(ctx, model.problems, y);

    ctx.fillStyle = 'rgba(236,246,250,.34)';
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
      sharePromise = navigator.share({ title: 'RaK – report směny', files: [file] });
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
    try { new MutationObserver(scan).observe(document.body, { childList: true, subtree: true }); }
    catch (err) {}

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
