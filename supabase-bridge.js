// RaK 1.2 (1.155) – Supabase bridge a online synchronizace.
(function () {
  const SUPABASE_CONFIG = window.SUPABASE_CONFIG || {};
  const RAK_ACTIVE_WRITE_PATHS_RPC_ONLY = '1.6.14-sec1';
  const state = {
    client: null,
    ready: false,
    announcements: [],
    rotationSnapshot: null,
    machineSettingsSnapshot: [],
    lastError: null,
    realtimeChannel: null,
    realtimeStatus: 'idle',
    realtimeEvents: [],
    lastRealtimeAt: null,
    realtimeBindStartedAt: 0,
    adminAuth: {
      capabilities: null,
      context: null,
      checkedAt: 0,
      lastError: null
    },
    rotationRevision: null,
    rotationSync: {
      lastReadAt: null,
      lastWriteAt: null,
      lastWriteRevision: null,
      lastError: null
    },
    queueGuard: {
      trimmed: 0,
      deduped: 0,
      rejected: 0,
      oversized: 0,
      lastTrimAt: null,
      lastBindSkipAt: null
    },
    syncGuard: {
      readTimeouts: 0,
      writeTimeouts: 0,
      readRetries: 0,
      writeRetries: 0,
      queuedFallbacks: 0,
      cooldownSkips: 0,
      failedWrites: 0,
      failedReads: 0,
      queueFlushRuns: 0,
      queueFlushSuccesses: 0,
      queueFlushErrors: 0,
      queueBackoffSkips: 0,
      queueDroppedInvalid: 0,
      queueFlushBatchStops: 0,
      queueFlushScheduled: 0,
      queueFlushEmptyRuns: 0,
      queueHiddenDefers: 0,
      queueVisibilityFlushes: 0,
      queueWakeRequests: 0,
      queueWakeSkips: 0,
      queueWakeOfflineSkips: 0,
      queueWakeNoops: 0,
      realtimeWakeBinds: 0,
      realtimeRebindScheduled: 0,
      realtimeRebindRuns: 0,
      realtimeRebindSkips: 0,
      realtimeRebindErrors: 0,
      queueHealthChecks: 0,
      queueHealthWarnings: 0,
      queueHealthCriticals: 0,
      queueStaleTaskCount: 0,
      queueMaxRetryCount: 0,
      queueOldestAgeMs: 0,
      lastQueueHealthAt: null,
      lastQueueHealthWarningAt: null,
      lastQueueHealthCriticalAt: null,
      queueNextRetryAt: null,
      lastTimeoutAt: null,
      lastRetryAt: null,
      lastQueuedFallbackAt: null,
      lastCooldownSkipAt: null,
      lastQueueFlushAt: null,
      lastQueueSuccessAt: null,
      lastQueueErrorAt: null,
      lastQueueBackoffAt: null,
      lastQueueScheduleAt: null,
      lastQueueHiddenDeferAt: null,
      lastQueueVisibilityFlushAt: null,
      lastQueueWakeAt: null,
      lastQueueWakeSkipAt: null,
      lastRealtimeWakeBindAt: null,
      lastRealtimeRebindScheduleAt: null,
      lastRealtimeRebindAt: null,
      lastRealtimeRebindSkipAt: null,
      lastRealtimeRebindErrorAt: null
    },
    cacheGuard: {
      accountCacheHits: 0,
      accountCacheWrites: 0,
      statsCacheHits: 0,
      statsCacheWrites: 0,
      uiCacheHits: 0,
      uiCacheWrites: 0,
      uiSettingsLoads: 0,
      uiSettingsSaves: 0,
      uiSettingsSaveQueued: 0,
      uiSettingsSaveDeferred: 0,
      uiSettingsSaveErrors: 0,
      uiSettingsLoadFallbacks: 0,
      uiSettingsSharedLookups: 0,
      sessionCacheHits: 0,
      sessionCacheWrites: 0,
      sessionSaveQueued: 0,
      sessionSaveErrors: 0,
      sessionFallbacks: 0,
      sessionSharedLookups: 0,
      localJsonReadDelegations: 0,
      localJsonWriteDelegations: 0,
      localJsonWriteSkips: 0,
      staleFallbacks: 0,
      sharedReadJoins: 0,
      lastCacheHitAt: null,
      lastCacheWriteAt: null,
      lastSharedReadAt: null
    },
    performanceGuard: {
      realtimeRefreshRequests: 0,
      realtimeRefreshRuns: 0,
      realtimeRefreshCoalesced: 0,
      realtimeRefreshHiddenDefers: 0,
      realtimeRefreshErrors: 0,
      sharedReadStarts: 0,
      sharedReadJoins: 0,
      sharedReadActive: 0,
      sharedReadPeak: 0,
      writeOptimizationChecks: 0,
      writeOptimizationJoins: 0,
      writeOptimizationSkips: 0,
      writeOptimizationStarts: 0,
      writeOptimizationActive: 0,
      writeOptimizationPeak: 0,
      lastWriteOptimizationKey: '',
      lastWriteOptimizationAt: null,
      lastWriteOptimizationSkipAt: null,
      lastWriteOptimizationJoinAt: null,
      lastRealtimeRefreshRequestAt: null,
      lastRealtimeRefreshRunAt: null,
      lastRealtimeRefreshTable: '',
      lastRealtimeRefreshReason: '',
      lastRealtimeRefreshHiddenAt: null,
      lastSharedReadKey: '',
      lastSharedReadAt: null
    },
    keepalive: {
      status: 'unknown',
      label: 'neznámá',
      attempts: 0,
      successes: 0,
      failures: 0,
      skips: 0,
      lastAttemptAt: null,
      lastSuccessAt: null,
      lastErrorAt: null,
      lastErrorMessage: '',
      lastErrorCode: '',
      lastReason: '',
      lastDeviceKey: '',
      lastDurationMs: 0,
      lastHttpStatus: null,
      lastClassification: 'unknown',
      lastSkipReason: '',
      lastSkipAt: null
    }
  };

  const SUPABASE_QUEUE_MAX_ITEMS = 120;
  const SUPABASE_QUEUE_MAX_BYTES = 650000;
  const SUPABASE_REALTIME_REBIND_GUARD_MS = 15000;
  const SUPABASE_REALTIME_REFRESH_DELAY_MS = 750;
  const SUPABASE_REALTIME_REFRESH_HIDDEN_DELAY_MS = 2600;
  const SUPABASE_READ_TIMEOUT_MS = 12000;
  const SUPABASE_WRITE_TIMEOUT_MS = 16000;
  const SUPABASE_WRITE_COOLDOWN_MS = 900;
  const SUPABASE_QUEUE_RETRY_BASE_MS = 12000;
  const SUPABASE_QUEUE_RETRY_MAX_MS = 4 * 60 * 1000;
  const SUPABASE_QUEUE_FLUSH_BATCH_SIZE = 8;
  const SUPABASE_QUEUE_FLUSH_IDLE_DELAY_MS = 1200;
  const SUPABASE_QUEUE_HIDDEN_RETRY_DELAY_MS = 1800;
  const SUPABASE_QUEUE_WAKE_GUARD_MS = 2500;
  const SUPABASE_QUEUE_DROP_INVALID_AFTER = 3;
  const SUPABASE_QUEUE_HEALTH_WARN_AFTER_MS = 20 * 60 * 1000;
  const SUPABASE_QUEUE_HEALTH_CRITICAL_AFTER_MS = 2 * 60 * 60 * 1000;
  const SUPPORTED_QUEUE_TYPES = new Set([
    'rotation_state',
    'machine_settings',
    'rotation_month_entries',
    'gomoku_win',
    'game_stat',
    'game_ui_settings',
    'game_session',
    'bug_report'
  ]);

  function hasClient() {
    return !!(window.supabase && typeof window.supabase.createClient === 'function');
  }

  function getClient() {
    if (state.client) return state.client;
    if (!hasClient()) return null;
    const url = SUPABASE_CONFIG.url || '';
    const key = SUPABASE_CONFIG.publishableKey || '';
    if (!url || !key) return null;
    state.client = window.supabase.createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    });
    return state.client;
  }

  function adminAuthEmail(accountId) {
    const id = String(accountId || '').trim();
    return /^\d{4,12}$/.test(id) ? (id + '@admin.rak.local') : '';
  }

  async function getAdminAuthCapabilities(options) {
    const opts = options && typeof options === 'object' ? options : {};
    const cached = state.adminAuth.capabilities;
    if (!opts.force && cached && Date.now() - state.adminAuth.checkedAt < 60000) return cached;
    const client = getClient();
    if (!client || !navigator.onLine) return cached || { available: false, enforced: false, reason: 'offline' };
    try {
      const { data, error } = await client.rpc('rak_admin_auth_capabilities');
      if (error) throw error;
      const capabilities = data && typeof data === 'object'
        ? data
        : { available: false, enforced: false };
      state.adminAuth.capabilities = capabilities;
      state.adminAuth.checkedAt = Date.now();
      state.adminAuth.lastError = null;
      return capabilities;
    } catch (err) {
      state.adminAuth.lastError = err;
      state.adminAuth.checkedAt = Date.now();
      const unavailable = { available: false, enforced: false, reason: 'rpc-unavailable' };
      state.adminAuth.capabilities = unavailable;
      return unavailable;
    }
  }

  async function loadAdminAuthContext() {
    const client = getClient();
    if (!client) return { ok: false, reason: 'missing-client' };
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) return { ok: false, error: sessionError, reason: 'session-error' };
    const session = sessionData && sessionData.session ? sessionData.session : null;
    if (!session) {
      state.adminAuth.context = null;
      return { ok: false, reason: 'missing-session' };
    }
    const { data, error } = await client.rpc('rak_admin_context');
    if (error) {
      state.adminAuth.context = null;
      state.adminAuth.lastError = error;
      return { ok: false, error, reason: 'not-authorized' };
    }
    const context = data && typeof data === 'object' ? data : null;
    state.adminAuth.context = context;
    state.adminAuth.lastError = null;
    return { ok: !!context, context, session };
  }

  async function adminAccountRequiresAuth(accountId) {
    const client = getClient();
    const id = String(accountId || '').trim();
    if (!client || !id || !navigator.onLine) return false;
    const capabilities = await getAdminAuthCapabilities();
    if (!capabilities.available) return false;
    const { data, error } = await client.rpc('rak_admin_account_requires_auth', { p_account_id: id });
    if (error) return false;
    return data === true;
  }

  async function signInAdminAccount(accountId, password, device) {
    const client = getClient();
    const email = adminAuthEmail(accountId);
    if (!client || !email || !String(password || '')) return { ok: false, reason: 'invalid-credentials' };
    const capabilities = await getAdminAuthCapabilities({ force: true });
    if (!capabilities.available) return { ok: false, reason: 'auth-not-ready', capabilities };
    const { data, error } = await client.auth.signInWithPassword({ email, password: String(password) });
    if (error) return { ok: false, error, reason: 'invalid-credentials' };
    const contextResult = await loadAdminAuthContext();
    if (!contextResult.ok || String(contextResult.context && contextResult.context.account_id || '') !== String(accountId || '').trim()) {
      await client.auth.signOut({ scope: 'local' }).catch(() => {});
      return { ok: false, error: contextResult.error, reason: 'not-authorized' };
    }
    const safeDevice = device && typeof device === 'object' ? device : {};
    if (safeDevice.deviceId) {
      const { error: touchError } = await client.rpc('rak_admin_touch_device', {
        p_device_id: String(safeDevice.deviceId),
        p_label: String(safeDevice.label || 'Zařízení'),
        p_app_version: String(safeDevice.appVersion || '')
      });
      if (touchError) {
        await client.auth.signOut({ scope: 'local' }).catch(() => {});
        return { ok: false, error: touchError, reason: 'device-registration-failed' };
      }
    }
    return Object.assign({ ok: true }, contextResult);
  }

  async function restoreAdminAuthSession(accountId, device) {
    const capabilities = await getAdminAuthCapabilities();
    if (!capabilities.available) return { ok: false, reason: 'auth-not-ready', capabilities };
    const result = await loadAdminAuthContext();
    if (!result.ok) return result;
    if (String(result.context && result.context.account_id || '') !== String(accountId || '').trim()) {
      return { ok: false, reason: 'account-mismatch' };
    }
    const client = getClient();
    const safeDevice = device && typeof device === 'object' ? device : {};
    if (client && safeDevice.deviceId) {
      const { error } = await client.rpc('rak_admin_touch_device', {
        p_device_id: String(safeDevice.deviceId),
        p_label: String(safeDevice.label || 'Zařízení'),
        p_app_version: String(safeDevice.appVersion || '')
      });
      if (error) return { ok: false, error, reason: 'device-registration-failed' };
    }
    return result;
  }

  async function signOutAdminAccount() {
    const client = getClient();
    state.adminAuth.context = null;
    if (!client) return { ok: true };
    const { error } = await client.auth.signOut({ scope: 'local' });
    return error ? { ok: false, error } : { ok: true };
  }

  async function getAdminAccessToken() {
    const client = getClient();
    if (!client || !hasSecureAdminContext()) return '';
    const { data, error } = await client.auth.getSession();
    if (error) return '';
    return String(data && data.session && data.session.access_token || '');
  }

  async function listAdminAuthDevices() {
    const client = getClient();
    if (!client) return { ok: false, reason: 'missing-client', rows: [] };
    const { data, error } = await client.rpc('rak_owner_list_admin_devices');
    return error ? { ok: false, error, rows: [] } : { ok: true, rows: Array.isArray(data) ? data : [] };
  }

  async function revokeAdminAuthDevice(deviceId) {
    const client = getClient();
    if (!client) return { ok: false, reason: 'missing-client' };
    const { data, error } = await client.rpc('rak_owner_revoke_admin_device', { p_device_id: String(deviceId || '') });
    return error ? { ok: false, error } : (data || { ok: true });
  }

  async function listAdminAuthProfiles() {
    const client = getClient();
    if (!client) return { ok: false, reason: 'missing-client', rows: [] };
    const { data, error } = await client.rpc('rak_owner_list_admin_profiles');
    return error ? { ok: false, error, rows: [] } : { ok: true, rows: Array.isArray(data) ? data : [] };
  }

  async function createAdminSettingsBackup(snapshot, options) {
    const client = getClient();
    const opts = options && typeof options === 'object' ? options : {};
    if (!client || !hasSecureAdminContext()) return { ok: false, reason: 'admin-auth-required' };
    const { data, error } = await client.rpc('rak_owner_create_settings_backup_v2', {
      p_snapshot: snapshot && typeof snapshot === 'object' ? snapshot : {},
      p_source: String(opts.source || 'manual'),
      p_app_version: String(opts.appVersion || ''),
      p_restored_backup_id: opts.restoredBackupId || null,
      p_legacy_key: opts.legacyKey || null
    });
    return error ? { ok: false, error } : (data || { ok: true });
  }

  async function listAdminSettingsBackups(limit) {
    const client = getClient();
    if (!client || !hasSecureAdminContext()) return { ok: false, reason: 'admin-auth-required', rows: [] };
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 50));
    const { data, error } = await client.rpc('rak_owner_list_settings_backups_v2', { p_limit: safeLimit });
    return error ? { ok: false, error, rows: [] } : { ok: true, rows: Array.isArray(data) ? data : [] };
  }

  async function getAdminSettingsBackup(backupId) {
    const client = getClient();
    if (!client || !hasSecureAdminContext()) return { ok: false, reason: 'admin-auth-required' };
    const { data, error } = await client.rpc('rak_owner_get_settings_backup_v2', { p_backup_id: String(backupId || '') });
    return error ? { ok: false, error } : { ok: true, backup: data || null };
  }

  async function deleteAdminSettingsBackup(backupId) {
    const client = getClient();
    const id = String(backupId || '').trim();
    if (!client || !hasSecureAdminContext()) return { ok: false, reason: 'admin-auth-required' };
    if (!id) return { ok: false, reason: 'missing-backup-id' };
    const { data, error } = await client.rpc('rak_owner_delete_settings_backup_v2', { p_backup_id: id });
    return error ? { ok: false, error } : (data || { ok: true, id });
  }

  async function writeAdminAudit(area, summary, options) {
    const client = getClient();
    const opts = options && typeof options === 'object' ? options : {};
    if (!client || !hasSecureAdminContext()) return { ok: false, reason: 'admin-auth-required' };
    const { data, error } = await client.rpc('rak_admin_write_audit_v2', {
      p_area: String(area || '').trim(),
      p_summary: String(summary || '').trim(),
      p_target_type: String(opts.targetType || ''),
      p_target_id: String(opts.targetId || '')
    });
    return error ? { ok: false, error } : (data || { ok: true });
  }

  async function listAdminAudit(limit) {
    const client = getClient();
    if (!client || !hasSecureAdminContext()) return { ok: false, reason: 'admin-auth-required', rows: [] };
    const safeLimit = Math.max(1, Math.min(300, Number(limit) || 100));
    const { data, error } = await client.rpc('rak_admin_list_audit_v2', { p_limit: safeLimit });
    return error ? { ok: false, error, rows: [] } : { ok: true, rows: Array.isArray(data) ? data : [] };
  }

  const REALTIME_TABLES = [
    'announcements',
    'machine_settings',
    'rotation_state',
    'rotation_months',
    'rotation_entries',
    'game_accounts',
    'game_invites',
    'game_sessions',
    'game_stats',
    'gomoku_wins'
  ];


  const SUPABASE_STRUCTURE_CONTRACTS = [
    { table: 'announcements', realtime: true, queueType: '', access: 'anon SELECT + optional INSERT/UPDATE for admin announcement', note: 'dashboard oznámení / online-first čtení a pokus o admin zápis bez změny policies' },
    { table: 'machine_settings', realtime: true, queueType: 'machine_settings', access: 'anon SELECT/INSERT/UPDATE', note: 'nastavení strojů a parametrů kalkulaček' },
    { table: 'rotation_state', realtime: true, queueType: 'rotation_state', access: 'anon SELECT/INSERT/UPDATE', note: 'hlavní snapshot rotace' },
    { table: 'rotation_months', realtime: true, queueType: '', access: 'anon SELECT/INSERT/UPDATE', note: 'měsíce rozpisů' },
    { table: 'rotation_entries', realtime: true, queueType: 'rotation_month_entries', access: 'anon SELECT/INSERT/UPDATE', note: 'řádky rozpisů' },
    { table: 'game_accounts', realtime: true, queueType: '', access: 'anon SELECT/INSERT/UPDATE', note: 'herní profily' },
    { table: 'game_invites', realtime: true, queueType: '', access: 'anon SELECT/INSERT/UPDATE', note: 'pozvánky online her' },
    { table: 'game_sessions', realtime: true, queueType: 'game_session', access: 'anon SELECT/INSERT/UPDATE', note: 'online herní session' },
    { table: 'game_stats', realtime: true, queueType: 'game_stat', access: 'anon SELECT/INSERT/UPDATE', note: 'skóre a žebříčky' },
    { table: 'game_ui_settings', realtime: false, queueType: 'game_ui_settings', access: 'anon SELECT/INSERT/UPDATE', note: 'profilové nastavení vzhledu' },
    { table: 'app_keepalive', realtime: false, queueType: '', access: 'RPC rak_app_keepalive only', note: 'heartbeat proti pauze free projektu; klient používá RPC a veřejné tabulkové granty/policies jsou odebrané' },
    { table: 'bug_reports', realtime: false, queueType: 'bug_report', access: 'anon INSERT only', note: 'uživatelské reporty chyb / nápadů' },
    { table: 'gomoku_wins', realtime: true, queueType: 'gomoku_win', access: 'anon SELECT/INSERT/UPDATE', note: 'výhry piškvorek / legacy leaderboard' }
  ];

  const SUPABASE_POLICY_AUDIT_SNAPSHOT_VERSION = '1.2 (1.155)';
  const SUPABASE_POLICY_AUDIT_SNAPSHOT_AT = '2026-05-24';
  const SUPABASE_POLICY_HARDENING_PHASE = {
    current: 'V856 – release hygiene po kontrole vlastních buildů: changelog opravený, SQL auditní soubory jsou archivované v assets/docs/sql a DB policies se nemění.',
    next: 'Nasbírat RPC smoke signály create/accept/save zvlášť pro Piškvorky i Lodě bez fallbacků; až potom připravit úzké policy zúžení po jednotlivých tabulkách.',
    rollback: 'Rollback v828 byl proveden jen pro game_invites/game_sessions restriktivní policies z v826; game_stats restriktivní policies z v824 zůstávají zachované.'
  };
  const SUPABASE_POLICY_AUDIT_SNAPSHOT = [
    {
      table: 'rotation_state',
      priority: 'P0',
      risk: 'anon INSERT/UPDATE nad hlavním snapshotem rozpisů',
      observed: 'policy rak_rotation_state_insert_anon / rak_rotation_state_update_anon s with_check=true',
      recommendation: 'ponechat SELECT pro čtení, zápis přes úzkou RPC/admin flow nebo serverově ověřený maintenance token'
    },
    {
      table: 'machine_settings',
      priority: 'P0',
      risk: 'anon ALL/INSERT/UPDATE nad parametry strojů a kalkulaček',
      observed: 'policies machine_settings_anon_write_v622/v624 s qual=true a with_check=true',
      recommendation: 'zápisy omezit na RPC s validací povolených klíčů a rozsahů; klientský admin nesmí být autorita'
    },
    {
      table: 'game_stats',
      priority: 'P0',
      risk: 'public INSERT/UPDATE nad žebříčky, XP a profilovým vzhledem; public DELETE už odstraněn ve Fázi 2D',
      observed: 'původní permisivní game_stats_insert_public/update_public fyzicky zůstávají, ale přímé public write blokují restriktivní policies game_stats_insert_rpc_only_v824/game_stats_update_rpc_only_v824; game_stats_delete_public odstraněná v DB migraci v810',
      recommendation: 'běžné přírůstkové score zápisy držet přes rak_record_game_stat_delta a profile UI přes rak_save_game_ui_settings; po smoke testu bez fallbacků pokračovat na game_sessions/game_invites'
    },
    {
      table: 'game_sessions',
      priority: 'P0',
      risk: 'přímé public INSERT/UPDATE nad online session je po rollbacku v828 dočasně povolené kvůli funkčnosti online her; public DELETE zůstává odstraněný',
      observed: 'v828 odstranil restriktivní policies game_sessions_insert_rpc_only_v826/game_sessions_update_rpc_only_v826, protože online hry přestaly být bezpečně ověřené; DELETE zůstává odstraněné v810',
      recommendation: 'online Piškvorky link/kód jsou potvrzené OK; Lodě se musí ověřit samostatně; před dalším utažením nejdřív nasbírat RPC smoke bez fallbacku a teprve potom připravit úzké policies'
    },
    {
      table: 'game_invites',
      priority: 'P1',
      risk: 'přímé public INSERT/UPDATE nad pozvánkami je po rollbacku v828 dočasně povolené kvůli funkčnosti online her; public DELETE zůstává odstraněný',
      observed: 'v828 odstranil restriktivní policies game_invites_insert_rpc_only_v826/game_invites_update_rpc_only_v826, protože online hry přestaly být bezpečně ověřené; DELETE zůstává odstraněné v810',
      recommendation: 'pozvánky jsou společná vrstva online her; Piškvorky jsou potvrzené, Lodě musí mít vlastní create/accept/save smoke; další krok je RPC smoke evidence bez fallbacku, ne okamžité vrácení restriktivních policies'
    },
    {
      table: 'bug_reports',
      priority: 'P1',
      risk: 'anon/auth SELECT a UPDATE reportů chyb je potvrzené riziko soukromí/admin flow',
      observed: 'DB kontrola v827 potvrdila 2 veřejné SELECT/UPDATE policies; příprava bug_reports RPC byla odložena kvůli hotfixu online Piškvorek',
      recommendation: 'INSERT ponechat veřejný s limity, ale připravit admin/RPC review tok a potom zúžit SELECT/UPDATE přes chráněné rozhraní'
    },
    {
      table: 'gomoku_wins',
      priority: 'P2',
      risk: 'anon INSERT/SELECT legacy výsledků Piškvorek',
      observed: 'allow_insert_gomoku_wins / allow_read_gomoku_wins',
      recommendation: 'ponechat jen pokud je legacy žebříček potřeba; jinak sjednotit přes game_stats/game_sessions'
    }
  ];

  const SUPABASE_RPC_HARDENING_STATUS = {
    version: '1.2 (1.155)',
    phase: '2E-O online invite/session RPC smoke + accept RPC / no policy tightening',
    rpcPreferred: true,
    migrationApplied: true,
    migrationNote: 'game_stats direct INSERT/UPDATE zůstávají omezené restriktivními policies v824. Restriktivní policies pro game_invites/game_sessions z v826 byly v DB ve v828 odstraněné. V834–V837 stabilizovalo app_keepalive heartbeat přes RPC. V839 přidala RPC cestu pro přijetí online pozvánky; V841 zpřesnila smoke audit po hrách: Piškvorky i Lodě musí projít create/accept/save zvlášť před dalším utažením policies. V842 upravila klientské UI/flow, V843 sjednotila Lodě zvací overlay s Piškvorkami, V844 doplnila link/share flow Lodí a V845 opravuje router Lodí přes odkaz plus zakrytý spodek flotily; V847 tvrdě zajišťuje neprůhlednou spodní lištu v Láďově režimu; V848 přesněji dorovnává neaktivní ikonky spodní navigace vůči popiskům; V850 zmenšuje/kompaktuje setup pole Lodí pro větší mobily a zpevňuje obnovu stavu/střelbu po připojení přes zvací odkaz; V855 kontroluje PWA/assets/SW po přesunu ikon bez změny policies; V856 opravuje release historii a přesouvá SQL auditní soubory z kořene do assets/docs/sql; spodní ikonky zůstávají beze změny; policies dál nemění.',
    dbVerifiedAt: '2026-05-25',
    verifiedRpcCount: 7,
    bugReportsHardeningPhase: 'znovu otevřeno jen jako audit; DB změna zatím ne',
    bugReportsPublicSelectUpdatePolicies: 2,
    bugReportsDbChanged: false,
    bugReportsNextStep: 'připravit oddělený admin/review tok; SELECT/UPDATE neutahovat, dokud nebude jasný bezpečný způsob čtení reportů',
    plannedRpc: [
      'rak_save_rotation_state',
      'rak_save_machine_settings',
      'rak_cleanup_expired_game_invites (existující cleanup helper)',
      'rak_record_game_stat_delta',
      'rak_save_game_ui_settings',
      'rak_create_game_invite_session',
      'rak_accept_game_invite',
      'rak_save_game_session_by_invite_code',
      'rak_submit_bug_report (DB scaffold, klient zatím nepoužívá)'
    ],
    fallback: 'game_stats direct-write je blokovaný v824; game_invites/game_sessions direct-write je ve v828 dočasně obnovený kvůli online hrám; bug_reports SELECT/UPDATE zatím ponecháno' ,
    gameStatsRpcSmoke: 'rpc-required-after-v824-restrictive-policy',
    gameUiSettingsRpcSmoke: 'rpc-required-after-v824-restrictive-policy',
    gameStatsRpcAttempts: 0,
    gameStatsRpcSuccesses: 0,
    gameStatsRpcFallbacks: 0,
    lastGameStatsRpcAt: null,
    lastGameStatsRpcType: '',
    lastGameStatsFallbackAt: null,
    lastGameStatsFallbackReason: '',
    gameUiRpcAttempts: 0,
    gameUiRpcSuccesses: 0,
    gameUiRpcFallbacks: 0,
    gameSessionRpcAttempts: 0,
    gameSessionRpcSuccesses: 0,
    gameSessionRpcFallbacks: 0,
    lastGameSessionRpcAt: null,
    lastGameSessionRpcType: '',
    lastGameSessionFallbackAt: null,
    lastGameSessionFallbackReason: '',
    lastGameUiRpcAt: null,
    lastGameUiFallbackAt: null,
    lastGameUiFallbackReason: ''
  };




  const SUPABASE_HARDENING_READINESS_ITEMS = [
    {
      area: 'app_keepalive',
      priority: 'P2',
      state: 'hotovo',
      rpc: 'rak_app_keepalive',
      directFallback: 'ne',
      risk: 'nízké – oddělená heartbeat tabulka mimo herní data',
      next: 'jen sledovat OK stav v diagnostice'
    },
    {
      area: 'game_stats / game_ui_settings',
      priority: 'P0',
      state: 'částečně zpevněno',
      rpc: 'rak_record_game_stat_delta + rak_save_game_ui_settings',
      directFallback: 'game_stats přímý write je blokovaný restriktivními policies v824; UI nastavení sleduje vlastní RPC smoke',
      risk: 'střední – před dalším utažením musí být smoke bez fallbacků',
      next: 'odehrát několik her a uložit theme/pozadí profilu, potom zkontrolovat RPC smoke počítadla'
    },
    {
      area: 'game_invites / game_sessions',
      priority: 'P0',
      state: 'funkční po rollbacku, accept RPC přidané, policy zatím otevřená',
      rpc: 'rak_create_game_invite_session + rak_accept_game_invite + rak_save_game_session_by_invite_code',
      directFallback: 'ano, po rollbacku v828 dočasně zachováno kvůli kompatibilitě online her',
      risk: 'vyšší – online hra je funkční, ale policy se nesmí vracet naslepo',
      next: 'nasbírat reálné RPC úspěchy create/accept/save zvlášť pro Piškvorky i Lodě bez fallbacku; potom připravit postupné zúžení INSERT/UPDATE'
    },
    {
      area: 'bug_reports',
      priority: 'P1',
      state: 'čeká na bezpečný admin tok',
      rpc: 'rak_submit_bug_report je plánovaná/částečná cesta pro odeslání',
      directFallback: 'public SELECT/UPDATE zatím zůstává kvůli čtení/správě reportů',
      risk: 'střední – riziko soukromí u reportů, ale nemá blokovat online hry',
      next: 'připravit oddělený admin/review přístup a až pak utáhnout SELECT/UPDATE'
    },
    {
      area: 'rotation_state / machine_settings / rotation_entries',
      priority: 'P0',
      state: 'starší veřejný write kontrakt',
      rpc: 'zatím není plně dokončená bezpečná RPC náhrada pro všechny zápisy',
      directFallback: 'ano',
      risk: 'vyšší – pracovní data a parametry strojů',
      next: 'řešit až po online hrách/reportech; vyžaduje samostatný migrační plán a testy rozpisů/kalkulaček'
    }
  ];

  const GAME_STATS_RPC_SMOKE_STORAGE_KEY = 'rak_game_stats_rpc_smoke_v1';

  function normalizeGameStatsRpcSmoke(raw) {
    const base = raw && typeof raw === 'object' ? raw : {};
    return {
      attempts: Math.max(0, Number(base.attempts || 0) || 0),
      successes: Math.max(0, Number(base.successes || 0) || 0),
      fallbacks: Math.max(0, Number(base.fallbacks || 0) || 0),
      successByType: base.successByType && typeof base.successByType === 'object' ? Object.assign({}, base.successByType) : {},
      fallbackByType: base.fallbackByType && typeof base.fallbackByType === 'object' ? Object.assign({}, base.fallbackByType) : {},
      lastAttemptAt: base.lastAttemptAt || null,
      lastSuccessAt: base.lastSuccessAt || null,
      lastSuccessType: String(base.lastSuccessType || ''),
      lastFallbackAt: base.lastFallbackAt || null,
      lastFallbackType: String(base.lastFallbackType || ''),
      lastFallbackReason: String(base.lastFallbackReason || ''),
      updatedAt: base.updatedAt || null
    };
  }

  function readGameStatsRpcSmokeStatus() {
    try {
      if (typeof localStorage === 'undefined') return normalizeGameStatsRpcSmoke(null);
      return normalizeGameStatsRpcSmoke(JSON.parse(localStorage.getItem(GAME_STATS_RPC_SMOKE_STORAGE_KEY) || '{}'));
    } catch (err) {
      return normalizeGameStatsRpcSmoke(null);
    }
  }

  function writeGameStatsRpcSmokeStatus(next) {
    const safe = normalizeGameStatsRpcSmoke(next);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(GAME_STATS_RPC_SMOKE_STORAGE_KEY, JSON.stringify(safe));
      }
    } catch (err) {}
    SUPABASE_RPC_HARDENING_STATUS.gameStatsRpcAttempts = safe.attempts;
    SUPABASE_RPC_HARDENING_STATUS.gameStatsRpcSuccesses = safe.successes;
    SUPABASE_RPC_HARDENING_STATUS.gameStatsRpcFallbacks = safe.fallbacks;
    SUPABASE_RPC_HARDENING_STATUS.lastGameStatsRpcAt = safe.lastSuccessAt;
    SUPABASE_RPC_HARDENING_STATUS.lastGameStatsRpcType = safe.lastSuccessType;
    SUPABASE_RPC_HARDENING_STATUS.lastGameStatsFallbackAt = safe.lastFallbackAt;
    SUPABASE_RPC_HARDENING_STATUS.lastGameStatsFallbackReason = safe.lastFallbackReason;
    return safe;
  }

  function rememberGameStatsRpcSmoke(kind, gameType, reason) {
    const nowIso = new Date().toISOString();
    const type = String(gameType || '').trim();
    const next = readGameStatsRpcSmokeStatus();
    if (kind === 'attempt') {
      next.attempts += 1;
      next.lastAttemptAt = nowIso;
    } else if (kind === 'success') {
      next.successes += 1;
      next.lastSuccessAt = nowIso;
      next.lastSuccessType = type;
      next.successByType = next.successByType && typeof next.successByType === 'object' ? next.successByType : {};
      if (type) next.successByType[type] = Math.max(0, Number(next.successByType[type] || 0) || 0) + 1;
    } else if (kind === 'fallback') {
      next.fallbacks += 1;
      next.lastFallbackAt = nowIso;
      next.lastFallbackType = type;
      next.lastFallbackReason = String(reason || 'unknown').slice(0, 180);
      next.fallbackByType = next.fallbackByType && typeof next.fallbackByType === 'object' ? next.fallbackByType : {};
      if (type) next.fallbackByType[type] = Math.max(0, Number(next.fallbackByType[type] || 0) || 0) + 1;
    }
    next.updatedAt = nowIso;
    return writeGameStatsRpcSmokeStatus(next);
  }

  function getGameStatsRpcSmokeStatus() {
    const persisted = readGameStatsRpcSmokeStatus();
    const readyForPolicyTightening = persisted.attempts >= 3 && persisted.successes >= 3 && persisted.fallbacks === 0;
    return Object.assign({}, persisted, {
      persistent: true,
      readyForPolicyTightening,
      requiredSuccessesBeforeTightening: 3,
      requiredFallbacksBeforeTightening: 0,
      recommendation: readyForPolicyTightening
        ? 'Po reálném mobilním hraní jsou RPC zápisy game_stats bez fallbacků; je možné připravit úzké zúžení INSERT/UPDATE policies.'
        : 'Před zúžením INSERT/UPDATE policies odehraj na mobilu několik her a zkontroluj, že úspěchy RPC rostou a fallbacky zůstávají 0.'
    });
  }



  const GAME_UI_RPC_SMOKE_STORAGE_KEY = 'rak_game_ui_rpc_smoke_v1';

  function normalizeGameUiRpcSmoke(raw) {
    const base = raw && typeof raw === 'object' ? raw : {};
    return {
      attempts: Math.max(0, Number(base.attempts || 0) || 0),
      successes: Math.max(0, Number(base.successes || 0) || 0),
      fallbacks: Math.max(0, Number(base.fallbacks || 0) || 0),
      lastAttemptAt: base.lastAttemptAt || null,
      lastSuccessAt: base.lastSuccessAt || null,
      lastFallbackAt: base.lastFallbackAt || null,
      lastFallbackReason: String(base.lastFallbackReason || ''),
      updatedAt: base.updatedAt || null
    };
  }

  function readGameUiRpcSmokeStatus() {
    try {
      if (typeof localStorage === 'undefined') return normalizeGameUiRpcSmoke(null);
      return normalizeGameUiRpcSmoke(JSON.parse(localStorage.getItem(GAME_UI_RPC_SMOKE_STORAGE_KEY) || '{}'));
    } catch (err) {
      return normalizeGameUiRpcSmoke(null);
    }
  }

  function writeGameUiRpcSmokeStatus(next) {
    const safe = normalizeGameUiRpcSmoke(next);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(GAME_UI_RPC_SMOKE_STORAGE_KEY, JSON.stringify(safe));
      }
    } catch (err) {}
    SUPABASE_RPC_HARDENING_STATUS.gameUiRpcAttempts = safe.attempts;
    SUPABASE_RPC_HARDENING_STATUS.gameUiRpcSuccesses = safe.successes;
    SUPABASE_RPC_HARDENING_STATUS.gameUiRpcFallbacks = safe.fallbacks;
    SUPABASE_RPC_HARDENING_STATUS.lastGameUiRpcAt = safe.lastSuccessAt;
    SUPABASE_RPC_HARDENING_STATUS.lastGameUiFallbackAt = safe.lastFallbackAt;
    SUPABASE_RPC_HARDENING_STATUS.lastGameUiFallbackReason = safe.lastFallbackReason;
    return safe;
  }

  function rememberGameUiRpcSmoke(kind, reason) {
    const nowIso = new Date().toISOString();
    const next = readGameUiRpcSmokeStatus();
    if (kind === 'attempt') {
      next.attempts += 1;
      next.lastAttemptAt = nowIso;
    } else if (kind === 'success') {
      next.successes += 1;
      next.lastSuccessAt = nowIso;
    } else if (kind === 'fallback') {
      next.fallbacks += 1;
      next.lastFallbackAt = nowIso;
      next.lastFallbackReason = String(reason || 'unknown').slice(0, 180);
    }
    next.updatedAt = nowIso;
    return writeGameUiRpcSmokeStatus(next);
  }

  function getGameUiRpcSmokeStatus() {
    const persisted = readGameUiRpcSmokeStatus();
    const readyForPolicyTightening = persisted.attempts >= 1 && persisted.successes >= 1 && persisted.fallbacks === 0;
    return Object.assign({}, persisted, {
      persistent: true,
      readyForPolicyTightening,
      requiredSuccessesBeforeTightening: 1,
      requiredFallbacksBeforeTightening: 0,
      recommendation: readyForPolicyTightening
        ? 'Profilový vzhled se uložil přes RPC bez fallbacku; je možné připravovat užší policies pro __profile_ui.'
        : 'Před zúžením game_stats INSERT/UPDATE ulož na mobilu theme/pozadí profilu a ověř, že profile UI RPC fallback zůstává 0.'
    });
  }


  const GAME_SESSION_RPC_REQUIRED_GAMES = [
    { key: 'gomoku', label: 'Piškvorky' },
    { key: 'battleship', label: 'Lodě' }
  ];
  const GAME_SESSION_RPC_SMOKE_STORAGE_KEY = 'rak_game_session_rpc_smoke_v2';

  function cloneSmokeCountMap(value) {
    const out = {};
    if (!value || typeof value !== 'object') return out;
    Object.keys(value).forEach((key) => {
      const safeKey = String(key || '').trim().slice(0, 80);
      if (!safeKey) return;
      const num = Math.max(0, Number(value[key] || 0) || 0);
      if (num) out[safeKey] = num;
    });
    return out;
  }

  function cloneSmokeNestedCountMap(value) {
    const out = {};
    if (!value || typeof value !== 'object') return out;
    Object.keys(value).forEach((gameKey) => {
      const safeGame = normalizeGameTypeForSmoke(gameKey);
      if (!safeGame) return;
      const inner = cloneSmokeCountMap(value[gameKey]);
      if (Object.keys(inner).length) out[safeGame] = inner;
    });
    return out;
  }

  function normalizeGameTypeForSmoke(value) {
    const gameType = String(value || '').trim().toLowerCase();
    if (!gameType) return '';
    if (gameType === 'ttt' || gameType === 'gomoku' || gameType === 'piskvorky' || gameType === 'piškvorky') return 'gomoku';
    if (gameType === 'ships' || gameType === 'lode' || gameType === 'lodě' || gameType === 'battleship') return 'battleship';
    return gameType.slice(0, 60);
  }

  function inferGameTypeFromSessionPayload(inviteRow, sessionRow, boardState) {
    const candidates = [
      inviteRow && inviteRow.game_type,
      sessionRow && sessionRow.game_type,
      boardState && boardState.gameType,
      sessionRow && sessionRow.board_state && sessionRow.board_state.gameType,
      inviteRow && inviteRow.payload && inviteRow.payload.gameType
    ];
    for (const item of candidates) {
      const normalized = normalizeGameTypeForSmoke(item);
      if (normalized) return normalized;
    }
    return 'unknown';
  }

  function incrementSmokeCount(map, key) {
    const safeKey = String(key || '').trim().slice(0, 80);
    if (!safeKey) return map;
    map[safeKey] = Math.max(0, Number(map[safeKey] || 0) || 0) + 1;
    return map;
  }

  function incrementNestedSmokeCount(map, gameType, opType) {
    const gameKey = normalizeGameTypeForSmoke(gameType) || 'unknown';
    const opKey = String(opType || '').trim().slice(0, 80);
    if (!opKey) return map;
    map[gameKey] = cloneSmokeCountMap(map[gameKey]);
    map[gameKey][opKey] = Math.max(0, Number(map[gameKey][opKey] || 0) || 0) + 1;
    return map;
  }

  function normalizeGameSessionRpcSmoke(raw) {
    const base = raw && typeof raw === 'object' ? raw : {};
    return {
      attempts: Math.max(0, Number(base.attempts || 0) || 0),
      successes: Math.max(0, Number(base.successes || 0) || 0),
      fallbacks: Math.max(0, Number(base.fallbacks || 0) || 0),
      attemptByType: cloneSmokeCountMap(base.attemptByType),
      successByType: cloneSmokeCountMap(base.successByType),
      fallbackByType: cloneSmokeCountMap(base.fallbackByType),
      attemptByGame: cloneSmokeNestedCountMap(base.attemptByGame),
      successByGame: cloneSmokeNestedCountMap(base.successByGame),
      fallbackByGame: cloneSmokeNestedCountMap(base.fallbackByGame),
      lastAttemptAt: base.lastAttemptAt || null,
      lastAttemptType: String(base.lastAttemptType || ''),
      lastAttemptGameType: normalizeGameTypeForSmoke(base.lastAttemptGameType || ''),
      lastSuccessAt: base.lastSuccessAt || null,
      lastSuccessType: String(base.lastSuccessType || ''),
      lastSuccessGameType: normalizeGameTypeForSmoke(base.lastSuccessGameType || ''),
      lastFallbackAt: base.lastFallbackAt || null,
      lastFallbackType: String(base.lastFallbackType || ''),
      lastFallbackGameType: normalizeGameTypeForSmoke(base.lastFallbackGameType || ''),
      lastFallbackReason: String(base.lastFallbackReason || ''),
      updatedAt: base.updatedAt || null
    };
  }

  function readGameSessionRpcSmokeStatus() {
    try {
      if (typeof localStorage === 'undefined') return normalizeGameSessionRpcSmoke(null);
      return normalizeGameSessionRpcSmoke(JSON.parse(localStorage.getItem(GAME_SESSION_RPC_SMOKE_STORAGE_KEY) || '{}'));
    } catch (err) {
      return normalizeGameSessionRpcSmoke(null);
    }
  }

  function writeGameSessionRpcSmokeStatus(next) {
    const safe = normalizeGameSessionRpcSmoke(next);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(GAME_SESSION_RPC_SMOKE_STORAGE_KEY, JSON.stringify(safe));
      }
    } catch (err) {}
    SUPABASE_RPC_HARDENING_STATUS.gameSessionRpcAttempts = safe.attempts;
    SUPABASE_RPC_HARDENING_STATUS.gameSessionRpcSuccesses = safe.successes;
    SUPABASE_RPC_HARDENING_STATUS.gameSessionRpcFallbacks = safe.fallbacks;
    SUPABASE_RPC_HARDENING_STATUS.lastGameSessionRpcAt = safe.lastSuccessAt;
    SUPABASE_RPC_HARDENING_STATUS.lastGameSessionRpcType = safe.lastSuccessType;
    SUPABASE_RPC_HARDENING_STATUS.lastGameSessionFallbackAt = safe.lastFallbackAt;
    SUPABASE_RPC_HARDENING_STATUS.lastGameSessionFallbackReason = safe.lastFallbackReason;
    SUPABASE_RPC_HARDENING_STATUS.gameSessionRpcSuccessByType = Object.assign({}, safe.successByType || {});
    SUPABASE_RPC_HARDENING_STATUS.gameSessionRpcFallbackByType = Object.assign({}, safe.fallbackByType || {});
    return safe;
  }

  function rememberGameSessionRpcSmoke(kind, opType, reason, gameType) {
    const nowIso = new Date().toISOString();
    const type = String(opType || '').trim();
    const gameKey = normalizeGameTypeForSmoke(gameType) || 'unknown';
    const next = readGameSessionRpcSmokeStatus();
    if (kind === 'attempt') {
      next.attempts += 1;
      next.lastAttemptAt = nowIso;
      next.lastAttemptType = type;
      next.lastAttemptGameType = gameKey;
      next.attemptByType = incrementSmokeCount(next.attemptByType || {}, type);
      next.attemptByGame = incrementNestedSmokeCount(next.attemptByGame || {}, gameKey, type);
    } else if (kind === 'success') {
      next.successes += 1;
      next.lastSuccessAt = nowIso;
      next.lastSuccessType = type;
      next.lastSuccessGameType = gameKey;
      next.successByType = incrementSmokeCount(next.successByType || {}, type);
      next.successByGame = incrementNestedSmokeCount(next.successByGame || {}, gameKey, type);
    } else if (kind === 'fallback') {
      next.fallbacks += 1;
      next.lastFallbackAt = nowIso;
      next.lastFallbackType = type;
      next.lastFallbackGameType = gameKey;
      next.lastFallbackReason = String(reason || 'unknown').slice(0, 180);
      next.fallbackByType = incrementSmokeCount(next.fallbackByType || {}, type);
      next.fallbackByGame = incrementNestedSmokeCount(next.fallbackByGame || {}, gameKey, type);
    }
    next.updatedAt = nowIso;
    return writeGameSessionRpcSmokeStatus(next);
  }

  function getGameSessionRpcSmokeStatus() {
    const persisted = readGameSessionRpcSmokeStatus();
    const successByType = persisted.successByType || {};
    const fallbackByType = persisted.fallbackByType || {};
    const operationCoverage = {
      create: Math.max(0, Number(successByType.create_invite_session || 0) || 0),
      accept: Math.max(0, Number(successByType.accept_invite || 0) || 0),
      save: Math.max(0, Number(successByType.save_session || 0) || 0)
    };
    const fallbackCoverage = {
      create: Math.max(0, Number(fallbackByType.create_invite_session || 0) || 0),
      accept: Math.max(0, Number(fallbackByType.accept_invite || 0) || 0),
      save: Math.max(0, Number(fallbackByType.save_session || 0) || 0)
    };
    const perGameCoverage = {};
    const perGameFallbackCoverage = {};
    const missingGameOperations = [];
    GAME_SESSION_RPC_REQUIRED_GAMES.forEach((game) => {
      const successForGame = persisted.successByGame && persisted.successByGame[game.key] ? persisted.successByGame[game.key] : {};
      const fallbackForGame = persisted.fallbackByGame && persisted.fallbackByGame[game.key] ? persisted.fallbackByGame[game.key] : {};
      const coverage = {
        create: Math.max(0, Number(successForGame.create_invite_session || 0) || 0),
        accept: Math.max(0, Number(successForGame.accept_invite || 0) || 0),
        save: Math.max(0, Number(successForGame.save_session || 0) || 0)
      };
      const fallbacks = {
        create: Math.max(0, Number(fallbackForGame.create_invite_session || 0) || 0),
        accept: Math.max(0, Number(fallbackForGame.accept_invite || 0) || 0),
        save: Math.max(0, Number(fallbackForGame.save_session || 0) || 0)
      };
      perGameCoverage[game.key] = coverage;
      perGameFallbackCoverage[game.key] = fallbacks;
      if (coverage.create < 1) missingGameOperations.push(game.label + ':create');
      if (coverage.accept < 1) missingGameOperations.push(game.label + ':accept');
      if (coverage.save < 1) missingGameOperations.push(game.label + ':save');
      if (fallbacks.create > 0) missingGameOperations.push(game.label + ':create fallback');
      if (fallbacks.accept > 0) missingGameOperations.push(game.label + ':accept fallback');
      if (fallbacks.save > 0) missingGameOperations.push(game.label + ':save fallback');
    });
    const missingOperations = [];
    if (operationCoverage.create < 1) missingOperations.push('create');
    if (operationCoverage.accept < 1) missingOperations.push('accept');
    if (operationCoverage.save < 1) missingOperations.push('save');
    const readyForPolicyTightening = persisted.attempts >= 6 && persisted.successes >= 6 && persisted.fallbacks === 0 && missingGameOperations.length === 0;
    const gameCoverageText = GAME_SESSION_RPC_REQUIRED_GAMES.map((game) => {
      const item = perGameCoverage[game.key] || { create: 0, accept: 0, save: 0 };
      const fb = perGameFallbackCoverage[game.key] || { create: 0, accept: 0, save: 0 };
      return game.label + ' c/a/s ' + item.create + '/' + item.accept + '/' + item.save + ' · fallback ' + (fb.create + fb.accept + fb.save);
    }).join(' | ');
    return Object.assign({}, persisted, {
      persistent: true,
      readyForPolicyTightening,
      requiredSuccessesBeforeTightening: 6,
      requiredFallbacksBeforeTightening: 0,
      operationCoverage,
      fallbackCoverage,
      perGameCoverage,
      perGameFallbackCoverage,
      missingOperations,
      missingGameOperations,
      coverageText: 'create ' + String(operationCoverage.create) + ' · accept ' + String(operationCoverage.accept) + ' · save ' + String(operationCoverage.save),
      gameCoverageText,
      recommendation: readyForPolicyTightening
        ? 'Online pozvánky/session proběhly přes RPC bez fallbacků pro Piškvorky i Lodě ve všech krocích create/accept/save; další omezení game_sessions/game_invites dělat až po dalším ručním dvoumobilovém smoke testu obou her.'
        : 'Před zúžením policies musí být online hry ověřené přes RPC zvlášť pro Piškvorky i Lodě bez fallbacku. Chybí: ' + (missingGameOperations.length ? missingGameOperations.join(', ') : (missingOperations.length ? missingOperations.join(', ') : 'žádné, ale jsou fallbacky nebo málo pokusů')) + '.'
    });
  }
  const SUPABASE_STRUCTURE_REQUIRED_HELPERS = [
    'getClient',
    'runSupabaseOperation',
    'runSharedSupabaseRead',
    'runOptimizedSupabaseWrite',
    'readQueue',
    'enqueueTask',
    'requestRealtimeRefresh',
    'bindRealtime',
    'getSupabasePerformanceHealth',
    'getSupabaseKeepaliveStatus',
    'getSupabaseHardeningStatus',
    'getSupabaseHardeningReadiness'
  ];

  let realtimeRefreshTimer = null;
  let realtimeRebindTimer = null;

  function rememberRealtimeEvent(payload) {
    const event = {
      table: String(payload && payload.table ? payload.table : '').trim(),
      eventType: String(payload && payload.eventType ? payload.eventType : '').trim(),
      at: Date.now()
    };
    state.lastRealtimeAt = event.at;
    state.realtimeEvents = Array.isArray(state.realtimeEvents) ? state.realtimeEvents : [];
    state.realtimeEvents.push(event);
    if (state.realtimeEvents.length > 12) state.realtimeEvents = state.realtimeEvents.slice(-12);
    return event;
  }

  const SUPABASE_REALTIME_GAME_TABLES = new Set(['game_accounts', 'game_invites', 'game_sessions', 'game_stats', 'gomoku_wins']);

  function isRakLadaModeActiveForBridge() {
    try {
      return !!(typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('ladaMode'));
    } catch (err) {
      return false;
    }
  }

  function requestRealtimeRefresh(payload) {
    const event = rememberRealtimeEvent(payload || {});
    const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    state.performanceGuard.realtimeRefreshRequests += 1;
    state.performanceGuard.lastRealtimeRefreshRequestAt = Date.now();
    state.performanceGuard.lastRealtimeRefreshTable = event.table || '';
    const ladaLite = isRakLadaModeActiveForBridge();
    // Láďův režim: herní realtime eventy (cizí hráči hrají) nespouští refresh
    // celé appky, pokud nejsou otevřené Hry - online piškvorky mají vlastní polling.
    if (ladaLite && SUPABASE_REALTIME_GAME_TABLES.has(event.table)) {
      const gamesPage = typeof document !== 'undefined' ? document.getElementById('games') : null;
      const gamesVisible = !!(gamesPage && gamesPage.classList && gamesPage.classList.contains('active'));
      if (!gamesVisible) {
        state.performanceGuard.realtimeRefreshLadaGameSkips = Number(state.performanceGuard.realtimeRefreshLadaGameSkips || 0) + 1;
        return;
      }
    }
    if (realtimeRefreshTimer) {
      state.performanceGuard.realtimeRefreshCoalesced += 1;
      clearTimeout(realtimeRefreshTimer);
    }
    if (hidden) {
      state.performanceGuard.realtimeRefreshHiddenDefers += 1;
      state.performanceGuard.lastRealtimeRefreshHiddenAt = Date.now();
    }
    const delay = ladaLite
      ? (hidden ? 12000 : 3500)
      : (hidden ? SUPABASE_REALTIME_REFRESH_HIDDEN_DELAY_MS : SUPABASE_REALTIME_REFRESH_DELAY_MS);
    realtimeRefreshTimer = setTimeout(async () => {
      realtimeRefreshTimer = null;
      const reason = event.table ? ('supabase-' + event.table) : 'supabase-realtime';
      state.performanceGuard.realtimeRefreshRuns += 1;
      state.performanceGuard.lastRealtimeRefreshRunAt = Date.now();
      state.performanceGuard.lastRealtimeRefreshReason = reason;
      try {
        if (typeof window.__rotaceTriggerLiveRefresh === 'function') {
          await window.__rotaceTriggerLiveRefresh(reason, { force: true });
          return;
        }
        await refreshPublicData();
        if (typeof window.syncRotationFromSupabase === 'function') {
          await window.syncRotationFromSupabase(false);
        }
        if (typeof window.forceHomeRefresh === 'function') window.forceHomeRefresh();
        else if (typeof window.updateDashboard === 'function') window.updateDashboard();
        if (typeof window.renderRotace === 'function') window.renderRotace();
        if (typeof window.renderStatsPanel === 'function') window.renderStatsPanel();
      } catch (err) {
        state.performanceGuard.realtimeRefreshErrors += 1;
        state.lastError = err;
        console.warn('Supabase realtime refresh failed', err);
      }
    }, delay);
  }


  function scheduleRealtimeRebind(reason, delayMs) {
    const now = Date.now();
    if (!navigator.onLine) {
      state.syncGuard.realtimeRebindSkips += 1;
      state.syncGuard.lastRealtimeRebindSkipAt = now;
      return false;
    }
    if (realtimeRebindTimer) {
      state.syncGuard.realtimeRebindSkips += 1;
      state.syncGuard.lastRealtimeRebindSkipAt = now;
      return false;
    }
    const ms = Math.max(650, Math.min(30000, Number(delayMs) || 1800));
    state.syncGuard.realtimeRebindScheduled += 1;
    state.syncGuard.lastRealtimeRebindScheduleAt = now;
    realtimeRebindTimer = setTimeout(() => {
      realtimeRebindTimer = null;
      if (!navigator.onLine) {
        state.syncGuard.realtimeRebindSkips += 1;
        state.syncGuard.lastRealtimeRebindSkipAt = Date.now();
        return;
      }
      try {
        const hadChannel = !!state.realtimeChannel;
        state.syncGuard.realtimeRebindRuns += 1;
        state.syncGuard.lastRealtimeRebindAt = Date.now();
        bindRealtimeSubscriptions();
        if (!hadChannel && state.realtimeChannel) {
          requestRealtimeRefresh({ table: 'realtime-rebind', eventType: String(reason || 'resume') });
        }
      } catch (err) {
        state.syncGuard.realtimeRebindErrors += 1;
        state.syncGuard.lastRealtimeRebindErrorAt = Date.now();
        state.lastError = err;
        console.warn('Supabase realtime rebind failed', err);
      }
    }, ms);
    return true;
  }

  function bindRealtimeSubscriptions() {
    const client = getClient();
    if (!client || !navigator.onLine) return false;
    if (state.realtimeChannel) return true;
    if (state.realtimeStatus === 'connecting') {
      const now = Date.now();
      if (state.realtimeBindStartedAt && now - state.realtimeBindStartedAt < SUPABASE_REALTIME_REBIND_GUARD_MS) {
        state.queueGuard.lastBindSkipAt = now;
        return true;
      }
      state.realtimeStatus = 'idle';
      state.realtimeChannel = null;
    }
    if (typeof client.channel !== 'function') return false;

    try {
      state.realtimeBindStartedAt = Date.now();
      const channel = client.channel('rak-public-live-v1-5');
      REALTIME_TABLES.forEach((table) => {
        channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
          requestRealtimeRefresh(payload || { table });
        });
      });
      channel.subscribe((status) => {
        state.realtimeStatus = String(status || '').toLowerCase() || 'unknown';
        if (status === 'SUBSCRIBED') {
          state.realtimeBindStartedAt = 0;
          requestRealtimeRefresh({ table: 'initial', eventType: 'SUBSCRIBED' });
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          state.realtimeChannel = null;
          state.realtimeBindStartedAt = 0;
          scheduleRealtimeRebind('status-' + String(status || 'closed').toLowerCase(), 2200);
        }
      });
      state.realtimeChannel = channel;
      state.realtimeStatus = 'connecting';
      return true;
    } catch (err) {
      state.lastError = err;
      state.realtimeStatus = 'failed';
      console.warn('Supabase realtime subscribe failed', err);
      state.realtimeChannel = null;
      return false;
    }
  }


  function getBridgeText() {
    const active = state.announcements.find(item => item && item.is_active !== false) || state.announcements[0] || null;
    return active ? {
      id: String(active.id || '').trim(),
      title: String(active.title || '').trim(),
      message: String(active.message || active.text || active.body || '').trim(),
      is_active: active.is_active !== false,
      start_at: String(active.start_at || active.starts_at || active.valid_from || active.from || '').trim(),
      starts_at: String(active.starts_at || active.start_at || active.valid_from || active.from || '').trim(),
      end_at: String(active.end_at || active.ends_at || active.valid_to || active.to || '').trim(),
      ends_at: String(active.ends_at || active.end_at || active.valid_to || active.to || '').trim(),
      marquee: active.marquee === false ? false : true,
      updated_at: String(active.updated_at || active.created_at || '').trim()
    } : null;
  }

  const DASHBOARD_ANNOUNCEMENT_ONLINE_STATUS_KEY = 'rak_dashboard_announcement_online_status_v1';

  function normalizeDashboardAnnouncementForOnline(raw) {
    const base = raw && typeof raw === 'object' ? raw : {};
    return {
      title: String(base.title || '').trim().slice(0, 80),
      message: String(base.message || base.text || base.body || '').trim().slice(0, 500),
      is_active: base.isActive === false || base.is_active === false ? false : true,
      starts_at: String(base.startAt || base.start_at || base.starts_at || base.valid_from || base.from || '').trim() || null,
      ends_at: String(base.endAt || base.end_at || base.ends_at || base.valid_to || base.to || '').trim() || null,
      marquee: base.marquee === false ? false : true
    };
  }

  function cleanAnnouncementRow(row) {
    const out = {};
    Object.keys(row || {}).forEach((key) => {
      if (row[key] !== undefined) out[key] = row[key];
    });
    return out;
  }

  function normalizeAnnouncementOnlineStatus(raw) {
    const base = raw && typeof raw === 'object' ? raw : {};
    return {
      mode: 'dashboard-announcement-rpc-online-v949',
      lastAttemptAt: base.lastAttemptAt || null,
      lastSuccessAt: base.lastSuccessAt || null,
      lastErrorAt: base.lastErrorAt || null,
      lastWriteOk: !!base.lastWriteOk,
      lastClearOk: !!base.lastClearOk,
      lastOperation: String(base.lastOperation || '').slice(0, 80),
      lastAttemptShape: String(base.lastAttemptShape || '').slice(0, 80),
      lastErrorMessage: String(base.lastErrorMessage || '').slice(0, 240),
      lastErrorCode: String(base.lastErrorCode || '').slice(0, 80),
      writePolicyRequired: base.writePolicyRequired === false ? false : true,
      fallback: String(base.fallback || '').slice(0, 120)
    };
  }

  function readDashboardAnnouncementOnlineStatus() {
    return normalizeAnnouncementOnlineStatus(safeReadJson(DASHBOARD_ANNOUNCEMENT_ONLINE_STATUS_KEY, {}));
  }

  function rememberDashboardAnnouncementOnlineStatus(patch) {
    const next = normalizeAnnouncementOnlineStatus(Object.assign({}, readDashboardAnnouncementOnlineStatus(), patch || {}));
    safeWriteJson(DASHBOARD_ANNOUNCEMENT_ONLINE_STATUS_KEY, next);
    return next;
  }

  function supabaseErrorText(err) {
    if (!err) return '';
    return String(err.message || err.details || err.hint || err.code || err.reason || err).slice(0, 240);
  }

  function buildAnnouncementInsertAttempts(payload, nowIso) {
    const rowFull = cleanAnnouncementRow({
      title: payload.title || null,
      message: payload.message,
      is_active: payload.is_active,
      starts_at: payload.starts_at,
      ends_at: payload.ends_at,
      marquee: payload.marquee,
      updated_at: nowIso,
      app_version: String(window.APP_VERSION || '1.5'),
      priority: 0
    });
    return [
      { name: 'title-message-starts-ends-marquee', row: rowFull },
      { name: 'title-message-starts-ends', row: cleanAnnouncementRow({ title: payload.title || null, message: payload.message, is_active: payload.is_active, starts_at: payload.starts_at, ends_at: payload.ends_at, updated_at: nowIso }) },
      { name: 'message-active-updated', row: cleanAnnouncementRow({ title: payload.title || null, message: payload.message, is_active: payload.is_active, updated_at: nowIso }) },
      { name: 'message-active', row: cleanAnnouncementRow({ title: payload.title || null, message: payload.message, is_active: payload.is_active }) },
      { name: 'message-active-no-title', row: cleanAnnouncementRow({ message: payload.message, is_active: payload.is_active }) }
    ];
  }

  async function softDeactivateDashboardAnnouncements() {
    return { ok: false, reason: 'rpc-only', message: 'Direct announcement table fallback is disabled.' };
  }

  function normalizeRpcAnnouncementRow(data, fallback) {
    const row = Array.isArray(data) ? data[0] : data;
    return row && typeof row === 'object'
      ? row
      : cleanAnnouncementRow({
          title: fallback.title || null,
          message: fallback.message,
          is_active: fallback.is_active,
          starts_at: fallback.starts_at,
          ends_at: fallback.ends_at,
          marquee: fallback.marquee,
          updated_at: new Date().toISOString(),
          app_version: String(window.APP_VERSION || '1.5'),
          priority: 0
        });
  }

  async function saveDashboardAnnouncementViaRpc(client, safe, nowIso) {
    try {
      if (!hasSecureAdminContext()) return { ok: false, reason: 'admin-auth-required', shape: 'rpc-save-v2' };
      const res = await runSupabaseOperation('announcements.rpc-save-v2', () => client.rpc('rak_admin_save_announcement_v2', {
        p_title: safe.title || null,
        p_message: safe.message,
        p_is_active: safe.is_active,
        p_starts_at: safe.starts_at,
        p_ends_at: safe.ends_at,
        p_marquee: safe.marquee,
        p_app_version: String(window.APP_VERSION || '1.6')
      }), { mode: 'write', timeoutMs: 8000, attempts: 1 });
      if (res && res.error) return { ok: false, error: res.error, shape: 'rpc-save-v2' };
      return { ok: true, row: normalizeRpcAnnouncementRow(res && res.data, safe), shape: 'rpc-save-v2' };
    } catch (err) {
      return { ok: false, error: err, shape: 'rpc-save-v2' };
    }
  }

  async function clearDashboardAnnouncementViaRpc(client, nowIso) {
    try {
      if (!hasSecureAdminContext()) return { ok: false, reason: 'admin-auth-required', shape: 'rpc-clear-v2' };
      const res = await runSupabaseOperation('announcements.rpc-clear-v2', () => client.rpc('rak_admin_clear_announcement_v2'), { mode: 'write', timeoutMs: 8000, attempts: 1 });
      if (res && res.error) return { ok: false, error: res.error, shape: 'rpc-clear-v2' };
      return { ok: true, cleared: true, count: Number(res && res.data && res.data.count || 0), shape: 'rpc-clear-v2' };
    } catch (err) {
      return { ok: false, error: err, shape: 'rpc-clear-v2' };
    }
  }

  async function saveDashboardAnnouncementOnline(payload) {
    const client = getClient();
    const nowIso = new Date().toISOString();
    const safe = normalizeDashboardAnnouncementForOnline(payload || {});
    rememberDashboardAnnouncementOnlineStatus({ lastAttemptAt: nowIso, lastOperation: 'save', lastWriteOk: false, fallback: '' });
    if (!safe.message) {
      const status = rememberDashboardAnnouncementOnlineStatus({ lastErrorAt: nowIso, lastErrorMessage: 'missing-message', lastErrorCode: 'RAK_ANNOUNCEMENT_EMPTY' });
      return { ok: false, reason: 'missing-message', status };
    }
    if (!client || !navigator.onLine) {
      const status = rememberDashboardAnnouncementOnlineStatus({ lastErrorAt: nowIso, lastErrorMessage: 'offline-or-missing-client', lastErrorCode: 'RAK_ANNOUNCEMENT_OFFLINE', fallback: 'local-only' });
      return { ok: false, reason: 'offline-or-missing-client', status };
    }
    if (!hasSecureAdminContext()) {
      const status = rememberDashboardAnnouncementOnlineStatus({ lastErrorAt: nowIso, lastErrorMessage: 'admin-auth-required', lastErrorCode: 'RAK_ANNOUNCEMENT_ADMIN_AUTH', fallback: '' });
      return { ok: false, reason: 'admin-auth-required', status };
    }

    const rpc = await saveDashboardAnnouncementViaRpc(client, safe, nowIso);
    if (rpc && rpc.ok) {
      const row = rpc.row;
      state.announcements = [row].concat((state.announcements || []).filter(item => item && item.is_active === false).slice(0, 4));
      safeWriteJson(LOCAL_ANNOUNCEMENTS_KEY, state.announcements);
      state.lastError = null;
      try { requestRealtimeRefresh({ table: 'announcements', eventType: 'client-rpc-save-v2' }); } catch (err) {}
      const status = rememberDashboardAnnouncementOnlineStatus({
        lastSuccessAt: nowIso,
        lastWriteOk: true,
        lastClearOk: false,
        lastAttemptShape: rpc.shape || 'rpc-save-v2',
        lastErrorMessage: '',
        lastErrorCode: '',
        fallback: ''
      });
      return { ok: true, row, shape: rpc.shape || 'rpc-save-v2', status };
    }

    state.lastError = rpc && rpc.error ? rpc.error : state.lastError;
    const status = rememberDashboardAnnouncementOnlineStatus({
      lastErrorAt: nowIso,
      lastWriteOk: false,
      lastAttemptShape: 'rpc-save-v2',
      lastErrorMessage: supabaseErrorText(rpc && rpc.error),
      lastErrorCode: String(rpc && rpc.error && (rpc.error.code || rpc.error.status || '') || '').slice(0, 80),
      fallback: ''
    });
    return { ok: false, reason: 'secure-rpc-failed', error: rpc && rpc.error, status };
  }

  async function clearDashboardAnnouncementOnline() {
    const client = getClient();
    const nowIso = new Date().toISOString();
    rememberDashboardAnnouncementOnlineStatus({ lastAttemptAt: nowIso, lastOperation: 'clear', lastClearOk: false, fallback: '' });
    if (!client || !navigator.onLine) {
      const status = rememberDashboardAnnouncementOnlineStatus({ lastErrorAt: nowIso, lastErrorMessage: 'offline-or-missing-client', lastErrorCode: 'RAK_ANNOUNCEMENT_OFFLINE', fallback: 'local-only' });
      return { ok: false, reason: 'offline-or-missing-client', status };
    }
    if (!hasSecureAdminContext()) {
      const status = rememberDashboardAnnouncementOnlineStatus({ lastErrorAt: nowIso, lastErrorMessage: 'admin-auth-required', lastErrorCode: 'RAK_ANNOUNCEMENT_ADMIN_AUTH', fallback: '' });
      return { ok: false, reason: 'admin-auth-required', status };
    }
    const result = await clearDashboardAnnouncementViaRpc(client, nowIso);
    if (result && result.ok) {
      state.announcements = [];
      safeWriteJson(LOCAL_ANNOUNCEMENTS_KEY, state.announcements);
      try { requestRealtimeRefresh({ table: 'announcements', eventType: 'client-rpc-clear-v2' }); } catch (err) {}
      const status = rememberDashboardAnnouncementOnlineStatus({ lastSuccessAt: nowIso, lastClearOk: true, lastWriteOk: false, lastErrorMessage: '', lastErrorCode: '', lastAttemptShape: result.shape || 'rpc-clear-v2', fallback: '' });
      return { ok: true, cleared: true, status };
    }
    state.lastError = result && result.error ? result.error : state.lastError;
    const status = rememberDashboardAnnouncementOnlineStatus({
      lastErrorAt: nowIso,
      lastErrorMessage: supabaseErrorText(result && result.error),
      lastErrorCode: String(result && result.error && (result.error.code || result.error.status || '') || '').slice(0, 80),
      fallback: ''
    });
    return { ok: false, reason: 'secure-rpc-failed', error: result && result.error, status };
  }

  function getDashboardAnnouncementOnlineStatus() {
    const status = readDashboardAnnouncementOnlineStatus();
    return Object.assign({}, status, {
      ok: true,
      hasClient: !!getClient(),
      online: typeof navigator === 'undefined' ? false : !!navigator.onLine,
      cachedAnnouncementCount: Array.isArray(state.announcements) ? state.announcements.length : 0,
      table: 'announcements',
      realtimeChannel: 'rak-public-live-v1-5',
      readMode: 'public SELECT + realtime refresh + local cache fallback',
      writeMode: 'authenticated admin RPC save/clear only; active direct table fallbacks removed in 1.6.14-sec1'
    });
  }

  function getCanteenStatus() {
    return null;
  }

  const LOCAL_STATE_KEY = 'rotace_supabase_local_state_v1';
  const LOCAL_ROTATION_KEY = 'rotace_kalkulacky_state_v123';
  const DURABLE_ROTATION_CACHE = 'rotace-offline-data-v1';
  const DURABLE_ROTATION_REQUEST = './__rak/offline/rotation-state-v1.json';
  const LOCAL_QUEUE_KEY = 'rotace_supabase_queue_v1';
  const LOCAL_ANNOUNCEMENTS_KEY = 'rotace_supabase_announcements_v1';
  const LOCAL_MACHINE_SETTINGS_KEY = 'rotace_supabase_machine_settings_v1';
  const LOCAL_GAME_ACCOUNTS_KEY = 'rotace_supabase_game_accounts_v1';
  const LOCAL_GAME_STATS_PREFIX = 'rotace_supabase_game_stats_v856:';
  const LOCAL_GAME_UI_SETTINGS_PREFIX = 'rotace_supabase_game_ui_settings_v1:';
  const LOCAL_GAME_SESSIONS_PREFIX = 'rotace_supabase_game_sessions_v856:';
  const GAME_UI_SETTINGS_TYPE = '__profile_ui';
  const GAME_PROGRESS_RESET_VERSION = 'v.1.5 (926)';
  const GAME_PROGRESS_RESET_CUTOFF_ISO = '2026-05-26T15:08:00+02:00';
  const GAME_PROGRESS_RESET_CUTOFF_MS = Date.parse(GAME_PROGRESS_RESET_CUTOFF_ISO);
  const SUPABASE_GAME_CACHE_TTL_MS = 30 * 1000;
  const SUPABASE_WRITE_DEDUPE_WINDOW_MS = 1400;
  const SUPABASE_WRITE_FINGERPRINT_LIMIT = 180000;
  const SUPABASE_KEEPALIVE_STORAGE_KEY = 'rak_supabase_keepalive_v1';
  const SUPABASE_KEEPALIVE_DEVICE_KEY = 'rak_supabase_keepalive_device_v1';
  const SUPABASE_KEEPALIVE_MIN_INTERVAL_MS = 12 * 60 * 60 * 1000;
  const SUPABASE_KEEPALIVE_TIMEOUT_MS = 6500;
  const SUPABASE_KEEPALIVE_RETRY_INTERVAL_MS = 5 * 60 * 1000;
  let flushPromise = null;
  let flushScheduleTimer = null;
  let lastQueueWakeRequestAt = 0;
  const sharedReadPromises = new Map();
  const sharedWritePromises = new Map();
  const recentWriteFingerprints = new Map();

  function safeReadJson(key, fallback) {
    try {
      if (typeof parseLocalStorageJsonCached === 'function') {
        state.cacheGuard.localJsonReadDelegations += 1;
        return parseLocalStorageJsonCached(key, fallback);
      }
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed === undefined ? fallback : parsed;
    } catch (err) {
      return fallback;
    }
  }

  function safeWriteJson(key, value) {
    try {
      const payload = JSON.stringify(value);
      if (typeof setLocalStorageIfChanged === 'function') {
        state.cacheGuard.localJsonWriteDelegations += 1;
        const changed = setLocalStorageIfChanged(key, payload);
        if (!changed) state.cacheGuard.localJsonWriteSkips += 1;
        return true;
      }
      localStorage.setItem(key, payload);
      return true;
    } catch (err) {
      return false;
    }
  }


  function normalizeSupabaseKeepalive(raw) {
    const base = raw && typeof raw === 'object' ? raw : {};
    return {
      status: String(base.status || 'unknown'),
      label: String(base.label || 'neznámá'),
      attempts: Math.max(0, Number(base.attempts || 0) || 0),
      successes: Math.max(0, Number(base.successes || 0) || 0),
      failures: Math.max(0, Number(base.failures || 0) || 0),
      skips: Math.max(0, Number(base.skips || 0) || 0),
      lastAttemptAt: base.lastAttemptAt || null,
      lastSuccessAt: base.lastSuccessAt || null,
      lastErrorAt: base.lastErrorAt || null,
      lastErrorMessage: String(base.lastErrorMessage || '').slice(0, 220),
      lastErrorCode: String(base.lastErrorCode || '').slice(0, 80),
      lastReason: String(base.lastReason || '').slice(0, 80),
      lastDeviceKey: String(base.lastDeviceKey || '').slice(0, 96),
      lastDurationMs: Math.max(0, Number(base.lastDurationMs || 0) || 0),
      lastHttpStatus: base.lastHttpStatus === null || base.lastHttpStatus === undefined ? null : (Number(base.lastHttpStatus) || null),
      lastClassification: String(base.lastClassification || 'unknown').slice(0, 80),
      lastTransport: String(base.lastTransport || '').slice(0, 40),
      lastAppVersion: String(base.lastAppVersion || '').slice(0, 40),
      lastSkipReason: String(base.lastSkipReason || '').slice(0, 120),
      lastSkipAt: base.lastSkipAt || null,
      minIntervalHours: Math.round(SUPABASE_KEEPALIVE_MIN_INTERVAL_MS / 60 / 60 / 1000),
      table: 'app_keepalive'
    };
  }

  function readSupabaseKeepaliveState() {
    return normalizeSupabaseKeepalive(safeReadJson(SUPABASE_KEEPALIVE_STORAGE_KEY, {}));
  }

  function writeSupabaseKeepaliveState(next) {
    const safe = normalizeSupabaseKeepalive(next);
    Object.assign(state.keepalive, safe);
    safeWriteJson(SUPABASE_KEEPALIVE_STORAGE_KEY, safe);
    return safe;
  }

  function getKeepaliveLabel(status) {
    if (status === 'ok') return 'OK';
    if (status === 'possibly_paused') return 'možná paused';
    if (status === 'unavailable') return 'nedostupná';
    if (status === 'skipped') return 'čeká na interval';
    if (status === 'offline') return 'offline';
    return 'neznámá';
  }

  function ensureSupabaseKeepaliveDeviceKey() {
    try {
      let key = String(localStorage.getItem(SUPABASE_KEEPALIVE_DEVICE_KEY) || '').trim();
      if (/^rak-[a-z0-9]{10,}$/i.test(key)) return key.slice(0, 96);
      const hasCrypto = typeof crypto !== 'undefined' && crypto && typeof crypto.getRandomValues === 'function';
      const rnd = hasCrypto
        ? Array.from(crypto.getRandomValues(new Uint32Array(3))).map(n => n.toString(36)).join('')
        : (Date.now().toString(36) + Math.random().toString(36).slice(2, 12));
      key = ('rak-' + rnd).slice(0, 80);
      localStorage.setItem(SUPABASE_KEEPALIVE_DEVICE_KEY, key);
      return key;
    } catch (err) {
      return ('rak-memory-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).slice(0, 80);
    }
  }

  function classifySupabaseKeepaliveError(err) {
    const msg = String(err && (err.message || err.error_description || err.details || err.hint || err.statusText || err.code || err.status) ? (err.message || err.error_description || err.details || err.hint || err.statusText || err.code || err.status) : err || '').toLowerCase();
    const code = String(err && (err.code || err.status || err.statusCode) || '').trim();
    const status = Number(err && (err.status || err.statusCode || err.code));
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return { status: 'offline', label: getKeepaliveLabel('offline'), classification: 'offline', httpStatus: Number.isFinite(status) ? status : null, code };
    if (msg.includes('paused') || msg.includes('project is paused') || msg.includes('project is not active') || msg.includes('inactive') || [502, 503, 504, 521, 522, 523, 524].includes(status)) {
      return { status: 'possibly_paused', label: getKeepaliveLabel('possibly_paused'), classification: 'paused-or-gateway', httpStatus: Number.isFinite(status) ? status : null, code };
    }
    if (msg.includes('relation') && msg.includes('app_keepalive')) {
      return { status: 'unavailable', label: getKeepaliveLabel('unavailable'), classification: 'missing-app_keepalive-table', httpStatus: Number.isFinite(status) ? status : null, code };
    }
    if (msg.includes('violates row-level security') || msg.includes('permission denied') || status === 401 || status === 403) {
      return { status: 'unavailable', label: getKeepaliveLabel('unavailable'), classification: 'rls-or-permission', httpStatus: Number.isFinite(status) ? status : null, code };
    }
    if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('timeout') || msg.includes('load failed') || msg.includes('abort')) {
      return { status: 'unavailable', label: getKeepaliveLabel('unavailable'), classification: 'network-or-timeout', httpStatus: Number.isFinite(status) ? status : null, code };
    }
    return { status: 'unavailable', label: getKeepaliveLabel('unavailable'), classification: 'unknown-error', httpStatus: Number.isFinite(status) ? status : null, code };
  }

  function shouldRunSupabaseKeepalive(options) {
    const opts = options || {};
    if (opts.force) return { ok: true };
    const current = readSupabaseKeepaliveState();
    const now = Date.now();
    const appVersion = String(window.APP_VERSION || '').trim();
    const lastSuccess = Date.parse(current.lastSuccessAt || '') || 0;
    const lastAttempt = Date.parse(current.lastAttemptAt || '') || 0;
    const hadSuccessfulHeartbeat = !!lastSuccess;

    if (!hadSuccessfulHeartbeat) {
      const rlsError = current.lastClassification === 'rls-or-permission' || /row-level security|permission denied/i.test(String(current.lastErrorMessage || ''));
      const appChanged = !!appVersion && current.lastAppVersion !== appVersion;
      if (rlsError || appChanged || current.lastTransport !== 'rpc') {
        return { ok: true, current, reason: 'retry-after-heartbeat-fix' };
      }
      if (lastAttempt && now - lastAttempt < SUPABASE_KEEPALIVE_RETRY_INTERVAL_MS) {
        return { ok: false, reason: 'retry-wait', current };
      }
      return { ok: true, current, reason: 'no-success-yet' };
    }

    if (lastSuccess && now - lastSuccess < SUPABASE_KEEPALIVE_MIN_INTERVAL_MS) {
      return { ok: false, reason: 'interval', current };
    }
    return { ok: true, current };
  }

  async function runSupabaseKeepalive(reason, options) {
    const opts = options || {};
    const current = readSupabaseKeepaliveState();
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      const next = writeSupabaseKeepaliveState(Object.assign({}, current, {
        status: 'offline', label: getKeepaliveLabel('offline'), lastReason: String(reason || 'offline'), lastSkipReason: 'offline', lastSkipAt: new Date().toISOString(), skips: current.skips + 1
      }));
      return { ok: false, skipped: true, reason: 'offline', status: next };
    }
    const allowed = shouldRunSupabaseKeepalive(opts);
    if (!allowed.ok) {
      const keepCurrentError = !current.lastSuccessAt && (current.status === 'unavailable' || current.status === 'possibly_paused');
      const next = writeSupabaseKeepaliveState(Object.assign({}, current, {
        status: keepCurrentError ? current.status : (current.status === 'ok' ? 'ok' : 'skipped'),
        label: keepCurrentError ? current.label : (current.status === 'ok' ? getKeepaliveLabel('ok') : getKeepaliveLabel('skipped')),
        lastSkipReason: allowed.reason || 'interval',
        lastSkipAt: new Date().toISOString(),
        lastReason: String(reason || current.lastReason || 'scheduled').slice(0, 80),
        lastAppVersion: String(window.APP_VERSION || '').trim().slice(0, 40),
        lastTransport: current.lastTransport || 'rpc',
        skips: current.skips + 1
      }));
      return { ok: true, skipped: true, reason: allowed.reason || 'interval', status: next };
    }
    const client = getClient();
    if (!client) {
      const next = writeSupabaseKeepaliveState(Object.assign({}, current, {
        status: 'unavailable', label: getKeepaliveLabel('unavailable'), failures: current.failures + 1, lastErrorAt: new Date().toISOString(), lastErrorMessage: 'Supabase klient není připravený.', lastClassification: 'missing-client', lastReason: String(reason || 'init')
      }));
      return { ok: false, reason: 'missing-client', status: next };
    }

    const started = Date.now();
    const nowIso = new Date().toISOString();
    const deviceKey = ensureSupabaseKeepaliveDeviceKey();
    const attemptBase = Object.assign({}, current, {
      attempts: current.attempts + 1,
      lastAttemptAt: nowIso,
      lastReason: String(reason || 'init').slice(0, 80),
      lastDeviceKey: deviceKey,
      lastAppVersion: String(window.APP_VERSION || '').trim().slice(0, 40),
      lastTransport: 'rpc'
    });
    writeSupabaseKeepaliveState(Object.assign({}, attemptBase, { status: current.status || 'unknown', label: current.label || getKeepaliveLabel(current.status || 'unknown') }));

    const payload = {
      device_key: deviceKey,
      app_version: String(window.APP_VERSION || '').trim().slice(0, 40) || null,
      heartbeat_at: nowIso,
      user_agent: String((typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '').slice(0, 300),
      payload: {
        reason: String(reason || 'init').slice(0, 80),
        timezone: (typeof Intl !== 'undefined' && Intl.DateTimeFormat) ? (Intl.DateTimeFormat().resolvedOptions().timeZone || '') : '',
        online: typeof navigator !== 'undefined' ? navigator.onLine !== false : true,
        transport: 'rpc',
        build: '850'
      }
    };

    try {
      const rpcArgs = {
        p_device_key: payload.device_key,
        p_app_version: payload.app_version,
        p_user_agent: payload.user_agent,
        p_payload: payload.payload
      };
      const result = await runSupabaseOperation('app_keepalive.rpc', () => client.rpc('rak_app_keepalive', rpcArgs), { mode: 'write', attempts: 1, timeoutMs: SUPABASE_KEEPALIVE_TIMEOUT_MS });
      if (result && result.error) throw result.error;
      const next = writeSupabaseKeepaliveState(Object.assign({}, attemptBase, {
        status: 'ok', label: getKeepaliveLabel('ok'), successes: current.successes + 1, lastSuccessAt: new Date().toISOString(), lastErrorMessage: '', lastErrorCode: '', lastErrorAt: current.lastErrorAt || null, lastDurationMs: Date.now() - started, lastHttpStatus: null, lastClassification: 'ok-rpc', lastTransport: 'rpc', lastAppVersion: String(window.APP_VERSION || '').trim().slice(0, 40)
      }));
      return { ok: true, status: next };
    } catch (err) {
      const classified = classifySupabaseKeepaliveError(err);
      const next = writeSupabaseKeepaliveState(Object.assign({}, attemptBase, {
        status: classified.status,
        label: classified.label,
        failures: current.failures + 1,
        lastErrorAt: new Date().toISOString(),
        lastErrorMessage: String(err && (err.message || err.details || err.hint || err.code || err.status) ? (err.message || err.details || err.hint || err.code || err.status) : err || 'unknown').slice(0, 220),
        lastErrorCode: classified.code || '',
        lastDurationMs: Date.now() - started,
        lastHttpStatus: classified.httpStatus,
        lastClassification: classified.classification
      }));
      return { ok: false, error: err, status: next };
    }
  }

  function scheduleSupabaseKeepalive(reason, delayMs, options) {
    const delay = Math.max(0, Number(delayMs) || 0);
    setTimeout(() => {
      try { void runSupabaseKeepalive(reason || 'scheduled', options || {}); }
      catch (err) { console.warn('Supabase keepalive schedule failed', err); }
    }, delay);
  }

  function getSupabaseKeepaliveStatus() {
    const current = readSupabaseKeepaliveState();
    const online = typeof navigator !== 'undefined' ? navigator.onLine !== false : true;
    const ageMs = current.lastSuccessAt ? (Date.now() - (Date.parse(current.lastSuccessAt) || 0)) : null;
    const stale = Number.isFinite(ageMs) && ageMs > 36 * 60 * 60 * 1000;
    const issues = [];
    if (!online) issues.push('zařízení je offline');
    if (!current.lastSuccessAt) issues.push('heartbeat ještě nemá úspěšný zápis');
    if (current.status === 'possibly_paused') issues.push('Supabase může být paused nebo gateway nedostupná');
    if (current.status === 'unavailable') issues.push('Supabase heartbeat je nedostupný: ' + String(current.lastClassification || 'neznámý důvod'));
    if (stale) issues.push('poslední úspěšný heartbeat je starší než 36 hodin');
    return Object.assign({}, current, {
      ok: current.status === 'ok' && !!current.lastSuccessAt,
      online,
      stale,
      ageMs: Number.isFinite(ageMs) ? ageMs : null,
      minIntervalMs: SUPABASE_KEEPALIVE_MIN_INTERVAL_MS,
      retryIntervalMs: SUPABASE_KEEPALIVE_RETRY_INTERVAL_MS,
      timeoutMs: SUPABASE_KEEPALIVE_TIMEOUT_MS,
      issues: issues.slice(0, 8),
      checkedAt: new Date().toISOString()
    });
  }

  function readTimedCache(key, maxAgeMs) {
    const item = safeReadJson(key, null);
    if (!item || typeof item !== 'object' || !Array.isArray(item.rows)) return null;
    const savedAt = Number(item.savedAt || 0);
    const age = savedAt ? Date.now() - savedAt : Number.POSITIVE_INFINITY;
    return {
      rows: item.rows,
      savedAt,
      age,
      fresh: age <= Math.max(1000, Number(maxAgeMs) || SUPABASE_GAME_CACHE_TTL_MS)
    };
  }

  function writeTimedCache(key, rows, kind) {
    if (!Array.isArray(rows)) return false;
    const ok = safeWriteJson(key, {
      savedAt: Date.now(),
      version: window.APP_VERSION || '',
      rows
    });
    if (ok) {
      state.cacheGuard.lastCacheWriteAt = Date.now();
      if (kind === 'accounts') state.cacheGuard.accountCacheWrites += 1;
      if (kind === 'stats') state.cacheGuard.statsCacheWrites += 1;
      if (kind === 'ui') state.cacheGuard.uiCacheWrites += 1;
      if (kind === 'session') state.cacheGuard.sessionCacheWrites += 1;
    }
    return ok;
  }

  function rememberTimedCacheHit(kind, cache) {
    state.cacheGuard.lastCacheHitAt = Date.now();
    if (cache && !cache.fresh) state.cacheGuard.staleFallbacks += 1;
    if (kind === 'accounts') state.cacheGuard.accountCacheHits += 1;
    if (kind === 'stats') state.cacheGuard.statsCacheHits += 1;
    if (kind === 'ui') state.cacheGuard.uiCacheHits += 1;
    if (kind === 'session') state.cacheGuard.sessionCacheHits += 1;
  }

  async function runSharedSupabaseRead(key, work) {
    const readKey = String(key || '').trim();
    if (!readKey) return await work();
    if (sharedReadPromises.has(readKey)) {
      state.cacheGuard.sharedReadJoins += 1;
      state.performanceGuard.sharedReadJoins += 1;
      state.cacheGuard.lastSharedReadAt = Date.now();
      state.performanceGuard.lastSharedReadAt = Date.now();
      state.performanceGuard.lastSharedReadKey = readKey;
      return await sharedReadPromises.get(readKey);
    }
    state.performanceGuard.sharedReadStarts += 1;
    state.performanceGuard.sharedReadActive += 1;
    state.performanceGuard.sharedReadPeak = Math.max(Number(state.performanceGuard.sharedReadPeak || 0), Number(state.performanceGuard.sharedReadActive || 0));
    state.performanceGuard.lastSharedReadAt = Date.now();
    state.performanceGuard.lastSharedReadKey = readKey;
    const promise = Promise.resolve().then(work).finally(() => {
      sharedReadPromises.delete(readKey);
      state.performanceGuard.sharedReadActive = Math.max(0, Number(state.performanceGuard.sharedReadActive || 0) - 1);
    });
    sharedReadPromises.set(readKey, promise);
    return await promise;
  }
  function getSupabaseWriteFingerprint(value) {
    let raw = '';
    try { raw = JSON.stringify(value === undefined ? null : value); }
    catch (err) { raw = String(value === undefined ? null : value); }
    if (raw.length > SUPABASE_WRITE_FINGERPRINT_LIMIT) raw = raw.slice(0, SUPABASE_WRITE_FINGERPRINT_LIMIT) + ':truncated:' + raw.length;
    let hash = 5381;
    for (let i = 0; i < raw.length; i += 1) {
      hash = ((hash << 5) + hash) ^ raw.charCodeAt(i);
    }
    return String(raw.length) + ':' + String(hash >>> 0);
  }

  function pruneRecentWriteFingerprints() {
    const now = Date.now();
    for (const [key, item] of recentWriteFingerprints.entries()) {
      if (!item || now - Number(item.at || 0) > SUPABASE_WRITE_DEDUPE_WINDOW_MS * 6) recentWriteFingerprints.delete(key);
    }
    while (recentWriteFingerprints.size > 32) {
      const firstKey = recentWriteFingerprints.keys().next().value;
      if (!firstKey) break;
      recentWriteFingerprints.delete(firstKey);
    }
  }

  async function runOptimizedSupabaseWrite(key, payload, work, options) {
    const baseKey = String(key || 'supabase.write').trim() || 'supabase.write';
    const opts = options || {};
    const windowMs = Math.max(500, Math.min(6000, Number(opts.windowMs) || SUPABASE_WRITE_DEDUPE_WINDOW_MS));
    const fingerprint = getSupabaseWriteFingerprint(payload);
    const writeKey = baseKey + ':' + fingerprint;
    const now = Date.now();
    state.performanceGuard.writeOptimizationChecks += 1;
    state.performanceGuard.lastWriteOptimizationKey = baseKey;
    state.performanceGuard.lastWriteOptimizationAt = now;

    if (sharedWritePromises.has(writeKey)) {
      state.performanceGuard.writeOptimizationJoins += 1;
      state.performanceGuard.lastWriteOptimizationJoinAt = now;
      return await sharedWritePromises.get(writeKey);
    }

    const recent = recentWriteFingerprints.get(writeKey);
    if (recent && now - Number(recent.at || 0) <= windowMs) {
      state.performanceGuard.writeOptimizationSkips += 1;
      state.performanceGuard.lastWriteOptimizationSkipAt = now;
      return recent.result;
    }

    state.performanceGuard.writeOptimizationStarts += 1;
    state.performanceGuard.writeOptimizationActive += 1;
    state.performanceGuard.writeOptimizationPeak = Math.max(Number(state.performanceGuard.writeOptimizationPeak || 0), Number(state.performanceGuard.writeOptimizationActive || 0));

    const promise = Promise.resolve().then(work).then((result) => {
      recentWriteFingerprints.set(writeKey, { at: Date.now(), result });
      pruneRecentWriteFingerprints();
      return result;
    }).finally(() => {
      sharedWritePromises.delete(writeKey);
      state.performanceGuard.writeOptimizationActive = Math.max(0, Number(state.performanceGuard.writeOptimizationActive || 0) - 1);
    });
    sharedWritePromises.set(writeKey, promise);
    return await promise;
  }


  // RAK_17079_ROTATION_OFFLINE_ARBITRATION: compare both persistent stores and verify writes.
  function rotationPayloadFingerprint(rotation) {
    let json = '';
    try { json = JSON.stringify(rotation); } catch (_) { return ''; }
    let hash = 2166136261;
    for (let i = 0; i < json.length; i += 1) {
      hash ^= json.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return json.length.toString(36) + ':' + (hash >>> 0).toString(36);
  }

  function normalizeRotationPersistenceMeta(raw, fallbackSavedAt, payload) {
    const base = raw && typeof raw === 'object' ? raw : {};
    return {
      schema: 2,
      savedAt: Math.max(0, Number(base.savedAt || fallbackSavedAt || 0) || 0),
      revision: Math.max(0, Number(base.revision || 0) || 0),
      remoteUpdatedAt: String(base.remoteUpdatedAt || base.updatedAt || '').slice(0, 80),
      source: String(base.source || 'local-cache').slice(0, 40),
      fingerprint: String(base.fingerprint || rotationPayloadFingerprint(payload)).slice(0, 80)
    };
  }

  function readCanonicalRotationState() {
    const rotation = safeReadJson(LOCAL_ROTATION_KEY, null);
    return rotation && typeof rotation === 'object' && rotation.months ? rotation : null;
  }

  function writeCanonicalRotationState(rotation) {
    if (!rotation || typeof rotation !== 'object' || !rotation.months) return false;
    let expected = '';
    try { expected = JSON.stringify(rotation); } catch (_) { return false; }
    if (!safeWriteJson(LOCAL_ROTATION_KEY, rotation)) return false;
    try {
      if (localStorage.getItem(LOCAL_ROTATION_KEY) !== expected) return false;
    } catch (_) {
      const verified = readCanonicalRotationState();
      try { if (JSON.stringify(verified) !== expected) return false; } catch (_) { return false; }
    }
    state.cacheGuard.rotationCacheWrites = Number(state.cacheGuard.rotationCacheWrites || 0) + 1;
    state.cacheGuard.rotationStorageError = '';
    return true;
  }

  function getDurableRotationRequestUrl() {
    try { return new URL(DURABLE_ROTATION_REQUEST, window.location.href).href; }
    catch (_) { return DURABLE_ROTATION_REQUEST; }
  }

  async function persistDurableRotationState(rotation, metadata) {
    if (!rotation || typeof rotation !== 'object' || !rotation.months || typeof caches === 'undefined') return false;
    const meta = normalizeRotationPersistenceMeta(metadata, Date.now(), rotation);
    try {
      const cache = await caches.open(DURABLE_ROTATION_CACHE);
      const body = JSON.stringify({
        schema: 2, savedAt: meta.savedAt, revision: meta.revision,
        remoteUpdatedAt: meta.remoteUpdatedAt, source: meta.source,
        version: window.RAK_RELEASE_VERSION || window.APP_VERSION || '',
        fingerprint: meta.fingerprint, payload: rotation
      });
      await cache.put(getDurableRotationRequestUrl(), new Response(body, {
        status: 200, headers: { 'content-type': 'application/json;charset=utf-8', 'cache-control': 'no-store' }
      }));
      state.cacheGuard.durableRotationWrites = Number(state.cacheGuard.durableRotationWrites || 0) + 1;
      state.cacheGuard.durableRotationError = '';
      return true;
    } catch (err) {
      state.cacheGuard.durableRotationWriteErrors = Number(state.cacheGuard.durableRotationWriteErrors || 0) + 1;
      state.cacheGuard.durableRotationError = 'durable-rotation-write-failed';
      return false;
    }
  }

  async function loadDurableRotationState() {
    if (typeof caches === 'undefined') return null;
    try {
      const cache = await caches.open(DURABLE_ROTATION_CACHE);
      const response = await cache.match(getDurableRotationRequestUrl());
      if (!response) return null;
      const stored = await response.json();
      const payload = stored && stored.payload;
      if (!payload || typeof payload !== 'object' || !payload.months) return null;
      const actualFingerprint = rotationPayloadFingerprint(payload);
      if (stored.fingerprint && String(stored.fingerprint) !== actualFingerprint) {
        state.cacheGuard.durableRotationReadErrors = Number(state.cacheGuard.durableRotationReadErrors || 0) + 1;
        state.cacheGuard.durableRotationError = 'durable-rotation-fingerprint-mismatch';
        return null;
      }
      const meta = normalizeRotationPersistenceMeta(stored, stored.savedAt || 0, payload);
      state.cacheGuard.durableRotationReads = Number(state.cacheGuard.durableRotationReads || 0) + 1;
      state.cacheGuard.durableRotationError = '';
      return {
        id: 'main', payload, updatedAt: meta.savedAt || null, revision: meta.revision,
        meta: { source: 'durable-cache', savedAt: meta.savedAt, remoteUpdatedAt: meta.remoteUpdatedAt, fingerprint: meta.fingerprint }
      };
    } catch (err) {
      state.cacheGuard.durableRotationReadErrors = Number(state.cacheGuard.durableRotationReadErrors || 0) + 1;
      state.cacheGuard.durableRotationError = 'durable-rotation-read-failed';
      return null;
    }
  }

  function saveLocalSnapshot(rotation, machineSettingsRows, rotationMeta) {
    const existing = readLocalSnapshot() || {};
    const explicitRotation = !!(rotation && typeof rotation === 'object' && rotation.months);
    const legacyRotation = existing.rotation && typeof existing.rotation === 'object' && existing.rotation.months
      ? existing.rotation
      : null;
    // RAK_17080_ROTATION_METADATA_ISOLATION: unrelated cache writes (for example
    // machine settings) must never re-stamp or rewrite the canonical Rotation. The sole
    // exception is an embedded legacy Rotation, which must still be migrated out of the
    // duplicate LOCAL_STATE payload before a canonical write at storage quota.
    const candidateRotation = explicitRotation ? rotation : legacyRotation;
    const candidateFingerprint = rotationPayloadFingerprint(candidateRotation);
    const existingRotationMeta = candidateRotation
      ? normalizeRotationPersistenceMeta(existing.rotationMeta || {}, Object.prototype.hasOwnProperty.call(existing, 'rotationSavedAt') ? existing.rotationSavedAt : existing.updatedAt || 0, candidateRotation)
      : null;
    const canReuseMeta = !!(existingRotationMeta && existingRotationMeta.fingerprint === candidateFingerprint);
    let nextRotationMeta = existing.rotationMeta && typeof existing.rotationMeta === 'object'
      ? existing.rotationMeta
      : null;
    if (candidateRotation) {
      nextRotationMeta = normalizeRotationPersistenceMeta(
        rotationMeta || (canReuseMeta ? existingRotationMeta : {}),
        canReuseMeta ? existingRotationMeta.savedAt : Date.now(),
        candidateRotation
      );
    }

    const hasMachineSettings = Array.isArray(machineSettingsRows) && machineSettingsRows.length > 0;
    const nextMachineSettings = hasMachineSettings ? machineSettingsRows : (Array.isArray(existing.machineSettingsRows) ? existing.machineSettingsRows : []);
    const nextAnnouncements = Array.isArray(state.announcements) && state.announcements.length
      ? state.announcements : (Array.isArray(existing.announcements) ? existing.announcements : []);
    const rotationSavedAt = nextRotationMeta
      ? Math.max(0, Number(nextRotationMeta.savedAt || 0) || 0)
      : Math.max(0, Number(Object.prototype.hasOwnProperty.call(existing, 'rotationSavedAt') ? existing.rotationSavedAt : 0) || 0);
    const lean = { updatedAt: Date.now(), rotation: null, rotationKey: LOCAL_ROTATION_KEY, rotationSavedAt };
    const compact = Object.assign({}, lean);
    if (nextRotationMeta) compact.rotationMeta = nextRotationMeta;
    if (nextMachineSettings.length) compact.machineSettingsRows = nextMachineSettings;
    if (nextAnnouncements.length) compact.announcements = nextAnnouncements;

    let canonicalStored = true;
    if (candidateRotation && legacyRotation) {
      // RAK_17079_QUOTA_MIGRATION: free the duplicate legacy payload BEFORE growing
      // the canonical key. Keep this transitional record intentionally tiny so a full
      // iOS/WebKit localStorage can still migrate without deleting the only good payload.
      const released = safeWriteJson(LOCAL_STATE_KEY, lean);
      canonicalStored = released && writeCanonicalRotationState(candidateRotation);
      if (canonicalStored) state.cacheGuard.rotationCacheMigrations = Number(state.cacheGuard.rotationCacheMigrations || 0) + 1;
    } else if (candidateRotation) {
      canonicalStored = writeCanonicalRotationState(candidateRotation);
    }

    if (!canonicalStored) {
      state.cacheGuard.rotationCacheWriteErrors = Number(state.cacheGuard.rotationCacheWriteErrors || 0) + 1;
      state.cacheGuard.rotationStorageError = 'rotation-cache-write-failed';
      const fallback = Object.assign({}, lean, { rotation: candidateRotation || null, rotationKey: '' });
      if (nextRotationMeta) fallback.rotationMeta = nextRotationMeta;
      safeWriteJson(LOCAL_STATE_KEY, fallback);
      return fallback;
    }

    // Full metadata are preferred, but never sacrifice a verified canonical rotation
    // merely because the browser has room only for the lean migration record.
    if (!safeWriteJson(LOCAL_STATE_KEY, compact)) {
      state.cacheGuard.rotationMetadataWriteErrors = Number(state.cacheGuard.rotationMetadataWriteErrors || 0) + 1;
      safeWriteJson(LOCAL_STATE_KEY, lean);
    }
    if (hasMachineSettings || (Array.isArray(existing.machineSettingsRows) && existing.machineSettingsRows.length)) {
      safeWriteJson(LOCAL_MACHINE_SETTINGS_KEY, compact.machineSettingsRows);
    }
    return compact;
  }

  function readLocalSnapshot() {
    const snapshot = safeReadJson(LOCAL_STATE_KEY, null);
    if (snapshot && typeof snapshot === 'object') return snapshot;
    return null;
  }

  function loadCachedRotationState() {
    const snapshot = readLocalSnapshot();
    if (snapshot && snapshot.rotation && typeof snapshot.rotation === 'object' && snapshot.rotation.months) {
      const payload = snapshot.rotation;
      const meta = normalizeRotationPersistenceMeta(snapshot.rotationMeta || {}, snapshot.updatedAt || 0, payload);
      saveLocalSnapshot(payload, snapshot.machineSettingsRows || [], meta);
      return { id: 'main', payload, updatedAt: meta.savedAt || snapshot.updatedAt || null, revision: meta.revision,
        meta: { source: 'local-cache-migrated', savedAt: meta.savedAt, remoteUpdatedAt: meta.remoteUpdatedAt, fingerprint: meta.fingerprint } };
    }
    const rotation = readCanonicalRotationState();
    if (!rotation) return null;
    const actualFingerprint = rotationPayloadFingerprint(rotation);
    let meta = normalizeRotationPersistenceMeta(snapshot && snapshot.rotationMeta ? snapshot.rotationMeta : {}, snapshot ? (Object.prototype.hasOwnProperty.call(snapshot, 'rotationSavedAt') ? snapshot.rotationSavedAt : snapshot.updatedAt || 0) : 0, rotation);
    if (snapshot && snapshot.rotationMeta && snapshot.rotationMeta.fingerprint && String(snapshot.rotationMeta.fingerprint) !== actualFingerprint) {
      state.cacheGuard.rotationLocalFingerprintMismatches = Number(state.cacheGuard.rotationLocalFingerprintMismatches || 0) + 1;
      meta = normalizeRotationPersistenceMeta({ source: 'local-cache-unverified', fingerprint: actualFingerprint }, 0, rotation);
    }
    return { id: 'main', payload: rotation, updatedAt: meta.savedAt || null, revision: meta.revision,
      meta: { source: meta.source || 'local-cache', savedAt: meta.savedAt, remoteUpdatedAt: meta.remoteUpdatedAt, fingerprint: meta.fingerprint } };
  }

  function compareRotationOfflineCandidates(a, b) {
    if (!a) return b ? -1 : 0;
    if (!b) return 1;
    const ar = Math.max(0, Number(a.revision || 0) || 0), br = Math.max(0, Number(b.revision || 0) || 0);
    if (ar !== br) {
      if (ar > 0 && br === 0) return 1;
      if (br > 0 && ar === 0) return -1;
      if (ar > 0 && br > 0) return ar - br;
    }
    const at = Math.max(0, Number(a.meta && a.meta.savedAt || a.updatedAt || 0) || 0);
    const bt = Math.max(0, Number(b.meta && b.meta.savedAt || b.updatedAt || 0) || 0);
    if (at !== bt) return at - bt;
    if (ar !== br) return ar - br;
    return (String(a.meta && a.meta.source || '') === 'durable-cache' ? 1 : 0) -
      (String(b.meta && b.meta.source || '') === 'durable-cache' ? 1 : 0);
  }

  async function loadBestOfflineRotationState(options) {
    const opts = options && typeof options === 'object' ? options : {};
    let local = loadCachedRotationState(), durable = await loadDurableRotationState();
    const candidates = [local, durable].filter(item => item && item.payload);
    if (!candidates.length) {
      state.cacheGuard.rotationOfflineReady = false;
      state.cacheGuard.rotationOfflineCopies = 0;
      state.cacheGuard.rotationOfflineSelection = '';
      return null;
    }
    let selected = candidates[0];
    for (let i = 1; i < candidates.length; i += 1) if (compareRotationOfflineCandidates(candidates[i], selected) > 0) selected = candidates[i];
    const selectedFingerprint = rotationPayloadFingerprint(selected.payload);
    let localMatches = !!(local && rotationPayloadFingerprint(local.payload) === selectedFingerprint);
    let durableMatches = !!(durable && rotationPayloadFingerprint(durable.payload) === selectedFingerprint);
    if (opts.repair !== false) {
      const repairMeta = {
        savedAt: Number(selected.meta && selected.meta.savedAt || selected.updatedAt || Date.now()) || Date.now(),
        revision: Number(selected.revision || 0) || 0,
        remoteUpdatedAt: String(selected.meta && selected.meta.remoteUpdatedAt || ''),
        source: 'offline-repair', fingerprint: selectedFingerprint
      };
      if (!localMatches) {
        saveLocalSnapshot(selected.payload, state.machineSettingsSnapshot || [], repairMeta);
        local = loadCachedRotationState();
        localMatches = !!(local && rotationPayloadFingerprint(local.payload) === selectedFingerprint);
      }
      if (!durableMatches) {
        const repaired = await persistDurableRotationState(selected.payload, repairMeta);
        if (repaired) {
          durable = await loadDurableRotationState();
          durableMatches = !!(durable && rotationPayloadFingerprint(durable.payload) === selectedFingerprint);
        }
      }
    }
    state.cacheGuard.rotationOfflineReady = true;
    state.cacheGuard.rotationOfflineCopies = Number(localMatches) + Number(durableMatches);
    state.cacheGuard.rotationOfflineSelection = String(selected.meta && selected.meta.source || 'offline-cache');
    state.cacheGuard.rotationOfflineSelectionAt = Date.now();
    state.cacheGuard.rotationOfflineError = state.cacheGuard.rotationOfflineCopies >= 2 ? '' : 'rotation-offline-single-copy';
    return selected;
  }

  async function persistRotationOfflineSnapshot(rotation, metadata) {
    if (!rotation || typeof rotation !== 'object' || !rotation.months) {
      state.cacheGuard.rotationOfflineReady = false;
      state.cacheGuard.rotationOfflineCopies = 0;
      state.cacheGuard.rotationOfflineError = 'rotation-offline-invalid-payload';
      return { ok: false, copies: 0, local: false, durable: false, reason: 'invalid-payload' };
    }
    const meta = normalizeRotationPersistenceMeta(metadata, Date.now(), rotation);
    const expectedFingerprint = rotationPayloadFingerprint(rotation);
    saveLocalSnapshot(rotation, state.machineSettingsSnapshot || [], meta);
    const local = loadCachedRotationState();
    const localOk = !!(local && rotationPayloadFingerprint(local.payload) === expectedFingerprint);
    const durableStored = await persistDurableRotationState(rotation, meta);
    const durable = durableStored ? await loadDurableRotationState() : null;
    const durableOk = !!(durable && rotationPayloadFingerprint(durable.payload) === expectedFingerprint);
    const copies = Number(localOk) + Number(durableOk), ok = copies > 0;
    state.cacheGuard.rotationOfflineReady = ok;
    state.cacheGuard.rotationOfflineCopies = copies;
    state.cacheGuard.rotationOfflineVerifiedAt = Date.now();
    state.cacheGuard.rotationOfflineSelection = ok ? (durableOk ? 'durable-cache' : 'local-cache') : '';
    state.cacheGuard.rotationOfflineSelectionAt = Date.now();
    state.cacheGuard.rotationOfflineError = ok ? (copies >= 2 ? '' : 'rotation-offline-single-copy') : 'rotation-offline-write-failed';
    state.cacheGuard.rotationStorageError = ok ? '' : 'rotation-cache-write-failed';
    return { ok, copies, local: localOk, durable: durableOk, revision: meta.revision, savedAt: meta.savedAt,
      reason: ok ? (copies >= 2 ? 'verified-two-copies' : 'verified-one-copy') : 'verification-failed' };
  }

  async function getRotationOfflineDiagnostics() {
    const local = loadCachedRotationState(), durable = await loadDurableRotationState();
    const candidates = [local, durable].filter(item => item && item.payload);
    let selected = candidates[0] || null;
    for (let i = 1; i < candidates.length; i += 1) if (compareRotationOfflineCandidates(candidates[i], selected) > 0) selected = candidates[i];
    const localFingerprint = local ? rotationPayloadFingerprint(local.payload) : '';
    const durableFingerprint = durable ? rotationPayloadFingerprint(durable.payload) : '';
    const review = typeof getRakPendingSyncReview === 'function' ? getRakPendingSyncReview() : null;
    return {
      ok: true, offlineReady: !!selected,
      selectedSource: selected ? String(selected.meta && selected.meta.source || 'offline-cache') : '',
      selectedRevision: selected ? Math.max(0, Number(selected.revision || 0) || 0) : 0,
      copies: Number(!!local) + Number(!!durable),
      equivalent: !!(localFingerprint && durableFingerprint && localFingerprint === durableFingerprint),
      local: { present: !!local, revision: local ? Math.max(0, Number(local.revision || 0) || 0) : 0,
        savedAt: local ? Math.max(0, Number(local.meta && local.meta.savedAt || local.updatedAt || 0) || 0) : 0,
        source: local ? String(local.meta && local.meta.source || 'local-cache') : '' },
      durable: { present: !!durable, revision: durable ? Math.max(0, Number(durable.revision || 0) || 0) : 0,
        savedAt: durable ? Math.max(0, Number(durable.meta && durable.meta.savedAt || durable.updatedAt || 0) || 0) : 0,
        source: durable ? String(durable.meta && durable.meta.source || 'durable-cache') : '' },
      storage: { localError: String(state.cacheGuard.rotationStorageError || ''), durableError: String(state.cacheGuard.durableRotationError || ''),
        offlineError: String(state.cacheGuard.rotationOfflineError || '') },
      queue: review ? { total: Number(review.total || 0), held: Number(review.held || 0), retryable: Number(review.retryable || 0),
        unrecognized: Number(review.unrecognized || 0), storageIssue: !!review.storageIssue,
        labels: Array.isArray(review.labels) ? review.labels.slice(0, 8) : [] } : null
    };
  }

  function queueTaskKey(task) {
    const type = String(task && task.type ? task.type : '').trim();
    if (type === 'rotation_state') return type;
    if (type === 'machine_settings') return type;
    if (type === 'rotation_month_entries') return type + ':' + String(task && (task.monthStart || task.label) ? (task.monthStart || task.label) : '').trim();
    if (type === 'gomoku_win') return type + ':' + String(task && task.entry && (task.entry.id || task.entry.player_name || task.entry.created_at) ? (task.entry.id || task.entry.player_name || task.entry.created_at) : '').trim();
    if (type === 'game_stat') return type + ':' + String(task && task.entry && (task.entry.id || task.entry.game_type || task.entry.account_number || task.entry.created_at) ? (task.entry.id || task.entry.game_type || task.entry.account_number || task.entry.created_at) : '').trim();
    if (type === 'game_ui_settings') return type + ':' + String(task && task.entry && (task.entry.account_number || task.entry.accountNumber) ? (task.entry.account_number || task.entry.accountNumber) : '').trim();
    if (type === 'game_session') return type + ':' + String(task && (task.inviteCode || task.code) ? (task.inviteCode || task.code) : '').trim().toUpperCase();
    if (type === 'bug_report') return type + ':' + String(task && task.entry && (task.entry.id || task.entry.created_at || task.entry.createdAt) ? (task.entry.id || task.entry.created_at || task.entry.createdAt) : '').trim();
    return type || 'unknown';
  }

  function estimateJsonBytes(value) {
    try { return new Blob([JSON.stringify(value || null)]).size; }
    catch (err) {
      try { return String(JSON.stringify(value || null)).length; }
      catch (err2) { return Number.POSITIVE_INFINITY; }
    }
  }

  // RAK_17059_QUEUE_PRESERVE_GUARD: never drop an already stored task during normalization.
  function normalizeQueueTask(task, historical) {
    if (!task || typeof task !== 'object') return null;
    const type = String(task.type || '').trim();
    if (!SUPPORTED_QUEUE_TYPES.has(type) && !historical) {
      state.queueGuard.rejected += 1;
      return null;
    }
    const next = Object.assign({}, task, { type });
    if (historical && !SUPPORTED_QUEUE_TYPES.has(type)) next.conflict = 'unsupported-task';
    if (!next.id) next.id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (!next.queuedAt) next.queuedAt = new Date().toISOString();
    if (estimateJsonBytes(next) > SUPABASE_QUEUE_MAX_BYTES) {
      if (historical) return Object.assign({}, next, { conflict: 'oversize-task' });
      state.queueGuard.oversized += 1;
      return null;
    }
    return next;
  }

  function isGameProgressQueueTaskBeforeReset(task) {
    // RAK_17059_HELD_RESET_GUARD: quarantine always survives compaction.
    if (task && task.conflict) return false;
    const type = String(task && task.type || '').trim();
    if (type !== 'game_stat' && type !== 'game_session' && type !== 'gomoku_win') return false;
    const queuedAt = Date.parse(String(task && (task.queuedAt || task.createdAt || task.created_at) || ''));
    return Number.isFinite(GAME_PROGRESS_RESET_CUTOFF_MS) && Number.isFinite(queuedAt) && queuedAt < GAME_PROGRESS_RESET_CUTOFF_MS;
  }

  function compactQueue(queue) {
    const source = Array.isArray(queue) ? queue : [];
    const keyed = new Map();
    const passthrough = [];
    source.forEach((item) => {
      const normalized = normalizeQueueTask(item, true);
      if (!normalized) return;
      if (isGameProgressQueueTaskBeforeReset(normalized)) {
        state.queueGuard.trimmed += 1;
        return;
      }
      if (normalized.conflict) { passthrough.push(normalized); return; }
      const key = queueTaskKey(normalized);
      if (key && (normalized.type === 'rotation_state' || normalized.type === 'machine_settings' || normalized.type === 'rotation_month_entries' || normalized.type === 'game_ui_settings' || normalized.type === 'game_session')) {
        if (keyed.has(key)) state.queueGuard.deduped += 1;
        keyed.set(key, normalized);
      } else {
        passthrough.push(normalized);
      }
    });
    let next = [...keyed.values(), ...passthrough];
    if (next.length > SUPABASE_QUEUE_MAX_ITEMS) {
      // A legacy queue may already exceed the limit. Do not delete its contents.
      state.queueGuard.overCapacity = next.length;
    } else state.queueGuard.overCapacity = 0;
    return next;
  }

  // RAK_17060_DURABLE_QUEUE_GUARD: invalid JSON is never rewritten as an empty queue.
  // Read localStorage directly: cached JSON can be stale across tabs and app restarts.
  function readQueue() {
    let raw;
    try { raw = localStorage.getItem(LOCAL_QUEUE_KEY); }
    catch (_) { state.queueGuard.storageError = 'unavailable'; return []; }
    if (raw === null) {
      if (state.queueGuard.storageError !== 'write-failed') state.queueGuard.storageError = '';
      return [];
    }
    let queue;
    try { queue = JSON.parse(raw); }
    catch (_) { state.queueGuard.storageError = 'corrupt'; return []; }
    if (!Array.isArray(queue)) { state.queueGuard.storageError = 'corrupt'; return []; }
    // RAK_17062_LOSSLESS_AMBIGUITY_GUARD: normalization may discard old duplicate/malformed entries.
    // Never silently rewrite their original bytes; require private backup and review.
    const compacted = compactQueue(queue);
    if (compacted.length !== queue.length) { state.queueGuard.storageError = 'ambiguous'; return []; }
    if (['corrupt','unavailable','ambiguous'].includes(state.queueGuard.storageError)) state.queueGuard.storageError = '';
    return compacted;
  }

  function writeQueue(queue) {
    if (['corrupt','unavailable','ambiguous'].includes(state.queueGuard.storageError)) return false;
    try {
      const incoming = Array.isArray(queue) ? queue : [];
      const compacted = compactQueue(incoming);
      if (compacted.length !== incoming.length) { state.queueGuard.storageError = 'ambiguous'; return false; }
      const payload = JSON.stringify(compacted);
      localStorage.setItem(LOCAL_QUEUE_KEY, payload);
      if (localStorage.getItem(LOCAL_QUEUE_KEY) !== payload) throw new Error('queue-not-verified');
      state.queueGuard.storageError = '';
      return true;
    } catch (_) {
      state.queueGuard.storageError = 'write-failed';
      return false;
    }
  }

  function enqueueTask(task) {
    const queue = readQueue();
    if (state.queueGuard.storageError) return null;
    const normalized = normalizeQueueTask(Object.assign({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 8), queuedAt: new Date().toISOString() }, task || {}));
    if (!normalized) return null;
    if (queue.length >= SUPABASE_QUEUE_MAX_ITEMS) { state.queueGuard.rejected += 1; return null; }
    queue.push(normalized);
    if (!writeQueue(queue)) return null;
    const nextQueue = readQueue();
    if (state.queueGuard.storageError) return null;
    const key = queueTaskKey(normalized);
    return nextQueue.slice().reverse().find(item => queueTaskKey(item) === key) || null;
  }

  function isLikelyOfflineError(err) {
    const msg = String(err && (err.message || err.statusText || err.code) ? (err.message || err.statusText || err.code) : err || '').toLowerCase();
    return !navigator.onLine || msg.includes('fetch') || msg.includes('network') || msg.includes('offline') || msg.includes('failed to fetch') || msg.includes('load failed');
  }

  function isSupabaseTimeoutError(err) {
    return !!(err && (err.code === 'RAK_SUPABASE_TIMEOUT' || err.name === 'AbortError'));
  }

  function isLikelyTransientError(err) {
    const msg = String(err && (err.message || err.statusText || err.code || err.status) ? (err.message || err.statusText || err.code || err.status) : err || '').toLowerCase();
    const status = Number(err && (err.status || err.statusCode || err.code));
    return isLikelyOfflineError(err)
      || isSupabaseTimeoutError(err)
      || msg.includes('timeout')
      || msg.includes('timed out')
      || msg.includes('rate limit')
      || msg.includes('temporarily')
      || msg.includes('connection')
      || [408, 409, 425, 429, 500, 502, 503, 504].includes(status);
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
  }

  function getQueueRetryDelay(task) {
    const retries = Math.max(0, Number(task && task.retryCount) || 0);
    if (!retries) return 0;
    const delay = SUPABASE_QUEUE_RETRY_BASE_MS * Math.pow(2, Math.min(5, retries - 1));
    const jitter = Math.max(0, Math.min(2500, Number(task && task.retryJitterMs) || 0));
    return Math.min(SUPABASE_QUEUE_RETRY_MAX_MS, Math.max(SUPABASE_QUEUE_RETRY_BASE_MS, delay + jitter));
  }

  function shouldSkipQueuedTaskForBackoff(task) {
    const lastTriedAt = Number(task && task.lastTriedAt ? task.lastTriedAt : 0);
    const delay = getQueueRetryDelay(task);
    if (!lastTriedAt || !delay) return false;
    const waitLeft = lastTriedAt + delay - Date.now();
    if (waitLeft <= 0) return false;
    state.syncGuard.queueBackoffSkips += 1;
    state.syncGuard.lastQueueBackoffAt = Date.now();
    return true;
  }

  function markQueuedTaskAttempt(task) {
    return Object.assign({}, task || {}, {
      lastTriedAt: Date.now(),
      lastTriedVersion: window.APP_VERSION || '',
      retryCount: Math.max(0, Number(task && task.retryCount) || 0)
    });
  }

  function markQueuedTaskFailure(task, err) {
    const msg = String(err && (err.message || err.statusText || err.code || err.status) ? (err.message || err.statusText || err.code || err.status) : err || 'unknown').slice(0, 160);
    return Object.assign({}, task || {}, {
      retryCount: Math.max(0, Number(task && task.retryCount) || 0) + 1,
      lastErrorAt: Date.now(),
      lastErrorMessage: msg,
      retryJitterMs: Math.floor(Math.random() * 1800),
      lastTriedVersion: window.APP_VERSION || ''
    });
  }

  function isLikelyPermanentQueueError(err) {
    const msg = String(err && (err.message || err.statusText || err.code || err.status) ? (err.message || err.statusText || err.code || err.status) : err || '').toLowerCase();
    const status = Number(err && (err.status || err.statusCode || err.code));
    return [400, 401, 403, 404, 406].includes(status)
      || msg.includes('permission denied')
      || msg.includes('violates row-level security')
      || msg.includes('invalid input')
      || msg.includes('not found');
  }

  function shouldDropInvalidQueuedTask(task, err) {
    const retries = Math.max(0, Number(task && task.retryCount) || 0);
    return isLikelyPermanentQueueError(err) && retries >= SUPABASE_QUEUE_DROP_INVALID_AFTER;
  }

  function withSupabaseTimeout(promise, label, timeoutMs, mode) {
    const ms = Math.max(2500, Number(timeoutMs) || SUPABASE_READ_TIMEOUT_MS);
    let timer = null;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const err = new Error('Supabase požadavek vypršel: ' + String(label || 'unknown'));
        err.code = 'RAK_SUPABASE_TIMEOUT';
        err.mode = mode || 'read';
        reject(err);
      }, ms);
    });
    return Promise.race([Promise.resolve(promise), timeout]).finally(() => {
      if (timer) clearTimeout(timer);
    });
  }

  async function runSupabaseOperation(label, work, options) {
    const opts = options || {};
    const mode = opts.mode === 'write' ? 'write' : 'read';
    const timeoutMs = Number(opts.timeoutMs) || (mode === 'write' ? SUPABASE_WRITE_TIMEOUT_MS : SUPABASE_READ_TIMEOUT_MS);
    const maxAttempts = Math.max(1, Math.min(2, Number(opts.attempts) || (mode === 'write' ? 2 : 1)));
    let lastErr = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const result = await withSupabaseTimeout(Promise.resolve().then(work), label, timeoutMs, mode);
        return result;
      } catch (err) {
        lastErr = err;
        const timeout = isSupabaseTimeoutError(err);
        if (timeout) {
          state.syncGuard.lastTimeoutAt = Date.now();
          if (mode === 'write') state.syncGuard.writeTimeouts += 1;
          else state.syncGuard.readTimeouts += 1;
        }
        const canRetry = attempt < maxAttempts && navigator.onLine && isLikelyTransientError(err);
        if (!canRetry) break;
        state.syncGuard.lastRetryAt = Date.now();
        if (mode === 'write') state.syncGuard.writeRetries += 1;
        else state.syncGuard.readRetries += 1;
        await wait(260 + (attempt * 240));
      }
    }

    if (mode === 'write') state.syncGuard.failedWrites += 1;
    else state.syncGuard.failedReads += 1;
    throw lastErr;
  }

  function rememberQueuedFallback() {
    state.syncGuard.queuedFallbacks += 1;
    state.syncGuard.lastQueuedFallbackAt = Date.now();
  }

  function shouldDeferOnlineWrite() {
    if (!navigator.onLine) return false;
    const queueLength = readQueue().length;
    if (!queueLength) return false;
    const lastQueued = Number(state.syncGuard.lastQueuedFallbackAt || 0);
    if (!lastQueued || Date.now() - lastQueued > SUPABASE_WRITE_COOLDOWN_MS) return false;
    state.syncGuard.cooldownSkips += 1;
    state.syncGuard.lastCooldownSkipAt = Date.now();
    return true;
  }

  function isSupabaseRpcUnavailableError(err) {
    const text = String((err && (err.message || err.details || err.hint || err.code)) || err || '').toLowerCase();
    return /pgrst202|function .*does not exist|could not find.*function|schema cache|rpc.*not found|not found/.test(text);
  }

  function normalizeMachineSettingsPayload(row) {
    const settings = row && typeof row.settings_json === 'object' && row.settings_json !== null
      ? row.settings_json
      : (() => {
          try { return row && row.settings_json ? JSON.parse(String(row.settings_json)) : {}; }
          catch (err) { return {}; }
        })();

    const machineCode = String(row && (row.machine_code || row.machine) ? (row.machine_code || row.machine) : settings.machine || '').trim();
    const machineIndex = String(row && (row.machine_index || row.index) ? (row.machine_index || row.index) : settings.index || '').trim();
    const label = String(row && row.label ? row.label : '').trim() || (machineCode + (machineIndex ? '-' + machineIndex : ''));
    const category = String(row && row.category ? row.category : (String(machineCode).toUpperCase().startsWith('TBKR') ? 'brus' : (String(machineCode).toUpperCase().startsWith('TPKW') ? 'pracka' : 'frezka'))).trim();
    const machine_key = String(row && row.machine_key ? row.machine_key : (machineCode + (machineIndex ? '-' + machineIndex : ''))).trim();

    const cycleTime = row && row.cycle_time !== '' && row.cycle_time !== null && row.cycle_time !== undefined
      ? Number(row.cycle_time)
      : (row && row.speed !== '' && row.speed !== null && row.speed !== undefined ? Number(row.speed) : null);
    const dressTime = row && row.dress_time !== '' && row.dress_time !== null && row.dress_time !== undefined ? Number(row.dress_time) : null;
    const dressCount = row && row.dress_count !== '' && row.dress_count !== null && row.dress_count !== undefined ? parseInt(row.dress_count, 10) : null;

    return {
      machine_key,
      machine_code: machineCode || null,
      machine_index: machineIndex || null,
      label,
      category,
      speed: Number.isFinite(cycleTime) ? cycleTime : null,
      cycle_time: Number.isFinite(cycleTime) ? cycleTime : null,
      dress_time: Number.isFinite(dressTime) ? dressTime : null,
      dress_count: Number.isFinite(dressCount) ? dressCount : null,
      settings_json: Object.assign({}, settings, {
        machine: machineCode,
        index: machineIndex,
        cycle_time: row && row.cycle_time !== '' && row.cycle_time !== null && row.cycle_time !== undefined ? String(row.cycle_time) : (row && row.speed !== '' && row.speed !== null && row.speed !== undefined ? String(row.speed) : ''),
        dress_time: row && row.dress_time !== '' && row.dress_time !== null && row.dress_time !== undefined ? String(row.dress_time) : '',
        dress_count: row && row.dress_count !== '' && row.dress_count !== null && row.dress_count !== undefined ? String(row.dress_count) : ''
      }),
      updated_at: new Date().toISOString()
    };
  }

  function machineSettingsJson(row) {
    if (row && row.settings_json && typeof row.settings_json === 'object') return row.settings_json;
    try {
      return row && row.settings_json ? JSON.parse(String(row.settings_json)) : {};
    } catch (err) {
      return {};
    }
  }

  function isDeletedMachineSettingsRow(row) {
    const settings = machineSettingsJson(row);
    const category = String(row && row.category || '').trim();
    return category === 'admin_settings_deleted'
      || String(settings && settings.stored_category || '').trim() === 'admin_settings_deleted'
      || settings.deleted === true
      || String(settings && settings.type || '').trim() === 'admin_settings_deleted';
  }

  function isSpecialAdminMachineSettingsPayload(payload) {
    const category = String(payload && payload.category || '').trim();
    const key = String(payload && payload.machine_key || '').trim();
    return category === 'food_schedule'
      || key === 'FOOD_SCHEDULE_SETTINGS'
      || category === 'vacation_countdown_settings'
      || key === 'VACATION_COUNTDOWN_SETTINGS'
      || category === 'rotation_overtime_settings'
      || key === 'ROTATION_OVERTIME_SETTINGS'
      || category === 'rotation_generator_settings'
      || key === 'ROTATION_GENERATOR_SETTINGS'
      || category === 'rotation_machine_tasks_settings'
      || key === 'ROTATION_MACHINE_TASKS_SETTINGS'
      || category === 'fhb_correction_calibration_settings'
      || key === 'FHB_CORRECTION_CALIBRATION_SETTINGS'
      || category === 'external_links_settings'
      || key === 'EXTERNAL_LINKS_SETTINGS'
      || category === 'app_contact_settings'
      || key === 'APP_CONTACT_SETTINGS'
      || category === 'payroll_settings'
      || key === 'PAYROLL_SETTINGS'
      || category === 'special_days_settings'
      || key === 'SPECIAL_DAYS_SETTINGS'
      || category === 'admin_accounts_settings'
      || key === 'ADMIN_ACCOUNTS_SETTINGS'
      || category === 'admin_full_settings_backup'
      || key.indexOf('ADMIN_FULL_SETTINGS_BACKUP_') === 0
      || category === 'admin_settings_deleted'
      || category === 'worker_roster_settings'
      || key === 'WORKER_ROSTER_SETTINGS'
      || category === 'calendar_notes_settings'
      || key === 'CALENDAR_NOTES_SETTINGS'
      || category === 'admin_change_log'
      || key === 'ADMIN_CHANGE_LOG'
      || category === 'rotation_save_backup'
      || key.indexOf('ROTATION_SAVE_BACKUP_') === 0;
  }

  function isCredentialOrBackupMachineSettingsPayload(payload) {
    const category = String(payload && payload.category || '').trim();
    const key = String(payload && payload.machine_key || '').trim();
    const settings = payload && payload.settings_json && typeof payload.settings_json === 'object' ? payload.settings_json : {};
    const storedCategory = String(settings.stored_category || settings.type || '').trim();
    const storedKey = String(settings.admin_settings_key || '').trim();
    return category === 'admin_accounts_settings'
      || key === 'ADMIN_ACCOUNTS_SETTINGS'
      || category === 'admin_full_settings_backup'
      || key.indexOf('ADMIN_FULL_SETTINGS_BACKUP_') === 0
      || storedCategory === 'admin_accounts_settings'
      || storedCategory === 'admin_full_settings_backup'
      || storedKey === 'ADMIN_ACCOUNTS_SETTINGS'
      || storedKey.indexOf('ADMIN_FULL_SETTINGS_BACKUP_') === 0
      || category === 'rotation_save_backup'
      || key.indexOf('ROTATION_SAVE_BACKUP_') === 0
      || storedCategory === 'rotation_save_backup'
      || storedKey.indexOf('ROTATION_SAVE_BACKUP_') === 0;
  }

  function makeMachineSettingsRpcPayload(payload) {
    if (!isSpecialAdminMachineSettingsPayload(payload)) return payload;
    const settings = payload && payload.settings_json && typeof payload.settings_json === 'object' ? payload.settings_json : {};
    const storedCategory = String(settings.stored_category || settings.type || payload && payload.category || '');
    const storedKey = String(settings.admin_settings_key || payload && payload.machine_key || '');
    return Object.assign({}, payload, {
      category: 'frezka',
      settings_json: Object.assign({}, settings, {
        stored_category: storedCategory,
        admin_settings_key: storedKey
      })
    });
  }

  function hasSecureAdminContext() {
    const context = state.adminAuth && state.adminAuth.context;
    return !!(context && context.authenticated === true && context.account_id && (context.role === 'owner' || context.role === 'admin'));
  }

  function hasAdminWriteCredential() {
    return hasSecureAdminContext();
  }

  async function trySaveMachineSettingsViaRpc(client, payloads, options) {
    if (!client || typeof client.rpc !== 'function' || !Array.isArray(payloads) || !payloads.length) return null;
    try {
      if (!hasSecureAdminContext()) throw new Error('admin authentication required');
      const operationalPayloads = payloads.filter((payload) => !isCredentialOrBackupMachineSettingsPayload(payload));
      if (!operationalPayloads.length) return { ok: true, rpc: true, secure: true, savedCount: 0 };
      const { data, error } = await client.rpc('rak_admin_save_machine_settings_v2', {
        p_rows: operationalPayloads,
        p_reason: String(options && options.reason || 'app-save')
      });
      if (error) throw error;
      return {
        ok: true,
        rpc: true,
        secure: true,
        savedCount: Number(data && data.saved_count || operationalPayloads.length) || operationalPayloads.length
      };
    } catch (err) {
      if (isSupabaseRpcUnavailableError(err)) {
        SUPABASE_RPC_HARDENING_STATUS.lastUnavailableAt = new Date().toISOString();
        SUPABASE_RPC_HARDENING_STATUS.lastUnavailableMessage = String(err && err.message ? err.message : err);
        return null;
      }
      throw err;
    }
  }

  async function trySaveRotationStateViaRpc(client, row, options) {
    if (!client || typeof client.rpc !== 'function' || !row) return null;
    try {
      if (!hasSecureAdminContext()) throw new Error('admin authentication required');
      // RAK_17063_UNKNOWN_BASELINE_GUARD: a fresh revision fetched during save is NOT
      // evidence that the edited content derives from it. Reject before any RPC/read.
      if (!Number.isSafeInteger(state.rotationRevision) || state.rotationRevision < 0) {
        const missing = new Error('Revize rozpisu není ověřena. Načti aktuální online rozpis před úpravami.');
        missing.code = 'RAK_ROTATION_REVISION_UNVERIFIED';
        throw missing;
      }
      const { data, error } = await client.rpc('rak_admin_save_rotation_v2', {
        p_key: row.key || 'main',
        p_payload: row.payload || null,
        p_meta: row.meta || {},
        p_expected_revision: state.rotationRevision
      });
      if (error) throw error;
      if (data && Number.isFinite(Number(data.revision))) state.rotationRevision = Number(data.revision);
      return data || row;
    } catch (err) {
      if (isSupabaseRpcUnavailableError(err)) {
        SUPABASE_RPC_HARDENING_STATUS.lastUnavailableAt = new Date().toISOString();
        SUPABASE_RPC_HARDENING_STATUS.lastUnavailableMessage = String(err && err.message ? err.message : err);
        return null;
      }
      throw err;
    }
  }

  async function upsertMachineSettingsDirect(client, rows, options) {
    const list = Array.isArray(rows) ? rows : [];
    const payloads = list
      .map((row) => normalizeMachineSettingsPayload(row))
      .filter((payload) => payload && payload.machine_key && payload.label);

    if (!payloads.length) return 0;
    const rpcPayloads = payloads.map(makeMachineSettingsRpcPayload);
    const rpcResult = await trySaveMachineSettingsViaRpc(client, rpcPayloads, options || {});
    if (rpcResult && rpcResult.ok) return Number(rpcResult.savedCount || payloads.length) || payloads.length;
    throw new Error('secure machine settings RPC unavailable');
  }

  async function upsertRotationStateDirect(client, rotation, meta, options) {
    const payload = rotation && typeof rotation === 'object' ? rotation : null;
    const row = {
      key: 'main',
      payload,
      meta: meta && typeof meta === 'object' ? meta : {},
      updated_at: new Date().toISOString()
    };

    const rpcRow = await trySaveRotationStateViaRpc(client, row, options || {});
    if (rpcRow) {
      return {
        key: rpcRow.key || row.key,
        payload: rpcRow.payload || row.payload,
        meta: rpcRow.meta || row.meta,
        updated_at: rpcRow.updated_at || row.updated_at,
        revision: Number.isFinite(Number(rpcRow.revision)) ? Number(rpcRow.revision) : state.rotationRevision
      };
    }

    throw new Error('admin rotation RPC unavailable');
  }

  async function upsertRotationMonthEntriesDirect(client, monthStart, label, rows) {
    // RAK_17063_MONTH_RPC_ONLY_GUARD: authenticated RPC, never direct table DELETE/INSERT.
    if (!hasSecureAdminContext()) throw new Error('Měsíční rozpis lze uložit pouze ověřeným administrátorem přes RPC.');
    const payloadRows = (Array.isArray(rows) ? rows : []).map((row, idx) => ({
      employee_name: String(row && row.employee_name ? row.employee_name : '').trim(),
      target_machine: String(row && row.target_machine ? row.target_machine : '').trim() || null,
      assignment_type: String(row && row.assignment_type ? row.assignment_type : 'work').trim(),
      shift_code: String(row && row.shift_code ? row.shift_code : '').trim() || null,
      note: String(row && row.note ? row.note : '').trim() || null,
      row_order: Number.isFinite(Number(row && row.row_order)) ? Number(row.row_order) : idx
    }));
    const { data, error } = await client.rpc('rak_admin_save_rotation_month_entries_v2', {
      p_month_start: monthStart,
      p_label: String(label || '').trim() || null,
      p_rows: payloadRows
    });
    if (error) throw error;
    return { months: 1, entries: data && data.inserted !== null && Number.isSafeInteger(Number(data.inserted)) ? Number(data.inserted) : payloadRows.length };
  }

  async function upsertGomokuWinDirect(client, entry) {
    const payload = {
      player_name: String(entry && entry.name ? entry.name : '').trim(),
      difficulty: String(entry && entry.difficulty ? entry.difficulty : '').trim(),
      moves: Number(entry && entry.totalMoves ? entry.totalMoves : 0) || 0,
      app_version: String(window.APP_VERSION || '').trim(),
      created_at: String(entry && entry.date ? entry.date : new Date().toISOString()).trim(),
      elapsed_ms: Number(entry && entry.elapsedMs ? entry.elapsedMs : 0) || 0,
      elapsed_text: String(entry && entry.elapsedText ? entry.elapsedText : '').trim(),
      x_moves: Number(entry && entry.xMoves ? entry.xMoves : 0) || 0,
      o_moves: Number(entry && entry.oMoves ? entry.oMoves : 0) || 0,
      ruleset_version: String((entry && (entry.rulesetVersion || entry.ruleset_version)) || window.GOMOKU_RULESET_VERSION || 'gomoku-10col-19row-ai-rules-v3').trim() || 'gomoku-10col-19row-ai-rules-v3'
    };
    const { data: rpcData, error: rpcError } = await client.rpc('rak_submit_gomoku_win_v2', {
      p_player_name: payload.player_name,
      p_difficulty: payload.difficulty,
      p_moves: payload.moves,
      p_app_version: payload.app_version,
      p_created_at: payload.created_at,
      p_elapsed_ms: payload.elapsed_ms,
      p_elapsed_text: payload.elapsed_text,
      p_x_moves: payload.x_moves,
      p_o_moves: payload.o_moves,
      p_ruleset_version: payload.ruleset_version
    });
    if (!rpcError) return rpcData ? [rpcData] : [];
    const { data, error } = await client.from('gomoku_wins').insert([payload]).select('*');
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  }


  function normalizeBugReportType(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (raw.includes('nel')) return 'nelibi';
    if (raw.includes('náp') || raw.includes('nap')) return 'napad';
    if (raw.includes('výkon') || raw.includes('vykon') || raw.includes('sek')) return 'vykon';
    if (raw.includes('hra')) return 'hra';
    if (raw.includes('chy')) return 'chyba';
    return 'ostatni';
  }

  function normalizeBugReportPayload(entry) {
    const source = entry && typeof entry === 'object' ? entry : {};
    const text = String(source.text || source.message || '').trim().slice(0, 4000);
    const route = [String(source.page || '').trim(), String(source.game || '').trim()].filter(Boolean).join(' · ').slice(0, 300);
    const legacyAppearanceId = String(source.theme || source.background || '').trim();
    const deviceInfo = {
      appearanceId: String(source.appearanceId || source.appearance || legacyAppearanceId || '').slice(0, 80),
      appearanceLabel: String(source.appearanceLabel || '').slice(0, 120),
      online: !!source.online,
      createdAtLocal: String(source.createdAtLocal || '').slice(0, 120),
      viewport: typeof window !== 'undefined' ? { width: window.innerWidth || 0, height: window.innerHeight || 0, dpr: window.devicePixelRatio || 1 } : {},
      sourceId: String(source.id || '').slice(0, 120)
    };
    return {
      account_number: String(source.accountId || source.account_number || '').trim().slice(0, 80) || null,
      player_name: String(source.accountName || source.player_name || '').trim().slice(0, 160) || null,
      report_type: normalizeBugReportType(source.type || source.report_type),
      message: text,
      app_version: String(source.version || window.APP_VERSION || '').trim().slice(0, 80) || null,
      route: route || null,
      user_agent: String(source.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : '') || '').slice(0, 1000) || null,
      device_info: deviceInfo,
      status: 'new'
    };
  }

  async function saveBugReportDirect(client, entry) {
    const row = normalizeBugReportPayload(entry);
    if (!client || typeof client.rpc !== 'function') throw new Error('bug report RPC unavailable');
    const { data: rpcData, error: rpcError } = await runSupabaseOperation('bug_reports.rpc_insert_v2', () => client.rpc('rak_submit_bug_report_v2', {
      p_account_number: row.account_number,
      p_player_name: row.player_name,
      p_report_type: row.report_type,
      p_message: row.message,
      p_app_version: row.app_version,
      p_route: row.route,
      p_user_agent: row.user_agent,
      p_device_info: row.device_info
    }), { mode: 'write', attempts: 1 });
    if (rpcError) throw rpcError;
    return Object.assign({ ok: true, row }, rpcData || {});
  }

  function isBugReportUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
  }

  function normalizeBugReportStatus(status) {
    const raw = String(status || '').trim().toLowerCase();
    if (raw === 'seen' || raw.includes('vid')) return 'seen';
    if (raw === 'done' || raw.includes('hot')) return 'done';
    if (raw === 'ignored' || raw.includes('ignor')) return 'ignored';
    return 'new';
  }

  async function loadBugReportsDirect(client, options = {}) {
    if (!hasSecureAdminContext()) throw new Error('admin authentication required');
    const limit = Math.max(1, Math.min(80, Number(options.limit || 40) || 40));
    const status = String(options.status || '').trim();
    const { data, error } = await runSupabaseOperation('bug_reports.rpc_list_v2', () => client.rpc('rak_admin_list_bug_reports_v2', {
      p_status: status && status !== 'all' ? normalizeBugReportStatus(status) : 'all',
      p_limit: limit
    }), { mode: 'read', attempts: 1 });
    if (error) throw error;
    return { ok: true, rows: Array.isArray(data) ? data : [] };
  }

  async function updateBugReportStatusDirect(client, id, status, note = '') {
    const reportId = String(id || '').trim();
    if (!reportId) throw new Error('Chybí ID reportu.');
    if (!isBugReportUuid(reportId)) return { ok: false, reason: 'non-uuid-report-id', localOnly: true };
    if (!hasSecureAdminContext()) throw new Error('admin authentication required');
    const nextStatus = normalizeBugReportStatus(status);
    const { data, error } = await runSupabaseOperation('bug_reports.rpc_update_v2', () => client.rpc('rak_admin_update_bug_report_v2', {
      p_id: reportId,
      p_status: nextStatus,
      p_note: String(note || '').slice(0, 600) || null
    }), { mode: 'write', attempts: 1 });
    if (error) throw error;
    return data || { ok: true };
  }


  const BUG_REPORT_DELETED_NOTE = '__rak_deleted__';

  async function deleteBugReportDirect(client, id) {
    const reportId = String(id || '').trim();
    if (!reportId) throw new Error('Chybí ID reportu.');
    if (!isBugReportUuid(reportId)) return { ok: false, reason: 'non-uuid-report-id', localOnly: true };
    if (!hasSecureAdminContext()) throw new Error('admin authentication required');
    const { data, error } = await runSupabaseOperation('bug_reports.rpc_delete_v2', () => client.rpc('rak_admin_delete_bug_report_v2', {
      p_id: reportId
    }), { mode: 'write', attempts: 1 });
    if (error) throw error;
    return data || { ok: true, id: reportId, softDeleted: true };
  }


  function normalizeInviteCode(code) {
    return String(code || '').replace(/\D/g, '').slice(0, 4);
  }

  const GAME_INVITE_TTL_MS = 60 * 60 * 1000;

  function getGameInviteExpiryIso(nowTs) {
    const base = Number(nowTs || Date.now()) || Date.now();
    return new Date(base + GAME_INVITE_TTL_MS).toISOString();
  }

  function isGameInviteExpired(invite) {
    if (!invite || !invite.expires_at) return false;
    const ts = Date.parse(String(invite.expires_at));
    return Number.isFinite(ts) && ts <= Date.now();
  }

  function isPendingExpiredGameInvite(invite) {
    const status = String(invite && invite.status || '').toLowerCase();
    return (!status || status === 'pending' || status === 'waiting') && isGameInviteExpired(invite);
  }

  function makeExpiredGameInviteError() {
    const err = new Error('Tahle pozvánka už vypršela. Vytvoř novou.');
    err.code = 'INVITE_EXPIRED';
    err.reason = 'expired-invite';
    return err;
  }

  function gameInviteErrorMessage(err, fallback) {
    if (!err) return fallback || 'Pozvánku se nepodařilo načíst.';
    if (err.code === 'INVITE_EXPIRED' || err.reason === 'expired-invite') return 'Tahle pozvánka už vypršela. Vytvoř novou.';
    return String(err.message || fallback || 'Pozvánku se nepodařilo načíst.');
  }

  function gameSessionCacheKey(code) {
    return LOCAL_GAME_SESSIONS_PREFIX + encodeURIComponent(normalizeInviteCode(code));
  }

  function readGameSessionCache(code) {
    const inviteCode = normalizeInviteCode(code);
    if (!inviteCode) return null;
    const cache = readTimedCache(gameSessionCacheKey(inviteCode), SUPABASE_GAME_CACHE_TTL_MS);
    if (!cache || !cache.rows || !cache.rows[0]) return null;
    rememberTimedCacheHit('session', cache);
    return Object.assign({ inviteCode, fresh: cache.fresh, savedAt: cache.savedAt, age: cache.age }, cache.rows[0]);
  }

  function writeGameSessionCache(code, invite, session) {
    const inviteCode = normalizeInviteCode(code || (invite && invite.invite_code));
    if (!inviteCode) return false;
    return writeTimedCache(gameSessionCacheKey(inviteCode), [{
      inviteCode,
      invite: invite || null,
      session: session || null,
      status: session && session.status ? session.status : '',
      updatedAt: Date.now(),
      source: 'game_sessions'
    }], 'session');
  }

  function buildCachedSessionResult(code, fallbackPayload) {
    const inviteCode = normalizeInviteCode(code);
    const cached = readGameSessionCache(inviteCode);
    const payload = fallbackPayload && typeof fallbackPayload === 'object' ? fallbackPayload : null;
    if (!cached && !payload) return { ok: false, reason: 'offline-or-missing-client' };
    const cachedSession = cached && cached.session && typeof cached.session === 'object' ? cached.session : null;
    const cachedInvite = cached && cached.invite ? cached.invite : null;
    if (!payload && cached && !cachedSession) {
      state.cacheGuard.sessionFallbacks += 1;
      return { ok: true, invite: cachedInvite, session: null, cached: true, offline: !navigator.onLine };
    }
    const baseSession = cachedSession || {};
    const boardState = payload || baseSession.board_state || {};
    const session = Object.assign({}, baseSession, {
      game_type: baseSession.game_type || 'gomoku',
      invite_id: baseSession.invite_id || (cachedInvite && cachedInvite.id ? cachedInvite.id : null),
      status: boardState.status || baseSession.status || 'active',
      board_state: boardState,
      move_history: Array.isArray(boardState.moveHistory) ? boardState.moveHistory : (Array.isArray(baseSession.move_history) ? baseSession.move_history : []),
      updated_at: new Date().toISOString(),
      finished_at: boardState.gameOver ? new Date().toISOString() : (baseSession.finished_at || null),
      _local_only: true
    });
    if (payload) writeGameSessionCache(inviteCode, cachedInvite, session);
    state.cacheGuard.sessionFallbacks += 1;
    return {
      ok: true,
      invite: cachedInvite,
      session,
      status: session.status,
      cached: !!cached,
      queued: !!payload,
      offline: !navigator.onLine
    };
  }


  function normalizeSupabaseRpcJsonPayload(data) {
    if (!data) return null;
    let value = Array.isArray(data) ? (data[0] || null) : data;
    if (typeof value === 'string') {
      try { value = JSON.parse(value); } catch (err) { return null; }
    }
    return value && typeof value === 'object' ? value : null;
  }

  async function tryCreateGameInviteSessionViaRpc(client, inviteRow, sessionRow) {
    if (!client || typeof client.rpc !== 'function') return null;
    const smokeGameType = inferGameTypeFromSessionPayload(inviteRow, sessionRow, sessionRow && sessionRow.board_state);
    try {
      rememberGameSessionRpcSmoke('attempt', 'create_invite_session', '', smokeGameType);
      const { data, error } = await runSupabaseOperation('game_invites_sessions.rpc_create', () => client.rpc('rak_create_game_invite_session', {
        p_invite_row: inviteRow,
        p_session_row: sessionRow
      }), { mode: 'write', attempts: 1 });
      if (error) throw error;
      const result = normalizeSupabaseRpcJsonPayload(data);
      if (!result || result.ok === false) return null;
      rememberGameSessionRpcSmoke('success', 'create_invite_session', '', smokeGameType);
      return {
        invite: result.invite || null,
        session: result.session || null,
        rpc: true
      };
    } catch (err) {
      if (isSupabaseRpcUnavailableError(err)) {
        SUPABASE_RPC_HARDENING_STATUS.lastUnavailableAt = new Date().toISOString();
        SUPABASE_RPC_HARDENING_STATUS.lastUnavailableMessage = String(err && err.message ? err.message : err);
        rememberGameSessionRpcSmoke('fallback', 'create_invite_session', 'rpc-unavailable', smokeGameType);
        return null;
      }
      rememberGameSessionRpcSmoke('fallback', 'create_invite_session', err && err.message ? err.message : err, smokeGameType);
      console.warn('rak_create_game_invite_session failed; direct game_invites/game_sessions fallback may be blocked after v826', err);
      return null;
    }
  }

  async function tryAcceptGameInviteViaRpc(client, inviteCode, inviteeAccountNumber, boardState) {
    if (!client || typeof client.rpc !== 'function') return null;
    const code = normalizeInviteCode(inviteCode);
    const invitee = String(inviteeAccountNumber || '').trim();
    const smokeGameType = inferGameTypeFromSessionPayload(null, null, boardState);
    if (!code || !invitee) return null;
    try {
      rememberGameSessionRpcSmoke('attempt', 'accept_invite', '', smokeGameType);
      const { data, error } = await runSupabaseOperation('game_invites_sessions.rpc_accept', () => client.rpc('rak_accept_game_invite', {
        p_invite_code: code,
        p_invitee_account_number: invitee,
        p_board_state: boardState && typeof boardState === 'object' ? boardState : null
      }), { mode: 'write', attempts: 1 });
      if (error) throw error;
      const result = normalizeSupabaseRpcJsonPayload(data);
      if (!result || result.ok === false) return null;
      rememberGameSessionRpcSmoke('success', 'accept_invite', '', smokeGameType);
      return {
        invite: result.invite || null,
        session: result.session || null,
        localRole: result.local_role || result.localRole || null,
        rpc: true
      };
    } catch (err) {
      if (isSupabaseRpcUnavailableError(err)) {
        SUPABASE_RPC_HARDENING_STATUS.lastUnavailableAt = new Date().toISOString();
        SUPABASE_RPC_HARDENING_STATUS.lastUnavailableMessage = String(err && err.message ? err.message : err);
        rememberGameSessionRpcSmoke('fallback', 'accept_invite', 'rpc-unavailable', smokeGameType);
        return null;
      }
      rememberGameSessionRpcSmoke('fallback', 'accept_invite', err && err.message ? err.message : err, smokeGameType);
      console.warn('rak_accept_game_invite failed; direct game_invites/game_sessions fallback may be blocked after hardening', err);
      return null;
    }
  }

  async function trySaveGameSessionByInviteCodeViaRpc(client, inviteCode, sessionRow, startsNewRound) {
    if (!client || typeof client.rpc !== 'function') return null;
    const code = normalizeInviteCode(inviteCode);
    const smokeGameType = inferGameTypeFromSessionPayload(null, sessionRow, sessionRow && sessionRow.board_state);
    if (!code) return null;
    try {
      rememberGameSessionRpcSmoke('attempt', 'save_session', '', smokeGameType);
      const { data, error } = await runSupabaseOperation('game_sessions.rpc_save_by_invite', () => client.rpc('rak_save_game_session_by_invite_code', {
        p_invite_code: code,
        p_session_row: sessionRow,
        p_start_new_round: !!startsNewRound
      }), { mode: 'write', attempts: 1 });
      if (error) throw error;
      const result = normalizeSupabaseRpcJsonPayload(data);
      if (!result || result.ok === false) return null;
      rememberGameSessionRpcSmoke('success', 'save_session', '', smokeGameType);
      return {
        invite: result.invite || null,
        session: result.session || null,
        rpc: true
      };
    } catch (err) {
      if (isSupabaseRpcUnavailableError(err)) {
        SUPABASE_RPC_HARDENING_STATUS.lastUnavailableAt = new Date().toISOString();
        SUPABASE_RPC_HARDENING_STATUS.lastUnavailableMessage = String(err && err.message ? err.message : err);
        rememberGameSessionRpcSmoke('fallback', 'save_session', 'rpc-unavailable', smokeGameType);
        return null;
      }
      rememberGameSessionRpcSmoke('fallback', 'save_session', err && err.message ? err.message : err, smokeGameType);
      console.warn('rak_save_game_session_by_invite_code failed; direct game_sessions fallback may be blocked after v826', err);
      return null;
    }
  }


  async function loadGameInviteByCode(client, code) {
    const inviteCode = String(code || '').trim().toUpperCase();
    if (!inviteCode) return { ok: false, error: new Error('Chybí kód pozvánky.') };
    const { data, error } = await runSupabaseOperation('game_invites.lookup', () => client
      .from('game_invites')
      .select('*')
      .eq('invite_code', inviteCode)
      .limit(1), { mode: 'read' });
    if (error) throw error;
    const row = Array.isArray(data) && data.length ? data[0] : null;
    if (row && isPendingExpiredGameInvite(row)) return { ok: false, invite: row, expired: true, reason: 'expired-invite', error: makeExpiredGameInviteError() };
    return { ok: true, invite: row || null };
  }

  async function createGameInviteDirect(client, payload) {
    const inviteCode = String(payload && payload.code ? payload.code : '').trim().toUpperCase();
    if (!inviteCode) throw new Error('Chybí kód pozvánky.');
    const inviterAccountNumber = String(payload && payload.inviterAccountNumber ? payload.inviterAccountNumber : '').trim() || null;
    const gameType = String(payload && payload.gameType ? payload.gameType : (payload && payload.game_type ? payload.game_type : 'gomoku')).trim() || 'gomoku';
    const boardState = payload && payload.boardState && typeof payload.boardState === 'object' ? Object.assign({ gameType }, payload.boardState) : { board: Array(180).fill(''), turn: 'X', status: 'waiting', gameType };
    const expiresAt = payload && payload.expiresAt ? String(payload.expiresAt) : getGameInviteExpiryIso();
    boardState.inviteExpiresAt = expiresAt;
    const inviteRow = {
      game_type: gameType,
      inviter_account_number: inviterAccountNumber,
      invitee_account_number: null,
      invite_code: inviteCode,
      status: 'pending',
      expires_at: expiresAt,
      payload: Object.assign({}, payload && payload.payload && typeof payload.payload === 'object' ? payload.payload : {}, { expiresAt })
    };
    const rpcCreated = await tryCreateGameInviteSessionViaRpc(client, inviteRow, {
      game_type: gameType,
      invite_id: null,
      player_x_account_number: inviterAccountNumber,
      player_o_account_number: null,
      winner_account_number: null,
      status: 'waiting',
      board_state: boardState,
      move_history: [],
      updated_at: new Date().toISOString()
    });
    if (rpcCreated && (rpcCreated.invite || rpcCreated.session)) {
      writeGameSessionCache(inviteCode, rpcCreated.invite || null, rpcCreated.session || null);
      return { invite: rpcCreated.invite || null, session: rpcCreated.session || null, rpc: true };
    }

    const { data: inviteData, error: inviteErr } = await runSupabaseOperation('game_invites.create', () => client
      .from('game_invites')
      .insert([inviteRow])
      .select('*')
      .maybeSingle(), { mode: 'write' });
    if (inviteErr) throw inviteErr;
    const sessionRow = {
      game_type: gameType,
      invite_id: inviteData && inviteData.id ? inviteData.id : null,
      player_x_account_number: inviterAccountNumber,
      player_o_account_number: null,
      winner_account_number: null,
      status: 'waiting',
      board_state: boardState,
      move_history: [],
      updated_at: new Date().toISOString()
    };
    const { data: sessionData, error: sessionErr } = await runSupabaseOperation('game_sessions.create', () => client
      .from('game_sessions')
      .insert([sessionRow])
      .select('*')
      .maybeSingle(), { mode: 'write' });
    if (sessionErr) throw sessionErr;
    writeGameSessionCache(inviteCode, inviteData || null, sessionData || null);
    return { invite: inviteData || null, session: sessionData || null };
  }

  async function acceptGameInviteDirect(client, code, inviteeAccountNumber) {
    const inviteCode = String(code || '').trim().toUpperCase();
    const invitee = String(inviteeAccountNumber || '').trim() || null;
    const loaded = await loadGameInviteByCode(client, inviteCode);
    if (loaded && loaded.expired) throw (loaded.error || makeExpiredGameInviteError());
    if (!loaded.invite) throw new Error('Pozvánka nenalezena.');
    const invite = loaded.invite;
    if (isPendingExpiredGameInvite(invite)) throw makeExpiredGameInviteError();
    const { data: sessionRows, error: sessionLookupErr } = await runSupabaseOperation('game_sessions.lookup_for_accept', () => client
      .from('game_sessions')
      .select('*')
      .eq('invite_id', invite.id)
      .order('updated_at', { ascending: false })
      .limit(1), { mode: 'read' });
    if (sessionLookupErr) throw sessionLookupErr;
    const sessionData = Array.isArray(sessionRows) && sessionRows.length ? sessionRows[0] : null;
    const nextInvite = {
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      invitee_account_number: invitee
    };
    const boardState = sessionData && sessionData.board_state && typeof sessionData.board_state === 'object' ? sessionData.board_state : { board: Array(180).fill(''), turn: 'X', status: 'active' };
    const inviteGameType = String(invite.game_type || boardState.gameType || 'gomoku').trim() || 'gomoku';
    boardState.gameType = inviteGameType;
    boardState.status = inviteGameType === 'battleship' ? 'placing' : 'active';
    boardState.playerXAccountNumber = invite.inviter_account_number || boardState.playerXAccountNumber || null;
    boardState.playerOAccountNumber = invitee || boardState.playerOAccountNumber || null;
    boardState.revision = Math.max(Number(boardState.revision || 0) || 0, 1);
    boardState.updatedAtTs = Date.now();
    boardState.acceptedAt = new Date().toISOString();
    const rpcAccepted = await tryAcceptGameInviteViaRpc(client, inviteCode, invitee, boardState);
    if (rpcAccepted && (rpcAccepted.invite || rpcAccepted.session)) {
      const savedInvite = rpcAccepted.invite || invite;
      const savedSession = rpcAccepted.session || sessionData || null;
      writeGameSessionCache(inviteCode, savedInvite, savedSession);
      return { invite: savedInvite, session: savedSession, rpc: true, localRole: rpcAccepted.localRole || null };
    }

    const { data: updatedInvite, error: inviteUpdErr } = await runSupabaseOperation('game_invites.accept', () => client
      .from('game_invites')
      .update(nextInvite)
      .eq('id', invite.id)
      .select('*')
      .maybeSingle(), { mode: 'write' });
    if (inviteUpdErr) throw inviteUpdErr;

    const sessionRow = {
      game_type: inviteGameType,
      invite_id: invite.id,
      player_x_account_number: invite.inviter_account_number || null,
      player_o_account_number: invitee,
      winner_account_number: null,
      status: inviteGameType === 'battleship' ? 'placing' : 'active',
      board_state: boardState,
      move_history: Array.isArray(sessionData && sessionData.move_history) ? sessionData.move_history : [],
      updated_at: new Date().toISOString()
    };
    let updatedSession = null;
    if (sessionData && sessionData.id) {
      const { data, error } = await runSupabaseOperation('game_sessions.accept_update', () => client
        .from('game_sessions')
        .update(sessionRow)
        .eq('id', sessionData.id)
        .select('*')
        .maybeSingle(), { mode: 'write' });
      if (error) throw error;
      updatedSession = data || Object.assign({}, sessionData, sessionRow);
    } else {
      const { data, error } = await runSupabaseOperation('game_sessions.accept_insert', () => client
        .from('game_sessions')
        .insert([sessionRow])
        .select('*')
        .maybeSingle(), { mode: 'write' });
      if (error) throw error;
      updatedSession = data || sessionRow;
    }
    writeGameSessionCache(inviteCode, updatedInvite || invite, updatedSession || null);
    return { invite: updatedInvite || invite, session: updatedSession || null };
  }

  async function loadGameSessionByInviteCodeDirect(client, code) {
    const loaded = await loadGameInviteByCode(client, code);
    if (loaded && loaded.expired) return { ok: false, invite: loaded.invite || null, session: null, expired: true, reason: 'expired-invite', message: gameInviteErrorMessage(loaded.error) };
    if (!loaded.invite) return { ok: false, invite: null, session: null };
    const { data: sessionRows, error: sessionErr } = await runSupabaseOperation('game_sessions.lookup_by_invite', () => client
      .from('game_sessions')
      .select('*')
      .eq('invite_id', loaded.invite.id)
      .order('updated_at', { ascending: false })
      .limit(1), { mode: 'read' });
    if (sessionErr) throw sessionErr;
    const sessionData = Array.isArray(sessionRows) && sessionRows.length ? sessionRows[0] : null;
    writeGameSessionCache(code, loaded.invite, sessionData || null);
    return { ok: true, invite: loaded.invite, session: sessionData || null };
  }

  async function saveGameSessionByInviteCodeDirect(client, code, payload) {
    const loaded = await loadGameInviteByCode(client, code);
    if (loaded && loaded.expired) throw (loaded.error || makeExpiredGameInviteError());
    if (!loaded.invite) throw new Error('Pozvánka nenalezena.');
    const { data: sessionRows, error: sessionErr } = await runSupabaseOperation('game_sessions.lookup_by_invite', () => client
      .from('game_sessions')
      .select('*')
      .eq('invite_id', loaded.invite.id)
      .order('updated_at', { ascending: false })
      .limit(1), { mode: 'read' });
    if (sessionErr) throw sessionErr;
    const sessionData = Array.isArray(sessionRows) && sessionRows.length ? sessionRows[0] : null;
    const boardState = payload && typeof payload === 'object' ? Object.assign({}, payload) : {};
    const currentStatus = String(sessionData && sessionData.status || '').toLowerCase();
    const startsNewRound = !!boardState.forceNewSession || (!boardState.gameOver && currentStatus === 'finished');
    delete boardState.forceNewSession;
    const xAcc = (sessionData && sessionData.player_x_account_number) || loaded.invite.inviter_account_number || boardState.playerXAccountNumber || null;
    const oAcc = (sessionData && sessionData.player_o_account_number) || loaded.invite.invitee_account_number || boardState.playerOAccountNumber || null;
    const winnerAccount = boardState.winnerAccountNumber
      || (boardState.winner === 'X' ? xAcc : (boardState.winner === 'O' ? oAcc : null));
    const sessionRow = {
      game_type: loaded.invite.game_type || boardState.gameType || 'gomoku',
      invite_id: loaded.invite.id,
      player_x_account_number: xAcc,
      player_o_account_number: oAcc,
      winner_account_number: winnerAccount || null,
      status: boardState.status || (boardState.gameOver ? 'finished' : 'active'),
      board_state: boardState,
      move_history: Array.isArray(boardState.moveHistory) ? boardState.moveHistory : (startsNewRound ? [] : (Array.isArray(sessionData && sessionData.move_history) ? sessionData.move_history : [])),
      updated_at: new Date().toISOString(),
      finished_at: boardState.gameOver ? new Date().toISOString() : null
    };
    const rpcSaved = await trySaveGameSessionByInviteCodeViaRpc(client, code, sessionRow, startsNewRound);
    if (rpcSaved && (rpcSaved.invite || rpcSaved.session)) {
      const savedInvite = rpcSaved.invite || loaded.invite;
      const savedSession = rpcSaved.session || sessionRow;
      writeGameSessionCache(code, savedInvite, savedSession);
      return { ok: true, invite: savedInvite, session: savedSession || null, status: (savedSession && savedSession.status) || sessionRow.status, newRound: startsNewRound, rpc: true };
    }

    let updatedSession = null;
    if (sessionData && sessionData.id && !startsNewRound) {
      const { data, error } = await runSupabaseOperation('game_sessions.save_by_invite_update', () => client
        .from('game_sessions')
        .update(sessionRow)
        .eq('id', sessionData.id)
        .select('*')
        .maybeSingle(), { mode: 'write' });
      if (error) throw error;
      updatedSession = data || Object.assign({}, sessionData, sessionRow);
    } else {
      const { data, error } = await runSupabaseOperation('game_sessions.save_by_invite_insert_round', () => client
        .from('game_sessions')
        .insert([sessionRow])
        .select('*')
        .maybeSingle(), { mode: 'write' });
      if (error) throw error;
      updatedSession = data || sessionRow;
    }
    writeGameSessionCache(code, loaded.invite, updatedSession || sessionRow);
    return { ok: true, invite: loaded.invite, session: updatedSession || null, status: sessionRow.status, newRound: startsNewRound };
  }



  function parseQueueTime(value) {
    if (!value) return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const parsed = Date.parse(String(value || ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function getQueueHealth(queue) {
    const list = Array.isArray(queue) ? queue : [];
    const now = Date.now();
    const byType = {};
    let oldestQueuedAt = 0;
    let newestQueuedAt = 0;
    let maxRetryCount = 0;
    let staleTaskCount = 0;
    let warningTaskCount = 0;
    let criticalTaskCount = 0;
    list.forEach((task) => {
      const type = String(task && task.type ? task.type : 'unknown').trim() || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
      const queuedAt = parseQueueTime(task && task.queuedAt);
      if (queuedAt) {
        if (!oldestQueuedAt || queuedAt < oldestQueuedAt) oldestQueuedAt = queuedAt;
        if (!newestQueuedAt || queuedAt > newestQueuedAt) newestQueuedAt = queuedAt;
        const age = now - queuedAt;
        if (age > SUPABASE_QUEUE_HEALTH_WARN_AFTER_MS) warningTaskCount += 1;
        if (age > SUPABASE_QUEUE_HEALTH_CRITICAL_AFTER_MS) criticalTaskCount += 1;
      } else {
        staleTaskCount += 1;
      }
      const retries = Math.max(0, Number(task && task.retryCount) || 0);
      if (retries > maxRetryCount) maxRetryCount = retries;
      if (retries >= SUPABASE_QUEUE_DROP_INVALID_AFTER) staleTaskCount += 1;
    });
    const oldestAgeMs = oldestQueuedAt ? Math.max(0, now - oldestQueuedAt) : 0;
    return {
      checkedAt: now,
      length: list.length,
      byType,
      oldestQueuedAt: oldestQueuedAt || null,
      newestQueuedAt: newestQueuedAt || null,
      oldestAgeMs,
      maxRetryCount,
      staleTaskCount,
      warningTaskCount,
      criticalTaskCount,
      warnAfterMs: SUPABASE_QUEUE_HEALTH_WARN_AFTER_MS,
      criticalAfterMs: SUPABASE_QUEUE_HEALTH_CRITICAL_AFTER_MS
    };
  }

  function rememberQueueHealth(queue) {
    const health = getQueueHealth(queue);
    state.syncGuard.queueHealthChecks += 1;
    state.syncGuard.lastQueueHealthAt = health.checkedAt;
    state.syncGuard.queueStaleTaskCount = health.staleTaskCount;
    state.syncGuard.queueMaxRetryCount = health.maxRetryCount;
    state.syncGuard.queueOldestAgeMs = health.oldestAgeMs;
    if (health.warningTaskCount > 0) {
      state.syncGuard.queueHealthWarnings += 1;
      state.syncGuard.lastQueueHealthWarningAt = health.checkedAt;
    }
    if (health.criticalTaskCount > 0) {
      state.syncGuard.queueHealthCriticals += 1;
      state.syncGuard.lastQueueHealthCriticalAt = health.checkedAt;
    }
    return health;
  }

  function getNextQueueRetryAt(queue) {
    const times = (Array.isArray(queue) ? queue : [])
      .map((task) => {
        const lastTriedAt = Number(task && task.lastTriedAt ? task.lastTriedAt : 0);
        const delay = getQueueRetryDelay(task);
        return lastTriedAt && delay ? lastTriedAt + delay : 0;
      })
      .filter(Boolean);
    if (!times.length) return null;
    return Math.min.apply(Math, times);
  }

  function scheduleSupabaseQueueFlush(reason, delayMs) {
    if (flushScheduleTimer || flushPromise || !navigator.onLine) return false;
    const ms = Math.max(350, Math.min(60000, Number(delayMs) || SUPABASE_QUEUE_FLUSH_IDLE_DELAY_MS));
    state.syncGuard.queueFlushScheduled += 1;
    state.syncGuard.lastQueueScheduleAt = Date.now();
    flushScheduleTimer = setTimeout(() => {
      flushScheduleTimer = null;
      if (navigator.onLine) void flushPendingWrites();
    }, ms);
    return true;
  }

  function shouldDeferQueueFlushForHiddenPage() {
    return !!(typeof document !== 'undefined'
      && document.visibilityState === 'hidden'
      && typeof navigator !== 'undefined'
      && navigator.onLine);
  }

  function requestSupabaseQueueWake(reason, delayMs) {
    const now = Date.now();
    if (now - lastQueueWakeRequestAt < SUPABASE_QUEUE_WAKE_GUARD_MS) {
      state.syncGuard.queueWakeSkips += 1;
      state.syncGuard.lastQueueWakeSkipAt = now;
      return false;
    }
    lastQueueWakeRequestAt = now;
    state.syncGuard.queueWakeRequests += 1;
    state.syncGuard.lastQueueWakeAt = now;

    if (!navigator.onLine) {
      state.syncGuard.queueWakeOfflineSkips += 1;
      return false;
    }

    const hadRealtimeChannel = !!state.realtimeChannel;
    bindRealtimeSubscriptions();
    if (!hadRealtimeChannel && state.realtimeChannel) {
      state.syncGuard.realtimeWakeBinds += 1;
      state.syncGuard.lastRealtimeWakeBindAt = now;
    }

    const queue = readQueue();
    rememberQueueHealth(queue);
    if (!queue.length) {
      state.syncGuard.queueWakeNoops += 1;
      return false;
    }

    if (shouldDeferQueueFlushForHiddenPage()) {
      state.syncGuard.queueHiddenDefers += 1;
      state.syncGuard.lastQueueHiddenDeferAt = now;
      return scheduleSupabaseQueueFlush('wake-hidden-' + String(reason || 'resume'), SUPABASE_QUEUE_HIDDEN_RETRY_DELAY_MS);
    }

    const nextRetryAt = getNextQueueRetryAt(queue);
    const retryDelay = nextRetryAt && nextRetryAt > now ? nextRetryAt - now : 0;
    const wakeDelay = retryDelay || delayMs || 450;
    return scheduleSupabaseQueueFlush('wake-' + String(reason || 'resume'), wakeDelay);
  }

  async function flushPendingWrites() {
    if (flushPromise) return flushPromise;
    // RAK_17058_QUEUE_RETRY_GUARD: schedule after clearing the active promise.
    let queueRetryDelay = null;
    flushPromise = (async () => {
      const client = getClient();
      if (!client || !navigator.onLine) return { ok: false, reason: 'offline-or-missing-client', remaining: readQueue().length };

      const queue = readQueue();
      if (state.queueGuard.storageError) return { ok: false, reason: 'queue-storage-failed', remaining: queue.length };
      const initialHealth = rememberQueueHealth(queue);
      if (!queue.length) return { ok: true, flushed: 0, remaining: 0, health: initialHealth };

      if (shouldDeferQueueFlushForHiddenPage()) {
        state.syncGuard.queueHiddenDefers += 1;
        state.syncGuard.lastQueueHiddenDeferAt = Date.now();
        scheduleSupabaseQueueFlush('hidden-page', SUPABASE_QUEUE_HIDDEN_RETRY_DELAY_MS);
        return { ok: true, deferred: true, reason: 'document-hidden', remaining: queue.length };
      }

      state.syncGuard.queueFlushRuns += 1;
      state.syncGuard.lastQueueFlushAt = Date.now();

      let flushed = 0;
      let dropped = 0;
      let attempted = 0;
      let batchStopped = false;
      const remaining = [];
      for (let i = 0; i < queue.length; i += 1) {
        if (attempted >= SUPABASE_QUEUE_FLUSH_BATCH_SIZE) {
          batchStopped = true;
          state.syncGuard.queueFlushBatchStops += 1;
          remaining.push(...queue.slice(i));
          break;
        }
        const originalTask = queue[i];
        const automaticLocalSeed = !!(originalTask && originalTask.type === 'rotation_state'
          && String(originalTask.meta && originalTask.meta.source || '') === 'local-seed');
        const semanticUiTask = !!(originalTask && originalTask.type === 'game_ui_settings');
        const recheckableAutomaticTask = automaticLocalSeed || semanticUiTask;
        // RAK_17073_RECHECK_AUTOMATIC_CONFLICT: older releases may already have marked
        // these automatic tasks, so they must pass their read-only semantic server checks.
        if (originalTask && originalTask.conflict && !recheckableAutomaticTask) { remaining.push(originalTask); continue; }
        if (shouldSkipQueuedTaskForBackoff(originalTask) && !recheckableAutomaticTask) {
          remaining.push(originalTask);
          continue;
        }
        const task = markQueuedTaskAttempt(originalTask);
        attempted += 1;
        try {
          if (task.type === 'rotation_state' || task.type === 'machine_settings' || task.type === 'rotation_month_entries') {
            // Old clients could create a rotation_state task merely by opening a local
            // snapshot offline. When an online rotation already exists, that automatic
            // seed is not a user edit and must not become a false conflict.
            if (automaticLocalSeed) {
              const remoteSeed = await runSupabaseOperation('queue.rotation_state.local_seed_check', () => client.from('rotation_state').select('key,revision').eq('key', 'main').maybeSingle(), { mode: 'read', attempts: 1 });
              if (remoteSeed.error) throw remoteSeed.error;
              if (remoteSeed.data && remoteSeed.data.key === 'main') {
                flushed += 1;
                continue;
              }
            }
            // Legacy admin writes cannot be replayed without a fresh signed Auth session
            // and revision validation. Preserve real edits for explicit admin reconciliation.
            remaining.push(Object.assign({}, task, { conflict: 'admin-review-required' }));
            state.syncGuard.queueConflictHolds = Number(state.syncGuard.queueConflictHolds || 0) + 1;
          } else if (task.type === 'gomoku_win') {
            await runSupabaseOperation('queue.gomoku_win', () => upsertGomokuWinDirect(client, task.entry), { mode: 'write' });
            flushed += 1;
          } else if (task.type === 'game_stat') {
            await saveGameStatDirect(client, task.entry);
            flushed += 1;
          } else if (task.type === 'game_ui_settings') {
            const entry = task.entry || {};
            const account = String(entry.account_number || entry.accountNumber || '').trim();
            const queuedAt = Date.parse(String(task.queuedAt || ''));
            if (!account || !Number.isFinite(queuedAt)) {
              remaining.push(Object.assign({}, task, { conflict: 'unverified-local-version' }));
              state.syncGuard.queueConflictHolds = Number(state.syncGuard.queueConflictHolds || 0) + 1;
              continue;
            }
            const queuedUi = normalizeGameUiSettings(entry);
            const remoteUi = await loadGameAccountUiSettingsDirect(client, account);
            const sameAppearance = !!(remoteUi && queuedUi.appearance_id === remoteUi.appearance_id);
            if (sameAppearance) {
              writeTimedCache(gameUiSettingsCacheKey(account), [remoteUi], 'ui');
              flushed += 1;
              continue;
            }

            const localAt = Date.parse(String(queuedUi.updated_at || '')) || queuedAt;
            const remoteAt = Date.parse(String(remoteUi && remoteUi.updated_at || '')) || 0;
            const remoteRevision = Math.max(0, Number(remoteUi && remoteUi.revision || 0) || 0);
            if (remoteUi && remoteRevision > queuedUi.expected_revision) {
              if (localAt <= remoteAt) {
                writeTimedCache(gameUiSettingsCacheKey(account), [remoteUi], 'ui');
                state.syncGuard.uiSettingsRemoteWins = Number(state.syncGuard.uiSettingsRemoteWins || 0) + 1;
                flushed += 1;
                continue;
              }
              queuedUi.expected_revision = remoteRevision;
            }

            let savedUi = await saveGameAccountUiSettingsDirect(client, queuedUi);
            if (savedUi && savedUi.conflict === true) {
              const conflictAt = Date.parse(String(savedUi.updated_at || '')) || 0;
              const conflictRevision = Math.max(0, Number(savedUi.revision || 0) || 0);
              if (localAt > conflictAt && conflictRevision > queuedUi.expected_revision) {
                queuedUi.expected_revision = conflictRevision;
                savedUi = await saveGameAccountUiSettingsDirect(client, queuedUi);
              }
              if (savedUi && savedUi.conflict === true) {
                writeTimedCache(gameUiSettingsCacheKey(account), [savedUi], 'ui');
                state.syncGuard.uiSettingsRemoteWins = Number(state.syncGuard.uiSettingsRemoteWins || 0) + 1;
              }
            }
            flushed += 1;
          } else if (task.type === 'game_session') {
            const code = task.inviteCode || task.code;
            const queuedAt = Date.parse(String(task.queuedAt || ''));
            if (!code || !Number.isFinite(queuedAt)) {
              remaining.push(Object.assign({}, task, { conflict: 'unverified-local-version' }));
              state.syncGuard.queueConflictHolds = Number(state.syncGuard.queueConflictHolds || 0) + 1;
              continue;
            }
            const current = await loadGameSessionByInviteCodeDirect(client, code);
            if (!current || current.ok !== true) throw new Error('Před odesláním hry se nepodařilo ověřit online stav.');
            const remoteAt = Date.parse(String(current.session && current.session.updated_at || ''));
            if (Number.isFinite(remoteAt) && remoteAt > queuedAt) {
              remaining.push(Object.assign({}, task, { conflict: 'newer-online-state' }));
              state.syncGuard.queueConflictHolds = Number(state.syncGuard.queueConflictHolds || 0) + 1;
              continue;
            }
            await saveGameSessionByInviteCodeDirect(client, code, task.payload);
            flushed += 1;
          } else if (task.type === 'bug_report') {
            await saveBugReportDirect(client, task.entry);
            flushed += 1;
          } else {
            const failedUnknown = markQueuedTaskFailure(task, new Error('Neznámý typ úlohy ve frontě: ' + String(task.type || '')));
            remaining.push(Object.assign({}, failedUnknown, { conflict: 'unknown-task' }));
            state.syncGuard.queueConflictHolds = Number(state.syncGuard.queueConflictHolds || 0) + 1;
          }
        } catch (err) {
          const failedTask = markQueuedTaskFailure(task, err);
          state.syncGuard.queueFlushErrors += 1;
          state.syncGuard.lastQueueErrorAt = Date.now();
          if (isLikelyPermanentQueueError(err)) {
            remaining.push(Object.assign({}, failedTask, { conflict: 'write-rejected' }), ...queue.slice(i + 1));
            state.syncGuard.queueConflictHolds = Number(state.syncGuard.queueConflictHolds || 0) + 1;
            break;
          }
          if (isLikelyOfflineError(err)) {
            remaining.push(failedTask, ...queue.slice(i + 1));
            break;
          }
          console.warn('Supabase queued sync failed', err);
          remaining.push(failedTask, ...queue.slice(i + 1));
          break;
        }
      }
      // Preserve tasks queued while a network call was in progress.
      const initialIds = new Set(queue.map(task => String(task && task.id || '')).filter(Boolean));
      // RAK_17060_SAME_ID_RACE_GUARD: a later edit with the same task id wins locally.
      const currentQueue = readQueue();
      if (state.queueGuard.storageError) return {ok:false,reason:'queue-storage-failed',remaining:currentQueue.length};
      const initialById = new Map(queue.map(task => [String(task && task.id || ''), JSON.stringify(task)]));
      const modifiedDuringFlush = currentQueue.filter(task => {
        const id = String(task && task.id || '');
        return initialIds.has(id) && JSON.stringify(task) !== initialById.get(id);
      });
      const modifiedIds = new Set(modifiedDuringFlush.map(task => String(task && task.id || '')));
      const addedDuringFlush = currentQueue.filter(task => !initialIds.has(String(task && task.id || '')));
      const finalQueue = remaining.filter(task => !modifiedIds.has(String(task && task.id || '')))
        .concat(modifiedDuringFlush, addedDuringFlush);
      if (!writeQueue(finalQueue)) return {ok:false,reason:'queue-storage-failed',remaining:currentQueue.length};
      const finalHealth = rememberQueueHealth(finalQueue);
      const retryable = finalQueue.filter(task => !(task && task.conflict));
      const held = finalQueue.length - retryable.length;
      const nextRetryAt = getNextQueueRetryAt(retryable);
      state.syncGuard.queueNextRetryAt = nextRetryAt;
      if (!attempted && finalQueue.length) state.syncGuard.queueFlushEmptyRuns += 1;
      if (flushed > 0) { state.syncGuard.queueFlushSuccesses += 1; state.syncGuard.lastQueueSuccessAt = Date.now(); }
      if (finalQueue.length === 0) state.lastError = null;
      else if (navigator.onLine && retryable.length) {
        queueRetryDelay = nextRetryAt ? Math.max(SUPABASE_QUEUE_FLUSH_IDLE_DELAY_MS, nextRetryAt - Date.now()) : SUPABASE_QUEUE_FLUSH_IDLE_DELAY_MS;
      }
      const result = {ok:finalQueue.length===0,flushed,dropped,remaining:finalQueue.length,
        held,nextRetryAt,batchStopped,health:finalHealth,
        reason:held?'manual-review-required':(finalQueue.length?'retry-pending':'synced')};
      if(typeof window.__rakRefreshSyncBadgeTruth==='function')window.__rakRefreshSyncBadgeTruth();
      return result;
    })().finally(() => {
      flushPromise = null;
      if(queueRetryDelay!==null && navigator.onLine) scheduleSupabaseQueueFlush('remaining-queue',queueRetryDelay);
    });
    return flushPromise;
  }

  async function enqueueAndMaybeFlush(task) {
    rememberQueuedFallback();
    const queuedTask = enqueueTask(task);
    if (!queuedTask) {
      return { ok: false, queued: false, reason: 'queue-guard-rejected', remaining: readQueue().length };
    }
    if (navigator.onLine) {
      scheduleSupabaseQueueFlush('enqueue');
    }
    return { ok: true, queued: true, remaining: readQueue().length };
  }

  async function seedFromLocalSnapshot(rotation, machineSettingsRows) {
    saveLocalSnapshot(rotation, machineSettingsRows);
    return { ok: true, seeded: false, queued: false, reason: 'admin-only-online-write' };
    if (!navigator.onLine || !getClient()) {
      enqueueTask({ type: 'rotation_state', rotation, meta: { source: 'local-seed' } });
      if (Array.isArray(machineSettingsRows) && machineSettingsRows.length) {
        enqueueTask({ type: 'machine_settings', rows: machineSettingsRows });
      }
      return { ok: true, queued: true, seeded: true };
    }
    try {
      const client = getClient();
      await runSupabaseOperation('local_seed.rotation_state', () => upsertRotationStateDirect(client, rotation, { source: 'local-seed' }), { mode: 'write' });
      if (Array.isArray(machineSettingsRows) && machineSettingsRows.length) {
        await runSupabaseOperation('local_seed.machine_settings', () => upsertMachineSettingsDirect(client, machineSettingsRows), { mode: 'write' });
      }
      await flushPendingWrites();
      return { ok: true, seeded: true, queued: false };
    } catch (err) {
      console.warn('Supabase seed from local snapshot failed', err);
      enqueueTask({ type: 'rotation_state', rotation, meta: { source: 'local-seed' } });
      if (Array.isArray(machineSettingsRows) && machineSettingsRows.length) {
        enqueueTask({ type: 'machine_settings', rows: machineSettingsRows });
      }
      return { ok: true, queued: true, seeded: true, reason: 'fallback' };
    }
  }

  async function refreshPublicData() {
    const client = getClient();
    try {
      if (client && navigator.onLine) {
        const announcementsRes = await runSharedSupabaseRead('announcements.refresh', () => runSupabaseOperation('announcements.refresh', () => client
          .from('announcements')
          .select('*')
          .eq('is_active', true)
          .order('priority', { ascending: false })
          .order('updated_at', { ascending: false })
          .limit(5), { mode: 'read' }));

        if (announcementsRes && !announcementsRes.error) {
          state.announcements = Array.isArray(announcementsRes.data) ? announcementsRes.data : [];
          safeWriteJson(LOCAL_ANNOUNCEMENTS_KEY, state.announcements);
        }
        state.ready = true;
        state.lastError = null;
      } else {
        const cachedAnnouncements = safeReadJson(LOCAL_ANNOUNCEMENTS_KEY, []);
        if (Array.isArray(cachedAnnouncements) && cachedAnnouncements.length) {
          state.announcements = cachedAnnouncements;
        }
        state.ready = true;
      }

      if (typeof forceHomeRefresh === 'function') forceHomeRefresh();
      if (typeof window.__rotaceBootHomeRefreshLate === 'function') window.__rotaceBootHomeRefreshLate();
      else {
        if (typeof updateDashboard === 'function') updateDashboard();
        if (typeof updateFoodTile === 'function') updateFoodTile();
        if (typeof updateEportalTile === 'function') updateEportalTile();
      }

      return { announcements: state.announcements };
    } catch (err) {
      state.lastError = err;
      console.warn('Supabase public data refresh failed', err);
      const cachedAnnouncements = safeReadJson(LOCAL_ANNOUNCEMENTS_KEY, []);
      if (Array.isArray(cachedAnnouncements) && cachedAnnouncements.length) {
        state.announcements = cachedAnnouncements;
      }
      state.ready = true;
      return { announcements: state.announcements, cached: true };
    }
  }

  function monthKeyToMonthStart(monthKey) {
    const match = /^(\d{1,2})\/(\d{2})$/.exec(String(monthKey || '').trim());
    if (!match) return null;
    const month = Math.max(1, Math.min(12, parseInt(match[1], 10) || 1));
    const year = 2000 + (parseInt(match[2], 10) || 0);
    return `${year}-${String(month).padStart(2, '0')}-01`;
  }


  function monthStartToMonthKey(monthStart) {
    const raw = String(monthStart || '').trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (!m) return raw ? raw : '';
    return String(Number(m[2])) + '/' + String(m[1]).slice(-2);
  }

  function rebuildRotationFromTables(monthRows, entryRows) {
    const months = {};
    const hardMachines = Array.isArray(window.HARD_MACHINE_HEADERS) ? window.HARD_MACHINE_HEADERS.slice() : [];
    const softMachines = Array.isArray(window.SOFT_MACHINE_HEADERS) ? window.SOFT_MACHINE_HEADERS.slice() : [];
    const rowsByMonthKey = new Map();

    (Array.isArray(monthRows) ? monthRows : []).forEach(row => {
      const monthKey = String(row && row.label ? row.label : monthStartToMonthKey(row && row.month_start ? row.month_start : '')).trim();
      if (!monthKey) return;
      months[monthKey] = {
        hard: { title: 'Rotace tvrdota', machines: hardMachines.slice(), rows: [] },
        soft: { title: 'Rotace měkota', machines: softMachines.slice(), rows: [] },
        notes: []
      };
      rowsByMonthKey.set(String(row && row.month_start ? row.month_start : '').trim() || monthKey, monthKey);
    });

    const ensureMonth = (monthKey) => {
      if (!months[monthKey]) {
        months[monthKey] = {
          hard: { title: 'Rotace tvrdota', machines: hardMachines.slice(), rows: [] },
          soft: { title: 'Rotace měkota', machines: softMachines.slice(), rows: [] },
          notes: []
        };
      }
      return months[monthKey];
    };

    const grouped = { hard: new Map(), soft: new Map() };

    (Array.isArray(entryRows) ? entryRows : []).forEach(entry => {
      const monthKey = rowsByMonthKey.get(String(entry && entry.month_start ? entry.month_start : '').trim()) || monthStartToMonthKey(entry && entry.month_start ? entry.month_start : '');
      if (!monthKey) return;
      const month = ensureMonth(monthKey);
      const type = String(entry && entry.assignment_type ? entry.assignment_type : '').trim();

      if (type === 'note') {
        const note = {
          date: String(entry && entry.shift_code ? entry.shift_code : '').trim(),
          person: String(entry && entry.employee_name ? entry.employee_name : '').trim(),
          code: String(entry && entry.target_machine ? entry.target_machine : '').trim(),
          shift: '',
          text: String(entry && entry.note ? entry.note : '').trim()
        };
        if (note.date || note.person || note.code || note.text) month.notes.push(note);
        return;
      }

      const section = type === 'soft' ? 'soft' : 'hard';
      const machineList = section === 'hard' ? hardMachines : softMachines;
      const rowIndex = Math.floor(Number(entry && entry.row_order ? entry.row_order : 0) / 100);
      const rowKey = [monthKey, section, String(entry && entry.shift_code ? entry.shift_code : '').trim(), String(rowIndex)].join('||');
      const cidx = machineList.indexOf(String(entry && entry.target_machine ? entry.target_machine : '').trim());

      if (!grouped[section].has(rowKey)) {
        grouped[section].set(rowKey, {
          date: String(entry && entry.shift_code ? entry.shift_code : '').trim(),
          cells: Array(machineList.length).fill(''),
          _order: rowIndex
        });
      }
      const row = grouped[section].get(rowKey);
      if (cidx >= 0) row.cells[cidx] = String(entry && entry.employee_name ? entry.employee_name : '').trim();
    });

    Object.entries(grouped).forEach(([section, map]) => {
      const rows = Array.from(map.values()).sort((a, b) => a._order - b._order || String(a.date || '').localeCompare(String(b.date || ''), 'cs'));
      rows.forEach(row => { delete row._order; });
      Object.values(months).forEach(m => {
        m[section].rows = rows.filter(r => true);
      });
    });

    // Re-run per month to assign the correct rows only to each month.
    Object.keys(months).forEach(monthKey => {
      ['hard', 'soft'].forEach(section => { months[monthKey][section].rows = []; });
    });

    (Array.isArray(entryRows) ? entryRows : []).forEach(entry => {
      const monthKey = rowsByMonthKey.get(String(entry && entry.month_start ? entry.month_start : '').trim()) || monthStartToMonthKey(entry && entry.month_start ? entry.month_start : '');
      if (!monthKey) return;
      const type = String(entry && entry.assignment_type ? entry.assignment_type : '').trim();
      if (type === 'note') return;
      const section = type === 'soft' ? 'soft' : 'hard';
      const machineList = section === 'hard' ? hardMachines : softMachines;
      const rowIndex = Math.floor(Number(entry && entry.row_order ? entry.row_order : 0) / 100);
      const rowKey = [monthKey, section, String(entry && entry.shift_code ? entry.shift_code : '').trim(), String(rowIndex)].join('||');
      const cidx = machineList.indexOf(String(entry && entry.target_machine ? entry.target_machine : '').trim());
      const month = ensureMonth(monthKey);
      if (!month[section]._map) month[section]._map = new Map();
      if (!month[section]._map.has(rowKey)) {
        month[section]._map.set(rowKey, { date: String(entry && entry.shift_code ? entry.shift_code : '').trim(), cells: Array(machineList.length).fill(''), _order: rowIndex });
      }
      const row = month[section]._map.get(rowKey);
      if (cidx >= 0) row.cells[cidx] = String(entry && entry.employee_name ? entry.employee_name : '').trim();
    });

    Object.entries(months).forEach(([monthKey, month]) => {
      ['hard', 'soft'].forEach(section => {
        const map = month[section]._map || new Map();
        month[section].rows = Array.from(map.values()).sort((a, b) => a._order - b._order || String(a.date || '').localeCompare(String(b.date || ''), 'cs'));
        month[section].rows.forEach(row => { delete row._order; });
        delete month[section]._map;
      });
      month.notes = (month.notes || []).sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''), 'cs') || String(a.person || '').localeCompare(String(b.person || ''), 'cs'));
    });

    return { months };
  }


  function defaultMachineSettingsRows() {
    return [
      { machine_key: 'FREZKY', machine_code: 'FREZKY', machine_index: '', label: 'Frezky', category: 'frezka', cycle_time: null, dress_time: null, dress_count: null, settings_json: { machine: 'FREZKY', index: '', cycle_time: '', dress_time: '', dress_count: '' } },
      { machine_key: 'TPKW01', machine_code: 'TPKW01', machine_index: '', label: 'Pračka', category: 'pracka', cycle_time: 30, dress_time: null, dress_count: null, settings_json: { machine: 'TPKW01', index: '', cycle_time: '30', dress_time: '', dress_count: '' } },
      { machine_key: 'FHB_TARGET_afag-lis', machine_code: 'FHB', machine_index: 'afag-lis', label: 'AF/AG lis', category: 'fhb_target', cycle_time: null, dress_time: null, dress_count: null, settings_json: { machine: 'FHB', index: 'afag-lis', type: 'fhb_target', key: 'afag-lis', label: 'AF/AG lis', target_left: '50', target_right: '70', tolerance_minus: '10', tolerance_plus: '10' } },
      { machine_key: 'FHB_TARGET_ah-lis', machine_code: 'FHB', machine_index: 'ah-lis', label: 'AH lis', category: 'fhb_target', cycle_time: null, dress_time: null, dress_count: null, settings_json: { machine: 'FHB', index: 'ah-lis', type: 'fhb_target', key: 'ah-lis', label: 'AH lis', target_left: '20', target_right: '80', tolerance_minus: '10', tolerance_plus: '10' } },
      { machine_key: 'FHB_TARGET_afag-volne', machine_code: 'FHB', machine_index: 'afag-volne', label: 'AF/AG volné', category: 'fhb_target', cycle_time: null, dress_time: null, dress_count: null, settings_json: { machine: 'FHB', index: 'afag-volne', type: 'fhb_target', key: 'afag-volne', label: 'AF/AG volné', target_left: '-5', target_right: '10', tolerance_minus: '10', tolerance_plus: '10' } },
      { machine_key: 'FHB_TARGET_ah-volne', machine_code: 'FHB', machine_index: 'ah-volne', label: 'AH volné', category: 'fhb_target', cycle_time: null, dress_time: null, dress_count: null, settings_json: { machine: 'FHB', index: 'ah-volne', type: 'fhb_target', key: 'ah-volne', label: 'AH volné', target_left: '10', target_right: '25', tolerance_minus: '10', tolerance_plus: '10' } },
      { machine_key: 'TBKR01-AD', machine_code: 'TBKR01', machine_index: 'AD', label: 'TBKR01-AD', category: 'brus', cycle_time: 58.2, dress_time: 323, dress_count: 59, settings_json: { machine: 'TBKR01', index: 'AD', cycle_time: '58.2', dress_time: '323', dress_count: '59' } },
      { machine_key: 'TBKR01-AE', machine_code: 'TBKR01', machine_index: 'AE', label: 'TBKR01-AE', category: 'brus', cycle_time: 57.0, dress_time: 240, dress_count: 58, settings_json: { machine: 'TBKR01', index: 'AE', cycle_time: '57.0', dress_time: '240', dress_count: '58' } },
      { machine_key: 'TBKR01-AH', machine_code: 'TBKR01', machine_index: 'AH', label: 'TBKR01-AH', category: 'brus', cycle_time: 66.0, dress_time: 400, dress_count: 87, settings_json: { machine: 'TBKR01', index: 'AH', cycle_time: '66.0', dress_time: '400', dress_count: '87' } },
      { machine_key: 'TBKR01-AD volné', machine_code: 'TBKR01', machine_index: 'AD volné', label: 'TBKR01-AD volné', category: 'brus', cycle_time: 62.7, dress_time: 240, dress_count: 45, settings_json: { machine: 'TBKR01', index: 'AD volné', cycle_time: '62.7', dress_time: '240', dress_count: '45' } },
      { machine_key: 'TBKR01-AE volné', machine_code: 'TBKR01', machine_index: 'AE volné', label: 'TBKR01-AE volné', category: 'brus', cycle_time: 60.0, dress_time: 240, dress_count: 45, settings_json: { machine: 'TBKR01', index: 'AE volné', cycle_time: '60.0', dress_time: '240', dress_count: '45' } },
      { machine_key: 'TBKR07-AD', machine_code: 'TBKR07', machine_index: 'AD', label: 'TBKR07-AD', category: 'brus', cycle_time: 58.2, dress_time: 298, dress_count: 59, settings_json: { machine: 'TBKR07', index: 'AD', cycle_time: '58.2', dress_time: '298', dress_count: '59' } },
      { machine_key: 'TBKR07-AE', machine_code: 'TBKR07', machine_index: 'AE', label: 'TBKR07-AE', category: 'brus', cycle_time: 56.4, dress_time: 325, dress_count: 59, settings_json: { machine: 'TBKR07', index: 'AE', cycle_time: '56.4', dress_time: '325', dress_count: '59' } },
      { machine_key: 'TBKR07-AH', machine_code: 'TBKR07', machine_index: 'AH', label: 'TBKR07-AH', category: 'brus', cycle_time: 63, dress_time: 360, dress_count: 88, settings_json: { machine: 'TBKR07', index: 'AH', cycle_time: '63', dress_time: '360', dress_count: '88' } },
      { machine_key: 'TBKR07-AD volné', machine_code: 'TBKR07', machine_index: 'AD volné', label: 'TBKR07-AD volné', category: 'brus', cycle_time: 60.3, dress_time: 240, dress_count: 45, settings_json: { machine: 'TBKR07', index: 'AD volné', cycle_time: '60.3', dress_time: '240', dress_count: '45' } },
      { machine_key: 'TBKR07-AE volné', machine_code: 'TBKR07', machine_index: 'AE volné', label: 'TBKR07-AE volné', category: 'brus', cycle_time: 60.0, dress_time: 240, dress_count: 45, settings_json: { machine: 'TBKR07', index: 'AE volné', cycle_time: '60.0', dress_time: '240', dress_count: '45' } }
    ];
  }

  async function loadMachineSettings() {
    const client = getClient();
    try {
      if (client && navigator.onLine) {
        const { data, error } = await runSharedSupabaseRead('machine_settings.load', () => runSupabaseOperation('machine_settings.load', () => client
          .from('machine_settings')
          .select('*')
          .order('category', { ascending: true })
          .order('machine_key', { ascending: true }), { mode: 'read' }));
        if (error) throw error;
        const rows = (Array.isArray(data) ? data : []).filter((row) => !isDeletedMachineSettingsRow(row));
        if (Array.isArray(data) && data.length) {
          state.machineSettingsSnapshot = rows;
          state.lastError = null;
          saveLocalSnapshot(state.rotationSnapshot || null, rows);
          return rows;
        }
      }
    } catch (err) {
      state.lastError = err;
      console.error('Supabase machine settings load failed', err);
    }
    const cached = readLocalSnapshot();
    if (cached && Array.isArray(cached.machineSettingsRows) && cached.machineSettingsRows.length) {
      const rows = cached.machineSettingsRows.filter((row) => !isDeletedMachineSettingsRow(row));
      state.machineSettingsSnapshot = rows;
      state.lastError = null;
      return rows;
    }
    const defaults = defaultMachineSettingsRows();
    state.machineSettingsSnapshot = defaults;
    state.lastError = null;
    saveLocalSnapshot(state.rotationSnapshot || null, defaults);
    return defaults;
  }

  async function saveMachineSettings(rows, options) {
    const client = getClient();
    if (!hasSecureAdminContext()) return { ok: false, reason: 'admin-auth-required' };
    try {
      if (client && navigator.onLine) {
        if (shouldDeferOnlineWrite()) return { ok: false, queued: false, deferred: true, reason: 'admin-online-required', savedCount: 0 };
        const savedCount = await runOptimizedSupabaseWrite('machine_settings.save', rows, () => runSupabaseOperation('machine_settings.save', () => upsertMachineSettingsDirect(client, rows, options || {}), { mode: 'write' }));
        state.machineSettingsSnapshot = Array.isArray(rows) ? rows : [];
        saveLocalSnapshot(state.rotationSnapshot || null, rows);
        await flushPendingWrites();
        return { ok: true, savedCount, queued: false };
      }
      return { ok: false, queued: false, reason: 'admin-online-required', savedCount: 0 };
    } catch (err) {
      state.lastError = err;
      console.error('Supabase machine settings save failed', err);
      return { ok: false, error: err };
    }
  }

  async function loadRotationMonthEntries(monthStart) {
    const client = getClient();
    try {
      if (client && navigator.onLine) {
        const { data, error } = await runSharedSupabaseRead('rotation_entries.load:' + String(monthStart || ''), () => runSupabaseOperation('rotation_entries.load', () => client
          .from('rotation_entries')
          .select('*')
          .eq('month_start', monthStart)
          .order('row_order', { ascending: true })
          .order('employee_name', { ascending: true }), { mode: 'read' }));
        if (error) throw error;
        return Array.isArray(data) ? data : [];
      }
    } catch (err) {
      state.lastError = err;
      console.error('Supabase rotation entries load failed', err);
    }
    return [];
  }

  async function saveRotationMonthEntries(monthStart, label, rows) {
    const client = getClient();
    try {
      if (client && navigator.onLine) {
        if (shouldDeferOnlineWrite()) return { ok: false, queued: false, deferred: true, reason: 'admin-online-required', months: 0, entries: 0 };
        const summary = await runOptimizedSupabaseWrite('rotation_entries.save:' + String(monthStart || ''), { monthStart, label, rows }, () => runSupabaseOperation('rotation_entries.save', () => upsertRotationMonthEntriesDirect(client, monthStart, label, rows), { mode: 'write' }), { windowMs: 2200 });
        await flushPendingWrites();
        return { ok: true, queued: false, months: summary.months, entries: summary.entries };
      }
      return { ok: false, queued: false, reason: 'admin-online-required', months: 0, entries: 0 };
    } catch (err) {
      state.lastError = err;
      console.error('Supabase rotation entries save failed', err);
      return { ok: false, error: err };
    }
  }

  async function loadGameAccountsDirect(client, options) {
    const opts = options || {};
    const cache = readTimedCache(LOCAL_GAME_ACCOUNTS_KEY, SUPABASE_GAME_CACHE_TTL_MS);
    if (opts.preferCache && cache && cache.fresh) {
      rememberTimedCacheHit('accounts', cache);
      return cache.rows;
    }
    try {
      // Retired game-directory API must never fall back to anonymous bulk table reads.
      if (!hasSecureAdminContext()) return [];
      const { data, error } = await runSharedSupabaseRead('game_accounts.load', () => runSupabaseOperation('game_accounts.load', () => client.rpc('rak_admin_list_application_accounts_v1'), { mode: 'read' }));
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      writeTimedCache(LOCAL_GAME_ACCOUNTS_KEY, rows, 'accounts');
      return rows;
    } catch (err) {
      if (cache && cache.rows) {
        rememberTimedCacheHit('accounts', cache);
        return cache.rows;
      }
      throw err;
    }
  }

  function gameStatsCacheKey(gameType, limit) {
    return LOCAL_GAME_STATS_PREFIX + encodeURIComponent(String(gameType || '').trim() || 'unknown') + ':' + String(Math.max(1, Math.min(100, Number(limit) || 10)));
  }

  function gameStatsAccountCacheKey(accountNumber) {
    return LOCAL_GAME_STATS_PREFIX + 'account:' + encodeURIComponent(String(accountNumber || '').trim() || 'unknown') + ':all';
  }

  function clearGameStatsCache(gameType) {
    const type = encodeURIComponent(String(gameType || '').trim() || 'unknown');
    const prefix = LOCAL_GAME_STATS_PREFIX + type + ':';
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && key.indexOf(prefix) === 0) keys.push(key);
      }
      keys.forEach(key => localStorage.removeItem(key));
    } catch (err) {}
  }

  function clearAllGameStatsCaches() {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const cacheKey = localStorage.key(i);
        if (cacheKey && (cacheKey.indexOf(LOCAL_GAME_STATS_PREFIX) === 0 || cacheKey.indexOf(LOCAL_GAME_SESSIONS_PREFIX) === 0)) keys.push(cacheKey);
      }
      keys.forEach(cacheKey => localStorage.removeItem(cacheKey));
    } catch (err) {}
  }

  function gameProgressIsBeforeReset(row) {
    if (!row || String(row.game_type || '') === GAME_UI_SETTINGS_TYPE) return false;
    const ts = Date.parse(String(row.last_played_at || row.finished_at || row.updated_at || row.created_at || ''));
    return Number.isFinite(GAME_PROGRESS_RESET_CUTOFF_MS) && Number.isFinite(ts) && ts < GAME_PROGRESS_RESET_CUTOFF_MS;
  }

  function gameProgressQueryAfterReset(query) {
    if (!query || !GAME_PROGRESS_RESET_CUTOFF_ISO) return query;
    try { return query.gte('last_played_at', GAME_PROGRESS_RESET_CUTOFF_ISO); } catch (err) { return query; }
  }

  function isClientGameProgressResetAllowed(options = {}) {
    // v.1.5 (809): destruktivní maintenance reset nesmí být spustitelný běžným klientem ani z konzole.
    // Původně byl reset dostupný přes veřejný bridge/window helper a mohl přepsat game_stats/game_sessions.
    return !!(options && options.allowClientMaintenanceReset === true
      && window.__RAK_ENABLE_CLIENT_MAINTENANCE_RESET === true
      && typeof app !== 'undefined'
      && app.adminUnlocked === true);
  }

  async function resetGameProgressOnlineDirect(client, options = {}) {
    if (!isClientGameProgressResetAllowed(options)) {
      return { ok: false, disabled: true, reason: 'client-maintenance-reset-disabled' };
    }
    const cutoffIso = String(options.cutoffIso || GAME_PROGRESS_RESET_CUTOFF_ISO || '').trim();
    const nowIso = new Date().toISOString();
    const result = { ok: true, version: GAME_PROGRESS_RESET_VERSION, cutoffIso, statsRows: 0, sessionRows: 0, errors: [] };
    const statsPatch = { games_played: 0, wins: 0, losses: 0, draws: 0, points: 0, last_played_at: nowIso, updated_at: nowIso };
    try {
      let statsQuery = client.from('game_stats').update(statsPatch).neq('game_type', GAME_UI_SETTINGS_TYPE);
      if (cutoffIso) statsQuery = statsQuery.lt('updated_at', cutoffIso);
      const { data, error } = await runSupabaseOperation('game_stats.reset_progress_v720', () => statsQuery.select('id,game_type'), { mode: 'write', attempts: 1 });
      if (error) throw error;
      result.statsRows = Array.isArray(data) ? data.length : 0;
    } catch (err) {
      result.ok = false;
      result.errors.push({ table: 'game_stats', message: String(err && err.message ? err.message : err) });
    }
    try {
      let sessionQuery = client.from('game_sessions').update({ status: 'reset', winner_account_number: null, finished_at: nowIso, updated_at: nowIso });
      if (cutoffIso) sessionQuery = sessionQuery.lt('updated_at', cutoffIso);
      const { data, error } = await runSupabaseOperation('game_sessions.reset_progress_v720', () => sessionQuery.select('id,game_type,status'), { mode: 'write', attempts: 1 });
      if (error) throw error;
      result.sessionRows = Array.isArray(data) ? data.length : 0;
    } catch (err) {
      result.errors.push({ table: 'game_sessions', message: String(err && err.message ? err.message : err) });
    }
    clearAllGameStatsCaches();
    return result;
  }

  async function loadGameStatsForAccountDirect(client, accountNumber, options = {}) {
    const account = String(accountNumber || '').trim();
    if (!account) return [];
    const cacheKey = gameStatsAccountCacheKey(account);
    const forceRefresh = !!(options && options.force);
    const cachedStats = forceRefresh ? null : readTimedCache(cacheKey, SUPABASE_GAME_CACHE_TTL_MS);
    if (cachedStats && cachedStats.fresh) {
      rememberTimedCacheHit('stats', cachedStats);
      return cachedStats.rows;
    }
    try {
      const [accounts, statsRes] = await Promise.all([
        loadGameAccountsDirect(client, { preferCache: true }).catch(() => []),
        runSharedSupabaseRead('game_stats.account.load:' + account, () => runSupabaseOperation('game_stats.account.load', () => client
          .from('game_stats')
          .select('id,account_number,game_type,games_played,wins,losses,draws,points,last_played_at,updated_at')
          .eq('account_number', account)
          .neq('game_type', GAME_UI_SETTINGS_TYPE)
          .gte('last_played_at', GAME_PROGRESS_RESET_CUTOFF_ISO)
          .order('last_played_at', { ascending: false })
          .limit(200), { mode: 'read' }))
      ]);
      if (statsRes && statsRes.error) throw statsRes.error;
      const nameMap = new Map((Array.isArray(accounts) ? accounts : []).map(row => [String(row.account_number || '').trim(), String(row.full_name || '').trim()]));
      const rows = (Array.isArray(statsRes && statsRes.data) ? statsRes.data : [])
        .map(row => ({
          id: row.id,
          account_number: String(row.account_number || '').trim(),
          game_type: String(row.game_type || '').trim(),
          games_played: Number(row.games_played || 0) || 0,
          wins: Number(row.wins || 0) || 0,
          losses: Number(row.losses || 0) || 0,
          draws: Number(row.draws || 0) || 0,
          points: Number(row.game_type === 'ttt' ? (row.games_played || row.points || 0) : (row.points || 0)) || 0,
          last_played_at: row.last_played_at || null,
          updated_at: row.updated_at || null,
          player_name: nameMap.get(String(row.account_number || '').trim()) || String(row.account_number || '').trim()
        }))
        .filter(row => String(row.account_number || '').trim() === account && String(row.game_type || '').trim() && String(row.game_type || '').trim() !== GAME_UI_SETTINGS_TYPE);
      writeTimedCache(cacheKey, rows, 'stats');
      return rows;
    } catch (err) {
      if (cachedStats && cachedStats.rows) {
        rememberTimedCacheHit('stats', cachedStats);
        return cachedStats.rows;
      }
      throw err;
    }
  }

  async function loadGameStatsDirect(client, gameType, limit, options) {
    const type = String(gameType || '').trim();
    if (!type) return [];
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 10));
    const cacheKey = gameStatsCacheKey(type, safeLimit);
    const forceRefresh = !!(options && options.force);
    const cachedStats = forceRefresh ? null : readTimedCache(cacheKey, SUPABASE_GAME_CACHE_TTL_MS);
    if (cachedStats && cachedStats.fresh) {
      rememberTimedCacheHit('stats', cachedStats);
      return cachedStats.rows;
    }
    try {
      const [accounts, statsRes] = await Promise.all([
        loadGameAccountsDirect(client, { preferCache: true }).catch(() => []),
        runSharedSupabaseRead('game_stats.load:' + type + ':' + safeLimit, () => runSupabaseOperation('game_stats.load', () => client
          .from('game_stats')
          .select('id,account_number,game_type,games_played,wins,losses,draws,points,last_played_at,updated_at')
          .eq('game_type', type)
          .gte('last_played_at', GAME_PROGRESS_RESET_CUTOFF_ISO)
          .order('points', { ascending: false })
          .order('last_played_at', { ascending: false })
          .limit(safeLimit), { mode: 'read' }))
      ]);
      if (statsRes && statsRes.error) throw statsRes.error;
      const nameMap = new Map((Array.isArray(accounts) ? accounts : []).map(row => [String(row.account_number || '').trim(), String(row.full_name || '').trim()]));
      const rows = (Array.isArray(statsRes && statsRes.data) ? statsRes.data : [])
        .map(row => ({
          id: row.id,
          account_number: String(row.account_number || '').trim(),
          game_type: String(row.game_type || '').trim(),
          games_played: Number(row.games_played || 0) || 0,
          wins: Number(row.wins || 0) || 0,
          losses: Number(row.losses || 0) || 0,
          draws: Number(row.draws || 0) || 0,
          points: Number(row.game_type === 'ttt' ? (row.games_played || row.points || 0) : (row.points || 0)) || 0,
          last_played_at: row.last_played_at || null,
          updated_at: row.updated_at || null,
          player_name: nameMap.get(String(row.account_number || '').trim()) || String(row.account_number || '').trim()
        }))
        .filter(row => row.points > 0)
        .sort((a, b) => (b.points - a.points) || String(b.updated_at || '').localeCompare(String(a.updated_at || '')) || String(a.player_name || '').localeCompare(String(b.player_name || ''), 'cs'))
        .slice(0, safeLimit);
      writeTimedCache(cacheKey, rows, 'stats');
      return rows;
    } catch (err) {
      if (cachedStats && cachedStats.rows) {
        rememberTimedCacheHit('stats', cachedStats);
        return cachedStats.rows;
      }
      throw err;
    }
  }


  function getSafeGameStatNumber(value, fallback) {
    const num = Number(value);
    return Number.isFinite(num) ? num : (Number.isFinite(Number(fallback)) ? Number(fallback) : 0);
  }

  // RaK 1.2 (1.155): online score časových her držíme do 5000, aby prošlo stávajícím
  // rak_record_game_stat_delta RPC a zároveň nenafukovalo XP v profilu.
  const GAME_STATS_POINTS_DELTA_LIMIT = 5000;
  const GAME_STATS_LOW_POINT_SCALE_LEGACY = 1000000000;
  const GAME_STATS_SAFE_TIME_SCORE_SCALE = 5000;
  const GAME_STATS_SAFE_TIME_SCORE_MAX = GAME_STATS_SAFE_TIME_SCORE_SCALE - 1;
  function isLowTimeGameStatType(gameType) {
    const type = String(gameType || '').trim();
    return type === 'reaction' || type === 'daily_reaction' || type === 'memory' || type === 'daily_memory' || type === 'sudoku' || /^memory_\d+x\d+$/.test(type) || /^sudoku_(easy|medium|hard)$/.test(type);
  }
  function lowTimeGameStatUsesMs(gameType) {
    const type = String(gameType || '').trim();
    return type === 'reaction' || type === 'daily_reaction';
  }
  function memoryGameStatMinValidMs(gameType) {
    const type = String(gameType || '').trim();
    if (type === 'memory_8x8') return 60000;
    if (type === 'memory_6x6') return 30000;
    if (type === 'memory' || type === 'memory_4x4' || type === 'daily_memory') return 12000;
    return 0;
  }
  function sanitizeLowTimeGameStatMs(gameType, value) {
    const ms = getSafeGameStatNumber(value, 0);
    if (!ms || ms <= 0) return 0;
    const minMs = memoryGameStatMinValidMs(gameType);
    if (minMs > 0 && ms < minMs) return 0;
    if ((String(gameType || '').trim() === 'reaction' || String(gameType || '').trim() === 'daily_reaction') && ms > 60000) return 0;
    if (ms >= 86400000) return 0;
    return ms;
  }
  function decodeLowTimeGameStatMs(gameType, rawValue) {
    const raw = Math.round(getSafeGameStatNumber(rawValue, 0));
    if (!raw) return 0;
    if (raw > 86400000 && raw < GAME_STATS_LOW_POINT_SCALE_LEGACY) return Math.max(0, GAME_STATS_LOW_POINT_SCALE_LEGACY - raw);
    if (raw > 0 && raw < GAME_STATS_SAFE_TIME_SCORE_SCALE) {
      const metric = Math.max(1, GAME_STATS_SAFE_TIME_SCORE_SCALE - raw);
      return sanitizeLowTimeGameStatMs(gameType, lowTimeGameStatUsesMs(gameType) ? metric : metric * 1000);
    }
    return sanitizeLowTimeGameStatMs(gameType, Math.max(0, raw));
  }
  function encodeLowTimeGameStatPoints(gameType, timeMs) {
    const ms = getSafeGameStatNumber(timeMs, 0);
    if (!ms || ms <= 0) return 0;
    const metric = lowTimeGameStatUsesMs(gameType) ? Math.max(1, Math.round(ms)) : Math.max(1, Math.round(ms / 1000));
    return Math.max(1, Math.min(GAME_STATS_SAFE_TIME_SCORE_MAX, GAME_STATS_SAFE_TIME_SCORE_SCALE - Math.min(GAME_STATS_SAFE_TIME_SCORE_MAX, metric)));
  }
  function normalizeGameStatEntryPoints(gameType, entry) {
    if (!isLowTimeGameStatType(gameType)) return Math.round(getSafeGameStatNumber(entry && (entry.points ?? entry.bestScore ?? entry.score), 0));
    const explicitTime = sanitizeLowTimeGameStatMs(gameType, getSafeGameStatNumber(entry && (entry.bestTimeMs ?? entry.timeMs ?? entry.elapsedMs), 0));
    if (explicitTime > 0) return encodeLowTimeGameStatPoints(gameType, explicitTime);
    const rawPoints = getSafeGameStatNumber(entry && (entry.points ?? entry.bestScore ?? entry.score), 0);
    const decodedTime = decodeLowTimeGameStatMs(gameType, rawPoints);
    return decodedTime > 0 ? encodeLowTimeGameStatPoints(gameType, decodedTime) : 0;
  }

  function createGameStatsRpcRequiredError(gameType, source) {
    const err = new Error('Herní statistiky se nepodařilo uložit přes RPC rak_record_game_stat_delta. Přímý zápis do game_stats je správně vypnutý, protože ho blokuje RPC-only RLS.');
    err.code = 'RAK_GAME_STATS_RPC_REQUIRED';
    err.game_type = String(gameType || '').trim();
    err.source = String(source || 'game_stats');
    return err;
  }

  function createGameUiSettingsRpcRequiredError(accountNumber) {
    const err = new Error('Nastavení herního profilu se nepodařilo uložit přes RPC rak_save_game_ui_settings. Přímý zápis do game_stats je správně vypnutý, protože ho blokuje RPC-only RLS.');
    err.code = 'RAK_GAME_UI_SETTINGS_RPC_REQUIRED';
    err.account_number = String(accountNumber || '').trim();
    return err;
  }

  async function tryRecordGameStatDeltaViaRpc(client, accountNumber, gameType, deltas) {
    if (!client || typeof client.rpc !== 'function') return null;
    const account = String(accountNumber || '').trim();
    const type = String(gameType || '').trim();
    if (!account || !type || type === GAME_UI_SETTINGS_TYPE) return null;
    try {
      rememberGameStatsRpcSmoke('attempt', type);
      const { data, error } = await runSupabaseOperation('game_stats.rpc_delta', () => client.rpc('rak_record_game_stat_delta', {
        p_account_number: account,
        p_game_type: type,
        p_games_played_delta: Math.max(0, Math.min(5, Math.round(getSafeGameStatNumber(deltas && deltas.gamesPlayedDelta, 0)))),
        p_wins_delta: Math.max(0, Math.min(5, Math.round(getSafeGameStatNumber(deltas && deltas.winsDelta, 0)))),
        p_losses_delta: Math.max(0, Math.min(5, Math.round(getSafeGameStatNumber(deltas && deltas.lossesDelta, 0)))),
        p_draws_delta: Math.max(0, Math.min(5, Math.round(getSafeGameStatNumber(deltas && deltas.drawsDelta, 0)))),
        p_points_delta: Math.max(0, Math.min(GAME_STATS_POINTS_DELTA_LIMIT, Math.round(getSafeGameStatNumber(deltas && deltas.pointsDelta, 0))))
      }), { mode: 'write', attempts: 1 });
      if (error) throw error;
      rememberGameStatsRpcSmoke('success', type);
      return data || null;
    } catch (err) {
      if (isSupabaseRpcUnavailableError(err)) {
        SUPABASE_RPC_HARDENING_STATUS.lastUnavailableAt = new Date().toISOString();
        SUPABASE_RPC_HARDENING_STATUS.lastUnavailableMessage = String(err && err.message ? err.message : err);
        rememberGameStatsRpcSmoke('fallback', type, 'rpc-unavailable');
        return null;
      }
      // RaK 1.2 (1.155): game_stats má v DB restriktivní RLS insert/update pouze přes RPC; Pexeso payload nesmí přidávat extra klíče.
      // Přímý fallback by jen vyrobil 401/42501 v konzoli a výsledek by stejně nezapsal.
      rememberGameStatsRpcSmoke('fallback', type, err && err.message ? err.message : err);
      console.warn('rak_record_game_stat_delta failed; direct game_stats fallback is disabled by RPC-only RLS.', err);
      return null;
    }
  }

  async function saveGameStatDirect(client, entry) {
    const accountNumber = String(entry && entry.account_number ? entry.account_number : '').trim();
    const gameType = String(entry && entry.game_type ? entry.game_type : '').trim();
    if (!accountNumber || !gameType) throw new Error('Chybí účet nebo typ hry.');

    const existingRes = await runSupabaseOperation('game_stats.lookup', () => client
      .from('game_stats')
      .select('id,games_played,wins,losses,draws,points,last_played_at,updated_at')
      .eq('account_number', accountNumber)
      .eq('game_type', gameType)
      .order('updated_at', { ascending: false })
      .limit(1), { mode: 'read' });
    if (existingRes && existingRes.error) throw existingRes.error;
    const existing = Array.isArray(existingRes && existingRes.data) && existingRes.data.length ? existingRes.data[0] : null;
    const existingBeforeReset = gameProgressIsBeforeReset(Object.assign({ game_type: gameType }, existing || {}));

    const lastPlayedRaw = entry && (entry.last_played_at ?? entry.lastPlayedAt ?? entry.updated_at ?? entry.updatedAt);
    const lastPlayedDate = lastPlayedRaw ? new Date(lastPlayedRaw) : new Date();
    const lastPlayedIso = Number.isNaN(lastPlayedDate.getTime()) ? new Date().toISOString() : lastPlayedDate.toISOString();

    const existingGamesPlayed = existingBeforeReset ? 0 : (Number(existing && existing.games_played || 0) || 0);
    const existingWins = existingBeforeReset ? 0 : (Number(existing && existing.wins || 0) || 0);
    const existingLosses = existingBeforeReset ? 0 : (Number(existing && existing.losses || 0) || 0);
    const existingDraws = existingBeforeReset ? 0 : (Number(existing && existing.draws || 0) || 0);
    const existingPoints = existingBeforeReset ? 0 : (Number(existing && existing.points || 0) || 0);
    const gamesPlayed = Math.max(existingGamesPlayed, Number(entry && (entry.games_played ?? entry.plays) || 0) || 0);
    const derivedPoints = gameType === 'ttt'
      ? gamesPlayed
      : normalizeGameStatEntryPoints(gameType, entry);
    const next = {
      account_number: accountNumber,
      game_type: gameType,
      games_played: gamesPlayed,
      wins: Math.max(existingWins, Number(entry && entry.wins || 0) || 0),
      losses: Math.max(existingLosses, Number(entry && entry.losses || 0) || 0),
      draws: Math.max(existingDraws, Number(entry && entry.draws || 0) || 0),
      points: Math.max(existingPoints, derivedPoints),
      last_played_at: lastPlayedIso,
      updated_at: lastPlayedIso
    };

    const deltas = {
      gamesPlayedDelta: Math.max(0, next.games_played - existingGamesPlayed),
      winsDelta: Math.max(0, next.wins - existingWins),
      lossesDelta: Math.max(0, next.losses - existingLosses),
      drawsDelta: Math.max(0, next.draws - existingDraws),
      pointsDelta: Math.max(0, next.points - existingPoints)
    };
    if (deltas.gamesPlayedDelta || deltas.winsDelta || deltas.lossesDelta || deltas.drawsDelta || deltas.pointsDelta) {
      const rpcRow = await tryRecordGameStatDeltaViaRpc(client, accountNumber, gameType, deltas);
      if (rpcRow) {
        clearGameStatsCache(gameType);
        return rpcRow;
      }
      throw createGameStatsRpcRequiredError(gameType, 'saveGameStatDirect');
    }

    // RaK 1.2 (1.155): pokud se nemění žádný čítač/body, nepokoušíme se o přímý update/insert.
    // game_stats je z bezpečnostních důvodů RPC-only a přímý zápis by jen vyrobil RLS chybu.
    clearGameStatsCache(gameType);
    return existing || next;
  }


  async function getExistingGameStat(client, accountNumber, gameType) {
    const account = String(accountNumber || '').trim();
    const type = String(gameType || '').trim();
    if (!account || !type) return null;
    const res = await runSupabaseOperation('game_stats.lookup_existing', () => client
      .from('game_stats')
      .select('id,games_played,wins,losses,draws,points,last_played_at,updated_at')
      .eq('account_number', account)
      .eq('game_type', type)
      .order('updated_at', { ascending: false })
      .limit(1), { mode: 'read' });
    if (res && res.error) throw res.error;
    return Array.isArray(res && res.data) && res.data.length ? res.data[0] : null;
  }

  async function bumpTttGameStat(client, accountNumber, resultKind) {
    const account = String(accountNumber || '').trim();
    if (!account) return null;
    const existing = await getExistingGameStat(client, account, 'ttt');
    const nowIso = new Date().toISOString();
    const existingBeforeReset = gameProgressIsBeforeReset(Object.assign({ game_type: 'ttt' }, existing || {}));
    const currentPlayed = existingBeforeReset ? 0 : (Number(existing && existing.games_played || 0) || 0);
    const currentWins = existingBeforeReset ? 0 : (Number(existing && existing.wins || 0) || 0);
    const currentLosses = existingBeforeReset ? 0 : (Number(existing && existing.losses || 0) || 0);
    const currentDraws = existingBeforeReset ? 0 : (Number(existing && existing.draws || 0) || 0);
    const next = {
      account_number: account,
      game_type: 'ttt',
      games_played: currentPlayed + 1,
      wins: currentWins + (resultKind === 'win' ? 1 : 0),
      losses: currentLosses + (resultKind === 'loss' ? 1 : 0),
      draws: currentDraws + (resultKind === 'draw' ? 1 : 0),
      points: currentPlayed + 1,
      last_played_at: nowIso,
      updated_at: nowIso
    };
    const rpcRow = await tryRecordGameStatDeltaViaRpc(client, account, 'ttt', {
      gamesPlayedDelta: 1,
      winsDelta: resultKind === 'win' ? 1 : 0,
      lossesDelta: resultKind === 'loss' ? 1 : 0,
      drawsDelta: resultKind === 'draw' ? 1 : 0,
      pointsDelta: 1
    });
    if (rpcRow) {
      clearGameStatsCache('ttt');
      return rpcRow;
    }

    // RaK 1.2 (1.155): i Piškvorky drží game_stats zápis výhradně přes RPC.
    // Přímý update/insert by po utažení v824 jen vyrobil 401/42501 a špinil konzoli.
    throw createGameStatsRpcRequiredError('ttt', 'bumpTttGameStat');
  }

  async function recordTttSessionResultByInviteCodeDirect(client, code, options) {
    const inviteCode = String(code || '').trim();
    if (!inviteCode) return { ok: false, reason: 'missing-code' };
    const loaded = await loadGameInviteByCode(client, inviteCode);
    if (!loaded.invite) return { ok: false, reason: 'missing-invite' };
    const { data: sessionRows, error: sessionErr } = await runSupabaseOperation('game_sessions.record_result_lookup', () => client
      .from('game_sessions')
      .select('*')
      .eq('invite_id', loaded.invite.id)
      .order('updated_at', { ascending: false })
      .limit(5), { mode: 'read' });
    if (sessionErr) throw sessionErr;
    const rows = Array.isArray(sessionRows) ? sessionRows : [];
    const sessionData = rows.find(row => String(row && row.status || '').toLowerCase() === 'finished') || rows[0] || null;
    if (!sessionData) return { ok: false, reason: 'missing-session' };
    const boardState = sessionData.board_state && typeof sessionData.board_state === 'object' ? Object.assign({}, sessionData.board_state) : {};
    const winner = String(boardState.winner || sessionData.winner || '').trim();
    const gameOver = !!boardState.gameOver || String(sessionData.status || '').toLowerCase() === 'finished';
    if (!gameOver || !winner) return { ok: false, reason: 'not-finished' };
    if (boardState.statsRecordedAt) return { ok: true, skipped: true, reason: 'already-recorded', session: sessionData };

    const xAcc = String(sessionData.player_x_account_number || boardState.playerXAccountNumber || loaded.invite.inviter_account_number || '').trim();
    const oAcc = String(sessionData.player_o_account_number || boardState.playerOAccountNumber || loaded.invite.invitee_account_number || '').trim();
    if (!xAcc || !oAcc) return { ok: false, reason: 'missing-players' };

    let xKind = '';
    let oKind = '';
    if (winner === 'draw') {
      xKind = 'draw';
      oKind = 'draw';
    } else if (winner === 'X') {
      xKind = 'win';
      oKind = 'loss';
    } else if (winner === 'O') {
      xKind = 'loss';
      oKind = 'win';
    } else {
      return { ok: false, reason: 'unknown-winner' };
    }

    boardState.statsRecordedAt = new Date().toISOString();
    boardState.statsRecordedBy = 'client-once-guard';
    boardState.statsRecordedSessionId = sessionData.id || null;
    const { data: updatedSession, error: updateErr } = await runSupabaseOperation('game_sessions.record_result_mark_once', () => client
      .from('game_sessions')
      .update({ board_state: boardState, winner_account_number: (winner === 'X' ? xAcc : (winner === 'O' ? oAcc : null)), status: 'finished', finished_at: sessionData.finished_at || new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', sessionData.id)
      .is('board_state->>statsRecordedAt', null)
      .select('*')
      .maybeSingle(), { mode: 'write' });
    if (updateErr) throw updateErr;
    if (!updatedSession) return { ok: true, skipped: true, reason: 'already-recorded', session: sessionData };

    await bumpTttGameStat(client, xAcc, xKind);
    await bumpTttGameStat(client, oAcc, oKind);
    clearGameStatsCache('ttt');
    return { ok: true, session: updatedSession || sessionData, recorded: true };
  }

  async function loadTttHeadToHeadDirect(client, playerA, playerB, options) {
    const a = String(playerA || '').trim();
    const b = String(playerB || '').trim();
    const gameType = String(options && (options.gameType || options.game_type) || 'gomoku').trim() || 'gomoku';
    if (!a || !b || a === b) return { ok: true, rows: [], score: { xWins: 0, oWins: 0, aWins: 0, bWins: 0, draws: 0, total: 0 }, players: { a, b } };
    const cacheKey = LOCAL_GAME_SESSIONS_PREFIX + 'h2h:' + encodeURIComponent(gameType + ':' + [a, b].sort().join(':'));
    const forceRefresh = !!(options && options.force);
    const cached = forceRefresh ? null : readTimedCache(cacheKey, SUPABASE_GAME_CACHE_TTL_MS);
    if (cached && cached.fresh && cached.rows && cached.rows[0]) {
      rememberTimedCacheHit('session', cached);
      return cached.rows[0];
    }
    const orExpr = 'and(player_x_account_number.eq.' + a + ',player_o_account_number.eq.' + b + '),and(player_x_account_number.eq.' + b + ',player_o_account_number.eq.' + a + ')';
    const { data, error } = await runSupabaseOperation('game_sessions.ttt_head_to_head', () => client
      .from('game_sessions')
      .select('id,player_x_account_number,player_o_account_number,winner_account_number,status,board_state,updated_at,finished_at')
      .eq('game_type', gameType)
      .eq('status', 'finished')
      .gte('finished_at', GAME_PROGRESS_RESET_CUTOFF_ISO)
      .or(orExpr)
      .order('updated_at', { ascending: false })
      .limit(100), { mode: 'read' });
    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    const score = { xWins: 0, oWins: 0, aWins: 0, bWins: 0, draws: 0, total: rows.length };
    rows.forEach((row) => {
      const boardState = row && row.board_state && typeof row.board_state === 'object' ? row.board_state : {};
      const winner = String(boardState.winner || boardState.winnerRole || '').toUpperCase();
      const xAcc = String(row && row.player_x_account_number || '').trim();
      const oAcc = String(row && row.player_o_account_number || '').trim();
      let winnerAcc = String(row && row.winner_account_number || boardState.winnerAccountNumber || '').trim();
      if (!winnerAcc && winner === 'X') winnerAcc = xAcc;
      if (!winnerAcc && winner === 'O') winnerAcc = oAcc;
      if (winner === 'DRAW' || winner === 'draw' || boardState.winner === 'draw') score.draws += 1;
      else if (winner === 'X') score.xWins += 1;
      else if (winner === 'O') score.oWins += 1;
      if (winnerAcc === a) score.aWins += 1;
      else if (winnerAcc === b) score.bWins += 1;
    });
    const result = { ok: true, rows, score, players: { a, b } };
    writeTimedCache(cacheKey, [result], 'session');
    return result;
  }

  async function loadTttHeadToHeadListDirect(client, options = {}) {
    const forceRefresh = !!(options && options.force);
    const limit = Math.max(20, Math.min(500, Number(options && options.limit) || 200));
    const gameType = String(options && options.gameType || options && options.game_type || 'gomoku').trim() || 'gomoku';
    const cacheKey = LOCAL_GAME_SESSIONS_PREFIX + 'h2h-list:' + encodeURIComponent(gameType) + ':' + String(limit);
    const cached = forceRefresh ? null : readTimedCache(cacheKey, SUPABASE_GAME_CACHE_TTL_MS);
    if (cached && cached.fresh && cached.rows && cached.rows[0]) {
      rememberTimedCacheHit('session', cached);
      return cached.rows[0];
    }
    const { data, error } = await runSupabaseOperation('game_sessions.ttt_head_to_head_list', () => client
      .from('game_sessions')
      .select('id,player_x_account_number,player_o_account_number,winner_account_number,status,board_state,updated_at,finished_at')
      .eq('game_type', gameType)
      .eq('status', 'finished')
      .gte('finished_at', GAME_PROGRESS_RESET_CUTOFF_ISO)
      .not('player_x_account_number', 'is', null)
      .not('player_o_account_number', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(limit), { mode: 'read' });
    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    const accountSet = new Set();
    rows.forEach((row) => {
      const x = String(row && row.player_x_account_number || '').trim();
      const o = String(row && row.player_o_account_number || '').trim();
      if (x) accountSet.add(x);
      if (o) accountSet.add(o);
    });
    const accountIds = Array.from(accountSet);
    const names = {};
    if (accountIds.length) {
      try {
        const { data: accountRows, error: accountErr } = await runSupabaseOperation('game_accounts.ttt_head_to_head_names', () => client
          .from('game_accounts')
          .select('account_number,full_name')
          .in('account_number', accountIds), { mode: 'read' });
        if (!accountErr && Array.isArray(accountRows)) {
          accountRows.forEach((acc) => {
            const id = String(acc && acc.account_number || '').trim();
            if (id) names[id] = String(acc && acc.full_name || '').trim();
          });
        }
      } catch (err) {}
    }
    const pairs = new Map();
    rows.forEach((row) => {
      const x = String(row && row.player_x_account_number || '').trim();
      const o = String(row && row.player_o_account_number || '').trim();
      if (!x || !o || x === o) return;
      const sorted = [x, o].sort();
      const key = sorted.join('::');
      if (!pairs.has(key)) {
        pairs.set(key, {
          playerA: sorted[0],
          playerB: sorted[1],
          nameA: names[sorted[0]] || '',
          nameB: names[sorted[1]] || '',
          aWins: 0,
          bWins: 0,
          draws: 0,
          total: 0,
          lastPlayedAt: ''
        });
      }
      const pair = pairs.get(key);
      const boardState = row && row.board_state && typeof row.board_state === 'object' ? row.board_state : {};
      const winner = String(boardState.winner || boardState.winnerRole || '').toUpperCase();
      let winnerAcc = String(row && row.winner_account_number || boardState.winnerAccountNumber || '').trim();
      if (!winnerAcc && winner === 'X') winnerAcc = x;
      if (!winnerAcc && winner === 'O') winnerAcc = o;
      if (winnerAcc === pair.playerA) pair.aWins += 1;
      else if (winnerAcc === pair.playerB) pair.bWins += 1;
      else pair.draws += 1;
      pair.total += 1;
      const playedAt = String(row && (row.finished_at || row.updated_at) || '').trim();
      if (!pair.lastPlayedAt || playedAt > pair.lastPlayedAt) pair.lastPlayedAt = playedAt;
    });
    const resultRows = Array.from(pairs.values())
      .filter(pair => pair.total > 0)
      .sort((a, b) => (b.total - a.total) || String(b.lastPlayedAt || '').localeCompare(String(a.lastPlayedAt || '')))
      .slice(0, 50);
    const result = { ok: true, rows: resultRows, totalPairs: resultRows.length };
    writeTimedCache(cacheKey, [result], 'session');
    return result;
  }


  function gameUiSettingsCacheKey(accountNumber) {
    return LOCAL_GAME_UI_SETTINGS_PREFIX + encodeURIComponent(String(accountNumber || '').trim() || 'unknown');
  }

  function getGameUiDefinitionIndex(list, id, fallback) {
    const defs = Array.isArray(list) ? list : [];
    const wanted = String(id || '').trim();
    const idx = defs.findIndex(item => String(item && item.id || '').trim() === wanted);
    if (idx >= 0) return idx;
    const fb = String(fallback || '').trim();
    const fbIdx = defs.findIndex(item => String(item && item.id || '').trim() === fb);
    return fbIdx >= 0 ? fbIdx : 0;
  }

  function getGameUiDefinitionId(list, index, fallback) {
    const defs = Array.isArray(list) ? list : [];
    const idx = Math.max(0, Math.min(defs.length - 1, Number(index) || 0));
    return String(defs[idx] && defs[idx].id || fallback || '').trim();
  }

  function normalizeGameUiSettings(entry) {
    const accountNumber = String(entry && (entry.account_number || entry.accountNumber) || '').trim();
    const appearanceRaw = String(entry && (entry.appearance_id || entry.appearanceId || entry.theme_id || entry.themeId || entry.background_id || entry.backgroundId) || '').trim();
    const appearance = appearanceRaw || 'obsidian';
    return {
      account_number: accountNumber,
      appearance_id: appearance,
      theme_id: appearance,
      background_id: appearance,
      expected_revision: Math.max(0, Number(entry && (entry.expected_revision ?? entry.serverRevision ?? entry.revision) || 0) || 0),
      revision: Math.max(0, Number(entry && (entry.revision ?? entry.serverRevision ?? entry.expected_revision) || 0) || 0),
      updated_at: String(entry && (entry.updated_at || entry.updatedAt) || new Date().toISOString())
    };
  }

  function decodeGameUiSettingsRow(row) {
    if (!row || typeof row !== 'object') return null;
    const appearance = String(row.appearance_id || row.appearanceId || row.theme_id || row.themeId || row.background_id || row.backgroundId || '').trim();
    if (!appearance) return null;
    return {
      ok: row.ok !== false,
      conflict: row.conflict === true,
      reason: String(row.reason || ''),
      account_number: String(row.account_number || row.accountNumber || '').trim(),
      appearance_id: appearance,
      theme_id: appearance,
      background_id: appearance,
      revision: Math.max(0, Number(row.revision || 0) || 0),
      updated_at: row.updated_at || row.updatedAt || null,
      source: 'account_ui_preferences_rpc'
    };
  }

  async function loadGameAccountUiSettingsDirect(client, accountNumber) {
    const account = String(accountNumber || '').trim();
    if (!account) return null;
    const { data, error } = await runSharedSupabaseRead('account_ui_preferences.load:' + account, () => runSupabaseOperation('account_ui_preferences.load', () => client
      .rpc('rak_load_account_ui_preferences', { p_account_number: account }), { mode: 'read' }));
    if (error) throw error;
    const row = decodeGameUiSettingsRow(data);
    if (row) writeTimedCache(gameUiSettingsCacheKey(account), [row], 'ui');
    state.cacheGuard.uiSettingsLoads += 1;
    return row;
  }

  async function saveGameAccountUiSettingsDirect(client, entry) {
    const normalized = normalizeGameUiSettings(entry);
    if (!normalized.account_number) throw new Error('Chybí účet pro uložení vzhledu.');
    try {
      rememberGameUiRpcSmoke('attempt');
      const { data, error } = await runSupabaseOperation('account_ui_preferences.save', () => client.rpc('rak_save_account_ui_preferences', {
        p_account_number: normalized.account_number,
        p_appearance_id: normalized.appearance_id,
        p_expected_revision: normalized.expected_revision
      }), { mode: 'write', attempts: 1 });
      if (error) throw error;
      const decoded = decodeGameUiSettingsRow(data);
      if (!decoded) throw new Error('Uložení vzhledu nevrátilo platný stav.');
      if (decoded.conflict || decoded.ok === false) {
        rememberGameUiRpcSmoke('fallback', 'cas-conflict');
        writeTimedCache(gameUiSettingsCacheKey(normalized.account_number), [decoded], 'ui');
        return decoded;
      }
      rememberGameUiRpcSmoke('success');
      writeTimedCache(gameUiSettingsCacheKey(normalized.account_number), [decoded], 'ui');
      state.cacheGuard.uiSettingsSaves += 1;
      return decoded;
    } catch (err) {
      if (isSupabaseRpcUnavailableError(err)) {
        SUPABASE_RPC_HARDENING_STATUS.lastUnavailableAt = new Date().toISOString();
        SUPABASE_RPC_HARDENING_STATUS.lastUnavailableMessage = String(err && err.message ? err.message : err);
        rememberGameUiRpcSmoke('fallback', 'rpc-unavailable');
      } else {
        rememberGameUiRpcSmoke('fallback', err && err.message ? err.message : err);
      }
      throw err;
    }
  }

  async function loadRotationState() {
    // RAK_17057_SYNC_TRUTH_GUARD: prove Supabase read before declaring online.
    const client = getClient();
    state.rotationSync.lastAttemptAt = new Date().toISOString();
    state.rotationSync.lastSource = 'checking';
    try {
      if (client && navigator.onLine) {
        const { data, error } = await runSharedSupabaseRead('rotation_state.load:main', () => runSupabaseOperation('rotation_state.load', () => client.from('rotation_state').select('id,key,payload,meta,revision,updated_at').eq('key', 'main').maybeSingle(), { mode: 'read' }));
        if (error) throw error;

        const row = data || null;
        if (row && (row.payload || row.rotation)) {
          const payload = row.payload || row.rotation || null;
          state.rotationSnapshot = payload;
          state.rotationRevision = Number.isFinite(Number(row.revision)) ? Number(row.revision) : 0;
          state.rotationSync.lastReadAt = new Date().toISOString();
          state.rotationSync.lastSource = 'remote';
          state.rotationSync.lastError = null;
          state.lastError = null;
          state.rotationSync.offlinePersistence = await persistRotationOfflineSnapshot(payload, {
            revision: Number.isFinite(Number(row.revision)) ? Number(row.revision) : 0,
            remoteUpdatedAt: row.updated_at || '', source: 'remote'
          });
          return {
            id: row.key || 'main',
            payload,
            updatedAt: row.updated_at || null,
            meta: row.meta || null,
            revision: Number.isFinite(Number(row.revision)) ? Number(row.revision) : 0
          };
        }

        if (typeof loadRotationFromTables === 'function') {
          const rebuilt = await loadRotationFromTables();
          if (rebuilt && rebuilt.months && Object.keys(rebuilt.months).length) {
            state.rotationSnapshot = rebuilt;
            state.rotationSync.lastReadAt = new Date().toISOString();
            state.rotationSync.lastSource = 'tables';
            state.rotationSync.lastError = null;
            state.lastError = null;
            state.rotationSync.offlinePersistence = await persistRotationOfflineSnapshot(rebuilt, {
              revision: row && Number.isFinite(Number(row.revision)) ? Number(row.revision) : 0,
              remoteUpdatedAt: row && row.updated_at ? row.updated_at : '', source: 'tables'
            });
            return {
              id: row && row.key ? row.key : 'main',
              payload: rebuilt,
              updatedAt: row && row.updated_at ? row.updated_at : null,
              meta: { source: 'tables' }
            };
          }
        }
        const missing = new Error('Online rozpis neobsahuje platná data.');
        missing.code = 'RAK_ROTATION_EMPTY';
        throw missing;
      }
      if (navigator.onLine && !client) {
        const missingClient = new Error('Supabase klient není dostupný.');
        missingClient.code = 'RAK_SUPABASE_CLIENT_MISSING';
        throw missingClient;
      }
    } catch (err) {
      state.lastError = err;
      state.rotationSync.lastError = err;
      state.rotationSync.lastSource = 'failed';
      console.warn('Supabase rotation load failed', err);
    }

    const offline = await loadBestOfflineRotationState({ repair: true });
    if (offline && offline.payload) {
      state.rotationSnapshot = offline.payload;
      state.rotationSync.lastSource = String(offline.meta && offline.meta.source || 'offline-cache');
      // Never erase an online read error merely because a local copy exists.
      return offline;
    }

    return null;
  }

  async function saveRotationState(rotation, meta, options) {
    const client = getClient();
    if (!hasAdminWriteCredential()) return { ok: false, reason: 'admin-auth-required' };
    try {
      if (client && navigator.onLine) {
        if (shouldDeferOnlineWrite()) return { ok: false, queued: false, deferred: true, reason: 'admin-online-required' };
        const row = await runOptimizedSupabaseWrite('rotation_state.save', { rotation, meta }, () => runSupabaseOperation('rotation_state.save', () => upsertRotationStateDirect(client, rotation, meta, options || {}), { mode: 'write' }), { windowMs: 2200 });
        state.rotationSnapshot = rotation && typeof rotation === 'object' ? rotation : null;
        state.lastError = null;
        state.rotationSync.lastWriteAt = new Date().toISOString();
        state.rotationSync.lastWriteRevision = Number.isFinite(Number(row.revision)) ? Number(row.revision) : state.rotationRevision;
        state.rotationSync.lastError = null;
        state.rotationSync.offlinePersistence = await persistRotationOfflineSnapshot(state.rotationSnapshot, {
          revision: Number.isFinite(Number(row.revision)) ? Number(row.revision) : state.rotationRevision,
          remoteUpdatedAt: row.updated_at || '', source: 'remote-write'
        });
        await flushPendingWrites();
        return {
          ok: true,
          queued: false,
          verified: true,
          updatedAt: row.updated_at,
          revision: Number.isFinite(Number(row.revision)) ? Number(row.revision) : state.rotationRevision
        };
      }
      return { ok: false, queued: false, reason: 'admin-online-required' };
    } catch (err) {
      state.lastError = err;
      state.rotationSync.lastError = err;
      console.warn('Supabase rotation save failed', err);
      return { ok: false, error: err };
    }
  }

  async function listRotationBackups(options) {
    const client = getClient();
    const opts = options || {};
    if (!hasAdminWriteCredential()) return { ok: false, reason: 'admin-auth-required', backups: [] };
    if (!client || !navigator.onLine) return { ok: false, reason: 'admin-online-required', backups: [] };
    try {
      const limit = Math.max(1, Math.min(100, Number(opts.limit) || 30));
      const { data, error } = await runSupabaseOperation('rotation_backups.list_v2', () => client.rpc('rak_admin_list_rotation_backups_v2', {
        p_limit: limit
      }), { mode: 'read', attempts: 1, timeoutMs: 12000 });
      if (error) throw error;
      return { ok: true, secure: true, backups: Array.isArray(data) ? data : [], at: new Date().toISOString() };
    } catch (err) {
      state.lastError = err;
      console.warn('Supabase rotation backups list failed', err);
      return { ok: false, error: err, backups: [] };
    }
  }

  async function restoreRotationBackup(backupId, options) {
    const client = getClient();
    const opts = options || {};
    const id = String(backupId || '').trim();
    if (!hasAdminWriteCredential()) return { ok: false, reason: 'admin-auth-required' };
    if (!id) return { ok: false, reason: 'missing-backup-id' };
    if (!client || !navigator.onLine) return { ok: false, reason: 'admin-online-required' };
    try {
      const meta = opts.meta && typeof opts.meta === 'object' ? opts.meta : {};
      const { data, error } = await runSupabaseOperation('rotation_backups.restore_v2', () => client.rpc('rak_admin_restore_rotation_backup_v2', {
        p_backup_id: id,
        p_expected_revision: state.rotationRevision,
        p_meta: meta
      }), { mode: 'write', attempts: 1, timeoutMs: 16000 });
      if (error) throw error;
      const row = data && data.row ? data.row : null;
      if (row && Number.isFinite(Number(row.revision))) state.rotationRevision = Number(row.revision);
      if (row && row.payload) {
        state.rotationSnapshot = row.payload;
        state.lastError = null;
        state.rotationSync.offlinePersistence = await persistRotationOfflineSnapshot(row.payload, {
          revision: Number.isFinite(Number(row.revision)) ? Number(row.revision) : state.rotationRevision,
          remoteUpdatedAt: row.updated_at || '', source: 'restore'
        });
      }
      return { ok: true, secure: true, data: data || null, row, updatedAt: row && row.updated_at ? row.updated_at : null };
    } catch (err) {
      state.lastError = err;
      console.warn('Supabase rotation backup restore failed', err);
      return { ok: false, error: err };
    }
  }

  async function loadGomokuWins(limit, options) {
    const client = getClient();
    if (!client || !navigator.onLine) return [];
    try {
      const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
      const rulesetVersion = String(options && (options.rulesetVersion || options.ruleset_version) || window.GOMOKU_RULESET_VERSION || 'gomoku-10col-19row-ai-rules-v3').trim() || 'gomoku-10col-19row-ai-rules-v3';
      const readKey = 'gomoku_wins.load:' + safeLimit + ':' + rulesetVersion;
      const res = await runSharedSupabaseRead(readKey, () => runSupabaseOperation('gomoku_wins.load', () => client
        .from('gomoku_wins')
        .select('player_name,difficulty,moves,elapsed_ms,elapsed_text,x_moves,o_moves,created_at,app_version,ruleset_version')
        .eq('ruleset_version', rulesetVersion)
        .order('created_at', { ascending: false })
        .limit(safeLimit), { mode: 'read' }));
      if (res && res.error) throw res.error;
      return Array.isArray(res && res.data) ? res.data : [];
    } catch (err) {
      state.lastError = err;
      console.error('Supabase win list load failed', err);
      return [];
    }
  }

  async function sendGomokuWin(entry) {
    const client = getClient();
    try {
      if (client && navigator.onLine) {
        if (shouldDeferOnlineWrite()) return Object.assign(await enqueueAndMaybeFlush({ type: 'gomoku_win', entry }), { deferred: true });
        const data = await runOptimizedSupabaseWrite('gomoku_win.save', entry, () => runSupabaseOperation('gomoku_win.save', () => upsertGomokuWinDirect(client, entry), { mode: 'write', attempts: 1 }));
        await flushPendingWrites();
        return { ok: true, queued: false, data };
      }
      return await enqueueAndMaybeFlush({ type: 'gomoku_win', entry });
    } catch (err) {
      state.lastError = err;
      console.error('Supabase win insert failed', err);
      if (isLikelyOfflineError(err)) {
        return await enqueueAndMaybeFlush({ type: 'gomoku_win', entry });
      }
      return { ok: false, error: err };
    }
  }


  function getSupabasePolicyRiskHealth() {
    const snapshot = Array.isArray(SUPABASE_POLICY_AUDIT_SNAPSHOT) ? SUPABASE_POLICY_AUDIT_SNAPSHOT : [];
    const byPriority = snapshot.reduce((acc, item) => {
      const key = String(item && item.priority ? item.priority : 'PX');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const destructiveTables = snapshot
      .filter(item => /delete|reset|destruktiv/i.test(String((item && item.risk) || '') + ' ' + String((item && item.observed) || '')))
      .map(item => String(item.table || ''))
      .filter(Boolean);
    const publicWriteTables = snapshot
      .filter(item => /(public|anon).*(INSERT|UPDATE|DELETE|ALL)|INSERT|UPDATE|DELETE|ALL/i.test(String((item && item.observed) || '')))
      .map(item => String(item.table || ''))
      .filter(Boolean);
    const issues = [];
    if (byPriority.P0) issues.push('P0 Supabase/RLS: veřejné nebo anon zápisy u kritických tabulek (' + String(byPriority.P0) + ' nálezů)');
    if (destructiveTables.length) issues.push('Riziko destruktivních akcí přes veřejné policies: ' + Array.from(new Set(destructiveTables)).join(', '));
    if (publicWriteTables.length) issues.push('Veřejné/anon write policies vyžadují serverové zúžení: ' + Array.from(new Set(publicWriteTables)).join(', '));
    return {
      ok: issues.length === 0,
      mode: 'supabase-live-policy-audit-snapshot',
      version: SUPABASE_POLICY_AUDIT_SNAPSHOT_VERSION,
      checkedAt: SUPABASE_POLICY_AUDIT_SNAPSHOT_AT,
      phase: Object.assign({}, SUPABASE_POLICY_HARDENING_PHASE),
      issues: issues.slice(0, 12),
      p0Count: Number(byPriority.P0 || 0),
      p1Count: Number(byPriority.P1 || 0),
      p2Count: Number(byPriority.P2 || 0),
      publicWriteTableCount: Array.from(new Set(publicWriteTables)).length,
      destructiveTableCount: Array.from(new Set(destructiveTables)).length,
      publicWriteTables: Array.from(new Set(publicWriteTables)).slice(0, 16),
      destructiveTables: Array.from(new Set(destructiveTables)).slice(0, 16),
      findings: snapshot.map(item => Object.assign({}, item)).slice(0, 20)
    };
  }


  function getSupabaseHardeningReadiness() {
    const gameStatsSmoke = getGameStatsRpcSmokeStatus();
    const gameUiSmoke = getGameUiRpcSmokeStatus();
    const gameSessionSmoke = getGameSessionRpcSmokeStatus();
    const keepalive = getSupabaseKeepaliveStatus();
    const items = SUPABASE_HARDENING_READINESS_ITEMS.map(item => Object.assign({}, item));
    const directFallbackItems = items.filter(item => /ano|zůstává|veřejný|direct/i.test(String(item.directFallback || '')));
    const p0Items = items.filter(item => String(item.priority || '') === 'P0');
    const blockers = [];
    if (!keepalive || keepalive.status !== 'ok') blockers.push('heartbeat ještě není v lokální diagnostice OK');
    if (!gameSessionSmoke.readyForPolicyTightening) blockers.push('online hry RPC smoke ještě nemá Piškvorky i Lodě create/accept/save bez fallbacků');
    if (!gameStatsSmoke.readyForPolicyTightening) blockers.push('game_stats RPC smoke ještě nemá 3 OK bez fallbacků');
    if (!gameUiSmoke.readyForPolicyTightening) blockers.push('profile UI RPC smoke ještě nemá OK bez fallbacku');
    const confirmed = {
      tttLinkAndCode: true,
      keepaliveRpc: keepalive && keepalive.status === 'ok',
      noPolicyChangeInThisBuild: true
    };
    const smokeOkCount = [gameStatsSmoke, gameUiSmoke, gameSessionSmoke].filter(item => item && item.readyForPolicyTightening).length;
    const readinessPercent = Math.min(100, Math.round((Number(confirmed.keepaliveRpc ? 1 : 0) + smokeOkCount + 1) / 5 * 100));
    return {
      ok: blockers.length === 0,
      mode: 'supabase-hardening-readiness-audit-only',
      version: '1.2 (1.155)',
      checkedAt: new Date().toISOString(),
      confirmed,
      readinessPercent,
      policyChangeAllowedNow: false,
      policyChangeReason: 'V856 je release hygiene a SQL inventory cleanup; policies game_invites/game_sessions se v tomto buildu neutahují.',
      nextSafeStep: 'Nejdřív reálný RPC smoke create/accept/save zvlášť pro Piškvorky i Lodě bez fallbacku; potom připravit úzký SQL návrh pro jednu tabulku.',
      items,
      itemCount: items.length,
      p0Count: p0Items.length,
      directFallbackCount: directFallbackItems.length,
      directFallbackAreas: directFallbackItems.map(item => item.area).slice(0, 12),
      blockers: blockers.slice(0, 12),
      gameStatsSmoke,
      gameUiSmoke,
      gameSessionSmoke,
      keepaliveStatus: keepalive
    };
  }

  function getSupabaseStructureHealth() {
    const issues = [];
    const warnings = [];
    const configUrl = String(SUPABASE_CONFIG.url || '').trim();
    const publishableKey = String(SUPABASE_CONFIG.publishableKey || '').trim();
    const realtimeSet = new Set(REALTIME_TABLES.map((table) => String(table || '').trim()).filter(Boolean));
    const queueSet = new Set(Array.from(SUPPORTED_QUEUE_TYPES || []).map((type) => String(type || '').trim()).filter(Boolean));
    const realtimeDuplicates = REALTIME_TABLES
      .map((table) => String(table || '').trim())
      .filter((table, index, arr) => table && arr.indexOf(table) !== index);
    const expectedTables = SUPABASE_STRUCTURE_CONTRACTS.map((item) => item.table);
    const missingRealtimeTables = SUPABASE_STRUCTURE_CONTRACTS
      .filter((item) => item.realtime && !realtimeSet.has(item.table))
      .map((item) => item.table);
    const missingQueueTypes = SUPABASE_STRUCTURE_CONTRACTS
      .filter((item) => item.queueType && !queueSet.has(item.queueType))
      .map((item) => item.queueType + ' → ' + item.table);
    const missingHelpers = SUPABASE_STRUCTURE_REQUIRED_HELPERS.filter((name) => {
      try {
        if (name === 'getClient') return typeof getClient !== 'function';
        if (name === 'runSupabaseOperation') return typeof runSupabaseOperation !== 'function';
        if (name === 'runSharedSupabaseRead') return typeof runSharedSupabaseRead !== 'function';
        if (name === 'runOptimizedSupabaseWrite') return typeof runOptimizedSupabaseWrite !== 'function';
        if (name === 'readQueue') return typeof readQueue !== 'function';
        if (name === 'enqueueTask') return typeof enqueueTask !== 'function';
        if (name === 'requestRealtimeRefresh') return typeof requestRealtimeRefresh !== 'function';
        if (name === 'bindRealtime') return typeof bindRealtime !== 'function';
        if (name === 'getSupabasePerformanceHealth') return typeof getSupabasePerformanceHealth !== 'function';
        if (name === 'getSupabaseKeepaliveStatus') return typeof getSupabaseKeepaliveStatus !== 'function';
        if (name === 'getSupabaseHardeningStatus') return typeof getSupabaseHardeningStatus !== 'function';
        if (name === 'getSupabaseHardeningReadiness') return typeof getSupabaseHardeningReadiness !== 'function';
      } catch (err) {
        return true;
      }
      return false;
    });
    const requiredGrantSignals = SUPABASE_STRUCTURE_CONTRACTS.map((item) => item.table + ': ' + item.access);
    const rlsPolicyChecklist = SUPABASE_STRUCTURE_CONTRACTS.map((item) => ({
      table: item.table,
      expected: item.access,
      appUse: item.note
    }));
    const online = typeof navigator !== 'undefined' ? navigator.onLine !== false : true;
    const clientReady = !!getClient();

    if (!configUrl || !publishableKey) issues.push('chybí Supabase url/publishableKey');
    if (!clientReady) issues.push('Supabase client není připravený');
    if (missingRealtimeTables.length) issues.push('chybí realtime tabulky: ' + missingRealtimeTables.join(', '));
    if (missingQueueTypes.length) issues.push('chybí queue typy: ' + missingQueueTypes.join(', '));
    if (missingHelpers.length) issues.push('chybí Supabase helpery: ' + missingHelpers.join(', '));
    if (realtimeDuplicates.length) warnings.push('duplicitní realtime tabulky: ' + Array.from(new Set(realtimeDuplicates)).join(', '));
    if (!online) warnings.push('offline — vzdálenou Supabase strukturu nelze ověřovat za běhu');

    return {
      ok: issues.length === 0,
      mode: 'supabase-structure-rls-grant-policy-contract-audit',
      issues: issues.slice(0, 12),
      warnings: warnings.slice(0, 12),
      configReady: !!(configUrl && publishableKey),
      clientReady,
      online,
      expectedTableCount: expectedTables.length,
      expectedTables: expectedTables.slice(0, 24),
      realtimeTableCount: REALTIME_TABLES.length,
      realtimeTables: REALTIME_TABLES.slice(0, 24),
      missingRealtimeTableCount: missingRealtimeTables.length,
      missingRealtimeTables: missingRealtimeTables.slice(0, 12),
      queueTypeCount: queueSet.size,
      missingQueueTypeCount: missingQueueTypes.length,
      missingQueueTypes: missingQueueTypes.slice(0, 12),
      helperCount: SUPABASE_STRUCTURE_REQUIRED_HELPERS.length,
      missingHelperCount: missingHelpers.length,
      missingHelpers: missingHelpers.slice(0, 12),
      grantSignalCount: requiredGrantSignals.length,
      requiredGrantSignals: requiredGrantSignals.slice(0, 24),
      rlsPolicyChecklistCount: rlsPolicyChecklist.length,
      rlsPolicyChecklist: rlsPolicyChecklist.slice(0, 24),
      checkedAt: new Date().toISOString()
    };
  }

  function getSupabasePerformanceHealth() {
    const queue = readQueue();
    const queueHealth = getQueueHealth(queue);
    const perf = state.performanceGuard || {};
    const cache = state.cacheGuard || {};
    const issues = [];
    const online = typeof navigator !== 'undefined' ? navigator.onLine !== false : true;
    const clientReady = !!getClient();
    const realtimeStatus = String(state.realtimeStatus || 'idle');
    const cacheHits = Number(cache.accountCacheHits || 0) + Number(cache.statsCacheHits || 0) + Number(cache.uiCacheHits || 0) + Number(cache.sessionCacheHits || 0);
    const cacheWrites = Number(cache.accountCacheWrites || 0) + Number(cache.statsCacheWrites || 0) + Number(cache.uiCacheWrites || 0) + Number(cache.sessionCacheWrites || 0);

    if (!clientReady) issues.push('Supabase client není připravený');
    if (queueHealth && queueHealth.critical) issues.push('offline fronta má kriticky staré položky');
    if (queue.length > Math.floor(SUPABASE_QUEUE_MAX_ITEMS * 0.85)) issues.push('offline fronta je skoro plná');
    if (Number(perf.sharedReadActive || 0) > 6) issues.push('moc souběžných Supabase čtení');
    if (Number(perf.writeOptimizationActive || 0) > 4) issues.push('moc souběžných Supabase zápisů');
    if (['channel_error', 'timed_out', 'closed', 'failed'].includes(realtimeStatus.toLowerCase()) && online) issues.push('Realtime není zdravý');

    return {
      ok: issues.length === 0,
      mode: 'supabase-performance-cache-realtime-write-guard',
      issues: issues.slice(0, 12),
      online,
      clientReady,
      realtimeStatus,
      realtimeTableCount: REALTIME_TABLES.length,
      realtimeRefreshDelayMs: SUPABASE_REALTIME_REFRESH_DELAY_MS,
      realtimeRefreshHiddenDelayMs: SUPABASE_REALTIME_REFRESH_HIDDEN_DELAY_MS,
      realtimeRefreshRequests: Number(perf.realtimeRefreshRequests || 0),
      realtimeRefreshRuns: Number(perf.realtimeRefreshRuns || 0),
      realtimeRefreshCoalesced: Number(perf.realtimeRefreshCoalesced || 0),
      realtimeRefreshHiddenDefers: Number(perf.realtimeRefreshHiddenDefers || 0),
      realtimeRefreshErrors: Number(perf.realtimeRefreshErrors || 0),
      sharedReadStarts: Number(perf.sharedReadStarts || 0),
      sharedReadJoins: Number(perf.sharedReadJoins || 0),
      sharedReadActive: Number(perf.sharedReadActive || 0),
      sharedReadPeak: Number(perf.sharedReadPeak || 0),
      writeOptimizationChecks: Number(perf.writeOptimizationChecks || 0),
      writeOptimizationStarts: Number(perf.writeOptimizationStarts || 0),
      writeOptimizationJoins: Number(perf.writeOptimizationJoins || 0),
      writeOptimizationSkips: Number(perf.writeOptimizationSkips || 0),
      writeOptimizationActive: Number(perf.writeOptimizationActive || 0),
      writeOptimizationPeak: Number(perf.writeOptimizationPeak || 0),
      writeDedupeWindowMs: SUPABASE_WRITE_DEDUPE_WINDOW_MS,
      writeSharedActive: sharedWritePromises.size,
      recentWriteFingerprints: recentWriteFingerprints.size,
      lastWriteOptimizationKey: String(perf.lastWriteOptimizationKey || ''),
      lastRealtimeRefreshTable: String(perf.lastRealtimeRefreshTable || ''),
      lastRealtimeRefreshReason: String(perf.lastRealtimeRefreshReason || ''),
      lastSharedReadKey: String(perf.lastSharedReadKey || ''),
      cacheHits,
      cacheWrites,
      staleFallbacks: Number(cache.staleFallbacks || 0),
      queueLength: queue.length,
      queueMaxItems: SUPABASE_QUEUE_MAX_ITEMS,
      queueOldestAgeMs: Number(queueHealth && queueHealth.oldestAgeMs || 0),
      queueStaleTaskCount: Number(queueHealth && queueHealth.staleTaskCount || 0),
      queueCritical: !!(queueHealth && queueHealth.critical),
      checkedAt: new Date().toISOString()
    };
  }

  function getSupabaseHardeningStatus() {
    const queue = readQueue();
    const queueHealth = rememberQueueHealth(queue);
    return {
      queueLength: queue.length,
      queueMaxItems: SUPABASE_QUEUE_MAX_ITEMS,
      queueMaxBytes: SUPABASE_QUEUE_MAX_BYTES,
      realtimeStatus: state.realtimeStatus || 'idle',
      realtimeBindStartedAt: state.realtimeBindStartedAt || 0,
      lastRealtimeAt: state.lastRealtimeAt || null,
      guard: Object.assign({}, state.queueGuard),
      syncGuard: Object.assign({}, state.syncGuard),
      cacheGuard: Object.assign({}, state.cacheGuard),
      performanceGuard: Object.assign({}, state.performanceGuard),
      performanceHealth: getSupabasePerformanceHealth(),
      keepaliveStatus: getSupabaseKeepaliveStatus(),
      structureHealth: getSupabaseStructureHealth(),
      policyRiskHealth: getSupabasePolicyRiskHealth(),
      hardeningReadiness: getSupabaseHardeningReadiness(),
      rpcHardening: Object.assign({}, SUPABASE_RPC_HARDENING_STATUS, getGameStatsRpcSmokeStatus()),
      gameStatsRpcSmoke: getGameStatsRpcSmokeStatus(),
      gameUiRpcSmoke: getGameUiRpcSmokeStatus(),
      gameSessionRpcSmoke: getGameSessionRpcSmokeStatus(),
      readTimeoutMs: SUPABASE_READ_TIMEOUT_MS,
      writeTimeoutMs: SUPABASE_WRITE_TIMEOUT_MS,
      queueFlushBatchSize: SUPABASE_QUEUE_FLUSH_BATCH_SIZE,
      queueHiddenRetryDelayMs: SUPABASE_QUEUE_HIDDEN_RETRY_DELAY_MS,
      queueWakeGuardMs: SUPABASE_QUEUE_WAKE_GUARD_MS,
      queueNextRetryAt: state.syncGuard.queueNextRetryAt || null,
      queueHealth
    };
  }

  // RAK_17058_QUEUE_DIAGNOSTIC_GUARD: fixed descriptions only; never show payloads or raw errors.
  function summarizeQueuedSyncTask(task) {
    const type=String(task&&task.type||'unknown');
    const labels={rotation_state:'starší rozpis',machine_settings:'nastavení strojů',rotation_month_entries:'měsíční rozpis',gomoku_win:'výsledek hry',game_stat:'herní statistika',game_ui_settings:'vzhled profilu',game_session:'rozehraná hra',bug_report:'hlášení chyby'};
    const reason=String(task&&task.lastErrorMessage||'').toLowerCase();
    const failure=/permission|unauthoriz|forbidden|row-level|401|403|auth/.test(reason)?'oprávnění':/timeout|timed out|vypršel/.test(reason)?'časový limit':/network|offline|fetch|connection/.test(reason)?'připojení':/rate limit|429/.test(reason)?'omezení serveru':'nepotvrzené uložení';
    return {type:Object.prototype.hasOwnProperty.call(labels,type)?type:'unknown',label:labels[type]||'neznámá položka',retries:Math.max(0,Number(task&&task.retryCount||0)),conflict:!!(task&&task.conflict),failure};
  }

  function getSyncUiStatus() {
    // RAK_17057_STATUS_GUARD: only a fresh, successful Supabase read warrants green.
    const cached = readLocalSnapshot();
    const cachedRotation = loadCachedRotationState();
    const hasCache = !!((cachedRotation && cachedRotation.payload) || state.cacheGuard.rotationOfflineReady === true || (cached && Array.isArray(cached.machineSettingsRows) && cached.machineSettingsRows.length));
    const queue = readQueue();
    const queueLength = queue.length;
    const storageIssue = String(state.queueGuard && state.queueGuard.storageError || '');
    const queueIssue = queueLength ? summarizeQueuedSyncTask(queue.find(item => item && item.conflict) || queue[0]) : null;
    const online = typeof navigator !== 'undefined' ? navigator.onLine !== false : true;
    const lastError = state.rotationSync.lastError || null;
    const source = String(state.rotationSync.lastSource || 'unverified');
    const readAt = Date.parse(String(state.rotationSync.lastReadAt || ''));
    const fresh = Number.isFinite(readAt) && Date.now() - readAt >= 0 && Date.now() - readAt < 10 * 60 * 1000;
    const verified = (source === 'remote' || source === 'tables') && fresh;
    const conflictCount = queue.filter(item => !!(item && item.conflict)).length;
    const dropped = Number(state.syncGuard.queueDroppedInvalid || 0);
    const base = { queued: queueLength, hasCache, verified, source, lastReadAt: state.rotationSync.lastReadAt || null,
      conflictCount, dropped, queueIssue, storageIssue: !!storageIssue,
      offlineReady: state.cacheGuard.rotationOfflineReady === true, offlineCopies: Math.max(0, Number(state.cacheGuard.rotationOfflineCopies || 0) || 0),
      offlineSource: String(state.cacheGuard.rotationOfflineSelection || ''), offlineError: String(state.cacheGuard.rotationOfflineError || ''), hardening: getSupabaseHardeningStatus() };
    if (state.cacheGuard.rotationOfflineError === 'rotation-offline-write-failed' || (state.cacheGuard.rotationStorageError && state.cacheGuard.rotationOfflineReady !== true)) return Object.assign({}, base, {kind:'error',
      label:'🔴 Offline kopii rozpisu nelze uložit', detail:'Online rozpis je načtený, ale po zápisu se nepodařilo ověřit žádnou trvalou kopii.'});
    if (online && verified && state.cacheGuard.rotationOfflineError === 'rotation-offline-single-copy') return Object.assign({}, base, {kind:'pending',
      label:'🟡 Online · offline záloha omezená', detail:'Rozpis je online správně, ale telefon ověřil jen jednu ze dvou trvalých kopií.'});
    if (storageIssue) return Object.assign({}, base, {kind:'error',
      label:'🔴 Lokální frontu nelze uložit', detail:'Neodstraňuj data aplikace. Ručně ulož zálohu fronty přes tento indikátor.'});
    if (typeof app !== 'undefined' && app && app.adminRotationDirty === true) {
      return Object.assign({}, base, { kind: 'pending', label: '🟠 Rozpis má neuložené změny', detail: 'Úpravy v editoru nebyly potvrzeny databází.' });
    }
    if (!online) return Object.assign({}, base, {
      kind: 'offline', label: hasCache ? '🟡 Offline · uložená kopie' : '🔴 Offline · bez rozpisu',
      detail: hasCache ? 'Používá se lokální kopie; čekající změny: ' + queueLength : 'Zařízení je bez internetu.'
    });
    if (!getClient()) return Object.assign({}, base, {
      kind: 'error', label: '🔴 Supabase není připojena', detail: 'Nenačetl se klient nebo konfigurace Supabase.'
    });
    if (conflictCount) return Object.assign({}, base, {
      kind: 'error', label: '🔴 Konflikt synchronizace', detail: conflictCount + ' změn vyžaduje ověření; novější online data nebyla přepsána.'
    });
    if (dropped) return Object.assign({}, base, {
      kind: 'error', label: '🔴 Některé změny nebyly uloženy', detail: 'Zkontroluj ' + dropped + ' dříve vyřazených úloh.'
    });
    if (lastError) return Object.assign({}, base, {
      kind: 'error', label: '🔴 Online načtení selhalo',
      detail: (hasCache ? 'Zobrazuje se lokální kopie. ' : '') + 'Typ chyby: ' + String(lastError.code || lastError.name || 'neznámý').slice(0, 50)
    });
    if (queueLength) return Object.assign({}, base, {
      kind: queueIssue && queueIssue.retries > 0 ? 'error' : 'pending',
      label: (queueIssue && queueIssue.retries > 0 ? '🔴 Odeslání selhalo: ' : '🟠 Čeká na odeslání: ') + queueLength,
      detail: (queueIssue ? queueIssue.label + ' · ' : '') +
        (queueIssue && queueIssue.retries > 0 ? 'Důvod: ' + queueIssue.failure + '; další pokus bude opakován.'
          : verified ? 'Online rozpis načten; čeká na potvrzení.' : 'Čeká na ověření online stavu.')
    });
    if (!verified) return Object.assign({}, base, {
      kind: 'pending', label: hasCache ? '🟡 Cache · ověřuji online' : '🟡 Ověřuji online rozpis',
      detail: fresh ? 'Čekám na potvrzení zdroje Supabase.' : 'Čekám na nové potvrzené načtení ze Supabase.'
    });
    return Object.assign({}, base, {
      kind: 'online', label: '🟢 Online synchronizováno',
      detail: 'Rozpis potvrzen Supabase ' + new Date(readAt).toLocaleString('cs-CZ'),
      realtime: state.realtimeStatus || 'idle', lastRealtimeAt: state.lastRealtimeAt || null
    });
  }

  window.refreshPublicData = refreshPublicData;

  function init() {
    if (state.ready) {
      bindRealtimeSubscriptions();
      scheduleSupabaseKeepalive('init-ready', 1400);
      return refreshPublicData();
    }
    if (!hasClient()) {
      return refreshPublicData();
    }
    bindRealtimeSubscriptions();
    scheduleSupabaseQueueFlush('init', 650);
    scheduleSupabaseKeepalive('init', 1600);
    return refreshPublicData();
  }

  window.sendGomokuWin = sendGomokuWin;

  async function countAdminRowsDirect(client, table, configure) {
    try {
      let query = client.from(table).select('*', { count: 'exact', head: true });
      if (typeof configure === 'function') query = configure(query);
      const { count, error } = await runSupabaseOperation('admin.count.' + table, () => query, { mode: 'read', attempts: 1, timeoutMs: 9000 });
      if (error) throw error;
      return Number(count || 0) || 0;
    } catch (err) {
      return null;
    }
  }

  async function getAdminServiceSnapshotDirect(client) {
    if (!hasSecureAdminContext()) throw new Error('admin authentication required');
    const { data, error } = await runSupabaseOperation('admin.service_snapshot_v2', () => client.rpc('rak_admin_service_snapshot_v2'), { mode: 'read', attempts: 1, timeoutMs: 12000 });
    if (error) throw error;
    return Object.assign({}, data || {}, {
      sync: getSyncUiStatus(),
      bridge: getSupabaseHardeningStatus(),
      profileUiStorage: 'game_stats:' + GAME_UI_SETTINGS_TYPE
    });
  }

  async function cleanupExpiredGameInvitesDirect(client) {
    if (!hasSecureAdminContext()) throw new Error('admin authentication required');
    const { data, error } = await runSupabaseOperation('admin.cleanup_expired_game_invites_v2', () => client.rpc(
      'rak_admin_cleanup_expired_game_invites_v2'
    ), { mode: 'write', attempts: 1, timeoutMs: 12000 });
    if (error) throw error;
    return { ok: true, data: data || null, at: new Date().toISOString() };
  }

  window.RotationSupabaseBridge = {
    init,
    getAdminAuthCapabilities,
    loadAdminAuthContext,
    adminAccountRequiresAuth,
    signInAdminAccount,
    restoreAdminAuthSession,
    signOutAdminAccount,
    getAdminAccessToken,
    // RAK_SECURE_DIRECTORY_17027: same authenticated client as the admin console.
    listApplicationAccountsSecure: async () => {
      const client = getClient();
      if (!client || !hasSecureAdminContext()) return { ok: false, reason: 'admin-auth-required', rows: [] };
      const { data, error } = await client.rpc('rak_admin_list_application_accounts_v1');
      return error ? { ok: false, error, rows: [] } : { ok: true, rows: Array.isArray(data) ? data : [] };
    },
    listAdminAuthDevices,
    revokeAdminAuthDevice,
    listAdminAuthProfiles,
    createAdminSettingsBackup,
    listAdminSettingsBackups,
    getAdminSettingsBackup,
    deleteAdminSettingsBackup,
    writeAdminAudit,
    listAdminAudit,
    refreshPublicData,
    sendGomokuWin,
    loadRotationState,
    loadCachedRotationState,
    loadDurableRotationState,
    loadBestOfflineRotationState,
    persistDurableRotationState,
    persistRotationOfflineSnapshot,
    getRotationOfflineDiagnostics,
    saveRotationState,
    listRotationBackups,
    restoreRotationBackup,
    loadGomokuWins,
    loadMachineSettings,
    saveMachineSettings,
    loadRotationMonthEntries,
    saveRotationMonthEntries,
    recordTttSessionResultByInviteCode: async (code, options = {}) => {
      const client = getClient();
      if (!client || !navigator.onLine) return { ok: false, reason: 'offline' };
      try { const result = await recordTttSessionResultByInviteCodeDirect(client, code, options); state.lastError = null; return result; }
      catch (err) { state.lastError = err; console.error('TTT session result record failed', err); return { ok: false, error: err }; }
    },
    loadGameStatsForAccount: async (accountNumber, options = {}) => {
      const account = String(accountNumber || '').trim();
      const cache = readTimedCache(gameStatsAccountCacheKey(account), SUPABASE_GAME_CACHE_TTL_MS);
      const client = getClient();
      if (!client || !navigator.onLine) {
        if (cache && cache.rows) {
          rememberTimedCacheHit('stats', cache);
          return cache.rows;
        }
        return [];
      }
      try { const rows = await loadGameStatsForAccountDirect(client, account, options); state.lastError = null; return rows; }
      catch (err) {
        state.lastError = err;
        console.error('Game account stats load failed', err);
        if (cache && cache.rows) {
          rememberTimedCacheHit('stats', cache);
          return cache.rows;
        }
        return [];
      }
    },
    loadGameStats: async (gameType, limit = 10, options = {}) => {
      const safeLimit = Math.max(1, Math.min(100, Number(limit) || 10));
      const cache = readTimedCache(gameStatsCacheKey(gameType, safeLimit), SUPABASE_GAME_CACHE_TTL_MS);
      const client = getClient();
      if (!client || !navigator.onLine) {
        if (cache && cache.rows) {
          rememberTimedCacheHit('stats', cache);
          return cache.rows;
        }
        return [];
      }
      try { const rows = await loadGameStatsDirect(client, gameType, safeLimit, options); state.lastError = null; return rows; }
      catch (err) {
        state.lastError = err;
        console.error('Game stats load failed', err);
        if (cache && cache.rows) {
          rememberTimedCacheHit('stats', cache);
          return cache.rows;
        }
        return [];
      }
    },
    saveGameStat: async (payload) => {
      const client = getClient();
      if (!client || !navigator.onLine) return await enqueueAndMaybeFlush({ type: 'game_stat', entry: payload });
      try {
        if (shouldDeferOnlineWrite()) return Object.assign(await enqueueAndMaybeFlush({ type: 'game_stat', entry: payload }), { deferred: true });
        const result = Object.assign({ ok: true }, await runOptimizedSupabaseWrite('game_stat.save', payload, () => saveGameStatDirect(client, payload)));
        state.lastError = null;
        await flushPendingWrites();
        return result;
      }
      catch (err) {
        state.lastError = err;
        console.error('Game stat save failed', err);
        if (isLikelyTransientError(err)) return await enqueueAndMaybeFlush({ type: 'game_stat', entry: payload });
        return { ok: false, error: err };
      }
    },
    loadGameAccounts: async () => {
      const cache = readTimedCache(LOCAL_GAME_ACCOUNTS_KEY, SUPABASE_GAME_CACHE_TTL_MS);
      const client = getClient();
      if (!client || !navigator.onLine) {
        if (cache && cache.rows) {
          rememberTimedCacheHit('accounts', cache);
          return cache.rows;
        }
        return [];
      }
      try { const rows = await loadGameAccountsDirect(client); state.lastError = null; return rows; }
      catch (err) {
        state.lastError = err;
        console.error('Game accounts load failed', err);
        if (cache && cache.rows) {
          rememberTimedCacheHit('accounts', cache);
          return cache.rows;
        }
        return [];
      }
    },
    saveApplicationAccount: async (payload) => {
      const source = payload && typeof payload === 'object' ? payload : {};
      const accountNumber = String(source.accountNumber || source.account_number || '').replace(/\D/g, '').slice(0, 4);
      const fullName = String(source.fullName || source.full_name || '').trim().slice(0, 160);
      if (!/^\d{4}$/.test(accountNumber) || fullName.length < 2) return { ok: false, reason: 'invalid-account' };
      const client = getClient();
      if (!client || !navigator.onLine) return { ok: false, reason: 'online-required' };
      try {
        const { data, error } = await runSupabaseOperation('application_account.save', () => client.rpc('rak_admin_upsert_application_account', {
          p_account_number: accountNumber,
          p_full_name: fullName
        }), { mode: 'write', attempts: 1 });
        if (error) throw error;
        const row = normalizeSupabaseRpcJsonPayload(data) || {};
        const cached = readTimedCache(LOCAL_GAME_ACCOUNTS_KEY, SUPABASE_GAME_CACHE_TTL_MS);
        const nextRows = Array.isArray(cached && cached.rows) ? cached.rows.filter((item) => String(item && item.account_number || '') !== accountNumber) : [];
        nextRows.push({ account_number: String(row.account_number || accountNumber), full_name: String(row.full_name || fullName), updated_at: row.updated_at || new Date().toISOString() });
        writeTimedCache(LOCAL_GAME_ACCOUNTS_KEY, nextRows.sort((a, b) => String(a.account_number || '').localeCompare(String(b.account_number || ''))), 'accounts');
        state.lastError = null;
        return { ok: true, accountNumber: String(row.account_number || accountNumber), fullName: String(row.full_name || fullName) };
      } catch (err) {
        state.lastError = err;
        return { ok: false, error: err, reason: 'save-failed' };
      }
    },
    loadGameAccountUiSettings: async (accountNumber) => {
      const account = String(accountNumber || '').trim();
      const cache = readTimedCache(gameUiSettingsCacheKey(account), SUPABASE_GAME_CACHE_TTL_MS);
      const client = getClient();
      if (!account) return null;
      if (!client || !navigator.onLine) {
        if (cache && cache.rows && cache.rows[0]) { rememberTimedCacheHit('ui', cache); return cache.rows[0]; }
        return { __rakUnavailable: true, reason: navigator.onLine ? 'missing-client' : 'offline-cache-miss' };
      }
      try { const row = await loadGameAccountUiSettingsDirect(client, account); state.lastError = null; return row; }
      catch (err) {
        state.lastError = err;
        console.error('Game UI settings load failed', err);
        if (cache && cache.rows && cache.rows[0]) { rememberTimedCacheHit('ui', cache); return cache.rows[0]; }
        // RAK_17081_NETWORK_HINT_GUARD: navigator.onLine is not authoritative on iOS
        // or under abrupt network loss. A transient transport failure with no cached
        // profile is an offline cache miss, not a database/read integrity failure.
        if (typeof isLikelyTransientError === 'function' && isLikelyTransientError(err)) {
          state.cacheGuard.uiSettingsLoadFallbacks += 1;
          return { __rakUnavailable: true, reason: 'offline-cache-miss' };
        }
        return { __rakUnavailable: true, reason: 'read-failed' };
      }
    },
    saveGameAccountUiSettings: async (payload) => {
      const normalized = normalizeGameUiSettings(payload);
      const client = getClient();
      if (!normalized.account_number) return { ok: false, reason: 'missing-account' };
      if (!client || !navigator.onLine) {
        state.cacheGuard.uiSettingsSaveQueued += 1;
        return await enqueueAndMaybeFlush({ type: 'game_ui_settings', entry: normalized });
      }
      try {
        if (shouldDeferOnlineWrite()) {
          state.cacheGuard.uiSettingsSaveDeferred += 1;
          return Object.assign(await enqueueAndMaybeFlush({ type: 'game_ui_settings', entry: normalized }), { deferred: true });
        }
        const row = await runOptimizedSupabaseWrite('game_ui_settings.save:' + String(normalized.account_number || ''), normalized, () => saveGameAccountUiSettingsDirect(client, normalized), { windowMs: 2600 });
        state.lastError = null;
        await flushPendingWrites();
        return Object.assign({ ok: true, queued: false }, row || {});
      } catch (err) {
        state.cacheGuard.uiSettingsSaveErrors += 1;
        state.lastError = err;
        console.error('Game UI settings save failed', err);
        if (isLikelyTransientError(err)) {
          state.cacheGuard.uiSettingsSaveQueued += 1;
          return await enqueueAndMaybeFlush({ type: 'game_ui_settings', entry: normalized });
        }
        return { ok: false, error: err };
      }
    },
    submitBugReport: async (payload) => {
      const client = getClient();
      if (!client || !navigator.onLine) return await enqueueAndMaybeFlush({ type: 'bug_report', entry: payload });
      try {
        if (shouldDeferOnlineWrite()) return Object.assign(await enqueueAndMaybeFlush({ type: 'bug_report', entry: payload }), { deferred: true });
        const result = await runOptimizedSupabaseWrite('bug_report.save:' + String(payload && payload.id || Date.now()), payload, () => saveBugReportDirect(client, payload), { windowMs: 500 });
        state.lastError = null;
        await flushPendingWrites();
        return Object.assign({ ok: true, queued: false }, result || {});
      } catch (err) {
        state.lastError = err;
        console.error('Bug report save failed', err);
        if (isLikelyTransientError(err)) return await enqueueAndMaybeFlush({ type: 'bug_report', entry: payload });
        return { ok: false, error: err };
      }
    },
    loadBugReports: async (options = {}) => {
      const client = getClient();
      if (!client || !navigator.onLine) return { ok: false, reason: 'offline-or-missing-client', rows: [] };
      try {
        const result = await runSharedSupabaseRead('bug_reports.load:' + String(options.status || 'all') + ':' + String(options.limit || 40), () => loadBugReportsDirect(client, options || {}));
        state.lastError = null;
        return result;
      } catch (err) {
        state.lastError = err;
        console.error('Bug reports load failed', err);
        return { ok: false, error: err, rows: [] };
      }
    },
    updateBugReportStatus: async (id, status, note = '') => {
      const client = getClient();
      if (!client || !navigator.onLine) return { ok: false, reason: 'offline-or-missing-client' };
      try {
        const result = await updateBugReportStatusDirect(client, id, status, note);
        state.lastError = null;
        return result;
      } catch (err) {
        state.lastError = err;
        console.error('Bug report status update failed', err);
        return { ok: false, error: err };
      }
    },
    deleteBugReport: async (id) => {
      const client = getClient();
      if (!client || !navigator.onLine) return { ok: false, reason: 'offline-or-missing-client' };
      try {
        const result = await deleteBugReportDirect(client, id);
        state.lastError = null;
        return result;
      } catch (err) {
        state.lastError = err;
        console.error('Bug report delete failed', err);
        return { ok: false, error: err };
      }
    },
    saveDashboardAnnouncementOnline,
    clearDashboardAnnouncementOnline,
    getDashboardAnnouncementOnlineStatus,
    runSupabaseKeepalive,
    runKeepaliveNow: (reason) => runSupabaseKeepalive(reason || 'manual', { force: true }),
    getSupabaseKeepaliveStatus,
    seedFromLocalSnapshot,
    flushPendingWrites,
    bindRealtimeSubscriptions,
    getBridgeText,
    getCanteenStatus,
    getSyncUiStatus,
    getAdminServiceSnapshot: async () => {
      const client = getClient();
      if (!client || !navigator.onLine) return { ok: false, reason: 'offline-or-missing-client', counts: {} };
      try { const result = await getAdminServiceSnapshotDirect(client); state.lastError = null; return result; }
      catch (err) { state.lastError = err; console.error('Admin service snapshot failed', err); return { ok: false, error: err, counts: {} }; }
    },
    cleanupExpiredGameInvites: async () => {
      const client = getClient();
      if (!client || !navigator.onLine) return { ok: false, reason: 'offline-or-missing-client' };
      try { const result = await cleanupExpiredGameInvitesDirect(client); state.lastError = null; return result; }
      catch (err) { state.lastError = err; console.error('Expired invites cleanup failed', err); return { ok: false, error: err }; }
    },
    createGameInvite: async (payload) => {
      const client = getClient();
      if (!client || !navigator.onLine) return { ok: false, reason: 'offline-or-missing-client' };
      try { const result = Object.assign({ ok: true }, await createGameInviteDirect(client, payload)); state.lastError = null; return result; }
      catch (err) { state.lastError = err; console.error('Game invite create failed', err); return { ok: false, error: err }; }
    },
    acceptGameInvite: async (code, inviteeAccountNumber, context) => {
      const client = getClient();
      if (!client || !navigator.onLine) return { ok: false, reason: 'offline-or-missing-client' };
      try { const result = Object.assign({ ok: true }, await acceptGameInviteDirect(client, code, inviteeAccountNumber)); state.lastError = null; if (context && context.gameType) result.requestedGameType = String(context.gameType); return result; }
      catch (err) {
        state.lastError = err;
        console.error('Game invite accept failed', err);
        return { ok: false, error: err, reason: err && (err.reason || err.code) ? (err.reason || err.code) : 'invite-accept-failed', message: gameInviteErrorMessage(err, 'Pozvánku se nepodařilo přijmout.') };
      }
    },
    loadGameSessionByInviteCode: async (code) => {
      const inviteCode = normalizeInviteCode(code);
      const client = getClient();
      if (!inviteCode) return { ok: false, reason: 'missing-code' };
      if (!client || !navigator.onLine) return buildCachedSessionResult(inviteCode);
      try {
        const result = await runSharedSupabaseRead('game_session.load:' + inviteCode, async () => loadGameSessionByInviteCodeDirect(client, inviteCode));
        state.lastError = result && result.ok === false ? state.lastError : null;
        return result && typeof result === 'object' ? result : Object.assign({ ok: true }, result || {});
      }
      catch (err) {
        state.lastError = err;
        console.error('Game session load failed', err);
        const cachedResult = buildCachedSessionResult(inviteCode);
        if (cachedResult && cachedResult.ok) return Object.assign(cachedResult, { fallback: true, error: err });
        return { ok: false, error: err };
      }
    },
    saveGameSessionByInviteCode: async (code, payload) => {
      const inviteCode = normalizeInviteCode(code);
      const client = getClient();
      if (!inviteCode) return { ok: false, reason: 'missing-code' };
      if (!client || !navigator.onLine) {
        state.cacheGuard.sessionSaveQueued += 1;
        buildCachedSessionResult(inviteCode, payload);
        return await enqueueAndMaybeFlush({ type: 'game_session', inviteCode, payload });
      }
      try {
        if (shouldDeferOnlineWrite()) {
          state.cacheGuard.sessionSaveQueued += 1;
          buildCachedSessionResult(inviteCode, payload);
          return Object.assign(await enqueueAndMaybeFlush({ type: 'game_session', inviteCode, payload }), { deferred: true });
        }
        const result = Object.assign({ ok: true }, await runOptimizedSupabaseWrite('game_session.save:' + inviteCode, payload, () => saveGameSessionByInviteCodeDirect(client, inviteCode, payload), { windowMs: 1200 }));
        state.lastError = null;
        await flushPendingWrites();
        return result;
      }
      catch (err) {
        state.cacheGuard.sessionSaveErrors += 1;
        state.lastError = err;
        console.error('Game session save failed', err);
        if (isLikelyTransientError(err)) {
          state.cacheGuard.sessionSaveQueued += 1;
          buildCachedSessionResult(inviteCode, payload);
          return await enqueueAndMaybeFlush({ type: 'game_session', inviteCode, payload });
        }
        return { ok: false, error: err, reason: err && (err.reason || err.code) ? (err.reason || err.code) : 'session-save-failed', message: gameInviteErrorMessage(err, 'Online uložení se nepovedlo.') };
      }
    },
    loadTttHeadToHead: async (playerA, playerB, options = {}) => {
      const client = getClient();
      const a = String(playerA || '').trim();
      const b = String(playerB || '').trim();
      if (!a || !b) return { ok: false, reason: 'missing-players' };
      if (!client || !navigator.onLine) return { ok: false, reason: 'offline-or-missing-client' };
      try { const result = await loadTttHeadToHeadDirect(client, a, b, options); state.lastError = null; return result; }
      catch (err) { state.lastError = err; console.error('TTT head-to-head load failed', err); return { ok: false, error: err }; }
    },
    loadTttHeadToHeadList: async (options = {}) => {
      const client = getClient();
      if (!client || !navigator.onLine) return { ok: false, reason: 'offline-or-missing-client', rows: [] };
      try { const result = await loadTttHeadToHeadListDirect(client, options || {}); state.lastError = null; return result; }
      catch (err) { state.lastError = err; console.error('Head-to-head list load failed', err); return { ok: false, error: err, rows: [] }; }
    },
    loadGameHeadToHeadList: async (gameType, options = {}) => {
      const client = getClient();
      if (!client || !navigator.onLine) return { ok: false, reason: 'offline-or-missing-client', rows: [] };
      try { const result = await loadTttHeadToHeadListDirect(client, Object.assign({}, options || {}, { gameType: String(gameType || 'gomoku') || 'gomoku' })); state.lastError = null; return result; }
      catch (err) { state.lastError = err; console.error('Game head-to-head list load failed', err); return { ok: false, error: err, rows: [] }; }
    },
    resetGameProgressOnline: async (options = {}) => {
      const client = getClient();
      if (!client || !navigator.onLine) return { ok: false, reason: 'offline-or-missing-client' };
      if (!isClientGameProgressResetAllowed(options || {})) {
        return { ok: false, disabled: true, reason: 'client-maintenance-reset-disabled' };
      }
      try { const result = await resetGameProgressOnlineDirect(client, options || {}); state.lastError = result && result.ok ? null : state.lastError; return result; }
      catch (err) { state.lastError = err; console.error('Game progress reset failed', err); return { ok: false, error: err }; }
    },
    getState: () => ({ ...state })
  };

  window.flushSupabaseSyncQueue = flushPendingWrites;
  window.seedSupabaseFromLocalSnapshot = () => ({ ok: false, reason: 'admin-only-online-write' });

  window.getSupabaseAnnouncement = getBridgeText;
  window.saveRakDashboardAnnouncementOnline = (payload) => window.RotationSupabaseBridge.saveDashboardAnnouncementOnline(payload);
  window.clearRakDashboardAnnouncementOnline = () => window.RotationSupabaseBridge.clearDashboardAnnouncementOnline();
  window.getRakDashboardAnnouncementOnlineStatus = () => window.RotationSupabaseBridge.getDashboardAnnouncementOnlineStatus();
  window.getSupabaseCanteenStatus = getCanteenStatus;
  // RAK_17062_READONLY_REVIEW_GUARD: scan storage bytes without compaction, writes or remote requests.
  // Return ONLY predeclared labels and counts. Never expose names, IDs, payload, raw errors or tokens.
  function getRakPendingSyncReview() {
    const empty = {ok:false,total:0,held:0,retryable:0,unrecognized:0,remoteVerified:false,
      serverContentCompared:false,labels:[],storageIssue:true};
    let raw;
    try { raw = localStorage.getItem(LOCAL_QUEUE_KEY); }
    catch (_) { return empty; }
    if (raw === null) return Object.assign({},empty,{ok:true,storageIssue:false});
    let tasks;
    try { tasks = JSON.parse(raw); } catch (_) { return empty; }
    if (!Array.isArray(tasks)) return empty;
    const names = {rotation_state:'starší rozpis',machine_settings:'nastavení strojů',
      rotation_month_entries:'měsíční rozpis',gomoku_win:'výsledek hry',game_stat:'herní statistika',
      game_ui_settings:'vzhled profilu',game_session:'rozehraná hra',bug_report:'hlášení chyby'};
    const counts = Object.create(null);
    let held=0,unrecognized=0;
    for (const task of tasks) {
      const type = task && typeof task==='object' && !Array.isArray(task) ? task.type : null;
      const safeType = typeof type==='string' && Object.prototype.hasOwnProperty.call(names,type) ? type : 'unknown';
      counts[safeType] = (counts[safeType] || 0)+1;
      if (safeType==='unknown' || !task || typeof task.id!=='string' || !task.id) unrecognized++;
      if (task && task.conflict) held++;
    }
    const lastRead=Date.parse(String(state.rotationSync.lastReadAt||''));
    const remoteVerified=(!state.rotationSync.lastError && ['remote','tables'].includes(state.rotationSync.lastSource)
      && Number.isFinite(lastRead) && Date.now()>=lastRead && Date.now()-lastRead<600000);
    const labels=Object.keys(names).filter(key=>counts[key]).map(key=>({label:names[key],count:counts[key]}));
    if (counts.unknown) labels.push({label:'neznámá položka',count:counts.unknown});
    return {ok:unrecognized===0,total:tasks.length,held,retryable:Math.max(0,tasks.length-held),
      unrecognized,remoteVerified,serverContentCompared:false,labels,storageIssue:unrecognized>0};
  }

  // RAK_17060_QUEUE_RESCUE_EXPORT_GUARD: user-initiated, entirely local and read-only.
  function downloadPendingSyncBackup() {
    try {
      const raw = localStorage.getItem(LOCAL_QUEUE_KEY);
      if (!raw) return false;
      const filename = 'RaK_fronta_' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '.json';
      const blob = new Blob([raw], {type:'application/json;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return true;
    } catch (_) { return false; }
  }

  // RAK_17063_MANUAL_REVISION_GUARD: on-demand owner/admin only, read the
  // server revision without fetching content. Equal revisions never authorize replay.
  async function reviewRakRotationRevisionOnDemand() {
    const blocked=reason=>({ok:false,reason,serverContentCompared:false,atomicWritePerformed:false,eligibleForReplay:false});
    if(typeof navigator==='undefined'||!navigator.onLine)return blocked('offline');
    if(!hasSecureAdminContext())return blocked('admin-auth-required');
    const localQueue=getRakPendingSyncReview();
    if(localQueue.storageIssue)return blocked('local-queue-unverified');
    const client=getClient();
    if(!client||!client.auth||typeof client.auth.getUser!=='function')return blocked('missing-auth-client');
    try{
      const verified=await client.auth.getUser();
      if(verified.error||!verified.data||!verified.data.user)return blocked('identity-not-verified');
      const identity=verified.data.user;
      const auth=await client.rpc('rak_admin_context');
      const context=auth&&auth.data;
      if(auth.error||!context||context.authenticated!==true
        ||!['owner','admin'].includes(context.role)||!context.account_id
        ||!state.adminAuth.context||context.account_id!==state.adminAuth.context.account_id
        ||(context.user_id&&String(context.user_id)!==String(identity.id)))return blocked('admin-auth-required');
      const result=await client.from('rotation_state').select('revision').eq('key','main').maybeSingle();
      if(result.error||!result.data||!Number.isSafeInteger(Number(result.data.revision)))return blocked('revision-read-failed');
      const remote=Number(result.data.revision),local=state.rotationRevision;
      const localKnown=Number.isSafeInteger(local)&&local>=0;
      return {ok:true,remoteRevision:remote,localRevision:localKnown?local:null,
        state:!localKnown?'local-revision-unknown':local===remote?'revision-equal':'revision-changed',
        serverContentCompared:false,atomicWritePerformed:false,eligibleForReplay:false,
        checkedAt:new Date().toISOString()};
    }catch(_){return blocked('verification-failed');}
  }

  // RAK_17069_LOCAL_DRAFT_QUEUE_GUARD. Explicit local-only operation; never touches remote tables.
  // Preserve other queued types byte-for-byte as JSON values, including legacy/unknown entries.
  const RAK_UNSYNCED_DRAFT_PREFIX='rak_admin_unsynced_month_v1_';
  function rakInspectLocalRotationDrafts() {
    const denied=reason=>({ok:false,reason,drafts:0,rotationQueued:0,otherQueued:0,otherConflicts:0});
    if(typeof app==='undefined'||!app||app.adminUnlocked!==true||!hasSecureAdminContext())return denied('admin-required');
    if(flushPromise)return denied('queue-busy');
    try{
      const rawQueue=localStorage.getItem(LOCAL_QUEUE_KEY);
      const queue=rawQueue===null?[]:JSON.parse(rawQueue);
      if(!Array.isArray(queue))return denied('queue-invalid');
      const drafts=[];
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i);
        if(typeof key!=='string'||!key.startsWith(RAK_UNSYNCED_DRAFT_PREFIX))continue;
        if(!/^rak_admin_unsynced_month_v1_[A-Za-z0-9_-]{1,140}$/.test(key))return denied('draft-invalid');
        const raw=localStorage.getItem(key);
        if(typeof raw!=='string'||raw.length>2000000)return denied('draft-invalid');
        let value;try{value=JSON.parse(raw);}catch(_){return denied('draft-invalid');}
        if(!value||value.format!=='rak-admin-month-draft-v1'||typeof value.monthKey!=='string'
          ||!value.month||typeof value.month!=='object'||Array.isArray(value.month))return denied('draft-invalid');
        drafts.push({key,raw});
      }
      drafts.sort((a,b)=>a.key.localeCompare(b.key));
      const isRotation=task=>task&&['rotation_state','rotation_month_entries'].includes(task.type);
      const rotationQueued=queue.filter(isRotation).length;
      const others=queue.filter(task=>!isRotation(task));
      // Ephemeral fingerprint only. No payload, account, name, key or token in the UI.
      const fingerprintSource=String(rawQueue)+'\u0000'+drafts.map(item=>item.key+'\u0000'+item.raw).join('\u0000');
      let hash=2166136261;
      for(let i=0;i<fingerprintSource.length;i++)hash=Math.imul(hash^fingerprintSource.charCodeAt(i),16777619);
      return {ok:true,queue,rawQueue,drafts,rotationQueued,otherQueued:others.length,
        otherConflicts:others.filter(task=>task&&task.conflict).length,
        signature:(hash>>>0).toString(16)+':'+fingerprintSource.length+':'+drafts.length};
    }catch(_){return denied('storage-unavailable');}
  }
  function rakLocalRotationDraftCleanupPreview(){
    const state=rakInspectLocalRotationDrafts();
    return {ok:state.ok,reason:state.reason||'',drafts:state.drafts?.length||0,
      rotationQueued:state.rotationQueued||0,otherQueued:state.otherQueued||0,
      otherConflicts:state.otherConflicts||0,signature:state.signature||''};
  }
  function rakDiscardLocalRotationDrafts(expectedSignature){
    const snapshot=rakInspectLocalRotationDrafts();
    if(!snapshot.ok)return {ok:false,reason:snapshot.reason};
    if(!expectedSignature||expectedSignature!==snapshot.signature)return {ok:false,reason:'local-changed'};
    const keep=snapshot.queue.filter(task=>!task||!['rotation_state','rotation_month_entries'].includes(task.type));
    const changed=snapshot.rotationQueued>0;
    const nextQueue=JSON.stringify(keep);
    try{
      // No awaits between final snapshot, delete and verification: avoid partial user-visible success.
      if(changed){localStorage.setItem(LOCAL_QUEUE_KEY,nextQueue);
        if(localStorage.getItem(LOCAL_QUEUE_KEY)!==nextQueue)throw Error('queue-verification');}
      for(const item of snapshot.drafts){localStorage.removeItem(item.key);
        if(localStorage.getItem(item.key)!==null)throw Error('draft-verification');}
      return {ok:true,drafts:snapshot.drafts.length,rotationQueued:snapshot.rotationQueued,
        otherQueued:snapshot.otherQueued,otherConflicts:snapshot.otherConflicts};
    }catch(_){
      // Best-effort rollback is explicit. Never claim that a partly written store was cleared.
      try{
        if(changed){if(snapshot.rawQueue===null)localStorage.removeItem(LOCAL_QUEUE_KEY);
          else localStorage.setItem(LOCAL_QUEUE_KEY,snapshot.rawQueue);}
        for(const item of snapshot.drafts)localStorage.setItem(item.key,item.raw);
      }catch(_){}
      return {ok:false,reason:'storage-write-failed'};
    }
  }
  window.rakLocalRotationDraftCleanupPreview=rakLocalRotationDraftCleanupPreview;
  window.rakDiscardLocalRotationDrafts=rakDiscardLocalRotationDrafts;

  window.getSupabaseSyncStatus = getSyncUiStatus;
  window.getRakRotationOfflineDiagnostics = getRotationOfflineDiagnostics;
  window.downloadRakPendingSyncBackup = downloadPendingSyncBackup;
  window.getRakPendingSyncReview = getRakPendingSyncReview;
  window.reviewRakRotationRevisionOnDemand = reviewRakRotationRevisionOnDemand;
  window.getGameStatsRpcSmokeStatus = getGameStatsRpcSmokeStatus;
  window.getGameUiRpcSmokeStatus = getGameUiRpcSmokeStatus;
  window.getGameSessionRpcSmokeStatus = getGameSessionRpcSmokeStatus;
  window.getSupabaseHardeningStatus = getSupabaseHardeningStatus;
  window.getSupabasePerformanceHealth = getSupabasePerformanceHealth;
  window.getSupabaseKeepaliveStatus = getSupabaseKeepaliveStatus;
  window.runSupabaseKeepalive = runSupabaseKeepalive;
  window.runSupabaseKeepaliveNow = (reason) => runSupabaseKeepalive(reason || 'manual', { force: true });
  window.getSupabaseStructureHealth = getSupabaseStructureHealth;
  window.getSupabasePolicyRiskHealth = getSupabasePolicyRiskHealth;
  window.getSupabaseHardeningReadiness = getSupabaseHardeningReadiness;
  window.createGameInvite = async (payload) => window.RotationSupabaseBridge.createGameInvite(payload);
  window.acceptGameInvite = async (code, inviteeAccountNumber, context) => window.RotationSupabaseBridge.acceptGameInvite(code, inviteeAccountNumber, context);
  window.loadGameSessionByInviteCode = async (code) => window.RotationSupabaseBridge.loadGameSessionByInviteCode(code);
  window.saveGameSessionByInviteCode = async (code, payload) => window.RotationSupabaseBridge.saveGameSessionByInviteCode(code, payload);
  window.loadTttHeadToHead = async (playerA, playerB, options) => window.RotationSupabaseBridge.loadTttHeadToHead(playerA, playerB, options || {});
  window.loadTttHeadToHeadList = async (options) => window.RotationSupabaseBridge.loadTttHeadToHeadList(options || {});
  window.loadGameHeadToHeadList = async (gameType, options) => window.RotationSupabaseBridge.loadGameHeadToHeadList(gameType, options || {});
  window.loadBugReports = async (options) => window.RotationSupabaseBridge.loadBugReports(options || {});
  window.updateBugReportStatus = async (id, status, note) => window.RotationSupabaseBridge.updateBugReportStatus(id, status, note || '');
  window.deleteBugReport = async (id) => window.RotationSupabaseBridge.deleteBugReport(id);
  // v.1.5 (809): destruktivní reset herního progresu už se nevystavuje jako veřejný window helper.

  window.addEventListener('online', () => {
    requestSupabaseQueueWake('online', 350);
    scheduleRealtimeRebind('online', 900);
    void refreshPublicData();
    scheduleSupabaseKeepalive('online', 2200);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    state.syncGuard.queueVisibilityFlushes += 1;
    state.syncGuard.lastQueueVisibilityFlushAt = Date.now();
    requestSupabaseQueueWake('visible', 450);
    scheduleRealtimeRebind('visible', 1200);
    scheduleSupabaseKeepalive('visible', 2600);
  });

  window.addEventListener('pageshow', () => {
    requestSupabaseQueueWake('pageshow', 650);
    scheduleRealtimeRebind('pageshow', 1450);
    scheduleSupabaseKeepalive('pageshow', 2800);
  });

  window.addEventListener('focus', () => {
    requestSupabaseQueueWake('focus', 856);
    scheduleRealtimeRebind('focus', 1800);
    scheduleSupabaseKeepalive('focus', 3200);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    setTimeout(init, 0);
  }
})();
