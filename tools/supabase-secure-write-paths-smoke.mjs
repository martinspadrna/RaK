import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const sync = read('app-rotation-sync.js');
const bridge = read('supabase-bridge.js');
const app = read('app.js');
const sw = read('sw.js');
const config = read('supabase-config.js');
const exportJs = read('export.js');
const pkg = JSON.parse(read('package.json'));

assert(sync.includes('function installRakSupabaseSecureWriteGate()'), 'secure Supabase write gate installer missing');
assert(sync.includes('bridge.__rakSecureWriteGateV1603'), 'secure write gate idempotency marker missing');
assert(sync.includes("mode: 'secure-rpc-gate'"), 'secure write gate mode marker missing');
assert(sync.includes('capabilities.enforced === true'), 'secure write gate must require enforced RPC capabilities');
assert(sync.includes("role === 'owner' || role === 'admin'"), 'secure write gate must require admin/owner context');
assert(sync.includes('bridge.saveRotationMonthEntries = async'), 'rotation month secure gate missing');
assert(sync.includes('bridge.saveDashboardAnnouncementOnline = async'), 'announcement save secure gate missing');
assert(sync.includes('bridge.clearDashboardAnnouncementOnline = async'), 'announcement clear secure gate missing');
assert(sync.includes('bridge.loadBugReports = async'), 'bug report list secure gate missing');
assert(sync.includes('bridge.updateBugReportStatus = async'), 'bug report update secure gate missing');
assert(sync.includes('bridge.deleteBugReport = async'), 'bug report delete secure gate missing');
assert(sync.includes('bridge.submitBugReport = async'), 'bug report submission RPC capability gate missing');
assert(sync.includes('bridge.flushPendingWrites = async'), 'queued write RPC capability gate missing');
assert(sync.includes("window.addEventListener('online', () => { void ensureRakSecureRpcCapability(bridge); }"), 'online capability warm-up missing');
assert(sync.includes("writeMode: 'authenticated admin RPC save/clear only; direct table fallback closed by RaK 1.6.03'"), 'announcement RPC-only status marker missing');

assert(bridge.includes("client.rpc('rak_admin_save_rotation_v2'"), 'secure rotation RPC missing');
assert(bridge.includes("client.rpc('rak_admin_save_machine_settings_v2'"), 'secure machine settings RPC missing');
assert(bridge.includes("client.rpc('rak_admin_save_rotation_month_entries_v2'"), 'secure rotation month RPC missing');
assert(bridge.includes("client.rpc('rak_admin_save_announcement_v2'"), 'secure announcement save RPC missing');
assert(bridge.includes("client.rpc('rak_admin_clear_announcement_v2'"), 'secure announcement clear RPC missing');
assert(bridge.includes("client.rpc('rak_submit_bug_report_v2'"), 'public bug report submission RPC missing');
assert(bridge.includes("client.rpc('rak_admin_list_bug_reports_v2'"), 'secure bug report list RPC missing');
assert(bridge.includes("client.rpc('rak_admin_update_bug_report_v2'"), 'secure bug report update RPC missing');
assert(bridge.includes("client.rpc('rak_admin_delete_bug_report_v2'"), 'secure bug report delete RPC missing');
assert(bridge.includes("throw new Error('secure machine settings RPC unavailable')"), 'machine settings must remain secure-RPC-only');
assert(bridge.includes("throw new Error('admin rotation RPC unavailable')"), 'rotation state must remain secure-RPC-only');

const syncFeature = app.match(/const\s+syncFeatureFiles\s*=\s*\[([\s\S]*?)\];/);
assert(syncFeature, 'syncFeatureFiles missing');
const bridgePos = syncFeature[1].indexOf('"supabase-bridge.js"');
const syncPos = syncFeature[1].indexOf('"app-rotation-sync.js"');
assert(bridgePos >= 0 && syncPos > bridgePos, 'app-rotation-sync secure gate must load after supabase-bridge');

assert(sw.includes("'./app-rotation-sync.js?v=1.6.0'"), 'PWA must invalidate cached app-rotation-sync after secure gate update');
assert(sw.includes("const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.6.03';"), 'SW test display version must be 1.6.03');
assert(config.includes('window.RAK_RELEASE_VERSION = "1.6.03";'), 'development display release version must be 1.6.03');
assert(config.includes('window.RAK_TEST_DISPLAY_VERSION = "1.6.03";'), 'development test display version must be 1.6.03');
assert(config.includes('window.RAK_PWA_BUILD = "v1.6.03-stats1";'), 'development PWA build marker must identify stats hotfix');
assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co'), 'development must keep test Supabase ref');
assert(!config.includes('bkqamcbkiwumsvelahxr'), 'production Supabase ref must not enter development runtime config');

assert(exportJs.includes('"supabase-bridge.js": "src-supabase-bridge-js"'), 'export inventory must still include Supabase bridge');
assert(exportJs.includes('"app-rotation-sync.js": "src-app-rotation-sync-js"'), 'export inventory must still include rotation sync/security gate source');
assert(String(pkg.scripts.check || '').includes('tools/supabase-secure-write-paths-smoke.mjs'), 'secure write paths smoke must run in npm check');
assert.equal(pkg.version, '1.6.0', 'technical package version must stay 1.6.0');

console.log('[supabase-secure-write-paths-smoke] OK critical working-data writes are gated to secure RPC; visible dev build 1.6.03, internal stats1 marker; export/SW/boot links preserved');
