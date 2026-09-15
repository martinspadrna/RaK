#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bridgePath = path.join(root, 'supabase-bridge.js');
const configPath = path.join(root, 'supabase-config.js');
const swPath = path.join(root, 'sw.js');
const rotationTasksPath = path.join(root, 'rotation-tasks.js');

let bridgeJs = fs.readFileSync(bridgePath, 'utf8');
let config = fs.readFileSync(configPath, 'utf8');
let sw = fs.readFileSync(swPath, 'utf8');
const rotationTasks = fs.readFileSync(rotationTasksPath, 'utf8');

const DISPLAY_VERSION = '1.6.14';
const BUILD_ID = '1.6.14-sec1';
const bridgeSecurityMarker = "const RAK_ACTIVE_WRITE_PATHS_RPC_ONLY = '1.6.14-sec1';";

function replaceBridgeFunction(name, replacement, isAsync = true) {
  const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const asyncPart = isAsync ? 'async\\s+' : '';
  const pattern = new RegExp('  ' + asyncPart + 'function\\s+' + escaped + '\\([^\\n]*\\)\\s*\\{[\\s\\S]*?\\n  \\}\\n\\n');
  if (!pattern.test(bridgeJs)) {
    throw new Error('[secure-rpc-only-1614] Nenalezena očekávaná Supabase funkce: ' + name);
  }
  bridgeJs = bridgeJs.replace(pattern, replacement.trimEnd() + '\n\n');
}

if (!bridgeJs.includes(bridgeSecurityMarker)) {
  const configLine = '  const SUPABASE_CONFIG = window.SUPABASE_CONFIG || {};';
  if (!bridgeJs.includes(configLine)) {
    throw new Error('[secure-rpc-only-1614] Supabase bridge nemá očekávaný config marker.');
  }
  bridgeJs = bridgeJs.replace(configLine, configLine + '\n  ' + bridgeSecurityMarker);

  replaceBridgeFunction('softDeactivateDashboardAnnouncements', `  async function softDeactivateDashboardAnnouncements() {
    return { ok: false, reason: 'rpc-only', message: 'Direct announcement table fallback is disabled.' };
  }`);

  replaceBridgeFunction('saveDashboardAnnouncementViaRpc', `  async function saveDashboardAnnouncementViaRpc(client, safe, nowIso) {
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
  }`);

  replaceBridgeFunction('clearDashboardAnnouncementViaRpc', `  async function clearDashboardAnnouncementViaRpc(client, nowIso) {
    try {
      if (!hasSecureAdminContext()) return { ok: false, reason: 'admin-auth-required', shape: 'rpc-clear-v2' };
      const res = await runSupabaseOperation('announcements.rpc-clear-v2', () => client.rpc('rak_admin_clear_announcement_v2'), { mode: 'write', timeoutMs: 8000, attempts: 1 });
      if (res && res.error) return { ok: false, error: res.error, shape: 'rpc-clear-v2' };
      return { ok: true, cleared: true, count: Number(res && res.data && res.data.count || 0), shape: 'rpc-clear-v2' };
    } catch (err) {
      return { ok: false, error: err, shape: 'rpc-clear-v2' };
    }
  }`);

  replaceBridgeFunction('saveDashboardAnnouncementOnline', `  async function saveDashboardAnnouncementOnline(payload) {
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
  }`);

  replaceBridgeFunction('clearDashboardAnnouncementOnline', `  async function clearDashboardAnnouncementOnline() {
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
  }`);

  replaceBridgeFunction('upsertRotationMonthEntriesDirect', `  async function upsertRotationMonthEntriesDirect(client, monthStart, label, rows) {
    if (!hasSecureAdminContext()) throw new Error('admin authentication required');
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
    return { months: 1, entries: Number(data && data.inserted || payloadRows.length) || 0 };
  }`);

  replaceBridgeFunction('saveBugReportDirect', `  async function saveBugReportDirect(client, entry) {
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
  }`);

  replaceBridgeFunction('loadBugReportsDirect', `  async function loadBugReportsDirect(client, options = {}) {
    if (!hasSecureAdminContext()) throw new Error('admin authentication required');
    const limit = Math.max(1, Math.min(80, Number(options.limit || 40) || 40));
    const status = String(options.status || '').trim();
    const { data, error } = await runSupabaseOperation('bug_reports.rpc_list_v2', () => client.rpc('rak_admin_list_bug_reports_v2', {
      p_status: status && status !== 'all' ? normalizeBugReportStatus(status) : 'all',
      p_limit: limit
    }), { mode: 'read', attempts: 1 });
    if (error) throw error;
    return { ok: true, rows: Array.isArray(data) ? data : [] };
  }`);

  replaceBridgeFunction('updateBugReportStatusDirect', `  async function updateBugReportStatusDirect(client, id, status, note = '') {
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
  }`);

  replaceBridgeFunction('deleteBugReportDirect', `  async function deleteBugReportDirect(client, id) {
    const reportId = String(id || '').trim();
    if (!reportId) throw new Error('Chybí ID reportu.');
    if (!isBugReportUuid(reportId)) return { ok: false, reason: 'non-uuid-report-id', localOnly: true };
    if (!hasSecureAdminContext()) throw new Error('admin authentication required');
    const { data, error } = await runSupabaseOperation('bug_reports.rpc_delete_v2', () => client.rpc('rak_admin_delete_bug_report_v2', {
      p_id: reportId
    }), { mode: 'write', attempts: 1 });
    if (error) throw error;
    return data || { ok: true, id: reportId, softDeleted: true };
  }`);

  bridgeJs = bridgeJs.replace(
    "writeMode: 'RPC security definer save/clear; direct table fallback only if RPC unavailable'",
    "writeMode: 'authenticated admin RPC save/clear only; active direct table fallbacks removed in 1.6.14-sec1'"
  );
}

