// RaK 1.2 (1.155) – navigační shell, home refresh a dashboard modaly.
try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('app-navigation.js', 'loaded', { source: 'dynamic-loader' }); } catch (err) {}

function centerBottomNavButton(btn) {
  if (!btn) return;
  try {
    const scroller = btn.closest('.bottomNavScroll') || btn.closest('.bottomNav');
    if (!scroller || typeof scroller.scrollTo !== 'function') return;
    const btnRect = btn.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    const targetLeft = scroller.scrollLeft + (btnRect.left - scrollerRect.left) - ((scrollerRect.width - btnRect.width) / 2);
    scroller.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
  } catch (err) {}
}

function resetPageScrollToTop(pageId, reason) {
  try {
    if (typeof document === 'undefined') return;
    if (document.body && (document.body.classList.contains('gamesOpen') || document.body.classList.contains('tttOpen'))) return;
    const el = pageId ? document.getElementById(pageId) : document.querySelector('.page.active');
    const run = () => {
      try {
        const root = document.scrollingElement || document.documentElement || document.body;
        if (root && typeof root.scrollTo === 'function') root.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        else if (root) root.scrollTop = 0;
        if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') window.scrollTo(0, 0);
        if (el && typeof el.scrollTo === 'function') el.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        else if (el) el.scrollTop = 0;
        window.__rakLastPageScrollReset = { page: pageId || '', reason: reason || '', ts: Date.now() };
      } catch (err) {}
    };
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(run));
    } else {
      setTimeout(run, 0);
    }
  } catch (err) {
    console.warn('resetPageScrollToTop failed', err);
  }
}


function ensurePageScrollAvailable(pageId, reason) {
  try {
    if (typeof document === 'undefined' || !document.body) return;
    const hasVisibleModal = !!document.querySelector('.foodScheduleOverlay.isVisible, .personScheduleOverlay.isVisible, .calendarOverlay.isVisible, .tttOverlay.isVisible, .qrModalOverlay.isVisible');
    const isGameOpen = document.body.classList.contains('gamesOpen') || document.body.classList.contains('tttOpen');
    if (!hasVisibleModal && !isGameOpen) {
      document.body.classList.remove('foodModalOpen', 'personModalOpen', 'calendarModalOpen');
      if (document.body.style && document.body.style.overflow === 'hidden') document.body.style.overflow = '';
      if (document.documentElement && document.documentElement.style) document.documentElement.style.overflowY = 'auto';
      if (document.body.style) document.body.style.overflowY = 'auto';
    }

    const id = String(pageId || '').trim();
    if (id === 'brusy' || id === 'soustruhy' || id === 'frezky' || id === 'kalkulacky') {
      const page = document.getElementById(id);
      if (page && page.style) {
        page.style.overflowY = 'visible';
        page.style.webkitOverflowScrolling = 'touch';
      }
    }
    window.__rakLastScrollGuard = { page: id, reason: reason || '', ts: Date.now() };
  } catch (err) {
    console.warn('ensurePageScrollAvailable failed', err);
  }
}



function ensureBottomNavActiveIndicator() {
  try {
    if (typeof document === 'undefined') return null;
    const rail = document.getElementById('bottomNavScroll');
    if (!rail) return null;
    let indicator = rail.querySelector('.bottomNavActiveIndicator');
    if (!indicator) {
      indicator = document.createElement('span');
      indicator.className = 'bottomNavActiveIndicator';
      indicator.setAttribute('aria-hidden', 'true');
      rail.appendChild(indicator);
    }
    return indicator;
  } catch (err) {
    return null;
  }
}

function updateBottomNavActiveIndicator(reason) {
  try {
    if (typeof document === 'undefined') return false;
    const rail = document.getElementById('bottomNavScroll');
    const indicator = ensureBottomNavActiveIndicator();
    if (!rail || !indicator) return false;
    const active = rail.querySelector('.bottomNavBtn.active');
    if (!active) {
      indicator.style.opacity = '0';
      return false;
    }
    const railRect = rail.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const left = Math.max(0, activeRect.left - railRect.left + rail.scrollLeft);
    const width = Math.max(20, activeRect.width);
    indicator.style.setProperty('--rak-nav-indicator-left', left.toFixed(2) + 'px');
    indicator.style.setProperty('--rak-nav-indicator-width', width.toFixed(2) + 'px');
    indicator.style.opacity = '1';
    indicator.dataset.reason = String(reason || 'active');
    return true;
  } catch (err) {
    return false;
  }
}

function scheduleBottomNavActiveIndicator(reason) {
  try {
    const run = () => updateBottomNavActiveIndicator(reason || 'scheduled');
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(run));
    } else {
      setTimeout(run, 0);
    }
  } catch (err) {}
}

function setBottomNavActive(pageId) {
  const buttons = document.querySelectorAll('.bottomNavBtn');
  buttons.forEach(btn => {
    const isActive = btn.dataset.page === pageId;
    btn.classList.toggle('active', isActive);
    if (isActive && btn.dataset.page !== 'menu') {
      centerBottomNavButton(btn);
    }
  });
  scheduleBottomNavActiveIndicator('setBottomNavActive:' + String(pageId || ''));
}

