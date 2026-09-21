// RaK 1.5 – export manifest a release metadata.
var EXPORT_SOURCE_IDS = {
  "module-readiness.js": "src-module-readiness-js",
  "rak-namespace.js": "src-rak-namespace-js",
  "rak-audit-baseline.js": "src-rak-audit-baseline-js",
  "rak-runtime-health.js": "src-rak-runtime-health-js",
  "rak-storage-sync-audit.js": "src-rak-storage-sync-audit-js",
  "rak-boot-sequence-audit.js": "src-rak-boot-sequence-audit-js",
  "rak-export-release-audit.js": "src-rak-export-release-audit-js",
  "rak-dom-action-audit.js": "src-rak-dom-action-audit-js",
  "rak-supabase-client-audit.js": "src-rak-supabase-client-audit-js",
  "rak-release-ops-audit.js": "src-rak-release-ops-audit-js",
  "rak-appsec-privacy-audit.js": "src-rak-appsec-privacy-audit-js",
  "rak-release-gates.js": "src-rak-release-gates-js",
  "rak-dom-security-hardening.js": "src-rak-dom-security-hardening-js",
  "rak-due-diligence-progress.js": "src-rak-due-diligence-progress-js",
  "rak-performance-ci-audit.js": "src-rak-performance-ci-audit-js",
  "rak-mobile-smoke-audit.js": "src-rak-mobile-smoke-audit-js",
  "rak-lazy-external-libs.js": "src-rak-lazy-external-libs-js",
  "app.js": "src-app-js",
  "app-runtime-guards.js": "src-app-runtime-guards-js",
  "app-health-audits.js": "src-app-health-audits-js",
  "app-postload-audits.js": "src-app-postload-audits-js",
  "app-pwa-connectivity.js": "src-app-pwa-connectivity-js",
  "core.js": "src-core-js",
  "lifecycle.js": "src-lifecycle-js",
  "qr.js": "src-qr-js",
  "payroll.js": "src-payroll-js",
  "stats.js": "src-stats-js",
  "dashboard.js": "src-dashboard-js",
  "soustruhy.js": "src-soustruhy-js",
  "brusy.js": "src-brusy-js",
  "rotace.js": "src-rotace-js",
"appearance-theme.js": "src-appearance-theme-js",
"changelog.js": "src-changelog-js",
  "admin-rotation.js": "src-admin-rotation-js",
  "admin-food.js": "src-admin-food-js",
  "admin-reports.js": "src-admin-reports-js",
  "admin-service-usage.js": "src-admin-service-usage-js",
  "admin-daymods.js": "src-admin-daymods-js",
  "ui.js": "src-ui-js",
  "app-navigation.js": "src-app-navigation-js",
  "app-bottom-nav.js": "src-app-bottom-nav-js",
  "app-menu.js": "src-app-menu-js",
  "app-actions.js": "src-app-actions-js",
  "app-boot-selftest.js": "src-app-boot-selftest-js",
"export.js": "src-export-js",
  "app-excel-import.js": "src-app-excel-import-js",
  "app-admin-unlock.js": "src-app-admin-unlock-js",
  "app-home-boot.js": "src-app-home-boot-js",
  "app-rotation-sync.js": "src-app-rotation-sync-js",
  "app-rotation-controls.js": "src-app-rotation-controls-js",
  "app-init.js": "src-app-init-js",
  "rak-vacation-report.js": "src-rak-vacation-report-js",
  "supabase-config.js": "src-supabase-config-js",
  "supabase-bridge.js": "src-supabase-bridge-js",
"browser-smoke-v1103.js": "src-browser-smoke-v1103-js",
  "styles.css": "src-styles-css",
  "styles-base.css": "src-styles-base-css",
  "styles-layout.css": "src-styles-layout-css",
  "styles-theme.css": "src-styles-theme-css",
  "styles-responsive.css": "src-styles-responsive-css",
  "styles-modal.css": "src-styles-modal-css",
  "styles-inline-legacy.css": "src-styles-inline-legacy-css",
  "styles-calc-panels.css": "src-styles-calc-panels-css",
"styles-overrides-legacy-early.css": "src-styles-overrides-legacy-early-css",
  "styles-overrides-legacy-mid.css": "src-styles-overrides-legacy-mid-css",
  "styles-overrides-legacy-late.css": "src-styles-overrides-legacy-late-css",
  "styles-dashboard-fit.css": "src-styles-dashboard-fit-css",
  "styles-admin-polish.css": "src-styles-admin-polish-css",
  "styles-menu-polish.css": "src-styles-menu-polish-css",
  "styles-stats-polish.css": "src-styles-stats-polish-css",
  "styles-viewport-polish.css": "src-styles-viewport-polish-css",
  "styles-theme-polish.css": "src-styles-theme-polish-css",
  "styles-release-polish.css": "src-styles-release-polish-css",
  "styles-dashboard-polish.css": "src-styles-dashboard-polish-css",
  "styles-daymods.css": "src-styles-daymods-css",
  "CHANGELOG.md": "src-changelog-md",
  "manifest.webmanifest": "src-manifest-webmanifest",
  "sw.js": "src-sw-js",
  "data.js": "src-data-js",
"assets/app-icons/icon-16.png": "src-assets-app-icons-icon-16-png",
  "assets/app-icons/icon-32.png": "src-assets-app-icons-icon-32-png",
  "assets/app-icons/icon-180.png": "src-assets-app-icons-icon-180-png",
  "assets/app-icons/icon-192.png": "src-assets-app-icons-icon-192-png",
  "assets/app-icons/icon-512.png": "src-assets-app-icons-icon-512-png",
  "assets/app-icons/icon-1024.png": "src-assets-app-icons-icon-1024-png",
  "assets/rak-login-crab.png": "src-assets-rak-login-crab-png",
  "assets/rak-login-crab-step.png": "src-assets-rak-login-crab-step-png",
  "assets/rak-login-crab-tap.png": "src-assets-rak-login-crab-tap-png",
  "assets/dashboard-icons/calendar.png": "src-assets-dashboard-icons-calendar-png",
  "assets/dashboard-icons/dovolena.png": "src-assets-dashboard-icons-dovolena-png",
  "assets/dashboard-icons/eportal.png": "src-assets-dashboard-icons-eportal-png",
  "assets/dashboard-icons/hourglass.png": "src-assets-dashboard-icons-hourglass-png",
  "assets/dashboard-icons/jidelna.png": "src-assets-dashboard-icons-jidelna-png",
  "assets/dashboard-icons/jidelnilistek.png": "src-assets-dashboard-icons-jidelnilistek-png",
  "assets/dashboard-icons/kantyna.png": "src-assets-dashboard-icons-kantyna-png",
  "assets/dashboard-icons/vyplata.png": "src-assets-dashboard-icons-vyplata-png",
"assets/nav-icons/home-gray.png": "src-assets-nav-icons-home-gray-png",
  "assets/nav-icons/home-green.png": "src-assets-nav-icons-home-green-png",
  "assets/nav-icons/kalkulacky-gray.png": "src-assets-nav-icons-kalkulacky-gray-png",
  "assets/nav-icons/kalkulacky-green.png": "src-assets-nav-icons-kalkulacky-green-png",
  "assets/nav-icons/rotace-gray.png": "src-assets-nav-icons-rotace-gray-png",
  "assets/nav-icons/rotace-green.png": "src-assets-nav-icons-rotace-green-png",
  "assets/help/frezky-konicita-help.png": "src-assets-help-frezky-konicita-help-png",
  "assets/help/frezky-fhb-help.png": "src-assets-help-frezky-fhb-help-png",
  "assets/help/soustruhy-vrtaky-x-help.png": "src-assets-help-soustruhy-vrtaky-x-help-png",
  "rak-complete-backup.js": "src-rak-complete-backup-js"
};

