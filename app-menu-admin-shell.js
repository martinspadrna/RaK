// RaK 1.7.134 – tiny secure local Admin root shell.
// Loaded only after a verified Admin role (or on explicit Admin open).
try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('app-menu-admin-shell.js', 'loaded', { source: 'dynamic-loader' }); } catch (err) {}

function buildAdminMenuSectionHtml(title, detail, actions, options = {}) {
  const safeActions = (Array.isArray(actions) ? actions : []).filter((item) => item && item.action && item.label);
  if (!safeActions.length) return '';
  const openAttr = options.open === false ? '' : ' open';
  return [
    '<details class="adminMenuSection"' + openAttr + '>',
    '  <summary>',
    '    <span>' + escapeHtml(title || '') + '</span>',
    detail ? '    <small>' + escapeHtml(detail) + '</small>' : '',
    '  </summary>',
    '  <div class="adminMenuActionGrid">',
    safeActions.map((item) => '<button type="button" class="appMenuAction" data-admin-action="' + escapeHtml(item.action) + '">' + escapeHtml(item.label) + '</button>').join(''),
    '  </div>',
    '</details>'
  ].join('');
}

function bindAdminHomeSections(body) {
  const groups = Array.from(body && typeof body.querySelectorAll === 'function' ? body.querySelectorAll('.adminMenuSection') : []);
  const openGroup = typeof app !== 'undefined' && app ? String(app.adminCompactOpenGroup || '') : '';
  groups.forEach((group, index) => {
    group.open = openGroup === String(index);
    const summary = group.querySelector('summary');
    if (!summary) return;
    summary.addEventListener('click', () => {
      const next = group.open ? '' : String(index);
      if (typeof app !== 'undefined' && app) app.adminCompactOpenGroup = next;
      if (next) groups.forEach(other => { if (other !== group) other.open = false; });
    });
  });
}

function renderAdminRootMenuBody(body) {
  // RAK_17134_LOCAL_ADMIN_ROOT: code is local, access is still fail-closed.
  if (!(typeof rakAdminCanOpenAdmin === 'function' && rakAdminCanOpenAdmin())) {
    if (body) body.innerHTML = '<div class="appMenuCard">Administrace není přístupná.<button type="button" class="appMenuAction" data-menu-back="1">Zpět</button></div>';
    return false;
  }
  if (!body) return false;
  body.dataset.adminView = 'home';
  try { if (typeof adminSetRotationViewportLock === 'function') adminSetRotationViewportLock(false); } catch (err) {}
  const page = document.getElementById('menu');
  if (page) page.dataset.adminView = 'home';

  const adminServiceActions = [{ action: 'open-service', label: 'Servis / synchronizace' }];
  const adminServiceDetail = (typeof rakAdminCanManageAdmins === 'function' && rakAdminCanManageAdmins())
    ? 'Reporty, synchronizace, aktualizace a správa adminů.'
    : 'Reporty, synchronizace a aktualizace. Hesla a další adminy spravuje jen hlavní admin.';
  if (typeof rakAdminCanManageAdmins === 'function' && rakAdminCanManageAdmins()) {
    adminServiceActions.unshift({ action: 'open-admin-accounts', label: 'Správci' });
    adminServiceActions.push({ action: 'open-settings-backups', label: 'Zálohy nastavení' });
  }

  body.innerHTML = [
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
  bindAdminHomeSections(body);
  return true;
}