function appGoBackFromGesture() {
  try {
    const activePage = document.querySelector('.page.active')?.id || 'home';
    if (document.body.classList.contains('tttOpen') && typeof closeTicTacToeGame === 'function') {
      closeTicTacToeGame();
      return true;
    }
    if (typeof app !== 'undefined' && app.activeGameShell) {
      openGamesPage();
      return true;
    }
    if (activePage === 'menu') {
      hideAppMenu();
      showPage('home');
      return true;
    }
    if (activePage === 'games') {
      showPage('home');
      return true;
    }
    if (activePage === 'rotace') {
      if (typeof app !== 'undefined') {
        if (app.selectedName) {
          app.selectedName = null;
          app.nameTapState = { name: '', count: 0, lastTap: 0 };
          renderRotace();
          return true;
        }
        if (app.selectedStatsName || app.selectedStatsMachine) {
          app.selectedStatsName = null;
          app.selectedStatsMachine = null;
          if (typeof renderStatsPanel === 'function') renderStatsPanel();
          return true;
        }
        if (app.rotationView && app.rotationView !== 'names') {
          setRotaceView('names');
          renderRotace();
          return true;
        }
        if (app.selectedMonth) {
          app.selectedMonth = null;
          renderRotace();
          return true;
        }
      }
      showPage('home');
      return true;
    }
    if (['jidlo', 'soustruhy', 'brusy', 'frezky', 'kalkulacky', 'statistiky'].includes(activePage)) {
      showPage('home');
      return true;
    }
    if (activePage !== 'home') {
      showPage('home');
      return true;
    }
  } catch (err) {
    console.warn('appGoBackFromGesture failed', err);
  }
  return false;
}

(function installAppBackGesture() {
  if (window.__rotaceAppBackGestureBound) return;
  window.__rotaceAppBackGestureBound = true;
  let startX = 0;
  let startY = 0;
  let active = false;
  const reset = () => { active = false; };
  document.addEventListener('touchstart', (ev) => {
    if (!ev.touches || ev.touches.length !== 1) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes((ev.target && ev.target.tagName) || '')) return;
    const touch = ev.touches[0];
    if (!touch || touch.clientX > 26) return;
    startX = touch.clientX;
    startY = touch.clientY;
    active = true;
  }, { passive: true });
  document.addEventListener('touchend', (ev) => {
    if (!active) return;
    const touch = ev.changedTouches && ev.changedTouches[0];
    reset();
    if (!touch) return;
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    if (dx < 72 || Math.abs(dy) > 60 || dx <= Math.abs(dy) * 1.15) return;
    appGoBackFromGesture();
  }, { passive: true });
  document.addEventListener('touchcancel', reset, { passive: true });
})();


function showFoodSchedule(which) {
  if (typeof app !== 'undefined') {
    app.foodScheduleFocus = which === 'jidelna' ? 'jidelna' : 'kantyna';
  }
  if (typeof renderFoodScheduleModal === 'function') {
    renderFoodScheduleModal();
    const overlay = ensureFoodScheduleModal();
    overlay.classList.add('isVisible');
    document.body.classList.add('foodModalOpen');
    return;
  }
  if (typeof renderFoodSchedulePage === 'function') {
    renderFoodSchedulePage();
  }
  showPage('jidlo');
}


