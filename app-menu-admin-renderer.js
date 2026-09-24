// RaK – renderer administračních stránek.
try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('app-menu-admin-renderer.js', 'loaded', { source: 'dynamic-loader' }); } catch (err) {}

function renderAdminMenuBody(body, section) {
  // RAK_REPORT_ONLY_DEPUTY_17019
  if (!(typeof rakAdminCanOpenAdmin === 'function' && rakAdminCanOpenAdmin())) {
    if (body) body.innerHTML = '<div class="appMenuCard">Administrace není přístupná.<button type="button" class="appMenuAction" data-menu-back="1">Zpět</button></div>';
    return;
  }
  const mode = String(section || 'home').trim() || 'home';
  const months = getAdminRotationMonthKeys();
  const monthKey = getAdminSelectedMonthKey();
  body.dataset.adminView = mode;
  try { adminSetRotationViewportLock(mode === 'rotation'); } catch (err) {}
  const page = document.getElementById('menu');
  if (page) page.dataset.adminView = mode;

  const adminServiceActions = [
    { action: 'open-service', label: 'Servis / synchronizace' }
  ];
  const adminServiceDetail = (typeof rakAdminCanManageAdmins === 'function' && rakAdminCanManageAdmins())
    ? 'Reporty, synchronizace, aktualizace a správa adminů.'
    : 'Reporty, synchronizace a aktualizace. Hesla a další adminy spravuje jen hlavní admin.';
  if (typeof rakAdminCanManageAdmins === 'function' && rakAdminCanManageAdmins()) {
    adminServiceActions.unshift({ action: 'open-admin-accounts', label: 'Správci' });
    adminServiceActions.push({ action: 'open-settings-backups', label: 'Zálohy nastavení' });
  }

  // RAK_ADMIN_COMPACT_17022
  const adminCompactOpenGroup = typeof app !== 'undefined' && app ? String(app.adminCompactOpenGroup || '') : '';
  const homeHtml = [
    '<div class="appMenuCard appMenuAdminCard adminCompactHome">',
    '  <div class="appMenuCardTitle">Administrace</div>',
    '  <div class="appMenuText">',
    '    <div>Nejčastější úkony najdeš hned nahoře. Ostatní možnosti rozbal podle tématu.</div>',
    '    <div class="smallText" id="adminOnlineSaveStatus">Změny se ukládají až tlačítkem Uložit v konkrétní sekci.</div>',
    '  </div>',
    '  <div class="appMenuSubTitle">Rychlý přístup</div>',
    '  <div class="adminCompactQuickGrid">',
    '    <button type="button" class="appMenuAction isActive" data-admin-action="open-rotation">Rozpisy</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="open-workers">Pracovníci</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="open-machines">Nastavení strojů</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="open-reports">Reporty chyb</button>',
    '  </div>',
    '  <div class="appMenuSubTitle">Všechny možnosti</div>',
    '  <div class="adminMenuSections">',
    buildAdminMenuSectionHtml('Rozpisy a směny', 'Rozpis, lidé, generátor, historie a soubory.', [
      { action: 'open-rotation', label: 'Rozpisy' },
      { action: 'open-workers', label: 'Pracovníci' },
      { action: 'open-generator-settings', label: 'Pravidla generátoru' },
      { action: 'open-machine-tasks', label: 'Úkoly podle stroje' },
      { action: 'open-change-log', label: 'Historie změn' },
      { action: 'open-backups', label: 'Zálohy rozpisů' },
      { action: 'open-export', label: 'Export / import' }
    ], { open: false }),
    buildAdminMenuSectionHtml('Provoz a absence', 'Stroje, časy, přesčasy a volné dny.', [
      { action: 'open-machines', label: 'Nastavení strojů' },
      { action: 'open-correction-settings', label: 'Nastavení korekcí' },
      { action: 'open-food', label: 'Kantýna / jídelna' },
      { action: 'open-overtime', label: 'Přesčasy' },
      { action: 'open-vacation', label: 'Dovolená / odstávky' },
      { action: 'open-special-days', label: 'Mimořádné volné dny' }
    ], { open: false }),
    buildAdminMenuSectionHtml('Informace pro zaměstnance', 'Co se zobrazuje v běžné aplikaci.', [
      { action: 'open-announcement', label: 'Oznámení Dashboard' },
      { action: 'open-calendars', label: 'Kalendáře' },
      { action: 'open-external-links', label: 'Odkazy' }
    ].concat((typeof rakAdminCanManageAdmins === 'function' && rakAdminCanManageAdmins()) ? [{ action: 'open-app-contact', label: 'Kontakt aplikace' }] : []).concat([
      { action: 'open-payroll-settings', label: 'Výplata' }
    ]), { open: false }),
    buildAdminMenuSectionHtml('Správa a servis', adminServiceDetail, [
      { action: 'open-reports', label: 'Reporty chyb' }
    ].concat(adminServiceActions), { open: false }),
    '  </div>',
    '  <button type="button" class="appMenuAction appMenuBack" data-menu-back="1">Zpět</button>',
    '</div>'
  ].join('');

  const calendarNotePrefs = typeof getRakCalendarNotesSettings === 'function' ? getRakCalendarNotesSettings() : {};
  const calendarNoteButtons = (typeof RAK_CALENDAR_NOTE_DEFS !== 'undefined' ? RAK_CALENDAR_NOTE_DEFS : [])
    .map(def => '<button type="button" class="appMenuAction appMenuSettingBtn" data-admin-action="toggle-calendar-note" data-calendar-note-id="' + escapeHtml(def.id) + '">' + (calendarNotePrefs[def.id] ? '✓ ' : '') + escapeHtml(def.label) + '</button>')
    .join('');
  const machinesHtml = [
    '<div class="appMenuCard appMenuAdminCard adminMachinesCard">',
    '  <div class="appMenuCardTitle">Nastavení strojů</div>',
    '  <div class="appMenuText">',
    '    <div>Každý stroj je jeden řádek. U brusů se zapisuje stroj + index + parametry.</div>',
    '    <div class="smallText" id="adminOnlineSaveStatus">Stav uložení se zobrazí po kliknutí na Uložit stroje.</div>',
    '  </div>',
    buildAdminMachineSettingsTableHtml(),
    '  <div class="appMenuActionRow">',
    '    <button type="button" class="appMenuAction" data-admin-action="load-machines">Načíst online</button>',
    '    <button type="button" class="appMenuAction isActive" data-admin-action="save-machines">Uložit stroje</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="back-admin">Zpět</button>',
    '  </div>',
    '</div>'
  ].join('');

  const foodHtml = [
    '<div class="appMenuCard appMenuAdminCard adminFoodScheduleCard">',
    '  <div class="appMenuCardTitle">Kantýna / jídelna</div>',
    '  <div class="appMenuText">',
    '    <div>Tady si nastavíš běžnou otevírací dobu a přesčasovou dobu kantýny/jídelny. Které neděle jsou přesčasové se nastavuje v Provoz / Přesčasy.</div>',
    '    <div class="smallText" id="adminOnlineSaveStatus">Stav uložení se zobrazí po kliknutí na Uložit časy.</div>',
    '  </div>',
    buildAdminFoodScheduleSettingsHtml(),
    '  <div class="appMenuActionRow">',
    '    <button type="button" class="appMenuAction" data-admin-action="load-food-schedule">Načíst online</button>',
    '    <button type="button" class="appMenuAction isActive" data-admin-action="save-food-schedule">Uložit časy</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="back-admin">Zpět</button>',
    '  </div>',
    '</div>'
  ].join('');

  const vacationHtml = [
    '<div class="appMenuCard appMenuAdminCard adminVacationCountdownCard">',
    '  <div class="appMenuCardTitle">Dovolená / odstávky</div>',
    '  <div class="appMenuText">',
    '    <div>Tady nastavíš období od-do včetně hodin. Home karta Dovolená bere nejbližší nadcházející řádek a během zadaného období se směna bere jako volno.</div>',
    '    <div class="smallText" id="adminOnlineSaveStatus">Prázdné řádky se neukládají. Pro odstranění řádek vymaž a ulož.</div>',
    '  </div>',
    buildAdminVacationCountdownSettingsHtml(),
    '  <div class="appMenuActionRow">',
    '    <button type="button" class="appMenuAction" data-admin-action="load-vacation-countdown">Načíst online</button>',
    '    <button type="button" class="appMenuAction isActive" data-admin-action="save-vacation-countdown">Uložit dovolenou</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="back-admin">Zpět</button>',
    '  </div>',
    '</div>'
  ].join('');

  const specialDaysHtml = [
    '<div class="appMenuCard appMenuAdminCard adminSpecialDaysCard">',
    '  <div class="appMenuCardTitle">Mimořádné volné dny</div>',
    '  <div class="appMenuText">',
    '    <div>Tady doplníš jednorázové svátky, odstávky nebo jiné dny bez práce. Vestavěné české svátky zůstávají automatické.</div>',
    '    <div class="smallText" id="adminOnlineSaveStatus">Prázdné řádky se neukládají. Pro odstranění řádek vymaž a ulož.</div>',
    '  </div>',
    buildAdminSpecialDaysSettingsHtml(),
    '  <div class="appMenuActionRow">',
    '    <button type="button" class="appMenuAction" data-admin-action="load-special-days">Načíst online</button>',
    '    <button type="button" class="appMenuAction isActive" data-admin-action="save-special-days">Uložit volné dny</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="back-admin">Zpět</button>',
    '  </div>',
    '</div>'
  ].join('');

  const rotationHtml = [
    '<div class="appMenuCard appMenuAdminCard">',
    '  <div class="appMenuCardTitle">Rozpisy</div>',
    '  <div class="appMenuText">',
    '    <div>Vyber měsíc, nejdřív doplň absence / svátek / odstávku a až potom vygeneruj návrh. Změny jdou online až po kliknutí na Uložit rozpis.</div>',
    '    <div class="smallText" id="adminOnlineSaveStatus">Před generováním zkontroluj absence a dny měsíce. Stav uložení se zobrazí po kliknutí na Uložit rozpis.</div>',
    '  </div>',
    renderAdminMonthPickerHtml(monthKey),
    '  <select id="adminMonthSelect" class="appMenuSelect appMenuHiddenSelect">' + months.map(m => '<option value="' + escapeHtml(m) + '"' + (m === monthKey ? ' selected' : '') + '>' + escapeHtml(m) + '</option>').join('') + '</select>',
    '  <div class="appMenuActionRow">',
    '    <button type="button" class="appMenuAction" data-admin-action="load-month">Načíst měsíc</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="generate-rotation">Vygenerovat návrh</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="load-online">Načíst online</button>',
    '    <button type="button" class="appMenuAction isActive" data-admin-action="save-rotation">Uložit rozpis</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="back-admin">Zpět</button>',
    '  </div>',
    (typeof buildAdminStatsAnomalyHtml === 'function' ? buildAdminStatsAnomalyHtml((typeof parseMonthKey === 'function' && parseMonthKey(monthKey) ? parseMonthKey(monthKey).year : new Date().getFullYear())) : ''),
    buildAdminRotationTableHtml(monthKey),
    '</div>'
  ].join('');

  const overtimeHtml = [
    '<div class="appMenuCard appMenuAdminCard adminRotationOvertimeCard">',
    '  <div class="appMenuCardTitle">Přesčasy</div>',
    '  <div class="appMenuText">',
    '    <div>Tady si spravuješ přesčasové neděle pro rozpisy a statistiky. Přepínač TO říká, jestli jde přesčas na tvrdotu.</div>',
    '    <div class="smallText" id="adminOnlineSaveStatus">Změny se uloží přes stávající nastavení strojů, bez změny databáze.</div>',
    '  </div>',
    buildAdminRotationOvertimeSettingsHtml(),
    '  <div class="appMenuActionRow">',
    '    <button type="button" class="appMenuAction" data-admin-action="load-overtime-settings">Načíst online</button>',
    '    <button type="button" class="appMenuAction isActive" data-admin-action="save-overtime-settings">Uložit přesčasy</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="back-admin">Zpět</button>',
    '  </div>',
    '</div>'
  ].join('');

  const generatorSettingsHtml = [
    '<div class="appMenuCard appMenuAdminCard adminGeneratorSettingsCard">',
    '  <div class="appMenuCardTitle">Pravidla generátoru</div>',
    '  <div class="appMenuText">',
    '    <div>Tady nastavuješ pořadí lidí a strojů, podle kterých se skládá nový návrh rozpisu. Bez uložené změny zůstávají původní pravidla.</div>',
    '    <div class="smallText" id="adminOnlineSaveStatus">Upravuj opatrně: změny se projeví až při dalším vygenerování návrhu.</div>',
    '  </div>',
    buildAdminRotationGeneratorSettingsHtml(),
    '  <div class="appMenuActionRow">',
    '    <button type="button" class="appMenuAction" data-admin-action="load-generator-settings">Načíst online</button>',
    '    <button type="button" class="appMenuAction isActive" data-admin-action="save-generator-settings">Uložit pravidla</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="back-admin">Zpět</button>',
    '  </div>',
    '</div>'
  ].join('');

  const machineTasksHtml = [
    '<div class="appMenuCard appMenuAdminCard adminMachineTasksCard">',
    '  <div class="appMenuCardTitle">Úkoly podle stroje</div>',
    '  <div class="appMenuText">',
    '    <div>Tady nastavíš, co se zobrazí pracovníkovi po trojkliku na jeho stroj v příští směně v Rotacích.</div>',
    '    <div class="smallText" id="adminOnlineSaveStatus">Běžné úkoly platí vždy; ranní a noční se k nim pouze přidají.</div>',
    '  </div>',
    (typeof buildAdminMachineTasksSettingsHtml === 'function' ? buildAdminMachineTasksSettingsHtml() : '<div class="smallText">Nastavení úkolů se načítá…</div>'),
    '  <div class="appMenuActionRow">',
    '    <button type="button" class="appMenuAction" data-admin-action="load-machine-tasks">Načíst online</button>',
    '    <button type="button" class="appMenuAction isActive" data-admin-action="save-machine-tasks">Uložit úkoly</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="back-admin">Zpět</button>',
    '  </div>',
    '</div>'
  ].join('');

  const correctionSettingsHtml = [
    '<div class="appMenuCard appMenuAdminCard adminFhbCalibrationCard">',
    '  <div class="appMenuCardTitle">Nastavení korekcí</div>',
    '  <div class="appMenuText">',
    '    <div>MFK / FHB: z měření před a po korekci ověříš, jestli kalkulačka odpovídá skutečné reakci stroje.</div>',
    '    <div class="smallText" id="adminOnlineSaveStatus">Výpočet se změní až po ručním potvrzení doporučení.</div>',
    '  </div>',
    (typeof buildAdminFhbCorrectionCalibrationHtml === 'function' ? buildAdminFhbCorrectionCalibrationHtml() : '<div class="smallText">Nastavení korekcí se načítá…</div>'),
    '  <button type="button" class="appMenuAction appMenuBack" data-admin-action="back-admin">Zpět</button>',
    '</div>'
  ].join('');

  const workersHtml = [
    '<div class="appMenuCard appMenuAdminCard adminWorkerRosterCard">',
    '  <div class="appMenuCardTitle">Pracovníci</div>',
    '  <div class="appMenuText">',
    '    <div>Tady nastavíš pracovníky pro rozpis a statistiky i samostatné účty pouze pro aplikaci.</div>',
    '    <div class="smallText" id="adminOnlineSaveStatus">Prázdné řádky se neukládají. Pro odebrání jméno smaž a ulož.</div>',
    '  </div>',
    typeof buildAdminWorkerRosterSettingsHtml === 'function' ? buildAdminWorkerRosterSettingsHtml() : '',
    '  <div class="appMenuActionRow">',
    '    <button type="button" class="appMenuAction" data-admin-action="load-workers">Načíst online</button>',
    '    <button type="button" class="appMenuAction isActive" data-admin-action="save-workers">Uložit pracovníky</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="back-admin">Zpět</button>',
    '  </div>',
    '</div>'
  ].join('');

  const changeLogHtml = [
    '<div class="appMenuCard appMenuAdminCard adminChangeLogCard">',
    '  <div class="appMenuCardTitle">Historie změn</div>',
    '  <div class="appMenuText">',
    '    <div>Kdo a kdy uložil dovolenou, přesčasy nebo rozpis.</div>',
    '    <div class="smallText" id="adminOnlineSaveStatus">Zaznamenává se automaticky při ukládání, nic tady sám neupravuješ.</div>',
    '  </div>',
    typeof buildAdminChangeLogHtml === 'function' ? buildAdminChangeLogHtml() : '',
    '  <div class="appMenuActionRow">',
    '    <button type="button" class="appMenuAction" data-admin-action="load-change-log">Načíst online</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="back-admin">Zpět</button>',
    '  </div>',
    '</div>'
  ].join('');

  const adminAccountsCanManage = typeof rakAdminCanManageAdmins === 'function' && rakAdminCanManageAdmins();
  const adminAccountsHtml = [
    '<div class="appMenuCard appMenuAdminCard adminAccountsCard">',
    '  <div class="appMenuCardTitle">Správci</div>',
    '  <div class="appMenuText">',
    '    <div>' + (adminAccountsCanManage ? 'Tady hlavní admin nastaví další admin účty.' : 'Tady můžeš zkontrolovat správce a změnit pouze svoje heslo.') + ' Běžní uživatelé tuhle sekci neuvidí.</div>',
    '    <div class="smallText" id="adminOnlineSaveStatus">' + (adminAccountsCanManage ? 'Heslo nech prázdné, pokud ho nechceš měnit. Pro odebrání správce klikni na × u řádku a ulož.' : 'Hesla jsou v přehledu vždy skrytá. Hlavní admin a ostatní účty nejdou z tohoto účtu měnit.') + '</div>',
    '  </div>',
    buildAdminAccountsSettingsHtml(),
    (typeof buildAdminOwnerPasswordHtml === 'function' ? buildAdminOwnerPasswordHtml() : ''),
    '  <div class="appMenuActionRow">',
    '    <button type="button" class="appMenuAction" data-admin-action="load-admin-accounts">Načíst online</button>',
    (adminAccountsCanManage ? '    <button type="button" class="appMenuAction isActive" data-admin-action="save-admin-accounts">Uložit správce</button>' : ''),
    '    <button type="button" class="appMenuAction" data-admin-action="back-admin">Zpět</button>',
    '  </div>',
    '</div>'
  ].join('');

  const calendarsHtml = [
    '<div class="appMenuCard appMenuAdminCard adminShiftCalendarsCard">',
    '  <div class="appMenuCardTitle">Kalendáře podle směny</div>',
    '  <div class="appMenuText">',
    '    <div>Dashboard zobrazí jen kalendář nebo výběr kalendářů směny přihlášeného člověka. Lidé v Rozpisu používají směnu D; u účtů mimo Rozpis se směna A/B/C/D nastavuje v Administraci → Pracovníci.</div>',
    '    <div class="smallText" id="adminOnlineSaveStatus">Povoleny jsou jen veřejně vložitelné Google Calendar embed odkazy. Soukromé ICS adresy s privátním tokenem se neukládají.</div>',
    '  </div>',
    (typeof buildAdminShiftCalendarsSettingsHtml === 'function' ? buildAdminShiftCalendarsSettingsHtml() : ''),
    '  <div class="appMenuActionRow">',
    '    <button type="button" class="appMenuAction" data-admin-action="load-calendars">Načíst online</button>',
    '    <button type="button" class="appMenuAction isActive" data-admin-action="save-calendars">Uložit kalendáře</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="back-admin">Zpět</button>',
    '  </div>',
    '</div>',
    '<div class="appMenuCard appMenuAdminCard adminCalendarNotesCard">',
    '  <div class="appMenuCardTitle">Upozornění v kalendáři</div>',
    '  <div class="appMenuText"><div>Platí pro všechny - zapíná/vypíná se pro celou appku, ne jen pro tohle zařízení.</div></div>',
    '  <div class="appMenuSettingsList appMenuSettingsGrid">',
    calendarNoteButtons,
    '  </div>',
    '</div>'
  ].join('');

  const externalLinksHtml = [
    '<div class="appMenuCard appMenuAdminCard adminExternalLinksCard">',
    '  <div class="appMenuCardTitle">Odkazy</div>',
    '  <div class="appMenuText">',
    '    <div>Tady nastavíš odkazy na jídelní lístek, Eportal a výplatní portál. Směnové kalendáře mají vlastní sekci Kalendáře.</div>',
    '    <div class="smallText" id="adminOnlineSaveStatus">Bez uložené změny zůstávají původní odkazy.</div>',
    '  </div>',
    buildAdminExternalLinksSettingsHtml(),
    '  <div class="appMenuActionRow">',
    '    <button type="button" class="appMenuAction" data-admin-action="load-external-links">Načíst online</button>',
    '    <button type="button" class="appMenuAction isActive" data-admin-action="save-external-links">Uložit odkazy</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="back-admin">Zpět</button>',
    '  </div>',
    '</div>'
  ].join('');

  const appContactHtml = [
    '<div class="appMenuCard appMenuAdminCard adminAppContactCard">',
    '  <div class="appMenuCardTitle">Kontakt aplikace</div>',
    '  <div class="appMenuText">',
    '    <div>Tady nastavíš jméno, telefon a e-mail, které se zobrazují v menu Kontakt.</div>',
    '    <div class="smallText" id="adminOnlineSaveStatus">Bez uložené změny zůstanou původní údaje.</div>',
    '  </div>',
    buildAdminAppContactSettingsHtml(),
    '  <div class="appMenuActionRow">',
    '    <button type="button" class="appMenuAction" data-admin-action="load-app-contact">Načíst online</button>',
    '    <button type="button" class="appMenuAction isActive" data-admin-action="save-app-contact">Uložit kontakt</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="back-admin">Zpět</button>',
    '  </div>',
    '</div>'
  ].join('');

  const payrollSettingsHtml = [
    '<div class="appMenuCard appMenuAdminCard adminPayrollSettingsCard">',
    '  <div class="appMenuCardTitle">Výplata</div>',
    '  <div class="appMenuText">',
    '    <div>Tady nastavíš, podle kterého pracovního dne v měsíci se počítá karta Výplata, a případné ruční výjimky.</div>',
    '    <div class="smallText" id="adminOnlineSaveStatus">Bez uložené změny zůstává pravidlo 4. pracovní den v měsíci.</div>',
    '  </div>',
    buildAdminPayrollSettingsHtml(),
    '  <div class="appMenuActionRow">',
    '    <button type="button" class="appMenuAction" data-admin-action="load-payroll-settings">Načíst online</button>',
    '    <button type="button" class="appMenuAction isActive" data-admin-action="save-payroll-settings">Uložit výplatu</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="back-admin">Zpět</button>',
    '  </div>',
    '</div>'
  ].join('');

  const backupsHtml = [
    '<div class="appMenuCard appMenuAdminCard adminRotationBackupsCard">',
    '  <div class="appMenuCardTitle">Zálohy rozpisů</div>',
    '  <div class="appMenuText">',
    '    <div>Tady jsou poslední online zálohy, které vznikly před přepsáním rozpisu. Obnova přepíše aktuální rozpis a současný stav si předtím ještě uloží jako novou zálohu.</div>',
    '    <div class="smallText" id="adminOnlineSaveStatus">Načti zálohy a vyber, kterou chceš obnovit.</div>',
    '  </div>',
    buildAdminRotationBackupStatusHtml(),
    buildAdminRotationBackupsHtml(),
    '  <div class="appMenuSubTitle uMt12">Automatické zálohy</div>',
    buildRotationSaveBackupsHtml(),
    '  <div class="appMenuActionRow">',
    '    <button type="button" class="appMenuAction" data-admin-action="load-rotation-backups">Načíst zálohy</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="open-rotation">Zpět na rozpisy</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="back-admin">Zpět</button>',
    '  </div>',
    '</div>'
  ].join('');

  const fullSettingsBackupsHtml = [
    '<div class="appMenuCard appMenuAdminCard adminFullSettingsBackupsCard">',
    '  <div class="appMenuCardTitle">Zálohy nastavení</div>',
    '  <div class="appMenuText">',
    '    <div>Tady si hlavní admin vytvoří bod návratu pro všechna online nastavení aplikace. "Vytvořit a stáhnout" uloží zálohu online do Supabase a zároveň ji stáhne jako JSON soubor, "Vytvořit zálohu (jen online)" ji uloží jen do Supabase bez stažení.</div>',
    '    <div class="smallText">Obnovit lze dvěma způsoby: online ze Supabase (vyber řádek v seznamu níže a klikni Obnovit), nebo nahráním souboru z telefonu (tlačítko Obnovit ze souboru).</div>',
    '    <div class="smallText" id="adminOnlineSaveStatus">Vytvořit, nahrát nebo obnovit může jen hlavní admin účet.</div>',
    '  </div>',
    '<div class="appMenuCard adminCompleteRakBackupPanel">',
    '  <div class="appMenuCardTitle">Úplná záloha RaK</div>',
    '  <div class="appMenuText"><div>Jeden ZIP pro obnovu celé aplikace: přesný Git zdroj, skutečně nasazená PWA, aktuální data Supabase, DB struktura/RLS/RPC a Storage.</div><div class="smallText">Hesla, aktivní relace a tajné klíče se z bezpečnostních důvodů nezahrnují. Při obnově se vytvoří znovu.</div><div class="smallText" id="adminCompleteBackupStatus">Připraveno k vytvoření úplné zálohy.</div></div>',
    '  <div class="appMenuActionRow"><button type="button" class="appMenuAction isActive" data-admin-action="create-complete-rak-backup">Stáhnout úplnou zálohu RaK (.zip)</button></div>',
    '</div>',
    buildAdminFullSettingsBackupStatusHtml(),
    buildAdminFullSettingsBackupsHtml(),
    '  <div class="appMenuActionRow">',
    '    <button type="button" class="appMenuAction" data-admin-action="load-full-settings-backups">Načíst online</button>',
    (typeof rakAdminCanManageAdmins === 'function' && rakAdminCanManageAdmins() ? '    <button type="button" class="appMenuAction" data-admin-action="restore-full-settings-backup-from-file">Obnovit ze souboru (telefon)</button>' : ''),
    (typeof rakAdminCanManageAdmins === 'function' && rakAdminCanManageAdmins() ? '    <button type="button" class="appMenuAction isActive" data-admin-action="create-full-settings-backup">Vytvořit a stáhnout</button>' : ''),
    (typeof rakAdminCanManageAdmins === 'function' && rakAdminCanManageAdmins() ? '    <button type="button" class="appMenuAction" data-admin-action="create-full-settings-backup-online">Vytvořit zálohu (jen online)</button>' : ''),
    '    <button type="button" class="appMenuAction" data-admin-action="back-admin">Zpět</button>',
    '  </div>',
    '</div>'
  ].join('');

  const handoverHtml = [
    '<div class="appMenuCard appMenuAdminCard adminHandoverCard">',
    '  <div class="appMenuCardTitle">Předání správy</div>',
    '  <div class="appMenuText">',
    '    <div>Krátký postup pro člověka, který bude aplikaci spravovat: provoz, rozpis, veřejná část a závěrečná kontrola.</div>',
    '    <div class="smallText" id="adminOnlineSaveStatus">Všechny kroky vedou jen do administrace. Běžná aplikace se odsud nemění bez uložení v konkrétní sekci.</div>',
    '  </div>',
    buildAdminPermissionStatusHtml(),
    buildAdminAccessRulesHtml(),
    buildAdminHandoverTodoHtml(monthKey),
    buildAdminHandoverReadinessHtml(monthKey),
    buildAdminPostSaveCheckHtml(),
    buildAdminHandoverAuditHtml(monthKey),
    buildAdminMonthlyWorkflowHtml(monthKey),
    buildAdminHandoverChecklistHtml(monthKey),
    buildAdminHandoverRunbookHtml(monthKey),
    '  <div class="appMenuActionRow">',
    '    <button type="button" class="appMenuAction isActive" data-admin-action="download-handover-package">Stáhnout balíček</button>',
    '    <button type="button" class="appMenuAction isActive" data-admin-action="download-handover-todo">Stáhnout úkoly</button>',
    '    <button type="button" class="appMenuAction isActive" data-admin-action="download-handover-status">Stáhnout stav</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="download-monthly-workflow">Stáhnout postup</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="load-machines">Načíst online</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="back-admin">Zpět</button>',
    '  </div>',
    '</div>'
  ].join('');

  const monthlyWorkflowHtml = [
    '<div class="appMenuCard appMenuAdminCard adminMonthlyWorkflowCard">',
    '  <div class="appMenuCardTitle">Měsíční postup</div>',
    '  <div class="appMenuText">',
    '    <div>Stručný postup pro člověka, který každý měsíc jen načte data, doplní provoz a absence, vygeneruje rozpis, uloží ho a ověří synchronizaci.</div>',
    '    <div class="smallText" id="adminOnlineSaveStatus">Tahle obrazovka sama nic nemění. Každé tlačítko jen otevře odpovídající admin sekci.</div>',
    '  </div>',
    buildAdminMonthlyWorkflowHtml(monthKey),
    '  <div class="appMenuActionRow">',
    '    <button type="button" class="appMenuAction isActive" data-admin-action="download-monthly-workflow">Stáhnout postup</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="open-rotation">Rozpisy</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="open-handover">Předání správy</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="back-admin">Zpět</button>',
    '  </div>',
    '</div>'
  ].join('');

  const manualHtml = [
    '<div class="appMenuCard appMenuAdminCard adminManualCard">',
    '  <div class="appMenuCardTitle">Příručka správce</div>',
    '  <div class="appMenuText">',
    '    <div>Rychlý návod pro člověka, který bude v aplikaci jen doplňovat dovolené, přesčasy, rozpisy a provozní údaje.</div>',
    '    <div class="smallText" id="adminOnlineSaveStatus">Tahle stránka sama nic nemění. Každé tlačítko jen otevře odpovídající admin sekci.</div>',
    '  </div>',
    buildAdminManualHtml(monthKey),
    '  <div class="appMenuActionRow">',
    '    <button type="button" class="appMenuAction isActive" data-admin-action="download-admin-manual">Stáhnout příručku</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="open-handover">Předání správy</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="back-admin">Zpět</button>',
    '  </div>',
    '</div>'
  ].join('');

  const settingsMapHtml = [
    '<div class="appMenuCard appMenuAdminCard adminSettingsMapCard">',
    '  <div class="appMenuCardTitle">Kde co upravit</div>',
    '  <div class="appMenuText">',
    '    <div>Mapa správy pro člověka, který bude aplikaci udržovat. Ukazuje, kde se která věc mění a kde se projeví.</div>',
    '    <div class="smallText" id="adminOnlineSaveStatus">Tahle obrazovka sama nic neukládá. Jen otevírá existující admin sekce.</div>',
    '  </div>',
    buildAdminSettingsMapHtml(),
    '  <div class="appMenuActionRow">',
    '    <button type="button" class="appMenuAction isActive" data-admin-action="download-settings-map">Stáhnout mapu</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="open-admin-manual">Příručka správce</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="back-admin">Zpět</button>',
    '  </div>',
    '</div>'
  ].join('');

  const announcementHtml = buildAdminAnnouncementHtml();
  const importPreview = (typeof getRakExcelImportPreview === 'function') ? getRakExcelImportPreview() : null;
  const rotationExcelMonthOptions = buildRakRotationExcelExportMonthOptions(monthKey);
  const exportHtml = [
    '<div class="appMenuCard appMenuAdminCard">',
    '  <div class="appMenuCardTitle">Export / import</div>',
    '  <div class="appMenuText">',
    '    <div>Import funguje ve dvou krocích: vybereš Excel, appka načte jen měsíční listy typu 01.2025 a potom si vybereš celý rok nebo konkrétní měsíc. Pomocné listy se ignorují.</div>',
    '    <div class="smallText" id="rakExcelImportStatus">XLSX rozpis stáhne jen vybraný měsíc v kopírovacím layoutu. Export celé appky je přesunutý do Kontrola a servis.</div>',
    '  </div>',
    '  <div class="appMenuSettingsList">',
    '    <div class="appMenuSubTitle">XLSX rozpis pro kopírování</div>',
    '    <div class="smallText">Stejný export jako v generátoru: Tvrdota v A:F, Měkota pod ní v A:F a Absence od H dál po pracovních dnech.</div>',
    '    <label class="appMenuFieldLabel" for="rakRotationExcelExportMonth">Měsíc rozpisu</label>',
    '    <select id="rakRotationExcelExportMonth" class="appMenuSelect">' + rotationExcelMonthOptions + '</select>',
    '    <button type="button" class="appMenuAction" data-admin-action="admin-download-rotation-excel">Stáhnout Excel rozpisu</button>',
    '    <div class="appMenuSubTitle">Import rozpisů z Excelu</div>',
    '    <div class="smallText" id="rakExcelImportFileStatus">' + escapeHtml(importPreview ? ('Načteno: ' + importPreview.fileName + ' · měsíčních listů: ' + importPreview.monthKeys.length) : 'Zatím není vybraný žádný Excel.') + '</div>',
    '    <button type="button" class="appMenuAction" data-admin-action="excel-pick">Vybrat Excel</button>',
    '    <label class="appMenuFieldLabel" for="rakExcelImportScope">Co importovat</label>',
    '    <select id="rakExcelImportScope" class="appMenuSelect">',
    '      <option value="all" selected>Celý načtený Excel / rok</option>',
    '      <option value="month">Jen vybraný měsíc</option>',
    '    </select>',
    '    <label class="appMenuFieldLabel" for="rakExcelImportDetectedMonth">Načtené měsíce z Excelu</label>',
    '    <select id="rakExcelImportDetectedMonth" class="appMenuSelect" disabled>',
    '      <option value="">Nejdřív vyber Excel</option>',
    '    </select>',
    '  </div>',
    '  <div class="appMenuActionRow">',
    '    <button type="button" class="appMenuAction isActive" id="rakExcelImportCommitBtn" data-admin-action="excel-import" disabled>Načíst do rozpisů</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="back-admin">Zpět</button>',
    '  </div>',
    '</div>'
  ].join('');


  const reportsHtml = [
    '<div class="appMenuCard appMenuAdminCard adminReportsCard">',
    '  <div class="appMenuCardTitle">Reporty chyb</div>',
    '  <div class="appMenuText">',
    '    <div>Tady uvidíš, co uživatelé poslali přes Pošli mi chybu. Reporty chodí do Supabase tabulky bug_reports.</div>',
    '    <div class="smallText" id="adminOnlineSaveStatus">Načti reporty a podle potřeby je označ jako viděné nebo hotové.</div>',
    '  </div>',
    buildAdminReportsHtml(),
    '  <button type="button" class="appMenuAction appMenuBack" data-admin-action="back-admin">Zpět</button>',
    '</div>'
  ].join('');

  const serviceHtml = buildAdminServiceHtml() + [
    '<div class="appMenuCard appMenuAdminCard" id="rakLiveAuthDiagnostic">',
    '  <div class="appMenuCardTitle">Ověření živé administrátorské relace</div>',
    '  <div class="smallText">Jen v testovací verzi: po kliknutí se ověří skutečný podepsaný token, role a práva ke čtení. Bez ukládání tokenu, změn dat nebo automatického přihlášení.</div>',
    '  <button type="button" class="appMenuAction" data-admin-action="run-live-auth-check">Ověřit moje přihlášení a práva</button>',
    '  <div class="smallText" id="rakLiveAuthDiagnosticStatus" role="status" aria-live="polite">Ještě neověřeno. Kontrola se spustí pouze klepnutím.</div>',
    '</div>'
  ].join('');

  if (mode === 'machines') {
    body.innerHTML = machinesHtml;
  } else if (mode === 'food') {
    body.innerHTML = foodHtml;
  } else if (mode === 'vacation') {
    body.innerHTML = vacationHtml;
  } else if (mode === 'special-days') {
    body.innerHTML = specialDaysHtml;
  } else if (mode === 'rotation') {
    body.innerHTML = rotationHtml;
  } else if (mode === 'overtime') {
    body.innerHTML = overtimeHtml;
  } else if (mode === 'generator-settings') {
    body.innerHTML = generatorSettingsHtml;
  } else if (mode === 'machine-tasks') {
    body.innerHTML = machineTasksHtml;
  } else if (mode === 'correction-settings') {
    body.innerHTML = correctionSettingsHtml;
  } else if (mode === 'workers') {
    body.innerHTML = workersHtml;
  } else if (mode === 'change-log') {
    body.innerHTML = changeLogHtml;
  } else if (mode === 'admin-accounts') {
    body.innerHTML = adminAccountsHtml;
  } else if (mode === 'calendars') {
    body.innerHTML = calendarsHtml;
  } else if (mode === 'external-links') {
    body.innerHTML = externalLinksHtml;
  } else if (mode === 'app-contact') {
    body.innerHTML = appContactHtml;
  } else if (mode === 'payroll-settings') {
    body.innerHTML = payrollSettingsHtml;
  } else if (mode === 'backups') {
    body.innerHTML = backupsHtml;
  } else if (mode === 'settings-backups') {
    body.innerHTML = fullSettingsBackupsHtml;
  } else if (mode === 'handover') {
    body.innerHTML = handoverHtml;
  } else if (mode === 'monthly-workflow') {
    body.innerHTML = monthlyWorkflowHtml;
  } else if (mode === 'manual') {
    body.innerHTML = manualHtml;
  } else if (mode === 'settings-map') {
    body.innerHTML = settingsMapHtml;
  } else if (mode === 'announcement') {
    body.innerHTML = announcementHtml;
  } else if (mode === 'export') {
    body.innerHTML = exportHtml;
  } else if (mode === 'reports') {
    body.innerHTML = reportsHtml;
  } else if (mode === 'service') {
    body.innerHTML = serviceHtml;
  } else {
    body.innerHTML = homeHtml;
  }

  if (mode === 'home') {
    // Keep the last category open when returning from a subpage, but show one at a time.
    const groups = Array.from(body.querySelectorAll('.adminMenuSection'));
    groups.forEach((group, index) => {
      group.open = adminCompactOpenGroup === String(index);
      const summary = group.querySelector('summary');
      if (!summary) return;
      summary.addEventListener('click', () => {
        const next = group.open ? '' : String(index);
        if (typeof app !== 'undefined' && app) app.adminCompactOpenGroup = next;
        if (next) groups.forEach(other => { if (other !== group) other.open = false; });
      });
    });
  }

  if (mode === 'rotation') {
    runAdminRotationEditorMaintenance(body, 'render-admin-rotation');
  }
  if (mode === 'overtime' && typeof adminRotationRefreshOvertimeShiftBadges === 'function') {
    try { adminRotationRefreshOvertimeShiftBadges(body, true); } catch (err) {}
  }
  if (mode === 'export' && typeof updateRakExcelImportPreviewUi === 'function') {
    setTimeout(() => {
      try { updateRakExcelImportPreviewUi(); } catch (err) { console.warn('Excel preview UI update failed', err); }
    }, 0);
  }
}