var SOURCE_CACHE = window.__ROTACE_SOURCE_CACHE__ || (window.__ROTACE_SOURCE_CACHE__ = {});
var BINARY_SOURCE_CACHE = window.__ROTACE_BINARY_SOURCE_CACHE__ || (window.__ROTACE_BINARY_SOURCE_CACHE__ = {});
window.RAK_EXPORT_CONTRACTS = window.RAK_EXPORT_CONTRACTS || {};
window.RAK_EXPORT_CONTRACTS.RAK_RELEASE_METADATA_CONTRACT_V199 = window.RAK_EXPORT_CONTRACTS.RAK_RELEASE_METADATA_CONTRACT_V199 || Object.freeze({
  displayVersion: '1.5',
  appLabel: 'RaK 1.5',
  packageVersion: '1.5.1',
  cacheVersion: 'v1.5.1',
  realtimeChannel: 'rak-public-live-v1-5',
  changelogHeader: '## RaK 1.5',
  serviceWorkerVersionGuard: 'CACHE_VERSION + SW_APP_VERSION'
});
window.RAK_EXPORT_CONTRACTS.RAK_DASHBOARD_CSS_GUARD_SERIES_CONTRACT_V1100 = window.RAK_EXPORT_CONTRACTS.RAK_DASHBOARD_CSS_GUARD_SERIES_CONTRACT_V1100 || Object.freeze({
  status: 'closed',
  scope: 'dashboard-css-cleanup-guards',
  guardRange: 'v1.90-v1.100',
  guards: Object.freeze([
    'v1.90 legacy candidates',
    'v1.91 extended legacy candidates',
    'v1.92 no visual owner drift',
    'v1.94 css layer order',
    'v1.95 owner registry',
    'v1.96 no-new-hotfix lock',
    'v1.97 dashboard scope',
    'v1.98 release isolation',
    'v1.99 release metadata',
    'v1.100 guard series completion'
  ]),
  nextWork: 'Další Dashboard změny dělat už jako konkrétní funkční/vizuální požadavek, ne jako další cleanup-only guard.'
});
window.RAK_EXPORT_CONTRACTS.RAK_BRUSY_CHOICE_SIZE_CONTRACT_V1101 = window.RAK_EXPORT_CONTRACTS.RAK_BRUSY_CHOICE_SIZE_CONTRACT_V1101 || Object.freeze({
  scope: 'kalkulacky-brusy-vypocet-kusu',
  reference: 'korekce-frezky-calcFhbPresetBtn',
  targetHeightPx: 58,
  protectedButtons: Object.freeze(['TBKR01', 'TBKR07', 'AD', 'AE', 'AH', 'AD volné', 'AE volné'])
});
window.RAK_EXPORT_CONTRACTS.RAK_FIXED_APP_BACKGROUND_CONTRACT_V1101 = window.RAK_EXPORT_CONTRACTS.RAK_FIXED_APP_BACKGROUND_CONTRACT_V1101 || Object.freeze({
  scope: 'whole-app-fixed-background',
  method: 'fixed-body-pseudo-background',
  protectedEffect: 'content-scrolls-over-stable-background-for-glass-panels',
  pages: Object.freeze(['home', 'rotace', 'statistiky', 'rozpisy', 'kalkulacky', 'games', 'soustruhy', 'frezky', 'brusy'])
});
window.RAK_EXPORT_CONTRACTS.RAK_NAME_CHOICE_FIT_CONTRACT_V1102 = window.RAK_EXPORT_CONTRACTS.RAK_NAME_CHOICE_FIT_CONTRACT_V1102 || Object.freeze({
  scope: 'rotace-and-statistiky-name-choice-buttons',
  intent: 'fit-full-names-on-narrow-displays',
  protectedSelectors: Object.freeze(['.rotaceNameTile .rotaceTileTitle', '#statsNameGrid .statsNameTile .statsTileTitle']),
  textRules: Object.freeze(['white-space:normal', 'overflow:visible', 'text-overflow:clip', 'overflow-wrap:anywhere'])
});
window.RAK_ROTACE_EMPTY_ABSENCE_TEXT_CONTRACT_V1105 = window.RAK_ROTACE_EMPTY_ABSENCE_TEXT_CONTRACT_V1105 || Object.freeze({
  scope: 'rotace-upcoming-shift-empty-absence-line',
  text: 'Nikdo nebude chybět.',
  relatedDashboardContract: 'RAK_DASHBOARD_EMPTY_ABSENCE_TEXT_CONTRACT_V1104'
});
window.RAK_EXPORT_CONTRACTS.RAK_APPEARANCE_UPDATE_PERSISTENCE_CONTRACT_V1105 = window.RAK_EXPORT_CONTRACTS.RAK_APPEARANCE_UPDATE_PERSISTENCE_CONTRACT_V1105 || Object.freeze({
  scope: 'profile-appearance-update-migration',
  intent: 'nevracet vybrané pozadí po aktualizaci na základní',
  migrationSource: 'localStorage fallback při chybějícím account.uiSettings.backgroundId',
  protectedStorage: Object.freeze(['account.uiSettings.backgroundId', 'rakApp:background_v1']),
  fallbackBackground: 'ios-mesh'
});
window.RAK_EXPORT_CONTRACTS.RAK_BROWSER_SMOKE_CONTRACT_V1103 = window.RAK_EXPORT_CONTRACTS.RAK_BROWSER_SMOKE_CONTRACT_V1103 || Object.freeze({
  scope: 'real-browser-smoke-test',
  command: 'npm run test:browser-smoke',
  engine: 'local-chromium-cdp',
  loadMode: 'about-blank-inline-html',
  viewports: Object.freeze(['iPhone 13/14 Pro Max', 'Samsung A15 / Android běžný', 'úzký mobil 360×800']),
  checks: Object.freeze(['app boot', 'bottom navigation', 'Dashboard cards', 'Rotace export canvas', 'Administrace Rozpisy generator', 'Brusy choice height', 'Frézky presets', 'Hry', 'Menu/Více', 'fixed background'])
});
window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_GENERATOR_CONTRACT_V1106 = window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_GENERATOR_CONTRACT_V1106 || Object.freeze({
  scope: 'administrace-dat-rozpisy-generator',
  action: 'data-admin-action="generate-rotation"',
  button: 'Vygenerovat návrh',
  source: 'historical-rotation-analysis',
  saveRule: 'vygeneruje lokální návrh, online jde až po Uložit rozpis',
  safety: Object.freeze(['confirm-before-overwrite', 'one-name-once-per-day', 'respect-absence-notes', 'historical-machine-fit', 'month-fairness'])
});
window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_GENERATOR_RULES_CONTRACT_V1107 = window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_GENERATOR_RULES_CONTRACT_V1107 || Object.freeze({
  scope: 'administrace-dat-rozpisy-generator-rules',
  flow: 'absence-a-kontrola-dní-před-generováním',
  softPreferred: Object.freeze(['Střížek', 'Synek', 'Třasák', 'Špadrna', 'Novotný']),
  hardPreferred: Object.freeze(['Blažek', 'Kmínek', 'Kříž', 'Pech', 'Starý']),
  softHardCycle: Object.freeze(['TNKS01', 'TPKW01', 'TPKW02']),
  hardCycle: Object.freeze(['TBKR01', 'TNKS01', 'TBKR07', 'TPKW01', 'TPKW02']),
  protectedEmptyRules: Object.freeze(['MFKF06 prázdná vždy, když je na frézkách jen jeden člověk', 'při dvou absencích MSKC01 prázdná a MFKF06 prázdná']),
  saveRule: 'generátor vytvoří jen lokální návrh; online uložení až ručně přes Uložit rozpis'
});
window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_GENERATOR_WIZARD_CONTRACT_V1108 = window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_GENERATOR_WIZARD_CONTRACT_V1108 || Object.freeze({
  scope: 'administrace-dat-rozpisy-generator-wizard',
  flow: Object.freeze(['volba měsíce', 'kontrola pracovních dnů', 'absence přes +', 'vygenerování návrhu', 'přehled stroje × jména']),
  defaultMonth: 'nabídnout další dostupný měsíc, ale nechat ruční volbu',
  dayControls: Object.freeze(['odebrat den křížkem', 'přidat den přes +']),
  absenceControls: Object.freeze(['více jmen ke dni přes +', 'nevyplněné řádky ignorovat']),
  review: 'po vygenerování ukázat kontrolní tabulku stroje × jména pro Martina',
  saveRule: 'pořád jen lokální návrh; online až ručně přes Uložit rozpis'
});
window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_GENERATOR_ABSENCE_STATE_CONTRACT_V1109 = window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_GENERATOR_ABSENCE_STATE_CONTRACT_V1109 || Object.freeze({
  scope: 'administrace-dat-rozpisy-generator-absence-state',
  fix: 'Při + Přidat jméno v kroku Absence se nesmí smazat už vyplněné absence.',
  stateRule: 'krok Absence používá state.days, když v DOMu nejsou data-generator-day-input pole',
  editRule: 'během editace se zachovávají i prázdné řádky; ignorují se až při přípravě poznámek pro generátor'
});
window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_GENERATOR_WIZARD_RUN_CONTRACT_V1110 = window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_GENERATOR_WIZARD_RUN_CONTRACT_V1110 || Object.freeze({
  scope: 'administrace-dat-rozpisy-generator-wizard-run',
  fix: 'Vygenerování z průvodce nesmí skončit prázdným rozpisem ani nulovým přehledem stroje × jména.',
  domRule: 'readAdminRotationFromDom se smí použít jen v reálném editoru #adminRotationEditor, ne ve wizard DOMu',
  browserGuard: 'browser smoke musí po kliknutí na generator-run ověřit nenulový návrh a nenulovou tabulku stroje × jména'
});
window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_GENERATOR_WIZARD_STATE_CONTRACT_V1111 = window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_GENERATOR_WIZARD_STATE_CONTRACT_V1111 || Object.freeze({
  scope: 'administrace-dat-rozpisy-generator-wizard-state',
  fix: 'Průvodce nesmí vygenerovat nulový návrh, když se po předchozím neúspěšném pokusu ztratily řádky měsíce.',
  dayFallback: 'pracovní dny se berou ze state.days, potom z aktuálního měsíce a nakonec z initialRotationData',
  failRule: 'pokud nejsou žádné pracovní dny, zobrazit chybu místo výsledku dnů 0 / políček 0',
  saveButton: 'v editoru rozpisu zůstává jedno jasné tlačítko Uložit rozpis; duplicitní duplicitní odesílací tlačítko se odstraňuje'
});
window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_SAVE_BUTTON_CONTRACT_V1118 = window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_SAVE_BUTTON_CONTRACT_V1118 || Object.freeze({
  scope: 'administrace-dat-rozpisy-save-button',
  rule: 'Po kontrole návrhu se používá pouze Uložit rozpis. Tlačítko duplicitní odesílací tlačítko je odstraněné, protože dělalo stejnou akci.',
  generatorResult: 'V náhledu generátoru je jen Otevřít rozpis; uložení zůstává v editoru.'
});
window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_GENERATOR_MONTH_BALANCE_CONTRACT_V1112 = window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_GENERATOR_MONTH_BALANCE_CONTRACT_V1112 || Object.freeze({
  scope: 'administrace-dat-rozpisy-generator-month-balance',
  monthSelect: 'měsíce v generátoru jsou řazené podle roku/měsíce a seskupené podle roku, aby se nepletly 2025/2026',
  tnks01Rule: 'nýtovačka/TNKS01 se po vygenerování vyrovnává mezi lidmi v měsíci',
  swapRule: 'pokud někdo vyjde na TNKS01 víckrát a někdo vůbec, generátor může prohodit člověka na TNKS01 s člověkem z tvrdoty dočasně napsaným na měkotě'
});
window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_GENERATOR_RULES_CONTRACT_V1113 = window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_GENERATOR_RULES_CONTRACT_V1113 || Object.freeze({
  scope: 'administrace-dat-rozpisy-generator-rules-v1113',
  machineCountRule: 'TNKS01 a TPKW01 se v kontrolním přehledu mimo běžnou neděli počítají jako 0,5 + 0,5; běžná neděle ranní/noční zůstává celá na zapsaném stroji, přesčasová neděle se střídá.',
  softCoreRule: 'Synek, Třasák, Střížek chodí z Měkoty na Tvrdotu jen na TNKS01/TPKW01/TPKW02 po blocích 3 pracovních dnů na stejný stroj.',
  softBaseLathe: Object.freeze({ Synek: 'MSKC04', Střížek: 'MSKC03', Třasák: 'MSKC01' }),
  previewRule: 'Po vygenerování průvodce ukáže celý rozpis a umožní návrat na měsíc/dny/absence bez klikání od začátku.'
});
window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_GENERATOR_RULES_CONTRACT_V1114 = window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_GENERATOR_RULES_CONTRACT_V1114 || Object.freeze({
  scope: 'administrace-dat-rozpisy-generator-rules-v1114',
  softCoreAvailabilityRule: 'Synek/Třasák/Střížek se v 3denním bloku na Tvrdotě přeskupí podle absencí tak, aby člověk dostupný jen první dny šel na Tvrdotu dřív a nevyhnul se jí.',
  soloMillBalanceRule: 'Samostatná obsluha frézek se počítá jako MFKF10 při prázdné MFKF06 a po vygenerování se vyrovnává mezi lidmi.',
  resultRule: 'Výsledek generátoru vrací soloMillBalanceSwaps a ruleVersion 1.114.'
});

