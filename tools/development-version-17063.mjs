#!/usr/bin/env node
// RaK 1.7.63 — never adopt a remote revision when the edited baseline is unknown.
// Manual conflict inspection is read-only and requires a verified owner/admin session.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.63', BUILD='v1.7.63-casbaseline1', PREVIOUS='v1.7.62-safe-review1';
const read=p=>fs.readFileSync(p,'utf8'), write=(p,s)=>fs.writeFileSync(p,s,'utf8');
function once(s,b,a,label){if(s.includes(a))return s;assert(s.includes(b),'[17063] missing '+label);assert.equal(s.split(b).length,2,'[17063] duplicate '+label);return s.replace(b,a);}
let bridge=read('supabase-bridge.js');
assert(bridge.includes('RAK_17062_READONLY_REVIEW_GUARD')&&bridge.includes('RAK_17060_DURABLE_QUEUE_GUARD'),'1.7.62 required');
if(!bridge.includes('RAK_17063_UNKNOWN_BASELINE_GUARD')) {
 const a=bridge.indexOf('      if (state.rotationRevision === null || state.rotationRevision === undefined || !Number.isFinite(Number(state.rotationRevision))) {',bridge.indexOf('  async function trySaveRotationStateViaRpc('));
 const b=bridge.indexOf("      const { data, error } = await client.rpc('rak_admin_save_rotation_v2'",a);
 assert(a>=0&&b>a&&b-a<900,'unverified revision auto-fetch boundaries');
 bridge=bridge.slice(0,a)+`      // RAK_17063_UNKNOWN_BASELINE_GUARD: fetching a revision during save does NOT prove
      // the editor contains that version. Require an earlier confirmed online read.
      if (!Number.isSafeInteger(state.rotationRevision) || state.rotationRevision < 0) {
        const missing = new Error('Revize rozpisu není ověřena. Načti aktuální online rozpis před úpravami.');
        missing.code = 'RAK_ROTATION_REVISION_UNVERIFIED';
        throw missing;
      }
`+bridge.slice(b);
 const begin=bridge.indexOf('  async function upsertRotationMonthEntriesDirect(');
 const end=bridge.indexOf('\n  async function upsertGomokuWinDirect(',begin);
 assert(begin>=0&&end>begin&&end-begin<6500,'monthly function boundaries');
 let month=bridge.slice(begin,end);
 // Existing stages may already wrap the RPC response. Locate its return relative to the
 // actual successful RPC, rather than depending on a superseded return-value literal.
 const rpcAt=month.indexOf("client.rpc('rak_admin_save_rotation_month_entries_v2'");
 const rpcCheck=month.indexOf('      if (error) throw error;',rpcAt);
 const resultBegin=month.indexOf('      return ',rpcCheck);
 const resultEnd=month.indexOf(';\n',resultBegin);
 assert(rpcAt>=0&&rpcCheck>rpcAt&&resultBegin>rpcCheck&&resultEnd>resultBegin
   &&resultEnd-resultBegin<350&&resultBegin-rpcCheck<350,'monthly RPC result boundaries changed');
 month=month.slice(0,resultBegin)
   +"      return { months: 1, entries: data && Number.isSafeInteger(Number(data.inserted)) && data.inserted !== null ? Number(data.inserted) : payloadRows.length };"
   +month.slice(resultEnd+1);
 const fallback=month.indexOf('    const monthRow = {');
 assert(fallback>=0,'old direct table fallback missing');
 month=month.slice(0,fallback)+`    // RAK_17063_MONTH_RPC_ONLY_GUARD: no anonymous/direct DELETE+INSERT fallback.
    throw new Error('Měsíční rozpis lze uložit pouze ověřeným administrátorem přes RPC.');
  }
`;
 bridge=bridge.slice(0,begin)+month+bridge.slice(end);
 const review=`  // RAK_17063_MANUAL_REVISION_GUARD: explicit owner/admin request, network identity +
  // current admin context verified server-side. Read only revision, never payload or JWT.
  async function reviewRakRotationRevisionOnDemand() {
    const blocked = reason => ({ok:false,reason,serverContentCompared:false,atomicWritePerformed:false,eligibleForReplay:false});
    if (typeof navigator==='undefined' || !navigator.onLine) return blocked('offline');
    if (!hasSecureAdminContext()) return blocked('admin-auth-required');
    const localQueue = getRakPendingSyncReview();
    if (localQueue.storageIssue) return blocked('local-queue-unverified');
    const client = getClient();
    if (!client || !client.auth || typeof client.auth.getUser!=='function') return blocked('missing-auth-client');
    try {
      const verified = await client.auth.getUser();
      if (verified.error || !verified.data || !verified.data.user) return blocked('identity-not-verified');
      const identity=verified.data.user;
      const auth = await client.rpc('rak_admin_context');
      const context=auth && auth.data;
      if (auth.error || !context || context.authenticated!==true
        || !['owner','admin'].includes(context.role)
        || !context.account_id || !state.adminAuth.context
        || context.account_id!==state.adminAuth.context.account_id
        || (context.user_id && String(context.user_id)!==String(identity.id))) return blocked('admin-auth-required');
      const result=await client.from('rotation_state').select('revision').eq('key','main').maybeSingle();
      if (result.error || !result.data || !Number.isSafeInteger(Number(result.data.revision))) return blocked('revision-read-failed');
      const remote=Number(result.data.revision);
      const local=state.rotationRevision;
      const localKnown=Number.isSafeInteger(local)&&local>=0;
      const matching=localKnown && local===remote;
      return {ok:true,remoteRevision:remote,localRevision:localKnown?local:null,
        state:!localKnown?'local-revision-unknown':matching?'revision-equal':'revision-changed',
        serverContentCompared:false,atomicWritePerformed:false,eligibleForReplay:false,
        checkedAt:new Date().toISOString()};
    } catch (_) { return blocked('verification-failed'); }
  }

`;
 bridge=once(bridge,'  window.getSupabaseSyncStatus = getSyncUiStatus;',review+'  window.getSupabaseSyncStatus = getSyncUiStatus;','manual revision helper');
 bridge=once(bridge,'  window.getRakPendingSyncReview = getRakPendingSyncReview;',
  '  window.getRakPendingSyncReview = getRakPendingSyncReview;\n  window.reviewRakRotationRevisionOnDemand = reviewRakRotationRevisionOnDemand;',
  'manual revision export');
 write('supabase-bridge.js',bridge);
}
let dashboard=read('dashboard.js');
if(!dashboard.includes('RAK_17063_MANUAL_REVISION_DIALOG_GUARD')) {
 const prompt=`    // RAK_17063_MANUAL_REVISION_DIALOG_GUARD: tap-only, explicit network inspection;
    // no automatic replay, no local deletion, no display of IDs, names or raw errors.
    if (actual && actual.conflictCount > 0
      && (source === 'dashboard-click' || source === 'dashboard-keyboard')
      && typeof app !== 'undefined' && app && app.adminUnlocked === true
      && typeof window.confirm === 'function' && typeof window.reviewRakRotationRevisionOnDemand === 'function'
      && window.confirm('Zkontrolovat pouze číslo revize rozpisu proti serveru? Neuloží ani nepřepíše žádné změny.')) {
      Promise.resolve().then(() => window.reviewRakRotationRevisionOnDemand()).then(review => {
        if (typeof window.alert !== 'function') return;
        const description = review && review.ok
          ? (review.state === 'revision-equal' ? 'Revize byly při kontrole shodné.'
            : review.state === 'revision-changed' ? 'Revize se liší. Nic nepřepisuj.'
            : 'Lokální revize nebyla ověřena. Nic nepřepisuj.')
          : 'Revizi se nepodařilo bezpečně ověřit. Nic nepřepisuj.';
        window.alert(['Kontrola revize rozpisu', description,
          'Obsah serveru a telefonu nebyl porovnán.',
          'Nebyl proveden žádný zápis ani vyřešen konflikt.'].join('\n'));
      }).catch(() => {
        if (typeof window.alert === 'function') window.alert('Kontrola revize se nezdařila. Nic nepřepisuj.');
      });
    }
`;
 dashboard=once(dashboard,'    // RAK_17060_MANUAL_RESCUE_GUARD:',prompt+'    // RAK_17060_MANUAL_RESCUE_GUARD:', 'dashboard tap-only comparison');
 write('dashboard.js',dashboard);
}
let replay=read('tools/shift-report-mo-hotfix-170-smoke.mjs');
if(!replay.includes('RAK_17063_TWO_PASS_GUARD')){
 replay=once(replay,`// RAK_17062_TWO_PASS_GUARD\nconst already17062=indexSource.includes("var build='${PREVIOUS}';");`,
 `// RAK_17062_TWO_PASS_GUARD\n// RAK_17063_TWO_PASS_GUARD\nconst already17063=indexSource.includes("var build='${BUILD}';");\nconst already17062=already17063||indexSource.includes("var build='${PREVIOUS}';");`,
 'two-pass marker');
 replay=once(replay,`already17062?"var build='${PREVIOUS}';":already17061?`,
 `already17063?"var build='${BUILD}';":already17062?"var build='${PREVIOUS}';":already17061?`,
 'two-pass precedence');
 write('tools/shift-report-mo-hotfix-170-smoke.mjs',replay);
}
for(const [p,b,a] of [
 ['supabase-config.js','window.RAK_RELEASE_VERSION = "1.7.62";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['supabase-config.js','window.RAK_TEST_DISPLAY_VERSION = "1.7.62";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`],
 ['supabase-config.js',`window.RAK_PWA_BUILD = "${PREVIOUS}";`,`window.RAK_PWA_BUILD = "${BUILD}";`],
 ['app.js',`const RAK_DEV_UPDATE_BUILD = "${PREVIOUS}";`,`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],
 ['app.js','window.RAK_RELEASE_VERSION = "1.7.62";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['sw.js',"const CACHE_VERSION = 'v1.7.62';",`const CACHE_VERSION = 'v${VERSION}';`],
 ['sw.js',"const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.62';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],
 ['sw.js',`const DEVELOPMENT_BUILD_ID = '${PREVIOUS}';`,`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],
 ['index.html',`var build='${PREVIOUS}';`,`var build='${BUILD}';`]
])write(p,once(read(p),b,a,'release '+p));
assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
for(const p of ['supabase-bridge.js','dashboard.js','sw.js','app.js','tools/shift-report-mo-hotfix-170-smoke.mjs'])execFileSync(process.execPath,['--check',p],{stdio:'pipe'});
execFileSync(process.execPath,['--test','tools/release-gate-17063.test.mjs'],{stdio:'inherit'});
console.log('[development-version-17063] PASS fail-closed rotation baseline, monthly RPC-only, manual verified revision review');