function showPage(id) {
  // RAK_EXTERNAL_SHIFT_TEAMS_17020
  if((id==='rotace'||id==='statistiky')&&!rakCanAccessRotations()) id='home';
  const currentPage = typeof document !== 'undefined' ? document.querySelector('.page.active')?.id || '' : '';
  const isSamePageRefresh = currentPage === id;
  const shouldClosePageModals = id !== 'home' || !isSamePageRefresh;
  if (typeof app !== 'undefined') {
    app.homeBootSuppressed = id !== 'home';
  }
  window.__rotaceManualNavLocked = id !== 'home';
  window.__rotaceHomeBootLocked = id !== 'home';
  window.__rotaceUserNavigated = id !== 'home';
  if (id !== 'home') window.__rotaceHomeBootLocked = true;
  if (id !== 'games' && typeof document !== 'undefined' && document.body.classList.contains('tttOpen')) {
    try {
      if (typeof closeTicTacToeGame === 'function') closeTicTacToeGame();
      else document.body.classList.remove('tttOpen');
    } catch (err) {
      console.warn('close TTT before nav failed', err);
    }
  }

  let navPage = id === 'rotace'
    ? 'rotace'
    : (id === 'brusy' || id === 'soustruhy' || id === 'frezky' || id === 'pracka' || id === 'kalkulacky' || String(id || '').startsWith('korekce-'))
      ? 'kalkulacky'
      : (id === 'jidlo' ? 'home' : id);

  if (id === 'eportal') {
    if (openEportal()) return;
    id = 'home';
    navPage = 'home';
  }

  if (id === 'rotace') {
    try { document.documentElement.classList.add('rakRotaceDockSettling'); } catch (err) {}
  }

  if (typeof setRotaceNamesDockPortalActive === 'function') {
    setRotaceNamesDockPortalActive(id === 'rotace', id === 'rotace' ? 'showPage-pre-rotace' : 'showPage-leave-rotace');
  }

  if (id === 'rotace' && typeof scheduleRotaceNamesDockMetrics === 'function') {
    scheduleRotaceNamesDockMetrics('showPage-pre-rotace');
  }

  if (id === 'games') {
    try {
      if (typeof tttStopOnlineSync === 'function') tttStopOnlineSync();
      if (typeof closeTicTacToeGame === 'function' && document.body.classList.contains('tttOpen')) closeTicTacToeGame();
      if (typeof closeGameShell === 'function' && ((typeof app !== 'undefined' && !!app.activeGameShell) || document.body.classList.contains('gamesOpen'))) closeGameShell();
      if (typeof app !== 'undefined') app.activeGameShell = '';
      document.body.classList.remove('tttOpen');
      document.body.classList.remove('gamesOpen');
    } catch (err) {
      console.warn('games page reset failed', err);
    }
  }

  try {
    if (shouldClosePageModals) {
      const modal = document.getElementById('foodScheduleModal');
      if (modal) {
        modal.classList.remove('isVisible');
        document.body.classList.remove('foodModalOpen');
      }
      const personModal = document.getElementById('personScheduleModal');
      if (personModal) {
        personModal.classList.remove('isVisible');
        document.body.classList.remove('personModalOpen');
      }
      const calendarModal = document.getElementById('calendarModal');
      if (calendarModal) {
        calendarModal.classList.remove('isVisible');
        document.body.classList.remove('calendarModalOpen');
      }
    }

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    if (id === 'menu') {
      openAppMenu('menu');
    }
    const el = document.getElementById(id);
    if (el) el.classList.add('active');

    if (id === 'rotace') {
      try { document.documentElement.classList.remove('rakRotaceEntering'); } catch (err) {}
      if (typeof updateRotaceNamesDockMetrics === 'function') updateRotaceNamesDockMetrics('showPage-before-render');
      if (typeof initRotaceCurrentMonth === 'function') initRotaceCurrentMonth();
      setRotaceView('names');
      if (typeof renderRotace === 'function') renderRotace();
      if (typeof scheduleRotaceNamesDockMetrics === 'function') scheduleRotaceNamesDockMetrics('showPage-after-render');
      try {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          document.documentElement.classList.remove('rakRotaceDockSettling');
        }));
      } catch (err) {
        try { document.documentElement.classList.remove('rakRotaceDockSettling'); } catch (_) {}
      }
      try { document.documentElement.classList.remove('rakRotaceEntering'); } catch (err) {}
    } else if (id === 'brusy') {
      if (typeof renderBrusy === 'function') renderBrusy();
    } else if (id === 'soustruhy') {
      if (typeof renderSoustruhy === 'function') renderSoustruhy();
    } else if (id === 'frezky') {
      // page exists only as part of kalkulačky hub
    } else if (id === 'pracka') {
      if (typeof updatePrackaInfo === 'function') updatePrackaInfo();
    } else if (id === 'korekce-frezky') {
      if (typeof updateFhbPresetButtons === 'function') updateFhbPresetButtons();
    } else if (id === 'jidlo') {
      if (typeof renderFoodSchedulePage === 'function') {
        renderFoodSchedulePage();
      }
    } else if (id === 'games') {
      if (typeof gamesStopActiveLoops === 'function') gamesStopActiveLoops();
      if (typeof app !== 'undefined') app.activeGameShell = '';
      document.body.classList.remove('gamesOpen');
      document.body.classList.remove('tttOpen');
      if (typeof renderGamesHub === 'function') renderGamesHub();
    } else if (id === 'home') {
      if (typeof scheduleHomeRefresh === 'function') {
        scheduleHomeRefresh();
      } else {
        if (typeof refreshHomeScreen === 'function') refreshHomeScreen();
        else {
          if (typeof updateDashboard === 'function') updateDashboard();
          if (typeof updateFoodTile === 'function') updateFoodTile();
          if (typeof updateEportalTile === 'function') updateEportalTile();
        }
      }
    }

  } catch (err) {
    console.error('showPage failed', err);
  } finally {
    if (id !== 'rotace') {
      try { document.documentElement.classList.remove('rakRotaceDockSettling'); } catch (err) {}
    }
    setBottomNavActive(navPage);
    ensurePageScrollAvailable(id, 'showPage');
    if (!isSamePageRefresh) {
      resetPageScrollToTop(id, 'showPage');
    }
  }
}

function openRotaceNames() {
  if(!rakCanAccessRotations()){showPage('home');return;}

  if (typeof app !== 'undefined') {
    app.selectedName = null;
    app.nameTapState = null;
  }
  showPage('rotace');
  setRotaceView('names');
  if (typeof renderRotace === 'function') renderRotace();
  setBottomNavActive('rotace');
}

function openRotaceMonths() {
  if(!rakCanAccessRotations()){showPage('home');return;}
  showPage('rotace');
  setRotaceView('months');
  setBottomNavActive('rotace');
}

function openRotaceStats() {
  if(!rakCanAccessRotations()){showPage('home');return;}
  showPage('rotace');
  setRotaceView('stats');
  setBottomNavActive('rotace');
}

function openKalkulacky() {
  showPage('kalkulacky');
  setBottomNavActive('kalkulacky');
}


