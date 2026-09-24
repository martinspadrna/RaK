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
    if (key === 'calendar') return;
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
  const rows = ['food', 'eportal', 'payroll'].map((key) => {
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
  const current = getRakExternalLinksSettings();
  const links = { calendar: current.links.calendar };
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



const RAK_NATIVE_CALENDAR_WEEKDAYS = Object.freeze(['Po','Út','St','Čt','Pá','So','Ne']);
const RAK_NATIVE_CALENDAR_TIMEZONE = 'Europe/Prague';

function rakNativeCalendarSourceIds(value) {
  const raw = String(value || '').trim();
  if (!raw) return [];
  try {
    const normalized = typeof normalizeRakGoogleCalendarUrl === 'function' ? normalizeRakGoogleCalendarUrl(raw) : raw;
    const url = new URL(normalized || raw);
    if (url.hostname !== 'calendar.google.com') return [];
    if (/^\/calendar\/embed\/?$/.test(url.pathname)) {
      return Array.from(new Set(url.searchParams.getAll('src').map((src) => String(src || '').trim()).filter(Boolean))).slice(0, 8);
    }
    const match = url.pathname.match(/^\/calendar\/ical\/([^/]+)\/public\/basic\.ics$/);
    if (!match) return [];
    try { return [decodeURIComponent(match[1] || '').trim()].filter(Boolean); }
    catch (_) { return []; }
  } catch (_) {
    return [];
  }
}

function rakNativeCalendarDecodeText(value) {
  return String(value || '')
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

function rakNativeCalendarProperties(block, wantedName) {
  const wanted = String(wantedName || '').toUpperCase();
  return String(block || '').replace(/\r?\n[ \t]/g, '').split(/\r?\n/).flatMap((line) => {
    const split = line.indexOf(':');
    if (split < 0) return [];
    const left = line.slice(0, split);
    const parts = left.split(';');
    if (String(parts.shift() || '').toUpperCase() !== wanted) return [];
    const params = {};
    parts.forEach((part) => {
      const idx = part.indexOf('=');
      if (idx > 0) params[String(part.slice(0, idx)).toUpperCase()] = part.slice(idx + 1);
    });
    return [{ key: left, params, value: line.slice(split + 1) }];
  });
}

function rakNativeCalendarPragueParts(date) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: RAK_NATIVE_CALENDAR_TIMEZONE,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date).reduce((acc, part) => {
      if (part.type !== 'literal') acc[part.type] = part.value;
      return acc;
    }, {});
    return {
      key: String(parts.year) + '-' + String(parts.month) + '-' + String(parts.day),
      time: String(parts.hour) + ':' + String(parts.minute)
    };
  } catch (_) {
    return { key: '', time: '' };
  }
}

function rakNativeCalendarDateValue(prop) {
  const value = String(prop && prop.value || '').trim();
  const match = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?(Z)?$/);
  if (!match) return null;
  const allDay = String(prop && prop.params && prop.params.VALUE || '').toUpperCase() === 'DATE' || !match[4];
  const rawKey = match[1] + '-' + match[2] + '-' + match[3];
  if (allDay) return { key: rawKey, time: '', allDay: true };
  if (match[7] === 'Z') {
    const utc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6] || 0)));
    const local = rakNativeCalendarPragueParts(utc);
    return { key: local.key || rawKey, time: local.time || (match[4] + ':' + match[5]), allDay: false };
  }
  return { key: rawKey, time: match[4] + ':' + match[5], allDay: false };
}

function rakNativeCalendarDateFromKey(key) {
  const match = String(key || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isFinite(date.getTime()) ? date : null;
}

function rakNativeCalendarKey(date) {
  return date && Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : '';
}

function rakNativeCalendarAddDays(date, amount) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + Number(amount || 0));
  return next;
}

function rakNativeCalendarDaysBetween(a, b) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function rakNativeCalendarWeekdayToken(date) {
  return ['SU','MO','TU','WE','TH','FR','SA'][date.getUTCDay()];
}

