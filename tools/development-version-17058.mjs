#!/usr/bin/env node
// RaK 1.7.58: preserve failed writes, schedule real retries, explain pending items. TEST only.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.58',BUILD='v1.7.58-queuerecovery1',PREVIOUS='v1.7.57-synctruth1';
const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>fs.writeFileSync(p,s,'utf8');
function once(s,b,a,label){if(s.includes(a))return s;assert(s.includes(b),'[17058] missing '+label);assert.equal(s.split(b).length,2,'[17058] ambiguous '+label);return s.replace(b,a);}
let bridge=read('supabase-bridge.js');
assert(bridge.includes('RAK_17057_SYNC_TRUTH_GUARD')&&bridge.includes('RAK_17057_STATUS_GUARD'),'1.7.57 required');
if(!bridge.includes('// RAK_17058_QUEUE_RETRY_GUARD')){
 const begin=bridge.indexOf('  async function flushPendingWrites() {');
 const end=bridge.indexOf('\n  async function enqueueAndMaybeFlush(',begin);
 assert(begin>=0&&end>begin&&end-begin<13000,'queue boundaries changed');
 let flush=bridge.slice(begin,end);
 flush=once(flush,'  async function flushPendingWrites() {\n    if (flushPromise) return flushPromise;\n    flushPromise = (async () => {',
 '  async function flushPendingWrites() {\n    if (flushPromise) return flushPromise;\n    // RAK_17058_QUEUE_RETRY_GUARD: schedule after clearing the active promise.\n    let queueRetryDelay = null;\n    flushPromise = (async () => {','retry after promise');
 flush=once(flush,'        const originalTask = queue[i];\n        if (shouldSkipQueuedTaskForBackoff(originalTask)) {',
 "        const originalTask = queue[i];\n        if (originalTask && originalTask.conflict) { remaining.push(originalTask); continue; }\n        if (shouldSkipQueuedTaskForBackoff(originalTask)) {",'hold conflicts');
 flush=once(flush,"            if (shouldDropInvalidQueuedTask(failedUnknown, new Error('invalid queue task'))) {\n              dropped += 1;\n              state.syncGuard.queueDroppedInvalid += 1;\n            } else {\n              remaining.push(failedUnknown);\n            }",
 "            remaining.push(Object.assign({}, failedUnknown, { conflict: 'unknown-task' }));\n            state.syncGuard.queueConflictHolds = Number(state.syncGuard.queueConflictHolds || 0) + 1;",'keep unknown tasks');
 flush=once(flush,"          if (shouldDropInvalidQueuedTask(failedTask, err)) {\n            dropped += 1;\n            state.syncGuard.queueDroppedInvalid += 1;\n            console.warn('Supabase queued sync dropped invalid task', err);\n            continue;\n          }",
 "          if (isLikelyPermanentQueueError(err)) {\n            remaining.push(Object.assign({}, failedTask, { conflict: 'write-rejected' }), ...queue.slice(i + 1));\n            state.syncGuard.queueConflictHolds = Number(state.syncGuard.queueConflictHolds || 0) + 1;\n            break;\n          }",'keep rejected tasks');
 const tail=flush.indexOf('      writeQueue(remaining);');
 assert(tail>=0&&flush.includes('    return flushPromise;\n  }'),'queue tail changed');
 flush=flush.slice(0,tail)+`      // Preserve tasks queued while a network call was in progress.
      const initialIds = new Set(queue.map(task => String(task && task.id || '')).filter(Boolean));
      const addedDuringFlush = readQueue().filter(task => !initialIds.has(String(task && task.id || '')));
      const finalQueue = remaining.concat(addedDuringFlush);
      writeQueue(finalQueue);
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
`;
 bridge=bridge.slice(0,begin)+flush+bridge.slice(end);
 bridge=once(bridge,'  function getSyncUiStatus() {',`  // RAK_17058_QUEUE_DIAGNOSTIC_GUARD: fixed descriptions only; never show payloads or raw errors.
  function summarizeQueuedSyncTask(task) {
    const type=String(task&&task.type||'unknown');
    const labels={rotation_state:'starší rozpis',machine_settings:'nastavení strojů',rotation_month_entries:'měsíční rozpis',gomoku_win:'výsledek hry',game_stat:'herní statistika',game_ui_settings:'vzhled profilu',game_session:'rozehraná hra',bug_report:'hlášení chyby'};
    const reason=String(task&&task.lastErrorMessage||'').toLowerCase();
    const failure=/permission|unauthoriz|forbidden|row-level|401|403|auth/.test(reason)?'oprávnění':/timeout|timed out|vypršel/.test(reason)?'časový limit':/network|offline|fetch|connection/.test(reason)?'připojení':/rate limit|429/.test(reason)?'omezení serveru':'nepotvrzené uložení';
    return {type,label:labels[type]||'neznámá položka',retries:Math.max(0,Number(task&&task.retryCount||0)),conflict:!!(task&&task.conflict),failure};
  }

  function getSyncUiStatus() {`,'queue diagnostic');
 const a=bridge.indexOf('  function getSyncUiStatus() {'),b=bridge.indexOf('\n  window.refreshPublicData = refreshPublicData;',a);
 assert(a>=0&&b>a&&b-a<5400,'status boundaries changed');
 let status=bridge.slice(a,b);
 status=once(status,'    const queueLength = queue.length;','    const queueLength = queue.length;\n    const queueIssue = queueLength ? summarizeQueuedSyncTask(queue[0]) : null;','queue type');
 status=once(status,'      conflictCount, dropped, hardening: getSupabaseHardeningStatus() };','      conflictCount, dropped, queueIssue, hardening: getSupabaseHardeningStatus() };','diagnostic status');
 status=once(status,`    if (queueLength) return Object.assign({}, base, {
      kind: 'pending', label: '🟠 Čeká na odeslání: ' + queueLength,
      detail: verified ? 'Online rozpis načten; změny stále čekají na potvrzení.' : 'Online rozpis ještě nebyl ověřen; čekající změny jsou zachované.'
    });`,`    if (queueLength) return Object.assign({}, base, {
      kind: queueIssue && queueIssue.retries > 0 ? 'error' : 'pending',
      label: (queueIssue && queueIssue.retries > 0 ? '🔴 Odeslání selhalo: ' : '🟠 Čeká na odeslání: ') + queueLength,
      detail: (queueIssue ? queueIssue.label + ' · ' : '') +
        (queueIssue && queueIssue.retries > 0 ? 'Důvod: ' + queueIssue.failure + '; další pokus bude opakován.'
          : verified ? 'Online rozpis načten; čeká na potvrzení.' : 'Čeká na ověření online stavu.')
    });`,'pending versus failed');
 bridge=bridge.slice(0,a)+status+bridge.slice(b);write('supabase-bridge.js',bridge);
}
assert(bridge.includes('RAK_17058_QUEUE_RETRY_GUARD')&&bridge.includes('RAK_17058_QUEUE_DIAGNOSTIC_GUARD'));
let replay=read('tools/shift-report-mo-hotfix-170-smoke.mjs');
if(!replay.includes('RAK_17058_TWO_PASS_GUARD')){
 replay=once(replay,`// RAK_17057_TWO_PASS_GUARD\nconst already17057=indexSource.includes("var build='${PREVIOUS}';");`,`// RAK_17057_TWO_PASS_GUARD\n// RAK_17058_TWO_PASS_GUARD\nconst already17058=indexSource.includes("var build='${BUILD}';");\nconst already17057=already17058||indexSource.includes("var build='${PREVIOUS}';");`,'second-pass guard');
 replay=once(replay,`already17057?"var build='${PREVIOUS}';":already17056?`,`already17058?"var build='${BUILD}';":already17057?"var build='${PREVIOUS}';":already17056?`,'second-pass marker');write('tools/shift-report-mo-hotfix-170-smoke.mjs',replay);
}
assert(replay.includes('RAK_17058_TWO_PASS_GUARD')&&replay.includes(`already17058?"var build='${BUILD}';":already17057?`));
for(const [path,from,to] of [
 ['supabase-config.js','window.RAK_RELEASE_VERSION = "1.7.57";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['supabase-config.js','window.RAK_TEST_DISPLAY_VERSION = "1.7.57";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`],
 ['supabase-config.js',`window.RAK_PWA_BUILD = "${PREVIOUS}";`,`window.RAK_PWA_BUILD = "${BUILD}";`],
 ['app.js',`const RAK_DEV_UPDATE_BUILD = "${PREVIOUS}";`,`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],
 ['app.js','window.RAK_RELEASE_VERSION = "1.7.57";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['sw.js',"const CACHE_VERSION = 'v1.7.57';",`const CACHE_VERSION = 'v${VERSION}';`],
 ['sw.js',"const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.57';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],
 ['sw.js',`const DEVELOPMENT_BUILD_ID = '${PREVIOUS}';`,`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],
 ['index.html',`var build='${PREVIOUS}';`,`var build='${BUILD}';`]
])write(path,once(read(path),from,to,'release '+path));
assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"));
for(const path of ['supabase-bridge.js','app.js','supabase-config.js','sw.js','tools/shift-report-mo-hotfix-170-smoke.mjs','tools/development-version-17058.mjs'])execFileSync(process.execPath,['--check',path],{stdio:'pipe'});
execFileSync(process.execPath,['--test','tools/release-gate-17058.test.mjs'],{stdio:'inherit'});
console.log('[development-version-17058] PASS retry scheduling, preserved pending writes, diagnostic, test-only release');
