// RaK DEV – samostatny profil uzivatele pro prihlaseni bez zavislosti na Hernim modulu.
(function () {
  'use strict';

  const PROFILE_KEY = 'rotace_kalkulacky:user_profile_v1';
  const ACCOUNT_UI_PROFILE_KEY = 'rotace_kalkulacky:games_profile_v1';
  const ACCOUNT_UI_MIGRATION_KEY = 'rotace_kalkulacky:account_ui_migration_v1';
  const ACCOUNT_UI_PROFILE_VERSION = 912;

  // Vzhled účtu dříve sdílel úložiště s modulem Hry. Hry už se v RaK nenačítají,
  // proto tu ponecháváme jen malou kompatibilní profilovou vrstvu pro vzhled.
  function makeAccountUiEntry(accountId, name) {
    const id = String(accountId || '').trim();
    return {
      id,
      name: String(name || id).trim() || id,
      uiSettings: { themeId: '', backgroundId: '', updatedAt: 0, serverRevision: 0, serverUpdatedAt: '', dirty: false },
      updatedAt: 0
    };
  }

  function loadAccountUiProfile() {
    try {
      const parsed = JSON.parse(localStorage.getItem(ACCOUNT_UI_PROFILE_KEY) || 'null');
      if (!parsed || typeof parsed !== 'object') return { activeAccountId: '', accounts: {}, profileVersion: ACCOUNT_UI_PROFILE_VERSION };
      parsed.accounts = parsed.accounts && typeof parsed.accounts === 'object' ? parsed.accounts : {};
      parsed.activeAccountId = String(parsed.activeAccountId || '').trim();
      parsed.profileVersion = ACCOUNT_UI_PROFILE_VERSION;
      return parsed;
    } catch (err) {
      return { activeAccountId: '', accounts: {}, profileVersion: ACCOUNT_UI_PROFILE_VERSION };
    }
  }

  function saveAccountUiProfile(profile) {
    const safe = profile && typeof profile === 'object' ? profile : { activeAccountId: '', accounts: {} };
    safe.accounts = safe.accounts && typeof safe.accounts === 'object' ? safe.accounts : {};
    safe.profileVersion = ACCOUNT_UI_PROFILE_VERSION;
    try { localStorage.setItem(ACCOUNT_UI_PROFILE_KEY, JSON.stringify(safe)); } catch (err) {}
    try { if (typeof app === 'object' && app) app.gamesProfile = safe; } catch (err) {}
  }

  function getAccountUiProfile() {
    try {
      if (typeof app === 'object' && app && app.gamesProfile && typeof app.gamesProfile === 'object') return app.gamesProfile;
    } catch (err) {}
    const profile = loadAccountUiProfile();
    try { if (typeof app === 'object' && app) app.gamesProfile = profile; } catch (err) {}
    return profile;
  }

  // Zachováme názvy API, které už používá appearance-theme.js. Pokud se někdy
  // vrátí plný profil Her, jeho implementace může tyto lehké funkce nahradit.
  if (typeof window.gamesMakeAccountEntry !== 'function') window.gamesMakeAccountEntry = makeAccountUiEntry;
  if (typeof window.gamesSaveProfile !== 'function') window.gamesSaveProfile = saveAccountUiProfile;
  if (typeof window.gamesGetProfile !== 'function') window.gamesGetProfile = getAccountUiProfile;
  if (typeof window.GAMES_PROFILE_RESET_VERSION === 'undefined') window.GAMES_PROFILE_RESET_VERSION = ACCOUNT_UI_PROFILE_VERSION;

  function read() {
    try {
      if (typeof window.rakReadCachedUserProfile === 'function') return window.rakReadCachedUserProfile();
    } catch (err) {}
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed || typeof parsed !== 'object') return null;
      const accountNumber = String(parsed.accountNumber || '').trim();
      const fullName = String(parsed.fullName || '').trim();
      const requestedTeam = String(parsed.shiftTeam || '').trim().toUpperCase();
      const shiftTeam = ['A','B','C','D'].includes(requestedTeam) ? requestedTeam : '';
      if (!accountNumber || !fullName) return null;
      return { accountNumber, fullName, shiftTeam, updatedAt: Number(parsed.updatedAt || 0) || 0 };
    } catch (err) { return null; }
  }

  function resetRuntimeForAccountSwitch(nextAccountNumber) {
    const nextId = String(nextAccountNumber || '').trim();
    const current = window.__RAK_USER_PROFILE__ && typeof window.__RAK_USER_PROFILE__ === 'object' ? window.__RAK_USER_PROFILE__ : read();
    const currentId = String(current && current.accountNumber || '').trim();
    if (!nextId || !currentId || currentId === nextId) return false;
    window.__RAK_USER_PROFILE__ = null;
    window.__RAK_EARLY_USER_PROFILE__ = null;
    try {
      if (typeof app === 'object' && app) {
        app.activeAccountId = '';
        app.activeAccountName = '';
        const gamesProfile = typeof gamesGetProfile === 'function' ? gamesGetProfile() : app.gamesProfile;
        if (gamesProfile && typeof gamesProfile === 'object') {
          gamesProfile.activeAccountId = '';
          if (typeof gamesSaveProfile === 'function') gamesSaveProfile(gamesProfile);
          app.gamesProfile = gamesProfile;
        }
      }
    } catch (err) {}
    try { if (typeof applyAppearancePreference === 'function') applyAppearancePreference('obsidian', true, { skipProfile: true, skipRemote: true }); } catch (err) {}
    try { syncSettingsProfileCard(null); } catch (err) {}
    return true;
  }

  function write(profile) {
    const src = profile && typeof profile === 'object' ? profile : {};
    const requestedTeam = String(src.shiftTeam || '').trim().toUpperCase();
    const next = {
      accountNumber: String(src.accountNumber || '').trim(),
      fullName: String(src.fullName || '').trim(),
      shiftTeam: ['A','B','C','D'].includes(requestedTeam) ? requestedTeam : '',
      updatedAt: Date.now()
    };
    if (!next.accountNumber || !next.fullName) return false;
    resetRuntimeForAccountSwitch(next.accountNumber);
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(next)); } catch (err) { return false; }
    window.__RAK_USER_PROFILE__ = next;
    window.__RAK_EARLY_USER_PROFILE__ = next;
    syncSettingsProfileCard(next);
    return true;
  }

  function get() {
    if (window.__RAK_USER_PROFILE__ && typeof window.__RAK_USER_PROFILE__ === 'object') return window.__RAK_USER_PROFILE__;
    const profile = read();
    window.__RAK_USER_PROFILE__ = profile;
    return profile;
  }

  function clear() {
    try { localStorage.removeItem(PROFILE_KEY); } catch (err) {}
    window.__RAK_USER_PROFILE__ = null;
    window.__RAK_EARLY_USER_PROFILE__ = null;
    try {
      if (typeof app === 'object' && app) {
        app.activeAccountId = '';
        app.activeAccountName = '';
        const gamesProfile = typeof gamesGetProfile === 'function'
          ? gamesGetProfile()
          : (app.gamesProfile && typeof app.gamesProfile === 'object' ? app.gamesProfile : { activeAccountId: '', accounts: {} });
        gamesProfile.activeAccountId = '';
        if (typeof GAMES_PROFILE_RESET_VERSION !== 'undefined') gamesProfile.profileVersion = GAMES_PROFILE_RESET_VERSION;
        if (typeof gamesSaveProfile === 'function') gamesSaveProfile(gamesProfile);
        app.gamesProfile = gamesProfile;
      }
    } catch (err) {}
    try {
      if (typeof applyAppearancePreference === 'function') applyAppearancePreference('obsidian', true, { skipProfile: true, skipRemote: true });
    } catch (err) {}
    syncSettingsProfileCard(null);
  }

  function esc(value) {
    if (typeof escapeHtml === 'function') return escapeHtml(String(value || ''));
    return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function apply(profile, options = {}) {
    const safe = profile && typeof profile === 'object' ? profile : get();
    if (!safe) return;
    const accountNumber = String(safe.accountNumber || '').trim();
    const fullName = String(safe.fullName || '').trim();
    const requestedTeam = String(safe.shiftTeam || '').trim().toUpperCase();
    const shiftTeam = ['A','B','C','D'].includes(requestedTeam) ? requestedTeam : '';
    if (!accountNumber || !fullName) return;
    window.__RAK_USER_PROFILE__ = { accountNumber, fullName, shiftTeam, updatedAt: Number(safe.updatedAt || Date.now()) || Date.now() };
    window.__RAK_EARLY_USER_PROFILE__ = window.__RAK_USER_PROFILE__;
    try {
      if (typeof app === 'object' && app) {
        app.activeAccountId = accountNumber;
        app.activeAccountName = fullName;
        app.gamesProfile = typeof gamesGetProfile === 'function'
          ? gamesGetProfile()
          : (app.gamesProfile && typeof app.gamesProfile === 'object' ? app.gamesProfile : { activeAccountId: '', accounts: {} });
        app.gamesProfile.activeAccountId = accountNumber;
        app.gamesProfile.accounts = app.gamesProfile.accounts && typeof app.gamesProfile.accounts === 'object' ? app.gamesProfile.accounts : {};
        app.gamesProfile.accounts[accountNumber] = Object.assign({}, app.gamesProfile.accounts[accountNumber] || {}, { id: accountNumber, name: fullName });
      }
    } catch (err) {}
    // Vzhled je navázaný na herní/profilové úložiště. Rychlé přihlášení proto
    // musí založit stejný aktivní účet i zde, jinak se na jiném zařízení použije výchozí vzhled.
    try {
      if (typeof gamesGetProfile === 'function') {
        const gamesProfile = gamesGetProfile();
        if (gamesProfile && gamesProfile.accounts) {
          const makeAccount = typeof gamesMakeAccountEntry === 'function'
            ? gamesMakeAccountEntry(accountNumber, fullName)
            : { id: accountNumber, name: fullName, uiSettings: { themeId: '', backgroundId: '', updatedAt: 0, serverRevision: 0, serverUpdatedAt: '', dirty: false } };
          gamesProfile.accounts[accountNumber] = Object.assign({}, makeAccount, gamesProfile.accounts[accountNumber] || {}, { id: accountNumber, name: fullName });
          const accountUi = gamesProfile.accounts[accountNumber].uiSettings && typeof gamesProfile.accounts[accountNumber].uiSettings === 'object'
            ? gamesProfile.accounts[accountNumber].uiSettings
            : (gamesProfile.accounts[accountNumber].uiSettings = { themeId: '', backgroundId: '', updatedAt: 0 });
          if (options.migrateLegacyAppearance === true && localStorage.getItem(ACCOUNT_UI_MIGRATION_KEY) !== '1') {
            const legacyTheme = String(localStorage.getItem('rotace_kalkulacky:theme_v1') || '').trim();
            const legacyBackground = String(localStorage.getItem('rotace_kalkulacky:background_v1') || '').trim();
            const legacyAppearance = legacyTheme || legacyBackground;
            if (!accountUi.themeId && !accountUi.backgroundId && legacyAppearance && legacyAppearance !== 'obsidian') {
              accountUi.themeId = legacyAppearance;
              accountUi.backgroundId = legacyAppearance;
              accountUi.updatedAt = Date.now();
              gamesProfile.accounts[accountNumber].updatedAt = Math.max(Number(gamesProfile.accounts[accountNumber].updatedAt || 0) || 0, accountUi.updatedAt);
            }
            localStorage.setItem(ACCOUNT_UI_MIGRATION_KEY, '1');
          }
          gamesProfile.activeAccountId = accountNumber;
          if (typeof GAMES_PROFILE_RESET_VERSION !== 'undefined') gamesProfile.profileVersion = GAMES_PROFILE_RESET_VERSION;
          if (typeof gamesSaveProfile === 'function') gamesSaveProfile(gamesProfile);
          if (typeof app === 'object' && app) app.gamesProfile = gamesProfile;
          if (typeof applyProfileUiPreferencesForActiveAccount === 'function') applyProfileUiPreferencesForActiveAccount({ loadRemote: true, source: 'rak-user-login' });
        }
      }
    } catch (err) { console.warn('RaK profile appearance sync failed', err); }
    syncSettingsProfileCard(window.__RAK_USER_PROFILE__);
    // Pokud se profil doplnil až po prvním vykreslení, přepišeme pozdrav
    // hned. Nečekáme na síťovou synchronizaci ani na periodický refresh Home.
    try {
      window.dispatchEvent(new CustomEvent('rak:user-profile-ready', { detail: window.__RAK_USER_PROFILE__ }));
      if (typeof window.updateDashboard === 'function') {
        const refresh = () => { try { window.updateDashboard(); } catch (err) {} };
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(refresh);
        else setTimeout(refresh, 0);
      }
    } catch (err) {}
  }

  async function lookup(last4) {
    const suffix = String(last4 || '').replace(/\D/g, '').slice(-4);
    if (!/^\d{4}$/.test(suffix)) return { ok: false, reason: 'not-found' };
    const clientFactory = window.supabase && typeof window.supabase.createClient === 'function' ? window.supabase.createClient : null;
    const config = window.SUPABASE_CONFIG || {};
    if (!clientFactory || !config.url || !config.publishableKey) return { ok: false, reason: 'online-not-ready' };
    try {
      const client = clientFactory(config.url, config.publishableKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
      // RAK_LOGIN_RPC_17027: do not expose the whole table to the login client.
      const { data, error } = await client.rpc('rak_lookup_account_for_login_v3', { p_last4: suffix });
      if (error) return { ok: false, reason: 'lookup-failed', error };
      if (!data || data.ok !== true) return { ok: false, reason: data && data.reason || 'not-found' };
      // RAK_LOGIN_ADMIN_GATE_17045: fail closed if the admin-password flag is absent.
      if (typeof data.requiresAdminAuth !== 'boolean') return { ok: false, reason: 'admin-gate-unavailable' };
      const shiftTeam = String(data.shiftTeam || '').trim().toUpperCase();
      if (!['A','B','C','D'].includes(shiftTeam)) return { ok: false, reason: 'shift-team-unavailable' };
      return { ok: true, accountNumber: String(data.accountNumber || '').trim(), fullName: String(data.fullName || '').trim(), shiftTeam, requiresAdminAuth: data.requiresAdminAuth };
    } catch (error) {
      return { ok: false, reason: 'lookup-failed', error };
    }
  }

  function syncSettingsProfileCard(profile) {
    const card = document.getElementById('gamesAccountCard');
    if (!card) return;
    const safe = profile && typeof profile === 'object' ? profile : get();
    const top = card.querySelector('#gamesAccountTop');
    const name = card.querySelector('#gamesAccountName');
    const entry = card.querySelector('#gamesAccountEntryRow');
    const clearBtn = card.querySelector('#gamesAccountClearBtn');
    const label = top ? top.querySelector('.dashboardLabel') : null;

    if (safe && String(safe.accountNumber || '').trim() && String(safe.fullName || '').trim()) {
      const accountNumber = String(safe.accountNumber).trim();
      const fullName = String(safe.fullName).trim();
      if (label && label.textContent !== 'Přihlášený uživatel') label.textContent = 'Přihlášený uživatel';
      if (name) {
        const wanted = fullName + ' · OS ' + accountNumber;
        if (name.textContent !== wanted) name.textContent = wanted;
      }
      if (top && top.style.display === 'none') top.style.display = '';
      if (entry && entry.style.display !== 'none') entry.style.display = 'none';
      if (clearBtn) {
        if (clearBtn.textContent !== 'Odhlásit') clearBtn.textContent = 'Odhlásit';
        clearBtn.onclick = () => {
          clear();
          try { if (typeof window.installRakLoginSplash === 'function') window.installRakLoginSplash(true); } catch (err) {}
        };
      }
      return;
    }

    if (top && top.style.display !== 'none') top.style.display = 'none';
    if (entry && entry.style.display === 'none') entry.style.display = '';
    if (name && name.textContent) name.textContent = '';
  }

  function ensureMenuBox(body) {
    if (!body || !body.insertBefore) return;
    let box = document.getElementById('rakUserProfileBox');
    const profile = get();
    const html = profile
      ? `<div class="rakUserProfileBoxTitle">Přihlášený uživatel</div><div class="rakUserProfileBoxName">${esc(profile.fullName)}</div><div class="rakUserProfileBoxNumber">Osobní číslo: ${esc(profile.accountNumber)}</div><div class="rakUserProfileBoxActions"><button type="button" id="rakUserProfileChange">Změnit účet</button><button type="button" id="rakUserProfileLogout">Odhlásit</button></div>`
      : `<div class="rakUserProfileBoxTitle">Uživatel</div><div class="rakUserProfileBoxName">Nikdo není přihlášen</div><div class="rakUserProfileBoxActions"><button type="button" id="rakUserProfileLogin">Přihlásit</button></div>`;
    if (!box) {
      box = document.createElement('div');
      box.id = 'rakUserProfileBox';
      box.className = 'rakUserProfileBox';
      box.innerHTML = html;
      body.insertBefore(box, body.firstChild || null);
    } else if (box.innerHTML !== html) box.innerHTML = html;
    const change = box.querySelector('#rakUserProfileChange');
    const logout = box.querySelector('#rakUserProfileLogout');
    const login = box.querySelector('#rakUserProfileLogin');
    if (change) change.onclick = () => window.rakUserProfileOpenLogin && window.rakUserProfileOpenLogin(profile && profile.accountNumber || '');
    if (logout) logout.onclick = () => { clear(); box.remove(); if (typeof window.installRakLoginSplash === 'function') window.installRakLoginSplash(true); };
    if (login) login.onclick = () => window.installRakLoginSplash && window.installRakLoginSplash(true);
  }

  function refreshMenu() {
    const body = document.getElementById('appMenuBody');
    if (body) ensureMenuBox(body);
    syncSettingsProfileCard(get());
  }

  function openLogin(prefill) {
    if (typeof window.installRakLoginSplash === 'function') {
      const overlay = window.installRakLoginSplash(true);
      const input = document.getElementById('rakUserLoginAccountNumber');
      if (input) {
        const digits = String(prefill || '').replace(/\D/g, '');
        input.value = digits.length > 4 ? digits.slice(-4) : digits;
        try { input.focus(); input.select(); } catch (err) {}
      }
      return overlay;
    }
    return null;
  }

  async function refreshMissingShiftTeam(profile) {
    const safe = profile && typeof profile === 'object' ? profile : null;
    const currentTeam = String(safe && safe.shiftTeam || '').trim().toUpperCase();
    const accountNumber = String(safe && safe.accountNumber || '').trim();
    if (!accountNumber || ['A','B','C','D'].includes(currentTeam)) return false;
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
      const result = await lookup(accountNumber.slice(-4));
      if (!result || result.ok !== true || String(result.accountNumber || '').trim() !== accountNumber) return false;
      if (!['A','B','C','D'].includes(String(result.shiftTeam || '').trim().toUpperCase())) return false;
      if (!write(result)) return false;
      apply(result);
      return true;
    } catch (err) {
      return false;
    }
  }

  function bootstrap() {
    const profile = get();
    if (profile) {
      apply(profile, { migrateLegacyAppearance: true });
      if (!['A','B','C','D'].includes(String(profile.shiftTeam || '').trim().toUpperCase())) void refreshMissingShiftTeam(profile);
    }
    refreshMenu();
    try {
      if (!window.__rakUserProfileSettingsObserver) {
        const observer = new MutationObserver((records) => {
          const cardAdded = Array.from(records || []).some((record) => Array.from(record && record.addedNodes || []).some((node) => {
            if (!node || node.nodeType !== 1) return false;
            try { return node.id === 'gamesAccountCard' || !!(node.querySelector && node.querySelector('#gamesAccountCard')); }
            catch (err) { return false; }
          }));
          if (cardAdded) syncSettingsProfileCard(get());
        });
        observer.observe(document.body, { childList: true, subtree: true });
        window.__rakUserProfileSettingsObserver = observer;
      }
    } catch (err) {}
  }

  window.rakUserProfileRead = read;
  window.rakUserProfileWrite = write;
  window.rakUserProfileResetForAccountSwitch = resetRuntimeForAccountSwitch;
  window.rakUserProfileGet = get;
  window.rakUserProfileClear = clear;
  window.rakUserProfileEscape = esc;
  window.rakUserProfileApplyToRuntime = apply;
  window.rakUserProfileLookup = lookup;
  window.rakUserProfileEnsureMenuBox = ensureMenuBox;
  window.rakUserProfileRefreshMenu = refreshMenu;
  window.rakUserProfileSyncSettingsCard = syncSettingsProfileCard;
  window.rakUserProfileOpenLogin = openLogin;
  window.rakUserProfileBootstrap = bootstrap;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  else bootstrap();
})();