window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_GENERATOR_RULES_CONTRACT_V1115 = window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_GENERATOR_RULES_CONTRACT_V1115 || Object.freeze({
  scope: 'administrace-dat-rozpisy-generator-human-flow-v1115',
  flow: 'Generátor staví rozpis víc jako Martin: nejdřív návazná Tvrdota, potom základní Měkota, potom absence/výměny, potom Špadrna a Novotný jako vyrovnání a nakonec kontrola férovosti.',
  hardCycle: Object.freeze(['TBKR01', 'TNKS01', 'TBKR07', 'TPKW01', 'TPKW02']),
  previousMonthRule: 'Tvrdota pokračuje podle toho, kde člověk skončil v minulém měsíci.',
  softExchangeRule: 'Synek/Třasák/Střížek z Měkoty jdou na Tvrdotu po 3denních blocích a vytlačený člověk z Tvrdoty jde na Měkotu hlavně na frézy.',
  flexPeople: Object.freeze(['Špadrna', 'Novotný'])
});

window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_GENERATOR_RULES_CONTRACT_V1116 = window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_GENERATOR_RULES_CONTRACT_V1116 || Object.freeze({
  scope: 'administrace-dat-rozpisy-generator-balance-summary-v1116',
  machineSummaryRule: 'Kontrolní přehled je otočený jako jména v řádcích a stroje ve sloupcích, včetně souhrnů TO a MO.',
  pressBalanceRule: 'TNKS01/TPKW01 se vyrovnávají podle společného 0,5 + 0,5 počtu, aby nevznikal stav 1,5 proti 0.',
  consecutivePressRule: 'Dvě směny po sobě na nýtovačce se hlídají přes TNKS01 i rotující TPKW01; krátká / nerotující neděle se nepůlí.',
  softKindBalanceRule: 'Po vygenerování se dorovnává poměr frézky/soustruhy mezi lidmi na Měkotě, výchozí nastavení počítá celou Měkotu.',
  softTotalBalanceRule: 'Vybraná skupina lidí z Tvrdoty se dorovnává podle celkového počtu směn na Měkotě.',
  resultRule: 'Výsledek generátoru vrací softTotalBalanceSwaps, softKindBalanceSwaps a ruleVersion 1.116.'
});