const FOOD_MENU_URL = 'https://sa.gthcatering.cz/restaurant/c1/';
const EPORTAL_URL = 'https://space.skoda.vwgroup.com/group/b2eportal/home-page';
const PAYROLL_URL = 'https://smartappspki.skoda.vwgroup.com/sap/bc/ui2/flp?sap-client=010&sap-language=CS#eMA_EV-open';
const CALENDAR_EMBED_URL = 'https://calendar.google.com/calendar/embed?height=900&wkst=2&ctz=Europe%2FPrague&showPrint=0&showTitle=0&showTabs=0&showCalendars=0&showTz=0&src=MzFlZWE5OWVkZmYxNzcxYmUxNWJhODc3ZjdjMmY1YjEzNzFlMGE3NDJhZDlkNTRmY2E1MjZkNDFlYWZhNTk5NUBncm91cC5jYWxlbmRhci5nb29nbGUuY29t&color=%230157ff';
const RAK_EXTERNAL_LINKS_SETTINGS_KEY = 'EXTERNAL_LINKS_SETTINGS';
const RAK_EXTERNAL_LINKS_SETTINGS_CATEGORY = 'external_links_settings';
const RAK_DEFAULT_EXTERNAL_LINKS = Object.freeze({
  food: Object.freeze({ key: 'food', label: 'Jídelní lístek', value: 'Otevřít', meta: 'Aktuální menu', url: FOOD_MENU_URL }),
  eportal: Object.freeze({ key: 'eportal', label: 'Eportal', value: 'Otevřít', meta: 'Firemní portál', url: EPORTAL_URL }),
  payroll: Object.freeze({ key: 'payroll', label: 'Výplata', value: '', meta: '', url: PAYROLL_URL }),
  calendar: Object.freeze({ key: 'calendar', label: 'Kalendář', value: '', meta: 'Google kalendář', url: CALENDAR_EMBED_URL })
});
const RAK_EXTERNAL_TILE_HOSTS = Object.freeze([
  'sa.gthcatering.cz',
  'space.skoda.vwgroup.com',
  'smartappspki.skoda.vwgroup.com',
  'calendar.google.com'
]);
window.FOOD_MENU_URL = FOOD_MENU_URL;
window.EPORTAL_URL = EPORTAL_URL;
window.PAYROLL_URL = PAYROLL_URL;
window.CALENDAR_EMBED_URL = CALENDAR_EMBED_URL;
window.RAK_EXTERNAL_TILE_HOSTS = RAK_EXTERNAL_TILE_HOSTS;
window.RAK_EXTERNAL_LINKS_SETTINGS_KEY = RAK_EXTERNAL_LINKS_SETTINGS_KEY;
window.RAK_EXTERNAL_LINKS_SETTINGS_CATEGORY = RAK_EXTERNAL_LINKS_SETTINGS_CATEGORY;

function rakExternalLinksSettingsJson(row) {
  if (row && row.settings_json && typeof row.settings_json === 'object') return row.settings_json;
  try { return row && row.settings_json ? JSON.parse(String(row.settings_json)) : {}; }
  catch (err) { return {}; }
}

function isRakExternalLinksSettingsRow(row) {
  const settings = rakExternalLinksSettingsJson(row);
  return String(row && row.category || '').trim() === RAK_EXTERNAL_LINKS_SETTINGS_CATEGORY
    || String(row && row.machine_key || '').trim() === RAK_EXTERNAL_LINKS_SETTINGS_KEY
    || String(settings && settings.stored_category || '').trim() === RAK_EXTERNAL_LINKS_SETTINGS_CATEGORY
    || String(settings && settings.admin_settings_key || '').trim() === RAK_EXTERNAL_LINKS_SETTINGS_KEY;
}

function normalizeRakExternalLinkEntry(key, entry) {
  const base = RAK_DEFAULT_EXTERNAL_LINKS[key] || { key, label: key, value: 'Otevřít', meta: '', url: '' };
  const safe = entry && typeof entry === 'object' ? entry : {};
  const url = String(safe.url || base.url || '').trim();
  return {
    key,
    label: String(safe.label || base.label || key).trim(),
    value: String(safe.value || base.value || '').trim(),
    meta: String(safe.meta || base.meta || '').trim(),
    url: url || String(base.url || '')
  };
}

function normalizeRakExternalLinksSettings(settings) {
  const raw = settings && typeof settings === 'object' ? settings : {};
  const links = raw.links && typeof raw.links === 'object' ? raw.links : raw;
  return {
    type: RAK_EXTERNAL_LINKS_SETTINGS_CATEGORY,
    links: {
      food: normalizeRakExternalLinkEntry('food', links.food),
      eportal: normalizeRakExternalLinkEntry('eportal', links.eportal),
      payroll: normalizeRakExternalLinkEntry('payroll', links.payroll),
      calendar: normalizeRakExternalLinkEntry('calendar', links.calendar)
    }
  };
}

function getRakExternalLinksSettings() {
  const rows = Array.isArray(app && app.machineSettingsRows) ? app.machineSettingsRows : [];
  const row = rows.find(isRakExternalLinksSettingsRow);
  return normalizeRakExternalLinksSettings(row ? rakExternalLinksSettingsJson(row) : null);
}

function getRakExternalLink(key) {
  const normalizedKey = String(key || '').trim();
  const settings = getRakExternalLinksSettings();
  return normalizeRakExternalLinkEntry(normalizedKey, settings.links[normalizedKey]);
}

function getRakExternalLinkUrl(key) {
  return String(getRakExternalLink(key).url || '').trim();
}

function getRakExternalTileHosts() {
  const hosts = new Set(Array.from(RAK_EXTERNAL_TILE_HOSTS));
  const settings = getRakExternalLinksSettings();
  Object.keys(settings.links || {}).forEach((key) => {
    try {
      const url = new URL(String(settings.links[key] && settings.links[key].url || ''));
      if (url.protocol === 'https:' || url.protocol === 'http:') hosts.add(url.hostname);
    } catch (err) {}
  });
  return Array.from(hosts);
}

