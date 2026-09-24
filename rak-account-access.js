// RaK DEV – oddeleni prihlasovacich uctu od rozpisu a admin heslo na uvodnim loginu.
(function () {
  'use strict';

  const ADMIN_PROMPTED_KEY = 'adminPromptedAccountSession';
  const STYLE_ID = 'rak-account-access-style-v1';
  let directoryPromise = null;
  let directoryRows = [];
  let loginBusy = false;

  function esc(value) {
    if (typeof window.escapeHtml === 'function') return window.escapeHtml(String(value || ''));
    return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function supabaseClient() {
    const factory = window.supabase && typeof window.supabase.createClient === 'function' ? window.supabase.createClient : null;
    const config = window.SUPABASE_CONFIG || {};
    if (!factory || !config.url || !config.publishableKey) return null;
    try {
      return factory(config.url, config.publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });
    } catch (err) {
      return null;
    }
  }

  async function loadDirectory(force) {
    // RAK_ADMIN_DIRECTORY_RPC_17027: cached names are never returned after admin sign-out.
    const bridge = window.RotationSupabaseBridge;
    if (!bridge || typeof bridge.getAdminAccessToken !== 'function' || !(await bridge.getAdminAccessToken())) {
      directoryRows = [];
      throw new Error('admin-auth-required');
    }
    if (directoryRows.length && !force) return directoryRows.slice();
    if (directoryPromise && !force) return directoryPromise;
    directoryPromise = (async () => {
      const result = await bridge.listApplicationAccountsSecure();
      if (!result || !result.ok) throw (result && result.error || new Error('admin-directory-unavailable'));
      const data = result.rows;
      directoryRows = (Array.isArray(data) ? data : []).map((row) => ({
        accountNumber: String(row && row.account_number || '').trim(),
        fullName: String(row && row.full_name || '').trim()
      })).filter((row) => row.accountNumber && row.fullName);
      return directoryRows.slice();
    })();
    try { return await directoryPromise; }
    finally { directoryPromise = null; }
  }

  async function accountNeedsAdminPassword(accountId) {
    const id = String(accountId || '').trim();
    if (!id) return false;
    const client = supabaseClient();
    if (!client) throw new Error('admin-check-not-ready');
    const { data, error } = await client.rpc('rak_admin_account_requires_auth', { p_account_id: id });
    if (error) throw error;
    return data === true;
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .rakSplashPanel.rakAdminGateActive{position:relative}
      .rakSplashPanel.rakAdminGateActive>:not(.rakAdminLoginGate){display:none!important}
      .rakAdminLoginGate{display:grid;gap:12px;text-align:center}
      .rakAdminLoginGateName{font-weight:850;font-size:18px}
      .rakAdminLoginGateAccount{font-size:12px;opacity:.62;margin-top:-7px}
      .rakAdminLoginGate .rakSplashInput{letter-spacing:.08em;padding-left:18px}
      .rakAdminLoginGateSecondary{width:100%;min-height:42px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(255,255,255,.045);color:inherit;font-weight:750}
      .rakAdminResolvedName{display:block;margin-top:4px;font-size:11px;line-height:1.25;opacity:.72;white-space:normal}
      .rakAdminResolvedName.isMissing{color:#ffb0a8;opacity:.95}
      .rakAccountDirectoryBlock{margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,.10)}
      .rakAccountDirectoryNote{margin-bottom:10px}
      .rakAccountDirectoryBlock td:first-child{font-weight:750}
      .rakAccountDirectoryBlock td:last-child{font-variant-numeric:tabular-nums;white-space:nowrap}
      .rakAccountDirectoryTable{width:220px!important;min-width:220px!important;max-width:100%;table-layout:fixed}
      .rakAccountDirectoryNameCol{width:160px}
      .rakAccountDirectoryNumberCol{width:60px}
      .rakAccountDirectoryTable th,.rakAccountDirectoryTable td{padding-left:5px!important;padding-right:5px!important;overflow:hidden;text-overflow:ellipsis}
    `;
    document.head.appendChild(style);
  }

  function rejectLogin(message) {
    const panel = document.getElementById('rakSplashPanel');
    const brand = document.getElementById('rakSplashBrand');
    const status = document.getElementById('rakUserLoginStatus');
    brand && brand.classList.remove('error');
    panel && panel.classList.remove('error');
    try { if (brand) void brand.offsetWidth; if (panel) void panel.offsetWidth; } catch (err) {}
    brand && brand.classList.add('error');
    panel && panel.classList.add('error');
    if (status) { status.textContent = message || 'Ověření se nepodařilo.'; status.classList.add('error'); }
  }

  function releaseOriginalSubmit(button) {
    if (!button) return;
    button.dataset.rakAccountAccessAuthorized = '1';
    button.disabled = false;
    button.click();
  }

  function waitForSecureSignIn(timeoutMs) {
    const started = Date.now();
    return new Promise((resolve) => {
      const check = () => {
        if (typeof window.rakAdminSecureSignIn === 'function') { resolve(window.rakAdminSecureSignIn); return; }
        if (Date.now() - started >= timeoutMs) { resolve(null); return; }
        setTimeout(check, 80);
      };
      check();
    });
  }

  function showAdminPasswordGate(profile, originalButton) {
    ensureStyles();
    const panel = document.getElementById('rakSplashPanel');
    if (!panel) return Promise.resolve(false);
    panel.classList.remove('error');
    panel.classList.add('rakAdminGateActive');
    const old = panel.querySelector('.rakAdminLoginGate');
    if (old) old.remove();
    const gate = document.createElement('div');
    gate.className = 'rakAdminLoginGate';
    gate.innerHTML = [
      '<h1 class="rakSplashHeading">Ověření správce</h1>',
      '<div class="rakAdminLoginGateName">' + esc(profile.fullName) + '</div>',
      '<div class="rakAdminLoginGateAccount">OS ' + esc(profile.accountNumber) + '</div>',
      '<p class="rakSplashHint" style="margin:2px 0 4px">Tento účet má administrátorská práva. Pro vstup zadej heslo administrace.</p>',
      '<input class="rakSplashInput" type="password" id="rakAdminIntroPassword" autocomplete="current-password" placeholder="Heslo" aria-label="Heslo administrace">',
      '<div class="rakSplashStatus" id="rakAdminIntroStatus" aria-live="polite"></div>',
      '<button class="rakSplashButton" id="rakAdminIntroSubmit" type="button">Přihlásit</button>',
      '<button class="rakAdminLoginGateSecondary" id="rakAdminIntroChangeAccount" type="button">Zadat jiné OS číslo</button>'
    ].join('');
    panel.appendChild(gate);
    const password = gate.querySelector('#rakAdminIntroPassword');
    const submit = gate.querySelector('#rakAdminIntroSubmit');
    const change = gate.querySelector('#rakAdminIntroChangeAccount');
    const state = gate.querySelector('#rakAdminIntroStatus');
    const setState = (text, error) => {
      if (!state) return;
      state.textContent = text || '';
      state.classList.toggle('error', !!error);
    };
    let resolveGate = null;
    const resetToAccount = () => {
      try { sessionStorage.removeItem(ADMIN_PROMPTED_KEY); } catch (err) {}
      gate.remove();
      panel.classList.remove('rakAdminGateActive');
      const input = document.getElementById('rakUserLoginAccountNumber');
      if (input) { input.value = ''; try { input.focus(); } catch (err) {} }
      if (originalButton) originalButton.disabled = false;
      loginBusy = false;
      if (resolveGate) { const done = resolveGate; resolveGate = null; done(false); }
    };
    if (change) change.addEventListener('click', resetToAccount);
    if (password) password.addEventListener('keydown', (event) => { if (event.key === 'Enter') submit && submit.click(); });
    setTimeout(() => { try { password && password.focus(); } catch (err) {} }, 60);

    return new Promise((resolve) => {
      resolveGate = resolve;
      if (!submit) { resolveGate = null; resolve(false); return; }
      submit.addEventListener('click', async () => {
        const pass = String(password && password.value || '');
        if (!pass) { setState('Zadej heslo.', true); return; }
        submit.disabled = true;
        setState('Ověřuji heslo…', false);
        try {
          try { sessionStorage.setItem(ADMIN_PROMPTED_KEY, String(profile.accountNumber)); } catch (err) {}
          const signIn = await waitForSecureSignIn(12000);
          if (!signIn) { setState('Zabezpečené přihlášení se nenačetlo. Zkus to znovu.', true); return; }
          const result = await signIn(String(profile.accountNumber), pass);
          if (!result || !result.ok) {
            setState('Špatné heslo administrace.', true);
            if (password) { password.value = ''; try { password.focus(); } catch (err) {} }
            return;
          }
          setState('Přihlášení správce ověřeno ✓', false);
          gate.remove();
          panel.classList.remove('rakAdminGateActive');
          if (resolveGate) { const done = resolveGate; resolveGate = null; done(true); }
        } catch (err) {
          setState('Ověření administrace se nepodařilo. Zkus to znovu.', true);
        } finally {
          submit.disabled = false;
        }
      });
    });
  }

  async function interceptIntroLogin(button) {
    if (loginBusy || !button) return;
    loginBusy = true;
    const input = document.getElementById('rakUserLoginAccountNumber');
    const last4 = String(input && input.value || '').replace(/\D/g, '');
    if (!/^\d{4}$/.test(last4)) { rejectLogin('Zadej 4 číslice.'); loginBusy = false; return; }
    button.disabled = true;
    const status = document.getElementById('rakUserLoginStatus');
    if (status) { status.textContent = 'Ověřuji účet…'; status.classList.remove('error'); }
    try {
      if (typeof window.rakUserProfileLookup !== 'function') throw new Error('profile-lookup-unavailable');
      const result = await window.rakUserProfileLookup(last4);
      if (!result || !result.ok) {
        rejectLogin(result && result.reason === 'not-found' ? 'Účet nebyl nalezen.' : result && result.reason === 'ambiguous' ? 'Číslo není jednoznačné. Obrať se na správce.' : result && result.reason === 'rate-limited' ? 'Příliš mnoho pokusů. Zkus to později.' : 'Ověření se nepodařilo. Zkus to znovu.');
        return;
      }
      const profile = { accountNumber: String(result.accountNumber || '').trim(), fullName: String(result.fullName || '').trim() };
      if (status) status.textContent = 'Kontroluji oprávnění…';
      // RAK_LOGIN_GATE_SINGLE_LOOKUP_17045: old test clients retain the bounded fallback.
      const needsPassword = typeof result.requiresAdminAuth === 'boolean'
        ? result.requiresAdminAuth : await accountNeedsAdminPassword(profile.accountNumber);
      if (needsPassword) {
        const ok = await showAdminPasswordGate(profile, button);
        if (!ok) return;
      }
      releaseOriginalSubmit(button);
    } catch (err) {
      rejectLogin('Ověření se nepodařilo. Zkontroluj připojení a zkus to znovu.');
    } finally {
      if (!document.querySelector('.rakAdminLoginGate')) {
        button.disabled = false;
        loginBusy = false;
      }
    }
  }

  document.addEventListener('click', (event) => {
    const button = event.target && event.target.closest ? event.target.closest('#rakUserLoginSubmit') : null;
    if (!button) return;
    if (button.dataset.rakAccountAccessAuthorized === '1') {
      delete button.dataset.rakAccountAccessAuthorized;
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    void interceptIntroLogin(button);
  }, true);

  function directoryMap() {
    return new Map(directoryRows.map((row) => [String(row.accountNumber), String(row.fullName)]));
  }

  function syncAdminRow(row) {
    if (!row) return;
    const idInput = row.querySelector('[data-admin-account-id]');
    const labelInput = row.querySelector('[data-admin-account-label]');
    const resolved = row.querySelector('.rakAdminResolvedName');
    if (!idInput || !labelInput) return;
    const id = String(idInput.value || '').trim();
    const name = directoryMap().get(id) || '';
    if (labelInput.value !== name) labelInput.value = name;
    if (resolved) {
      const text = id ? (name || 'OS není v seznamu účtů aplikace') : 'Jméno se doplní podle OS čísla';
      if (resolved.textContent !== text) resolved.textContent = text;
      const missing = !!id && !name;
      if (resolved.classList.contains('isMissing') !== missing) resolved.classList.toggle('isMissing', missing);
    }
  }

  async function enhanceAdminAccounts(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const rows = Array.from(scope.querySelectorAll('tr[data-admin-account-row]'));
    if (!rows.length) return;
    try { await loadDirectory(false); } catch (err) { return; }
    const table = rows[0].closest('table');
    if (table && table.dataset.rakDirectoryAdminEnhanced !== '1') {
      table.dataset.rakDirectoryAdminEnhanced = '1';
      const header = table.querySelector('thead tr');
      if (header && header.children.length >= 5) header.children[1].remove();
    }
    rows.forEach((row) => {
      if (row.dataset.rakDirectoryAdminEnhanced === '1') { syncAdminRow(row); return; }
      row.dataset.rakDirectoryAdminEnhanced = '1';
      const idInput = row.querySelector('[data-admin-account-id]');
      const labelInput = row.querySelector('[data-admin-account-label]');
      if (!idInput || !labelInput) return;
      const idCell = idInput.closest('td');
      const labelCell = labelInput.closest('td');
      labelInput.type = 'hidden';
      if (idCell && labelInput.parentNode !== idCell) idCell.appendChild(labelInput);
      if (idCell && !idCell.querySelector('.rakAdminResolvedName')) {
        const name = document.createElement('span');
        name.className = 'rakAdminResolvedName';
        idCell.appendChild(name);
      }
      if (labelCell && labelCell !== idCell) labelCell.remove();
      idInput.addEventListener('input', () => syncAdminRow(row));
      syncAdminRow(row);
    });
  }

  function buildDirectoryHtml(rows) {
    const body = rows.length ? rows.map((row) => [
      '<tr><td>' + esc(row.fullName) + '</td><td>' + esc(row.accountNumber) + '</td></tr>'
    ].join('')).join('') : '<tr><td colspan="2"><span class="smallText">Seznam účtů se nepodařilo načíst.</span></td></tr>';
    return [
      '<div class="rakAccountDirectoryBlock" id="rakAccountDirectoryBlock">',
      '  <div class="appMenuSubTitle">Účty aplikace</div>',
      '  <div class="smallText rakAccountDirectoryNote">Celé jméno a OS číslo slouží pro přihlášení do RaK. Tento spodní seznam je oddělený od rozpisu — do rozpisu, generátoru a statistik se počítají pouze lidé v horní tabulce Pracovníci. Mistr nebo jiný účet bez práce na stroji tedy rozpis neovlivní.</div>',
      '  <div class="tableWrap appMenuTableWrap"><table class="appMenuTable appMenuAdminTable appMenuAdminTableDense rakAccountDirectoryTable"><colgroup><col class="rakAccountDirectoryNameCol"><col class="rakAccountDirectoryNumberCol"></colgroup><thead><tr><th>Celé jméno</th><th>OS číslo</th></tr></thead><tbody>' + body + '</tbody></table></div>',
      '</div>'
    ].join('');
  }

  async function renderWorkerDirectory(root) {
    const scope = root && root.querySelector ? root : document;
    const card = scope.querySelector('.adminWorkerRosterCard');
    if (!card || card.querySelector('#rakAccountDirectoryBlock')) return;
    let rows = [];
    try { rows = await loadDirectory(false); } catch (err) {}
    if (!card.isConnected || card.querySelector('#rakAccountDirectoryBlock') || !rows.length) return;
    const actions = card.querySelector('.appMenuActionRow');
    const holder = document.createElement('div');
    holder.innerHTML = buildDirectoryHtml(rows);
    const block = holder.firstElementChild;
    if (!block) return;
    card.insertBefore(block, actions || null);
  }

  function refreshEnhancements() {
    const body = document.getElementById('appMenuBody');
    if (!body) return;
    void enhanceAdminAccounts(body);
    void renderWorkerDirectory(body);
  }

  function boot() {
    ensureStyles();
    // Admin directory loads only when its admin page is opened, not on anonymous startup.
    refreshEnhancements();
    try {
      let refreshScheduled = false;
      const scheduleRefresh = () => {
        if (refreshScheduled) return;
        refreshScheduled = true;
        const run = () => { refreshScheduled = false; refreshEnhancements(); };
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
        else setTimeout(run, 0);
      };
      const observer = new MutationObserver((records) => {
        const relevant = Array.from(records || []).some((record) => {
          const target = record && record.target;
          try {
            if (target && target.nodeType === 1 && target.closest && target.closest('#appMenuBody')) return true;
            return Array.from(record && record.addedNodes || []).some((node) => node && node.nodeType === 1 && (
              node.id === 'appMenuBody' || !!(node.querySelector && node.querySelector('#appMenuBody'))
            ));
          } catch (err) { return false; }
        });
        if (relevant) scheduleRefresh();
      });
      observer.observe(document.body, { childList: true, subtree: true });
      window.__rakAccountAccessObserver = observer;
    } catch (err) {}
  }

  window.rakAccountDirectoryLoad = loadDirectory;
  window.rakAccountAccessRefresh = refreshEnhancements;
  window.rakAccountNeedsAdminPassword = accountNeedsAdminPassword;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