window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_EMPTY_CELL_HIGHLIGHT_CONTRACT_V1119 = window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_EMPTY_CELL_HIGHLIGHT_CONTRACT_V1119 || Object.freeze({
  scope: 'rotace-rozpisy-empty-cell-highlight',
  intent: 'neobsazené pozice v Rotaci, Rozpisech a náhledu generátoru zvýraznit světle červeně',
  protectedClasses: Object.freeze(['missingCell', 'adminRotationEditorEmptyCell', 'adminRotationPreviewEmptyCell', 'adminRotationMiniEmpty'])
});
window.RAK_EXPORT_CONTRACTS.RAK_DASHBOARD_SHIFT_PERCENT_SIZE_CONTRACT_V1119 = window.RAK_EXPORT_CONTRACTS.RAK_DASHBOARD_SHIFT_PERCENT_SIZE_CONTRACT_V1119 || Object.freeze({
  scope: 'dashboard-hero-shift-percent',
  intent: 'ukazatel procent odpracování aktuální směny výrazně zvětšit',
  target: 'cca dvojnásobná velikost proti původním 12px'
});

window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_GENERATOR_RULES_CONTRACT_V1117 = window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_GENERATOR_RULES_CONTRACT_V1117 || Object.freeze({
  scope: 'administrace-dat-rozpisy-generator-kminek-novotny-mo-to-v1117',
  moToPairRule: 'Kmínek a Novotný se po vygenerování můžou prohazovat mezi sebou, aby měli navzájem co nejpodobnější počet směn na MO a TO.',
  balanceFunction: 'adminRotationGeneratorBalanceKminekNovotnyMoTo',
  resultRule: 'Výsledek generátoru vrací kminekNovotnyMoToBalanceSwaps a ruleVersion 1.118.'
});