function makeRakExternalLinksSettingsRow(settings) {
  const safe = normalizeRakExternalLinksSettings(settings);
  return {
    machine_key: RAK_EXTERNAL_LINKS_SETTINGS_KEY,
    machine_code: 'APP',
    machine_index: 'external_links',
    label: 'Externí odkazy',
    category: RAK_EXTERNAL_LINKS_SETTINGS_CATEGORY,
    cycle_time: '',
    speed: '',
    dress_time: '',
    dress_count: '',
    settings_json: Object.assign({ machine: 'APP', index: 'external_links' }, safe)
  };
}

function mergeRakExternalLinksSettingsRows(settings) {
  const base = Array.isArray(app.machineSettingsRows) ? app.machineSettingsRows : [];
  const rows = base.filter((row) => !isRakExternalLinksSettingsRow(row));
  rows.push(makeRakExternalLinksSettingsRow(settings));
  return rows;
}

function isRakExternalLinkUrlValid(value) {
  const raw = String(value || '').trim();
  if (!raw) return false;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch (err) {
    return false;
  }
}

function adminExternalLinksRefreshStatus() {}

function buildAdminExternalLinksSettingsHtml() {
  const settings = getRakExternalLinksSettings();
  const rows = ['food', 'eportal', 'payroll', 'calendar'].map((key) => {
    const link = normalizeRakExternalLinkEntry(key, settings.links[key]);
    return [
      '<tr data-external-link-row="' + escapeHtml(key) + '">',
      '  <td><input class="appMenuInlineInput" data-external-link-field="label" value="' + escapeHtml(link.label) + '"></td>',
      '  <td><input class="appMenuInlineInput" data-external-link-field="value" value="' + escapeHtml(link.value) + '"></td>',
      '  <td><input class="appMenuInlineInput" data-external-link-field="meta" value="' + escapeHtml(link.meta) + '"></td>',
      '  <td><input class="appMenuInlineInput appMenuWideInput" data-external-link-field="url" value="' + escapeHtml(link.url) + '" inputmode="url"></td>',
      '</tr>'
    ].join('');
  }).join('');
  return [
    '<div class="tableWrap appMenuTableWrap uMt12">',
    '  <table class="appMenuTable appMenuAdminTable appMenuAdminTableDense adminExternalLinksTable">',
    '    <thead><tr><th>Název</th><th>Text</th><th>Popis</th><th>Odkaz</th></tr></thead>',
    '    <tbody>' + rows + '</tbody>',
    '  </table>',
    '</div>'
  ].join('');
}

function readAdminExternalLinksSettingsFromDom() {
  const links = {};
  document.querySelectorAll('#appMenuBody tr[data-external-link-row]').forEach((tr) => {
    const key = String(tr.getAttribute('data-external-link-row') || '').trim();
    const get = (field) => String(tr.querySelector('[data-external-link-field="' + field + '"]')?.value || '').trim();
    if (!key) return;
    links[key] = normalizeRakExternalLinkEntry(key, {
      label: get('label'),
      value: get('value'),
      meta: get('meta'),
      url: get('url')
    });
  });
  return normalizeRakExternalLinksSettings({ links });
}

try {
  window.isRakExternalLinksSettingsRow = isRakExternalLinksSettingsRow;
  window.getRakExternalLinksSettings = getRakExternalLinksSettings;
  window.getRakExternalLink = getRakExternalLink;
  window.getRakExternalLinkUrl = getRakExternalLinkUrl;
  window.getRakExternalTileHosts = getRakExternalTileHosts;
  window.buildAdminExternalLinksSettingsHtml = buildAdminExternalLinksSettingsHtml;
  window.readAdminExternalLinksSettingsFromDom = readAdminExternalLinksSettingsFromDom;
  window.mergeRakExternalLinksSettingsRows = mergeRakExternalLinksSettingsRows;
  window.adminExternalLinksRefreshStatus = adminExternalLinksRefreshStatus;
} catch (err) {}

const RAK_APP_CONTACT_SETTINGS_KEY = 'APP_CONTACT_SETTINGS';
const RAK_APP_CONTACT_SETTINGS_CATEGORY = 'app_contact_settings';
const RAK_DEFAULT_APP_CONTACT = Object.freeze({
  name: 'Martin Špadrna',
  phone: '+420 773 682 499',
  email: 'martinspadrna@gmail.com'
});
window.RAK_APP_CONTACT_SETTINGS_KEY = RAK_APP_CONTACT_SETTINGS_KEY;
window.RAK_APP_CONTACT_SETTINGS_CATEGORY = RAK_APP_CONTACT_SETTINGS_CATEGORY;

function rakAppContactSettingsJson(row) {
  if (row && row.settings_json && typeof row.settings_json === 'object') return row.settings_json;
  try { return row && row.settings_json ? JSON.parse(String(row.settings_json)) : {}; }
  catch (err) { return {}; }
}

function isRakAppContactSettingsRow(row) {
  const settings = rakAppContactSettingsJson(row);
  return String(row && row.category || '').trim() === RAK_APP_CONTACT_SETTINGS_CATEGORY
    || String(row && row.machine_key || '').trim() === RAK_APP_CONTACT_SETTINGS_KEY
    || String(settings && settings.stored_category || '').trim() === RAK_APP_CONTACT_SETTINGS_CATEGORY
    || String(settings && settings.admin_settings_key || '').trim() === RAK_APP_CONTACT_SETTINGS_KEY;
}