// RaK 1.2 (1.155) – Plovoucí odebrání a údržba editoru rozpisů jsou oddělené v admin-rotation.js.


// RaK 1.7.56. Injected into the built admin renderer by the development stage.
// A real, user-initiated role probe. Never print, persist or transmit a JWT except
// as an Authorization header to the configured isolated TEST Supabase origin.
async function rakRunLiveAuthDiagnostic() {
  const status = document.getElementById('rakLiveAuthDiagnosticStatus');
  if (!status) return;
  if (status.dataset.running === '1') return;
  const setStatus = (message, ok) => {
    status.textContent = message;
    status.dataset.result = ok === true ? 'pass' : ok === false ? 'fail' : 'pending';
  };
  status.dataset.running = '1';
  setStatus('Ověřuji přihlášení a práva pouze pro tento účet…', null);
  try {
    if (!navigator.onLine || typeof rakAdminCanOpenAdmin !== 'function' || !rakAdminCanOpenAdmin()
        || !app || app.adminAuthVersion !== 2) {
      setStatus('Nelze ověřit: vyžaduje online přihlášení správce přes Supabase Auth.', false);
      return;
    }
    const config = window.SUPABASE_CONFIG || {};
    const origin = String(config.url || '').replace(/\/$/, '');
    if (origin !== 'https://cgshssdjgzzuprlwnabl.supabase.co' || !String(config.publishableKey || '').startsWith('sb_publishable_')) {
      setStatus('Kontrola zastavena: nepovolená databáze nebo chybějící veřejný klíč.', false);
      return;
    }
    const bridge = window.RotationSupabaseBridge;
    const token = bridge && typeof bridge.getAdminAccessToken === 'function'
      ? await bridge.getAdminAccessToken() : '';
    if (!token || token.length < 100) {
      setStatus('Platná administrátorská relace není dostupná. Přihlas se znovu.', false);
      return;
    }
    async function probe(endpoint, method = 'POST', payload) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        return await fetch(origin + endpoint, {
          method,
          cache: 'no-store',
          signal: controller.signal,
          headers: {
            apikey: config.publishableKey,
            Authorization: 'Bearer ' + token,
            ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {})
          },
          ...(method === 'POST' ? { body: JSON.stringify(payload || {}) } : {})
        });
      } finally {
        clearTimeout(timeout);
      }
    }
    // GoTrue verifies the cryptographic signature and current Auth identity.
    const authResponse = await probe('/auth/v1/user', 'GET');
    if (!authResponse.ok) {
      setStatus('NEPROŠLO: Supabase Auth zamítl přihlašovací token.', false);
      return;
    }
    const authenticatedUser = await authResponse.json();
    const contextResponse = await probe('/rest/v1/rpc/rak_admin_context');
    if (!contextResponse.ok) {
      setStatus('NEPROŠLO: databáze odmítla administrátorskou relaci.', false);
      return;
    }
    const context = await contextResponse.json();
    const role = String(context && context.role || '');
    if (!['owner', 'admin'].includes(role)
        || String(context.user_id || '') !== String(authenticatedUser.id || '')
        || String(context.account_id || '') !== String(app.adminAccountId || '')
        || !String(context.session_id || '')) {
      setStatus('NEPROŠLO: ověřená identita, aktuální účet a role spolu nesouhlasí.', false);
      return;
    }
    // This read-only RPC must work for both owner and administrator.
    const adminResponse = await probe('/rest/v1/rpc/rak_admin_list_audit_v2', 'POST', { p_limit: 1 });
    if (!adminResponse.ok) {
      setStatus('NEPROŠLO: oprávněná administrátorská čtecí akce byla odmítnuta.', false);
      return;
    }
    await adminResponse.body?.cancel();
    // Owner-only read-only RPC is our positive/negative privilege boundary.
    const ownerResponse = await probe('/rest/v1/rpc/rak_owner_list_admin_profiles');
    const privilegePass = role === 'owner' ? ownerResponse.ok : [401, 403].includes(ownerResponse.status);
    await ownerResponse.body?.cancel();
    if (!privilegePass) {
      setStatus('NEPROŠLO: práva vlastníka neodpovídají ověřené roli.', false);
      return;
    }
    setStatus('PROŠLO: skutečný Auth token, vazba na účet, administrátorské čtení a oddělení práv vlastníka (' + (role === 'owner' ? 'vlastník' : 'administrátor') + '). Ostatní role je nutné otestovat jejich vlastním přihlášením.', true);
  } catch (_error) {
    // Never expose fetch headers, JWT, private RPC payloads or error objects.
    setStatus('Kontrola nedokončena: chyba spojení nebo odpovědi. Žádná data nebyla změněna.', false);
  } finally {
    status.dataset.running = '0';
  }
}