window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_GENERATOR_EXCEL_COPY_CONTRACT_V1138 = window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_GENERATOR_EXCEL_COPY_CONTRACT_V1138 || Object.freeze({
  version: '1.5',
  scope: 'administrace-dat-rozpisy-generator-excel-copy-layout',
  layout: 'Tvrdota A:F, Měkota A:F pod Tvrdotou, Absence od H dál po pracovních dnech',
  columns: Object.freeze(['A datum', 'B:F stroje', 'G mezera', 'H datum absence', 'I dál dvojice Jméno/Kód']),
  rule: 'Bez sloučených buněk; šířka a počet absence dvojic se generuje tak, aby se bloky daly prakticky kopírovat do Rotace týmu 2026.'
});

window.RAK_EXPORT_CONTRACTS.RAK_ADMIN_EXPORT_IMPORT_EXCEL_COPY_CONTRACT_V1139 = window.RAK_EXPORT_CONTRACTS.RAK_ADMIN_EXPORT_IMPORT_EXCEL_COPY_CONTRACT_V1139 || Object.freeze({
  version: '1.5',
  scope: 'administrace-export-import-rotation-excel-copy-layout',
  source: 'sdílí adminRotationGeneratorDownloadExcel a stejný AoA layout jako generátor rozpisu',
  ui: 'Export / import má vlastní výběr měsíce a tlačítko Stáhnout Excel rozpisu',
  noDbChange: true
});

window.RAK_EXPORT_CONTRACTS.RAK_ADMIN_EXPORT_IMPORT_EXCEL_MONTH_GROUP_CONTRACT_V1140 = window.RAK_EXPORT_CONTRACTS.RAK_ADMIN_EXPORT_IMPORT_EXCEL_MONTH_GROUP_CONTRACT_V1140 || Object.freeze({
  version: '1.5',
  scope: 'administrace-export-import-rotation-excel-month-picker',
  source: 'buildRakRotationExcelExportMonthOptions používá chronologické řazení a optgroup Rok',
  ui: 'Měsíce ve výběru Excel exportu nejsou smíchané napříč roky',
  noDbChange: true
});

window.RAK_EXPORT_CONTRACTS.RAK_STATS_PRESS_MACHINE_SPLIT_CONTRACT_V1123 = window.RAK_EXPORT_CONTRACTS.RAK_STATS_PRESS_MACHINE_SPLIT_CONTRACT_V1123 || Object.freeze({
  version: '1.5',
  rule: 'Statistiky a export Nýtování a úklid používají stejné půlení TNKS01/TPKW01 jako generátor.',
  normal: 'Mimo neděli se TNKS01 i TPKW01 počítají jako 0,5 TNKS01 + 0,5 TPKW01.',
  sunday: 'Běžná neděle zůstává celá na zapsaném stroji.',
  overtimeSunday: 'Přesčasová neděle ze seznamu přesčasových nedělí/kantýny se znovu počítá 0,5 + 0,5.'
});


window.RAK_EXPORT_CONTRACTS.RAK_STATS_PRESS_MACHINE_MO_ONLY_EXCEPTION_CONTRACT_V1124 = window.RAK_EXPORT_CONTRACTS.RAK_STATS_PRESS_MACHINE_MO_ONLY_EXCEPTION_CONTRACT_V1124 || Object.freeze({
  version: '1.5',
  defaultRule: 'Nedělní přesčas se standardně bere jako TO/tvrdota a TNKS01/TPKW01 se půlí 0,5 + 0,5.',
  exceptionRule: 'Výjimky označené jako přesčas jen MO se ve statistikách tvrdoty nepůlí a počítají se jako běžná neděle.',
  currentException: '2026-03-01 je přesčas jen na MO, proto se TNKS01/TPKW01 v tvrdotě nepůlí.',
  sharedSources: ['SPECIAL_OVERTIME_SUNDAY_NIGHTS_2025', 'SPECIAL_OVERTIME_SUNDAY_NIGHTS_2026', 'SPECIAL_OVERTIME_MO_ONLY_SUNDAYS_2026', 'ROTATION_OVERTIME_DEFAULT_SEED_VERSION', 'shouldStatsSplitPressMachines', 'adminRotationGeneratorShouldSplitPressMachines']
});


window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_OVERTIME_DEFAULTS_2025_CONTRACT_V1129 = window.RAK_EXPORT_CONTRACTS.RAK_ROTATION_OVERTIME_DEFAULTS_2025_CONTRACT_V1129 || Object.freeze({
  version: '1.5',
  year: 2025,
  count: 12,
  defaultRule: 'Nově dodané přesčasy 2025 jsou výchozí TO/tvrdota; konkrétní datum lze přepínačem TO vypnout na MO.',
  seedVersion: 129,
  dates: Object.freeze(['2025-01-12', '2025-01-26', '2025-02-16', '2025-03-02', '2025-03-16', '2025-03-30', '2025-10-05', '2025-10-19', '2025-11-09', '2025-11-23', '2025-11-30', '2025-12-14'])
});

var EXPORT_SMOKE_REPORT = window.__RAK_EXPORT_SMOKE_REPORT__ || (window.__RAK_EXPORT_SMOKE_REPORT__ = {
  ok: null,
  status: 'not-run',
  mode: 'export-smoke-report-v939',
  version: '1.5',
  checkedAt: null,
  lastStage: 'čeká na export',
  runCount: 0,
  successCount: 0,
  failureCount: 0,
  checkedTextFileCount: 0,
  checkedBinaryFileCount: 0,
  missingTextFileCount: 0,
  missingBinaryFileCount: 0,
  duplicatePathCount: 0,
  lastDownloadName: '',
  lastError: ''
});