function normalizeRakAppContactSettings(settings) {
  const raw = settings && typeof settings === 'object' ? settings : {};
  const contact = raw.contact && typeof raw.contact === 'object' ? raw.contact : raw;
  const fallback = RAK_DEFAULT_APP_CONTACT;
  return {
    type: RAK_APP_CONTACT_SETTINGS_CATEGORY,
    contact: {
      name: String(contact.name || fallback.name || '').trim(),
      phone: String(contact.phone || fallback.phone || '').trim(),
      email: String(contact.email || fallback.email || '').trim()
    }
  };
}

function getRakAppContactSettings() {
  const rows = Array.isArray(app && app.machineSettingsRows) ? app.machineSettingsRows : [];
  const row = rows.find(isRakAppContactSettingsRow);
  return normalizeRakAppContactSettings(row ? rakAppContactSettingsJson(row) : null).contact;
}

function makeRakAppContactSettingsRow(settings) {
  const safe = normalizeRakAppContactSettings(settings);
  return {
    machine_key: RAK_APP_CONTACT_SETTINGS_KEY,
    machine_code: 'APP',
    machine_index: 'contact',
    label: 'Kontakt aplikace',
    category: RAK_APP_CONTACT_SETTINGS_CATEGORY,
    cycle_time: '',
    speed: '',
    dress_time: '',
    dress_count: '',
    settings_json: Object.assign({ machine: 'APP', index: 'contact' }, safe)
  };
}

function mergeRakAppContactSettingsRows(settings) {
  const base = Array.isArray(app.machineSettingsRows) ? app.machineSettingsRows : [];
  const rows = base.filter((row) => !isRakAppContactSettingsRow(row));
  rows.push(makeRakAppContactSettingsRow(settings));
  return rows;
}

function isRakAppContactEmailValid(value) {
  const raw = String(value || '').trim();
  return !!raw && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);
}

function getRakAppContactPhoneHref(contact) {
  const source = contact && typeof contact === 'object' ? contact : getRakAppContactSettings();
  const raw = String(source && source.phone || '').trim();
  const compact = raw.replace(/[^\d+]/g, '');
  const digitCount = (compact.match(/\d/g) || []).length;
  if (!compact || digitCount < 6) return '';
  if ((compact.match(/\+/g) || []).length > 1) return '';
  if (compact.indexOf('+') > 0) return '';
  return 'tel:' + compact;
}

function getRakAppContactEmailHref(contact) {
  const source = contact && typeof contact === 'object' ? contact : getRakAppContactSettings();
  const raw = String(source && source.email || '').trim();
  if (!isRakAppContactEmailValid(raw)) return '';
  return 'mailto:' + encodeURIComponent(raw);
}

function adminAppContactRefreshStatus() {}

function buildAdminAppContactSettingsHtml() {
  const contact = getRakAppContactSettings();
  const rows = [
    ['name', 'Jméno', contact.name],
    ['phone', 'Telefon', contact.phone],
    ['email', 'E-mail', contact.email]
  ].map(([key, label, value]) => [
    '<tr data-app-contact-row="' + escapeHtml(key) + '">',
    '  <td>' + escapeHtml(label) + '</td>',
    '  <td><input class="appMenuInlineInput appMenuWideInput" data-app-contact-field="' + escapeHtml(key) + '" value="' + escapeHtml(value) + '"></td>',
    '</tr>'
  ].join('')).join('');
  return [
    '<div class="tableWrap appMenuTableWrap uMt12">',
    '  <table class="appMenuTable appMenuAdminTable appMenuAdminTableDense adminAppContactTable">',
    '    <colgroup><col class="adminAppContactLabelCol"><col class="adminAppContactValueCol"></colgroup>',
    '    <thead><tr><th>Položka</th><th>Hodnota</th></tr></thead>',
    '    <tbody>' + rows + '</tbody>',
    '  </table>',
    '</div>'
  ].join('');
}

function readAdminAppContactSettingsFromDom() {
  const contact = {};
  document.querySelectorAll('#appMenuBody [data-app-contact-field]').forEach((input) => {
    const key = String(input.getAttribute('data-app-contact-field') || '').trim();
    if (!key) return;
    contact[key] = String(input.value || '').trim();
  });
  return normalizeRakAppContactSettings({ contact });
}

try {
  window.isRakAppContactSettingsRow = isRakAppContactSettingsRow;
  window.getRakAppContactSettings = getRakAppContactSettings;
  window.getRakAppContactPhoneHref = getRakAppContactPhoneHref;
  window.getRakAppContactEmailHref = getRakAppContactEmailHref;
  window.buildAdminAppContactSettingsHtml = buildAdminAppContactSettingsHtml;
  window.readAdminAppContactSettingsFromDom = readAdminAppContactSettingsFromDom;
  window.mergeRakAppContactSettingsRows = mergeRakAppContactSettingsRows;
  window.adminAppContactRefreshStatus = adminAppContactRefreshStatus;
} catch (err) {}