function rakNativeCalendarRule(value) {
  const rule = {};
  String(value || '').split(';').forEach((part) => {
    const split = part.indexOf('=');
    if (split > 0) rule[String(part.slice(0, split)).toUpperCase()] = String(part.slice(split + 1));
  });
  return rule;
}

function rakNativeCalendarWeekStart(date, token) {
  const index = { SU:0, MO:1, TU:2, WE:3, TH:4, FR:5, SA:6 }[String(token || 'MO').toUpperCase()];
  const wanted = Number.isInteger(index) ? index : 1;
  const diff = (date.getUTCDay() - wanted + 7) % 7;
  return rakNativeCalendarAddDays(date, -diff);
}

function rakNativeCalendarMonthlyByDay(date, token) {
  const match = String(token || '').toUpperCase().match(/^([+-]?\d+)?(MO|TU|WE|TH|FR|SA|SU)$/);
  if (!match || rakNativeCalendarWeekdayToken(date) !== match[2]) return false;
  if (!match[1]) return true;
  const ordinal = Number(match[1]);
  const day = date.getUTCDate();
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  const occurrence = Math.floor((day - 1) / 7) + 1;
  const reverse = -(Math.floor((lastDay - day) / 7) + 1);
  return ordinal > 0 ? occurrence === ordinal : reverse === ordinal;
}

function rakNativeCalendarMatchesRule(rule, date, base) {
  if (!rule || !rule.FREQ || date < base) return false;
  const interval = Math.max(1, Number(rule.INTERVAL || 1) || 1);
  const diffDays = rakNativeCalendarDaysBetween(base, date);
  const byMonth = String(rule.BYMONTH || '').split(',').map(Number).filter(Boolean);
  if (byMonth.length && !byMonth.includes(date.getUTCMonth() + 1)) return false;
  const byMonthDay = String(rule.BYMONTHDAY || '').split(',').map(Number).filter(Boolean);
  const byDay = String(rule.BYDAY || '').split(',').filter(Boolean);
  const freq = String(rule.FREQ).toUpperCase();

  if (freq === 'DAILY') {
    if (diffDays % interval !== 0) return false;
    if (byDay.length && !byDay.some((token) => rakNativeCalendarMonthlyByDay(date, token.replace(/^[+-]?\d+/, '')))) return false;
    return !byMonthDay.length || byMonthDay.includes(date.getUTCDate());
  }

  if (freq === 'WEEKLY') {
    const startWeek = rakNativeCalendarWeekStart(base, rule.WKST || 'MO');
    const dateWeek = rakNativeCalendarWeekStart(date, rule.WKST || 'MO');
    const weeks = Math.round((dateWeek.getTime() - startWeek.getTime()) / (7 * 86400000));
    if (weeks < 0 || weeks % interval !== 0) return false;
    const allowedDays = byDay.length ? byDay.map((token) => token.replace(/^[+-]?\d+/, '').toUpperCase()) : [rakNativeCalendarWeekdayToken(base)];
    return allowedDays.includes(rakNativeCalendarWeekdayToken(date));
  }

  if (freq === 'MONTHLY') {
    const months = (date.getUTCFullYear() - base.getUTCFullYear()) * 12 + date.getUTCMonth() - base.getUTCMonth();
    if (months < 0 || months % interval !== 0) return false;
    if (byMonthDay.length && !byMonthDay.includes(date.getUTCDate())) return false;
    if (byDay.length && !byDay.some((token) => rakNativeCalendarMonthlyByDay(date, token))) return false;
    if (!byMonthDay.length && !byDay.length && date.getUTCDate() !== base.getUTCDate()) return false;
    if (rule.BYSETPOS && byDay.length) {
      const positions = String(rule.BYSETPOS).split(',').map(Number).filter(Boolean);
      const matching = [];
      const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
      for (let d = 1; d <= last; d += 1) {
        const candidate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), d));
        if (byDay.some((token) => rakNativeCalendarMonthlyByDay(candidate, token))) matching.push(d);
      }
      const selected = positions.flatMap((pos) => pos > 0 ? [matching[pos - 1]] : [matching[matching.length + pos]]).filter(Boolean);
      if (!selected.includes(date.getUTCDate())) return false;
    }
    return true;
  }

  if (freq === 'YEARLY') {
    const years = date.getUTCFullYear() - base.getUTCFullYear();
    if (years < 0 || years % interval !== 0) return false;
    if (!byMonth.length && date.getUTCMonth() !== base.getUTCMonth()) return false;
    if (byMonthDay.length && !byMonthDay.includes(date.getUTCDate())) return false;
    if (byDay.length && !byDay.some((token) => rakNativeCalendarMonthlyByDay(date, token))) return false;
    if (!byMonthDay.length && !byDay.length && date.getUTCDate() !== base.getUTCDate()) return false;
    return true;
  }

  return false;
}