var EXPORT_BINARY_FILES = new Set([
  "assets/app-icons/icon-16.png",
  "assets/app-icons/icon-32.png",
  "assets/app-icons/icon-180.png",
  "assets/app-icons/icon-192.png",
  "assets/app-icons/icon-512.png",
  "assets/app-icons/icon-1024.png",
  "assets/rak-login-crab.png",
  "assets/rak-login-crab-step.png",
  "assets/rak-login-crab-tap.png",
  "assets/dashboard-icons/calendar.png",
  "assets/dashboard-icons/dovolena.png",
  "assets/dashboard-icons/eportal.png",
  "assets/dashboard-icons/hourglass.png",
  "assets/dashboard-icons/jidelna.png",
  "assets/dashboard-icons/jidelnilistek.png",
  "assets/dashboard-icons/kantyna.png",
  "assets/dashboard-icons/vyplata.png",
"assets/nav-icons/home-gray.png",
  "assets/nav-icons/home-green.png",
  "assets/nav-icons/kalkulacky-gray.png",
  "assets/nav-icons/kalkulacky-green.png",
  "assets/nav-icons/rotace-gray.png",
  "assets/nav-icons/rotace-green.png",
  "assets/help/frezky-konicita-help.png",
  "assets/help/frezky-fhb-help.png",
  "assets/help/soustruhy-vrtaky-x-help.png"
]);

var EXPORT_JS_FILES = [
  "module-readiness.js",
  "rak-namespace.js",
  "rak-audit-baseline.js",
  "rak-runtime-health.js",
  "rak-storage-sync-audit.js",
  "rak-boot-sequence-audit.js",
  "rak-export-release-audit.js",
  "rak-dom-action-audit.js",
  "rak-supabase-client-audit.js",
  "rak-release-ops-audit.js",
  "rak-appsec-privacy-audit.js",
  "rak-release-gates.js",
  "rak-dom-security-hardening.js",
  "rak-due-diligence-progress.js",
  "rak-performance-ci-audit.js",
  "rak-mobile-smoke-audit.js",
  "rak-lazy-external-libs.js",
  "app.js",
  "app-runtime-guards.js",
  "app-health-audits.js",
  "app-postload-audits.js",
  "app-pwa-connectivity.js",
  "core.js",
  "lifecycle.js",
  "qr.js",
  "payroll.js",
  "stats.js",
  "dashboard.js",
  "soustruhy.js",
  "brusy.js",
  "rotace.js",
"appearance-theme.js",
"changelog.js",
  "admin-rotation.js",
  "admin-food.js",
  "admin-reports.js",
  "admin-service-usage.js",
  "ui.js",
  "app-navigation.js",
  "app-bottom-nav.js",
  "app-menu.js",
  "app-actions.js",
  "app-boot-selftest.js",
"export.js",
  "app-excel-import.js",
  "app-admin-unlock.js",
  "app-home-boot.js",
  "app-rotation-sync.js",
  "app-rotation-controls.js",
  "app-init.js",
  "supabase-config.js",
  "supabase-bridge.js",
"browser-smoke-v1103.js",
  "rak-complete-backup.js",
];

var EXPORT_TEXT_FILES = [
  "styles.css",
  "styles-base.css",
  "styles-layout.css",
  "styles-theme.css",
  "styles-responsive.css",
  "styles-modal.css",
  "styles-inline-legacy.css",
  "styles-calc-panels.css",
"styles-dashboard-fit.css",
  "styles-admin-polish.css",
  "styles-menu-polish.css",
  "styles-stats-polish.css",
  "styles-viewport-polish.css",
  "styles-theme-polish.css",
  "styles-release-polish.css",
  "styles-dashboard-polish.css",
  "CHANGELOG.md",
  "manifest.webmanifest",
  "sw.js",
  "data.js",
];

function getRakExportManifest() {
  return {
    version: String(window.APP_VERSION || '1.5'),
    mode: 'export-manifest-preflight-v939',
    indexFile: 'index.html',
    jsFiles: Array.from(new Set(EXPORT_JS_FILES)),
    textFiles: Array.from(new Set(EXPORT_TEXT_FILES)),
    binaryFiles: Array.from(EXPORT_BINARY_FILES),
    preflightValidation: true
  };
}
window.getRakExportManifest = getRakExportManifest;


function getRakExportSourceInventoryHealth() {
  const exportManifest = typeof getRakExportManifest === 'function' ? getRakExportManifest() : { jsFiles: [], textFiles: [], binaryFiles: [] };
  const sourcePaths = Object.keys(EXPORT_SOURCE_IDS || {});
  const manifestPaths = [].concat(exportManifest.indexFile ? [exportManifest.indexFile] : [], exportManifest.jsFiles || [], exportManifest.textFiles || []);
  const binaryPaths = Array.from(exportManifest.binaryFiles || EXPORT_BINARY_FILES || []);
  const duplicateSourceCount = sourcePaths.length - new Set(sourcePaths).size;
  const duplicateBinaryCount = binaryPaths.length - new Set(binaryPaths).size;
  const duplicateManifestPathCount = manifestPaths.length - new Set(manifestPaths).size;
  return {
    ok: duplicateSourceCount === 0 && duplicateBinaryCount === 0 && duplicateManifestPathCount === 0,
    mode: 'export-source-inventory-v939',
    version: String(window.APP_VERSION || 'unknown'),
    sourceIdCount: sourcePaths.length,
    manifestTextPathCount: manifestPaths.length,
    uniqueManifestTextPathCount: new Set(manifestPaths).size,
    totalManifestPathCount: manifestPaths.length,
    uniqueSourcePathCount: new Set(sourcePaths).size,
    binaryFileCount: binaryPaths.length,
    uniqueBinaryFileCount: new Set(binaryPaths).size,
    duplicateSourceCount,
    duplicateBinaryCount,
    duplicateManifestPathCount,
    hasPreflightValidation: !!exportManifest.preflightValidation,
    indexFile: String(exportManifest.indexFile || '—'),
    hasSqlArchive: sourcePaths.some((path) => String(path).startsWith('assets/docs/sql/')),
    hasReleaseDocs: sourcePaths.some((path) => String(path).startsWith('assets/docs/')),
    manifestSplit: true,
    manifestMode: String(exportManifest.mode || '—'),
    zipRootRule: 'root-files-assets-folder-only'
  };
}
window.getRakExportSourceInventoryHealth = getRakExportSourceInventoryHealth;

function primeSourceCache() {
  // Keep the cache empty here so exports always read the current files first.
}

primeSourceCache();

function setRakExportStatus(text, isError) {
  const status = document.getElementById('rakExcelImportStatus') || document.getElementById('adminOnlineSaveStatus');
  if (!status) return;
  status.textContent = text || '';
  status.classList.toggle('isError', !!isError);
}