function normalizeExternalTileUrl(url, key = 'openExternalTile') {
  if (typeof normalizeAllowedExternalUrl === 'function') {
    return normalizeAllowedExternalUrl(url, getRakExternalTileHosts(), key);
  }
  return typeof normalizeSafeExternalUrl === 'function'
    ? normalizeSafeExternalUrl(url, key)
    : String(url || '').trim();
}
window.normalizeExternalTileUrl = normalizeExternalTileUrl;

function openExternalTile(url, key = 'openExternalTile') {
  const target = normalizeExternalTileUrl(url, key);
  if (!target) return false;
  try {
    const win = window.open(target, '_blank', 'noopener,noreferrer');
    if (win) {
      try { win.opener = null; } catch (e) {}
      return true;
    }
  } catch (err) {
    console.warn('External tile open failed', err);
  }
  return false;
}

function openEportal() {
  return openExternalTile(getRakExternalLinkUrl('eportal'), 'openEportal');
}

function openPayroll() {
  return openExternalTile(getRakExternalLinkUrl('payroll'), 'openPayroll');
}

function syncDashboardExternalLinks() {
  if (typeof document === 'undefined' || typeof setSafeExternalAnchor !== 'function') return false;
  const hosts = getRakExternalTileHosts();
  const food = setSafeExternalAnchor(document.getElementById('dashFoodLink'), getRakExternalLinkUrl('food'), hosts, 'dashFoodLink');
  const eportal = setSafeExternalAnchor(document.getElementById('dashEportalLink'), getRakExternalLinkUrl('eportal'), hosts, 'dashEportalLink');
  const payroll = setSafeExternalAnchor(document.getElementById('dashVyplata'), getRakExternalLinkUrl('payroll'), hosts, 'dashVyplata');
  return !!(food || eportal || payroll);
}
window.syncDashboardExternalLinks = syncDashboardExternalLinks;

function refreshHomeScreen() {
  if (typeof isAnyModalOpen === 'function' && isAnyModalOpen()) return false;
  try {
    syncDashboardExternalLinks();
    if (typeof updateDashboard === 'function') updateDashboard();
  } catch (err) {
    console.warn('Dashboard refresh failed', err);
  }
  try {
    if (typeof updateFoodTile === 'function') updateFoodTile();
  } catch (err) {
    console.warn('Food tile refresh failed', err);
  }
  try {
    if (typeof updateEportalTile === 'function') updateEportalTile();
  } catch (err) {
    console.warn('Eportal tile refresh failed', err);
  }
  return true;
}

let rakHomeRefreshBatchActive = false;
let rakHomeRefreshBatchQueued = false;
let rakHomeRefreshBatchId = 0;

function bumpDataOptimizationCounter(key, amount = 1) {
  try {
    const stats = window.__rakDataOptimizationStats;
    if (!stats || !key) return;
    stats[key] = Number(stats[key] || 0) + amount;
  } catch (err) {}
}

function markDataOptimizationHomeRefresh(reason) {
  try {
    const stats = window.__rakDataOptimizationStats;
    if (!stats) return;
    stats.homeRefreshLastReason = String(reason || 'refresh');
    stats.homeRefreshLastAt = Date.now();
  } catch (err) {}
}

function scheduleHomeRefresh(reason = 'home-refresh') {
  bumpDataOptimizationCounter('homeRefreshSchedules');
  const refreshReason = String(reason || 'home-refresh');
  if (rakHomeRefreshBatchActive) {
    rakHomeRefreshBatchQueued = true;
    bumpDataOptimizationCounter('homeRefreshCoalescedSchedules');
    markDataOptimizationHomeRefresh('coalesced-' + refreshReason);
    return false;
  }

  rakHomeRefreshBatchActive = true;
  const batchId = ++rakHomeRefreshBatchId;
  markDataOptimizationHomeRefresh(refreshReason);

  const run = (step = '') => {
    if (batchId !== rakHomeRefreshBatchId) return false;
    if (typeof isAnyModalOpen === 'function' && isAnyModalOpen()) {
      bumpDataOptimizationCounter('homeRefreshModalSkips');
      return false;
    }
    bumpDataOptimizationCounter('homeRefreshRuns');
    markDataOptimizationHomeRefresh(step ? (refreshReason + ':' + step) : refreshReason);
    return refreshHomeScreen();
  };

  const finish = () => {
    if (batchId !== rakHomeRefreshBatchId) return;
    rakHomeRefreshBatchActive = false;
    if (rakHomeRefreshBatchQueued) {
      rakHomeRefreshBatchQueued = false;
      setTimeout(() => scheduleHomeRefresh('queued-after-batch'), 80);
    }
  };

  // Láďův režim: každý běh je plné přestavění dashboardu. Na slabém telefonu
  // proto uděláme jeden paint v nejbližším snímku; pozdější běh je pouze
  // pojistka pro případ, že by Home po startu opravdu zůstala prázdná.
  const ladaLite = !!(document.body && document.body.classList && document.body.classList.contains('ladaMode'));
  if (ladaLite) {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => run('raf-1'));
    else setTimeout(() => run('timeout-0'), 0);
    setTimeout(() => {
      const needsRecovery = typeof homeLooksUnpainted !== 'function' || homeLooksUnpainted();
      if (needsRecovery) {
        bumpDataOptimizationCounter('homeRefreshLadaRecoveryRuns');
        run('recovery-900');
      } else {
        bumpDataOptimizationCounter('homeRefreshLadaRecoverySkips');
      }
      finish();
    }, 900);
    return true;
  }

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      run('raf-1');
      requestAnimationFrame(() => {
        run('raf-2');
        requestAnimationFrame(() => run('raf-3'));
      });
    });
  } else {
    setTimeout(() => run('timeout-0'), 0);
    setTimeout(() => run('timeout-120'), 120);
  }
  setTimeout(() => run('timeout-240'), 240);
  setTimeout(() => run('timeout-480'), 480);
  setTimeout(() => run('timeout-900'), 900);
  setTimeout(() => { run('timeout-1500'); finish(); }, 1500);
}