function rakNativeCalendarParseIcs(text, sourceLabel) {
  const unfolded = String(text || '').replace(/\r?\n[ \t]/g, '');
  if (!unfolded.includes('BEGIN:VCALENDAR')) return [];
  const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
  return blocks.flatMap((block, index) => {
    const startProp = rakNativeCalendarProperties(block, 'DTSTART')[0];
    const start = rakNativeCalendarDateValue(startProp);
    if (!start) return [];
    const end = rakNativeCalendarDateValue(rakNativeCalendarProperties(block, 'DTEND')[0]);
    const recurrence = rakNativeCalendarDateValue(rakNativeCalendarProperties(block, 'RECURRENCE-ID')[0]);
    const exdates = new Set();
    rakNativeCalendarProperties(block, 'EXDATE').forEach((prop) => {
      String(prop.value || '').split(',').forEach((value) => {
        const parsed = rakNativeCalendarDateValue({ params: prop.params, value });
        if (parsed && parsed.key) exdates.add(parsed.key);
      });
    });
    return [{
      uid: rakNativeCalendarDecodeText(rakNativeCalendarProperties(block, 'UID')[0]?.value || ('event-' + index)),
      summary: rakNativeCalendarDecodeText(rakNativeCalendarProperties(block, 'SUMMARY')[0]?.value || 'Událost'),
      description: rakNativeCalendarDecodeText(rakNativeCalendarProperties(block, 'DESCRIPTION')[0]?.value || ''),
      location: rakNativeCalendarDecodeText(rakNativeCalendarProperties(block, 'LOCATION')[0]?.value || ''),
      start,
      end,
      recurrenceKey: recurrence && recurrence.key || '',
      rrule: rakNativeCalendarProperties(block, 'RRULE')[0]?.value || '',
      exdates,
      cancelled: /^CANCELLED$/i.test(String(rakNativeCalendarProperties(block, 'STATUS')[0]?.value || '').trim()),
      sourceLabel: String(sourceLabel || '').trim()
    }];
  });
}

function rakNativeCalendarAppendOccurrence(target, event, dateKey) {
  const startDate = rakNativeCalendarDateFromKey(dateKey);
  if (!startDate) return;
  let durationDays = 1;
  if (event.start && event.start.allDay && event.end && event.end.key) {
    const endDate = rakNativeCalendarDateFromKey(event.end.key);
    if (endDate && endDate > startDate) durationDays = Math.max(1, Math.min(31, rakNativeCalendarDaysBetween(startDate, endDate)));
  }
  for (let i = 0; i < durationDays; i += 1) {
    target.push({
      dateKey: rakNativeCalendarKey(rakNativeCalendarAddDays(startDate, i)),
      time: event.start && event.start.time || '',
      endTime: event.end && event.end.time || '',
      allDay: !!(event.start && event.start.allDay),
      summary: event.summary || 'Událost',
      description: event.description || '',
      location: event.location || '',
      sourceLabel: event.sourceLabel || ''
    });
  }
}

