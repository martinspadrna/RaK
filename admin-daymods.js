// RaK 1.2 (1.157) – denní výjimky v rozpisu (odchod dřív / půl směny / kalírna) + žluté zvýraznění buněk.
// Část A: zadávání oknem na klik do buňky a vizuální upozornění. Statistika navazuje v části B.
try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('admin-daymods.js', 'loaded', { source: 'dynamic-loader' }); } catch (err) {}

(function () {
  'use strict';

  var DM_TYPES = [
    { value: 'leaveEarly', label: 'Odešel dřív (domů / jinam)' },
    { value: 'arriveLate', label: 'Přišel později do práce' },
    { value: 'machineMove', label: 'Půl směny / přesun na jiný stroj' },
    { value: 'kalirnaOut', label: 'Odešel na kalírnu (počítá se jako soustruh)' },
    { value: 'kalirnaIn', label: 'Kalírna k nám (nepočítá se)' }
  ];

  var DM_REASONS = [
    { value: 'D', label: 'Dovolená' },
    { value: 'NV', label: 'Náhradní volno' },
    { value: '§', label: 'Paragraf' },
    { value: 'LEK', label: 'Lékař' },
    { value: 'NEPL', label: 'Neplacené' }
  ];

  function esc(value) {
    if (typeof escapeHtml === 'function') return escapeHtml(value);
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function typeLabel(value) {
    if (value === 'noOvertime') return 'Není na přesčasu (od 22 h)';
    for (var i = 0; i < DM_TYPES.length; i += 1) if (DM_TYPES[i].value === value) return DM_TYPES[i].label;
    return value || '';
  }

  function sectionMachines(section) {
    try {
      if (section === 'soft' && typeof SOFT_MACHINE_HEADERS !== 'undefined') return SOFT_MACHINE_HEADERS.slice();
      if (typeof HARD_MACHINE_HEADERS !== 'undefined') return HARD_MACHINE_HEADERS.slice();
    } catch (e) {}
    return [];
  }

  // ---- datová vrstva ----------------------------------------------------
  function getMonth(monthKey) {
    try {
      if (window.app && app.rotation && app.rotation.months) return app.rotation.months[monthKey] || null;
    } catch (e) {}
    return null;
  }

  function listMods(month) {
    return month && Array.isArray(month.dayMods) ? month.dayMods : [];
  }

  function findMod(month, section, dateRaw, cellIndex) {
    var list = listMods(month);
    var date = String(dateRaw || '').trim();
    var idx = Number(cellIndex);
    for (var i = 0; i < list.length; i += 1) {
      var m = list[i];
      if (!m || m.section !== section || String(m.date || '').trim() !== date || Number(m.cellIndex) !== idx) continue;
      if (m.type === 'kalirnaOut' && String(m.person || '').trim()) {
        var sec = month && month[section];
        var rows = sec && Array.isArray(sec.rows) ? sec.rows : [];
        var row = rows.find(function (item) { return String(item && item.date || '').trim() === date; });
        var currentPerson = row && Array.isArray(row.cells) ? String(row.cells[idx] || '').trim() : '';
        if (currentPerson !== String(m.person || '').trim()) continue;
      }
      return m;
    }
    return null;
  }

  // Veřejné API pro vykreslení (admin i veřejný rozpis).
  window.rakDayModForCell = function rakDayModForCell(month, section, dateRaw, cellIndex) {
    if (!month) return null;
    return findMod(month, section === 'soft' ? 'soft' : 'hard', dateRaw, cellIndex);
  };

  window.rakDayModForAdminCell = function rakDayModForAdminCell(section, dateRaw, cellIndex) {
    var monthKey = typeof getAdminSelectedMonthKey === 'function' ? getAdminSelectedMonthKey() : (window.app ? app.selectedMonth : '');
    return window.rakDayModForCell(getMonth(monthKey), section, dateRaw, cellIndex);
  };

  // Krátká značka do buňky (vizuální upozornění i bez barvy).
  window.rakDayModBadge = function rakDayModBadge(mod) {
    if (!mod) return '';
    if (mod.type === 'noOvertime') return '22h';
    if (mod.type === 'machineMove') return '½';
    if (mod.type === 'kalirnaOut') return '→K';
    if (mod.type === 'kalirnaIn') return 'K→';
    return '◷'; // odejde dřív / přijde později
  };

  function modTooltip(mod) {
    if (!mod) return '';
    var parts = [typeLabel(mod.type)];
    if (mod.time) parts.push('čas ' + mod.time);
    if (mod.type === 'leaveEarly' && mod.restReason) {
      var r = mod.restReason;
      for (var i = 0; i < DM_REASONS.length; i += 1) if (DM_REASONS[i].value === r) { r = DM_REASONS[i].label; break; }
      parts.push('zbytek: ' + r);
    }
    if (mod.note) parts.push(mod.note);
    return parts.join(' · ');
  }
  window.rakDayModTooltip = modTooltip;

  // Odvozené absenční řádky (dovolená/NV/§/lékař od/do času) pro tabulku Absence.
  window.rakDayModAbsenceRows = function rakDayModAbsenceRows(month) {
    var rows = [];
    var list = listMods(month);
    var map = { D: 'D', NV: 'NV', '§': '§', LEK: 'lékař', NEPL: 'neplac.' };
    for (var i = 0; i < list.length; i += 1) {
      var m = list[i];
      if (!m) continue;
      if ((m.type === 'leaveEarly' || m.type === 'arriveLate') && m.restReason) {
        var c = map[m.restReason] || m.restReason;
        var prefix = (m.type === 'arriveLate') ? 'do' : 'od';
        var codeText = (m.time ? (prefix + ' ' + m.time + ' ') : '') + c;
        rows.push({ date: m.date, person: m.person, code: codeText });
      }
    }
    return rows;
  };

  function upsertMod(monthKey, record) {
    if (!window.app || !app.rotation) return;
    if (!app.rotation.months) app.rotation.months = {};
    var month = app.rotation.months[monthKey];
    if (!month) return;
    if (!Array.isArray(month.dayMods)) month.dayMods = [];
    var list = month.dayMods;
    for (var i = list.length - 1; i >= 0; i -= 1) {
      var m = list[i];
      if (m && m.section === record.section && String(m.date || '').trim() === record.date && Number(m.cellIndex) === Number(record.cellIndex)) {
        list.splice(i, 1);
      }
    }
    if (record.type) list.push(record);
  }

  // ---- okno -------------------------------------------------------------
  function closeModal() {
    var overlay = document.getElementById('rakDayModOverlay');
    if (overlay) overlay.classList.remove('isVisible');
    document.body.classList.remove('rakDayModOpen');
  }
  window.closeRakDayModModal = closeModal;

  function openInfoModal(info, heading) {
    var text = String(info || '').trim();
    if (!text) return;
    var overlay = document.getElementById('rakDayModOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'rakDayModOverlay';
      overlay.className = 'rakDayModOverlay';
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = [
      '<div class="rakDayModWin" role="dialog" aria-modal="true" aria-labelledby="rakDayModInfoTitle">',
      '  <div class="rakDayModHead">',
      '    <div>',
      '      <div class="rakDayModTitle" id="rakDayModInfoTitle">Výjimka v rozpisu</div>',
      '      <div class="rakDayModSub">' + esc(heading || 'Detail buňky') + '</div>',
      '    </div>',
      '    <button type="button" class="rakDayModClose" data-dm-act="close" aria-label="Zavřít">×</button>',
      '  </div>',
      '  <div class="rakDayModBody"><div class="smallText">' + esc(text) + '</div></div>',
      '  <div class="rakDayModFoot"><span></span><div class="rakDayModFootRight"><button type="button" class="rakDayModBtn" data-dm-act="close">Zavřít</button></div></div>',
      '</div>'
    ].join('');
    overlay.classList.add('isVisible');
    document.body.classList.add('rakDayModOpen');
    overlay.querySelectorAll('[data-dm-act="close"]').forEach(function (b) { b.addEventListener('click', closeModal); });
    overlay.addEventListener('click', function (ev) { if (ev.target === overlay) closeModal(); }, { once: true });
  }

  function fieldRowsHtml(existing) {
    var typeOptions = DM_TYPES.map(function (t) {
      return '<option value="' + esc(t.value) + '"' + (existing && existing.type === t.value ? ' selected' : '') + '>' + esc(t.label) + '</option>';
    }).join('');
    var reasonOptions = DM_REASONS.map(function (r) {
      return '<option value="' + esc(r.value) + '"' + (existing && existing.restReason === r.value ? ' selected' : '') + '>' + esc(r.label) + '</option>';
    }).join('');
    return { typeOptions: typeOptions, reasonOptions: reasonOptions };
  }

  function allMachinesOptionsHtml(curSection, curIndex, selSection, selIndex) {
    var out = '<option value="">— vyber stroj —</option>';
    var add = function (section, label) {
      var machines = sectionMachines(section);
      machines.forEach(function (name, idx) {
        if (section === curSection && idx === Number(curIndex)) return;
        var val = section + ':' + idx;
        var sel = (selSection === section && Number(selIndex) === idx) ? ' selected' : '';
        out += '<option value="' + esc(val) + '"' + sel + '>' + esc(label) + ' – ' + esc(name) + '</option>';
      });
    };
    add('hard', 'Tvrdota');
    add('soft', 'Měkota');
    return out;
  }

  function ctxParsedDate(ctx) {
    return (typeof parseDateToken === 'function') ? parseDateToken(String(ctx.date || '')) : null;
  }
  function ctxIsSunday(ctx) {
    try {
      var d = (typeof getStatsDateFromMonthKey === 'function') ? getStatsDateFromMonthKey(ctx.monthKey, ctxParsedDate(ctx)) : null;
      return !!(d && d.getDay() === 0);
    } catch (e) { return false; }
  }
  function ctxAppOvertimeSunday(ctx) {
    try {
      var p = ctxParsedDate(ctx);
      if (typeof isStatsOvertimeSundayShift === 'function' && isStatsOvertimeSundayShift(ctx.monthKey, p)) return true;
      if (typeof isStatsOvertimeSundayMoOnly === 'function' && isStatsOvertimeSundayMoOnly(ctx.monthKey, p)) return true;
    } catch (e) {}
    return false;
  }

  // Pevné přestávky (30 min): 10:00, 14:00, 02:00, 22:00.
  var DM_BREAKS = [[10, 0], [14, 0], [2, 0], [22, 0]];

  // Odpracované hodiny v okně [start, end] po odečtení přestávek, které do okna spadají.
  // exclude = pole [h,m] přestávek, které se nemají počítat (např. úvodní pauza u příchodu na 22 h).
  function workedBetween(start, end, exclude) {
    if (!start || !end || end.getTime() <= start.getTime()) return 0;
    var grossMs = end.getTime() - start.getTime();
    var breakMs = 0;
    var dayMs = 24 * 3600 * 1000;
    DM_BREAKS.forEach(function (b) {
      if (exclude && exclude.some(function (e) { return e[0] === b[0] && e[1] === b[1]; })) return;
      [0, dayMs].forEach(function (offset) {
        var bs = new Date(start.getTime());
        bs.setHours(b[0], b[1], 0, 0);
        bs = new Date(bs.getTime() + offset);
        var be = new Date(bs.getTime() + 30 * 60 * 1000);
        var ov = Math.min(end.getTime(), be.getTime()) - Math.max(start.getTime(), bs.getTime());
        if (ov > 0) breakMs += ov;
      });
    });
    return Math.max(0, (grossMs - breakMs) / 3600000);
  }

  function isNightWindow(win) {
    return !!(win && win.start && win.start.getHours() >= 18);
  }

  // Efektivní okno směny (zohlední přesčas / příchod na 22 h) + případná pevná hodnota (běžná neděle = 7,5 h).
  function effectiveWindow(ctx, overtime) {
    var base = (typeof getRotationRowShiftWindow === 'function') ? getRotationRowShiftWindow(ctx.monthKey, ctx.date) : null;
    if (!base || !base.start || !base.end) return null;
    var start = new Date(base.start.getTime());
    var end = new Date(base.end.getTime());
    var forceValue = null;
    var excludeBreaks = null;
    if (ctx.isSunday && ctx.appOvertime) {
      // přesčasová neděle: zaškrtnutý = dlouhá (18 h start), odškrtnutý = od 22 h
      if (isNightWindow(base)) {
        start.setHours(overtime ? 18 : 22, 0, 0, 0);
        if (!overtime) excludeBreaks = [[22, 0]]; // od 22 h se počítá až druhá pauza (02:00)
      }
    } else if (ctx.isSunday) {
      forceValue = 7.5; // běžná neděle bez přesčasu = 7,5 h
    }
    return { start: start, end: end, forceValue: forceValue, excludeBreaks: excludeBreaks };
  }

  // Zaokrouhlení na dokončené čtvrthodiny (odchod/přesun dolů, příchod nahoru).
  function roundQuarter(d, up) {
    var x = new Date(d.getTime());
    var rem = x.getMinutes() % 15;
    if (rem === 0) { x.setSeconds(0, 0); return x; }
    x.setMinutes(x.getMinutes() + (up ? (15 - rem) : -rem), 0, 0);
    return x;
  }

  function computeHours(ctx, type, timeStr, overtime) {
    var win = effectiveWindow(ctx, overtime);
    if (!win) return null;
    var ex = win.excludeBreaks;
    var naturalNet = workedBetween(win.start, win.end, ex);
    var net = (win.forceValue != null) ? win.forceValue : naturalNet;
    var scale = (win.forceValue != null && naturalNet > 0) ? (win.forceValue / naturalNet) : 1;
    var out = { start: win.start, end: win.end, net: Math.round(net * 100) / 100, worked: null, rest: null };
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(timeStr || '').trim());
    if (!m) return out;
    var t = new Date(win.start.getTime());
    t.setHours(Number(m[1]), Number(m[2]), 0, 0);
    if (t.getTime() < win.start.getTime()) t = new Date(t.getTime() + 24 * 3600 * 1000);
    if (t.getTime() < win.start.getTime()) t = new Date(win.start.getTime());
    if (t.getTime() > win.end.getTime()) t = new Date(win.end.getTime());
    var r2 = function (v) { return Math.round(v * scale * 100) / 100; };
    if (type === 'arriveLate') {
      var tA = roundQuarter(t, true); // pozdní příchod nahoru
      out.worked = r2(workedBetween(tA, win.end, ex));        // odpracováno od příchodu do konce
      out.rest = r2(workedBetween(win.start, tA, ex));         // chybějící část (bez přestávek)
    } else if (type === 'machineMove') {
      var tM = roundQuarter(t, false);
      out.worked = r2(workedBetween(win.start, tM, ex));       // původní stroj
      out.rest = r2(workedBetween(tM, win.end, ex));           // nový stroj
    } else {
      var tL = roundQuarter(t, false); // odchod dolů
      out.worked = r2(workedBetween(win.start, tL, ex));       // odpracováno
      out.rest = r2(workedBetween(tL, win.end, ex));           // dovolená/zbytek (bez přestávek)
    }
    return out;
  }

  function fmtH(v) { return (Math.round(v * 100) / 100).toString().replace('.', ',') + ' h'; }

  function reasonLabel(code) {
    for (var i = 0; i < DM_REASONS.length; i += 1) if (DM_REASONS[i].value === code) return DM_REASONS[i].label;
    return code || 'zbytek';
  }

  function updatePreview(ctx, modal) {
    var box = modal.querySelector('[data-dm-calc]');
    if (!box) return;
    var type = (modal.querySelector('[data-dm="type"]') || {}).value || '';
    if (type !== 'leaveEarly' && type !== 'arriveLate' && type !== 'machineMove') { box.textContent = ''; return; }
    var timeStr = (modal.querySelector('[data-dm="time"]') || {}).value || '';
    var overtime = !!((modal.querySelector('[data-dm="overtime"]') || {}).checked);
    var calc = computeHours(ctx, type, timeStr, overtime);
    if (!calc) { box.textContent = 'Časy směny se nepodařilo načíst – hodiny dopočítá statistika.'; return; }
    if (calc.worked == null) { box.textContent = 'Zadej čas a appka dopočítá odpracované hodiny.'; return; }
    if (type === 'arriveLate') {
      box.textContent = 'Směna ' + fmtH(calc.net) + ' · odpracováno ' + fmtH(calc.worked) + ' · chybí ' + fmtH(calc.rest) + '.';
    } else if (type === 'machineMove') {
      box.textContent = 'Směna ' + fmtH(calc.net) + ' · původní stroj ' + fmtH(calc.worked) + ' · nový stroj ' + fmtH(calc.rest) + '.';
    } else {
      var rsel = modal.querySelector('[data-dm="restReason"]');
      var rl = rsel ? reasonLabel(rsel.value) : 'zbytek';
      box.textContent = 'Směna ' + fmtH(calc.net) + ' · odpracováno ' + fmtH(calc.worked) + ' · ' + rl + ' ' + fmtH(calc.rest) + '.';
    }
  }

  function applyTypeVisibility(modal, ctx) {
    var typeSel = modal.querySelector('[data-dm="type"]');
    var type = typeSel ? typeSel.value : '';
    var show = function (sel, on) {
      var el = modal.querySelector(sel);
      if (el) el.style.display = on ? '' : 'none';
    };
    var hasTime = (type === 'leaveEarly' || type === 'arriveLate' || type === 'machineMove');
    show('[data-dm-group="time"]', hasTime);
    show('[data-dm-group="reason"]', type === 'leaveEarly' || type === 'arriveLate');
    show('[data-dm-group="calc"]', hasTime);
    show('[data-dm-group="machine"]', type === 'machineMove');
    show('[data-dm-group="overtime"]', hasTime && !!(ctx && ctx.isSunday));
    var lbl = modal.querySelector('[data-dm-timelabel]');
    if (lbl) lbl.textContent = (type === 'arriveLate') ? 'Čas příchodu' : (type === 'machineMove' ? 'Čas přesunu' : 'Čas odchodu');
    if (ctx) updatePreview(ctx, modal);
  }

  function openModal(ctx) {
    var month = getMonth(ctx.monthKey);
    var existing = window.rakDayModForCell(month, ctx.section, ctx.date, ctx.cellIndex);
    ctx.isSunday = ctxIsSunday(ctx);
    ctx.appOvertime = ctxAppOvertimeSunday(ctx);
    var overtimeChecked = existing && existing.overtime != null ? !!existing.overtime : !!ctx.appOvertime;
    var opts = fieldRowsHtml(existing);

    var overlay = document.getElementById('rakDayModOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'rakDayModOverlay';
      overlay.className = 'rakDayModOverlay';
      document.body.appendChild(overlay);
    }

    var headPerson = ctx.person ? esc(ctx.person) : '<span class="rakDayModMuted">(prázdná buňka)</span>';
    var machineName = '';
    var machines = sectionMachines(ctx.section);
    if (machines[ctx.cellIndex]) machineName = machines[ctx.cellIndex];

    overlay.innerHTML = [
      '<div class="rakDayModWin" role="dialog" aria-modal="true" aria-labelledby="rakDayModTitle">',
      '  <div class="rakDayModHead">',
      '    <div>',
      '      <div class="rakDayModTitle" id="rakDayModTitle">Úprava dne v rozpisu</div>',
      '      <div class="rakDayModSub">' + headPerson + ' · ' + esc(machineName) + ' · ' + esc(ctx.date) + '</div>',
      '    </div>',
      '    <button type="button" class="rakDayModClose" data-dm-act="close" aria-label="Zavřít">×</button>',
      '  </div>',
      '  <div class="rakDayModBody">',
      '    <label class="rakDayModField"><span>Co se děje</span>',
      '      <select data-dm="type">' + opts.typeOptions + '</select>',
      '    </label>',
      '    <label class="rakDayModField" data-dm-group="time"><span data-dm-timelabel>Čas odchodu</span>',
      '      <input type="time" data-dm="time" value="' + esc(existing && existing.time ? existing.time : '') + '">',
      '    </label>',
      '    <label class="rakDayModField" data-dm-group="reason"><span>Důvod chybějící části směny</span>',
      '      <select data-dm="restReason">' + opts.reasonOptions + '</select>',
      '    </label>',
      '    <label class="rakDayModCheck" data-dm-group="overtime"' + (ctx.isSunday ? '' : ' style="display:none"') + '>',
      '      <input type="checkbox" data-dm="overtime"' + (overtimeChecked ? ' checked' : '') + '>',
      '      <span>Je na přesčasu (dlouhá směna 11 h) — odškrtni, pokud jde až od 22 h</span>',
      '    </label>',
      '    <div class="rakDayModCalc" data-dm-calc data-dm-group="calc"></div>',
      '    <label class="rakDayModField" data-dm-group="machine"><span>Přesun na stroj</span>',
      '      <select data-dm="toCellIndex">' + allMachinesOptionsHtml(ctx.section, ctx.cellIndex, existing ? existing.toSection : '', existing ? existing.toCellIndex : null) + '</select>',
      '    </label>',
      '    <label class="rakDayModField"><span>Poznámka (nepovinné)</span>',
      '      <input type="text" data-dm="note" maxlength="120" value="' + esc(existing && existing.note ? existing.note : '') + '" placeholder="nepovinná poznámka">',
      '    </label>',
      '  </div>',
      '  <div class="rakDayModFoot">',
      (existing ? '    <button type="button" class="rakDayModBtn rakDayModBtnDanger" data-dm-act="delete">Odebrat</button>' : '    <span></span>'),
      '    <div class="rakDayModFootRight">',
      '      <button type="button" class="rakDayModBtn" data-dm-act="close">Zrušit</button>',
      '      <button type="button" class="rakDayModBtn rakDayModBtnPrimary" data-dm-act="save">Uložit</button>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');

    overlay.classList.add('isVisible');
    document.body.classList.add('rakDayModOpen');

    var modal = overlay.querySelector('.rakDayModWin');
    applyTypeVisibility(modal, ctx);
    var typeSel = modal.querySelector('[data-dm="type"]');
    if (typeSel) typeSel.addEventListener('change', function () { applyTypeVisibility(modal, ctx); });
    var timeEl = modal.querySelector('[data-dm="time"]');
    if (timeEl) timeEl.addEventListener('input', function () { updatePreview(ctx, modal); });
    var reasonEl = modal.querySelector('[data-dm="restReason"]');
    if (reasonEl) reasonEl.addEventListener('change', function () { updatePreview(ctx, modal); });
    var otEl = modal.querySelector('[data-dm="overtime"]');
    if (otEl) otEl.addEventListener('change', function () { updatePreview(ctx, modal); });

    modal.querySelectorAll('[data-dm-act]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var act = btn.getAttribute('data-dm-act');
        if (act === 'close') { closeModal(); return; }
        if (act === 'delete') { void saveFromModal(ctx, modal, true); return; }
        if (act === 'save') { void saveFromModal(ctx, modal, false); return; }
      });
    });
    overlay.addEventListener('click', function (ev) { if (ev.target === overlay) closeModal(); }, { once: true });
  }

  function readNum(modal, key) {
    var el = modal.querySelector('[data-dm="' + key + '"]');
    if (!el) return null;
    var raw = String(el.value || '').trim().replace(',', '.');
    if (raw === '') return null;
    var n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  function readStr(modal, key) {
    var el = modal.querySelector('[data-dm="' + key + '"]');
    return el ? String(el.value || '').trim() : '';
  }

  async function saveFromModal(ctx, modal, remove) {
    var monthKey = ctx.monthKey;

    // Nejdřív posbíráme aktuální stav rozpisu z DOM, ať nepřijdeme o rozepsané úpravy jmen.
    try {
      if (typeof readAdminRotationFromDom === 'function' && window.app && app.rotation) {
        if (!app.rotation.months) app.rotation.months = {};
        app.rotation.months[monthKey] = readAdminRotationFromDom(monthKey);
      }
    } catch (e) {}

    if (remove) {
      upsertMod(monthKey, { section: ctx.section, date: ctx.date, cellIndex: ctx.cellIndex, type: '' });
    } else {
      var type = readStr(modal, 'type');
      var timeStr = readStr(modal, 'time');
      var overtime = !!((modal.querySelector('[data-dm="overtime"]') || {}).checked);
      var timed = (type === 'leaveEarly' || type === 'arriveLate' || type === 'machineMove');
      var realExc = (timed && timeStr) || type === 'kalirnaOut' || type === 'kalirnaIn';

      if (!realExc) {
        // Žádná časová výjimka. Na přesčasové neděli odškrtnutý = jde od 22 h (lehký záznam).
        if (ctx.isSunday && ctx.appOvertime && !overtime) {
          upsertMod(monthKey, {
            section: ctx.section === 'soft' ? 'soft' : 'hard',
            date: ctx.date, cellIndex: Number(ctx.cellIndex), person: ctx.person || '',
            type: 'noOvertime', time: '', restReason: '',
            workedHours: null, restHours: null, overtime: false,
            toSection: '', toCellIndex: null, note: readStr(modal, 'note')
          });
        } else {
          // Na přesčasu (default) / nebo nic zvláštního → záznam netřeba, případný smažeme.
          upsertMod(monthKey, { section: ctx.section, date: ctx.date, cellIndex: ctx.cellIndex, type: '' });
        }
      } else {
        var hasReason = (type === 'leaveEarly' || type === 'arriveLate');
        var toSection = '', toCellIndex = null;
        if (type === 'machineMove') {
          var tv = readStr(modal, 'toCellIndex');
          var pp = tv.split(':');
          if (pp.length === 2) { toSection = (pp[0] === 'soft') ? 'soft' : 'hard'; toCellIndex = Number(pp[1]); }
        }
        var calc = computeHours(ctx, type, timeStr, overtime);
        var record = {
          section: ctx.section === 'soft' ? 'soft' : 'hard',
          date: ctx.date,
          cellIndex: Number(ctx.cellIndex),
          person: ctx.person || '',
          type: type,
          time: timeStr,
          restReason: hasReason ? readStr(modal, 'restReason') : '',
          workedHours: calc && calc.worked != null ? calc.worked : null,
          restHours: calc && calc.rest != null ? calc.rest : null,
          overtime: ctx.isSunday ? overtime : null,
          toSection: toSection,
          toCellIndex: toCellIndex,
          note: readStr(modal, 'note')
        };
        upsertMod(monthKey, record);
      }
    }

    try { if (typeof normalizeRotationData === 'function') app.rotation = normalizeRotationData(app.rotation); } catch (e) {}
    try { if (typeof saveRotationData === 'function') saveRotationData(); } catch (e) {}

    closeModal();

    // Překreslíme veřejný rozpis (read-only, bez rozepsaných úprav) a obnovíme editor.
    try { if (typeof renderRotace === 'function') renderRotace(); } catch (e) {}
    try { if (typeof renderMonth === 'function' && window.app) renderMonth(app.selectedMonth || monthKey); } catch (e) {}
    refreshAdminEditor(monthKey);
    try { setSectionEditMode(ctx.section, true); } catch (e) {}

    try {
      if (window.app && app.adminUnlocked && typeof saveRotationToSupabase === 'function') {
        var result = await saveRotationToSupabase(app.rotation, { source: 'admin-daymod', monthKey: monthKey });
        var statusEl = document.getElementById('adminOnlineSaveStatus');
        if (statusEl) {
          statusEl.textContent = result && result.ok === true
            ? (remove ? 'Výjimka odebrána a rozpis uložen online.' : 'Výjimka uložena online.')
            : 'Výjimka je změněná jen lokálně, online uložení se nepovedlo.';
        }
      }
    } catch (e) {}
  }

  // Po uložení obnovíme editor rozpisu, ať se ukáže žluté pole. Stav už je posbíraný z DOM výše.
  function refreshAdminEditor(monthKey) {
    try {
      var bodyEl = document.getElementById('appMenuBody');
      if (bodyEl && typeof renderAdminMenuBody === 'function' && bodyEl.dataset && bodyEl.dataset.adminView === 'rotation') {
        renderAdminMenuBody(bodyEl, 'rotation');
        return;
      }
    } catch (e) {}
    // Záloha: aspoň přebarvit konkrétní buňku v DOM, kdyby plný re-render nebyl k dispozici.
    try {
      var body = document.getElementById('appMenuBody');
      if (!body) return;
      body.querySelectorAll('button[data-daymod-open]').forEach(function (btn) {
        var tr = btn.closest('tr');
        if (!tr) return;
        var section = tr.getAttribute('data-rotation-section');
        var dateEl = tr.querySelector('[data-rot-field="date"]');
        var dateRaw = dateEl ? dateEl.value : '';
        var cellIndex = Number(btn.getAttribute('data-dm-cell'));
        var mod = window.rakDayModForAdminCell(section, dateRaw, cellIndex);
        var td = btn.closest('td');
        if (td) td.classList.toggle('rakDayModCell', !!mod);
        btn.classList.toggle('rakDayModBtnActive', !!mod);
      });
    } catch (e) {}
  }

  // ---- přehled přesčasů ------------------------------------------------
  window.rakBuildOvertimeOverview = function rakBuildOvertimeOverview(monthKey) {
    var month = getMonth(monthKey);
    if (!month) return '<div class="rakOtEmpty">Žádná data měsíce.</div>';
    var groups = {}, order = [];
    ['hard', 'soft'].forEach(function (section) {
      var sec = month[section];
      if (!sec || !Array.isArray(sec.rows)) return;
      var machines = sectionMachines(section);
      sec.rows.forEach(function (row) {
        var parsed = (typeof parseDateToken === 'function') ? parseDateToken(String(row.date || '')) : null;
        var isOt = false;
        try { isOt = (typeof isStatsOvertimeSundayShift === 'function') && !!isStatsOvertimeSundayShift(monthKey, parsed); } catch (e) {}
        if (!isOt) return;
        (row.cells || []).forEach(function (cell, idx) {
          var person = String(cell || '').trim();
          if (!person) return;
          var mod = findMod(month, section, row.date, idx);
          var off = !!(mod && (mod.type === 'noOvertime' || mod.overtime === false));
          if (!groups[row.date]) { groups[row.date] = []; order.push(row.date); }
          groups[row.date].push({ person: person, machine: machines[idx] || ('#' + (idx + 1)), off: off });
        });
      });
    });
    if (!order.length) return '<div class="rakOtEmpty">V tomto měsíci nejsou žádné přesčasové neděle (podle dat aplikace).</div>';
    return order.map(function (date) {
      var list = groups[date];
      var onC = list.filter(function (r) { return !r.off; }).length;
      var offC = list.length - onC;
      var rows = list.map(function (r) {
        return '<tr class="' + (r.off ? 'rakOtOff' : 'rakOtOn') + '"><td>' + esc(r.person) + '</td><td>' + esc(r.machine) + '</td><td>' + (r.off ? 'od 22 h' : 'přesčas') + '</td></tr>';
      }).join('');
      return '<div class="rakOtDay"><div class="rakOtDate">' + esc(date) + ' — přesčas ' + onC + ', od 22 h ' + offC + '</div>'
        + '<table class="rakOtTable"><thead><tr><th>Jméno</th><th>Stroj</th><th>Stav</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    }).join('');
  };

  function openOvertimeOverview(monthKey) {
    var overlay = document.getElementById('rakDayModOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'rakDayModOverlay';
      overlay.className = 'rakDayModOverlay';
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = [
      '<div class="rakDayModWin rakOtWin" role="dialog" aria-modal="true">',
      '  <div class="rakDayModHead"><div>',
      '    <div class="rakDayModTitle">Přehled přesčasů</div>',
      '    <div class="rakDayModSub">' + esc(monthKey) + ' · všichni na stroji = přesčas, odškrtnutí jdou od 22 h</div>',
      '  </div><button type="button" class="rakDayModClose" data-dm-act="close" aria-label="Zavřít">×</button></div>',
      '  <div class="rakDayModBody rakOtBody">' + window.rakBuildOvertimeOverview(monthKey) + '</div>',
      '  <div class="rakDayModFoot"><span></span><div class="rakDayModFootRight"><button type="button" class="rakDayModBtn" data-dm-act="close">Zavřít</button></div></div>',
      '</div>'
    ].join('');
    overlay.classList.add('isVisible');
    document.body.classList.add('rakDayModOpen');
    overlay.querySelectorAll('[data-dm-act="close"]').forEach(function (b) { b.addEventListener('click', closeModal); });
    overlay.addEventListener('click', function (ev) { if (ev.target === overlay) closeModal(); }, { once: true });
  }

  // ---- režim výjimek + otevření z buňky --------------------------------
  function setSectionEditMode(section, on) {
    var body = document.getElementById('appMenuBody');
    if (!body) return;
    var table = body.querySelector('table[data-daymod-section="' + section + '"]');
    if (table) {
      table.classList.toggle('rakDayModEditMode', !!on);
      table.querySelectorAll('input[data-rot-field^="cell-"]').forEach(function (inp) {
        if (on) inp.setAttribute('readonly', 'readonly');
        else inp.removeAttribute('readonly');
      });
    }
    body.querySelectorAll('[data-daymod-mode="' + section + '"]').forEach(function (btn) {
      btn.classList.toggle('isActive', !!on);
      btn.textContent = on ? '✓ Hotovo' : '✎ Výjimky dne';
    });
  }
  window.rakDayModSetEditMode = setSectionEditMode;

  function onDocClick(ev) {
    var t = ev.target;
    if (!t || !t.closest) return;

    // přehled přesčasů
    var ovBtn = t.closest('[data-daymod-overtime-overview]');
    if (ovBtn) {
      ev.preventDefault();
      ev.stopPropagation();
      var mk = typeof getAdminSelectedMonthKey === 'function' ? getAdminSelectedMonthKey() : (window.app ? app.selectedMonth : '');
      if (mk) openOvertimeOverview(mk);
      return;
    }

    var publicInfoCell = t.closest('td.rakDayModCell[data-daymod-info]');
    if (publicInfoCell && !publicInfoCell.closest('table[data-daymod-section]')) {
      ev.preventDefault();
      ev.stopPropagation();
      openInfoModal(publicInfoCell.getAttribute('data-daymod-info') || publicInfoCell.getAttribute('title') || '', publicInfoCell.textContent || '');
      return;
    }

    // přepínač režimu vedle názvu tabulky
    var modeBtn = t.closest('[data-daymod-mode]');
    if (modeBtn) {
      ev.preventDefault();
      ev.stopPropagation();
      var section = modeBtn.getAttribute('data-daymod-mode');
      var table = document.querySelector('table[data-daymod-section="' + section + '"]');
      var on = !(table && table.classList.contains('rakDayModEditMode'));
      setSectionEditMode(section, on);
      return;
    }

    // v režimu výjimek otevře klik do buňky okno
    var cellInput = t.closest('input[data-rot-field^="cell-"]');
    if (cellInput) {
      var tbl = cellInput.closest('table[data-daymod-section]');
      if (!tbl || !tbl.classList.contains('rakDayModEditMode')) return;
      ev.preventDefault();
      ev.stopPropagation();
      try { cellInput.blur(); } catch (e) {}
      var tr = cellInput.closest('tr');
      if (!tr) return;
      var sec = tbl.getAttribute('data-daymod-section') || 'hard';
      var field = cellInput.getAttribute('data-rot-field') || '';
      var cellIndex = Number(field.replace('cell-', ''));
      var dateEl = tr.querySelector('[data-rot-field="date"]');
      var dateRaw = dateEl ? String(dateEl.value || '').trim() : '';
      var person = String(cellInput.value || '').trim();
      var monthKey = typeof getAdminSelectedMonthKey === 'function' ? getAdminSelectedMonthKey() : (window.app ? app.selectedMonth : '');
      if (!monthKey || !dateRaw) return;
      openModal({ monthKey: monthKey, section: sec, cellIndex: cellIndex, date: dateRaw, person: person });
    }
  }

  if (!window.__rakDayModHooksInstalled) {
    window.__rakDayModHooksInstalled = true;
    document.addEventListener('click', onDocClick, true);
  }
})();
