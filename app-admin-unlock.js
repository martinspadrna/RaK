// RaK 1.2 (1.268) - admin opravneni navazane na prihlaseny ucet.
const RAK_OWNER_ADMIN_ACCOUNT_ID = '9811';
const RAK_ADMIN_ACCOUNTS_SETTINGS_KEY = 'ADMIN_ACCOUNTS_SETTINGS';
const RAK_ADMIN_ACCOUNTS_SETTINGS_CATEGORY = 'admin_accounts_settings';
const RAK_ADMIN_SESSION_UNLOCKED_KEY = 'adminUnlockedSession';
const RAK_ADMIN_SESSION_PIN_KEY = 'adminPinSession';
const RAK_ADMIN_SESSION_AUTH_PIN_KEY = 'adminAuthPinSession';
const RAK_ADMIN_SESSION_ACCOUNT_KEY = 'adminAccountIdSession';
const RAK_ADMIN_SESSION_OWNER_KEY = 'adminOwnerSession';
const RAK_ADMIN_SESSION_PROMPTED_ACCOUNT_KEY = 'adminPromptedAccountSession';
const RAK_ADMIN_PERSISTENT_SESSION_KEY = 'adminPersistentSessionV1';
const RAK_ADMIN_DEVICE_ID_KEY = 'adminDeviceIdV1';
const RAK_ADMIN_SESSION_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
const RAK_ADMIN_SESSION_TOUCH_MS = 30 * 60 * 1000;
const RAK_ADMIN_TRUSTED_SESSION_MARKER = '::rak-trusted-session::';

// Synchronni SHA-256 (bez Web Crypto), aby hesla nizsich adminu nemusela byt
// ulozena/porovnavana jako plaintext v Supabase radku ani v uplne zaloze nastaveni.
function rakSha256Hex(input) {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const rotr = (n, x) => (x >>> n) | (x << (32 - n));
  const utf8 = unescape(encodeURIComponent(String(input == null ? '' : input)));
  const bytes = [];
  for (let i = 0; i < utf8.length; i += 1) bytes.push(utf8.charCodeAt(i) & 0xff);
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i -= 1) bytes.push(Math.floor(bitLen / Math.pow(2, i * 8)) & 0xff);
  for (let chunk = 0; chunk < bytes.length; chunk += 64) {
    const w = new Array(64).fill(0);
    for (let i = 0; i < 16; i += 1) {
      w[i] = ((bytes[chunk + i * 4] << 24) | (bytes[chunk + i * 4 + 1] << 16) | (bytes[chunk + i * 4 + 2] << 8) | bytes[chunk + i * 4 + 3]) >>> 0;
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
      const s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7].map((v) => v.toString(16).padStart(8, '0')).join('');
}

function rakAdminHashPassword(password, salt) {
  return rakSha256Hex(String(salt || '') + ':' + String(password || ''));
}

function rakAdminGetActiveAccountId() {
  try {
    if (typeof gamesGetProfile === 'function') {
      const profile = gamesGetProfile();
      return String(profile && profile.activeAccountId || '').trim();
    }
  } catch (err) {}
  try {
    const profile = app && app.gamesProfile;
    return String(profile && profile.activeAccountId || '').trim();
  } catch (err) {}
  return '';
}

function rakAdminIsOwnerAccount(accountId) {
  return String(accountId || '').trim() === RAK_OWNER_ADMIN_ACCOUNT_ID;
}

function rakAdminSettingsRows() {
  return Array.isArray(app && app.machineSettingsRows) ? app.machineSettingsRows : [];
}

function rakAdminIsAccountsSettingsRow(row) {
  const settings = row && row.settings_json && typeof row.settings_json === 'object'
    ? row.settings_json
    : (() => { try { return row && row.settings_json ? JSON.parse(String(row.settings_json)) : {}; } catch (err) { return {}; } })();
  return String(row && row.category || '').trim() === RAK_ADMIN_ACCOUNTS_SETTINGS_CATEGORY
    || String(row && row.machine_key || '').trim() === RAK_ADMIN_ACCOUNTS_SETTINGS_KEY
    || String(settings && settings.stored_category || '').trim() === RAK_ADMIN_ACCOUNTS_SETTINGS_CATEGORY
    || String(settings && settings.admin_settings_key || '').trim() === RAK_ADMIN_ACCOUNTS_SETTINGS_KEY;
}

function rakAdminNormalizeManagedEntry(entry) {
  const safe = entry && typeof entry === 'object' ? entry : {};
  const accountId = String(safe.accountId || safe.account_id || safe.id || '').trim();
  if (!accountId || accountId === RAK_OWNER_ADMIN_ACCOUNT_ID) return null;
  const rawPassword = String(safe.password || safe.pin || '').trim();
  let passwordHash = String(safe.passwordHash || safe.password_hash || '').trim();
  let passwordSalt = String(safe.passwordSalt || safe.password_salt || '').trim();
  if (rawPassword) {
    passwordSalt = passwordSalt || rakAdminMakeId('salt');
    passwordHash = rakAdminHashPassword(rawPassword, passwordSalt);
  }
  if (!passwordHash || !passwordSalt) return null;
  return {
    accountId,
    label: String(safe.label || safe.name || '').trim(),
    passwordHash,
    passwordSalt,
    enabled: safe.enabled !== false
  };
}

function rakAdminNormalizeSessionEntry(entry) {
  const safe = entry && typeof entry === 'object' ? entry : {};
  const accountId = String(safe.accountId || safe.account_id || '').trim();
  const deviceId = String(safe.deviceId || safe.device_id || '').trim();
  const token = String(safe.token || '').trim();
  if (!accountId || !deviceId || !token) return null;
  return {
    accountId,
    deviceId,
    token,
    label: String(safe.label || safe.deviceLabel || safe.device_label || '').trim() || 'Zařízení',
    createdAt: String(safe.createdAt || safe.created_at || '').trim(),
    lastSeenAt: String(safe.lastSeenAt || safe.last_seen_at || '').trim(),
    appVersion: String(safe.appVersion || safe.app_version || '').trim(),
    revokedAt: String(safe.revokedAt || safe.revoked_at || '').trim()
  };
}

function rakAdminGetAccountsSettings() {
  if (typeof app !== 'undefined' && app && app.adminAuthVersion === 2 && Array.isArray(app.adminProfilesV2)) {
    const entries = app.adminProfilesV2
      .filter((entry) => entry && ['admin', 'deputy'].includes(String(entry.role || '')))
      .map((entry) => ({
        accountId: String(entry.account_id || entry.accountId || '').trim(),
        label: String(entry.display_name || entry.displayName || '').trim(),
        passwordHash: 'supabase-auth',
        passwordSalt: 'supabase-auth',
        role: String(entry.role || 'admin'),
        enabled: entry.enabled !== false
      }))
      .filter((entry) => entry.accountId);
    const sessions = (Array.isArray(app.adminDevicesV2) ? app.adminDevicesV2 : []).map((entry) => ({
      accountId: String(entry.account_id || ''),
      deviceId: String(entry.device_id || ''),
      token: 'supabase-auth',
      label: String(entry.label || 'Zařízení'),
      createdAt: String(entry.created_at || ''),
      lastSeenAt: String(entry.last_seen_at || ''),
      appVersion: String(entry.app_version || ''),
      revokedAt: String(entry.revoked_at || ''),
      isCurrent: entry.is_current === true
    })).filter((entry) => entry.accountId && entry.deviceId);
    return {
      type: RAK_ADMIN_ACCOUNTS_SETTINGS_CATEGORY,
      ownerAccountId: RAK_OWNER_ADMIN_ACCOUNT_ID,
      admins: entries,
      sessions
    };
  }
  const row = rakAdminSettingsRows().find(rakAdminIsAccountsSettingsRow);
  const raw = row && row.settings_json && typeof row.settings_json === 'object'
    ? row.settings_json
    : (() => {
        try { return row && row.settings_json ? JSON.parse(String(row.settings_json)) : {}; } catch (err) { return {}; }
      })();
  const entries = Array.isArray(raw && raw.admins)
    ? raw.admins.map(rakAdminNormalizeManagedEntry).filter(Boolean)
    : [];
  const sessions = Array.isArray(raw && raw.sessions)
    ? raw.sessions.map(rakAdminNormalizeSessionEntry).filter(Boolean)
    : [];
  return {
    type: RAK_ADMIN_ACCOUNTS_SETTINGS_CATEGORY,
    ownerAccountId: RAK_OWNER_ADMIN_ACCOUNT_ID,
    admins: entries,
    sessions
  };
}

