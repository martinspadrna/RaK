#!/usr/bin/env node
// RaK 1.7.59: protect held/legacy queue items through compaction and expose safe iPhone diagnostics.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.59', BUILD='v1.7.59-queueintegrity1', PREVIOUS='v1.7.58-queuerecovery1';
const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>fs.writeFileSync(p,s,'utf8');
function once(s,b,a,label){if(s.includes(a))return s;assert(s.includes(b),'[17059] missing '+label);assert.equal(s.split(b).length,2,'[17059] ambiguous '+label);return s.replace(b,a);}
let bridge=read('supabase-bridge.js');
assert(bridge.includes('RAK_17058_QUEUE_RETRY_GUARD')&&bridge.includes('RAK_17058_QUEUE_DIAGNOSTIC_GUARD'),'1.7.58 required');
if(!bridge.includes('RAK_17059_QUEUE_PRESERVE_GUARD')){
 bridge=once(bridge,'  function normalizeQueueTask(task) {',
  '  // RAK_17059_QUEUE_PRESERVE_GUARD: never drop an already stored task during normalization.\n  function normalizeQueueTask(task, historical) {','historical normalization');
 bridge=once(bridge,"    if (!SUPPORTED_QUEUE_TYPES.has(type)) {\n      state.queueGuard.rejected += 1;\n      return null;\n    }",
  "    if (!SUPPORTED_QUEUE_TYPES.has(type) && !historical) {\n      state.queueGuard.rejected += 1;\n      return null;\n    }",'new unsupported tasks are rejected');
 bridge=once(bridge,'    const next = Object.assign({}, task, { type });',
  "    const next = Object.assign({}, task, { type });\n    if (historical && !SUPPORTED_QUEUE_TYPES.has(type)) next.conflict = 'unsupported-task';",'unknown historical quarantine');
 bridge=once(bridge,"    if (estimateJsonBytes(next) > SUPABASE_QUEUE_MAX_BYTES) {\n      state.queueGuard.oversized += 1;\n      return null;\n    }",
  "    if (estimateJsonBytes(next) > SUPABASE_QUEUE_MAX_BYTES) {\n      if (historical) return Object.assign({}, next, { conflict: 'oversize-task' });\n      state.queueGuard.oversized += 1;\n      return null;\n    }",'historical oversized task quarantine');
 const begin=bridge.indexOf('  function compactQueue(queue) {');
 const end=bridge.indexOf('\n  function readQueue() {',begin);
 assert(begin>=0&&end>begin&&end-begin<2200,'compact queue boundaries');
 let compact=bridge.slice(begin,end);
 compact=once(compact,'      const normalized = normalizeQueueTask(item);','      const normalized = normalizeQueueTask(item, true);','preserve historical tasks');
 compact=once(compact,'      const key = queueTaskKey(normalized);',
  '      if (normalized.conflict) { passthrough.push(normalized); return; }\n      const key = queueTaskKey(normalized);','held tasks never deduped');
 compact=once(compact,"    if (next.length > SUPABASE_QUEUE_MAX_ITEMS) {\n      const removed = next.length - SUPABASE_QUEUE_MAX_ITEMS;\n      state.queueGuard.trimmed += removed;\n      state.queueGuard.lastTrimAt = Date.now();\n      next = next.slice(-SUPABASE_QUEUE_MAX_ITEMS);\n    }",
  "    if (next.length > SUPABASE_QUEUE_MAX_ITEMS) {\n      // A legacy queue may already exceed the limit. Do not delete its contents.\n      state.queueGuard.overCapacity = next.length;\n    } else state.queueGuard.overCapacity = 0;",'over-capacity must not discard existing writes');
 bridge=bridge.slice(0,begin)+compact+bridge.slice(end);
 const enqueueStart=bridge.indexOf('  function enqueueTask(task) {');
 const enqueueEnd=bridge.indexOf('\n  function isLikelyOfflineError(',enqueueStart);
 assert(enqueueStart>=0&&enqueueEnd>enqueueStart&&enqueueEnd-enqueueStart<900,'enqueue boundaries');
 let enqueue=bridge.slice(enqueueStart,enqueueEnd);
 enqueue=once(enqueue,'    queue.push(normalized);',
  '    if (queue.length >= SUPABASE_QUEUE_MAX_ITEMS) { state.queueGuard.rejected += 1; return null; }\n    queue.push(normalized);', 'explicitly reject new write when full');
 bridge=bridge.slice(0,enqueueStart)+enqueue+bridge.slice(enqueueEnd);
 bridge=once(bridge,"    return {type,label:labels[type]||'neznámá položka',retries:",
  "    return {type:Object.prototype.hasOwnProperty.call(labels,type)?type:'unknown',label:labels[type]||'neznámá položka',retries:", 'no untrusted type in diagnostics');
 bridge=once(bridge,'    const queueIssue = queueLength ? summarizeQueuedSyncTask(queue[0]) : null;',
  '    const queueIssue = queueLength ? summarizeQueuedSyncTask(queue.find(item => item && item.conflict) || queue[0]) : null;', 'diagnose blocked task first');
 write('supabase-bridge.js',bridge);
}
assert(bridge.includes('RAK_17059_QUEUE_PRESERVE_GUARD')&&bridge.includes("next.conflict = 'unsupported-task'")&&bridge.includes('state.queueGuard.overCapacity = next.length'));
let dashboard=read('dashboard.js');
if(!dashboard.includes('RAK_17059_DIAGNOSTIC_DIALOG_GUARD')){
 dashboard=once(dashboard,
  "    setDashboardManualSyncBadge(result.ok ? '🟢 Synchronizováno teď' : '🔴 Sync s chybou', result.ok ? 'online' : 'error');\n    const restore = () =>",
  "    setDashboardManualSyncBadge(result.ok ? '🟢 Synchronizováno teď' : '🔴 Sync s chybou', result.ok ? 'online' : 'error');\n    // RAK_17059_DIAGNOSTIC_DIALOG_GUARD: shown only after an intentional badge tap.\n    if (actual && actual.queued > 0 && (source === 'dashboard-click' || source === 'dashboard-keyboard') && typeof window.alert === 'function') {\n      const issue = actual.queueIssue || {};\n      const names = ['starší rozpis','nastavení strojů','měsíční rozpis','výsledek hry','herní statistika','vzhled profilu','rozehraná hra','hlášení chyby','neznámá položka'];\n      const label = names.includes(issue.label) ? issue.label : 'neznámá položka';\n      const reasons = ['oprávnění','časový limit','připojení','omezení serveru','nepotvrzené uložení'];\n      const reason = reasons.includes(issue.failure) ? issue.failure : 'nepotvrzené uložení';\n      window.alert(['RaK 1.7.59 – diagnostika synchronizace', 'Čeká: ' + Number(actual.queued || 0), 'Typ: ' + label, 'Předchozí neúspěšné pokusy: ' + Math.max(0, Number(issue.retries || 0)), 'Důvod: ' + reason, actual.conflictCount ? 'Zadržený konflikt: vyžaduje bezpečnou kontrolu.' : 'Lokální změna zůstává zachována.'].join('\\n'));\n    }\n    const restore = () =>",'tap-only sanitized diagnostics');
 write('dashboard.js',dashboard);
}
let replay=read('tools/shift-report-mo-hotfix-170-smoke.mjs');
if(!replay.includes('RAK_17059_TWO_PASS_GUARD')){
 replay=once(replay,`// RAK_17058_TWO_PASS_GUARD\nconst already17058=indexSource.includes("var build='${PREVIOUS}';");`,
  `// RAK_17058_TWO_PASS_GUARD\n// RAK_17059_TWO_PASS_GUARD\nconst already17059=indexSource.includes("var build='${BUILD}';");\nconst already17058=already17059||indexSource.includes("var build='${PREVIOUS}';");`,'replay marker');
 replay=once(replay,`already17058?"var build='${PREVIOUS}';":already17057?`,
  `already17059?"var build='${BUILD}';":already17058?"var build='${PREVIOUS}';":already17057?`,'replay second-pass version');
 write('tools/shift-report-mo-hotfix-170-smoke.mjs',replay);
}
for(const [path,from,to] of [
 ['supabase-config.js','window.RAK_RELEASE_VERSION = "1.7.58";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['supabase-config.js','window.RAK_TEST_DISPLAY_VERSION = "1.7.58";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`],
 ['supabase-config.js',`window.RAK_PWA_BUILD = "${PREVIOUS}";`,`window.RAK_PWA_BUILD = "${BUILD}";`],
 ['app.js',`const RAK_DEV_UPDATE_BUILD = "${PREVIOUS}";`,`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],
 ['app.js','window.RAK_RELEASE_VERSION = "1.7.58";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['sw.js',"const CACHE_VERSION = 'v1.7.58';",`const CACHE_VERSION = 'v${VERSION}';`],
 ['sw.js',"const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.58';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],
 ['sw.js',`const DEVELOPMENT_BUILD_ID = '${PREVIOUS}';`,`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],
 ['index.html',`var build='${PREVIOUS}';`,`var build='${BUILD}';`]
])write(path,once(read(path),from,to,'release '+path));
assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"));
for(const path of ['supabase-bridge.js','dashboard.js','app.js','supabase-config.js','sw.js','tools/shift-report-mo-hotfix-170-smoke.mjs','tools/development-version-17059.mjs'])execFileSync(process.execPath,['--check',path],{stdio:'pipe'});
execFileSync(process.execPath,['--test','tools/release-gate-17059.test.mjs'],{stdio:'inherit'});
console.log('[development-version-17059] PASS held tasks, legacy queue, tap diagnostics, test-only release');
