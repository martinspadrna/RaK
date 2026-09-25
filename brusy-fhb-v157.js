// RaK 1.5.7 – Brusy/FHB: čtyři samostatné vstupy, korekce na střed a opačné strany programu stroje.
(function installBrusFhbV157() {
  'use strict';

  const MACHINES = ['TBKR01', 'TBKR07'];
  const SPINDLES = ['C1', 'C2'];
  const SIDES = ['left', 'right'];
  const DEFAULT_MODEL = Object.freeze({ left: 2.0, right: 1.5 });
  const FALLBACK_KPO = Object.freeze({
    AD: Object.freeze({ left: Object.freeze({ target: 17, tolerance: 3, kpo: 'Zpět / Schub' }), right: Object.freeze({ target: 7, tolerance: 5, kpo: 'Tah / Zug' }) }),
    AE: Object.freeze({ left: Object.freeze({ target: 10, tolerance: 3, kpo: 'Zpět / Schub' }), right: Object.freeze({ target: 7, tolerance: 5, kpo: 'Tah / Zug' }) }),
    AH: Object.freeze({ left: Object.freeze({ target: 10, tolerance: 3, kpo: 'Zpět / Schub' }), right: Object.freeze({ target: 5, tolerance: 3, kpo: 'Tah / Zug' }) })
  });

  function kpoTargets() {
    return window.RAK_BRUS_FHB_KPO_TARGETS || FALLBACK_KPO;
  }

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

  function protocolSideCs(side) {
    return side === 'right' ? 'vpravo' : 'vlevo';
  }

  function programSide(side) {
    return side === 'right' ? 'left' : 'right';
  }

  function programSideCs(side) {
    return programSide(side) === 'right' ? 'VPRAVO' : 'VLEVO';
  }

  function currentRate(machine, side) {
    try {
      if (typeof window.getBrusFhbCorrectionSensitivity === 'function') {
        const n = Number(window.getBrusFhbCorrectionSensitivity(machine, side));
        if (Number.isFinite(n) && n > 0) return n;
      }
    } catch (_) {}
    try {
      const settings = typeof window.getBrusFhbCorrectionCalibrationSettings === 'function'
        ? window.getBrusFhbCorrectionCalibrationSettings()
        : null;
      const n = Number(settings && settings.activeModels && settings.activeModels[machine] && settings.activeModels[machine][side]);
      if (Number.isFinite(n) && n > 0) return n;
    } catch (_) {}
    return DEFAULT_MODEL[side];
  }

  // Vybírá celou korekci, jejíž odhad je co nejblíž STŘEDU doporučené hodnoty KPO.
  // Tolerance je informační pásmo; pokud lze být blíž středu, kalkulačka doporučí korekci i z hodnoty uvnitř pásma.
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
        || (Math.abs(candidate.centerDistance - best.centerDistance) < 1e-9 && Math.abs(candidate.correction) < Math.abs(best.correction))) {
        best = candidate;
      }
    }
    return best || { correction: 0, predicted: measured, centerDistance: Math.abs(measured - target), inside: measured >= min && measured <= max, min, max };
  }

  function selectedValue(name, fallback) {
    const el = document.querySelector('#korekce-brusy [data-brus157-select="' + name + '"] .brus157Choice.isActive');
    return String(el && el.dataset.value || fallback || '');
  }

  function choiceGroup(name, values, active) {
    return '<div class="brus157ChoiceGroup" data-brus157-select="' + esc(name) + '">' + values.map((value) => {
      const idxClass = name === 'index' ? (' index-' + String(value).toLowerCase()) : '';
      return '<button type="button" class="brus157Choice' + idxClass + (value === active ? ' isActive' : '') + '" data-value="' + esc(value) + '">' + esc(value) + '</button>';
    }).join('') + '</div>';
  }

  function targetSummary(index) {
    const targets = kpoTargets();
    const t = targets[index] || targets.AD;
    return [
      '<div class="brus157KpoSide"><span>Protokol vlevo · ' + esc(t.left.kpo) + '</span><b>' + esc(String(t.left.target)) + ' ± ' + esc(String(t.left.tolerance)) + ' µm</b><small>zadává se do programu VPRAVO</small></div>',
      '<div class="brus157KpoSide"><span>Protokol vpravo · ' + esc(t.right.kpo) + '</span><b>' + esc(String(t.right.target)) + ' ± ' + esc(String(t.right.tolerance)) + ' µm</b><small>zadává se do programu VLEVO</small></div>'
    ].join('');
  }

  function updateTargetSummary() {
    const el = document.getElementById('brus157KpoTarget');
    if (el) el.innerHTML = targetSummary(selectedValue('index', 'AD'));
  }

  function inputHtml(spindle, side) {
    const id = 'brus157_' + spindle.toLowerCase() + '_' + side;
    const protocol = protocolSideCs(side);
    const program = programSideCs(side);
    return '<label class="brus157Measure"><span><b>' + esc(spindle) + '</b> · FHB ' + esc(protocol) + '</span><small>→ program ' + esc(program) + '</small><div class="calcSignedInput brus157SignedInput"><button type="button" class="calcSignToggle" data-brus-fhb-sign-target="' + esc(id) + '" aria-label="Přepnout znaménko FHB">+</button><input id="' + esc(id) + '" data-brus-fhb-sign-input="1" type="text" inputmode="decimal" autocomplete="off" placeholder="—"></div></label>';
  }

  function renderCalculatorUi() {
    const page = document.getElementById('korekce-brusy');
    if (!page) return;
    const root = page.querySelector('.brusFhbCalcRoot');
    if (!root || root.dataset.v157 === '1') return;
    root.dataset.v157 = '1';
    root.classList.add('brus157Root');
    root.innerHTML = [
      '<div class="card brus157Card">',
      '<div class="brus157Intro"><b>FHB · korekce brusu</b><span>Zadej jen hodnoty, které chceš právě korigovat. C1/C2 i levá/pravá strana jsou nezávislé.</span></div>',
      '<div class="brus157Warning"><b>Pozor – kolo je na měrovém středisku otočené</b><span>Protokol <strong>VLEVO → program VPRAVO</strong> · protokol <strong>VPRAVO → program VLEVO</strong>.</span></div>',
      '<div class="brus157Field"><span>Stroj</span>' + choiceGroup('machine', MACHINES, 'TBKR01') + '</div>',
      '<div class="brus157Field"><span>Index</span>' + choiceGroup('index', Object.keys(kpoTargets()), 'AD') + '</div>',
      '<div class="brus157Kpo" id="brus157KpoTarget">' + targetSummary('AD') + '</div>',
      '<div class="brus157Spindle"><div class="brus157SpindleTitle">C1</div><div class="brus157Inputs">' + inputHtml('C1', 'left') + inputHtml('C1', 'right') + '</div></div>',
      '<div class="brus157Spindle"><div class="brus157SpindleTitle">C2</div><div class="brus157Inputs">' + inputHtml('C2', 'left') + inputHtml('C2', 'right') + '</div></div>',
      '<button type="button" class="calcPrimaryBtn calcCorrectionPrimaryBtn" id="brus157Evaluate">Vyhodnotit</button>',
      '<div class="card calcResultCard calcCorrectionResultCard brus157Result" id="brus157Result"></div>',
      '</div>'
    ].join('');
    const reset = page.querySelector(':scope > .headerBar .resetBtn');
    if (reset) {
      reset.setAttribute('data-reset-fields', 'brus157_c1_left,brus157_c1_right,brus157_c2_left,brus157_c2_right');
      reset.setAttribute('data-reset-results', 'brus157Result');
    }
  }

  function resultHtml(machine, index, spindle, side, measured) {
    if (!Number.isFinite(measured)) return '';
    const targets = kpoTargets();
    const spec = (targets[index] || targets.AD)[side];
    const rate = currentRate(machine, side);
    const choice = chooseCenterCorrection(measured, spec.target, spec.tolerance, rate);
    const correction = choice.correction;
    const progSide = programSideCs(side);
    const protocol = protocolSideCs(side);
    const inTargetBandNow = measured >= choice.min && measured <= choice.max;
    const status = correction === 0 ? ('Program ' + progSide + ' · bez korekce') : ('Program ' + progSide + ' · ' + signed(correction) + ' µm');
    const movement = correction > 0 ? 'spodek čáry na protokolu doleva ←' : (correction < 0 ? 'spodek čáry na protokolu doprava →' : 'nejbližší středu je bez změny');
    return [
      '<div class="brus157ResultSide' + (correction === 0 ? ' isOk' : '') + '">',
      '<div class="brus157ResultTop"><span>' + esc(spindle + ' · FHB ' + protocol) + '</span><b>' + esc(status) + '</b></div>',
      '<div class="brus157ProgramCallout">ZADAT VE STROJI: <strong>' + esc(progSide) + ' ' + esc(signed(correction)) + ' µm</strong></div>',
      '<div class="brus157Movement">' + esc(movement) + '</div>',
      '<div class="brus157Meta">Naměřeno <b>' + esc(fmt(measured, 0)) + '</b> · střed KPO <b>' + esc(String(spec.target)) + '</b> · pásmo ' + esc(String(choice.min)) + ' až ' + esc(String(choice.max)) + ' · odhad po korekci <b>' + esc(fmt(choice.predicted, 1)) + '</b></div>',
      '<div class="brus157Meta">Aktuální citlivost: ' + esc(fmt(rate, 2)) + ' µm FHB / 1 µm korekce' + (inTargetBandNow && correction !== 0 ? ' · hodnota už je v pásmu, ale korekce ji posune blíž středu' : '') + '</div>',
      '</div>'
    ].join('');
  }

  function evaluate() {
    const machine = selectedValue('machine', 'TBKR01');
    const index = selectedValue('index', 'AD');
    const out = document.getElementById('brus157Result');
    if (!out) return;
    const rows = [];
    SPINDLES.forEach((spindle) => {
      SIDES.forEach((side) => {
        const value = num(document.getElementById('brus157_' + spindle.toLowerCase() + '_' + side)?.value);
        if (Number.isFinite(value)) rows.push(resultHtml(machine, index, spindle, side, value));
      });
    });
    if (!rows.length) {
      out.innerHTML = '<div class="smallText">Zadej alespoň jednu hodnotu C1/C2 vlevo nebo vpravo.</div>';
      return;
    }
    out.innerHTML = '<div class="brus157ResultTitle">' + esc(machine + ' · ' + index) + '</div>' + rows.join('') + '<div class="brus157Foot">Korekce se volí v celých µm tak, aby odhad FHB byl co nejblíž středu doporučené hodnoty KPO. Strana programu je vždy opačná než strana na protokolu.</div>';
  }

  function decorateAdmin() {
    const root = document.querySelector('.adminBrusFhbCalibration');
    if (!root || root.dataset.v157 === '1') return;
    root.dataset.v157 = '1';
    const title = root.querySelector('.appMenuSubTitle');
    if (title) title.insertAdjacentHTML('afterend', '<div class="brus157AdminWarning"><b>Strany jsou proti programu otočené.</b><span>V administraci vybíráš stranu PROTOKOLU. Protokol vlevo = korekce v programu VPRAVO; protokol vpravo = korekce v programu VLEVO.</span></div>');
    const side = root.querySelector('[data-brus-fhb-cal-field="side"]');
    if (side) {
      const left = side.querySelector('option[value="left"]');
      const right = side.querySelector('option[value="right"]');
      if (left) left.textContent = 'Protokol VLEVO → program VPRAVO';
      if (right) right.textContent = 'Protokol VPRAVO → program VLEVO';
    }
    refreshAdminProgramHint(root);
  }

  function refreshAdminProgramHint(root) {
    root = root || document.querySelector('.adminBrusFhbCalibration');
    if (!root) return;
    const side = root.querySelector('[data-brus-fhb-cal-field="side"]');
    const correction = root.querySelector('[data-brus-fhb-cal-field="correction"]');
    if (!side || !correction) return;
    let hint = root.querySelector('.brus157AdminProgramHint');
    if (!hint) {
      hint = document.createElement('small');
      hint.className = 'brus157AdminProgramHint';
      correction.insertAdjacentElement('afterend', hint);
    }
    hint.textContent = 'Korekci zadáváš ve stroji do programu ' + programSideCs(side.value === 'right' ? 'right' : 'left') + '.';
  }

  function installStyles() {
    if (document.getElementById('brus-fhb-v157-styles')) return;
    const style = document.createElement('style');
    style.id = 'brus-fhb-v157-styles';
    style.textContent = `
#korekce-brusy .brus157Root{max-width:720px;margin:0 auto;padding:10px 12px calc(96px + env(safe-area-inset-bottom));box-sizing:border-box}
#korekce-brusy .brus157Card{display:flex;flex-direction:column;gap:12px;padding:14px!important}
#korekce-brusy .brus157Intro{display:flex;flex-direction:column;gap:3px}#korekce-brusy .brus157Intro>b{font-size:20px;color:var(--green2,#a8ff61)}#korekce-brusy .brus157Intro>span,#korekce-brusy .brus157Field>span{font-size:12px;color:rgba(232,245,255,.72)}
#korekce-brusy .brus157Warning{display:flex;flex-direction:column;gap:3px;padding:10px 12px;border-radius:14px;border:1px solid rgba(255,218,77,.55);background:rgba(86,52,0,.34)}#korekce-brusy .brus157Warning b{color:#fff38a;font-size:13px}#korekce-brusy .brus157Warning span{font-size:11px;line-height:1.35;color:#fff9d7}
#korekce-brusy .brus157Field{display:flex;flex-direction:column;gap:6px}.brus157ChoiceGroup{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:7px}.brus157Choice{min-height:48px;border:1px solid rgba(180,255,190,.28);border-radius:14px;background:rgba(7,25,45,.56);color:#edf7ff;font-weight:900;font-size:15px;box-shadow:0 8px 20px rgba(0,0,0,.20)}
#korekce-brusy .brus157Choice.isActive{outline:2px solid rgba(255,255,255,.96);outline-offset:2px;transform:translateY(-1px)}
#korekce-brusy .brus157ChoiceGroup[data-brus157-select="machine"] .brus157Choice.isActive{background:linear-gradient(145deg,#235c4a 0%,#287b5a 100%);border-color:rgba(151,208,196,.64);color:#e8f5f1;box-shadow:0 9px 22px rgba(0,0,0,.26),inset 0 1px 0 rgba(255,255,255,.26)}
#korekce-brusy .brus157Choice.index-ad{background:linear-gradient(145deg,#067dff 0%,#00aaff 100%);border-color:#b3efff;color:#fff;text-shadow:0 1px 1px #003d8f,0 0 20px #bdeeff;box-shadow:0 10px 26px rgba(0,0,0,.30),0 0 30px rgba(0,164,255,.55),inset 0 1px 0 rgba(255,255,255,.54)}
#korekce-brusy .brus157Choice.index-ae{background:linear-gradient(145deg,#00b966 0%,#00ee87 100%);border-color:#b5ffe0;color:#fff;text-shadow:0 1px 1px #00562f,0 0 20px #c7ffdd;box-shadow:0 10px 26px rgba(0,0,0,.30),0 0 30px rgba(0,237,135,.52),inset 0 1px 0 rgba(255,255,255,.54)}
#korekce-brusy .brus157Choice.index-ah{background:linear-gradient(145deg,#ffe12b 0%,#ffae00 52%,#f55c00 100%);border-color:#fff0ad;color:#fff;text-shadow:0 1px 1px #943000,0 0 20px #fff0a5;box-shadow:0 10px 26px rgba(0,0,0,.30),0 0 32px rgba(255,163,0,.58),inset 0 1px 0 rgba(255,255,255,.54)}
#korekce-brusy .brus157Kpo{display:grid;grid-template-columns:1fr 1fr;gap:8px}.brus157KpoSide{display:flex;flex-direction:column;gap:3px;padding:10px 11px;border:1px solid rgba(160,210,255,.22);border-radius:14px;background:rgba(4,18,39,.48)}.brus157KpoSide span,.brus157KpoSide small{font-size:10px;color:rgba(232,245,255,.66)}.brus157KpoSide b{font-size:16px;color:#effcff}.brus157KpoSide small{color:#fff1a4;font-weight:800}
#korekce-brusy .brus157Spindle{display:flex;flex-direction:column;gap:7px;padding:10px;border:1px solid rgba(180,255,190,.15);border-radius:15px;background:rgba(5,18,37,.30)}.brus157SpindleTitle{font-size:16px;font-weight:950;color:var(--green2,#a8ff61)}.brus157Inputs{display:grid;grid-template-columns:1fr 1fr;gap:8px}.brus157Measure{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:800}.brus157Measure>span{color:#effcff}.brus157Measure>small{font-size:10px;color:#fff19a}.brus157Measure .brus157SignedInput{display:grid!important;grid-template-columns:48px minmax(0,1fr)!important;gap:7px!important;align-items:stretch!important}.brus157Measure .brus157SignedInput .calcSignToggle{display:grid!important;place-items:center!important;width:48px!important;min-width:48px!important;min-height:55px!important;border-radius:15px!important;border:1px solid rgba(180,255,190,.30)!important;background:rgba(4,16,36,.82)!important;color:#fff!important;font:950 24px/1 system-ui!important;visibility:visible!important;opacity:1!important}.brus157Measure .brus157SignedInput .calcSignToggle.isNegative{color:#fff38a!important;border-color:rgba(255,227,112,.62)!important}.brus157Measure input{width:100%;min-height:55px;border-radius:15px;border:1px solid rgba(180,255,190,.30);background:rgba(4,16,36,.68);color:#fff;font:900 22px/1 system-ui;text-align:center;box-sizing:border-box;padding:8px}
#korekce-brusy .brus157Result{display:flex;flex-direction:column;gap:9px;min-height:0!important}.brus157Result:empty{display:none}.brus157ResultTitle{font-weight:950;font-size:14px;color:rgba(232,245,255,.82)}.brus157ResultSide{padding:11px;border-radius:15px;border:1px solid rgba(255,222,92,.30);background:rgba(42,29,3,.28)}.brus157ResultSide.isOk{border-color:rgba(118,255,120,.35);background:rgba(18,70,31,.22)}.brus157ResultTop{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.brus157ResultTop span{font-weight:850}.brus157ResultTop b{font-size:16px;color:#fff67c;text-align:right}.brus157ProgramCallout{margin-top:7px;padding:8px 9px;border-radius:11px;background:rgba(255,233,86,.12);border:1px solid rgba(255,233,86,.34);font-size:12px;color:#fff9c7}.brus157ProgramCallout strong{font-size:18px;color:#fff36b}.brus157Movement{font-weight:900;font-size:13px;margin-top:5px;color:#dff7ff}.brus157Meta,.brus157Foot{font-size:10px;line-height:1.4;color:rgba(232,245,255,.70);margin-top:4px}
.brus157AdminWarning{display:flex;flex-direction:column;gap:3px;padding:9px 10px;border-radius:12px;border:1px solid rgba(255,218,77,.42);background:rgba(86,52,0,.26)}.brus157AdminWarning b{font-size:12px;color:#fff38a}.brus157AdminWarning span,.brus157AdminProgramHint{font-size:10px;line-height:1.35;color:#fff4bf}.brus157AdminProgramHint{font-weight:800;margin-top:2px}
@media(max-width:390px){#korekce-brusy .brus157Kpo{grid-template-columns:1fr 1fr}.brus157Inputs{grid-template-columns:1fr 1fr}.brus157ResultTop{flex-direction:column}.brus157ResultTop b{text-align:left}}
`;
    document.head.appendChild(style);
  }

  document.addEventListener('click', (event) => {
    const choice = event.target && event.target.closest ? event.target.closest('#korekce-brusy .brus157Choice') : null;
    if (choice) {
      const group = choice.closest('.brus157ChoiceGroup');
      if (group) group.querySelectorAll('.brus157Choice').forEach((btn) => btn.classList.toggle('isActive', btn === choice));
      if (group && group.dataset.brus157Select === 'index') updateTargetSummary();
      const out = document.getElementById('brus157Result');
      if (out) out.innerHTML = '';
      return;
    }
    const evaluateButton = event.target && event.target.closest ? event.target.closest('#brus157Evaluate') : null;
    if (evaluateButton) {
      event.preventDefault();
      evaluate();
    }
  }, true);

  document.addEventListener('change', (event) => {
    const target = event.target;
    if (target && target.matches && target.matches('.adminBrusFhbCalibration [data-brus-fhb-cal-field="side"]')) refreshAdminProgramHint(target.closest('.adminBrusFhbCalibration'));
  }, true);

  const originalCalculate = window.calculateBrusFhbCorrection;
  if (typeof originalCalculate === 'function') {
    const wrapped = function calculateBrusFhbCorrectionCentered(machine, index, side, measured) {
      const safeMachine = MACHINES.includes(String(machine || '').toUpperCase()) ? String(machine).toUpperCase() : 'TBKR01';
      const safeSide = String(side || '').toLowerCase() === 'right' ? 'right' : 'left';
      const targets = kpoTargets();
      const safeIndex = targets[String(index || '').toUpperCase()] ? String(index).toUpperCase() : 'AD';
      const spec = targets[safeIndex][safeSide];
      const result = chooseCenterCorrection(num(measured), spec.target, spec.tolerance, currentRate(safeMachine, safeSide));
      return Object.assign({}, result, { measurementSide: safeSide, programSide: programSide(safeSide), target: spec.target, tolerance: spec.tolerance, strategy: 'center' });
    };
    wrapped.__v157 = true;
    wrapped.__original = originalCalculate;
    window.calculateBrusFhbCorrection = wrapped;
  }
  window.getBrusFhbProgramSideForMeasurement = programSide;

  installStyles();
  renderCalculatorUi();
  decorateAdmin();
  let observerScheduled = false;
  const observer = new MutationObserver((records) => {
    const relevant = Array.from(records || []).some((record) => {
      const target = record && record.target;
      try {
        if (target && target.nodeType === 1 && target.closest && target.closest('#korekce-brusy, #appMenuBody, .adminBrusFhbCalibration')) return true;
        return Array.from(record && record.addedNodes || []).some((node) => node && node.nodeType === 1 && (
          (node.matches && node.matches('#korekce-brusy, #appMenuBody, .adminBrusFhbCalibration, .brusFhbCalcRoot'))
          || !!(node.querySelector && node.querySelector('#korekce-brusy, #appMenuBody, .adminBrusFhbCalibration, .brusFhbCalcRoot'))
        ));
      } catch (err) { return false; }
    });
    if (!relevant || observerScheduled) return;
    observerScheduled = true;
    const run = () => {
      observerScheduled = false;
      renderCalculatorUi();
      decorateAdmin();
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    else setTimeout(run, 0);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
