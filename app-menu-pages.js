// RAK_NO_RETIRED_GAMES_17021
// RaK – běžné stránky menu oddělené od admin shellu.
try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('app-menu-pages.js', 'loaded', { source: 'dynamic-loader' }); } catch (err) {}

function buildAppMenuAboutHistoryHtml() {
  const sections = [
    // RAK_190_ABOUT_START
    {
      range: 'RaK 1.9',
      title: 'Rychlejší start bez změny funkcí a vzhledu',
      lines: [
        'První načtení je lehčí: dashboard, přihlášení, dnešní směna a údaj „kam jdu“ zůstávají v rychlém jádru, zatímco nepoužívané části se načtou až při otevření.',
        'Rotace, Kalkulačky, Více a Administrace si zachovávají oddělené moduly a vlastní zachycení chyb, takže porucha jedné volitelné části nezastaví celý RaK.',
        'Vzhled TESTu byl vrácen 1:1 k ověřené hlavní verzi včetně tabulek, formulářů, statistik, kalkulaček a administrace.',
        'Účty jiných směn nevidí Rotaci a mají dole tři stejně široké položky ve správném pořadí Home – Kalkulačky – Více.',
        'PWA cache a automatické kontroly hlídají úplnou výměnu verze, rychlost prvního načtení, offline start a vizuální regresi.'
      ]
    },
    // RAK_190_ABOUT_END
    // RAK_180_ABOUT_START
// RAK_181_ABOUT_COMPACT: RaK 1.8 keeps the same coverage in a shorter five-point user-facing summary.
    {
      range: 'RaK 1.8',
      title: 'Local-first, kalendáře a přesnější provoz',
      lines: [
        'RaK startuje skutečně local-first: Home, Rozpisy/Rotace, Kalkulačky i Více jsou dostupné hned z lokálních dat a online synchronizace je jen aktualizuje na pozadí.',
        'Rozpisy, absence a neplánované změny mají přesnější staffing a práci s Kalírnou; Administrace je rychlejší a na iPhonu přehlednější a kompaktnější.',
        'Dashboardový kalendář podporuje Obrábění i Kalírnu A–D, uložený výběr a legendu; bez aktivního zdroje zobrazí lokální prázdný měsíc bez Google cookie brány.',
        'Korekce Frézek a Brusů mají sjednocené mobilní ovládání. Offline/PWA, konflikty a zálohy mají přísnější diagnostiku, CAS ochranu a obnovu.',
        'Release pipeline hlídá reprodukovatelný build, mobilní Chromium, výkon proti pevné baseline a oddělení TESTu od produkce; opravy míří do skutečných vlastníků funkcí.'
      ]
    },
    // RAK_180_ABOUT_END
    {
      range: 'RaK 1.7',
      title: 'Stabilizace a local-first základ',
      lines: [
        'Rychlejší PWA s odolným offline startem, bezpečnějším přihlášením a synchronizací pracovních dat.',
        'Rozpisy, absence, pracovníci, správci a report směny dostaly sjednocenější mobilní ovládání a přesnější výrobní logiku.',
        'Kalkulačky korekcí, zálohy, diagnostika a regresní kontroly se výrazně rozšířily; odstraněné zbytky Her zůstaly pryč.',
        'Vznikl základ směnových kalendářů a účtového nastavení, na kterém navazuje generace 1.8.'
      ]
    },
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
      const displayVersion = String(window.RAK_RELEASE_VERSION || versionText || '1.9.0').trim();
      const displayParts = displayVersion.split('.');
      const aboutDisplayVersion = displayParts.length >= 2 ? displayParts.slice(0, 2).join('.') : displayVersion;
      body.innerHTML = [
        '<div class="appMenuCard">',
        '  <div class="appMenuCardTitle">O aplikaci</div>',
        '  <div class="appMenuVersion">' + escapeHtml(formatRakDisplayVersion(aboutDisplayVersion)) + '</div>',
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
      const calendarCard = typeof buildRakCalendarSelectionSettingsHtml === 'function' ? buildRakCalendarSelectionSettingsHtml() : '';
      const canChangePassword = typeof rakAdminCanOpenShiftReport === 'function' && rakAdminCanOpenShiftReport();
      const passwordCard = canChangePassword ? [
        '<details class="appMenuCard appMenuSettingsCard rakAccountPasswordCard">',
        '  <summary class="appMenuCardTitle">Heslo</summary>',
        '  <div class="smallText">Změníš pouze heslo svého aktuálního účtu. Minimálně 6 znaků.</div>',
        '  <div class="rakAccountPasswordGrid">',
        '    <label><span>Současné heslo</span><input class="appMenuInlineInput" type="password" autocomplete="current-password" data-admin-own-password="current"></label>',
        '    <label><span>Nové heslo</span><input class="appMenuInlineInput" type="password" autocomplete="new-password" minlength="6" maxlength="128" data-admin-own-password="new"></label>',
        '    <label><span>Nové heslo znovu</span><input class="appMenuInlineInput" type="password" autocomplete="new-password" minlength="6" maxlength="128" data-admin-own-password="confirm"></label>',
        '  </div>',
        '  <div class="smallText" id="rakAccountPasswordStatus" role="status" aria-live="polite"></div>',
        '  <button type="button" class="appMenuAction isActive" data-menu-action="change-account-password">Změnit moje heslo</button>',
        '</details>'
      ].join('') : '';
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
        calendarCard,
        passwordCard,
        privacyCard,
        performanceCard,
        themeCards,
        '<button type="button" class="appMenuAction appMenuBack appMenuStandaloneBack" data-menu-back="1">Zpět</button>'
      ].join('');
      if (typeof bindRakCalendarSelectionSettings === 'function') {
        try { bindRakCalendarSelectionSettings(body); } catch (err) {}
      }
      if (typeof renderThemeSettingsCards === 'function') {
        try { renderThemeSettingsCards(); } catch (err) {}
      }
    
}