function rakNativeCalendarExpand(events, rangeStartKey, rangeEndKey) {
  const rangeStart = rakNativeCalendarDateFromKey(rangeStartKey);
  const rangeEnd = rakNativeCalendarDateFromKey(rangeEndKey);
  if (!rangeStart || !rangeEnd) return [];
  const result = [];
  const exceptionKeys = new Set((events || []).filter((event) => event && event.recurrenceKey).map((event) => String(event.uid || '') + '|' + event.recurrenceKey));

  (events || []).forEach((event) => {
    if (!event || !event.start || !event.start.key) return;
    if (event.recurrenceKey) {
      if (!event.cancelled && event.start.key >= rangeStartKey && event.start.key <= rangeEndKey) rakNativeCalendarAppendOccurrence(result, event, event.start.key);
      return;
    }
    if (event.cancelled) return;

    if (!event.rrule) {
      if (event.start.key <= rangeEndKey && (!event.end || !event.end.key || event.end.key >= rangeStartKey)) rakNativeCalendarAppendOccurrence(result, event, event.start.key);
      return;
    }

    const baseDate = rakNativeCalendarDateFromKey(event.start.key);
    const rule = rakNativeCalendarRule(event.rrule);
    if (!baseDate || !rule.FREQ) return;
    const untilMatch = String(rule.UNTIL || '').match(/^(\d{4})(\d{2})(\d{2})/);
    const untilKey = untilMatch ? untilMatch[1] + '-' + untilMatch[2] + '-' + untilMatch[3] : '';
    const maxCount = Math.max(0, Number(rule.COUNT || 0) || 0);
    let occurrenceCount = 0;
    let cursor = new Date(baseDate.getTime());
    let safety = 0;

    while (cursor <= rangeEnd && safety < 12000) {
      const key = rakNativeCalendarKey(cursor);
      if (untilKey && key > untilKey) break;
      if (rakNativeCalendarMatchesRule(rule, cursor, baseDate)) {
        occurrenceCount += 1;
        if (maxCount && occurrenceCount > maxCount) break;
        if (key >= rangeStartKey && !event.exdates.has(key) && !exceptionKeys.has(String(event.uid || '') + '|' + key)) {
          rakNativeCalendarAppendOccurrence(result, event, key);
        }
      }
      cursor = rakNativeCalendarAddDays(cursor, 1);
      safety += 1;
    }
  });

  return result.filter((event) => event.dateKey >= rangeStartKey && event.dateKey <= rangeEndKey)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey) || String(a.time || '99:99').localeCompare(String(b.time || '99:99')) || a.summary.localeCompare(b.summary, 'cs'));
}

function rakNativeCalendarMonthRange(year, month) {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const start = rakNativeCalendarAddDays(first, -offset);
  return { start, end: rakNativeCalendarAddDays(start, 41) };
}

function rakNativeCalendarTodayKey() {
  const now = new Date();
  return String(now.getFullYear()) + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
}

function rakNativeCalendarMonthLabel(year, month) {
  try { return new Intl.DateTimeFormat('cs-CZ', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month, 1))); }
  catch (_) { return String(month + 1) + '/' + String(year); }
}

function rakNativeCalendarDayLabel(key) {
  const date = rakNativeCalendarDateFromKey(key);
  if (!date) return key;
  try { return new Intl.DateTimeFormat('cs-CZ', { weekday: 'long', day: 'numeric', month: 'numeric', timeZone: 'UTC' }).format(date); }
  catch (_) { return key; }
}

function rakNativeCalendarDisplaySummary(event) {
  const summary = String(event && event.summary || '').trim() || 'Událost';
  const normalized = summary.toLocaleLowerCase('cs-CZ').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!['busy','zaneprazdnen','zaneprazdneno'].includes(normalized)) return summary;
  const time = String(event && (event.time || (event.start && event.start.time)) || '');
  if (time.startsWith('06:')) return 'Ranní';
  if (time.startsWith('18:') || time.startsWith('22:')) return 'Noční';
  return summary;
}

function rakNativeCalendarAgendaTime(event) {
  if (event && event.allDay) return 'celý den';
  const start = String(event && event.time || '').trim();
  const end = String(event && event.endTime || '').trim();
  if (start && end) return start + '–' + end;
  return start || end;
}

