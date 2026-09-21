// RaK 1.2 (1.155) – DOM/action registry audit.

(function setupRakDomActionRegistryAudit() {
  const started = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

  try {
    if (typeof window.rakMarkModuleReady === 'function') {
      window.rakMarkModuleReady('rak-dom-action-audit.js', 'loading', { source: 'index' });
    }
  } catch (err) {}

  const REQUIRED_NAV_ACTIONS = ['home', 'rotace', 'kalkulacky', 'menu'];
  const REQUIRED_CORE_ACTIONS = [
    'show-food-kantyna',
    'show-food-jidelna',
    'open-food-link',
    'open-eportal-link',
    'open-payroll-link',
    'page-soustruhy',
    'page-frezky',
    'page-brusy',
    'page-pracka',
    'page-korekce-soustruhy',
    'page-korekce-frezky',
    'page-korekce-brusy',
    'calc-soustruhy-combo',
    'calc-soustruhy-combo-heat',
    'calc-f',
    'calc-f-finish',
    'calc-frezky-fhb',
    'calc-brusy',
    'calc-brusy-finish',
    'calc-p',
    'calc-p-finish',
    'reset-fields',
    'calendar-open'
  ];
  const REQUIRED_CHANGE_ACTIONS = ['month-select'];

  const DOM_ACTION_SMOKE_REPORT = window.__RAK_DOM_ACTION_SMOKE_REPORT__ || (window.__RAK_DOM_ACTION_SMOKE_REPORT__ = {
    ok: null,
    status: 'not-run',
    mode: 'dom-action-smoke-report-v897',
    version: '1.2 (1.155)',
    checkedAt: null,
    lastStage: 'čeká na DOM/action kontrolu',
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    actionElementCount: 0,
    uniqueActionCount: 0,
    categoryCount: 0,
    targetCoveragePercent: 0,
    issueCount: 0,
    warningCount: 0,
    unknownActionCount: 0,
    missingTargetCount: 0,
    actionTargetIssueCount: 0,
    actionTargetWarningCount: 0,
    lastIssueSample: [],
    lastWarningSample: []
  });

  function getDomActionSmokeSnapshot() {
    return Object.assign({}, DOM_ACTION_SMOKE_REPORT, {
      version: String(window.APP_VERSION || DOM_ACTION_SMOKE_REPORT.version || 'unknown'),
      checkedAt: DOM_ACTION_SMOKE_REPORT.checkedAt || null,
      lastIssueSample: Array.isArray(DOM_ACTION_SMOKE_REPORT.lastIssueSample) ? DOM_ACTION_SMOKE_REPORT.lastIssueSample.slice(0, 8) : [],
      lastWarningSample: Array.isArray(DOM_ACTION_SMOKE_REPORT.lastWarningSample) ? DOM_ACTION_SMOKE_REPORT.lastWarningSample.slice(0, 8) : []
    });
  }

  function updateDomActionSmokeReportFromHealth(health, stage) {
    try {
      const ok = !!(health && health.ok);
      DOM_ACTION_SMOKE_REPORT.ok = ok;
      DOM_ACTION_SMOKE_REPORT.status = ok ? 'ok' : 'kontrola';
      DOM_ACTION_SMOKE_REPORT.mode = 'dom-action-smoke-report-v897';
      DOM_ACTION_SMOKE_REPORT.version = String(window.APP_VERSION || '1.2 (1.155)');
      DOM_ACTION_SMOKE_REPORT.checkedAt = new Date().toISOString();
      DOM_ACTION_SMOKE_REPORT.lastStage = String(stage || 'dom-action-health');
      DOM_ACTION_SMOKE_REPORT.runCount = Number(DOM_ACTION_SMOKE_REPORT.runCount || 0) + 1;
      DOM_ACTION_SMOKE_REPORT.successCount = Number(DOM_ACTION_SMOKE_REPORT.successCount || 0) + (ok ? 1 : 0);
      DOM_ACTION_SMOKE_REPORT.failureCount = Number(DOM_ACTION_SMOKE_REPORT.failureCount || 0) + (ok ? 0 : 1);
      DOM_ACTION_SMOKE_REPORT.actionElementCount = Number(health && health.actionElementCount || 0);
      DOM_ACTION_SMOKE_REPORT.uniqueActionCount = Number(health && health.uniqueActionCount || 0);
      DOM_ACTION_SMOKE_REPORT.categoryCount = Number(health && health.categoryCount || 0);
      DOM_ACTION_SMOKE_REPORT.targetCoveragePercent = Number(health && health.targetCoveragePercent || 0);
      DOM_ACTION_SMOKE_REPORT.issueCount = Number(health && health.issueCount || 0);
      DOM_ACTION_SMOKE_REPORT.warningCount = Number(health && health.warningCount || 0);
      DOM_ACTION_SMOKE_REPORT.unknownActionCount = Number(health && health.unknownActionCount || 0);
      DOM_ACTION_SMOKE_REPORT.missingTargetCount = Number(health && health.missingTargetCount || 0);
      DOM_ACTION_SMOKE_REPORT.actionTargetIssueCount = Number(health && health.actionTargetIssueCount || 0);
      DOM_ACTION_SMOKE_REPORT.actionTargetWarningCount = Number(health && health.actionTargetWarningCount || 0);
      DOM_ACTION_SMOKE_REPORT.lastIssueSample = Array.isArray(health && health.issues) ? health.issues.slice(0, 8) : [];
      DOM_ACTION_SMOKE_REPORT.lastWarningSample = Array.isArray(health && health.warnings) ? health.warnings.slice(0, 8) : [];
    } catch (err) {
      DOM_ACTION_SMOKE_REPORT.ok = false;
      DOM_ACTION_SMOKE_REPORT.status = 'error';
      DOM_ACTION_SMOKE_REPORT.checkedAt = new Date().toISOString();
      DOM_ACTION_SMOKE_REPORT.lastStage = 'smoke report update error';
      DOM_ACTION_SMOKE_REPORT.lastIssueSample = [String(err && err.message ? err.message : err)];
      DOM_ACTION_SMOKE_REPORT.failureCount = Number(DOM_ACTION_SMOKE_REPORT.failureCount || 0) + 1;
    }
    return getDomActionSmokeSnapshot();
  }

  const ACTION_CATEGORY_META = {
    navigation: { label: 'Navigace', risk: 'low' },
    dashboard: { label: 'Dashboard', risk: 'low' },
    external: { label: 'Externí odkazy', risk: 'medium' },
    calculators: { label: 'Kalkulačky', risk: 'medium' },
    corrections: { label: 'Korekce', risk: 'medium' },
    games: { label: 'Hry', risk: 'medium' },
    rotationStats: { label: 'Rotace/statistiky', risk: 'medium' },
    settingsDiagnostics: { label: 'Nastavení/diagnostika', risk: 'low' },
    other: { label: 'Ostatní', risk: 'unknown' }
  };


  const ACTION_TARGET_META = {
    home: { category: 'navigation', required: ['data-page'], severity: 'issue', note: 'spodní navigace musí znát cílovou stránku' },
    rotace: { category: 'navigation', required: ['data-page'], severity: 'issue', note: 'spodní navigace musí znát cílovou stránku' },
    kalkulacky: { category: 'navigation', required: ['data-page'], severity: 'issue', note: 'spodní navigace musí znát cílovou stránku' },
    'open-rotace-months': { category: 'navigation', required: [], severity: 'info', note: 'rychlý proklik z Rotace na Rozpisy' },
    'download-rotation-month-image': { category: 'rotationStats', required: [], severity: 'info', note: 'stažení čistého PNG rozpisu vybraného měsíce' },
    'open-rotace-stats': { category: 'navigation', required: [], severity: 'info', note: 'rychlý proklik z Rotace na Statistiky' },
    games: { category: 'navigation', required: ['data-page'], severity: 'issue', note: 'spodní navigace musí znát cílovou stránku' },
    menu: { category: 'navigation', required: ['data-page'], severity: 'issue', note: 'spodní navigace musí znát cílovou stránku' },
    'open-game': { category: 'games', required: ['data-game'], severity: 'issue', note: 'spouštění hry musí znát game id' },
    'set-machine': { category: 'calculators', required: ['data-machine'], severity: 'issue', note: 'volba brusu/stroje musí znát data-machine' },
    'set-prog': { category: 'calculators', required: ['data-prog'], severity: 'issue', note: 'volba indexu musí znát data-prog' },
    'soustruh-mode': { category: 'calculators', required: ['data-soustruh-mode'], severity: 'issue', note: 'volba režimu soustruhu musí znát data-soustruh-mode' },
    'soustruh126-start': { category: 'calculators', required: ['data-startsize'], severity: 'issue', note: 'volba start průměru musí znát data-startsize' },
    'soustruh-combo-first': { category: 'calculators', required: ['data-combo-first'], severity: 'issue', note: 'combo první režim musí znát data-combo-first' },
    'soustruh-combo-free': { category: 'calculators', required: ['data-combo-free'], severity: 'issue', note: 'combo volný režim musí znát data-combo-free' },
    'soustruh-combo126-start': { category: 'calculators', required: ['data-combo-startsize'], severity: 'issue', note: 'combo 126 start musí znát data-combo-startsize' },
    'set-lathe-axis-machine': { category: 'corrections', required: ['data-lathe-axis-machine'], severity: 'issue', note: 'korekce vrtáků musí znát zvolený stroj' },
    'toggle-lathe-axis-sign': { category: 'corrections', required: ['data-target-input'], severity: 'issue', note: 'přepínač znaménka musí znát cílové input pole' },
    'toggle-frezky-correction-sign': { category: 'corrections', required: ['data-target-input'], severity: 'issue', note: 'přepínač znaménka frézek musí znát cílové input pole' },
    'set-fhb-target-preset': { category: 'corrections', required: ['data-fhb-key', 'data-fhb-left', 'data-fhb-right'], optional: ['data-fhb-label'], severity: 'issue', note: 'fhβ preset musí znát klíč a cílové hodnoty' },
    'open-frezky-correction-help': { category: 'corrections', required: ['data-help-type'], severity: 'issue', note: 'nápověda frézek musí znát typ obrázku' },
    'month-select': { category: 'rotationStats', required: [], severity: 'warning', note: 'select má cílový měsíc přímo v options' },
    'reset-fields': { category: 'calculators', requiredAny: [['data-reset-fields'], ['data-reset-results']], severity: 'warning', note: 'reset může být kontextový, ale explicitní targety jsou bezpečnější' },
    'open-food-link': { category: 'external', requiredAny: [['href'], ['data-url']], severity: 'warning', note: 'externí odkaz by měl mít href nebo data-url' },
    'open-eportal-link': { category: 'external', requiredAny: [['href'], ['data-url']], severity: 'warning', note: 'externí odkaz by měl mít href nebo data-url' },
    'open-payroll-link': { category: 'external', requiredAny: [['href'], ['data-url']], severity: 'warning', note: 'externí odkaz by měl mít href nebo data-url' },
    'calendar-open': { category: 'dashboard', required: [], severity: 'warning', note: 'kalendář používá data-rak-open-calendar marker' }
  };

  function toArray(value) {
    try { return Array.isArray(value) ? value.slice() : Array.from(value || []); }
    catch (err) { return []; }
  }

  function unique(list) {
    return Array.from(new Set((Array.isArray(list) ? list : []).filter(Boolean)));
  }

  function safeSelectorValue(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
      if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(raw);
    } catch (err) {}
    return raw.replace(/"/g, '\\"');
  }

  function getActionFromNode(node) {
    try {
      if (node && node.hasAttribute && node.hasAttribute('data-rak-open-calendar')) return 'calendar-open';
      return String(node && node.getAttribute ? (node.getAttribute('data-action') || '') : '').trim();
    } catch (err) {
      return '';
    }
  }

  function describeNode(node) {
    try {
      const tag = String(node && node.tagName || 'node').toLowerCase();
      const id = String(node && node.id || '').trim();
      const cls = String(node && node.className || '').trim().replace(/\s+/g, '.');
      const action = getActionFromNode(node);
      return tag + (id ? '#' + id : '') + (cls ? '.' + cls.slice(0, 80) : '') + (action ? '[' + action + ']' : '');
    } catch (err) {
      return 'node';
    }
  }


  function readAttr(node, attr) {
    try {
      if (!node || !node.getAttribute || !attr) return '';
      if (attr === 'href') return String(node.getAttribute('href') || '').trim();
      return String(node.getAttribute(attr) || '').trim();
    } catch (err) {
      return '';
    }
  }

  function getActionTargetMeta(action) {
    const rawAction = String(action || '').trim();
    if (ACTION_TARGET_META[rawAction]) return ACTION_TARGET_META[rawAction];
    if (/^page-/.test(rawAction)) return { category: 'navigation', required: [], severity: 'warning', note: 'page akce cílí podle názvu akce' };
    if (/^calc-/.test(rawAction)) return { category: 'calculators', required: [], severity: 'warning', note: 'výpočetní akce používá pevný handler podle názvu' };
    if (/^game-/.test(rawAction)) return { category: 'games', required: [], severity: 'warning', note: 'herní akce používá pevný handler podle názvu' };
    return null;
  }

  function evaluateActionTargets(node, action, category) {
    const meta = getActionTargetMeta(action);
    const present = [];
    const missing = [];
    const optionalPresent = [];
    const checks = [];
    if (node && node.attributes) {
      try {
        Array.from(node.attributes).forEach((attr) => {
          const name = String(attr && attr.name || '').trim();
          if (/^data-|^href$|^target$|^rel$/.test(name)) present.push(name);
        });
      } catch (err) {}
    }
    if (!meta) {
      return {
        action: String(action || ''),
        category,
        hasMeta: false,
        severity: 'warning',
        required: [],
        optional: [],
        present: unique(present).sort(),
        missing: [],
        ok: true,
        note: 'bez explicitní target mapy'
      };
    }
    (meta.required || []).forEach((attr) => {
      checks.push(attr);
      if (!readAttr(node, attr)) missing.push(attr);
    });
    (meta.requiredAny || []).forEach((group) => {
      const attrs = Array.isArray(group) ? group : [group];
      checks.push(attrs.join('|'));
      if (!attrs.some((attr) => !!readAttr(node, attr))) missing.push(attrs.join(' nebo '));
    });
    (meta.optional || []).forEach((attr) => {
      if (readAttr(node, attr)) optionalPresent.push(attr);
    });
    const required = [].concat(meta.required || [], (meta.requiredAny || []).map((group) => (Array.isArray(group) ? group.join('|') : String(group))));
    return {
      action: String(action || ''),
      category: String(meta.category || category || 'other'),
      hasMeta: true,
      severity: String(meta.severity || 'warning'),
      required,
      optional: Array.isArray(meta.optional) ? meta.optional.slice() : [],
      present: unique(present).sort(),
      optionalPresent: unique(optionalPresent).sort(),
      missing: unique(missing),
      ok: missing.length === 0,
      note: String(meta.note || ''),
      checkCount: checks.length
    };
  }

  function getActionCategory(node, action) {
    const rawAction = String(action || '').trim();
    const tag = String(node && node.tagName || '').toUpperCase();
    const id = String(node && node.id || '').trim();
    const href = String(node && node.getAttribute ? (node.getAttribute('href') || '') : '').trim();
    const page = String(node && node.getAttribute ? (node.getAttribute('data-page') || '') : '').trim();
    const game = String(node && node.getAttribute ? (node.getAttribute('data-game') || '') : '').trim();

    try {
      if (node && node.closest && node.closest('.bottomNav')) return 'navigation';
      if (node && node.closest && node.closest('#games, .gamesGrid, .gamesLaunchTile')) return 'games';
      if (node && node.closest && node.closest('#korekce-soustruhy, #korekce-frezky, #korekce-brusy')) return 'corrections';
      if (node && node.closest && node.closest('#soustruhy, #frezky, #brusy, #pracka, #kalkulacky')) return 'calculators';
      if (node && node.closest && node.closest('#rotace, #statistiky, .statsPanel')) return 'rotationStats';
      if (node && node.closest && node.closest('#menu, .appMenuPage, .appMenuCard')) return 'settingsDiagnostics';
      if (node && node.closest && node.closest('#home, .dashboardGrid, .dashboardCard')) return /^https?:\/\//i.test(href) ? 'external' : 'dashboard';
    } catch (err) {}

    if (rawAction === 'calendar-open') return 'dashboard';
    if (REQUIRED_NAV_ACTIONS.includes(rawAction) || page || /^page-/.test(rawAction)) return 'navigation';
    if (rawAction === 'open-game' || game || /^game-/.test(rawAction)) return 'games';
    if (/^(open-food-link|open-eportal-link|open-payroll-link)$/.test(rawAction) || (tag === 'A' && /^https?:\/\//i.test(href))) return 'external';
    if (/^(show-food-kantyna|show-food-jidelna)$/.test(rawAction)) return 'dashboard';
    if (/^(month-select|rotace|statistiky)$/.test(rawAction)) return 'rotationStats';
    if (/correction|korekce|fhb|lathe-axis|frezky-correction/.test(rawAction)) return 'corrections';
    if (/^(calc-|soustruh-|set-machine|set-prog|reset-fields|set-fhb-target-preset)/.test(rawAction)) return 'calculators';
    if (/menu|diagnostic|diagnost|settings|theme|background|profile|supabase-heartbeat/.test(rawAction)) return 'settingsDiagnostics';
    return 'other';
  }

  function makeCategoryBucket() {
    const out = {};
    Object.keys(ACTION_CATEGORY_META).forEach((id) => {
      out[id] = { id, label: ACTION_CATEGORY_META[id].label, risk: ACTION_CATEGORY_META[id].risk, count: 0, uniqueActions: [], samples: [] };
    });
    return out;
  }

  function getAllowedActions() {
    const delegated = unique(toArray(window.__rakDelegatedAllowedActions));
    const change = unique(toArray(window.__rakDelegatedChangeActions));
    const nav = REQUIRED_NAV_ACTIONS.slice();
    return { delegated, change, nav };
  }

  function collectDomActionRegistryHealth() {
    const issues = [];
    const warnings = [];
    let nodes = [];
    let bottomNavNodes = [];
    let selectNodes = [];
    const allowed = getAllowedActions();
    const delegatedSet = new Set(allowed.delegated);
    const changeSet = new Set(allowed.change.length ? allowed.change : REQUIRED_CHANGE_ACTIONS);
    const navSet = new Set(allowed.nav);
    const seen = new Map();
    const unknownActions = [];
    const missingTargets = [];
    const duplicateActions = [];
    const requiredMissing = [];
    const emptyActions = [];
    const linkWarnings = [];
    const categoryBuckets = makeCategoryBucket();
    const categorySeenActions = new Map();
    const uncategorizedActions = [];
    const targetMatrix = new Map();
    const targetWarnings = [];
    const targetIssues = [];
    const targetMissingByCategory = new Map();

    try {
      nodes = Array.from(document.querySelectorAll('[data-action], [data-rak-open-calendar]') || []);
      bottomNavNodes = Array.from(document.querySelectorAll('.bottomNav [data-action]') || []);
      selectNodes = Array.from(document.querySelectorAll('select[data-action]') || []);
    } catch (err) {
      issues.push('DOM action inventory unavailable: ' + String(err && err.message ? err.message : err));
      nodes = [];
    }

    nodes.forEach((node) => {
      const action = getActionFromNode(node);
      if (!action) emptyActions.push(describeNode(node));
      const tag = String(node && node.tagName || '').toUpperCase();
      const isBottomNav = !!(node && node.closest && node.closest('.bottomNav'));
      const isSelect = tag === 'SELECT';
      const allowedHere = isBottomNav ? navSet.has(action) : (isSelect ? changeSet.has(action) : delegatedSet.has(action));
      if (action && !allowedHere) unknownActions.push(action + ' @ ' + describeNode(node));
      if (action) {
        const arr = seen.get(action) || [];
        arr.push(describeNode(node));
        seen.set(action, arr);
      }

      const category = getActionCategory(node, action);
      const bucket = categoryBuckets[category] || categoryBuckets.other;
      bucket.count += 1;
      if (bucket.samples.length < 5) bucket.samples.push(describeNode(node));
      if (action) {
        const categoryActions = categorySeenActions.get(category) || new Set();
        categoryActions.add(action);
        categorySeenActions.set(category, categoryActions);
      }
      if (category === 'other' && action) uncategorizedActions.push(action + ' @ ' + describeNode(node));

      if (action) {
        const targetReport = evaluateActionTargets(node, action, category);
        const targetKey = action;
        const current = targetMatrix.get(targetKey) || {
          action: targetKey,
          category: targetReport.category || category,
          elementCount: 0,
          hasMeta: !!targetReport.hasMeta,
          severity: targetReport.severity || 'warning',
          required: targetReport.required || [],
          optional: targetReport.optional || [],
          presentAttributes: new Set(),
          missingAttributes: new Set(),
          samples: [],
          okCount: 0,
          issueCount: 0,
          warningCount: 0,
          note: targetReport.note || ''
        };
        current.elementCount += 1;
        current.hasMeta = current.hasMeta || !!targetReport.hasMeta;
        current.required = unique([].concat(current.required || [], targetReport.required || []));
        current.optional = unique([].concat(current.optional || [], targetReport.optional || []));
        (targetReport.present || []).forEach((attr) => current.presentAttributes.add(attr));
        if (current.samples.length < 4) current.samples.push(describeNode(node));
        if (targetReport.ok) current.okCount += 1;
        else {
          (targetReport.missing || []).forEach((attr) => current.missingAttributes.add(attr));
          const label = action + ' ' + targetReport.missing.join(', ') + ' @ ' + describeNode(node);
          if (targetReport.severity === 'issue') {
            current.issueCount += 1;
            targetIssues.push(label);
          } else {
            current.warningCount += 1;
            targetWarnings.push(label);
          }
          const missCat = targetMissingByCategory.get(targetReport.category || category) || new Set();
          (targetReport.missing || []).forEach((attr) => missCat.add(action + ':' + attr));
          targetMissingByCategory.set(targetReport.category || category, missCat);
        }
        targetMatrix.set(targetKey, current);
      }

      if (action === 'set-machine' && !String(node.getAttribute('data-machine') || '').trim()) missingTargets.push('set-machine data-machine');
      if (action === 'set-prog' && !String(node.getAttribute('data-prog') || '').trim()) missingTargets.push('set-prog data-prog');
      if (action === 'set-lathe-axis-machine' && !String(node.getAttribute('data-lathe-axis-machine') || '').trim()) missingTargets.push('set-lathe-axis-machine data-lathe-axis-machine');
      if (action === 'toggle-lathe-axis-sign' && !String(node.getAttribute('data-target-input') || '').trim()) missingTargets.push('toggle-lathe-axis-sign data-target-input');
      if (action === 'toggle-frezky-correction-sign' && !String(node.getAttribute('data-target-input') || '').trim()) missingTargets.push('toggle-frezky-correction-sign data-target-input');
      if (action === 'set-fhb-target-preset') {
        if (!String(node.getAttribute('data-fhb-key') || '').trim()) missingTargets.push('set-fhb-target-preset data-fhb-key');
        if (!String(node.getAttribute('data-fhb-left') || '').trim()) missingTargets.push('set-fhb-target-preset data-fhb-left');
        if (!String(node.getAttribute('data-fhb-right') || '').trim()) missingTargets.push('set-fhb-target-preset data-fhb-right');
      }
      if (action === 'open-frezky-correction-help' && !String(node.getAttribute('data-help-type') || '').trim()) missingTargets.push('open-frezky-correction-help data-help-type');
      if (action === 'open-game' && !String(node.getAttribute('data-game') || '').trim()) missingTargets.push('open-game data-game');
      if (action === 'reset-fields') {
        const fields = String(node.getAttribute('data-reset-fields') || '').trim();
        const results = String(node.getAttribute('data-reset-results') || '').trim();
        if (!fields && !results) targetWarnings.push('reset-fields data-reset-fields/data-reset-results @ ' + describeNode(node));
      }
      if (tag === 'A') {
        const href = String(node.getAttribute('href') || '').trim();
        const rel = String(node.getAttribute('rel') || '').trim();
        const target = String(node.getAttribute('target') || '').trim();
        if (/^https?:\/\//i.test(href) && target === '_blank' && !/noopener/.test(rel)) linkWarnings.push(action || href);
      }
    });

    REQUIRED_CORE_ACTIONS.forEach((action) => {
      if (action === 'calendar-open') {
        if (!document.querySelector('[data-rak-open-calendar]')) requiredMissing.push(action);
      } else if (!document.querySelector('[data-action="' + safeSelectorValue(action) + '"]')) {
        requiredMissing.push(action);
      }
    });
    REQUIRED_NAV_ACTIONS.forEach((action) => {
      if (!document.querySelector('.bottomNav [data-action="' + safeSelectorValue(action) + '"]')) requiredMissing.push('nav:' + action);
    });

    seen.forEach((items, action) => {
      if (items.length > 1 && !['reset-fields', 'open-game', 'set-machine', 'set-prog', 'set-fhb-target-preset', 'set-lathe-axis-machine', 'toggle-lathe-axis-sign', 'toggle-frezky-correction-sign'].includes(action)) {
        duplicateActions.push(action + ' ×' + items.length);
      }
    });

    if (!allowed.delegated.length) warnings.push('delegated action allowlist not visible yet');
    if (emptyActions.length) issues.push('empty data-action: ' + emptyActions.slice(0, 4).join(', '));
    if (unknownActions.length) issues.push('unknown actions: ' + unknownActions.slice(0, 6).join(', '));
    if (missingTargets.length) issues.push('missing action data targets: ' + unique(missingTargets).slice(0, 6).join(', '));
    if (targetIssues.length) issues.push('target attribute map issues: ' + unique(targetIssues).slice(0, 6).join(', '));
    if (targetWarnings.length) warnings.push('target attribute map warnings: ' + unique(targetWarnings).slice(0, 6).join(', '));
    if (requiredMissing.length) warnings.push('required actions not visible on current DOM/page: ' + requiredMissing.slice(0, 8).join(', '));
    if (linkWarnings.length) warnings.push('external links missing noopener: ' + unique(linkWarnings).slice(0, 4).join(', '));
    if (uncategorizedActions.length) warnings.push('uncategorized actions: ' + unique(uncategorizedActions).slice(0, 4).join(', '));

    const categorySummary = Object.keys(categoryBuckets).map((id) => {
      const bucket = categoryBuckets[id];
      const actionSet = categorySeenActions.get(id);
      bucket.uniqueActions = actionSet ? Array.from(actionSet).sort() : [];
      return {
        id: bucket.id,
        label: bucket.label,
        risk: bucket.risk,
        count: bucket.count,
        uniqueActionCount: bucket.uniqueActions.length,
        samples: bucket.samples.slice(0, 5),
        actions: bucket.uniqueActions.slice(0, 24)
      };
    }).filter((item) => item.count || item.uniqueActionCount);
    const actionCategoryCounts = categorySummary.reduce((acc, item) => {
      acc[item.id] = item.count;
      return acc;
    }, {});
    const actionTargetMatrix = Array.from(targetMatrix.values()).map((item) => ({
      action: item.action,
      category: item.category,
      elementCount: item.elementCount,
      hasMeta: !!item.hasMeta,
      severity: item.severity,
      required: item.required || [],
      optional: item.optional || [],
      presentAttributes: Array.from(item.presentAttributes || []).sort(),
      missingAttributes: Array.from(item.missingAttributes || []).sort(),
      okCount: item.okCount || 0,
      issueCount: item.issueCount || 0,
      warningCount: item.warningCount || 0,
      samples: item.samples || [],
      note: item.note || ''
    })).sort((a, b) => String(a.category + ':' + a.action).localeCompare(String(b.category + ':' + b.action)));
    const targetAttributeCategorySummary = Array.from(targetMissingByCategory.entries()).map(([category, values]) => ({
      category,
      missingCount: values ? values.size : 0,
      missing: values ? Array.from(values).sort().slice(0, 24) : []
    })).sort((a, b) => String(a.category).localeCompare(String(b.category)));
    const targetMetaActionCount = Object.keys(ACTION_TARGET_META).length;
    const targetMappedActionCount = actionTargetMatrix.filter((item) => item.hasMeta).length;
    const targetUnmappedActionCount = actionTargetMatrix.filter((item) => !item.hasMeta).length;
    const targetCoveragePercent = actionTargetMatrix.length ? Math.round((targetMappedActionCount / actionTargetMatrix.length) * 100) : 100;

    const health = {
      ok: issues.length === 0,
      mode: 'dom-action-registry-audit-closure-v897',
      version: String(window.APP_VERSION || 'unknown'),
      checkedAt: new Date().toISOString(),
      issueCount: issues.length,
      warningCount: warnings.length,
      issues: issues.slice(0, 12),
      warnings: warnings.slice(0, 12),
      actionElementCount: nodes.length,
      uniqueActionCount: seen.size,
      bottomNavActionCount: bottomNavNodes.length,
      selectActionCount: selectNodes.length,
      delegatedAllowedCount: allowed.delegated.length,
      navAllowedCount: allowed.nav.length,
      changeAllowedCount: allowed.change.length || REQUIRED_CHANGE_ACTIONS.length,
      unknownActionCount: unknownActions.length,
      missingTargetCount: unique(missingTargets).length,
      emptyActionCount: emptyActions.length,
      requiredMissingCount: requiredMissing.length,
      duplicateActionCount: duplicateActions.length,
      categoryCount: categorySummary.length,
      actionCategoryCounts,
      categorySummary,
      targetMetaActionCount,
      targetMappedActionCount,
      targetUnmappedActionCount,
      targetCoveragePercent,
      actionTargetIssueCount: unique(targetIssues).length,
      actionTargetWarningCount: unique(targetWarnings).length,
      actionTargetMatrix: actionTargetMatrix.slice(0, 80),
      targetAttributeCategorySummary,
      targetAttributeRule: 'v897 uzavírá read-only DOM/action registry audit; cílové atributy jsou jen diagnostická mapa pro bezpečný budoucí refactor handlerů.',
      uncategorizedActionCount: unique(uncategorizedActions).length,
      uncategorizedActions: unique(uncategorizedActions).slice(0, 16),
      unknownActions: unknownActions.slice(0, 16),
      missingTargets: unique(missingTargets).slice(0, 16),
      requiredMissing: requiredMissing.slice(0, 16),
      duplicateActions: duplicateActions.slice(0, 16),
      commonActions: Array.from(seen.keys()).sort().slice(0, 48),
      smokeReportStatus: String(DOM_ACTION_SMOKE_REPORT.status || 'not-run'),
      smokeReportRunCount: Number(DOM_ACTION_SMOKE_REPORT.runCount || 0),
      phase: 'phase E DOM/action registry audit closure',
      phasePercent: 100,
      phaseClosed: true,
      releaseReadinessLinked: true,
      nextStep: 'DOM/action registry audit je uzavřený; další bezpečný směr je jen případné read-only sledování bez přepojení handlerů.',
      rule: 'Read-only audit jen mapuje data-action DOM, allowlisty, kategorie a cílové atributy akcí; navigace, render, hry ani online flow se nepřepojují.'
    };
    updateDomActionSmokeReportFromHealth(health, 'dom-action-registry-health');
    return health;
  }

  window.getRakDomActionRegistryHealth = collectDomActionRegistryHealth;
  window.getRakDomActionSmokeReport = getDomActionSmokeSnapshot;
  window.runRakDomActionSmokeReport = function runRakDomActionSmokeReport() {
    const health = collectDomActionRegistryHealth();
    return updateDomActionSmokeReportFromHealth(health, 'manual-dom-action-smoke');
  };

  window.getRakDomActionRegistryClosureHealth = function getRakDomActionRegistryClosureHealth() {
    const health = collectDomActionRegistryHealth();
    return {
      ok: !!(health && health.ok),
      mode: 'dom-action-registry-closure-v897',
      version: String(window.APP_VERSION || 'unknown'),
      checkedAt: new Date().toISOString(),
      phase: 'phase E DOM/action registry audit closure',
      phasePercent: 100,
      phaseClosed: true,
      actionElementCount: Number(health && health.actionElementCount || 0),
      uniqueActionCount: Number(health && health.uniqueActionCount || 0),
      categoryCount: Number(health && health.categoryCount || 0),
      targetCoveragePercent: Number(health && health.targetCoveragePercent || 0),
      issueCount: Number(health && health.issueCount || 0),
      warningCount: Number(health && health.warningCount || 0),
      smokeReportStatus: String(health && health.smokeReportStatus || 'not-run'),
      rule: 'Closure helper jen shrnuje read-only audit; žádné DOM handlery nepřepojuje.'
    };
  };

  try {
    const ended = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (typeof window.rakMarkModuleReady === 'function') {
      window.rakMarkModuleReady('rak-dom-action-audit.js', 'loaded', { source: 'index', durationMs: Math.max(0, Math.round(ended - started)) });
    }
  } catch (err) {}
})();