const forbiddenActiveWritePatterns = [
  ['announcements direct write', /\.from\(['\"]announcements['\"]\)[\s\S]{0,320}\.(?:insert|update|upsert|delete)\(/],
  ['rotation_months direct write', /\.from\(['\"]rotation_months['\"]\)[\s\S]{0,320}\.(?:insert|update|upsert|delete)\(/],
  ['rotation_entries direct write', /\.from\(['\"]rotation_entries['\"]\)[\s\S]{0,320}\.(?:insert|update|upsert|delete)\(/],
  ['bug_reports direct write', /\.from\(['\"]bug_reports['\"]\)[\s\S]{0,320}\.(?:insert|update|upsert|delete)\(/]
];
for (const [label, pattern] of forbiddenActiveWritePatterns) {
  if (pattern.test(bridgeJs)) throw new Error('[secure-rpc-only-1614] Aktivní direct write fallback zůstal: ' + label);
}

if (!bridgeJs.includes(bridgeSecurityMarker)) {
  throw new Error('[secure-rpc-only-1614] Supabase RPC-only marker nebyl vložen.');
}
if (bridgeJs.includes("client.rpc('rak_save_dashboard_announcement'") || bridgeJs.includes("client.rpc('rak_clear_dashboard_announcement'")) {
  throw new Error('[secure-rpc-only-1614] Legacy announcement RPC fallback zůstal v build outputu.');
}

const requiredRpc = [
  'rak_admin_save_rotation_v2',
  'rak_admin_save_machine_settings_v2',
  'rak_admin_save_rotation_month_entries_v2',
  'rak_admin_save_announcement_v2',
  'rak_admin_clear_announcement_v2',
  'rak_submit_bug_report_v2',
  'rak_admin_list_bug_reports_v2',
  'rak_admin_update_bug_report_v2',
  'rak_admin_delete_bug_report_v2'
];
for (const rpc of requiredRpc) {
  if (!bridgeJs.includes("client.rpc('" + rpc + "'")) {
    throw new Error('[secure-rpc-only-1614] Chybí secure RPC cesta: ' + rpc);
  }
}

// Druhý build krok jen posune viditelný checkpoint a interní PWA marker.
// První build krok 1.6.13 se při každém Vercel průchodu spustí znovu a tento krok
// ho následně deterministicky posune na 1.6.14.
config = config.replace(/^window\.RAK_RELEASE_VERSION = "1\.6\.\d+";$/m, `window.RAK_RELEASE_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_TEST_DISPLAY_VERSION = "1\.6\.\d+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_PWA_BUILD = "v1\.6\.[^"]+";$/m, `window.RAK_PWA_BUILD = "v${BUILD_ID}";`);

sw = sw.replace(/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '1\.6\.\d+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY_VERSION}';`);
sw = sw.replace(/^const DEVELOPMENT_BUILD_ID = '1\.6\.[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD_ID}';`);

if (!/^window\.RAK_RELEASE_VERSION = "1\.6\.14";$/m.test(config)
  || !/^window\.RAK_TEST_DISPLAY_VERSION = "1\.6\.14";$/m.test(config)
  || !/^window\.RAK_PWA_BUILD = "v1\.6\.14-sec1";$/m.test(config)) {
  throw new Error('[secure-rpc-only-1614] Development visible/build verze není 1.6.14-sec1.');
}
if (!/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '1\.6\.14';$/m.test(sw)
  || !/^const DEVELOPMENT_BUILD_ID = '1\.6\.14-sec1';$/m.test(sw)) {
  throw new Error('[secure-rpc-only-1614] SW verze není 1.6.14-sec1.');
}
if (!sw.includes("strategy: 'navigation-network-first;build-static-cache-first;isolated-prewarm'")) {
  throw new Error('[secure-rpc-only-1614] PWA navigace musí zůstat network-first.');
}
if (!rotationTasks.includes("const RAK_SHARED_MSKC01_TASKS_MODE = '1.6.13-two-lathes';")
  || !rotationTasks.includes("tasksForMachine('MSKC01', normalizedShift)")) {
  throw new Error('[secure-rpc-only-1614] 1.6.13 sdílení úkolů MSKC01 se nesmí ztratit.');
}

fs.writeFileSync(bridgePath, bridgeJs, 'utf8');
fs.writeFileSync(configPath, config, 'utf8');
fs.writeFileSync(swPath, sw, 'utf8');
console.log('[secure-rpc-only-1614] OK RaK 1.6.14 active Supabase writes RPC-only; 1.6.13 MSKC01 tasks preserved; stable boot + network-first preserved');