function rakNativeCalendarRender(content) {
  const host = content && content.querySelector('.calendarNativeHost');
  const state = content && content.__rakCalendarState;
  if (!host || !state) return false;
  if (state.loading) {
    host.innerHTML = '<div class="calendarNativeStatus" aria-live="polite"><span class="calendarNativeSpinner" aria-hidden="true"></span>Načítám veřejný kalendář…</div>';
    return true;
  }
  if (state.error) {
    const external = state.externalUrl ? '<a class="appMenuAction calendarNativeExternal" href="' + escapeHtml(state.externalUrl) + '" target="_blank" rel="noopener noreferrer">Otevřít v prohlížeči</a>' : '';
    host.innerHTML = '<div class="calendarNativeError"><b>Kalendář se nepodařilo načíst.</b><span>RaK používá veřejný ICS bez Google cookies. Zkus načtení znovu.</span><button type="button" class="appMenuAction isActive" data-calendar-retry>Načíst znovu</button>' + external + '</div>';
    return true;
  }

  const range = rakNativeCalendarMonthRange(state.year, state.month);
  const rangeStartKey = rakNativeCalendarKey(range.start);
  const rangeEndKey = rakNativeCalendarKey(range.end);
  const expanded = rakNativeCalendarExpand(state.events, rangeStartKey, rangeEndKey);
  const byDay = new Map();
  expanded.forEach((event) => {
    if (!byDay.has(event.dateKey)) byDay.set(event.dateKey, []);
    byDay.get(event.dateKey).push(event);
  });

  const currentMonthPrefix = String(state.year) + '-' + String(state.month + 1).padStart(2, '0') + '-';
  const todayKey = rakNativeCalendarTodayKey();
  if (!state.selectedKey || state.selectedKey < rangeStartKey || state.selectedKey > rangeEndKey) {
    state.selectedKey = todayKey.startsWith(currentMonthPrefix) ? todayKey : currentMonthPrefix + '01';
  }

  const days = [];
  for (let i = 0; i < 42; i += 1) {
    const date = rakNativeCalendarAddDays(range.start, i);
    const key = rakNativeCalendarKey(date);
    const events = byDay.get(key) || [];
    const chips = events.slice(0, 2).map((event) => '<span class="calendarNativeChip">' + escapeHtml((event.time ? event.time + ' ' : '') + rakNativeCalendarDisplaySummary(event)) + '</span>').join('');
    const more = events.length > 2 ? '<span class="calendarNativeMore">+' + String(events.length - 2) + '</span>' : '';
    const classes = [
      'calendarNativeDay',
      key.startsWith(currentMonthPrefix) ? '' : 'isOutside',
      key === todayKey ? 'isToday' : '',
      key === state.selectedKey ? 'isSelected' : '',
      events.length ? 'hasEvents' : ''
    ].filter(Boolean).join(' ');
    days.push('<button type="button" class="' + classes + '" data-calendar-day="' + key + '" aria-pressed="' + String(key === state.selectedKey) + '"><span class="calendarNativeDayNumber">' + String(date.getUTCDate()) + '</span><span class="calendarNativeDayEvents">' + chips + more + '</span></button>');
  }

  const selectedEvents = byDay.get(state.selectedKey) || [];
  const agenda = selectedEvents.length
    ? selectedEvents.map((event) => [
        '<div class="calendarNativeAgendaItem">',
        '<div class="calendarNativeAgendaTime">' + escapeHtml(rakNativeCalendarAgendaTime(event)) + '</div>',
        '<div class="calendarNativeAgendaText"><b>' + escapeHtml(rakNativeCalendarDisplaySummary(event)) + '</b>',
        event.location ? '<span>' + escapeHtml(event.location) + '</span>' : '',
        event.description ? '<small>' + escapeHtml(event.description) + '</small>' : '',
        '</div></div>'
      ].join('')).join('')
    : '<div class="calendarNativeAgendaEmpty">Žádné události.</div>';

  const warning = state.partialError ? '<div class="calendarNativeWarning">Část zdrojů se nepodařilo načíst.</div>' : '';
  host.innerHTML = [
    '<div class="calendarNative">',
    '<div class="calendarNativeToolbar">',
    '<button type="button" class="calendarNativeNav" data-calendar-nav="-1" aria-label="Předchozí měsíc">‹</button>',
    '<div class="calendarNativeMonthTitle">' + escapeHtml(rakNativeCalendarMonthLabel(state.year, state.month)) + '</div>',
    '<button type="button" class="calendarNativeNav" data-calendar-nav="1" aria-label="Další měsíc">›</button>',
    '<button type="button" class="calendarNativeToday" data-calendar-today>Dnes</button>',
    '</div>',
    warning,
    '<div class="calendarNativeWeekdays">' + RAK_NATIVE_CALENDAR_WEEKDAYS.map((day) => '<span>' + day + '</span>').join('') + '</div>',
    '<div class="calendarNativeGrid">' + days.join('') + '</div>',
    '<div class="calendarNativeAgenda"><div class="calendarNativeAgendaTitle">' + escapeHtml(rakNativeCalendarDayLabel(state.selectedKey)) + '</div>' + agenda + '</div>',
    '</div>'
  ].join('');
  return true;
}