function rakAdminFindManagedEntry(accountId) {
  const id = String(accountId || '').trim();
  if (!id || id === RAK_OWNER_ADMIN_ACCOUNT_ID) return null;
  return rakAdminGetAccountsSettings().admins.find((entry) => entry && entry.enabled !== false && String(entry.accountId || '') === id) || null;
}

function rakAdminAccountRequiresPassword(accountId) {
  const id = String(accountId || '').trim();
  if (rakAdminIsOwnerAccount(id)) return true;
  const profiles = typeof app !== 'undefined' && app && Array.isArray(app.adminProfilesV2) ? app.adminProfilesV2 : [];
  return profiles.some((entry) => (
    entry
    && entry.enabled !== false
    && ['admin', 'deputy'].includes(String(entry.role || ''))
    && String(entry.account_id || entry.accountId || '').trim() === id
  ));
}

function rakAdminVerifyPasswordForAccount(accountId, pass) {
  return false;
}

function rakAdminSecureDevicePayload() {
  return {
    deviceId: rakAdminGetDeviceId(),
    label: rakAdminDeviceLabel(),
    appVersion: String((typeof app !== 'undefined' && app && app.version) || (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '') || '').trim()
  };
}

function rakAdminApplySecureContext(context, capabilities) {
  const safe = context && typeof context === 'object' ? context : {};
  const accountId = String(safe.account_id || safe.accountId || '').trim();
  const role = String(safe.role || '').trim();
  if (!accountId || !['owner','admin','deputy'].includes(role)) return false;
  if (typeof app !== 'undefined' && app) {
    app.adminUnlocked = true;
    app.adminPin = '';
    app.adminAccountId = accountId;
    app.adminIsOwner = role === 'owner';
    app.adminRole = role;
    app.adminAuthVersion = 2;
    app.contactTapCount = 0;
  }
  try {
    sessionStorage.setItem(RAK_ADMIN_SESSION_UNLOCKED_KEY, '1');
    sessionStorage.removeItem(RAK_ADMIN_SESSION_PIN_KEY);
    sessionStorage.setItem(RAK_ADMIN_SESSION_AUTH_PIN_KEY, RAK_ADMIN_TRUSTED_SESSION_MARKER);
    sessionStorage.setItem(RAK_ADMIN_SESSION_ACCOUNT_KEY, accountId);
    sessionStorage.setItem(RAK_ADMIN_SESSION_OWNER_KEY, role === 'owner' ? '1' : '0');
  } catch (err) {}
  rakAdminClearPersistentSession();
  if (typeof updateImportBoxVisibility === 'function') updateImportBoxVisibility();
  if (role === 'owner') void rakAdminLoadSecureDirectory();
  return true;
}

async function rakAdminLoadSecureDirectory() {
  const bridge = window.RotationSupabaseBridge;
  if (!bridge || typeof app === 'undefined' || !app || app.adminAuthVersion !== 2) return { ok: false, reason: 'secure-auth-inactive' };
  const profileResult = typeof bridge.listAdminAuthProfiles === 'function'
    ? await bridge.listAdminAuthProfiles()
    : { ok: false, rows: [] };
  const deviceResult = typeof bridge.listAdminAuthDevices === 'function'
    ? await bridge.listAdminAuthDevices()
    : { ok: false, rows: [] };
  if (profileResult.ok) app.adminProfilesV2 = profileResult.rows;
  if (deviceResult.ok) app.adminDevicesV2 = deviceResult.rows;
  return {
    ok: profileResult.ok && deviceResult.ok,
    profiles: Array.isArray(app.adminProfilesV2) ? app.adminProfilesV2 : [],
    devices: Array.isArray(app.adminDevicesV2) ? app.adminDevicesV2 : [],
    profileError: profileResult.error || null,
    deviceError: deviceResult.error || null
  };
}

// RAK_CROSS_SHIFT_FIXES_17024
// Registered RaK identities include both D rotation workers and workers outside the roster.
// Keep machine/rotation membership completely separate from report authorization.
function rakAdminAppIdentity17024(accountId) {
  const id=String(accountId||'').trim();
  if(!/^\d{4}$/.test(id))return null;
  const roster=typeof getRakWorkerRosterSettings==='function'?getRakWorkerRosterSettings():null;
  const rows=[].concat(Array.isArray(roster&&roster.workers)?roster.workers:[],
    Array.isArray(roster&&roster.appAccounts)?roster.appAccounts:[]);
  const found=rows.find(row=>String(row&&row.loginNumber||'').trim()===id);
  return found?{id,name:String(found.name||'').trim(),outside:(roster.appAccounts||[]).includes(found)}:null;
}

function readAdminAccountsSecureDraftRowsFromDom(root) {
  const scope = root && root.querySelectorAll ? root : document;
  return Array.from(scope.querySelectorAll('tr[data-admin-account-row]')).map((row) => ({
    accountId: String(row.querySelector('[data-admin-account-id]')?.value || '').trim(),
    displayName: String(row.querySelector('[data-admin-account-label]')?.value || '').trim()
      || String(rakAdminAppIdentity17024(row.querySelector('[data-admin-account-id]')?.value)?.name || '').trim(),
    password: String(row.querySelector('[data-admin-account-password]')?.value || ''),
    role: String(row.querySelector('[data-admin-account-role]')?.value || 'admin'),
    enabled: !!(row.querySelector('[data-admin-account-enabled]') && row.querySelector('[data-admin-account-enabled]').checked)
  })).filter((entry) => entry.accountId || entry.displayName || entry.password);
}

async function rakAdminSaveSecureAccounts(root) {
  if (!rakAdminCanManageAdmins() || typeof app === 'undefined' || !app || app.adminAuthVersion !== 2) {
    return { ok: false, reason: 'not-allowed' };
  }
  const bridge = window.RotationSupabaseBridge;
  const accessToken = bridge && typeof bridge.getAdminAccessToken === 'function' ? await bridge.getAdminAccessToken() : '';
  if (!accessToken) return { ok: false, reason: 'missing-session' };
  const desired = readAdminAccountsSecureDraftRowsFromDom(root);
  // Existing app-only accounts are legitimate deputies. If roster settings have not
  // loaded yet, resolve the same identity against RaK's login directory instead.
  for(const entry of desired){
    if(!entry.accountId || !/^\d{4}$/.test(entry.accountId))continue;
    const local=rakAdminAppIdentity17024(entry.accountId);
    if(local&&local.name){
      if(!entry.displayName)entry.displayName=local.name;
      continue;
    }
    if(typeof window.rakUserProfileLookup==='function'){
      try{
        const result=await window.rakUserProfileLookup(entry.accountId);
        if(result&&result.ok&&String(result.accountNumber||'').trim()===entry.accountId){
          if(!entry.displayName)entry.displayName=String(result.fullName||'').trim();
          continue;
        }
      }catch(err){}
    }
    // A saved existing admin can still be disabled if the ordinary login was retired.
    const existing=(Array.isArray(app.adminProfilesV2)?app.adminProfilesV2:[]).some(profile=>
      String(profile&&profile.account_id||'')===entry.accountId);
    if(!existing)return {ok:false,reason:'account-not-in-login-directory'};
  }
  const duplicateIds = desired.map((entry) => entry.accountId).filter((id, index, all) => id && all.indexOf(id) !== index);
  if (duplicateIds.length) return { ok: false, reason: 'duplicate-account' };
  if (desired.some((entry) => !entry.accountId || !entry.displayName || entry.accountId === RAK_OWNER_ADMIN_ACCOUNT_ID)) {
    return { ok: false, reason: 'invalid-admin-profile' };
  }
  if (desired.some((entry) => !['admin', 'deputy'].includes(entry.role))) return { ok:false, reason:'invalid-role' };
  const existing = (Array.isArray(app.adminProfilesV2) ? app.adminProfilesV2 : [])
    .filter((entry) => entry && ['admin', 'deputy'].includes(entry.role));
  const desiredIds = new Set(desired.map((entry) => entry.accountId));
  const requests = desired.concat(existing
    .filter((entry) => !desiredIds.has(String(entry.account_id || '')))
    .map((entry) => ({
      accountId: String(entry.account_id || ''),
      displayName: String(entry.display_name || entry.account_id || ''),
      password: '',
      role: String(entry.role || 'admin'),
      enabled: false
    })));
  for (const entry of requests) {
    const adminUsersUrl = String(window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url || '').replace(/\/$/, '') + '/functions/v1/rak-admin-users';
    const response = await fetch(adminUsersUrl, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        apikey: String(window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.publishableKey || ''),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(entry)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) return { ok: false, reason: payload.error || 'admin-save-failed' };
  }
  const loaded = await rakAdminLoadSecureDirectory();
  return loaded.ok ? { ok: true, savedCount: requests.length } : loaded;
}