async function readExportText(relativePath) {
  if (SOURCE_CACHE[relativePath]) {
    return SOURCE_CACHE[relativePath];
  }

  try {
    const response = await fetch(new URL(relativePath, window.location.href).toString(), { cache: 'no-store' });
    if (response.ok) {
      const text = await response.text();
      SOURCE_CACHE[relativePath] = text;
      return text;
    }
  } catch (err) {
    console.warn(err);
  }

  const id = EXPORT_SOURCE_IDS[relativePath];
  const embedded = id ? document.getElementById(id) : null;
  if (embedded && embedded.textContent) {
    const text = embedded.textContent.replace(/^\s+|\s+$/g, '');
    SOURCE_CACHE[relativePath] = text;
    return text;
  }

  throw new Error(`Nepodařilo se načíst ${relativePath}`);
}

async function readExportBinary(relativePath) {
  if (BINARY_SOURCE_CACHE[relativePath]) {
    return BINARY_SOURCE_CACHE[relativePath];
  }

  try {
    const response = await fetch(new URL(relativePath, window.location.href).toString(), { cache: 'no-store' });
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      BINARY_SOURCE_CACHE[relativePath] = buffer;
      return buffer;
    }
  } catch (err) {
    console.warn(err);
  }
  throw new Error(`Nepodařilo se načíst ${relativePath}`);
}



function updateRakExportSmokeReport(partial) {
  const data = partial && typeof partial === 'object' ? partial : {};
  Object.assign(EXPORT_SMOKE_REPORT, data, {
    mode: 'export-smoke-report-v939',
    version: String(window.APP_VERSION || '1.5'),
    checkedAt: new Date().toISOString()
  });
  return getRakExportSmokeReport();
}
window.updateRakExportSmokeReport = updateRakExportSmokeReport;

function getRakExportSmokeReport() {
  return Object.assign({}, EXPORT_SMOKE_REPORT, {
    ok: EXPORT_SMOKE_REPORT.ok,
    status: String(EXPORT_SMOKE_REPORT.status || 'not-run'),
    mode: String(EXPORT_SMOKE_REPORT.mode || 'export-smoke-report-v929'),
    version: String(EXPORT_SMOKE_REPORT.version || window.APP_VERSION || 'unknown'),
    lastStage: String(EXPORT_SMOKE_REPORT.lastStage || '—'),
    lastError: String(EXPORT_SMOKE_REPORT.lastError || ''),
    lastDownloadName: String(EXPORT_SMOKE_REPORT.lastDownloadName || '')
  });
}
window.getRakExportSmokeReport = getRakExportSmokeReport;

async function runRakExportSmokeReport(options) {
  const opts = options && typeof options === 'object' ? options : {};
  const manifest = getRakExportManifest();
  const duplicateReport = getRakExportManifestDuplicateReport(manifest);
  if (!opts.preflight) {
    return updateRakExportSmokeReport({
      ok: duplicateReport.ok,
      status: duplicateReport.ok ? 'manifest-ok' : 'manifest-duplicates',
      lastStage: 'manifest smoke bez načítání souborů',
      runCount: Number(EXPORT_SMOKE_REPORT.runCount || 0) + 1,
      duplicatePathCount: Number((duplicateReport.duplicateAllPaths || []).length || 0),
      checkedTextFileCount: duplicateReport.textPathCount || 0,
      checkedBinaryFileCount: duplicateReport.binaryPathCount || 0,
      missingTextFileCount: 0,
      missingBinaryFileCount: 0,
      lastError: duplicateReport.ok ? '' : 'Duplicitní cesta v export manifestu'
    });
  }
  return validateRakExportManifestFiles(manifest);
}
window.runRakExportSmokeReport = runRakExportSmokeReport;

function getRakExportManifestDuplicateReport(exportManifest) {
  const manifest = exportManifest && typeof exportManifest === 'object' ? exportManifest : getRakExportManifest();
  const textPaths = [].concat(manifest.indexFile ? [manifest.indexFile] : [], manifest.jsFiles || [], manifest.textFiles || []);
  const binaryPaths = Array.from(manifest.binaryFiles || []);
  const allPaths = textPaths.concat(binaryPaths);
  const findDuplicates = (list) => {
    const seen = new Set();
    const dupes = new Set();
    for (const item of list) {
      const key = String(item || '').trim();
      if (!key) continue;
      if (seen.has(key)) dupes.add(key);
      seen.add(key);
    }
    return Array.from(dupes);
  };
  return {
    ok: findDuplicates(allPaths).length === 0,
    duplicateTextPaths: findDuplicates(textPaths),
    duplicateBinaryPaths: findDuplicates(binaryPaths),
    duplicateAllPaths: findDuplicates(allPaths),
    textPathCount: textPaths.length,
    binaryPathCount: binaryPaths.length,
    totalPathCount: allPaths.length,
    uniquePathCount: new Set(allPaths).size
  };
}
window.getRakExportManifestDuplicateReport = getRakExportManifestDuplicateReport;

async function validateRakExportManifestFiles(exportManifest) {
  const manifest = exportManifest && typeof exportManifest === 'object' ? exportManifest : getRakExportManifest();
  const duplicateReport = getRakExportManifestDuplicateReport(manifest);
  const textPaths = [].concat(manifest.indexFile ? [manifest.indexFile] : [], manifest.jsFiles || [], manifest.textFiles || []);
  const binaryPaths = Array.from(manifest.binaryFiles || []);
  const missingTextFiles = [];
  const missingBinaryFiles = [];

  for (const file of textPaths) {
    try {
      await readExportText(file);
    } catch (err) {
      missingTextFiles.push(file);
    }
  }

  for (const file of binaryPaths) {
    try {
      await readExportBinary(file);
    } catch (err) {
      missingBinaryFiles.push(file);
    }
  }

  const ok = duplicateReport.ok && missingTextFiles.length === 0 && missingBinaryFiles.length === 0;
  const report = {
    ok,
    mode: 'export-manifest-preflight-v939',
    version: String(window.APP_VERSION || 'unknown'),
    checkedAt: new Date().toISOString(),
    duplicateReport,
    missingTextFileCount: missingTextFiles.length,
    missingBinaryFileCount: missingBinaryFiles.length,
    missingTextFiles: missingTextFiles.slice(0, 20),
    missingBinaryFiles: missingBinaryFiles.slice(0, 20),
    checkedTextFileCount: textPaths.length,
    checkedBinaryFileCount: binaryPaths.length
  };
  updateRakExportSmokeReport({
    ok,
    status: ok ? 'preflight-ok' : 'preflight-failed',
    lastStage: 'předexportní kontrola manifestu',
    runCount: Number(EXPORT_SMOKE_REPORT.runCount || 0) + 1,
    successCount: Number(EXPORT_SMOKE_REPORT.successCount || 0) + (ok ? 1 : 0),
    failureCount: Number(EXPORT_SMOKE_REPORT.failureCount || 0) + (ok ? 0 : 1),
    checkedTextFileCount: textPaths.length,
    checkedBinaryFileCount: binaryPaths.length,
    missingTextFileCount: missingTextFiles.length,
    missingBinaryFileCount: missingBinaryFiles.length,
    duplicatePathCount: Number((duplicateReport.duplicateAllPaths || []).length || 0),
    lastError: ok ? '' : ([].concat(missingTextFiles, missingBinaryFiles).join(', ') || 'Duplicitní cesta v export manifestu')
  });
  return report;
}
window.validateRakExportManifestFiles = validateRakExportManifestFiles;

