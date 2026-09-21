// RaK 1.2 (1.155) – delegované klikací akce aplikace oddělené z app.js.
try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('app-actions.js', 'loaded', { source: 'dynamic-loader' }); } catch (err) {}

function installDelegatedAppActions() {
  if (window.__rotaceDelegatedAppActionsBound) return;
  window.__rotaceDelegatedAppActionsBound = true;

  const clickActions = {
    'show-food-kantyna': () => showFoodSchedule('kantyna'),
    'show-food-jidelna': () => showFoodSchedule('jidelna'),
    'page-soustruhy': () => showPage('soustruhy'),
    'page-frezky': () => showPage('frezky'),
    'page-brusy': () => showPage('brusy'),
    'page-pracka': () => showPage('pracka'),
    'page-korekce-soustruhy': () => showPage('korekce-soustruhy'),
    'set-lathe-axis-machine': (el) => setLatheAxisCorrectionMachine(el),
    'calc-lathe-axis-correction': () => calcLatheAxisCorrection(),
    'toggle-lathe-axis-sign': (el) => toggleLatheAxisInputSign(el),
    'toggle-frezky-correction-sign': (el) => toggleFrezkyCorrectionInputSign(el),
    'open-lathe-axis-help': () => openLatheAxisCorrectionHelp(),
    'page-korekce-frezky': () => showPage('korekce-frezky'),
    'page-korekce-brusy': () => showPage('korekce-brusy'),
    'page-kalkulacky': () => openKalkulacky(),
    'open-rotace-months': () => openRotaceMonths(),
    'open-rotace-stats': () => openRotaceStats(),
    'open-rotace-names': () => openRotaceNames(),
    'download-rotation-month-image': () => downloadSelectedRotationMonthImage(),
    'reset-soustruhy': () => resetSoustruhy(),
    'soustruh-mode': (el) => setSoustruhMode(String(el.dataset.soustruhMode || '')),
    'calc-soustruhy-lis': () => calcSoustruhyLis(),
    'soustruh126-start': (el) => {
      const start = parseInt(el.dataset.startsize || '', 10);
      if (Number.isFinite(start)) setSoustruh126Start(start);
    },
    'calc-soustruhy-126': () => calcSoustruhy126(),
    'calc-soustruhy-126-heat': () => calcSoustruhy126Heat(),
    'calc-soustruhy-106': () => calcSoustruhy106(),
    'calc-soustruhy-106-heat': () => calcSoustruhy106Heat(),
    'soustruh-combo-first': (el) => setSoustruhComboFirstType(String(el.dataset.comboFirst || 'lis')),
    'soustruh-combo-free': (el) => setSoustruhComboFreeType(String(el.dataset.comboFree || '126')),
    'soustruh-combo126-start': (el) => {
      const start = parseInt(el.dataset.comboStartsize || '', 10);
      if (Number.isFinite(start)) setSoustruhCombo126Start(start);
    },
    'calc-soustruhy-combo': () => calcSoustruhyCombo(),
    'calc-soustruhy-combo-heat': () => calcSoustruhyComboHeat(),
    'open-food-link': () => openExternalTile(typeof getRakExternalLinkUrl === 'function' ? getRakExternalLinkUrl('food') : (window.FOOD_MENU_URL || 'https://sa.gthcatering.cz/restaurant/c1/'), 'openFoodLink'),
    'open-eportal-link': () => openEportal(),
    'open-payroll-link': () => openPayroll(),
    'calc-f': () => calcF(),
    'calc-f-finish': () => calcFFinish(),
    'calc-frezky-fhb': () => calcFrezkyFhbCorrection(),
    'set-fhb-target-preset': (el) => setFhbTargetPreset(el),
    'open-frezky-correction-help': (el) => openFrezkyCorrectionHelp(String(el.dataset.helpType || '')),
    'calc-brusy': () => calcBrusy(),
    'calc-brusy-finish': () => calcBrusyFinish(),
    'calc-p': () => calcP(),
    'calc-p-finish': () => calcPFinish(),
    'set-machine': (el) => setMachine(String(el.dataset.machine || '')),
    'set-prog': (el) => setProg(String(el.dataset.prog || '')),
    'reset-fields': (el) => {
      const raw = String(el.dataset.resetFields || '');
      const resultRaw = String(el.dataset.resetResults || '');
      const fields = raw.split(',').map((s) => s.trim()).filter(Boolean);
      const results = resultRaw.split(',').map((s) => s.trim()).filter(Boolean);
      if (fields.length || results.length) resetFields(fields, results);
    },
    'calendar-open': () => openCalendarInRak()
  };

  try {
    window.__rakDelegatedAllowedActions = Object.freeze(Object.keys(clickActions));
    window.__rakDelegatedChangeActions = Object.freeze(['month-select']);
  } catch (err) {}

  document.addEventListener('click', (event) => {
    const target = event.target && typeof event.target.closest === 'function'
      ? event.target.closest('[data-action], [data-rak-open-calendar]')
      : null;
    if (!target) return;

    const direct = target.hasAttribute('data-rak-open-calendar') ? 'calendar-open' : String(target.getAttribute('data-action') || '').trim();
    const action = direct || '';
    const handler = clickActions[action];
    const allowed = typeof recordDelegatedActionGuard === 'function'
      ? recordDelegatedActionGuard(action, !!handler, 'click')
      : !!handler;
    if (!handler || !allowed) return;

    event.preventDefault();
    event.stopPropagation();
    handler(target);
  }, { passive: false });

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented) return;
    const key = event.key;
    if (key !== 'Enter' && key !== ' ') return;
    const target = event.target && typeof event.target.closest === 'function'
      ? event.target.closest('[data-action], [data-rak-open-calendar]')
      : null;
    if (!target) return;
    const tag = String(target.tagName || '').toUpperCase();
    if (tag === 'BUTTON' || tag === 'A' || tag === 'SELECT' || tag === 'INPUT') return;
    const action = target.hasAttribute('data-rak-open-calendar') ? 'calendar-open' : String(target.getAttribute('data-action') || '').trim();
    const handler = clickActions[action];
    const allowed = typeof recordDelegatedActionGuard === 'function'
      ? recordDelegatedActionGuard(action, !!handler, 'keydown')
      : !!handler;
    if (!handler || !allowed) return;
    event.preventDefault();
    handler(target);
  });

  document.addEventListener('input', (event) => {
    const target = event.target && typeof event.target.matches === 'function'
      ? event.target
      : null;
    if (!target) return;
    if (target.matches('input[data-lathe-axis-signed="1"]')) {
      if (typeof updateLatheAxisSignToggleForInput === 'function') updateLatheAxisSignToggleForInput(target);
      return;
    }
    if (target.matches('input[data-frezky-correction-signed="1"]')) {
      if (typeof updateFrezkyCorrectionSignToggleForInput === 'function') updateFrezkyCorrectionSignToggleForInput(target);
    }
  });

  document.addEventListener('change', (event) => {
    const target = event.target && typeof event.target.closest === 'function'
      ? event.target.closest('select[data-action="month-select"]')
      : null;
    if (!target) return;
    app.selectedMonth = target.value || null;
    if (target.value) {
      renderMonth(target.value);
    }
    renderRotace();
    setRotaceView('months');
  });
}