function hideFoodScheduleModal() {
  const overlay = document.getElementById('foodScheduleModal');
  if (!overlay) return;
  overlay.classList.remove('isVisible');
  document.body.classList.remove('foodModalOpen');
}

function ensureFoodScheduleModal() {
  let overlay = document.getElementById('foodScheduleModal');
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = 'foodScheduleModal';
  overlay.className = 'foodScheduleOverlay';
  overlay.innerHTML = [
    '<div class="foodScheduleModal" role="dialog" aria-modal="true" aria-labelledby="foodScheduleModalTitle">',
    '<button type="button" class="foodScheduleClose" aria-label="Zavřít">×</button>',
    '<div class="foodScheduleModalTitle" id="foodScheduleModalTitle"></div>',
    '<div class="foodScheduleModalBody" id="foodScheduleModalBody"></div>',
    '</div>'
  ].join('');

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) hideFoodScheduleModal();
  });

  overlay.querySelector('.foodScheduleClose')?.addEventListener('click', hideFoodScheduleModal);

  bindGlobalEscapeOnce('foodModalKeydownBound', hideFoodScheduleModal);

  document.body.appendChild(overlay);
  return overlay;
}



function hideCalendarModal() {
  const overlay = document.getElementById('calendarModal');
  if (!overlay) return;
  overlay.classList.remove('isVisible');
  document.body.classList.remove('calendarModalOpen');
  document.body.classList.remove('calendarModalOpening');
}

function ensureCalendarModal() {
  let overlay = document.getElementById('calendarModal');
  const calendarUrl = normalizeExternalTileUrl(
    typeof getRakExternalLinkUrl === 'function' ? getRakExternalLinkUrl('calendar') : CALENDAR_EMBED_URL,
    'calendarModalFrame'
  ) || CALENDAR_EMBED_URL;
  if (overlay) {
    const frame = overlay.querySelector('.calendarModalFrame');
    if (frame && frame.getAttribute('src') !== calendarUrl) frame.setAttribute('src', calendarUrl);
    return overlay;
  }

  overlay = document.createElement('div');
  overlay.id = 'calendarModal';
  overlay.className = 'calendarOverlay';
  overlay.innerHTML = [
    '<div class="calendarModal" role="dialog" aria-modal="true" aria-labelledby="calendarModalTitle">',
    '<button type="button" class="calendarModalClose" aria-label="Zavřít">×</button>',
    '<div class="calendarModalTitle" id="calendarModalTitle">Kalendář</div>',
    '<div class="calendarModalFrameWrap">',
    '<iframe class="calendarModalFrame" title="Google kalendář" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="' + escapeHtml(calendarUrl) + '"></iframe>',
    '</div>',
    '</div>'
  ].join('');

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) hideCalendarModal();
  });

  overlay.querySelector('.calendarModalClose')?.addEventListener('click', hideCalendarModal);

  bindGlobalEscapeOnce('calendarModalKeydownBound', hideCalendarModal);

  document.body.appendChild(overlay);
  return overlay;
}

function openCalendarInRak() {
  const overlay = ensureCalendarModal();
  const body = document.body;
  if (overlay.classList.contains('isVisible')) {
    body.classList.add('calendarModalOpen');
    body.classList.remove('calendarModalOpening');
    return true;
  }
  body.classList.add('calendarModalOpening');
  overlay.classList.add('isVisible');
  body.classList.add('calendarModalOpen');
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        body.classList.remove('calendarModalOpening');
      });
    });
  } else {
    if (typeof registerTimeout === 'function') registerTimeout(() => body.classList.remove('calendarModalOpening'), 32);
    else setTimeout(() => body.classList.remove('calendarModalOpening'), 32);
  }
  return true;
}

function bindCalendarTile() {
  const el = document.getElementById('dashCalendar');
  if (!el || el.dataset.rakCalendarBound === '1') return false;
  el.dataset.rakCalendarBound = '1';
  el.style.touchAction = 'manipulation';
  let openLockUntil = 0;
  const handler = (event) => {
    const now = Date.now();
    if (now < openLockUntil) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      return false;
    }
    openLockUntil = now + 900;
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    return openCalendarInRak();
  };
  el.addEventListener('click', handler, { passive: false });
  el.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') handler(event);
  });
  return true;
}

try {
  if (typeof window !== 'undefined' && !window.__rakBottomNavIndicatorResizeBound) {
    window.__rakBottomNavIndicatorResizeBound = true;
    window.addEventListener('resize', () => scheduleBottomNavActiveIndicator('resize'), { passive: true });
    window.addEventListener('orientationchange', () => scheduleBottomNavActiveIndicator('orientationchange'), { passive: true });
    if (document && document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => scheduleBottomNavActiveIndicator('dom-ready'), { once: true });
    } else {
      scheduleBottomNavActiveIndicator('init');
    }
  }
} catch (err) {}