async function exportCurrentHtml() {
  if (typeof JSZip === "undefined") {
    setRakExportStatus("Export ZIP není dostupný, nenačetla se knihovna JSZip.", true);
    alert("Export ZIP není dostupný, nenačetla se knihovna JSZip.");
    return;
  }

  try {
    updateRakExportSmokeReport({ ok: null, status: 'running', lastStage: 'start exportu', lastDownloadName: '', lastError: '' });
    setRakExportStatus("Kontroluju exportní manifest…", false);
    const exportManifest = getRakExportManifest();
    const preflight = await validateRakExportManifestFiles(exportManifest);
    if (!preflight.ok) {
      const missing = [].concat(preflight.missingTextFiles || [], preflight.missingBinaryFiles || []);
      throw new Error('Předexportní kontrola našla problém: ' + (missing.length ? missing.join(', ') : 'duplicitní cesta v manifestu'));
    }
    setRakExportStatus("Připravuju ZIP build…", false);
    const jsFiles = exportManifest.jsFiles;
    const textFiles = exportManifest.textFiles;
    const binaryFiles = exportManifest.binaryFiles;

    const stylesSource = await readExportText('styles.css');
    const cssSources = {};
    for (const file of textFiles.filter((file) => file.startsWith('styles-'))) {
      cssSources[file] = await readExportText(file);
    }

    const moduleSources = {};
    for (const file of jsFiles) {
      moduleSources[file] = await readExportText(file);
    }

    const textSources = {};
    for (const file of textFiles.filter((file) => !file.startsWith('styles-') && file !== 'data.js')) {
      textSources[file] = await readExportText(file);
    }

    const binarySources = {};
    for (const file of binaryFiles) {
      binarySources[file] = await readExportBinary(file);
    }

    let indexText = '';
    try {
      indexText = await readExportText(exportManifest.indexFile || 'index.html');
    } catch (indexErr) {
      console.warn('Export fallback: index.html se nepodařilo načíst jako zdroj, používám DOM kopii.', indexErr);
      const pages = [...document.querySelectorAll(".page")];
      const previousActive = pages.find(p => p.classList.contains("active"))?.id || "home";
      pages.forEach(p => p.classList.remove("active"));
      const home = document.getElementById("home");
      if (home) home.classList.add("active");
      indexText = `<!DOCTYPE html>
${document.documentElement.cloneNode(true).outerHTML}`;
      pages.forEach(p => p.classList.remove("active"));
      const restore = document.getElementById(previousActive);
      if (restore) restore.classList.add("active");
    }

    const zip = new JSZip();
    zip.file('index.html', indexText);
    zip.file('styles.css', stylesSource);
    for (const file of textFiles.filter((file) => file.startsWith('styles-'))) {
      zip.file(file, cssSources[file]);
    }
    zip.file('data.js', `const initialRotationData = ${JSON.stringify(app.rotation)};
`);
    for (const file of jsFiles) {
      zip.file(file, moduleSources[file]);
    }
    for (const file of Object.keys(textSources)) {
      if (file === 'styles.css' || file.startsWith('styles-')) continue;
      zip.file(file, textSources[file]);
    }
    for (const file of binaryFiles) {
      zip.file(file, binarySources[file]);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const versionText = String(window.APP_VERSION || '').trim();
    const legacyMatch = versionText.match(/v\.(\d+)\.(\d+)\s*\((\d+)\)/i);
    const newMatch = versionText.match(/^(\d+)\.(\d+)\s*\(\s*(\d+)\.(\d+)\s*\)$/i);
    const versionSuffix = newMatch
      ? `${newMatch[1]}_${newMatch[2]}_${newMatch[3]}_${newMatch[4]}`
      : (legacyMatch ? `${legacyMatch[1]}_${legacyMatch[2]}_${legacyMatch[3]}` : 'current');
    a.download = `RaK_${versionSuffix}.zip`;
    updateRakExportSmokeReport({ ok: true, status: 'export-ready', lastStage: 'ZIP sestavený, spouštím stažení', lastDownloadName: a.download, lastError: '' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setRakExportStatus("ZIP export spuštěný: " + a.download, false);
    updateRakExportSmokeReport({ ok: true, status: 'download-started', lastStage: 'stažení ZIPu spuštěno', lastDownloadName: a.download, lastError: '' });
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.error(err);
    updateRakExportSmokeReport({ ok: false, status: 'export-failed', lastStage: 'export skončil chybou', failureCount: Number(EXPORT_SMOKE_REPORT.failureCount || 0) + 1, lastError: String(err && err.message ? err.message : err) });
    setRakExportStatus("Export ZIP se nepovedl: " + (err && err.message ? err.message : err), true);
    alert("Export ZIP se nepovedl: " + (err && err.message ? err.message : err));
  }
}
window.exportCurrentHtml = exportCurrentHtml;

async function triggerRakZipExport() {
  return exportCurrentHtml();
}
window.triggerRakZipExport = triggerRakZipExport;

document.getElementById("exportBtn")?.addEventListener("click", () => {
  exportCurrentHtml();
});
