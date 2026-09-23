// RAK_NO_RETIRED_GAMES_17021
// RaK – běžné stránky menu oddělené od admin shellu.
try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('app-menu-pages.js', 'loaded', { source: 'dynamic-loader' }); } catch (err) {}

function buildAppMenuAboutHistoryHtml() {
  const sections = [
    // RAK_170_ABOUT_START
    {
      range: 'RaK 1.7',
      title: 'Výroba, bezpečnost a práce bez internetu',
      lines: [
        'Výrobní přehledy jsou přesnější: Kalírna se už nepočítá na původní stroj, osobní statistiky ukazují samostatné frézky a dvojici na soustruzích a report směny umí MO volné kusy i TTKW01/TTKW02.',
        'Úkoly MSKC01 se při obsazení jen MSKC03 + MSKC04 správně sdílí na oba soustruhy, včetně úkolů upravených v administraci.',
        'Přihlášení, role správců, pracovní zápisy, veřejná API a exporty mají přísnější serverové kontroly a oddělené soukromé údaje.',
        'Rotace se ukládá do odolné místní kopie a na ověřeném iPhonu se po úplném restartu načetla i bez internetu; při návratu online se porovnává revize, čas a obsah dat.',
        'Start a PWA jsou lehčí: proběhl úklid stylů, bezpečné odložené načítání, omezení zbytečných překreslení, optimalizace obrázků a pevné výkonové rozpočty.',
        'Report směny lze sdílet jako sjednocený text i obrázek a rozložení se přizpůsobuje množství výrobních údajů.',
        'Běžný ZIP export už nesmí převzít otevřený osobní nebo administrátorský obsah ze stránky a při chybě bezpečně skončí bez vytvoření archivu.',
        'Administrace má Úplnou zálohu RaK na jeden klik: ukládá přesný zdroj, nasazenou PWA, data a strukturu Supabase, sanitizovaný Auth přehled, Storage a návod k obnově.'
      ]
    },
    // RAK_170_ABOUT_END
    {
      range: 'RaK 1.6',
      title: 'Rychlejší, čistší a přesnější',
      lines: [
        'Start aplikace a aktualizace PWA jsou rychlejší a stabilnější; části aplikace se načítají až ve chvíli, kdy jsou potřeba.',
        'Korekce Brusů pracují samostatně pro 2 brusy, 3 indexy, C1/C2 a levou/pravou stranu protokolu – celkem 24 citlivostí.',
        'Dashboard a mobilní/iPhone rozložení prošly velkým úklidem starých překrývajících se stylů bez změny ověřeného vzhledu.',
        'Aplikace se rozdělila do menších modulů, odstranily se nepoužívané části a duplicity, takže se snáze a bezpečněji udržuje.'
      ]
    },
    {
      range: 'RaK 1.5',
      title: 'Účty, osobní směna a reporty',
      lines: [
        'Přihlášení si pamatuje uživatele a vzhled je uložený ke konkrétnímu účtu; Home ukazuje osobní směnu a pracovní informace.',
        'Rotace zobrazí poslední uložená data hned a synchronizuje je na pozadí; generátor hlídá návaznost měsíců a pravidla rozpisu.',
        'Přibyly reporty směny a dovolených, úkoly strojů, bezpečnější správa účtů a nový mobilní vzhled.'
      ]
    },
    {
      range: 'RaK 1.2',
      title: 'Administrace a generátor',
      lines: [
        'Výrazně se rozšířila administrace, generátor rozpisů, práce s absencemi a přesčasy, zálohy a chráněné ukládání se revizemi.',
        'Nastavení pracovníků, dovolených, provozních dnů, odkazů a dalších částí se přesunulo přímo do aplikace.'
      ]
    },
    {
      range: 'RaK 1.1',
      title: 'Online funkce a PWA',
      lines: [
        'Přibyly větší PWA/offline funkce, online synchronizace, statistiky a bezpečnostní i provozní kontroly.',
        'Vznikly základy přihlášení, osobního nastavení vzhledu a dalších pracovních online funkcí.'
      ]
    },
    {
      range: 'RaK 1.0 a začátky',
      title: 'Základ aplikace',
      lines: [
        'Vznikl základ Dashboardu, směnové logiky, Rotací, rozpisů a výrobních kalkulaček; postupně přibylo ukládání dat a první PWA základ.'
      ]
    }
  ];

  return [
    '<div class="appMenuHistory">',
    sections.map(section => [
      '<div class="appMenuHistoryGroup">',
      '  <div class="appMenuHistoryRange">' + escapeHtml(section.range) + '</div>',
      '  <div class="appMenuHistoryTitle">' + escapeHtml(section.title) + '</div>',
      '  <div class="appMenuHistoryList">' + (section.lines || []).map(line => '<div class="appMenuHistoryItem">' + escapeHtml(line) + '</div>').join('') + '</div>',
      '</div>'
    ].join('')).join(''),
    '</div>'
  ].join('');
}