async function rakAdminGetSecureCapabilities(force) {
  const bridge = window.RotationSupabaseBridge;
  if (!bridge || typeof bridge.getAdminAuthCapabilities !== 'function') return { available: false, enforced: false };
  try {
    return await bridge.getAdminAuthCapabilities({ force: force === true });
  } catch (err) {
    return { available: false, enforced: false, error: err };
  }
}

async function rakAdminRestoreSecureSessionForActiveAccount(reason) {
  const activeId = rakAdminGetActiveAccountId();
  const bridge = window.RotationSupabaseBridge;
  if (!activeId || !bridge || typeof bridge.restoreAdminAuthSession !== 'function') return false;
  const capabilities = await rakAdminGetSecureCapabilities(false);
  if (!capabilities.available) return false;
  const result = await bridge.restoreAdminAuthSession(activeId, rakAdminSecureDevicePayload());
  if (!result || !result.ok) return false;
  return rakAdminApplySecureContext(result.context, capabilities);
}

async function rakAdminSecureSignIn(accountId, password) {
  const id = String(accountId || '').trim();
  const bridge = window.RotationSupabaseBridge;
  const capabilities = await rakAdminGetSecureCapabilities(true);
  if (!capabilities.available || !bridge || typeof bridge.signInAdminAccount !== 'function') {
    return { ok: false, fallbackAllowed: false, reason: 'auth-not-ready' };
  }
  const result = await bridge.signInAdminAccount(id, String(password || ''), rakAdminSecureDevicePayload());
  if (result && result.ok && rakAdminApplySecureContext(result.context, capabilities)) {
    return { ok: true, secure: true };
  }
  return Object.assign({ ok: false, fallbackAllowed: false }, result || {});
}

async function rakAdminAccountRequiresSecureAuth(accountId) {
  const id = String(accountId || '').trim();
  if (!id) return false;
  if (rakAdminAccountRequiresPassword(id)) return true;
  try {
    const bridge = window.RotationSupabaseBridge;
    return !!(bridge && typeof bridge.adminAccountRequiresAuth === 'function' && await bridge.adminAccountRequiresAuth(id));
  } catch (err) {
    return false;
  }
}

function rakAdminMakeId(prefix) {
  try {
    const hasCrypto = typeof crypto !== 'undefined' && crypto && typeof crypto.getRandomValues === 'function';
    const rnd = hasCrypto
      ? Array.from(crypto.getRandomValues(new Uint32Array(4))).map(n => n.toString(36)).join('')
      : (Date.now().toString(36) + Math.random().toString(36).slice(2, 14));
    return (String(prefix || 'rak') + '-' + rnd).slice(0, 96);
  } catch (err) {
    return (String(prefix || 'rak') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).slice(0, 96);
  }
}

function rakAdminGetDeviceId() {
  try {
    let id = String(localStorage.getItem(RAK_ADMIN_DEVICE_ID_KEY) || '').trim();
    if (/^rakadm-[a-z0-9-]{10,}$/i.test(id)) return id.slice(0, 96);
    id = rakAdminMakeId('rakadm');
    localStorage.setItem(RAK_ADMIN_DEVICE_ID_KEY, id);
    return id;
  } catch (err) {
    return rakAdminMakeId('rakadm');
  }
}

