#!/usr/bin/env node
// RaK 1.7.62: narrower MO/TO date, iOS legibility, lossless ambiguous queue and privacy-safe manual review.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.62',BUILD='v1.7.62-safe-review1',PREVIOUS='v1.7.61-absencelayout1';
const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>fs.writeFileSync(p,s,'utf8');
function once(s,b,a,label){if(s.includes(a))return s;assert(s.includes(b),'[17062] missing '+label);assert.equal(s.split(b).length,2,'[17062] ambiguous '+label);return s.replace(b,a);}
const css=`
/* RAK_17062_DATE_AND_IOS_FONT_GUARD: only admin scheduling inputs, no global input sizing. */
html body #appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminRotationTable col:first-child {width:88px !important;}
html body #appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminRotationTable td:first-child {padding-left:1px !important;padding-right:1px !important;}
html body #appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminRotationTable input[data-rot-field="date"] {
  box-sizing:border-box !important;width:86px !important;min-width:86px !important;max-width:86px !important;
  font-size:16px !important;padding-left:3px !important;padding-right:1px !important;
}
html body #appMenuBody[data-admin-view="rotation"] #adminRotationEditor .appMenuAdminAbsenceTable input[data-note-field="date"] {
  font-size:16px !important;
}
/* END_RAK_17062_DATE_AND_IOS_FONT_GUARD */
`;
let styles=read('styles-inline-legacy.css');
assert(styles.includes('RAK_17061_ABSENCE_CSS'),'1.7.61 layout must be preserved');
if(!styles.includes('RAK_17062_DATE_AND_IOS_FONT_GUARD'))write('styles-inline-legacy.css',styles+'\n'+css);
let bridge=read('supabase-bridge.js');
assert(bridge.includes('RAK_17060_DURABLE_QUEUE_GUARD')&&bridge.includes('RAK_17059_QUEUE_PRESERVE_GUARD'),'1.7.60 queue required');
if(!bridge.includes('RAK_17062_LOSSLESS_AMBIGUITY_GUARD')){
 bridge=once(bridge,
  "    if (state.queueGuard.storageError === 'corrupt' || state.queueGuard.storageError === 'unavailable') state.queueGuard.storageError = '';\n    const compacted = compactQueue(queue);\n    if (compacted.length !== queue.length && !writeQueue(compacted)) state.queueGuard.storageError = 'write-failed';\n    return compacted;",
  `    // RAK_17062_LOSSLESS_AMBIGUITY_GUARD: normalization may discard old duplicate/malformed entries.
    // Never silently rewrite their original bytes; require private backup and review.
    const compacted = compactQueue(queue);
    if (compacted.length !== queue.length) { state.queueGuard.storageError = 'ambiguous'; return []; }
    if (['corrupt','unavailable','ambiguous'].includes(state.queueGuard.storageError)) state.queueGuard.storageError = '';
    return compacted;`,
  'prevent destructive legacy queue rewrite');
 bridge=once(bridge,
  "    if (state.queueGuard.storageError === 'corrupt' || state.queueGuard.storageError === 'unavailable') return false;\n    try {\n      const payload = JSON.stringify(compactQueue(Array.isArray(queue) ? queue : []));",
  `    if (['corrupt','unavailable','ambiguous'].includes(state.queueGuard.storageError)) return false;
    try {
      const incoming = Array.isArray(queue) ? queue : [];
      const compacted = compactQueue(incoming);
      if (compacted.length !== incoming.length) { state.queueGuard.storageError = 'ambiguous'; return false; }
      const payload = JSON.stringify(compacted);`,
  'never shrink a candidate write silently');
 const review=`  // RAK_17062_READONLY_REVIEW_GUARD: scan storage bytes without compaction, writes or remote requests.
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

`;
 bridge=once(bridge,'  // RAK_17060_QUEUE_RESCUE_EXPORT_GUARD:',review+'  // RAK_17060_QUEUE_RESCUE_EXPORT_GUARD:','privacy-only review');
 bridge=once(bridge,'  window.downloadRakPendingSyncBackup = downloadPendingSyncBackup;',
   '  window.downloadRakPendingSyncBackup = downloadPendingSyncBackup;\n  window.getRakPendingSyncReview = getRakPendingSyncReview;',
  'expose readonly helper');
 write('supabase-bridge.js',bridge);
}
let dashboard=read('dashboard.js');
if(!dashboard.includes('RAK_17062_READONLY_DIALOG_GUARD')){
 dashboard=once(dashboard,'      const issue = actual.queueIssue || {};',
  `      // RAK_17062_READONLY_DIALOG_GUARD: counts only; no raw queue values or server overwrite.
      const review = typeof window.getRakPendingSyncReview === 'function' ? window.getRakPendingSyncReview() : null;
      const issue = actual.queueIssue || {};`,'manual read-only review');
 dashboard=once(dashboard,"'Čeká: ' + Number(actual.queued || 0), 'Typ: ' + label,",
  "'Čeká: ' + Number(actual.queued || 0), 'Zadržené: ' + Number(review && review.held || 0), 'Ostatní: ' + Number(review && review.retryable || 0), 'Online načtení: ' + (review && review.remoteVerified ? 'ověřeno' : 'neověřeno'), 'Obsah serveru a telefonu nebyl porovnán.', 'Typ: ' + label,",
  'show safe counts and truthful comparison status');
 write('dashboard.js',dashboard);
}
let replay=read('tools/shift-report-mo-hotfix-170-smoke.mjs');
if(!replay.includes('RAK_17062_TWO_PASS_GUARD')){
 replay=once(replay,
  `// RAK_17061_TWO_PASS_GUARD\nconst already17061=indexSource.includes("var build='${PREVIOUS}';");`,
  `// RAK_17061_TWO_PASS_GUARD\n// RAK_17062_TWO_PASS_GUARD\nconst already17062=indexSource.includes("var build='${BUILD}';");\nconst already17061=already17062||indexSource.includes("var build='${PREVIOUS}';");`,
  'second build detection');
 replay=once(replay,
  `already17061?"var build='${PREVIOUS}';":already17060?`,
  `already17062?"var build='${BUILD}';":already17061?"var build='${PREVIOUS}';":already17060?`,
  'second build marker preservation');
 write('tools/shift-report-mo-hotfix-170-smoke.mjs',replay);
}
for(const [p,b,a] of [
 ['supabase-config.js','window.RAK_RELEASE_VERSION = "1.7.61";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['supabase-config.js','window.RAK_TEST_DISPLAY_VERSION = "1.7.61";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`],
 ['supabase-config.js',`window.RAK_PWA_BUILD = "${PREVIOUS}";`,`window.RAK_PWA_BUILD = "${BUILD}";`],
 ['app.js',`const RAK_DEV_UPDATE_BUILD = "${PREVIOUS}";`,`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],
 ['app.js','window.RAK_RELEASE_VERSION = "1.7.61";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['sw.js',"const CACHE_VERSION = 'v1.7.61';",`const CACHE_VERSION = 'v${VERSION}';`],
 ['sw.js',"const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.61';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],
 ['sw.js',`const DEVELOPMENT_BUILD_ID = '${PREVIOUS}';`,`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],
 ['index.html',`var build='${PREVIOUS}';`,`var build='${BUILD}';`]
])write(p,once(read(p),b,a,'release '+p));
assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
for(const p of ['supabase-bridge.js','dashboard.js','sw.js','app.js','tools/shift-report-mo-hotfix-170-smoke.mjs'])execFileSync(process.execPath,['--check',p],{stdio:'pipe'});
execFileSync(process.execPath,['--test','tools/release-gate-17062.test.mjs'],{stdio:'inherit'});
console.log('[development-version-17062] PASS narrow date, protected legacy queue, private review and TEST PWA');
