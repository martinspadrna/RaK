#!/usr/bin/env node
// RaK 1.7.60: durable sync queue, same-ID race retention and opt-in local rescue export.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.60', BUILD='v1.7.60-queuedurability1', PREVIOUS='v1.7.59-queueintegrity1';
const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>fs.writeFileSync(p,s,'utf8');
function once(s,b,a,label){if(s.includes(a))return s;assert(s.includes(b),'[17060] missing '+label);assert.equal(s.split(b).length,2,'[17060] ambiguous '+label);return s.replace(b,a);}
let bridge=read('supabase-bridge.js');
assert(bridge.includes('RAK_17059_QUEUE_PRESERVE_GUARD')&&bridge.includes('RAK_17058_QUEUE_RETRY_GUARD'),'1.7.59 required');
if(!bridge.includes('RAK_17060_DURABLE_QUEUE_GUARD')){
 const start=bridge.indexOf('  function readQueue() {');
 const end=bridge.indexOf('\n  function isLikelyOfflineError(',start);
 assert(start>=0&&end>start&&end-start<2600,'queue storage boundaries changed');
 const durable=`  // RAK_17060_DURABLE_QUEUE_GUARD: invalid JSON is never rewritten as an empty queue.
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
    if (state.queueGuard.storageError === 'corrupt' || state.queueGuard.storageError === 'unavailable') state.queueGuard.storageError = '';
    const compacted = compactQueue(queue);
    if (compacted.length !== queue.length && !writeQueue(compacted)) state.queueGuard.storageError = 'write-failed';
    return compacted;
  }

  function writeQueue(queue) {
    if (state.queueGuard.storageError === 'corrupt' || state.queueGuard.storageError === 'unavailable') return false;
    try {
      const payload = JSON.stringify(compactQueue(Array.isArray(queue) ? queue : []));
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
`;
 bridge=bridge.slice(0,start)+durable+bridge.slice(end);
 const fstart=bridge.indexOf('  async function flushPendingWrites() {');
 const fend=bridge.indexOf('\n  async function enqueueAndMaybeFlush(',fstart);
 assert(fstart>=0&&fend>fstart&&fend-fstart<16000,'flush boundaries');
 let flush=bridge.slice(fstart,fend);
 flush=once(flush,'      const queue = readQueue();\n      const initialHealth = rememberQueueHealth(queue);',
   "      const queue = readQueue();\n      if (state.queueGuard.storageError) return { ok: false, reason: 'queue-storage-failed', remaining: queue.length };\n      const initialHealth = rememberQueueHealth(queue);",'fail closed before remote writes');
 flush=once(flush,
   "      const addedDuringFlush = readQueue().filter(task => !initialIds.has(String(task && task.id || '')));\n      const finalQueue = remaining.concat(addedDuringFlush);\n      writeQueue(finalQueue);",
   `      // RAK_17060_SAME_ID_RACE_GUARD: a later edit with the same task id wins locally.
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
      if (!writeQueue(finalQueue)) return {ok:false,reason:'queue-storage-failed',remaining:currentQueue.length};`,
   'retain modified same-id queue entries and verify storage');
 bridge=bridge.slice(0,fstart)+flush+bridge.slice(fend);
 const statusStart=bridge.indexOf('  function getSyncUiStatus() {'),statusEnd=bridge.indexOf('\n  window.refreshPublicData = refreshPublicData;',statusStart);
 assert(statusStart>=0&&statusEnd>statusStart&&statusEnd-statusStart<6200,'status boundaries');
 let status=bridge.slice(statusStart,statusEnd);
 status=once(status,'    const queueLength = queue.length;',
  "    const queueLength = queue.length;\n    const storageIssue = String(state.queueGuard && state.queueGuard.storageError || '');",'storage error status');
 status=once(status,'      conflictCount, dropped, queueIssue, hardening: getSupabaseHardeningStatus() };',
  '      conflictCount, dropped, queueIssue, storageIssue: !!storageIssue, hardening: getSupabaseHardeningStatus() };', 'status exposes boolean only');
 status=once(status,"    if (typeof app !== 'undefined' && app && app.adminRotationDirty === true) {",
  "    if (storageIssue) return Object.assign({}, base, {kind:'error',\n      label:'🔴 Lokální frontu nelze uložit', detail:'Neodstraňuj data aplikace. Ručně ulož zálohu fronty přes tento indikátor.'});\n    if (typeof app !== 'undefined' && app && app.adminRotationDirty === true) {",'never show green with broken storage');
 bridge=bridge.slice(0,statusStart)+status+bridge.slice(statusEnd);
 const exportHelper=`  // RAK_17060_QUEUE_RESCUE_EXPORT_GUARD: user-initiated, entirely local and read-only.
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

`;
 bridge=once(bridge,'  window.getSupabaseSyncStatus = getSyncUiStatus;',exportHelper+'  window.getSupabaseSyncStatus = getSyncUiStatus;\n  window.downloadRakPendingSyncBackup = downloadPendingSyncBackup;','manual backup export');
 write('supabase-bridge.js',bridge);
}
assert(bridge.includes('RAK_17060_DURABLE_QUEUE_GUARD')&&bridge.includes('RAK_17060_SAME_ID_RACE_GUARD')&&bridge.includes('RAK_17060_QUEUE_RESCUE_EXPORT_GUARD'));
let dashboard=read('dashboard.js');
if(!dashboard.includes('RAK_17060_MANUAL_RESCUE_GUARD')){
 const start=dashboard.indexOf('    // RAK_17059_DIAGNOSTIC_DIALOG_GUARD:');
 const end=dashboard.indexOf('\n    const restore = () =>',start);
 assert(start>=0&&end>start&&end-start<2800,'manual badge boundaries changed');
 let section=dashboard.slice(start,end);
 section += `
    // RAK_17060_MANUAL_RESCUE_GUARD: no deletion, silent upload or automatic override.
    if (actual && (actual.storageIssue || actual.conflictCount > 0)
      && (source === 'dashboard-click' || source === 'dashboard-keyboard')
      && typeof window.confirm === 'function'
      && window.confirm('Neodeslané změny mohou obsahovat osobní údaje. Chceš uložit jejich soukromou zálohu do zařízení? Nejde o odeslání na server.')) {
      const saved = typeof window.downloadRakPendingSyncBackup === 'function' && window.downloadRakPendingSyncBackup();
      if (!saved && typeof window.alert === 'function') window.alert('Zálohu se nepodařilo vytvořit. Neodstraňuj data aplikace.');
    }
    if (actual && actual.storageIssue && !actual.queued && (source === 'dashboard-click' || source === 'dashboard-keyboard')
      && typeof window.alert === 'function') window.alert('Lokální frontu nelze ověřit. Neodstraňuj data aplikace a použij zálohu přes nabídku.');`;
 dashboard=dashboard.slice(0,start)+section+dashboard.slice(end);
 write('dashboard.js',dashboard);
}
let replay=read('tools/shift-report-mo-hotfix-170-smoke.mjs');
if(!replay.includes('RAK_17060_TWO_PASS_GUARD')){
 replay=once(replay,`// RAK_17059_TWO_PASS_GUARD\nconst already17059=indexSource.includes("var build='${PREVIOUS}';");`,
  `// RAK_17059_TWO_PASS_GUARD\n// RAK_17060_TWO_PASS_GUARD\nconst already17060=indexSource.includes("var build='${BUILD}';");\nconst already17059=already17060||indexSource.includes("var build='${PREVIOUS}';");`,'replay marker');
 replay=once(replay,`already17059?"var build='${PREVIOUS}';":already17058?`,
  `already17060?"var build='${BUILD}';":already17059?"var build='${PREVIOUS}';":already17058?`,'two-pass current build');
 write('tools/shift-report-mo-hotfix-170-smoke.mjs',replay);
}
for(const [path,from,to] of [
 ['supabase-config.js','window.RAK_RELEASE_VERSION = "1.7.59";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['supabase-config.js','window.RAK_TEST_DISPLAY_VERSION = "1.7.59";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`],
 ['supabase-config.js',`window.RAK_PWA_BUILD = "${PREVIOUS}";`,`window.RAK_PWA_BUILD = "${BUILD}";`],
 ['app.js',`const RAK_DEV_UPDATE_BUILD = "${PREVIOUS}";`,`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],
 ['app.js','window.RAK_RELEASE_VERSION = "1.7.59";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['sw.js',"const CACHE_VERSION = 'v1.7.59';",`const CACHE_VERSION = 'v${VERSION}';`],
 ['sw.js',"const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.59';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],
 ['sw.js',`const DEVELOPMENT_BUILD_ID = '${PREVIOUS}';`,`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],
 ['index.html',`var build='${PREVIOUS}';`,`var build='${BUILD}';`]
])write(path,once(read(path),from,to,'release '+path));
assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"));
for(const path of ['supabase-bridge.js','dashboard.js','app.js','supabase-config.js','sw.js','tools/shift-report-mo-hotfix-170-smoke.mjs','tools/development-version-17060.mjs'])execFileSync(process.execPath,['--check',path],{stdio:'pipe'});
execFileSync(process.execPath,['--test','tools/release-gate-17060.test.mjs'],{stdio:'inherit'});
console.log('[development-version-17060] PASS durable storage, same-ID race, manual local backup, TEST-only release');