function rakAdminDeviceLabel() {
  try {
    const ua = String((typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '').toLowerCase();
    const platform = String((typeof navigator !== 'undefined' && navigator.platform) ? navigator.platform : '').trim();
    const isPhone = /iphone|android.*mobile/.test(ua);
    const isTablet = /ipad|tablet|android(?!.*mobile)/.test(ua);
    const os = /iphone|ipad/.test(ua) ? 'iOS' : (/android/.test(ua) ? 'Android' : (/windows/.test(ua) ? 'Windows' : (platform || 'Zařízení')));
    const browser = /edg\//.test(ua) ? 'Edge' : (/chrome|crios/.test(ua) ? 'Chrome' : (/safari/.test(ua) ? 'Safari' : 'Prohlížeč'));
    return ((isPhone ? 'Mobil' : (isTablet ? 'Tablet' : 'Počítač')) + ' · ' + os + ' · ' + browser).slice(0, 120);
  } catch (err) {
    return 'Zařízení';
  }
}

function rakAdminReadPersistentSession() {
  try {
    const raw = localStorage.getItem(RAK_ADMIN_PERSISTENT_SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return null;
    const accountId = String(parsed.accountId || '').trim();
    const deviceId = String(parsed.deviceId || '').trim();
    const token = String(parsed.token || '').trim();
    const createdAt = Number(parsed.createdAt || 0) || 0;
    if (!accountId || !deviceId || !token || !createdAt) return null;
    if (Date.now() - createdAt > RAK_ADMIN_SESSION_MAX_AGE_MS) return null;
    return Object.assign({}, parsed, { accountId, deviceId, token, createdAt });
  } catch (err) {
    return null;
  }
}

function rakAdminWritePersistentSession(session) {
  try {
    if (!session || typeof session !== 'object') return false;
    localStorage.setItem(RAK_ADMIN_PERSISTENT_SESSION_KEY, JSON.stringify(session));
    localStorage.removeItem('adminUnlocked');
    return true;
  } catch (err) {
    return false;
  }
}

function rakAdminClearPersistentSession() {
  try {
    localStorage.removeItem(RAK_ADMIN_PERSISTENT_SESSION_KEY);
    localStorage.removeItem('adminUnlocked');
  } catch (err) {}
}

function rakAdminClearSession(options) {
  const opts = options && typeof options === 'object' ? options : {};
  try {
    sessionStorage.removeItem(RAK_ADMIN_SESSION_UNLOCKED_KEY);
    sessionStorage.removeItem(RAK_ADMIN_SESSION_PIN_KEY);
    sessionStorage.removeItem(RAK_ADMIN_SESSION_AUTH_PIN_KEY);
    sessionStorage.removeItem(RAK_ADMIN_SESSION_ACCOUNT_KEY);
    sessionStorage.removeItem(RAK_ADMIN_SESSION_OWNER_KEY);
    localStorage.removeItem('adminUnlocked');
  } catch (err) {}
  if (opts.clearPersistent === true) rakAdminClearPersistentSession();
}

function rakAdminLock(options) {
  if (typeof app !== 'undefined' && app) {
    app.adminUnlocked = false;
    app.adminPin = '';
    app.adminAccountId = '';
    app.adminIsOwner = false;
    app.adminRole = '';
    app.adminAuthVersion = 0;
  }
  rakAdminClearSession(options && typeof options === 'object' ? options : {});
  try {
    const bridge = window.RotationSupabaseBridge;
    if (bridge && typeof bridge.signOutAdminAccount === 'function') void bridge.signOutAdminAccount();
  } catch (err) {}
}

function rakAdminSessionMatchesSettings(session, settings) {
  const safe = session && typeof session === 'object' ? session : null;
  if (!safe) return false;
  const source = settings && typeof settings === 'object' ? settings : rakAdminGetAccountsSettings();
  const sessions = Array.isArray(source && source.sessions) ? source.sessions : [];
  if (!sessions.length) return true;
  return sessions.some((entry) => (
    entry
    && !entry.revokedAt
    && String(entry.accountId || '') === String(safe.accountId || '')
    && String(entry.deviceId || '') === String(safe.deviceId || '')
    && String(entry.token || '') === String(safe.token || '')
  ));
}

function rakAdminApplyUnlockedAccount(accountId, authPin, options) {
  return false;
}

function rakAdminPersistUnlockedSession(accountId) {
  const id = String(accountId || '').trim();
  if (!id) return null;
  const nowIso = new Date().toISOString();
  const current = rakAdminReadPersistentSession();
  const session = current && current.accountId === id
    ? Object.assign({}, current)
    : {
        accountId: id,
        deviceId: rakAdminGetDeviceId(),
        token: rakAdminMakeId('raksess'),
        createdAt: Date.now()
      };
  session.accountId = id;
  session.deviceId = session.deviceId || rakAdminGetDeviceId();
  session.token = session.token || rakAdminMakeId('raksess');
  session.label = rakAdminDeviceLabel();
  session.lastSeenAt = nowIso;
  session.appVersion = String((typeof app !== 'undefined' && app && app.version) || (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '') || '').trim();
  rakAdminWritePersistentSession(session);
  const lastTouch = Number(session.lastOnlineTouchAt || 0) || 0;
  if (!lastTouch || Date.now() - lastTouch > RAK_ADMIN_SESSION_TOUCH_MS) {
    session.lastOnlineTouchAt = Date.now();
    rakAdminWritePersistentSession(session);
    void rakAdminSaveCurrentSessionDevice(session);
  }
  return session;
}

function rakAdminSaveCurrentSessionDevice(session) {
  const safe = session && typeof session === 'object' ? session : rakAdminReadPersistentSession();
  if (!safe || !safe.accountId || !safe.deviceId || !safe.token) return Promise.resolve({ ok: false, reason: 'missing-session' });
  if (!(window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.saveMachineSettings === 'function')) return Promise.resolve({ ok: false, reason: 'missing-bridge' });
  const loadPromise = (window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.loadMachineSettings === 'function')
    ? window.RotationSupabaseBridge.loadMachineSettings().then((rows) => {
        if (typeof app !== 'undefined' && app) app.machineSettingsRows = Array.isArray(rows) ? rows : [];
      }).catch(() => {})
    : Promise.resolve();
  return loadPromise.then(() => {
    const settings = rakAdminGetAccountsSettings();
    const sessions = (Array.isArray(settings.sessions) ? settings.sessions : [])
      .filter((entry) => entry && String(entry.deviceId || '') !== String(safe.deviceId || ''));
    sessions.push(rakAdminNormalizeSessionEntry(Object.assign({}, safe, {
      createdAt: safe.createdAt ? new Date(Number(safe.createdAt)).toISOString() : new Date().toISOString(),
      lastSeenAt: safe.lastSeenAt || new Date().toISOString(),
      revokedAt: ''
    })));
    const nextSettings = Object.assign({}, settings, {
      sessions: sessions.filter(Boolean).sort((a, b) => String(b.lastSeenAt || '').localeCompare(String(a.lastSeenAt || ''))),
      updatedAt: new Date().toISOString()
    });
    const rows = mergeAdminAccountsSettingsRows(nextSettings);
    return window.RotationSupabaseBridge.saveMachineSettings(rows).then((result) => {
      if (typeof app !== 'undefined' && app) app.machineSettingsRows = rows;
      return result || { ok: true };
    });
  }).catch((err) => ({ ok: false, error: err }));
}

function rakAdminRevokePersistentSession(deviceId) {
  const targetId = String(deviceId || '').trim();
  if (!targetId || !rakAdminCanManageAdmins()) return Promise.resolve({ ok: false, reason: 'not-allowed' });
  if (typeof app !== 'undefined' && app && app.adminAuthVersion === 2) {
    const bridge = window.RotationSupabaseBridge;
    if (!bridge || typeof bridge.revokeAdminAuthDevice !== 'function') return Promise.resolve({ ok: false, reason: 'missing-bridge' });
    return bridge.revokeAdminAuthDevice(targetId).then(async (result) => {
      if (result && result.ok) await rakAdminLoadSecureDirectory();
      return result;
    });
  }
  const settings = rakAdminGetAccountsSettings();
  const nowIso = new Date().toISOString();
  const sessions = (Array.isArray(settings.sessions) ? settings.sessions : []).map((entry) => {
    if (!entry || String(entry.deviceId || '') !== targetId) return entry;
    return Object.assign({}, entry, { revokedAt: nowIso });
  }).filter(Boolean);
  const nextSettings = Object.assign({}, settings, { sessions, updatedAt: nowIso });
  const rows = mergeAdminAccountsSettingsRows(nextSettings);
  if (!(window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.saveMachineSettings === 'function')) return Promise.resolve({ ok: false, reason: 'missing-bridge' });
  return window.RotationSupabaseBridge.saveMachineSettings(rows).then((result) => {
    if (typeof app !== 'undefined' && app) app.machineSettingsRows = rows;
    const current = rakAdminReadPersistentSession();
    if (current && String(current.deviceId || '') === targetId) rakAdminLock({ clearPersistent: true });
    return result || { ok: true };
  }).catch((err) => ({ ok: false, error: err }));
}

function rakAdminRestorePersistentSessionForActiveAccount(reason) {
  return false;
}

function rakAdminUnlockForAccount(accountId, pin, options) {
  return false;
}

function rakAdminRestoreSessionForActiveAccount() {
  const activeId = rakAdminGetActiveAccountId();
  return !!(activeId && typeof app !== 'undefined' && app && app.adminAuthVersion === 2 && app.adminUnlocked === true && String(app.adminAccountId || '') === activeId);
}

async function rakAdminPromptUnlockForAccount(accountId) {
  const id = String(accountId || '').trim();
  const requiresPassword = await rakAdminAccountRequiresSecureAuth(id);
  if (!requiresPassword) {
    rakAdminLock({ clearPersistent: false });
    return true;
  }
  if (typeof app !== 'undefined' && app && app.adminUnlocked && String(app.adminAccountId || '') === id) return true;
  let pass = '';
  try {
    pass = prompt('Heslo administrace:') || '';
  } catch (err) {
    pass = '';
  }
  const secureResult = await rakAdminSecureSignIn(id, pass);
  if (secureResult.ok) return true;
  rakAdminLock({ clearPersistent: true });
  try { alert(secureResult.reason === 'auth-not-ready' ? 'Bezpečné přihlášení administrace zatím není dostupné.' : 'Špatné heslo administrace.'); } catch (err) {}
  return false;
}

async function rakAdminPromptOnceForActiveAccount(reason) {
  const id = rakAdminGetActiveAccountId();
  if (!id || !await rakAdminAccountRequiresSecureAuth(id)) return false;
  if (typeof app !== 'undefined' && app && app.adminUnlocked === true && String(app.adminAccountId || '') === id) return true;
  let prompted = false;
  try {
    prompted = sessionStorage.getItem(RAK_ADMIN_SESSION_PROMPTED_ACCOUNT_KEY) === id;
  } catch (err) {
    prompted = String(window.__rakAdminPromptedAccountId || '') === id;
  }
  if (prompted) return false;
  try {
    sessionStorage.setItem(RAK_ADMIN_SESSION_PROMPTED_ACCOUNT_KEY, id);
  } catch (err) {
    window.__rakAdminPromptedAccountId = id;
  }
  return await rakAdminPromptUnlockForAccount(id);
}

function rakAdminScheduleStartupRestore() {
  [0, 350, 1200].forEach((delay) => {
    try {
      setTimeout(() => { void rakAdminRestoreSecureSessionForActiveAccount('startup'); }, delay);
    } catch (err) {}
  });
}

function rakAdminSupabaseLooksHealthy() {
  try {
    if (typeof window === 'undefined' || typeof window.getSupabaseSyncStatus !== 'function') return true;
    const status = window.getSupabaseSyncStatus();
    const kind = String(status && status.kind || '').trim();
    return kind !== 'offline' && kind !== 'error';
  } catch (err) {
    return true;
  }
}

async function rakAdminLoadSettingsThenCheckOnce(reason) {
  const activeId = rakAdminGetActiveAccountId();
  if (!activeId) return false;
  if (await rakAdminRestoreSecureSessionForActiveAccount(reason || 'secure-session')) return true;
  const alreadyKnownAdmin = await rakAdminAccountRequiresSecureAuth(activeId);
  // Blokujici prompt() jde spustit jen kdyz je Supabase zdravy - jinak by nejistota
  // zpusobena pomalou/vypadlou siti zamkla celou appku za nativnim dialogem na heslo.
  const promptResult = alreadyKnownAdmin && rakAdminSupabaseLooksHealthy() ? await rakAdminPromptOnceForActiveAccount(reason) : false;
  if (!(window.RotationSupabaseBridge && typeof window.RotationSupabaseBridge.loadMachineSettings === 'function')) return promptResult;
  if (window.__rakAdminSettingsLoadPending === true) return promptResult;
  window.__rakAdminSettingsLoadPending = true;
  window.RotationSupabaseBridge.loadMachineSettings().then((rows) => {
    window.__rakAdminSettingsLoadPending = false;
    if (typeof app !== 'undefined' && app) app.machineSettingsRows = Array.isArray(rows) ? rows : [];
    if (!rakAdminRestoreSessionForActiveAccount() && rakAdminSupabaseLooksHealthy()) void rakAdminPromptOnceForActiveAccount(reason || 'settings-loaded');
  }).catch(() => {
    window.__rakAdminSettingsLoadPending = false;
  });
  return true;
}

async function rakAdminLoadSettingsThenCheck(reason) {
  if (window.__rakAdminAuthCheckPromise) return await window.__rakAdminAuthCheckPromise;
  const pending = rakAdminLoadSettingsThenCheckOnce(reason);
  window.__rakAdminAuthCheckPromise = pending;
  try {
    return await pending;
  } finally {
    if (window.__rakAdminAuthCheckPromise === pending) window.__rakAdminAuthCheckPromise = null;
  }
}

// RAK_REPORT_ONLY_DEPUTY_17019
function rakAdminCanOpenShiftReport() {
  const activeId = rakAdminGetActiveAccountId();
  return !!(activeId && typeof app !== 'undefined' && app && app.adminAuthVersion === 2
    && app.adminUnlocked === true && String(app.adminAccountId || '') === activeId
    && ['owner', 'admin', 'deputy'].includes(String(app.adminRole || '')));
}
function rakAdminIsDeputy() {
  return rakAdminCanOpenShiftReport() && app.adminRole === 'deputy';
}
function rakAdminCanOpenAdmin() {
  return rakAdminCanOpenShiftReport() && (app.adminRole === 'owner' || app.adminRole === 'admin');
}

function rakAdminCanManageAdmins() {
  return !!(typeof app !== 'undefined' && app && app.adminUnlocked === true && app.adminIsOwner === true && rakAdminIsOwnerAccount(app.adminAccountId));
}

function makeAdminAccountsSettingsRow(settings) {
  const safe = settings && typeof settings === 'object' ? settings : rakAdminGetAccountsSettings();
  return {
    machine_key: RAK_ADMIN_ACCOUNTS_SETTINGS_KEY,
    machine_code: 'ADMIN',
    machine_index: 'accounts',
    label: 'Spravci',
    category: RAK_ADMIN_ACCOUNTS_SETTINGS_CATEGORY,
    cycle_time: '',
    speed: '',
    dress_time: '',
    dress_count: '',
    settings_json: Object.assign({ machine: 'ADMIN', index: 'accounts' }, safe, {
      type: RAK_ADMIN_ACCOUNTS_SETTINGS_CATEGORY,
      ownerAccountId: RAK_OWNER_ADMIN_ACCOUNT_ID
    })
  };
}

function mergeAdminAccountsSettingsRows(settings) {
  const rows = rakAdminSettingsRows().filter((row) => !rakAdminIsAccountsSettingsRow(row));
  rows.push(makeAdminAccountsSettingsRow(settings));
  return rows;
}

function buildAdminAccountsRoleOverviewHtml(settings) {
  const safe = settings && typeof settings === 'object' ? settings : rakAdminGetAccountsSettings();
  const admins = Array.isArray(safe && safe.admins) ? safe.admins : [];
  const enabledAdmins = admins.filter((entry) => entry && entry.enabled !== false).length;
  return [
    '<div class="adminAccountsRoleOverview">',
    '  <div class="adminAccountsRoleCard isOwner">',
    '    <span>Hlavni admin</span>',
    '    <b>Ucet ' + escapeHtml(RAK_OWNER_ADMIN_ACCOUNT_ID) + '</b>',
    '    <small>Muze pridavat dalsi spravce, menit jejich hesla a zapinat nebo vypinat pristup.</small>',
    '  </div>',
    '  <div class="adminAccountsRoleCard">',
    '    <span>Správci a zástupci</span>',
    '    <b>' + String(enabledAdmins) + ' aktivni</b>',
    '    <small>Správce spravuje pracovní administraci. Zástupce může pouze připravit a odeslat Report směny.</small>',
    '  </div>',
    '  <div class="adminAccountsRoleCard isInfo">',
    '    <span>Prihlaseni</span>',
    '    <b>ucet + heslo</b>',
    '    <small>Novy spravce musi mit bezny ucet v aplikaci; po jeho vyberu se administrace zepta na heslo.</small>',
    '  </div>',
    '</div>'
  ].join('');
}

function adminAccountsStatusItemHtml(label, value, detail, modifier) {
  const className = 'adminAccountsStatusItem' + (modifier ? ' ' + modifier : '');
  return [
    '<div class="' + className + '">',
    '  <span>' + escapeHtml(label) + '</span>',
    '  <b>' + escapeHtml(value) + '</b>',
    '  <small>' + escapeHtml(detail) + '</small>',
    '</div>'
  ].join('');
}

function adminAccountsSafetyItemHtml(label, value, detail, modifier) {
  const className = 'adminAccountsSafetyItem' + (modifier ? ' ' + modifier : '');
  return [
    '<div class="' + className + '">',
    '  <span>' + escapeHtml(label) + '</span>',
    '  <b>' + escapeHtml(value) + '</b>',
    '  <small>' + escapeHtml(detail) + '</small>',
    '</div>'
  ].join('');
}

function buildAdminAccountsSafetyHtml(source) {
  const settings = source && typeof source === 'object' && Array.isArray(source.admins)
    ? source
    : rakAdminGetAccountsSettings();
  const enabledAdmins = (Array.isArray(settings.admins) ? settings.admins : []).filter((entry) => entry && entry.enabled !== false).length;
  return [
    '<div class="adminAccountsSafety">',
    '  <div class="adminAccountsStatusTitle">Bezpecnost pristupu</div>',
    '  <div class="adminAccountsSafetyGrid">',
    adminAccountsSafetyItemHtml('Owner ucet', RAK_OWNER_ADMIN_ACCOUNT_ID, 'Vestaveny hlavni admin se do tabulky nepridava.', 'isOwner'),
    adminAccountsSafetyItemHtml('Nizsi admini', String(enabledAdmins) + ' aktivni', 'Kazdy nizsi admin musi mit vlastni ucet a heslo.', 'isOk'),
    adminAccountsSafetyItemHtml('Hesla', 'Supabase Auth', 'Hesla spravuje zabezpecene prihlaseni a aplikace je neuklada ani je neumoznuje stahnout.', 'isInfo'),
    adminAccountsSafetyItemHtml('Bezni uzivatele', 'bez zmen', 'Bez admin hesla nevidi admin menu a nemeni provozni data.', 'isInfo'),
    '  </div>',
    '</div>'
  ].join('');
}

function adminSessionDateLabel(value) {
  const text = String(value || '').trim();
  if (!text) return 'neznámé';
  try {
    const date = new Date(text);
    if (!Number.isFinite(date.getTime())) return text;
    return date.toLocaleString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (err) {
    return text;
  }
}

function buildAdminSessionDevicesHtml(source) {
  const settings = source && typeof source === 'object' && Array.isArray(source.sessions)
    ? source
    : rakAdminGetAccountsSettings();
  const sessions = (Array.isArray(settings.sessions) ? settings.sessions : [])
    .filter((entry) => entry && !entry.revokedAt)
    .sort((a, b) => String(b.lastSeenAt || '').localeCompare(String(a.lastSeenAt || '')));
  const current = rakAdminReadPersistentSession();
  const currentDeviceId = String(current && current.deviceId || rakAdminGetDeviceId() || '').trim();
  const rows = sessions.length
    ? sessions.map((entry) => {
        const isCurrent = String(entry.deviceId || '') === currentDeviceId;
        return [
          '<tr>',
          '  <td><b>' + escapeHtml(entry.label || 'Zařízení') + '</b><br><small>' + escapeHtml(isCurrent ? 'toto zařízení' : entry.deviceId) + '</small></td>',
          '  <td>' + escapeHtml(entry.accountId || '') + '</td>',
          '  <td>' + escapeHtml(adminSessionDateLabel(entry.lastSeenAt || entry.createdAt)) + '</td>',
          '  <td>' + (isCurrent ? '<button type="button" class="appMenuTinyButton" data-admin-action="revoke-admin-session" data-admin-current-device="1" data-admin-device-id="' + escapeHtml(entry.deviceId || '') + '">Odhlásit toto zařízení</button>' : '<button type="button" class="appMenuTinyButton" data-admin-action="revoke-admin-session" data-admin-device-id="' + escapeHtml(entry.deviceId || '') + '">Odhlásit zařízení</button>') + '</td>',
          '</tr>'
        ].join('');
      }).join('')
    : '<tr><td colspan="4"><span class="smallText">Zatím není uložené žádné odemčené admin zařízení. Objeví se po přihlášení admin heslem.</span></td></tr>';
  return [
    '<div class="tableWrap appMenuTableWrap uMt8">',
    '  <div class="appMenuSubTitle">Přihlášená admin zařízení</div>',
    '  <div class="smallText uMb10">Hlavní admin tady vidí zařízení, kde zůstala administrace odemčená. Odhlášení zařízení zruší všechny jeho admin relace, včetně dalších účtů v tomto prohlížeči. Nové přihlášení heslem je možné.</div>',
    '  <table class="appMenuTable appMenuAdminTable appMenuAdminTableDense adminAccountsTable">',
    '    <thead><tr><th>Zařízení</th><th>Účet</th><th>Naposledy</th><th>Akce</th></tr></thead>',
    '    <tbody>' + rows + '</tbody>',
    '  </table>',
    '</div>'
  ].join('');
}

function normalizeAdminAccountDraftRows(rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const filledRows = safeRows.filter((entry) => {
    const safe = entry && typeof entry === 'object' ? entry : {};
    return !!(String(safe.accountId || '').trim() || String(safe.label || '').trim() || String(safe.password || '').trim() || safe.passwordHash);
  }).map((entry) => ({
    accountId: String(entry && entry.accountId || '').trim(),
    label: String(entry && entry.label || '').trim(),
    hasPassword: !!(String(entry && entry.password || '').trim() || (entry && entry.passwordHash)),
    enabled: !(entry && entry.enabled === false)
  }));
  const counts = new Map();
  filledRows.forEach((entry) => {
    const id = String(entry.accountId || '').trim();
    if (!id) return;
    counts.set(id, (counts.get(id) || 0) + 1);
  });
  const completeAdmins = filledRows.filter((entry) => (
    entry.accountId
    && entry.accountId !== RAK_OWNER_ADMIN_ACCOUNT_ID
    && entry.hasPassword
    && entry.enabled !== false
  ));
  const missingPassword = filledRows.filter((entry) => (
    entry.accountId
    && entry.accountId !== RAK_OWNER_ADMIN_ACCOUNT_ID
    && !entry.hasPassword
  )).length;
  const incompleteRows = filledRows.filter((entry) => (
    (!entry.accountId && (entry.label || entry.hasPassword))
    || (entry.accountId && entry.accountId !== RAK_OWNER_ADMIN_ACCOUNT_ID && !entry.hasPassword)
  )).length;
  const ownerRows = filledRows.filter((entry) => entry.accountId === RAK_OWNER_ADMIN_ACCOUNT_ID).length;
  const duplicateIds = Array.from(counts.entries()).filter(([, count]) => count > 1).map(([id]) => id);
  return {
    filledRows,
    completeAdmins,
    enabledAdmins: completeAdmins.length,
    missingPassword,
    incompleteRows,
    ownerRows,
    duplicateIds
  };
}

function buildAdminAccountsStatusHtml(source) {
  const settings = source && typeof source === 'object' && Array.isArray(source.admins)
    ? source
    : rakAdminGetAccountsSettings();
  const rows = source && typeof source === 'object' && Array.isArray(source.rows)
    ? source.rows
    : (Array.isArray(settings.admins) ? settings.admins : []);
  const status = normalizeAdminAccountDraftRows(rows);
  const canManage = typeof rakAdminCanManageAdmins === 'function' && rakAdminCanManageAdmins();
  const activeTotal = 1 + status.enabledAdmins;
  const passwordValue = status.missingPassword > 0 ? String(status.missingPassword) + ' chybi' : 'OK';
  const passwordDetail = status.missingPassword > 0
    ? 'Doplneni hesla je nutne pred ulozenim spravce.'
    : 'Kazdy rozepsany spravce s uctem ma heslo.';
  const issueCount = status.incompleteRows + status.ownerRows + status.duplicateIds.length;
  const issueDetail = issueCount > 0
    ? [
        status.incompleteRows ? String(status.incompleteRows) + ' nedokoncene' : '',
        status.ownerRows ? 'owner se nepridava do tabulky' : '',
        status.duplicateIds.length ? 'duplicity: ' + status.duplicateIds.join(', ') : ''
      ].filter(Boolean).join('; ')
    : 'Prazdne radky se pri ulozeni ignoruji.';
  return [
    '<div class="adminAccountsStatus" id="adminAccountsStatus" aria-live="polite">',
    '  <div class="adminAccountsStatusTitle">Stav spravcu</div>',
    '  <div class="adminAccountsStatusGrid">',
    adminAccountsStatusItemHtml('Opravneni', canManage ? 'Hlavni admin' : 'Jen cteni', canManage ? 'Tento ucet muze menit spravce.' : 'Seznam spravcu muze menit jen hlavni admin.', canManage ? 'isOk' : 'isWarn'),
    adminAccountsStatusItemHtml('Aktivni spravci', String(activeTotal) + ' celkem', 'Ucet ' + RAK_OWNER_ADMIN_ACCOUNT_ID + ' + ' + String(status.enabledAdmins) + ' dalsi.', 'isOk'),
    adminAccountsStatusItemHtml('Hesla', passwordValue, passwordDetail, status.missingPassword > 0 ? 'isWarn' : 'isOk'),
    adminAccountsStatusItemHtml('Kontrola radku', issueCount > 0 ? String(issueCount) + ' k reseni' : 'OK', issueDetail, issueCount > 0 ? 'isWarn' : 'isOk'),
    '  </div>',
    '</div>'
  ].join('');
}

function buildAdminAccountsSettingsHtml() {
  if (!rakAdminCanManageAdmins()) {
    const settings = rakAdminGetAccountsSettings();
    const rows = (settings.admins || []).map((entry) => [
      '<tr>',
      '  <td><b>' + escapeHtml(entry.accountId || '') + '</b></td>',
      '  <td>' + escapeHtml(entry.label || 'Správce') + '</td>',
      '  <td><span class="adminAccountsMaskedPassword" aria-label="Heslo je skryté">****</span></td>',
      '  <td>' + (entry.enabled === false ? 'Vypnutý' : 'Aktivní') + '</td>',
      '</tr>'
    ].join('')).join('') || '<tr><td colspan="4"><span class="smallText">Seznam správců se načte po připojení.</span></td></tr>';
    return [
      buildAdminAccountsStatusHtml(settings),
      buildAdminAccountsRoleOverviewHtml(settings),
      '<div class="adminAccountsReadonlyNotice">',
      '  <b>Správce může změnit pouze svoje heslo.</b>',
      '  <span>Hesla všech účtů jsou z bezpečnostních důvodů vždy skrytá. Seznam správců, jejich přístupy i heslo hlavního admina může měnit jen účet 9811.</span>',
      '</div>',
      '<div class="tableWrap appMenuTableWrap uMt8">',
      '  <div class="appMenuSubTitle">Ostatní správci</div>',
      '  <table class="appMenuTable appMenuAdminTable appMenuAdminTableDense adminAccountsTable">',
      '    <thead><tr><th>Účet</th><th>Popis</th><th>Heslo</th><th>Stav</th></tr></thead>',
      '    <tbody>' + rows + '</tbody>',
      '  </table>',
      '</div>',
      buildAdminOwnPasswordHtml()
    ].join('');
  }
  const settings = rakAdminGetAccountsSettings();
  const rows = settings.admins.concat(Array.from({ length: 4 }, () => ({ accountId: '', label: '', passwordHash: '', enabled: true })));
  const roster=typeof getRakWorkerRosterSettings==='function'?getRakWorkerRosterSettings():null;
  const availableAccounts=[].concat(Array.isArray(roster&&roster.workers)?roster.workers:[],
    Array.isArray(roster&&roster.appAccounts)?roster.appAccounts:[])
    .filter(row=>row&&/^\d{4}$/.test(String(row.loginNumber||'')));
  const accountOptions='<datalist id="rakAdminExistingAccounts17024">'+availableAccounts.map(row=>
    '<option value="'+escapeHtml(row.loginNumber)+'" label="'+escapeHtml(row.name)+'"></option>').join('')+'</datalist>';
  const body = rows.map((entry) => [
    '<tr data-admin-account-row>',
    '  <td><input class="appMenuInlineInput" data-admin-account-field="accountId" data-admin-account-id list="rakAdminExistingAccounts17024" value="' + escapeHtml(entry.accountId || '') + '" placeholder="os. c."></td>',
    '  <td><input class="appMenuInlineInput" data-admin-account-field="label" data-admin-account-label value="' + escapeHtml(entry.label || '') + '" placeholder="jmeno / poznamka"></td>',
    '  <td><input class="appMenuInlineInput" data-admin-account-field="password" data-admin-account-password type="password" value="" placeholder="' + (entry.passwordHash ? 'necháš prázdné = beze změny' : 'heslo') + '"></td>',
    '  <td><select class="appMenuInlineInput" data-admin-account-field="role" data-admin-account-role aria-label="Role účtu"><option value="admin"' + (entry.role === 'deputy' ? '' : ' selected') + '>Správce</option><option value="deputy"' + (entry.role === 'deputy' ? ' selected' : '') + '>Zástupce – pouze Report směny</option></select></td>',
    '  <td><label class="adminRotationOvertimeSwitch"><input type="checkbox" data-admin-account-field="enabled" data-admin-account-enabled ' + (entry.enabled === false ? '' : 'checked') + '><span>ANO</span></label></td>',
    '  <td><button type="button" class="adminRotationGeneratorIconBtn" data-admin-action="admin-account-row-clear" title="Vyprázdnit řádek">×</button></td>',
    '</tr>'
  ].join('')).join('');
  return [
    buildAdminAccountsStatusHtml({ rows }),
    accountOptions,
    buildAdminAccountsRoleOverviewHtml(settings),
    buildAdminAccountsSafetyHtml(settings),
    buildAdminSessionDevicesHtml(settings),
    '<div class="tableWrap appMenuTableWrap uMt8">',
    '  <div class="smallText uMb10">U každého účtu vyber roli: Správce spravuje pracovní části aplikace, Zástupce vidí pouze Report směny. Heslo nech prázdné, pokud ho nechceš měnit. Účet odeber nebo vypni a potvrď uložením. Hesla spravuje Supabase Auth.</div>',
    '  <table class="appMenuTable appMenuAdminTable appMenuAdminTableDense adminAccountsTable">',
    '    <thead><tr><th>Ucet</th><th>Popis</th><th>Heslo</th><th>Role</th><th>Aktivni</th><th></th></tr></thead>',
    '    <tbody>' + body + '</tbody>',
    '  </table>',
    '</div>'
  ].join('');
}

function buildAdminOwnerPasswordHtml() {
  if (!rakAdminCanManageAdmins()) return '';
  return [
    '<div class="adminOwnerPasswordPanel">',
    '  <div class="appMenuSubTitle">Změna hesla hlavního admina</div>',
    '  <div class="smallText">Po změně zůstane tento telefon přihlášený novým heslem.</div>',
    '  <div class="adminOwnerPasswordGrid">',
    '    <label><span>Současné heslo</span><input class="appMenuInlineInput" type="password" autocomplete="current-password" data-admin-owner-password="current"></label>',
    '    <label><span>Nové heslo</span><input class="appMenuInlineInput" type="password" autocomplete="new-password" data-admin-owner-password="new"></label>',
    '    <label><span>Nové heslo znovu</span><input class="appMenuInlineInput" type="password" autocomplete="new-password" data-admin-owner-password="confirm"></label>',
    '  </div>',
    '  <button type="button" class="appMenuAction isActive" data-admin-action="change-owner-password">Změnit moje heslo</button>',
    '</div>'
  ].join('');
}

function buildAdminOwnPasswordHtml() {
  if (!rakAdminCanOpenAdmin() || rakAdminCanManageAdmins()) return '';
  const accountId = rakAdminGetActiveAccountId();
  return [
    '<div class="adminOwnerPasswordPanel adminOwnPasswordPanel">',
    '  <div class="appMenuSubTitle">Změna mého hesla</div>',
    '  <div class="smallText">Měníš heslo pouze pro svůj admin účet ' + escapeHtml(accountId) + '.</div>',
    '  <div class="adminOwnerPasswordGrid">',
    '    <label><span>Současné heslo</span><input class="appMenuInlineInput" type="password" autocomplete="current-password" data-admin-own-password="current"></label>',
    '    <label><span>Nové heslo</span><input class="appMenuInlineInput" type="password" autocomplete="new-password" data-admin-own-password="new"></label>',
    '    <label><span>Nové heslo znovu</span><input class="appMenuInlineInput" type="password" autocomplete="new-password" data-admin-own-password="confirm"></label>',
    '  </div>',
    '  <button type="button" class="appMenuAction isActive" data-admin-action="change-own-admin-password">Změnit moje heslo</button>',
    '</div>'
  ].join('');
}

async function rakAdminChangeOwnerPassword(root) {
  if (!rakAdminCanManageAdmins() || typeof app === 'undefined' || !app || app.adminAuthVersion !== 2) return { ok: false, reason: 'not-allowed' };
  const scope = root && root.querySelector ? root : document;
  const currentPassword = String(scope.querySelector('[data-admin-owner-password="current"]')?.value || '');
  const newPassword = String(scope.querySelector('[data-admin-owner-password="new"]')?.value || '');
  const confirmation = String(scope.querySelector('[data-admin-owner-password="confirm"]')?.value || '');
  if (!currentPassword || newPassword.length < 12) return { ok: false, reason: 'password-too-short' };
  if (newPassword !== confirmation) return { ok: false, reason: 'password-mismatch' };
  if (newPassword === currentPassword) return { ok: false, reason: 'password-unchanged' };
  const bridge = window.RotationSupabaseBridge;
  const accessToken = bridge && typeof bridge.getAdminAccessToken === 'function' ? await bridge.getAdminAccessToken() : '';
  if (!accessToken) return { ok: false, reason: 'missing-session' };
  const adminUsersUrl = String(window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url || '').replace(/\/$/, '') + '/functions/v1/rak-admin-users';
  const response = await fetch(adminUsersUrl, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      apikey: String(window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.publishableKey || ''),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ action: 'change-owner-password', currentPassword, newPassword })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) return { ok: false, reason: payload.error || 'password-update-failed' };
  const signInResult = bridge && typeof bridge.signInAdminAccount === 'function'
    ? await bridge.signInAdminAccount(RAK_OWNER_ADMIN_ACCOUNT_ID, newPassword, rakAdminSecureDevicePayload())
    : { ok: false, reason: 'missing-bridge' };
  const capabilities = await rakAdminGetSecureCapabilities(true);
  if (!signInResult.ok || !rakAdminApplySecureContext(signInResult.context, capabilities)) {
    return { ok: false, reason: signInResult.reason || 'reauthentication-failed', error: signInResult.error };
  }
  return { ok: true };
}

async function rakAdminChangeOwnPassword(root) {
  if (!rakAdminCanOpenAdmin() || rakAdminCanManageAdmins() || typeof app === 'undefined' || !app || app.adminAuthVersion !== 2) return { ok: false, reason: 'not-allowed' };
  const accountId = rakAdminGetActiveAccountId();
  const scope = root && root.querySelector ? root : document;
  const currentPassword = String(scope.querySelector('[data-admin-own-password="current"]')?.value || '');
  const newPassword = String(scope.querySelector('[data-admin-own-password="new"]')?.value || '');
  const confirmation = String(scope.querySelector('[data-admin-own-password="confirm"]')?.value || '');
  if (!accountId || !currentPassword || newPassword.length < 12) return { ok: false, reason: 'password-too-short' };
  if (newPassword !== confirmation) return { ok: false, reason: 'password-mismatch' };
  if (newPassword === currentPassword) return { ok: false, reason: 'password-unchanged' };
  const bridge = window.RotationSupabaseBridge;
  const accessToken = bridge && typeof bridge.getAdminAccessToken === 'function' ? await bridge.getAdminAccessToken() : '';
  if (!accessToken) return { ok: false, reason: 'missing-session' };
  const adminUsersUrl = String(window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url || '').replace(/\/$/, '') + '/functions/v1/rak-admin-users';
  const response = await fetch(adminUsersUrl, {
    method: 'POST', cache: 'no-store',
    headers: { Authorization: 'Bearer ' + accessToken, apikey: String(window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.publishableKey || ''), 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'change-own-password', currentPassword, newPassword })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) return { ok: false, reason: payload.error || 'password-update-failed' };
  const signInResult = bridge && typeof bridge.signInAdminAccount === 'function'
    ? await bridge.signInAdminAccount(accountId, newPassword, rakAdminSecureDevicePayload())
    : { ok: false, reason: 'missing-bridge' };
  const capabilities = await rakAdminGetSecureCapabilities(true);
  if (!signInResult.ok || !rakAdminApplySecureContext(signInResult.context, capabilities)) return { ok: false, reason: signInResult.reason || 'reauthentication-failed', error: signInResult.error };
  return { ok: true };
}

async function rakAdminLoadAccountsDirectoryForViewer() {
  if (!rakAdminCanOpenAdmin()) return { ok: false, reason: 'not-allowed' };
  if (rakAdminCanManageAdmins()) return rakAdminLoadSecureDirectory();
  const bridge = window.RotationSupabaseBridge;
  const accessToken = bridge && typeof bridge.getAdminAccessToken === 'function' ? await bridge.getAdminAccessToken() : '';
  if (!accessToken) return { ok: false, reason: 'missing-session' };
  const adminUsersUrl = String(window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url || '').replace(/\/$/, '') + '/functions/v1/rak-admin-users';
  const response = await fetch(adminUsersUrl, {
    method: 'POST', cache: 'no-store',
    headers: { Authorization: 'Bearer ' + accessToken, apikey: String(window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.publishableKey || ''), 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'list-admin-directory' })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok || !Array.isArray(payload.profiles)) return { ok: false, reason: payload.error || 'admin-directory-load-failed' };
  app.adminProfilesV2 = payload.profiles;
  return { ok: true, profiles: payload.profiles };
}

function readAdminAccountsDraftRowsFromDom(root) {
  const scope = root && root.querySelectorAll ? root : document;
  const existingByIdMap = new Map((rakAdminGetAccountsSettings().admins || []).map((entry) => [entry.accountId, entry]));
  const rows = [];
  scope.querySelectorAll('tr[data-admin-account-row]').forEach((row) => {
    const accountId = String(row.querySelector('[data-admin-account-id]')?.value || '').trim();
    const existing = existingByIdMap.get(accountId) || null;
    rows.push({
      accountId,
      label: String(row.querySelector('[data-admin-account-label]')?.value || '').trim(),
      password: String(row.querySelector('[data-admin-account-password]')?.value || '').trim(),
      passwordHash: existing ? existing.passwordHash : '',
      passwordSalt: existing ? existing.passwordSalt : '',
      enabled: !!(row.querySelector('[data-admin-account-enabled]') && row.querySelector('[data-admin-account-enabled]').checked)
    });
  });
  return rows;
}

function adminAccountsRefreshStatus(root) {
  const scope = root && root.querySelector ? root : document;
  const statusEl = scope.querySelector ? scope.querySelector('#adminAccountsStatus') : document.getElementById('adminAccountsStatus');
  if (!statusEl) return false;
  const html = buildAdminAccountsStatusHtml({ rows: readAdminAccountsDraftRowsFromDom(scope) });
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  const fresh = wrapper.firstElementChild;
  if (!fresh) return false;
  statusEl.replaceWith(fresh);
  return true;
}

function rakAdminClearAccountRow(target) {
  const row = target && typeof target.closest === 'function' ? target.closest('tr[data-admin-account-row]') : null;
  if (!row) return;
  const idInput = row.querySelector('[data-admin-account-id]');
  const labelInput = row.querySelector('[data-admin-account-label]');
  const passwordInput = row.querySelector('[data-admin-account-password]');
  const enabledInput = row.querySelector('[data-admin-account-enabled]');
  if (idInput) idInput.value = '';
  if (labelInput) labelInput.value = '';
  if (passwordInput) { passwordInput.value = ''; passwordInput.placeholder = 'heslo'; }
  const roleInput = row.querySelector('[data-admin-account-role]');
  if (roleInput) roleInput.value = 'admin';
  if (enabledInput) enabledInput.checked = true;
  try { adminAccountsRefreshStatus(document.getElementById('appMenuBody') || document); } catch (err) {}
  const status = document.getElementById('adminOnlineSaveStatus');
  if (status) status.textContent = 'Řádek je vyprázdněný. Odebrání se uloží až tlačítkem Uložit správce.';
}

function readAdminAccountsSettingsFromDom() {
  const map = new Map();
  const current = rakAdminGetAccountsSettings();
  readAdminAccountsDraftRowsFromDom(document.getElementById('appMenuBody') || document).forEach((entry) => {
    const accountId = String(entry.accountId || '').trim();
    if (!accountId || accountId === RAK_OWNER_ADMIN_ACCOUNT_ID) return;
    if (!entry.password && !entry.passwordHash) return;
    const normalized = rakAdminNormalizeManagedEntry({
      accountId,
      label: entry.label,
      password: entry.password,
      passwordHash: entry.passwordHash,
      passwordSalt: entry.passwordSalt,
      enabled: entry.enabled !== false
    });
    if (normalized) map.set(accountId, normalized);
  });
  return {
    type: RAK_ADMIN_ACCOUNTS_SETTINGS_CATEGORY,
    ownerAccountId: RAK_OWNER_ADMIN_ACCOUNT_ID,
    admins: Array.from(map.values()).sort((a, b) => a.accountId.localeCompare(b.accountId)),
    sessions: Array.isArray(current.sessions) ? current.sessions : [],
    updatedAt: new Date().toISOString()
  };
}

function bindAdminAccountUnlock() {
  try { localStorage.removeItem('adminUnlocked'); } catch (err) {}
  if (document.documentElement.dataset.adminAccountUnlockBound === '1') return true;
  document.documentElement.dataset.adminAccountUnlockBound = '1';
  rakAdminScheduleStartupRestore();
  try {
    void rakAdminRestoreSecureSessionForActiveAccount('settings-loaded');
  } catch (err) {}
  return true;
}

try {
  window.RAK_OWNER_ADMIN_ACCOUNT_ID = RAK_OWNER_ADMIN_ACCOUNT_ID;
  window.RAK_ADMIN_ACCOUNTS_SETTINGS_KEY = RAK_ADMIN_ACCOUNTS_SETTINGS_KEY;
  window.RAK_ADMIN_ACCOUNTS_SETTINGS_CATEGORY = RAK_ADMIN_ACCOUNTS_SETTINGS_CATEGORY;
  window.rakAdminIsOwnerAccount = rakAdminIsOwnerAccount;
  window.rakAdminIsAccountsSettingsRow = rakAdminIsAccountsSettingsRow;
  window.rakAdminAccountRequiresPassword = rakAdminAccountRequiresPassword;
  window.rakAdminPromptUnlockForAccount = rakAdminPromptUnlockForAccount;
  window.rakAdminPromptOnceForActiveAccount = rakAdminPromptOnceForActiveAccount;
  window.rakAdminRestoreSessionForActiveAccount = rakAdminRestoreSessionForActiveAccount;
  window.rakAdminRestorePersistentSessionForActiveAccount = rakAdminRestorePersistentSessionForActiveAccount;
  window.rakAdminRestoreSecureSessionForActiveAccount = rakAdminRestoreSecureSessionForActiveAccount;
  window.rakAdminRevokePersistentSession = rakAdminRevokePersistentSession;
  window.rakAdminLock = rakAdminLock;
  window.rakAdminCanOpenAdmin = rakAdminCanOpenAdmin;
  window.rakAdminCanOpenShiftReport = rakAdminCanOpenShiftReport;
  window.rakAdminIsDeputy = rakAdminIsDeputy;
  window.rakAdminLoadAccountsDirectoryForViewer = rakAdminLoadAccountsDirectoryForViewer;
  window.rakAdminChangeOwnPassword = rakAdminChangeOwnPassword;
  window.rakAdminCanManageAdmins = rakAdminCanManageAdmins;
  window.buildAdminAccountsRoleOverviewHtml = buildAdminAccountsRoleOverviewHtml;
  window.buildAdminAccountsStatusHtml = buildAdminAccountsStatusHtml;
  window.adminAccountsRefreshStatus = adminAccountsRefreshStatus;
  window.readAdminAccountsDraftRowsFromDom = readAdminAccountsDraftRowsFromDom;
  window.rakAdminClearAccountRow = rakAdminClearAccountRow;
  window.buildAdminAccountsSettingsHtml = buildAdminAccountsSettingsHtml;
  window.readAdminAccountsSettingsFromDom = readAdminAccountsSettingsFromDom;
  window.readAdminAccountsSecureDraftRowsFromDom = readAdminAccountsSecureDraftRowsFromDom;
  window.rakAdminLoadSecureDirectory = rakAdminLoadSecureDirectory;
  window.rakAdminSaveSecureAccounts = rakAdminSaveSecureAccounts;
  window.mergeAdminAccountsSettingsRows = mergeAdminAccountsSettingsRows;
} catch (err) {}

if (!bindAdminAccountUnlock()) {
  registerListener(document, 'DOMContentLoaded', bindAdminAccountUnlock, { once: true });
}
