// RaK 1.2 (1.155) – AppSec/privacy read-only audit.
(function setupRakAppSecPrivacyAudit() {
  try {
    if (typeof window.rakMarkModuleReady === 'function') {
      window.rakMarkModuleReady('rak-appsec-privacy-audit.js', 'loading', { source: 'index' });
    }
  } catch (err) {}

  const startedAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  const VERSION = '1.2 (1.155)';
  const MODE = 'appsec-privacy-client-surface-readonly-v923';
  const sensitiveKeyPattern = /(password|passwd|secret|token|bearer|jwt|private|admin|role|auth|session|cookie|api[_-]?key|service[_-]?role)/i;

  const STORAGE_CLASSIFICATION_RULES = [
    { id: 'storage-app-state', match: /^rotace_kalkulacky_state_v123$/, category: 'app-state', priority: 'P2-review', sensitivity: 'possible-work-state', action: 'Ponechat; mazat jen ručním resetem celé aplikace.' },
    { id: 'storage-ui-prefs', match: /^rotace_kalkulacky_state_v123:(uiPrefs|theme_v1|background_v1|devicePerformanceProbe|snake_joystick_v1)$/, category: 'ui-preferences', priority: 'P3', sensitivity: 'low', action: 'Ponechat; nejde o oprávnění.' },
    { id: 'storage-game-profile', match: /^rotace_kalkulacky_state_v123:(games_profile_v1|games_score_reset_v\d+)$/, category: 'game-profile-score', priority: 'P2-review', sensitivity: 'name-score-profile', action: 'Mazat jen přes explicitní reset herních výsledků.' },
    { id: 'storage-user-report', match: /^rotace_kalkulacky_state_v123:userReports$/, category: 'user-report-draft', priority: 'P1-review', sensitivity: 'user-provided-text', action: 'Nemaž automaticky; v UI jasně držet jako lokální návrh/report.' },
    { id: 'storage-supabase-cache', match: /^rotace_supabase_(local_state_v1|queue_v1|announcements_v1|machine_settings_v1|game_accounts_v1|game_stats_v856:|game_ui_settings_v1:|game_sessions_v856:|gomoku_wins_v1)/, category: 'supabase-offline-cache', priority: 'P1-review', sensitivity: 'sync-cache', action: 'Nečistit automaticky; držet TTL/ruční guard a nikdy nepoužívat jako autoritu.' },
    { id: 'storage-supabase-smoke', match: /^rak_(game_stats_rpc_smoke_v1|game_ui_rpc_smoke_v1|game_session_rpc_smoke_v2|supabase_keepalive_v1|supabase_keepalive_device_v1)$/, category: 'supabase-diagnostics', priority: 'P2-review', sensitivity: 'diagnostic-device-id', action: 'Ponechat; hodnoty neukazovat uživatelům jako citlivá data.' },
    { id: 'storage-ttt-diag', match: /^(tttHardWins|tttHardWinName|rotace_ttt_online_results_v1|rotace_ttt_online_join_diag_v1)$/, category: 'ttt-score-diagnostics', priority: 'P2-review', sensitivity: 'name-score-diagnostics', action: 'Mazat jen resetem herních výsledků nebo explicitní diagnostikou.' },
    { id: 'storage-app-diagnostics', match: /^(rotace_err_log_v1|rotace_live_signal_v1|rotace_sw_update_(notice|pending|suppress)_v1|rotationBuild|machine|prog)$/, category: 'app-diagnostics-state', priority: 'P3', sensitivity: 'low-runtime-state', action: 'Ponechat; neobsahuje oprávnění.' },
    { id: 'storage-admin-legacy-local', match: /^adminUnlocked$/, category: 'legacy-admin-local', priority: 'P1-review', sensitivity: 'authorization-like-flag', action: 'Musí být jen historický cleanup marker; app-init ho při startu odstraňuje.' },
    { id: 'storage-admin-session', match: /^adminUnlockedSession$/, category: 'session-admin-gate', priority: 'P1-review', sensitivity: 'session-only-authorization-like-flag', action: 'Držet jen v sessionStorage; nikdy nepersistovat do localStorage.' }
  ];

  STORAGE_CLASSIFICATION_RULES.push({
    id: 'storage-admin-pin-session',
    match: /^adminPinSession$/,
    category: 'session-admin-secret',
    priority: 'P0',
    sensitivity: 'session-only-admin-secret',
    action: 'Drzet jen v sessionStorage pro DB overeni; nikdy nepersistovat do localStorage ani nezobrazovat v UI.'
  });

  const STATIC_DOM_SINK_INVENTORY = [
    { file: 'games-arcade.js', sink: 'innerHTML', count: 38, priority: 'P2-review', note: 'Herní šablony; přednostně hlídat escapeHtml u dynamických hodnot.' },
    { file: 'ui.js', sink: 'innerHTML', count: 33, priority: 'P2-review', note: 'Hlavní UI render; postupně převádět nové dynamické části na safe helpery.' },
    { file: 'games-arcade.js', sink: 'insertAdjacentHTML', count: 19, priority: 'P2-review', note: 'Interní šablony her; neměnit hromadně bez DOM regression testu.' },
    { file: 'qr.js', sink: 'innerHTML', count: 7, priority: 'P2-review', note: 'QR/modal výstupy; ověřovat escape u proměnných.' },
    { file: 'stats.js', sink: 'innerHTML', count: 5, priority: 'P2-review', note: 'Statistiky a grafy; uživatelské texty musí být escapované.' },
    { file: 'soustruhy.js', sink: 'innerHTML', count: 5, priority: 'P2-review', note: 'Korekční panely; pozor na stroj/label hodnoty.' },
    { file: 'core.js', sink: 'innerHTML', count: 3, priority: 'P2-review', note: 'Sdílené DOM helpery; držet jako preferovanou auditní bránu.' },
    { file: 'dashboard.js', sink: 'innerHTML', count: 2, priority: 'P2-review', note: 'Dashboard render; externí URL držet allowlistem.' },
    { file: 'app-init.js', sink: 'innerHTML', count: 1, priority: 'P3', note: 'Inicializační render měsíce.' },
    { file: 'rotace.js', sink: 'innerHTML', count: 1, priority: 'P2-review', note: 'Rozpisy/rotace; dynamiku escapovat.' },
    { file: 'export.js', sink: 'outerHTML', count: 1, priority: 'P2-review', note: 'Export HTML snapshotu; jen pro export, ne runtime injection.' },
    { file: 'core.js', sink: 'setAttribute(href/src)', count: 1, priority: 'P2-review', note: 'URL zápis držet přes safe URL helper/allowlist.' },
    { file: 'ui.js', sink: 'window.open', count: 1, priority: 'P3', note: 'Používá noopener,noreferrer; kontrolovat target URL allowlist.' }
  ];

  const CSP_REPORT_ONLY_PLAN = {
    mode: 'report-only-first',
    enforceNow: false,
    reason: 'Aplikace má inline onload/onerror handlery pro externí dependency a více šablonových renderů; vynucená CSP by se nejdřív testovala jako report-only.',
    proposedHeader: "Content-Security-Policy-Report-Only: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; img-src 'self' data: blob:; font-src 'self' https://fonts.gstatic.com data:; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; report-to rak-csp-report;",
    rolloutSteps: [
      'Nejdřív report-only header na hostingu/stagingu, bez změny aplikace.',
      'Nasbírat reporty pro CDN, Supabase REST/realtime a Google Fonts.',
      'Přesunout inline onload/onerror handlery do lokálního JS, nebo je výslovně povolit jen dočasně.',
      'U CDN knihoven zvolit buď lokální vendor kopie v assets/vendor, nebo pin + SRI smoke test.',
      'Až potom vynucená CSP jako samostatný build s rollbackem.'
    ],
    sriCandidates: [
      { id: 'xlsx', source: 'cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js', current: 'floating package path', safestNextStep: 'pin exact verze nebo lokální assets/vendor kopie; otestovat import/export Excelu' },
      { id: 'jszip', source: 'cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js', current: 'pinned minor asset path without SRI', safestNextStep: 'doplnit SRI nebo lokální assets/vendor kopie; otestovat export ZIPu' },
      { id: 'supabase-js', source: 'vendor/supabase-2.110.7.js', current: 'self-hosted exact 2.110.7 with build-time SHA-384 verification', safestNextStep: 'držet přesný pin, hash a offline precache gate; otestovat realtime a reconnect bez reloadu' },
      { id: 'google-fonts', source: 'fonts.googleapis.com/fonts.gstatic.com', current: 'external stylesheet/font', safestNextStep: 'ponechat s CSP allowlistem nebo lokální font fallback; SRI u dynamických Google Fonts není vhodný hlavní krok' }
    ]
  };

  function safeString(value, fallback = '') {
    try {
      const str = String(value ?? '').trim();
      return str || fallback;
    } catch (err) {
      return fallback;
    }
  }

  function listExternalScripts() {
    try {
      return Array.from(document.scripts || [])
        .filter(script => /^https?:\/\//i.test(String(script && script.src || '')))
        .map(script => ({
          src: safeString(script.src),
          hasIntegrity: !!script.integrity,
          hasCrossorigin: !!script.crossOrigin
        }));
    } catch (err) {
      return [];
    }
  }

  function listExternalStyles() {
    try {
      return Array.from(document.querySelectorAll('link[rel~="stylesheet"][href]') || [])
        .filter(link => /^https?:\/\//i.test(String(link && link.href || '')))
        .map(link => ({
          href: safeString(link.href),
          hasIntegrity: !!link.integrity,
          hasCrossorigin: !!link.crossOrigin
        }));
    } catch (err) {
      return [];
    }
  }

  function listStorageKeys(storageName) {
    const storage = storageName === 'sessionStorage' ? window.sessionStorage : window.localStorage;
    const keys = [];
    try {
      for (let i = 0; storage && i < storage.length; i += 1) {
        const key = safeString(storage.key(i));
        if (key) keys.push(key);
      }
    } catch (err) {}
    return keys;
  }

  function classifyStorageKey(key, area) {
    const name = safeString(key);
    const rule = STORAGE_CLASSIFICATION_RULES.find(item => item.match && item.match.test(name));
    const suspicious = sensitiveKeyPattern.test(name);
    const base = rule || {
      id: 'storage-unknown',
      category: 'unknown',
      priority: suspicious ? 'P1-review' : 'P2-review',
      sensitivity: suspicious ? 'unknown-sensitive-name' : 'unknown-low-confidence',
      action: 'Ručně ověřit účel klíče; hodnotu v auditu nečíst.'
    };
    const priority = suspicious && !/^storage-admin-session$/.test(base.id) && !/^storage-admin-legacy-local$/.test(base.id)
      ? (base.priority === 'P3' ? 'P2-review' : base.priority)
      : base.priority;
    return {
      key: name,
      area: area || 'localStorage',
      ruleId: base.id,
      category: base.category,
      priority,
      sensitivity: base.sensitivity,
      suspiciousName: suspicious,
      action: base.action,
      valueInspection: 'disabled-by-design'
    };
  }

  function collectStorageSignals() {
    const localKeys = listStorageKeys('localStorage');
    const sessionKeys = listStorageKeys('sessionStorage');
    const localItems = localKeys.map(key => classifyStorageKey(key, 'localStorage'));
    const sessionItems = sessionKeys.map(key => classifyStorageKey(key, 'sessionStorage'));
    const all = localItems.concat(sessionItems);
    const suspicious = all.filter(item => item.suspiciousName || /^P1/.test(String(item.priority || '')));
    const unknown = all.filter(item => item.category === 'unknown');
    const categories = all.reduce((acc, item) => {
      const cat = item.category || 'unknown';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});
    return {
      keyCount: localKeys.length,
      sessionKeyCount: sessionKeys.length,
      classifiedKeyCount: all.length,
      categoryCount: Object.keys(categories).length,
      categories,
      suspiciousKeyCount: suspicious.length,
      unknownKeyCount: unknown.length,
      suspiciousKeyNames: suspicious.map(item => item.key).slice(0, 12),
      unknownKeyNames: unknown.map(item => item.key).slice(0, 12),
      items: all.slice(0, 80),
      // Záměrně nečteme hodnoty; jde jen o názvy klíčů kvůli soukromí.
      valueInspectionMode: 'disabled-by-design'
    };
  }

  function collectDomRuntimeSignals() {
    const inlineScriptCount = (() => {
      try { return Array.from(document.scripts || []).filter(script => !script.src && safeString(script.textContent).length > 0).length; } catch (err) { return 0; }
    })();
    const cspMetaPresent = (() => {
      try { return !!document.querySelector('meta[http-equiv="Content-Security-Policy" i]'); } catch (err) { return false; }
    })();
    const targetBlankWithoutNoopener = (() => {
      try {
        return Array.from(document.querySelectorAll('a[target="_blank"]') || [])
          .filter(anchor => !/\bnoopener\b/i.test(String(anchor.getAttribute('rel') || '')))
          .length;
      } catch (err) {
        return 0;
      }
    })();
    const staticTotals = STATIC_DOM_SINK_INVENTORY.reduce((acc, item) => {
      acc.total += Number(item.count || 0);
      if (/^P1/.test(String(item.priority || ''))) acc.p1 += 1;
      if (/^P2/.test(String(item.priority || ''))) acc.p2 += 1;
      acc.bySink[item.sink] = (acc.bySink[item.sink] || 0) + Number(item.count || 0);
      return acc;
    }, { total: 0, p1: 0, p2: 0, bySink: {} });
    return {
      inlineScriptCount,
      cspMetaPresent,
      targetBlankWithoutNoopener,
      staticSinkCount: staticTotals.total,
      staticP1SinkGroups: staticTotals.p1,
      staticP2SinkGroups: staticTotals.p2,
      staticBySink: staticTotals.bySink,
      staticInventory: STATIC_DOM_SINK_INVENTORY.slice()
    };
  }

  function collectAppSecSignals() {
    const externalScripts = listExternalScripts();
    const externalStyles = listExternalStyles();
    const storage = collectStorageSignals();
    const dom = collectDomRuntimeSignals();
    const supabasePublicConfig = {
      hasUrl: !!safeString(window.SUPABASE_URL || window.RAK_SUPABASE_URL),
      hasAnonOrPublishableKey: !!safeString(window.SUPABASE_ANON_KEY || window.RAK_SUPABASE_ANON_KEY || window.SUPABASE_PUBLISHABLE_KEY),
      note: 'Veřejný anon/publishable klíč není service-role secret; autorizaci musí dál hlídat RLS/RPC.'
    };
    const bridgeAvailable = !!(
      (window.rakSupabaseBridge && typeof window.rakSupabaseBridge === 'object') ||
      (window.RaKSupabase && typeof window.RaKSupabase === 'object')
    );

    const warnings = [];
    if (!dom.cspMetaPresent) warnings.push('CSP není nasazená v klientském HTML; zavádět jen report-only přes hosting header.');
    if (externalScripts.some(item => !item.hasIntegrity)) warnings.push('Externí CDN skripty nemají SRI integritu nebo lokální vendor kopii.');
    if (externalStyles.some(item => !item.hasIntegrity)) warnings.push('Externí stylesheet/font bez SRI – u Google Fonts řešit allowlistem nebo lokální font fallbackem.');
    if (storage.suspiciousKeyCount > 0) warnings.push('Storage obsahuje názvy klíčů připomínající admin/session/auth; hodnoty se záměrně nečtou.');
    if (storage.unknownKeyCount > 0) warnings.push('Storage obsahuje neznámé klíče mimo katalog; ručně ověřit, nemazat automaticky.');
    if (dom.targetBlankWithoutNoopener > 0) warnings.push('Některé externí odkazy target=_blank nemají noopener.');

    return {
      version: safeString(window.APP_VERSION || VERSION),
      mode: MODE,
      checkedAt: new Date().toISOString(),
      cspMetaPresent: dom.cspMetaPresent,
      inlineScriptCount: dom.inlineScriptCount,
      externalScriptCount: externalScripts.length,
      externalStyleCount: externalStyles.length,
      externalScriptsWithoutSri: externalScripts.filter(item => !item.hasIntegrity).length,
      externalStylesWithoutSri: externalStyles.filter(item => !item.hasIntegrity).length,
      targetBlankWithoutNoopener: dom.targetBlankWithoutNoopener,
      storage,
      dom,
      supabasePublicConfig,
      bridgeAvailable,
      externalDependencyStatusKnown: !!window.__RAK_EXTERNAL_DEP_STATUS__,
      warningCount: warnings.length,
      warnings,
      externalScripts: externalScripts.map(item => ({ src: item.src.replace(/\?.*$/, ''), hasIntegrity: item.hasIntegrity })),
      externalStyles: externalStyles.map(item => ({ href: item.href.replace(/\?.*$/, ''), hasIntegrity: item.hasIntegrity }))
    };
  }

  window.getRakAppSecPrivacySurfaceHealth = function getRakAppSecPrivacySurfaceHealth() {
    const signals = collectAppSecSignals();
    const p0Blockers = 0;
    const p1Warnings = Number(signals.storage && signals.storage.suspiciousKeyCount || 0) > 0 ? 1 : 0;
    return Object.assign({}, signals, {
      ok: p0Blockers === 0,
      readOnly: true,
      noMutation: true,
      phasePercent: 100,
      p0Blockers,
      p1Warnings,
      riskLevel: p0Blockers ? 'P0' : (p1Warnings ? 'P1-review' : (signals.warningCount ? 'P2-review' : 'low')),
      recommendation: signals.warningCount ? 'Pokračovat bezpečně po jednotlivých vrstvách: report-only CSP, vendor/SRI plán a DOM sink regression testy.' : 'Bez zjevného runtime P0 nálezu.'
    });
  };

  window.getRakAppSecStorageKeyClassificationHealth = function getRakAppSecStorageKeyClassificationHealth() {
    const storage = collectStorageSignals();
    return {
      ok: storage.unknownKeyCount === 0,
      version: safeString(window.APP_VERSION || VERSION),
      mode: 'appsec-storage-key-classification-v923',
      checkedAt: new Date().toISOString(),
      readOnly: true,
      noMutation: true,
      valueInspectionMode: storage.valueInspectionMode,
      keyCount: storage.keyCount,
      sessionKeyCount: storage.sessionKeyCount,
      classifiedKeyCount: storage.classifiedKeyCount,
      categoryCount: storage.categoryCount,
      categories: storage.categories,
      suspiciousKeyCount: storage.suspiciousKeyCount,
      unknownKeyCount: storage.unknownKeyCount,
      suspiciousKeyNames: storage.suspiciousKeyNames,
      unknownKeyNames: storage.unknownKeyNames,
      items: storage.items,
      recommendation: storage.unknownKeyCount ? 'Neznámé klíče ručně zařadit do katalogu; hodnoty nečíst a nic nemazat automaticky.' : 'Storage klíče spadají do známých kategorií nebo do session-only guardů.'
    };
  };

  window.getRakAppSecDomInjectionSurfaceHealth = function getRakAppSecDomInjectionSurfaceHealth() {
    const dom = collectDomRuntimeSignals();
    return {
      ok: dom.targetBlankWithoutNoopener === 0,
      version: safeString(window.APP_VERSION || VERSION),
      mode: 'appsec-dom-injection-surface-v923',
      checkedAt: new Date().toISOString(),
      readOnly: true,
      noMutation: true,
      inlineScriptCount: dom.inlineScriptCount,
      targetBlankWithoutNoopener: dom.targetBlankWithoutNoopener,
      staticSinkCount: dom.staticSinkCount,
      staticP1SinkGroups: dom.staticP1SinkGroups,
      staticP2SinkGroups: dom.staticP2SinkGroups,
      staticBySink: dom.staticBySink,
      staticInventory: dom.staticInventory,
      nextSafeStep: 'Neměnit masově innerHTML. Nové změny psát přes safe helpery a pro stávající šablony přidat regression testy na escapování.'
    };
  };

  window.getRakAppSecCspSriReportOnlyPlan = function getRakAppSecCspSriReportOnlyPlan() {
    const signals = collectAppSecSignals();
    return Object.assign({
      ok: true,
      version: safeString(window.APP_VERSION || VERSION),
      mode: 'appsec-csp-sri-report-only-plan-v923',
      checkedAt: new Date().toISOString(),
      readOnly: true,
      noMutation: true,
      externalScriptCount: signals.externalScriptCount,
      externalScriptsWithoutSri: signals.externalScriptsWithoutSri,
      externalStyleCount: signals.externalStyleCount,
      externalStylesWithoutSri: signals.externalStylesWithoutSri
    }, CSP_REPORT_ONLY_PLAN);
  };

  window.getRakAppSecPrivacyRiskRegister = function getRakAppSecPrivacyRiskRegister() {
    const signals = collectAppSecSignals();
    const items = [
      {
        id: 'APPSec-CSP-001',
        priority: signals.cspMetaPresent ? 'P3' : 'P2',
        title: 'CSP není vynucená přímo v aplikaci',
        where: 'index.html / hosting headers',
        impact: 'Při budoucí XSS chybí dodatečná obranná vrstva.',
        fix: 'Nejmenší bezpečný krok: report-only CSP na hostingu, až potom vynucení.',
        regressionRisk: 'medium',
        verify: 'DevTools Security/Network headers + smoke test exportu, her, Supabase a externích knihoven.'
      },
      {
        id: 'APPSec-CDN-002',
        priority: (signals.externalScriptsWithoutSri || signals.externalStylesWithoutSri) ? 'P2' : 'P3',
        title: 'CDN závislosti bez SRI nebo lokální vendor kopie',
        where: 'index.html externí xlsx/jszip/supabase-js/Google Fonts',
        impact: 'Supply-chain riziko při změně obsahu externího zdroje.',
        fix: 'Pin + SRI, nebo lokální kopie knihoven v assets/vendor; začít exportem ZIPu a offline smoke testem.',
        regressionRisk: 'medium',
        verify: 'Offline/online export ZIPu, import Excelu, PWA cache, online hry a heartbeat.'
      },
      {
        id: 'APPSec-STORAGE-003',
        priority: signals.storage && signals.storage.suspiciousKeyCount ? 'P1-review' : 'P2-review',
        title: 'localStorage/sessionStorage katalog klíčů',
        where: 'runtime storage / herní profily / offline cache / session admin guard',
        impact: 'Klientské hodnoty nejsou autorita; nesmí se použít jako skutečné oprávnění.',
        fix: 'Katalog udržovat jako read-only diagnostiku; adminUnlocked v localStorage dál mazat při startu.',
        regressionRisk: 'low',
        verify: 'Diagnostika ukáže jen názvy/počty/kategorie, nikdy hodnoty.'
      },
      {
        id: 'APPSec-DOM-004',
        priority: signals.dom && signals.dom.staticP1SinkGroups ? 'P1-review' : 'P2',
        title: 'DOM sink inventory pro innerHTML/insertAdjacentHTML',
        where: 'ui.js / games-arcade.js / stats.js / soustruhy.js / qr.js',
        impact: 'Budoucí neescapovaný vstup by mohl otevřít DOM injection/XSS riziko.',
        fix: 'Neměnit hromadně; nové UI přes safe helpery, stávající šablony krýt regression testem a escape review.',
        regressionRisk: 'medium',
        verify: 'DOM smoke + ruční test stránek s dynamickými názvy/stroji/profily/reporty.'
      },
      {
        id: 'APPSec-SUPABASE-005',
        priority: 'P1-review',
        title: 'Supabase anonymní zápisy musí zůstat pod RLS/RPC kontrolou',
        where: 'supabase-bridge.js / RLS policies / RPC',
        impact: 'Klient je veřejný; jakákoli důvěra v klienta by šla obejít.',
        fix: 'Neutahovat policies bez dvoumobilového smoke testu; citlivější zápisy posouvat na RPC kontrakty.',
        regressionRisk: 'high',
        verify: 'Piškvorky link+kód, Lodě link+kód, game_stats zápis, keepalive RPC, offline fallback.'
      },
      {
        id: 'Privacy-REPORTS-006',
        priority: 'P1-review',
        title: 'Uživatelské reporty mohou obsahovat osobní údaje',
        where: 'bug_reports / lokální userReports draft',
        impact: 'Soukromí / osobní údaje / compliance: uživatel může do textu napsat osobní data.',
        fix: 'Do UI přidat krátké upozornění při dalším zásahu do reportů; čtení/administraci řešit odděleně, ne přes veřejný klient.',
        regressionRisk: 'low',
        verify: 'Report odeslání, čtení diagnostiky bez zobrazování obsahu.'
      }
    ];
    return {
      ok: true,
      version: safeString(window.APP_VERSION || VERSION),
      mode: 'appsec-privacy-risk-register-v923',
      checkedAt: new Date().toISOString(),
      readOnly: true,
      noMutation: true,
      itemCount: items.length,
      p0Count: items.filter(item => item.priority === 'P0').length,
      p1Count: items.filter(item => /^P1/.test(item.priority)).length,
      p2Count: items.filter(item => item.priority === 'P2').length,
      items
    };
  };

  window.getRakAppSecPrivacyClosureHealth = function getRakAppSecPrivacyClosureHealth() {
    const surface = window.getRakAppSecPrivacySurfaceHealth();
    const risk = window.getRakAppSecPrivacyRiskRegister();
    const storage = window.getRakAppSecStorageKeyClassificationHealth();
    const dom = window.getRakAppSecDomInjectionSurfaceHealth();
    const csp = window.getRakAppSecCspSriReportOnlyPlan();
    const elapsedMs = Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - startedAt);
    return {
      ok: surface.ok && risk.p0Count === 0 && dom.ok,
      version: safeString(window.APP_VERSION || VERSION),
      mode: 'appsec-privacy-baseline-closure-v923',
      checkedAt: new Date().toISOString(),
      phase: 'phase-k-appsec-privacy-baseline',
      phasePercent: 100,
      readOnly: true,
      noMutation: true,
      p0Count: risk.p0Count,
      p1Count: risk.p1Count,
      p2Count: risk.p2Count,
      warningCount: surface.warningCount,
      cspMetaPresent: surface.cspMetaPresent,
      cspReportOnlyPlanReady: !!csp && csp.mode === 'report-only-first',
      externalScriptCount: surface.externalScriptCount,
      externalScriptsWithoutSri: surface.externalScriptsWithoutSri,
      storageClassifiedKeyCount: storage.classifiedKeyCount,
      storageUnknownKeyCount: storage.unknownKeyCount,
      storageSuspiciousKeyCount: storage.suspiciousKeyCount,
      domStaticSinkCount: dom.staticSinkCount,
      targetBlankWithoutNoopener: dom.targetBlankWithoutNoopener,
      elapsedMs,
      nextStep: 'Další bezpečný krok: testovací/release gating – převést vybrané read-only closure helpery na blokující předrelease checklist.'
    };
  };

  try {
    if (window.RaK && window.RaK.diagnostics && typeof window.RaK.diagnostics.register === 'function') {
      window.RaK.diagnostics.register('appSecPrivacySurface', window.getRakAppSecPrivacySurfaceHealth);
      window.RaK.diagnostics.register('appSecPrivacyRisks', window.getRakAppSecPrivacyRiskRegister);
      window.RaK.diagnostics.register('appSecStorageKeys', window.getRakAppSecStorageKeyClassificationHealth);
      window.RaK.diagnostics.register('appSecDomSurface', window.getRakAppSecDomInjectionSurfaceHealth);
      window.RaK.diagnostics.register('appSecCspSriPlan', window.getRakAppSecCspSriReportOnlyPlan);
      window.RaK.diagnostics.register('appSecPrivacyClosure', window.getRakAppSecPrivacyClosureHealth);
    }
  } catch (err) {}

  try {
    if (typeof window.rakMarkModuleReady === 'function') {
      window.rakMarkModuleReady('rak-appsec-privacy-audit.js', 'ready', { source: 'index', mode: MODE });
    }
  } catch (err) {}
})();