async function rakNativeCalendarLoad(content, index) {
  const calendars = content && Array.isArray(content.__rakCalendars) ? content.__rakCalendars : [];
  const selected = calendars[Number(index) || 0];
  if (!content || !selected) return false;
  const state = content.__rakCalendarState || {};
  const token = Number(state.token || 0) + 1;
  const now = new Date();
  Object.assign(state, {
    token,
    calendarIndex: Number(index) || 0,
    year: Number.isInteger(state.year) ? state.year : now.getFullYear(),
    month: Number.isInteger(state.month) ? state.month : now.getMonth(),
    selectedKey: state.selectedKey || rakNativeCalendarTodayKey(),
    loading: true,
    error: '',
    partialError: false,
    externalUrl: selected.url,
    events: []
  });
  content.__rakCalendarState = state;
  rakNativeCalendarRender(content);

  const sources = rakNativeCalendarSourceIds(selected.url);
  if (!sources.length) {
    state.loading = false;
    state.error = 'invalid_source';
    rakNativeCalendarRender(content);
    return false;
  }

  const settled = await Promise.allSettled(sources.map(async (source, sourceIndex) => {
    const response = await fetch('/api/public-calendar?src=' + encodeURIComponent(source), { credentials: 'same-origin' });
    if (!response || !response.ok) throw new Error('HTTP ' + String(response && response.status || ''));
    const text = await response.text();
    return rakNativeCalendarParseIcs(text, sources.length > 1 ? (selected.label + ' ' + String(sourceIndex + 1)) : selected.label);
  }));

  if (!content.__rakCalendarState || content.__rakCalendarState.token !== token) return false;
  const successful = settled.filter((item) => item.status === 'fulfilled').flatMap((item) => item.value || []);
  state.loading = false;
  state.partialError = settled.some((item) => item.status === 'rejected');
  if (!successful.length) state.error = 'calendar_unavailable';
  else state.events = successful;
  rakNativeCalendarRender(content);
  return !state.error;
}


function hideCalendarModal() {
  const overlay = document.getElementById('calendarModal');
  if (!overlay) return;
  overlay.classList.remove('isVisible');
  document.body.classList.remove('calendarModalOpen');
  document.body.classList.remove('calendarModalOpening');
}

function renderCalendarModalContent(overlay) {
  if (!overlay) return false;
  const context = typeof getRakActiveShiftCalendarContext === 'function'
    ? getRakActiveShiftCalendarContext()
    : { team: 'D', calendars: [] };
  const team = String(context && context.team || 'D');
  const calendars = Array.isArray(context && context.calendars) ? context.calendars : [];
  const title = overlay.querySelector('#calendarModalTitle');
  const content = overlay.querySelector('#calendarModalContent');
  if (title) title.textContent = 'Kalendář · směna ' + team;
  if (!content) return false;
  if (!calendars.length) {
    content.innerHTML = '<div class="appMenuText">Pro směnu ' + escapeHtml(team) + ' není nastavený žádný kalendář.</div>';
    content.__rakCalendars = [];
    content.__rakCalendarState = null;
    return true;
  }
  const buttons = calendars.length > 1
    ? '<div class="appMenuActionRow calendarModalChoices">' + calendars.map((entry, index) => (
        '<button type="button" class="appMenuAction calendarModalChoice' + (index === 0 ? ' isActive' : '') + '" data-calendar-choice-index="' + String(index) + '">' + escapeHtml(entry.label || ('Kalendář ' + String(index + 1))) + '</button>'
      )).join('') + '</div>'
    : '';
  content.innerHTML = buttons + '<div class="calendarNativeHost"></div>';
  content.dataset.calendarTeam = team;
  content.__rakCalendars = calendars;
  content.__rakCalendarState = null;
  void rakNativeCalendarLoad(content, 0);
  return true;
}