// Legacy smoke marker: Testovací build: intentionally not rendered in O aplikaci.
function renderAppMenuAboutPage(body, versionText) {
      const displayVersion = String(window.RAK_RELEASE_VERSION || versionText || '1.7').trim();
      body.innerHTML = [
        '<div class="appMenuCard">',
        '  <div class="appMenuCardTitle">O aplikaci</div>',
        '  <div class="appMenuVersion">' + escapeHtml(formatRakDisplayVersion(displayVersion)) + '</div>',
        '  <div class="appMenuText">RaK spojuje pracovní rotace, osobní směnu, výrobní úkoly, směnové reporty, dovolené a dílenské kalkulačky do jedné instalovatelné aplikace.</div>',
        '  ' + buildAppMenuAboutHistoryHtml(),
        '  <button type="button" class="appMenuAction appMenuBack" data-menu-back="1">Zpět</button>',
        '</div>'
      ].join('');
      if (typeof renderThemeSettingsCards === 'function') {
        try { renderThemeSettingsCards(); } catch (err) {}
      }
    
}

function renderAppMenuContactPage(body, versionText) {
      bindAppMenuHandlers(body);
      const contact = typeof getRakAppContactSettings === 'function'
        ? getRakAppContactSettings()
        : { name: 'Martin Špadrna', phone: '+420 773 682 499', email: 'martinspadrna@gmail.com' };
      const contactPhoneHref = typeof getRakAppContactPhoneHref === 'function' ? getRakAppContactPhoneHref(contact) : '';
      const contactEmailHref = typeof getRakAppContactEmailHref === 'function' ? getRakAppContactEmailHref(contact) : '';
      body.innerHTML = [
        '<div class="appMenuCard">',
        '  <div class="appMenuCardTitle">Kontakt</div>',
        '',
        '  <div class="appMenuContactRow"><span>Jméno</span><b>' + escapeHtml(contact.name) + '</b></div>',
        '  <div class="appMenuContactRow"><span>Telefon</span>' + (contactPhoneHref ? '<a class="appMenuContactLink" href="' + escapeHtml(contactPhoneHref) + '">' + escapeHtml(contact.phone) + '</a>' : '<b>' + escapeHtml(contact.phone) + '</b>') + '</div>',
        '  <div class="appMenuContactRow"><span>E-mail</span>' + (contactEmailHref ? '<a class="appMenuContactLink" href="' + escapeHtml(contactEmailHref) + '">' + escapeHtml(contact.email) + '</a>' : '<b>' + escapeHtml(contact.email) + '</b>') + '</div>',
        '  <button type="button" class="appMenuAction appMenuBack" data-menu-back="1">Zpět</button>',
        '</div>'
      ].join('');
    
}

function renderAppMenuSettingsPage(body, versionText) {
      bindAppMenuHandlers(body);
      const profileCard = buildRakProfileSettingsHtml();
      const privacyCard = [
        '<details class="appMenuCard appMenuSettingsCard">',
        '  <summary class="appMenuCardTitle">Soukromí a data</summary>',
        '  <div class="appMenuText">RaK nepoužívá reklamní cookies ani rutinní sledování používání. Při běžném používání neodesílá přehled připojených zařízení ani navštívené části aplikace.</div>',
        '  <div class="appMenuText smallText">V tomto zařízení zůstává jen profil pro zapamatování přihlášení (jméno a osobní číslo), nastavení a poslední data potřebná pro práci bez internetu. Profil smažeš tlačítkem Odhlásit.</div>',
        '  <div class="appMenuText smallText">Pracovní data se synchronizují do RaK databáze. Pokud odešleš report chyby, přidá se k němu verze aplikace a základní technické údaje nutné k opravě.</div>',
        '</details>'
      ].join('');
      const performanceCard = typeof buildRakDevicePerformanceSettingsHtml === 'function' ? buildRakDevicePerformanceSettingsHtml() : '';
      const themeCards = buildThemeSystemSettingsHtml();
      body.innerHTML = [
        profileCard,
        privacyCard,
        performanceCard,
        themeCards,
        '<button type="button" class="appMenuAction appMenuBack appMenuStandaloneBack" data-menu-back="1">Zpět</button>'
      ].join('');
      if (typeof renderThemeSettingsCards === 'function') {
        try { renderThemeSettingsCards(); } catch (err) {}
      }
    
}
