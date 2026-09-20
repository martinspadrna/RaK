#!/usr/bin/env node
// RaK 1.7.57: truthful online/cache status and conflict-safe queue replay. TEST only.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.57', BUILD='v1.7.57-synctruth1', PREVIOUS='v1.7.56-authprobe1';
const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>fs.writeFileSync(p,s,'utf8');
function once(source,before,after,name){
 if(source.includes(after))return source;
 assert(source.includes(before),'[17057] missing '+name);
 assert.equal(source.split(before).length,2,'[17057] ambiguous '+name);
 return source.replace(before,after);
}
let bridge=read('supabase-bridge.js');
if(!bridge.includes('// RAK_17057_SYNC_TRUTH_GUARD')){
 bridge=once(bridge,
  '  async function loadRotationState() {\n    const client = getClient();',
  "  async function loadRotationState() {\n    // RAK_17057_SYNC_TRUTH_GUARD: prove Supabase read before declaring online.\n    const client = getClient();\n    state.rotationSync.lastAttemptAt = new Date().toISOString();\n    state.rotationSync.lastSource = 'checking';",
  'load begins with unverified status');
 const loadStart=bridge.indexOf('  async function loadRotationState() {');
 const loadEnd=bridge.indexOf('\n  async function saveRotationState(',loadStart);
 assert(loadStart>=0&&loadEnd>loadStart&&loadEnd-loadStart<4400,'rotation load boundaries');
 let load=bridge.slice(loadStart,loadEnd);
 load=once(load,
  '          state.rotationSync.lastReadAt = new Date().toISOString();',
  "          state.rotationSync.lastReadAt = new Date().toISOString();\n          state.rotationSync.lastSource = 'remote';",
  'real remote read');
 load=once(load,
  '            state.rotationSnapshot = rebuilt;\n            state.lastError = null;',
  "            state.rotationSnapshot = rebuilt;\n            state.rotationSync.lastReadAt = new Date().toISOString();\n            state.rotationSync.lastSource = 'tables';\n            state.rotationSync.lastError = null;\n            state.lastError = null;",
  'table-backed online read');
 load=once(load,
  '        }\n      }\n    } catch (err) {\n      state.lastError = err;',
  "        }\n        const missing = new Error('Online rozpis neobsahuje platná data.');\n        missing.code = 'RAK_ROTATION_EMPTY';\n        throw missing;\n      }\n      if (navigator.onLine && !client) {\n        const missingClient = new Error('Supabase klient není dostupný.');\n        missingClient.code = 'RAK_SUPABASE_CLIENT_MISSING';\n        throw missingClient;\n      }\n    } catch (err) {\n      state.lastError = err;",
  'empty/missing online read classified');
 load=once(load,
  '      state.rotationSync.lastError = err;\n      console.warn',
  "      state.rotationSync.lastError = err;\n      state.rotationSync.lastSource = 'failed';\n      console.warn",
  'preserve load error');
 load=once(load,
  '      state.rotationSnapshot = snapshot.rotation;\n      state.lastError = null;',
  "      state.rotationSnapshot = snapshot.rotation;\n      state.rotationSync.lastSource = 'cache';\n      // Never erase an online read error merely because a local copy exists.",
  'cache must not erase network failure');
 bridge=bridge.slice(0,loadStart)+load+bridge.slice(loadEnd);
 bridge=once(bridge,
  "          if (task.type === 'rotation_state') {\n            dropped += 1;\n            state.syncGuard.queueDroppedInvalid += 1;\n          } else if (task.type === 'machine_settings') {\n            dropped += 1;\n            state.syncGuard.queueDroppedInvalid += 1;\n          } else if (task.type === 'rotation_month_entries') {\n            dropped += 1;\n            state.syncGuard.queueDroppedInvalid += 1;",
  "          if (task.type === 'rotation_state' || task.type === 'machine_settings' || task.type === 'rotation_month_entries') {\n            // Legacy admin writes cannot be replayed without a fresh signed Auth session\n            // and revision validation. Preserve them for explicit admin reconciliation.\n            remaining.push(Object.assign({}, task, { conflict: 'admin-review-required' }));\n            state.syncGuard.queueConflictHolds = Number(state.syncGuard.queueConflictHolds || 0) + 1;",
  'unsafe legacy queue drops');
 bridge=once(bridge,
  "          } else if (task.type === 'game_ui_settings') {\n            await saveGameAccountUiSettingsDirect(client, task.entry);",
  "          } else if (task.type === 'game_ui_settings') {\n            const entry = task.entry || {};\n            const account = String(entry.account_number || entry.accountNumber || '').trim();\n            const queuedAt = Date.parse(String(task.queuedAt || ''));\n            if (!account || !Number.isFinite(queuedAt)) {\n              remaining.push(Object.assign({}, task, { conflict: 'unverified-local-version' }));\n              state.syncGuard.queueConflictHolds = Number(state.syncGuard.queueConflictHolds || 0) + 1;\n              continue;\n            }\n            const profile = await runSupabaseOperation('queue.game_ui.version', () => client.from('game_stats').select('updated_at').eq('account_number', account).eq('game_type', GAME_UI_SETTINGS_TYPE).order('updated_at', { ascending: false }).limit(1), { mode: 'read', attempts: 1 });\n            if (profile.error) throw profile.error;\n            const remoteAt = Date.parse(String(profile.data && profile.data[0] && profile.data[0].updated_at || ''));\n            if (Number.isFinite(remoteAt) && remoteAt > queuedAt) {\n              remaining.push(Object.assign({}, task, { conflict: 'newer-online-state' }));\n              state.syncGuard.queueConflictHolds = Number(state.syncGuard.queueConflictHolds || 0) + 1;\n              continue;\n            }\n            await saveGameAccountUiSettingsDirect(client, task.entry);",
  'profile UI conflict read before write');
 bridge=once(bridge,
  "          } else if (task.type === 'game_session') {\n            await saveGameSessionByInviteCodeDirect(client, task.inviteCode || task.code, task.payload);",
  "          } else if (task.type === 'game_session') {\n            const code = task.inviteCode || task.code;\n            const queuedAt = Date.parse(String(task.queuedAt || ''));\n            if (!code || !Number.isFinite(queuedAt)) {\n              remaining.push(Object.assign({}, task, { conflict: 'unverified-local-version' }));\n              state.syncGuard.queueConflictHolds = Number(state.syncGuard.queueConflictHolds || 0) + 1;\n              continue;\n            }\n            const current = await loadGameSessionByInviteCodeDirect(client, code);\n            if (!current || current.ok !== true) throw new Error('Před odesláním hry se nepodařilo ověřit online stav.');\n            const remoteAt = Date.parse(String(current.session && current.session.updated_at || ''));\n            if (Number.isFinite(remoteAt) && remoteAt > queuedAt) {\n              remaining.push(Object.assign({}, task, { conflict: 'newer-online-state' }));\n              state.syncGuard.queueConflictHolds = Number(state.syncGuard.queueConflictHolds || 0) + 1;\n              continue;\n            }\n            await saveGameSessionByInviteCodeDirect(client, code, task.payload);",
  'game replay conflict guard');
 const statusStart=bridge.indexOf('  function getSyncUiStatus() {');
 const statusEnd=bridge.indexOf('\n  window.refreshPublicData = refreshPublicData;',statusStart);
 assert(statusStart>=0&&statusEnd>statusStart&&statusEnd-statusStart<4800,'sync status boundaries');
 const status=`  function getSyncUiStatus() {
    // RAK_17057_STATUS_GUARD: only a fresh, successful Supabase read warrants green.
    const cached = readLocalSnapshot();
    const hasCache = !!(cached && (cached.rotation || (Array.isArray(cached.machineSettingsRows) && cached.machineSettingsRows.length)));
    const queue = readQueue();
    const queueLength = queue.length;
    const online = typeof navigator !== 'undefined' ? navigator.onLine !== false : true;
    const lastError = state.rotationSync.lastError || null;
    const source = String(state.rotationSync.lastSource || 'unverified');
    const readAt = Date.parse(String(state.rotationSync.lastReadAt || ''));
    const fresh = Number.isFinite(readAt) && Date.now() - readAt >= 0 && Date.now() - readAt < 10 * 60 * 1000;
    const verified = (source === 'remote' || source === 'tables') && fresh;
    const conflictCount = queue.filter(item => !!(item && item.conflict)).length;
    const dropped = Number(state.syncGuard.queueDroppedInvalid || 0);
    const base = { queued: queueLength, hasCache, verified, source, lastReadAt: state.rotationSync.lastReadAt || null,
      conflictCount, dropped, hardening: getSupabaseHardeningStatus() };
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
      kind: 'pending', label: '🟠 Čeká na odeslání: ' + queueLength,
      detail: verified ? 'Online rozpis načten; změny stále čekají na potvrzení.' : 'Online rozpis ještě nebyl ověřen; čekající změny jsou zachované.'
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
`;
 bridge=bridge.slice(0,statusStart)+status+bridge.slice(statusEnd);
 write('supabase-bridge.js',bridge);
}
assert(bridge.includes('RAK_17057_SYNC_TRUTH_GUARD')&&bridge.includes('RAK_17057_STATUS_GUARD')&&bridge.includes('newer-online-state'),'bridge sync patch missing');
let rotation=read('app-rotation-sync.js');
if(!rotation.includes('RAK_17057_BADGE_GUARD')){
 rotation=once(rotation,
  'function refreshRakMachineSettingsInBackground(bridge) {',
  `// RAK_17057_BADGE_GUARD: update only the status node after async sync settles.
function rakRefreshSyncBadgeTruth() {
  try {
    const badge = document.getElementById('dashboardSyncBadge');
    if (!badge || typeof window.getSupabaseSyncStatus !== 'function') return;
    const status = window.getSupabaseSyncStatus();
    if (!status || !['online', 'pending', 'offline', 'error'].includes(status.kind)) return;
    badge.className = 'dashboardSyncBadge dashboardSyncBadge--' + status.kind;
    badge.textContent = String(status.label || 'Stav synchronizace neznámý');
    badge.title = String(status.detail || 'Stav synchronizace RaK');
  } catch (_) {}
}
window.__rakRefreshSyncBadgeTruth = rakRefreshSyncBadgeTruth;
window.addEventListener('online', rakRefreshSyncBadgeTruth);
window.addEventListener('offline', rakRefreshSyncBadgeTruth);
window.addEventListener('pageshow', rakRefreshSyncBadgeTruth);

function refreshRakMachineSettingsInBackground(bridge) {`,
  'truthful badge refresh helper');
 rotation=once(rotation,
  "  } catch (err) {\n    console.warn('Supabase rotation sync failed', err);\n    return null;\n  }\n}\n\nfunction getRakAdminPinForWrite() {",
  "  } catch (err) {\n    console.warn('Supabase rotation sync failed', err);\n    return null;\n  } finally {\n    rakRefreshSyncBadgeTruth();\n  }\n}\n\nfunction getRakAdminPinForWrite() {",
  'update after async rotation read');
 write('app-rotation-sync.js',rotation);
}
assert(rotation.includes('RAK_17057_BADGE_GUARD')&&rotation.includes('rakRefreshSyncBadgeTruth();'),'badge patch missing');
let dashboard=read('dashboard.js');
if(!dashboard.includes('RAK_17057_MANUAL_TRUTH_GUARD')){
 dashboard=once(dashboard,
  "      const value = await fn();\n      result.steps.push({ name, ok: true });",
  "      const value = await fn();\n      if (value && typeof value === 'object' && value.ok === false) {\n        result.ok = false;\n        result.steps.push({ name, ok: false, reason: String(value.reason || 'operation-rejected') });\n        return value;\n      }\n      result.steps.push({ name, ok: true });",
  'manual sync rejected result');
 dashboard=once(dashboard,
  "    RAK_DASHBOARD_MANUAL_SYNC_STATE.lastAt = Date.now();\n    RAK_DASHBOARD_MANUAL_SYNC_STATE.lastText = result.ok ?",
  "    // RAK_17057_MANUAL_TRUTH_GUARD: successful steps are not proof of an online rotation read.\n    const actual = typeof getSupabaseSyncStatus === 'function' ? getSupabaseSyncStatus() : null;\n    if (!actual || actual.kind !== 'online' || actual.queued !== 0 || actual.verified !== true) result.ok = false;\n    RAK_DASHBOARD_MANUAL_SYNC_STATE.lastAt = Date.now();\n    RAK_DASHBOARD_MANUAL_SYNC_STATE.lastText = result.ok ?",
  'manual success verified against real status');
 write('dashboard.js',dashboard);
}
assert(dashboard.includes('RAK_17057_MANUAL_TRUTH_GUARD'),'manual truth patch missing');
const smoke='tools/shift-report-mo-hotfix-170-smoke.mjs';
let replay=read(smoke);
if(!replay.includes('// RAK_17057_TWO_PASS_GUARD')){
 replay=once(replay,
  `// RAK_17056_TWO_PASS_GUARD\nconst already17056=indexSource.includes("var build='${PREVIOUS}';");`,
  `// RAK_17056_TWO_PASS_GUARD\n// RAK_17057_TWO_PASS_GUARD\nconst already17057=indexSource.includes("var build='${BUILD}';");\nconst already17056=already17057||indexSource.includes("var build='${PREVIOUS}';");`,
  'second-pass guard');
 replay=once(replay,
  `already17056?"var build='${PREVIOUS}';":already17055?`,
  `already17057?"var build='${BUILD}';":already17056?"var build='${PREVIOUS}';":already17055?`,
  'second-pass rollback marker');
 write(smoke,replay);
}
assert(replay.includes('// RAK_17057_TWO_PASS_GUARD')&&replay.includes(`already17057?"var build='${BUILD}';":already17056?`),'replay guard missing');
for(const [file,before,after] of [
 ['supabase-config.js','window.RAK_RELEASE_VERSION = "1.7.56";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['supabase-config.js','window.RAK_TEST_DISPLAY_VERSION = "1.7.56";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`],
 ['supabase-config.js',`window.RAK_PWA_BUILD = "${PREVIOUS}";`,`window.RAK_PWA_BUILD = "${BUILD}";`],
 ['app.js',`const RAK_DEV_UPDATE_BUILD = "${PREVIOUS}";`,`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],
 ['app.js','window.RAK_RELEASE_VERSION = "1.7.56";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['sw.js',"const CACHE_VERSION = 'v1.7.56';",`const CACHE_VERSION = 'v${VERSION}';`],
 ['sw.js',"const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.56';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],
 ['sw.js',`const DEVELOPMENT_BUILD_ID = '${PREVIOUS}';`,`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],
 ['index.html',`var build='${PREVIOUS}';`,`var build='${BUILD}';`]
])write(file,once(read(file),before,after,'release '+file));
assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'),'test Supabase isolation');
assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"),'OS-only login changed');
for(const file of ['supabase-bridge.js','app-rotation-sync.js','dashboard.js','app.js','sw.js','supabase-config.js',smoke,'tools/development-version-17057.mjs'])execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
execFileSync(process.execPath,['--test','tools/release-gate-17057.test.mjs'],{stdio:'inherit'});
console.log('[development-version-17057] PASS TEST-only truthful sync, conflict-safe pending replay, version 1.7.57');