function ensureCalendarModal() {
  let overlay = document.getElementById('calendarModal');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'calendarModal';
    overlay.className = 'calendarOverlay';
    overlay.innerHTML = [
      '<div class="calendarModal" role="dialog" aria-modal="true" aria-labelledby="calendarModalTitle">',
      '<button type="button" class="calendarModalClose" aria-label="Zavřít">×</button>',
      '<div class="calendarModalTitle" id="calendarModalTitle">Kalendář</div>',
      '<div id="calendarModalContent"></div>',
      '</div>'
    ].join('');

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        hideCalendarModal();
        return;
      }
      const content = overlay.querySelector('#calendarModalContent');
      const choice = event.target && event.target.closest ? event.target.closest('[data-calendar-choice-index]') : null;
      if (choice) {
        const calendars = content && Array.isArray(content.__rakCalendars) ? content.__rakCalendars : [];
        const index = Number(choice.getAttribute('data-calendar-choice-index'));
        if (!Number.isInteger(index) || !calendars[index]) return;
        overlay.querySelectorAll('[data-calendar-choice-index]').forEach((button) => button.classList.toggle('isActive', button === choice));
        if (content.__rakCalendarState) {
          const now = new Date();
          content.__rakCalendarState.year = now.getFullYear();
          content.__rakCalendarState.month = now.getMonth();
          content.__rakCalendarState.selectedKey = rakNativeCalendarTodayKey();
        }
        void rakNativeCalendarLoad(content, index);
        return;
      }

      const navButton = event.target && event.target.closest ? event.target.closest('[data-calendar-nav]') : null;
      if (navButton && content && content.__rakCalendarState) {
        const delta = Number(navButton.getAttribute('data-calendar-nav')) || 0;
        const state = content.__rakCalendarState;
        const next = new Date(Date.UTC(state.year, state.month + delta, 1));
        state.year = next.getUTCFullYear();
        state.month = next.getUTCMonth();
        state.selectedKey = String(state.year) + '-' + String(state.month + 1).padStart(2, '0') + '-01';
        rakNativeCalendarRender(content);
        return;
      }

      const todayButton = event.target && event.target.closest ? event.target.closest('[data-calendar-today]') : null;
      if (todayButton && content && content.__rakCalendarState) {
        const now = new Date();
        content.__rakCalendarState.year = now.getFullYear();
        content.__rakCalendarState.month = now.getMonth();
        content.__rakCalendarState.selectedKey = rakNativeCalendarTodayKey();
        rakNativeCalendarRender(content);
        return;
      }

      const dayButton = event.target && event.target.closest ? event.target.closest('[data-calendar-day]') : null;
      if (dayButton && content && content.__rakCalendarState) {
        const key = String(dayButton.getAttribute('data-calendar-day') || '');
        if (!rakNativeCalendarDateFromKey(key)) return;
        content.__rakCalendarState.selectedKey = key;
        const date = rakNativeCalendarDateFromKey(key);
        if (date) {
          content.__rakCalendarState.year = date.getUTCFullYear();
          content.__rakCalendarState.month = date.getUTCMonth();
        }
        rakNativeCalendarRender(content);
        return;
      }

      const retryButton = event.target && event.target.closest ? event.target.closest('[data-calendar-retry]') : null;
      if (retryButton && content && content.__rakCalendarState) {
        void rakNativeCalendarLoad(content, content.__rakCalendarState.calendarIndex || 0);
      }
    });

    overlay.querySelector('.calendarModalClose')?.addEventListener('click', hideCalendarModal);
    bindGlobalEscapeOnce('calendarModalKeydownBound', hideCalendarModal);
    document.body.appendChild(overlay);
  }
  renderCalendarModalContent(overlay);
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
